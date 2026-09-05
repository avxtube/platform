import { Tags } from "lucide-react"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { notFound } from "next/navigation"

import { buttonVariants } from "@workspace/ui/components"

import { EntityManager } from "@/components/entity/entity-manager"
import { getAdminTerms } from "@/lib/admin-api"
import {
  termTaxonomies,
  type EntityStatus,
  type TermTaxonomy,
} from "@/lib/entity"

export default async function EntityPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>
  searchParams: Promise<{
    q?: string | string[]
    status?: string | string[]
    page?: string | string[]
  }>
}) {
  const [{ type }, rawSearch, t] = await Promise.all([
    params,
    searchParams,
    getTranslations("admin.entities"),
  ])
  if (!termTaxonomies.includes(type as TermTaxonomy)) notFound()
  const taxonomy = type as TermTaxonomy
  const query = first(rawSearch.q)?.trim() ?? ""
  const rawStatus = first(rawSearch.status)
  const status =
    rawStatus === "deleted" || rawStatus === "all"
      ? (rawStatus as EntityStatus | "all")
      : "active"
  const page = Math.max(
    1,
    Number.parseInt(first(rawSearch.page) ?? "1", 10) || 1
  )
  const data = await getAdminTerms({
    taxonomy,
    query,
    status,
    page,
    limit: 50,
  })

  return (
    <div className="space-y-6">
      <header>
        <p className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Tags className="size-4" />
          {t("eyebrow")}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {t(`taxonomy.${taxonomy}`)}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("description")}</p>
      </header>

      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label={t("title")}>
        {termTaxonomies.map((item) => (
          <Link
            key={item}
            href={`/entity/${item}`}
            className={buttonVariants({
              variant: item === taxonomy ? "default" : "outline",
              size: "sm",
            })}
          >
            {t(`taxonomy.${item}`)}
          </Link>
        ))}
      </nav>

      <EntityManager
        taxonomy={taxonomy}
        data={data}
        query={query}
        status={status}
      />
    </div>
  )
}

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}
