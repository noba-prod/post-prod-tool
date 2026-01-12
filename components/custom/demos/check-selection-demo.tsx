"use client"

import * as React from "react"
import { Check } from "../check"
import { CheckSelection } from "../check-selection"

/**
 * Interactive demo component for CheckSelection
 * Allows toggling selection state by clicking
 */
export function CheckSelectionDemo() {
  const [selectedItems, setSelectedItems] = React.useState<Record<string, boolean>>({
    item1: true,
    item2: false,
    item3: false,
  })

  const toggleItem = (id: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-sm">
      {/* Base Check Component */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Base Check Component</p>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <Check status="active" />
            <span className="text-xs text-muted-foreground">Active</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Check status="inactive" />
            <span className="text-xs text-muted-foreground">Inactive</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Check status="active" disabled />
            <span className="text-xs text-muted-foreground">Active (disabled)</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Check status="inactive" disabled />
            <span className="text-xs text-muted-foreground">Inactive (disabled)</span>
          </div>
        </div>
      </div>

      {/* Interactive Demo */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Interactive Demo (click to toggle)</p>
        <div className="flex flex-col gap-2">
          <CheckSelection 
            label="Option 1" 
            selected={selectedItems.item1} 
            status="default" 
            onClick={() => toggleItem("item1")}
          />
          <CheckSelection 
            label="Option 2" 
            selected={selectedItems.item2} 
            status="default" 
            onClick={() => toggleItem("item2")}
          />
          <CheckSelection 
            label="Option 3" 
            selected={selectedItems.item3} 
            status="default" 
            onClick={() => toggleItem("item3")}
          />
        </div>
      </div>

      {/* Static Variants Display */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">All Variants</p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <CheckSelection label="Default + Selected" selected={true} status="default" />
          </div>
          <div className="flex items-center gap-2">
            <CheckSelection label="Disabled + Selected" selected={true} status="disabled" />
          </div>
          <div className="flex items-center gap-2">
            <CheckSelection label="Default + Unselected" selected={false} status="default" />
          </div>
          <div className="flex items-center gap-2">
            <CheckSelection label="Disabled + Unselected" selected={false} status="disabled" />
          </div>
        </div>
      </div>
    </div>
  )
}
