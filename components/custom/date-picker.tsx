"use client"

import * as React from "react"
import { format, startOfDay, startOfMonth } from "date-fns"
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
  /** Minimum selectable date (disables dates before this); ISO date string or Date */
  minDate?: Date | string
  /** Helper text shown below the picker (e.g. chronology reason) */
  helperText?: string
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
  minDate: minDateProp,
  helperText,
  dateFormat = "PPP",
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const minDate = React.useMemo(() => {
    if (!minDateProp) return undefined
    const d = typeof minDateProp === "string" ? new Date(minDateProp + "T12:00:00") : minDateProp
    return Number.isNaN(d.getTime()) ? undefined : startOfDay(d)
  }, [minDateProp])

  // Al abrir el calendario: 1) si hay fecha seleccionada → mes de esa fecha; 2) si hay constraint (minDate) → mes de la próxima fecha disponible; 3) si no → mes en curso
  const defaultMonth = React.useMemo(() => {
    if (date) return startOfMonth(date)
    if (minDate) return startOfMonth(minDate)
    return startOfMonth(new Date())
  }, [date, minDate])
  const calendarKey = open
    ? date
      ? format(date, "yyyy-MM")
      : minDate
        ? format(minDate, "yyyy-MM")
        : format(new Date(), "yyyy-MM")
    : "closed"

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
              {date ? format(date, dateFormat) : "Select date"}
            </span>
            <CalendarIcon className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            key={calendarKey}
            mode="single"
            selected={date}
            onSelect={(newDate) => {
              onDateChange?.(newDate)
              setOpen(false)
            }}
            disabled={minDate ? { before: minDate } : undefined}
            defaultMonth={defaultMonth}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  )
}
