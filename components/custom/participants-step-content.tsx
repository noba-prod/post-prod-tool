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
import { mapFormToUpdateUserPayload } from "@/lib/utils/form-mappers"
import { NOBA_ORGANIZATION_ID } from "@/lib/services"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { useUserContext } from "@/lib/contexts/user-context"
import type {
  CollectionDraft,
  CollectionConfig,
  CollectionParticipant,
  ParticipantRole,
} from "@/lib/domain/collections"
import type { EntityType } from "@/lib/types"
import type { User } from "@/lib/types"
import type { Entity } from "@/lib/types"
import { UserCreationForm, type UserFormData } from "./user-creation-form"
import type { Organization, OrganizationType, Profile } from "@/lib/supabase/database.types"

// ============================================================================
// SUPABASE HELPERS
// ============================================================================

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return Boolean(
    url && !url.includes("placeholder") && url.startsWith("https://") &&
    key && !key.includes("placeholder") && key.length > 20
  )
}

/** Map domain entity type to Supabase organization type(s) */
function entityTypeToOrgTypes(entityType: EntityType): OrganizationType[] {
  const mapping: Record<EntityType, OrganizationType[]> = {
    noba: ["noba"],
    client: ["client"],
    "self-photographer": ["self_photographer"],
    agency: ["photography_agency"],
    "photo-lab": ["photo_lab"],
    "hand-print-lab": ["handprint_lab"],
    "edition-studio": ["retouch_studio"],
  }
  return mapping[entityType] ?? []
}

/** Map Supabase organization type to domain entity type */
function orgTypeToEntityType(orgType: OrganizationType): EntityType {
  const mapping: Partial<Record<OrganizationType, EntityType>> = {
    noba: "noba",
    client: "client",
    self_photographer: "self-photographer",
    photography_agency: "agency",
    photo_lab: "photo-lab",
    handprint_lab: "hand-print-lab",
    retouch_studio: "edition-studio",
  }
  return mapping[orgType] ?? "client"
}

async function fetchOrganizationsByType(orgTypes: OrganizationType[]): Promise<Entity[]> {
  // Handle empty array - return empty result
  if (!orgTypes.length) {
    return []
  }
  
  const supabase = createClient()
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase
      .from("organizations") as any)
      .select("id, name, type")
      .in("type", orgTypes)
      .order("name")
    if (error) {
      console.error("[ParticipantsStepContent] Failed to fetch organizations:", error?.message ?? error)
      return []
    }
    return (data ?? []).map((org: Organization) => ({
      id: org.id,
      name: org.name,
      type: orgTypeToEntityType(org.type),
    } as Entity))
  } catch (err) {
    console.error("[ParticipantsStepContent] Exception fetching organizations:", err)
    return []
  }
}

function formatPhoneFromProfile(p: { phone?: string | null; prefix?: string | null }): string {
  const prefix = (p.prefix ?? "").trim()
  const phone = (p.phone ?? "").trim()
  if (!phone) return ""
  return prefix ? `${prefix} ${phone}` : phone
}

async function fetchUsersByOrganization(organizationId: string): Promise<User[]> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("profiles") as any)
    .select("id, email, first_name, last_name, organization_id, phone, prefix")
    .eq("organization_id", organizationId)
    .order("first_name")
  if (error) {
    console.error("[ParticipantsStepContent] Failed to fetch users:", error)
    return []
  }
  return (data ?? []).map((p: Profile & { phone?: string | null; prefix?: string | null }) => ({
    id: p.id,
    email: p.email ?? "",
    firstName: p.first_name ?? "",
    lastName: p.last_name ?? "",
    phoneNumber: formatPhoneFromProfile(p),
    entityId: p.organization_id ?? undefined,
    role: (p as { role?: string }).role ?? "viewer",
  } as User))
}

