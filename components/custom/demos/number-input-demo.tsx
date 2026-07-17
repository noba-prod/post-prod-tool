"use client"

import * as React from "react"
import { NumberInput } from "../number-input"

/**
 * Interactive demo for the Number Input custom component.
 * Shows the default (min = 1, decrease disabled at 1), a min = 0 scenario,
 * a bounded scenario (min/max), and a disabled state.
 */
export function NumberInputDemo() {
  const [rolls, setRolls] = React.useState(1)
  const [zeroable, setZeroable] = React.useState(0)
  const [bounded, setBounded] = React.useState(2)

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Default (min = 1 — decrease disabled at 1)
        </p>
        <NumberInput value={rolls} onValueChange={setRolls} min={1} aria-label="Rolls" />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">min = 0 (allows zero)</p>
        <NumberInput value={zeroable} onValueChange={setZeroable} min={0} aria-label="Quantity" />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Bounded (min = 1, max = 5)</p>
        <NumberInput
          value={bounded}
          onValueChange={setBounded}
          min={1}
          max={5}
          aria-label="Bounded quantity"
        />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Disabled</p>
        <NumberInput value={3} onValueChange={() => {}} disabled aria-label="Disabled" />
      </div>
    </div>
  )
}
