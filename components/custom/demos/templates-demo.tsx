"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"

/**
 * Demo for Page Templates
 * 
 * Shows navigation buttons to view each template in the previewer
 */
export function TemplatesDemo() {
  const router = useRouter()

  const templates = [
    {
      id: "main",
      name: "Main Template",
      description: "Template for main pages (Collections, Entities, Team). NavBar + Titles (main) + Layout.",
      routes: {
        basic: "/dev/templates/main",
        contextual: "/dev/templates/main",
      },
    },
    {
      id: "creation",
      name: "Creation Template",
      description: "Template for creation flows. NavBar + Breadcrumb + SideBar (create-entity) + Blocks with StepConnector.",
      routes: {
        basic: "/dev/templates/creation",
        contextual: "/dev/templates/creation",
      },
    },
    {
      id: "view",
      name: "View Template",
      description: "Template for view flows. NavBar + Breadcrumb + SideBar (view-entity) + Blocks with spacing.",
      routes: {
        basic: "/dev/templates/view",
        contextual: "/dev/templates/view",
      },
    },
    {
      id: "collection",
      name: "Collection Template",
      description: "Template for published collection view. NavBar + CollectionHeading (fixed) + scrollable stepper of CollectionStepper steps; each step opens a modal with contextual info.",
      routes: {
        basic: "/dev/templates/collection",
        contextual: "/dev/templates/collection",
      },
    },
  ]

  const handleNavigate = (route: string) => {
    window.open(route, "_blank")
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Click the buttons below to view each template in a new tab. Each template has two views: Basic (minimal example) and Contextual (with real data).
        </p>

        {templates.map((template) => (
          <div
            key={template.id}
            className="p-6 border border-border rounded-xl bg-background space-y-4"
          >
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {template.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {template.description}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => handleNavigate(template.routes.basic)}
                className="gap-2"
              >
                <ExternalLink className="size-4" />
                View Basic
              </Button>
              <Button
                variant="default"
                onClick={() => handleNavigate(template.routes.contextual)}
                className="gap-2"
              >
                <ExternalLink className="size-4" />
                View Contextual
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-zinc-50 rounded-lg text-sm text-zinc-600">
        <p className="font-medium mb-2">Template Structure:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Main Template:</strong> NavBar + Titles (main-section) + Layout (for Collections, Entities, Team pages)</li>
          <li><strong>Creation Template:</strong> NavBar + Breadcrumb + SideBar (create-entity) + Blocks (creation mode) with StepConnector</li>
          <li><strong>View Template:</strong> NavBar + Breadcrumb + SideBar (view-entity) + Blocks (view mode) with spacing</li>
          <li><strong>Collection Template:</strong> NavBar + CollectionHeading (fixed) + scrollable stepper of CollectionStepper steps; step click opens ModalWindow</li>
        </ul>
      </div>
    </div>
  )
}
