"use client"

import * as React from "react"
import { Braces } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import {
  getMetadataLabel,
  isMetadataFieldVisible,
  normalizeMetadataValue,
  type MetadataField,
  type MetadataScope,
} from "@workspace/metadata"
import { Input, Label, Switch, Textarea } from "@workspace/ui/components"

import { AdminMetabox } from "@/components/admin-metabox"
import type { ContentRelations } from "@/lib/content"
import { useMetadata } from "./hooks"
import { MetadataRelationInput } from "./relation-input"

export function MetadataFields({
  scope,
  value,
  onChange,
  relationOptions,
  disabled,
  variant = "default",
  excludeFieldIds = [],
  includeFieldIds,
  title: titleOverride,
}: {
  scope: MetadataScope
  value: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
  relationOptions?: ContentRelations
  disabled?: boolean
  variant?: "default" | "metabox"
  excludeFieldIds?: string[]
  includeFieldIds?: string[]
  title?: string
}) {
  const locale = useLocale()
  const groups = useMetadata(scope)

  function setField(field: MetadataField, nextValue: unknown) {
    const normalized = normalizeMetadataValue(field, nextValue)
    const next = { ...value }
    if (normalized === undefined) delete next[field.id]
    else next[field.id] = normalized
    onChange(next)
  }

  return groups.map((group) => {
    const title = titleOverride ?? getMetadataLabel(group.label, locale)
    const description = group.description
      ? getMetadataLabel(group.description, locale)
      : undefined
    const visibleFields = group.fields.filter(
      (field) =>
        !excludeFieldIds.includes(field.id) &&
        (!includeFieldIds || includeFieldIds.includes(field.id)) &&
        isMetadataFieldVisible(field, value)
    )
    if (!visibleFields.length) return null
    const fields = (
      <div
        className={`grid gap-5 md:grid-cols-2 ${variant === "default" ? "mt-5" : ""}`}
      >
        {visibleFields.map((field) => (
          <MetadataFieldControl
            key={field.id}
            field={field}
            value={value[field.id]}
            locale={locale}
            relationOptions={relationOptions}
            disabled={disabled}
            onChange={(nextValue) => setField(field, nextValue)}
          />
        ))}
      </div>
    )

    if (variant === "metabox") {
      return (
        <AdminMetabox key={group.id} title={title} description={description}>
          {fields}
        </AdminMetabox>
      )
    }

    return (
      <section
        key={group.id}
        className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6"
      >
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Braces className="size-5" />
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        ) : null}
        {fields}
      </section>
    )
  })
}

function MetadataFieldControl({
  field,
  value,
  locale,
  relationOptions,
  disabled,
  onChange,
}: {
  field: MetadataField
  value: unknown
  locale: string
  relationOptions?: ContentRelations
  disabled?: boolean
  onChange: (value: unknown) => void
}) {
  const t = useTranslations("admin")
  const label = getMetadataLabel(field.label, locale)
  const placeholder = field.placeholder
    ? getMetadataLabel(field.placeholder, locale)
    : undefined
  const description = field.description
    ? getMetadataLabel(field.description, locale)
    : undefined
  const id = `metadata-${field.id}`
  const wide =
    field.type === "textarea" ||
    field.type === "media-multiple" ||
    field.type === "relation-multiple"
  const searchableRelation =
    (field.type === "relation" || field.type === "relation-multiple") &&
    ["actor", "studio", "category", "tag", "video"].includes(field.relation ?? "")

  return (
    <div className={`space-y-2 ${wide ? "md:col-span-2" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>
          {label}
          {field.required ? (
            <span className="ml-1 text-destructive">*</span>
          ) : null}
        </Label>
        {field.type === "switch" ? (
          <Switch
            id={id}
            checked={Boolean(value)}
            onCheckedChange={onChange}
            disabled={disabled}
            aria-label={label}
          />
        ) : null}
      </div>
      {searchableRelation ? (
        <ChannelRelationSelect
          field={field}
          value={value}
          relationOptions={relationOptions}
          disabled={disabled}
          onChange={onChange}
        />
      ) : (
        renderControl(field, value, {
          id,
          locale,
          placeholder,
          disabled,
          onChange,
          listHelp: t("metadataListHelp"),
        })
      )}
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
      {field.type === "media-multiple" || field.type === "relation-multiple" ? (
        <p className="text-xs text-muted-foreground">{t("metadataListHelp")}</p>
      ) : null}
    </div>
  )
}

function ChannelRelationSelect({
  field,
  value,
  relationOptions,
  disabled,
  onChange,
}: {
  field: MetadataField
  value: unknown
  relationOptions?: ContentRelations
  disabled?: boolean
  onChange: (value: unknown) => void
}) {
  const multiple = field.type === "relation-multiple"
  const selectedIds = multiple
    ? Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : []
    : typeof value === "string" && value
      ? [value]
      : []

  return (
    <MetadataRelationInput
      id={`metadata-${field.id}`}
      kind={field.relation as "actor" | "studio" | "category" | "tag" | "video"}
      multiple={multiple}
      value={selectedIds}
      initialOptions={relationOptions}
      truncateLabelAt={field.truncateLabelAt}
      onChange={onChange}
      disabled={disabled}
    />
  )
}

function renderControl(
  field: MetadataField,
  value: unknown,
  props: {
    id: string
    locale: string
    placeholder?: string
    disabled?: boolean
    onChange: (value: unknown) => void
    listHelp: string
  }
) {
  if (field.type === "switch") return null

  if (field.type === "textarea") {
    return (
      <Textarea
        id={props.id}
        value={stringValue(value)}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        disabled={props.disabled}
        required={field.required}
        rows={5}
      />
    )
  }

  if (field.type === "media-multiple" || field.type === "relation-multiple") {
    return (
      <MetadataListInput
        id={props.id}
        value={
          Array.isArray(value)
            ? value.filter((item): item is string => typeof item === "string")
            : []
        }
        onChange={props.onChange}
        placeholder={props.placeholder ?? props.listHelp}
        disabled={props.disabled}
        required={field.required}
      />
    )
  }

  if (field.type === "select") {
    return (
      <select
        id={props.id}
        value={stringValue(value)}
        onChange={(event) => props.onChange(event.target.value)}
        disabled={props.disabled}
        required={field.required}
        className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
      >
        <option value="">—</option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {getMetadataLabel(option.label, props.locale)}
          </option>
        ))}
      </select>
    )
  }

  const inputType =
    field.type === "number"
      ? "number"
      : field.type === "date"
        ? "date"
        : field.type === "datetime"
          ? "datetime-local"
          : field.type === "url" || field.type === "media"
            ? "url"
            : "text"
  const inputValue =
    field.type === "datetime"
      ? localDateTime(stringValue(value))
      : value === undefined || value === null
        ? ""
        : String(value)

  return (
    <Input
      id={props.id}
      type={inputType}
      value={inputValue}
      onChange={(event) => props.onChange(event.target.value)}
      placeholder={props.placeholder}
      disabled={props.disabled}
      required={field.required}
      min={field.min}
      max={field.max}
      step={field.step}
    />
  )
}

function MetadataListInput({
  id,
  value,
  onChange,
  ...props
}: {
  id: string
  value: string[]
  onChange: (value: unknown) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
}) {
  return (
    <Textarea
      key={JSON.stringify(value)}
      id={id}
      defaultValue={value.join("\n")}
      onBlur={(event) => onChange(event.target.value)}
      rows={4}
      {...props}
    />
  )
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : ""
}

function localDateTime(value: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