async function fetchUserById(userId: string): Promise<User | null> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("profiles") as any)
    .select("id, email, first_name, last_name, organization_id, phone, prefix")
    .eq("id", userId)
    .single()
  if (error) {
    console.error("[ParticipantsStepContent] Failed to fetch user:", error)
    return null
  }
  const p = data as (Profile & { phone?: string | null; prefix?: string | null }) | null
  if (!p) return null
  return {
    id: p.id,
    email: p.email ?? "",
    firstName: p.first_name ?? "",
    lastName: p.last_name ?? "",
    phoneNumber: formatPhoneFromProfile(p),
    entityId: p.organization_id ?? undefined,
    role: (p as { role?: string }).role ?? "viewer",
  } as User
}

const ROLE_LABELS: Record<ParticipantRole, string> = {
  producer: "Producer",
  client: "Client",
  photographer: "Photographer",
  agency: "Agency",
  photo_lab: "Photo Lab",
  handprint_lab: "Hand Print Lab",
  retouch_studio: "Retouch/Post Studio",
}

const ROLE_ENTITY_TYPES: Record<Exclude<ParticipantRole, "producer">, EntityType> = {
  client: "client",
  photographer: "self-photographer",
  agency: "agency",
  photo_lab: "photo-lab",
  handprint_lab: "hand-print-lab",
  retouch_studio: "edition-studio",
}

export interface ParticipantsStepContentProps {
  draft: CollectionDraft
  onParticipantsChange: (participants: CollectionParticipant[]) => void
  /** Called when config is updated (e.g. nobaUserIds for noba* section). */
  onConfigChange?: (patch: Partial<CollectionConfig>) => void
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
  onConfigChange,
  className,
}: ParticipantsStepContentProps) {
  const config = draft.config
  const participants = draft.participants
  
  // Track the draft's updatedAt to detect when server data has actually changed
  // We only sync from props when the server has confirmed new data (new updatedAt)
  const lastSyncedAtRef = React.useRef<string | undefined>(undefined)
  const participantsRef = React.useRef(participants)
  
  // Sync ref with props ONLY when draft has actually been updated on the server
  // This prevents overwriting local changes with stale props during async updates
  if (draft.updatedAt !== lastSyncedAtRef.current) {
    participantsRef.current = participants
    lastSyncedAtRef.current = draft.updatedAt
  }

  const sections = React.useMemo((): { role: Exclude<ParticipantRole, "producer">; prefilled: boolean }[] => {
    const out: { role: Exclude<ParticipantRole, "producer">; prefilled: boolean }[] = [
      { role: "client", prefilled: true },
      { role: "photographer", prefilled: false },
    ]
    // When hasAgency: separate Agency section (Select agency + Add agency users). Photographer section = self-photographer only.
    if (config.hasAgency) out.push({ role: "agency", prefilled: false })
    // Lab only in handprint workflow; digital-only has no lab (collections-logic)
    if (config.hasHandprint) out.push({ role: "photo_lab", prefilled: false })
    // Hand print lab only for Analog (HP) when it is a different lab than low-res. Analog (HR) uses photo_lab for conversions.
    if (config.hasHandprint && config.handprintVariant === "hp" && config.handprintIsDifferentLab) out.push({ role: "handprint_lab", prefilled: false })
    if (config.hasEditionStudio) out.push({ role: "retouch_studio", prefilled: false })
    return out
  }, [config.hasAgency, config.hasHandprint, config.handprintVariant, config.handprintIsDifferentLab, config.hasEditionStudio])

  const setParticipant = React.useCallback(
    (role: ParticipantRole, update: Partial<CollectionParticipant> | null) => {
      // Use ref to get the latest participants, avoiding stale closure
      const current = participantsRef.current
      const next = [...current]
      const idx = next.findIndex((p) => p.role === role)
      if (update === null) {
        if (idx >= 0) next.splice(idx, 1)
      } else if (idx >= 0) {
        next[idx] = { ...next[idx], ...update }
      } else {
        next.push({ role, ...update } as CollectionParticipant)
      }
      // Update the ref immediately for any subsequent rapid calls
      participantsRef.current = next
      onParticipantsChange(next)
    },
    [onParticipantsChange]
  )

  const setEntityId = React.useCallback(
    (role: Exclude<ParticipantRole, "producer">, entityId: string) => {
      const current = participantsRef.current
      const p = getParticipantByRole(current, role)
      setParticipant(role, {
        entityId: entityId || undefined,
        userIds: entityId ? (p?.userIds ?? []) : [],
        editPermissionByUserId: entityId ? (p?.editPermissionByUserId ?? {}) : undefined,
      })
    },
    [setParticipant]
  )

  const addMember = React.useCallback(
    (role: ParticipantRole, userId: string, entityIdForNew?: string) => {
      const current = participantsRef.current
      const p = getParticipantByRole(current, role)
      const entityId =
        entityIdForNew ??
        p?.entityId ??
        (role === "client" ? config.clientEntityId : undefined)
      const base = p ?? { role, userIds: [] as string[], editPermissionByUserId: {} as Record<string, boolean> }
      const nextUserIds = [...(base.userIds ?? []), userId]
      const nextEdit = { ...(base.editPermissionByUserId ?? {}), [userId]: true }
      setParticipant(role, { ...base, entityId, userIds: nextUserIds, editPermissionByUserId: nextEdit })
    },
    [setParticipant, config.clientEntityId]
  )

  const removeMember = React.useCallback(
    (role: ParticipantRole, userId: string) => {
      const current = participantsRef.current
      const p = getParticipantByRole(current, role)
      if (!p?.userIds?.length) return
      const nextUserIds = p.userIds.filter((id) => id !== userId)
      const nextEdit = { ...(p.editPermissionByUserId ?? {}) }
      delete nextEdit[userId]
      setParticipant(role, { ...p, userIds: nextUserIds, editPermissionByUserId: nextEdit })
    },
    [setParticipant]
  )

  const setEditPermission = React.useCallback(
    (role: ParticipantRole, userId: string, value: boolean) => {
      const current = participantsRef.current
      const p = getParticipantByRole(current, role)
      if (!p) return
      const nextEdit = { ...(p.editPermissionByUserId ?? {}), [userId]: value }
      setParticipant(role, { ...p, editPermissionByUserId: nextEdit })
    },
    [setParticipant]
  )

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <NobaSection
        draft={draft}
        onConfigChange={onConfigChange}
      />
      {sections.map(({ role, prefilled }) => {
        const label =
          role === "photo_lab" &&
          config.hasHandprint &&
          config.handprintIsDifferentLab === false
            ? "Photo lab & Handprint"
            : ROLE_LABELS[role]
        return (
          <ParticipantSection
            key={role}
            role={role}
            label={label}
            draft={draft}
            prefilled={prefilled}
            onEntitySelect={(entityId) => setEntityId(role, entityId)}
            onAddMember={(userId, entityIdForNew) => addMember(role, userId, entityIdForNew)}
            onRemoveMember={(userId, roleOverride) =>
              removeMember(roleOverride ?? role, userId)
            }
            onEditPermissionChange={(userId, value, roleOverride) =>
              setEditPermission(roleOverride ?? role, userId, value)
            }
          />
        )
      })}
    </div>
  )
}

