"use client"

import type { ChannelGender, ChannelKind } from "@workspace/core/types"
import * as React from "react"

const placeholders = {
  female: "/assets/images/placeholders/person-female.svg",
  male: "/assets/images/placeholders/person-male.svg",
  studio: "/assets/images/placeholders/studio.svg",
} as const

export function ChannelImage({
  src,
  kind,
  gender,
  alt,
  className,
  loading = "lazy",
}: {
  src?: string | null
  kind?: ChannelKind
  gender?: ChannelGender
  alt: string
  className?: string
  loading?: "eager" | "lazy"
}) {
  const candidate = src?.trim() ?? ""
  const [failedSource, setFailedSource] = React.useState("")
  const fallback = channelPlaceholder(kind, gender)
  const source = candidate && failedSource !== candidate ? candidate : fallback

  return (
    // Remote channel media is served directly by the configured provider.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={source}
      alt={alt}
      loading={loading}
      onError={() => {
        if (source !== fallback) setFailedSource(candidate)
      }}
      className={className}
    />
  )
}

export function channelPlaceholder(
  kind: ChannelKind | undefined,
  gender: ChannelGender | undefined
) {
  if (kind && kind !== "person") return placeholders.studio
  return gender === "male" ? placeholders.male : placeholders.female
}
