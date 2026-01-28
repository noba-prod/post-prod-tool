"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { CreationTemplate } from "@/components/custom/templates/creation-template"
import { ParticipantsStepContent } from "@/components/custom/participants-step-content"
import { ShootingSetupStepContent } from "@/components/custom/shooting-setup-step-content"
import { DropoffPlanStepContent } from "@/components/custom/dropoff-plan-step-content"
import { createCollectionsService } from "@/lib/services"
import { getRepositoryInstances } from "@/lib/services"
import {
  computeCreationTemplate,
  isDraftComplete,
  isCreationStepComplete,
} from "@/lib/domain/collections"
import type {
  CreationBlockId,
  CollectionParticipant,
  CollectionConfig,
} from "@/lib/domain/collections"

/** UI labels for Creation Template sidebar — map stepId to PHOTO labels (collections-logic §4) */
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

const ROLE_DISPLAY: Record<string, string> = {
  client: "Client",
  photographer: "Photographer",
  agency: "Agency",
  lab: "Lab",
  handprint_lab: "Hand print lab",
  edition_studio: "Edition studio",
}

const PLACEHOLDER = (
  <div className="p-4 rounded-lg bg-zinc-50 text-sm text-muted-foreground">
    Step content will be implemented in next milestones.
  </div>
)