// =============================================================================
// NOBA* SECTION — Owner (current user) + noba members with Edit permission
// =============================================================================

/** Fetches noba producer team members (organization_id = NOBA_ORGANIZATION_ID AND is_internal = true) for the New member overlay. */
function useInternalUsers(): User[] {
  const [users, setUsers] = React.useState<User[]>([])
  React.useEffect(() => {
    let cancelled = false
    fetch("/api/organizations", { method: "GET", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data: {
          organizations?: Array<{ id: string; name: string; type: string }>
          profiles?: Array<{
            id: string
            first_name: string | null
            last_name: string | null
            email?: string | null
            organization_id: string | null
            is_internal?: boolean
          }>
        } | null) => {
          if (cancelled || !data?.profiles) return
          const nobaTeam = data.profiles.filter(
            (p) =>
              p.organization_id === NOBA_ORGANIZATION_ID && p.is_internal === true
          )
          setUsers(
            nobaTeam.map((p) => ({
              id: p.id,
              firstName: p.first_name ?? "",
              lastName: p.last_name ?? undefined,
              email: p.email ?? "",
              phoneNumber: "",
              entityId: p.organization_id ?? "",
              role: "viewer" as const,
            }))
          )
        }
      )
    return () => {
      cancelled = true
    }
  }, [])
  return users
}

