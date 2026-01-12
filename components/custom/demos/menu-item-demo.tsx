"use client"

import * as React from "react"
import { MenuItem } from "../menu-item"
import { Circle, Home, Settings, User, Bell, Mail, Calendar, Folder, Star, Heart } from "lucide-react"

/**
 * Interactive demo component for MenuItem
 */
export function MenuItemDemo() {
  const [activeItem, setActiveItem] = React.useState<string>("home")

  return (
    <div className="flex flex-col gap-8 w-full max-w-sm">
      {/* All Variants */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">All States</p>
        <div className="flex flex-col gap-1">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Active (bg-zinc-100)</p>
            <MenuItem label="Item text" status="active" icon={Circle} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Default (no background)</p>
            <MenuItem label="Item text" status="default" icon={Circle} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Disabled (gray text/icon)</p>
            <MenuItem label="Item text" status="disabled" icon={Circle} />
          </div>
        </div>
      </div>

      {/* Interactive Menu */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">Interactive Menu (click to select)</p>
        <div className="flex flex-col gap-0.5 p-2 bg-white border border-zinc-200 rounded-xl">
          <MenuItem 
            label="Home" 
            icon={Home}
            status={activeItem === "home" ? "active" : "default"} 
            onClick={() => setActiveItem("home")}
          />
          <MenuItem 
            label="Profile" 
            icon={User}
            status={activeItem === "profile" ? "active" : "default"} 
            onClick={() => setActiveItem("profile")}
          />
          <MenuItem 
            label="Settings" 
            icon={Settings}
            status={activeItem === "settings" ? "active" : "default"} 
            onClick={() => setActiveItem("settings")}
          />
          <MenuItem 
            label="Notifications" 
            icon={Bell}
            status="disabled"
          />
        </div>
      </div>

      {/* With Different Icons */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">With Different Lucide Icons</p>
        <div className="flex flex-col gap-0.5">
          <MenuItem label="Messages" icon={Mail} status="default" />
          <MenuItem label="Calendar" icon={Calendar} status="default" />
          <MenuItem label="Documents" icon={Folder} status="default" />
          <MenuItem label="Favorites" icon={Star} status="default" />
          <MenuItem label="Liked" icon={Heart} status="default" />
        </div>
      </div>
    </div>
  )
}
