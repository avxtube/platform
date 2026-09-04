import Link from "next/link"
import { ArrowLeft, Megaphone } from "lucide-react"
import { buttonVariants } from "@workspace/ui/components"

import { RenderSettingGroup } from "@/components/setting/sections/render-group"
import { getAdvertSettings } from "@/lib/admin-api"

export const dynamic = "force-dynamic"

export default async function AdvertSettingsPage() {
  const data = await getAdvertSettings()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Megaphone className="size-5" />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Advertisements</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure and reorder video, image, and script advertisements.
            </p>
          </div>
        </div>
        <Link
          href="/setting"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ArrowLeft />
          Back
        </Link>
      </div>
      <RenderSettingGroup group="adverts" data={{ advert_hobby: data }} />
    </div>
  )
}
