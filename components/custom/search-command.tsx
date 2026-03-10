"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
  CommandGroup,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { createCollectionsService } from "@/lib/services"
import type { EntityListItem, EntitiesApiResponse } from "@/lib/services/entities-list-service"
import { mapOrganizationsApiToEntities } from "@/lib/services/entities-list-service"
import type { User } from "@/lib/types"
import { roleToLabel } from "@/lib/types"
import type { Collection } from "@/lib/domain/collections"

/** Always returns a valid role label (Admin/Editor/Viewer) for internal users. */
function getInternalUserRoleLabel(user: User): string {
  const r = user.role
  const label = roleToLabel(r)
  return label || "Viewer"
}

interface SearchResult {
  id: string
  type: "entity" | "user" | "collection"
  /** Left: EntityName / UserName / CollectionName (or JobReference when matchedByJobReference) */
  primaryLabel: string
  /** Right: entityType / entityName · entityType / ClientName · PhotographerName (or CollectionName · ClientName when matchedByJobReference) */
  contextualLabel: string
  entityId?: string
  userId?: string
  collectionId?: string
  /** For collection: draft → /collections/create/[id], else → /collections/[id] */
  collectionStatus?: Collection["status"]
  /** When true, display format is [jobReference] ------ [collectionName] · [clientName] */
  matchedByJobReference?: boolean
}

interface SearchCommandProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * Search Command Component
 * 
 * Command palette for searching entities, users, and collections.
 * Shows results with primary information on the left and contextual information on the right.
 */
