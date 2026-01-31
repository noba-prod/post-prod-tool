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
  disabled = false,
  className,
}: OptionPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [triggerWidth, setTriggerWidth] = React.useState<number | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  // Find selected option label
  const selectedOption = options.find((opt) => opt.value === value)

  React.useLayoutEffect(() => {
    if (open && triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth)
    }
  }, [open])

  const handleSelect = (selectedValue: string) => {
    const option = options.find((opt) => opt.label === selectedValue || opt.value === selectedValue)
    if (option && !option.disabled) {
      onValueChange?.(option.value)
      setOpen(false)
    }
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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "h-10 w-full justify-between px-3 font-normal text-sm rounded-lg",
              !value && "text-muted-foreground",
              disabled && "opacity-50"
            )}
          >
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0"
          align="start"
          style={triggerWidth != null ? { width: triggerWidth } : undefined}
        >
          <Command>
            {searchable && <CommandInput placeholder="Search..." />}
            <CommandList>
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
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
