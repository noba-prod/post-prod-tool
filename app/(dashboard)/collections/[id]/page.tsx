"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { CollectionTemplate } from "@/components/custom/templates/collection-template"
import type { CollectionTemplateStep } from "@/components/custom/templates/collection-template"
import { createCollectionsService } from "@/lib/services"
import { useUserContext } from "@/lib/contexts/user-context"
import {
  getViewStepDefinitions,
  configToViewStepsInput,
  viewStepsWithStatusFromCollection,
  resolveUserForPermission,
  canUserEditStep,
  deriveStageStatusFromShootingStart,
  computeStepHealth,
  getDeadlineForStep,
  getStepOwner,
  STEP_IDS,
} from "@/lib/domain/collections"
import type {
  StepId,
  UserForPermission,
  CollectionDraft,
  StepStage,
  StepHealth,
  ViewStepId,
} from "@/lib/domain/collections"
import type { CollectionMemberRole } from "@/lib/supabase/database.types"
import type {
  ParticipantsModalIndividual,
  ParticipantsModalEntity,
} from "@/components/custom/participants-modal"
import { toast } from "sonner"

const NOTIFICATIONS_REFRESH_EVENT = "noba:notifications:refresh"

/** Maps StepStage from DB to the template's stageStatus display value. */
function stageToDisplay(stage: StepStage | undefined, fallbackStatus: string): "upcoming" | "in-progress" | "done" {
  if (stage === "done") return "done"
  if (stage === "in-progress") return "in-progress"
  if (stage === "upcoming") return "upcoming"
  // Fallback from view-mode-steps status
  if (fallbackStatus === "completed") return "done"
  if (fallbackStatus === "active") return "in-progress"
  return "upcoming"
}

/** Maps StepHealth from DB to the template's timeStampStatus display value. */
function healthToDisplay(health: StepHealth | undefined | null): "on-track" | "on-time" | "delayed" | "at-risk" {
  if (health === "on-time") return "on-time"
  if (health === "delayed") return "delayed"
  if (health === "at-risk") return "at-risk"
  return "on-track"
}

function toDbCollectionRole(role: UserForPermission["role"]): CollectionMemberRole {
  switch (role) {
    case "producer":
      return "noba"
    case "client":
      return "client"
    case "photographer":
      return "photographer"
    case "agency":
      return "agency"
    case "photo_lab":
      return "photo_lab"
    case "retouch_studio":
      return "retouch_studio"
    case "handprint_lab":
      return "handprint_lab"
  }
}

/** Maps StepStage from DB to stepper row status (visual active/completed/locked state). */
function stageToStepperStatus(stage: StepStage | undefined, fallbackStatus: CollectionTemplateStep["status"]): CollectionTemplateStep["status"] {
  if (stage === "done") return "completed"
  if (stage === "in-progress") return "active"
  if (stage === "upcoming") return "locked"
  return fallbackStatus
}

/**
 * Maps view-mode steps (with status and deadlines from collection) to CollectionTemplateStep.
 * Uses backend-provided stepStatuses for stage and health labels when available.
 * Adds canEdit per step from current user's permission (collections-logic §8, §9).
 */
function viewStepsToTemplateSteps(
  withStatus: ReturnType<typeof viewStepsWithStatusFromCollection>,
  collection: CollectionDraft | null,
  userForPermission: UserForPermission | null
): CollectionTemplateStep[] {
  const dbStepStatuses = collection?.stepStatuses
  return withStatus.map((step) => {
    const dbEntry = dbStepStatuses?.[step.id]
    const stage = dbEntry?.stage as StepStage | undefined
    const health = dbEntry?.health as StepHealth | undefined
    const fallbackStage: StepStage =
      step.status === "completed"
        ? "done"
        : step.status === "active"
          ? "in-progress"
          : "upcoming"
    const effectiveStage = stage ?? fallbackStage
    const deadline = collection
      ? getDeadlineForStep(collection.config, step.id as ViewStepId)
      : { date: undefined, time: undefined }
    // Keep active-step health time-aware even when persisted step_statuses are stale.
    const effectiveHealth: StepHealth =
      effectiveStage === "in-progress"
        ? computeStepHealth("in-progress", deadline.date, deadline.time, new Date())
        : (health ?? computeStepHealth(effectiveStage, deadline.date, deadline.time, new Date()))

    return {
      id: step.id,
      title: step.title,
      status: stageToStepperStatus(stage, step.status),
      stageStatus: stageToDisplay(stage, step.status),
      timeStampStatus: healthToDisplay(effectiveHealth),
      deadlineLabel: "Deadline:",
      deadlineDate: step.deadlineDate ?? "—",
      deadlineTime: step.deadlineTime ?? "End of day (5:00pm)",
      inactive: step.inactive,
      annotation: step.annotation,
      attention: step.attention,
      canEdit:
        userForPermission && collection &&
        collection.status !== "completed" && collection.status !== "canceled"
          ? canUserEditStep(userForPermission, step.id as StepId, collection)
          : false,
    }
  })
}

