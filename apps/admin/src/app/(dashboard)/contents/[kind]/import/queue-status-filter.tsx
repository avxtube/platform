"use client"

import { useTranslations } from "next-intl"
import { useRouter, useSearchParams } from "next/navigation"

import type { QueueImportStatus } from "@/lib/queue-import"

const STATUSES: QueueImportStatus[] = [
  "pending",
  "processing",
  "completed",
  "failed",
]

export function QueueStatusFilter({ value }: { value?: QueueImportStatus }) {
  const t = useTranslations("admin.sitemapImport")
  const router = useRouter()
  const searchParams = useSearchParams()

  function changeStatus(nextStatus: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("page")
    if (STATUSES.includes(nextStatus as QueueImportStatus))
      params.set("status", nextStatus)
    else params.delete("status")
    const query = params.toString()
    router.push(`/contents/video/import${query ? `?${query}` : ""}`)
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{t("filterStatus")}</span>
      <select
        value={value ?? ""}
        onChange={(event) => changeStatus(event.target.value)}
        className="h-9 rounded-md border bg-background px-3 text-sm"
      >
        <option value="">{t("allStatuses")}</option>
        {STATUSES.map((status) => (
          <option key={status} value={status}>
            {t(`status.${status}`)}
          </option>
        ))}
      </select>
    </label>
  )
}
