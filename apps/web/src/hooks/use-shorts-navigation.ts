"use client"

import * as React from "react"

const WHEEL_THRESHOLD = 80
const SCROLL_SETTLE_DELAY = 120
const SWIPE_DISTANCE = 48
const PULL_THRESHOLD = 92
const MAX_PULL = 132

export function useShortsNavigation(itemCount: number, onRefresh: () => Promise<void>, initialIndex = 0) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex)
  const [pullDistance, setPullDistance] = React.useState(0)
  const [isDragging, setIsDragging] = React.useState(false)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const targetRef = React.useRef(initialIndex)
  const wheelRef = React.useRef(0)
  const wheelTimerRef = React.useRef<number | null>(null)
  const scrollSettleTimerRef = React.useRef<number | null>(null)
  const pullDistanceRef = React.useRef(0)
  const pointerRef = React.useRef<{ id: number; startY: number; lastY: number; startScroll: number; startIndex: number; startedAt: number; pulling: boolean } | null>(null)

  const scrollToIndex = React.useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const element = containerRef.current
    if (!element || itemCount === 0) return
    const next = Math.max(0, Math.min(index, itemCount - 1)); targetRef.current = next
    element.scrollTo({ top: next * element.clientHeight, behavior })
  }, [itemCount])
  const moveBy = React.useCallback((steps: number) => scrollToIndex(targetRef.current + steps), [scrollToIndex])
  const goPrevious = React.useCallback(() => moveBy(-1), [moveBy])
  const goNext = React.useCallback(() => moveBy(1), [moveBy])
  const handleScroll = React.useCallback(() => {
    const element = containerRef.current; if (!element?.clientHeight) return
    const next = Math.max(0, Math.min(Math.round(element.scrollTop / element.clientHeight), itemCount - 1))
    setCurrentIndex(next)
    if (scrollSettleTimerRef.current) window.clearTimeout(scrollSettleTimerRef.current)
    scrollSettleTimerRef.current = window.setTimeout(() => { targetRef.current = next }, SCROLL_SETTLE_DELAY)
  }, [itemCount])
  const handleWheel = React.useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaY) < 2) return; event.preventDefault(); wheelRef.current += event.deltaY
    if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current)
    wheelTimerRef.current = window.setTimeout(() => { wheelRef.current = 0 }, 140)
    if (Math.abs(wheelRef.current) < WHEEL_THRESHOLD) return
    const direction = wheelRef.current > 0 ? 1 : -1; const steps = Math.min(3, Math.max(1, Math.floor(Math.abs(wheelRef.current) / WHEEL_THRESHOLD)))
    wheelRef.current -= direction * steps * WHEEL_THRESHOLD; moveBy(direction * steps)
  }, [moveBy])
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowUp", "ArrowDown", "PageUp", "PageDown"].includes(event.key)) return
    event.preventDefault(); moveBy(event.key === "ArrowUp" || event.key === "PageUp" ? -1 : 1)
  }, [moveBy])
  const handlePointerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" || isRefreshing || !containerRef.current) return
    const element = containerRef.current; pointerRef.current = { id: event.pointerId, startY: event.clientY, lastY: event.clientY, startScroll: element.scrollTop, startIndex: Math.round(element.scrollTop / Math.max(1, element.clientHeight)), startedAt: performance.now(), pulling: false }; setIsDragging(true)
  }, [isRefreshing])
  const handlePointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = pointerRef.current; const element = containerRef.current; if (!gesture || gesture.id !== event.pointerId || !element) return
    event.preventDefault(); gesture.lastY = event.clientY; const delta = event.clientY - gesture.startY
    if (Math.abs(delta) > 6 && !element.hasPointerCapture(event.pointerId)) {
      try { element.setPointerCapture(event.pointerId) } catch { /* Pointer may have ended. */ }
    }
    if (gesture.startIndex === 0 && gesture.startScroll <= 1 && delta > 0) {
      gesture.pulling = true
      const distance = Math.min(MAX_PULL, delta * 0.42)
      pullDistanceRef.current = distance
      setPullDistance(distance)
      return
    }
    gesture.pulling = false; pullDistanceRef.current = 0; setPullDistance(0); element.scrollTop = Math.max(0, gesture.startScroll - delta)
  }, [])
  const finishPointer = React.useCallback((event: React.PointerEvent<HTMLDivElement>, cancelled = false) => {
    const gesture = pointerRef.current; const element = containerRef.current; if (!gesture || gesture.id !== event.pointerId) return
    pointerRef.current = null; setIsDragging(false)
    if (element?.hasPointerCapture(event.pointerId)) {
      try { element.releasePointerCapture(event.pointerId) } catch { /* Pointer capture may already be released. */ }
    }
    if (gesture.pulling) {
      if (!cancelled && pullDistanceRef.current >= PULL_THRESHOLD) {
        setIsRefreshing(true); pullDistanceRef.current = 52; setPullDistance(52); scrollToIndex(0, "auto")
        void onRefresh().catch(() => undefined).finally(() => { setIsRefreshing(false); pullDistanceRef.current = 0; setPullDistance(0) })
      } else { pullDistanceRef.current = 0; setPullDistance(0); scrollToIndex(0) }
      return
    }
    if (!element?.clientHeight) return
    const delta = gesture.lastY - gesture.startY; const velocity = Math.abs(delta) / Math.max(1, performance.now() - gesture.startedAt)
    if (cancelled || (Math.abs(delta) < SWIPE_DISTANCE && velocity < 0.55)) { scrollToIndex(Math.round(element.scrollTop / element.clientHeight)); return }
    const steps = Math.min(3, Math.max(1, Math.ceil(Math.abs(delta) / (element.clientHeight * 0.72))) + (velocity >= 1.25 ? 1 : 0)); scrollToIndex(gesture.startIndex + (delta < 0 ? steps : -steps))
  }, [onRefresh, scrollToIndex])

  React.useEffect(() => { targetRef.current = Math.min(targetRef.current, Math.max(0, itemCount - 1)) }, [itemCount])
  React.useLayoutEffect(() => { const element = containerRef.current; if (element && initialIndex > 0) { element.scrollTop = initialIndex * element.clientHeight; targetRef.current = initialIndex } }, [initialIndex])
  React.useEffect(() => () => {
    if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current)
    if (scrollSettleTimerRef.current) window.clearTimeout(scrollSettleTimerRef.current)
  }, [])
  return { containerRef, currentIndex, goNext, goPrevious, handleScroll, handleWheel, handleKeyDown, handlePointerDown, handlePointerMove, handlePointerUp: (event: React.PointerEvent<HTMLDivElement>) => finishPointer(event), handlePointerCancel: (event: React.PointerEvent<HTMLDivElement>) => finishPointer(event, true), isDragging, isRefreshing, pullDistance, pullReady: pullDistance >= PULL_THRESHOLD }
}
