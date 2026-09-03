import { defineMetadataGroups } from "./registry"
import type { MetadataGroup } from "./types"

export const videoMetadata = defineMetadataGroups([
  {
    id: "information",
    label: { en: "Video information", th: "ข้อมูลวิดีโอ" },
    fields: [
      {
        id: "dvdId",
        type: "text",
        label: { en: "DVD ID", th: "รหัส DVD" },
        required: true,
        placeholder: { en: "Example: DVD-001", th: "ตัวอย่าง: DVD-001" },
      },
      {
        id: "releaseDate",
        type: "date",
        label: { en: "Release date", th: "วันที่เผยแพร่ต้นฉบับ" },
      },
      {
        id: "durationSeconds",
        type: "number",
        label: { en: "Duration (seconds)", th: "ความยาว (วินาที)" },
        min: 0,
        step: 1,
      },
      {
        id: "contentRating",
        type: "select",
        label: { en: "Content rating", th: "ระดับเนื้อหา" },
        options: [
          { value: "general", label: { en: "General", th: "ทั่วไป" } },
          { value: "mature", label: { en: "Mature", th: "สำหรับผู้ใหญ่" } },
        ],
      },
      {
        id: "featured",
        type: "switch",
        label: { en: "Featured video", th: "วิดีโอแนะนำ" },
      },
    ],
  },
  {
    id: "media",
    label: { en: "Media", th: "ไฟล์สื่อ" },
    fields: [
      {
        id: "sourceUrl",
        type: "url",
        label: { en: "Video URL", th: "URL วิดีโอ" },
      },
      {
        id: "thumbnailUrl",
        type: "media",
        label: { en: "Thumbnail URL", th: "URL ภาพปก" },
      },
      {
        id: "trailerUrl",
        type: "media",
        label: { en: "Trailer URL", th: "URL ตัวอย่างวิดีโอ" },
      },
    ],
  },
  {
    id: "relations",
    label: { en: "Relations", th: "ข้อมูลที่เกี่ยวข้อง" },
    fields: [
      {
        id: "studioId",
        type: "relation",
        relation: "studio",
        label: { en: "Studio", th: "สตูดิโอ" },
      },
      {
        id: "actorIds",
        type: "relation-multiple",
        relation: "actor",
        label: { en: "Actors", th: "นักแสดง" },
      },
      {
        id: "categoryIds",
        type: "relation-multiple",
        relation: "category",
        label: { en: "Categories", th: "หมวดหมู่" },
      },
      {
        id: "tagIds",
        type: "relation-multiple",
        relation: "tag",
        label: { en: "Tags", th: "แท็ก" },
      },
      { id: "label", type: "text", label: { en: "Label", th: "ค่าย" } },
    ],
  },
] satisfies readonly MetadataGroup[])

export const shortMetadata = defineMetadataGroups([
  {
    id: "media",
    label: { en: "Short media", th: "ไฟล์ Shorts" },
    fields: [
      {
        id: "mediaUrl",
        type: "url",
        label: { en: "Media URL", th: "URL ไฟล์วิดีโอ" },
      },
      {
        id: "thumbnailUrl",
        type: "media",
        label: { en: "Thumbnail URL", th: "URL ภาพปก" },
      },
      {
        id: "durationSeconds",
        type: "number",
        label: { en: "Duration (seconds)", th: "ความยาว (วินาที)" },
        min: 0,
        step: 1,
      },
    ],
  },
  {
    id: "relations",
    label: { en: "Relations", th: "ข้อมูลที่เกี่ยวข้อง" },
    fields: [
      {
        id: "sourceVideoId",
        type: "relation",
        relation: "video",
        truncateLabelAt: 30,
        label: { en: "Source video", th: "วิดีโอต้นฉบับ" },
        description: {
          en: "Optional video this Short was clipped from.",
          th: "วิดีโอที่ตัด Short นี้มา (ไม่จำเป็นต้องระบุ)",
        },
      },
      {
        id: "studioId",
        type: "relation",
        relation: "studio",
        label: { en: "Studio", th: "สตูดิโอ" },
      },
      {
        id: "actorIds",
        type: "relation-multiple",
        relation: "actor",
        label: { en: "Actors", th: "นักแสดง" },
      },
    ],
  },
] satisfies readonly MetadataGroup[])

export const postMetadata = defineMetadataGroups([])

export const liveMetadata = defineMetadataGroups([
  {
    id: "live",
    label: { en: "Live stream", th: "ไลฟ์สตรีม" },
    fields: [
      {
        id: "streamUrl",
        type: "media",
        label: { en: "Stream URL", th: "URL สตรีม" },
        required: true,
      },
      {
        id: "posterUrl",
        type: "media",
        label: { en: "Poster URL", th: "URL ภาพปก" },
      },
      {
        id: "startsAt",
        type: "datetime",
        label: { en: "Starts at", th: "เวลาเริ่มไลฟ์" },
      },
      {
        id: "studioId",
        type: "relation",
        relation: "studio",
        label: { en: "Studio", th: "สตูดิโอ" },
      },
      {
        id: "categoryIds",
        type: "relation-multiple",
        relation: "category",
        label: { en: "Categories", th: "หมวดหมู่" },
      },
      {
        id: "tagIds",
        type: "relation-multiple",
        relation: "tag",
        label: { en: "Tags", th: "แท็ก" },
      },
      {
        id: "recordAfterEnd",
        type: "switch",
        label: {
          en: "Keep recording after stream",
          th: "เก็บวิดีโอหลังจบไลฟ์",
        },
      },
    ],
  },
] satisfies readonly MetadataGroup[])
