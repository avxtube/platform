"use client"

import * as React from "react"

export interface UseUncontrolledInput<T> {
  value?: T
  defaultValue?: T
  finalValue: T
  onChange?: (value: T) => void
}

export function useUncontrolled<T>({
  value,
  defaultValue,
  finalValue,
  onChange,
}: UseUncontrolledInput<T>): [T, (value: T) => void, boolean] {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(
    defaultValue ?? finalValue
  )
  const controlled = value !== undefined

  const setValue = React.useCallback(
    (nextValue: T) => {
      if (!controlled) setUncontrolledValue(nextValue)
      onChange?.(nextValue)
    },
    [controlled, onChange]
  )

  return [controlled ? value : uncontrolledValue, setValue, controlled]
}
