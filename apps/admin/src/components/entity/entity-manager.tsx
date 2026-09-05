"use client"

import * as React from "react"
import { FileQuestion, Pencil, Plus, Search, Trash2 } from "lucide-react"
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

import type {
  AdminTerm,
  EntityListResponse,
  EntityStatus,
  TermPayload,
  TermTaxonomy,
} from "@/lib/entity"

export function EntityManager({
  taxonomy,
  data,
  query,
  status,
}: {
  taxonomy: TermTaxonomy
  data: EntityListResponse<AdminTerm>
  query: string
  status: EntityStatus | "all"
}) {
  const t = useTranslations("admin.entities")
  const router = useRouter()
  const searchParams = useSearchParams()
  const [editing, setEditing] = React.useState<AdminTerm | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<AdminTerm | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [notice, setNotice] = React.useState<string | null>(null)

  function navigate(changes: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(changes).forEach(([key, value]) => {
      if (value && !(key === "page" && value === "1")) params.set(key, value)
      else params.delete(key)
    })
    const next = params.toString()
    router.push(`/entity/${taxonomy}${next ? `?${next}` : ""}`)
  }

  async function remove() {
    if (!deleteTarget) return
    setBusy(true)
    setNotice(null)
    try {
      const response = await fetch(`/api/v1/admin/terms/${deleteTarget._id}`, {
        method: "DELETE",
      })
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
          <Input
            name="q"
            defaultValue={query}
            placeholder={t("search")}
            className="min-w-0"
          />
          <Button
            type="submit"
            variant="outline"
            aria-label={t("searchAction")}
          >
            <Search className="size-4" />
          </Button>
        </form>
        <select
          value={status}
          onChange={(event) =>
            navigate({ status: event.target.value, page: "1" })
          }
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="active">{t("status.active")}</option>
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
                      <TableHead>{t("slug")}</TableHead>
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
                          <p className="font-medium">{item.name}</p>
                          {item.description ? (
                            <p className="max-w-xl truncate text-xs text-muted-foreground">
                              {item.description}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.slug}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Status
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
                  <FileQuestion className="mx-auto size-10 text-muted-foreground" />
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
            <TermForm taxonomy={taxonomy} onSaved={afterSaved} />
          </div>
        </aside>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("create")}</DialogTitle>
            <DialogDescription>{t("createDescription")}</DialogDescription>
          </DialogHeader>
          <TermForm taxonomy={taxonomy} onSaved={afterSaved} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("edit")}</DialogTitle>
            <DialogDescription>{t("editDescription")}</DialogDescription>
          </DialogHeader>
          {editing ? (
            <TermForm taxonomy={taxonomy} item={editing} onSaved={afterSaved} />
          ) : null}
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

function TermForm({
  taxonomy,
  item,
  onSaved,
}: {
  taxonomy: TermTaxonomy
  item?: AdminTerm
  onSaved: () => void
}) {
  const t = useTranslations("admin.entities")
  const formId = React.useId()
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const payload: TermPayload = {
      taxonomy,
      name: String(form.get("name") ?? ""),
      slug: String(form.get("slug") ?? ""),
      description: String(form.get("description") ?? ""),
      status: form.get("status") === "deleted" ? "deleted" : "active",
    }
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(
        item ? `/api/v1/admin/terms/${item._id}` : "/api/v1/admin/terms",
        {
          method: item ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      if (!response.ok) throw await responseError(response, t("saveFailed"))
      if (!item) formElement.reset()
      onSaved()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("saveFailed"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="mt-4 space-y-4" onSubmit={submit}>
      <div className="space-y-1.5">
        <Label htmlFor={`${formId}-name`}>{t("name")}</Label>
        <Input
          id={`${formId}-name`}
          name="name"
          required
          maxLength={100}
          defaultValue={item?.name}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${formId}-slug`}>{t("slug")}</Label>
        <Input
          id={`${formId}-slug`}
          name="slug"
          maxLength={120}
          defaultValue={item?.slug}
          placeholder={t("slugHelp")}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${formId}-description`}>{t("descriptionLabel")}</Label>
        <Textarea
          id={`${formId}-description`}
          name="description"
          maxLength={2000}
          defaultValue={item?.description}
          rows={4}
        />
      </div>
      {item ? (
        <div className="space-y-1.5">
          <Label htmlFor={`${formId}-status`}>{t("statusLabel")}</Label>
          <select
            id={`${formId}-status`}
            name="status"
            defaultValue={item.status}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="active">{t("status.active")}</option>
            <option value="deleted">{t("status.deleted")}</option>
          </select>
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? t("saving") : t(item ? "save" : "create")}
      </Button>
    </form>
  )
}

function Status({ value, label }: { value: EntityStatus; label: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${value === "active" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}
    >
      {label}
    </span>
  )
}

async function responseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    message?: string
    error?: string
  } | null
  return new Error(body?.message ?? body?.error ?? fallback)
}
