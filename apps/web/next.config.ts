import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const apiUrl = process.env.API_INTERNAL_URL ?? "http://localhost:4000"

const nextConfig: NextConfig = {
  transpilePackages: [
    "@workspace/auth",
    "@workspace/core",
    "@workspace/i18n",
    "@workspace/ui",
  ],
  allowedDevOrigins: ["avxtube.org"],
   rewrites: async () => {
    return [
      {
        source: "/api/auth/:path*",
        destination: `${apiUrl}/api/auth/:path*`,
      },
      {
        source: "/api/v2/:path*",
        destination: `${apiUrl}/v2/:path*`,
      },
    ]
  },
}

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

export default withNextIntl(nextConfig)
