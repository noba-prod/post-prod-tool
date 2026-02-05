"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
} from "@/lib/domain/collections"
import type { StepId, UserForPermission, CollectionDraft } from "@/lib/domain/collections"
import type {
  ParticipantsModalIndividual,
  ParticipantsModalEntity,
} from "@/components/custom/participants-modal"

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

  const service = React.useMemo(() => createCollectionsService(), [])

  const userForPermission = React.useMemo(() => {
    if (!collection || !user?.id) return null
    return resolveUserForPermission(user.id, isNobaUser, collection)
  }, [collection, user?.id, isNobaUser])

  React.useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    let cancelled = false
    service.getCollectionById(id).then((c) => {
      if (cancelled) return
      if (!c) {
        setCollection(null)
        setLoading(false)
        return
      }
      // If draft, redirect to setup flow
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

  // Published collections: view steps from config (same scenarios as demo), deadlines from collection, one step active
  const viewStepsConfig = configToViewStepsInput(collection.config)
  const definitions = getViewStepDefinitions(viewStepsConfig)
  const stepsWithStatus = viewStepsWithStatusFromCollection(definitions, collection.config)
  const steps = viewStepsToTemplateSteps(stepsWithStatus, collection, userForPermission)

  const stageStatus =
    collection.status === "in_progress" ? "in-progress" : "upcoming"
  const progress = collection.status === "in_progress" ? 42 : 0

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
