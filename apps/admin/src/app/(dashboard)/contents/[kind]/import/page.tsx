import { ArrowLeft } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { notFound } from "next/navigation"

import { buttonVariants } from "@workspace/ui/components"
import { getQueueImports } from "@/lib/admin-api"

import { SitemapImportForm } from "./sitemap-import-form"
import { QueuePager } from "./queue-pager"

export default async function SitemapImportPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>
  searchParams: Promise<{ page?: string | string[] }>
}) {
  const [{ kind }, rawSearch, t] = await Promise.all([
    params,
    searchParams,
    getTranslations("admin.sitemapImport"),
  ])
  if (kind !== "video") notFound()
  const rawPage = Array.isArray(rawSearch.page)
    ? rawSearch.page[0]
    : rawSearch.page
  const page = Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1)
  const queue = await getQueueImports({ page, limit: 100 })

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-primary">{t("eyebrow")}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Link
          href="/contents/video"
          className={buttonVariants({ variant: "outline" })}
        >
          <ArrowLeft className="size-4" />
          {t("back")}
        </Link>
      </header>

      <SitemapImportForm />

      <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">{t("queueTitle")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("queueTotal", { count: queue.total })}
            </p>
          </div>
        </div>
        {queue.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">{t("dvdId")}</th>
                  <th className="px-5 py-3 font-medium">{t("source")}</th>
                  <th className="px-5 py-3 font-medium">{t("statusLabel")}</th>
                  <th className="px-5 py-3 font-medium">{t("created")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {queue.items.map((item) => (
                  <tr key={item._id}>
                    <td className="max-w-80 px-5 py-3">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate font-medium hover:underline"
                        title={item.url}
                      >
                        {item.dvdId}
                      </a>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {item.ref}
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                        {t(`status.${item.status}`)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Asia/Bangkok",
                      }).format(new Date(item.createdAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">
            {t("queueEmpty")}
          </p>
        )}
      </section>
      {queue.totalPages > 1 ? (
        <QueuePager
          page={queue.page}
          pageCount={queue.totalPages}
          pageSize={queue.limit}
        />
      ) : null}
    </div>
  )
}
