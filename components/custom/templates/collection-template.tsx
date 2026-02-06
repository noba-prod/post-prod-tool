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

/**
 * Main players variant "mainContextual": returns the subset of players to show in the step modal.
 * Dynamic per step (e.g. shooting → Photographer + Client only; other steps can be extended later).
 */
function getMainContextualPlayers(
  stepId: string | undefined,
  individuals: ParticipantsModalIndividual[],
  entities: ParticipantsModalEntity[]
): { individuals: ParticipantsModalIndividual[]; entities: ParticipantsModalEntity[] } {
  if (!stepId) return { individuals, entities }
  if (stepId === "shooting") {
    return {
      individuals: individuals.filter((u) => (u.roleLabel ?? "").toLowerCase() === "photographer"),
      entities: entities.filter((e) => (e.entityTypeLabel ?? "").toLowerCase() === "client"),
    }
  }
  if (stepId === "negatives_dropoff" || stepId === "low_res_scanning") {
    return {
      individuals: individuals.filter((u) => (u.roleLabel ?? "").toLowerCase() === "photographer"),
      entities: entities.filter((e) => (e.entityTypeLabel ?? "").toLowerCase() === "photo lab"),
    }
  }
  if (stepId === "photographer_selection") {
    return {
      individuals: individuals.filter((u) => (u.roleLabel ?? "").toLowerCase() === "photographer"),
      entities: entities.filter((e) => (e.entityTypeLabel ?? "").toLowerCase() === "photo lab"),
    }
  }
  return { individuals, entities }
}

/** Format time for display: strip seconds when value is HH:mm:ss; leave presets (e.g. "morning") as-is. */
function formatTimeNoSeconds(time?: string): string {
  if (!time?.trim()) return "—"
  const t = time.trim()
  const match = t.match(/^(\d{1,2}:\d{2})(:\d{2})?$/)
  if (match) return match[1]!
  return t
}