export function SearchCommand({
  open = false,
  onOpenChange,
}: SearchCommandProps) {
  const router = useRouter()
  const [search, setSearch] = React.useState("")
  const [entities, setEntities] = React.useState<EntityListItem[]>([])
  const [users, setUsers] = React.useState<User[]>([])
  const [collections, setCollections] = React.useState<Collection[]>([])
  const [loading, setLoading] = React.useState(false)
  /** User ids with is_internal=true (noba*); show "noba* · UserRole" instead of "entityName · entityType" */
  const [internalUserIds, setInternalUserIds] = React.useState<Set<string>>(new Set())

  // Load data only from database (GET /api/organizations). No in-memory or localStorage fallback.
  React.useEffect(() => {
    const loadData = async () => {
      if (!open) return

      setLoading(true)
      try {
        // Single fetch with cache-bust so we always get fresh DB data; no stale/deleted items.
        const res = await fetch(
          `/api/organizations?_=${Date.now()}`,
          { method: "GET", cache: "no-store" }
        )

        if (!res.ok) {
          setEntities([])
          setUsers([])
          setInternalUserIds(new Set())
          return
        }

        const data = (await res.json()) as EntitiesApiResponse

        // Entities and users only from this API response (database).
        setEntities(mapOrganizationsApiToEntities(data))

        const profiles = data.profiles ?? []
        const internalIds = new Set<string>()
        const profileWithMeta = profiles as Array<typeof profiles[0] & { is_internal?: boolean; email?: string | null }>
        for (const p of profileWithMeta) {
          if (p.is_internal) internalIds.add(p.id)
        }
        setInternalUserIds(internalIds)

        const normalizedRole = (r: string | null | undefined): User["role"] => {
          const lower = (r ?? "").toLowerCase()
          if (lower === "admin") return "admin"
          if (lower === "editor") return "editor"
          return "viewer"
        }
        const usersData: User[] = profileWithMeta.map((p) => ({
          id: p.id,
          firstName: p.first_name ?? "",
          lastName: p.last_name ?? undefined,
          email: p.email ?? "",
          phoneNumber: "",
          entityId: p.organization_id ?? "",
          role: normalizedRole(p.role),
        }))
        setUsers(usersData)

        // Collections: from service (when Supabase is configured, this reads from DB).
        const collectionsService = createCollectionsService()
        const collectionsData = await collectionsService.listCollections()
        setCollections(collectionsData)
      } catch (error) {
        console.error("Failed to load search data:", error)
        setEntities([])
        setUsers([])
        setInternalUserIds(new Set())
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [open])

  // Resolve collection client and photographer names from entities
  const getCollectionContextualLabel = React.useCallback(
    (c: Collection): string => {
      const clientName = entities.find((e) => e.id === c.config.clientEntityId)?.name ?? "—"
      const photographer = c.participants.find((p) => p.role === "photographer")
      const photographerName = photographer?.entityId
        ? entities.find((e) => e.id === photographer.entityId)?.name ?? "—"
        : "—"
      return `${clientName} · ${photographerName}`
    },
    [entities]
  )

  // Build recently created results (when no search query)
  const recentlyCreated = React.useMemo<SearchResult[]>(() => {
    const results: SearchResult[] = []

    const sortedEntities = [...entities].slice(0, 3)
    sortedEntities.forEach((entity) => {
      results.push({
        id: `entity-${entity.id}`,
        type: "entity",
        primaryLabel: entity.name,
        contextualLabel: entity.type,
        entityId: entity.id,
      })
    })

    const sortedUsers = users.slice(0, 3)
    sortedUsers.forEach((user) => {
      const fullName = `${user.firstName} ${user.lastName || ""}`.trim()
      const contextualLabel = internalUserIds.has(user.id)
        ? `noba* · ${getInternalUserRoleLabel(user)}`
        : (() => {
            const userEntity = entities.find((e) => e.id === user.entityId)
            const entityName = userEntity?.name ?? "—"
            const entityType = userEntity?.type ?? "—"
            return `${entityName} · ${entityType}`
          })()
      results.push({
        id: `user-${user.id}`,
        type: "user",
        primaryLabel: fullName,
        contextualLabel,
        userId: user.id,
        entityId: user.entityId,
      })
    })

    const sortedCollections = [...collections].slice(0, 3)
    sortedCollections.forEach((c) => {
      results.push({
        id: `collection-${c.id}`,
        type: "collection",
        primaryLabel: c.config.name || "—",
        contextualLabel: getCollectionContextualLabel(c),
        collectionId: c.id,
        collectionStatus: c.status,
      })
    })

    return results.slice(0, 8)
  }, [entities, users, collections, internalUserIds, getCollectionContextualLabel])

  // Build search results
  const searchResults = React.useMemo<SearchResult[]>(() => {
    if (!search.trim()) return []

    const searchLower = search.toLowerCase().trim()
    const results: SearchResult[] = []

    // Search entities: EntityName (left) --- entityType (right)
    entities.forEach((entity) => {
      const nameMatch = (entity.name ?? "").toLowerCase().includes(searchLower)
      const typeMatch = (entity.type ?? "").toLowerCase().includes(searchLower)
      if (nameMatch || typeMatch) {
        results.push({
          id: `entity-${entity.id}`,
          type: "entity",
          primaryLabel: entity.name ?? "",
          contextualLabel: entity.type ?? "",
          entityId: entity.id,
        })
      }
    })

    // Search users: UserName (left) --- entityName · entityType (right); Internal=TRUE → "noba* · UserRole"
    users.forEach((user) => {
      const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
      const emailMatch = (user.email ?? "").toLowerCase().includes(searchLower)
      if (fullName.toLowerCase().includes(searchLower) || emailMatch) {
        const contextualLabel = internalUserIds.has(user.id)
          ? `noba* · ${getInternalUserRoleLabel(user)}`
          : (() => {
              const userEntity = entities.find((e) => e.id === user.entityId)
              const entityName = userEntity?.name ?? "—"
              const entityType = userEntity?.type ?? "—"
              return `${entityName} · ${entityType}`
            })()
        results.push({
          id: `user-${user.id}`,
          type: "user",
          primaryLabel: fullName,
          contextualLabel,
          userId: user.id,
          entityId: user.entityId,
        })
      }
    })

    // Search collections: CollectionName (left) --- ClientName · PhotographerName (right)
    // Or when job reference matches: [jobReference] ------ [collectionName] · [clientName]
    collections.forEach((c) => {
      const nameMatch = (c.config.name ?? "").toLowerCase().includes(searchLower)
      const clientName = entities.find((e) => e.id === c.config.clientEntityId)?.name ?? ""
      const photographer = c.participants.find((p) => p.role === "photographer")
      const photographerName = photographer?.entityId
        ? entities.find((e) => e.id === photographer.entityId)?.name ?? ""
        : ""
      const clientMatch = clientName.toLowerCase().includes(searchLower)
      const photographerMatch = photographerName.toLowerCase().includes(searchLower)
      const jobRefMatch = (c.config.reference ?? "").toLowerCase().includes(searchLower)
      if (nameMatch || clientMatch || photographerMatch || jobRefMatch) {
        // When matched by job reference, use format: [jobReference] ------ [collectionName] · [clientName]
        results.push(
          jobRefMatch
            ? {
                id: `collection-${c.id}`,
                type: "collection" as const,
                primaryLabel: c.config.reference?.trim() || "—",
                contextualLabel: `------ ${c.config.name || "—"} · ${clientName || "—"}`,
                collectionId: c.id,
                collectionStatus: c.status,
                matchedByJobReference: true,
              }
            : {
                id: `collection-${c.id}`,
                type: "collection" as const,
                primaryLabel: c.config.name || "—",
                contextualLabel: getCollectionContextualLabel(c),
                collectionId: c.id,
                collectionStatus: c.status,
              }
        )
      }
    })

    return results
  }, [search, entities, users, collections, internalUserIds, getCollectionContextualLabel])

  // Handle result selection
  const handleSelect = React.useCallback(
    (result: SearchResult) => {
      if (result.type === "entity" && result.entityId) {
        router.push(`/organizations/${result.entityId}`)
        onOpenChange?.(false)
      } else if (result.type === "user" && result.userId) {
        router.push(`/team/${result.userId}`)
        onOpenChange?.(false)
      } else if (result.type === "collection" && result.collectionId) {
        const status = result.collectionStatus
        if (status === "draft") {
          router.push(`/collections/create/${result.collectionId}`)
        } else {
          router.push(`/collections/${result.collectionId}`)
        }
        onOpenChange?.(false)
      }
    },
    [router, onOpenChange]
  )

  // Reset search when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSearch("")
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        {/* Overlay: #000 at 36% opacity */}
        <DialogOverlay className="bg-black/[0.36]" />
        <DialogContent
          className={cn(
            "max-w-2xl w-full p-0 overflow-hidden",
            "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          )}
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Search</DialogTitle>
            <DialogDescription>Search organizations, users, and collections</DialogDescription>
          </DialogHeader>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search organizations, users, collections..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {loading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : (
                <>
                  {/* Show recently created when no search query */}
                  {!search.trim() && recentlyCreated.length > 0 && (
                    <CommandGroup heading="Recently created">
                      {recentlyCreated.map((result) => (
                        <CommandItem
                          key={result.id}
                          value={`${result.id} ${result.primaryLabel} ${result.contextualLabel}`}
                          onSelect={() => handleSelect(result)}
                          className="flex items-center justify-between"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {result.primaryLabel}
                            </div>
                          </div>
                          <div className="ml-4 text-xs text-muted-foreground whitespace-nowrap">
                            {result.contextualLabel}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {/* Show search results (value includes searchable text so cmdk doesn't hide items) */}
                  {search.trim() && searchResults.length > 0 && (
                    <CommandGroup heading="Results">
                      {searchResults.map((result) => (
                        <CommandItem
                          key={result.id}
                          value={`${result.id} ${result.primaryLabel} ${result.contextualLabel}`}
                          onSelect={() => handleSelect(result)}
                          className="flex items-center justify-between"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {result.primaryLabel}
                            </div>
                          </div>
                          <div className="ml-4 text-xs text-muted-foreground whitespace-nowrap">
                            {result.contextualLabel}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {/* Show empty state only when searching */}
                  {search.trim() && searchResults.length === 0 && (
                    <CommandEmpty>No results found.</CommandEmpty>
                  )}

                  {/* Show empty state when no search and no recent items */}
                  {!search.trim() && recentlyCreated.length === 0 && (
                    <CommandEmpty>No recent items found.</CommandEmpty>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
