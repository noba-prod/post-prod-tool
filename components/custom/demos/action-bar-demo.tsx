"use client"

import * as React from "react"
import { ActionBar } from "../action-bar"

/**
 * Demo for Action Bar component
 */
export function ActionBarDemo() {
  const handlePrimary = () => alert("Primary clicked!")
  const handleSecondary = () => alert("Secondary clicked!")

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl">
      {/* Default */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Default (both buttons)
        </p>
        <div className="p-4 bg-white border border-zinc-200 rounded-xl">
          <ActionBar
            primaryLabel="Primary"
            secondaryLabel="Secondary"
            onPrimaryClick={handlePrimary}
            onSecondaryClick={handleSecondary}
          />
        </div>
      </div>

      {/* Custom labels */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Custom labels
        </p>
        <div className="p-4 bg-white border border-zinc-200 rounded-xl">
          <ActionBar
            primaryLabel="Save changes"
            secondaryLabel="Cancel"
            onPrimaryClick={handlePrimary}
            onSecondaryClick={handleSecondary}
          />
        </div>
      </div>

      {/* Primary only */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Primary only
        </p>
        <div className="p-4 bg-white border border-zinc-200 rounded-xl">
          <ActionBar
            primaryLabel="Continue"
            showSecondary={false}
            onPrimaryClick={handlePrimary}
          />
        </div>
      </div>

      {/* Secondary only */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Secondary only
        </p>
        <div className="p-4 bg-white border border-zinc-200 rounded-xl">
          <ActionBar
            secondaryLabel="Go back"
            showPrimary={false}
            onSecondaryClick={handleSecondary}
          />
        </div>
      </div>

      {/* Disabled states */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Disabled states
        </p>
        <div className="p-4 bg-white border border-zinc-200 rounded-xl">
          <ActionBar
            primaryLabel="Submit"
            secondaryLabel="Cancel"
            primaryDisabled
          />
        </div>
      </div>

      {/* Form context example */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          In form context
        </p>
        <div className="p-4 bg-white border border-zinc-200 rounded-xl flex flex-col gap-4">
          <div className="h-24 bg-zinc-100 rounded-lg flex items-center justify-center text-sm text-muted-foreground">
            Form content here
          </div>
          <ActionBar
            primaryLabel="Create collection"
            secondaryLabel="Discard"
            onPrimaryClick={handlePrimary}
            onSecondaryClick={handleSecondary}
          />
        </div>
      </div>

      {/* Description */}
      <div className="p-4 bg-zinc-50 rounded-lg text-sm text-zinc-600">
        <p className="font-medium mb-2">Usage:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Primary button: Black filled (default variant)</li>
          <li>Secondary button: Gray background (secondary variant)</li>
          <li>Both buttons use size="lg" (40px height) and rounded-xl (12px radius)</li>
          <li>Gap: 8px (gap-2) between buttons</li>
          <li>Aligned to the right (justify-end)</li>
        </ul>
      </div>
    </div>
  )
}
