"use client"

import * as React from "react"
import { ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"

interface Option {
  value: string
  label: string
  disabled?: boolean
}

interface OptionPickerProps {
  /** Label text */
  label?: string
  /** Selected value */
  value?: string
  /** Callback when value changes */
  onValueChange?: (value: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Options to display */
  options: Option[]
  /** Whether to show search input (false = command box without search) */
  searchable?: boolean
  /**
   * When searchable: if the query matches no option, show `noResultsText` and a primary button
   * to submit the current search as the value (same pattern as global search empty state).
   */
  allowCreate?: boolean
  /** Label for the create button (only when allowCreate). */
  createActionLabel?: string
  /** Empty-state copy when allowCreate and search has no matches (default: "No results found."). */
  noResultsText?: string
  /** Whether the picker is disabled */
  disabled?: boolean
  /** Additional class names */
  className?: string
}

/**
 * Option Picker component - Generic combobox selector with search
 * 
 * Wraps Shadcn Popover and Command components for reuse across multiple flows.
 * Supports default, active, and disabled states.
 */
export function OptionPicker({
  label = "Title",
  value,
  onValueChange,
  placeholder = "Select an option",
  options,
  searchable = true,
  allowCreate = false,
  createActionLabel = "Add new",
  noResultsText = "No results found.",
  disabled = false,
  className,
}: OptionPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [triggerWidth, setTriggerWidth] = React.useState<number | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  // Find selected option label — custom DB values may not appear in `options`
  const selectedOption = options.find((opt) => opt.value === value)
  const triggerLabel =
    selectedOption?.label ?? (value != null && String(value).trim() !== "" ? String(value) : null)

  const filteredOptions = React.useMemo(() => {
    if (!allowCreate || !searchable) return options
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
    )
  }, [allowCreate, searchable, options, search])

  React.useLayoutEffect(() => {
    if (open && triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth)
    }
  }, [open])

  React.useEffect(() => {
    if (!open) setSearch("")
  }, [open])

  const handleSelect = (selectedValue: string) => {
    const option = options.find((opt) => opt.label === selectedValue || opt.value === selectedValue)
    if (option && !option.disabled) {
      onValueChange?.(option.value)
      setSearch("")
      setOpen(false)
    }
  }

  const handleCreateFromSearch = () => {
    const q = search.trim()
    if (!q) return
    onValueChange?.(q)
    setSearch("")
    setOpen(false)
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setSearch("")
  }

  return (
    <div className={cn("flex flex-col gap-2 w-full", className)}>
      {label && (
        <Label
          className={cn(
            "text-sm font-medium leading-none",
            disabled ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {label}
        </Label>
      )}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "h-10 w-full justify-between px-3 font-normal text-sm rounded-lg",
              !triggerLabel && "text-muted-foreground",
              disabled && "opacity-50"
            )}
          >
            <span className="truncate">
              {triggerLabel ?? placeholder}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0"
          align="start"
          style={triggerWidth != null ? { width: triggerWidth } : undefined}
        >
          <Command shouldFilter={allowCreate && searchable ? false : undefined}>
            {searchable && (
              <CommandInput
                placeholder="Search..."
                value={allowCreate ? search : undefined}
                onValueChange={allowCreate ? setSearch : undefined}
              />
            )}
            <CommandList>
              {allowCreate && searchable ? (
                search.trim() && filteredOptions.length === 0 ? (
                  <>
                    <CommandEmpty className="py-6">{noResultsText}</CommandEmpty>
                    <div className="px-2 pb-2 pt-0">
                      <Button
                        type="button"
                        variant="default"
                        className="w-full rounded-lg"
                        onClick={handleCreateFromSearch}
                      >
                        {createActionLabel}
                      </Button>
                    </div>
                  </>
                ) : (
                  <CommandGroup>
                    {filteredOptions.map((option) => (
                      <CommandItem
                        key={option.value}
                        value={option.label}
                        onSelect={handleSelect}
                        disabled={option.disabled}
                        data-checked={value === option.value}
                      >
                        {option.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )
              ) : (
                <>
                  <CommandEmpty>No option found.</CommandEmpty>
                  <CommandGroup>
                    {options.map((option) => (
                      <CommandItem
                        key={option.value}
                        value={option.label}
                        onSelect={handleSelect}
                        disabled={option.disabled}
                        data-checked={value === option.value}
                      >
                        {option.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
