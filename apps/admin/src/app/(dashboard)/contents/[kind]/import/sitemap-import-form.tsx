"use client"

import * as React from "react"
import { DatabaseZap, Loader2, Pause, Play, X } from "lucide-react"
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

type RunState =
  | "idle"
  | "running"
  | "paused"
  | "cancelled"
  | "completed"
  | "failed"

const EMPTY_SUMMARY: ImportSummary = {
  discovered: 0,
  eligible: 0,
  skippedNonEnglish: 0,
  skippedEnglishSubtitle: 0,
  skippedInvalid: 0,
  existingContents: 0,
  existingQueue: 0,
  queued: 0,
}

const SUMMARY_KEYS = Object.keys(EMPTY_SUMMARY) as (keyof ImportSummary)[]

export function SitemapImportForm() {
  const t = useTranslations("admin.sitemapImport")
  const router = useRouter()
  const [url, setUrl] = React.useState(
    "https://missav.ai/sitemap_items_[1-513].xml"
  )
  const [runState, setRunState] = React.useState<RunState>("idle")
  const [currentPage, setCurrentPage] = React.useState<number | null>(null)
  const [completedPages, setCompletedPages] = React.useState(0)
  const [summary, setSummary] = React.useState<ImportSummary | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const pausedRef = React.useRef(false)
  const cancelledRef = React.useRef(false)
  const controllerRef = React.useRef<AbortController | null>(null)

  const parsedInput = parseSitemapInput(url)
  const normalizedStart = parsedInput?.start ?? 1
  const normalizedEnd = parsedInput?.end ?? normalizedStart
  const totalPages = normalizedEnd - normalizedStart + 1
  const progress = Math.min(
    100,
    totalPages > 0 ? Math.round((completedPages / totalPages) * 100) : 0
  )
  const active = runState === "running" || runState === "paused"

  React.useEffect(
    () => () => {
      cancelledRef.current = true
      controllerRef.current?.abort()
    },
    []
  )

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (active) return

    const input = parseSitemapInput(url)
    if (!input) {
      setError(t("invalidUrl"))
      return
    }

    const firstPage = input.start
    const lastPage = input.end
    setRunState("running")
    setCurrentPage(firstPage)
    setCompletedPages(0)
    setSummary(EMPTY_SUMMARY)
    setError(null)
    pausedRef.current = false
    cancelledRef.current = false

    let combinedSummary = { ...EMPTY_SUMMARY }

    try {
      for (let page = firstPage; page <= lastPage; page += 1) {
        while (pausedRef.current && !cancelledRef.current) await wait(150)
        if (cancelledRef.current) break

        setCurrentPage(page)
        const controller = new AbortController()
        controllerRef.current = controller
        const response = await fetch("/api/v1/admin/imports/sitemap", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            url: input.urlFor(page),
          }),
          signal: controller.signal,
        })
        const body = (await response.json().catch(() => null)) as {
          summary?: ImportSummary
          message?: string
          error?: string
        } | null
        if (!response.ok || !body?.summary)
          throw new Error(body?.message ?? body?.error ?? t("failed"))

        combinedSummary = addSummaries(combinedSummary, body.summary)
        const completed = page - firstPage + 1
        setSummary(combinedSummary)
        setCompletedPages(completed)
        if (completed % 10 === 0) router.refresh()
      }

      if (cancelledRef.current) setRunState("cancelled")
      else setRunState("completed")
    } catch (reason) {
      if (cancelledRef.current || isAbortError(reason)) {
        setRunState("cancelled")
      } else {
        setRunState("failed")
        setError(reason instanceof Error ? reason.message : t("failed"))
      }
    } finally {
      controllerRef.current = null
      router.refresh()
    }
  }

  function pause() {
    pausedRef.current = true
    setRunState("paused")
    router.refresh()
  }

  function resume() {
    pausedRef.current = false
    setRunState("running")
  }

  function cancel() {
    cancelledRef.current = true
    pausedRef.current = false
    controllerRef.current?.abort()
    setRunState("cancelled")
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
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id="sitemap-url"
            type="text"
            inputMode="url"
            required
            value={url}
            onChange={(event) => {
              setUrl(event.target.value)
              if (!active) setRunState("idle")
            }}
            disabled={active}
            className="min-w-0 flex-1"
          />
          {!active ? (
            <Button type="submit" disabled={!url.trim()}>
              <DatabaseZap className="size-4" />
              {t("submitRange")}
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              {runState === "paused" ? (
                <Button type="button" onClick={resume}>
                  <Play className="size-4" />
                  {t("resume")}
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={pause}>
                  <Pause className="size-4" />
                  {t("pause")}
                </Button>
              )}
              <Button type="button" variant="destructive" onClick={cancel}>
                <X className="size-4" />
                {t("cancel")}
              </Button>
            </div>
          )}
        </div>
      </form>

      {error ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {t("failedAt", { page: currentPage ?? normalizedStart })}: {error}
        </p>
      ) : null}

      {summary ? (
        <div className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-2 xl:grid-cols-4">
          {SUMMARY_KEYS.map((key) => (
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

      {runState !== "idle" ? (
        <div className="mt-5 border-t pt-5" aria-live="polite">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 font-medium">
              {runState === "running" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {t(`runState.${runState}`)}
            </span>
            <span className="text-muted-foreground">
              {t("progress", {
                current: currentPage ?? normalizedStart,
                start: normalizedStart,
                end: normalizedEnd,
              })}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="h-3 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full bg-primary transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-right text-sm font-semibold">{progress}%</p>
        </div>
      ) : null}
    </section>
  )
}

function parseSitemapInput(value: string) {
  try {
    const source = new URL(value.trim())
    if (
      source.protocol !== "https:" ||
      !/^(?:www\.)?missav\.[a-z]{2,}$/i.test(source.hostname) ||
      !/^\/sitemap[^/]*\.xml$/i.test(source.pathname)
    )
      return null

    const range = /^(.*)\[(\d+)-(\d+)\](\.xml)$/i.exec(source.pathname)
    if (range) {
      const prefix = range[1] ?? ""
      const start = Number.parseInt(range[2] ?? "", 10)
      const end = Number.parseInt(range[3] ?? "", 10)
      const suffix = range[4] ?? ".xml"
      if (start < 1 || end < start || end > 9999) return null
      return {
        start,
        end,
        urlFor(page: number) {
          const next = new URL(source)
          next.pathname = `${prefix}${page}${suffix}`
          return next.toString()
        },
      }
    }

    const pageMatch = /_(\d+)\.xml$/i.exec(source.pathname)
    const page = pageMatch ? Number.parseInt(pageMatch[1] ?? "1", 10) : 1
    return {
      start: page,
      end: page,
      urlFor() {
        return source.toString()
      },
    }
  } catch {
    return null
  }
}

function addSummaries(left: ImportSummary, right: ImportSummary) {
  return SUMMARY_KEYS.reduce<ImportSummary>(
    (result, key) => ({ ...result, [key]: left[key] + right[key] }),
    { ...EMPTY_SUMMARY }
  )
}

function isAbortError(reason: unknown) {
  return reason instanceof DOMException && reason.name === "AbortError"
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}
