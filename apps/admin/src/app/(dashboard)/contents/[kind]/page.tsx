import { ArrowLeft, ArrowRight, Pencil, Plus, Search } from "lucide-react"
import { getLocale, getTranslations } from "next-intl/server"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Button, buttonVariants } from "@workspace/ui/components"

import { getContents } from "@/lib/admin-api"
import { isContentKind } from "@/lib/content"

const statuses = ["draft", "processing", "scheduled", "published", "ended", "failed"] as const

export default async function ContentListPage({ params, searchParams }: {
  params: Promise<{ kind: string }>
  searchParams: Promise<{ query?: string | string[]; status?: string | string[]; page?: string | string[] }>
}) {
  const [{ kind }, rawSearch, t, locale] = await Promise.all([params, searchParams, getTranslations("admin"), getLocale()])
  if (!isContentKind(kind)) notFound()
  const query = first(rawSearch.query)
  const status = first(rawSearch.status)
  const page = Math.max(1, Number.parseInt(first(rawSearch.page) || "1", 10) || 1)
  const data = await getContents({ kind, query, status, page, limit: 20 })
  const kindLabel = t(`kinds.${kind}`)

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold text-primary">{t("content")}</p><h1 className="mt-1 text-3xl font-bold tracking-tight">{t("manage", { kind: kindLabel })}</h1><p className="mt-2 text-sm text-muted-foreground">{t("manageDescription", { kind: kindLabel })}</p></div>
        <Link href={`/contents/${kind}/new`} className={buttonVariants()}><Plus className="size-4" />{t("new", { kind: t(`kindSingular.${kind}`) })}</Link>
      </header>
      <form className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_220px_auto]" action={`/contents/${kind}`}>
        <label className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input name="query" defaultValue={query} placeholder={t("search")} className="h-10 w-full rounded-lg border bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
        <select name="status" defaultValue={status} className="h-10 rounded-lg border bg-background px-3 text-sm"><option value="">{t("allStatuses")}</option>{statuses.map((item) => <option key={item} value={item}>{t(`statuses.${item}`)}</option>)}</select>
        <Button type="submit" variant="outline">{t("filter")}</Button>
      </form>
      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        {data.items.length ? <><div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">{t("title")}</th><th className="px-5 py-3">{t("status")}</th><th className="px-5 py-3">{t("visibility")}</th><th className="px-5 py-3">{t("updated")}</th><th className="w-24 px-5 py-3 text-right">{t("actions")}</th></tr></thead><tbody className="divide-y">{data.items.map((item) => <tr key={item._id} className="hover:bg-muted/30"><td className="max-w-xl px-5 py-4"><Link href={`/contents/${kind}/${item._id}/edit`} className="font-semibold hover:text-primary">{item.title || item.description?.slice(0, 90) || `#${item._id}`}</Link><p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.description}</p></td><td className="px-5 py-4"><StatusBadge status={item.status} label={t(`statuses.${item.status}`)} /></td><td className="px-5 py-4 text-muted-foreground">{t(`visibilities.${item.visibility}`)}</td><td className="whitespace-nowrap px-5 py-4 text-muted-foreground">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.updatedAt))}</td><td className="px-5 py-4 text-right"><Link href={`/contents/${kind}/${item._id}/edit`} aria-label={t("editAction")} className={buttonVariants({ variant: "ghost", size: "icon" })}><Pencil className="size-4" /></Link></td></tr>)}</tbody></table></div><div className="divide-y md:hidden">{data.items.map((item) => <Link key={item._id} href={`/contents/${kind}/${item._id}/edit`} className="block p-4 hover:bg-muted/30"><div className="flex items-start justify-between gap-3"><strong className="line-clamp-2 text-sm">{item.title || item.description?.slice(0, 80) || `#${item._id}`}</strong><Pencil className="size-4 shrink-0 text-muted-foreground" /></div><div className="mt-3 flex items-center justify-between gap-3"><StatusBadge status={item.status} label={t(`statuses.${item.status}`)} /><span className="text-xs text-muted-foreground">{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(item.updatedAt))}</span></div></Link>)}</div></> : <p className="px-5 py-20 text-center text-sm text-muted-foreground">{t("empty", { kind: kindLabel })}</p>}
      </section>
      <nav className="flex items-center justify-between gap-4"><PageLink disabled={data.page <= 1} href={pageHref(kind, query, status, data.page - 1)}><ArrowLeft className="size-4" />{t("previous")}</PageLink><span className="text-xs text-muted-foreground">{t("page", { page: data.page, total: data.totalPages })}</span><PageLink disabled={data.page >= data.totalPages} href={pageHref(kind, query, status, data.page + 1)}>{t("next")}<ArrowRight className="size-4" /></PageLink></nav>
    </div>
  )
}

function first(value?: string | string[]) { return Array.isArray(value) ? value[0] ?? "" : value ?? "" }
function pageHref(kind: string, query: string, status: string, page: number) { const params = new URLSearchParams(); if (query) params.set("query", query); if (status) params.set("status", status); params.set("page", String(Math.max(1, page))); return `/contents/${kind}?${params}` }
function StatusBadge({ status, label }: { status: string; label: string }) { const tone = status === "published" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : status === "failed" ? "bg-destructive/10 text-destructive" : status === "scheduled" ? "bg-blue-500/10 text-blue-700 dark:text-blue-400" : "bg-muted text-muted-foreground"; return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span> }
function PageLink({ disabled, href, children }: { disabled: boolean; href: string; children: React.ReactNode }) { const className = buttonVariants({ variant: "outline", size: "sm", className: disabled ? "pointer-events-none opacity-50" : undefined }); return disabled ? <span className={className}>{children}</span> : <Link href={href} className={className}>{children}</Link> }
