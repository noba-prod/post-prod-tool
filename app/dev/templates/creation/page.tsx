"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CreationTemplate } from "@/components/custom/templates/creation-template"

export default function CreationTemplatePage() {
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
        <CreationTemplate
          breadcrumbs={[
            { label: "Players", href: "/organizations" },
            { label: "Create Entity" },
          ]}
          sidebarItems={[
            { id: "step-1", label: "Step 1" },
            { id: "step-2", label: "Step 2" },
            { id: "step-3", label: "Step 3" },
          ]}
          activeSidebarItem="step-1"
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
        <CreationTemplate
          breadcrumbs={[
            { label: "Players", href: "/organizations" },
            { label: "Create Client" },
          ]}
          sidebarItems={[
            { id: "basic-info", label: "Basic Information" },
            { id: "contact", label: "Contact Details" },
            { id: "settings", label: "Settings" },
          ]}
          activeSidebarItem="basic-info"
          blocks={[
            {
              id: "basic-info",
              title: "Basic Information",
              subtitle: "Enter the client's basic details",
              variant: "active",
              content: (
                <div className="p-4 bg-zinc-50 rounded-lg text-sm text-muted-foreground">
                  Form fields for basic information
                </div>
              ),
            },
            {
              id: "contact",
              title: "Contact Details",
              subtitle: "Add contact information",
              variant: "disabled",
            },
            {
              id: "settings",
              title: "Settings",
              subtitle: "Configure client settings",
              variant: "disabled",
            },
          ]}
        />
      )}
    </div>
  )
}
