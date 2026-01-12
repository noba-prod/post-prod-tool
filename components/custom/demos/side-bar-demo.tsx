"use client"

import * as React from "react"
import { SideBar } from "../side-bar"
import { Folder, Users, LayoutGrid } from "lucide-react"

const viewEntityItems = [
  { id: "basic", label: "Basic information", icon: Folder },
  { id: "members", label: "Team members", icon: Users },
  { id: "collections", label: "Collections", icon: LayoutGrid },
]

const createEntityItems = [
  { id: "step1", label: "Basic information" },
  { id: "step2", label: "Team members" },
]

const createCollectionItems = [
  { id: "participants", label: "Participants" },
  { id: "shooting", label: "Shooting setup" },
  { id: "dropoff", label: "Drop-off plan" },
  { id: "lowres", label: "Low-res scan" },
  { id: "selection", label: "Photo selection" },
  { id: "lr-hr", label: "LR to HR setup" },
  { id: "precheck", label: "Pre-check & Edition" },
]

/**
 * Interactive demo component for SideBar
 */
export function SideBarDemo() {
  const [viewEntityActive, setViewEntityActive] = React.useState("basic")
  const [createEntityActive, setCreateEntityActive] = React.useState("step1")
  const [createCollectionActive, setCreateCollectionActive] = React.useState("participants")

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Grid of all variants */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Default */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Type: Default</p>
          <div className="h-[500px] border border-zinc-200 rounded-xl overflow-hidden">
            <SideBar
              type="default"
              title="Contextual heading"
              entity={{
                name: "@zara",
                type: "client",
                teamMembers: 6,
                collections: 14,
                lastUpdate: "5 minutes ago",
              }}
              primaryLabel="Primary"
              secondaryLabel="Secondary"
            />
          </div>
        </div>

        {/* View Entity */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Type: View Entity</p>
          <div className="h-[500px] border border-zinc-200 rounded-xl overflow-hidden">
            <SideBar
              type="view-entity"
              title="Client details"
              items={viewEntityItems}
              activeId={viewEntityActive}
              onItemClick={setViewEntityActive}
              entity={{
                name: "@zara",
                type: "client",
                teamMembers: 6,
                collections: 14,
                lastUpdate: "5 minutes ago",
              }}
              deleteLabel="Delete [entity:type]"
            />
          </div>
        </div>

        {/* Create Entity */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Type: Create Entity</p>
          <div className="h-[500px] border border-zinc-200 rounded-xl overflow-hidden">
            <SideBar
              type="create-entity"
              title="Create new [entity:type]"
              items={createEntityItems}
              activeId={createEntityActive}
              onItemClick={setCreateEntityActive}
              deleteLabel="Delete [entity:type]"
            />
          </div>
        </div>

        {/* Create Collection */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Type: Create Collection</p>
          <div className="h-[500px] border border-zinc-200 rounded-xl overflow-hidden">
            <SideBar
              type="create-collection"
              title="Set up collection"
              items={createCollectionItems}
              activeId={createCollectionActive}
              onItemClick={setCreateCollectionActive}
              collection={{
                name: "Kids Summer'25",
                status: "draft",
                client: "Zara",
                deadline: "Dec 14, 2025",
                lastUpdate: "5 minutes ago",
              }}
              deleteLabel="Delete collection"
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="p-4 bg-zinc-50 rounded-lg text-sm text-zinc-600">
        <p className="font-medium mb-2">Variants:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Default:</strong> Custom slot + Entity summary card + Primary/Secondary buttons</li>
          <li><strong>View Entity:</strong> ContextualMenu (menu) + Entity summary card + Delete button</li>
          <li><strong>Create Entity:</strong> ContextualMenu (stepper) + Delete button</li>
          <li><strong>Create Collection:</strong> ContextualMenu (stepper) + Collection summary card + Delete button</li>
        </ul>
      </div>
    </div>
  )
}