interface NobaSectionProps {
  draft: CollectionDraft
  onConfigChange?: (patch: Partial<CollectionConfig>) => void
}

function NobaSection({ draft, onConfigChange }: NobaSectionProps) {
  const { user: currentUser } = useUserContext()
  const config = draft.config
  const [addOpen, setAddOpen] = React.useState(false)
  const [editingUserId, setEditingUserId] = React.useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = React.useState(0)
  const ownerId = config.ownerUserId ?? currentUser?.id ?? ""
  const extraIds = config.nobaUserIds ?? []
  const nobaUserIds = React.useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    if (ownerId && !seen.has(ownerId)) {
      seen.add(ownerId)
      out.push(ownerId)
    }
    for (const id of extraIds) {
      if (!seen.has(id)) {
        seen.add(id)
        out.push(id)
      }
    }
    return out
  }, [ownerId, extraIds])
  const usersById = useUsersByIds(nobaUserIds, refreshTrigger)
  const memberUsers = React.useMemo(
    () =>
      nobaUserIds
        .map((id) => usersById.get(id))
        .filter((u): u is User => u != null),
    [nobaUserIds, usersById]
  )
  const internalUsers = useInternalUsers()

  const handleAdd = React.useCallback(
    (u: User) => {
      if (!onConfigChange) return
      const next = [...(config.nobaUserIds ?? []), u.id].filter((id) => id !== ownerId)
      onConfigChange({
        nobaUserIds: next,
        nobaEditPermissionByUserId: { ...(config.nobaEditPermissionByUserId ?? {}), [u.id]: true },
      })
      setAddOpen(false)
    },
    [onConfigChange, config.nobaUserIds, config.nobaEditPermissionByUserId, ownerId]
  )

  const handleRemove = React.useCallback(
    (userId: string) => {
      if (!onConfigChange || userId === ownerId) return
      const next = (config.nobaUserIds ?? []).filter((id) => id !== userId)
      const nextEdit = { ...(config.nobaEditPermissionByUserId ?? {}) }
      delete nextEdit[userId]
      onConfigChange({ nobaUserIds: next, nobaEditPermissionByUserId: nextEdit })
    },
    [onConfigChange, config.nobaUserIds, config.nobaEditPermissionByUserId, ownerId]
  )

  const handleEditUser = React.useCallback((userId: string) => {
    setEditingUserId(userId)
  }, [])

  const handleCloseEditUserModal = React.useCallback(() => {
    setEditingUserId(null)
  }, [])

  const handleUpdateUser = React.useCallback(
    async (userData: UserFormData) => {
      if (!editingUserId) return
      try {
        let profilePictureUrl: string | null | undefined
        if (userData.profilePicture) {
          const formData = new FormData()
          formData.append("file", userData.profilePicture)
          const uploadRes = await fetch(`/api/users/${editingUserId}/profile-picture`, {
            method: "POST",
            body: formData,
          })
          const uploadData = await uploadRes.json().catch(() => ({}))
          if (!uploadRes.ok) throw new Error(uploadData.error ?? "Failed to upload profile picture")
          profilePictureUrl = uploadData.profilePictureUrl
        } else if (userData.profilePictureRemoved) {
          profilePictureUrl = null
        }
        const payload = mapFormToUpdateUserPayload(userData, profilePictureUrl)
        const res = await fetch(`/api/users/${editingUserId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error ?? "Failed to update user")
        setEditingUserId(null)
        setRefreshTrigger((prev) => prev + 1)
        toast.success("User updated successfully", {
          description: `${userData.firstName} ${userData.lastName || ""}`.trim() + " has been updated.",
        })
      } catch (error) {
        console.error("Failed to update user:", error)
        toast.error("Failed to update user", {
          description: error instanceof Error ? error.message : "An unexpected error occurred.",
        })
      }
    },
    [editingUserId]
  )

  return (
    <div className="flex flex-col gap-4 p-4 bg-background border border-border rounded-xl w-full min-w-0 overflow-hidden">
      <div className="flex min-w-0 w-full flex-row items-center justify-between gap-3">
        <span className="text-base font-semibold text-foreground min-w-0 flex-1 max-[759px]:truncate">
          noba*
        </span>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => setAddOpen(true)}
          className="h-10 shrink-0 gap-2 rounded-xl max-[759px]:size-10 max-[759px]:p-0 max-[759px]:gap-0"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span className="max-[759px]:sr-only min-[760px]:inline">Add user</span>
        </Button>
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
                  <TableCell
                    className="font-medium cursor-pointer hover:bg-muted/50"
                    onClick={() => handleEditUser(u.id)}
                  >
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
                      checked
                      disabled
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    {u.id === ownerId ? (
                      <span className="cursor-not-allowed">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled
                          className="h-10 text-muted-foreground"
                        >
                          owner
                        </Button>
                      </span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(u.id)}
                        className="h-10 w-10"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <AddMemberOverlay
        open={addOpen}
        onOpenChange={setAddOpen}
        users={internalUsers}
        existingIds={new Set(nobaUserIds)}
        onSelect={handleAdd}
      />

      {editingUserId && (
        <UserCreationForm
          open={Boolean(editingUserId)}
          onOpenChange={(open) => !open && handleCloseEditUserModal()}
          mode="edit"
          entity={{ type: "noba", name: "noba*" }}
          initialUserData={memberUsers.find((u) => u.id === editingUserId)}
          onSubmit={handleUpdateUser}
          onCancel={handleCloseEditUserModal}
        />
      )}
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
  /** roleOverride: when showing producer in Client section, pass "producer" so the correct participant is updated */
  onRemoveMember: (userId: string, roleOverride?: ParticipantRole) => void
  /** roleOverride: when showing producer in Client section, pass "producer" so edit permission is applied to producer */
  onEditPermissionChange: (userId: string, value: boolean, roleOverride?: ParticipantRole) => void
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
  const [editingUserId, setEditingUserId] = React.useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = React.useState(0)
  const config = draft.config
  const participant = getParticipantByRole(draft.participants, role)
  const entityId = effectiveEntityId(participant, role, draft.config)
  const isPhotographerNoAgency = role === "photographer" && !config.hasAgency
  const isPhotographerWithAgency = role === "photographer" && config.hasAgency
  const isAgencySection = role === "agency"

  // Photographer (no agency): self-photographer only. Photographer (with agency): self-photographer only in this section. Agency section: agency entity + agency users.
  const effectiveEntityType: EntityType | EntityType[] =
    isAgencySection
      ? "agency"
      : role === "photographer"
        ? (isPhotographerWithAgency ? "self-photographer" : ["agency", "self-photographer"])
        : ROLE_ENTITY_TYPES[role]

  const { entities, users, usersById } = useParticipantData(entityId, effectiveEntityType)
  const selfPhotographerUsers = useUsersFromAllEntitiesOfType(
    role === "photographer" ? "self-photographer" : null
  )
  const usersForAddMember = React.useMemo(() => {
    if (isPhotographerNoAgency) return selfPhotographerUsers
    if (isPhotographerWithAgency) return selfPhotographerUsers
    if (isAgencySection) return users
    return users
  }, [isPhotographerNoAgency, isPhotographerWithAgency, isAgencySection, users, selfPhotographerUsers])

  // Client section shows only client members (role='manager' in DB).
  // Producer/noba* members are shown separately in NobaSection.
  // Deduplicate so the same user is never shown twice in one section
  const memberUserIds = React.useMemo(() => {
    const ids = participant?.userIds ?? []
    return Array.from(new Set(ids))
  }, [participant?.userIds])

  const editByUserId = React.useMemo(() => {
    return participant?.editPermissionByUserId ?? {}
  }, [participant?.editPermissionByUserId])

  /** For Client section: which participant "owns" this userId (so edit/remove update the right one) */
  const memberSourceRole = React.useMemo((): Record<string, ParticipantRole> => {
    if (role !== "client") return {}
    const out: Record<string, ParticipantRole> = {}
    for (const id of participant?.userIds ?? []) out[id] = "client"
    return out
  }, [role, participant?.userIds])

  const usersByIdsResolved = useUsersByIds(memberUserIds, refreshTrigger)
  const memberUsersRaw = React.useMemo(
    () =>
      memberUserIds
        .map((id) => usersById.get(id) ?? usersByIdsResolved.get(id))
        .filter((u): u is User => u != null),
    [memberUserIds, usersById, usersByIdsResolved]
  )
  // Photographer (with agency): show only self-photographer users. Agency section: show only users from selected agency. Dedupe by id.
  const memberUsers = React.useMemo(() => {
    let list: User[]
    if (isPhotographerWithAgency) {
      list = memberUsersRaw.filter((u) => selfPhotographerUsers.some((s) => s.id === u.id))
    } else if (isAgencySection) {
      if (!entityId) list = []
      else list = memberUsersRaw.filter((u) => u.entityId === entityId)
    } else {
      list = memberUsersRaw
    }
    return Array.from(new Map(list.map((u) => [u.id, u])).values())
  }, [isPhotographerWithAgency, isAgencySection, entityId, memberUsersRaw, selfPhotographerUsers])

  const entityOptions = React.useMemo(
    () => entities.map((e) => ({ value: e.id, label: e.name })),
    [entities]
  )

  const showEntityPicker = isAgencySection || role !== "photographer"
  const addButtonLabel = role === "photographer" ? "Add photographer" : "Add user"
  const isPhotographerSection = role === "photographer"
  const addPhotographerDisabled = isPhotographerSection && memberUsers.length >= 1
  const pickerPlaceholder = isAgencySection ? "Select agency" : `Select ${label.toLowerCase()}`

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

  const handleEditUser = React.useCallback((userId: string) => {
    setEditingUserId(userId)
  }, [])

  const handleCloseEditUserModal = React.useCallback(() => {
    setEditingUserId(null)
  }, [])

  const handleUpdateUser = React.useCallback(
    async (userData: UserFormData) => {
      if (!editingUserId) return
      try {
        let profilePictureUrl: string | null | undefined
        if (userData.profilePicture) {
          const formData = new FormData()
          formData.append("file", userData.profilePicture)
          const uploadRes = await fetch(`/api/users/${editingUserId}/profile-picture`, {
            method: "POST",
            body: formData,
          })
          const uploadData = await uploadRes.json().catch(() => ({}))
          if (!uploadRes.ok) throw new Error(uploadData.error ?? "Failed to upload profile picture")
          profilePictureUrl = uploadData.profilePictureUrl
        } else if (userData.profilePictureRemoved) {
          profilePictureUrl = null
        }
        const payload = mapFormToUpdateUserPayload(userData, profilePictureUrl)
        const res = await fetch(`/api/users/${editingUserId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error ?? "Failed to update user")
        setEditingUserId(null)
        setRefreshTrigger((prev) => prev + 1)
        toast.success("User updated successfully", {
          description: `${userData.firstName} ${userData.lastName || ""}`.trim() + " has been updated.",
        })
      } catch (error) {
        console.error("Failed to update user:", error)
        toast.error("Failed to update user", {
          description: error instanceof Error ? error.message : "An unexpected error occurred.",
        })
      }
    },
    [editingUserId]
  )

  const editEntity = React.useMemo((): { type: EntityType; name: string } | undefined => {
    if (entityId) {
      const e = entities.find((ent) => ent.id === entityId)
      if (e) return { type: e.type, name: e.name }
    }
    const fallback: Record<Exclude<ParticipantRole, "producer">, { type: EntityType; name: string }> = {
      client: { type: "client", name: "Client" },
      photographer: { type: "self-photographer", name: "Photographer" },
      agency: { type: "agency", name: "Agency" },
      photo_lab: { type: "photo-lab", name: "Photo Lab" },
      handprint_lab: { type: "hand-print-lab", name: "Hand Print Lab" },
      retouch_studio: { type: "edition-studio", name: "Retouch/Post Studio" },
    }
    return fallback[role]
  }, [entityId, entities, role])

  // Edit permission: all participants can have their edit permission toggled.
  // When can_edit = true the user can interact with milestone actions
  // (upload links, add comments, trigger missing-photos, etc.).

  const optionPickerClassName = cn(
    "min-[760px]:w-[224px] min-[760px]:min-w-[224px] min-[760px]:shrink-0",
    "max-[759px]:w-fit max-[759px]:min-w-0 max-[759px]:max-w-full max-[759px]:[&_button]:w-auto max-[759px]:[&_button]:min-w-0 max-[759px]:[&_button]:max-w-full"
  )

  const addMemberButtonClassName =
    "h-10 shrink-0 gap-2 rounded-xl max-[759px]:size-10 max-[759px]:p-0 max-[759px]:gap-0"

  return (
    <div className="flex flex-col gap-4 p-4 bg-background border border-border rounded-xl w-full min-w-0 overflow-hidden">
      <div className="flex min-w-0 w-full flex-row items-center justify-between gap-2 min-[760px]:gap-4">
        <span className="text-base font-semibold text-foreground min-w-0 flex-1 max-[759px]:truncate">
          {label}
        </span>
        <div className="flex min-w-0 shrink-0 flex-row items-center gap-2 min-[760px]:gap-3">
          {showEntityPicker && (
            <OptionPicker
              label=""
              value={entityId}
              onValueChange={onEntitySelect}
              placeholder={pickerPlaceholder}
              options={entityOptions}
              disabled={prefilled}
              className={optionPickerClassName}
            />
          )}
          {(isPhotographerNoAgency || isPhotographerWithAgency) ? (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setAddMemberOpen(true)}
              disabled={addPhotographerDisabled}
              className={addMemberButtonClassName}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="max-[759px]:sr-only min-[760px]:inline">{addButtonLabel}</span>
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setAddMemberOpen(true)}
              disabled={!entityId}
              className={addMemberButtonClassName}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="max-[759px]:sr-only min-[760px]:inline">{addButtonLabel}</span>
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
                  <TableCell
                    className="font-medium cursor-pointer hover:bg-muted/50"
                    onClick={() => handleEditUser(u.id)}
                  >
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
                      checked={isPhotographerSection ? true : !!editByUserId[u.id]}
                      disabled={isPhotographerSection}
                      onCheckedChange={(v) =>
                        onEditPermissionChange(u.id, !!v, memberSourceRole[u.id])
                      }
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveMember(u.id, memberSourceRole[u.id])}
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
      {editingUserId && (
        <UserCreationForm
          open={Boolean(editingUserId)}
          onOpenChange={(open) => !open && handleCloseEditUserModal()}
          mode="edit"
          entity={editEntity}
          initialUserData={memberUsers.find((u) => u.id === editingUserId)}
          onSubmit={handleUpdateUser}
          onCancel={handleCloseEditUserModal}
        />
      )}
      <AddMemberOverlay
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
        users={usersForAddMember}
        existingIds={new Set(memberUsers.map((u) => u.id))}
        onSelect={handleOverlaySelect}
        getSupportiveText={
          isPhotographerNoAgency || isPhotographerWithAgency
            ? () => "Photographer"
            : isAgencySection && entityId
              ? () => entities.find((e) => e.id === entityId)?.name ?? "Agency"
              : undefined
        }
      />
    </div>
  )
}

