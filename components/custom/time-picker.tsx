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

// Default time slots as per Figma
const DEFAULT_TIME_SLOTS = [
  { value: "morning", label: "Morning (9:00am)" },
  { value: "midday", label: "Midday (12:00pm)" },
  { value: "end-of-day", label: "End of day (5:00pm)" },
] as const

interface TimeSlot {
  value: string
  label: string
}

interface TimePickerProps {
  /** Label text */
  label?: string
  /** Selected time value */
  value?: string
  /** Callback when time changes */
  onValueChange?: (value: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Custom time slots (overrides defaults) */
  timeSlots?: TimeSlot[]
  /** Whether the picker is disabled */
  disabled?: boolean
  /** Additional class names */
  className?: string
}

/**
 * Time Picker component - Dropdown for selecting predefined time slots
 * 
 * Wraps Shadcn Popover components.
 * Fully keyboard accessible.
 */
export function TimePicker({
  label = "Time",
  value,
  onValueChange,
  placeholder = "Select a slot",
  timeSlots = DEFAULT_TIME_SLOTS,
  disabled = false,
  className,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [triggerWidth, setTriggerWidth] = React.useState<number | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  // Find selected slot label
  const selectedSlot = timeSlots.find((slot) => slot.value === value)

  React.useLayoutEffect(() => {
    if (open && triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth)
    }
  }, [open])

  const handleSelect = (selectedValue: string) => {
    onValueChange?.(selectedValue)
    setOpen(false)
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
              {selectedSlot ? selectedSlot.label : placeholder}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-1"
          align="start"
          style={triggerWidth != null ? { width: triggerWidth } : undefined}
        >
          <div className="flex flex-col">
            {timeSlots.map((slot) => (
              <button
                key={slot.value}
                type="button"
                onClick={() => handleSelect(slot.value)}
                className={cn(
                  "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-default select-none outline-none",
                  "hover:bg-accent hover:text-accent-foreground",
                  value === slot.value && "bg-accent text-accent-foreground"
                )}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
