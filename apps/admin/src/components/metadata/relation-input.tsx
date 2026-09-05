"use client"

import * as React from "react"
import { Check, GripVertical, Loader2, Plus, X } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Input,
} from "@workspace/ui/components"

import { useRelationOptions, type RelationKind } from "./hooks"
import type { ContentRelations } from "@/lib/content"
import {
  createPendingChannelValue,
  parsePendingChannelValue,
} from "./pending-channels"
import { createPendingTermValue, parsePendingTermValue } from "./pending-terms"

export function MetadataRelationInput({
  id,
  kind,
  multiple,
  value,
  initialOptions,
  truncateLabelAt,
  disabled,
  onChange,
}: {
  id: string
  kind: RelationKind
  multiple: boolean
  value: string[]
  initialOptions?: ContentRelations
  truncateLabelAt?: number
  disabled?: boolean
  onChange: (value: string | string[]) => void
}) {
  const t = useTranslations("admin")
  const rootRef = React.useRef<HTMLDivElement>(null)
  const [query, setQuery] = React.useState("")
  const [debouncing, setDebouncing] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(-1)
  const [draggedValue, setDraggedValue] = React.useState<string | null>(null)
  const [confirmedMissingTerms, setConfirmedMissingTerms] = React.useState<
    Set<string>
  >(() => new Set())
  const uncheckedTermKeys = React.useRef(new Set<string>())
  const currentValue = React.useRef(value)
  const isTerm = ["category", "tag", "label", "series"].includes(kind)
  const canCreate = kind !== "video"
  const existingIds = value.filter((item) => !parsePendingValue(item))
  const resolvedInitialOptions = React.useMemo(
    () =>
      [
        ...(initialOptions?.channels ?? [])
          .filter((channel) =>
            channel.positions.includes(
              kind === "actress"
                ? "actresses"
                : kind === "actor"
                  ? "actors"
                  : kind === "director"
                    ? "directors"
                    : kind
            )
          )
          .map((channel) => ({
            id: channel.id,
            name: channel.name,
            description: `@${channel.handle.replace(/^@/, "")}`,
            avatarUrl: channel.avatarUrl,
            kind,
          })),
        ...(initialOptions?.terms ?? []).map((term) => ({
          id: term.id,
          name: term.name,
          description: term.slug,
          avatarUrl: null,
          kind: term.taxonomy,
        })),
        ...(initialOptions?.contents ?? []).map((content) => ({
          id: content.id,
          name: content.title,
          description: content.slug,
          avatarUrl: null,
          kind: content.kind,
        })),
      ].filter((option) => option.kind === kind),
    [initialOptions, kind]
  )
  const { options, searching, search, addOptions } = useRelationOptions(
    kind,
    existingIds,
    resolvedInitialOptions
  )
  const optionById = React.useMemo(
    () => new Map(options.map((option) => [option.id, option])),
    [options]
  )
  const normalizedQuery = query.trim().replace(/\s+/g, " ")
  const canSearch = normalizedQuery.length >= 2
  const open = !isTerm && canSearch && !disabled
  const exactOption = options.find(
    (option) =>
      option.name.localeCompare(normalizedQuery, undefined, {
        sensitivity: "base",
      }) === 0 ||
      option.description
        .replace(/^@/, "")
        .localeCompare(normalizedQuery.replace(/^@/, ""), undefined, {
          sensitivity: "base",
        }) === 0
  )

  React.useEffect(() => {
    currentValue.current = value
  }, [value])

  React.useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setQuery("")
    }
    document.addEventListener("pointerdown", closeOnOutsideClick)
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsideClick)
  }, [])

  React.useEffect(() => {
    if (isTerm || !canSearch) {
      const timer = window.setTimeout(() => setDebouncing(false), 0)
      return () => window.clearTimeout(timer)
    }
    const startTimer = window.setTimeout(() => setDebouncing(true), 0)
    const searchTimer = window.setTimeout(() => {
      setActiveIndex(-1)
      setDebouncing(false)
      search(normalizedQuery)
    }, 300)
    return () => {
      window.clearTimeout(startTimer)
      window.clearTimeout(searchTimer)
    }
  }, [canSearch, isTerm, normalizedQuery, search])

  function select(valueToAdd: string) {
    if (multiple) {
      if (!value.includes(valueToAdd)) onChange([...value, valueToAdd])
    } else {
      onChange(valueToAdd)
    }
    setQuery("")
  }

  function addTypedNames(names: string[]) {
    const nextValues = multiple ? [...value] : []

    for (const inputName of names) {
      const name = inputName.trim().replace(/\s+/g, " ")
      if (!name) continue
      const existing = options.find(
        (option) =>
          option.name.localeCompare(name, undefined, {
            sensitivity: "base",
          }) === 0 ||
          option.description
            .replace(/^@/, "")
            .localeCompare(name.replace(/^@/, ""), undefined, {
              sensitivity: "base",
            }) === 0
      )
      const valueToAdd = existing?.id ?? createPendingValue(kind, name)
      const duplicate = nextValues.some((item) => {
        if (item === valueToAdd) return true
        const pending = parsePendingValue(item)
        const option = optionById.get(item)
        return (
          (pending?.name ?? option?.name)?.localeCompare(name, undefined, {
            sensitivity: "base",
          }) === 0
        )
      })
      if (duplicate) continue

      if (!existing && isTerm) uncheckedTermKeys.current.add(valueToAdd)

      if (multiple) nextValues.push(valueToAdd)
      else nextValues.splice(0, nextValues.length, valueToAdd)
    }

    const nextValue = multiple ? nextValues : nextValues.slice(0, 1)
    currentValue.current = nextValue
    onChange(multiple ? nextValue : (nextValue[0] ?? ""))
    return nextValue
  }

  function remove(valueToRemove: string) {
    const next = value.filter((item) => item !== valueToRemove)
    uncheckedTermKeys.current.delete(valueToRemove)
    setConfirmedMissingTerms((current) => {
      if (!current.has(valueToRemove)) return current
      const nextMissing = new Set(current)
      nextMissing.delete(valueToRemove)
      return nextMissing
    })
    currentValue.current = next
    onChange(multiple ? next : "")
  }

  function moveValue(valueToMove: string, beforeValue: string) {
    if (!multiple || valueToMove === beforeValue) return
    const fromIndex = value.indexOf(valueToMove)
    const toIndex = value.indexOf(beforeValue)
    if (fromIndex < 0 || toIndex < 0) return
    const next = [...value]
    const [moved] = next.splice(fromIndex, 1)
    if (!moved) return
    next.splice(toIndex, 0, moved)
    currentValue.current = next
    onChange(next)
  }

  async function checkNewTerms(values: string[]) {
    if (!isTerm) return
    const terms = values.flatMap((item) => {
      if (!uncheckedTermKeys.current.has(item)) return []
      const pending = parsePendingTermValue(item)
      return pending ? [pending] : []
    })
    if (!terms.length) return

    try {
      const response = await fetch("/api/v1/admin/terms/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ terms }),
      })
      if (!response.ok) return
      const result = (await response.json()) as {
        terms: Array<{
          key: string
          id: string
          name: string
          slug: string
          taxonomy: "category" | "tag" | "label" | "series"
        }>
      }
      const resolved = new Map(result.terms.map((term) => [term.key, term.id]))
      setConfirmedMissingTerms((current) => {
        const nextMissing = new Set(current)
        terms.forEach((term) => {
          if (resolved.has(term.key)) nextMissing.delete(term.key)
          else nextMissing.add(term.key)
        })
        return nextMissing
      })
      addOptions(
        result.terms.map((term) => ({
          id: term.id,
          name: term.name,
          description: term.slug,
          avatarUrl: null,
          kind: term.taxonomy,
        }))
      )
      terms.forEach((term) => uncheckedTermKeys.current.delete(term.key))
      if (!resolved.size) return
      const next = currentValue.current.map(
        (item) => resolved.get(item) ?? item
      )
      currentValue.current = next
      onChange(next)
    } catch {
      // Keep unresolved values pending; the save confirmation will check them again.
    }
  }

  function createPending() {
    if (
      !canCreate ||
      !normalizedQuery ||
      exactOption ||
      searching ||
      debouncing
    )
      return
    const duplicate = value.some((item) => {
      const pending = parsePendingValue(item)
      const existing = optionById.get(item)
      return (
        (pending?.name ?? existing?.name)?.localeCompare(
          normalizedQuery,
          undefined,
          { sensitivity: "base" }
        ) === 0
      )
    })
    if (!duplicate) {
      addTypedNames([normalizedQuery])
      setQuery("")
    } else setQuery("")
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (isTerm && event.key === "Enter") {
      event.preventDefault()
      if (normalizedQuery) addTypedNames([normalizedQuery])
      setQuery("")
      return
    }
    if (!open) return
    if (event.key === "ArrowDown" && options.length) {
      event.preventDefault()
      setActiveIndex((current) =>
        current < 0 ? 0 : (current + 1) % options.length
      )
    } else if (event.key === "ArrowUp" && options.length) {
      event.preventDefault()
      setActiveIndex((current) =>
        current < 0
          ? options.length - 1
          : (current - 1 + options.length) % options.length
      )
    } else if (event.key === "Enter") {
      event.preventDefault()
      const option = activeIndex >= 0 ? options[activeIndex] : exactOption
      if (option) select(option.id)
      else createPending()
    } else if (event.key === "Escape") {
      setQuery("")
    }
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <div className="flex min-h-10 max-w-full min-w-0 flex-wrap items-center gap-1.5 rounded-lg border bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring/30">
        {value.map((item) => {
          const pending = parsePendingValue(item)
          const option = optionById.get(item)
          const name = pending?.name ?? option?.name ?? item
          const isConfirmedNew =
            Boolean(pending) && (!isTerm || confirmedMissingTerms.has(item))
          return (
            <Badge
              key={item}
              variant={isConfirmedNew ? "secondary" : "outline"}
              draggable={multiple && !disabled}
              onDragStart={(event) => {
                setDraggedValue(item)
                event.dataTransfer.effectAllowed = "move"
                event.dataTransfer.setData("text/plain", item)
              }}
              onDragOver={(event) => {
                if (!draggedValue || draggedValue === item) return
                event.preventDefault()
                event.dataTransfer.dropEffect = "move"
              }}
              onDragEnter={() => {
                if (draggedValue) moveValue(draggedValue, item)
              }}
              onDrop={(event) => event.preventDefault()}
              onDragEnd={() => setDraggedValue(null)}
              title={truncateLabelAt ? name : undefined}
              className={`h-7 gap-1 rounded-full pr-1 ${truncateLabelAt ? "max-w-full" : ""} ${multiple && !disabled ? "cursor-grab active:cursor-grabbing" : ""} ${draggedValue === item ? "opacity-50" : ""}`}
            >
              {multiple ? (
                <GripVertical
                  className="size-3 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              ) : null}
              {!isTerm ? (
                <Avatar size="sm" className="size-5">
                  <AvatarImage src={option?.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback>{initials(name)}</AvatarFallback>
                </Avatar>
              ) : null}
              <span
                className={truncateLabelAt ? "min-w-0 truncate" : undefined}
              >
                {truncateLabelAt ? truncateLabel(name, truncateLabelAt) : name}
              </span>
              {isConfirmedNew ? (
                <span className="text-[10px] text-muted-foreground">
                  {t("metadataNewChannel")}
                </span>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="size-5 rounded-full"
                onClick={() => remove(item)}
                disabled={disabled}
                aria-label={t("metadataRemoveChannel", { name })}
              >
                <X className="size-3" />
              </Button>
            </Badge>
          )
        })}
        <Input
          id={id}
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value
            if (multiple && nextQuery.includes(",")) {
              const parts = nextQuery.split(",")
              addTypedNames(parts.slice(0, -1))
              setQuery(parts.at(-1) ?? "")
              return
            }
            setQuery(nextQuery)
          }}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData("text")
            if (!multiple || !/[,\n]/.test(pasted)) return
            event.preventDefault()
            addTypedNames(pasted.split(/[,\n]+/))
            setQuery("")
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (!isTerm) return
            const next = normalizedQuery
              ? addTypedNames([normalizedQuery])
              : currentValue.current
            setQuery("")
            void checkNewTerms(next)
          }}
          disabled={disabled}
          placeholder={t(
            kind === "actress"
              ? "metadataTypeActress"
              : kind === "actor"
                ? "metadataTypeActor"
                : kind === "director"
                  ? "metadataTypeDirector"
                  : kind === "studio"
                    ? "metadataTypeStudio"
                    : kind === "category"
                      ? "metadataTypeCategory"
                      : kind === "tag"
                        ? "metadataTypeTag"
                        : kind === "label"
                          ? "metadataTypeLabel"
                          : kind === "series"
                            ? "metadataTypeSeries"
                            : "metadataTypeVideo"
          )}
          autoComplete="off"
          className="h-7 min-w-44 flex-1 border-0 px-1 shadow-none focus-visible:ring-0"
        />
      </div>

      {open ? (
        <div className="absolute inset-x-0 top-[calc(100%+0.35rem)] z-50 max-h-72 overflow-y-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg">
          {searching || debouncing ? (
            <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t("metadataSearching")}
            </div>
          ) : (
            <>
              {options.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => select(option.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${index === activeIndex ? "bg-muted" : "hover:bg-muted"}`}
                >
                  {!isTerm ? (
                    <Avatar size="sm">
                      <AvatarImage src={option.avatarUrl ?? undefined} alt="" />
                      <AvatarFallback>{initials(option.name)}</AvatarFallback>
                    </Avatar>
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {option.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                  {value.includes(option.id) ? (
                    <Check className="size-4" />
                  ) : null}
                </button>
              ))}
              {canCreate && !exactOption ? (
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={createPending}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm hover:bg-muted"
                >
                  <span className="flex size-8 items-center justify-center rounded-full bg-muted">
                    <Plus className="size-4" />
                  </span>
                  <span>
                    <span className="block font-medium">
                      {t("metadataAddNewChannel", { name: normalizedQuery })}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {t("metadataPressEnter")}
                    </span>
                  </span>
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function truncateLabel(value: string, maxLength = 30) {
  const characters = Array.from(value)
  return characters.length > maxLength
    ? `${characters.slice(0, maxLength).join("")}...`
    : value
}

function parsePendingValue(value: string) {
  return parsePendingChannelValue(value) ?? parsePendingTermValue(value)
}

function createPendingValue(kind: RelationKind, name: string) {
  if (kind === "video") return ""
  return kind === "actress" ||
    kind === "actor" ||
    kind === "director" ||
    kind === "studio"
    ? createPendingChannelValue(kind, name)
    : createPendingTermValue(kind, name)
}
