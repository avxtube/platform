"use client"

import * as React from "react"
import { Pencil, Plus, Search, Trash2, Users } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter, useSearchParams } from "next/navigation"

import { DataTablePager } from "@workspace/data-table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@workspace/ui/components"

import {
  channelGenders,
  channelKinds,
  channelRoles,
  type AdminChannel,
  type AdminChannelGender,
  type AdminChannelKind,
  type AdminChannelStatus,
  type ChannelPayload,
  type EntityListResponse,
} from "@/lib/entity"

export function ChannelManager({
  data,
  query,
  kind,
  status,
}: {
  data: EntityListResponse<AdminChannel>
  query: string
  kind?: AdminChannelKind
  status: AdminChannelStatus | "all"
}) {
  const t = useTranslations("admin.channels")
  const router = useRouter()
  const searchParams = useSearchParams()
  const [editing, setEditing] = React.useState<AdminChannel | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<AdminChannel | null>(
    null
  )
  const [busy, setBusy] = React.useState(false)
  const [notice, setNotice] = React.useState<string | null>(null)

  function navigate(changes: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(changes).forEach(([key, value]) => {
      if (value && !(key === "page" && value === "1")) params.set(key, value)
      else params.delete(key)
    })
    const next = params.toString()
    router.push(`/channels${next ? `?${next}` : ""}`)
  }

  async function remove() {
    if (!deleteTarget) return
    setBusy(true)
    setNotice(null)
    try {
      const response = await fetch(
        `/api/v1/admin/channels/manage/${deleteTarget._id}`,
        { method: "DELETE" }
      )
      if (!response.ok) throw await responseError(response, t("deleteFailed"))
      setDeleteTarget(null)
      router.refresh()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t("deleteFailed"))
    } finally {
      setBusy(false)
    }
  }

  const afterSaved = () => {
    setEditing(null)
    setCreateOpen(false)
    setNotice(t("saved"))
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-end">
        <form
          className="flex min-w-0 flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            navigate({ q: String(form.get("q") ?? "").trim(), page: "1" })
          }}
        >
          <Input name="q" defaultValue={query} placeholder={t("search")} />
          <Button
            type="submit"
            variant="outline"
            aria-label={t("searchAction")}
          >
            <Search className="size-4" />
          </Button>
        </form>
        <select
          value={kind ?? ""}
          onChange={(event) =>
            navigate({ kind: event.target.value, page: "1" })
          }
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">{t("allKinds")}</option>
          {channelKinds.map((value) => (
            <option key={value} value={value}>
              {t(`kind.${value}`)}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) =>
            navigate({ status: event.target.value, page: "1" })
          }
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="active">{t("status.active")}</option>
          <option value="suspended">{t("status.suspended")}</option>
          <option value="deleted">{t("status.deleted")}</option>
          <option value="all">{t("status.all")}</option>
        </select>
        <Button
          type="button"
          className="lg:hidden"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" />
          {t("create")}
        </Button>
      </div>

      {notice ? (
        <p className="rounded-lg border bg-card px-4 py-3 text-sm">{notice}</p>
      ) : null}

      <div className="flex flex-col gap-5 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
            {data.items.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("name")}</TableHead>
                      <TableHead>{t("kindLabel")}</TableHead>
                      <TableHead className="hidden md:table-cell">
                        {t("videos")}
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        {t("statusLabel")}
                      </TableHead>
                      <TableHead className="w-24 text-right">
                        {t("actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>
                          <div className="flex min-w-56 items-center gap-3">
                            <Avatar channel={item} />
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {item.name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                @{item.handle}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p>{t(`kind.${item.kind}`)}</p>
                          {item.roles.length ? (
                            <p className="text-xs text-muted-foreground">
                              {item.roles
                                .map((role) => t(`role.${role}`))
                                .join(", ")}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {(item.stats.videoCount ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <ChannelStatus
                            value={item.status}
                            label={t(`status.${item.status}`)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditing(item)}
                              aria-label={t("edit")}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            {item.status !== "deleted" ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteTarget(item)}
                                aria-label={t("delete")}
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center px-6 text-center">
                <div className="space-y-3">
                  <Users className="mx-auto size-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{t("empty")}</p>
                </div>
              </div>
            )}
          </div>
          {data.totalPages > 1 ? (
            <DataTablePager
              page={data.page}
              pageCount={data.totalPages}
              pageSize={data.limit}
              onPageChange={(page) => navigate({ page: String(page) })}
            />
          ) : null}
        </div>

        <aside className="hidden w-96 shrink-0 lg:block">
          <div className="sticky top-24 rounded-xl border bg-card p-5 shadow-xs">
            <h2 className="font-semibold">{t("create")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("createDescription")}
            </p>
            <ChannelForm onSaved={afterSaved} />
          </div>
        </aside>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("create")}</DialogTitle>
            <DialogDescription>{t("createDescription")}</DialogDescription>
          </DialogHeader>
          <ChannelForm onSaved={afterSaved} />
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("edit")}</DialogTitle>
            <DialogDescription>{t("editDescription")}</DialogDescription>
          </DialogHeader>
          {editing ? <ChannelForm item={editing} onSaved={afterSaved} /> : null}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription", { name: deleteTarget?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault()
                void remove()
              }}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ChannelForm({
  item,
  onSaved,
}: {
  item?: AdminChannel
  onSaved: () => void
}) {
  const t = useTranslations("admin.channels")
  const formId = React.useId()
  const [kind, setKind] = React.useState<AdminChannelKind>(
    item?.kind ?? "person"
  )
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const gender = form.get("gender")
    const payload: ChannelPayload = {
      kind,
      layout: form.get("layout") === "compact" ? "compact" : "banner",
      name: String(form.get("name") ?? ""),
      handle: String(form.get("handle") ?? ""),
      description: String(form.get("description") ?? ""),
      avatarUrl: String(form.get("avatarUrl") ?? ""),
      bannerUrl: String(form.get("bannerUrl") ?? ""),
      status: parseStatus(form.get("status")),
      roles: form
        .getAll("roles")
        .filter((role): role is ChannelPayload["roles"][number] =>
          channelRoles.includes(role as ChannelPayload["roles"][number])
        ),
      ...(kind === "person" &&
      channelGenders.includes(gender as AdminChannelGender)
        ? { gender: gender as AdminChannelGender }
        : {}),
    }
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(
        item
          ? `/api/v1/admin/channels/manage/${item._id}`
          : "/api/v1/admin/channels/manage",
        {
          method: item ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      if (!response.ok) throw await responseError(response, t("saveFailed"))
      onSaved()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("saveFailed"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="mt-4 space-y-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={`${formId}-name`}
          label={t("name")}
          name="name"
          required
          defaultValue={item?.name}
        />
        <Field
          id={`${formId}-handle`}
          label={t("handle")}
          name="handle"
          defaultValue={item?.handle}
          placeholder={t("handleHelp")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id={`${formId}-kind`}
          label={t("kindLabel")}
          name="kind"
          value={kind}
          onChange={(value) => setKind(value as AdminChannelKind)}
          options={channelKinds.map((value) => ({
            value,
            label: t(`kind.${value}`),
          }))}
        />
        <SelectField
          id={`${formId}-layout`}
          label={t("layoutLabel")}
          name="layout"
          defaultValue={item?.layout ?? "banner"}
          options={[
            { value: "banner", label: t("layout.banner") },
            { value: "compact", label: t("layout.compact") },
          ]}
        />
      </div>
      {kind === "person" ? (
        <SelectField
          id={`${formId}-gender`}
          label={t("genderLabel")}
          name="gender"
          defaultValue={item?.gender ?? ""}
          options={[
            { value: "", label: t("gender.unknown") },
            ...channelGenders.map((value) => ({
              value,
              label: t(`gender.${value}`),
            })),
          ]}
        />
      ) : null}
      <div className="space-y-1.5">
        <Label>{t("roles")}</Label>
        <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
          {channelRoles.map((role) => (
            <label key={role} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="roles"
                value={role}
                defaultChecked={item?.roles.includes(role)}
              />
              {t(`role.${role}`)}
            </label>
          ))}
        </div>
      </div>
      <Field
        id={`${formId}-avatar`}
        label={t("avatarUrl")}
        name="avatarUrl"
        type="url"
        defaultValue={item?.avatarUrl ?? ""}
      />
      <Field
        id={`${formId}-banner`}
        label={t("bannerUrl")}
        name="bannerUrl"
        type="url"
        defaultValue={item?.bannerUrl ?? ""}
      />
      <div className="space-y-1.5">
        <Label htmlFor={`${formId}-description`}>{t("descriptionLabel")}</Label>
        <Textarea
          id={`${formId}-description`}
          name="description"
          rows={4}
          maxLength={5000}
          defaultValue={item?.description}
        />
      </div>
      {item ? (
        <SelectField
          id={`${formId}-status`}
          label={t("statusLabel")}
          name="status"
          defaultValue={item.status}
          options={[
            { value: "active", label: t("status.active") },
            { value: "suspended", label: t("status.suspended") },
            { value: "deleted", label: t("status.deleted") },
          ]}
        />
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? t("saving") : t(item ? "save" : "create")}
      </Button>
    </form>
  )
}

function Field({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={props.id}>{label}</Label>
      <Input {...props} />
    </div>
  )
}

function SelectField({
  id,
  label,
  name,
  options,
  value,
  defaultValue,
  onChange,
}: {
  id: string
  label: string
  name: string
  options: { value: string; label: string }[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={name}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onChange={
          onChange ? (event) => onChange(event.target.value) : undefined
        }
        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function Avatar({ channel }: { channel: AdminChannel }) {
  return channel.avatarUrl ? (
    <div
      role="img"
      aria-label={channel.name}
      className="size-10 shrink-0 rounded-full bg-cover bg-center"
      style={{ backgroundImage: `url(${JSON.stringify(channel.avatarUrl)})` }}
    />
  ) : (
    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-muted font-semibold">
      {channel.name.slice(0, 1).toUpperCase()}
    </div>
  )
}

function ChannelStatus({
  value,
  label,
}: {
  value: AdminChannelStatus
  label: string
}) {
  const tone =
    value === "active"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : value === "suspended"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : "bg-muted text-muted-foreground"
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {label}
    </span>
  )
}

function parseStatus(value: FormDataEntryValue | null): AdminChannelStatus {
  return value === "suspended" || value === "deleted" ? value : "active"
}

async function responseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    message?: string
    error?: string
  } | null
  return new Error(body?.message ?? body?.error ?? fallback)
}
