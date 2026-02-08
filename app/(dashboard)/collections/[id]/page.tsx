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
} from "@/lib/domain/collections"
import type { StepId, UserForPermission, CollectionDraft } from "@/lib/domain/collections"
import type {
  ParticipantsModalIndividual,
  ParticipantsModalEntity,
} from "@/components/custom/participants-modal"
import { toast } from "sonner"

/**
 * Maps view-mode steps (with status and deadlines from collection) to CollectionTemplateStep.
 * Adds canEdit per step from current user's permission (collections-logic §8, §9).
 */
function viewStepsToTemplateSteps(
  withStatus: ReturnType<typeof viewStepsWithStatusFromCollection>,
  collection: CollectionDraft | null,
  userForPermission: UserForPermission | null
): CollectionTemplateStep[] {
  return withStatus.map((step) => ({
    id: step.id,
    title: step.title,
    status: step.status,
    stageStatus:
      step.status === "completed"
        ? "done"
        : step.status === "active"
          ? "in-progress"
          : "upcoming",
    timeStampStatus: "on-track",
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
  }))
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

  /** Derive completed step ids from collection_events. When photographer_requested_additional_photos exists and re-upload not done (no lowResSelectionUrl02), step 4 is reverted to locked. */
  const fetchCompletedStepIds = React.useCallback(
    async (collectionId: string, lowResSelectionUrl02?: string | null) => {
      try {
        const res = await fetch(`/api/collections/${collectionId}/events`, { cache: "no-store" })
        if (!res.ok) return
        const data = (await res.json()) as { events?: Array<{ event_type?: string }> }
        const events = data.events ?? []
        const stepIds = new Set<string>()
        let hasRequestAdditionalPhotos = false
        for (const e of events) {
          if (e.event_type === "photographer_requested_additional_photos") hasRequestAdditionalPhotos = true
          const stepId = e.event_type && EVENT_TYPE_TO_STEP_ID[e.event_type]
          if (stepId) stepIds.add(stepId)
        }
        if (hasRequestAdditionalPhotos && !lowResSelectionUrl02?.trim()) {
          stepIds.delete("photographer_selection")
          stepIds.delete("low_res_scanning")
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
    fetchCompletedStepIds(id, collection.lowResSelectionUrl02)
  }, [id, collection?.id, collection?.status, collection?.lowResSelectionUrl02, fetchCompletedStepIds])

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

  const progress = React.useMemo(() => {
    if (visibleStepIds.length === 0) return 0
    const completedCount = completedStepIds.filter((id) => visibleStepIds.includes(id)).length
    return Math.round((completedCount / visibleStepIds.length) * 100)
  }, [completedStepIds, visibleStepIds])

  const handleConfirmPickup = React.useCallback(
    async (stepId: string) => {
      if (!id || stepId !== "shooting") return
      try {
        const res = await fetch(`/api/collections/${id}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventType: "negatives_pickup_marked" }),
        })
        if (!res.ok) throw new Error("Failed to trigger event")
        await fetchCompletedStepIds(id, collection?.lowResSelectionUrl02)
      } catch (err) {
        console.error("[CollectionViewPage] Confirm pickup error:", err)
      }
    },
    [id, collection?.lowResSelectionUrl02, fetchCompletedStepIds]
  )

  const handleConfirmDropoffDelivery = React.useCallback(
    async (stepId: string, canMeetDeadline: boolean) => {
      if (!id || stepId !== "negatives_dropoff") return
      try {
        const res = await fetch(`/api/collections/${id}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventType: "dropoff_confirmed",
            metadata: { canMeetDeadline },
          }),
        })
        if (!res.ok) throw new Error("Failed to trigger event")
        await fetchCompletedStepIds(id, collection?.lowResSelectionUrl02)
      } catch (err) {
        console.error("[CollectionViewPage] Confirm dropoff delivery error:", err)
      }
    },
    [id, collection?.lowResSelectionUrl02, fetchCompletedStepIds]
  )

  const handleUploadLowRes = React.useCallback(
    async (payload: { url: string; notes?: string }) => {
      if (!id) return
      const isReupload = !!collection?.photographerMissingphotos?.trim()
      try {
        const patchRes = await fetch(`/api/collections/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isReupload
              ? {
                  lowres_selection_url02: payload.url,
                  lowres_lab_notes02: payload.notes?.trim() || null,
                }
              : {
                  lowres_selection_url: payload.url,
                  lowres_lab_notes: payload.notes?.trim() || null,
                }
          ),
        })
        const patchData = (await patchRes.json().catch(() => ({}))) as { error?: string; collection?: Awaited<ReturnType<ReturnType<typeof createCollectionsService>["getCollectionById"]>> }
        if (!patchRes.ok) {
          const msg = patchData?.error ?? "Failed to save low-res URL"
          throw new Error(msg)
        }
        if (patchData.collection) setCollection(patchData.collection)
        if (!isReupload) {
          const res = await fetch(`/api/collections/${id}/events`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventType: "scanning_completed",
              metadata: { lowResUrl: payload.url, notes: payload.notes },
            }),
          })
          if (!res.ok) throw new Error("Failed to trigger event")
        }
        await fetchCompletedStepIds(id, isReupload ? payload.url : patchData.collection?.lowResSelectionUrl02 ?? collection?.lowResSelectionUrl02)
        if (!patchData.collection) await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Upload low-res error:", err)
        toast.error(err instanceof Error ? err.message : "Failed to save low-res")
        throw err
      }
    },
    [id, collection?.photographerMissingphotos, collection?.lowResSelectionUrl02, fetchCompletedStepIds, refetchCollection]
  )

  /** Step 3 (after first upload): additional footage — URL → lowres_selection_url02, notes overwrite lowres_lab_notes. */
  const handleUploadMoreLowRes = React.useCallback(
    async (payload: { url: string; notes?: string }) => {
      if (!id) return
      try {
        const patchRes = await fetch(`/api/collections/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lowres_selection_url02: payload.url,
            lowres_lab_notes: payload.notes?.trim() || null,
          }),
        })
        const patchData = (await patchRes.json().catch(() => ({}))) as { error?: string; collection?: Awaited<ReturnType<ReturnType<typeof createCollectionsService>["getCollectionById"]>> }
        if (!patchRes.ok) throw new Error(patchData?.error ?? "Failed to save additional photos")
        if (patchData.collection) setCollection(patchData.collection)
        else await refetchCollection()
      } catch (err) {
        console.error("[CollectionViewPage] Upload more low-res error:", err)
      }
    },
    [id, refetchCollection]
  )

  const handleUploadPhotographerSelection = React.useCallback(
    async (payload: { url: string; notes?: string }) => {
      if (!id) return
      try {
        const patchRes = await fetch(`/api/collections/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            photographer_selection_url: payload.url,
            photographer_notes01: payload.notes?.trim() || null,
          }),
        })
        const patchData = (await patchRes.json().catch(() => ({}))) as { error?: string; collection?: Awaited<ReturnType<ReturnType<typeof createCollectionsService>["getCollectionById"]>> }
        if (!patchRes.ok) throw new Error(patchData?.error ?? "Failed to save photographer selection")
        if (patchData.collection) setCollection(patchData.collection)
        const res = await fetch(`/api/collections/${id}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventType: "photographer_selection_uploaded",
            metadata: { url: payload.url, notes: payload.notes },
          }),
        })
        if (!res.ok) throw new Error("Failed to trigger event")
        await fetchCompletedStepIds(id, patchData.collection?.lowResSelectionUrl02 ?? collection?.lowResSelectionUrl02)
      } catch (err) {
        console.error("[CollectionViewPage] Upload photographer selection error:", err)
        toast.error("Failed to upload selection")
      }
    },
    [id, collection?.lowResSelectionUrl02, fetchCompletedStepIds]
  )

  const handleRequestAdditionalPhotos = React.useCallback(
    async (notes: string) => {
      if (!id) return
      try {
        const patchRes = await fetch(`/api/collections/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            photographer_missingphotos: notes.trim() || null,
          }),
        })
        if (!patchRes.ok) throw new Error("Failed to save request")
        const res = await fetch(`/api/collections/${id}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventType: "photographer_requested_additional_photos",
            metadata: { notes: notes.trim() },
          }),
        })
        if (!res.ok) throw new Error("Failed to trigger event")
        await refetchCollection()
        await fetchCompletedStepIds(id, undefined)
      } catch (err) {
        console.error("[CollectionViewPage] Request additional photos error:", err)
        toast.error("Failed to save request")
      }
    },
    [id, fetchCompletedStepIds, refetchCollection]
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
      uploadLowResInitialNotes={collection.lowResLabNotes ?? undefined}
      lowResSelectionUrl={collection.lowResSelectionUrl ?? undefined}
      lowResUploadedAt={collection.lowResSelectionUploadedAt ?? undefined}
      lowResSelectionUrl02={collection.lowResSelectionUrl02 ?? undefined}
      lowResUploadedAt02={collection.lowResSelectionUploadedAt02 ?? undefined}
      photographerSelectionUrl={collection.photographerSelectionUrl ?? undefined}
      photographerSelectionUploadedAt={collection.photographerSelectionUploadedAt ?? undefined}
      photographerNotes01={collection.photographerNotes01 ?? undefined}
      onUploadPhotographerSelection={handleUploadPhotographerSelection}
      photographerMissingphotos={collection.photographerMissingphotos ?? undefined}
      onRequestAdditionalPhotos={handleRequestAdditionalPhotos}
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
