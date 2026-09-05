import type { MetadataRoute } from "next"

import { absoluteUrl } from "@/i18n/metadata"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/account/",
        "/studio/",
        "/search",
        "/*/search",
        "/login",
        "/*/login",
        "/register",
        "/*/register",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  }
}
