"use client"

import * as React from "react"
import {
  ArrowLeft,
  Download,
  Languages,
  Link2,
  Loader2,
  Save,
  Send,
  SlidersHorizontal,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import Link from "next/link"
import { useRouter } from "next/navigation"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  RichTextEditor,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
  buttonVariants,
} from "@workspace/ui/components"
import {
  getMetadataLabel,
  splitMetadata,
  validateMetadata,
} from "@workspace/metadata"
import {
  commitPendingMedia,
  isPendingMediaToken,
  preparePendingImageFromUrl,
  preparePendingVideoFromUrl,
  preparePendingVideoImport,
  type PendingMediaSelection,
} from "@workspace/media/react"
import {
  remoteMediaIdFields,
  type MediaUploadResult,
  type MissavMediaImport,
} from "@workspace/media"
import {
  prepareMissavMediaImport,
  registerImportedMissavMedia,
  isMissavProxyImport,
} from "@/lib/missav-media-import"

import { MetadataFields } from "@/components/metadata/fields"
import {
  collectPendingChannels,
  replacePendingChannels,
  type PendingChannel,
} from "@/components/metadata/pending-channels"
import {
  collectPendingTerms,
  replacePendingTerms,
  type PendingTerm,
} from "@/components/metadata/pending-terms"
import { AdminMetabox } from "@/components/admin-metabox"
import {
  ContentImport,
  importedNames,
  type VideoImportResult,
} from "@/components/content-import"
import {
  ContentMediaFields,
  contentMediaFieldIds,
} from "@/components/content-media-fields"
import { createPendingChannelValue } from "@/components/metadata/pending-channels"
import { fetchImportedTranslations } from "@/lib/video-translations"
import { createPendingTermValue } from "@/components/metadata/pending-terms"
import type { AdminContent, ContentKind } from "@/lib/content"
import {
  contentEditorReferences,
  editorMetadata,
  withImportUrlCategories,
} from "@/lib/content-editor"

const statuses = ["draft", "processing", "published", "failed"] as const
const visibilities = ["public", "unlisted", "private"] as const