export default function CollectionViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = React.use(params)
  const router = useRouter()
  const pathname = usePathname()
  const { user, isNobaUser } = useUserContext()
  const [loading, setLoading] = React.useState(true)
  const [collection, setCollection] = React.useState<Awaited<
    ReturnType<ReturnType<typeof createCollectionsService>["getCollectionById"]>
  > | null>(null)
  const [clientName, setClientName] = React.useState<string>("—")
  const [photographerName, setPhotographerName] = React.useState<string | undefined>(undefined)
  const [participantsNobaTeam, setParticipantsNobaTeam] = React.useState<ParticipantsModalIndividual[]>([])
  const [participantsMainPlayersIndividuals, setParticipantsMainPlayersIndividuals] = React.useState<ParticipantsModalIndividual[]>([])
  const [participantsMainPlayersEntities, setParticipantsMainPlayersEntities] = React.useState<ParticipantsModalEntity[]>([])
  const [noteAuthorsByUserId, setNoteAuthorsByUserId] = React.useState<Record<string, { name: string; userImageUrl?: string; entityName?: string; entityImageUrl?: string }>>({})
  const inFlightEventKeysRef = React.useRef<Set<string>>(new Set())

  const service = React.useMemo(() => createCollectionsService(), [])

  const completedStepIds = React.useMemo(() => {
    if (!collection?.stepStatuses) return []
    return Object.entries(collection.stepStatuses)
      .filter(([, entry]) => {
        const e = entry as { stage?: string }
        return e.stage === "done"
      })
      .map(([id]) => id)
  }, [collection?.stepStatuses])

  const userForPermission = React.useMemo(() => {
    if (!collection || !user?.id) return null
    return resolveUserForPermission(
      user.id,
      isNobaUser,
      collection,
      isNobaUser ? user.role : undefined
    )
  }, [collection, user?.id, user?.role, isNobaUser])

  const refetchCollection = React.useCallback(() => {
    if (!id) return Promise.resolve()
    return service.getCollectionById(id).then((c) => {
      if (!c) {
        setCollection(null)
        return
      }
      if (c.status === "draft") {
        router.replace(`/collections/create/${id}`)
        return
      }
      setCollection(c)
    })
  }, [id, service, router])

  React.useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    service.getCollectionById(id).then((c) => {
      if (cancelled) return
      if (!c) {
        setCollection(null)
        setLoading(false)
        return
      }
      if (c.status === "draft") {
        router.replace(`/collections/create/${id}`)
        return
      }
      setCollection(c)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [id, service, router])

  // Refetch when we land on this page (e.g. back from edit) so status reflects latest shooting dates
  const isViewPage = pathname === `/collections/${id}` && !pathname.startsWith("/collections/create/")
  React.useEffect(() => {
    if (id && isViewPage) refetchCollection()
  }, [id, isViewPage, refetchCollection])

  // Refetch when window/tab gains focus or becomes visible so that after editing shooting dates we show updated status
  React.useEffect(() => {
    const refetch = () => {
      if (id && collection?.id === id) refetchCollection()
    }
    const onVisibility = () => {
      if (document.visibilityState === "visible") refetch()
    }
    window.addEventListener("focus", refetch)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("focus", refetch)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [id, collection?.id, refetchCollection])

  // Check missed deadlines when viewing an in-progress collection (fires *_deadline_missed events
  // so dropoff_delayed etc. notifications are sent even without cron, e.g. in dev)
  React.useEffect(() => {
    if (!id || !collection?.id || collection.status !== "in_progress" || !isViewPage) return
    fetch(`/api/collections/${id}/check-missed-deadlines`, { method: "POST" })
      .then((res) => res.ok && res.json())
      .then((data) => {
        if (data?.fired && data.fired > 0) {
          refetchCollection()
          window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT))
        }
      })
      .catch(() => {})
  }, [id, collection?.id, collection?.status, isViewPage, refetchCollection])

  // Steps, progress, and handler — must run on every render (Rules of Hooks)
  const steps = React.useMemo(() => {
    if (!collection || collection.status === "draft") return []
    const viewStepsConfig = configToViewStepsInput(collection.config)
    const definitions = getViewStepDefinitions(viewStepsConfig)
    const stepsWithStatus = viewStepsWithStatusFromCollection(definitions, collection.config, {
      completedStepIds,
    })
    return viewStepsToTemplateSteps(stepsWithStatus, collection, userForPermission)
  }, [collection, userForPermission, completedStepIds])

  const visibleStepIds = React.useMemo(
    () => steps.filter((s) => !s.inactive).map((s) => s.id),
    [steps]
  )

  // Use backend-provided completion_percentage when available; fall back to client-side calculation.
  // Completed/canceled collections always show 100%.
  const progress = React.useMemo(() => {
    if (collection?.status === "completed" || collection?.status === "canceled") {
      return 100
    }
    if (collection?.completionPercentage != null && collection.completionPercentage > 0) {
      return collection.completionPercentage
    }
    if (visibleStepIds.length === 0) return 0
    const completedCount = visibleStepIds.filter(
      (id) => collection?.stepStatuses?.[id]?.stage === "done"
    ).length
    return Math.round((completedCount / visibleStepIds.length) * 100)
  }, [collection?.status, collection?.completionPercentage, collection?.stepStatuses, visibleStepIds])

  // =============================================================================
  // HELPER: fire event + patch collection
  // =============================================================================
  const fireEvent = React.useCallback(
    async (eventType: string, metadata?: Record<string, unknown>) => {
      if (!id) return
      const eventLockKey = `${eventType}:${JSON.stringify(metadata ?? {})}`
      if (inFlightEventKeysRef.current.has(eventLockKey)) {
        return
      }
      inFlightEventKeysRef.current.add(eventLockKey)

      try {
        const idempotencyKey =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
        const res = await fetch(`/api/collections/${id}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventType, metadata, idempotencyKey }),
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(data?.error ?? "Failed to trigger event")
        }
      } finally {
        inFlightEventKeysRef.current.delete(eventLockKey)
      }
      // Notify navbar bell to refresh immediately after event-triggered notifications
      // are potentially created.
      window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT))
    },
    [id]
  )

  const patchCollection = React.useCallback(
    async (body: Record<string, unknown>) => {
      if (!id) return null
      const res = await fetch(`/api/collections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        collection?: Awaited<ReturnType<ReturnType<typeof createCollectionsService>["getCollectionById"]>>
      }
      if (!res.ok) throw new Error(data?.error ?? "Failed to update collection")
      if (data.collection) setCollection(data.collection)
      return data.collection ?? null
    },
    [id]
  )

  const handleConfirmPickup = React.useCallback(
    async (stepId: string) => {
      if (!id || stepId !== "shooting") return
      try {
        await fireEvent("negatives_pickup_marked")
        await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Confirm pickup error:", err)
        toast.error(err instanceof Error ? err.message : "Failed to trigger event")
        throw err
      }
    },
    [id, fireEvent, refetchCollection]
  )

  const handleConfirmDropoffDelivery = React.useCallback(
    async (stepId: string, canMeetDeadline: boolean) => {
      if (!id || stepId !== "negatives_dropoff") return
      try {
        await fireEvent("dropoff_confirmed", { canMeetDeadline })
        await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Confirm dropoff delivery error:", err)
        toast.error(err instanceof Error ? err.message : "Failed to trigger event")
        throw err
      }
    },
    [id, fireEvent, refetchCollection]
  )

  // =============================================================================
  // STEP 3: Upload low-res (append URL + note to arrays)
  // =============================================================================
  const handleUploadLowRes = React.useCallback(
    async (payload: { url: string; notes?: string }) => {
      if (!id) return
      try {
        const url = payload.url.trim()
        if (!url) throw new Error("URL is required")
        const body: Record<string, unknown> = {
          lowres_selection_url: url,
        }
        if (payload.notes?.trim()) {
          body.step_note_low_res = { from: "lab", text: payload.notes.trim(), url }
        }
        await patchCollection(body)
        // Always fire scanning_completed when uploading low-res for the first time.
        // The events API validates the substatus transition; recomputeAndPersistProgress
        // will correctly update step_statuses and substatus from events.
        await fireEvent("scanning_completed", { lowResUrl: url, notes: payload.notes })
        await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Upload low-res error:", err)
        toast.error(err instanceof Error ? err.message : "Failed to save low-res")
        throw err
      }
    },
    [id, patchCollection, fireEvent, refetchCollection]
  )

  /** Step 3 (after first upload): additional footage — append URL to same array. */
  const handleUploadMoreLowRes = React.useCallback(
    async (payload: { url: string; notes?: string }) => {
      if (!id) return
      try {
        const url = payload.url.trim()
        if (!url) throw new Error("URL is required")
        const body: Record<string, unknown> = {
          lowres_selection_url: url,
        }
        if (payload.notes?.trim()) {
          body.step_note_low_res = { from: "lab", text: payload.notes.trim(), url }
        }
        await patchCollection(body)
        // Always fire lab_shared_additional_materials when uploading more low-res.
        // This event has action: "none" (no substatus change) but records the upload in history.
        await fireEvent("lab_shared_additional_materials", { lowResUrl: url, notes: payload.notes })
        await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Upload more low-res error:", err)
        toast.error(err instanceof Error ? err.message : "Failed to upload more photos")
      }
    },
    [id, patchCollection, fireEvent, refetchCollection]
  )

  // =============================================================================
  // STEP 4: Upload photographer selection (append URL + note)
  // =============================================================================
  const handleUploadPhotographerSelection = React.useCallback(
    async (payload: { url: string; notes?: string }) => {
      if (!id) return
      try {
        const url = payload.url.trim()
        if (!url) throw new Error("URL is required")
        const hadExistingSelection = (collection?.photographerSelectionUrl?.length ?? 0) > 0
        const body: Record<string, unknown> = {
          photographer_selection_url: url,
        }
        if (payload.notes?.trim()) {
          body.step_note_photographer_selection = { from: "photographer", text: payload.notes.trim(), url }
        }
        await patchCollection(body)
        if (hadExistingSelection) {
          await fireEvent("photographer_selection_shared", { url, notes: payload.notes })
        } else {
          await fireEvent("photographer_selection_uploaded", { url, notes: payload.notes })
        }
        await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Upload photographer selection error:", err)
        toast.error("Failed to upload selection")
      }
    },
    [id, collection?.photographerSelectionUrl, patchCollection, fireEvent, refetchCollection]
  )

  // =============================================================================
  // STEP 4: Request additional photos (revert + note)
  // =============================================================================
  const handleRequestAdditionalPhotos = React.useCallback(
    async (notes: string) => {
      if (!id) return
      try {
        // Save note to step_notes_low_res (request goes back to lab)
        if (notes.trim()) {
          await patchCollection({
            step_note_low_res: { from: "photographer", text: notes.trim() },
          })
        }
        // Fire event (triggers revert in substatus mapping)
        await fireEvent("photographer_requested_additional_photos", { notes: notes.trim() })
        await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Request additional photos error:", err)
        toast.error("Failed to save request")
      }
    },
    [id, patchCollection, fireEvent, refetchCollection]
  )

  // =============================================================================
  // STEP 5: Upload client selection (append URL + note)
  // =============================================================================
  const handleUploadClientSelection = React.useCallback(
    async (payload: { url: string; notes?: string }) => {
      if (!id) return
      try {
        const url = payload.url.trim()
        if (!url) throw new Error("URL is required")
        const body: Record<string, unknown> = {
          client_selection_url: url,
        }
        if (payload.notes?.trim()) {
          body.step_note_client_selection = { from: "client", text: payload.notes.trim(), url }
        }
        await patchCollection(body)
        await fireEvent("client_selection_confirmed", { url, notes: payload.notes })
        await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Upload client selection error:", err)
        toast.error("Failed to save selection")
      }
    },
    [id, patchCollection, fireEvent, refetchCollection]
  )

  // =============================================================================
  // STEP 5: Request more photos from photographer (revert client_selection → photographer_selection)
  // =============================================================================
  const handleRequestMorePhotosFromPhotographer = React.useCallback(
    async (notes: string) => {
      if (!id) return
      try {
        const isClientConfirmation = collection?.substatus === "client_confirmation"
        if (notes.trim()) {
          await patchCollection({
            ...(isClientConfirmation
              ? { step_note_client_confirmation: { from: "client", text: notes.trim() } }
              : { step_note_photographer_selection: { from: "client", text: notes.trim() } }),
          })
        }
        // Fire event to revert (custom event — use photographer_requested_additional_photos for now,
        // since it has revert logic; or we use a direct substatus revert via the API)
        // For simplicity, we use the existing event but add metadata to distinguish source
        await fireEvent("photographer_requested_additional_photos", {
          source: isClientConfirmation ? "client_confirmation" : "client",
          notes: notes.trim(),
        })
        await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Request more photos from photographer error:", err)
        toast.error("Failed to save request")
      }
    },
    [id, collection?.substatus, patchCollection, fireEvent, refetchCollection]
  )

  // =============================================================================
  // STEP 6: Validate client selection (photographer review)
  // =============================================================================
  /** Step 6: Photographer adds comments/link for lab. When URL is provided, advances to step 7 (same as "Validate client selection"). */
  const handleValidateClientSelection = React.useCallback(
    async (comments?: string, url?: string) => {
      if (!id) return
      try {
        const body: Record<string, unknown> = {}
        if (comments?.trim()) {
          body.step_note_photographer_review = {
            from: "photographer",
            text: comments.trim(),
            ...(url?.trim() && { url: url.trim() }),
          }
        }
        if (url?.trim()) {
          body.photographer_review_url = url.trim()
        }
        if (Object.keys(body).length > 0) {
          await patchCollection(body)
        }
        if (url?.trim()) {
          await fireEvent("photographer_check_approved", {})
        }
        await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Validate client selection error:", err)
        toast.error("Failed to validate selection")
      }
    },
    [id, patchCollection, fireEvent, refetchCollection]
  )

  /** Step 6: Photographer approves client selection directly — copy client URLs to photographer_review, advance to step 7. */
  const handleValidateClientSelectionDirect = React.useCallback(
    async (selectedUrls?: string[]) => {
      if (!id) return
      try {
        const body: Record<string, unknown> = { photographer_review_copy_from_client_selection: true }
        if (selectedUrls && selectedUrls.length > 0) {
          body.photographer_review_selected_urls = selectedUrls
        }
        await patchCollection(body)
        await fireEvent("photographer_check_approved", {})
        await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Validate client selection (direct) error:", err)
        toast.error("Failed to validate selection")
      }
    },
    [id, patchCollection, fireEvent, refetchCollection]
  )

  // =============================================================================
  // STEP 6: Request more photos from client (revert to client_selection)
  // =============================================================================
  const handleRequestMorePhotosFromClient = React.useCallback(
    async (notes: string) => {
      if (!id) return
      try {
        const isHighResStage = collection?.substatus === "low_res_to_high_res"
        if (notes.trim()) {
          await patchCollection({
            ...(isHighResStage
              ? { step_note_photographer_review: { from: "lab", text: notes.trim() } }
              : { step_note_client_selection: { from: "photographer", text: notes.trim() } }),
          })
        }
        // Revert back:
        // - from photographer review => client_selection
        // - from low-res to high-res => photographer review (substatus client_selection)
        await fireEvent("photographer_requested_additional_photos", {
          source: isHighResStage ? "high_res" : "photographer_review",
          notes: notes.trim(),
        })
        await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Request more photos from client error:", err)
        toast.error("Failed to save request")
      }
    },
    [id, collection?.substatus, patchCollection, fireEvent, refetchCollection]
  )

  // =============================================================================
  // STEP 7: Upload high-res (append URL + note, fire event)
  // =============================================================================
  const handleUploadHighRes = React.useCallback(
    async (payload: { url: string; notes?: string }) => {
      if (!id) return
      try {
        const url = payload.url.trim()
        if (!url) throw new Error("URL is required")
        const body: Record<string, unknown> = {
          highres_selection_url: url,
        }
        if (payload.notes?.trim()) {
          body.step_note_high_res = { from: "lab", text: payload.notes.trim(), url }
        }
        await patchCollection(body)
        await fireEvent("highres_ready", { url, notes: payload.notes })
        await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Upload high-res error:", err)
        toast.error("Failed to upload high-res")
      }
    },
    [id, patchCollection, fireEvent, refetchCollection]
  )

  // =============================================================================
  // STEP 8: Give instructions (edition request — append URL + details, fire event)
  // =============================================================================
  const handleGiveInstructions = React.useCallback(
    async (payload: { details: string; url?: string }) => {
      if (!id) return
      try {
        const body: Record<string, unknown> = {}
        if (payload.url?.trim()) {
          body.edition_instructions_url = payload.url.trim()
        }
        if (payload.details?.trim()) {
          body.step_note_edition_request = {
            from: "photographer",
            text: payload.details.trim(),
            ...(payload.url?.trim() && { url: payload.url.trim() }),
          }
        }
        await patchCollection(body)
        await fireEvent("edition_request_submitted", { url: payload.url, details: payload.details })
        await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Give instructions error:", err)
        toast.error("Failed to save instructions")
      }
    },
    [id, patchCollection, fireEvent, refetchCollection]
  )

  // =============================================================================
  // STEP 9: Upload finals (append URL + note, fire event)
  // =============================================================================
  const handleUploadFinals = React.useCallback(
    async (payload: { url: string; notes?: string }) => {
      if (!id) return
      try {
        const url = payload.url.trim()
        if (!url) throw new Error("URL is required")
        const hadExistingFinals = (collection?.finalsSelectionUrl?.length ?? 0) > 0
        const body: Record<string, unknown> = {
          finals_selection_url: url,
        }
        if (payload.notes?.trim()) {
          body.step_note_final_edits = { from: "retouch_studio", text: payload.notes.trim(), url }
        }
        await patchCollection(body)
        if (hadExistingFinals) {
          await fireEvent("retouch_studio_shared_additional_materials", { url, notes: payload.notes })
        } else {
          await fireEvent("final_edits_completed", { url, notes: payload.notes })
        }
        await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Upload finals error:", err)
        toast.error("Failed to upload finals")
      }
    },
    [id, collection?.finalsSelectionUrl, patchCollection, fireEvent, refetchCollection]
  )

  // =============================================================================
  // STEP 10: Add new link (photographer shares additional URL and/or comments)
  // =============================================================================
  const handleAddPhotographerLastCheckLink = React.useCallback(
    async (payload: { url?: string; comments?: string; from?: string }) => {
      if (!id) return
      try {
        const body: Record<string, unknown> = {}
        if (payload.url?.trim()) {
          body.photographer_last_check_url = payload.url.trim()
        }
        if (payload.comments?.trim()) {
          body.step_note_photographer_last_check = {
            from: payload.from ?? "photographer",
            text: payload.comments.trim(),
            ...(payload.url?.trim() ? { url: payload.url.trim() } : {}),
          }
        }
        if (Object.keys(body).length > 0) {
          const step10AlreadyDone = collection?.stepStatuses?.["photographer_last_check"]?.stage === "done"
          await patchCollection(body)
          if ((payload.url?.trim() || payload.comments?.trim()) && !step10AlreadyDone) {
            await fireEvent("photographer_edits_approved")
          }
          await refetchCollection()
        }
      } catch (err) {
        console.error("[CollectionViewPage] Add photographer last check link error:", err)
        toast.error("Failed to save link or comment")
      }
    },
    [id, collection?.stepStatuses, patchCollection, fireEvent, refetchCollection]
  )

  // =============================================================================
  // STEP 10: Share final edits url with client (photographer last check approved)
  // =============================================================================
  const handleValidateFinals = React.useCallback(
    async (selectedUrls?: string[]) => {
      if (!id) return
      try {
        if (selectedUrls && selectedUrls.length > 0) {
          await patchCollection({ photographer_approved_material_urls: selectedUrls })
        }
        await fireEvent("photographer_edits_approved")
        await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Validate finals error:", err)
        toast.error("Failed to validate finals")
      }
    },
    [id, patchCollection, fireEvent, refetchCollection]
  )

  // =============================================================================
  // Add step note (UrlHistory "Add comment" — appends to step notes column)
  // =============================================================================
  const handleAddStepNote = React.useCallback(
    async (payload: { stepNoteKey: string; from: string; text: string; url?: string }) => {
      if (!id) return
      try {
        await patchCollection({
          [payload.stepNoteKey]: { from: payload.from, text: payload.text, ...(payload.url ? { url: payload.url } : {}) },
        })
        await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Add step note error:", err)
        toast.error("Failed to add comment")
        throw err
      }
    },
    [id, patchCollection, refetchCollection]
  )

  // =============================================================================
  // STEP 11: Complete collection (client confirmation approved)
  // =============================================================================
  const handleCompleteCollection = React.useCallback(
    async () => {
      if (!id) return
      try {
        await fireEvent("collection_completed")
        await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Complete collection error:", err)
        toast.error("Failed to complete collection")
      }
    },
    [id, fireEvent, refetchCollection]
  )

  // Reset client/photographer names when collection changes (participants-display will populate them)
  React.useEffect(() => {
    if (!collection) {
      setClientName("—")
      setPhotographerName(undefined)
      return
    }
    const clientId = collection.config.clientEntityId
    if (!clientId) setClientName("—")
  }, [collection])

  // Load participants for modal: full list for everyone who can view the collection (server resolves with admin so no per-role filtering)
  React.useEffect(() => {
    if (!collection?.id) {
      setParticipantsNobaTeam([])
      setParticipantsMainPlayersIndividuals([])
      setParticipantsMainPlayersEntities([])
      return
    }
    let cancelled = false
    fetch(`/api/collections/${collection.id}/participants-display`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: {
        nobaTeam?: ParticipantsModalIndividual[]
        mainPlayersIndividuals?: ParticipantsModalIndividual[]
        mainPlayersEntities?: ParticipantsModalEntity[]
        photographerName?: string
        clientDisplayName?: string
        noteAuthorsByUserId?: Record<string, { name: string; userImageUrl?: string; entityName?: string; entityImageUrl?: string }>
      } | null) => {
        if (cancelled || !data) return
        setParticipantsNobaTeam(data.nobaTeam ?? [])
        setParticipantsMainPlayersIndividuals(data.mainPlayersIndividuals ?? [])
        setParticipantsMainPlayersEntities(data.mainPlayersEntities ?? [])
        setPhotographerName(data.photographerName ?? undefined)
        setNoteAuthorsByUserId(data.noteAuthorsByUserId ?? {})
        setClientName(
          data.clientDisplayName
            ? `@${data.clientDisplayName.toLowerCase()}`
            : "—"
        )
      })
      .catch(() => {
        if (!cancelled) {
          setParticipantsNobaTeam([])
          setParticipantsMainPlayersIndividuals([])
          setParticipantsMainPlayersEntities([])
          setPhotographerName(undefined)
          setClientName("—")
        }
      })
    return () => {
      cancelled = true
    }
  }, [collection?.id])

  // Per-step owners (used for canShowModalActions — must use open step's owners, not collection.currentOwners)
  const stepOwners = React.useMemo((): Record<string, CollectionMemberRole[]> => {
    if (!collection) return {}
    const map: Record<string, CollectionMemberRole[]> = {}
    for (const stepId of STEP_IDS) {
      map[stepId] = getStepOwner(stepId, collection).map((r) => toDbCollectionRole(r))
    }
    return map
  }, [collection])

  // ---------------------------------------------------------------------------
  // DEBUG: per-step owner roles + role→names map (dev only, safe to remove)
  // ---------------------------------------------------------------------------
  const debugStepOwners = React.useMemo(() => {
    if (process.env.NODE_ENV !== "development" || !collection) return undefined
    return stepOwners
  }, [collection, stepOwners])

  const debugCanEditPerStep = React.useMemo(() => {
    if (process.env.NODE_ENV !== "development" || !collection) return undefined
    const config = collection.config
    const participants = collection.participants
    const nobaUids = config.nobaUserIds ?? participants.find((p) => p.role === "producer")?.userIds ?? []
    const roleLabels: Record<string, string> = {
      producer: "Producer",
      client: "Client",
      photographer: "Photographer",
      agency: "Agency",
      photo_lab: "Photo Lab",
      handprint_lab: "Hand Print Lab",
      retouch_studio: "Retouch Studio",
    }
    const map: Record<string, string[]> = {}
    for (const stepId of STEP_IDS) {
      const ownerRoles = getStepOwner(stepId, collection)
      const names: string[] = []
      const rolesWithEdit = new Set<string>()
      for (const role of ownerRoles) {
        if (role === "producer") {
          for (const uid of nobaUids) {
            const id = String(uid).trim()
            const hasEdit = config.nobaEditPermissionByUserId?.[id] ?? true
            if (hasEdit) {
              if (noteAuthorsByUserId[id]) names.push(noteAuthorsByUserId[id].name)
              else rolesWithEdit.add(role)
            }
          }
        } else {
          const participant = participants.find((p) => p.role === role)
          if (!participant) continue
          for (const uid of participant.userIds ?? []) {
            const hasEdit = participant.editPermissionByUserId?.[uid] ?? false
            if (hasEdit) {
              if (noteAuthorsByUserId[uid]) names.push(noteAuthorsByUserId[uid].name)
              else rolesWithEdit.add(role)
            }
          }
        }
      }
      for (const role of rolesWithEdit) {
        const label = roleLabels[role] ?? role
        if (!names.includes(label)) names.push(label)
      }
      map[stepId] = names
    }
    return map
  }, [collection, noteAuthorsByUserId])
  // ---------------------------------------------------------------------------
  // END DEBUG
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-lg font-medium text-foreground">Collection not found</p>
          <p className="text-sm text-muted-foreground">
            This collection may have been removed or the link is invalid.
          </p>
          <button
            type="button"
            onClick={() => router.push("/collections")}
            className="text-sm font-medium text-primary hover:underline"
          >
            Back to Collections
          </button>
        </div>
      </div>
    )
  }

  const stageStatus = collection.status === "completed"
    ? "done" as const
    : collection.status === "canceled"
      ? "done" as const
      : deriveStageStatusFromShootingStart(
          {
            shootingStartDate: collection.config.shootingStartDate ?? collection.config.shootingDate,
            shootingStartTime: collection.config.shootingStartTime,
          },
          collection.status === "in_progress" ? "in-progress" : "upcoming"
        )
  const shootingType = collection.config.hasHandprint
    ? (collection.config.handprintVariant === "hr" ? "handprint_hr" : "handprint_hp")
    : "digital"

  return (
    <CollectionTemplate
      collectionName={collection.config.name || "Collection"}
      clientName={clientName}
      progress={progress}
      stageStatus={stageStatus}
      shootingType={shootingType}
      photographerName={photographerName}
      showPhotographerName={!!photographerName}
      showParticipantsButton={true}
      showSettingsButton={true}
      collectionId={id}
      currentOwners={collection.currentOwners ?? []}
      stepOwners={stepOwners}
      currentUserCollectionRole={userForPermission ? toDbCollectionRole(userForPermission.role) : null}
      currentUserHasEditPermission={userForPermission?.hasEditPermission ?? false}
      debugStepOwners={debugStepOwners}
      debugCanEditPerStep={debugCanEditPerStep}
      steps={steps}
      participantsNobaTeam={participantsNobaTeam}
      participantsMainPlayersIndividuals={participantsMainPlayersIndividuals}
      participantsMainPlayersEntities={participantsMainPlayersEntities}
      shootingStreetAddress={collection.config.shootingStreetAddress}
      shootingCity={collection.config.shootingCity}
      shootingZipCode={collection.config.shootingZipCode}
      shootingCountry={collection.config.shootingCountry}
      dropoffShippingCarrier={collection.config.dropoff_shipping_carrier}
      dropoffShippingTracking={collection.config.dropoff_shipping_tracking}
      dropoffShippingOriginAddress={collection.config.dropoff_shipping_origin_address}
      dropoffShippingDate={collection.config.dropoff_shipping_date}
      dropoffShippingTime={collection.config.dropoff_shipping_time}
      dropoffShippingDestinationAddress={collection.config.dropoff_shipping_destination_address}
      dropoffDeliveryDate={collection.config.dropoff_delivery_date}
      dropoffDeliveryTime={collection.config.dropoff_delivery_time}
      onConfirmPickup={handleConfirmPickup}
      onConfirmDropoffDelivery={handleConfirmDropoffDelivery}
      onUploadLowRes={handleUploadLowRes}
      onUploadMoreLowRes={handleUploadMoreLowRes}
      uploadLowResShowShippingReminder={collection.config.handprintIsDifferentLab}
      uploadLowResInitialNotes={
        collection.stepNotesLowRes?.length
          ? collection.stepNotesLowRes[collection.stepNotesLowRes.length - 1]?.text
          : undefined
      }
      lowResSelectionUrl={collection.lowResSelectionUrl ?? undefined}
      lowResUploadedAt={collection.lowResSelectionUploadedAt ?? undefined}
      photographerSelectionUrl={collection.photographerSelectionUrl ?? undefined}
      photographerSelectionUploadedAt={collection.photographerSelectionUploadedAt ?? undefined}
      photographerNotes01={
        collection.stepNotesPhotographerSelection?.length
          ? collection.stepNotesPhotographerSelection[collection.stepNotesPhotographerSelection.length - 1]?.text
          : undefined
      }
      onUploadPhotographerSelection={handleUploadPhotographerSelection}
      stepNotesLowRes={collection.stepNotesLowRes}
      stepNotesPhotographerSelection={collection.stepNotesPhotographerSelection}
      onRequestAdditionalPhotos={handleRequestAdditionalPhotos}
      onAddStepNote={handleAddStepNote}
      onUploadClientSelection={handleUploadClientSelection}
      onRequestMorePhotosFromPhotographer={handleRequestMorePhotosFromPhotographer}
      clientSelectionUrl={collection.clientSelectionUrl ?? undefined}
      clientSelectionUploadedAt={collection.clientSelectionUploadedAt ?? undefined}
      photographerReviewUrl={collection.photographerReviewUrl ?? undefined}
      photographerReviewUploadedAt={collection.photographerReviewUploadedAt ?? undefined}
      stepNotesClientSelection={collection.stepNotesClientSelection}
      onValidateClientSelection={handleValidateClientSelection}
      onValidateClientSelectionDirect={handleValidateClientSelectionDirect}
      onRequestMorePhotosFromClient={handleRequestMorePhotosFromClient}
      stepNotesPhotographerReview={collection.stepNotesPhotographerReview}
      onUploadHighRes={handleUploadHighRes}
      highResSelectionUrl={collection.highResSelectionUrl ?? undefined}
      highResUploadedAt={collection.highResSelectionUploadedAt ?? undefined}
      highResUploadedByName={undefined}
      stepNotesHighRes={collection.stepNotesHighRes}
      highResUploadedByEntityName={undefined}
      onGiveInstructions={handleGiveInstructions}
      editionRequestInstructionsUrl={collection.editionInstructionsUrl ?? undefined}
      editionRequestInstructionsUploadedAt={collection.editionInstructionsUploadedAt ?? undefined}
      stepNotesEditionRequest={collection.stepNotesEditionRequest}
      onUploadFinals={handleUploadFinals}
      finalsSelectionUrl={collection.finalsSelectionUrl ?? undefined}
      photographerLastCheckUrl={collection.photographerLastCheckUrl ?? undefined}
      photographerLastCheckUploadedAt={collection.photographerLastCheckUploadedAt ?? undefined}
      photographerApprovedMaterialUrls={collection.photographerApprovedMaterialUrls ?? undefined}
      finalsUploadedAt={collection.finalsSelectionUploadedAt ?? undefined}
      finalsUploadedByName={undefined}
      stepNotesFinalEdits={collection.stepNotesFinalEdits}
      finalsUploadedByEntityName={undefined}
      onAddPhotographerLastCheckLink={handleAddPhotographerLastCheckLink}
      onValidateFinals={handleValidateFinals}
      hasEditionStudio={collection.config.hasEditionStudio}
      onCompleteCollection={handleCompleteCollection}
      stepNotesPhotographerLastCheck={collection.stepNotesPhotographerLastCheck}
      stepNotesClientConfirmation={collection.stepNotesClientConfirmation}
      noteAuthorsByUserId={noteAuthorsByUserId}
      uploadLowResShippingReminderDate={collection.config.lowResShippingDeliveryDate}
      uploadLowResShippingReminderTime={collection.config.lowResShippingDeliveryTime}
      uploadLowResShippingReminderDestination={collection.config.lowResShippingDestinationAddress}
      navBarProps={{
        variant: "noba",
        userName: "Martin Becerra",
        organization: "noba",
        role: "admin",
        isAdmin: true,
      }}
    />
  )
}
