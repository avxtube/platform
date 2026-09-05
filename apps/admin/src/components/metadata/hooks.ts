"use client"

import * as React from "react"
import {
  getMetadata,
  subscribeMetadata,
  type MetadataScope,
} from "@workspace/metadata"

export function useMetadata(scope: MetadataScope) {
  return React.useSyncExternalStore(
    subscribeMetadata,
    () => getMetadata(scope),
    () => getMetadata(scope)
  )
}

export type RelationKind =
  | "actress"
  | "actor"
  | "director"
  | "studio"
  | "category"
  | "tag"
  | "label"
  | "series"
  | "video"

export type RelationSearchOption = {
  id: string
  name: string
  description: string
  avatarUrl: string | null
  kind: RelationKind
}

type ChannelsResponse = {
  channels: Array<{
    id: string
    name: string
    handle: string
    avatarUrl: string | null
    kind: "person" | "organization"
  }>
}
type TermsResponse = {
  terms: Array<{
    id: string
    name: string
    slug: string
    taxonomy: "category" | "tag" | "label" | "series"
  }>
}
type ContentsResponse = {
  items: Array<{ _id: string; title?: string; slug?: string; kind: "video" }>
}

export function useRelationOptions(
  kind: RelationKind,
  selectedIds: string[],
  initialOptions: RelationSearchOption[] = []
) {
  const [options, setOptions] = React.useState<RelationSearchOption[]>(() =>
    uniqueRelations(initialOptions)
  )
  const [searching, setSearching] = React.useState(false)
  const requestRef = React.useRef<AbortController | null>(null)
  const knownIdKey = options.map((option) => option.id).join(",")
  const knownIdSet = React.useMemo(
    () => new Set(knownIdKey ? knownIdKey.split(",") : []),
    [knownIdKey]
  )
  const selectedKey = selectedIds.join(",")
  const selectedIdSet = React.useMemo(
    () => new Set(selectedKey ? selectedKey.split(",") : []),
    [selectedKey]
  )
  const missingSelectedKey = selectedIds
    .filter((id) => !knownIdSet.has(id))
    .join(",")

  const load = React.useCallback(
    async (params: URLSearchParams) => {
      requestRef.current?.abort()
      const controller = new AbortController()
      requestRef.current = controller
      setSearching(true)

      try {
        const isChannel = ["actress", "actor", "director", "studio"].includes(
          kind
        )
        const isContent = kind === "video"
        params.set(isChannel || isContent ? "kind" : "taxonomy", kind)
        const requestedIds = params.get("ids")?.split(",").filter(Boolean) ?? []
        params.set(
          "limit",
          requestedIds.length
            ? String(Math.min(requestedIds.length, 100))
            : "12"
        )
        if (isContent && params.has("q")) {
          params.set("query", params.get("q") ?? "")
          params.delete("q")
        }
        const response = await fetch(
          `/api/v1/${isContent ? "admin/contents" : isChannel ? "admin/channels" : "terms"}?${params.toString()}`,
          {
            headers: { accept: "application/json" },
            signal: controller.signal,
          }
        )
        if (!response.ok) throw new Error(`API returned ${response.status}`)
        const result = (await response.json()) as
          | ChannelsResponse
          | TermsResponse
          | ContentsResponse
        const items: RelationSearchOption[] =
          "items" in result
            ? result.items.map((content) => ({
                id: content._id,
                name: content.title || content.slug || content._id,
                description: content.slug || content._id,
                avatarUrl: null,
                kind: "video" as const,
              }))
            : "channels" in result
              ? result.channels.map((channel) => ({
                  id: channel.id,
                  name: channel.name,
                  description: `@${channel.handle.replace(/^@/, "")}`,
                  avatarUrl: channel.avatarUrl,
                  kind,
                }))
              : result.terms.map((term) => ({
                  id: term.id,
                  name: term.name,
                  description: term.slug,
                  avatarUrl: null,
                  kind: term.taxonomy,
                }))
        const query = (params.get("q") ?? params.get("query"))
          ?.trim()
          .toLowerCase()
        const matches = query
          ? items.filter((item) => relationMatchesQuery(item, query))
          : items
        setOptions((current) =>
          uniqueRelations([
            ...current.filter((item) => selectedIdSet.has(item.id)),
            ...matches,
          ])
        )
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          setOptions([])
      } finally {
        if (requestRef.current === controller) setSearching(false)
      }
    },
    [kind, selectedIdSet]
  )

  React.useEffect(() => {
    if (!missingSelectedKey) return
    const params = new URLSearchParams({ ids: missingSelectedKey })
    let active = true
    queueMicrotask(() => {
      if (active) void load(params)
    })
    return () => {
      active = false
      requestRef.current?.abort()
    }
  }, [load, missingSelectedKey])

  const search = React.useCallback(
    (query: string) => {
      const normalized = query.trim()
      if (normalized.length < 2) {
        requestRef.current?.abort()
        setSearching(false)
        setOptions([])
        return
      }
      void load(new URLSearchParams({ q: normalized }))
    },
    [load]
  )

  const addOptions = React.useCallback((items: RelationSearchOption[]) => {
    setOptions((current) => uniqueRelations([...current, ...items]))
  }, [])

  return { options, searching, search, addOptions }
}

function uniqueRelations(items: RelationSearchOption[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()]
}

function relationMatchesQuery(item: RelationSearchOption, query: string) {
  return [item.id, item.name, item.description].some((value) =>
    value.toLowerCase().includes(query)
  )
}
