"use client"

import * as React from "react"
import { Layout, LayoutSection, LayoutSlot } from "../layout"
import { Titles } from "../titles"
import { FilterBar } from "../filter-bar"
import { ParticipantSetupBox } from "../participant-setup-box"
import { Tables } from "../tables"

/**
 * Demo for Layout component showing different configurations
 */
export function LayoutDemo() {
  return (
    <div className="flex flex-col gap-16 w-full">
      {/* Demo 1: Basic layout with placeholder slots */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground px-4">
          Basic Layout (with placeholder slots)
        </p>
        <div className="border border-dashed border-purple-300 rounded-xl overflow-hidden bg-purple-50/30">
          <Layout showSeparators={false}>
            <LayoutSection>
              <LayoutSlot />
            </LayoutSection>
            <LayoutSection>
              <LayoutSlot />
              <LayoutSlot />
            </LayoutSection>
            <LayoutSection>
              <LayoutSlot />
              <LayoutSlot />
              <LayoutSlot />
            </LayoutSection>
          </Layout>
        </div>
      </div>

      {/* Demo 2: Layout with separators */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground px-4">
          Layout with separators between sections
        </p>
        <div className="border border-dashed border-purple-300 rounded-xl overflow-hidden bg-purple-50/30">
          <Layout showSeparators={true}>
            <LayoutSection>
              <LayoutSlot />
            </LayoutSection>
            <LayoutSection>
              <LayoutSlot />
              <LayoutSlot />
            </LayoutSection>
            <LayoutSection>
              <LayoutSlot />
            </LayoutSection>
          </Layout>
        </div>
      </div>

      {/* Demo 3: Real usage with components */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground px-4">
          Real usage example (Titles + FilterBar + Table)
        </p>
        <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
          <Layout showSeparators={true}>
            {/* Section 1: Page heading */}
            <LayoutSection>
              <Titles 
                type="main-section" 
                title="Members" 
              />
            </LayoutSection>

            {/* Section 2: Filter bar + Table */}
            <LayoutSection>
              <FilterBar 
                variant="members" 
                searchPlaceholder="Search members..."
              />
              <Tables variant="members" />
            </LayoutSection>
          </Layout>
        </div>
      </div>

      {/* Demo 4: Collection page layout */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground px-4">
          Collection page example (Title + FilterBar + Content)
        </p>
        <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
          <Layout showSeparators={true}>
            {/* Section 1: Page heading */}
            <LayoutSection>
              <Titles 
                type="main-section" 
                title="Collections" 
              />
            </LayoutSection>

            {/* Section 2: Filter bar */}
            <LayoutSection gap="lg">
              <FilterBar 
                variant="collections"
              />
              {/* Placeholder for grid/list content */}
              <LayoutSlot />
            </LayoutSection>
          </Layout>
        </div>
      </div>

      {/* Demo 5: Participant setup layout */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground px-4">
          Participant setup example (multiple sections)
        </p>
        <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
          <Layout showSeparators={true}>
            {/* Section 1: Block heading */}
            <LayoutSection>
              <Titles 
                type="block" 
                title="Participants" 
                subtitle="Manage participants for this collection"
              />
            </LayoutSection>

            {/* Section 2: Photographer setup */}
            <LayoutSection>
              <ParticipantSetupBox 
                title="Photographer"
                placeholder="Select photographer"
              />
            </LayoutSection>

            {/* Section 3: Lab setup */}
            <LayoutSection>
              <ParticipantSetupBox 
                title="Lab"
                placeholder="Select lab"
              />
            </LayoutSection>
          </Layout>
        </div>
      </div>

      {/* Description */}
      <div className="p-4 bg-zinc-50 rounded-lg text-sm text-zinc-600 mx-4">
        <p className="font-medium mb-2">Layout Structure:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Layout:</strong> Main container with padding (40px default)</li>
          <li><strong>LayoutSection:</strong> Groups related content (20px gap between items)</li>
          <li><strong>LayoutSlot:</strong> Placeholder/wrapper for any content</li>
          <li><strong>Separator:</strong> Automatically inserted between sections when showSeparators=true</li>
        </ul>
        <p className="font-medium mt-4 mb-2">Supported content:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Tables (members, participants, entities)</li>
          <li>Grid (collection cards)</li>
          <li>FilterBar (collections, members, entities)</li>
          <li>Titles (main-section, block, section, form)</li>
          <li>ParticipantSetupBox</li>
          <li>Any other custom component</li>
        </ul>
      </div>
    </div>
  )
}
