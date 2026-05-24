"use client"

import * as React from "react"
import { Plus, Trash2, Loader2 } from "lucide-react"
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
import { ModalWindow } from "./modal-window"
import { ParticipantsCard } from "./participants-card"
import { AddMemberOverlay } from "./add-member-overlay"
import type { User } from "@/lib/types"

// =============================================================================
// TYPES (Figma node 233-32423 — post-production-tool)
// =============================================================================

/** Individual shown as ParticipantsCard variant="individual" (noba user or photographer). */
export interface ParticipantsModalIndividual {
  /** Display name */
  name: string
  email?: string
  phone?: string
  imageUrl?: string
  initials?: string
  /** Role label above card: "owner" | "collaborator" (noba), "photographer" (main players). */
  roleLabel?: string
}

/** Entity shown as ParticipantsCard variant="entity". */
export interface ParticipantsModalEntity {
  /** Entity display name */
  entityName: string
  /** Responsible: user(s) with edit permission; if multiple, "UserName + N more". Displayed as "Responsible:" in the card. */
  managerName?: string
  /** Total members count. Displayed as "Total members:" in the card. */
  teamMembersCount?: number
  imageUrl?: string
  /** Entity type label above card: e.g. "Client", "Photo Lab", "Hand Print Lab", "Agency", "Retouch studio". */
  entityTypeLabel?: string
}

/** Team member row in the "My team" section (entity admin view). */
export interface ParticipantsModalMyTeamMember {
  id: string
  name: string
  email: string
  editPermission: boolean
}

export interface ParticipantsModalMyTeam {
  canManage: boolean
  entityHandle: string
  members: ParticipantsModalMyTeamMember[]
}

export interface ParticipantsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Modal title (Figma) */
  title?: string
  /** Modal subtitle (Figma) */
  subtitle?: string
  /** When true (noba / is_internal=TRUE), show action bar with primary "Edit participants"; when false, no action bar */
  isInternalUser?: boolean
  /** Primary action label in footer (only when isInternalUser) */
  primaryLabel?: string
  /** Secondary action label in footer */
  secondaryLabel?: string
  /** Show primary button */
  showPrimary?: boolean
  /** Show secondary button */
  showSecondary?: boolean
  onPrimaryClick?: () => void
  onSecondaryClick?: () => void
  /** Entity admin: team members from the viewer's entity invited to this collection */
  myTeam?: ParticipantsModalMyTeam
  /** Pool of team users for the Add new overlay (same player, not yet in collection) */
  availableTeamUsers?: User[]
  onAddMyTeamMember?: (userId: string) => void | Promise<void>
  onRemoveMyTeamMember?: (userId: string) => void | Promise<void>
  onMyTeamEditPermissionChange?: (userId: string, value: boolean) => void | Promise<void>
  /** Noba team: internal users (is_internal=TRUE), each as individual card */
  nobaTeam?: ParticipantsModalIndividual[]
  /** Main players: photographer + others as individuals; rest grouped by entity */
  mainPlayersIndividuals?: ParticipantsModalIndividual[]
  /** Main players: entities (each one entity card with manager + team count) */
  mainPlayersEntities?: ParticipantsModalEntity[]
  className?: string
}

// =============================================================================
// HELPERS
// =============================================================================

function toTitleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Participants Modal — Figma post-production-tool node 233-32423.
 * Uses ModalWindow; scrollable content has sections:
 * - My team (entity admins): table with Name, Email, Edit permission + Add new.
 * - Noba team: internal users as ParticipantsCard individual.
 * - Main players: individuals (e.g. photographer) + entity cards.
 */
