"use client"

import * as React from "react"
import { CreationTemplate } from "@/components/custom/templates/creation-template"

export default function ClientCreationPage() {
  return (
    <CreationTemplate
      title="Create new client"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Entities", href: "/entities" },
        { label: "Create new client" },
      ]}
      sidebarItems={[
        { id: "step-1", label: "Step 1" },
        { id: "step-2", label: "Step 2" },
        { id: "step-3", label: "Step 3" },
      ]}
      activeSidebarItem="step-1"
      blocks={[]}
    />
  )
}
