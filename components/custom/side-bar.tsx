"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ContextualMenu } from "./contextual-menu"
import { EntitySummaryCard } from "./entity-summary-card"
import { CollectionSummaryCard } from "./collection-summary-card"
import { Trash2, Settings, LucideIcon } from "lucide-react"

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
  /** Array of completed item ids */
  completedItems?: string[]
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
    publishingDate?: string
    lastUpdate?: string
  }
  /** Array of completed item ids (for stepper) */
  completedItems?: string[]
  /** Delete button label */
  deleteLabel?: string
  /** Call when Settings (collection config) icon is clicked */
  onSettingsCollection?: () => void
  /** Call when Publish collection / Save changes is clicked */
  onPublish?: () => void
  /** Disable Publish button until draft is complete */
  publishDisabled?: boolean
  /** Primary button label (e.g. "Publish" or "Save changes") */
  publishLabel?: string
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
      <div
        className={cn("flex flex-col h-full bg-white rounded-xl overflow-hidden", className)}
        role="navigation"
        aria-label={title}
      >
        {/* Content - scrollable area */}
        <div className="flex-1 flex flex-col gap-4 p-4 min-h-0 overflow-hidden max-[759px]:gap-2 max-[759px]:p-2">
          {/* Title — hidden below 760px (collapsed rail); nav items keep aria-label via MenuItem */}
          <div className="flex items-center h-8 px-2 opacity-70 shrink-0 max-[759px]:hidden">
            <span className="text-xs font-medium text-zinc-900">{title}</span>
          </div>

          {/* Menu - scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0 -m-0.5 p-0.5 max-[759px]:flex max-[759px]:flex-col max-[759px]:items-center">
            <ContextualMenu
              type="menu"
              items={items}
              activeId={activeId}
              onItemClick={onItemClick}
            />
          </div>
        </div>

        {/* Footer — summary hidden & delete icon-only below 760px (Figma 1246-48552) */}
        <div className="border-t border-zinc-200 p-4 flex flex-col gap-4 shrink-0 max-[759px]:items-center max-[759px]:p-2 max-[759px]:gap-2">
          <div className="hidden min-[760px]:block w-full">
            <EntitySummaryCard {...entity} />
          </div>
          <Button
            variant="secondary"
            size="lg"
            className="w-full rounded-xl gap-2 max-[759px]:w-10 max-[759px]:h-10 max-[759px]:p-0 max-[759px]:shrink-0"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" aria-hidden />
            <span className="max-[759px]:sr-only">{deleteLabel}</span>
          </Button>
        </div>
      </div>
    )
  }

  if (type === "create-entity") {
    const { items, completedItems = [], deleteLabel = "Delete [entity:type]", onDelete } = props
    return (
      <div
        className={cn("flex flex-col h-full bg-white rounded-xl overflow-hidden", className)}
        role="navigation"
        aria-label={title}
      >
        {/* Content - scrollable area */}
        <div className="flex-1 flex flex-col gap-4 p-4 min-h-0 overflow-hidden max-[759px]:gap-2 max-[759px]:p-2">
          <div className="flex items-center h-8 px-2 opacity-70 shrink-0 max-[759px]:hidden">
            <span className="text-xs font-medium text-zinc-900">{title}</span>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 -m-0.5 p-0.5 max-[759px]:flex max-[759px]:flex-col max-[759px]:items-center">
            <ContextualMenu
              type="stepper"
              items={items}
              activeId={activeId}
              completedItems={completedItems}
              onItemClick={onItemClick}
            />
          </div>
        </div>

        <div className="border-t border-zinc-200 p-4 flex flex-col gap-4 shrink-0 max-[759px]:items-center max-[759px]:p-2">
          <Button
            variant="secondary"
            size="lg"
            className="w-full rounded-xl gap-2 max-[759px]:w-10 max-[759px]:h-10 max-[759px]:p-0 max-[759px]:shrink-0"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" aria-hidden />
            <span className="max-[759px]:sr-only">{deleteLabel}</span>
          </Button>
        </div>
      </div>
    )
  }

  if (type === "create-collection") {
    const { items, collection, completedItems = [], deleteLabel = "Delete collection", onDelete, onSettingsCollection, onPublish, publishDisabled = true, publishLabel = "Publish" } = props
    return (
      <div
        className={cn("flex flex-col h-full bg-white rounded-xl overflow-hidden", className)}
        role="navigation"
        aria-label={title}
      >
        <div className="flex-1 flex flex-col gap-4 p-4 min-h-0 overflow-hidden max-[759px]:gap-2 max-[759px]:p-2">
          <div className="flex items-center h-8 px-2 opacity-70 shrink-0 max-[759px]:hidden">
            <span className="text-xs font-medium text-zinc-900">{title}</span>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 -m-0.5 p-0.5 max-[759px]:flex max-[759px]:flex-col max-[759px]:items-center">
            <ContextualMenu
              type="stepper"
              items={items}
              activeId={activeId}
              completedItems={completedItems}
              onItemClick={onItemClick}
            />
          </div>
        </div>

        {/* Footer — summary hidden below 760px; action row stays icon-heavy */}
        <div className="border-t border-zinc-200 p-4 flex flex-col gap-4 shrink-0 max-[759px]:p-2 max-[759px]:gap-2">
          <div className="hidden min-[760px]:block w-full">
            <CollectionSummaryCard {...collection} />
          </div>
          <div className="flex items-center gap-2 w-full max-[759px]:justify-center max-[759px]:flex-wrap">
            <Button
              variant="destructive"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl"
              onClick={onDelete}
              aria-label={deleteLabel}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl"
              onClick={onSettingsCollection}
              aria-label="Collection settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="default"
              size="lg"
              className="flex-1 rounded-xl min-w-0 max-[759px]:flex-initial max-[759px]:px-3 max-[759px]:text-xs"
              onClick={onPublish}
              disabled={publishDisabled}
            >
              {publishLabel}
            </Button>
          </div>
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
    <div
      className={cn("flex flex-col h-full bg-white rounded-xl overflow-hidden", className)}
      role="navigation"
      aria-label={title}
    >
      {/* Content - scrollable area */}
      <div className="flex-1 flex flex-col gap-4 p-4 min-h-0 overflow-hidden max-[759px]:gap-2 max-[759px]:p-2">
        <div className="flex items-center h-8 px-2 opacity-70 shrink-0 max-[759px]:hidden">
          <span className="text-xs font-medium text-zinc-900">{title}</span>
        </div>

        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-zinc-200 rounded-lg p-4 overflow-y-auto min-h-0">
          {children || (
            <span className="text-sm text-zinc-900 text-center max-[759px]:text-xs">
              Slot (swap it with your content)
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-zinc-200 p-4 flex flex-col gap-4 shrink-0 max-[759px]:p-2">
        {entity && (
          <div className="hidden min-[760px]:block w-full">
            <EntitySummaryCard {...entity} />
          </div>
        )}
        <div className="flex gap-3 max-[759px]:flex-col">
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