export default function CollectionCreatePage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === "string" ? params.id : ""
  const [draft, setDraft] = React.useState<Awaited<
    ReturnType<ReturnType<typeof createCollectionsService>["getDraftById"]>
  > | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [activeStep, setActiveStep] = React.useState<CreationBlockId | "">("")
  const [participantSummaries, setParticipantSummaries] = React.useState<
    { role: string; name: string }[]
  >([])

  const service = React.useMemo(() => createCollectionsService(), [])

  React.useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    let cancelled = false
    service.getDraftById(id).then((d) => {
      if (!cancelled) {
        setDraft(d)
        if (d && !activeStep) setActiveStep("participants")
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [id, service])

  React.useEffect(() => {
    if (!draft || !id) return
    const hasClient = draft.participants.some((p) => p.role === "client")
    const hasProducer = draft.participants.some((p) => p.role === "producer")
    if (hasClient && hasProducer) return

    if (!hasProducer && draft.config.managerUserId) {
      getRepositoryInstances()
        .userRepository?.getUserById(draft.config.managerUserId)
        .then((user) => {
          if (!user?.entityId) return
          const next: CollectionParticipant[] = [...draft.participants]
          if (!next.some((p) => p.role === "client") && draft.config.clientEntityId) {
            next.push({ role: "client", entityId: draft.config.clientEntityId })
          }
          next.push({
            role: "producer",
            entityId: user.entityId,
            userIds: [draft.config.managerUserId],
            editPermissionByUserId: { [draft.config.managerUserId]: true },
          })
          service.updateDraft(id, { participants: next }).then((updated) => {
            if (updated) setDraft(updated)
          })
        })
      return
    }
    if (!hasClient && draft.config.clientEntityId) {
      const next: CollectionParticipant[] = [
        ...draft.participants,
        { role: "client", entityId: draft.config.clientEntityId },
      ]
      service.updateDraft(id, { participants: next }).then((updated) => {
        if (updated) setDraft(updated)
      })
    }
  }, [draft?.id, id, draft?.participants, draft?.config?.clientEntityId, draft?.config?.managerUserId, service])

  React.useEffect(() => {
    if (!draft) {
      setParticipantSummaries([])
      return
    }
    const repos = getRepositoryInstances()
    const relevant = draft.participants.filter((p) => p.role !== "producer")
    if (relevant.length === 0) {
      setParticipantSummaries([])
      return
    }
    const entityIds = relevant.map((p) =>
      p.role === "client" ? p.entityId ?? draft.config.clientEntityId : p.entityId
    ).filter(Boolean) as string[]
    let cancelled = false
    Promise.all(
      entityIds.map((eid) => repos.entityRepository?.getEntityById(eid) ?? Promise.resolve(null))
    ).then((entities) => {
      if (cancelled) return
      const list = relevant.map((p, i) => ({
        role: ROLE_DISPLAY[p.role] ?? p.role,
        name: `@${entities[i]?.name ?? "—"}`,
      }))
      setParticipantSummaries(list)
    })
    return () => {
      cancelled = true
    }
  }, [draft?.participants, draft?.config?.clientEntityId])

  const steps = React.useMemo(() => {
    if (!draft?.config) return []
    return computeCreationTemplate(draft.config)
  }, [draft?.config])

  const sidebarItems = React.useMemo(
    () => steps.map((s) => ({ id: s.stepId, label: stepLabel(s.stepId) })),
    [steps]
  )

  const setActiveStepHandler = React.useCallback((stepId: CreationBlockId) => {
    setActiveStep(stepId)
  }, [])

  const handleParticipantsChange = React.useCallback(
    (participants: CollectionParticipant[]) => {
      if (!draft || !id) return
      service.updateDraft(id, { participants }).then((updated) => {
        if (updated) setDraft(updated)
      })
    },
    [draft, id, service]
  )

  const handleShootingSetupChange = React.useCallback(
    (patch: Partial<Pick<CollectionConfig,
      | "shootingStartDate"
      | "shootingStartTime"
      | "shootingEndDate"
      | "shootingEndTime"
      | "shootingStreetAddress"
      | "shootingZipCode"
      | "shootingCity"
      | "shootingCountry"
    >>) => {
      if (!draft || !id) return
      service.updateDraft(id, { config: patch }).then((updated) => {
        if (updated) setDraft(updated)
      })
    },
    [draft, id, service]
  )

  const handleDropoffPlanChange = React.useCallback(
    (patch: Partial<Pick<CollectionConfig,
      | "dropoff_shipping_date"
      | "dropoff_shipping_time"
      | "dropoff_shipping_destination_address"
      | "dropoff_delivery_date"
      | "dropoff_delivery_time"
      | "dropoff_managing_shipping"
      | "dropoff_shipping_carrier"
      | "dropoff_shipping_tracking"
    >>) => {
      if (!draft || !id) return
      service.updateDraft(id, { config: patch }).then((updated) => {
        if (updated) setDraft(updated)
      })
    },
    [draft, id, service]
  )

  /** Mark current step as completed and move to next. Steps are only completed on "Next", not auto. */
  const handleNextClick = React.useCallback(
    (currentStepId: CreationBlockId, nextStepId: CreationBlockId) => {
      if (!draft || !id) return
      const nextCompleted = [
        ...new Set([...draft.creationData.completedBlockIds, currentStepId]),
      ] as CreationBlockId[]
      service
        .updateDraft(id, { creationData: { completedBlockIds: nextCompleted } })
        .then((updated) => {
          if (updated) setDraft(updated)
          setActiveStepHandler(nextStepId)
        })
    },
    [draft, id, service, setActiveStepHandler]
  )

  const blocks = React.useMemo(() => {
    if (!draft || steps.length === 0) return []
    const completedBlockIds = draft.creationData.completedBlockIds
    const currentActive = activeStep || steps[0]?.stepId

    return steps.map((step, index) => {
      const stepId = step.stepId
      const isFirst = index === 0
      const isLast = index === steps.length - 1
      const isActive = stepId === currentActive
      const isCompleted = isCreationStepComplete(step, completedBlockIds)
      const variant: "active" | "completed" | "disabled" = isActive
        ? "active"
        : isCompleted
          ? "completed"
          : "disabled"
      const nextStepId = steps[index + 1]?.stepId
      const prevStepId = steps[index - 1]?.stepId
      const isParticipants = stepId === "participants"
      const isShootingSetup = stepId === "shooting_setup"
      const isDropoffPlan = stepId === "dropoff_plan"

      const subtitle = isParticipants
        ? "Add all team members that will participate in this collection and setup their permissions"
        : isShootingSetup
          ? "Fill in the necessary details to complete the shooting"
          : isDropoffPlan
            ? "Set up the drop-off of the negatives at the lab for digitization and obtain the low-resolution versions of the photos."
            : "Step content will be implemented in next milestones."

      const showParticipantsForBlock = isParticipants || isShootingSetup || isDropoffPlan

      return {
        id: stepId,
        title: stepLabel(stepId),
        subtitle,
        variant,
        showParticipants: showParticipantsForBlock,
        participants: showParticipantsForBlock ? participantSummaries : undefined,
        onEditParticipants: showParticipantsForBlock
          ? () => setActiveStepHandler("participants")
          : undefined,
        content:
          stepId === "participants" ? (
            <ParticipantsStepContent
              draft={draft}
              onParticipantsChange={handleParticipantsChange}
            />
          ) : isShootingSetup ? (
            <ShootingSetupStepContent
              draft={draft}
              onShootingSetupChange={handleShootingSetupChange}
            />
          ) : isDropoffPlan ? (
            <DropoffPlanStepContent
              draft={draft}
              onDropoffPlanChange={handleDropoffPlanChange}
              managingShippingOptions={[
                ...participantSummaries
                  .filter((p) => p.role === "Client")
                  .map((p) => ({ value: p.name, label: p.name })),
                { value: "noba", label: "noba*" },
              ]}
            />
          ) : (
            PLACEHOLDER
          ),
        primaryLabel: isLast ? "Publish collection" : "Next",
        onPrimaryClick: isLast
          ? () => {
              /* TODO: implement publish */
            }
          : nextStepId
            ? () => handleNextClick(stepId, nextStepId)
            : undefined,
        primaryDisabled: isLast ? !isDraftComplete(draft) : false,
        secondaryLabel: isFirst ? undefined : "Previous",
        onSecondaryClick: isFirst
          ? undefined
          : prevStepId
            ? () => setActiveStepHandler(prevStepId)
            : undefined,
        onEdit: () => setActiveStepHandler(stepId),
      }
    })
  }, [draft, steps, activeStep, setActiveStepHandler, handleParticipantsChange, handleNextClick, handleShootingSetupChange, handleDropoffPlanChange, participantSummaries])

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!draft) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-lg font-medium text-foreground">Draft not found</p>
          <p className="text-sm text-muted-foreground">
            This collection draft may have been removed or the link is invalid.
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

  return (
    <CreationTemplate
      title={draft.config.name || "Create collection"}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Collections", href: "/collections" },
        { label: draft.config.name || "Create collection" },
      ]}
      sidebarVariant="create-collection"
      collectionSummary={{
        name: draft.config.name || "Create collection",
        status: "draft",
        lastUpdate: draft.updatedAt,
      }}
      sidebarItems={sidebarItems}
      activeSidebarItem={activeStep || sidebarItems[0]?.id}
      completedStepIds={steps
        .filter((s) => isCreationStepComplete(s, draft.creationData.completedBlockIds))
        .map((s) => s.stepId)}
      onSidebarItemClick={(stepId) => setActiveStep(stepId as CreationBlockId)}
      blocks={blocks}
    />
  );
}