"use client"

import * as React from "react"
import { ParticipantSetupBox } from "../participant-setup-box"

/**
 * Demo for Participant Setup Box component
 */
export function ParticipantSetupBoxDemo() {
  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl">
      {/* Empty state (no participants) */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Empty state (no participants)
        </p>
        <ParticipantSetupBox
          title="Photographer setup"
          placeholder="Select a photographer"
        />
      </div>

      {/* With pre-loaded participants */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          With participants (shows table)
        </p>
        <ParticipantSetupBox
          title="Team members"
          placeholder="Select one"
          participants={[
            { id: "1", name: "Erika Goldner", email: "erika.goldner@zara.com", phone: "+34 649 393 291", editPermission: true, collections: 0 },
            { id: "2", name: "Sophia Johnson", email: "sophia.johnson@zara.com", phone: "+34 672 271 218", editPermission: false, collections: 0 },
            { id: "3", name: "Aiden Smith", email: "kevin.brown@zara.com", phone: "555-555-5555", editPermission: true, collections: 0 },
          ]}
        />
      </div>

      {/* Instructions */}
      <div className="p-4 bg-zinc-50 rounded-lg text-sm text-zinc-600">
        <p className="font-medium mb-2">Interactive features:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Combobox:</strong> Click "Select a photographer" to open search dropdown</li>
          <li><strong>New member:</strong> Click "+ New member" to open centered modal overlay</li>
          <li><strong>Search:</strong> Type to filter entities/users (case-insensitive)</li>
          <li><strong>Select:</strong> Click on an item to select it (modal will close)</li>
          <li><strong>Table:</strong> Appears when participants are added</li>
          <li><strong>Toggle permission:</strong> Click the switch to toggle edit permission</li>
          <li><strong>Delete:</strong> Click trash icon to remove participant</li>
        </ul>
      </div>

      {/* Description */}
      <div className="p-4 bg-zinc-50 rounded-lg text-sm text-zinc-600">
        <p className="font-medium mb-2">Component structure:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Title:</strong> Uses form title styles (16px, semibold)</li>
          <li><strong>Combobox:</strong> Opens Command with search input and entity list</li>
          <li><strong>New member modal:</strong> Centered overlay with 36% black background</li>
          <li><strong>Participants table:</strong> Shows when users are selected</li>
        </ul>
      </div>
    </div>
  )
}
