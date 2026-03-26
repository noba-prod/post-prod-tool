"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { StepIndicator } from "./step-indicator"
import { StepConnector } from "./step-connector"

interface ProgressItemProps {
  /** The text label for the progress item */
  label?: string
  /** Status of the progress item */
  status?: "active" | "disabled" | "completed"
  /** Whether to show the connector line below */
  showConnector?: boolean
  /** Click handler (only for non-disabled items) */
  onClick?: () => void
  className?: string
}

/**
 * Progress Item component with three variants:
 * - completed: Teal background (teal-50) + teal border (teal-100) + teal check + teal text
 * - active: Gray background (zinc-100) + black ring + dot indicator + black text
 * - disabled: Transparent background + gray border (zinc-200) + empty indicator + gray text
 */
export function ProgressItem({
  label = "Item text",
  status = "disabled",
  showConnector = false,
  onClick,
  className,
}: ProgressItemProps) {
  const isDisabled = status === "disabled"
  const isCompleted = status === "completed"
  const isActive = status === "active"

  return (
    <div className={cn("flex flex-col items-start", className)}>
      {/* Main item */}
      <div
        className={cn(
          "relative flex items-center gap-3 p-3 w-full",
          // Below 760px: compact icon rail (sidebar collapsed)
          "max-[759px]:mx-auto max-[759px]:w-10 max-[759px]:min-h-10 max-[759px]:justify-center max-[759px]:gap-0 max-[759px]:p-2 max-[759px]:box-border",
          // Completed: teal background + teal border + rounded-xl
          isCompleted && "bg-teal-50 border border-teal-100 rounded-xl",
          // Active: zinc background + rounded-lg (ring is separate)
          isActive && "bg-zinc-100 rounded-lg",
          // Disabled: transparent + gray border + rounded-xl
          isDisabled && "bg-transparent border border-zinc-200 rounded-xl",
          // Cursor
          !isDisabled && onClick && "cursor-pointer",
          isDisabled && "cursor-default"
        )}
        onClick={!isDisabled ? onClick : undefined}
        role={!isDisabled && onClick ? "button" : undefined}
        tabIndex={!isDisabled && onClick ? 0 : undefined}
      >
        {/* Step Indicator - apply semantic colors based on status */}
        <StepIndicator 
          status={status} 
          color={isCompleted ? "teal" : isDisabled ? "muted" : "default"} 
        />

        {/* Label text */}
        <span
          className={cn(
            "text-sm font-medium leading-5",
            isCompleted && "text-teal-500",
            isActive && "text-zinc-900",
            isDisabled && "text-zinc-500",
            "max-[759px]:sr-only"
          )}
        >
          {label}
        </span>

        {/* Ring - only visible when active */}
        {isActive && (
          <div className="absolute inset-0 rounded-[10px] ring-2 ring-zinc-900 pointer-events-none" />
        )}
      </div>

      {/* Connector line */}
      {showConnector && (
        <div className="flex justify-start pl-[22px] py-1">
          <StepConnector 
            status={isCompleted ? "completed" : "uncompleted"} 
            orientation="vertical"
            className="h-4"
          />
        </div>
      )}
    </div>
  )
}
