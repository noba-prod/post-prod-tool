"use client"

import * as React from "react"
import { BlockTemplate } from "../block"

/**
 * Demo for Block Template component showing micro-interactions between variants
 */
export function BlockTemplateDemo() {
  return (
    <div className="flex flex-col gap-12 w-full max-w-4xl">
      {/* ============================================ */}
      {/* CREATION MODE - Interactive */}
      {/* ============================================ */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-foreground px-4">
          Creation Mode (Interactive)
        </h3>
        <p className="text-sm text-muted-foreground px-4">
          Click "Edit" on completed blocks to expand, click "Next Step" to collapse.
        </p>

        {/* Creation - Interactive block starting as Active */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground px-4">
            Interactive: Starts as Active → Click "Next Step" → Completed → Click "Edit" → Active
          </p>
          <BlockTemplate
            mode="creation"
            variant="active"
            title="Participants"
            subtitle="Add participants to this collection"
            showParticipants={true}
            participants={[
              { role: "Client", name: "@zara" },
              { role: "Photographer", name: "@tomhaser" },
            ]}
            primaryLabel="Next Step"
          >
            <div className="p-4 bg-zinc-50 rounded-lg text-sm text-zinc-600">
              Form content goes here. Click "Next Step" to complete this block.
            </div>
          </BlockTemplate>
        </div>

        {/* Creation - Interactive block starting as Completed */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground px-4">
            Interactive: Starts as Completed → Click "Edit" → Active
          </p>
          <BlockTemplate
            mode="creation"
            variant="completed"
            title="Shooting Setup"
            subtitle="Configure the shooting parameters"
            showParticipants={true}
            participants={[
              { role: "Client", name: "@mango" },
              { role: "Lab", name: "@revealcoruña" },
            ]}
            primaryLabel="Save Changes"
          >
            <div className="p-4 bg-teal-50 rounded-lg text-sm text-teal-700">
              This section was completed. Click "Edit" to modify.
            </div>
          </BlockTemplate>
        </div>

        {/* Creation - Disabled (no interaction) */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground px-4">
            Disabled: No interactions available
          </p>
          <BlockTemplate
            mode="creation"
            variant="disabled"
            title="Low-res Scan"
          />
        </div>
      </div>

      {/* ============================================ */}
      {/* VIEW MODE - Interactive */}
      {/* ============================================ */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-foreground px-4">
          View Mode (Interactive)
        </h3>
        <p className="text-sm text-muted-foreground px-4">
          Click collapsed blocks to expand, click ChevronUp to collapse.
        </p>

        {/* View - Interactive block starting as Active */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground px-4">
            Interactive: Starts as Active (expanded) → Click ↑ → Inactive (collapsed)
          </p>
          <BlockTemplate
            mode="view"
            variant="active"
            title="Photo Selection"
            subtitle="Select the photos for this collection"
            showParticipants={true}
            participants={[
              { role: "Editor", name: "@studiomadrid" },
              { role: "Client", name: "@dior" },
            ]}
            primaryLabel="View Details"
          >
            <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
              Content preview. Click the ↑ button to collapse this block.
            </div>
          </BlockTemplate>
        </div>

        {/* View - Interactive block starting as Inactive */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground px-4">
            Interactive: Starts as Inactive (collapsed) → Click to expand
          </p>
          <BlockTemplate
            mode="view"
            variant="inactive"
            title="Pre-check & Edition"
            subtitle="Review and edit the final selection"
            showParticipants={true}
            participants={[
              { role: "Client", name: "@loewe" },
            ]}
            primaryLabel="Open"
          >
            <div className="p-4 bg-amber-50 rounded-lg text-sm text-amber-700">
              Hidden content that appears when expanded.
            </div>
          </BlockTemplate>
        </div>

        {/* View - Another collapsed block */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground px-4">
            Interactive: Another collapsed block
          </p>
          <BlockTemplate
            mode="view"
            variant="inactive"
            title="LR to HR Setup"
            subtitle="Configure low-res to high-res conversion"
            primaryLabel="Configure"
          />
        </div>
      </div>

      {/* Description */}
      <div className="p-4 bg-zinc-50 rounded-lg text-sm text-zinc-600 mx-4">
        <p className="font-medium mb-2">Micro-interactions:</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-medium text-zinc-800 mb-1">Creation Mode:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Active</strong> → Click Primary → <strong>Completed</strong></li>
              <li><strong>Completed</strong> → Click Edit → <strong>Active</strong></li>
              <li><strong>Disabled</strong>: No interactions</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-zinc-800 mb-1">View Mode:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Active</strong>: Expanded view (no collapse button per Figma)</li>
              <li><strong>Inactive</strong> → Click anywhere → <strong>Active</strong></li>
            </ul>
          </div>
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          Note: Component supports both controlled (via currentVariant prop) and uncontrolled modes.
        </p>
      </div>
    </div>
  )
}
