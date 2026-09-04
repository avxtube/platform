import "server-only"

import { headers } from "next/headers"

import type {
  AdminContent,
  ContentKind,
  ContentListResponse,
  ContentRelations,
} from "./content"
import type { AdminStorage } from "./storage"
import type { DomainSettings } from "@workspace/core/validators"

const apiUrl = process.env.API_INTERNAL_URL ?? "http://localhost:4000"

export async function getDomainSettings(): Promise<DomainSettings> {
  const result = await fetchAdmin<{ settings: DomainSettings }>(
    new URL("/v1/admin/settings/domain", apiUrl)
  )
  return result.settings
}

export async function getContents(
  input: {
    kind?: ContentKind
    query?: string
    status?: string
    page?: number
    limit?: number
  } = {}
): Promise<ContentListResponse> {
  const url = new URL("/v1/admin/contents", apiUrl)
  if (input.kind) url.searchParams.set("kind", input.kind)
  if (input.query) url.searchParams.set("query", input.query)
  if (input.status) url.searchParams.set("status", input.status)
  if (input.page) url.searchParams.set("page", String(input.page))
  if (input.limit) url.searchParams.set("limit", String(input.limit))
  return fetchAdmin<ContentListResponse>(url)
}

export async function getContent(id: string): Promise<AdminContent | null> {
  const response = await fetchAdmin<{
    content: AdminContent
    relations: ContentRelations
  } | null>(
    new URL(`/v1/admin/contents/${encodeURIComponent(id)}`, apiUrl),
    true
  )
  return response
    ? { ...response.content, relations: response.relations }
    : null
}

export async function getStorages(): Promise<AdminStorage[]> {
  const response = await fetchAdmin<{ storages: AdminStorage[] }>(
    new URL("/v1/admin/storages", apiUrl)
  )
  return response.storages
}

async function fetchAdmin<T>(url: URL, allowNotFound = false): Promise<T> {
  const requestHeaders = await headers()
  const response = await fetch(url, {
    headers: { cookie: requestHeaders.get("cookie") ?? "" },
    cache: "no-store",
  })

  if (allowNotFound && response.status === 404) return null as T
  if (!response.ok)
    throw new Error(`Admin API request failed (${response.status})`)
  return (await response.json()) as T
}
