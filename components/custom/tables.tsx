"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CollectionStatusTag } from "@/components/custom/tag"
import { Trash2, Settings, ArrowDownUp, ArrowUpDown } from "lucide-react"

// ============================================================================
// TYPES
// ============================================================================

type TableVariant = "team-members" | "entities" | "collections" | "participants"

type CollectionStatus = "draft" | "upcoming" | "in-progress" | "completed" | "canceled"
type UserRole = "Admin" | "Editor" | "Viewer"
type EntityType = "Client" | "Photo Lab" | "Photographer" | "Photo Agency" | "Printer Lab" | "Retouch/Post Studio"

interface TeamMember {
  id: string
  name: string
  email: string
  phone: string
  role: UserRole
  collections: number
  /** "Invite sent" = invitation email sent, not yet accepted; "Active" = user accepted the invitation */
  status?: "Invite sent" | "Active"
}

interface Entity {
  id: string
  name: string
  type: EntityType
  admin: string
  /** Admin user ID (first admin if multiple, null if none) */
  adminUserId?: string | null
  teamMembers: number
  collections: number
}

interface Collection {
  id: string
  name: string
  status: CollectionStatus
  client: string
  jobReference: string
  starting: string
  location: string
  participants: number
}

interface Participant {
  id: string
  name: string
  email: string
  phone: string
  editPermission: boolean
  collections: number
}

interface TablesProps {
  /** Variante de tabla */
  variant?: TableVariant
  /** Datos para TeamMembers */
  teamMembersData?: TeamMember[]
  /** Datos para Entities */
  entitiesData?: Entity[]
  /** Datos para Collections */
  collectionsData?: Collection[]
  /** Datos para Participants */
  participantsData?: Participant[]
  /** Callback al eliminar un elemento */
  onDelete?: (id: string) => void
  /** Callback al ver detalles de un elemento */
  onViewDetails?: (id: string) => void
  /** Callback al hacer click en fila de colección (id, status). Draft → setup, published → view */
  onCollectionRowClick?: (id: string, status: CollectionStatus) => void
  /** Callback al abrir configuración */
  onSettings?: (id: string) => void
  /** Callback al cambiar permiso de edición */
  onEditPermissionChange?: (id: string, value: boolean) => void
  /** Callback al editar un usuario (team member) */
  onEditUser?: (userId: string) => void
  /** Callback al editar un admin user (from entities table) */
  onEditAdminUser?: (userId: string, entityId: string) => void
  /** Whether delete actions should be shown (for team members table) */
  canDelete?: boolean
  className?: string
}

// ============================================================================
// SAMPLE DATA
// ============================================================================

const sampleTeamMembers: TeamMember[] = [
  { id: "1", name: "Erika Goldner", email: "erika.goldner@zara.com", phone: "+34 649 393 291", role: "Admin", collections: 0, status: "Active" },
  { id: "2", name: "Sophia Johnson", email: "sophia.johnson@zara.com", phone: "+34 672 271 218", role: "Viewer", collections: 0, status: "Active" },
  { id: "3", name: "Aiden Smith", email: "kevin.brown@zara.com", phone: "555-555-5555", role: "Editor", collections: 0, status: "Active" },
  { id: "4", name: "Mia Clark", email: "sarah.davis@zara.com", phone: "666-666-6666", role: "Viewer", collections: 0, status: "Active" },
  { id: "5", name: "Noah Garcia", email: "james.wilson@zara.com", phone: "777-777-7777", role: "Viewer", collections: 0, status: "Active" },
]

const sampleEntities: Entity[] = [
  { id: "1", name: "Zara", type: "Client", admin: "Erika Goldner (+2)", teamMembers: 8, collections: 4 },
  { id: "2", name: "Kodak Scanner", type: "Photo Lab", admin: "Sophia Johnson", teamMembers: 3, collections: 2 },
  { id: "3", name: "Tom Haser", type: "Photographer", admin: "Kevin Brown", teamMembers: 1, collections: 1 },
  { id: "4", name: "Photo LUX", type: "Photo Agency", admin: "Sarah Davis (+1)", teamMembers: 2, collections: 2 },
  { id: "5", name: "Reveal Coruña", type: "Printer Lab", admin: "James Wilson", teamMembers: 3, collections: 6 },
]

