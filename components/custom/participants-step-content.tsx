"use client"

import * as React from "react"
import { Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { OptionPicker } from "./option-picker"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getRepositoryInstances } from "@/lib/services"
import type {
  CollectionDraft,
  CollectionParticipant,
  ParticipantRole,
} from "@/lib/domain/collections"
import type { EntityType } from "@/lib/types"
import type { User } from "@/lib/types"
import type { Entity } from "@/lib/types"

const ROLE_LABELS: Record<ParticipantRole, string> = {
  producer: "Producer",
  client: "Client",
  photographer: "Photographer",
  agency: "Agency",
  lab: "Lab",
  handprint_lab: "Hand print lab",
  edition_studio: "Edition studio",
}

const ROLE_ENTITY_TYPES: Record<Exclude<ParticipantRole, "producer">, EntityType> = {
  client: "client",
  photographer: "self-photographer",
  agency: "agency",
  lab: "photo-lab",
  handprint_lab: "hand-print-lab",
  edition_studio: "edition-studio",
}

export interface ParticipantsStepContentProps {
  draft: CollectionDraft
  onParticipantsChange: (participants: CollectionParticipant[]) => void
  className?: string
}

function getParticipantByRole(
  participants: CollectionParticipant[],
  role: ParticipantRole
): CollectionParticipant | undefined {
  return participants.find((p) => p.role === role)
}

function effectiveEntityId(
  participant: CollectionParticipant | undefined,
  role: ParticipantRole,
  config: CollectionDraft["config"]
): string {
  if (role === "client" && config.clientEntityId?.trim()) {
    return participant?.entityId?.trim() || config.clientEntityId
  }
  return participant?.entityId?.trim() || ""
}

export function ParticipantsStepContent({
  draft,
  onParticipantsChange,
  className,
}: ParticipantsStepContentProps) {
  const config = draft.config
  const participants = draft.participants

  const sections = React.useMemo((): { role: Exclude<ParticipantRole, "producer">; prefilled: boolean }[] => {
    const out: { role: Exclude<ParticipantRole, "producer">; prefilled: boolean }[] = [
      { role: "client", prefilled: true },
      { role: "photographer", prefilled: false },
    ]
    // Agency is selected via Photographer's "Select agency" — no separate Agency section (collections-logic)
    // Lab only in handprint workflow; digital-only has no lab (collections-logic)
    if (config.hasHandprint) out.push({ role: "lab", prefilled: false })
    // Hand print lab only when it is a different lab than low-res (collections-logic)
    if (config.hasHandprint && config.handprintIsDifferentLab) out.push({ role: "handprint_lab", prefilled: false })
    if (config.hasEditionStudio) out.push({ role: "edition_studio", prefilled: false })
    return out
  }, [config.hasAgency, config.hasHandprint, config.handprintIsDifferentLab, config.hasEditionStudio])

  const setParticipant = React.useCallback(
    (role: ParticipantRole, update: Partial<CollectionParticipant> | null) => {
      const next = [...participants]
      const idx = next.findIndex((p) => p.role === role)
      if (update === null) {
        if (idx >= 0) next.splice(idx, 1)
      } else if (idx >= 0) {
        next[idx] = { ...next[idx], ...update }
      } else {
        next.push({ role, ...update } as CollectionParticipant)
      }
      onParticipantsChange(next)
    },
    [participants, onParticipantsChange]
  )

  const setEntityId = React.useCallback(
    (role: Exclude<ParticipantRole, "producer">, entityId: string) => {
      const p = getParticipantByRole(participants, role)
      setParticipant(role, {
        entityId: entityId || undefined,
        userIds: entityId ? (p?.userIds ?? []) : [],
        editPermissionByUserId: entityId ? (p?.editPermissionByUserId ?? {}) : undefined,
      })
    },
    [participants, setParticipant]
  )

  const addMember = React.useCallback(
    (role: ParticipantRole, userId: string, entityIdForNew?: string) => {
      const p = getParticipantByRole(participants, role)
      const entityId =
        entityIdForNew ??
        p?.entityId ??
        (role === "client" ? config.clientEntityId : undefined)
      const base = p ?? { role, userIds: [] as string[], editPermissionByUserId: {} as Record<string, boolean> }
      const nextUserIds = [...(base.userIds ?? []), userId]
      const nextEdit = { ...(base.editPermissionByUserId ?? {}), [userId]: true }
      setParticipant(role, { ...base, entityId, userIds: nextUserIds, editPermissionByUserId: nextEdit })
    },
    [participants, setParticipant, config.clientEntityId]
  )

  const removeMember = React.useCallback(
    (role: ParticipantRole, userId: string) => {
      const p = getParticipantByRole(participants, role)
      if (!p?.userIds?.length) return
      const nextUserIds = p.userIds.filter((id) => id !== userId)
      const nextEdit = { ...(p.editPermissionByUserId ?? {}) }
      delete nextEdit[userId]
      setParticipant(role, { ...p, userIds: nextUserIds, editPermissionByUserId: nextEdit })
    },
    [participants, setParticipant]
  )

  const setEditPermission = React.useCallback(
    (role: ParticipantRole, userId: string, value: boolean) => {
      const p = getParticipantByRole(participants, role)
      if (!p) return
      const nextEdit = { ...(p.editPermissionByUserId ?? {}), [userId]: value }
      setParticipant(role, { ...p, editPermissionByUserId: nextEdit })
    },
    [participants, setParticipant]
  )

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {sections.map(({ role, prefilled }) => (
        <ParticipantSection
          key={role}
          role={role}
          label={ROLE_LABELS[role]}
          draft={draft}
          prefilled={prefilled}
          onEntitySelect={(entityId) => setEntityId(role, entityId)}
          onAddMember={(userId, entityIdForNew) => addMember(role, userId, entityIdForNew)}
          onRemoveMember={(userId) => removeMember(role, userId)}
          onEditPermissionChange={(userId, value) => setEditPermission(role, userId, value)}
        />
      ))}
    </div>
  )
}