export function ContentForm({
  kind,
  content,
  translationLocales = [],
}: {
  kind: ContentKind
  content?: AdminContent
  translationLocales?: readonly string[]
}) {
  const t = useTranslations("admin")
  const locale = useLocale()
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [publishingOpen, setPublishingOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [confirmation, setConfirmation] = React.useState<{
    payload: ContentPayload
    channels: PendingChannel[]
    terms: PendingTerm[]
  } | null>(null)
  const initialMetadata = React.useMemo(
    () => splitMetadata(kind, editorMetadata(content)),
    [content, kind]
  )
  const [registeredMetadata, setRegisteredMetadata] = React.useState<
    Record<string, unknown>
  >(initialMetadata.registered)
  const [pendingMedia, setPendingMedia] = React.useState<
    Record<string, PendingMediaSelection>
  >({})
  const [mediaReferrerUrl, setMediaReferrerUrl] = React.useState<string>()
  const [missavImport, setMissavImport] =
    React.useState<MissavMediaImport | null>(null)
  const pendingMediaRef = React.useRef(pendingMedia)
  const remotePreviewTokensRef = React.useRef(new Set<string>())
  const committedMediaRef = React.useRef<Record<string, MediaUploadResult>>({})
  const uploadedMediaRef = React.useRef(new Map<string, string>())
  const [customMetadata, setCustomMetadata] = React.useState(() =>
    JSON.stringify(initialMetadata.custom, null, 2)
  )
  const [title, setTitle] = React.useState(content?.title ?? "")
  const [slug, setSlug] = React.useState(content?.slug ?? "")
  const [descriptionBody, setDescriptionBody] = React.useState(
    content?.description ?? ""
  )
  const [translated, setTranslated] = React.useState<TranslatedDraft>(() =>
    initialTranslated(content?.translated)
  )
  React.useEffect(() => {
    setTranslated(initialTranslated(content?.translated))
  }, [content?._id, content?.translated, content?.updatedAt])
  const [translationSourceUrl, setTranslationSourceUrl] = React.useState(() =>
    initialTranslationSourceUrl(content)
  )
  const [translationLoading, setTranslationLoading] = React.useState<
    string | null
  >(null)
  const [translationMessage, setTranslationMessage] = React.useState<{
    locale: string
    type: "success" | "error"
    text: string
  } | null>(null)
  const [status, setStatus] = React.useState(
    () => statuses.find((value) => value === content?.status) ?? "draft"
  )
  const [visibility, setVisibility] = React.useState(
    content?.visibility ?? "private"
  )
  const slugManuallyEdited = React.useRef(Boolean(content?.slug))

  pendingMediaRef.current = pendingMedia
  React.useEffect(
    () => () => {
      Object.values(pendingMediaRef.current).forEach(releasePendingPreview)
    },
    []
  )

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    let customMetadataValue: Record<string, unknown>
    try {
      const parsed: unknown = JSON.parse(customMetadata || "{}")
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error()
      customMetadataValue = parsed as Record<string, unknown>
    } catch {
      setError(t("metadataInvalid"))
      return
    }

    const customOnlyMetadata = splitMetadata(kind, customMetadataValue).custom
    let metadataValue =
      kind === "post" ? {} : { ...customOnlyMetadata, ...registeredMetadata }
    if (kind === "video")
      metadataValue = withTranslationSource(metadataValue, translationSourceUrl)
    const missingMetadataField = validateMetadata(kind, metadataValue)
    if (missingMetadataField) {
      setError(
        t("metadataRequired", {
          field: getMetadataLabel(missingMetadataField.label, locale),
        })
      )
      return
    }

    try {
      metadataValue = await replaceExistingPendingRelations(metadataValue)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t("metadataRelationCreateFailed")
      )
      return
    }

    const payload = {
      kind,
      title: nullableText(title),
      slug: nullableText(slug),
      description: nullableText(descriptionBody),
      translated: normalizedTranslated(translated),
      status,
      visibility,
      metadata: metadataValue,
      seo:
        kind === "post"
          ? {
              metaTitle: content?.seo?.metaTitle ?? null,
              metaDescription: content?.seo?.metaDescription ?? null,
              keywords: content?.seo?.keywords ?? [],
            }
          : {
              metaTitle: nullableString(form.get("metaTitle")),
              metaDescription: nullableString(form.get("metaDescription")),
              keywords: String(form.get("keywords") ?? "")
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            },
    }

    const channels = collectPendingChannels(metadataValue)
    const terms = collectPendingTerms(metadataValue)
    if (channels.length || terms.length) {
      setConfirmation({ payload, channels, terms })
      return
    }

    await saveContent(payload)
  }

  async function applyImportedVideo(result: VideoImportResult) {
    const data = result.data
    const remoteImport = prepareMissavMediaImport(result)
    const importMedia = !content
    if (importMedia) {
      setStatus("published")
      setVisibility("public")
    }
    const importedSourceUrl = cleanImportedUrl(
      remoteImport?.sourcePageUrl ?? data.sourceUrl ?? result.url ?? ""
    )
    const importedTranslations =
      remoteImport && importedSourceUrl
        ? await fetchImportedTranslations(importedSourceUrl, translationLocales)
        : {}
    if (importedSourceUrl) setTranslationSourceUrl(importedSourceUrl)
    if (importMedia && importedSourceUrl) setMediaReferrerUrl(importedSourceUrl)

    const importedVideoUrl =
      remoteImport?.assets.find((asset) => asset.purpose === "video")
        ?.sourceUrl ?? cleanImportedUrl(data.m3u8Url ?? "")
    const videoImportSource = importedSourceUrl || importedVideoUrl
    let preparedVideo: PendingMediaSelection | undefined
    if (importMedia && videoImportSource && !remoteImport) {
      preparedVideo = preparePendingVideoImport({
        sourceUrl: videoImportSource,
        previewUrl: importedVideoUrl || videoImportSource,
      })
      const previousToken = registeredMetadata.sourceUrl
      setPendingMedia((current) => {
        const next = { ...current }
        if (isPendingMediaToken(previousToken)) {
          const previous = next[previousToken]
          if (previous) releasePendingPreview(previous)
          delete next[previousToken]
        }
        next[preparedVideo!.token] = preparedVideo!
        return next
      })
    }

    let preparedPoster: PendingMediaSelection | undefined
    if (importMedia && data.poster) {
      const poster = await preparePendingImageFromUrl({
        sourceUrl: cleanImportedUrl(data.poster),
        purpose: "poster",
        referrerUrl:
          importedSourceUrl ||
          (remoteImport ? "https://missav.ai/" : undefined),
      })
      preparedPoster = poster
      if (remoteImport) remotePreviewTokensRef.current.add(poster.token)
      const previousToken = registeredMetadata.thumbnailUrl
      setPendingMedia((current) => {
        const next = { ...current }
        if (isPendingMediaToken(previousToken)) {
          const previous = next[previousToken]
          if (previous) releasePendingPreview(previous)
          delete next[previousToken]
        }
        next[poster.token] = poster
        return next
      })
    }
    let preparedTrailer: PendingMediaSelection | undefined
    if (importMedia && data.trailer) {
      preparedTrailer = await preparePendingVideoFromUrl({
        sourceUrl: cleanImportedUrl(data.trailer),
        referrerUrl:
          importedSourceUrl ||
          (remoteImport ? "https://missav.ai/" : undefined),
      })
      if (remoteImport)
        remotePreviewTokensRef.current.add(preparedTrailer.token)
      const previousToken = registeredMetadata.trailerUrl
      setPendingMedia((current) => {
        const next = { ...current }
        if (isPendingMediaToken(previousToken)) {
          const previous = next[previousToken]
          if (previous) releasePendingPreview(previous)
          delete next[previousToken]
        }
        next[preparedTrailer!.token] = preparedTrailer!
        return next
      })
    }
    setMissavImport(importMedia ? remoteImport : null)
    if (importMedia && remoteImport) {
      setPendingMedia((current) => {
        const next = { ...current }
        for (const field of ["sourceUrl", "thumbnailUrl", "trailerUrl"]) {
          const token = registeredMetadata[field]
          if (isPendingMediaToken(token)) {
            const previous = next[token]
            if (previous) releasePendingPreview(previous)
            delete next[token]
          }
        }
        return next
      })
    }
    if (data.title) setTitle(data.title)
    if (data.slug || data.code) {
      slugManuallyEdited.current = true
      setSlug(toSlug(data.slug || data.code || ""))
    }
    if (data.content) setDescriptionBody(data.content)
    if (Object.keys(importedTranslations).length)
      setTranslated((current) => ({ ...current, ...importedTranslations }))

    const actresses = importedNames(data.actresses)
    const actors = importedNames(data.actors)
    const studios = importedNames(data.makers)
    const country = importedNames(data.country)[0]
    const categories = withImportUrlCategories(importedNames(data.genres), [
      result.url,
      data.sourceUrl,
      importedSourceUrl,
    ])
    const tags = importedNames(data.tags)
    const labels = importedNames(data.labels)
    const series = importedNames(data.series)
    const directors = importedNames(data.directors)
    setRegisteredMetadata((current) => ({
      ...current,
      ...(importMedia && remoteImport
        ? { sourceUrl: "", thumbnailUrl: "", trailerUrl: "" }
        : {}),
      ...(data.code ? { dvdId: data.code } : {}),
      ...(data.releaseDate ? { releaseDate: data.releaseDate } : {}),
      ...(country ? { country } : {}),
      ...(typeof data.duration === "number"
        ? { durationSeconds: data.duration }
        : {}),
      ...(importMedia
        ? {
            ...(preparedVideo
              ? { sourceUrl: preparedVideo.token }
              : importedVideoUrl
                ? { sourceUrl: importedVideoUrl }
                : {}),
            ...(preparedPoster
              ? { thumbnailUrl: preparedPoster.token }
              : data.poster
                ? { thumbnailUrl: cleanImportedUrl(data.poster) }
                : {}),
            ...(preparedTrailer
              ? { trailerUrl: preparedTrailer.token }
              : remoteImport && data.trailer
                ? { trailerUrl: cleanImportedUrl(data.trailer) }
                : {}),
          }
        : {}),
      ...(studios.length
        ? {
            studioIds: studios.map((name) =>
              createPendingChannelValue("studio", name)
            ),
          }
        : {}),
      ...(actresses.length
        ? {
            actressIds: actresses.map((name) =>
              createPendingChannelValue("actress", name)
            ),
          }
        : {}),
      ...(actors.length
        ? {
            actorIds: actors.map((name) =>
              createPendingChannelValue("actor", name)
            ),
          }
        : {}),
      ...(directors.length
        ? {
            directorIds: directors.map((name) =>
              createPendingChannelValue("director", name)
            ),
          }
        : {}),
      ...(categories.length
        ? {
            categoryIds: categories.map((name) =>
              createPendingTermValue("category", name)
            ),
          }
        : {}),
      ...(tags.length
        ? {
            tagIds: tags.map((name) => createPendingTermValue("tag", name)),
          }
        : {}),
      ...(labels.length
        ? {
            labelIds: labels.map((name) =>
              createPendingTermValue("label", name)
            ),
          }
        : {}),
      ...(series.length
        ? {
            seriesIds: series.map((name) =>
              createPendingTermValue("series", name)
            ),
          }
        : {}),
    }))

    let existingCustom: Record<string, unknown> = {}
    try {
      const parsed: unknown = JSON.parse(customMetadata || "{}")
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
        existingCustom = parsed as Record<string, unknown>
    } catch {
      // Keep the imported data usable even if the custom JSON was temporarily invalid.
    }
    if (importMedia)
      for (const field of Object.values(remoteMediaIdFields))
        delete existingCustom[field]
    setCustomMetadata(
      JSON.stringify(
        {
          ...existingCustom,
          import: {
            ...(isPlainRecord(existingCustom.import)
              ? existingCustom.import
              : {}),
            sourceUrl: importedSourceUrl,
            ...(importMedia && remoteImport
              ? { sourceProvider: "missav", mediaMode: "proxy" }
              : {}),
            parser: result.parser ?? null,
            importedAt: result.timestamp ?? new Date().toISOString(),
          },
        },
        null,
        2
      )
    )
  }

  async function importTranslation(targetLocale: string) {
    const targetUrl = translationSourceUrl.trim()
    if (!targetUrl || translationLoading) return
    setTranslationLoading(targetLocale)
    setTranslationMessage(null)
    try {
      const response = await fetch(
        `/api/import/video?url=${encodeURIComponent(targetUrl)}&locale=${encodeURIComponent(targetLocale)}`,
        { headers: { accept: "application/json" } }
      )
      const body = (await response.json().catch(() => null)) as
        | (VideoImportResult & { error?: string })
        | null
      if (!response.ok || !body?.data || body.success === false)
        throw new Error(body?.error ?? t("translationImportFailed"))
      setTranslated((current) => ({
        ...current,
        [targetLocale]: {
          locale: targetLocale,
          title: body.data.title ?? "",
          description: body.data.content ?? "",
        },
      }))
      setTranslationMessage({
        locale: targetLocale,
        type: "success",
        text: t("translationImportSuccess", {
          code: body.data.code ?? slug ?? "—",
        }),
      })
    } catch (reason) {
      setTranslationMessage({
        locale: targetLocale,
        type: "error",
        text:
          reason instanceof Error
            ? reason.message
            : t("translationImportFailed"),
      })
    } finally {
      setTranslationLoading(null)
    }
  }

  const displayedTranslationLocales = React.useMemo(
    () => [
      ...new Set([
        ...translationLocales,
        ...Object.keys(translated).sort((left, right) =>
          left.localeCompare(right)
        ),
      ]),
    ],
    [translated, translationLocales]
  )
  const hasMissingConfiguredTranslation = translationLocales.some(
    (targetLocale) => {
      const draft = translated[targetLocale]
      return !draft?.title.trim() && !draft?.description.trim()
    }
  )

  async function saveContent(payload: ContentPayload) {
    setPending(true)
    try {
      const metadata = await commitMediaInMetadata(payload.metadata)
      const references = contentEditorReferences(metadata, content)
      for (const value of Object.values(metadata)) {
        if (typeof value !== "string") continue
        const id = uploadedMediaRef.current.get(value)
        if (id) references.mediaIds.push(id)
      }
      const finalPayload = { ...payload, ...references, metadata }
      const requestPayload = content
        ? changedContentPayload(finalPayload, content)
        : finalPayload
      if (content && !Object.keys(requestPayload).length) {
        router.push(`/contents/${kind}`)
        router.refresh()
        return
      }
      const url = content
        ? `/api/v1/admin/contents/${encodeURIComponent(content._id)}`
        : "/api/v1/admin/contents"
      const response = await fetch(url, {
        method: content ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestPayload),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string
          error?: string
        } | null
        throw new Error(body?.message ?? body?.error ?? t("saveFailed"))
      }
      router.push(`/contents/${kind}`)
      router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("saveFailed"))
    } finally {
      setPending(false)
    }
  }

  async function replaceExistingPendingRelations(
    metadata: Record<string, unknown>
  ) {
    const channels = collectPendingChannels(metadata)
    const terms = collectPendingTerms(metadata)
    if (!channels.length && !terms.length) return metadata
    const [channelResponse, termResponse] = await Promise.all([
      channels.length
        ? fetch("/api/v1/admin/channels/check", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ channels }),
          })
        : null,
      terms.length
        ? fetch("/api/v1/admin/terms/check", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ terms }),
          })
        : null,
    ])
    if (channelResponse && !channelResponse.ok)
      throw new Error(t("metadataRelationCreateFailed"))
    if (termResponse && !termResponse.ok)
      throw new Error(t("metadataRelationCreateFailed"))
    const channelBody = channelResponse
      ? ((await channelResponse.json()) as {
          channels: Array<{ key: string; id: string }>
        })
      : { channels: [] }
    const termBody = termResponse
      ? ((await termResponse.json()) as {
          terms: Array<{ key: string; id: string }>
        })
      : { terms: [] }
    const resolved = new Map<string, string>()
    channelBody.channels.forEach((item) => resolved.set(item.key, item.id))
    termBody.terms.forEach((item) => resolved.set(item.key, item.id))
    return replacePendingTerms(
      replacePendingChannels(metadata, resolved),
      resolved
    ) as Record<string, unknown>
  }

  async function commitMediaInMetadata(metadata: Record<string, unknown>) {
    let resolvedMetadata = metadata
    const previewTokens = collectPendingMediaTokens(resolvedMetadata).filter(
      (token) => remotePreviewTokensRef.current.has(token)
    )
    if (previewTokens.length) {
      const remainingMedia = { ...pendingMediaRef.current }
      for (const token of previewTokens) {
        const selection = remainingMedia[token]
        if (!selection?.sourceUrl) throw new Error(t("media.pendingMissing"))
        resolvedMetadata = replacePendingMediaToken(
          resolvedMetadata,
          token,
          selection.sourceUrl
        ) as Record<string, unknown>
        delete remainingMedia[token]
        remotePreviewTokensRef.current.delete(token)
        releasePendingPreview(selection)
      }
      pendingMediaRef.current = remainingMedia
      setPendingMedia(remainingMedia)
    }
    const trailerUrl = metadata.trailerUrl
    const existingTrailer = content?.relations?.media.some(
      (item) => item.position === "trailer" && item.url === trailerUrl
    )
    if (
      isFourhoiUrl(trailerUrl) &&
      !isMissavProxyImport(metadata) &&
      !existingTrailer
    ) {
      const uploaded = await commitPendingMedia(
        await preparePendingVideoFromUrl({
          sourceUrl: trailerUrl,
          referrerUrl: mediaReferrerUrl ?? "https://missav.ai/",
        }),
        { keySlug: slug }
      )
      resolvedMetadata = { ...resolvedMetadata, trailerUrl: uploaded.url }
      if (uploaded.id) uploadedMediaRef.current.set(uploaded.url, uploaded.id)
    }

    const tokens = collectPendingMediaTokens(resolvedMetadata)
    for (const token of tokens) {
      const selection = pendingMediaRef.current[token]
      if (!selection) throw new Error(t("media.pendingMissing"))
      const uploaded =
        committedMediaRef.current[token] ??
        (await commitPendingMedia(selection, { keySlug: slug }))
      committedMediaRef.current[token] = uploaded
      if (uploaded.id) uploadedMediaRef.current.set(uploaded.url, uploaded.id)
      resolvedMetadata = replacePendingMediaToken(
        resolvedMetadata,
        token,
        uploaded.url
      ) as Record<string, unknown>
    }
    if (tokens.length) {
      setRegisteredMetadata((current) => {
        let next: unknown = current
        for (const token of tokens) {
          const uploaded = committedMediaRef.current[token]
          if (uploaded)
            next = replacePendingMediaToken(next, token, uploaded.url)
        }
        return next as Record<string, unknown>
      })
      const remainingMedia = { ...pendingMediaRef.current }
      for (const token of tokens) {
        const selection = remainingMedia[token]
        delete remainingMedia[token]
        delete committedMediaRef.current[token]
        if (selection) releasePendingPreview(selection)
      }
      pendingMediaRef.current = remainingMedia
      setPendingMedia(remainingMedia)
    }
    return registerImportedMissavMedia(resolvedMetadata, missavImport)
  }

  async function confirmChannelsAndSave() {
    if (!confirmation) return
    setPending(true)
    setError(null)

    try {
      const mediaMetadata = await commitMediaInMetadata(
        confirmation.payload.metadata
      )
      const confirmedPayload = {
        ...confirmation.payload,
        metadata: mediaMetadata,
      }
      setConfirmation((current) =>
        current ? { ...current, payload: confirmedPayload } : current
      )

      const resolved = new Map<string, string>()
      if (confirmation.channels.length) {
        const response = await fetch("/api/v1/admin/channels/resolve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ channels: confirmation.channels }),
        })
        if (!response.ok) {
          const errorBody = (await response.json().catch(() => null)) as {
            message?: string
            error?: string
          } | null
          throw new Error(
            errorBody?.message ??
              errorBody?.error ??
              t("metadataRelationCreateFailed")
          )
        }
        const body = (await response.json()) as {
          channels: Array<{ key: string; id: string }>
        }
        body.channels.forEach((channel) =>
          resolved.set(channel.key, channel.id)
        )
      }
      if (confirmation.terms.length) {
        const response = await fetch("/api/v1/admin/terms/resolve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ terms: confirmation.terms }),
        })
        if (!response.ok) {
          const errorBody = (await response.json().catch(() => null)) as {
            message?: string
            error?: string
          } | null
          throw new Error(
            errorBody?.message ??
              errorBody?.error ??
              t("metadataRelationCreateFailed")
          )
        }
        const body = (await response.json()) as {
          terms: Array<{ key: string; id: string }>
        }
        body.terms.forEach((term) => resolved.set(term.key, term.id))
      }
      if (
        [...confirmation.channels, ...confirmation.terms].some(
          (item) => !resolved.has(item.key)
        )
      ) {
        throw new Error(t("metadataRelationCreateFailed"))
      }
      const payload = {
        ...confirmedPayload,
        metadata: replacePendingTerms(
          replacePendingChannels(confirmedPayload.metadata, resolved),
          resolved
        ) as Record<string, unknown>,
      }
      setConfirmation(null)
      await saveContent(payload)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : t("metadataRelationCreateFailed")
      )
      setPending(false)
    }
  }

  const mainMediaFieldIds =
    kind === "video" ? ["sourceUrl"] : kind === "short" ? ["mediaUrl"] : []
  const posterFieldIds =
    kind === "video" || kind === "short"
      ? ["thumbnailUrl"]
      : kind === "live"
        ? ["posterUrl"]
        : []

  function renderPublishingSidebar(idPrefix: string, formId?: string) {
    return (
      <div className="space-y-4">
        <FormSection title={t("publishing")} compact>
          <SelectField
            id={`${idPrefix}-status`}
            label={t("status")}
            value={status}
            onChange={(value) => setStatus(value as (typeof statuses)[number])}
          >
            {statuses.map((item) => (
              <option key={item} value={item}>
                {t(`statuses.${item}`)}
              </option>
            ))}
          </SelectField>
          <SelectField
            id={`${idPrefix}-visibility`}
            label={t("visibility")}
            value={visibility}
            onChange={(value) =>
              setVisibility(value as (typeof visibilities)[number])
            }
          >
            {visibilities.map((item) => (
              <option key={item} value={item}>
                {t(`visibilities.${item}`)}
              </option>
            ))}
          </SelectField>
          <SubmitButton
            pending={pending}
            editing={Boolean(content)}
            className="w-full"
            form={formId}
          />
        </FormSection>

        {posterFieldIds.length ? (
          <ContentMediaFields
            kind={kind}
            value={registeredMetadata}
            onChange={setRegisteredMetadata}
            pendingMedia={pendingMedia}
            onPendingMediaChange={setPendingMedia}
            referrerUrl={mediaReferrerUrl}
            includeFieldIds={posterFieldIds}
            title={t("media.poster")}
            singleColumn
            disabled={pending}
          />
        ) : null}

        {kind === "video" ? (
          <ContentMediaFields
            kind={kind}
            value={registeredMetadata}
            onChange={setRegisteredMetadata}
            pendingMedia={pendingMedia}
            onPendingMediaChange={setPendingMedia}
            referrerUrl={mediaReferrerUrl}
            includeFieldIds={["trailerUrl"]}
            title={t("media.trailer")}
            singleColumn
            disabled={pending}
          />
        ) : null}

        {kind !== "short" && kind !== "post" ? (
          <>
            <MetadataFields
              scope={kind}
              value={registeredMetadata}
              onChange={setRegisteredMetadata}
              relationOptions={content?.relations}
              disabled={pending}
              variant="metabox"
              includeFieldIds={["categoryIds"]}
              title={t("metadataCategory")}
            />
            <MetadataFields
              scope={kind}
              value={registeredMetadata}
              onChange={setRegisteredMetadata}
              relationOptions={content?.relations}
              disabled={pending}
              variant="metabox"
              includeFieldIds={["tagIds"]}
              title={t("metadataTag")}
            />
          </>
        ) : null}
      </div>
    )
  }

  return (
    <>
      <form id="content-editor-form" onSubmit={onSubmit} className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">
              {t(`kinds.${kind}`)}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              {t(content ? "edit" : "create", {
                kind: t(`kindSingular.${kind}`),
              })}
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/contents/${kind}`}
              className={buttonVariants({ variant: "outline" })}
            >
              <ArrowLeft className="size-4" />
              {t("back")}
            </Link>
            <Button
              type="button"
              variant="outline"
              className={kind === "post" ? "hidden" : "lg:hidden"}
              onClick={() => setPublishingOpen(true)}
            >
              <SlidersHorizontal className="size-4" />
              <span className="hidden sm:inline">{t("publishing")}</span>
            </Button>
            {kind === "post" ? (
              <SubmitButton pending={pending} editing={Boolean(content)} />
            ) : null}
          </div>
        </div>
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}
        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="order-2 min-w-0 flex-1 space-y-5 lg:order-1">
            {kind === "video" ? (
              <ContentImport
                disabled={pending}
                onImported={applyImportedVideo}
                onUrlChange={setTranslationSourceUrl}
              />
            ) : null}
            {missavImport ? (
              <p role="status" className="text-xs text-muted-foreground">
                {t("missavProxyImportNotice")}
              </p>
            ) : null}
            <div className="overflow-hidden rounded-lg bg-card shadow-xs ring-1 ring-foreground/10">
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(event) => {
                  const nextTitle = event.target.value
                  setTitle(nextTitle)
                  if (!slugManuallyEdited.current) setSlug(toSlug(nextTitle))
                }}
                maxLength={1000}
                placeholder={t("titleOptional")}
                className="h-auto rounded-none border-0 px-4 py-4 text-xl font-semibold shadow-none focus-visible:ring-0"
              />
              <div className="flex items-center gap-2 border-t bg-muted/20 px-4 py-2.5">
                <Link2 className="size-3.5 shrink-0 text-muted-foreground/60" />
                <Input
                  id="slug"
                  name="slug"
                  value={slug}
                  onChange={(event) => {
                    slugManuallyEdited.current = true
                    setSlug(toSlug(event.target.value))
                  }}
                  maxLength={300}
                  placeholder={t("slugPlaceholder")}
                  className="h-6 rounded-none border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
            <AdminMetabox title={t("description")} contentClassName="p-0">
              <RichTextEditor
                id="description"
                value={descriptionBody}
                onChange={setDescriptionBody}
                placeholder={t("postBodyPlaceholder")}
                disabled={pending}
                minHeight="14rem"
                maxLength={20000}
                labels={{
                  toolbar: t("editor.toolbar"),
                  editor: t("editor.editor"),
                  source: t("editor.source"),
                }}
              />
            </AdminMetabox>
            {kind === "video" ? (
              <AdminMetabox
                title={t("translations")}
                description={t("translationsHelp")}
              >
                <div className="space-y-4">
                  <Field
                    label={t("translationSourceUrl")}
                    htmlFor="translation-source-url"
                  >
                    <Input
                      id="translation-source-url"
                      type="url"
                      value={translationSourceUrl}
                      onChange={(event) =>
                        setTranslationSourceUrl(event.target.value)
                      }
                      placeholder={t("translationSourceUrlPlaceholder")}
                      disabled={pending}
                    />
                  </Field>
                  {displayedTranslationLocales.map((targetLocale) => {
                    const draft = translated[targetLocale] ?? {
                      locale: targetLocale,
                      title: "",
                      description: "",
                    }
                    const hasTranslation = Boolean(
                      draft.title.trim() || draft.description.trim()
                    )
                    const canFetch = translationLocales.includes(targetLocale)
                    const loading = translationLoading === targetLocale
                    const message =
                      translationMessage?.locale === targetLocale
                        ? translationMessage
                        : null
                    return (
                      <section
                        key={targetLocale}
                        className="space-y-3 rounded-lg border p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Languages className="size-4 text-muted-foreground" />
                            <h3 className="text-sm font-semibold">
                              {missavLocaleLabel(targetLocale)}
                            </h3>
                          </div>
                          {!hasTranslation && canFetch ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={
                                pending ||
                                Boolean(translationLoading) ||
                                !translationSourceUrl.trim()
                              }
                              onClick={() =>
                                void importTranslation(targetLocale)
                              }
                            >
                              {loading ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Download className="size-4" />
                              )}
                              {t("translationImportAction")}
                            </Button>
                          ) : null}
                        </div>
                        <Field
                          label={t("translationTitle")}
                          htmlFor={`translated-${targetLocale}-title`}
                        >
                          <Input
                            id={`translated-${targetLocale}-title`}
                            value={draft.title}
                            onChange={(event) =>
                              setTranslationDraft(
                                setTranslated,
                                targetLocale,
                                "title",
                                event.target.value
                              )
                            }
                            maxLength={1000}
                            disabled={pending}
                          />
                        </Field>
                        <Field
                          label={t("translationDescription")}
                          htmlFor={`translated-${targetLocale}-description`}
                        >
                          <Textarea
                            id={`translated-${targetLocale}-description`}
                            value={draft.description}
                            onChange={(event) =>
                              setTranslationDraft(
                                setTranslated,
                                targetLocale,
                                "description",
                                event.target.value
                              )
                            }
                            rows={5}
                            maxLength={20000}
                            disabled={pending}
                          />
                        </Field>
                        {message ? (
                          <p
                            role="status"
                            className={
                              message.type === "success"
                                ? "text-xs text-emerald-600"
                                : "text-xs text-destructive"
                            }
                          >
                            {message.text}
                          </p>
                        ) : null}
                      </section>
                    )
                  })}
                  {!displayedTranslationLocales.length ? (
                    <p className="text-xs text-muted-foreground">
                      {t("translationLocalesEmpty")}
                    </p>
                  ) : null}
                  {hasMissingConfiguredTranslation &&
                  !translationSourceUrl.trim() ? (
                    <p className="text-xs text-muted-foreground">
                      {t("translationSourceRequired")}
                    </p>
                  ) : null}
                </div>
              </AdminMetabox>
            ) : null}
            {kind !== "post" ? (
              <>
                <ContentMediaFields
                  kind={kind}
                  value={registeredMetadata}
                  onChange={setRegisteredMetadata}
                  pendingMedia={pendingMedia}
                  onPendingMediaChange={setPendingMedia}
                  referrerUrl={mediaReferrerUrl}
                  includeFieldIds={mainMediaFieldIds}
                  disabled={pending}
                />
                {kind === "video" &&
                content?.relations?.media.some(
                  (item) => item.position === "video"
                ) ? (
                  <AdminMetabox
                    title={t("videoRenditions")}
                    description={t("videoRenditionsHelp")}
                  >
                    <div className="space-y-2">
                      {content.relations.media
                        .filter((item) => item.position === "video")
                        .map((item) => (
                          <div
                            key={item.id}
                            className="flex min-w-0 items-center gap-3 rounded-lg border p-3 text-xs"
                          >
                            <span className="shrink-0 font-medium">
                              {item.quality === "original"
                                ? "Original"
                                : item.quality
                                  ? `${item.quality}p`
                                  : "—"}
                            </span>
                            <span
                              className="min-w-0 flex-1 truncate"
                              title={item.url ?? item.id}
                            >
                              {item.url ?? item.id}
                            </span>
                            <span className="shrink-0 text-muted-foreground">
                              {item.provider}
                            </span>
                          </div>
                        ))}
                    </div>
                  </AdminMetabox>
                ) : null}
                <MetadataFields
                  scope={kind}
                  value={registeredMetadata}
                  onChange={setRegisteredMetadata}
                  relationOptions={content?.relations}
                  disabled={pending}
                  variant="metabox"
                  excludeFieldIds={[
                    ...contentMediaFieldIds[kind],
                    "categoryIds",
                    "tagIds",
                  ]}
                />
                <AdminMetabox
                  title={t("customMetadata")}
                  description={t("customMetadataHelp")}
                  defaultOpen={false}
                >
                  <Textarea
                    aria-label={t("customMetadata")}
                    value={customMetadata}
                    onChange={(event) => setCustomMetadata(event.target.value)}
                    placeholder={'{\n  "customKey": "customValue"\n}'}
                    rows={10}
                    className="font-mono text-xs"
                    spellCheck={false}
                  />
                </AdminMetabox>
                <AdminMetabox title={t("seo")} defaultOpen={false}>
                  <Field label={t("metaTitle")} htmlFor="metaTitle">
                    <Input
                      id="metaTitle"
                      name="metaTitle"
                      defaultValue={content?.seo?.metaTitle ?? ""}
                      maxLength={300}
                    />
                  </Field>
                  <Field label={t("metaDescription")} htmlFor="metaDescription">
                    <Textarea
                      id="metaDescription"
                      name="metaDescription"
                      defaultValue={content?.seo?.metaDescription ?? ""}
                      rows={4}
                      maxLength={160}
                    />
                  </Field>
                  <Field label={t("keywords")} htmlFor="keywords">
                    <Input
                      id="keywords"
                      name="keywords"
                      defaultValue={content?.seo?.keywords?.join(", ") ?? ""}
                    />
                  </Field>
                </AdminMetabox>
              </>
            ) : null}
          </div>
          <div
            className={
              kind === "post"
                ? "hidden"
                : "hidden w-[280px] shrink-0 lg:order-2 lg:block"
            }
          >
            <div className="sticky top-20">
              {renderPublishingSidebar("desktop")}
            </div>
          </div>
        </div>
      </form>
      {kind !== "post" ? (
        <Sheet open={publishingOpen} onOpenChange={setPublishingOpen}>
          <SheetContent
            side="right"
            className="w-[min(92vw,24rem)] overflow-hidden sm:max-w-sm lg:hidden"
          >
            <SheetHeader className="border-b">
              <SheetTitle>{t("publishing")}</SheetTitle>
              <SheetDescription>{t(`kinds.${kind}`)}</SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pt-0">
              {renderPublishingSidebar("mobile", "content-editor-form")}
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
      <Dialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirmation(null)
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("metadataConfirmChannelsTitle")}</DialogTitle>
            <DialogDescription>
              {t("metadataConfirmChannelsDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain pr-1">
            <ConfirmationGroup
              label={t("metadataStudio")}
              items={
                confirmation?.channels.filter(
                  (item) => item.kind === "studio"
                ) ?? []
              }
            />
            <ConfirmationGroup
              label={t("metadataActor")}
              items={
                confirmation?.channels.filter(
                  (item) => item.kind === "actor"
                ) ?? []
              }
            />
            <ConfirmationGroup
              label={t("metadataCategory")}
              items={
                confirmation?.terms.filter(
                  (item) => item.taxonomy === "category"
                ) ?? []
              }
            />
            <ConfirmationGroup
              label={t("metadataTag")}
              items={
                confirmation?.terms.filter((item) => item.taxonomy === "tag") ??
                []
              }
            />
          </div>
          <DialogFooter className="border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmation(null)}
              disabled={pending}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              onClick={confirmChannelsAndSave}
              disabled={pending}
            >
              {pending
                ? t("metadataCheckingChannels")
                : t("metadataConfirmAndSave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

type ContentPayload = {
  kind: ContentKind
  title: string | null
  slug: string | null
  description: string | null
  translated: TranslatedDraft
  status: string
  visibility: string
  metadata: Record<string, unknown>
  seo: {
    metaTitle: string | null
    metaDescription: string | null
    keywords: string[]
  }
}

type TranslationValue = {
  locale?: string
  title?: string
  description?: string
}

type TranslationDraft = Required<TranslationValue>

type TranslatedDraft = Record<string, TranslationDraft>

function initialTranslated(value: AdminContent["translated"]): TranslatedDraft {
  if (!value) return {}
  return Object.fromEntries(
    Object.entries(value).map(([locale, item]) => [
      locale,
      {
        locale,
        title: item.title ?? "",
        description: item.description ?? "",
      },
    ])
  )
}

function normalizedTranslated(
  value: Record<string, TranslationValue>
): TranslatedDraft {
  const result: TranslatedDraft = {}
  for (const [locale, item] of Object.entries(value)) {
    const title = item.title?.trim() ?? ""
    const description = item.description?.trim() ?? ""
    if (title || description) result[locale] = { locale, title, description }
  }
  return result
}

function setTranslationDraft(
  setter: React.Dispatch<React.SetStateAction<TranslatedDraft>>,
  locale: string,
  field: "title" | "description",
  value: string
) {
  setter((current) => ({
    ...current,
    [locale]: {
      locale,
      title: current[locale]?.title ?? "",
      description: current[locale]?.description ?? "",
      [field]: value,
    },
  }))
}

function initialTranslationSourceUrl(content?: AdminContent): string {
  const metadata = content?.metadata
  if (!isPlainRecord(metadata)) return ""
  const imported = isPlainRecord(metadata.import) ? metadata.import : null
  return cleanImportedUrl(
    (typeof imported?.sourceUrl === "string" && imported.sourceUrl) ||
      (typeof metadata.sourcePageUrl === "string" && metadata.sourcePageUrl) ||
      ""
  )
}

function withTranslationSource(
  metadata: Record<string, unknown>,
  sourceUrl: string
): Record<string, unknown> {
  const imported = isPlainRecord(metadata.import) ? { ...metadata.import } : {}
  const normalized = cleanImportedUrl(sourceUrl)
  if (normalized) imported.sourceUrl = normalized
  else delete imported.sourceUrl
  if (Object.keys(imported).length) return { ...metadata, import: imported }
  const result = { ...metadata }
  delete result.import
  return result
}

function missavLocaleLabel(locale: string): string {
  const labels: Record<string, string> = {
    th: "ไทย",
    ja: "日本語",
    ko: "한국어",
    zh: "中文",
    vi: "Tiếng Việt",
    id: "Bahasa Indonesia",
    ms: "Bahasa Melayu",
    tl: "Filipino",
    de: "Deutsch",
    fr: "Français",
    pt: "Português",
  }
  return labels[locale] ? `${labels[locale]} (${locale})` : locale
}

type ContentSavePayload = ContentPayload & {
  studioIds: string[]
  actressIds: string[]
  actorIds: string[]
  directorIds: string[]
  termIds: string[]
  mediaIds: string[]
}

function changedContentPayload(
  next: ContentSavePayload,
  content: AdminContent
): Partial<ContentSavePayload> {
  const metadata = content.kind === "post" ? {} : editorMetadata(content)
  const initial: ContentSavePayload = {
    kind: content.kind,
    title: nullableText(content.title ?? ""),
    slug: nullableText(content.slug ?? ""),
    description: nullableText(content.description ?? ""),
    translated: normalizedTranslated(content.translated ?? {}),
    status: content.status,
    visibility: content.visibility,
    metadata,
    seo: {
      metaTitle: nullableText(content.seo?.metaTitle ?? ""),
      metaDescription: nullableText(content.seo?.metaDescription ?? ""),
      keywords: content.seo?.keywords ?? [],
    },
    ...contentEditorReferences(metadata, content),
  }
  return Object.fromEntries(
    Object.entries(next).filter(
      ([key, value]) =>
        !samePayloadValue(value, initial[key as keyof ContentSavePayload])
    )
  ) as Partial<ContentSavePayload>
}

function samePayloadValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => samePayloadValue(value, right[index]))
    )
  }
  if (isPlainRecord(left) || isPlainRecord(right)) {
    if (!isPlainRecord(left) || !isPlainRecord(right)) return false
    const leftKeys = Object.keys(left).sort()
    const rightKeys = Object.keys(right).sort()
    return (
      samePayloadValue(leftKeys, rightKeys) &&
      leftKeys.every((key) => samePayloadValue(left[key], right[key]))
    )
  }
  return false
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function ConfirmationGroup({
  label,
  items,
}: {
  label: string
  items: Array<{ key: string; name: string }>
}) {
  if (!items.length) return null
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{label}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item.key}
            className="max-w-full truncate rounded-full border bg-muted/50 px-3 py-1.5 text-sm"
          >
            {item.name}
          </span>
        ))}
      </div>
    </section>
  )
}

function FormSection({
  title,
  icon,
  children,
  compact = false,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  compact?: boolean
}) {
  return (
    <section
      className={
        compact
          ? "rounded-lg bg-card p-4 shadow-xs ring-1 ring-foreground/10"
          : "rounded-2xl border bg-card p-5 shadow-sm sm:p-6"
      }
    >
      <h2
        className={
          compact
            ? "flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
            : "flex items-center gap-2 text-lg font-semibold"
        }
      >
        {icon}
        {title}
      </h2>
      <div className={compact ? "mt-4 space-y-4" : "mt-5 space-y-5"}>
        {children}
      </div>
    </section>
  )
}
function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}
function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <Field label={label} htmlFor={id}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
      >
        {children}
      </select>
    </Field>
  )
}
function SubmitButton({
  pending,
  editing,
  className,
  form,
}: {
  pending: boolean
  editing: boolean
  className?: string
  form?: string
}) {
  const t = useTranslations("admin")
  return (
    <Button type="submit" form={form} disabled={pending} className={className}>
      {pending ? (
        <>
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {t("saving")}
        </>
      ) : (
        <>
          {editing ? <Save className="size-4" /> : <Send className="size-4" />}
          {t(editing ? "save" : "createAction")}
        </>
      )}
    </Button>
  )
}
function nullableString(value: FormDataEntryValue | null) {
  const result = typeof value === "string" ? value.trim() : ""
  return result || null
}
function collectPendingMediaTokens(value: unknown) {
  const tokens = new Set<string>()
  visit(value)
  return [...tokens]

  function visit(current: unknown) {
    if (isPendingMediaToken(current)) {
      tokens.add(current)
      return
    }
    if (Array.isArray(current)) current.forEach(visit)
    else if (current && typeof current === "object")
      Object.values(current as Record<string, unknown>).forEach(visit)
  }
}
function replacePendingMediaToken(
  value: unknown,
  token: string,
  url: string
): unknown {
  if (value === token) return url
  if (Array.isArray(value))
    return value.map((item) => replacePendingMediaToken(item, token, url))
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        replacePendingMediaToken(item, token, url),
      ])
    )
  return value
}
function releasePendingPreview(selection: PendingMediaSelection) {
  if (selection.file && selection.previewUrl.startsWith("blob:"))
    URL.revokeObjectURL(selection.previewUrl)
}
function nullableText(value: string) {
  const result = value.trim()
  return result || null
}
function toSlug(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 300)
}
function cleanImportedUrl(value: string) {
  const trimmed = value.trim()
  const markdown = /^\[(https?:\/\/[^\]]+)\]\(https?:\/\/[^)]+\)$/.exec(trimmed)
  return markdown?.[1] ?? trimmed
}
function isFourhoiUrl(value: unknown): value is string {
  if (typeof value !== "string") return false
  try {
    const hostname = new URL(value).hostname.toLowerCase()
    return hostname === "fourhoi.com" || hostname.endsWith(".fourhoi.com")
  } catch {
    return false
  }
}
