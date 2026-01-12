"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Circle, LucideIcon } from "lucide-react"

interface MenuItemProps {
  /** The text label for the menu item */
  label?: string
  /** Status of the menu item */
  status?: "active" | "default" | "disabled"
  /** Custom icon component from Lucide */
  icon?: LucideIcon
  /** Click handler */
  onClick?: () => void
  className?: string
}

/**
 * Menu Item component with three variants:
 * - active: Gray background (zinc-100) + black icon + black text
 * - default: No background + black icon + black text
 * - disabled: No background + gray icon + gray text
 */
export function MenuItem({
  label = "Item text",
  status = "default",
  icon: Icon = Circle,
  onClick,
  className,
}: MenuItemProps) {
  const isDisabled = status === "disabled"
  const isActive = status === "active"

  return (
    <button
      type="button"
      onClick={!isDisabled ? onClick : undefined}
      disabled={isDisabled}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg w-full text-left transition-colors",
        // Background
        isActive && "bg-zinc-100",
        !isActive && "bg-transparent",
        // Hover (only for non-disabled, non-active)
        !isDisabled && !isActive && "hover:bg-zinc-50",
        // Cursor
        !isDisabled && "cursor-pointer",
        isDisabled && "cursor-not-allowed",
        className
      )}
    >
      {/* Icon */}
      <Icon
        className={cn(
          "w-4 h-4 shrink-0",
          isDisabled ? "text-zinc-500" : "text-zinc-900"
        )}
        strokeWidth={2}
      />

      {/* Label text */}
      <span
        className={cn(
          "text-sm font-medium leading-none",
          isDisabled ? "text-zinc-500" : "text-zinc-900"
        )}
      >
        {label}
      </span>
    </button>
  )
}
