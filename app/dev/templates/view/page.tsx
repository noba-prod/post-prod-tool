"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ViewTemplate } from "@/components/custom/templates/view-template"
import { Home, User, Settings } from "lucide-react"

export default function ViewTemplatePage() {
  const [view, setView] = React.useState<"basic" | "contextual">("basic")

  return (
    <div className="min-h-screen">
      {/* View Toggle */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button
          variant={view === "basic" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("basic")}
        >
          Basic
        </Button>
        <Button
          variant={view === "contextual" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("contextual")}
        >
          Contextual
        </Button>
      </div>

      {view === "basic" ? (
        <ViewTemplate
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Entities", href: "/entities" },
            { label: "View Entity" },
          ]}
          sidebarItems={[
            { id: "overview", label: "Overview", icon: Home },
            { id: "details", label: "Details", icon: User },
          ]}
          activeSidebarItem="overview"
          entity={{
            name: "Entity Name",
            type: "Client",
            teamMembers: 5,
            collections: 12,
            lastUpdate: "2 days ago",
          }}
          blocks={[
            {
              id: "block-1",
              title: "Block Title",
              subtitle: "Block subtitle",
              variant: "active",
            },
          ]}
        />
      ) : (
        <ViewTemplate
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Entities", href: "/entities" },
            { label: "@zara" },
          ]}
          sidebarItems={[
            { id: "overview", label: "Overview", icon: Home },
            { id: "team", label: "Team", icon: User },
            { id: "settings", label: "Settings", icon: Settings },
          ]}
          activeSidebarItem="overview"
          entity={{
            name: "@zara",
            type: "Client",
            teamMembers: 8,
            collections: 24,
            lastUpdate: "1 day ago",
          }}
          blocks={[
            {
              id: "overview",
              title: "Overview",
              subtitle: "Client overview and statistics",
              variant: "active",
              content: (
                <div className="p-4 bg-zinc-50 rounded-lg text-sm text-muted-foreground">
                  Overview content with statistics and key information
                </div>
              ),
            },
            {
              id: "collections",
              title: "Collections",
              subtitle: "Recent collections for this client",
              variant: "inactive",
            },
            {
              id: "activity",
              title: "Activity",
              subtitle: "Recent activity and updates",
              variant: "inactive",
            },
          ]}
        />
      )}
    </div>
  )
}
