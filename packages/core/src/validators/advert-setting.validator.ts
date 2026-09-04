import { z } from "zod"

export const adsImageShowOnSchema = z.enum(["ready", "end", "pause"])

const baseAdvertSchema = z.object({
  _id: z.string().trim().min(1).max(128),
  enabled: z.boolean(),
  name: z.string().trim().min(1).max(200),
  websiteUrl: z
    .union([z.literal(""), z.string().trim().url().max(2048)])
    .optional(),
})

const videoAdvertSchema = baseAdvertSchema.extend({
  mp4Url: z.string().trim().url().max(2048),
  skipSeconds: z.number().int().min(0).max(3600).default(5),
  offset: z
    .union([
      z.literal("pre"),
      z.literal("post"),
      z.number().int().min(0),
      z.string().regex(/^(?:[1-9]|[1-9]\d)%$/),
    ])
    .default("pre"),
})

const imageAdvertSchema = baseAdvertSchema.extend({
  imageUrl: z.string().trim().url().max(2048),
  showOn: z.array(adsImageShowOnSchema).min(1),
})

const scriptAdvertSchema = baseAdvertSchema.extend({
  script: z.string().trim().min(1).max(100_000),
})

function category<T extends z.ZodType>(item: T) {
  return z.object({ enabled: z.boolean(), list: z.array(item).max(100) })
}

export const advertHobbyValid = z
  .object({
    video: category(videoAdvertSchema),
    image: category(imageAdvertSchema),
    script: category(scriptAdvertSchema),
  })
  .strict()

export type AdvertSettings = z.infer<typeof advertHobbyValid>

export const DEFAULT_ADVERT_SETTINGS: AdvertSettings = {
  video: { enabled: false, list: [] },
  image: { enabled: false, list: [] },
  script: { enabled: false, list: [] },
}
