import { randomUUID } from "node:crypto"

import { ContentModel, QueueImportModel } from "@workspace/db/models"

const canonicalHost = "missav.ai"
const sourceRef = "missav.ai"
const maxSitemapBytes = 25 * 1024 * 1024

export type SitemapImportSummary = {
  discovered: number
  eligible: number
  skippedNonEnglish: number
  skippedEnglishSubtitle: number
  skippedInvalid: number
  existingContents: number
  existingQueue: number
  queued: number
}

type SitemapItem = { slug: string; url: string }

export async function importMissavSitemap(
  sitemapUrl: string
): Promise<SitemapImportSummary> {
  const source = validateSitemapUrl(sitemapUrl)
  const response = await fetch(source, {
    headers: {
      accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
      referer: "https://missav.ai/",
      "user-agent": "AVXTUBE Sitemap Importer/1.0",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok)
    throw invalid(`Unable to download sitemap (${response.status})`)
  validateSitemapUrl(response.url)
  const xml = await readLimitedText(response, maxSitemapBytes)
  const parsed = parseMissavSitemap(xml)
  if (!parsed.summary.discovered)
    throw invalid("The response does not contain sitemap item URLs")
  const slugs = parsed.items.map((item) => item.slug)
  const urls = parsed.items.map((item) => item.url)
  const [contents, queued] = slugs.length
    ? await Promise.all([
        ContentModel.find({ slug: { $in: slugs } }).select("slug").lean(),
        QueueImportModel.find({
          $or: [{ dvdId: { $in: slugs } }, { url: { $in: urls } }],
        })
          .select("dvdId url")
          .lean(),
      ])
    : [[], []]
  const contentSlugs = new Set(contents.map((item) => item.slug).filter(Boolean))
  const queueSlugs = new Set(
    queued.flatMap((item) => (item.dvdId ? [item.dvdId] : []))
  )
  const queueUrls = new Set(queued.map((item) => item.url))
  const missing = parsed.items.filter(
    (item) =>
      !contentSlugs.has(item.slug) &&
      !queueSlugs.has(item.slug) &&
      !queueUrls.has(item.url)
  )
  const result = missing.length
    ? await QueueImportModel.bulkWrite(
        missing.map((item) => ({
          updateOne: {
            filter: { dvdId: item.slug },
            update: {
              $setOnInsert: {
                _id: randomUUID(),
                status: "pending",
                url: item.url,
                dvdId: item.slug,
                ref: sourceRef,
              },
            },
            upsert: true,
          },
        })),
        { ordered: false }
      )
    : null
  return {
    ...parsed.summary,
    existingContents: contentSlugs.size,
    existingQueue: queued.length,
    queued: result?.upsertedCount ?? 0,
  }
}

export function parseMissavSitemap(xml: string): {
  items: SitemapItem[]
  summary: Omit<
    SitemapImportSummary,
    "existingContents" | "existingQueue" | "queued"
  >
} {
  const locations = [...xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)].map(
    (match) => decodeXml(match[1]?.trim() ?? "")
  )
  const items = new Map<string, SitemapItem>()
  let skippedNonEnglish = 0
  let skippedEnglishSubtitle = 0
  let skippedInvalid = 0
  for (const location of locations) {
    try {
      const url = new URL(location)
      if (!isMissavHost(url.hostname)) {
        skippedInvalid++
        continue
      }
      const parts = url.pathname.split("/").filter(Boolean)
      const englishIndex = parts.findIndex(
        (part) => part.toLowerCase() === "en"
      )
      if (englishIndex < 0 || englishIndex !== parts.length - 2) {
        skippedNonEnglish++
        continue
      }
      const decoded = decodeURIComponent(parts[englishIndex + 1] ?? "")
      const slug = normalizeSlug(decoded)
      if (!slug) {
        skippedInvalid++
        continue
      }
      if (slug.endsWith("-english-subtitle")) {
        skippedEnglishSubtitle++
        continue
      }
      items.set(slug, {
        slug,
        url: `https://${canonicalHost}/en/${slug}`,
      })
    } catch {
      skippedInvalid++
    }
  }
  return {
    items: [...items.values()],
    summary: {
      discovered: locations.length,
      eligible: items.size,
      skippedNonEnglish,
      skippedEnglishSubtitle,
      skippedInvalid,
    },
  }
}

function validateSitemapUrl(value: string) {
  try {
    const url = new URL(value)
    if (
      url.protocol !== "https:" ||
      !isMissavHost(url.hostname) ||
      !/^\/sitemap[^/]*\.xml$/i.test(url.pathname)
    )
      throw new Error()
    return url
  } catch {
    throw invalid("Sitemap URL must be an HTTPS MissAV sitemap XML URL")
  }
}

function isMissavHost(value: string) {
  return /^(?:www\.)?missav\.[a-z]{2,}$/i.test(value)
}

function normalizeSlug(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 300)
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
}

async function readLimitedText(response: Response, maxBytes: number) {
  const declared = Number(response.headers.get("content-length") ?? 0)
  if (declared > maxBytes) throw invalid("Sitemap is too large")
  if (!response.body) return response.text()
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let size = 0
  let text = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maxBytes) {
      await reader.cancel()
      throw invalid("Sitemap is too large")
    }
    text += decoder.decode(value, { stream: true })
  }
  return text + decoder.decode()
}

function invalid(message: string) {
  return Object.assign(new Error(message), { name: "ValidationError" })
}
