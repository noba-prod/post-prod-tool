"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { cn, ensureAbsoluteUrl } from "@/lib/utils"
import { normalizeStepIdFromQuery } from "@/lib/notifications/navigation"
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
  entities: ParticipantsModalEntity[],
  options?: { isDigitalWithRetouch?: boolean }
): { individuals: ParticipantsModalIndividual[]; entities: ParticipantsModalEntity[] } {
  const isPhotoLabEntity = (entity: ParticipantsModalEntity): boolean =>
    (entity.entityTypeLabel ?? "").toLowerCase().includes("photo lab")

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
      entities: entities.filter((e) => isPhotoLabEntity(e)),
    }
  }
  if (stepId === "photographer_selection") {
    return {
      individuals: individuals.filter((u) => (u.roleLabel ?? "").toLowerCase() === "photographer"),
      entities: entities.filter((e) => isPhotoLabEntity(e)),
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
      entities: entities.filter((e) => {
        const label = (e.entityTypeLabel ?? "").toLowerCase()
        if (options?.isDigitalWithRetouch) {
          return label.includes("retouch") || label.includes("edition")
        }
        return label.includes("hand print") || label.includes("handprint")
      }),
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
import { UrlHistory, type UrlHistoryComment } from "../url-history"
import { LinkAccordion, type LinkAccordionItem } from "../link-accordion"
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
import { ValidateLinksDialog, type ValidateLinksDialogItem } from "@/components/custom/validate-links-dialog"
import type { CollectionMemberRole } from "@/lib/supabase/database.types"

const NOTIFICATIONS_REFRESH_EVENT = "noba:notifications:refresh"

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
  /** Shooting type: Digital or Analog HP/HR (tag to the left of photographer) */
  shootingType?: "digital" | "handprint_hp" | "handprint_hr"
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
  /** Called when owner confirms pickup (Shooting step). For Digital: shootingType="digital" triggers shooting_completed_confirmed. For Analog: triggers negatives_pickup_marked. */
  onConfirmPickup?: (stepId: string, shootingType?: string) => void | Promise<void>
  /** Called when owner confirms delivery (Negatives drop-off step). Pass canMeetDeadline from dialog Yes/No. */
  onConfirmDropoffDelivery?: (stepId: string, canMeetDeadline: boolean) => void | Promise<void>
  /** Called when owner uploads low-res (step 3). Payload: url (required), notes (optional). Marks step completed, notifies producer + photographer. */
  onUploadLowRes?: (payload: { url: string; notes?: string }) => void | Promise<void>
  /** Called when owner uploads additional footage (step 3, after first upload). Saves to lowres_selection_url02, overwrites lowres_lab_notes. */
  onUploadMoreLowRes?: (payload: { url: string; notes?: string }) => void | Promise<void>
  /** Upload low-res dialog: show shipping reminder only when handprint lab is different from original (configured in collection creation). */
  uploadLowResShowShippingReminder?: boolean
  /** Upload low-res dialog: initial notes (e.g. from last note in step_notes_low_res) to pre-fill when opening. */
  uploadLowResInitialNotes?: string
  /** Step 4 (Photographer selection): low-res URL(s) (step 3 uploads). Array — latest is last. */
  lowResSelectionUrl?: string | string[]
  /** Step 4: when the low-res URL was last uploaded (ISO). */
  lowResUploadedAt?: string
  /** Step 4: URL of uploaded photographer selection. Array — latest is last. */
  photographerSelectionUrl?: string | string[]
  /** Step 4: when photographer selection was uploaded (ISO). */
  photographerSelectionUploadedAt?: string
  /** Step 4: notes conversation for photographer selection step. */
  photographerNotes01?: string
  /** Called when owner uploads photographer selection (step 4). Marks step completed, notifies producer + client. */
  onUploadPhotographerSelection?: (payload: { url: string; notes?: string }) => void | Promise<void>
  /** Step notes conversation for low-res step (step 3). */
  stepNotesLowRes?: Array<{ from: string; text: string; at: string; userId?: string }>
  /** Step notes conversation for photographer selection step (step 4). */
  stepNotesPhotographerSelection?: Array<{ from: string; text: string; at: string; userId?: string }>
  /** Called when photographer requests additional photos (missing photos flow). Posts event + note, triggers revert. */
  onRequestAdditionalPhotos?: (notes: string) => void | Promise<void>
  /** Called when user adds a comment via UrlHistory "Add comment" button. Appends to the step's notes column. url links the comment to a specific link block. */
  onAddStepNote?: (payload: { stepNoteKey: string; from: string; text: string; url?: string }) => void | Promise<void>
  /** Step 5 (Client selection): called when client uploads final selection. */
  onUploadClientSelection?: (payload: { url: string; notes?: string }) => void | Promise<void>
  /** Step 5 (Client selection): called when client requests more photos from photographer. */
  onRequestMorePhotosFromPhotographer?: (notes: string) => void | Promise<void>
  /** Step 6 (Photographer review): URL(s) of client final selection (step 5 upload). Array — latest is last. */
  clientSelectionUrl?: string | string[]
  /** Step 6: when the client selection URL was uploaded (ISO). */
  clientSelectionUploadedAt?: string
  /** Step 6: URL(s) uploaded by photographer during review/validation. Array — latest is last. */
  photographerReviewUrl?: string | string[]
  /** Step 6: when the photographer review URL was uploaded (ISO). */
  photographerReviewUploadedAt?: string
  /** Step notes conversation for client selection step (step 5). */
  stepNotesClientSelection?: Array<{ from: string; text: string; at: string; userId?: string }>
  /** Step 6: called when photographer validates client selection (adds comments/link). */
  onValidateClientSelection?: (comments?: string, url?: string) => void | Promise<void>
  /** Step 6: called when photographer approves client selection directly. Receives selected URLs when multiple links exist. */
  onValidateClientSelectionDirect?: (selectedUrls?: string[]) => void | Promise<void>
  /** Step 6: called when photographer requests more photos from client. */
  onRequestMorePhotosFromClient?: (notes: string) => void | Promise<void>
  /** Step notes conversation for photographer review step (step 6). */
  stepNotesPhotographerReview?: Array<{ from: string; text: string; at: string; userId?: string }>
  /** Step 7: called when lab uploads high-res selection. */
  onUploadHighRes?: (payload: { url: string; notes?: string }) => void | Promise<void>
  /** Step 7+8 combined (Digital + Retouch only): upload single link + notes in one action. */
  onUploadHighResAndInstructions?: (payload: { url: string; details?: string; instructionsUrl?: string }) => void | Promise<void>
  /** Step 8 (Edition request): URL(s) of high-res selection (step 7 upload). Array — latest is last. */
  highResSelectionUrl?: string | string[]
  /** Step 8: when the high-res URL was uploaded (ISO). */
  highResUploadedAt?: string
  /** Step 8: name of entity that uploaded high-res (e.g. Hand Print Lab name) for "Uploaded by @X". */
  highResUploadedByName?: string
  /** Step notes conversation for high-res step (step 7). */
  stepNotesHighRes?: Array<{ from: string; text: string; at: string; userId?: string }>
  /** Step 8: entity name for notes block (e.g. "Hand Print Lab" or "Photo Lab"). */
  highResUploadedByEntityName?: string
  /** Step 8: called when photographer gives improvement instructions to retouch studio. */
  onGiveInstructions?: (payload: { details: string; url?: string }) => void | Promise<void>
  /** Step 9 (Final edits): URL(s) of improvement instructions from step 8. Array — latest is last. */
  editionRequestInstructionsUrl?: string | string[]
  /** Step 9: when the photographer gave instructions (step 8) — ISO. */
  editionRequestInstructionsUploadedAt?: string
  /** Step notes conversation for edition request step (step 8). */
  stepNotesEditionRequest?: Array<{ from: string; text: string; at: string; userId?: string }>
  /** Step 9: called when edition studio uploads final retouched photos. */
  onUploadFinals?: (payload: { url: string; notes?: string }) => void | Promise<void>
  /** Step 10 (Photographer last check): URL(s) of finals from step 9. Array — latest is last. */
  finalsSelectionUrl?: string | string[]
  /** Step 10: when finals were uploaded (step 9) or high-res (step 7). ISO. */
  finalsUploadedAt?: string
  /** Step 10: URL(s) added by photographer when finals need additional links. Array — latest is last. */
  photographerLastCheckUrl?: string | string[]
  /** Step 10: when photographer last check URL was last uploaded. ISO. */
  photographerLastCheckUploadedAt?: string
  /** Step 10: URLs from material (finals/high-res) that photographer selected to share with client. When set, client_confirmation shows only these. */
  photographerApprovedMaterialUrls?: string[]
  /** Step 10: name of entity that uploaded finals (e.g. Edition studio name) for "Uploaded by @X". */
  finalsUploadedByName?: string
  /** Step notes conversation for final edits step (step 9). */
  stepNotesFinalEdits?: Array<{ from: string; text: string; at: string; userId?: string }>
  /** Step 10: entity name for notes block (e.g. "Retouch studio"). */
  finalsUploadedByEntityName?: string
  /** Step 10: called when photographer adds a new link and/or comments (secondary action). */
  onAddPhotographerLastCheckLink?: (payload: { url?: string; comments?: string; from?: string }) => void | Promise<void>
  /** Step 10: called when photographer shares final edits url with client (primary action). Receives selected URLs when multiple links exist. */
  onValidateFinals?: (selectedUrls?: string[]) => void | Promise<void>
  /** When false (Analog HPy no retouches): photographer_last_check shows high-res to validate; when true: shows final edits from retouch studio. */
  hasEditionStudio?: boolean
  /** Step 11: called when client completes collection (primary action). */
  onCompleteCollection?: () => void | Promise<void>
  /** Step notes conversation for photographer last check step (step 10). */
  stepNotesPhotographerLastCheck?: Array<{ from: string; text: string; at: string; userId?: string }>
  /** Step notes conversation for client confirmation step (step 11). */
  stepNotesClientConfirmation?: Array<{ from: string; text: string; at: string; userId?: string }>
  /** Map of userId → { name, entityName, entityImageUrl } for all collection members. Used to resolve step note author identity. */
  noteAuthorsByUserId?: Record<string, { name: string; userImageUrl?: string; entityName?: string; entityImageUrl?: string }>
  /** Additional footage request: entity name + notes per step. Shown as "additionalRequest" variant when someone requested more photos via the "missing photos" flow. */
  additionalFootageRequest?: {
    /** Entity name requesting additional photos (e.g. "Photographer", "Client"). */
    entityName: string
    /** The notes/reason left by the requester. */
    notes?: string
    /** Which step this request applies to (the step that should display the block). */
    forStepId: string
    /** Whether the owner has already responded (uploaded additional footage). */
    isCompleted?: boolean
  }
  /** Upload low-res dialog: shipping reminder — delivery date (ISO), time, and handprint lab destination. */
  uploadLowResShippingReminderDate?: string
  uploadLowResShippingReminderTime?: string
  uploadLowResShippingReminderDestination?: string
  /** NavBar props when no UserContext */
  navBarProps?: NavBarConfig
  /** Current active owner roles for the active step (from collections.current_owners). */
  currentOwners?: CollectionMemberRole[]
  /** Per-step owner roles (used for canShowModalActions: open step's owners, not active step). */
  stepOwners?: Record<string, CollectionMemberRole[]>
  /** Current user collection role in DB format (noba, client, photographer, ...). */
  currentUserCollectionRole?: CollectionMemberRole | null
  /** Current user edit permission at collection level. */
  currentUserHasEditPermission?: boolean
  /** DEBUG (dev only): stepId → owner DB roles for that step. Safe to remove. */
  debugStepOwners?: Record<string, string[]>
  /** DEBUG (dev only): stepId → user names with edit_permission among owner roles. Safe to remove. */
  debugCanEditPerStep?: Record<string, string[]>
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
  photographerSelectionUrl,
  photographerSelectionUploadedAt,
  photographerNotes01,
  onUploadPhotographerSelection,
  stepNotesLowRes,
  stepNotesPhotographerSelection,
  onRequestAdditionalPhotos,
  onAddStepNote,
  onUploadClientSelection,
  onRequestMorePhotosFromPhotographer,
  clientSelectionUrl,
  clientSelectionUploadedAt,
  photographerReviewUrl,
  photographerReviewUploadedAt,
  stepNotesClientSelection,
  onValidateClientSelection,
  onValidateClientSelectionDirect,
  onRequestMorePhotosFromClient,
  stepNotesPhotographerReview,
  onUploadHighRes,
  onUploadHighResAndInstructions,
  highResSelectionUrl,
  highResUploadedAt,
  highResUploadedByName,
  stepNotesHighRes,
  highResUploadedByEntityName,
  onGiveInstructions,
  editionRequestInstructionsUrl,
  editionRequestInstructionsUploadedAt,
  stepNotesEditionRequest,
  onUploadFinals,
  finalsSelectionUrl,
  finalsUploadedAt,
  finalsUploadedByName,
  photographerLastCheckUrl,
  photographerLastCheckUploadedAt,
  photographerApprovedMaterialUrls,
  stepNotesFinalEdits,
  finalsUploadedByEntityName,
  onAddPhotographerLastCheckLink,
  onValidateFinals,
  hasEditionStudio = true,
  onCompleteCollection,
  stepNotesPhotographerLastCheck,
  stepNotesClientConfirmation,
  noteAuthorsByUserId,
  additionalFootageRequest,
  uploadLowResShippingReminderDate,
  uploadLowResShippingReminderTime,
  uploadLowResShippingReminderDestination,
  navBarProps,
  currentOwners = [],
  stepOwners,
  currentUserCollectionRole = null,
  currentUserHasEditPermission = false,
  debugStepOwners,
  debugCanEditPerStep,
  className,
}: CollectionTemplateProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const authAdapter = useAuthAdapter()

  const userContext = useUserContext()
  const navConfig = useNavigationConfig(userContext.entity?.type ?? null)

  // Helper: get latest URL from string | string[]
  const latestUrl = (v: string | string[] | undefined): string | undefined => {
    if (!v) return undefined
    if (Array.isArray(v)) return v.length > 0 ? v[v.length - 1] : undefined
    return v
  }
  // Helper: get all URLs from string | string[]
  const allUrls = (v: string | string[] | undefined): string[] => {
    if (!v) return []
    if (Array.isArray(v)) return v
    return [v]
  }
  // Helper: get the last note text from a step notes array
  const lastNoteText = (notes: Array<{ from: string; text: string; at: string }> | undefined): string | undefined => {
    if (!notes || notes.length === 0) return undefined
    return notes[notes.length - 1]?.text
  }
  // Helper: find last note from a specific role
  const lastNoteFrom = (notes: Array<{ from: string; text: string; at: string }> | undefined, from: string): string | undefined => {
    if (!notes || notes.length === 0) return undefined
    for (let i = notes.length - 1; i >= 0; i--) {
      if (notes[i]?.from === from) return notes[i]?.text
    }
    return undefined
  }
  // Helper: find "at" timestamp of last note from a specific role
  const lastNoteAtFrom = (notes: Array<{ from: string; text: string; at: string }> | undefined, from: string): string | undefined => {
    if (!notes || notes.length === 0) return undefined
    for (let i = notes.length - 1; i >= 0; i--) {
      if (notes[i]?.from === from) return notes[i]?.at
    }
    return undefined
  }

  // Derived values for backward compatibility with existing template body
  const photographerMissingphotos = lastNoteFrom(stepNotesLowRes, "photographer")
  /** Client requested more photos from photographer (in next step, client_selection); note stored in stepNotesPhotographerSelection. */
  const clientRequestedMorePhotosFromPhotographer = lastNoteFrom(stepNotesPhotographerSelection, "client")
  /** When the client last requested more photos (for photographer_selection "completed" check). */
  const lastClientRequestAtPhotographerSelection = lastNoteAtFrom(stepNotesPhotographerSelection, "client")
  /** Photographer requested more photos from lab (low_res_scanning loop); note stored in stepNotesLowRes. */
  const lastPhotographerRequestAtLowRes = lastNoteAtFrom(stepNotesLowRes, "photographer")
  /** Photographer requested changes from edition studio (photographer_last_check → final_edits loop). */
  const photographerRequestedChangesFromEditionStudio = lastNoteFrom(stepNotesPhotographerLastCheck, "photographer")
  /** When the photographer last requested changes (for final_edits "completed" check). */
  const lastPhotographerRequestAtFinalEdits = lastNoteAtFrom(stepNotesPhotographerLastCheck, "photographer")
  const lowResSelectionUrlLatest = latestUrl(lowResSelectionUrl)
  const photographerSelectionUrlLatest = latestUrl(photographerSelectionUrl)
  const clientSelectionUrlLatest = latestUrl(clientSelectionUrl)
  const highResSelectionUrlLatest = latestUrl(highResSelectionUrl)
  const editionRequestInstructionsUrlLatest = latestUrl(editionRequestInstructionsUrl)
  const finalsSelectionUrlLatest = latestUrl(finalsSelectionUrl)
  const clientNotes01 = lastNoteText(stepNotesClientSelection)
  const highResUploadNotes = lastNoteText(stepNotesHighRes)
  const editionRequestInstructionsNotes = lastNoteText(stepNotesEditionRequest)
  const finalsUploadNotes = lastNoteText(stepNotesFinalEdits)
  const photographerValidationNotes = lastNoteText(stepNotesPhotographerReview)

  /** Resolve uploader entity display (name + image) for link-accordion note author by role. */
  const resolveUploaderDisplay = React.useCallback(
    (expectedNoteFrom: string): { name: string; imageUrl?: string } | null => {
      if (expectedNoteFrom === "photographer") {
        const p = (participantsMainPlayersIndividuals ?? []).find(
          (u) => (u.roleLabel ?? "").toLowerCase() === "photographer"
        )
        return p ? { name: p.name, imageUrl: p.imageUrl } : null
      }
      if (expectedNoteFrom === "client") {
        const e = (participantsMainPlayersEntities ?? []).find(
          (e) => (e.entityTypeLabel ?? "").toLowerCase() === "client"
        )
        return e ? { name: e.entityName, imageUrl: e.imageUrl } : null
      }
      if (expectedNoteFrom === "photo_lab" || expectedNoteFrom === "lab") {
        const e = (participantsMainPlayersEntities ?? []).find(
          (e) => (e.entityTypeLabel ?? "").toLowerCase().includes("photo lab")
        )
        return e ? { name: e.entityName, imageUrl: e.imageUrl } : null
      }
      if (expectedNoteFrom === "retouch_studio" || expectedNoteFrom === "edition_studio") {
        const e = (participantsMainPlayersEntities ?? []).find(
          (e) =>
            (e.entityTypeLabel ?? "").toLowerCase().includes("retouch") ||
            (e.entityTypeLabel ?? "").toLowerCase().includes("edition")
        )
        return e ? { name: e.entityName, imageUrl: e.imageUrl } : null
      }
      if (expectedNoteFrom === "handprint_lab") {
        const e = (participantsMainPlayersEntities ?? []).find(
          (e) =>
            (e.entityTypeLabel ?? "").toLowerCase().includes("hand print") ||
            (e.entityTypeLabel ?? "").toLowerCase().includes("handprint")
        )
        return e ? { name: e.entityName, imageUrl: e.imageUrl } : null
      }
      return null
    },
    [participantsMainPlayersIndividuals, participantsMainPlayersEntities]
  )

  /** Build LinkAccordionItem[] from a URL prop + step notes array.
   *  First URL gets label "Original link", subsequent get "Additional footage #NN".
   *  primarySubtitle shows relative time since upload (uploadedAt for first item, notes[idx].at for each).
   *  Only notes from the uploader (expectedNoteFrom) are shown per item — i.e. the "Notes and comments" from the upload form, not request-more-photos notes from others.
   *  Note author is the step owner (uploader): use uploaderDisplayName + uploaderImageUrl when provided (from participants), else fallback to role label.
   *  URLs are deduplicated (first occurrence kept) to avoid "Original link" + "Additional selection" when client sent only one link.
   */
  const buildLinkAccordionItems = React.useCallback(
    (
      urlProp: string | string[] | undefined,
      notes: Array<{ from: string; text: string; at: string; userId?: string }> | undefined,
      cardTitle: string,
      bgImage: string,
      _uploaderName?: string,
      uploadedAt?: string,
      /** When set, only show the note for an item if it's from this role (upload-form notes only, not request-more-photos). */
      expectedNoteFrom?: string,
      /** Resolved step owner display (entity name + image) for note author — e.g. from resolveUploaderDisplay(expectedNoteFrom). */
      uploaderDisplay?: { name: string; imageUrl?: string } | null,
    ): LinkAccordionItem[] => {
      const rawUrls = allUrls(urlProp)
      const seen = new Set<string>()
      const urls = rawUrls.filter((u) => {
        if (seen.has(u)) return false
        seen.add(u)
        return true
      })
      if (urls.length === 0) return []
      const uploaderNotes =
        expectedNoteFrom != null
          ? (notes ?? []).filter((n) => {
              if (n.from === expectedNoteFrom) return true
              if (expectedNoteFrom === "photo_lab" && n.from === "lab") return true
              if (expectedNoteFrom === "retouch_studio" && n.from === "edition_studio") return true
              return false
            })
          : undefined
      const fallbackEntityName = uploaderDisplay?.name?.trim() || (expectedNoteFrom ? expectedNoteFrom.charAt(0).toUpperCase() + expectedNoteFrom.slice(1).replace(/_/g, " ") : undefined)
      const fallbackEntityImageUrl = uploaderDisplay?.imageUrl
      return urls.map((url, idx) => {
        const note = uploaderNotes != null ? uploaderNotes[idx] : notes?.[idx]
        const at = (idx === 0 ? uploadedAt : undefined) ?? note?.at
        const trimmedText = note?.text?.trim()
        const hasNote = note != null && (trimmedText?.length ?? 0) > 0
        const noteAuthor = note?.userId ? noteAuthorsByUserId?.[note.userId] : undefined
        const entityName = noteAuthor?.entityName?.trim() || fallbackEntityName
        const entityImageUrl = noteAuthor?.entityImageUrl || fallbackEntityImageUrl
        const userName = noteAuthor?.name?.trim() || undefined
        const userImageUrl = noteAuthor?.userImageUrl || undefined
        const label: React.ReactNode =
          idx === 0 ? (
            "Original link"
          ) : (
            <>
              <span>Additional footage </span>
              <span className="text-lime-500">#{String(idx).padStart(2, "0")}</span>
            </>
          )
        return {
          label,
          primaryTitle: cardTitle,
          primarySubtitle: at ? `View link · ${formatRelativeTime(at)}` : undefined,
          primaryBackgroundImage: bgImage,
          primaryOnAction: () => window.open(ensureAbsoluteUrl(url), "_blank", "noopener,noreferrer"),
          noteText: trimmedText && trimmedText.length > 0 ? trimmedText : undefined,
          noteAuthorName: hasNote ? entityName : undefined,
          noteAuthorImageUrl: hasNote ? entityImageUrl : undefined,
          noteAuthorUserName: hasNote ? userName : undefined,
          noteAuthorUserImageUrl: hasNote ? userImageUrl : undefined,
          noteTimestamp: hasNote && note?.at ? formatRelativeTime(note.at) : undefined,
          defaultOpen: idx === urls.length - 1,
        } satisfies LinkAccordionItem
      })
    },
    [noteAuthorsByUserId]
  )

  /** Build UrlHistory-compatible items from URLs + notes. One block per URL (link + optional comment thread).
   * stepId: which step this content belongs to — used for "Add comment" to save to the correct notes column.
   * contentLabel: display name for the first link (e.g. "Low-res scans", "Photographer selection").
   * getContentLabel: optional per-block label; when provided, overrides contentLabel. Receives (url, idx, hasPhotographerNotesForUrl). */
  const buildUrlHistoryItems = React.useCallback(
    (
      urlProp: string | string[] | undefined,
      notes: Array<{ from: string; text: string; at: string; userId?: string; url?: string }> | undefined,
      expectedNoteFrom: string,
      uploaderDisplay?: { name: string; imageUrl?: string } | null,
      uploadedAt?: string,
      stepId?: string,
      contentLabel?: string,
      getContentLabel?: (url: string, idx: number, hasPhotographerNotesForUrl: boolean) => string
    ): Array<{ title: string; comments: UrlHistoryComment[]; url: string; stepId: string }> => {
      const rawUrls = allUrls(urlProp)
      const seen = new Set<string>()
      const urls = rawUrls.filter((u) => {
        if (seen.has(u)) return false
        seen.add(u)
        return true
      })
      if (urls.length === 0) return []
      // Deduplicate notes (same from, text, url within 2s) to avoid showing duplicates from double-submit.
      const dedupeNotes = <T extends { from: string; text: string; at: string; url?: string }>(arr: T[], windowMs = 2000): T[] => {
        const out: T[] = []
        for (const n of arr) {
          const prev = out[out.length - 1]
          if (!prev) { out.push(n); continue }
          if (prev.from !== n.from || prev.text !== n.text) { out.push(n); continue }
          const prevUrl = (prev as { url?: string }).url?.trim() ?? ""
          const nUrl = (n as { url?: string }).url?.trim() ?? ""
          if (prevUrl !== nUrl) { out.push(n); continue }
          if (Math.abs(new Date(n.at).getTime() - new Date(prev.at).getTime()) > windowMs) out.push(n)
        }
        return out
      }
      const allNotes = dedupeNotes(notes ?? [])
      // Filter notes by url: each block shows only notes linked to that URL.
      // Legacy notes (no url) are shown in the first block.
      const fallbackEntityName = uploaderDisplay?.name?.trim() || (expectedNoteFrom ? expectedNoteFrom.charAt(0).toUpperCase() + expectedNoteFrom.slice(1).replace(/_/g, " ") : "Unknown")
      const resolveAuthor = (n: { from: string; userId?: string }) => {
        const author = n?.userId ? noteAuthorsByUserId?.[n.userId] : undefined
        const fromLabel = n.from === "lab" ? "Lab" : n.from === "photographer" ? "Photographer" : n.from === "client" ? "Client" : n.from === "edition_studio" ? "Edition studio" : n.from === "noba" ? "noba*" : n.from
        // Photographer is their own entity; show type "Photographer" instead of entity name (which would repeat their name).
        // noba/producer: show "noba*" as entity label when acting on behalf of noba.
        const entityName =
          n.from === "photographer" ? "Photographer" : n.from === "noba" ? (author?.entityName?.trim() || "noba*") : author?.entityName?.trim()
        return {
          name: author?.name?.trim() || author?.entityName?.trim() || fromLabel,
          // Avatar: only use user profile image (profiles.image). If null, StepDetails shows initials.
          imageUrl: author?.userImageUrl,
          entityName: entityName || undefined,
        }
      }
      return urls.map((url, idx) => {
        const notesForThisUrl = allNotes.filter((n) => {
          const noteUrl = (n as { url?: string }).url?.trim() ?? ""
          if (noteUrl) return noteUrl === url
          return idx === 0
        })
        const note = notesForThisUrl[0]
        const trimmedText = note?.text?.trim()
        const hasNote = note != null && (trimmedText?.length ?? 0) > 0
        const { name, imageUrl, entityName } = resolveAuthor(note ?? { from: expectedNoteFrom })
        const primaryComment: UrlHistoryComment | null = hasNote && trimmedText
          ? {
              authorUserName: name || fallbackEntityName,
              authorUserImageUrl: imageUrl,
              authorEntityName: entityName,
              text: trimmedText,
              timestamp: formatRelativeTime(note!.at),
            }
          : null
        const trailingNotes = notesForThisUrl.slice(1).map((n) => {
          const t = n?.text?.trim()
          const { name, imageUrl, entityName } = resolveAuthor(n)
          return {
            authorUserName: name || fallbackEntityName,
            authorUserImageUrl: imageUrl,
            authorEntityName: entityName,
            text: t ?? "",
            timestamp: formatRelativeTime(n.at),
          } satisfies UrlHistoryComment
        }).filter((c) => c.text.length > 0)
        const comments: UrlHistoryComment[] =
          primaryComment
            ? [{ ...primaryComment, replies: trailingNotes }]
            : trailingNotes.length > 0
              ? [{ ...trailingNotes[0]!, replies: trailingNotes.slice(1) }]
              : []
        const hasPhotographerNotesForUrl = notesForThisUrl.some((n) => n.from === "photographer")
        const title = getContentLabel
          ? getContentLabel(url, idx, hasPhotographerNotesForUrl)
          : idx === 0
            ? (contentLabel ?? "Original link")
            : `${contentLabel ?? "Link"} - Additional link ${String(idx).padStart(2, "0")}`
        return { title, comments, url, stepId: stepId ?? "" }
      })
    },
    [noteAuthorsByUserId]
  )

  const [isSearchOpen, setIsSearchOpen] = React.useState(false)
  const [openStepId, setOpenStepId] = React.useState<string | null>(null)
  const [stepsWithUnreadActivity, setStepsWithUnreadActivity] = React.useState<Set<string>>(
    () => new Set()
  )
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
  const [validateSelectionLink, setValidateSelectionLink] = React.useState("")
  const [photographerRequestClientPhotosDialogOpen, setPhotographerRequestClientPhotosDialogOpen] = React.useState(false)
  const [photographerRequestClientPhotosNotes, setPhotographerRequestClientPhotosNotes] = React.useState("")
  const [uploadHighResDialogOpen, setUploadHighResDialogOpen] = React.useState(false)
  const [uploadHighResUrl, setUploadHighResUrl] = React.useState("")
  const [uploadHighResNotes, setUploadHighResNotes] = React.useState("")
  const [giveInstructionsDialogOpen, setGiveInstructionsDialogOpen] = React.useState(false)
  const [giveInstructionsDetails, setGiveInstructionsDetails] = React.useState("")
  const [giveInstructionsUrl, setGiveInstructionsUrl] = React.useState("")
  const [uploadHighResAndInstructionsDialogOpen, setUploadHighResAndInstructionsDialogOpen] = React.useState(false)
  const [uploadHighResAndInstructionsUrl, setUploadHighResAndInstructionsUrl] = React.useState("")
  const [uploadHighResAndInstructionsDetails, setUploadHighResAndInstructionsDetails] = React.useState("")
  const [uploadFinalsDialogOpen, setUploadFinalsDialogOpen] = React.useState(false)
  const [uploadFinalsUrl, setUploadFinalsUrl] = React.useState("")
  const [uploadFinalsNotes, setUploadFinalsNotes] = React.useState("")
  const [addNewLinkDialogOpen, setAddNewLinkDialogOpen] = React.useState(false)
  const [addNewLinkUrl, setAddNewLinkUrl] = React.useState("")
  const [addNewLinkComments, setAddNewLinkComments] = React.useState("")
  const [addCommentDialogOpen, setAddCommentDialogOpen] = React.useState(false)
  const [addCommentNotes, setAddCommentNotes] = React.useState("")
  const [addCommentContext, setAddCommentContext] = React.useState<{ stepNoteKey: string; from: string; url?: string } | null>(null)
  const [addCommentSubmitting, setAddCommentSubmitting] = React.useState(false)
  const [uploadSubmitting, setUploadSubmitting] = React.useState(false)
  // Link accordion dialog (shared across steps)
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false)
  const [linkDialogTitle, setLinkDialogTitle] = React.useState("")
  const [linkDialogDescription, setLinkDialogDescription] = React.useState("")
  const [linkDialogItems, setLinkDialogItems] = React.useState<LinkAccordionItem[]>([])
  const [validateLinksDialogOpen, setValidateLinksDialogOpen] = React.useState(false)
  const [validateLinksDialogConfig, setValidateLinksDialogConfig] = React.useState<{
    links: ValidateLinksDialogItem[]
    singleSelect: boolean
    confirmLabel: string
    onConfirm: (selectedUrls: string[]) => void
  } | null>(null)

  /** Step note config for Add comment: which column + author role per step. */
  const getStepNoteConfig = React.useCallback((stepId: string): { stepNoteKey: string; from: string } | null => {
    const config: Record<string, { stepNoteKey: string; from: string }> = {
      low_res_scanning: { stepNoteKey: "step_note_low_res", from: "lab" },
      photographer_selection: { stepNoteKey: "step_note_photographer_selection", from: "photographer" },
      client_selection: { stepNoteKey: "step_note_client_selection", from: "client" },
      photographer_check_client_selection: { stepNoteKey: "step_note_photographer_review", from: "photographer" },
      handprint_high_res: { stepNoteKey: "step_note_high_res", from: shootingType === "digital" ? "photographer" : "lab" },
      edition_request: { stepNoteKey: "step_note_edition_request", from: "photographer" },
      final_edits: { stepNoteKey: "step_note_final_edits", from: "retouch_studio" },
      photographer_last_check: { stepNoteKey: "step_note_photographer_last_check", from: "photographer" },
      client_confirmation: { stepNoteKey: "step_note_client_confirmation", from: "client" },
    }
    return config[stepId] ?? null
  }, [shootingType])

  /** Map current user's DB role to step note "from" value (who wrote the comment). */
  const getStepNoteFromForCurrentUser = React.useCallback((): string => {
    switch (currentUserCollectionRole) {
      case "photographer":
        return "photographer"
      case "client":
        return "client"
      case "photo_lab":
      case "handprint_lab":
        return "lab"
      case "retouch_studio":
        return "edition_studio"
      default:
        return "noba"
    }
  }, [currentUserCollectionRole])

  const openAddCommentDialog = React.useCallback((stepId: string, url?: string) => {
    const ctx = getStepNoteConfig(stepId)
    if (ctx) {
      setAddCommentContext({ ...ctx, url })
      setAddCommentNotes("")
      setAddCommentDialogOpen(true)
    }
  }, [getStepNoteConfig])

  /** Open the shared link accordion dialog with the given title, description, and accordion items. */
  const openLinkDialog = React.useCallback(
    (title: string, description: string, items: LinkAccordionItem[]) => {
      setLinkDialogTitle(title)
      setLinkDialogDescription(description)
      setLinkDialogItems(items)
      setLinkDialogOpen(true)
    },
    []
  )

  const [participantsModalOpen, setParticipantsModalOpen] = React.useState(false)
  const [editCollectionDialogOpen, setEditCollectionDialogOpen] = React.useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false)
  const [isUpdatingProfile, setIsUpdatingProfile] = React.useState(false)
  const [isCompanyModalOpen, setIsCompanyModalOpen] = React.useState(false)
  const [isUpdatingCompany, setIsUpdatingCompany] = React.useState(false)
  const [companyFormData, setCompanyFormData] = React.useState<EntityBasicInformationFormData | null>(null)
  const [isCompanyFormValid, setIsCompanyFormValid] = React.useState(false)

  const isNobaOwnerWithEditPermission =
    currentUserCollectionRole === "noba" && currentUserHasEditPermission
  const effectiveShowSettingsButton =
    showSettingsButton &&
    (currentUserCollectionRole
      ? isNobaOwnerWithEditPermission
      : (userContext?.isNobaUser ?? false))

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
      let profilePictureUrl: string | null | undefined
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
      } else if (userData.profilePictureRemoved) {
        profilePictureUrl = null
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

  const refreshStepAttention = React.useCallback(async () => {
    if (!collectionId) {
      setStepsWithUnreadActivity(new Set())
      return
    }
    try {
      const response = await fetch(
        `/api/notifications/step-attention?collectionId=${encodeURIComponent(collectionId)}`
      )
      if (!response.ok) return
      const data = (await response.json().catch(() => ({}))) as { stepIds?: string[] }
      setStepsWithUnreadActivity(new Set(data.stepIds ?? []))
    } catch {
      // Best-effort only: attention indicator should never block UI.
    }
  }, [collectionId])

  React.useEffect(() => {
    void refreshStepAttention()
  }, [refreshStepAttention])

  React.useEffect(() => {
    const handler = () => {
      void refreshStepAttention()
    }
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, handler)
    return () => window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, handler)
  }, [refreshStepAttention])

  React.useEffect(() => {
    const targetStepId = normalizeStepIdFromQuery(searchParams.get("step"))
    if (!targetStepId) return

    const canOpenStep = visibleSteps.some((step) => step.id === targetStepId)
    if (!canOpenStep) return

    setOpenStepId((prev) => prev ?? targetStepId)
  }, [searchParams, visibleSteps])

  React.useEffect(() => {
    if (!collectionId || !openStepId) return
    let cancelled = false

    const markContextRead = async () => {
      try {
        const response = await fetch("/api/notifications/read-by-context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            collectionId,
            stepId: openStepId,
          }),
        })
        if (!response.ok) return
        if (!cancelled) {
          window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT))
        }
      } catch {
        // Best-effort UX improvement; ignore failures silently.
      }
    }

    void markContextRead()
    return () => {
      cancelled = true
    }
  }, [collectionId, openStepId])

  const closeStepModalAndClearUrl = React.useCallback(() => {
    setOpenStepId(null)
    if (searchParams.get("step")) {
      const nextParams = new URLSearchParams(searchParams.toString())
      nextParams.delete("step")
      const nextQuery = nextParams.toString()
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
    }
  }, [pathname, router, searchParams])

  const handleStepModalOpenChange = React.useCallback(
    (open: boolean) => {
      if (open) return
      closeStepModalAndClearUrl()
    },
    [closeStepModalAndClearUrl]
  )

  const openStep = React.useMemo(
    () => steps.find((s) => s.id === openStepId) ?? null,
    [steps, openStepId]
  )
  const canShowModalActions = React.useMemo(() => {
    if (!openStep) return false
    // Fallback behavior for demos/legacy callers that don't pass current owner context.
    if (!currentUserCollectionRole) return !!openStep.canEdit
    // Use step-specific owners (open step), not collection.currentOwners (active step),
    // so Photo Lab doesn't see Shooting "Confirm pickup" when collection is on low_res_scanning.
    const stepOwnerRoles = stepOwners?.[openStep.id] ?? currentOwners
    return currentUserHasEditPermission && stepOwnerRoles.includes(currentUserCollectionRole)
  }, [openStep, currentOwners, stepOwners, currentUserCollectionRole, currentUserHasEditPermission])

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
        <div className="shrink-0 px-4 pt-6 min-[760px]:px-6">
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

        <div className="flex-1 overflow-y-auto min-h-0 px-4 pt-4 pb-8 min-[760px]:px-6">
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
                showAttentionDot={Boolean(step.attention) || stepsWithUnreadActivity.has(step.id)}
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
        onOpenChange={handleStepModalOpenChange}
        title={openStep?.title ?? "Step"}
        headerContent={
          openStep ? (
            <div className="flex flex-col gap-2 w-full min-w-0">
              <Titles
                type="block"
                title={openStep.title}
                showSubtitle={false}
                className="min-w-0"
              />
              <div className="flex items-center gap-2 flex-wrap">
                {openStep.status === "active" || openStep.status === "completed" ? (
                  <>
                    <StageStatusTag
                      status={(openStep.stageStatus ?? "in-progress") as "upcoming" | "in-progress" | "in-transit" | "done" | "delivered"}
                    />
                    <TimeStampTag
                      status={(openStep.timeStampStatus ?? "on-track") as "on-track" | "on-time" | "delayed" | "at-risk"}
                    />
                  </>
                ) : null}
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
        <div className={`px-5 pb-5 flex flex-col gap-6${openStep && openStep.status !== "active" && openStep.status !== "completed" ? " opacity-50 pointer-events-none" : ""}`}>
          {openStep && (
            <>
              {openStep.id === "shooting" ? (
                <StepDetails
                  variant="primary"
                  mainTitle="Location"
                  subtitle={[shootingStreetAddress, shootingCity].filter(Boolean).join(", ") || undefined}
                  additionalInfo={[shootingZipCode, shootingCountry].filter(Boolean).join(", ") || undefined}
                  backgroundImage="/assets/bg-shooting.png"
                  hideActionButton
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
                          <span className="text-lime-400">@{(dropoffShippingCarrier ?? "").replace(/^@/, "").trim()}</span>
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
                    hideActionButton
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
                  {canShowModalActions && openStep.status !== "completed" && (
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
                        const photoLab = (participantsMainPlayersEntities ?? []).find(
                          (e) => (e.entityTypeLabel ?? "").toLowerCase().includes("photo lab")
                        )
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
                                <span className="text-lime-400">@{(photoLabName ?? "").replace(/^@/, "").trim()}</span> to{" "}
                                <span className="text-lime-400">@{(handprintLabName ?? "").replace(/^@/, "").trim()}</span>
                              </>
                            )}
                          </>
                        )
                      })()
                    }
                    backgroundImage="/assets/bg-lowres.png"
                    hideActionButton
                  />
                  {canShowModalActions && buildUrlHistoryItems(lowResSelectionUrl, stepNotesLowRes, "photo_lab", resolveUploaderDisplay("photo_lab"), lowResUploadedAt, "low_res_scanning", "Low-res scans").map((item, idx) => (
                    <UrlHistory
                      key={`lowres-${idx}-${item.url}`}
                      title={item.title}
                      comments={item.comments}
                      onOpenLink={() => window.open(ensureAbsoluteUrl(item.url), "_blank", "noopener,noreferrer")}
                      onAddComment={onAddStepNote && item.stepId ? () => openAddCommentDialog(item.stepId, item.url) : undefined}
                    />
                  ))}
                  {canShowModalActions && (
                    <section
                      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-5 py-10 shadow-xl ring-offset-2 ring-offset-lime-500"
                      aria-label="Step owner action"
                    >
                      {lowResSelectionUrlLatest ? (
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
                            Upload more photos
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
                  <StepDetails
                    variant="primary"
                    mainTitle="Selection for client"
                    subtitle="Photographer has to do a selection of photos to share with client."
                    backgroundImage="/assets/bg-selection.png"
                    hideActionButton
                    className="w-full"
                  />
                  {canShowModalActions && [
                    ...buildUrlHistoryItems(lowResSelectionUrl, stepNotesLowRes, "photo_lab", resolveUploaderDisplay("photo_lab"), lowResUploadedAt, "low_res_scanning", "Low-res scans"),
                    ...buildUrlHistoryItems(photographerSelectionUrl, stepNotesPhotographerSelection, "photographer", resolveUploaderDisplay("photographer"), photographerSelectionUploadedAt, "photographer_selection", "Photographer selection"),
                  ].map((item, idx) => (
                    <UrlHistory
                      key={`photographer-selection-${idx}-${item.url}`}
                      title={item.title}
                      comments={item.comments}
                      onOpenLink={() => window.open(ensureAbsoluteUrl(item.url), "_blank", "noopener,noreferrer")}
                      onAddComment={onAddStepNote && item.stepId ? () => openAddCommentDialog(item.stepId, item.url) : undefined}
                    />
                  ))}
                  {canShowModalActions && (
                    <section
                      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-5 py-10 shadow-xl ring-offset-2 ring-offset-lime-500"
                      aria-label="Step owner action"
                    >
                      {photographerSelectionUrlLatest ? (
                        <>
                          <p className="text-center text-base font-semibold text-foreground">
                            Need to send additional footage?
                          </p>
                          <Button
                            type="button"
                            variant="default"
                            size="lg"
                            className="w-fit rounded-xl"
                            onClick={() => setUploadPhotographerSelectionDialogOpen(true)}
                          >
                            Upload additional photos
                          </Button>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </section>
                  )}
                </div>
              ) : openStep.id === "client_selection" ? (
                <div className="flex flex-col gap-5 w-full">
                  <StepDetails
                    variant="primary"
                    mainTitle="Client selection"
                    subtitle="Client has to select the top photos from the shooting to prepare finals"
                    backgroundImage="/assets/bg-selection.png"
                    hideActionButton
                    className="w-full"
                  />
                  {canShowModalActions && [
                    ...buildUrlHistoryItems(photographerSelectionUrl, stepNotesPhotographerSelection, "photographer", resolveUploaderDisplay("photographer"), photographerSelectionUploadedAt, "photographer_selection", "Photographer selection"),
                    ...buildUrlHistoryItems(clientSelectionUrl, stepNotesClientSelection, "client", resolveUploaderDisplay("client"), clientSelectionUploadedAt, "client_selection", "Client selection"),
                  ].map((item, idx) => (
                    <UrlHistory
                      key={`client-selection-${idx}-${item.url}`}
                      title={item.title}
                      comments={item.comments}
                      onOpenLink={() => window.open(ensureAbsoluteUrl(item.url), "_blank", "noopener,noreferrer")}
                      onAddComment={onAddStepNote && item.stepId ? () => openAddCommentDialog(item.stepId, item.url) : undefined}
                    />
                  ))}
                  {canShowModalActions && (
                    <section
                      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-5 py-10 shadow-xl ring-offset-2 ring-offset-lime-500"
                      aria-label="Step owner action"
                    >
                      <p className="text-center text-base font-semibold text-foreground">
                        {clientSelectionUrlLatest ? "Need to send additional footage?" : "Do you have the final photos you'd like to get in high-res?"}
                      </p>
                      <Button
                        type="button"
                        variant="default"
                        size="lg"
                        className="w-fit rounded-xl"
                        onClick={() => setClientUploadSelectionDialogOpen(true)}
                      >
                        {clientSelectionUrlLatest ? "Upload additional photos" : "Upload selection"}
                      </Button>
                    </section>
                  )}
                </div>
              ) : openStep.id === "photographer_check_client_selection" ? (
                <div className="flex flex-col gap-5 w-full">
                  <StepDetails
                    variant="primary"
                    mainTitle="Validation for HR"
                    subtitle="Photographer must download and validate client selections for hand print lab instructions."
                    backgroundImage="/assets/bg-improvements.png"
                    hideActionButton
                    className="w-full"
                  />
                  {canShowModalActions && [
                    ...buildUrlHistoryItems(clientSelectionUrl, stepNotesClientSelection, "client", resolveUploaderDisplay("client"), clientSelectionUploadedAt, "client_selection", "Client selection"),
                    ...buildUrlHistoryItems(
                      allUrls(photographerReviewUrl).length > 0 ? photographerReviewUrl : (stepNotesPhotographerReview?.length ?? 0) > 0 ? ["notes-only"] : undefined,
                      stepNotesPhotographerReview,
                      "photographer",
                      resolveUploaderDisplay("photographer"),
                      photographerReviewUploadedAt,
                      "photographer_check_client_selection",
                      undefined,
                      (url, idx, hasPhotographerNotesForUrl) => {
                        const clientUrls = allUrls(clientSelectionUrl)
                        const isFromClientSelection = url !== "notes-only" && clientUrls.includes(url)
                        if (isFromClientSelection && !hasPhotographerNotesForUrl) {
                          return idx === 0 ? "Client selection (validated by photographer)" : `Client selection (validated by photographer) - Additional link ${String(idx).padStart(2, "0")}`
                        }
                        return idx === 0 ? "Photographer review" : `Photographer review - Additional link ${String(idx).padStart(2, "0")}`
                      }
                    ),
                  ].map((item, idx) => (
                    <UrlHistory
                      key={`photographer-review-${idx}-${item.url}`}
                      title={item.title}
                      comments={item.comments}
                      onOpenLink={item.url !== "notes-only" ? () => window.open(ensureAbsoluteUrl(item.url), "_blank", "noopener,noreferrer") : undefined}
                      onAddComment={onAddStepNote && item.stepId && item.url !== "notes-only" ? () => openAddCommentDialog(item.stepId, item.url) : undefined}
                    />
                  ))}
                  {canShowModalActions && (() => {
                    const hasPhotographerReviewData =
                      allUrls(photographerReviewUrl).length > 0 || (stepNotesPhotographerReview?.length ?? 0) > 0
                    return (
                      <section
                        className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-5 py-10 shadow-xl ring-offset-2 ring-offset-lime-500"
                        aria-label="Step owner action"
                      >
                        {hasPhotographerReviewData ? (
                          <>
                            <p className="text-center text-base font-semibold text-foreground">
                              Need to send additional footage?
                            </p>
                            <Button
                              type="button"
                              variant="default"
                              size="lg"
                              className="w-fit rounded-xl"
                              onClick={() => setValidateSelectionDialogOpen(true)}
                            >
                              Upload additional photos
                            </Button>
                          </>
                        ) : (
                          <>
                            <p className="text-center text-base font-semibold text-foreground">
                              Review client selection and confirm or add comments for lab
                            </p>
                            <div className="flex items-center justify-center gap-3">
                              <Button
                                type="button"
                                variant="secondary"
                                size="lg"
                                className="w-fit rounded-xl"
                                onClick={() => setValidateSelectionDialogOpen(true)}
                              >
                                Add comments to lab
                              </Button>
                              <Button
                                type="button"
                                variant="default"
                                size="lg"
                                className="w-fit rounded-xl"
                                onClick={async () => {
                                  const clientUrls = allUrls(clientSelectionUrl)
                                  if (clientUrls.length === 0) {
                                    try {
                                      await onValidateClientSelectionDirect?.()
                                      closeStepModalAndClearUrl()
                                      toast.success("Client selection validated.")
                                    } catch {
                                      // Error surfaced by page if any
                                    }
                                    return
                                  }
                                  const links: ValidateLinksDialogItem[] = clientUrls.map((url, idx) => ({
                                    label: idx === 0 ? "Client selection" : `Additional Link ${String(idx).padStart(2, "0")}`,
                                    url,
                                  }))
                                  setValidateLinksDialogConfig({
                                    links,
                                    singleSelect: links.length === 1,
                                    confirmLabel: "Validate client selection",
                                    onConfirm: async (selectedUrls) => {
                                      try {
                                        await onValidateClientSelectionDirect?.(selectedUrls)
                                        closeStepModalAndClearUrl()
                                        toast.success("Client selection validated.")
                                      } catch {
                                        // Error surfaced by page if any
                                      }
                                    },
                                  })
                                  setValidateLinksDialogOpen(true)
                                }}
                              >
                                Validate client selection
                              </Button>
                            </div>
                          </>
                        )}
                      </section>
                    )
                  })()}
                </div>
              ) : openStep.id === "edition_request" ? (
                <div className="flex flex-col gap-5 w-full">
                  <StepDetails
                    variant="primary"
                    mainTitle="Improvements"
                    subtitle="Photographer have to capture all changes needed to get finals ready."
                    backgroundImage="/assets/bg-improvements.png"
                    hideActionButton
                    className="w-full"
                  />
                  {canShowModalActions && [
                    ...buildUrlHistoryItems(highResSelectionUrl, stepNotesHighRes, "handprint_lab", resolveUploaderDisplay("handprint_lab"), highResUploadedAt, "handprint_high_res", "High-res selection"),
                    ...buildUrlHistoryItems(editionRequestInstructionsUrl, stepNotesEditionRequest, "photographer", resolveUploaderDisplay("photographer"), editionRequestInstructionsUploadedAt, "edition_request", "Edition request"),
                  ].map((item, idx) => (
                    <UrlHistory
                      key={`edition-request-${idx}-${item.url}`}
                      title={item.title}
                      comments={item.comments}
                      onOpenLink={() => window.open(ensureAbsoluteUrl(item.url), "_blank", "noopener,noreferrer")}
                      onAddComment={onAddStepNote && item.stepId ? () => openAddCommentDialog(item.stepId, item.url) : undefined}
                    />
                  ))}
                  {canShowModalActions && (
                    <section
                      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-5 py-10 shadow-xl ring-offset-2 ring-offset-lime-500"
                      aria-label="Step owner action"
                    >
                      <p className="text-center text-base font-semibold text-foreground">
                        {editionRequestInstructionsUrlLatest ? "Need to send additional details?" : "Upload improvement details for retouch studio"}
                      </p>
                      <Button
                        type="button"
                        variant="default"
                        size="lg"
                        className="w-fit rounded-xl"
                        onClick={() => setGiveInstructionsDialogOpen(true)}
                      >
                        {editionRequestInstructionsUrlLatest ? "Upload additional details" : "Give instructions"}
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
                  {canShowModalActions && [
                    ...(shootingType === "digital" && hasEditionStudio
                      ? [
                          // Digital+Retouch: single link from photographer (stored in both highres + edition; show once)
                          ...buildUrlHistoryItems(editionRequestInstructionsUrl, stepNotesEditionRequest, "photographer", resolveUploaderDisplay("photographer"), editionRequestInstructionsUploadedAt, "edition_request", "Retouch instructions"),
                        ]
                      : [
                          ...buildUrlHistoryItems(editionRequestInstructionsUrl, stepNotesEditionRequest, "photographer", resolveUploaderDisplay("photographer"), editionRequestInstructionsUploadedAt, "edition_request", "Edition request"),
                        ]),
                    ...buildUrlHistoryItems(finalsSelectionUrl, stepNotesFinalEdits, "retouch_studio", resolveUploaderDisplay("retouch_studio"), finalsUploadedAt, "final_edits", "Final edits"),
                  ].map((item, idx) => (
                    <UrlHistory
                      key={`final-edits-${idx}-${item.url}`}
                      title={item.title}
                      comments={item.comments}
                      onOpenLink={() => window.open(ensureAbsoluteUrl(item.url), "_blank", "noopener,noreferrer")}
                      onAddComment={onAddStepNote && item.stepId ? () => openAddCommentDialog(item.stepId, item.url) : undefined}
                    />
                  ))}
                  {canShowModalActions && (
                    <section
                      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-5 py-10 shadow-xl ring-offset-2 ring-offset-lime-500"
                      aria-label="Step owner action"
                    >
                      <p className="text-center text-base font-semibold text-foreground">
                        {finalsSelectionUrlLatest
                          ? "Need to send additional footage?"
                          : "Upload final retouched photos"}
                      </p>
                      <Button
                        type="button"
                        variant="default"
                        size="lg"
                        className="w-fit rounded-xl"
                        onClick={() => setUploadFinalsDialogOpen(true)}
                      >
                        {finalsSelectionUrlLatest ? "Upload additional photos" : "Upload finals"}
                      </Button>
                    </section>
                  )}
                </div>
              ) : openStep.id === "photographer_last_check" ? (
                <div className="flex flex-col gap-5 w-full">
                  <StepDetails
                    variant="primary"
                    mainTitle="Final confirmation"
                    subtitle={
                      hasEditionStudio
                        ? "Photographer needs to carefully review final retouches and approve the job done by the edition studio in order to share finals with client."
                        : "Photographer needs to review the high-res selection, add links or comments if needed, and validate before sharing with client."
                    }
                    backgroundImage="/assets/bg-improvements.png"
                    hideActionButton
                    className="w-full"
                  />
                  {canShowModalActions && (() => {
                    // Material to review: when hasEditionStudio → finals from retouch; when no edition → high-res from handprint
                    const materialUrls = hasEditionStudio ? finalsSelectionUrl : highResSelectionUrl
                    const materialNotes = hasEditionStudio ? stepNotesFinalEdits : stepNotesHighRes
                    const materialUploader = hasEditionStudio ? "retouch_studio" : "handprint_lab"
                    const materialLabel = hasEditionStudio ? "Final edits" : "High-res selection"
                    const materialUploadedAt = hasEditionStudio ? finalsUploadedAt : highResUploadedAt
                    const block1 = buildUrlHistoryItems(
                      materialUrls,
                      materialNotes,
                      materialUploader,
                      resolveUploaderDisplay(materialUploader),
                      materialUploadedAt,
                      hasEditionStudio ? "final_edits" : "handprint_high_res",
                      materialLabel
                    )
                    const materialUrlsList = allUrls(materialUrls)
                    const validatedNotesForMaterial = (stepNotesPhotographerLastCheck ?? []).filter((n) => {
                      const u = (n as { url?: string }).url?.trim()
                      if (!u) return true
                      return materialUrlsList.includes(u)
                    })
                    const block2a =
                      openStep.status === "completed" && materialUrlsList.length > 0
                        ? buildUrlHistoryItems(
                            materialUrls,
                            validatedNotesForMaterial,
                            "photographer",
                            resolveUploaderDisplay("photographer"),
                            undefined,
                            "photographer_last_check",
                            undefined,
                            (_url, idx) =>
                              idx === 0
                                ? `${materialLabel} (validated by photographer)`
                                : `${materialLabel} (validated by photographer) - Additional link ${String(idx).padStart(2, "0")}`
                          )
                        : []
                    const block2b = buildUrlHistoryItems(
                      photographerLastCheckUrl,
                      stepNotesPhotographerLastCheck,
                      "photographer",
                      resolveUploaderDisplay("photographer"),
                      photographerLastCheckUploadedAt,
                      "photographer_last_check",
                      "Finals"
                    )
                    return [...block1, ...block2a, ...block2b].map((item, idx) => (
                      <UrlHistory
                        key={`photographer-last-check-${idx}-${item.url}`}
                        title={item.title}
                        comments={item.comments}
                        onOpenLink={() => window.open(ensureAbsoluteUrl(item.url), "_blank", "noopener,noreferrer")}
                        onAddComment={onAddStepNote && item.stepId ? () => openAddCommentDialog(item.stepId, item.url) : undefined}
                      />
                    ))
                  })()}
                  {canShowModalActions && (
                    <section
                      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-5 py-10 shadow-xl ring-offset-2 ring-offset-lime-500"
                      aria-label="Step owner action"
                    >
                      {openStep.status === "completed" ? (
                        <>
                          <p className="text-center text-base font-semibold text-foreground">
                            Need to send additional photos?
                          </p>
                          <Button
                            type="button"
                            variant="default"
                            size="lg"
                            className="w-fit rounded-xl"
                            onClick={() => {
                              setAddNewLinkUrl("")
                              setAddNewLinkComments("")
                              setAddNewLinkDialogOpen(true)
                            }}
                          >
                            Upload additional link
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="text-center text-base font-semibold text-foreground">
                            {hasEditionStudio ? "Are final retouches ok?" : "Are high-res selection ok?"}
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-3">
                            <Button
                              type="button"
                              variant="secondary"
                              size="lg"
                              className="w-fit rounded-xl"
                              onClick={() => {
                                setAddNewLinkUrl("")
                                setAddNewLinkComments("")
                                setAddNewLinkDialogOpen(true)
                              }}
                            >
                              Add new link
                            </Button>
                            <Button
                              type="button"
                              variant="default"
                              size="lg"
                              className="w-fit rounded-xl"
                              onClick={async () => {
                                const materialUrls = hasEditionStudio ? finalsSelectionUrl : highResSelectionUrl
                                const materialUrlsList = allUrls(materialUrls)
                                const materialLabel = hasEditionStudio ? "Final edits" : "High-res selection"
                                if (materialUrlsList.length === 0) {
                                  try {
                                    await onValidateFinals?.()
                                    closeStepModalAndClearUrl()
                                    toast.success("Finals shared with client.")
                                  } catch {
                                    // Error surfaced by page if any
                                  }
                                  return
                                }
                                const links: ValidateLinksDialogItem[] = materialUrlsList.map((url, idx) => ({
                                  label: idx === 0 ? materialLabel : `Additional Link ${String(idx).padStart(2, "0")}`,
                                  url,
                                }))
                                setValidateLinksDialogConfig({
                                  links,
                                  singleSelect: links.length === 1,
                                  confirmLabel: hasEditionStudio ? "Share final edits url with client" : "Share high-res with client",
                                  onConfirm: async (selectedUrls) => {
                                    try {
                                      await onValidateFinals?.(selectedUrls)
                                      closeStepModalAndClearUrl()
                                      toast.success("Finals shared with client.")
                                    } catch {
                                      // Error surfaced by page if any
                                    }
                                  },
                                })
                                setValidateLinksDialogOpen(true)
                              }}
                            >
                              {hasEditionStudio ? "Share final edits url with client" : "Share high-res with client"}
                            </Button>
                          </div>
                        </>
                      )}
                    </section>
                  )}
                </div>
              ) : openStep.id === "handprint_high_res" ? (
                <div className="flex flex-col gap-5 w-full">
                  <StepDetails
                    variant="primary"
                    mainTitle={
                      shootingType === "digital" && hasEditionStudio
                        ? "Convert to high-res and give retouch instructions"
                        : shootingType === "digital"
                          ? 'Convert client selection to "high-resolution"'
                          : 'Convert client selection to "high-resolution"'
                    }
                    subtitle={
                      shootingType === "digital" && hasEditionStudio
                        ? "Convert the client selection to high-resolution, upload the link, and provide instructions for the retouch studio."
                        : shootingType === "digital"
                          ? "Convert the client selection to high-resolution and upload the link."
                          : "Lab has to convert client selection to high-resolution using a traditional hand-printing technique."
                    }
                    backgroundImage="/assets/bg-highres.png"
                    hideActionButton
                    className="w-full"
                  />
                  {canShowModalActions && [
                    ...(shootingType === "digital"
                      ? [
                          ...buildUrlHistoryItems(clientSelectionUrl, stepNotesClientSelection, "client", resolveUploaderDisplay("client"), clientSelectionUploadedAt, "client_selection", "Client selection"),
                          ...(hasEditionStudio
                            ? buildUrlHistoryItems(editionRequestInstructionsUrl, stepNotesEditionRequest, "photographer", resolveUploaderDisplay("photographer"), editionRequestInstructionsUploadedAt, "edition_request", "Retouch instructions")
                            : buildUrlHistoryItems(highResSelectionUrl, stepNotesHighRes, "photographer", resolveUploaderDisplay("photographer"), highResUploadedAt, "handprint_high_res", "High-res selection")),
                        ]
                      : [
                          ...buildUrlHistoryItems(
                            photographerReviewUrl,
                            stepNotesPhotographerReview,
                            "photographer",
                            resolveUploaderDisplay("photographer"),
                            photographerReviewUploadedAt,
                            "photographer_check_client_selection",
                            undefined,
                            (url, idx, hasPhotographerNotesForUrl) => {
                              const clientUrls = allUrls(clientSelectionUrl)
                              const isFromClientSelection = clientUrls.includes(url)
                              if (isFromClientSelection && !hasPhotographerNotesForUrl) {
                                return idx === 0 ? "Client selection (validated by photographer)" : `Client selection (validated by photographer) - Additional link ${String(idx).padStart(2, "0")}`
                              }
                              return idx === 0 ? "Photographer review" : `Photographer review - Additional link ${String(idx).padStart(2, "0")}`
                            }
                          ),
                          ...buildUrlHistoryItems(highResSelectionUrl, stepNotesHighRes, "handprint_lab", resolveUploaderDisplay("handprint_lab"), highResUploadedAt, "handprint_high_res", "High-res selection"),
                        ]),
                  ].map((item, idx) => (
                    <UrlHistory
                      key={`handprint-highres-${idx}-${item.url}`}
                      title={item.title}
                      comments={item.comments}
                      onOpenLink={() => window.open(ensureAbsoluteUrl(item.url), "_blank", "noopener,noreferrer")}
                      onAddComment={onAddStepNote && item.stepId ? () => openAddCommentDialog(item.stepId, item.url) : undefined}
                    />
                  ))}
                  {canShowModalActions && (
                    <section
                      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-5 py-10 shadow-xl ring-offset-2 ring-offset-lime-500"
                      aria-label="Step owner action"
                    >
                      <p className="text-center text-base font-semibold text-foreground">
                        {shootingType === "digital" && hasEditionStudio
                          ? (highResSelectionUrlLatest || editionRequestInstructionsUrlLatest
                            ? "Need to send additional footage or instructions?"
                            : "Upload high-res and give retouch instructions")
                          : highResSelectionUrlLatest
                            ? "Need to send additional footage?"
                            : "Upload high-resolution selection"}
                      </p>
                      <Button
                        type="button"
                        variant="default"
                        size="lg"
                        className="w-fit rounded-xl"
                        onClick={() =>
                          shootingType === "digital" && hasEditionStudio
                            ? setUploadHighResAndInstructionsDialogOpen(true)
                            : setUploadHighResDialogOpen(true)
                        }
                      >
                        {shootingType === "digital" && hasEditionStudio
                          ? (highResSelectionUrlLatest || editionRequestInstructionsUrlLatest
                            ? "Upload additional"
                            : "Upload high-res and retouch instructions")
                          : highResSelectionUrlLatest
                            ? "Upload additional photos"
                            : "Upload high-res"}
                      </Button>
                    </section>
                  )}
                </div>
              ) : openStep.id === "client_confirmation" ? (
                <div className="flex flex-col gap-5 w-full">
                  {/* Client confirmation — custom block: bg-finals, title, subtitle */}
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
                          {canShowModalActions
                            ? "Check and review the finals before confirming the closing of the project"
                            : "View the final selection."}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* UrlHistory blocks: previous-step material validated by photographer + optional links added in step 10 */}
                  {(() => {
                    // Digital without retouch: photographer uploads high-res in step 7; no step 10. Show high-res + photographer comments from step 7.
                    if (shootingType === "digital" && !hasEditionStudio) {
                      return [
                        ...buildUrlHistoryItems(
                          highResSelectionUrl,
                          stepNotesHighRes,
                          "photographer",
                          resolveUploaderDisplay("photographer"),
                          highResUploadedAt,
                          "handprint_high_res",
                          "High-res selection"
                        ),
                      ].map((item, idx) => (
                        <UrlHistory
                          key={`client-confirmation-${idx}-${item.url}`}
                          title={item.title}
                          comments={item.comments}
                          onOpenLink={() => window.open(ensureAbsoluteUrl(item.url), "_blank", "noopener,noreferrer")}
                          onAddComment={
                            canShowModalActions && onAddStepNote && item.stepId
                              ? () => openAddCommentDialog(item.stepId, item.url)
                              : undefined
                          }
                        />
                      ))
                    }
                    // Analog or with edition: photographer validates in step 10 (or high-res when no edition)
                    const materialUrls = hasEditionStudio ? finalsSelectionUrl : highResSelectionUrl
                    const materialLabel = hasEditionStudio ? "Final edits" : "High-res selection"
                    const materialUrlsList = allUrls(materialUrls)
                    const validatedUrls =
                      photographerApprovedMaterialUrls && photographerApprovedMaterialUrls.length > 0
                        ? photographerApprovedMaterialUrls
                        : materialUrlsList
                    const validatedNotesForMaterial = (stepNotesPhotographerLastCheck ?? []).filter((n) => {
                      const u = (n as { url?: string }).url?.trim()
                      if (!u) return true
                      return validatedUrls.includes(u)
                    })
                    return [
                      ...buildUrlHistoryItems(
                        validatedUrls,
                        validatedNotesForMaterial,
                        "photographer",
                        resolveUploaderDisplay("photographer"),
                        undefined,
                        "photographer_last_check",
                        undefined,
                        (_url, idx) =>
                          idx === 0
                            ? `${materialLabel} (validated by photographer)`
                            : `${materialLabel} (validated by photographer) - Additional link ${String(idx).padStart(2, "0")}`
                      ),
                      ...buildUrlHistoryItems(
                        photographerLastCheckUrl,
                        stepNotesPhotographerLastCheck,
                        "photographer",
                        resolveUploaderDisplay("photographer"),
                        photographerLastCheckUploadedAt,
                        "photographer_last_check",
                        "Finals"
                      ),
                    ].map((item, idx) => (
                      <UrlHistory
                        key={`client-confirmation-${idx}-${item.url}`}
                        title={item.title}
                        comments={item.comments}
                        onOpenLink={() => window.open(ensureAbsoluteUrl(item.url), "_blank", "noopener,noreferrer")}
                        onAddComment={
                          canShowModalActions && onAddStepNote && item.stepId
                            ? () => openAddCommentDialog(item.stepId, item.url)
                            : undefined
                        }
                      />
                    ))
                  })()}
                  {/* Action block: Complete collection — hide once collection is completed */}
                  {canShowModalActions && openStep.status !== "completed" && (
                    <section
                      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-5 py-10 shadow-xl ring-offset-2 ring-offset-lime-500"
                      aria-label="Step owner action"
                    >
                      <p className="text-center text-base font-semibold text-foreground">
                        Ready to close the project?
                      </p>
                      <Button
                        type="button"
                        variant="default"
                        size="lg"
                        className="w-fit rounded-xl"
                        onClick={async () => {
                          try {
                            await onCompleteCollection?.()
                            closeStepModalAndClearUrl()
                            toast.success("Collection completed successfully.")
                          } catch {
                            // Error surfaced by page callback
                          }
                        }}
                      >
                        Complete collection
                      </Button>
                    </section>
                  )}
                </div>
              ) : (
                <StepDetails
                  variant="primary"
                  mainTitle={openStep.title}
                  subtitle={
                    canShowModalActions
                      ? "You can edit and perform actions in this step."
                      : "You can view this step only; edits and downloads are not available."
                  }
                  hideActionButton
                />
              )}
              {/* Owner-only action block — Shooting step only when not yet completed. Digital: confirm shooting ended; Analog: confirm negatives pickup */}
              {canShowModalActions && openStep.id === "shooting" && openStep.status !== "completed" && (
                <section
                  className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card px-5 py-10 shadow-xl ring-offset-2 ring-offset-lime-500"
                  aria-label="Step owner action"
                >
                  <p className="text-center text-base font-semibold text-foreground">
                    {shootingType === "digital"
                      ? "Has the shooting been completed?"
                      : "Have the negatives been collected?"}
                  </p>
                  <Button
                    type="button"
                    variant="default"
                    size="lg"
                    className="w-fit rounded-xl"
                    onClick={async () => {
                      try {
                        await onConfirmPickup?.("shooting", shootingType)
                        closeStepModalAndClearUrl()
                        toast.success(
                          shootingType === "digital" ? "Shooting confirmed." : "Pickup confirmed."
                        )
                      } catch {
                        // Error toast is shown by the page callback.
                      }
                    }}
                  >
                    {shootingType === "digital"
                      ? "Confirm shooting ended"
                      : "Confirm pickup"}
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
                  participantsMainPlayersEntities ?? [],
                  { isDigitalWithRetouch: shootingType === "digital" && hasEditionStudio }
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
                const renderIndividual = (user: (typeof mainIndividuals)[number], i: number) => {
                  const isPhotographer = (user.roleLabel ?? "").toLowerCase() === "photographer"
                  return (
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
                        hideContactInfo={isPhotographer}
                      />
                    </div>
                  )
                }
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
        isInternalUser={(userContext?.isNobaUser && currentUserHasEditPermission) ?? false}
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

      {validateLinksDialogConfig && (
        <ValidateLinksDialog
          open={validateLinksDialogOpen}
          onOpenChange={(open) => {
            setValidateLinksDialogOpen(open)
            if (!open) setValidateLinksDialogConfig(null)
          }}
          links={validateLinksDialogConfig.links}
          singleSelect={validateLinksDialogConfig.singleSelect}
          confirmLabel={validateLinksDialogConfig.confirmLabel}
          onConfirm={validateLinksDialogConfig.onConfirm}
        />
      )}
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
          <div className="flex flex-col items-start gap-4 py-4">
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
                try {
                  await onConfirmDropoffDelivery?.("negatives_dropoff", false)
                  closeStepModalAndClearUrl()
                  toast.success("Delivery confirmed.")
                } catch {
                  /* Error already surfaced by handler */
                } finally {
                  setConfirmDropoffDialogOpen(false)
                }
              }}
            >
              No
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={async () => {
                try {
                  await onConfirmDropoffDelivery?.("negatives_dropoff", true)
                  closeStepModalAndClearUrl()
                  toast.success("Delivery confirmed.")
                } catch {
                  /* Error already surfaced by handler */
                } finally {
                  setConfirmDropoffDialogOpen(false)
                }
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
            setUploadSubmitting(false)
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
              disabled={!uploadMorePhotosUrl.trim() || uploadSubmitting}
              onClick={async () => {
                const url = uploadMorePhotosUrl.trim()
                if (!url || uploadSubmitting) return
                setUploadSubmitting(true)
                try {
                  await onUploadMoreLowRes?.({ url, notes: uploadMorePhotosNotes.trim() || undefined })
                  setUploadMorePhotosDialogOpen(false)
                  setUploadMorePhotosUrl("")
                  setUploadMorePhotosNotes("")
                  closeStepModalAndClearUrl()
                  toast.success("Additional photos uploaded.")
                } finally {
                  setUploadSubmitting(false)
                }
              }}
            >
              {uploadSubmitting ? "Uploading…" : "Upload more photos"}
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
            setUploadSubmitting(false)
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
              disabled={!uploadLowResUrl.trim() || uploadSubmitting}
              onClick={async () => {
                const url = uploadLowResUrl.trim()
                if (!url || uploadSubmitting) return
                setUploadSubmitting(true)
                try {
                  await onUploadLowRes?.({ url, notes: uploadLowResNotes.trim() || undefined })
                  setUploadLowResDialogOpen(false)
                  setUploadLowResUrl("")
                  setUploadLowResNotes("")
                  closeStepModalAndClearUrl()
                  toast.success("Low-res scans uploaded.")
                } catch {
                  // Error already surfaced by page (toast.error)
                } finally {
                  setUploadSubmitting(false)
                }
              }}
            >
              {uploadSubmitting ? "Uploading…" : "Upload low-res"}
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
            setUploadSubmitting(false)
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
                if (!url || uploadSubmitting) return
                setUploadSubmitting(true)
                try {
                  await onUploadPhotographerSelection?.({ url, notes: uploadPhotographerSelectionNotes.trim() || undefined })
                  setUploadPhotographerSelectionDialogOpen(false)
                  setUploadPhotographerSelectionUrl("")
                  setUploadPhotographerSelectionNotes("")
                  closeStepModalAndClearUrl()
                  toast.success("Selection uploaded.")
                } finally {
                  setUploadSubmitting(false)
                }
              }}
            >
              {uploadSubmitting ? "Uploading…" : "Upload selection"}
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
                closeStepModalAndClearUrl()
                toast.success("Comments sent to the photographer")
              }}
            >
              Request additional photos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add comment: shared dialog for UrlHistory "Add comment" — appends to step notes */}
      <Dialog
        open={addCommentDialogOpen}
        onOpenChange={(open) => {
          setAddCommentDialogOpen(open)
          if (!open) {
            setAddCommentNotes("")
            setAddCommentContext(null)
            setAddCommentSubmitting(false)
          }
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add comment</DialogTitle>
            <DialogDescription>
              Add a comment or note to this link. It will be visible to all participants in this step.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="add-comment-notes">Notes and comments</Label>
              <Textarea
                id="add-comment-notes"
                placeholder="Write here comments and notes"
                value={addCommentNotes}
                onChange={(e) => setAddCommentNotes(e.target.value)}
                className="w-full max-h-[94px] overflow-y-auto resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter showCloseButton={false} className="justify-start">
            <Button
              type="button"
              variant="default"
              disabled={!addCommentNotes.trim() || addCommentSubmitting}
              onClick={async () => {
                const text = addCommentNotes.trim()
                if (!text || !addCommentContext || addCommentSubmitting) return
                setAddCommentSubmitting(true)
                try {
                  await onAddStepNote?.({ stepNoteKey: addCommentContext.stepNoteKey, from: getStepNoteFromForCurrentUser(), text, url: addCommentContext.url })
                  setAddCommentDialogOpen(false)
                  setAddCommentNotes("")
                  setAddCommentContext(null)
                  toast.success("Comment added.")
                } catch {
                  // Error surfaced by page callback
                } finally {
                  setAddCommentSubmitting(false)
                }
              }}
            >
              {addCommentSubmitting ? "Adding…" : "Add comment"}
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
            setUploadSubmitting(false)
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
              disabled={!clientUploadSelectionUrl.trim() || uploadSubmitting}
              onClick={async () => {
                const url = clientUploadSelectionUrl.trim()
                if (!url || uploadSubmitting) return
                setUploadSubmitting(true)
                try {
                  await onUploadClientSelection?.({ url, notes: clientUploadSelectionNotes.trim() || undefined })
                  setClientUploadSelectionDialogOpen(false)
                  setClientUploadSelectionUrl("")
                  setClientUploadSelectionNotes("")
                  closeStepModalAndClearUrl()
                  toast.success("Selection uploaded.")
                } catch {
                  // Error surfaced by page if any
                } finally {
                  setUploadSubmitting(false)
                }
              }}
            >
              {uploadSubmitting ? "Uploading…" : "Upload selection"}
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
                closeStepModalAndClearUrl()
                toast.success("Request sent to the photographer.")
              }}
            >
              Request additional photos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 6 (Photographer review): Add comments for HR — link first, then comments */}
      <Dialog
        open={validateSelectionDialogOpen}
        onOpenChange={(open) => {
          setValidateSelectionDialogOpen(open)
          if (!open) {
            setValidateSelectionComments("")
            setValidateSelectionLink("")
            setUploadSubmitting(false)
          }
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add comments for HR</DialogTitle>
            <DialogDescription>
              Give instructions to lab for converting to high-res and add a link if necessary.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="validate-selection-link">Link</Label>
              <Input
                id="validate-selection-link"
                type="url"
                placeholder="https://..."
                value={validateSelectionLink}
                onChange={(e) => setValidateSelectionLink(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="validate-selection-comments">Notes and comments</Label>
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
              disabled={(!validateSelectionComments.trim() && !validateSelectionLink.trim()) || uploadSubmitting}
              onClick={async () => {
                if (uploadSubmitting) return
                setUploadSubmitting(true)
                try {
                  await onValidateClientSelection?.(
                    validateSelectionComments.trim() || undefined,
                    validateSelectionLink.trim() || undefined
                  )
                  setValidateSelectionDialogOpen(false)
                  setValidateSelectionComments("")
                  setValidateSelectionLink("")
                  closeStepModalAndClearUrl()
                  toast.success("Comments sent to lab.")
                } catch {
                  // Error surfaced by page if any
                } finally {
                  setUploadSubmitting(false)
                }
              }}
            >
              {uploadSubmitting ? "Sending…" : "Add comments for HR"}
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
                closeStepModalAndClearUrl()
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
                  closeStepModalAndClearUrl()
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

      {/* Step 7+8 combined (Digital + Retouch): Upload high-res + retouch instructions */}
      <Dialog
        open={uploadHighResAndInstructionsDialogOpen}
        onOpenChange={(open) => {
          setUploadHighResAndInstructionsDialogOpen(open)
          if (!open) {
            setUploadHighResAndInstructionsUrl("")
            setUploadHighResAndInstructionsDetails("")
          }
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload high-res and retouch instructions</DialogTitle>
            <DialogDescription>
              Share the link with high-resolution selection and retouch instructions for the retouch studio.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="upload-highres-and-instructions-url">Retouch instructions link</Label>
              <Input
                id="upload-highres-and-instructions-url"
                type="url"
                placeholder="Paste here the link"
                value={uploadHighResAndInstructionsUrl}
                onChange={(e) => setUploadHighResAndInstructionsUrl(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="upload-highres-and-instructions-details">Comments and notes</Label>
              <Textarea
                id="upload-highres-and-instructions-details"
                placeholder="Describe the retouches needed for the retouch studio"
                value={uploadHighResAndInstructionsDetails}
                onChange={(e) => setUploadHighResAndInstructionsDetails(e.target.value)}
                className="w-full max-h-[94px] overflow-y-auto resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter showCloseButton={false} className="justify-start">
            <Button
              type="button"
              variant="default"
              disabled={!uploadHighResAndInstructionsUrl.trim()}
              onClick={async () => {
                const url = uploadHighResAndInstructionsUrl.trim()
                if (!url) return
                try {
                  await onUploadHighResAndInstructions?.({
                    url,
                    details: uploadHighResAndInstructionsDetails.trim() || undefined,
                    instructionsUrl: url,
                  })
                  setUploadHighResAndInstructionsDialogOpen(false)
                  setUploadHighResAndInstructionsUrl("")
                  setUploadHighResAndInstructionsDetails("")
                  closeStepModalAndClearUrl()
                  toast.success("Link and instructions uploaded.")
                } catch {
                  // Error surfaced by page if any
                }
              }}
            >
              Upload high-res and retouch instructions
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
              Upload all the necessary information for the retouch studio to make edits and prepare finals. Both fields are optional.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="give-instructions-url">Link or URL</Label>
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
              <Label htmlFor="give-instructions-details">Notes and comments</Label>
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
                  closeStepModalAndClearUrl()
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
                  closeStepModalAndClearUrl()
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

      {/* Step 10 (Photographer last check): Add new link — URL and/or comments */}
      <Dialog
        open={addNewLinkDialogOpen}
        onOpenChange={(open) => {
          setAddNewLinkDialogOpen(open)
          if (!open) {
            setAddNewLinkUrl("")
            setAddNewLinkComments("")
          }
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add new link</DialogTitle>
            <DialogDescription>
              Add an additional link and/or comments when the final edits don&apos;t include the full selection. Both fields are optional.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="add-new-link-url">Link</Label>
              <Input
                id="add-new-link-url"
                type="url"
                placeholder="https://..."
                value={addNewLinkUrl}
                onChange={(e) => setAddNewLinkUrl(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="add-new-link-comments">Comments</Label>
              <Textarea
                id="add-new-link-comments"
                placeholder="Write here comments and notes"
                value={addNewLinkComments}
                onChange={(e) => setAddNewLinkComments(e.target.value)}
                className="w-full max-h-[94px] overflow-y-auto resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter showCloseButton={false} className="justify-start">
            <Button
              type="button"
              variant="default"
              disabled={!addNewLinkUrl.trim() && !addNewLinkComments.trim()}
              onClick={async () => {
                try {
                  await onAddPhotographerLastCheckLink?.({
                    url: addNewLinkUrl.trim() || undefined,
                    comments: addNewLinkComments.trim() || undefined,
                    from: getStepNoteFromForCurrentUser(),
                  })
                  setAddNewLinkDialogOpen(false)
                  setAddNewLinkUrl("")
                  setAddNewLinkComments("")
                  closeStepModalAndClearUrl()
                  toast.success(addNewLinkUrl.trim() ? "Link and comment saved." : "Comment saved.")
                } catch {
                  // Error surfaced by page if any
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shared link accordion dialog: shows links from previous step with notes. Content bleeds to edges; scroll area has 24px padding. */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent showCloseButton className="sm:max-w-md h-[400px] flex flex-col overflow-hidden p-0 gap-0">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
            <DialogTitle>{linkDialogTitle}</DialogTitle>
            <DialogDescription>{linkDialogDescription}</DialogDescription>
          </DialogHeader>
          <div
            className="flex-1 min-h-0 overflow-y-auto p-6 [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-muted/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40"
            style={{ scrollbarColor: "rgba(0,0,0,0.2) transparent" }}
          >
            <LinkAccordion items={linkDialogItems} />
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
              existingProfilePictureUrl={userContext.entity.profilePictureUrl}
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
