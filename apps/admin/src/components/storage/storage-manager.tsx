"use client"

import * as React from "react"
import {
  Activity,
  Cloud,
  Database,
  HardDrive,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { useTranslations } from "next-intl"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components"

import {
  storagePurposes,
  type AdminStorage,
  type StoragePayload,
  type StorageProvider,
  type StoragePurpose,
} from "@/lib/storage"

const emptyDraft: StoragePayload = {
  name: "",
  provider: "local",
  enabled: false,
  priority: 100,
  purposes: ["videos", "images"],
  publicUrl: "",
  local: { basePath: "" },
  s3: {
    endpoint: "",
    region: "us-east-1",
    bucket: "",
    prefix: "",
    accessKeyId: "",
    secretAccessKey: "",
    forcePathStyle: false,
  },
}

export function StorageManager({
  initialStorages,
}: {
  initialStorages: AdminStorage[]
}) {
  const t = useTranslations("admin")
  const [storages, setStorages] = React.useState(initialStorages)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<AdminStorage | null>(null)
  const [draft, setDraft] = React.useState<StoragePayload>(emptyDraft)
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<AdminStorage | null>(
    null
  )

  const enabledCount = storages.filter((storage) => storage.enabled).length
  const onlineCount = storages.filter(
    (storage) => storage.status === "online"
  ).length

  function openCreate() {
    setEditing(null)
    setDraft(structuredClone(emptyDraft))
    setError(null)
    setDialogOpen(true)
  }

  function openEdit(storage: AdminStorage) {
    setEditing(storage)
    setDraft({
      name: storage.name,
      provider: storage.provider,
      enabled: storage.enabled,
      priority: storage.priority,
      purposes: storage.purposes,
      publicUrl: storage.publicUrl ?? "",
      local: { basePath: storage.local?.basePath ?? "" },
      s3: {
        endpoint: storage.s3?.endpoint ?? "",
        region: storage.s3?.region ?? "us-east-1",
        bucket: storage.s3?.bucket ?? "",
        prefix: storage.s3?.prefix ?? "",
        accessKeyId: "",
        secretAccessKey: "",
        forcePathStyle: storage.s3?.forcePathStyle ?? false,
      },
    })
    setError(null)
    setDialogOpen(true)
  }

  async function saveStorage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const action = editing ? `save:${editing._id}` : "create"
    setBusy(action)
    setError(null)
    try {
      const response = await fetch(
        editing
          ? `/api/v1/admin/storages/${editing._id}`
          : "/api/v1/admin/storages",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(draft),
        }
      )
      const body = (await response.json().catch(() => null)) as {
        storage?: AdminStorage
        message?: string
        error?: string
      } | null
      if (!response.ok || !body?.storage)
        throw new Error(body?.message ?? body?.error ?? t("storage.saveFailed"))
      const savedStorage = body.storage
      setStorages((current) =>
        editing
          ? current.map((storage) =>
              storage._id === savedStorage._id ? savedStorage : storage
            )
          : [savedStorage, ...current]
      )
      setNotice({
        type: "success",
        message: t("storage.savedNotice", { name: savedStorage.name }),
      })
      setDialogOpen(false)
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : t("storage.saveFailed")
      )
    } finally {
      setBusy(null)
    }
  }

  async function toggleStorage(storage: AdminStorage, enabled: boolean) {
    const action = `toggle:${storage._id}`
    setBusy(action)
    try {
      const response = await fetch(
        `/api/v1/admin/storages/${storage._id}/enabled`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ enabled }),
        }
      )
      const body = (await response.json().catch(() => null)) as {
        storage?: AdminStorage
        message?: string
        error?: string
      } | null
      if (!response.ok || !body?.storage)
        throw new Error(body?.message ?? body?.error ?? t("storage.saveFailed"))
      setStorages((current) =>
        current.map((item) => (item._id === storage._id ? body.storage! : item))
      )
      setNotice({
        type: "success",
        message: t(
          enabled ? "storage.enabledNotice" : "storage.disabledNotice",
          { name: storage.name }
        ),
      })
    } catch (reason) {
      setNotice({
        type: "error",
        message:
          reason instanceof Error ? reason.message : t("storage.saveFailed"),
      })
    } finally {
      setBusy(null)
    }
  }

  async function testStorage(storage: AdminStorage) {
    const action = `test:${storage._id}`
    setBusy(action)
    try {
      const response = await fetch(
        `/api/v1/admin/storages/${storage._id}/test`,
        { method: "POST" }
      )
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean
        status?: AdminStorage["status"]
        checkedAt?: string
        latencyMs?: number
        message?: string
        capacity?: AdminStorage["capacity"]
        error?: string
      } | null
      if (!response.ok || !body?.status)
        throw new Error(body?.message ?? body?.error ?? t("storage.testFailed"))
      setStorages((current) =>
        current.map((item) =>
          item._id === storage._id
            ? {
                ...item,
                status: body.status!,
                health: {
                  checkedAt: body.checkedAt,
                  latencyMs: body.latencyMs,
                  message: body.message,
                },
                capacity: body.capacity,
              }
            : item
        )
      )
      setNotice({
        type: body.ok ? "success" : "error",
        message:
          body.message ??
          t(body.ok ? "storage.testOnline" : "storage.testFailed"),
      })
    } catch (reason) {
      setNotice({
        type: "error",
        message:
          reason instanceof Error ? reason.message : t("storage.testFailed"),
      })
    } finally {
      setBusy(null)
    }
  }

  async function deleteStorage() {
    if (!deleteTarget) return
    const action = `delete:${deleteTarget._id}`
    setBusy(action)
    try {
      const response = await fetch(
        `/api/v1/admin/storages/${deleteTarget._id}`,
        { method: "DELETE" }
      )
      const body = (await response.json().catch(() => null)) as {
        message?: string
        error?: string
      } | null
      if (!response.ok)
        throw new Error(
          body?.message ?? body?.error ?? t("storage.deleteFailed")
        )
      setStorages((current) =>
        current.filter((storage) => storage._id !== deleteTarget._id)
      )
      setNotice({
        type: "success",
        message: t("storage.deletedNotice", { name: deleteTarget.name }),
      })
      setDeleteTarget(null)
    } catch (reason) {
      setNotice({
        type: "error",
        message:
          reason instanceof Error ? reason.message : t("storage.deleteFailed"),
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Database}
          label={t("storage.total")}
          value={storages.length}
        />
        <SummaryCard
          icon={Activity}
          label={t("storage.enabledCount")}
          value={enabledCount}
        />
        <SummaryCard
          icon={RefreshCw}
          label={t("storage.onlineCount")}
          value={onlineCount}
        />
        <SummaryCard
          icon={Cloud}
          label={t("storage.s3Count")}
          value={storages.filter((storage) => storage.provider === "s3").length}
        />
      </div>
      {notice ? (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${notice.type === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}
        >
          <span>{notice.message}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setNotice(null)}
          >
            {t("storage.dismiss")}
          </Button>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">{t("storage.backends")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("storage.backendsDescription")}
            </p>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus />
            {t("storage.add")}
          </Button>
        </div>
        {storages.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("storage.name")}</TableHead>
                <TableHead>{t("storage.provider")}</TableHead>
                <TableHead>{t("storage.health")}</TableHead>
                <TableHead className="hidden lg:table-cell">
                  {t("storage.purposes")}
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("storage.capacity")}
                </TableHead>
                <TableHead>{t("storage.enabled")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {storages.map((storage) => (
                <TableRow key={storage._id}>
                  <TableCell className="min-w-56">
                    <StorageIdentity storage={storage} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1.5 uppercase">
                      {storage.provider === "s3" ? (
                        <Cloud className="size-3" />
                      ) : (
                        <HardDrive className="size-3" />
                      )}
                      {storage.provider}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <HealthBadge storage={storage} />
                  </TableCell>
                  <TableCell className="hidden max-w-72 lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {storage.purposes.map((purpose) => (
                        <Badge key={purpose} variant="secondary">
                          {t(`storage.purpose.${purpose}`)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Capacity storage={storage} />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={storage.enabled}
                      onCheckedChange={(checked) =>
                        void toggleStorage(storage, checked)
                      }
                      disabled={Boolean(busy)}
                      aria-label={t("storage.toggle", { name: storage.name })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => void testStorage(storage)}
                        disabled={Boolean(busy)}
                        aria-label={t("storage.test")}
                      >
                        <RefreshCw
                          className={
                            busy === `test:${storage._id}` ? "animate-spin" : ""
                          }
                        />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(storage)}
                        disabled={Boolean(busy)}
                        aria-label={t("editAction")}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteTarget(storage)}
                        disabled={storage.enabled || Boolean(busy)}
                        aria-label={t("storage.delete")}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
            <HardDrive className="size-12 text-muted-foreground/40" />
            <h3 className="mt-4 font-semibold">{t("storage.empty")}</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {t("storage.emptyDescription")}
            </p>
            <Button type="button" onClick={openCreate} className="mt-5">
              <Plus />
              {t("storage.add")}
            </Button>
          </div>
        )}
      </section>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!busy) setDialogOpen(open)
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t(editing ? "storage.edit" : "storage.create")}
            </DialogTitle>
            <DialogDescription>
              {t("storage.formDescription")}
            </DialogDescription>
          </DialogHeader>
          <StorageForm
            draft={draft}
            setDraft={setDraft}
            editing={Boolean(editing)}
            error={error}
            onSubmit={saveStorage}
          />
          <DialogFooter className="border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={Boolean(busy)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" form="storage-form" disabled={Boolean(busy)}>
              {busy ? <RefreshCw className="animate-spin" /> : null}
              {t(editing ? "save" : "storage.createAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !busy) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("storage.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("storage.deleteDescription", {
                name: deleteTarget?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(busy)}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void deleteStorage()}
              disabled={Boolean(busy)}
            >
              {t("storage.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function StorageForm({
  draft: value,
  setDraft: update,
  editing: isEditing,
  error: formError,
  onSubmit,
}: {
  draft: StoragePayload
  setDraft: React.Dispatch<React.SetStateAction<StoragePayload>>
  editing: boolean
  error: string | null
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  const t = useTranslations("admin")

  return (
    <form
      id="storage-form"
      onSubmit={onSubmit}
      className="min-h-0 space-y-6 overflow-y-auto overscroll-contain pr-1"
    >
      {formError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {formError}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
        <FormField label={t("storage.name")}>
          <Input
            required
            value={value.name}
            onChange={(event) =>
              update((current) => ({ ...current, name: event.target.value }))
            }
            placeholder={t("storage.namePlaceholder")}
          />
        </FormField>
        <FormField label={t("storage.priority")}>
          <Input
            required
            type="number"
            min={0}
            max={1000}
            value={value.priority}
            onChange={(event) =>
              update((current) => ({
                ...current,
                priority: Number(event.target.value),
              }))
            }
          />
        </FormField>
      </div>
      <FormField label={t("storage.provider")}>
        <Tabs
          value={value.provider}
          onValueChange={(provider) =>
            update((current) => ({
              ...current,
              provider: provider as StorageProvider,
            }))
          }
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="local">
              <HardDrive />
              {t("storage.local")}
            </TabsTrigger>
            <TabsTrigger value="s3">
              <Cloud />
              {t("storage.s3")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </FormField>
      {value.provider === "local" ? (
        <div className="rounded-xl border p-4">
          <FormField
            label={t("storage.basePath")}
            help={t("storage.basePathHelp")}
          >
            <Input
              required
              value={value.local.basePath}
              onChange={(event) =>
                update((current) => ({
                  ...current,
                  local: { basePath: event.target.value },
                }))
              }
              placeholder={t("storage.basePathPlaceholder")}
              className="font-mono"
            />
          </FormField>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("storage.bucket")}>
              <Input
                required
                value={value.s3.bucket}
                onChange={(event) =>
                  updateS3(update, { bucket: event.target.value })
                }
              />
            </FormField>
            <FormField label={t("storage.region")}>
              <Input
                required
                value={value.s3.region}
                onChange={(event) =>
                  updateS3(update, { region: event.target.value })
                }
                placeholder="us-east-1 / auto"
              />
            </FormField>
          </div>
          <FormField
            label={t("storage.endpoint")}
            help={t("storage.endpointHelp")}
          >
            <Input
              type="url"
              value={value.s3.endpoint}
              onChange={(event) =>
                updateS3(update, { endpoint: event.target.value })
              }
              placeholder="https://..."
              className="font-mono"
            />
          </FormField>
          <FormField label={t("storage.prefix")}>
            <Input
              value={value.s3.prefix}
              onChange={(event) =>
                updateS3(update, { prefix: event.target.value })
              }
              placeholder="media/videos"
              className="font-mono"
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("storage.accessKey")}>
              <Input
                required={!isEditing}
                autoComplete="off"
                value={value.s3.accessKeyId}
                onChange={(event) =>
                  updateS3(update, { accessKeyId: event.target.value })
                }
                placeholder={
                  isEditing ? t("storage.keepCredential") : "Access key ID"
                }
                className="font-mono"
              />
            </FormField>
            <FormField label={t("storage.secretKey")}>
              <Input
                required={!isEditing}
                type="password"
                autoComplete="new-password"
                value={value.s3.secretAccessKey}
                onChange={(event) =>
                  updateS3(update, { secretAccessKey: event.target.value })
                }
                placeholder={
                  isEditing ? t("storage.keepCredential") : "Secret access key"
                }
                className="font-mono"
              />
            </FormField>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <Label>{t("storage.forcePathStyle")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("storage.forcePathStyleHelp")}
              </p>
            </div>
            <Switch
              checked={value.s3.forcePathStyle}
              onCheckedChange={(checked) =>
                updateS3(update, { forcePathStyle: checked })
              }
            />
          </div>
        </div>
      )}
      <FormField
        label={t("storage.publicUrl")}
        help={t("storage.publicUrlHelp")}
      >
        <Input
          type="url"
          value={value.publicUrl}
          onChange={(event) =>
            update((current) => ({ ...current, publicUrl: event.target.value }))
          }
          placeholder="https://cdn.example.com"
        />
      </FormField>
      <FormField label={t("storage.purposes")}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {storagePurposes.map((purpose) => (
            <label
              key={purpose}
              className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm"
            >
              <Checkbox
                checked={value.purposes.includes(purpose)}
                onCheckedChange={(checked) =>
                  update((current) => ({
                    ...current,
                    purposes: togglePurpose(current.purposes, purpose, checked),
                  }))
                }
              />
              <span>{t(`storage.purpose.${purpose}`)}</span>
            </label>
          ))}
        </div>
      </FormField>
      <div className="flex items-center justify-between rounded-xl border p-4">
        <div>
          <Label>{t("storage.enabled")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("storage.enabledHelp")}
          </p>
        </div>
        <Switch
          checked={value.enabled}
          onCheckedChange={(enabled) =>
            update((current) => ({ ...current, enabled }))
          }
        />
      </div>
    </form>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Database
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function StorageIdentity({ storage }: { storage: AdminStorage }) {
  const detail =
    storage.provider === "local"
      ? storage.local?.basePath
      : [storage.s3?.bucket, storage.s3?.prefix].filter(Boolean).join("/")
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        {storage.provider === "s3" ? (
          <Cloud className="size-4" />
        ) : (
          <HardDrive className="size-4" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium">{storage.name}</span>
        <span className="block max-w-80 truncate font-mono text-xs text-muted-foreground">
          {detail || "—"}
        </span>
      </span>
    </div>
  )
}

function HealthBadge({ storage }: { storage: AdminStorage }) {
  const t = useTranslations("admin")
  const variant =
    storage.status === "online"
      ? "secondary"
      : storage.status === "error"
        ? "destructive"
        : "outline"
  return (
    <div className="space-y-1">
      <Badge variant={variant}>{t(`storage.status.${storage.status}`)}</Badge>
      {storage.health?.latencyMs !== undefined ? (
        <p className="text-[11px] text-muted-foreground">
          {storage.health.latencyMs} ms
        </p>
      ) : null}
      {storage.health?.message ? (
        <p
          className="max-w-56 truncate text-[11px] text-muted-foreground"
          title={storage.health.message}
        >
          {storage.health.message}
        </p>
      ) : null}
    </div>
  )
}

function Capacity({ storage }: { storage: AdminStorage }) {
  const total = storage.capacity?.totalBytes ?? 0
  const used = storage.capacity?.usedBytes ?? 0
  if (!total) return <span className="text-xs text-muted-foreground">—</span>
  const percentage = Math.min(100, Math.round((used / total) * 100))
  return (
    <div className="w-32 space-y-1">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        {formatBytes(used)} / {formatBytes(total)}
      </p>
    </div>
  )
}

function FormField({
  label,
  help,
  children,
}: {
  label: string
  help?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
    </div>
  )
}

function updateS3(
  update: React.Dispatch<React.SetStateAction<StoragePayload>>,
  values: Partial<StoragePayload["s3"]>
) {
  update((current) => ({ ...current, s3: { ...current.s3, ...values } }))
}

function togglePurpose(
  current: StoragePurpose[],
  purpose: StoragePurpose,
  checked: boolean
) {
  return checked
    ? [...new Set([...current, purpose])]
    : current.filter((item) => item !== purpose)
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB", "PB"]
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1
  )
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}
