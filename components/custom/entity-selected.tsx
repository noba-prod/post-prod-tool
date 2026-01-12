"use client"

import * as React from "react"
import { X, Lock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

interface EntitySelectedProps {
  /** Label text */
  label?: string
  /** Entity type (e.g., "Entity", "Client", "User") */
  entityType?: string
  /** Entity value/name */
  value?: string
  /** Whether the entity is locked (non-removable) */
  locked?: boolean
  /** Callback when remove button is clicked */
  onRemove?: () => void
  /** Whether the component is disabled */
  disabled?: boolean
  /** Additional class names */
  className?: string
}

/**
 * Entity Selected component - Read-only or removable selected entity display
 * 
 * Shows a selected entity with optional remove button or lock icon.
 * Supports default (removable) and disabled/locked states.
 */
export function EntitySelected({
  label = "Title",
  entityType = "Entity",
  value = "Value",
  locked = false,
  onRemove,
  disabled = false,
  className,
}: EntitySelectedProps) {
  const isLocked = locked || disabled

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
      <div
        className={cn(
          "flex items-center gap-6 px-3 py-2.5 rounded-xl bg-zinc-50 w-full",
          disabled && "opacity-50"
        )}
      >
        {/* Entity info */}
        <div
          className={cn(
            "flex items-center gap-1.5 flex-1 text-sm truncate",
            disabled ? "text-muted-foreground" : ""
          )}
        >
          <span className="font-semibold text-foreground truncate">
            {entityType}
          </span>
          <span className="text-muted-foreground truncate flex-1">
            {value}
          </span>
        </div>

        {/* Action icon */}
        {isLocked ? (
          <Lock
            className={cn(
              "h-3 w-3 shrink-0",
              disabled ? "text-muted-foreground opacity-50" : "text-muted-foreground"
            )}
          />
        ) : (
          <button
            type="button"
            onClick={onRemove}
            className="opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Remove entity"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  )
}
