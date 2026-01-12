"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ContextualMenu } from "./contextual-menu"
import { EntitySummaryCard } from "./entity-summary-card"
import { CollectionSummaryCard } from "./collection-summary-card"
import { Trash2, LucideIcon } from "lucide-react"

interface SideBarMenuItem {
  id: string
  label: string
  icon?: LucideIcon
}

interface SideBarBaseProps {
  /** Title shown at the top of the sidebar */
  title?: string
  /** Currently active menu item id */
  activeId?: string
  /** Callback when a menu item is clicked */
  onItemClick?: (id: string) => void
  /** Callback when primary action button is clicked */
  onPrimaryAction?: () => void
  /** Callback when secondary action button is clicked */
  onSecondaryAction?: () => void
  /** Callback when delete button is clicked */
  onDelete?: () => void
  className?: string
}

interface SideBarDefaultProps extends SideBarBaseProps {
  type: "default"
  /** Custom slot content */
  children?: React.ReactNode
  /** Entity data for summary card */
  entity?: {
    name: string
    type?: string
    teamMembers?: number
    collections?: number
    lastUpdate?: string
  }
  /** Primary button label */
  primaryLabel?: string
  /** Secondary button label */
  secondaryLabel?: string
}

interface SideBarViewEntityProps extends SideBarBaseProps {
  type: "view-entity"
  /** Menu items with icons */
  items: SideBarMenuItem[]
  /** Entity data for summary card */
  entity: {
    name: string
    type?: string
    teamMembers?: number
    collections?: number
    lastUpdate?: string
  }
  /** Delete button label */
  deleteLabel?: string
}

interface SideBarCreateEntityProps extends SideBarBaseProps {
  type: "create-entity"
  /** Stepper items (no icons) */
  items: SideBarMenuItem[]
  /** Delete button label */
  deleteLabel?: string
}

interface SideBarCreateCollectionProps extends SideBarBaseProps {
  type: "create-collection"
  /** Stepper items (no icons) */
  items: SideBarMenuItem[]
  /** Collection data for summary card */
  collection: {
    name: string
    status?: "draft" | "upcoming" | "in-progress" | "completed" | "canceled"
    client?: string
    deadline?: string
    lastUpdate?: string
  }
  /** Delete button label */
  deleteLabel?: string
}

type SideBarProps =
  | SideBarDefaultProps
  | SideBarViewEntityProps
  | SideBarCreateEntityProps
  | SideBarCreateCollectionProps

/**
 * Side Bar component with four variants:
 * - default: Custom slot content + entity summary card + Primary/Secondary buttons
 * - view-entity: ContextualMenu (menu type) + entity summary card + Delete button
 * - create-entity: ContextualMenu (stepper type) + Delete button
 * - create-collection: ContextualMenu (stepper type) + collection summary card + Delete button
 */
export function SideBar(props: SideBarProps) {
  const { type, title, activeId, onItemClick, className } = props

  if (type === "view-entity") {
    const { items, entity, deleteLabel = "Delete [entity:type]", onDelete } = props
    return (
      <div className={cn("flex flex-col h-full bg-white rounded-xl overflow-hidden", className)}>
        {/* Content - scrollable area */}
        <div className="flex-1 flex flex-col gap-4 p-4 min-h-0 overflow-hidden">
          {/* Title - fixed */}
          <div className="flex items-center h-8 px-2 opacity-70 shrink-0">
            <span className="text-xs font-medium text-zinc-900">{title}</span>
          </div>

          {/* Menu - scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0 -m-0.5 p-0.5">
            <ContextualMenu
              type="menu"
              items={items}
              activeId={activeId}
              onItemClick={onItemClick}
            />
          </div>
        </div>

        {/* Footer - always visible */}
        <div className="border-t border-zinc-200 p-4 flex flex-col gap-4 shrink-0">
          <EntitySummaryCard {...entity} />
          <Button
            variant="secondary"
            size="lg"
            className="w-full rounded-xl gap-2"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
            {deleteLabel}
          </Button>
        </div>
      </div>
    )
  }

  if (type === "create-entity") {
    const { items, deleteLabel = "Delete [entity:type]", onDelete } = props
    return (
      <div className={cn("flex flex-col h-full bg-white rounded-xl overflow-hidden", className)}>
        {/* Content - scrollable area */}
        <div className="flex-1 flex flex-col gap-4 p-4 min-h-0 overflow-hidden">
          {/* Title - fixed */}
          <div className="flex items-center h-8 px-2 opacity-70 shrink-0">
            <span className="text-xs font-medium text-zinc-900">{title}</span>
          </div>

          {/* Stepper - scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0 -m-0.5 p-0.5">
            <ContextualMenu
              type="stepper"
              items={items}
              activeId={activeId}
              onItemClick={onItemClick}
            />
          </div>
        </div>

        {/* Footer - always visible */}
        <div className="border-t border-zinc-200 p-4 flex flex-col gap-4 shrink-0">
          <Button
            variant="secondary"
            size="lg"
            className="w-full rounded-xl gap-2"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
            {deleteLabel}
          </Button>
        </div>
      </div>
    )
  }

  if (type === "create-collection") {
    const { items, collection, deleteLabel = "Delete collection", onDelete } = props
    return (
      <div className={cn("flex flex-col h-full bg-white rounded-xl overflow-hidden", className)}>
        {/* Content - scrollable area */}
        <div className="flex-1 flex flex-col gap-4 p-4 min-h-0 overflow-hidden">
          {/* Title - fixed */}
          <div className="flex items-center h-8 px-2 opacity-70 shrink-0">
            <span className="text-xs font-medium text-zinc-900">{title}</span>
          </div>

          {/* Stepper - scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0 -m-0.5 p-0.5">
            <ContextualMenu
              type="stepper"
              items={items}
              activeId={activeId}
              onItemClick={onItemClick}
            />
          </div>
        </div>

        {/* Footer - always visible */}
        <div className="border-t border-zinc-200 p-4 flex flex-col gap-4 shrink-0">
          <CollectionSummaryCard {...collection} />
          <Button
            variant="secondary"
            size="lg"
            className="w-full rounded-xl gap-2"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
            {deleteLabel}
          </Button>
        </div>
      </div>
    )
  }

  // type === "default"
  const {
    children,
    entity,
    primaryLabel = "Primary",
    secondaryLabel = "Secondary",
    onPrimaryAction,
    onSecondaryAction,
  } = props as SideBarDefaultProps

  return (
    <div className={cn("flex flex-col h-full bg-white rounded-xl overflow-hidden", className)}>
      {/* Content - scrollable area */}
      <div className="flex-1 flex flex-col gap-4 p-4 min-h-0 overflow-hidden">
        {/* Title - fixed */}
        <div className="flex items-center h-8 px-2 opacity-70 shrink-0">
          <span className="text-xs font-medium text-zinc-900">{title}</span>
        </div>

        {/* Slot - scrollable */}
        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-zinc-200 rounded-lg p-4 overflow-y-auto min-h-0">
          {children || (
            <span className="text-sm text-zinc-900 text-center">
              Slot (swap it with your content)
            </span>
          )}
        </div>
      </div>

      {/* Footer - always visible */}
      <div className="border-t border-zinc-200 p-4 flex flex-col gap-4 shrink-0">
        {entity && <EntitySummaryCard {...entity} />}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="lg"
            className="flex-1 rounded-xl"
            onClick={onSecondaryAction}
          >
            {secondaryLabel}
          </Button>
          <Button
            size="lg"
            className="flex-1 rounded-xl"
            onClick={onPrimaryAction}
          >
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
