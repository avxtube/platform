"use client"

import * as React from "react"

const WHEEL_THRESHOLD = 80
const SCROLL_SETTLE_DELAY = 120
const SWIPE_DISTANCE = 48
const PULL_THRESHOLD_REM = 5
const MAX_PULL_REM = 8

type TouchGesture = {
  startY: number
  lastY: number
  startScroll: number
  startIndex: number
  startedAt: number
  pulling: boolean
}

export function useShortsNavigation(itemCount: number, onRefresh: () => Promise<void>, initialIndex = 0) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex)
  const [pullDistance, setPullDistance] = React.useState(0)
  const [pullThreshold, setPullThreshold] = React.useState(80)
  const [isDragging, setIsDragging] = React.useState(false)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const targetRef = React.useRef(initialIndex)
  const wheelRef = React.useRef(0)
  const wheelTimerRef = React.useRef<number | null>(null)
  const scrollSettleTimerRef = React.useRef<number | null>(null)
  const pullDistanceRef = React.useRef(0)
  const pullThresholdRef = React.useRef(80)
  const maxPullRef = React.useRef(128)
  const gestureRef = React.useRef<TouchGesture | null>(null)

  const scrollToIndex = React.useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const element = containerRef.current
    if (!element || itemCount === 0) return
    const next = Math.max(0, Math.min(index, itemCount - 1))
    targetRef.current = next
    element.scrollTo({ top: next * element.clientHeight, behavior })
  }, [itemCount])

  const moveBy = React.useCallback((steps: number) => scrollToIndex(targetRef.current + steps), [scrollToIndex])
  const goPrevious = React.useCallback(() => moveBy(-1), [moveBy])
  const goNext = React.useCallback(() => moveBy(1), [moveBy])

  const handleScroll = React.useCallback(() => {
    const element = containerRef.current
    if (!element?.clientHeight || isDragging) return
    const next = Math.max(0, Math.min(Math.round(element.scrollTop / element.clientHeight), itemCount - 1))
    setCurrentIndex(next)
    if (scrollSettleTimerRef.current) window.clearTimeout(scrollSettleTimerRef.current)
    scrollSettleTimerRef.current = window.setTimeout(() => { targetRef.current = next }, SCROLL_SETTLE_DELAY)
  }, [isDragging, itemCount])

  const handleWheel = React.useCallback((event: WheelEvent) => {
    if (Math.abs(event.deltaY) < 2) return
    if (event.cancelable) event.preventDefault()
    wheelRef.current += event.deltaY
    if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current)
    wheelTimerRef.current = window.setTimeout(() => { wheelRef.current = 0 }, 140)
    if (Math.abs(wheelRef.current) < WHEEL_THRESHOLD) return
    const direction = wheelRef.current > 0 ? 1 : -1
    const steps = Math.min(3, Math.max(1, Math.floor(Math.abs(wheelRef.current) / WHEEL_THRESHOLD)))
    wheelRef.current -= direction * steps * WHEEL_THRESHOLD
    moveBy(direction * steps)
  }, [moveBy])

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowUp", "ArrowDown", "PageUp", "PageDown"].includes(event.key)) return
    event.preventDefault()
    moveBy(event.key === "ArrowUp" || event.key === "PageUp" ? -1 : 1)
  }, [moveBy])

  const beginTouch = React.useCallback((clientY: number) => {
    const element = containerRef.current
    if (!element || isRefreshing) return
    const rootFontSize = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16
    pullThresholdRef.current = rootFontSize * PULL_THRESHOLD_REM
    setPullThreshold(pullThresholdRef.current)
    maxPullRef.current = rootFontSize * MAX_PULL_REM
    gestureRef.current = {
      startY: clientY,
      lastY: clientY,
      startScroll: element.scrollTop,
      startIndex: Math.round(element.scrollTop / Math.max(1, element.clientHeight)),
      startedAt: performance.now(),
      pulling: false,
    }
    setIsDragging(true)
  }, [isRefreshing])

  const moveTouch = React.useCallback((clientY: number) => {
    const gesture = gestureRef.current
    const element = containerRef.current
    if (!gesture || !element) return
    gesture.lastY = clientY
    const delta = clientY - gesture.startY

    if (gesture.startIndex === 0 && gesture.startScroll <= 1 && delta > 0) {
      gesture.pulling = true
      const distance = Math.min(maxPullRef.current, delta * 0.55)
      pullDistanceRef.current = distance
      setPullDistance(distance)
      return
    }

    gesture.pulling = false
    pullDistanceRef.current = 0
    setPullDistance(0)
    element.scrollTop = Math.max(0, gesture.startScroll - delta)
  }, [])

  const finishTouch = React.useCallback((cancelled = false) => {
    const gesture = gestureRef.current
    const element = containerRef.current
    if (!gesture) return
    gestureRef.current = null
    setIsDragging(false)

    if (gesture.pulling) {
      if (!cancelled && pullDistanceRef.current >= pullThresholdRef.current) {
        setIsRefreshing(true)
        pullDistanceRef.current = pullThresholdRef.current * 0.6
        setPullDistance(pullDistanceRef.current)
        scrollToIndex(0, "auto")
        void onRefresh().catch(() => undefined).finally(() => {
          setIsRefreshing(false)
          pullDistanceRef.current = 0
          setPullDistance(0)
        })
      } else {
        pullDistanceRef.current = 0
        setPullDistance(0)
        scrollToIndex(0)
      }
      return
    }

    if (!element?.clientHeight) return
    const delta = gesture.lastY - gesture.startY
    const velocity = Math.abs(delta) / Math.max(1, performance.now() - gesture.startedAt)
    if (cancelled || (Math.abs(delta) < SWIPE_DISTANCE && velocity < 0.55)) {
      scrollToIndex(gesture.startIndex)
      return
    }
    const steps = Math.min(3, Math.max(1, Math.ceil(Math.abs(delta) / (element.clientHeight * 0.72))) + (velocity >= 1.25 ? 1 : 0))
    scrollToIndex(gesture.startIndex + (delta < 0 ? steps : -steps))
  }, [onRefresh, scrollToIndex])

  React.useEffect(() => {
    const element = containerRef.current
    if (!element) return
    element.addEventListener("wheel", handleWheel, { passive: false })
    return () => element.removeEventListener("wheel", handleWheel)
  }, [handleWheel])

  React.useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const touchStart = (event: TouchEvent) => { if (event.touches.length === 1) beginTouch(event.touches[0]!.clientY) }
    const touchMove = (event: TouchEvent) => {
      if (!gestureRef.current || event.touches.length !== 1) return
      event.preventDefault()
      moveTouch(event.touches[0]!.clientY)
    }
    const touchEnd = () => finishTouch(false)
    const touchCancel = () => finishTouch(true)
    element.addEventListener("touchstart", touchStart, { passive: true })
    element.addEventListener("touchmove", touchMove, { passive: false })
    element.addEventListener("touchend", touchEnd)
    element.addEventListener("touchcancel", touchCancel)
    return () => {
      element.removeEventListener("touchstart", touchStart)
      element.removeEventListener("touchmove", touchMove)
      element.removeEventListener("touchend", touchEnd)
      element.removeEventListener("touchcancel", touchCancel)
    }
  }, [beginTouch, finishTouch, moveTouch])

  React.useEffect(() => { targetRef.current = Math.min(targetRef.current, Math.max(0, itemCount - 1)) }, [itemCount])
  React.useLayoutEffect(() => {
    const element = containerRef.current
    if (element && initialIndex > 0) {
      element.scrollTop = initialIndex * element.clientHeight
      targetRef.current = initialIndex
    }
  }, [initialIndex])
  React.useEffect(() => () => {
    if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current)
    if (scrollSettleTimerRef.current) window.clearTimeout(scrollSettleTimerRef.current)
  }, [])

  return {
    containerRef,
    currentIndex,
    goNext,
    goPrevious,
    handleScroll,
    handleKeyDown,
    isDragging,
    isRefreshing,
    pullDistance,
    pullReady: pullDistance >= pullThreshold,
    pullThresholdRem: PULL_THRESHOLD_REM,
  }
}
