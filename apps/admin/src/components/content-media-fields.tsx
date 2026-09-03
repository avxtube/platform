"use client"

import * as React from "react"
import { X } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  MediaPicker,
  isPendingMediaToken,
  type MediaPickerLabels,
  type PendingMediaSelection,
} from "@workspace/media/react"
import { Button, Input } from "@workspace/ui/components"

import { AdminMetabox } from "@/components/admin-metabox"
import type { ContentKind } from "@/lib/content"

export const contentMediaFieldIds: Record<ContentKind, string[]> = {
  video: ["sourceUrl", "thumbnailUrl", "trailerUrl"],
  short: ["mediaUrl", "thumbnailUrl"],
  post: [],
  live: ["posterUrl"],
}

export function ContentMediaFields({
  kind,
  value,
  onChange,
  pendingMedia,
  onPendingMediaChange,
  referrerUrl,
  includeFieldIds,
  title,
  singleColumn = false,
  disabled,
}: {
  kind: ContentKind
  value: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
  pendingMedia: Record<string, PendingMediaSelection>
  onPendingMediaChange: React.Dispatch<
    React.SetStateAction<Record<string, PendingMediaSelection>>
  >
  referrerUrl?: string
  includeFieldIds?: string[]
  title?: string
  singleColumn?: boolean
  disabled?: boolean
}) {
  const t = useTranslations("admin")
  const labels: MediaPickerLabels = {
    title: t("media.title"),
    description: t("media.description"),
    upload: t("media.upload"),
    url: "URL",
    choose: t("media.choose"),
    drop: t("media.drop"),
    import: t("media.import"),
    crop: t("media.crop"),
    cancel: t("cancel"),
    apply: t("media.apply"),
    remove: t("media.remove"),
    skipCrop: t("media.skipCrop"),
    preserveAspectRatio: t("media.preserveAspectRatio"),
    preparing: t("media.preparing"),
  }

  function setMedia(field: string, media: PendingMediaSelection | null) {
    const previous = value[field]
    if (isPendingMediaToken(previous)) removePending(previous)
    const next = { ...value }
    if (media) {
      next[field] = media.token
      onPendingMediaChange((current) => ({ ...current, [media.token]: media }))
    } else delete next[field]
    onChange(next)
  }

  function removePending(token: string) {
    onPendingMediaChange((current) => {
      const selection = current[token]
      if (selection?.file && selection.previewUrl.startsWith("blob:"))
        URL.revokeObjectURL(selection.previewUrl)
      const next = { ...current }
      delete next[token]
      return next
    })
  }

  function setMediaUrl(field: string, url: string) {
    const previous = value[field]
    if (isPendingMediaToken(previous)) removePending(previous)
    const next = { ...value }
    if (url) next[field] = url
    else delete next[field]
    onChange(next)
  }

  if (kind === "post") {
    if (includeFieldIds && !includeFieldIds.includes("images")) return null
    const images = Array.isArray(value.images)
      ? value.images.filter((item): item is string => typeof item === "string")
      : []
    return (
      <AdminMetabox title={title ?? t("media.postImages")}>
        {images.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="group relative overflow-hidden rounded-lg border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayUrl(url, pendingMedia)}
                  alt=""
                  className="aspect-video w-full object-cover"
                />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="destructive"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                  onClick={() => {
                    if (isPendingMediaToken(url)) removePending(url)
                    onChange({
                      ...value,
                      images: images.filter(
                        (_, itemIndex) => itemIndex !== index
                      ),
                    })
                  }}
                >
                  <X />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
        <MediaPicker
          purpose="thumbnail"
          crop={false}
          referrerUrl={referrerUrl}
          onChange={(media) => {
            if (media) {
              onPendingMediaChange((current) => ({
                ...current,
                [media.token]: media,
              }))
              onChange({ ...value, images: [...images, media.token] })
            }
          }}
          disabled={disabled}
          labels={labels}
          className={images.length ? "mt-3" : undefined}
        />
      </AdminMetabox>
    )
  }

  const allFields =
    kind === "video"
      ? ([
          { id: "thumbnailUrl", purpose: "poster", label: t("media.poster") },
          { id: "trailerUrl", purpose: "trailer", label: t("media.trailer") },
          { id: "sourceUrl", purpose: "video", label: t("media.video") },
        ] as const)
      : kind === "short"
        ? ([
            {
              id: "thumbnailUrl",
              purpose: "short-poster",
              label: t("media.poster"),
            },
            { id: "mediaUrl", purpose: "short", label: t("media.short") },
          ] as const)
        : ([
            { id: "posterUrl", purpose: "poster", label: t("media.poster") },
          ] as const)

  const fields = includeFieldIds
    ? allFields.filter((field) => includeFieldIds.includes(field.id))
    : allFields

  if (!fields.length) return null

  return (
    <AdminMetabox
      title={title ?? t("media.title")}
      description={title ? undefined : t("media.description")}
    >
      <div
        className={singleColumn ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}
      >
        {fields.map((field) => (
          <div
            key={field.id}
            className={
              !singleColumn &&
              (field.purpose === "video" || field.purpose === "short")
                ? "sm:col-span-2"
                : ""
            }
          >
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {field.label}
            </p>
            {field.purpose === "video" || field.purpose === "short" ? (
              <Input
                type="url"
                value={displayUrl(value[field.id], pendingMedia) ?? ""}
                onChange={(event) => setMediaUrl(field.id, event.target.value)}
                placeholder="https://..."
                disabled={disabled}
              />
            ) : (
              <MediaPicker
                purpose={field.purpose}
                referrerUrl={referrerUrl}
                crop={
                  field.purpose === "poster" || field.purpose === "short-poster"
                }
                value={displayUrl(value[field.id], pendingMedia)}
                selection={pendingSelection(value[field.id], pendingMedia)}
                onChange={(media) => setMedia(field.id, media)}
                disabled={disabled}
                labels={labels}
              />
            )}
          </div>
        ))}
      </div>
    </AdminMetabox>
  )
}

function displayUrl(
  value: unknown,
  pendingMedia: Record<string, PendingMediaSelection>
) {
  if (isPendingMediaToken(value)) return pendingMedia[value]?.previewUrl
  return typeof value === "string" ? value : undefined
}

function pendingSelection(
  value: unknown,
  pendingMedia: Record<string, PendingMediaSelection>
) {
  return isPendingMediaToken(value) ? pendingMedia[value] : undefined
}
