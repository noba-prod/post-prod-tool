"use client"

import * as React from "react"
import { ModalWindow } from "../modal-window"
import { Button } from "@/components/ui/button"
import { Layout, LayoutSection, LayoutSlot } from "../layout"
import { ParticipantSetupBox } from "../participant-setup-box"
import { Titles } from "../titles"

/**
 * Demo for Modal Window component
 */
export function ModalWindowDemo() {
  const [basicOpen, setBasicOpen] = React.useState(false)
  const [contentOpen, setContentOpen] = React.useState(false)
  const [formOpen, setFormOpen] = React.useState(false)

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl">
      {/* Demo buttons */}
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            Basic Modal
          </p>
          <Button onClick={() => setBasicOpen(true)}>
            Open Basic Modal
          </Button>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            Modal with Layout Content
          </p>
          <Button onClick={() => setContentOpen(true)}>
            Open Modal with Content
          </Button>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            Modal with Form (Participant Setup)
          </p>
          <Button onClick={() => setFormOpen(true)}>
            Open Form Modal
          </Button>
        </div>
      </div>

      {/* Basic Modal */}
      <ModalWindow
        open={basicOpen}
        onOpenChange={setBasicOpen}
        title="Basic Modal"
        subtitle="This is a basic modal window example"
        primaryLabel="Save"
        secondaryLabel="Cancel"
        onPrimaryClick={() => {
          alert("Primary clicked!")
          setBasicOpen(false)
        }}
        onSecondaryClick={() => setBasicOpen(false)}
      >
        <div className="p-5">
          <div className="p-6 bg-zinc-50 rounded-lg text-center text-sm text-zinc-600">
            <p className="font-medium mb-2">Modal Content Area</p>
            <p>This area is scrollable when content exceeds the available height.</p>
          </div>
        </div>
      </ModalWindow>

      {/* Modal with Layout Content */}
      <ModalWindow
        open={contentOpen}
        onOpenChange={setContentOpen}
        title="Collection Settings"
        subtitle="Configure your collection settings and preferences"
        primaryLabel="Save Changes"
        secondaryLabel="Discard"
        width="700px"
        onPrimaryClick={() => {
          alert("Changes saved!")
          setContentOpen(false)
        }}
        onSecondaryClick={() => setContentOpen(false)}
      >
        <Layout padding="md" showSeparators={true}>
          <LayoutSection>
            <Titles
              type="section"
              title="General Information"
              subtitle="Basic collection details"
            />
            <LayoutSlot />
          </LayoutSection>
          <LayoutSection>
            <Titles
              type="section"
              title="Visibility"
              subtitle="Control who can see this collection"
            />
            <LayoutSlot />
          </LayoutSection>
          <LayoutSection>
            <Titles
              type="section"
              title="Advanced Options"
              subtitle="Additional configuration options"
            />
            <LayoutSlot />
            <LayoutSlot />
          </LayoutSection>
        </Layout>
      </ModalWindow>

      {/* Modal with Form */}
      <ModalWindow
        open={formOpen}
        onOpenChange={setFormOpen}
        title="Add Participants"
        subtitle="Add team members to this collection"
        primaryLabel="Add Participants"
        secondaryLabel="Cancel"
        width="650px"
        onPrimaryClick={() => {
          alert("Participants added!")
          setFormOpen(false)
        }}
        onSecondaryClick={() => setFormOpen(false)}
      >
        <div className="p-5 space-y-6">
          <ParticipantSetupBox
            title="Photographer"
            placeholder="Select photographer"
          />
          <ParticipantSetupBox
            title="Lab"
            placeholder="Select lab"
          />
          <ParticipantSetupBox
            title="Editor"
            placeholder="Select editor"
          />
        </div>
      </ModalWindow>

      {/* Description */}
      <div className="p-4 bg-zinc-50 rounded-lg text-sm text-zinc-600">
        <p className="font-medium mb-2">Modal Window Features:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Position:</strong> Right-aligned slide-in panel</li>
          <li><strong>Overlay:</strong> #000 at 36% opacity</li>
          <li><strong>Header:</strong> Titles (block) + Close button (fixed)</li>
          <li><strong>Content:</strong> Scrollable area for any content</li>
          <li><strong>Footer:</strong> ActionBar with Primary/Secondary buttons (fixed)</li>
          <li><strong>Animation:</strong> Slide in/out from right</li>
        </ul>
        <p className="mt-4 text-xs text-zinc-500">
          Click outside the modal or press Escape to close.
        </p>
      </div>
    </div>
  )
}
