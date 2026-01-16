"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { MenuItem } from "./menu-item"
import { ProgressItem } from "./progress-item"
import { StepConnector } from "./step-connector"
import { LucideIcon, Circle } from "lucide-react"

interface ContextualMenuItemData {
  /** Unique identifier for the item */
  id: string
  /** Label text for the item */
  label: string
  /** Custom icon (only for menu type) */
  icon?: LucideIcon
}

interface ContextualMenuBaseProps {
  /** Array of items to display */
  items: ContextualMenuItemData[]
  /** Currently active item id */
  activeId?: string
  /** Array of completed item ids (for stepper type) */
  completedItems?: string[]
  /** Callback when an item is clicked */
  onItemClick?: (id: string) => void
  className?: string
}

interface ContextualMenuMenuProps extends ContextualMenuBaseProps {
  /** Type of contextual menu */
  type: "menu"
}

interface ContextualMenuStepperProps extends ContextualMenuBaseProps {
  /** Type of contextual menu */
  type: "stepper"
}

type ContextualMenuProps = ContextualMenuMenuProps | ContextualMenuStepperProps

/**
 * Contextual Menu component with two variants:
 * - menu: List of MenuItems with gap-2 (8px) spacing
 * - stepper: List of ProgressItems connected with StepConnector (no spacing)
 */
export function ContextualMenu({
  type,
  items,
  activeId,
  completedItems = [],
  onItemClick,
  className,
}: ContextualMenuProps) {
  if (type === "stepper") {
    return (
      <div className={cn("flex flex-col", className)}>
        {items.map((item, index) => {
          const isActive = item.id === activeId
          const isCompleted = completedItems.includes(item.id)
          const isLast = index === items.length - 1
          const nextItem = items[index + 1]
          const isNextCompleted = nextItem ? completedItems.includes(nextItem.id) : false
          
          // Determine status: completed > active > disabled
          let status: "active" | "disabled" | "completed" = "disabled"
          if (isCompleted) {
            status = "completed"
          } else if (isActive) {
            status = "active"
          }
          
          return (
            <React.Fragment key={item.id}>
              <ProgressItem
                label={item.label}
                status={status}
                onClick={() => onItemClick?.(item.id)}
              />
              {!isLast && (
                <div className="flex justify-start pl-5 py-0">
                  <StepConnector 
                    status={isCompleted || isNextCompleted ? "completed" : "uncompleted"} 
                    orientation="vertical"
                    className="h-5"
                  />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    )
  }

  // type === "menu"
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {items.map((item) => {
        const isActive = item.id === activeId
        
        return (
          <MenuItem
            key={item.id}
            label={item.label}
            icon={item.icon || Circle}
            status={isActive ? "active" : "default"}
            onClick={() => onItemClick?.(item.id)}
          />
        )
      })}
    </div>
  )
}
