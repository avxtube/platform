"use client"

import * as React from "react"
import { ArrowLeft, Braces, Save, Search, Send } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button, Input, Label, Textarea, buttonVariants } from "@workspace/ui/components"

import type { AdminContent, ContentKind } from "@/lib/content"

const statuses = ["draft", "processing", "scheduled", "published", "ended", "failed"] as const
const visibilities = ["public", "unlisted", "private"] as const
const moderationStatuses = ["active", "suspended"] as const

export function ContentForm({ kind, content }: { kind: ContentKind; content?: AdminContent }) {
  const t = useTranslations("admin")
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [metadata, setMetadata] = React.useState(() => JSON.stringify(content?.metadata ?? {}, null, 2))

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    let metadataValue: Record<string, unknown>
    try {
      const parsed: unknown = JSON.parse(metadata || "{}")
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error()
      metadataValue = parsed as Record<string, unknown>
    } catch {
      setError(t("metadataInvalid"))
      return
    }

    const form = new FormData(event.currentTarget)
    const payload = {
      kind,
      title: nullableString(form.get("title")),
      description: nullableString(form.get("description")),
      status: String(form.get("status")),
      visibility: String(form.get("visibility")),
      moderationStatus: String(form.get("moderationStatus")),
      publishedAt: isoDate(form.get("publishedAt")),
      scheduledAt: isoDate(form.get("scheduledAt")),
      metadata: metadataValue,
      seo: {
        metaTitle: nullableString(form.get("metaTitle")),
        metaDescription: nullableString(form.get("metaDescription")),
        keywords: String(form.get("keywords") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
      },
    }

    setPending(true)
    try {
      const url = content ? `/api/v1/admin/contents/${encodeURIComponent(content._id)}` : "/api/v1/admin/contents"
      const response = await fetch(url, {
        method: content ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: string; error?: string } | null
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

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold text-primary">{t(`kinds.${kind}`)}</p><h1 className="mt-1 text-3xl font-bold tracking-tight">{t(content ? "edit" : "create", { kind: t(`kindSingular.${kind}`) })}</h1></div>
        <div className="flex gap-2"><Link href={`/contents/${kind}`} className={buttonVariants({ variant: "outline" })}><ArrowLeft className="size-4" />{t("back")}</Link><Button type="submit" disabled={pending}>{pending ? <><span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />{t("saving")}</> : <>{content ? <Save className="size-4" /> : <Send className="size-4" />}{t(content ? "save" : "createAction")}</>}</Button></div>
      </div>
      {error ? <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <FormSection title={t("details")} icon={<Search className="size-5" />}>
            <Field label={t("titleOptional")} htmlFor="title"><Input id="title" name="title" defaultValue={content?.title ?? ""} maxLength={1000} /></Field>
            <Field label={t("description")} htmlFor="description"><Textarea id="description" name="description" defaultValue={content?.description ?? ""} rows={12} maxLength={20000} /></Field>
          </FormSection>
          <FormSection title={t("metadata")} icon={<Braces className="size-5" />}>
            <p className="text-sm text-muted-foreground">{t("metadataHelp")}</p>
            <Textarea aria-label={t("metadata")} value={metadata} onChange={(event) => setMetadata(event.target.value)} placeholder={metadataPlaceholder(kind)} rows={14} className="font-mono text-xs" spellCheck={false} />
          </FormSection>
          <FormSection title={t("seo")} icon={<Search className="size-5" />}>
            <Field label={t("metaTitle")} htmlFor="metaTitle"><Input id="metaTitle" name="metaTitle" defaultValue={content?.seo?.metaTitle ?? ""} maxLength={300} /></Field>
            <Field label={t("metaDescription")} htmlFor="metaDescription"><Textarea id="metaDescription" name="metaDescription" defaultValue={content?.seo?.metaDescription ?? ""} rows={4} maxLength={160} /></Field>
            <Field label={t("keywords")} htmlFor="keywords"><Input id="keywords" name="keywords" defaultValue={content?.seo?.keywords?.join(", ") ?? ""} /></Field>
          </FormSection>
        </div>
        <div className="space-y-6">
          <FormSection title={t("publishing")}>
            <SelectField name="status" label={t("status")} defaultValue={content?.status ?? "draft"}>{statuses.map((item) => <option key={item} value={item}>{t(`statuses.${item}`)}</option>)}</SelectField>
            <SelectField name="visibility" label={t("visibility")} defaultValue={content?.visibility ?? "private"}>{visibilities.map((item) => <option key={item} value={item}>{t(`visibilities.${item}`)}</option>)}</SelectField>
            <SelectField name="moderationStatus" label={t("moderationStatus")} defaultValue={content?.moderationStatus ?? "active"}>{moderationStatuses.map((item) => <option key={item} value={item}>{t(`moderation.${item}`)}</option>)}</SelectField>
            <Field label={t("publishedAt")} htmlFor="publishedAt"><Input id="publishedAt" name="publishedAt" type="datetime-local" defaultValue={localDate(content?.publishedAt)} /></Field>
            <Field label={t("scheduledAt")} htmlFor="scheduledAt"><Input id="scheduledAt" name="scheduledAt" type="datetime-local" defaultValue={localDate(content?.scheduledAt)} /></Field>
          </FormSection>
        </div>
      </div>
    </form>
  )
}

function FormSection({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6"><h2 className="flex items-center gap-2 text-lg font-semibold">{icon}{title}</h2><div className="mt-5 space-y-5">{children}</div></section> }
function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) { return <div className="space-y-2"><Label htmlFor={htmlFor}>{label}</Label>{children}</div> }
function SelectField({ name, label, defaultValue, children }: { name: string; label: string; defaultValue: string; children: React.ReactNode }) { return <Field label={label} htmlFor={name}><select id={name} name={name} defaultValue={defaultValue} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">{children}</select></Field> }
function nullableString(value: FormDataEntryValue | null) { const result = typeof value === "string" ? value.trim() : ""; return result || null }
function isoDate(value: FormDataEntryValue | null) { if (typeof value !== "string" || !value) return null; return new Date(value).toISOString() }
function localDate(value?: string) { if (!value) return ""; const date = new Date(value); const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 16) }
function metadataPlaceholder(kind: ContentKind) { const examples = { video: { sourceUrl: "https://...", thumbnailUrl: "https://...", durationSeconds: 0, studioId: null, actorIds: [], termIds: [] }, short: { mediaUrl: "https://...", thumbnailUrl: "https://...", durationSeconds: 0, actorIds: [], termIds: [] }, post: { images: [], actorIds: [], termIds: [], label: "" }, live: { streamUrl: "https://...", posterUrl: "https://...", startsAt: "", studioId: null } }; return JSON.stringify(examples[kind], null, 2) }
