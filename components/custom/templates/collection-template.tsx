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
  if (stepId === "client_selection") {
    return {
      individuals: individuals.filter((u) => (u.roleLabel ?? "").toLowerCase() === "photographer"),
      entities: entities.filter((e) => (e.entityTypeLabel ?? "").toLowerCase() === "client"),
    }
  }
  if (stepId === "photographer_check_client_selection") {
    return {
      individuals: individuals.filter((u) => (u.roleLabel ?? "").toLowerCase() === "photographer"),
      entities: entities.filter((e) => (e.entityTypeLabel ?? "").toLowerCase() === "client"),
    }
  }
  if (stepId === "handprint_high_res") {
    return {
      individuals: individuals.filter((u) => (u.roleLabel ?? "").toLowerCase() === "photographer"),
      entities: entities.filter(
        (e) =>
          (e.entityTypeLabel ?? "").toLowerCase().includes("hand print") ||
          (e.entityTypeLabel ?? "").toLowerCase().includes("handprint")
      ),
    }
  }
  if (stepId === "edition_request") {
    return {
      individuals: individuals.filter((u) => (u.roleLabel ?? "").toLowerCase() === "photographer"),
      entities: entities.filter(
        (e) =>
          (e.entityTypeLabel ?? "").toLowerCase().includes("retouch") ||
          (e.entityTypeLabel ?? "").toLowerCase().includes("edition")
      ),
    }
  }
  if (stepId === "final_edits") {
    return {
      individuals: individuals.filter((u) => (u.roleLabel ?? "").toLowerCase() === "photographer"),
      entities: entities.filter(
        (e) =>
          (e.entityTypeLabel ?? "").toLowerCase().includes("retouch") ||
          (e.entityTypeLabel ?? "").toLowerCase().includes("edition")
      ),
    }
  }
  if (stepId === "photographer_last_check") {
    return {
      individuals: individuals.filter((u) => (u.roleLabel ?? "").toLowerCase() === "photographer"),
      entities: entities.filter((e) => (e.entityTypeLabel ?? "").toLowerCase() === "client"),
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

/** Relative time for low-res upload: minutes (precise), then hours, days, weeks, months (rounded). */
function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffMs = now - then
  if (diffMs < 0) return "Just now"
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffH = Math.floor(diffSec / 3600)
  const diffDays = Math.floor(diffSec / 86400)
  const diffWeeks = Math.floor(diffSec / (86400 * 7))
  const diffMonths = Math.floor(diffSec / (86400 * 30))
  if (diffMin < 1) return "Less than a minute ago"
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? "minute" : "minutes"} ago`
  if (diffH < 24) return `${diffH} ${diffH === 1 ? "hour" : "hours"} ago`
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`
  if (diffMonths < 1) return `${diffWeeks} ${diffWeeks === 1 ? "week" : "weeks"} ago`
  return `${diffMonths} ${diffMonths === 1 ? "month" : "months"} ago`
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
  /** Called when owner uploads additional footage (step 3, after first upload). Saves to lowres_selection_url02, overwrites lowres_lab_notes. */
  onUploadMoreLowRes?: (payload: { url: string; notes?: string }) => void | Promise<void>
  /** Upload low-res dialog: show shipping reminder only when handprint lab is different from original (configured in collection creation). */
  uploadLowResShowShippingReminder?: boolean
  /** Upload low-res dialog: initial notes (e.g. from collection.lowResLabNotes) to pre-fill when opening. */
  uploadLowResInitialNotes?: string
  /** Step 4 (Photographer selection): first low-res URL (step 3 upload). */
  lowResSelectionUrl?: string
  /** Step 4: when the first low-res URL was uploaded (ISO). */
  lowResUploadedAt?: string
  /** Step 4: second low-res URL (step 3 re-upload after missing photos). */
  lowResSelectionUrl02?: string
  /** Step 4: when the second low-res URL was uploaded (ISO). */
  lowResUploadedAt02?: string
  /** Step 4: URL of uploaded photographer selection (lab upload). */
  photographerSelectionUrl?: string
  /** Step 4: when photographer selection was uploaded (ISO). */
  photographerSelectionUploadedAt?: string
  /** Step 4: notes from lab (photographer_notes01). */
  photographerNotes01?: string
  /** Called when owner uploads photographer selection (step 4). Marks step completed, notifies producer + client. */
  onUploadPhotographerSelection?: (payload: { url: string; notes?: string }) => void | Promise<void>
  /** Missing photos: photographer comments (saved in photographer_missingphotos). Shown in step 3 notes block. */
  photographerMissingphotos?: string
  /** Called when photographer requests additional photos (missing photos flow). Saves to photographer_missingphotos, posts event, notifies producer + lab. */
  onRequestAdditionalPhotos?: (notes: string) => void | Promise<void>
  /** Step 5 (Client selection): called when client uploads final selection. */
  onUploadClientSelection?: (payload: { url: string; notes?: string }) => void | Promise<void>
  /** Step 5 (Client selection): called when client requests more photos from photographer. */
  onRequestMorePhotosFromPhotographer?: (notes: string) => void | Promise<void>
  /** Step 6 (Photographer review): URL of client final selection (step 5 upload). */
  clientSelectionUrl?: string
  /** Step 6: when the client selection URL was uploaded (ISO). */
  clientSelectionUploadedAt?: string
  /** Step 6: notes from client (client_notes01). Shown in notes block when present. */
  clientNotes01?: string
  /** Step 6: called when photographer validates client selection. */
  onValidateClientSelection?: (comments?: string) => void | Promise<void>
  /** Step 6: called when photographer requests more photos from client. */
  onRequestMorePhotosFromClient?: (notes: string) => void | Promise<void>
  /** Step 7 (Low-res to high-res): notes from photographer's validation (step 6). Standby: not in DB yet. Shown in notes block when present. */
  photographerValidationNotes?: string
  /** Step 7: called when lab uploads high-res selection. */
  onUploadHighRes?: (payload: { url: string; notes?: string }) => void | Promise<void>
  /** Step 8 (Edition request): URL of high-res selection (step 7 upload). */
  highResSelectionUrl?: string
  /** Step 8: when the high-res URL was uploaded (ISO). */
  highResUploadedAt?: string
  /** Step 8: name of entity that uploaded high-res (e.g. Hand Print Lab name) for "Uploaded by @X". */
  highResUploadedByName?: string
  /** Step 8: notes from lab/handprint lab when uploading high-res (step 7). Standby: not in DB yet. Shown in notes block when present. */
  highResUploadNotes?: string
  /** Step 8: entity name for notes block (e.g. "Hand Print Lab" or "Photo Lab"). */
  highResUploadedByEntityName?: string
  /** Step 8: called when photographer gives improvement instructions to retouch studio. */
  onGiveInstructions?: (payload: { details: string; url?: string }) => void | Promise<void>
  /** Step 9 (Final edits): URL of improvement instructions from step 8 (Give instructions link). */
  editionRequestInstructionsUrl?: string
  /** Step 9: when the photographer gave instructions (step 8) — ISO. */
  editionRequestInstructionsUploadedAt?: string
  /** Step 9: notes from photographer in step 8 (Give instructions). Standby: not in DB yet. Shown in notes block when present. */
  editionRequestInstructionsNotes?: string
  /** Step 9: called when edition studio uploads final retouched photos. */
  onUploadFinals?: (payload: { url: string; notes?: string }) => void | Promise<void>
  /** Step 10 (Photographer last check): URL of finals from step 9 (or step 7 high-res when no edition). */
  finalsSelectionUrl?: string
  /** Step 10: when finals were uploaded (step 9) or high-res (step 7). ISO. */
  finalsUploadedAt?: string
  /** Step 10: name of entity that uploaded finals (e.g. Edition studio name) for "Uploaded by @X". */
  finalsUploadedByName?: string
  /** Step 10: notes from edition studio when uploading finals (step 9). Standby: not in DB yet. Shown in notes block when present. */
  finalsUploadNotes?: string
  /** Step 10: entity name for notes block (e.g. "Retouch studio"). */
  finalsUploadedByEntityName?: string
  /** Step 10: called when photographer requests changes (secondary action). */
  onRequestChanges?: (notes?: string) => void | Promise<void>
  /** Step 10: called when photographer validates finals (primary action). */
  onValidateFinals?: () => void | Promise<void>
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
  onUploadMoreLowRes,
  uploadLowResShowShippingReminder,
  uploadLowResInitialNotes,
  lowResSelectionUrl,
  lowResUploadedAt,
  lowResSelectionUrl02,
  lowResUploadedAt02,
  photographerSelectionUrl,
  photographerSelectionUploadedAt,
  photographerNotes01,
  onUploadPhotographerSelection,
  photographerMissingphotos,
  onRequestAdditionalPhotos,
  onUploadClientSelection,
  onRequestMorePhotosFromPhotographer,
  clientSelectionUrl,
  clientSelectionUploadedAt,
  clientNotes01,
  onValidateClientSelection,
  onRequestMorePhotosFromClient,
  photographerValidationNotes,
  onUploadHighRes,
  highResSelectionUrl,
  highResUploadedAt,
  highResUploadedByName,
  highResUploadNotes,
  highResUploadedByEntityName,
  onGiveInstructions,
  editionRequestInstructionsUrl,
  editionRequestInstructionsUploadedAt,
  editionRequestInstructionsNotes,
  onUploadFinals,
  finalsSelectionUrl,
  finalsUploadedAt,
  finalsUploadedByName,
  finalsUploadNotes,
  finalsUploadedByEntityName,
  onRequestChanges,
  onValidateFinals,
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
  const [uploadMorePhotosDialogOpen, setUploadMorePhotosDialogOpen] = React.useState(false)
  const [uploadMorePhotosUrl, setUploadMorePhotosUrl] = React.useState("")
  const [uploadMorePhotosNotes, setUploadMorePhotosNotes] = React.useState("")
  const [uploadPhotographerSelectionDialogOpen, setUploadPhotographerSelectionDialogOpen] = React.useState(false)
  const [uploadPhotographerSelectionUrl, setUploadPhotographerSelectionUrl] = React.useState("")
  const [uploadPhotographerSelectionNotes, setUploadPhotographerSelectionNotes] = React.useState("")
  const [missingPhotosDialogOpen, setMissingPhotosDialogOpen] = React.useState(false)
  const [missingPhotosNotes, setMissingPhotosNotes] = React.useState("")
  const [clientUploadSelectionDialogOpen, setClientUploadSelectionDialogOpen] = React.useState(false)
  const [clientUploadSelectionUrl, setClientUploadSelectionUrl] = React.useState("")
  const [clientUploadSelectionNotes, setClientUploadSelectionNotes] = React.useState("")
  const [clientMissingPhotosDialogOpen, setClientMissingPhotosDialogOpen] = React.useState(false)
  const [clientMissingPhotosNotes, setClientMissingPhotosNotes] = React.useState("")
  const [validateSelectionDialogOpen, setValidateSelectionDialogOpen] = React.useState(false)
  const [validateSelectionComments, setValidateSelectionComments] = React.useState("")
  const [photographerRequestClientPhotosDialogOpen, setPhotographerRequestClientPhotosDialogOpen] = React.useState(false)
  const [photographerRequestClientPhotosNotes, setPhotographerRequestClientPhotosNotes] = React.useState("")
  const [uploadHighResDialogOpen, setUploadHighResDialogOpen] = React.useState(false)
  const [uploadHighResUrl, setUploadHighResUrl] = React.useState("")
  const [uploadHighResNotes, setUploadHighResNotes] = React.useState("")
  const [giveInstructionsDialogOpen, setGiveInstructionsDialogOpen] = React.useState(false)
  const [giveInstructionsDetails, setGiveInstructionsDetails] = React.useState("")
  const [giveInstructionsUrl, setGiveInstructionsUrl] = React.useState("")
  const [uploadFinalsDialogOpen, setUploadFinalsDialogOpen] = React.useState(false)
  const [uploadFinalsUrl, setUploadFinalsUrl] = React.useState("")
  const [uploadFinalsNotes, setUploadFinalsNotes] = React.useState("")
  const [requestChangesDialogOpen, setRequestChangesDialogOpen] = React.useState(false)
  const [requestChangesNotes, setRequestChangesNotes] = React.useState("")
  const [lowResUrlPickerDialogOpen, setLowResUrlPickerDialogOpen] = React.useState(false)
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
                  {openStep.canEdit && openStep.status !== "completed" && (
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
                  {photographerMissingphotos?.trim() && (
                    <StepDetails
                      variant="notes"
                      mainTitle="Notes from photographer"
                      entityName="photographer"
                      additionalInfo={photographerMissingphotos.trim()}
                    />
                  )}
                  {openStep.canEdit &&
                    !(lowResSelectionUrl?.trim() && lowResSelectionUrl02?.trim()) && (
                    <section
                      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-5 py-10 shadow-xl ring-offset-2 ring-offset-lime-500"
                      aria-label="Step owner action"
                    >
                      {lowResSelectionUrl?.trim() ? (
                        <>
                          <p className="text-center text-base font-semibold text-foreground">
                            Need to send additional footage?
                          </p>
                          <Button
                            type="button"
                            variant="default"
                            size="lg"
                            className="w-fit rounded-xl"
                            onClick={() => setUploadMorePhotosDialogOpen(true)}
                          >
                            upload more photos
                          </Button>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
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
                      additionalInfo={
                        (() => {
                          const hasFirst = !!lowResSelectionUrl?.trim()
                          const hasSecond = !!lowResSelectionUrl02?.trim()
                          if (!hasFirst && !hasSecond) return "Not uploaded yet"
                          if (hasFirst && !hasSecond)
                            return lowResUploadedAt
                              ? `View link · ${formatRelativeTime(lowResUploadedAt)}`
                              : "View link"
                          if (hasFirst && hasSecond) return "2 links · View"
                          return lowResUploadedAt02
                            ? `View link · ${formatRelativeTime(lowResUploadedAt02)}`
                            : "View link"
                        })()
                      }
                      backgroundImage="/assets/bg-lowres.png"
                      makeCardClickable={!!(lowResSelectionUrl?.trim() || lowResSelectionUrl02?.trim())}
                      onAction={
                        (() => {
                          const url1 = lowResSelectionUrl?.trim()
                          const url2 = lowResSelectionUrl02?.trim()
                          if (url1 && !url2) return () => window.open(url1, "_blank", "noopener,noreferrer")
                          if (url1 && url2) return () => setLowResUrlPickerDialogOpen(true)
                          if (url2) return () => window.open(url2, "_blank", "noopener,noreferrer")
                          return undefined
                        })()
                      }
                      className="min-w-0 flex-1"
                    />
                  </div>
                  <StepDetails
                    variant="notes"
                    mainTitle="Notes from lab"
                    entityName="lab"
                    additionalInfo={photographerNotes01?.trim() || uploadLowResInitialNotes?.trim() || "—"}
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
                        onClick={() => setUploadPhotographerSelectionDialogOpen(true)}
                      >
                        Upload selection
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
                      openStep.canEdit
                        ? () => setMissingPhotosDialogOpen(true)
                        : undefined
                    }
                  />
                </div>
              ) : openStep.id === "client_selection" ? (
                <div className="flex flex-col gap-5 w-full">
                  <div className="flex flex-row gap-5 w-full min-w-0">
                      <StepDetails
                        variant="primary"
                        mainTitle="Client selection"
                        subtitle="Client has to select the top photos from the shooting to prepare finals"
                        backgroundImage="/assets/bg-selection.png"
                        hideActionButton
                        className="min-w-0 flex-1"
                      />
                      <StepDetails
                        variant="primary"
                        mainTitle="Photographer selection"
                        subtitle={
                          photographerName?.trim() ? (
                            <>
                              Uploaded by <span className="text-lime-400">@{photographerName.trim()}</span>
                            </>
                          ) : (
                            "Uploaded by photographer"
                          )
                        }
                        additionalInfo={
                          photographerSelectionUrl?.trim()
                            ? photographerSelectionUploadedAt
                              ? `View link · ${formatRelativeTime(photographerSelectionUploadedAt)}`
                              : "View link"
                            : "Not uploaded yet"
                        }
                        backgroundImage="/assets/bg-selection.png"
                        makeCardClickable={!!photographerSelectionUrl?.trim()}
                        onAction={
                          photographerSelectionUrl?.trim()
                            ? () => window.open(photographerSelectionUrl.trim(), "_blank", "noopener,noreferrer")
                            : undefined
                        }
                        className="min-w-0 flex-1"
                      />
                  </div>
                  {photographerNotes01?.trim() && (
                    <StepDetails
                      variant="notes"
                      mainTitle="Notes from lab"
                      entityName="lab"
                      additionalInfo={photographerNotes01.trim()}
                    />
                  )}
                  {openStep.canEdit && (
                    <section
                      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-5 py-10 shadow-xl ring-offset-2 ring-offset-lime-500"
                      aria-label="Step owner action"
                    >
                      <p className="text-center text-base font-semibold text-foreground">
                        Do you have the final photos you'd like to get in high-res?
                      </p>
                      <Button
                        type="button"
                        variant="default"
                        size="lg"
                        className="w-fit rounded-xl"
                        onClick={() => setClientUploadSelectionDialogOpen(true)}
                      >
                        Upload selection
                      </Button>
                    </section>
                  )}
                  <StepDetails
                    variant="missingPhotos"
                    mainTitle="Missing photos?"
                    entityName={
                      (participantsMainPlayersIndividuals ?? []).find(
                        (u) => (u.roleLabel ?? "").toLowerCase() === "photographer"
                      )?.name ?? "Photographer"
                    }
                    onAction={
                      openStep.canEdit
                        ? () => setClientMissingPhotosDialogOpen(true)
                        : undefined
                    }
                  />
                </div>
              ) : openStep.id === "photographer_check_client_selection" ? (
                <div className="flex flex-col gap-5 w-full">
                  <div className="flex flex-col gap-5 w-full">
                    <div className="flex flex-row gap-5 w-full min-w-0">
                      <StepDetails
                        variant="primary"
                        mainTitle="Validation for HR"
                        subtitle="Photographer must download and validate client selections for hand print lab instructions."
                        backgroundImage="/assets/bg-improvements.png"
                        hideActionButton
                        className="min-w-0 flex-1"
                      />
                      <StepDetails
                        variant="primary"
                        mainTitle="Client selection"
                        subtitle={
                          clientName?.trim() ? (
                            <>
                              Uploaded by <span className="text-lime-400">@{clientName.trim()}</span>
                            </>
                          ) : (
                            "Uploaded by client"
                          )
                        }
                        additionalInfo={
                          clientSelectionUrl?.trim()
                            ? clientSelectionUploadedAt
                              ? `View link · ${formatRelativeTime(clientSelectionUploadedAt)}`
                              : "View link"
                            : "Not uploaded yet"
                        }
                        backgroundImage="/assets/bg-clientselect.png"
                        makeCardClickable={!!clientSelectionUrl?.trim()}
                        onAction={
                          clientSelectionUrl?.trim()
                            ? () => window.open(clientSelectionUrl.trim(), "_blank", "noopener,noreferrer")
                            : undefined
                        }
                        className="min-w-0 flex-1"
                      />
                    </div>
                    {clientNotes01?.trim() && (
                      <StepDetails
                        variant="notes"
                        entityName="client"
                        additionalInfo={clientNotes01.trim()}
                      />
                    )}
                  </div>
                  {openStep.canEdit && (
                    <section
                      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-5 py-10 shadow-xl ring-offset-2 ring-offset-lime-500"
                      aria-label="Step owner action"
                    >
                      <p className="text-center text-base font-semibold text-foreground">
                        Review client selection and confirm or add comments for lab
                      </p>
                      <Button
                        type="button"
                        variant="default"
                        size="lg"
                        className="w-fit rounded-xl"
                        onClick={() => setValidateSelectionDialogOpen(true)}
                      >
                        Validate selection
                      </Button>
                    </section>
                  )}
                  <StepDetails
                    variant="missingPhotos"
                    mainTitle="Missing photos?"
                    entityName={
                      (participantsMainPlayersEntities ?? []).find(
                        (e) => (e.entityTypeLabel ?? "").toLowerCase() === "client"
                      )?.entityName ?? "Client"
                    }
                    onAction={
                      openStep.canEdit
                        ? () => setPhotographerRequestClientPhotosDialogOpen(true)
                        : undefined
                    }
                  />
                </div>
              ) : openStep.id === "edition_request" ? (
                <div className="flex flex-col gap-5 w-full">
                  <div className="flex flex-col gap-5 w-full">
                    <div className="flex flex-row gap-5 w-full min-w-0">
                      <StepDetails
                        variant="primary"
                        mainTitle="Improvements"
                        subtitle="Photographer have to capture all changes needed to get finals ready."
                        backgroundImage="/assets/bg-improvements.png"
                        hideActionButton
                        className="min-w-0 flex-1"
                      />
                      <StepDetails
                        variant="primary"
                        mainTitle="Download high-res"
                        subtitle={
                          highResUploadedByName?.trim() ? (
                            <>
                              Uploaded by <span className="text-lime-400">@{highResUploadedByName.trim()}</span>
                            </>
                          ) : (
                            "Uploaded by lab"
                          )
                        }
                        additionalInfo={
                          highResSelectionUrl?.trim()
                            ? highResUploadedAt
                              ? `View link · ${formatRelativeTime(highResUploadedAt)}`
                              : "View link"
                            : "Not uploaded yet"
                        }
                        backgroundImage="/assets/bg-highres.png"
                        makeCardClickable={!!highResSelectionUrl?.trim()}
                        onAction={
                          highResSelectionUrl?.trim()
                            ? () => window.open(highResSelectionUrl.trim(), "_blank", "noopener,noreferrer")
                            : undefined
                        }
                        className="min-w-0 flex-1"
                      />
                    </div>
                    {highResUploadNotes?.trim() && (
                      <StepDetails
                        variant="notes"
                        entityName={highResUploadedByEntityName ?? "Lab"}
                        additionalInfo={highResUploadNotes.trim()}
                      />
                    )}
                  </div>
                  {openStep.canEdit && (
                    <section
                      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-5 py-10 shadow-xl ring-offset-2 ring-offset-lime-500"
                      aria-label="Step owner action"
                    >
                      <p className="text-center text-base font-semibold text-foreground">
                        Upload improvement details for retouch studio
                      </p>
                      <Button
                        type="button"
                        variant="default"
                        size="lg"
                        className="w-fit rounded-xl"
                        onClick={() => setGiveInstructionsDialogOpen(true)}
                      >
                        Give instructions
                      </Button>
                    </section>
                  )}
                </div>
              ) : openStep.id === "final_edits" ? (
                <div className="flex flex-col gap-5 w-full">
                  <StepDetails
                    variant="primary"
                    mainTitle="Photo retouches"
                    subtitle="Edition studio is currently doing final retouches to the client selection."
                    backgroundImage="/assets/bg-edition.png"
                    hideActionButton
                    className="w-full"
                  />
                  <div className="flex flex-col gap-5 w-full">
                    <div className="flex flex-row gap-5 w-full min-w-0">
                      <StepDetails
                        variant="primary"
                        mainTitle="Improvement details"
                        subtitle={
                          photographerName?.trim() ? (
                            <>
                              Uploaded by <span className="text-lime-400">@{photographerName.trim()}</span>
                            </>
                          ) : (
                            "Uploaded by photographer"
                          )
                        }
                        additionalInfo={
                          editionRequestInstructionsUrl?.trim()
                            ? editionRequestInstructionsUploadedAt
                              ? `View link · ${formatRelativeTime(editionRequestInstructionsUploadedAt)}`
                              : "View link"
                            : "Not uploaded yet"
                        }
                        backgroundImage="/assets/bg-improvements.png"
                        makeCardClickable={!!editionRequestInstructionsUrl?.trim()}
                        onAction={
                          editionRequestInstructionsUrl?.trim()
                            ? () => window.open(editionRequestInstructionsUrl.trim(), "_blank", "noopener,noreferrer")
                            : undefined
                        }
                        className="min-w-0 flex-1"
                      />
                      <StepDetails
                        variant="primary"
                        mainTitle="Download high-res"
                        subtitle={
                          highResUploadedByName?.trim() ? (
                            <>
                              Uploaded by <span className="text-lime-400">@{highResUploadedByName.trim()}</span>
                            </>
                          ) : (
                            "Uploaded by lab"
                          )
                        }
                        additionalInfo={
                          highResSelectionUrl?.trim()
                            ? highResUploadedAt
                              ? `View link · ${formatRelativeTime(highResUploadedAt)}`
                              : "View link"
                            : "Not uploaded yet"
                        }
                        backgroundImage="/assets/bg-highres.png"
                        makeCardClickable={!!highResSelectionUrl?.trim()}
                        onAction={
                          highResSelectionUrl?.trim()
                            ? () => window.open(highResSelectionUrl.trim(), "_blank", "noopener,noreferrer")
                            : undefined
                        }
                        className="min-w-0 flex-1"
                      />
                    </div>
                    {editionRequestInstructionsNotes?.trim() && (
                      <StepDetails
                        variant="notes"
                        entityName="Photographer"
                        additionalInfo={editionRequestInstructionsNotes.trim()}
                      />
                    )}
                  </div>
                  {openStep.canEdit && (
                    <section
                      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-5 py-10 shadow-xl ring-offset-2 ring-offset-lime-500"
                      aria-label="Step owner action"
                    >
                      <p className="text-center text-base font-semibold text-foreground">
                        Upload final retouched photos
                      </p>
                      <Button
                        type="button"
                        variant="default"
                        size="lg"
                        className="w-fit rounded-xl"
                        onClick={() => setUploadFinalsDialogOpen(true)}
                      >
                        Upload finals
                      </Button>
                    </section>
                  )}
                </div>
              ) : openStep.id === "photographer_last_check" ? (
                <div className="flex flex-col gap-5 w-full">
                  <div className="flex flex-col gap-5 w-full">
                    <div className="flex flex-row gap-5 w-full min-w-0">
                      <StepDetails
                        variant="primary"
                        mainTitle="Final confirmation"
                        subtitle="Photographer needs to carefully review final retouches and approve the job done by the edition studio in order to share finals with client."
                        backgroundImage="/assets/bg-improvements.png"
                        hideActionButton
                        className="min-w-0 flex-1"
                      />
                      <StepDetails
                        variant="primary"
                        mainTitle="Download finals"
                        subtitle={
                          (() => {
                            const url = finalsSelectionUrl?.trim() || highResSelectionUrl?.trim()
                            const name = url === finalsSelectionUrl?.trim() ? finalsUploadedByName : highResUploadedByName
                            return name?.trim() ? (
                              <>
                                Uploaded by <span className="text-lime-400">@{name.trim()}</span>
                              </>
                            ) : (
                              "Uploaded by studio"
                            )
                          })()
                        }
                        additionalInfo={
                          (() => {
                            const url = finalsSelectionUrl?.trim() || highResSelectionUrl?.trim()
                            const at = url === finalsSelectionUrl?.trim() ? finalsUploadedAt : highResUploadedAt
                            if (!url) return "Not uploaded yet"
                            return at ? `View link · ${formatRelativeTime(at)}` : "View link"
                          })()
                        }
                        backgroundImage="/assets/bg-edition.png"
                        makeCardClickable={!!(finalsSelectionUrl?.trim() || highResSelectionUrl?.trim())}
                        onAction={
                          (() => {
                            const url = finalsSelectionUrl?.trim() || highResSelectionUrl?.trim()
                            return url ? () => window.open(url, "_blank", "noopener,noreferrer") : undefined
                          })()
                        }
                        className="min-w-0 flex-1"
                      />
                    </div>
                    {finalsUploadNotes?.trim() && (
                      <StepDetails
                        variant="notes"
                        entityName={finalsUploadedByEntityName ?? "Retouch studio"}
                        additionalInfo={finalsUploadNotes.trim()}
                      />
                    )}
                  </div>
                  {openStep.canEdit && (
                    <section
                      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-5 py-10 shadow-xl ring-offset-2 ring-offset-lime-500"
                      aria-label="Step owner action"
                    >
                      <p className="text-center text-base font-semibold text-foreground">
                        Are final retouches ok?
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <Button
                          type="button"
                          variant="secondary"
                          size="lg"
                          className="w-fit rounded-xl"
                          onClick={() => setRequestChangesDialogOpen(true)}
                        >
                          Request changes
                        </Button>
                        <Button
                          type="button"
                          variant="default"
                          size="lg"
                          className="w-fit rounded-xl"
                          onClick={async () => {
                            try {
                              await onValidateFinals?.()
                              setOpenStepId(null)
                              toast.success("Finals validated.")
                            } catch {
                              // Error surfaced by page if any
                            }
                          }}
                        >
                          Validate finals
                        </Button>
                      </div>
                    </section>
                  )}
                </div>
              ) : openStep.id === "handprint_high_res" ? (
                <div className="flex flex-col gap-5 w-full">
                  <div className="flex flex-col gap-5 w-full">
                    <div className="flex flex-row gap-5 w-full min-w-0">
                      <StepDetails
                        variant="primary"
                        mainTitle='Convert client selection to "high-resolution"'
                        subtitle="Lab has to convert client selection to high-resolution using a traditional hand-printing technique."
                        backgroundImage="/assets/bg-highres.png"
                        hideActionButton
                        className="min-w-0 flex-1"
                      />
                      <StepDetails
                        variant="primary"
                        mainTitle="Client selection"
                        subtitle={
                          clientName?.trim() ? (
                            <>
                              Uploaded by <span className="text-lime-400">@{clientName.trim()}</span>
                            </>
                          ) : (
                            "Uploaded by client"
                          )
                        }
                        additionalInfo={
                          clientSelectionUrl?.trim()
                            ? clientSelectionUploadedAt
                              ? `View link · ${formatRelativeTime(clientSelectionUploadedAt)}`
                              : "View link"
                            : "Not uploaded yet"
                        }
                        backgroundImage="/assets/bg-clientselect.png"
                        makeCardClickable={!!clientSelectionUrl?.trim()}
                        onAction={
                          clientSelectionUrl?.trim()
                            ? () => window.open(clientSelectionUrl.trim(), "_blank", "noopener,noreferrer")
                            : undefined
                        }
                        className="min-w-0 flex-1"
                      />
                    </div>
                    {photographerValidationNotes?.trim() && (
                      <StepDetails
                        variant="notes"
                        entityName="Photographer"
                        additionalInfo={photographerValidationNotes.trim()}
                      />
                    )}
                  </div>
                  {openStep.canEdit && (
                    <section
                      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-5 py-10 shadow-xl ring-offset-2 ring-offset-lime-500"
                      aria-label="Step owner action"
                    >
                      <p className="text-center text-base font-semibold text-foreground">
                        Upload high-resolution selection
                      </p>
                      <Button
                        type="button"
                        variant="default"
                        size="lg"
                        className="w-fit rounded-xl"
                        onClick={() => setUploadHighResDialogOpen(true)}
                      >
                        Upload high-res
                      </Button>
                    </section>
                  )}
                  <StepDetails
                    variant="missingPhotos"
                    mainTitle="Missing photos?"
                    entityName={
                      (participantsMainPlayersEntities ?? []).find(
                        (e) => (e.entityTypeLabel ?? "").toLowerCase() === "client"
                      )?.entityName ?? "Client"
                    }
                    onAction={
                      openStep.canEdit
                        ? () => setPhotographerRequestClientPhotosDialogOpen(true)
                        : undefined
                    }
                  />
                </div>
              ) : openStep.id === "client_confirmation" ? (
                <div className="flex flex-col gap-5 w-full">
                  {/* Client confirmation — custom block (Figma node 788-58722): bg-finals, title, subtitle, primary white button */}
                  <div className="relative flex flex-col items-center justify-center rounded-xl overflow-hidden min-h-[244px] w-full">
                    <img
                      src="/assets/bg-finals.png"
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                    />
                    <div className="absolute inset-0 bg-foreground/40" />
                    <div className="relative z-10 px-5 py-5 flex flex-col gap-6 items-center justify-center text-center">
                      <div className="flex flex-col gap-2 items-center text-center">
                        <span className="block font-semibold text-xl leading-8 text-white">
                          Final selection is ready!
                        </span>
                        <span className="text-sm font-medium block text-white/90">
                          {openStep.canEdit
                            ? "Check and review the finals before confirming the closing of the project"
                            : "View the final selection."}
                        </span>
                      </div>
                      {openStep.canEdit && (
                        <Button
                          type="button"
                          variant="default"
                          size="lg"
                          className="w-fit rounded-xl bg-white text-black hover:bg-white/90"
                        >
                          Approve selection
                        </Button>
                      )}
                    </div>
                  </div>
                  {/* Action block: Request additional photos */}
                  {openStep.canEdit && (
                    <section
                      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-5 py-10 shadow-xl ring-offset-2 ring-offset-lime-500"
                      aria-label="Step owner action"
                    >
                      <p className="text-center text-base font-semibold text-foreground">
                        Do you need additional footage?
                      </p>
                      <Button
                        type="button"
                        variant="default"
                        size="lg"
                        className="w-fit rounded-xl"
                        onClick={() => setClientMissingPhotosDialogOpen(true)}
                      >
                        Request additional photos
                      </Button>
                    </section>
                  )}
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
              {/* Owner-only action block (Confirm pickup) — Shooting step only when not yet completed; closes modal, toast, updates stepper/progress, notifies Photo lab */}
              {openStep.canEdit && openStep.id === "shooting" && openStep.status !== "completed" && (
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
                const isClientSelectionStep = openStep?.id === "client_selection"
                const isHandprintHighResStep = openStep?.id === "handprint_high_res"
                const isFinalEditsStep = openStep?.id === "final_edits"
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
                      {isClientSelectionStep || isHandprintHighResStep || isFinalEditsStep
                        ? mainEntities.map((entity, i) => renderEntity(entity, i))
                        : isLowResStep
                          ? mainEntities.map((entity, i) => renderEntity(entity, i))
                          : mainIndividuals.map((user, i) => renderIndividual(user, i))}
                      {isClientSelectionStep || isHandprintHighResStep || isFinalEditsStep
                        ? mainIndividuals.map((user, i) => renderIndividual(user, i))
                        : isLowResStep
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

      {/* Upload more photos (step 3, after first upload): URL 02 + notes overwrite lowres_lab_notes */}
      <Dialog
        open={uploadMorePhotosDialogOpen}
        onOpenChange={(open) => {
          setUploadMorePhotosDialogOpen(open)
          if (open) {
            setUploadMorePhotosNotes(uploadLowResInitialNotes ?? "")
          } else {
            setUploadMorePhotosUrl("")
            setUploadMorePhotosNotes("")
          }
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload more photos</DialogTitle>
            <DialogDescription>
              Share an additional low-res selection. Notes will overwrite the existing lab notes.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="upload-more-photos-url">Link or URL with photos</Label>
              <Input
                id="upload-more-photos-url"
                type="url"
                placeholder="Paste here the url"
                value={uploadMorePhotosUrl}
                onChange={(e) => setUploadMorePhotosUrl(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="upload-more-photos-notes">Notes and comments (optional)</Label>
              <Textarea
                id="upload-more-photos-notes"
                placeholder="Add any notes for the photographer..."
                value={uploadMorePhotosNotes}
                onChange={(e) => setUploadMorePhotosNotes(e.target.value)}
                className="w-full max-h-[94px] overflow-y-auto resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter showCloseButton={false} className="justify-start">
            <Button
              type="button"
              variant="default"
              disabled={!uploadMorePhotosUrl.trim()}
              onClick={async () => {
                const url = uploadMorePhotosUrl.trim()
                if (!url) return
                await onUploadMoreLowRes?.({ url, notes: uploadMorePhotosNotes.trim() || undefined })
                setUploadMorePhotosDialogOpen(false)
                setUploadMorePhotosUrl("")
                setUploadMorePhotosNotes("")
                toast.success("Additional photos uploaded.")
              }}
            >
              upload more photos
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
                try {
                  await onUploadLowRes?.({ url, notes: uploadLowResNotes.trim() || undefined })
                  setUploadLowResDialogOpen(false)
                  setUploadLowResUrl("")
                  setUploadLowResNotes("")
                  setOpenStepId(null)
                  toast.success("Low-res scans uploaded.")
                } catch {
                  // Error already surfaced by page (toast.error)
                }
              }}
            >
              Upload low-res
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload photographer selection (step 4): URL + optional notes, CTA disabled until URL filled */}
      <Dialog
        open={uploadPhotographerSelectionDialogOpen}
        onOpenChange={(open) => {
          setUploadPhotographerSelectionDialogOpen(open)
          if (!open) {
            setUploadPhotographerSelectionUrl("")
            setUploadPhotographerSelectionNotes("")
          }
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share photographer selection</DialogTitle>
            <DialogDescription>
              Upload here the selection of photos to share with client
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="upload-photographer-selection-url">Link or URL with photos</Label>
              <Input
                id="upload-photographer-selection-url"
                type="url"
                placeholder="Paste here the link"
                value={uploadPhotographerSelectionUrl}
                onChange={(e) => setUploadPhotographerSelectionUrl(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="upload-photographer-selection-notes">Notes and comments (optional)</Label>
              <Textarea
                id="upload-photographer-selection-notes"
                placeholder="Write here comments and notes"
                value={uploadPhotographerSelectionNotes}
                onChange={(e) => setUploadPhotographerSelectionNotes(e.target.value)}
                className="w-full max-h-[94px] overflow-y-auto resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter showCloseButton={false} className="justify-start">
            <Button
              type="button"
              variant="default"
              disabled={!uploadPhotographerSelectionUrl.trim()}
              onClick={async () => {
                const url = uploadPhotographerSelectionUrl.trim()
                if (!url) return
                await onUploadPhotographerSelection?.({ url, notes: uploadPhotographerSelectionNotes.trim() || undefined })
                setUploadPhotographerSelectionDialogOpen(false)
                setUploadPhotographerSelectionUrl("")
                setUploadPhotographerSelectionNotes("")
                setOpenStepId(null)
                toast.success("Selection uploaded.")
              }}
            >
              Upload selection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Missing photos: request additional footage from photographer */}
      <Dialog
        open={missingPhotosDialogOpen}
        onOpenChange={(open) => {
          setMissingPhotosDialogOpen(open)
          if (!open) setMissingPhotosNotes("")
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Missing photos</DialogTitle>
            <DialogDescription>
              Provide all the necessary details so photo lab can prepare a new selection of images with the missing footage.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="missing-photos-notes">Notes and comments</Label>
              <Textarea
                id="missing-photos-notes"
                placeholder="Write here comments and notes"
                value={missingPhotosNotes}
                onChange={(e) => setMissingPhotosNotes(e.target.value)}
                className="w-full max-h-[94px] overflow-y-auto resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter showCloseButton={false} className="justify-start">
            <Button
              type="button"
              variant="default"
              disabled={!missingPhotosNotes.trim()}
              onClick={async () => {
                const notes = missingPhotosNotes.trim()
                if (!notes) return
                await onRequestAdditionalPhotos?.(notes)
                setMissingPhotosDialogOpen(false)
                setMissingPhotosNotes("")
                setOpenStepId(null)
                toast.success("Comments sent to the photographer")
              }}
            >
              Request additional photos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client selection (step 5): Upload selection — URL + comments (same pattern as step 4) */}
      <Dialog
        open={clientUploadSelectionDialogOpen}
        onOpenChange={(open) => {
          setClientUploadSelectionDialogOpen(open)
          if (!open) {
            setClientUploadSelectionUrl("")
            setClientUploadSelectionNotes("")
          }
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share client selection</DialogTitle>
            <DialogDescription>
              Upload here the selection of photos to convert to high-res
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="client-upload-selection-url">Link or URL with photos</Label>
              <Input
                id="client-upload-selection-url"
                type="url"
                placeholder="Paste here the link"
                value={clientUploadSelectionUrl}
                onChange={(e) => setClientUploadSelectionUrl(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="client-upload-selection-notes">Comments (optional)</Label>
              <Textarea
                id="client-upload-selection-notes"
                placeholder="Write here comments and notes"
                value={clientUploadSelectionNotes}
                onChange={(e) => setClientUploadSelectionNotes(e.target.value)}
                className="w-full max-h-[94px] overflow-y-auto resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter showCloseButton={false} className="justify-start">
            <Button
              type="button"
              variant="default"
              disabled={!clientUploadSelectionUrl.trim()}
              onClick={async () => {
                const url = clientUploadSelectionUrl.trim()
                if (!url) return
                try {
                  await onUploadClientSelection?.({ url, notes: clientUploadSelectionNotes.trim() || undefined })
                  setClientUploadSelectionDialogOpen(false)
                  setClientUploadSelectionUrl("")
                  setClientUploadSelectionNotes("")
                  setOpenStepId(null)
                  toast.success("Selection uploaded.")
                } catch {
                  // Error surfaced by page if any
                }
              }}
            >
              Upload selection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client selection (step 5): Request more photos from photographer */}
      <Dialog
        open={clientMissingPhotosDialogOpen}
        onOpenChange={(open) => {
          setClientMissingPhotosDialogOpen(open)
          if (!open) setClientMissingPhotosNotes("")
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request more photos</DialogTitle>
            <DialogDescription>
              Provide details so the photographer can prepare additional options for your selection.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="client-missing-photos-notes">Notes and comments</Label>
              <Textarea
                id="client-missing-photos-notes"
                placeholder="Write here comments and notes"
                value={clientMissingPhotosNotes}
                onChange={(e) => setClientMissingPhotosNotes(e.target.value)}
                className="w-full max-h-[94px] overflow-y-auto resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter showCloseButton={false} className="justify-start">
            <Button
              type="button"
              variant="default"
              disabled={!clientMissingPhotosNotes.trim()}
              onClick={async () => {
                const notes = clientMissingPhotosNotes.trim()
                if (!notes) return
                await onRequestMorePhotosFromPhotographer?.(notes)
                setClientMissingPhotosDialogOpen(false)
                setClientMissingPhotosNotes("")
                setOpenStepId(null)
                toast.success("Request sent to the photographer.")
              }}
            >
              Request additional photos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 6 (Photographer review): Validate selection — optional comments */}
      <Dialog
        open={validateSelectionDialogOpen}
        onOpenChange={(open) => {
          setValidateSelectionDialogOpen(open)
          if (!open) setValidateSelectionComments("")
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Validate client selection</DialogTitle>
            <DialogDescription>
              Give all necessary details so photographer can prepare a new selection of images with the missing footage
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="validate-selection-comments">Notes and comments (optional)</Label>
              <Textarea
                id="validate-selection-comments"
                placeholder="Write here comments and notes for lab"
                value={validateSelectionComments}
                onChange={(e) => setValidateSelectionComments(e.target.value)}
                className="w-full max-h-[94px] overflow-y-auto resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter showCloseButton={false} className="justify-start">
            <Button
              type="button"
              variant="default"
              onClick={async () => {
                try {
                  await onValidateClientSelection?.(validateSelectionComments.trim() || undefined)
                  setValidateSelectionDialogOpen(false)
                  setValidateSelectionComments("")
                  setOpenStepId(null)
                  toast.success("Selection validated.")
                } catch {
                  // Error surfaced by page if any
                }
              }}
            >
              Validate selection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 6 (Photographer review): Request more photos from client */}
      <Dialog
        open={photographerRequestClientPhotosDialogOpen}
        onOpenChange={(open) => {
          setPhotographerRequestClientPhotosDialogOpen(open)
          if (!open) setPhotographerRequestClientPhotosNotes("")
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request more photos</DialogTitle>
            <DialogDescription>
              Provide details so the client can prepare additional options for selection.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="photographer-request-client-photos-notes">Notes and comments</Label>
              <Textarea
                id="photographer-request-client-photos-notes"
                placeholder="Write here comments and notes"
                value={photographerRequestClientPhotosNotes}
                onChange={(e) => setPhotographerRequestClientPhotosNotes(e.target.value)}
                className="w-full max-h-[94px] overflow-y-auto resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter showCloseButton={false} className="justify-start">
            <Button
              type="button"
              variant="default"
              disabled={!photographerRequestClientPhotosNotes.trim()}
              onClick={async () => {
                const notes = photographerRequestClientPhotosNotes.trim()
                if (!notes) return
                await onRequestMorePhotosFromClient?.(notes)
                setPhotographerRequestClientPhotosDialogOpen(false)
                setPhotographerRequestClientPhotosNotes("")
                setOpenStepId(null)
                toast.success("Request sent to the client.")
              }}
            >
              Request additional photos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 7 (Low-res to high-res): Upload high-res selection — URL + optional notes */}
      <Dialog
        open={uploadHighResDialogOpen}
        onOpenChange={(open) => {
          setUploadHighResDialogOpen(open)
          if (!open) {
            setUploadHighResUrl("")
            setUploadHighResNotes("")
          }
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload high-res selection</DialogTitle>
            <DialogDescription>
              Share the link to the high-resolution selection for this collection.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="upload-high-res-url">Link or URL with high-res photos</Label>
              <Input
                id="upload-high-res-url"
                type="url"
                placeholder="Paste here the link"
                value={uploadHighResUrl}
                onChange={(e) => setUploadHighResUrl(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="upload-high-res-notes">Comments (optional)</Label>
              <Textarea
                id="upload-high-res-notes"
                placeholder="Write here comments and notes"
                value={uploadHighResNotes}
                onChange={(e) => setUploadHighResNotes(e.target.value)}
                className="w-full max-h-[94px] overflow-y-auto resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter showCloseButton={false} className="justify-start">
            <Button
              type="button"
              variant="default"
              disabled={!uploadHighResUrl.trim()}
              onClick={async () => {
                const url = uploadHighResUrl.trim()
                if (!url) return
                try {
                  await onUploadHighRes?.({ url, notes: uploadHighResNotes.trim() || undefined })
                  setUploadHighResDialogOpen(false)
                  setUploadHighResUrl("")
                  setUploadHighResNotes("")
                  setOpenStepId(null)
                  toast.success("High-res selection uploaded.")
                } catch {
                  // Error surfaced by page if any
                }
              }}
            >
              Upload high-res
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 8 (Edition request): Give instructions to retouch studio — link (optional) + improvement details */}
      <Dialog
        open={giveInstructionsDialogOpen}
        onOpenChange={(open) => {
          setGiveInstructionsDialogOpen(open)
          if (!open) {
            setGiveInstructionsDetails("")
            setGiveInstructionsUrl("")
          }
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload improvement details</DialogTitle>
            <DialogDescription>
              Upload all the necessary information for the retouch studio to make edits and prepare finals
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="give-instructions-url">Link or URL (optional)</Label>
              <Input
                id="give-instructions-url"
                type="url"
                placeholder="Paste here the link"
                value={giveInstructionsUrl}
                onChange={(e) => setGiveInstructionsUrl(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="give-instructions-details">Notes and comments (optional)</Label>
              <Textarea
                id="give-instructions-details"
                placeholder="Write here comments and notes"
                value={giveInstructionsDetails}
                onChange={(e) => setGiveInstructionsDetails(e.target.value)}
                className="w-full max-h-[94px] overflow-y-auto resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter showCloseButton={false} className="justify-start">
            <Button
              type="button"
              variant="default"
              disabled={!giveInstructionsDetails.trim() && !giveInstructionsUrl.trim()}
              onClick={async () => {
                const details = giveInstructionsDetails.trim()
                const url = giveInstructionsUrl.trim() || undefined
                if (!details && !url) return
                try {
                  await onGiveInstructions?.({ details: details || "", url })
                  setGiveInstructionsDialogOpen(false)
                  setGiveInstructionsDetails("")
                  setGiveInstructionsUrl("")
                  setOpenStepId(null)
                  toast.success("Instructions sent to the retouch studio.")
                } catch {
                  // Error surfaced by page if any
                }
              }}
            >
              Upload details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 9 (Final edits): Upload finals — URL + optional notes */}
      <Dialog
        open={uploadFinalsDialogOpen}
        onOpenChange={(open) => {
          setUploadFinalsDialogOpen(open)
          if (!open) {
            setUploadFinalsUrl("")
            setUploadFinalsNotes("")
          }
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload finals</DialogTitle>
            <DialogDescription>
              Share the link to the final retouched photos for this collection.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="upload-finals-url">Link or URL with final photos</Label>
              <Input
                id="upload-finals-url"
                type="url"
                placeholder="Paste here the link"
                value={uploadFinalsUrl}
                onChange={(e) => setUploadFinalsUrl(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="upload-finals-notes">Comments (optional)</Label>
              <Textarea
                id="upload-finals-notes"
                placeholder="Write here comments and notes"
                value={uploadFinalsNotes}
                onChange={(e) => setUploadFinalsNotes(e.target.value)}
                className="w-full max-h-[94px] overflow-y-auto resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter showCloseButton={false} className="justify-start">
            <Button
              type="button"
              variant="default"
              disabled={!uploadFinalsUrl.trim()}
              onClick={async () => {
                const url = uploadFinalsUrl.trim()
                if (!url) return
                try {
                  await onUploadFinals?.({ url, notes: uploadFinalsNotes.trim() || undefined })
                  setUploadFinalsDialogOpen(false)
                  setUploadFinalsUrl("")
                  setUploadFinalsNotes("")
                  setOpenStepId(null)
                  toast.success("Finals uploaded.")
                } catch {
                  // Error surfaced by page if any
                }
              }}
            >
              Upload finals
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 10 (Photographer last check): Request changes — optional notes */}
      <Dialog
        open={requestChangesDialogOpen}
        onOpenChange={(open) => {
          setRequestChangesDialogOpen(open)
          if (!open) setRequestChangesNotes("")
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
            <DialogDescription>
              Describe the changes you need so the edition studio can update the finals.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="request-changes-notes">Notes and comments (optional)</Label>
              <Textarea
                id="request-changes-notes"
                placeholder="Write here comments and notes"
                value={requestChangesNotes}
                onChange={(e) => setRequestChangesNotes(e.target.value)}
                className="w-full max-h-[94px] overflow-y-auto resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter showCloseButton={false} className="justify-start">
            <Button
              type="button"
              variant="default"
              onClick={async () => {
                try {
                  await onRequestChanges?.(requestChangesNotes.trim() || undefined)
                  setRequestChangesDialogOpen(false)
                  setRequestChangesNotes("")
                  setOpenStepId(null)
                  toast.success("Change request sent.")
                } catch {
                  // Error surfaced by page if any
                }
              }}
            >
              Request changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Low-res URL picker: when there are 2 URLs, user chooses URL 01 or URL 02 */}
      <Dialog open={lowResUrlPickerDialogOpen} onOpenChange={setLowResUrlPickerDialogOpen}>
        <DialogContent showCloseButton className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Low-res photos</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                if (lowResSelectionUrl?.trim()) {
                  window.open(lowResSelectionUrl.trim(), "_blank", "noopener,noreferrer")
                  setLowResUrlPickerDialogOpen(false)
                }
              }}
            >
              URL 01
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                if (lowResSelectionUrl02?.trim()) {
                  window.open(lowResSelectionUrl02.trim(), "_blank", "noopener,noreferrer")
                  setLowResUrlPickerDialogOpen(false)
                }
              }}
            >
              URL 02
            </Button>
          </div>
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
