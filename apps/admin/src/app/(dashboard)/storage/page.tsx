import { HardDrive } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { StorageManager } from "@/components/storage/storage-manager"
import { getStorages } from "@/lib/admin-api"

export const dynamic = "force-dynamic"

export default async function StoragePage() {
  const [storages, t] = await Promise.all([
    getStorages(),
    getTranslations("admin"),
  ])
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <HardDrive className="size-5" />
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("storage.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("storage.description")}
          </p>
        </div>
      </div>
      <StorageManager initialStorages={storages} />
    </div>
  )
}
