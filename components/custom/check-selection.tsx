"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "./check"

interface CheckSelectionProps {
  /** The text label for the check item */
  label?: string
  /** Whether the item is selected (checked) */
  selected?: boolean
  /** Visual status: default or disabled */
  status?: "default" | "disabled"
  /** Click handler */
  onClick?: () => void
  className?: string
}

/**
 * Check Selection component with 4 variants based on status and selected state.
 * 
 * Variants:
 * - Status=Default, Selected=Yes: bg-zinc-100, active check (black), black text, black ring
 * - Status=Disabled, Selected=Yes: bg-zinc-100, active check (gray), gray text, gray ring
 * - Status=Default, Selected=No: bg-zinc-50, inactive check (black), black text, no ring
 * - Status=Disabled, Selected=No: bg-zinc-50, inactive check (gray), gray text, no ring
 */
export function CheckSelection({
  label = "Item text",
  selected = false,
  status = "default",
  onClick,
  className,
}: CheckSelectionProps) {
  const isDisabled = status === "disabled"

  // Determine check status based on selected state
  const checkStatus = selected ? "active" : "inactive"

  // Container component - button for interactive, div for disabled
  const Container = isDisabled ? "div" : "button"

  return (
    <Container
      type={isDisabled ? undefined : "button"}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled ? undefined : false}
      className={cn(
        "relative flex items-center gap-3 p-3 rounded-lg w-full text-left",
        // Background: selected = zinc-100, unselected = zinc-50
        selected ? "bg-zinc-100" : "bg-zinc-50",
        // Cursor
        !isDisabled && "cursor-pointer",
        isDisabled && "cursor-not-allowed",
        className
      )}
    >
      {/* Check icon */}
      <Check status={checkStatus} disabled={isDisabled} />

      {/* Label text */}
      <span
        className={cn(
          "text-sm font-medium leading-none",
          isDisabled ? "text-zinc-500" : "text-zinc-900"
        )}
      >
        {label}
      </span>

      {/* Ring - visible when selected (black for default, gray for disabled) */}
      {selected && (
        <div 
          className={cn(
            "absolute inset-0 rounded-[10px] ring-2 pointer-events-none",
            isDisabled ? "ring-zinc-500" : "ring-zinc-900"
          )} 
        />
      )}
    </Container>
  )
}
