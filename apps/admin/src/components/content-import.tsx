"use client"

import * as React from "react"
import { CheckCircle2, Download, Loader2, XCircle } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button, Input } from "@workspace/ui/components"

export type ImportedVideoData = {
  title?: string
  slug?: string
  content?: string
  code?: string
  duration?: number
  releaseDate?: string
  m3u8Url?: string
  poster?: string
  trailer?: string
  sourceUrl?: string
  actresses?: unknown
  makers?: unknown
  directors?: unknown
  genres?: unknown
  labels?: unknown
  video?: unknown
  thumbnail?: unknown
}

export type VideoImportResult = {
  data: ImportedVideoData
  parser?: string
  timestamp?: string
  url?: string
  success?: boolean
}

export function ContentImport({
  disabled,
  onImported,
  successMessage,
}: {
  disabled?: boolean
  onImported: (result: VideoImportResult) => void | Promise<void>
  successMessage?: string
}) {
  const t = useTranslations("admin")
  const [url, setUrl] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  async function importVideo() {
    const targetUrl = url.trim()
    if (!targetUrl || loading) return
    setLoading(true)
    setMessage(null)
    try {
      const response = await fetch(
        `/api/import/video?url=${encodeURIComponent(targetUrl)}`,
        { headers: { accept: "application/json" } }
      )
      const body = (await response.json().catch(() => null)) as
        | (VideoImportResult & { error?: string })
        | null
      if (!response.ok || !body?.data || body.success === false)
        throw new Error(body?.error ?? t("importFailed"))
      await onImported({
        ...body,
        url: body.url?.trim() || targetUrl,
      })
      setUrl("")
      setMessage({
        type: "success",
        text: successMessage ?? t("importSuccess"),
      })
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : t("importFailed"),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              void importVideo()
            }
          }}
          disabled={disabled || loading}
          placeholder={t("importUrlPlaceholder")}
        />
        <Button
          type="button"
          onClick={() => void importVideo()}
          disabled={disabled || loading || !url.trim()}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {t("importAction")}
        </Button>
      </div>
      {message ? (
        <p
          className={`flex items-center gap-1.5 text-xs ${message.type === "success" ? "text-emerald-600" : "text-destructive"}`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="size-3.5" />
          ) : (
            <XCircle className="size-3.5" />
          )}
          {message.text}
        </p>
      ) : null}
    </div>
  )
}

export function importedNames(value: unknown) {
  const items = Array.isArray(value) ? value : value ? [value] : []
  return [
    ...new Set(
      items.flatMap((item) => {
        if (typeof item === "string") return item.trim() ? [item.trim()] : []
        if (!item || typeof item !== "object") return []
        const name =
          "value" in item && typeof item.value === "string"
            ? item.value.trim()
            : ""
        return name ? [name] : []
      })
    ),
  ]
}
