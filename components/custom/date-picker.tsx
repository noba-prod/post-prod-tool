"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"

interface DatePickerProps {
  /** Label text */
  label?: string
  /** Selected date */
  date?: Date
  /** Callback when date changes */
  onDateChange?: (date: Date | undefined) => void
  /** Placeholder text */
  placeholder?: string
  /** Whether the picker is disabled */
  disabled?: boolean
  /** Date format string (date-fns format) */
  dateFormat?: string
  /** Additional class names */
  className?: string
}

/**
 * Date Picker component - Single date selection with calendar popup
 * 
 * Wraps Shadcn Popover, Button, and Calendar components.
 * Supports closed, open, selected, and disabled states.
 */
export function DatePicker({
  label = "Date",
  date,
  onDateChange,
  placeholder = "Select date",
  disabled = false,
  dateFormat = "PPP",
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

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
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-10 w-full justify-between text-left font-normal rounded-lg px-3",
              !date && "text-muted-foreground",
              disabled && "opacity-50"
            )}
          >
            <span className="truncate">
              {date ? format(date, dateFormat) : placeholder}
            </span>
            <CalendarIcon className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(newDate) => {
              onDateChange?.(newDate)
              setOpen(false)
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