/** Build "Time: date · time" for StepDetails additionalInfo; time without seconds when numeric. */
function formatTimeLabel(date?: string, time?: string): string {
  const d = date?.trim() || "—"
  const t = formatTimeNoSeconds(time)
  if (d === "—" && t === "—") return "Time: —"
  if (d === "—") return `Time: ${t}`
  if (t === "—") return `Time: ${d}`
  return `Time: ${d} · ${t}`
}

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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { mapEntityToFormData, mapFormToEntityDraft, mapFormToUpdateUserPayload } from "@/lib/utils/form-mappers"
import type { EntityBasicInformationFormData } from "@/lib/utils/form-mappers"
import { entityRequiresLocation, isStandardEntityType } from "@/lib/types"
import { updateOrganizationFromDraft } from "@/app/actions/entity-creation"
import { InformativeToast } from "@/components/custom/informative-toast"

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
  /** Step 1 (Shooting) only: shooting location for modal card and Google Maps link */
  shootingStreetAddress?: string
  shootingCity?: string
  shootingZipCode?: string
  shootingCountry?: string
  /** Step 2 (Negatives drop-off) only: drop-off shipping for modal (Tracking shipping card + Delivery blocks) */
  dropoffShippingCarrier?: string
  dropoffShippingTracking?: string
  dropoffShippingOriginAddress?: string
  dropoffShippingDate?: string
  dropoffShippingTime?: string
  dropoffShippingDestinationAddress?: string
  dropoffDeliveryDate?: string
  dropoffDeliveryTime?: string
  /** Called when owner confirms pickup (Shooting step). Closes modal, updates stepper/progress, sends notification to Photo lab. */
  onConfirmPickup?: (stepId: string) => void | Promise<void>
  /** Called when owner confirms delivery (Negatives drop-off step). Pass canMeetDeadline from dialog Yes/No. */
  onConfirmDropoffDelivery?: (stepId: string, canMeetDeadline: boolean) => void | Promise<void>
  /** Called when owner uploads low-res (step 3). Payload: url (required), notes (optional). Marks step completed, notifies producer + photographer. */
  onUploadLowRes?: (payload: { url: string; notes?: string }) => void | Promise<void>
  /** Upload low-res dialog: show shipping reminder only when handprint lab is different from original (configured in collection creation). */
  uploadLowResShowShippingReminder?: boolean
  /** Upload low-res dialog: initial notes (e.g. from collection.lowResLabNotes) to pre-fill when opening. */
  uploadLowResInitialNotes?: string
  /** Step 4 (Photographer selection): URL of uploaded low-res photos (link in primary card). */
  lowResSelectionUrl?: string
  /** Upload low-res dialog: shipping reminder — delivery date (ISO), time, and handprint lab destination. */
  uploadLowResShippingReminderDate?: string
  uploadLowResShippingReminderTime?: string
  uploadLowResShippingReminderDestination?: string
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
  shootingStreetAddress,
  shootingCity,
  shootingZipCode,
  shootingCountry,
  dropoffShippingCarrier,
  dropoffShippingTracking,
  dropoffShippingOriginAddress,
  dropoffShippingDate,
  dropoffShippingTime,
  dropoffShippingDestinationAddress,
  dropoffDeliveryDate,
  dropoffDeliveryTime,
  onConfirmPickup,
  onConfirmDropoffDelivery,
  onUploadLowRes,
  uploadLowResShowShippingReminder,
  uploadLowResInitialNotes,
  lowResSelectionUrl,
  uploadLowResShippingReminderDate,
  uploadLowResShippingReminderTime,
  uploadLowResShippingReminderDestination,
  navBarProps,
  className,
}: CollectionTemplateProps) {
  const router = useRouter()
  const authAdapter = useAuthAdapter()

  const userContext = useUserContext()
  const navConfig = useNavigationConfig(userContext.entity?.type ?? null)

  const [isSearchOpen, setIsSearchOpen] = React.useState(false)
  const [openStepId, setOpenStepId] = React.useState<string | null>(null)
  const [confirmDropoffDialogOpen, setConfirmDropoffDialogOpen] = React.useState(false)
  const [uploadLowResDialogOpen, setUploadLowResDialogOpen] = React.useState(false)
  const [uploadLowResUrl, setUploadLowResUrl] = React.useState("")
  const [uploadLowResNotes, setUploadLowResNotes] = React.useState("")
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
        showPrimary={false}
        showSecondary={false}
      >
        <div className="px-5 pb-5 flex flex-col gap-6">
          {openStep && (
            <>
              {openStep.id === "shooting" ? (
                <StepDetails
                  variant="primary"
                  mainTitle="Location"
                  subtitle={[shootingStreetAddress, shootingCity].filter(Boolean).join(", ") || undefined}
                  additionalInfo={[shootingZipCode, shootingCountry].filter(Boolean).join(", ") || undefined}
                  backgroundImage="/assets/bg-shooting.png"
                  makeCardClickable={true}
                  onAction={() => {
                    const query = [shootingStreetAddress, shootingCity, shootingZipCode, shootingCountry]
                      .filter(Boolean)
                      .join(", ")
                    if (query) {
                      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
                      window.open(url, "_blank", "noopener,noreferrer")
                    }
                  }}
                />
              ) : openStep.id === "negatives_dropoff" ? (
                <>
                  <StepDetails
                    variant="primary"
                    mainTitle="Tracking shipping"
                    subtitle={
                      dropoffShippingCarrier?.trim() ? (
                        <>
                          Provider:{" "}
                          <span className="text-lime-400">@{dropoffShippingCarrier.trim()}</span>
                        </>
                      ) : (
                        "Provider: —"
                      )
                    }
                    additionalInfo={
                      dropoffShippingTracking?.trim()
                        ? `Tracking ID: ${dropoffShippingTracking.trim()}`
                        : "Tracking ID: —"
                    }
                    backgroundImage="/assets/bg-tracking.png"
                    onAction={
                      openStep.canEdit && collectionId
                        ? () => router.push(`/collections/create/${collectionId}`)
                        : undefined
                    }
                  />
                  <div className="flex flex-row gap-4 w-full">
                    <StepDetails
                      variant="secondary"
                      mainTitle="Pick up details"
                      subtitle={`Origin: ${[shootingStreetAddress, shootingZipCode, shootingCity, shootingCountry].filter(Boolean).join(" ") || "—"}`}
                      additionalInfo={formatTimeLabel(dropoffShippingDate, dropoffShippingTime)}
                      hideActionButton
                      hugContent
                      truncateSubtitle
                      className="min-w-0 flex-1"
                    />
                    <StepDetails
                      variant="secondary"
                      mainTitle="Delivery"
                      subtitle={`Destination: ${dropoffShippingDestinationAddress?.trim() || "—"}`}
                      additionalInfo={formatTimeLabel(dropoffDeliveryDate, dropoffDeliveryTime)}
                      hideActionButton
                      hugContent
                      truncateSubtitle
                      className="min-w-0 flex-1"
                    />
                  </div>
                  {openStep.canEdit && (
                    <section
                      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-5 py-10 shadow-xl ring-offset-2 ring-offset-lime-500"
                      aria-label="Step owner action"
                    >
                      <p className="text-center text-base font-semibold text-foreground">
                        Has the drop-off been delivered?
                      </p>
                      <Button
                        type="button"
                        variant="default"
                        size="lg"
                        className="w-fit rounded-xl"
                        onClick={() => setConfirmDropoffDialogOpen(true)}
                      >
                        Confirm delivery
                      </Button>
                    </section>
                  )}
                </>
              ) : openStep.id === "low_res_scanning" ? (
                <>
                  <StepDetails
                    variant="primary"
                    mainTitle='Negatives scanning to "low-res"'
                    subtitle="Lab has to digitize negatives to low-res and share with photographer."
                    additionalInfo={
                      (() => {
                        const photoLab = (participantsMainPlayersEntities ?? []).find((e) => (e.entityTypeLabel ?? "").toLowerCase() === "photo lab")
                        const handprintLab = (participantsMainPlayersEntities ?? []).find(
                          (e) =>
                            (e.entityTypeLabel ?? "").toLowerCase().includes("handprint") ||
                            (e.entityTypeLabel ?? "").toLowerCase().includes("hand print")
                        )
                        const photoLabName = photoLab?.entityName ?? "—"
                        const handprintLabName = handprintLab?.entityName ?? "—"
                        return (
                          <>
                            High resolution conversion will be done later by different lab.
                            {uploadLowResShowShippingReminder && (
                              <>
                                {" "}
                                After this step, shipping of negatives must be scheduled by{" "}
                                <span className="text-lime-400">@{photoLabName}</span> to{" "}
                                <span className="text-lime-400">@{handprintLabName}</span>
                              </>
                            )}
                          </>
                        )
                      })()
                    }
                    backgroundImage="/assets/bg-lowres.png"
                    hideActionButton
                    onAction={
                      openStep.canEdit && collectionId
                        ? () => router.push(`/collections/create/${collectionId}`)
                        : undefined
                    }
                  />
                  {openStep.canEdit && (
                    <section
                      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-5 py-10 shadow-xl ring-offset-2 ring-offset-lime-500"
                      aria-label="Step owner action"
                    >
                      <p className="text-center text-base font-semibold text-foreground">
                        Already have the low-res scanned?
                      </p>
                      <Button
                        type="button"
                        variant="default"
                        size="lg"
                        className="w-fit rounded-xl"
                        onClick={() => setUploadLowResDialogOpen(true)}
                      >
                        Upload low-res
                      </Button>
                    </section>
                  )}
                </>
              ) : openStep.id === "photographer_selection" ? (
                <div className="flex flex-col gap-5 w-full">
                  <div className="flex flex-row gap-5 w-full min-w-0">
                    <StepDetails
                      variant="primary"
                      mainTitle="Selection for client"
                      subtitle="Photographer has to do a selection of photos to share with client."
                      backgroundImage="/assets/bg-selection.png"
                      hideActionButton
                      className="min-w-0 flex-1"
                    />
                    <StepDetails
                      variant="primary"
                      mainTitle="Low-res photos"
                      subtitle={
                        (() => {
                          const photoLab = (participantsMainPlayersEntities ?? []).find(
                            (e) => (e.entityTypeLabel ?? "").toLowerCase() === "photo lab"
                          )
                          const name = photoLab?.entityName ?? "—"
                          return (
                            <>
                              Uploaded by <span className="text-lime-400">@{name}</span>
                            </>
                          )
                        })()
                      }
                      additionalInfo={lowResSelectionUrl ? "View link" : "Not uploaded yet"}
                      backgroundImage="/assets/bg-lowres.png"
                      makeCardClickable={!!lowResSelectionUrl}
                      onAction={
                        lowResSelectionUrl
                          ? () => window.open(lowResSelectionUrl, "_blank", "noopener,noreferrer")
                          : undefined
                      }
                      className="min-w-0 flex-1"
                    />
                  </div>
                  <StepDetails
                    variant="notes"
                    mainTitle="Notes from lab"
                    entityName="lab"
                    additionalInfo={uploadLowResInitialNotes?.trim() || "—"}
                  />
                  {openStep.canEdit && (
                    <section
                      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-5 py-10 shadow-xl ring-offset-2 ring-offset-lime-500"
                      aria-label="Step owner action"
                    >
                      <p className="text-center text-base font-semibold text-foreground">
                        Already have the selection?
                      </p>
                      <Button
                        type="button"
                        variant="default"
                        size="lg"
                        className="w-fit rounded-xl"
                        onClick={() => {
                          if (collectionId) router.push(`/collections/create/${collectionId}`)
                          setOpenStepId(null)
                        }}
                      >
                        Already have the selection?
                      </Button>
                    </section>
                  )}
                  <StepDetails
                    variant="missingPhotos"
                    mainTitle="Missing photos?"
                    entityName={
                      (participantsMainPlayersEntities ?? []).find(
                        (e) => (e.entityTypeLabel ?? "").toLowerCase() === "photo lab"
                      )?.entityName ?? "photo lab"
                    }
                    onAction={
                      openStep.canEdit && collectionId
                        ? () => router.push(`/collections/create/${collectionId}`)
                        : undefined
                  }
                  />
                </div>
              ) : (
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
              )}
              {/* Owner-only action block (Confirm pickup) — Shooting step only; closes modal, toast, updates stepper/progress, notifies Photo lab */}
              {openStep.canEdit && openStep.id === "shooting" && (
                <section
                  className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-5 py-10 shadow-xl ring-offset-2 ring-offset-lime-500"
                  aria-label="Step owner action"
                >
                  <p className="text-center text-base font-semibold text-foreground">
                    Have the negatives been collected?
                  </p>
                  <Button
                    type="button"
                    variant="default"
                    size="lg"
                    className="w-fit rounded-xl"
                    onClick={async () => {
                      await onConfirmPickup?.("shooting")
                      setOpenStepId(null)
                      toast.success("Pickup confirmed.")
                    }}
                  >
                    Confirm pickup
                  </Button>
                </section>
              )}
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
              {/* Main players — variant "mainContextual": per-step subset (e.g. step shooting → Photographer + Client only) */}
              {(() => {
                const { individuals: mainIndividuals, entities: mainEntities } = getMainContextualPlayers(
                  openStep?.id,
                  participantsMainPlayersIndividuals ?? [],
                  participantsMainPlayersEntities ?? []
                )
                const isLowResStep = openStep?.id === "low_res_scanning"
                const renderEntity = (entity: (typeof mainEntities)[number], i: number) => (
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
                )
                const renderIndividual = (user: (typeof mainIndividuals)[number], i: number) => (
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
                )
                return (
                  <section className="flex flex-col gap-3">
                    <h3 className="text-lg font-semibold text-card-foreground">
                      Main players
                    </h3>
                    <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(237px,1fr))]">
                      {isLowResStep
                        ? mainEntities.map((entity, i) => renderEntity(entity, i))
                        : mainIndividuals.map((user, i) => renderIndividual(user, i))}
                      {isLowResStep
                        ? mainIndividuals.map((user, i) => renderIndividual(user, i))
                        : mainEntities.map((entity, i) => renderEntity(entity, i))}
                      {mainIndividuals.length === 0 && mainEntities.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No main players in this collection.
                        </p>
                      )}
                    </div>
                  </section>
                )
              })()}
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

      {/* Confirm delivery (Negatives drop-off): Yes/No → close dialog + modal, mark step completed, toast, notify producer */}
      <Dialog open={confirmDropoffDialogOpen} onOpenChange={setConfirmDropoffDialogOpen}>
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm delivery</DialogTitle>
            <DialogDescription>
              Will the lab meet the next deadline?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center gap-4 py-4">
            {(() => {
              const negIndex = steps.findIndex((s) => s.id === "negatives_dropoff")
              const nextStep = negIndex >= 0 && negIndex < steps.length - 1 ? steps[negIndex + 1] : null
              const hasDate = nextStep?.deadlineDate && nextStep.deadlineDate !== "—"
              if (!hasDate) return null
              return (
                <DateIndicatorTag
                  label={`${nextStep!.title} —`}
                  date={nextStep!.deadlineDate!}
                  time={nextStep!.deadlineTime ?? "End of day (5:00pm)"}
                  className="bg-sidebar-accent text-foreground"
                />
              )
            })()}
          </div>
          <DialogFooter showCloseButton={false} className="justify-start gap-2 sm:justify-start sm:gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                setConfirmDropoffDialogOpen(false)
                await onConfirmDropoffDelivery?.("negatives_dropoff", false)
                setOpenStepId(null)
                toast.success("Delivery confirmed.")
              }}
            >
              No
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={async () => {
                setConfirmDropoffDialogOpen(false)
                await onConfirmDropoffDelivery?.("negatives_dropoff", true)
                setOpenStepId(null)
                toast.success("Delivery confirmed.")
              }}
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload low-res (step 3): URL + optional notes, CTA disabled until URL filled, shipping reminder, then mark step completed + toast + notify producer & photographer */}
      <Dialog
        open={uploadLowResDialogOpen}
        onOpenChange={(open) => {
          setUploadLowResDialogOpen(open)
          if (open) {
            setUploadLowResNotes(uploadLowResInitialNotes ?? "")
          } else {
            setUploadLowResUrl("")
            setUploadLowResNotes("")
          }
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share low-res photos</DialogTitle>
            <DialogDescription>
              Upload here the low-res photos to share with client
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="upload-lowres-url">Link or URL with photos</Label>
              <Input
                id="upload-lowres-url"
                type="url"
                placeholder="Paste here the url"
                value={uploadLowResUrl}
                onChange={(e) => setUploadLowResUrl(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="upload-lowres-notes">Notes and comments (optional)</Label>
              <Textarea
                id="upload-lowres-notes"
                placeholder="Add any notes for the photographer..."
                value={uploadLowResNotes}
                onChange={(e) => setUploadLowResNotes(e.target.value)}
                className="w-full max-h-[94px] overflow-y-auto resize-none"
                rows={2}
              />
            </div>
            {uploadLowResShowShippingReminder &&
              (() => {
                const dateStr =
                  uploadLowResShippingReminderDate?.trim() &&
                  (() => {
                    try {
                      return new Date(uploadLowResShippingReminderDate + "T12:00:00").toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    } catch {
                      return uploadLowResShippingReminderDate
                    }
                  })()
                const timeStr = uploadLowResShippingReminderTime?.trim() || "End of day (5:00pm)"
                const destStr = uploadLowResShippingReminderDestination?.trim() || "handprint lab"
                const valueClass = "font-semibold text-primary"
                const reminderMessage =
                  dateStr && timeStr && destStr ? (
                    <>
                      Remember to schedule shipping to handprint lab. Estimated to:{" "}
                      <span className={valueClass}>{dateStr}</span> at <span className={valueClass}>{timeStr}</span> to{" "}
                      <span className={valueClass}>{destStr}</span>
                    </>
                  ) : (
                    "Remember to schedule shipping to handprint lab."
                  )
                return (
                  <InformativeToast
                    message={reminderMessage}
                    className="text-muted-foreground"
                  />
                )
              })()}
          </div>
          <DialogFooter showCloseButton={false} className="justify-start">
            <Button
              type="button"
              variant="default"
              disabled={!uploadLowResUrl.trim()}
              onClick={async () => {
                const url = uploadLowResUrl.trim()
                if (!url) return
                await onUploadLowRes?.({ url, notes: uploadLowResNotes.trim() || undefined })
                setUploadLowResDialogOpen(false)
                setUploadLowResUrl("")
                setUploadLowResNotes("")
                setOpenStepId(null)
                toast.success("Low-res scans uploaded.")
              }}
            >
              Upload low-res
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
