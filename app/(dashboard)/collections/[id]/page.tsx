"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CollectionTemplate } from "@/components/custom/templates/collection-template"
import type { CollectionTemplateStep } from "@/components/custom/templates/collection-template"
import { createCollectionsService } from "@/lib/services"
import { getRepositoryInstances } from "@/lib/services"
import { computeCreationTemplate } from "@/lib/domain/collections"
import type { CreationBlockId } from "@/lib/domain/collections"

/** UI labels for view steps — map stepId to PHOTO labels (collections-logic §4) */
const STEP_LABELS: Record<CreationBlockId, string> = {
  participants: "Participants",
  shooting_setup: "Shooting setup",
  dropoff_plan: "Drop-off plan",
  low_res_config: "Low-res scan",
  photographer_selection_config: "Photographer selection",
  client_selection_config: "Client selection",
  photo_selection: "Photo selection",
  lr_to_hr_setup: "LR to HR setup",
  handprint_high_res_config: "LR to HR setup",
  edition_config: "Pre-check & Edition",
  check_finals: "Check Finals",
}

function stepLabel(stepId: CreationBlockId): string {
  return STEP_LABELS[stepId] ?? stepId
}

/**
 * Maps creation template steps to CollectionTemplate view steps.
 * For published collections, all steps are shown; status is derived from position.
 */
function creationStepsToViewSteps(
  creationSteps: { stepId: CreationBlockId }[],
  collectionStatus: "upcoming" | "in_progress"
): CollectionTemplateStep[] {
  return creationSteps.map((step, index) => {
    const id = step.stepId
    const title = stepLabel(step.stepId)
    // Simple heuristic: first steps completed, current in-progress, rest locked
    const isCompleted = collectionStatus === "in_progress" && index < creationSteps.length - 1
    const isActive = index === creationSteps.length - 1 || (collectionStatus === "upcoming" && index === 0)
    const status: CollectionTemplateStep["status"] = isCompleted ? "completed" : isActive ? "active" : "locked"
    const stageStatus = isCompleted ? "done" : isActive ? "in-progress" : "upcoming"
    return {
      id,
      title,
      status,
      stageStatus,
      timeStampStatus: "on-track",
      deadlineLabel: "Deadline:",
      deadlineDate: "—",
      deadlineTime: "—",
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
  const [loading, setLoading] = React.useState(true)
  const [collection, setCollection] = React.useState<Awaited<
    ReturnType<ReturnType<typeof createCollectionsService>["getDraftById"]>
  > | null>(null)
  const [clientName, setClientName] = React.useState<string>("—")
  const [photographerName, setPhotographerName] = React.useState<string | undefined>(undefined)

  const service = React.useMemo(() => createCollectionsService(), [])

  React.useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    let cancelled = false
    service.getDraftById(id).then((draft) => {
      if (cancelled) return
      if (!draft) {
        setCollection(null)
        setLoading(false)
        return
      }
      // If draft, redirect to setup flow
      if (draft.status === "draft") {
        router.replace(`/collections/create/${id}`)
        return
      }
      setCollection(draft)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [id, service, router])

  // Resolve client and photographer names
  React.useEffect(() => {
    if (!collection) return
    const repos = getRepositoryInstances()
    const clientId = collection.config.clientEntityId
    if (clientId) {
      repos.entityRepository?.getEntityById(clientId).then((entity) => {
        setClientName(entity?.name ? `@${entity.name.toLowerCase()}` : "—")
      })
    }
    const photographer = collection.participants.find((p) => p.role === "photographer")
    if (photographer?.userIds?.[0]) {
      repos.userRepository?.getUserById(photographer.userIds[0]).then((user) => {
        if (user) {
          const name = [user.firstName, user.lastName].filter(Boolean).join(" ")
          setPhotographerName(name || user.email)
        }
      })
    }
  }, [collection])

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

  // Only published collections reach here (draft redirects to create flow)
  const creationSteps = computeCreationTemplate(collection.config)
  const viewSteps = creationStepsToViewSteps(
    creationSteps,
    collection.status === "in_progress" ? "in_progress" : "upcoming"
  )

  const stageStatus =
    collection.status === "in_progress" ? "in-progress" : "upcoming"
  const progress = collection.status === "in_progress" ? 42 : 0

  return (
    <CollectionTemplate
      collectionName={collection.config.name || "Collection"}
      clientName={clientName}
      progress={progress}
      stageStatus={stageStatus}
      photographerName={photographerName}
      showPhotographerName={!!photographerName}
      showParticipantsButton={true}
      showSettingsButton={true}
      onParticipants={() => {
        // TODO: open participants modal or navigate
      }}
      onSettings={() => {
        // TODO: open settings
      }}
      steps={viewSteps}
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
