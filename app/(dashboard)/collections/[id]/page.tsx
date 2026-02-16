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
  EVENT_TYPE_TO_STEP_ID,
  resolveUserForPermission,
  canUserEditStep,
  deriveStageStatusFromShootingStart,
  computeStepHealth,
  getDeadlineForStep,
} from "@/lib/domain/collections"
import type {
  StepId,
  UserForPermission,
  CollectionDraft,
  StepStage,
  StepHealth,
  ViewStepId,
} from "@/lib/domain/collections"
import type {
  ParticipantsModalIndividual,
  ParticipantsModalEntity,
} from "@/components/custom/participants-modal"
import { toast } from "sonner"

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
        userForPermission && collection
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
  const [completedStepIds, setCompletedStepIds] = React.useState<string[]>([])

  const service = React.useMemo(() => createCollectionsService(), [])

  /** Derive completed step ids from collection_events. */
  const fetchCompletedStepIds = React.useCallback(
    async (collectionId: string) => {
      try {
        const res = await fetch(`/api/collections/${collectionId}/events`, { cache: "no-store" })
        if (!res.ok) return
        const data = (await res.json()) as { events?: Array<{ event_type?: string }> }
        const events = data.events ?? []
        const stepIds = new Set<string>()
        for (const e of events) {
          const stepId = e.event_type && EVENT_TYPE_TO_STEP_ID[e.event_type]
          if (stepId) stepIds.add(stepId)
        }
        setCompletedStepIds(Array.from(stepIds))
      } catch (err) {
        console.error("[CollectionViewPage] Failed to fetch events:", err)
      }
    },
    []
  )

  const userForPermission = React.useMemo(() => {
    if (!collection || !user?.id) return null
    return resolveUserForPermission(user.id, isNobaUser, collection)
  }, [collection, user?.id, isNobaUser])

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

  React.useEffect(() => {
    if (!id || !collection || collection.status === "draft") return
    fetchCompletedStepIds(id)
  }, [id, collection?.id, collection?.status, fetchCompletedStepIds])

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

  // Use backend-provided completion_percentage when available; fall back to client-side calculation
  const progress = React.useMemo(() => {
    if (collection?.completionPercentage != null && collection.completionPercentage > 0) {
      return collection.completionPercentage
    }
    if (visibleStepIds.length === 0) return 0
    const completedCount = visibleStepIds.filter(
      (id) => collection?.stepStatuses?.[id]?.stage === "done"
    ).length
    return Math.round((completedCount / visibleStepIds.length) * 100)
  }, [collection?.completionPercentage, collection?.stepStatuses, visibleStepIds])

  // =============================================================================
  // HELPER: fire event + patch collection
  // =============================================================================
  const fireEvent = React.useCallback(
    async (eventType: string, metadata?: Record<string, unknown>) => {
      if (!id) return
      const res = await fetch(`/api/collections/${id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, metadata }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data?.error ?? "Failed to trigger event")
      }
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
        await fetchCompletedStepIds(id)
      } catch (err) {
        console.error("[CollectionViewPage] Confirm pickup error:", err)
        toast.error(err instanceof Error ? err.message : "Failed to trigger event")
        throw err
      }
    },
    [id, fireEvent, fetchCompletedStepIds]
  )

  const handleConfirmDropoffDelivery = React.useCallback(
    async (stepId: string, canMeetDeadline: boolean) => {
      if (!id || stepId !== "negatives_dropoff") return
      try {
        await fireEvent("dropoff_confirmed", { canMeetDeadline })
        await fetchCompletedStepIds(id)
      } catch (err) {
        console.error("[CollectionViewPage] Confirm dropoff delivery error:", err)
        toast.error(err instanceof Error ? err.message : "Failed to trigger event")
        throw err
      }
    },
    [id, fireEvent, fetchCompletedStepIds]
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
          body.step_note_low_res = { from: "lab", text: payload.notes.trim() }
        }
        const updated = await patchCollection(body)
        // Use the collection returned by PATCH (source of truth) to avoid stale closure;
        // only advance when low-res scanning is the current active substatus.
        if (updated?.substatus === "low_res_scanning") {
          await fireEvent("scanning_completed", { lowResUrl: url, notes: payload.notes })
          await fetchCompletedStepIds(id)
          await refetchCollection()
        }
      } catch (err) {
        console.error("[CollectionViewPage] Upload low-res error:", err)
        toast.error(err instanceof Error ? err.message : "Failed to save low-res")
        throw err
      }
    },
    [id, patchCollection, fireEvent, fetchCompletedStepIds, refetchCollection]
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
          body.step_note_low_res = { from: "lab", text: payload.notes.trim() }
        }
        const updated = await patchCollection(body)
        // Use the collection returned by PATCH (source of truth) to avoid stale closure.
        if (updated?.substatus === "low_res_scanning") {
          await fireEvent("scanning_completed", { lowResUrl: url, notes: payload.notes })
          await fetchCompletedStepIds(id)
          await refetchCollection()
        }
      } catch (err) {
        console.error("[CollectionViewPage] Upload more low-res error:", err)
        toast.error(err instanceof Error ? err.message : "Failed to upload more photos")
      }
    },
    [id, patchCollection, fireEvent, fetchCompletedStepIds, refetchCollection]
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
        const body: Record<string, unknown> = {
          photographer_selection_url: url,
        }
        if (payload.notes?.trim()) {
          body.step_note_photographer_selection = { from: "photographer", text: payload.notes.trim() }
        }
        await patchCollection(body)
        await fireEvent("photographer_selection_uploaded", { url, notes: payload.notes })
        await fetchCompletedStepIds(id)
      } catch (err) {
        console.error("[CollectionViewPage] Upload photographer selection error:", err)
        toast.error("Failed to upload selection")
      }
    },
    [id, patchCollection, fireEvent, fetchCompletedStepIds]
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
        await fetchCompletedStepIds(id)
      } catch (err) {
        console.error("[CollectionViewPage] Request additional photos error:", err)
        toast.error("Failed to save request")
      }
    },
    [id, patchCollection, fireEvent, fetchCompletedStepIds, refetchCollection]
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
          body.step_note_client_selection = { from: "client", text: payload.notes.trim() }
        }
        await patchCollection(body)
        await fireEvent("client_selection_confirmed", { url, notes: payload.notes })
        await fetchCompletedStepIds(id)
        await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Upload client selection error:", err)
        toast.error("Failed to save selection")
      }
    },
    [id, patchCollection, fireEvent, fetchCompletedStepIds, refetchCollection]
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
              ? { step_note_photographer_last_check: { from: "client", text: notes.trim() } }
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
        await fetchCompletedStepIds(id)
      } catch (err) {
        console.error("[CollectionViewPage] Request more photos from photographer error:", err)
        toast.error("Failed to save request")
      }
    },
    [id, collection?.substatus, patchCollection, fireEvent, fetchCompletedStepIds, refetchCollection]
  )

  // =============================================================================
  // STEP 6: Validate client selection (photographer review)
  // =============================================================================
  const handleValidateClientSelection = React.useCallback(
    async (comments?: string) => {
      if (!id) return
      try {
        if (comments?.trim()) {
          await patchCollection({
            step_note_photographer_review: { from: "photographer", text: comments.trim() },
          })
        }
        await fireEvent("photographer_check_approved", { comments })
        await fetchCompletedStepIds(id)
        await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Validate client selection error:", err)
        toast.error("Failed to validate selection")
      }
    },
    [id, patchCollection, fireEvent, fetchCompletedStepIds, refetchCollection]
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
        await fetchCompletedStepIds(id)
      } catch (err) {
        console.error("[CollectionViewPage] Request more photos from client error:", err)
        toast.error("Failed to save request")
      }
    },
    [id, collection?.substatus, patchCollection, fireEvent, fetchCompletedStepIds, refetchCollection]
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
          body.step_note_high_res = { from: "lab", text: payload.notes.trim() }
        }
        await patchCollection(body)
        await fireEvent("highres_ready", { url, notes: payload.notes })
        await fetchCompletedStepIds(id)
        await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Upload high-res error:", err)
        toast.error("Failed to upload high-res")
      }
    },
    [id, patchCollection, fireEvent, fetchCompletedStepIds, refetchCollection]
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
          body.step_note_edition_request = { from: "photographer", text: payload.details.trim() }
        }
        await patchCollection(body)
        await fireEvent("edition_request_submitted", { url: payload.url, details: payload.details })
        await fetchCompletedStepIds(id)
        await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Give instructions error:", err)
        toast.error("Failed to save instructions")
      }
    },
    [id, patchCollection, fireEvent, fetchCompletedStepIds, refetchCollection]
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
        const body: Record<string, unknown> = {
          finals_selection_url: url,
        }
        if (payload.notes?.trim()) {
          body.step_note_final_edits = { from: "edition_studio", text: payload.notes.trim() }
        }
        await patchCollection(body)
        await fireEvent("final_edits_completed", { url, notes: payload.notes })
        await fetchCompletedStepIds(id)
        await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Upload finals error:", err)
        toast.error("Failed to upload finals")
      }
    },
    [id, patchCollection, fireEvent, fetchCompletedStepIds, refetchCollection]
  )

  // =============================================================================
  // STEP 10: Request changes (revert to final_edits, save note)
  // =============================================================================
  const handleRequestChanges = React.useCallback(
    async (notes?: string) => {
      if (!id) return
      try {
        if (notes?.trim()) {
          await patchCollection({
            // Photographer last check feedback should be read by edition studio
            step_note_edition_request: { from: "photographer", text: notes.trim() },
          })
        }
        // Revert substatus backwards to final_edits
        await fireEvent("photographer_requested_additional_photos", { source: "photographer_last_check", notes: notes?.trim() })
        await refetchCollection()
        await fetchCompletedStepIds(id)
      } catch (err) {
        console.error("[CollectionViewPage] Request changes error:", err)
        toast.error("Failed to save request")
      }
    },
    [id, patchCollection, fireEvent, fetchCompletedStepIds, refetchCollection]
  )

  // =============================================================================
  // STEP 10: Validate finals (photographer last check approved)
  // =============================================================================
  const handleValidateFinals = React.useCallback(
    async () => {
      if (!id) return
      try {
        await fireEvent("photographer_edits_approved")
        await fetchCompletedStepIds(id)
        await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Validate finals error:", err)
        toast.error("Failed to validate finals")
      }
    },
    [id, fireEvent, fetchCompletedStepIds, refetchCollection]
  )

  // Resolve client and photographer names from collection data via API
  React.useEffect(() => {
    if (!collection) return
    const clientId = collection.config.clientEntityId
    const photographer = collection.participants.find((p) => p.role === "photographer")
    const photographerUserId = photographer?.userIds?.[0]

    if (clientId) {
      fetch(`/api/organizations/${clientId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { entity?: { name?: string } } | null) => {
          const name = data?.entity?.name
          setClientName(name ? `@${name.toLowerCase()}` : "—")
        })
        .catch(() => setClientName("—"))
    } else {
      setClientName("—")
    }
    if (photographerUserId) {
      fetch(`/api/users/${photographerUserId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { user?: { firstName?: string; lastName?: string; email?: string } } | null) => {
          const u = data?.user
          if (!u) {
            setPhotographerName(undefined)
            return
          }
          const name = [u.firstName, u.lastName].filter(Boolean).join(" ")
          setPhotographerName(name || u.email || undefined)
        })
        .catch(() => setPhotographerName(undefined))
    } else {
      setPhotographerName(undefined)
    }
  }, [collection])

  // Load participants for modal: noba team (individuals), main players (photographer as individual, client/agency/lab/edition/handprint as entities; order: photographer, client, then rest)
  React.useEffect(() => {
    if (!collection) {
      setParticipantsNobaTeam([])
      setParticipantsMainPlayersIndividuals([])
      setParticipantsMainPlayersEntities([])
      return
    }
    let cancelled = false
    const config = collection.config
    const participants = collection.participants
    const currentUserId = user?.id?.trim()

    const producer = participants.find((p) => p.role === "producer")
    const nobaUserIds = config.nobaUserIds ?? producer?.userIds ?? []
    const photographer = participants.find((p) => p.role === "photographer")
    const agencyParticipant = participants.find((p) => p.role === "agency")
    const agencyUserIds = new Set(agencyParticipant?.userIds ?? [])
    const photographerUserIds = (photographer?.userIds ?? []).filter(
      (uid) => !agencyUserIds.has(uid)
    )

    // Main players order: 1. Photographer (individual), 2. Client (entity), 3. Agency (entity, if invited),
    // 4. Photo Lab (entity, if invited), 5. Hand print lab (entity, if invited), 6. Retouch studio (entity, if invited)
    const clientId = config.clientEntityId?.trim() ? config.clientEntityId : undefined
    const agencyId = config.hasAgency && photographer?.entityId ? photographer.entityId : undefined
    const labParticipant = participants.find((p) => p.role === "lab")
    const handprintLabParticipant = participants.find((p) => p.role === "handprint_lab")
    const editionStudioParticipant = participants.find((p) => p.role === "edition_studio")
    const entityIds: string[] = []
    const entityTypeLabels: string[] = []
    if (clientId) {
      entityIds.push(clientId)
      entityTypeLabels.push("Client")
    }
    if (agencyId) {
      entityIds.push(agencyId)
      entityTypeLabels.push("Agency")
    }
    if (labParticipant?.entityId) {
      entityIds.push(labParticipant.entityId)
      entityTypeLabels.push("Photo Lab")
    }
    if (handprintLabParticipant?.entityId) {
      entityIds.push(handprintLabParticipant.entityId)
      entityTypeLabels.push("Hand Print Lab")
    }
    if (editionStudioParticipant?.entityId) {
      entityIds.push(editionStudioParticipant.entityId)
      entityTypeLabels.push("Retouch studio")
    }

    async function load() {
      const ownerUserId = config.ownerUserId?.trim()
      // Resolve owner: from config (DB is_owner) or fallback to current user when they're in noba list (e.g. old data)
      const resolveOwnerUserId = (): string | undefined =>
        ownerUserId || (currentUserId && nobaUserIds.some((id) => String(id).trim() === currentUserId) ? currentUserId : undefined)

      const userToIndividual = (
        u: {
          id?: string
          firstName?: string
          lastName?: string
          email?: string
          phoneNumber?: string
          profilePictureUrl?: string
        },
        roleLabel?: string
      ): ParticipantsModalIndividual => {
        const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email || "—"
        const initials = name !== "—" ? name.slice(0, 2).toUpperCase().replace(/\s/g, "") : undefined
        return {
          name,
          email: u.email ?? undefined,
          phone: u.phoneNumber ?? undefined,
          imageUrl: u.profilePictureUrl,
          initials: initials || undefined,
          roleLabel,
        }
      }

      const nobaUsers = await Promise.all(
        nobaUserIds.map((uid) =>
          fetch(`/api/users/${uid}`).then((r) => (r.ok ? r.json() : null))
        )
      )
      if (cancelled) return
      const effectiveOwnerId = resolveOwnerUserId()
      const nobaTeam: ParticipantsModalIndividual[] = nobaUsers
        .map((data: { user?: { id?: string; firstName?: string; lastName?: string; email?: string; phoneNumber?: string; profilePictureUrl?: string } } | null) => {
          if (!data?.user) return null
          const uid = data.user.id != null ? String(data.user.id).trim() : ""
          const isOwner = !!effectiveOwnerId && uid === effectiveOwnerId
          const roleLabel = isOwner ? "producer" : "collaborator"
          return userToIndividual(data.user, roleLabel)
        })
        .filter(Boolean) as ParticipantsModalIndividual[]

      const [photoUsers, orgResponses] = await Promise.all([
        Promise.all(
          photographerUserIds.map((uid) =>
            fetch(`/api/users/${uid}`).then((r) => (r.ok ? r.json() : null))
          )
        ),
        Promise.all(
          entityIds.map((eid) =>
            fetch(`/api/organizations/${eid}`).then((r) => (r.ok ? r.json() : null))
          )
        ),
      ])
      if (cancelled) return

      const agencyIndex = agencyId ? entityIds.indexOf(agencyId) : -1
      const agencyResponse =
        agencyIndex >= 0 && agencyIndex < orgResponses.length
          ? (orgResponses[agencyIndex] as {
              teamMembers?: Array<{ id?: string }>
            } | null)
          : null
      const agencyTeamMemberIds = new Set(
        (agencyResponse?.teamMembers ?? []).map((m) => m.id).filter(Boolean) as string[]
      )

      const mainIndividuals: ParticipantsModalIndividual[] = photoUsers
        .filter(
          (data: { user?: { id?: string } } | null) =>
            data?.user?.id && !agencyTeamMemberIds.has(data.user.id)
        )
        .map(
          (data: {
            user?: {
              id?: string
              firstName?: string
              lastName?: string
              email?: string
              phoneNumber?: string
              profilePictureUrl?: string
            }
          } | null) =>
            data?.user ? userToIndividual(data.user, "photographer") : null
        )
        .filter(Boolean) as ParticipantsModalIndividual[]

      const entities: ParticipantsModalEntity[] = orgResponses
        .map((data: {
          entity?: { name?: string; profilePictureUrl?: string | null }
          adminUser?: { firstName?: string; lastName?: string }
          teamMembers?: unknown[]
        } | null, index: number) => {
          if (!data?.entity?.name) return null
          const managerName = data.adminUser
            ? [data.adminUser.firstName, data.adminUser.lastName].filter(Boolean).join(" ").trim() || undefined
            : undefined
          const imageUrl =
            data.entity?.profilePictureUrl && data.entity.profilePictureUrl.trim() !== ""
              ? data.entity.profilePictureUrl
              : undefined
          const entityTypeLabel = entityTypeLabels[index] ?? "Entity"
          return {
            entityName: data.entity.name,
            managerName: managerName ?? undefined,
            teamMembersCount: Array.isArray(data.teamMembers) ? data.teamMembers.length : undefined,
            imageUrl,
            entityTypeLabel,
          }
        })
        .filter(Boolean) as ParticipantsModalEntity[]

      if (!cancelled) {
        setParticipantsNobaTeam(nobaTeam)
        setParticipantsMainPlayersIndividuals(mainIndividuals)
        setParticipantsMainPlayersEntities(entities)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [collection, user?.id])

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

  const stageStatus = deriveStageStatusFromShootingStart(
    {
      shootingStartDate: collection.config.shootingStartDate ?? collection.config.shootingDate,
      shootingStartTime: collection.config.shootingStartTime,
    },
    collection.status === "in_progress" ? "in-progress" : "upcoming"
  )
  const shootingType = collection.config.hasHandprint ? "handprint" : "digital"

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
      onUploadClientSelection={handleUploadClientSelection}
      onRequestMorePhotosFromPhotographer={handleRequestMorePhotosFromPhotographer}
      clientSelectionUrl={collection.clientSelectionUrl ?? undefined}
      clientSelectionUploadedAt={collection.clientSelectionUploadedAt ?? undefined}
      stepNotesClientSelection={collection.stepNotesClientSelection}
      onValidateClientSelection={handleValidateClientSelection}
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
      finalsUploadedAt={collection.finalsSelectionUploadedAt ?? undefined}
      finalsUploadedByName={undefined}
      stepNotesFinalEdits={collection.stepNotesFinalEdits}
      finalsUploadedByEntityName={undefined}
      onRequestChanges={handleRequestChanges}
      onValidateFinals={handleValidateFinals}
      stepNotesPhotographerLastCheck={collection.stepNotesPhotographerLastCheck}
      stepNotesClientConfirmation={collection.stepNotesClientConfirmation}
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
