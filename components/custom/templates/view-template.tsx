"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { NavBar } from "../nav-bar"
import { SideBar } from "../side-bar"
import { BlockTemplate } from "../block"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Folders, Users, LayoutGrid, LucideIcon } from "lucide-react"
import type { EntityType, Entity, StandardEntityType, User } from "@/lib/types"
import { roleToLabel } from "@/lib/types"
import { Layout, LayoutSection } from "../layout"
import { FilterBar } from "../filter-bar"
import { Tables } from "../tables"
import { Grid as CollectionsGrid } from "../grid"
import type { CollectionCardProps } from "../collection-card"
import type { Collection } from "../tables"

// =============================================================================
// SECTION CONFIGURATION
// =============================================================================

/**
 * Section definition for the ViewTemplate.
 * Each section maps 1:1 with a sidebar menu item and a content block.
 */
export interface ViewSection {
  /** Unique section identifier */
  id: string
  /** Display label for sidebar and block title */
  label: string
  /** Optional subtitle for the block */
  subtitle?: string
  /** Icon for the sidebar menu item */
  icon: LucideIcon
  /** Content to render inside the block */
  content?: React.ReactNode
  /** Primary button label (shown only when section is active) */
  primaryLabel?: string
  /** Primary button click handler */
  onPrimaryClick?: () => void
  /** Whether primary button is disabled */
  primaryDisabled?: boolean
  /** Whether to show the primary action button */
  showPrimaryAction?: boolean
}

/**
 * Default sections available for entities.
 * This is the base configuration that can be filtered per entity type.
 */
export const DEFAULT_SECTIONS: Omit<ViewSection, "content">[] = [
  {
    id: "basic",
    label: "Basic information",
    subtitle: "View and edit entity details",
    icon: Folders,
  },
  {
    id: "team",
    label: "Team members",
    subtitle: "Manage team members for this entity",
    icon: Users,
  },
  {
    id: "collections",
    label: "Collections",
    subtitle: "View collections associated with this entity",
    icon: LayoutGrid,
  },
]

/**
 * Sections that should be excluded for specific entity types.
 * Self-photographer entities should NOT have Team members section.
 */
const EXCLUDED_SECTIONS_BY_TYPE: Partial<Record<EntityType, string[]>> = {
  "self-photographer": ["team"],
}

/**
 * Normalizes a display type string to a domain EntityType.
 * E.g., "Client" -> "client", "Self-Photographer" -> "self-photographer"
 * Returns undefined if the type is not recognized.
 */
function normalizeEntityType(type?: string): EntityType | undefined {
  if (!type) return undefined
  
  // Normalize: lowercase and replace spaces with hyphens
  const normalized = type.toLowerCase().replace(/\s+/g, "-")
  
  // Check if it's a valid EntityType
  const validTypes: EntityType[] = [
    "client",
    "agency",
    "photo-lab",
    "edition-studio",
    "hand-print-lab",
    "self-photographer",
  ]
  
  return validTypes.includes(normalized as EntityType) 
    ? (normalized as EntityType) 
    : undefined
}

/**
 * Filters sections based on entity type.
 * For self-photographer, excludes Team members section.
 * 
 * @param sections - Array of sections to filter (can be empty or undefined)
 * @param entityType - Optional entity type for filtering rules
 * @returns Filtered array (always returns an array, never undefined)
 */
export function filterSectionsForEntityType(
  sections: ViewSection[] | undefined | null,
  entityType?: EntityType
): ViewSection[] {
  // Always return an array
  if (!sections || !Array.isArray(sections)) return []
  if (!entityType) return sections
  
  const excludedIds = EXCLUDED_SECTIONS_BY_TYPE[entityType] || []
  return sections.filter((section) => !excludedIds.includes(section.id))
}

/**
 * Safely gets the first section ID from an array.
 */
function getFirstSectionId(sections: ViewSection[]): string {
  return sections.length > 0 ? sections[0].id : ""
}

/**
 * Checks if a section ID exists in the sections array.
 */
function sectionExists(sections: ViewSection[], sectionId: string): boolean {
  return sections.some((s) => s.id === sectionId)
}

// =============================================================================
// TYPES
// =============================================================================

/**
 * User permission level for the view.
 * Determines what actions are available.
 */
export type ViewPermission = "admin" | "editor" | "viewer"

/**
 * Collection data structure for ViewTemplate.
 */
