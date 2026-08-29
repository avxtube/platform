import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

export type CountryFlagProps = Omit<
  React.ComponentPropsWithoutRef<"span">,
  "children"
> & {
  countryCode: string
  shape?: "circle" | "square" | "rectangle"
  /** Uses Tailwind's spacing scale: 4 = 1rem, 6 = 1.5rem. */
  size?: number
}

const shapeClasses = {
  circle: "rounded-full",
  square: "rounded-none",
  rectangle: "rounded-[2px]",
} as const

export function CountryFlag({
  countryCode,
  className,
  shape = "rectangle",
  size = 4,
  style,
  ...props
}: CountryFlagProps) {
  const normalizedCountryCode = countryCode.trim().toUpperCase()
  const normalizedSize = Number.isFinite(size) && size > 0 ? size : 4
  const height = `${normalizedSize / 4}rem`
  const width =
    shape === "rectangle" ? `${(normalizedSize * 1.5) / 4}rem` : height

  return (
    <span
      {...props}
      style={{
        height,
        width,
        ...style,
      }}
      className={cn(
        `flag:${normalizedCountryCode}`,
        "shrink-0 bg-center ring-1 ring-black/10",
        shapeClasses[shape],
        className
      )}
    />
  )
}
