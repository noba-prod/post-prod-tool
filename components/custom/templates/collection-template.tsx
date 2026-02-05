"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { NavBar } from "../nav-bar"
import { CollectionHeading } from "../collection-heading"
import { CollectionStepper } from "../collection-stepper"
import { ModalWindow } from "../modal-window"
import {
  ParticipantsModal,
  type ParticipantsModalIndividual,
  type ParticipantsModalEntity,
} from "../participants-modal"
import { Titles } from "../titles"
import { StageStatusTag, TimeStampTag, DateIndicatorTag } from "../tag"
import { StepDetails } from "../step-details"
import { ParticipantsCard } from "../participants-card"
import { UserCreationForm, type UserFormData } from "../user-creation-form"
import { EntityBasicInformationForm } from "../entity-basic-information-form"
import { useUserContext } from "@/lib/contexts/user-context"
import { useNavigationConfig } from "@/lib/hooks/use-navigation-config"
import { useAuthAdapter } from "@/lib/auth"
import { toast } from "sonner"
import { SearchCommand } from "../search-command"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { mapEntityToFormData, mapFormToEntityDraft, mapFormToUpdateUserPayload } from "@/lib/utils/form-mappers"
import type { EntityBasicInformationFormData } from "@/lib/utils/form-mappers"
import { entityRequiresLocation, isStandardEntityType } from "@/lib/types"
import { updateOrganizationFromDraft } from "@/app/actions/entity-creation"

// =============================================================================
// STEP CONFIGURATION (aligned with collections-logic.md §10)
// =============================================================================

export type CollectionStepStatus = "locked" | "active" | "completed"

export interface CollectionTemplateStep {
  id: string
  title: string
  status: CollectionStepStatus
  stageStatus?: "upcoming" | "in-progress" | "in-transit" | "done" | "delivered"
  timeStampStatus?: "on-track" | "on-time" | "delayed" | "at-risk"
  deadlineLabel?: string
  deadlineDate?: string
  deadlineTime?: string
  /** When true, step is not part of this collection type (greyed out in UI). */
  inactive?: boolean
  /** Optional contextual note (e.g. "by different HP lab", "No shipping details"). */
  annotation?: string
  /** When true, step requires attention (e.g. red exclamation). */
  attention?: boolean
  /** When true, current user has edit rights for this step (OWNER mode); otherwise VIEWER (collections-logic §8). */
  canEdit?: boolean
}

export type CollectionStageStatus = "upcoming" | "in-progress" | "in-transit" | "done" | "delivered"

// =============================================================================
// NAV BAR CONFIG
// =============================================================================

interface NavBarConfig {
  variant?: "noba" | "collaborator" | "photographer"
  userName?: string
  organization?: string
  role?: string
  isAdmin?: boolean
  avatarSrc?: string
}

// =============================================================================
// PROPS
// =============================================================================

export interface CollectionTemplateProps {
  /** Collection name (CollectionHeading main) */
  collectionName?: string
  /** Client name, e.g. @zara (CollectionHeading main) */
  clientName?: string
  /** Progress 0–100 (CollectionHeading main) */
  progress?: number
  /** Stage status tag (CollectionHeading main) */
  stageStatus?: CollectionStageStatus
  /** Shooting type: Digital or Handprint (tag to the left of photographer) */
  shootingType?: "digital" | "handprint"
  /** Photographer name (CollectionHeading main) */
  photographerName?: string
  /** Show photographer name tag */
  showPhotographerName?: boolean
  /** Show Participants button */
  showParticipantsButton?: boolean
  /** Show Settings button */
  showSettingsButton?: boolean
  /** Callback when Participants is clicked */
  onParticipants?: () => void
  /** Callback when Settings is clicked */
  onSettings?: () => void
  /** Collection id (required for Settings → redirect to create mode) */
  collectionId?: string
  /** Steps to render (from collection configuration) */
  steps?: CollectionTemplateStep[]
  /** Participants modal: noba team (is_internal=TRUE), each as individual card */
  participantsNobaTeam?: ParticipantsModalIndividual[]
  /** Participants modal: main players as individuals (e.g. photographer) */
  participantsMainPlayersIndividuals?: ParticipantsModalIndividual[]
  /** Participants modal: main players as entities */
  participantsMainPlayersEntities?: ParticipantsModalEntity[]
  /** NavBar props when no UserContext */
  navBarProps?: NavBarConfig
  className?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Collection Template (View Mode)
 *
 * Template for viewing a published collection. Matches Figma layout node-id 456-42579.
 *
 * Structure:
 * - NavBar (fixed; dynamic per user)
 * - Content:
 *   - CollectionHeading (fixed): collection name, client, progress, status, CTAs
 *   - Stepper area (scrollable only): vertical list of CollectionStepper items
 *
 * Each step can open a ModalWindow with contextual step information.
 * Step modal content is left as placeholder; real content comes from product.
 */
export function CollectionTemplate({
  collectionName = "Kids Summer'25",
  clientName = "@zara",
  progress = 42,
  stageStatus = "in-progress",
  shootingType,
  photographerName,
  showPhotographerName = false,
  showParticipantsButton = true,
  showSettingsButton = true,
  onParticipants,
  onSettings,
  collectionId,
  steps = [],
  participantsNobaTeam,
  participantsMainPlayersIndividuals,
  participantsMainPlayersEntities,
  navBarProps,
  className,
}: CollectionTemplateProps) {
  const router = useRouter()
  const authAdapter = useAuthAdapter()

  const userContext = useUserContext()
  const navConfig = useNavigationConfig(userContext.entity?.type ?? null)

  const [isSearchOpen, setIsSearchOpen] = React.useState(false)
  const [openStepId, setOpenStepId] = React.useState<string | null>(null)
  const [participantsModalOpen, setParticipantsModalOpen] = React.useState(false)
  const [editCollectionDialogOpen, setEditCollectionDialogOpen] = React.useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false)
  const [isUpdatingProfile, setIsUpdatingProfile] = React.useState(false)
  const [isCompanyModalOpen, setIsCompanyModalOpen] = React.useState(false)
  const [isUpdatingCompany, setIsUpdatingCompany] = React.useState(false)
  const [companyFormData, setCompanyFormData] = React.useState<EntityBasicInformationFormData | null>(null)
  const [isCompanyFormValid, setIsCompanyFormValid] = React.useState(false)

