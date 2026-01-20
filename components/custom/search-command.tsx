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
import { createEntitiesListService, getRepositoryInstances } from "@/lib/services"
import { entityTypeToLabel, roleToLabel } from "@/lib/types"
import type { EntityListItem } from "@/lib/services/entities-list-service"
import type { User, Entity } from "@/lib/types"

interface SearchResult {
  id: string
  type: "entity" | "user" | "collection"
  primaryLabel: string // entityName, UserName, CollectionName
  contextualLabel: string // entityType, UserRole, EntityName, ClientName
  entityId?: string
  userId?: string
  collectionId?: string
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
  const [loading, setLoading] = React.useState(false)

  // Load entities and users
  React.useEffect(() => {
    const loadData = async () => {
      if (!open) return

      setLoading(true)
      try {
        // Load entities
        const entitiesService = createEntitiesListService()
        const entitiesData = await entitiesService.listEntities()
        setEntities(entitiesData)

        // Load users
        const { userRepository } = getRepositoryInstances()
        if (userRepository) {
          // Get all users from all entities
          const allUsers: User[] = []
          const { entityRepository } = getRepositoryInstances()
          
          if (entityRepository) {
            const entityIds = entitiesData.map(e => e.id)
            for (const entityId of entityIds) {
              try {
                const entityUsers = await userRepository.listUsersByEntityId(entityId)
                allUsers.push(...entityUsers)
              } catch (error) {
                console.warn(`Failed to load users for entity ${entityId}:`, error)
              }
            }
          }
          
          setUsers(allUsers)
        }
      } catch (error) {
        console.error("Failed to load search data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [open])

  // Build recently created results (when no search query)
  const recentlyCreated = React.useMemo<SearchResult[]>(() => {
    const results: SearchResult[] = []

    // Get entities sorted by updatedAt (most recent first)
    const sortedEntities = [...entities]
      .sort((a, b) => {
        // For now, just return all entities (no updatedAt in EntityListItem)
        return 0
      })
      .slice(0, 5)

    sortedEntities.forEach((entity) => {
      results.push({
        id: `entity-${entity.id}`,
        type: "entity",
        primaryLabel: entity.name,
        contextualLabel: entity.type,
        entityId: entity.id,
      })
    })

    // Get users (all available, limited to 5)
    const sortedUsers = users.slice(0, 5)
    sortedUsers.forEach((user) => {
      const fullName = `${user.firstName} ${user.lastName || ""}`.trim()
      const userEntity = entities.find(e => e.id === user.entityId)
      const entityName = userEntity?.name || "Unknown"
      
      results.push({
        id: `user-${user.id}`,
        type: "user",
        primaryLabel: fullName,
        contextualLabel: `${roleToLabel(user.role)} • ${entityName}`,
        userId: user.id,
        entityId: user.entityId,
      })
    })

    // Limit to 5 total items
    return results.slice(0, 5)
  }, [entities, users])

  // Build search results
  const searchResults = React.useMemo<SearchResult[]>(() => {
    if (!search.trim()) return []

    const searchLower = search.toLowerCase().trim()
    const results: SearchResult[] = []

    // Search entities
    entities.forEach((entity) => {
      if (
        entity.name.toLowerCase().includes(searchLower) ||
        entity.type.toLowerCase().includes(searchLower)
      ) {
        results.push({
          id: `entity-${entity.id}`,
          type: "entity",
          primaryLabel: entity.name,
          contextualLabel: entity.type,
          entityId: entity.id,
        })
      }
    })

    // Search users
    users.forEach((user) => {
      const fullName = `${user.firstName} ${user.lastName || ""}`.trim()
      if (
        fullName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      ) {
        // Get entity name for contextual label
        const userEntity = entities.find(e => e.id === user.entityId)
        const entityName = userEntity?.name || "Unknown"
        
        results.push({
          id: `user-${user.id}`,
          type: "user",
          primaryLabel: fullName,
          contextualLabel: `${roleToLabel(user.role)} • ${entityName}`,
          userId: user.id,
          entityId: user.entityId,
        })
      }
    })

    // Collections would be added here when available
    // For now, we'll skip collections as they're not implemented yet

    return results
  }, [search, entities, users])

  // Handle result selection
  const handleSelect = React.useCallback((result: SearchResult) => {
    if (result.type === "entity" && result.entityId) {
      router.push(`/entities/${result.entityId}`)
      onOpenChange?.(false)
    } else if (result.type === "user" && result.userId && result.entityId) {
      router.push(`/entities/${result.entityId}`)
      onOpenChange?.(false)
    } else if (result.type === "collection" && result.collectionId) {
      router.push(`/collections/${result.collectionId}`)
      onOpenChange?.(false)
    }
  }, [router, onOpenChange])

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
            <DialogDescription>Search for entities, users, and collections</DialogDescription>
          </DialogHeader>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search entities, users, collections..."
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
                          value={result.id}
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

                  {/* Show search results */}
                  {search.trim() && searchResults.length > 0 && (
                    <CommandGroup heading="Results">
                      {searchResults.map((result) => (
                        <CommandItem
                          key={result.id}
                          value={result.id}
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
