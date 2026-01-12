"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"

interface SwitchItem {
  id: string
  label: string
  checked?: boolean
  disabled?: boolean
}

interface SwitchListProps {
  /** Array of switch items */
  items: SwitchItem[]
  /** Callback when a switch state changes */
  onItemChange?: (id: string, checked: boolean) => void
  /** Whether to show separators between items */
  showSeparators?: boolean
  /** Additional class names */
  className?: string
}

/**
 * Switch List component - Vertical list of labeled switches
 * 
 * Wraps Shadcn Switch and Separator components.
 * Each row contains label + switch.
 * Supports enabled/disabled states per item.
 */
export function SwitchList({
  items,
  onItemChange,
  showSeparators = true,
  className,
}: SwitchListProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-4 rounded-xl bg-zinc-50 w-full",
        className
      )}
    >
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          <div className="flex items-center justify-between h-6">
            <Label
              htmlFor={item.id}
              className={cn(
                "text-sm font-medium leading-none cursor-pointer",
                item.disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {item.label}
            </Label>
            <Switch
              id={item.id}
              checked={item.checked}
              onCheckedChange={(checked) => onItemChange?.(item.id, checked)}
              disabled={item.disabled}
            />
          </div>
          {showSeparators && index < items.length - 1 && (
            <Separator className="w-full" />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
