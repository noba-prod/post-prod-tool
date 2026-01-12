"use client"

import * as React from "react"
import { CreationTemplate } from "@/components/custom/templates/creation-template"

export default function CollectionCreationPage() {
  return (
    <CreationTemplate
      title="Create new collection"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Collections", href: "/collections" },
        { label: "Create new collection" },
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
