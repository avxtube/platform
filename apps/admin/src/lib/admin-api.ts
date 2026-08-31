import "server-only"

import { headers } from "next/headers"

import type { AdminContent, ContentKind, ContentListResponse } from "./content"

const apiUrl = process.env.API_INTERNAL_URL ?? "http://localhost:4000"

export async function getContents(input: {
  kind?: ContentKind
  query?: string
  status?: string
  page?: number
  limit?: number
} = {}): Promise<ContentListResponse> {
  const url = new URL("/v1/admin/contents", apiUrl)
  if (input.kind) url.searchParams.set("kind", input.kind)
  if (input.query) url.searchParams.set("query", input.query)
  if (input.status) url.searchParams.set("status", input.status)
  if (input.page) url.searchParams.set("page", String(input.page))
  if (input.limit) url.searchParams.set("limit", String(input.limit))
  return fetchAdmin<ContentListResponse>(url)
}

export async function getContent(id: string): Promise<AdminContent | null> {
  const response = await fetchAdmin<{ content: AdminContent } | null>(
    new URL(`/v1/admin/contents/${encodeURIComponent(id)}`, apiUrl),
    true,
  )
  return response?.content ?? null
}

async function fetchAdmin<T>(url: URL, allowNotFound = false): Promise<T> {
  const requestHeaders = await headers()
  const response = await fetch(url, {
    headers: { cookie: requestHeaders.get("cookie") ?? "" },
    cache: "no-store",
  })

  if (allowNotFound && response.status === 404) return null as T
  if (!response.ok) throw new Error(`Admin API request failed (${response.status})`)
  return await response.json() as T
}
