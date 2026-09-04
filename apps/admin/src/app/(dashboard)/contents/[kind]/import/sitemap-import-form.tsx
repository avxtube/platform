"use client"

import * as React from "react"
import { DatabaseZap, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"

import { Button, Input } from "@workspace/ui/components"

type ImportSummary = {
  discovered: number
  eligible: number
  skippedNonEnglish: number
  skippedEnglishSubtitle: number
  skippedInvalid: number
  existingContents: number
  existingQueue: number
  queued: number
}

export function SitemapImportForm() {
  const t = useTranslations("admin.sitemapImport")
  const router = useRouter()
  const [url, setUrl] = React.useState(
    "https://missav.ai/sitemap_items_1.xml"
  )
  const [pending, setPending] = React.useState(false)
  const [summary, setSummary] = React.useState<ImportSummary | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!url.trim() || pending) return
    setPending(true)
    setError(null)
    setSummary(null)
    try {
      const response = await fetch("/api/v1/admin/imports/sitemap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      })
      const body = (await response.json().catch(() => null)) as {
        summary?: ImportSummary
        message?: string
        error?: string
      } | null
      if (!response.ok || !body?.summary)
        throw new Error(body?.message ?? body?.error ?? t("failed"))
      setSummary(body.summary)
      router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("failed"))
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="rounded-xl border bg-card p-5 shadow-xs">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="sitemap-url" className="text-sm font-semibold">
            {t("url")}
          </label>
          <p className="mt-1 text-xs text-muted-foreground">{t("urlHelp")}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="sitemap-url"
            type="url"
            required
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            disabled={pending}
            className="min-w-0 flex-1"
          />
          <Button type="submit" disabled={pending || !url.trim()}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <DatabaseZap className="size-4" />
            )}
            {t(pending ? "importing" : "submit")}
          </Button>
        </div>
      </form>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {summary ? (
        <div className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-2 xl:grid-cols-4">
          {(
            [
              "discovered",
              "eligible",
              "existingContents",
              "existingQueue",
              "skippedNonEnglish",
              "skippedEnglishSubtitle",
              "skippedInvalid",
              "queued",
            ] as const
          ).map((key) => (
            <div key={key} className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                {t(`summary.${key}`)}
              </p>
              <p className="mt-1 text-xl font-bold">
                {summary[key].toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
