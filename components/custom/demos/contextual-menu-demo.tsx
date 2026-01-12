"use client"

import * as React from "react"
import { ContextualMenu } from "../contextual-menu"
import { Home, User, Settings, Bell, Mail, Calendar, Folder, Star, Heart, FileText } from "lucide-react"

const menuItems = [
  { id: "1", label: "Item text", icon: Home },
  { id: "2", label: "Item text", icon: User },
  { id: "3", label: "Item text", icon: Settings },
  { id: "4", label: "Item text", icon: Bell },
  { id: "5", label: "Item text", icon: Mail },
  { id: "6", label: "Item text", icon: Calendar },
  { id: "7", label: "Item text", icon: Folder },
  { id: "8", label: "Item text", icon: Star },
  { id: "9", label: "Item text", icon: Heart },
  { id: "10", label: "Item text", icon: FileText },
]

const stepperItems = [
  { id: "step1", label: "Item text" },
  { id: "step2", label: "Item text" },
  { id: "step3", label: "Item text" },
  { id: "step4", label: "Item text" },
  { id: "step5", label: "Item text" },
  { id: "step6", label: "Item text" },
  { id: "step7", label: "Item text" },
  { id: "step8", label: "Item text" },
  { id: "step9", label: "Item text" },
  { id: "step10", label: "Item text" },
  { id: "step11", label: "Item text" },
  { id: "step12", label: "Item text" },
]

/**
 * Interactive demo component for ContextualMenu
 */
export function ContextualMenuDemo() {
  const [menuActiveId, setMenuActiveId] = React.useState("1")
  const [stepperActiveId, setStepperActiveId] = React.useState("step1")

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Side by side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Type: Menu */}
        <div className="space-y-4">
          <p className="text-xs font-medium text-muted-foreground">Type: Menu (gap-2 / 8px spacing)</p>
          <div className="p-2 bg-white border border-zinc-200 rounded-xl max-h-[500px] overflow-y-auto">
            <ContextualMenu
              type="menu"
              items={menuItems}
              activeId={menuActiveId}
              onItemClick={setMenuActiveId}
            />
          </div>
        </div>

        {/* Type: Stepper */}
        <div className="space-y-4">
          <p className="text-xs font-medium text-muted-foreground">Type: Stepper (connected with StepConnector)</p>
          <div className="p-2 bg-white border border-zinc-200 rounded-xl max-h-[500px] overflow-y-auto">
            <ContextualMenu
              type="stepper"
              items={stepperItems}
              activeId={stepperActiveId}
              onItemClick={setStepperActiveId}
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="p-4 bg-zinc-50 rounded-lg text-sm text-zinc-600">
        <p className="font-medium mb-2">Usage:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Menu:</strong> Built with MenuItem components, gap-2 (8px) spacing between items</li>
          <li><strong>Stepper:</strong> Built with ProgressItem + StepConnector, no gap between items</li>
          <li>Both variants support click interaction to change active item</li>
        </ul>
      </div>
    </div>
  )
}
