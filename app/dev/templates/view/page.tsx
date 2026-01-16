"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { 
  ViewTemplate, 
  useViewSections,
  DEFAULT_SECTIONS,
} from "@/components/custom/templates/view-template"
import type { EntityType, Entity, User, StandardEntityType } from "@/lib/types"
import type { ViewCollectionData } from "@/components/custom/templates/view-template"
import { EntityBasicInformationForm } from "@/components/custom/entity-basic-information-form"
import { SelfPhotographerForm } from "@/components/custom/self-photographer-form"
import { mapEntityToFormData, mapSelfPhotographerToFormData } from "@/lib/utils/form-mappers"
import { entityRequiresLocation } from "@/lib/types"

export default function ViewTemplatePage() {
  const [entityType, setEntityType] = React.useState<EntityType>("client")

  // Demo collections data
  const demoCollections: ViewCollectionData[] = React.useMemo(() => [
    {
      id: "1",
      name: "Summer 2025",
      status: "in-progress",
      clientName: "Zara",
      location: "Madrid, Spain",
      startDate: "jun 1, 2025",
      endDate: "jun 15, 2025",
      participants: 8,
      createdAt: new Date("2025-01-05"),
    },
    {
      id: "2",
      name: "Fall Collection",
      status: "draft",
      clientName: "Zara",
      location: "Barcelona, Spain",
      startDate: "sep 1, 2025",
      endDate: "sep 20, 2025",
      participants: 5,
      createdAt: new Date("2025-01-04"),
    },
    {
      id: "3",
      name: "Winter Lookbook",
      status: "completed",
      clientName: "Zara",
      location: "Paris, France",
      startDate: "dec 1, 2024",
      endDate: "dec 10, 2024",
      participants: 12,
      createdAt: new Date("2025-01-03"),
    },
  ], [])

  // Demo team members data
  const demoTeamMembers: User[] = React.useMemo(() => [
    {
      id: "1",
      firstName: "Erika",
      lastName: "Goldner",
      email: "erika.goldner@zara.com",
      phoneNumber: "+34 649 393 291",
      entityId: "demo-entity-id",
      role: "admin",
    },
    {
      id: "2",
      firstName: "Sophia",
      lastName: "Johnson",
      email: "sophia.johnson@zara.com",
      phoneNumber: "+34 672 271 218",
      entityId: "demo-entity-id",
      role: "editor",
    },
    {
      id: "3",
      firstName: "Kevin",
      lastName: "Brown",
      email: "kevin.brown@zara.com",
      phoneNumber: "+34 555 555 555",
      entityId: "demo-entity-id",
      role: "viewer",
    },
  ], [])

  // Permission (for form disabled state)
  const permission = "admin" // Can be changed to "viewer" to test disabled state
  const canEdit = permission === "admin" || permission === "editor"

  // Entity display name based on type (computed early for use in fullEntity)
  const entityDisplayName = React.useMemo(() => 
    entityType === "self-photographer" ? "Tom Haser" : "Zara",
    [entityType]
  )

  const entityDisplayType = React.useMemo(() => ({
    "client": "Client",
    "agency": "Agency",
    "photo-lab": "Photo Lab",
    "edition-studio": "Edition Studio",
    "hand-print-lab": "Hand Print Lab",
    "self-photographer": "Photographer",
  }[entityType]), [entityType])

  // Create admin user for self-photographer or get first admin from team members
  // Declared BEFORE fullEntity since it's used in basicFormInitialData
  const demoAdminUser: User | null = React.useMemo(() => {
    if (entityType === "self-photographer") {
      // For self-photographer, create the admin user (the photographer themselves)
      return {
        id: "demo-admin-user-id",
        firstName: "Tom",
        lastName: "Haser",
        email: "tom.haser@example.com",
        phoneNumber: "+34 649 393 291",
        entityId: "demo-entity-id",
        role: "admin",
        notes: "Demo admin user",
      }
    } else {
      // For other entities, use the first admin from team members (if any)
      const admin = demoTeamMembers.find(member => member.role === "admin")
      return admin || null
    }
  }, [entityType, demoTeamMembers])

  // Create full Entity object for form hydration
  // Declared BEFORE basicFormInitialData since it's used there
  const fullEntity: Entity | null = React.useMemo(() => {
    try {
      return {
        id: "demo-entity-id",
        type: entityType,
        name: entityDisplayName,
        email: entityType === "self-photographer" ? "tom.haser@example.com" : "contact@zara.com",
        phoneNumber: "+34 649 393 291",
        notes: "Demo entity for testing",
        ...(entityType !== "client" && entityType !== "self-photographer" ? {
          location: {
            streetAddress: "Calle Gran Vía 123",
            zipCode: "28013",
            city: "Madrid",
            country: "Spain",
          }
        } : {}),
      }
    } catch {
      return null
    }
  }, [entityType, entityDisplayName])

  // Prepare form initial data based on entity type
  const basicFormInitialData = React.useMemo(() => {
    if (!fullEntity) return undefined
    
    if (entityType === "self-photographer") {
      // For self-photographer, use SelfPhotographerFormData
      if (!demoAdminUser) return undefined
      try {
        return mapSelfPhotographerToFormData(fullEntity, demoAdminUser)
      } catch {
        return undefined
      }
    } else {
      // For standard entities, use EntityBasicInformationFormData
      try {
        return mapEntityToFormData(fullEntity)
      } catch {
        return undefined
      }
    }
  }, [entityType, fullEntity, demoAdminUser])

  // Build basic section content based on entity type
  const basicSectionContent = React.useMemo(() => {
    // Guard: if no entity data, show empty state
    if (!fullEntity) {
      return (
        <div className="w-full py-12 text-center text-muted-foreground">
          No entity data available
        </div>
      )
    }

    if (entityType === "self-photographer") {
      // Guard: self-photographer needs admin user
      if (!demoAdminUser) {
        return (
          <div className="w-full py-12 text-center text-muted-foreground">
            Admin user data not available
          </div>
        )
      }
      
      return (
        <SelfPhotographerForm
          initialData={basicFormInitialData}
          disabled={!canEdit}
          onDataChange={(data) => {
            console.log("Form data changed:", data)
          }}
          onValidationChange={(isValid) => {
            console.log("Form valid:", isValid)
          }}
        />
      )
    } else {
      const entityTypeForForm = entityType as StandardEntityType
      return (
        <EntityBasicInformationForm
          entityType={entityTypeForForm}
          initialData={basicFormInitialData}
          showLocation={entityRequiresLocation(entityTypeForForm)}
          disabled={!canEdit}
          onDataChange={(data) => {
            console.log("Form data changed:", data)
          }}
          onValidationChange={(isValid) => {
            console.log("Form valid:", isValid)
          }}
        />
      )
    }
  }, [entityType, basicFormInitialData, canEdit, fullEntity, demoAdminUser])

  // Use the hook to create sections with content
  // Now we provide content for basic section based on entity type
  const sections = useViewSections({
    basic: basicSectionContent,
    // team: undefined, // Will auto-render FilterBar + Tables if no content
    // collections: undefined, // Will auto-render FilterBar + Grid/Table if no content
  }, {
    basic: {
      onPrimaryClick: () => console.log("Save basic info"),
      showPrimaryAction: true,
    },
  })

  return (
    <div className="min-h-screen">
      {/* Entity Type Toggle */}
      <div className="fixed top-4 right-4 z-50 flex flex-wrap gap-2 bg-white p-2 rounded-lg shadow-md max-w-[400px]">
        <span className="text-xs text-muted-foreground w-full mb-1">Entity Type:</span>
        {(["client", "agency", "photo-lab", "self-photographer"] as EntityType[]).map((type) => (
          <Button
            key={type}
            variant={entityType === type ? "default" : "outline"}
            size="sm"
            onClick={() => setEntityType(type)}
          >
            {type === "self-photographer" ? "Self-Photo" : type.charAt(0).toUpperCase() + type.slice(1).replace("-", " ")}
          </Button>
        ))}
      </div>

      <ViewTemplate
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Entities", href: "/entities" },
          { label: entityDisplayName },
        ]}
        sections={sections}
        entity={{
          name: entityDisplayName,
          type: entityDisplayType,
          rawType: entityType, // Important: pass the domain EntityType
          teamMembers: entityType === "self-photographer" ? 1 : demoTeamMembers.length,
          collections: 24,
          lastUpdate: "5 minutes ago",
          entity: fullEntity ?? undefined, // Pass full entity for form hydration (null -> undefined)
          teamMembersList: entityType === "self-photographer" ? undefined : demoTeamMembers, // Pass team members for table
          collectionsList: demoCollections, // Pass collections for grid/table
          adminUser: demoAdminUser, // Pass admin user for self-photographer form hydration
        }}
        permission="admin"
        defaultActiveSection="basic"
        onSectionChange={(sectionId) => console.log("Section changed:", sectionId)}
        onDelete={() => console.log("Delete clicked")}
      />
    </div>
  )
}
