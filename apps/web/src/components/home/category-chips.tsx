"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import * as React from "react"

export type HomeCategory = { value: string; label: string }

export function CategoryChips({
  categories,
  active,
  onChange,
}: {
  categories: HomeCategory[]
  active: string
  onChange: (value: string) => void
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = React.useState({
    left: false,
    right: false,
  })

  const updateScrollState = React.useCallback(() => {
    const container = scrollRef.current
    if (!container) return
    const maxScroll = container.scrollWidth - container.clientWidth
    setScrollState({
      left: container.scrollLeft > 1,
      right: container.scrollLeft < maxScroll - 1,
    })
  }, [])

  React.useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    updateScrollState()
    const observer = new ResizeObserver(updateScrollState)
    observer.observe(container)
    return () => observer.disconnect()
  }, [categories.length, updateScrollState])

  const scroll = React.useCallback((direction: -1 | 1) => {
    const container = scrollRef.current
    if (!container) return
    container.scrollBy({
      left: direction * Math.max(240, container.clientWidth * 0.65),
      behavior: "smooth",
    })
  }, [])

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="-mx-4 flex touch-pan-x gap-2 overflow-x-auto px-4 pb-2 [overscroll-behavior-inline:contain] [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-10 [&::-webkit-scrollbar]:hidden"
        onScroll={updateScrollState}
        onWheel={(event) => {
          const container = event.currentTarget
          if (container.scrollWidth <= container.clientWidth) return
          const delta =
            Math.abs(event.deltaX) > Math.abs(event.deltaY)
              ? event.deltaX
              : event.deltaY
          const maxScroll = container.scrollWidth - container.clientWidth
          const canScroll =
            delta < 0
              ? container.scrollLeft > 0
              : container.scrollLeft < maxScroll
          if (!canScroll) return
          event.preventDefault()
          container.scrollLeft = Math.max(
            0,
            Math.min(maxScroll, container.scrollLeft + delta)
          )
        }}
      >
        {categories.map((category) => (
          <button
            type="button"
            key={category.value}
            aria-pressed={category.value === active}
            onClick={() => onChange(category.value)}
            className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${category.value === active ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"}`}
          >
            {category.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        aria-label="Scroll categories left"
        onClick={() => scroll(-1)}
        className={`absolute top-0 left-0 hidden size-8 place-items-center rounded-full border bg-background/95 shadow-sm backdrop-blur transition-opacity lg:grid ${scrollState.left ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Scroll categories right"
        onClick={() => scroll(1)}
        className={`absolute top-0 right-0 hidden size-8 place-items-center rounded-full border bg-background/95 shadow-sm backdrop-blur transition-opacity lg:grid ${scrollState.right ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
}
