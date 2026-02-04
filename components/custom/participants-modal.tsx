"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ModalWindow } from "./modal-window"
import { ParticipantsCard } from "./participants-card"

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
}

/** Entity shown as ParticipantsCard variant="entity". */
export interface ParticipantsModalEntity {
  /** Entity display name */
  entityName: string
  managerName?: string
  teamMembersCount?: number
  imageUrl?: string
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
  /** Noba team: internal users (is_internal=TRUE), each as individual card */
  nobaTeam?: ParticipantsModalIndividual[]
  /** Main players: photographer + others as individuals; rest grouped by entity */
  mainPlayersIndividuals?: ParticipantsModalIndividual[]
  /** Main players: entities (each one entity card with manager + team count) */
  mainPlayersEntities?: ParticipantsModalEntity[]
  className?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Participants Modal — Figma post-production-tool node 233-32423.
 * Uses ModalWindow; scrollable content has two sections:
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
  nobaTeam = [],
  mainPlayersIndividuals = [],
  mainPlayersEntities = [],
  className,
}: ParticipantsModalProps) {
  const showActionBar = isInternalUser
  const showPrimaryButton = showActionBar && (showPrimary ?? true)
  const showSecondaryButton = showActionBar && (showSecondary ?? false)

  return (
    <ModalWindow
      open={open}
      onOpenChange={onOpenChange}
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
                <ParticipantsCard
                  key={`noba-${i}-${user.name}`}
                  variant="individual"
                  title={user.name}
                  initials={user.initials}
                  imageUrl={user.imageUrl}
                  email={user.email}
                  phone={user.phone}
                />
              ))
            )}
          </div>
        </section>

        {/* Main players */}
        <section className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold text-card-foreground">
            Main players
          </h3>
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(237px,1fr))]">
            {mainPlayersIndividuals.map((user, i) => (
              <ParticipantsCard
                key={`main-ind-${i}-${user.name}`}
                variant="individual"
                title={user.name}
                initials={user.initials}
                imageUrl={user.imageUrl}
                email={user.email}
                phone={user.phone}
              />
            ))}
            {mainPlayersEntities.map((entity, i) => (
              <ParticipantsCard
                key={`main-ent-${i}-${entity.entityName}`}
                variant="entity"
                title={entity.entityName}
                imageUrl={entity.imageUrl}
                managerName={entity.managerName}
                teamMembersCount={entity.teamMembersCount}
              />
            ))}
            {mainPlayersIndividuals.length === 0 && mainPlayersEntities.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No main players in this collection.
              </p>
            )}
          </div>
        </section>
      </div>
    </ModalWindow>
  )
}