const sampleCollections: Collection[] = [
  { id: "1", name: "Kids summer'25", status: "draft", client: "Zara", jobReference: "—", starting: "Dec 4, 2025", location: "A Coruña, Spain", participants: 0 },
  { id: "2", name: "Sakura: Cherry blossom", status: "upcoming", client: "Loewe", jobReference: "—", starting: "Dec 14, 2025", location: "Paris, France", participants: 6 },
  { id: "3", name: "Beach resort 2025", status: "in-progress", client: "Dior", jobReference: "—", starting: "Dec 8, 2025", location: "Madrid, Spain", participants: 8 },
  { id: "4", name: "Streetwear collection 2025", status: "completed", client: "Mango", jobReference: "—", starting: "Jan 14, 2026", location: "Lanzarote, Spain", participants: 4 },
  { id: "5", name: "Speed run 2025", status: "canceled", client: "zaraathleticz", jobReference: "—", starting: "Mar 4, 2026", location: "Azores, Portugal", participants: 1 },
]

const sampleParticipants: Participant[] = [
  { id: "1", name: "Erika Goldner", email: "erika.goldner@zara.com", phone: "+34 649 393 291", editPermission: true, collections: 0 },
  { id: "2", name: "Sophia Johnson", email: "sophia.johnson@zara.com", phone: "+34 672 271 218", editPermission: false, collections: 0 },
  { id: "3", name: "Aiden Smith", email: "kevin.brown@zara.com", phone: "555-555-5555", editPermission: true, collections: 0 },
  { id: "4", name: "Mia Clark", email: "sarah.davis@zara.com", phone: "666-666-6666", editPermission: false, collections: 0 },
  { id: "5", name: "Noah Garcia", email: "james.wilson@zara.com", phone: "777-777-7777", editPermission: false, collections: 0 },
]

// ============================================================================
// TABLE WRAPPER COMPONENT
// ============================================================================

function TableWrapper({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("border border-border rounded-xl overflow-hidden", className)}>
      {children}
    </div>
  )
}

// ============================================================================
// TEAM MEMBERS TABLE
// ============================================================================

function TeamMembersTable({
  data = sampleTeamMembers,
  onEditUser,
}: {
  data?: TeamMember[]
  onDelete?: (id: string) => void
  onEditUser?: (userId: string) => void
  canDelete?: boolean
}) {
  return (
    <TableWrapper>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="bg-sidebar h-12">Name</TableHead>
            <TableHead className="bg-sidebar h-12">Email</TableHead>
            <TableHead className="bg-sidebar h-12">Phone</TableHead>
            <TableHead className="bg-sidebar h-12">Role</TableHead>
            <TableHead className="bg-sidebar h-12">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((member) => (
            <TableRow
              key={member.id}
              className="h-[52px] cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onEditUser?.(member.id)
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  e.stopPropagation()
                  onEditUser?.(member.id)
                }
              }}
            >
              <TableCell className="font-medium">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onEditUser?.(member.id)
                  }}
                  className="hover:underline cursor-pointer text-left"
                >
                  {member.name}
                </button>
              </TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell>{member.phone}</TableCell>
              <TableCell>{member.role}</TableCell>
              <TableCell>{member.status ?? "Active"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableWrapper>
  )
}

// ============================================================================
// ENTITIES TABLE
// ============================================================================

type EntitySortColumn = "name" | "type" | "admin" | "teamMembers" | "collections"