  const effectiveShowSettingsButton =
    showSettingsButton && (userContext?.isNobaUser ?? false)

  const handleLogout = React.useCallback(async () => {
    try {
      await authAdapter.logout()
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("session-changed"))
      }
      router.push("/auth/login")
    } catch (err) {
      console.error("Logout error:", err)
      router.push("/auth/login")
    }
  }, [authAdapter, router])

  const handleEditProfile = React.useCallback(() => {
    setIsProfileModalOpen(true)
  }, [])

  const handleEditCompany = React.useCallback(() => {
    if (userContext?.entity && isStandardEntityType(userContext.entity.type)) {
      const formData = mapEntityToFormData(userContext.entity)
      setCompanyFormData(formData)
      setIsCompanyModalOpen(true)
    }
  }, [userContext?.entity])

  const handleCompanyFormDataChange = React.useCallback((data: EntityBasicInformationFormData) => {
    setCompanyFormData(data)
  }, [])

  const handleCompanyFormValidationChange = React.useCallback((isValid: boolean) => {
    setIsCompanyFormValid(isValid)
  }, [])

  const handleCompanyUpdate = React.useCallback(async () => {
    if (!userContext?.entity || !companyFormData || !isCompanyFormValid) {
      toast.error("Please fill in all required fields")
      return
    }
    setIsUpdatingCompany(true)
    try {
      const draft = mapFormToEntityDraft(companyFormData)
      await updateOrganizationFromDraft(userContext.entity.id, draft)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("session-changed"))
      }
      setIsCompanyModalOpen(false)
      toast.success("Company details updated successfully", {
        description: "Your company information has been updated.",
      })
    } catch (error) {
      console.error("Failed to update company details:", error)
      toast.error("Failed to update company details", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsUpdatingCompany(false)
    }
  }, [userContext?.entity, companyFormData, isCompanyFormValid])

  const handleProfileUpdate = React.useCallback(async (userData: UserFormData) => {
    if (!userContext?.user) {
      toast.error("User information not available")
      return
    }
    setIsUpdatingProfile(true)
    try {
      let profilePictureUrl: string | undefined
      if (userData.profilePicture) {
        const formData = new FormData()
        formData.append("file", userData.profilePicture)
        const uploadRes = await fetch(`/api/users/${userContext.user.id}/profile-picture`, {
          method: "POST",
          body: formData,
        })
        const uploadData = await uploadRes.json().catch(() => ({}))
        if (!uploadRes.ok) throw new Error(uploadData.error ?? "Failed to upload profile picture")
        profilePictureUrl = uploadData.profilePictureUrl
      }
      const payload = mapFormToUpdateUserPayload(userData, profilePictureUrl)
      const res = await fetch(`/api/users/${userContext.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Failed to update user")
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("session-changed"))
      }
      setIsProfileModalOpen(false)
      toast.success("Profile updated successfully", {
        description: "Your profile information has been updated.",
      })
    } catch (error) {
      console.error("Failed to update profile:", error)
      toast.error("Failed to update profile", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsUpdatingProfile(false)
    }
  }, [userContext?.user])

  const variant =
    userContext?.navBarVariant ??
    navConfig?.navBarVariant ??
    navBarProps?.variant ??
    "noba"
  const userName = React.useMemo(() => {
    if (userContext?.user) {
      const first = (userContext.user.firstName || "").trim()
      const last = (userContext.user.lastName || "").trim()
      if (first && last) return `${first} ${last}`
      if (first) return first
      if (last) return last
      return userContext.user.email?.split("@")[0] || "User"
    }
    return navBarProps?.userName ?? "User"
  }, [userContext?.user?.firstName, userContext?.user?.lastName, userContext?.user?.email, navBarProps?.userName])
  const organization = userContext?.entity?.name ?? navBarProps?.organization
  const role = userContext?.user?.role ?? navBarProps?.role ?? "admin"
  const isAdmin = role?.toLowerCase() === "admin"

  const visibleSteps = React.useMemo(
    () => steps.filter((step) => !step.inactive),
    [steps]
  )
  const openStep = React.useMemo(
    () => steps.find((s) => s.id === openStepId) ?? null,
    [steps, openStepId]
  )

  return (
    <div
      className={cn(
        "flex flex-col h-screen w-full bg-background text-foreground overflow-hidden",
        className
      )}
    >
      <NavBar
        variant={variant}
        userName={userName}
        organization={organization}
        role={role}
        isAdmin={isAdmin}
        isSelfPhotographer={userContext?.isSelfPhotographer ?? false}
        avatarSrc={userContext?.user?.profilePictureUrl || navBarProps?.avatarSrc}
        onSearch={() => setIsSearchOpen(true)}
        onEditProfile={handleEditProfile}
        onEditCompany={handleEditCompany}
        onLogout={handleLogout}
      />

      <div className="flex flex-1 flex-col min-h-0">
        <div className="shrink-0 px-6 pt-6">
          <CollectionHeading
            type="main"
            collectionName={collectionName}
            clientName={clientName}
            progress={progress}
            stageStatus={stageStatus}
            showStageStatus
            shootingType={shootingType}
            photographerName={photographerName}
            showPhotographerName={showPhotographerName}
            showParticipantsButton={showParticipantsButton}
            showSettingsButton={effectiveShowSettingsButton}
            onParticipants={() => {
              onParticipants?.()
              setParticipantsModalOpen(true)
            }}
            onSettings={() => {
              onSettings?.()
              setEditCollectionDialogOpen(true)
            }}
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-6 pt-4 pb-8">
          <div className="flex flex-col gap-0 w-full">
            {visibleSteps.map((step, index) => (
              <CollectionStepper
                key={step.id}
                status={step.status}
                title={step.title}
                stageStatus={step.stageStatus ?? "in-progress"}
                timeStampStatus={step.timeStampStatus ?? "on-track"}
                deadlineLabel={step.deadlineLabel ?? "Deadline:"}
                deadlineDate={step.deadlineDate ?? "Dec 4, 2025"}
                deadlineTime={step.deadlineTime ?? "End of day (5:00pm)"}
                onStepClick={() => setOpenStepId(step.id)}
                showExpandButton
                isFirst={index === 0}
                isLast={index === visibleSteps.length - 1}
              />
            ))}
          </div>
        </div>
      </div>

      <ModalWindow
        open={openStepId !== null}
        onOpenChange={(open) => !open && setOpenStepId(null)}
        title={openStep?.title ?? "Step"}
        headerContent={
          openStep ? (
            <div className="flex flex-col gap-2 w-full min-w-0">
              <Titles
                type="form"
                title={openStep.title}
                showSubtitle={false}
                className="min-w-0"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <StageStatusTag
                  status={(openStep.stageStatus ?? "in-progress") as "upcoming" | "in-progress" | "in-transit" | "done" | "delivered"}
                />
                <TimeStampTag
                  status={(openStep.timeStampStatus ?? "on-track") as "on-track" | "on-time" | "delayed" | "at-risk"}
                />
                <DateIndicatorTag
                  label={openStep.deadlineLabel ?? "Deadline:"}
                  date={openStep.deadlineDate ?? "—"}
                  time={openStep.deadlineTime ?? "End of day (5:00pm)"}
                />
              </div>
            </div>
          ) : undefined
        }
        showPrimary={openStep?.canEdit ?? false}
        showSecondary={true}
        primaryLabel={openStep?.canEdit ? "Actions" : undefined}
        secondaryLabel="Close"
        onPrimaryClick={
          openStep?.canEdit && collectionId
            ? () => router.push(`/collections/create/${collectionId}`)
            : undefined
        }
        onSecondaryClick={() => setOpenStepId(null)}
      >
        <div className="px-5 pb-5 flex flex-col gap-6">
          {openStep && (
            <>
              <StepDetails
                variant="primary"
                mainTitle={openStep.title}
                subtitle={
                  openStep.canEdit
                    ? "You can edit and perform actions in this step."
                    : "You can view this step only; edits and downloads are not available."
                }
                onAction={
                  openStep.canEdit && collectionId
                    ? () => router.push(`/collections/create/${collectionId}`)
                    : undefined
                }
              />
              {/* Noba team */}
              <section className="flex flex-col gap-3">
                <h3 className="text-lg font-semibold text-card-foreground">
                  Noba team
                </h3>
                <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(237px,1fr))]">
                  {(participantsNobaTeam ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No internal users in this collection.
                    </p>
                  ) : (
                    (participantsNobaTeam ?? []).map((user, i) => (
                      <div key={`step-noba-${i}-${user.name}`} className="flex flex-col gap-3">
                        <span className="text-xs font-medium text-muted-foreground">
                          {(user.roleLabel ?? "Collaborator").replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())}
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
              {/* Main players */}
              <section className="flex flex-col gap-3">
                <h3 className="text-lg font-semibold text-card-foreground">
                  Main players
                </h3>
                <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(237px,1fr))]">
                  {(participantsMainPlayersIndividuals ?? []).map((user, i) => (
                    <div key={`step-main-ind-${i}-${user.name}`} className="flex flex-col gap-3">
                      <span className="text-xs font-medium text-muted-foreground">
                        {(user.roleLabel ?? "Photographer").replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())}
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
                  ))}
                  {(participantsMainPlayersEntities ?? []).map((entity, i) => (
                    <div key={`step-main-ent-${i}-${entity.entityName}`} className="flex flex-col gap-3">
                      <span className="text-xs font-medium text-muted-foreground">
                        {(entity.entityTypeLabel ?? "Entity").replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())}
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
                  {(participantsMainPlayersIndividuals ?? []).length === 0 && (participantsMainPlayersEntities ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No main players in this collection.
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </ModalWindow>

      <ParticipantsModal
        open={participantsModalOpen}
        onOpenChange={setParticipantsModalOpen}
        isInternalUser={userContext?.isNobaUser ?? false}
        nobaTeam={participantsNobaTeam}
        mainPlayersIndividuals={participantsMainPlayersIndividuals}
        mainPlayersEntities={participantsMainPlayersEntities}
        onPrimaryClick={() => {
          setParticipantsModalOpen(false)
          if (collectionId) {
            router.push(`/collections/create/${collectionId}?step=participants`)
          }
        }}
        onSecondaryClick={() => setParticipantsModalOpen(false)}
      />

      <Dialog open={editCollectionDialogOpen} onOpenChange={setEditCollectionDialogOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Edit collection details</DialogTitle>
            <DialogDescription>
              Editing participants or changing deadlines may affect the final publishing date. Confirm deadlines before doing any modification.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton={false} className="sm:justify-start">
            <Button
              onClick={() => {
                if (collectionId) {
                  router.push(`/collections/create/${collectionId}`)
                }
                setEditCollectionDialogOpen(false)
              }}
              disabled={!collectionId}
            >
              Edit collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {userContext?.user && userContext?.entity && (
        <UserCreationForm
          open={isProfileModalOpen}
          onOpenChange={(open) => {
            if (!open) setIsProfileModalOpen(false)
          }}
          mode="edit"
          initialUserData={userContext.user}
          entity={{
            type: userContext.entity.type,
            name: userContext.entity.name,
          }}
          isAdminUser={false}
          onSubmit={handleProfileUpdate}
          onCancel={() => setIsProfileModalOpen(false)}
          primaryLabel="Save changes"
          secondaryLabel="Cancel"
        />
      )}

      {userContext?.entity && companyFormData && isStandardEntityType(userContext.entity.type) && (
        <ModalWindow
          open={isCompanyModalOpen}
          onOpenChange={(open) => {
            if (!open) setIsCompanyModalOpen(false)
          }}
          title="Edit Company Details"
          subtitle="Update your company's basic information"
          primaryLabel="Save changes"
          secondaryLabel="Cancel"
          showSecondary={true}
          primaryDisabled={!isCompanyFormValid || isUpdatingCompany}
          onPrimaryClick={handleCompanyUpdate}
          onSecondaryClick={() => setIsCompanyModalOpen(false)}
          width="644px"
        >
          <div className="p-5">
            <EntityBasicInformationForm
              entityType={userContext.entity.type}
              initialData={companyFormData}
              showLocation={entityRequiresLocation(userContext.entity.type)}
              disabled={isUpdatingCompany}
              onDataChange={handleCompanyFormDataChange}
              onValidationChange={handleCompanyFormValidationChange}
            />
          </div>
        </ModalWindow>
      )}

      {isSearchOpen && (
        <SearchCommand
          open={isSearchOpen}
          onOpenChange={setIsSearchOpen}
        />
      )}
    </div>
  )
}
