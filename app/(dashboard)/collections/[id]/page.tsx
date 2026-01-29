"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CollectionTemplate } from "@/components/custom/templates/collection-template"
import type { CollectionTemplateStep } from "@/components/custom/templates/collection-template"
import { createCollectionsService } from "@/lib/services"
import { getRepositoryInstances } from "@/lib/services"
import {
  getViewStepDefinitions,
  configToViewStepsInput,
  viewStepsWithStatusFromCollection,
} from "@/lib/domain/collections"

/**
 * Maps view-mode steps (with status and deadlines from collection) to CollectionTemplateStep.
 * Reuses the same structure as the demo; steps are derived from collection config
 * (digital only / digital + edition / hand print only / handprint + different lab / etc.).
 */
function viewStepsToTemplateSteps(
  withStatus: ReturnType<typeof viewStepsWithStatusFromCollection>
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
  }))
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
    ReturnType<ReturnType<typeof createCollectionsService>["getCollectionById"]>
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

  // Published collections: view steps from config (same scenarios as demo), deadlines from collection, one step active
  const viewStepsConfig = configToViewStepsInput(collection.config)
  const definitions = getViewStepDefinitions(viewStepsConfig)
  const stepsWithStatus = viewStepsWithStatusFromCollection(definitions, collection.config)
  const steps = viewStepsToTemplateSteps(stepsWithStatus)

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
      onParticipants={() => {
        // TODO: open participants modal or navigate
      }}
      onSettings={() => {
        // TODO: open settings
      }}
      steps={steps}
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
