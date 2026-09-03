import { Plus, Search } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Button, buttonVariants } from "@workspace/ui/components"

import { getContents } from "@/lib/admin-api"
import { isContentKind } from "@/lib/content"

import { QuickContentImport } from "./quick-content-import"
import { ContentsTable } from "./table"

const statuses = [
  "draft",
  "processing",
  "scheduled",
  "published",
  "ended",
  "failed",
] as const

export default async function ContentListPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>
  searchParams: Promise<{
    query?: string | string[]
    status?: string | string[]
    page?: string | string[]
  }>
}) {
  const [{ kind }, rawSearch, t] = await Promise.all([
    params,
    searchParams,
    getTranslations("admin"),
  ])
  if (!isContentKind(kind)) notFound()

  const query = first(rawSearch.query)
  const status = first(rawSearch.status)
  const page = Math.max(
    1,
    Number.parseInt(first(rawSearch.page) || "1", 10) || 1
  )
  const data = await getContents({ kind, query, status, page, limit: 20 })
  const kindLabel = t(`kinds.${kind}`)

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-primary">{t("content")}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {t("manage", { kind: kindLabel })}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("manageDescription", { kind: kindLabel })}
          </p>
        </div>
        <Link href={`/contents/${kind}/new`} className={buttonVariants()}>
          <Plus className="size-4" />
          {t("new", { kind: t(`kindSingular.${kind}`) })}
        </Link>
      </header>

      {kind === "video" ? <QuickContentImport /> : null}

      <form
        className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_220px_auto]"
        action={`/contents/${kind}`}
      >
        <label className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="query"
            defaultValue={query}
            placeholder={t("search")}
            className="h-10 w-full rounded-lg border bg-background pr-3 pl-10 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-lg border bg-background px-3 text-sm"
        >
          <option value="">{t("allStatuses")}</option>
          {statuses.map((item) => (
            <option key={item} value={item}>
              {t(`statuses.${item}`)}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          {t("filter")}
        </Button>
      </form>

      <ContentsTable
        kind={kind}
        items={data.items}
        page={data.page}
        pageCount={data.totalPages}
        pageSize={data.limit}
        emptyLabel={t("empty", { kind: kindLabel })}
      />
    </div>
  )
}

function first(value?: string | string[]) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "")
}