function useParticipantData(entityId: string, entityType: EntityType | EntityType[]) {
  const [entities, setEntities] = React.useState<Entity[]>([])
  const [users, setUsers] = React.useState<User[]>([])
  const usersById = React.useMemo(() => new Map(users.map((u) => [u.id, u])), [users])
  const entityTypeKey = Array.isArray(entityType) ? entityType.join(",") : entityType

  React.useEffect(() => {
    let cancelled = false
    const types = Array.isArray(entityType) ? entityType : [entityType]
    
    const load = async () => {
      if (isSupabaseConfigured()) {
        const orgTypes = types.flatMap((t) => entityTypeToOrgTypes(t))
        const fetched = await fetchOrganizationsByType(orgTypes)
        if (cancelled) return
        setEntities(fetched)
      } else {
        const res = await fetch("/api/organizations", { cache: "no-store" })
        if (!res.ok) {
          setEntities([])
          return
        }
        const data = await res.json().catch(() => null) as { organizations?: Array<{ id: string; name: string; type: string }> } | null
        const orgTypes = types.flatMap((t) => entityTypeToOrgTypes(t))
        const filtered = (data?.organizations ?? []).filter((org) => orgTypes.includes(org.type as OrganizationType))
        if (cancelled) return
        setEntities(filtered.map((org) => ({ id: org.id, name: org.name, type: orgTypeToEntityType(org.type as OrganizationType) } as Entity)))
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [entityTypeKey])

  React.useEffect(() => {
    if (!entityId) {
      setUsers([])
      return
    }
    let cancelled = false

    const load = async () => {
      if (isSupabaseConfigured()) {
        const fetched = await fetchUsersByOrganization(entityId)
        if (cancelled) return
        setUsers(fetched)
      } else {
        const res = await fetch(`/api/organizations/${entityId}`)
        if (!res.ok) {
          setUsers([])
          return
        }
        const data = await res.json().catch(() => null) as { teamMembers?: Array<{ id: string; firstName?: string; lastName?: string; email?: string; phoneNumber?: string; role?: string; entityId?: string }> } | null
        const list = (data?.teamMembers ?? []).map((u) => ({
          id: u.id,
          firstName: u.firstName ?? "",
          lastName: u.lastName ?? undefined,
          email: u.email ?? "",
          phoneNumber: u.phoneNumber ?? "",
          entityId: u.entityId ?? "",
          role: (u.role as User["role"]) ?? "viewer",
        } as User))
        if (cancelled) return
        setUsers(list)
      }
    }
    load()
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
    
    const load = async () => {
      if (isSupabaseConfigured()) {
        const orgTypes = entityTypeToOrgTypes(entityType)
        const entities = await fetchOrganizationsByType(orgTypes)
        if (cancelled) return
        const lists = await Promise.all(
          entities.map((e) => fetchUsersByOrganization(e.id))
        )
        if (cancelled) return
        const byId = new Map<string, User>()
        for (const list of lists) {
          for (const u of list) byId.set(u.id, u)
        }
        setUsers(Array.from(byId.values()))
      } else {
        const res = await fetch("/api/organizations", { cache: "no-store" })
        if (!res.ok) {
          setUsers([])
          return
        }
        const data = await res.json().catch(() => null) as { organizations?: Array<{ id: string; type: string }> } | null
        const orgTypes = entityTypeToOrgTypes(entityType)
        const entities = (data?.organizations ?? []).filter((org) => orgTypes.includes(org.type as OrganizationType))
        if (cancelled) return
        const memberResList = await Promise.all(entities.map((e) => fetch(`/api/organizations/${e.id}`).then((r) => (r.ok ? r.json() : null))))
        if (cancelled) return
        const byId = new Map<string, User>()
        for (const memberData of memberResList) {
          const teamMembers = (memberData as { teamMembers?: User[] })?.teamMembers ?? []
          for (const u of teamMembers) byId.set(u.id, u)
        }
        setUsers(Array.from(byId.values()))
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [entityType])

  return users
}

function useUsersByIds(userIds: string[], refreshTrigger?: unknown): Map<string, User> {
  const [byId, setById] = React.useState<Map<string, User>>(new Map())
  const idsKey = userIds.join(",")

  React.useEffect(() => {
    if (!userIds.length) {
      setById(new Map())
      return
    }
    let cancelled = false
    
    const load = async () => {
      if (isSupabaseConfigured()) {
        const results = await Promise.all(userIds.map((id) => fetchUserById(id)))
        if (cancelled) return
        const map = new Map<string, User>()
        results.forEach((u) => {
          if (u) map.set(u.id, u)
        })
        setById(map)
      } else {
        const results = await Promise.all(
          userIds.map((id) =>
            fetch(`/api/users/${id}`).then((r) => (r.ok ? r.json() : null)).then((data: { user?: User } | null) => data?.user ?? null)
          )
        )
        if (cancelled) return
        const map = new Map<string, User>()
        results.forEach((u) => {
          if (u) map.set(u.id, u)
        })
        setById(map)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [idsKey, refreshTrigger])

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
