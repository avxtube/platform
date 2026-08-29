"use client"

import * as React from "react"
import { ChevronsUpDownIcon, Loader2Icon, XIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"

export type SmartSelectOption = {
  value: string
  label: string
  description?: string
  disabled?: boolean
  icon?: React.ReactNode
  keywords?: string[]
}

export type SmartSelectProps = {
  options: readonly SmartSelectOption[]
  value?: string | string[]
  defaultValue?: string | string[]
  onValueChange?: (value: string | string[]) => void
  multiple?: boolean
  disabled?: boolean
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  contentClassName?: string
  multiSelectMode?: "default" | "count" | "expandable"
  maxExpandedCount?: number
  renderOption?: (
    option: SmartSelectOption,
    isSelected: boolean
  ) => React.ReactNode
  renderValue?: (selectedOptions: SmartSelectOption[]) => React.ReactNode
  optionsSelectedText?: string
  showLessText?: string
  moreText?: string
  id?: string
  ariaLabel?: string
  onSearch?: (query: string) => void
  searchMinChars?: number
  searching?: boolean
  searchingText?: string
  searchHintText?: string
}

export function SmartSelect({
  options,
  value,
  defaultValue,
  onValueChange,
  id,
  ariaLabel,
  multiple = false,
  disabled = false,
  placeholder = "Select option…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  className,
  contentClassName,
  multiSelectMode = "default",
  maxExpandedCount = 2,
  renderOption,
  renderValue,
  optionsSelectedText = "options selected",
  showLessText = "Show less",
  moreText = "+{{count}} more",
  onSearch,
  searchMinChars = 3,
  searching = false,
  searchingText = "Searching…",
  searchHintText = "Type at least {{count}} characters to search",
}: SmartSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [expanded, setExpanded] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [internalValue, setInternalValue] = React.useState<string | string[]>(
    defaultValue ?? (multiple ? [] : "")
  )
  const [selectedCache, setSelectedCache] = React.useState<
    Record<string, SmartSelectOption>
  >({})
  const lastSearchRef = React.useRef("")

  const actualValue = value === undefined ? internalValue : value
  const asyncMode = onSearch !== undefined

  React.useEffect(() => {
    if (!asyncMode) return

    const query = search.trim()
    const nextSearch = query.length >= searchMinChars ? query : ""
    if (nextSearch === lastSearchRef.current) return

    const timer = window.setTimeout(() => {
      lastSearchRef.current = nextSearch
      onSearch(nextSearch)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [asyncMode, onSearch, search, searchMinChars])

  const selectedValues = multiple
    ? Array.isArray(actualValue)
      ? actualValue
      : []
    : typeof actualValue === "string" && actualValue
      ? [actualValue]
      : []

  const selectedOptions = selectedValues.flatMap((selectedValue) => {
    const option =
      options.find((item) => item.value === selectedValue) ??
      selectedCache[selectedValue]
    return option ? [option] : []
  })

  function updateValue(nextValue: string | string[]) {
    setInternalValue(nextValue)
    onValueChange?.(nextValue)
  }

  function toggleSelection(option: SmartSelectOption) {
    setSelectedCache((current) => ({
      ...current,
      [option.value]: option,
    }))

    if (multiple) {
      const currentValue = Array.isArray(actualValue) ? actualValue : []
      updateValue(
        currentValue.includes(option.value)
          ? currentValue.filter((item) => item !== option.value)
          : [...currentValue, option.value]
      )
      return
    }

    updateValue(option.value)
    setOpen(false)
  }

  function removeSelection(
    optionValue: string,
    event: React.MouseEvent<HTMLSpanElement>
  ) {
    event.preventDefault()
    event.stopPropagation()
    if (!multiple) return

    const currentValue = Array.isArray(actualValue) ? actualValue : []
    updateValue(currentValue.filter((item) => item !== optionValue))
  }

  function renderSelectedValue() {
    if (selectedOptions.length === 0) {
      return (
        <span className="truncate text-muted-foreground">{placeholder}</span>
      )
    }

    if (renderValue) return renderValue(selectedOptions)

    if (!multiple) {
      const option = selectedOptions[0]
      return (
        <span className="flex min-w-0 items-center gap-2 justify-center truncate">
          {option?.icon}
          <span className="truncate">{option?.label}</span>
        </span>
      )
    }

    if (multiSelectMode === "count") {
      return (
        <span className="flex items-center gap-1 truncate">
          <Badge variant="outline" className="rounded-sm">
            {selectedOptions.length}
          </Badge>
          {optionsSelectedText}
        </span>
      )
    }

    const visibleOptions =
      multiSelectMode === "expandable" && !expanded
        ? selectedOptions.slice(0, maxExpandedCount)
        : selectedOptions
    const hiddenCount = selectedOptions.length - visibleOptions.length
    const canToggleExpansion =
      multiSelectMode === "expandable" &&
      selectedOptions.length > maxExpandedCount

    return (
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1 py-0.5 text-left">
        {visibleOptions.map((option) => (
          <Badge
            key={option.value}
            variant="outline"
            className="gap-1 rounded-sm"
          >
            {option.icon}
            {option.label}
            <span
              role="button"
              tabIndex={0}
              aria-label={`Remove ${option.label}`}
              className="ml-0.5 rounded-sm opacity-60 hover:opacity-100"
              onClick={(event) => removeSelection(option.value, event)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  const currentValue = Array.isArray(actualValue)
                    ? actualValue
                    : []
                  updateValue(
                    currentValue.filter((item) => item !== option.value)
                  )
                }
              }}
            >
              <XIcon className="size-3" aria-hidden="true" />
            </span>
          </Badge>
        ))}

        {canToggleExpansion && (
          <Badge
            variant="outline"
            role="button"
            tabIndex={0}
            className="cursor-pointer rounded-sm"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setExpanded((current) => !current)
            }}
          >
            {expanded
              ? showLessText
              : moreText.replace("{{count}}", String(hiddenCount))}
          </Badge>
        )}
      </span>
    )
  }

  return (
    <Popover
      open={disabled ? false : open}
      onOpenChange={(nextOpen) => {
        if (!disabled) setOpen(nextOpen)
      }}
    >
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            disabled={disabled}
            variant="outline"
            role="combobox"
            aria-label={ariaLabel}
            aria-expanded={open}
            className={cn(
              "h-auto min-h-9 w-full justify-between gap-2 hover:bg-transparent",
              className
            )}
          />
        }
      >
        {renderSelectedValue()}
        <ChevronsUpDownIcon
          className="size-4 shrink-0 text-muted-foreground/80"
          aria-hidden="true"
        />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className={cn(
          "w-(--anchor-width) min-w-56 gap-0 p-0",
          contentClassName
        )}
        onWheel={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
      >
        <Command shouldFilter={!asyncMode}>
          <CommandInput
            placeholder={searchPlaceholder}
            {...(asyncMode ? { value: search, onValueChange: setSearch } : {})}
          />
          <CommandList>
            {asyncMode && searching ? (
              <div className="flex items-center justify-center gap-2 py-5 text-sm text-muted-foreground">
                <Loader2Icon
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
                {searchingText}
              </div>
            ) : (
              <CommandEmpty>
                {asyncMode && search.trim().length < searchMinChars
                  ? searchHintText.replace("{{count}}", String(searchMinChars))
                  : emptyText}
              </CommandEmpty>
            )}

            <CommandGroup className={cn(asyncMode && searching && "hidden")}>
              {options.map((option) => {
                const isSelected = selectedValues.includes(option.value)
                const searchValue = [
                  option.label,
                  option.value,
                  ...(option.keywords ?? []),
                ].join(" ")

                return (
                  <CommandItem
                    key={option.value}
                    value={searchValue}
                    disabled={option.disabled}
                    data-checked={isSelected}
                    onSelect={() => toggleSelection(option)}
                  >
                    {renderOption ? (
                      renderOption(option, isSelected)
                    ) : (
                      <span className="flex min-w-0 items-center gap-2">
                        {option.icon}
                        <span className="min-w-0">
                          <span className="block truncate">{option.label}</span>
                          {option.description && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {option.description}
                            </span>
                          )}
                        </span>
                      </span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
