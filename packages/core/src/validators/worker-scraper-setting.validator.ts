import { z } from "zod"

export const MISSAV_SCRAPER_LOCALES = [
  "th",
  "ja",
  "ko",
  "zh",
  "vi",
  "id",
  "ms",
  "tl",
  "de",
  "fr",
  "pt",
] as const

export const workerScraperSettingSchema = z.object({
  enabled: z.boolean(),
  missav: z.object({
    locales: z
      .array(z.enum(MISSAV_SCRAPER_LOCALES))
      .max(MISSAV_SCRAPER_LOCALES.length)
      .refine((locales) => new Set(locales).size === locales.length, {
        message: "MissAV locales must be unique",
      }),
  }),
})

export type WorkerScraperSettings = z.infer<typeof workerScraperSettingSchema>

export const DEFAULT_WORKER_SCRAPER_SETTINGS: WorkerScraperSettings = {
  enabled: true,
  missav: { locales: [] },
}