export interface ViewCollectionData {
  id: string
  name: string
  status: "draft" | "upcoming" | "in-progress" | "completed" | "canceled"
  clientName: string
  location: string
  startDate: string
  endDate: string
  participants: number
  createdAt?: Date
}

/**
 * Entity data for the sidebar summary card and form.
 * Can represent either summary data (for sidebar) or full entity data (for form).
 */
export interface ViewEntityData {
  name: string
  type?: string
  /** Raw entity type for filtering logic (preferred) */
  rawType?: EntityType
  teamMembers?: number
  collections?: number
  lastUpdate?: string
  /** Full entity data (optional, used for form hydration) */
  entity?: Entity
  /** Full team members list (optional, used for team members table) */
  teamMembersList?: User[]
  /** Full collections list (optional, used for collections grid/table) */
  collectionsList?: ViewCollectionData[]
  /** Admin user for self-photographer (optional, used for form hydration) */
  adminUser?: User | null
}

/**
 * NavBar configuration props.
 */
interface NavBarConfig {
  variant?: "noba" | "collaborator" | "photographer"
  userName?: string
  organization?: string
  role?: string
  isAdmin?: boolean
}

/**
 * Props for the ViewTemplate component.
 */
export interface ViewTemplateProps {
  /** Breadcrumb items */
  breadcrumbs?: Array<{ label: string; href?: string }>
  /** Section configurations */
  sections: ViewSection[]
  /** Entity data for sidebar summary card */
  entity: ViewEntityData
  /** Current active section (controlled) */
  activeSection?: string
  /** Default active section (uncontrolled) */
  defaultActiveSection?: string
  /** Callback when active section changes */
  onSectionChange?: (sectionId: string) => void
  /** User permission level */
  permission?: ViewPermission
  /** Callback when delete is clicked */
  onDelete?: () => void
  /** NavBar props */
  navBarProps?: NavBarConfig
  /** Additional className */
  className?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * View Template
 * 
 * Template for viewing entity details with config-driven sections.
 * 
 * ## Features
 * - Config-driven sections (filtered by entity type)
 * - Sidebar ↔ Blocks synchronization
 * - Scroll-to-section on sidebar click
 * - Expand/collapse blocks with state sync
 * - Permission-aware actions
 * 
 * ## Layout Structure
 * - NavBar (persistent)
 * - Breadcrumb
 * - Left sidebar:
 *   - Entity summary card
 *   - Navigation menu (sections)
 * - Main content:
 *   - Collapsible VIEW blocks
 * 
 * ## Entity Type Behavior
 * - Self-photographer: Excludes "Team members" section
 * - All others: Show all sections
 */
export function ViewTemplate({
  breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Entities", href: "/entities" },
    { label: "View Entity" },
  ],
  sections,
  entity,
  activeSection: controlledActiveSection,
  defaultActiveSection,
  onSectionChange,
  permission = "viewer",
  onDelete,
  navBarProps,
  className,
}: ViewTemplateProps) {
  const router = useRouter()

  // ==========================================================================
  // DERIVE ENTITY TYPE FOR FILTERING
  // ==========================================================================
  
  // Prefer rawType if provided, otherwise try to normalize the display type
  const effectiveEntityType = React.useMemo(() => {
    if (entity.rawType) return entity.rawType
    return normalizeEntityType(entity.type)
  }, [entity.rawType, entity.type])

  // ==========================================================================
  // FILTER SECTIONS BASED ON ENTITY TYPE
  // ==========================================================================
  
  const filteredSections = React.useMemo(() => {
    return filterSectionsForEntityType(sections, effectiveEntityType)
  }, [sections, effectiveEntityType])

  // ==========================================================================
  // STATE: Active section (single source of truth)
  // ==========================================================================
  
  // Compute safe initial value
  const computeInitialSection = React.useCallback(() => {
    // If defaultActiveSection is provided and exists in filteredSections, use it
    if (defaultActiveSection && sectionExists(filteredSections, defaultActiveSection)) {
      return defaultActiveSection
    }
    // Otherwise, use the first section (or empty string if no sections)
    return getFirstSectionId(filteredSections)
  }, [defaultActiveSection, filteredSections])

  const [internalActiveSection, setInternalActiveSection] = React.useState<string>(
    computeInitialSection
  )

  // Controlled vs uncontrolled
  const activeSection = controlledActiveSection ?? internalActiveSection
  const isControlled = controlledActiveSection !== undefined

  // ==========================================================================
  // EFFECT: Keep active section in sync with filteredSections
  // ==========================================================================
  
  React.useEffect(() => {
    // If current activeSection is not in filteredSections, switch to first available
    if (!isControlled && activeSection && !sectionExists(filteredSections, activeSection)) {
      const newSection = getFirstSectionId(filteredSections)
      setInternalActiveSection(newSection)
      onSectionChange?.(newSection)
    }
  }, [filteredSections, activeSection, isControlled, onSectionChange])

  // ==========================================================================
  // REFS: Block elements for scrolling
  // ==========================================================================
  
  const blockRefs = React.useRef<Map<string, HTMLDivElement>>(new Map())
  const mainContentRef = React.useRef<HTMLElement>(null)

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  /**
   * Handle section change from sidebar or block interaction.
   */
  const handleSectionChange = React.useCallback((sectionId: string) => {
    // Only allow switching to existing sections
    if (!sectionExists(filteredSections, sectionId)) return

    if (!isControlled) {
      setInternalActiveSection(sectionId)
    }
    onSectionChange?.(sectionId)

    // Scroll to the block
    const blockElement = blockRefs.current.get(sectionId)
    if (blockElement && mainContentRef.current) {
      blockElement.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [isControlled, onSectionChange, filteredSections])

  /**
   * Handle block expand (from collapsed state).
   */
  const handleBlockExpand = React.useCallback((sectionId: string) => {
    handleSectionChange(sectionId)
  }, [handleSectionChange])

  /**
   * Handle block collapse.
   * When collapsing the active section, move to the next available section.
   */
  const handleBlockCollapse = React.useCallback((sectionId: string) => {
    if (sectionId === activeSection && filteredSections.length > 1) {
      const currentIndex = filteredSections.findIndex(s => s.id === sectionId)
      const nextSection = filteredSections[currentIndex + 1] || filteredSections[currentIndex - 1]
      if (nextSection) {
        handleSectionChange(nextSection.id)
      }
    }
  }, [activeSection, filteredSections, handleSectionChange])

  /**
   * Register block ref for scrolling.
   */
  const registerBlockRef = React.useCallback((sectionId: string, element: HTMLDivElement | null) => {
    if (element) {
      blockRefs.current.set(sectionId, element)
    } else {
      blockRefs.current.delete(sectionId)
    }
  }, [])

  // ==========================================================================
  // DERIVED STATE
  // ==========================================================================

  // Convert sections to sidebar menu items
  const sidebarItems = React.useMemo(() => {
    return filteredSections.map((section) => ({
      id: section.id,
      label: section.label,
      icon: section.icon,
    }))
  }, [filteredSections])

  // Determine if actions should be enabled based on permission
  const canEdit = permission === "admin" || permission === "editor"

  // ==========================================================================
  // STATE: Collections view (Gallery/List)
  // ==========================================================================
  
  const [collectionsView, setCollectionsView] = React.useState<string>("Gallery")

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className={cn("flex flex-col h-screen w-full bg-background overflow-hidden", className)}>
      {/* NavBar */}
      <NavBar
        variant={navBarProps?.variant || "noba"}
        userName={navBarProps?.userName || "Martin Becerra"}
        organization={navBarProps?.organization}
        role={navBarProps?.role || "admin"}
        isAdmin={navBarProps?.isAdmin || false}
      />

      {/* Content Container with background pattern */}
      <div className="flex-1 flex flex-col bg-sidebar relative min-h-0 overflow-hidden">
        {/* Background pattern overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #000000 1.5px, transparent 1.5px)",
            backgroundSize: "25px 25px",
            opacity: 0.1,
          }}
        />
        
        {/* Breadcrumb */}
        <div className="px-6 py-8 relative z-10 shrink-0">
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  <BreadcrumbItem>
                    {crumb.href && index < breadcrumbs.length - 1 ? (
                      <BreadcrumbLink
                        href={crumb.href}
                        onClick={(e) => {
                          e.preventDefault()
                          router.push(crumb.href!)
                        }}
                      >
                        {crumb.label}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Main Layout: Sidebar + Content */}
        <div className="flex-1 flex overflow-visible relative min-h-0">
          {/* Sidebar Container with padding */}
          <aside className="w-[320px] shrink-0 px-4 pb-4 relative z-10 flex flex-col min-h-0">
            <div className="h-full max-h-full rounded-xl overflow-hidden flex flex-col">
              <SideBar
                type="view-entity"
                title={entity.type ? `${entity.type} details` : "Entity details"}
                items={sidebarItems}
                activeId={activeSection}
                onItemClick={handleSectionChange}
                entity={{
                  name: entity.name,
                  type: entity.type,
                  teamMembers: entity.teamMembers,
                  collections: entity.collections,
                  lastUpdate: entity.lastUpdate,
                }}
                deleteLabel="Delete Entity"
                onDelete={onDelete}
              />
            </div>
          </aside>

          {/* Content */}
          <main 
            ref={mainContentRef}
            className="flex-1 overflow-y-auto relative z-10 min-w-0"
          >
            <div className="px-6 space-y-4 pb-[45px]">
              {filteredSections.length > 0 ? (
                filteredSections.map((section) => {
                  const isActive = section.id === activeSection
                  const showPrimaryButton = 
                    section.showPrimaryAction !== false && 
                    canEdit && 
                    isActive && 
                    section.onPrimaryClick

                  // Use content from section prop (no auto-rendering of entity-specific forms)
                  let sectionContent = section.content
                  
                  // Auto-render FilterBar + Tables for "team" section (only if no content provided)
                  if (section.id === "team" && !sectionContent) {
                    const teamMembersData = entity.teamMembersList?.map((member) => ({
                      id: member.id,
                      name: `${member.firstName}${member.lastName ? ` ${member.lastName}` : ""}`.trim(),
                      email: member.email,
                      phone: member.phoneNumber,
                      role: roleToLabel(member.role) as "Admin" | "Editor" | "Viewer",
                      collections: 0,
                    })) || []
                    
                    sectionContent = (
                      <Layout padding="none" showSeparators={false}>
                        {/* First row: Filter Bar */}
                        <LayoutSection>
                          <FilterBar
                            variant="members"
                            searchPlaceholder="Search members..."
                            onActionClick={() => {
                              // Optional: handle "New member" click
                              console.log("Add new member clicked")
                            }}
                            actionDisabled={!canEdit}
                          />
                        </LayoutSection>

                        {/* Second row: Team Members Table */}
                        <LayoutSection>
                          {teamMembersData.length > 0 ? (
                            <Tables
                              variant="team-members"
                              teamMembersData={teamMembersData}
                              onDelete={(id) => {
                                // Optional: handle delete member
                                console.log("Delete member:", id)
                              }}
                              canDelete={canEdit}
                            />
                          ) : (
                            <div className="w-full py-12 text-center text-muted-foreground">
                              No team members yet
                            </div>
                          )}
                        </LayoutSection>
                      </Layout>
                    )
                  }
                  
                  // Auto-render FilterBar + Grid/Table for "collections" section (only if no content provided)
                  if (section.id === "collections" && !sectionContent) {
                    const collectionsData: ViewCollectionData[] = entity.collectionsList || []
                    
                    // Transform to Grid format (CollectionCardProps)
                    const gridItems: CollectionCardProps[] = collectionsData.map((c: ViewCollectionData) => ({
                      status: c.status,
                      collectionName: c.name,
                      clientName: `@${c.clientName.toLowerCase()}`,
                      location: c.location,
                      startDate: c.startDate,
                      endDate: c.endDate,
                    }))
                    
                    // Transform to Table format (Collection[])
                    const tableItems: Collection[] = collectionsData.map((c: ViewCollectionData) => ({
                      id: c.id,
                      name: c.name,
                      status: c.status,
                      client: c.clientName.charAt(0).toUpperCase() + c.clientName.slice(1),
                      starting: c.startDate.charAt(0).toUpperCase() + c.startDate.slice(1),
                      location: c.location.split(", ").map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(", "),
                      participants: c.participants,
                    }))
                    
                    sectionContent = (
                      <Layout padding="none" showSeparators={false}>
                        {/* First row: Filter Bar */}
                        <LayoutSection>
                          <FilterBar
                            variant="collections"
                            activeView={collectionsView}
                            onViewChange={setCollectionsView}
                            onFilterChange={(filterId, value) => {
                              // Optional: handle filter changes
                              console.log("Filter changed:", filterId, value)
                            }}
                            onSortChange={(order) => {
                              // Optional: handle sort changes
                              console.log("Sort changed:", order)
                            }}
                            showAction={false}
                            hideClientFilter={true}
                          />
                        </LayoutSection>

                        {/* Second row: Grid or Table based on view */}
                        <LayoutSection>
                          {collectionsData.length > 0 ? (
                            collectionsView === "Gallery" ? (
                              <CollectionsGrid items={gridItems} />
                            ) : (
                              <Tables
                                variant="collections"
                                collectionsData={tableItems}
                                onSettings={(id) => {
                                  // Optional: handle settings
                                  console.log("Settings for collection:", id)
                                }}
                              />
                            )
                          ) : (
                            // Show example collections when empty for validation
                            collectionsView === "Gallery" ? (
                              <CollectionsGrid items={[
                                {
                                  status: "draft",
                                  collectionName: "Example Collection 1",
                                  clientName: `@${entity.name.toLowerCase()}`,
                                  location: "Madrid, Spain",
                                  startDate: "dec 4, 2025",
                                  endDate: "dec 14, 2025",
                                },
                                {
                                  status: "in-progress",
                                  collectionName: "Example Collection 2",
                                  clientName: `@${entity.name.toLowerCase()}`,
                                  location: "Barcelona, Spain",
                                  startDate: "jan 1, 2026",
                                  endDate: "jan 15, 2026",
                                },
                                {
                                  status: "completed",
                                  collectionName: "Example Collection 3",
                                  clientName: `@${entity.name.toLowerCase()}`,
                                  location: "Paris, France",
                                  startDate: "nov 1, 2025",
                                  endDate: "nov 10, 2025",
                                },
                              ]} />
                            ) : (
                              <Tables
                                variant="collections"
                                collectionsData={[
                                  {
                                    id: "example-1",
                                    name: "Example Collection 1",
                                    status: "draft",
                                    client: entity.name,
                                    starting: "Dec 4, 2025",
                                    location: "Madrid, Spain",
                                    participants: 0,
                                  },
                                  {
                                    id: "example-2",
                                    name: "Example Collection 2",
                                    status: "in-progress",
                                    client: entity.name,
                                    starting: "Jan 1, 2026",
                                    location: "Barcelona, Spain",
                                    participants: 5,
                                  },
                                  {
                                    id: "example-3",
                                    name: "Example Collection 3",
                                    status: "completed",
                                    client: entity.name,
                                    starting: "Nov 1, 2025",
                                    location: "Paris, France",
                                    participants: 8,
                                  },
                                ]}
                                onSettings={(id) => {
                                  console.log("Settings for collection:", id)
                                }}
                              />
                            )
                          )}
                        </LayoutSection>
                      </Layout>
                    )
                  }

                  return (
                    <div
                      key={section.id}
                      ref={(el) => registerBlockRef(section.id, el)}
                    >
                      <BlockTemplate
                        mode="view"
                        currentVariant={isActive ? "active" : "inactive"}
                        title={section.label}
                        subtitle={section.subtitle}
                        primaryLabel={section.primaryLabel || "Save changes"}
                        onPrimaryClick={showPrimaryButton ? section.onPrimaryClick : undefined}
                        primaryDisabled={section.primaryDisabled}
                        onExpand={() => handleBlockExpand(section.id)}
                        onCollapse={() => handleBlockCollapse(section.id)}
                      >
                        {sectionContent}
                      </BlockTemplate>
                    </div>
                  )
                })
              ) : (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No sections available for this entity type.
                  </p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// HOOK: useViewSections
// =============================================================================

/**
 * Hook to create view sections with content.
 * Merges default section config with content providers.
 * 
 * @example
 * ```tsx
 * const sections = useViewSections({
 *   basic: <BasicInfoContent />,
 *   team: <TeamMembersContent />,
 *   collections: <CollectionsContent />,
 * })
 * ```
 */
export function useViewSections(
  contentMap: Partial<Record<string, React.ReactNode>>,
  overrides?: Partial<Record<string, Partial<ViewSection>>>
): ViewSection[] {
  return React.useMemo(() => {
    return DEFAULT_SECTIONS.map((baseSection) => {
      const sectionOverride = overrides?.[baseSection.id] || {}
      return {
        ...baseSection,
        content: contentMap[baseSection.id],
        ...sectionOverride,
      } as ViewSection
    })
  }, [contentMap, overrides])
}

// Types are exported at their definitions above
