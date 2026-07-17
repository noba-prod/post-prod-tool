"use client"

import * as React from "react"
import { Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface NumberInputProps {
  /** Current value (controlled). */
  value: number
  /** Called with the next clamped value when the user changes it. */
  onValueChange: (value: number) => void
  /**
   * Minimum allowed value. The decrease button disables at this value.
   * Default: 1. Configurable per scenario (e.g. set to 0 to allow zero).
   */
  min?: number
  /** Maximum allowed value (increase button disables at this value). Default: no max. */
  max?: number
  /** Increment/decrement step. Default: 1. */
  step?: number
  /** Disable the whole control. */
  disabled?: boolean
  /** Id forwarded to the number input (for label association). */
  id?: string
  /** Accessible label for the number input. */
  "aria-label"?: string
  /** Extra classes for the outer container. */
  className?: string
  /** Extra classes for the number input. */
  inputClassName?: string
}

/**
 * Number Input — DS custom component (Figma node 13991-12864).
 * Composes Button (icon variant, circular) + Input (centered number) with a
 * decrease/increase pair. The decrease/increase buttons disable at min/max
 * bounds; `min` is configurable so it can be reused across scenarios.
 */
export function NumberInput({
  value,
  onValueChange,
  min = 1,
  max,
  step = 1,
  disabled = false,
  id,
  "aria-label": ariaLabel,
  className,
  inputClassName,
}: NumberInputProps) {
  const clamp = React.useCallback(
    (n: number) => {
      let next = Number.isFinite(n) ? Math.trunc(n) : min
      if (next < min) next = min
      if (max !== undefined && next > max) next = max
      return next
    },
    [min, max]
  )

  const atMin = value <= min
  const atMax = max !== undefined && value >= max

  const commit = (n: number) => {
    const next = clamp(n)
    if (next !== value) onValueChange(next)
  }

  return (
    <div className={cn("flex w-full items-center gap-2", className)}>
      <Button
        type="button"
        variant="default"
        size="icon-lg"
        className="rounded-full"
        disabled={disabled || atMin}
        onClick={() => commit(value - step)}
        aria-label="Decrease"
      >
        <Minus className="size-4" strokeWidth={2} />
      </Button>

      <Input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={ariaLabel}
        disabled={disabled}
        className={cn("h-10 flex-1 min-w-0 text-center", inputClassName)}
        value={String(value)}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, "")
          if (raw === "") {
            onValueChange(min)
            return
          }
          commit(Number(raw))
        }}
        onBlur={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, "")
          commit(raw === "" ? min : Number(raw))
        }}
      />

      <Button
        type="button"
        variant="default"
        size="icon-lg"
        className="rounded-full"
        disabled={disabled || atMax}
        onClick={() => commit(value + step)}
        aria-label="Increase"
      >
        <Plus className="size-4" strokeWidth={2} />
      </Button>
    </div>
  )
}