function EntitiesTable({
  data = sampleEntities,
  onViewDetails,
  onEditAdminUser,
}: {
  data?: Entity[]
  onViewDetails?: (id: string) => void
  onEditAdminUser?: (userId: string, entityId: string) => void
}) {
  const [sortColumn, setSortColumn] = React.useState<EntitySortColumn | null>(null)
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc")

  const handleSort = (column: EntitySortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const sortedData = React.useMemo(() => {
    const list = data ?? []
    if (!sortColumn) return list
    return [...list].sort((a, b) => {
      let cmp = 0
      switch (sortColumn) {
        case "name":
          cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
          break
        case "type":
          cmp = a.type.localeCompare(b.type, undefined, { sensitivity: "base" })
          break
        case "admin":
          cmp = a.admin.localeCompare(b.admin, undefined, { sensitivity: "base" })
          break
        case "teamMembers":
          cmp = a.teamMembers - b.teamMembers
          break
        case "collections":
          cmp = a.collections - b.collections
          break
      }
      return sortDirection === "asc" ? cmp : -cmp
    })
  }, [data, sortColumn, sortDirection])

  const SortableHead = ({ column, label }: { column: EntitySortColumn; label: string }) => (
    <TableHead className="bg-sidebar h-12">
      <button
        type="button"
        onClick={() => handleSort(column)}
        className="inline-flex items-center gap-1.5 text-left font-medium hover:opacity-80 transition-opacity"
      >
        {label}
        {sortColumn === column ? (
          sortDirection === "asc" ? (
            <ArrowUpDown className="size-4 shrink-0" aria-label="Ascending" />
          ) : (
            <ArrowDownUp className="size-4 shrink-0" aria-label="Descending" />
          )
        ) : (
          <ArrowUpDown className="size-4 shrink-0 text-muted-foreground" aria-label="Sort" />
        )}
      </button>
    </TableHead>
  )

  return (
    <TableWrapper>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortableHead column="name" label="Name" />
            <SortableHead column="type" label="Type" />
            <SortableHead column="admin" label="Admin" />
            <SortableHead column="teamMembers" label="Team members" />
            <SortableHead column="collections" label="Collections" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((entity) => (
            <TableRow
              key={entity.id}
              className="h-[52px] cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onViewDetails?.(entity.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onViewDetails?.(entity.id)
                }
              }}
            >
              <TableCell className="font-medium">
                <Link
                  href={`/organizations/${entity.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:underline focus:outline-none focus:underline"
                >
                  {entity.name}
                </Link>
              </TableCell>
              <TableCell>{entity.type}</TableCell>
              <TableCell>
                {entity.adminUserId ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditAdminUser?.(entity.adminUserId!, entity.id)
                    }}
                    className="hover:underline cursor-pointer text-left"
                  >
                    {entity.admin}
                  </button>
                ) : (
                  <span>{entity.admin}</span>
                )}
              </TableCell>
              <TableCell>{entity.teamMembers}</TableCell>
              <TableCell>{entity.collections}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableWrapper>
  )
}

// ============================================================================
// COLLECTIONS TABLE
// ============================================================================

const COLLECTION_STATUS_ORDER: Record<CollectionStatus, number> = {
  draft: 0,
  upcoming: 1,
  "in-progress": 2,
  completed: 3,
  canceled: 4,
}

/** Parse "24 Feb 2026" or "TBD" for sorting. TBD sorts last. */
function parseStartingDate(s: string): number {
  if (!s || s === "TBD") return Number.MAX_SAFE_INTEGER
  try {
    const d = new Date(s)
    return Number.isNaN(d.getTime()) ? Number.MAX_SAFE_INTEGER : d.getTime()
  } catch {
    return Number.MAX_SAFE_INTEGER
  }
}

type CollectionSortColumn = "name" | "status" | "client" | "jobReference" | "starting"

function CollectionsTable({
  data = sampleCollections,
  onSettings,
  onRowClick,
}: {
  data?: Collection[]
  onSettings?: (id: string) => void
  /** Callback when row is clicked (id, status). If provided, row becomes clickable. */
  onRowClick?: (id: string, status: CollectionStatus) => void
}) {
  const [sortColumn, setSortColumn] = React.useState<CollectionSortColumn | null>(null)
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc")

  const handleSort = (column: CollectionSortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const sortedData = React.useMemo(() => {
    const list = data ?? []
    if (!sortColumn) return list
    return [...list].sort((a, b) => {
      let cmp = 0
      switch (sortColumn) {
        case "name":
          cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
          break
        case "status":
          cmp = COLLECTION_STATUS_ORDER[a.status] - COLLECTION_STATUS_ORDER[b.status]
          break
        case "client":
          cmp = a.client.localeCompare(b.client, undefined, { sensitivity: "base" })
          break
        case "jobReference":
          cmp = (a.jobReference || "—").localeCompare(b.jobReference || "—", undefined, {
            sensitivity: "base",
          })
          break
        case "starting":
          cmp = parseStartingDate(a.starting) - parseStartingDate(b.starting)
          break
      }
      return sortDirection === "asc" ? cmp : -cmp
    })
  }, [data, sortColumn, sortDirection])

  const SortableHead = ({ column, label }: { column: CollectionSortColumn; label: string }) => (
    <TableHead className="bg-sidebar h-12">
      <button
        type="button"
        onClick={() => handleSort(column)}
        className="inline-flex items-center gap-1.5 text-left font-medium hover:opacity-80 transition-opacity w-full"
      >
        {label}
        {sortColumn === column ? (
          sortDirection === "asc" ? (
            <ArrowUpDown className="size-4 shrink-0" aria-label="Ascending" />
          ) : (
            <ArrowDownUp className="size-4 shrink-0" aria-label="Descending" />
          )
        ) : (
          <ArrowUpDown className="size-4 shrink-0 text-muted-foreground" aria-label="Sort" />
        )}
      </button>
    </TableHead>
  )

  return (
    <TableWrapper>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortableHead column="name" label="Name" />
            <SortableHead column="status" label="Status" />
            <SortableHead column="client" label="Client" />
            <SortableHead column="jobReference" label="Job reference" />
            <SortableHead column="starting" label="Starting" />
            <TableHead className="bg-sidebar h-12">Location</TableHead>
            <TableHead className="bg-sidebar h-12">Participants</TableHead>
            <TableHead className="bg-sidebar h-12 w-[85px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((collection) => (
            <TableRow
              key={collection.id}
              className={cn(
                "h-[52px]",
                onRowClick && "cursor-pointer hover:bg-muted/50 transition-colors"
              )}
              onClick={onRowClick ? () => onRowClick(collection.id, collection.status) : undefined}
              role={onRowClick ? "button" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onRowClick(collection.id, collection.status)
                      }
                    }
                  : undefined
                }
            >
              <TableCell className="font-medium">{collection.name}</TableCell>
              <TableCell>
                <CollectionStatusTag status={collection.status} />
              </TableCell>
              <TableCell>{collection.client}</TableCell>
              <TableCell>{collection.jobReference}</TableCell>
              <TableCell>{collection.starting}</TableCell>
              <TableCell>{collection.location}</TableCell>
              <TableCell>{collection.participants}</TableCell>
              <TableCell className="text-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSettings?.(collection.id)
                  }}
                  className="h-10 w-10"
                >
                  <Settings className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableWrapper>
  )
}

// ============================================================================
// PARTICIPANTS TABLE
// ============================================================================

function ParticipantsTable({
  data = sampleParticipants,
  onDelete,
  onEditPermissionChange,
}: {
  data?: Participant[]
  onDelete?: (id: string) => void
  onEditPermissionChange?: (id: string, value: boolean) => void
}) {
  return (
    <TableWrapper>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="bg-sidebar h-12">Name</TableHead>
            <TableHead className="bg-sidebar h-12">Email</TableHead>
            <TableHead className="bg-sidebar h-12">Phone</TableHead>
            <TableHead className="bg-sidebar h-12">Edit permission</TableHead>
            <TableHead className="bg-sidebar h-12">Collections</TableHead>
            <TableHead className="bg-sidebar h-12 w-[85px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((participant) => (
            <TableRow key={participant.id} className="h-[52px]">
              <TableCell className="font-medium">{participant.name}</TableCell>
              <TableCell>{participant.email}</TableCell>
              <TableCell>{participant.phone}</TableCell>
              <TableCell>
                <Switch
                  checked={participant.editPermission}
                  onCheckedChange={(checked) => onEditPermissionChange?.(participant.id, checked)}
                />
              </TableCell>
              <TableCell>{participant.collections}</TableCell>
              <TableCell className="text-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete?.(participant.id)}
                  className="h-10 w-10"
                >
                  <Trash2 className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableWrapper>
  )
}

// ============================================================================
// MAIN TABLES COMPONENT
// ============================================================================

export function Tables({
  variant = "team-members",
  teamMembersData,
  entitiesData,
  collectionsData,
  participantsData,
  onDelete,
  onViewDetails,
  onCollectionRowClick,
  onSettings,
  onEditPermissionChange,
  onEditUser,
  onEditAdminUser,
  canDelete = true,
  className,
}: TablesProps) {
  switch (variant) {
    case "team-members":
      return (
        <div className={className}>
          <TeamMembersTable
            data={teamMembersData}
            onDelete={onDelete}
            onEditUser={onEditUser}
            canDelete={canDelete}
          />
        </div>
      )
    case "entities":
      return (
        <div className={className}>
          <EntitiesTable
            data={entitiesData}
            onViewDetails={onViewDetails}
            onEditAdminUser={onEditAdminUser}
          />
        </div>
      )
    case "collections":
      return (
        <div className={className}>
          <CollectionsTable
            data={collectionsData}
            onSettings={onSettings}
            onRowClick={onCollectionRowClick}
          />
        </div>
      )
    case "participants":
      return (
        <div className={className}>
          <ParticipantsTable
            data={participantsData}
            onDelete={onDelete}
            onEditPermissionChange={onEditPermissionChange}
          />
        </div>
      )
    default:
      return null
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  TablesProps,
  TableVariant,
  TeamMember,
  Entity,
  Collection,
  Participant,
}