export function ParticipantsModal({
  open,
  onOpenChange,
  isInternalUser = false,
  title = "Participants",
  subtitle = "Get always at a hand the information of the main players in this collection and the support of our team.",
  primaryLabel = "Edit participants",
  secondaryLabel = "Close",
  showPrimary,
  showSecondary,
  onPrimaryClick,
  onSecondaryClick,
  myTeam,
  availableTeamUsers = [],
  onAddMyTeamMember,
  onRemoveMyTeamMember,
  onMyTeamEditPermissionChange,
  nobaTeam = [],
  mainPlayersIndividuals = [],
  mainPlayersEntities = [],
  className,
}: ParticipantsModalProps) {
  const [addMemberOpen, setAddMemberOpen] = React.useState(false)
  const [isAddingMyTeamMember, setIsAddingMyTeamMember] = React.useState(false)
  const addMemberOpenRef = React.useRef(false)

  React.useEffect(() => {
    addMemberOpenRef.current = addMemberOpen
  }, [addMemberOpen])

  const showActionBar = isInternalUser
  const showPrimaryButton = showActionBar && (showPrimary ?? true)
  const showSecondaryButton = showActionBar && (showSecondary ?? false)
  const showMyTeamSection = Boolean(myTeam)
  const canManageMyTeam = myTeam?.canManage === true
  const myTeamMembers = myTeam?.members ?? []
  const existingMyTeamIds = React.useMemo(
    () => new Set(myTeamMembers.map((m) => m.id)),
    [myTeamMembers]
  )

  React.useEffect(() => {
    if (!open) {
      setAddMemberOpen(false)
      setIsAddingMyTeamMember(false)
    }
  }, [open])

  const handleParticipantsOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && (addMemberOpenRef.current || isAddingMyTeamMember)) return
      onOpenChange(nextOpen)
    },
    [isAddingMyTeamMember, onOpenChange]
  )

  const handleAddSelect = React.useCallback(
    async (user: User) => {
      if (!onAddMyTeamMember) return
      setIsAddingMyTeamMember(true)
      try {
        await onAddMyTeamMember(user.id)
      } finally {
        setIsAddingMyTeamMember(false)
      }
    },
    [onAddMyTeamMember]
  )

  return (
    <ModalWindow
      open={open}
      onOpenChange={handleParticipantsOpenChange}
      dismissible={!addMemberOpen && !isAddingMyTeamMember}
      title={title}
      subtitle={subtitle}
      showSubtitle={!!subtitle}
      showPrimary={showPrimaryButton}
      showSecondary={showSecondaryButton}
      primaryLabel={primaryLabel}
      secondaryLabel={secondaryLabel}
      onPrimaryClick={onPrimaryClick}
      onSecondaryClick={onSecondaryClick}
      className={className}
    >
        <div className="flex flex-col gap-6 px-5 pb-5">
          {/* My team — entity admin (Figma: top section with table + Add new) */}
          {showMyTeamSection && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 min-h-10">
                <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-1 min-w-0">
                  <span className="shrink-0">My team</span>
                  <span className="text-lime-500 truncate">
                    @{myTeam?.entityHandle ?? "team"}
                  </span>
                </h3>
                {canManageMyTeam && (
                  <Button
                    size="default"
                    className="h-10 px-4 rounded-xl gap-2 shrink-0"
                    onClick={() => setAddMemberOpen(true)}
                    disabled={isAddingMyTeamMember}
                  >
                    <Plus className="size-4" />
                    Add new
                  </Button>
                )}
              </div>
              {myTeamMembers.length === 0 && !isAddingMyTeamMember ? (
                <p className="text-sm text-muted-foreground">
                  No team members invited to this collection yet.
                </p>
              ) : myTeamMembers.length > 0 ? (
                <div className="border border-border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="bg-sidebar h-12">Name</TableHead>
                        <TableHead className="bg-sidebar h-12">Email</TableHead>
                        <TableHead className="bg-sidebar h-12">Edit permission</TableHead>
                        {canManageMyTeam && (
                          <TableHead className="bg-sidebar h-12 w-[85px]" />
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myTeamMembers.map((member) => (
                        <TableRow key={member.id} className="h-[52px]">
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell className="text-muted-foreground truncate max-w-[160px]">
                            {member.email}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={member.editPermission}
                              disabled={!canManageMyTeam || isAddingMyTeamMember}
                              onCheckedChange={(checked) =>
                                void onMyTeamEditPermissionChange?.(member.id, checked)
                              }
                            />
                          </TableCell>
                          {canManageMyTeam && (
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10"
                                disabled={isAddingMyTeamMember}
                                onClick={() => void onRemoveMyTeamMember?.(member.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
              {isAddingMyTeamMember && (
                <div
                  className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="size-4 animate-spin shrink-0" aria-hidden />
                  Adding team member…
                </div>
              )}
            </section>
          )}

          {/* Noba team */}
          <section className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold text-card-foreground">
              Noba team
            </h3>
            <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(237px,1fr))]">
              {nobaTeam.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No internal users in this collection.
                </p>
              ) : (
                nobaTeam.map((user, i) => (
                  <div key={`noba-${i}-${user.name}`} className="flex flex-col gap-3">
                    <span className="text-xs font-medium text-muted-foreground">
                      {toTitleCase(user.roleLabel ?? "Collaborator")}
                    </span>
                    <ParticipantsCard
                      variant="individual"
                      title={user.name}
                      initials={user.initials}
                      imageUrl={user.imageUrl}
                      email={user.email}
                      phone={user.phone}
                    />
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Main players — variant "all": show all players (Participants modal) */}
          <section className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold text-card-foreground">
              Main players
            </h3>
            <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(237px,1fr))]">
              {mainPlayersIndividuals.map((user, i) => {
                const isPhotographer = (user.roleLabel ?? "").toLowerCase() === "photographer"
                return (
                  <div key={`main-ind-${i}-${user.name}`} className="flex flex-col gap-3">
                    <span className="text-xs font-medium text-muted-foreground">
                      {toTitleCase(user.roleLabel ?? "Photographer")}
                    </span>
                    <ParticipantsCard
                      variant="individual"
                      title={user.name}
                      initials={user.initials}
                      imageUrl={user.imageUrl}
                      email={user.email}
                      phone={user.phone}
                      hideContactInfo={isPhotographer}
                    />
                  </div>
                )
              })}
              {mainPlayersEntities.map((entity, i) => (
                <div key={`main-ent-${i}-${entity.entityName}`} className="flex flex-col gap-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    {toTitleCase(entity.entityTypeLabel ?? "Entity")}
                  </span>
                  <ParticipantsCard
                    variant="entity"
                    title={entity.entityName}
                    imageUrl={entity.imageUrl}
                    managerName={entity.managerName}
                    teamMembersCount={entity.teamMembersCount}
                  />
                </div>
              ))}
              {mainPlayersIndividuals.length === 0 && mainPlayersEntities.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No main players in this collection.
                </p>
              )}
            </div>
          </section>
        </div>

        {canManageMyTeam && (
          <AddMemberOverlay
            open={addMemberOpen}
            onOpenChange={setAddMemberOpen}
            users={availableTeamUsers}
            existingIds={existingMyTeamIds}
            onSelect={handleAddSelect}
            portaled={false}
          />
        )}
      </ModalWindow>
  )
}
