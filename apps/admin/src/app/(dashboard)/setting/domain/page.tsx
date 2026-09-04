import Link from "next/link"
import { ArrowLeft, Globe } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { buttonVariants } from "@workspace/ui/components"
import { RenderSettingGroup } from "@/components/setting/sections/render-group"
import { getDomainSettings } from "@/lib/admin-api"

export const dynamic = "force-dynamic"

export default async function DomainSettingsPage() {
  const [data, t] = await Promise.all([
    getDomainSettings(),
    getTranslations("admin.settings"),
  ])
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Globe className="size-5" />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("domain.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("domain.description")}
            </p>
          </div>
        </div>
        <Link
          href="/setting"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ArrowLeft />
          {t("back")}
        </Link>
      </div>
      <RenderSettingGroup group="domain" data={data} />
    </div>
  )
}
