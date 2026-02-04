"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// =============================================================================
// Date Picker
// =============================================================================

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

// =============================================================================
// Time Picker (Shadcn variant: Field + FieldLabel + Input type="time")
// =============================================================================

const SLOT_TO_TIME: Record<string, string> = {
  morning: "09:00:00",
  midday: "12:00:00",
  "end-of-day": "17:00:00",
}

/** Normalize value to HH:mm:ss for display (slot names -> time, or pad HH:mm) */
function timeValueToDisplay(value: string | undefined): string {
  if (!value?.trim()) return "00:00:00"
  const slot = value.trim().toLowerCase()
  if (SLOT_TO_TIME[slot]) return SLOT_TO_TIME[slot]
  const parts = value.trim().split(":")
  const hh = (parts[0] ?? "").replace(/\D/g, "").slice(0, 2).padStart(2, "0") || "00"
  const mm = (parts[1] ?? "").replace(/\D/g, "").slice(0, 2).padStart(2, "0") || "00"
  const ss = (parts[2] ?? "").replace(/\D/g, "").slice(0, 2).padStart(2, "0") || "00"
  return `${hh}:${mm}:${ss}`
}

/** Native input type="time" with step=1 may return HH:mm or HH:mm:ss; normalize to HH:mm:ss */
function normalizeTimeInput(v: string): string {
  if (!v?.trim()) return "00:00:00"
  const parts = v.trim().split(":")
  const hh = (parts[0] ?? "00").padStart(2, "0")
  const mm = (parts[1] ?? "00").padStart(2, "0")
  const ss = (parts[2] ?? "00").padStart(2, "0")
  return `${hh}:${mm}:${ss}`
}

const TIME_INPUT_CLASS =
  "bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"

export interface TimePickerProps {
  /** Label text */
  label?: string
  /** Value in HH:mm:ss or HH:mm format (or legacy slot: morning, midday, end-of-day) */
  value?: string
  /** Callback when time changes (HH:mm:ss) */
  onValueChange?: (value: string) => void
  /** Placeholder (kept for API compatibility; not shown) */
  placeholder?: string
  disabled?: boolean
  className?: string
}

function TimePicker({
  label = "Time",
  value,
  onValueChange,
  disabled = false,
  className,
}: TimePickerProps) {
  const id = React.useId()
  const displayValue = React.useMemo(() => timeValueToDisplay(value), [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    onValueChange?.(v ? normalizeTimeInput(v) : "00:00:00")
  }

  return (
    <Field className={cn("w-full", className)}>
      <FieldLabel htmlFor={id} disabled={disabled}>
        {label}
      </FieldLabel>
      <Input
        id={id}
        type="time"
        step={1}
        value={displayValue}
        onChange={handleChange}
        disabled={disabled}
        className={TIME_INPUT_CLASS}
      />
    </Field>
  )
}

export { DatePicker, TimePicker }