interface ParticipantSectionProps {
  role: Exclude<ParticipantRole, "producer">
  label: string
  draft: CollectionDraft
  prefilled: boolean
  onEntitySelect: (entityId: string) => void
  /** When adding photographer without agency, pass entityId as second arg so participant is set in one update */
  onAddMember: (userId: string, entityIdForNew?: string) => void
  onRemoveMember: (userId: string) => void
  onEditPermissionChange: (userId: string, value: boolean) => void
}

function ParticipantSection({
  role,
  label,
  draft,
  prefilled,
  onEntitySelect,
  onAddMember,
  onRemoveMember,
  onEditPermissionChange,
}: ParticipantSectionProps) {
  const [addMemberOpen, setAddMemberOpen] = React.useState(false)
  const config = draft.config
  const participant = getParticipantByRole(draft.participants, role)
  const entityId = effectiveEntityId(participant, role, draft.config)
  const isPhotographerNoAgency = role === "photographer" && !config.hasAgency
  const isPhotographerWithAgency = role === "photographer" && config.hasAgency
  const effectiveEntityType: EntityType =
    isPhotographerWithAgency ? "agency" : ROLE_ENTITY_TYPES[role]

  const { entities, users, usersById } = useParticipantData(entityId, effectiveEntityType)
  const selfPhotographerUsers = useUsersFromAllEntitiesOfType(
    isPhotographerNoAgency || isPhotographerWithAgency ? "self-photographer" : null
  )
  const usersForAddMember = React.useMemo(() => {
    if (isPhotographerNoAgency) return selfPhotographerUsers
    if (isPhotographerWithAgency) {
      const byId = new Map(users.map((u) => [u.id, u]))
      for (const u of selfPhotographerUsers) byId.set(u.id, u)
      return Array.from(byId.values())
    }
    return users
  }, [isPhotographerNoAgency, isPhotographerWithAgency, users, selfPhotographerUsers])

  const memberUserIds = participant?.userIds ?? []
  const usersByIdsResolved = useUsersByIds(memberUserIds)
  const memberUsers = React.useMemo(
    () =>
      memberUserIds
        .map((id) => usersById.get(id) ?? usersByIdsResolved.get(id))
        .filter((u): u is User => u != null),
    [memberUserIds, usersById, usersByIdsResolved]
  )
  const editByUserId = participant?.editPermissionByUserId ?? {}

  const entityOptions = React.useMemo(
    () => entities.map((e) => ({ value: e.id, label: e.name })),
    [entities]
  )

  const showEntityPicker = !isPhotographerNoAgency
  const addButtonLabel = isPhotographerNoAgency ? "Add photographer" : "New member"
  const pickerPlaceholder = isPhotographerWithAgency ? "Select agency" : `Select ${label.toLowerCase()}`

  const handleOverlaySelect = React.useCallback(
    (u: User) => {
      if (isPhotographerNoAgency) {
        onAddMember(u.id, u.entityId)
      } else {
        onAddMember(u.id)
      }
      setAddMemberOpen(false)
    },
    [isPhotographerNoAgency, onAddMember]
  )

  const isEditLockedForUser = React.useCallback(
    (u: User) => {
      if (isPhotographerNoAgency) return true
      if (isPhotographerWithAgency && selfPhotographerUsers.some((s) => s.id === u.id)) return true
      return false
    },
    [isPhotographerNoAgency, isPhotographerWithAgency, selfPhotographerUsers]
  )

  return (
    <div className="flex flex-col gap-4 p-4 bg-background border border-border rounded-xl w-full">
      <div className="flex items-center justify-between gap-4">
        <span className="text-base font-semibold text-foreground">{label}</span>
        <div className="flex items-center gap-3">
          {showEntityPicker && (
            <OptionPicker
              label=""
              value={entityId}
              onValueChange={onEntitySelect}
              placeholder={pickerPlaceholder}
              options={entityOptions}
              disabled={prefilled}
              className="w-[224px] min-w-[224px] shrink-0"
            />
          )}
          {isPhotographerNoAgency ? (
            <Button
              variant="secondary"
              onClick={() => setAddMemberOpen(true)}
              className="h-10 gap-2 rounded-xl"
            >
              <Plus className="h-4 w-4" />
              {addButtonLabel}
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => setAddMemberOpen(true)}
              disabled={!entityId}
              className="h-10 gap-2 rounded-xl"
            >
              <Plus className="h-4 w-4" />
              {addButtonLabel}
            </Button>
          )}
        </div>
      </div>
      {memberUsers.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="bg-sidebar h-12">Name</TableHead>
                <TableHead className="bg-sidebar h-12">Email</TableHead>
                <TableHead className="bg-sidebar h-12">Phone</TableHead>
                <TableHead className="bg-sidebar h-12">Edit permission</TableHead>
                <TableHead className="bg-sidebar h-12 w-[85px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberUsers.map((u) => (
                <TableRow key={u.id} className="h-[52px]">
                  <TableCell className="font-medium">
                    {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-[120px]">
                    {u.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-[120px]">
                    {u.phoneNumber ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={!!editByUserId[u.id]}
                      onCheckedChange={(v) => onEditPermissionChange(u.id, !!v)}
                      disabled={isEditLockedForUser(u)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveMember(u.id)}
                      className="h-10 w-10"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <AddMemberOverlay
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
        users={usersForAddMember}
        existingIds={new Set(memberUserIds)}
        onSelect={handleOverlaySelect}
        getSupportiveText={
          isPhotographerWithAgency
            ? (u) => {
                const isFromAgency = users.some((au) => au.id === u.id)
                return isFromAgency
                  ? (entities.find((e) => e.id === entityId)?.name ?? "Agency")
                  : "Photographer"
              }
            : isPhotographerNoAgency
              ? () => "Photographer"
              : undefined
        }
      />
    </div>
  )
}

function useParticipantData(entityId: string, entityType: EntityType) {
  const [entities, setEntities] = React.useState<Entity[]>([])
  const [users, setUsers] = React.useState<User[]>([])
  const usersById = React.useMemo(() => new Map(users.map((u) => [u.id, u])), [users])

  React.useEffect(() => {
    let cancelled = false
    const repos = getRepositoryInstances()
    repos.entityRepository?.getAllEntities().then((all) => {
      if (cancelled) return
      const filtered = all.filter((e) => e.type === entityType)
      setEntities(filtered)
    })
    return () => {
      cancelled = true
    }
  }, [entityType])

  React.useEffect(() => {
    if (!entityId) {
      setUsers([])
      return
    }
    let cancelled = false
    const repos = getRepositoryInstances()
    repos.userRepository?.listUsersByEntityId(entityId).then((list) => {
      if (cancelled) return
      setUsers(list ?? [])
    })
    return () => {
      cancelled = true
    }
  }, [entityId])

  return { entities, users, usersById }
}

function useUsersFromAllEntitiesOfType(entityType: EntityType | null): User[] {
  const [users, setUsers] = React.useState<User[]>([])

  React.useEffect(() => {
    if (!entityType) {
      setUsers([])
      return
    }
    let cancelled = false
    const repos = getRepositoryInstances()
    repos.entityRepository?.getAllEntities().then((all) => {
      if (cancelled) return
      const entities = all.filter((e) => e.type === entityType)
      Promise.all(
        entities.map((e) => repos.userRepository?.listUsersByEntityId(e.id) ?? Promise.resolve([]))
      ).then((lists) => {
        if (cancelled) return
        const byId = new Map<string, User>()
        for (const list of lists) {
          for (const u of list ?? []) byId.set(u.id, u)
        }
        setUsers(Array.from(byId.values()))
      })
    })
    return () => {
      cancelled = true
    }
  }, [entityType])

  return users
}

function useUsersByIds(userIds: string[]): Map<string, User> {
  const [byId, setById] = React.useState<Map<string, User>>(new Map())

  React.useEffect(() => {
    if (!userIds.length) {
      setById(new Map())
      return
    }
    let cancelled = false
    const repos = getRepositoryInstances()
    const userRepo = repos.userRepository
    if (!userRepo) {
      setById(new Map())
      return
    }
    Promise.all(userIds.map((id) => userRepo.getUserById(id))).then((results) => {
      if (cancelled) return
      const map = new Map<string, User>()
      results.forEach((u) => {
        if (u) map.set(u.id, u)
      })
      setById(map)
    })
    return () => {
      cancelled = true
    }
  }, [userIds.join(",")])

  return byId
}

function AddMemberOverlay({
  open,
  onOpenChange,
  users,
  existingIds,
  onSelect,
  getSupportiveText,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: User[]
  existingIds: Set<string>
  onSelect: (user: User) => void
  getSupportiveText?: (user: User) => string
}) {
  const [search, setSearch] = React.useState("")
  const filtered = React.useMemo(() => {
    if (!search.trim()) return users.filter((u) => !existingIds.has(u.id))
    const t = search.toLowerCase()
    return users.filter(
      (u) =>
        !existingIds.has(u.id) &&
        (u.firstName?.toLowerCase().includes(t) ||
          u.lastName?.toLowerCase().includes(t) ||
          u.email?.toLowerCase().includes(t))
    )
  }, [users, existingIds, search])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Add new member"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-hidden
        onClick={() => onOpenChange(false)}
      />
      <div
        className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-background p-2 shadow-xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="rounded-lg border-0 bg-transparent" shouldFilter={false}>
          <CommandInput
            placeholder="Search by name or email"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-60 mt-2">
            <CommandEmpty>No member found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((u) => (
                <CommandItem
                  key={u.id}
                  value={u.id}
                  onSelect={() => onSelect(u)}
                  className="w-full py-2.5 px-3 cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="flex flex-1 min-w-0 justify-between items-center gap-2">
                    <span className="font-medium text-foreground truncate min-w-0">
                      {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email}
                    </span>
                    {getSupportiveText ? (
                      <span className="text-muted-foreground text-sm shrink-0">
                        {getSupportiveText(u)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm truncate min-w-0">{u.email}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </div>
  )
}
