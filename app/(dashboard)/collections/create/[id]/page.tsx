"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CreationTemplate } from "@/components/custom/templates/creation-template"
import { ParticipantsStepContent } from "@/components/custom/participants-step-content"
import { ShootingSetupStepContent } from "@/components/custom/shooting-setup-step-content"
import { DropoffPlanStepContent } from "@/components/custom/dropoff-plan-step-content"
import { LowResConfigStepContent } from "@/components/custom/low-res-config-step-content"
import { PhotoSelectionStepContent } from "@/components/custom/photo-selection-step-content"
import { LrToHrSetupStepContent } from "@/components/custom/lr-to-hr-setup-step-content"
import { EditionConfigStepContent } from "@/components/custom/edition-config-step-content"
import { CheckFinalsStepContent } from "@/components/custom/check-finals-step-content"
import { PublishCollectionDialog } from "@/components/custom/publish-collection-dialog"
import { createCollectionsService } from "@/lib/services"
import { getRepositoryInstances } from "@/lib/services"
import {
  computeCreationTemplate,
  isDraftComplete,
  isCreationStepComplete,
  getChronologyConstraints,
  derivePublishedStatus,
} from "@/lib/domain/collections"
import type {
  CreationBlockId,
  CollectionParticipant,
  CollectionConfig,
  ChronologyConstraint,
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

export default function CollectionCreatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = React.use(params)
  // Unwrap for Next.js async request API (avoid sync dynamic API warnings)
  React.use(searchParams)
  const router = useRouter()
  const [draft, setDraft] = React.useState<Awaited<
    ReturnType<ReturnType<typeof createCollectionsService>["getDraftById"]>
  > | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [activeStep, setActiveStep] = React.useState<CreationBlockId | "">("")
  const [publishDialogOpen, setPublishDialogOpen] = React.useState(false)
  const [isPublishing, setIsPublishing] = React.useState(false)
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
        if (d) {
          const steps = computeCreationTemplate(d.config)
          const nextIncomplete = steps.find((step) =>
            !isCreationStepComplete(step, d.creationData.completedBlockIds)
          )
          setActiveStep(nextIncomplete?.stepId ?? steps[0]?.stepId ?? "participants")
        }
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

  const chronology = React.useMemo(() => {
    if (!draft) return { byBlockId: {} as Record<string, ChronologyConstraint>, suggestedCorrection: undefined as Partial<CollectionConfig> | undefined }
    return getChronologyConstraints(draft)
  }, [draft])

  React.useEffect(() => {
    if (!draft || !id) return
    const { suggestedCorrection } = getChronologyConstraints(draft)
    if (!suggestedCorrection || Object.keys(suggestedCorrection).length === 0) return
    service.updateDraft(id, { config: suggestedCorrection }).then((updated) => {
      if (updated) setDraft(updated)
    })
  }, [draft, id, service])

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

  const handleLowResConfigChange = React.useCallback(
    (patch: Partial<Pick<CollectionConfig,
      | "lowResScanDeadlineDate"
      | "lowResScanDeadlineTime"
      | "lowResShippingPickupDate"
      | "lowResShippingPickupTime"
      | "lowResShippingDeliveryDate"
      | "lowResShippingDeliveryTime"
      | "lowResShippingManaging"
      | "lowResShippingProvider"
      | "lowResShippingTracking"
    >>) => {
      if (!draft || !id) return
      service.updateDraft(id, { config: patch }).then((updated) => {
        if (updated) setDraft(updated)
      })
    },
    [draft, id, service]
  )

  const handlePhotoSelectionChange = React.useCallback(
    (patch: Partial<Pick<CollectionConfig,
      | "photoSelectionPhotographerDueDate"
      | "photoSelectionPhotographerDueTime"
      | "photoSelectionClientDueDate"
      | "photoSelectionClientDueTime"
    >>) => {
      if (!draft || !id) return
      service.updateDraft(id, { config: patch }).then((updated) => {
        if (updated) setDraft(updated)
      })
    },
    [draft, id, service]
  )

  const handleLrToHrSetupChange = React.useCallback(
    (patch: Partial<Pick<CollectionConfig, "lrToHrDueDate" | "lrToHrDueTime">>) => {
      if (!draft || !id) return
      service.updateDraft(id, { config: patch }).then((updated) => {
        if (updated) setDraft(updated)
      })
    },
    [draft, id, service]
  )

  const handleEditionConfigChange = React.useCallback(
    (patch: Partial<Pick<CollectionConfig,
      | "editionPhotographerDueDate"
      | "editionPhotographerDueTime"
      | "editionStudioDueDate"
      | "editionStudioDueTime"
    >>) => {
      if (!draft || !id) return
      service.updateDraft(id, { config: patch }).then((updated) => {
        if (updated) setDraft(updated)
      })
    },
    [draft, id, service]
  )

  const handleCheckFinalsChange = React.useCallback(
    (patch: Partial<Pick<CollectionConfig,
      | "checkFinalsPhotographerDueDate"
      | "checkFinalsPhotographerDueTime"
      | "clientFinalsDeadline"
      | "clientFinalsDeadlineTime"
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

  /** Publish collection (sidebar and block primary CTA). Disabled until isDraftComplete(draft). */
  const handlePublish = React.useCallback(() => {
    if (!draft || !isDraftComplete(draft)) return
    setPublishDialogOpen(true)
  }, [draft])

  const handleConfirmPublish = React.useCallback(async () => {
    if (!draft || !id || !isDraftComplete(draft) || isPublishing) return

    setIsPublishing(true)
    try {
      await service.publishCollection(id)
      
      // Get client name for toast
      const clientEntityId = draft.config.clientEntityId
      let clientName = "Client"
      if (clientEntityId) {
        const entityRepo = getRepositoryInstances().entityRepository
        const clientEntity = await entityRepo?.getEntityById(clientEntityId)
        if (clientEntity?.name) {
          clientName = clientEntity.name
        }
      }

      const collectionName = draft.config.name || "Collection"
      toast.success(`${collectionName} by @${clientName.toLowerCase()} has been published`)
      
      setPublishDialogOpen(false)
      router.push("/collections")
    } catch (error) {
      setIsPublishing(false)
      if (error instanceof Error && "code" in error) {
        const serviceError = error as { code: string; message: string }
        if (serviceError.code === "DRAFT_INCOMPLETE") {
          toast.error("Finish required setup before publishing.")
          // Keep dialog open
        } else if (serviceError.code === "NOT_FOUND") {
          toast.error("Draft not found.")
          router.push("/collections")
        } else {
          toast.error(serviceError.message || "Failed to publish collection")
        }
      } else {
        toast.error("Failed to publish collection")
      }
    }
  }, [draft, id, service, router, isPublishing])

  /** Delete collection draft (sidebar). */
  const handleDeleteCollection = React.useCallback(() => {
    if (!draft || !id) return
    // TODO: implement delete draft then router.push("/collections")
  }, [draft, id])

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
      const isLowResConfig = stepId === "low_res_config"
      const isPhotoSelection = stepId === "photo_selection"
      const isLrToHrStep = stepId === "lr_to_hr_setup" || stepId === "handprint_high_res_config"
      const isEditionConfig = stepId === "edition_config"
      const isCheckFinals = stepId === "check_finals"

      const subtitle = isParticipants
        ? "Add all team members that will participate in this collection and setup their permissions"
        : isShootingSetup
          ? "Fill in the necessary details to complete the shooting"
          : isDropoffPlan
            ? "Set up the drop-off of the negatives at the lab for digitization and obtain the low-resolution versions of the photos."
            : isLowResConfig
              ? "Set a deadline for the lab to scan the negatives into digital format and share the link with the photographer."
              : isPhotoSelection
                ? "Specify the due dates for both the photographer and the client to make the pre-selection and selection of finals"
                : isLrToHrStep
                  ? "Detail the deadline for the lab to send the high resolution selection to photographer"
                  : isEditionConfig
                    ? "Set due dates for the photographer to submit retouch instructions and for the edition studio to deliver final edits."
                    : isCheckFinals
                      ? "Review the collection setup and publish when ready. Participants will be invited."
                      : "Step content will be implemented in next milestones."

      const showParticipantsForBlock =
        isShootingSetup || isDropoffPlan || isLowResConfig || isPhotoSelection || isLrToHrStep || isEditionConfig || isCheckFinals

      // Per Figma: step-specific participant lists
      const participantsForBlock = !showParticipantsForBlock
        ? undefined
        : isShootingSetup
          ? participantSummaries.filter((p) =>
              ["Client", "Photographer"].includes(p.role)
            )
          : isDropoffPlan
            ? participantSummaries.filter((p) => {
                const roles = ["Client", "Photographer", "Lab"]
                if (draft.config.handprintIsDifferentLab) roles.push("Hand print lab")
                return roles.includes(p.role)
              })
            : isLowResConfig
              ? participantSummaries.filter((p) =>
                  ["Client", "Photographer", "Lab"].includes(p.role)
                )
              : isPhotoSelection
                ? participantSummaries.filter((p) =>
                    ["Client", "Photographer"].includes(p.role)
                  )
                : isLrToHrStep
                  ? participantSummaries.filter((p) =>
                      ["Client", "Lab", "Hand print lab"].includes(p.role)
                    )
                  : isEditionConfig
                    ? participantSummaries.filter((p) =>
                        ["Client", "Photographer", "Edition studio"].includes(p.role)
                      )
                    : isCheckFinals
                      ? participantSummaries.filter((p) =>
                          ["Client", "Photographer"].includes(p.role)
                        )
                      : participantSummaries

      return {
        id: stepId,
        title: stepLabel(stepId),
        subtitle,
        variant,
        showParticipants: showParticipantsForBlock,
        participants: participantsForBlock,
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
              chronologyConstraints={chronology.byBlockId}
            />
          ) : isDropoffPlan ? (
            <DropoffPlanStepContent
              draft={draft}
              onDropoffPlanChange={handleDropoffPlanChange}
              chronologyConstraints={chronology.byBlockId}
              managingShippingOptions={[
                ...participantSummaries
                  .filter((p) => p.role === "Client")
                  .map((p) => ({ value: p.name, label: p.name })),
                { value: "noba", label: "noba*" },
              ]}
            />
          ) : isLowResConfig ? (
            <LowResConfigStepContent
              draft={draft}
              onLowResConfigChange={handleLowResConfigChange}
              chronologyConstraints={chronology.byBlockId}
              managingShippingOptions={[
                ...participantSummaries
                  .filter((p) => p.role === "Client")
                  .map((p) => ({ value: p.name, label: p.name })),
                ...participantSummaries
                  .filter((p) => p.role === "Lab")
                  .map((p) => ({ value: p.name, label: p.name })),
                { value: "noba", label: "noba*" },
              ]}
            />
          ) : isPhotoSelection ? (
            <PhotoSelectionStepContent
              draft={draft}
              onPhotoSelectionChange={handlePhotoSelectionChange}
              chronologyConstraints={chronology.byBlockId}
            />
          ) : isLrToHrStep ? (
            <LrToHrSetupStepContent
              draft={draft}
              onLrToHrSetupChange={handleLrToHrSetupChange}
              chronologyConstraints={chronology.byBlockId}
            />
          ) : isEditionConfig ? (
            <EditionConfigStepContent
              draft={draft}
              onEditionConfigChange={handleEditionConfigChange}
              chronologyConstraints={chronology.byBlockId}
            />
          ) : isCheckFinals ? (
            <CheckFinalsStepContent
              draft={draft}
              onCheckFinalsChange={handleCheckFinalsChange}
              chronologyConstraints={chronology.byBlockId}
            />
          ) : (
            PLACEHOLDER
          ),
        primaryLabel: isLast ? "Publish collection" : "Next",
        onPrimaryClick: isLast
          ? handlePublish
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
  }, [draft, steps, activeStep, chronology.byBlockId, setActiveStepHandler, handleParticipantsChange, handleNextClick, handlePublish, handleShootingSetupChange, handleDropoffPlanChange, handleLowResConfigChange, handlePhotoSelectionChange, handleLrToHrSetupChange, handleEditionConfigChange, handleCheckFinalsChange, participantSummaries])

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

  // Derive published status for right card preview
  const derivedStatus = React.useMemo(() => {
    return derivePublishedStatus(draft.config)
  }, [draft.config])

  const publishCardBase = {
    collectionName: draft.config.name || "Create collection",
    location: (() => {
      const city = draft.config.shootingCity?.trim()
      const country = draft.config.shootingCountry?.trim()
      return city || country ? `${city || "—"}, ${country || "—"}` : "—"
    })(),
    startDate: draft.config.shootingStartDate
      ? new Date(draft.config.shootingStartDate + "T12:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "TBD",
    endDate: draft.config.clientFinalsDeadline
      ? new Date(draft.config.clientFinalsDeadline + "T12:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "TBD",
  }
  const publishCardLeft = { ...publishCardBase, status: "draft" as const }
  // Map domain status (in_progress) to UI status (in-progress)
  const publishCardRightStatus = derivedStatus === "in_progress" ? "in-progress" : derivedStatus
  const publishCardRight = { ...publishCardBase, status: publishCardRightStatus as "upcoming" | "in-progress" }

  const publishParticipants = participantSummaries.map((p) => {
    const draftParticipant = draft.participants.find((d) => (ROLE_DISPLAY[d.role] ?? d.role) === p.role)
    const count = draftParticipant?.userIds?.length ?? 1
    return { role: p.role, name: p.name, count }
  })

  return (
    <>
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
          client: participantSummaries.find((p) => p.role === "Client")?.name ?? "—",
          deadline: draft.config.clientFinalsDeadline
            ? new Date(draft.config.clientFinalsDeadline + "T12:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "TBD",
          lastUpdate: draft.updatedAt,
        }}
        sidebarItems={sidebarItems}
        activeSidebarItem={activeStep || sidebarItems[0]?.id}
        completedStepIds={steps
          .filter((s) => isCreationStepComplete(s, draft.creationData.completedBlockIds))
          .map((s) => s.stepId)}
        onSidebarItemClick={(stepId) => setActiveStep(stepId as CreationBlockId)}
        onDeleteCollection={handleDeleteCollection}
        onPublishCollection={handlePublish}
        publishCollectionDisabled={!isDraftComplete(draft)}
        blocks={blocks}
      />
      <PublishCollectionDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        cardLeft={publishCardLeft}
        cardRight={publishCardRight}
        participants={publishParticipants}
        onEditParticipants={() => {
          setPublishDialogOpen(false)
          setActiveStep("participants")
        }}
        publishDisabled={!isDraftComplete(draft) || isPublishing}
        onPublish={handleConfirmPublish}
      />
    </>
  )
}