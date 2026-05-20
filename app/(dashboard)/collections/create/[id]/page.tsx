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
import { NewCollectionModal } from "@/components/custom/new-collection-modal"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { createCollectionsService } from "@/lib/services"
import { deriveCompletedBlockIds } from "@/lib/utils/collection-mappers"
import {
  computeCreationTemplate,
  isDraftComplete,
  isCreationStepComplete,
  isCreationStepContentComplete,
  getChronologyConstraints,
  derivePublishedStatus,
  canUseNobaSensitiveCollectionSidebarActions,
} from "@/lib/domain/collections/workflow"
import { diffStructuralConfigs } from "@/lib/domain/collections/structural-workflow-change"
import type {
  CreationBlockId,
  CollectionParticipant,
  CollectionConfig,
  ChronologyConstraint,
  StructuralReconciliationResult,
} from "@/lib/domain/collections"
import { createClient } from "@/lib/supabase/client"
import type { Player } from "@/lib/supabase/database.types"
import { useUserContext } from "@/lib/contexts/user-context"

// ============================================================================
// SUPABASE HELPERS
// ============================================================================

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return Boolean(
    url && !url.includes("placeholder") && url.startsWith("https://") &&
    key && !key.includes("placeholder") && key.length > 20
  )
}

async function fetchPlayerById(id: string): Promise<{ name: string } | null> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("players") as any)
    .select("id, name")
    .eq("id", id)
    .single()
  if (error) {
    console.error("[CollectionCreatePage] Failed to fetch player:", error)
    return null
  }
  const player = data as Player | null
  return player ? { name: player.name } : null
}

async function fetchPlayersByIds(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {}
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("players") as any)
    .select("id, name")
    .in("id", ids)
  if (error) {
    console.error("[CollectionCreatePage] Failed to fetch players:", error)
    return {}
  }
  const players = (data ?? []) as Pick<Player, "id" | "name">[]
  const map: Record<string, string> = {}
  for (const player of players) {
    map[player.id] = player.name
  }
  return map
}

/** UI labels for Creation Template sidebar — map stepId to PHOTO labels (collections-logic §4) */
const STEP_LABELS: Record<CreationBlockId, string> = {
  participants: "Participants",
  shooting_setup: "Shooting setup",
  dropoff_plan: "Drop-off plan",
  low_res_config: "Low-res scan",
  photographer_selection_config: "Photographer selection",
  client_selection_config: "Client selection",
  photo_selection: "Photo selection",
  lr_to_hr_setup: "Low-res to high-res",
  handprint_high_res_config: "Low-res to high-res",
  edition_config: "Pre-check & Edition",
  check_finals: "Check Finals",
}

function stepLabel(stepId: CreationBlockId, config?: { handprintVariant?: "hp" | "hr" }): string {
  const base = STEP_LABELS[stepId] ?? stepId
  if ((stepId === "lr_to_hr_setup" || stepId === "handprint_high_res_config") && config?.handprintVariant === "hp") {
    return "Handprint to high-res"
  }
  return base
}

const ROLE_DISPLAY: Record<string, string> = {
  client: "Client",
  photographer: "Photographer",
  agency: "Agency",
  photo_lab: "Photo Lab",
  handprint_lab: "Hand Print Lab",
  retouch_studio: "Retouch/Post Studio",
}

function toDbRoleFromDomainRole(role: CollectionParticipant["role"]):
  | "noba"
  | "client"
  | "photographer"
  | "agency"
  | "photo_lab"
  | "retouch_studio"
  | "handprint_lab" {
  if (role === "producer") return "noba"
  if (role === "photo_lab") return "photo_lab"
  if (role === "retouch_studio") return "retouch_studio"
  return role
}

const PLACEHOLDER = (
  <div className="p-4 rounded-lg bg-zinc-50 text-sm text-muted-foreground">
    Step content will be implemented in next milestones.
  </div>
)

/** Viewport ≤759px — matches product 760px breakpoint for creation/edit templates. */
function useIsBelow760(): boolean {
  const [matches, setMatches] = React.useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 759px)").matches
      : false
  )
  React.useEffect(() => {
    const mql = window.matchMedia("(max-width: 759px)")
    const sync = () => setMatches(mql.matches)
    sync()
    mql.addEventListener("change", sync)
    return () => mql.removeEventListener("change", sync)
  }, [])
  return matches
}

export default function CollectionCreatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = React.use(params)
  const resolvedSearchParams = React.use(searchParams)
  const stepFromUrl =
    typeof resolvedSearchParams?.step === "string" ? resolvedSearchParams.step : undefined
  const router = useRouter()
  const [draft, setDraft] = React.useState<Awaited<
    ReturnType<ReturnType<typeof createCollectionsService>["getCollectionById"]>
  > | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [activeStep, setActiveStep] = React.useState<CreationBlockId | "">("")
  const [publishDialogOpen, setPublishDialogOpen] = React.useState(false)
  const [isPublishing, setIsPublishing] = React.useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = React.useState(false)
  const [isSavingSettings, setIsSavingSettings] = React.useState(false)
  // Structural workflow change (plan §3, §4). When a producer toggles
  // structural CollectionConfig keys (type of shoot, agency, edition, etc.) in
  // the settings modal, we route the save through a confirmation dialog and
  // the dedicated `/apply-workflow-change` endpoint. The pending config is
  // stashed here while the dialog is open.
  const [structuralConfirmDialog, setStructuralConfirmDialog] = React.useState<{
    open: boolean
    pendingConfig: CollectionConfig | null
    wasPublished: boolean
  }>({ open: false, pendingConfig: null, wasPublished: false })
  const [isApplyingStructural, setIsApplyingStructural] = React.useState(false)
  const [structuralRemediation, setStructuralRemediation] = React.useState<{
    open: boolean
    summary: StructuralReconciliationResult["participants"] | null
    removedSteps: string[]
    addedSteps: string[]
  }>({ open: false, summary: null, removedSteps: [], addedSteps: [] })
  const [saveChangesDialogOpen, setSaveChangesDialogOpen] = React.useState(false)
  const [isSavingChanges, setIsSavingChanges] = React.useState(false)
  const [cancelCollectionDialogOpen, setCancelCollectionDialogOpen] = React.useState(false)
  const [isCancelingCollection, setIsCancelingCollection] = React.useState(false)
  const [reactivateCollectionDialogOpen, setReactivateCollectionDialogOpen] = React.useState(false)
  const [isReactivatingCollection, setIsReactivatingCollection] = React.useState(false)
  const { user, isNobaUser } = useUserContext()
  const [participantSummaries, setParticipantSummaries] = React.useState<
    { role: string; name: string; count: number }[]
  >([])

  const service = React.useMemo(() => createCollectionsService(), [])

  React.useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    let cancelled = false
    service.getCollectionById(id).then((d) => {
      if (!cancelled) {
        setDraft(d)
        if (d) {
          const steps = computeCreationTemplate(d.config)
          const isNobaAdmin = (user?.role ?? "").toLowerCase() === "admin"
          const isReadOnlyForInternalNonMember =
            isNobaUser &&
            !isNobaAdmin &&
            !!user?.id &&
            !d.participants.some((p) => p.userIds?.includes(user.id))
          const nextIncomplete = steps.find((step) =>
            !isCreationStepComplete(step, d.creationData.completedBlockIds)
          )
          const validStepIds = new Set<string>(steps.map((s) => s.stepId))
          const completedStepIds = new Set<string>(
            steps
              .filter((step) => isCreationStepComplete(step, d.creationData.completedBlockIds))
              .map((step) => step.stepId)
          )
          const initialStep =
            stepFromUrl &&
            validStepIds.has(stepFromUrl) &&
            (!isReadOnlyForInternalNonMember || completedStepIds.has(stepFromUrl))
              ? stepFromUrl
              : isReadOnlyForInternalNonMember
                ? (steps.find((step) => completedStepIds.has(step.stepId))?.stepId ?? steps[0]?.stepId ?? "participants")
              : nextIncomplete?.stepId ?? steps[0]?.stepId ?? "participants"
          setActiveStep(initialStep as CreationBlockId)
        }
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [id, service, stepFromUrl, isNobaUser, user?.id])

  const isInternalNonInvitedViewer = React.useMemo(() => {
    if (!draft || !user?.id || !isNobaUser) return false
    const isNobaAdmin = (user.role ?? "").toLowerCase() === "admin"
    if (isNobaAdmin) return false
    return !draft.participants.some((p) => p.userIds?.includes(user.id))
  }, [draft, user?.id, user?.role, isNobaUser])

  const canUseCollectionSensitiveSidebarActions =
    !!draft &&
    !!user?.id &&
    canUseNobaSensitiveCollectionSidebarActions(user.id, user.role, isNobaUser, draft)

  React.useEffect(() => {
    if (!draft || !id) return
    if (isInternalNonInvitedViewer) return
    const hasClient = draft.participants.some((p) => p.role === "client")
    const hasProducer = draft.participants.some((p) => p.role === "producer")
    if (hasClient && hasProducer) return

    // Add producer participant (owner) if missing
    if (!hasProducer && draft.config.ownerUserId) {
      const ownerUserId = draft.config.ownerUserId
      const next: CollectionParticipant[] = [...draft.participants]
      if (!next.some((p) => p.role === "client") && draft.config.clientEntityId) {
        next.push({ role: "client", entityId: draft.config.clientEntityId })
      }
      next.push({
        role: "producer",
        entityId: undefined, // producer is noba*, not linked to client entity
        userIds: [ownerUserId],
        editPermissionByUserId: { [ownerUserId]: true },
      })
      service.updateCollection(id, { participants: next }).then((updated) => {
        if (updated) setDraft(updated)
      })
      return
    }
    // Add client participant if missing
    if (!hasClient && draft.config.clientEntityId) {
      const next: CollectionParticipant[] = [
        ...draft.participants,
        { role: "client", entityId: draft.config.clientEntityId },
      ]
      service.updateCollection(id, { participants: next }).then((updated) => {
        if (updated) setDraft(updated)
      })
    }
  }, [draft?.id, id, draft?.participants, draft?.config?.clientEntityId, draft?.config?.ownerUserId, service, isInternalNonInvitedViewer])

  // Persist "point of origin" for breadcrumb when user opens Create new (e.g. Photo Lab) from this collection
  React.useEffect(() => {
    if (!draft || !id) return
    const path = `/collections/create/${id}`
    const label = draft.config.name?.trim() || "Collection"
    try {
      sessionStorage.setItem(
        "create-flow-origin",
        JSON.stringify({ path, label })
      )
    } catch {
      // ignore
    }
  }, [draft?.id, id, draft?.config?.name])

  React.useEffect(() => {
    if (!draft) {
      setParticipantSummaries([])
      return
    }
    const relevant = draft.participants.filter((p) => p.role !== "producer")
    // When Handprint lab = Photo lab (handprintIsDifferentLab false), don't show Hand Print Lab
    // as a separate row — Photo Lab already covers both.
    const filtered =
      draft.config.handprintIsDifferentLab === false
        ? relevant.filter((p) => p.role !== "handprint_lab")
        : relevant
    if (filtered.length === 0) {
      setParticipantSummaries([])
      return
    }
    let cancelled = false

    const load = async () => {
      const response = await fetch(`/api/collections/${draft.id}/publish-participants`, {
        cache: "no-store",
      })
      if (!response.ok) {
        if (!cancelled) setParticipantSummaries([])
        return
      }
      const data = (await response.json()) as {
        handleByRole?: Partial<Record<
          "noba" | "client" | "photographer" | "agency" | "photo_lab" | "retouch_studio" | "handprint_lab",
          string
        >>
        memberCountByRole?: Partial<Record<
          "noba" | "client" | "photographer" | "agency" | "photo_lab" | "retouch_studio" | "handprint_lab",
          number
        >>
      }
      if (cancelled) return

      const isSameLab = draft.config.handprintIsDifferentLab === false && draft.config.hasHandprint
      const list = filtered.map((p, i) => {
        const dbRole = toDbRoleFromDomainRole(p.role)
        const roleHandle = data.handleByRole?.[dbRole] ?? "—"
        const roleCount = data.memberCountByRole?.[dbRole]
        const fallbackCount = p.userIds?.length ?? 1
        const roleLabel =
          p.role === "photo_lab" && isSameLab
            ? "Photo lab & Handprint"
            : (ROLE_DISPLAY[p.role] ?? p.role)
        return {
          role: roleLabel,
          name: roleHandle,
          count: typeof roleCount === "number" && roleCount > 0 ? roleCount : fallbackCount,
        }
      })
      setParticipantSummaries(list)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [draft?.id, draft?.participants, draft?.config?.clientEntityId, draft?.config?.handprintIsDifferentLab])

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
    if (isInternalNonInvitedViewer) return
    const { suggestedCorrection } = getChronologyConstraints(draft)
    if (!suggestedCorrection || Object.keys(suggestedCorrection).length === 0) return
    service.updateCollection(id, { config: suggestedCorrection }).then((updated) => {
      if (updated) setDraft(updated)
    })
  }, [draft, id, service, isInternalNonInvitedViewer])

  const sidebarItems = React.useMemo(
    () => steps.map((s) => ({ id: s.stepId, label: stepLabel(s.stepId, draft?.config) })),
    [steps, draft?.config]
  )

  const setActiveStepHandler = React.useCallback((stepId: CreationBlockId) => {
    setActiveStep(stepId)
  }, [])

  const handleParticipantsChange = React.useCallback(
    (participants: CollectionParticipant[]) => {
      if (!id) return
      // Optimistic update with functional setState so we never overwrite with stale draft (e.g. lab stays)
      setDraft((prev) => {
        if (!prev) return prev
        const nextDraft = { ...prev, participants }
        // Recompute completedBlockIds so "participants" step shows complete as soon as lab (etc.) is filled
        nextDraft.creationData = {
          ...prev.creationData,
          completedBlockIds: deriveCompletedBlockIds(prev.config, participants),
        }
        return nextDraft
      })
      service.updateCollection(id, { participants }).then((updated) => {
        if (updated) setDraft(updated)
      })
    },
    [id, service]
  )

  const handleConfigChange = React.useCallback(
    (patch: Partial<CollectionConfig>) => {
      if (!draft || !id) return
      const nextConfig = { ...draft.config, ...patch }
      // Optimistic update so Edit permission switch reflects immediately (noba section)
      setDraft({ ...draft, config: nextConfig })
      const hasNobaFields =
        patch.nobaUserIds !== undefined || patch.nobaEditPermissionByUserId !== undefined
      if (hasNobaFields) {
        // Owner is stored in config.ownerUserId; fallback to current user only if not set
        const ownerId = draft.config.ownerUserId ?? user?.id ?? ""
        const nextNobaUserIds = patch.nobaUserIds ?? draft.config.nobaUserIds ?? []
        const nextNobaEdit = {
          ...(draft.config.nobaEditPermissionByUserId ?? {}),
          ...(patch.nobaEditPermissionByUserId ?? {}),
        }
        // Producer userIds = owner (is_owner=true) + extra noba members (is_owner=false)
        const producerUserIds = [
          ...new Set([ownerId, ...nextNobaUserIds.filter((uid) => uid !== ownerId)]),
        ]
        const producerParticipant = draft.participants.find((p) => p.role === "producer")
        const mergedParticipants: CollectionParticipant[] = draft.participants
          .filter((p) => p.role !== "producer")
          .concat([
            {
              role: "producer",
              entityId: undefined, // producer is noba*, not linked to client entity
              userIds: producerUserIds,
              editPermissionByUserId: nextNobaEdit,
            },
          ])
        service
          .updateCollection(id, { config: patch, participants: mergedParticipants })
          .then((updated) => {
            if (updated) setDraft(updated)
          })
      } else {
        service.updateCollection(id, { config: patch }).then((updated) => {
          if (updated) setDraft(updated)
        })
      }
    },
    [draft, id, service, user?.id]
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
      if (!id) return
      setDraft((prev) => {
        if (!prev) return prev
        const nextConfig = { ...prev.config, ...patch }
        return { ...prev, config: nextConfig }
      })
      // When shooting address fields change, also set dropoff_shipping_origin_address so Pick-up stays in sync when edited from this step only
      const hasShootingAddress =
        patch.shootingStreetAddress !== undefined ||
        patch.shootingZipCode !== undefined ||
        patch.shootingCity !== undefined ||
        patch.shootingCountry !== undefined
      const configToUse = { ...draft?.config, ...patch }
      const formattedOrigin =
        hasShootingAddress &&
        [configToUse.shootingStreetAddress, configToUse.shootingZipCode, configToUse.shootingCity, configToUse.shootingCountry]
          .filter(Boolean)
          .join(" ")
      const configPatch =
        typeof formattedOrigin === "string" && formattedOrigin.length > 0
          ? { ...patch, dropoff_shipping_origin_address: formattedOrigin }
          : patch
      service.updateCollection(id, { config: configPatch }).then((updated) => {
        if (updated) setDraft(updated)
      })
    },
    [id, service, draft?.config]
  )

  const handleDropoffPlanChange = React.useCallback(
    (patch: Partial<Pick<CollectionConfig,
      | "shootingStreetAddress"
      | "shootingZipCode"
      | "shootingCity"
      | "shootingCountry"
      | "dropoff_shipping_origin_address"
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
      setDraft((prev) => {
        if (!prev) return prev
        return { ...prev, config: { ...prev.config, ...patch } }
      })
      service.updateCollection(id, { config: patch }).then((updated) => {
        if (updated) setDraft(updated)
      })
    },
    [draft, id, service]
  )

  const handleLowResConfigChange = React.useCallback(
    (patch: Partial<Pick<CollectionConfig,
      | "lowResScanDeadlineDate"
      | "lowResScanDeadlineTime"
      | "lowResShippingOriginAddress"
      | "lowResShippingPickupDate"
      | "lowResShippingPickupTime"
      | "lowResShippingDestinationAddress"
      | "lowResShippingDeliveryDate"
      | "lowResShippingDeliveryTime"
      | "lowResShippingManaging"
      | "lowResShippingProvider"
      | "lowResShippingTracking"
    >>) => {
      if (!draft || !id) return
      setDraft((prev) => {
        if (!prev) return prev
        const nextConfig = { ...prev.config, ...patch }
        return { ...prev, config: nextConfig }
      })
      service.updateCollection(id, { config: patch }).then((updated) => {
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
      service.updateCollection(id, { config: patch }).then((updated) => {
        if (updated) setDraft(updated)
      })
    },
    [draft, id, service]
  )

  const handleLrToHrSetupChange = React.useCallback(
    (patch: Partial<Pick<CollectionConfig, "lrToHrDueDate" | "lrToHrDueTime">>) => {
      if (!draft || !id) return
      const c = draft.config
      const isDigitalWithRetouch = !c.hasHandprint && c.hasEditionStudio
      const configPatch: Partial<CollectionConfig> = { ...patch }
      if (isDigitalWithRetouch && (patch.lrToHrDueDate !== undefined || patch.lrToHrDueTime !== undefined)) {
        if (patch.lrToHrDueDate !== undefined) configPatch.editionPhotographerDueDate = patch.lrToHrDueDate
        if (patch.lrToHrDueTime !== undefined) configPatch.editionPhotographerDueTime = patch.lrToHrDueTime
      }
      service.updateCollection(id, { config: configPatch }).then((updated) => {
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
      service.updateCollection(id, { config: patch }).then((updated) => {
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
      service.updateCollection(id, { config: patch }).then((updated) => {
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
        .updateCollection(id, { creationData: { completedBlockIds: nextCompleted } })
        .then((updated) => {
          if (updated) setDraft(updated)
          setActiveStepHandler(nextStepId)
        })
    },
    [draft, id, service, setActiveStepHandler]
  )

  /** Publish collection (sidebar and block primary CTA). Disabled until draft and Check Finals block are complete. Only used when NOT in edition mode. */
  const handlePublish = React.useCallback(() => {
    if (
      !draft ||
      !isDraftComplete(draft) ||
      !isCreationStepContentComplete(draft, "check_finals")
    )
      return
    setPublishDialogOpen(true)
  }, [draft])

  /** Edition mode: open Save changes confirmation dialog. */
  const handleSaveChanges = React.useCallback(() => {
    setSaveChangesDialogOpen(true)
  }, [])

  /** Edition mode: confirm save changes, update collection, invite new participants, redirect to view mode. */
  const handleConfirmSaveChanges = React.useCallback(async () => {
    if (!draft || !id || isSavingChanges) return
    setIsSavingChanges(true)
    try {
      const res = await fetch(`/api/collections/${id}/save-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: draft.config,
          participants: draft.participants,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        success?: boolean
        message?: string
        invitationsCreated?: number
        invitationsSent?: number
      }
      if (!res.ok) {
        toast.error(data.error || "Failed to save changes.")
        setIsSavingChanges(false)
        return
      }
      toast.success(data.message || "Changes saved.")
      setSaveChangesDialogOpen(false)
      router.push(`/collections/${id}`)
    } catch (err) {
      toast.error("Failed to save changes.")
    } finally {
      setIsSavingChanges(false)
    }
  }, [draft, id, router, isSavingChanges])

  const handleConfirmPublish = React.useCallback(async () => {
    if (
      !draft ||
      !id ||
      !isDraftComplete(draft) ||
      !isCreationStepContentComplete(draft, "check_finals") ||
      isPublishing
    )
      return

    setIsPublishing(true)
    try {
      // Publish via API so notifications (scheduled_notification_tracking) and invitation emails run server-side
      const res = await fetch(`/api/collections/${id}/publish`, { method: "POST" })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        code?: string
        success?: boolean
        invitationsCreated?: number
        invitationsSent?: number
        message?: string
      }

      if (!res.ok) {
        if (data.code === "DRAFT_INCOMPLETE") {
          toast.error("Finish required setup before publishing.")
        } else if (data.code === "NOT_FOUND") {
          toast.error("Draft not found.")
          router.push("/collections")
        } else {
          toast.error(data.error || "Failed to publish collection")
        }
        setIsPublishing(false)
        return
      }

      // Get client name for toast
      const clientEntityId = draft.config.clientEntityId
      let clientName = "Client"
      if (clientEntityId) {
        const orgRes = await fetch(`/api/players/${clientEntityId}`)
        if (orgRes.ok) {
          const orgData = await orgRes.json().catch(() => null) as { entity?: { name?: string } } | null
          if (orgData?.entity?.name) clientName = orgData.entity.name
        }
      }

      const collectionName = draft.config.name || "Collection"
      toast.success(`${collectionName} by @${clientName.toLowerCase()} has been published`)

      const created = data.invitationsCreated ?? 0
      const sent = data.invitationsSent ?? 0
      if (created > 0 && sent < created && data.error) {
        toast.warning(`Invitation emails could not be sent for some participants. ${data.error}`)
      } else if (created > 0 && sent < created) {
        toast.warning(
          `Invitation emails could not be sent (${sent}/${created} sent). Check RESEND_API_KEY and RESEND_FROM_EMAIL.`
        )
      }

      setPublishDialogOpen(false)
      router.push("/collections")
    } catch (error) {
      setIsPublishing(false)
      toast.error("Failed to publish collection")
    }
  }, [draft, id, router, isPublishing])

  /** Open delete confirmation dialog (sidebar “more” → Delete collection). */
  const handleDeleteCollection = React.useCallback(() => {
    setIsDeleteConfirmOpen(true)
  }, [])

  /** Confirm delete draft and redirect. */
  const handleConfirmDeleteCollection = React.useCallback(async () => {
    if (!id || !service) return
    setIsDeleting(true)
    try {
      await service.deleteCollection(id)
      toast.success("Collection deleted.")
      setIsDeleteConfirmOpen(false)
      router.push("/collections")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete collection"
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }, [id, service, router])

  const handleOpenCancelCollectionDialog = React.useCallback(() => {
    if (!draft) return
    if (draft.status === "canceled") {
      toast.info("This collection is already canceled.")
      return
    }
    setCancelCollectionDialogOpen(true)
  }, [draft])

  const handleConfirmCancelCollection = React.useCallback(async () => {
    if (!id || !service) return
    setIsCancelingCollection(true)
    try {
      await service.cancelCollection(id)
      toast.success("Collection canceled.")
      setCancelCollectionDialogOpen(false)
      router.push("/collections")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to cancel collection"
      toast.error(message)
    } finally {
      setIsCancelingCollection(false)
    }
  }, [id, service, router])

  const handleOpenReactivateCollectionDialog = React.useCallback(() => {
    setReactivateCollectionDialogOpen(true)
  }, [])

  const handleConfirmReactivateCollection = React.useCallback(async () => {
    if (!id || !service) return
    setIsReactivatingCollection(true)
    try {
      const next = await service.reactivateCanceledCollection(id)
      toast.success("Collection reactivated.")
      setReactivateCollectionDialogOpen(false)
      if (next.status === "draft") {
        setDraft(next)
      } else {
        router.push(`/collections/${id}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reactivate collection"
      toast.error(message)
    } finally {
      setIsReactivatingCollection(false)
    }
  }, [id, service, router])

  /** Open collection settings modal (sidebar settings icon). */
  const handleSettingsCollection = React.useCallback(() => {
    setIsSettingsModalOpen(true)
  }, [])

  /** Save collection config from settings modal.
   *
   * When the producer toggles a structural CollectionConfig key (type of
   * shoot, agency, edition, etc. — see STRUCTURAL_CONFIG_KEYS) we route the
   * save through the apply-workflow-change endpoint with a confirmation
   * dialog. Otherwise we keep the safe-edit path through `updateCollection`.
   */
  const handleSettingsSubmit = React.useCallback(
    (config: CollectionConfig) => {
      if (!id || !draft) return
      const structuralDiff = diffStructuralConfigs(draft.config, config)
      if (structuralDiff.isStructural) {
        setIsSettingsModalOpen(false)
        setStructuralConfirmDialog({
          open: true,
          pendingConfig: config,
          wasPublished: Boolean(draft.publishedAt?.trim()),
        })
        return
      }
      setIsSavingSettings(true)
      service
        .updateCollection(id, { config })
        .then((updated) => {
          if (updated) setDraft(updated)
          setIsSettingsModalOpen(false)
          toast.success("Collection settings saved.")
        })
        .catch(() => toast.error("Failed to save settings."))
        .finally(() => setIsSavingSettings(false))
    },
    [id, draft, service]
  )

  /** Confirm structural workflow change → POST /apply-workflow-change. */
  const handleConfirmStructuralChange = React.useCallback(async () => {
    if (!id || !draft || !structuralConfirmDialog.pendingConfig || isApplyingStructural) return
    setIsApplyingStructural(true)
    try {
      const res = await fetch(`/api/collections/${id}/apply-workflow-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: structuralConfirmDialog.pendingConfig,
          expectedUpdatedAt: draft.updatedAt,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        code?: string
        success?: boolean
        wasPublished?: boolean
        workflowRevision?: number
        message?: string
        reconciliation?: {
          changedKeys: string[]
          removedViewStepIds: string[]
          addedViewStepIds: string[]
          missingRequiredRoles: string[]
          orphanedRoles: string[]
          newRequiredRoles: string[]
          completionPercentage: number
        }
      }
      if (!res.ok) {
        if (data.code === "VERSION_MISMATCH") {
          toast.error(
            "The collection was modified by someone else. Reload to see the latest version."
          )
        } else if (data.code === "INVALID_STATUS") {
          toast.error(data.error ?? "Cannot reconfigure this collection right now.")
        } else if (data.code === "NO_OP") {
          toast.error("No structural change detected. Try again.")
        } else {
          toast.error(data.error ?? "Failed to apply workflow change.")
        }
        return
      }
      toast.success(data.message ?? "Workflow updated.")
      setStructuralConfirmDialog({ open: false, pendingConfig: null, wasPublished: false })

      // Show remediation checklist for the producer.
      const r = data.reconciliation
      if (r) {
        setStructuralRemediation({
          open:
            r.removedViewStepIds.length > 0 ||
            r.addedViewStepIds.length > 0 ||
            r.missingRequiredRoles.length > 0 ||
            r.orphanedRoles.length > 0,
          summary: {
            missingRequiredRoles: r.missingRequiredRoles as never,
            orphanedRoles: r.orphanedRoles as never,
            nowRequiredRoles: r.newRequiredRoles as never,
          },
          removedSteps: r.removedViewStepIds,
          addedSteps: r.addedViewStepIds,
        })
      }

      // Refetch the canonical collection so creation flow renders the new template.
      const updated = await service.getCollectionById(id)
      if (updated) setDraft(updated)
    } catch {
      toast.error("Failed to apply workflow change.")
    } finally {
      setIsApplyingStructural(false)
    }
  }, [id, draft, structuralConfirmDialog.pendingConfig, isApplyingStructural, service])

  // Edition mode: collection is already published (accessed via Settings → Edit collection). Must be before blocks useMemo.
  const isEditionMode = Boolean(draft && draft.status !== "draft")
  const isBelow760 = useIsBelow760()

  /** Edit collection on narrow viewports: only Participants step; primary CTA becomes Save changes (same dialog + redirect as desktop). */
  const editionParticipantsOnlyMobile = isEditionMode && isBelow760

  React.useEffect(() => {
    if (!editionParticipantsOnlyMobile) return
    setActiveStep("participants")
  }, [editionParticipantsOnlyMobile])

  const blocks = React.useMemo(() => {
    if (!draft || steps.length === 0) return []
    const completedBlockIds = draft.creationData.completedBlockIds
    const currentActive = activeStep || steps[0]?.stepId

    const built = steps.map((step, index) => {
      const stepId = step.stepId
      const isFirst = index === 0
      const isLast = index === steps.length - 1
      const isActive = stepId === currentActive
      const isCompleted = isCreationStepComplete(step, completedBlockIds)
      const variant: "active" | "completed" | "disabled" =
        isInternalNonInvitedViewer && !isCompleted
          ? "disabled"
          : isActive
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
                if (draft.config.handprintIsDifferentLab) roles.push("Hand Print Lab")
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
                  ? participantSummaries.filter((p) => {
                      const base = ["Client", "Photo Lab"]
                      if (draft.config.handprintVariant === "hr") return base.includes(p.role)
                      return [...base, "Hand Print Lab"].includes(p.role)
                    })
                  : isEditionConfig
                    ? participantSummaries.filter((p) =>
                        ["Client", "Photographer", "Retouch/Post Studio"].includes(p.role)
                      )
                    : isCheckFinals
                      ? participantSummaries.filter((p) =>
                          ["Client", "Photographer"].includes(p.role)
                        )
                      : participantSummaries

      return {
        id: stepId,
        title: stepLabel(stepId, draft.config),
        subtitle,
        variant,
        showParticipants: showParticipantsForBlock,
        participants: participantsForBlock,
        onEditParticipants: showParticipantsForBlock && !isInternalNonInvitedViewer
          ? () => setActiveStepHandler("participants")
          : undefined,
        content:
          stepId === "participants" ? (
            <div className={isInternalNonInvitedViewer ? "pointer-events-none opacity-60" : undefined}>
            <ParticipantsStepContent
              draft={draft}
              onParticipantsChange={handleParticipantsChange}
              onConfigChange={handleConfigChange}
            />
            </div>
          ) : isShootingSetup ? (
            <div className={isInternalNonInvitedViewer ? "pointer-events-none opacity-60" : undefined}>
            <ShootingSetupStepContent
              draft={draft}
              onShootingSetupChange={handleShootingSetupChange}
              chronologyConstraints={chronology.byBlockId}
            />
            </div>
          ) : isDropoffPlan ? (
            <div className={isInternalNonInvitedViewer ? "pointer-events-none opacity-60" : undefined}>
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
            </div>
          ) : isLowResConfig ? (
            <div className={isInternalNonInvitedViewer ? "pointer-events-none opacity-60" : undefined}>
            <LowResConfigStepContent
              draft={draft}
              onLowResConfigChange={handleLowResConfigChange}
              chronologyConstraints={chronology.byBlockId}
              managingShippingOptions={[
                ...participantSummaries
                  .filter((p) => p.role === "Client")
                  .map((p) => ({ value: p.name, label: p.name })),
                ...participantSummaries
                  .filter((p) => p.role === "Photo Lab")
                  .map((p) => ({ value: p.name, label: p.name })),
                { value: "noba", label: "noba*" },
              ]}
            />
            </div>
          ) : isPhotoSelection ? (
            <div className={isInternalNonInvitedViewer ? "pointer-events-none opacity-60" : undefined}>
            <PhotoSelectionStepContent
              draft={draft}
              onPhotoSelectionChange={handlePhotoSelectionChange}
              chronologyConstraints={chronology.byBlockId}
            />
            </div>
          ) : isLrToHrStep ? (
            <div className={`flex flex-col gap-5 w-full${isInternalNonInvitedViewer ? " pointer-events-none opacity-60" : ""}`}>
              <LrToHrSetupStepContent
                draft={draft}
                onLrToHrSetupChange={handleLrToHrSetupChange}
                chronologyConstraints={chronology.byBlockId}
              />
            </div>
          ) : isEditionConfig ? (
            <div className={isInternalNonInvitedViewer ? "pointer-events-none opacity-60" : undefined}>
            <EditionConfigStepContent
              draft={draft}
              onEditionConfigChange={handleEditionConfigChange}
              chronologyConstraints={chronology.byBlockId}
            />
            </div>
          ) : isCheckFinals ? (
            <div className={isInternalNonInvitedViewer ? "pointer-events-none opacity-60" : undefined}>
            <CheckFinalsStepContent
              draft={draft}
              onCheckFinalsChange={handleCheckFinalsChange}
              chronologyConstraints={chronology.byBlockId}
            />
            </div>
          ) : (
            PLACEHOLDER
          ),
        primaryLabel:
          draft.status === "canceled"
            ? "Canceled"
            : isLast
              ? isEditionMode
                ? "Save changes"
                : "Publish collection"
              : "Next",
        onPrimaryClick:
          isInternalNonInvitedViewer || draft.status === "canceled"
            ? undefined
            : isLast
              ? isEditionMode
                ? handleSaveChanges
                : handlePublish
              : nextStepId
                ? () => handleNextClick(stepId, nextStepId)
                : undefined,
        primaryDisabled: isInternalNonInvitedViewer
          ? true
          : draft.status === "canceled"
            ? true
            : isLast
              ? isEditionMode
                ? false
                : !isDraftComplete(draft) || !isCreationStepContentComplete(draft, "check_finals")
              : !isCreationStepContentComplete(draft, stepId),
        secondaryLabel: isFirst ? undefined : "Previous",
        onSecondaryClick: isFirst
          ? undefined
          : prevStepId
            ? () => setActiveStepHandler(prevStepId)
            : undefined,
        onEdit: isInternalNonInvitedViewer ? undefined : () => setActiveStepHandler(stepId),
      }
    })
    if (editionParticipantsOnlyMobile) {
      const only = built.filter((b) => b.id === "participants")
      if (only.length !== 1) return only.length > 0 ? only : built
      const p = only[0]
      if (isInternalNonInvitedViewer) return [p]
      return [
        {
          ...p,
          primaryLabel: draft.status === "canceled" ? "Canceled" : "Save changes",
          onPrimaryClick: draft.status === "canceled" ? undefined : handleSaveChanges,
          primaryDisabled: draft.status === "canceled",
          secondaryLabel: undefined,
          onSecondaryClick: undefined,
        },
      ]
    }
    return built
  }, [draft, steps, activeStep, chronology.byBlockId, setActiveStepHandler, handleParticipantsChange, handleNextClick, handlePublish, handleSaveChanges, isEditionMode, editionParticipantsOnlyMobile, handleShootingSetupChange, handleDropoffPlanChange, handleLowResConfigChange, handlePhotoSelectionChange, handleLrToHrSetupChange, handleEditionConfigChange, handleCheckFinalsChange, participantSummaries, isInternalNonInvitedViewer])

  // Map domain status to UI status for sidebar badge (draft | upcoming | in-progress | completed | canceled)
  const collectionStatusForUI = React.useMemo((): "draft" | "upcoming" | "in-progress" | "completed" | "canceled" => {
    if (!draft) return "draft"
    if (isEditionMode) {
      if (draft.status === "in_progress") return "in-progress"
      if (draft.status === "upcoming") return "upcoming"
      if (draft.status === "completed") return "completed"
      if (draft.status === "canceled") return "canceled"
    }
    return "draft"
  }, [draft, isEditionMode])

  // Derive published status for right card preview (must run before any early return to keep hooks order stable)
  const derivedStatus = React.useMemo(() => {
    if (!draft?.config) return "upcoming" as const
    return derivePublishedStatus(draft.config)
  }, [draft?.config])

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
    return { role: p.role, name: p.name, count: p.count }
  })

  return (
    <>
      <CreationTemplate
        title={draft.config.name || "Create collection"}
        breadcrumbs={
          isEditionMode
            ? [
                { label: "Collection Detail", href: `/collections/${id}` },
                { label: `Edit '${draft.config.name || "Collection"}'` },
              ]
            : [
                { label: "Collections", href: "/collections" },
                { label: draft.config.name || "Create collection" },
              ]
        }
        sidebarVariant="create-collection"
        collectionSummary={{
          name: draft.config.name || "Create collection",
          status: collectionStatusForUI,
          client: participantSummaries.find((p) => p.role === "Client")?.name ?? "—",
          publishingDate: draft.config.publishingDate
            ? new Date(draft.config.publishingDate + "T12:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : undefined,
          lastUpdate: draft.updatedAt,
        }}
        sidebarItems={sidebarItems}
        activeSidebarItem={activeStep || sidebarItems[0]?.id}
        completedStepIds={steps
          .filter((s) => isCreationStepComplete(s, draft.creationData.completedBlockIds))
          .map((s) => s.stepId)}
        onSidebarItemClick={(stepId) => {
          if (!isInternalNonInvitedViewer) {
            setActiveStep(stepId as CreationBlockId)
            return
          }
          const selected = steps.find((s) => s.stepId === stepId)
          if (!selected) return
          const canOpen = isCreationStepComplete(selected, draft.creationData.completedBlockIds)
          if (canOpen) setActiveStep(stepId as CreationBlockId)
        }}
        collectionSecondaryActions={
          canUseCollectionSensitiveSidebarActions
            ? {
                onEditBasicDetails: handleSettingsCollection,
                onCancelCollection: handleOpenCancelCollectionDialog,
                onReactivateCollection: handleOpenReactivateCollectionDialog,
                onDeleteCollection: handleDeleteCollection,
              }
            : null
        }
        onPublishCollection={
          isInternalNonInvitedViewer || draft.status === "canceled"
            ? undefined
            : isEditionMode
              ? handleSaveChanges
              : handlePublish
        }
        publishCollectionDisabled={
          isInternalNonInvitedViewer
            ? true
            : draft.status === "canceled"
              ? true
              : isEditionMode
                ? false
                : !isDraftComplete(draft) || !isCreationStepContentComplete(draft, "check_finals")
        }
        publishCollectionLabel={
          draft.status === "canceled"
            ? "Canceled"
            : isEditionMode
              ? "Save changes"
              : "Publish"
        }
        blocks={blocks}
      />
      <PublishCollectionDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        cardLeft={publishCardLeft}
        cardRight={publishCardRight}
        participants={publishParticipants}
        onEditParticipants={() => {
          if (isInternalNonInvitedViewer) return
          setPublishDialogOpen(false)
          setActiveStep("participants")
        }}
        publishDisabled={
          isInternalNonInvitedViewer ||
          !isDraftComplete(draft) ||
          !isCreationStepContentComplete(draft, "check_finals") ||
          isPublishing
        }
        isPublishing={isPublishing}
        onPublish={handleConfirmPublish}
      />

      {/* Delete collection confirmation */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete collection?</DialogTitle>
            <DialogDescription>
              {draft.status === "draft"
                ? "This will permanently delete this draft. You cannot undo this action."
                : "This will permanently delete this collection. You cannot undo this action."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setIsDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={handleConfirmDeleteCollection}
              loading={isDeleting}
              loadingText="Deleting..."
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel collection — invited users keep read-only visibility (card + detail show as canceled) */}
      <Dialog open={cancelCollectionDialogOpen} onOpenChange={setCancelCollectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel collection?</DialogTitle>
            <DialogDescription>
              This marks the collection as canceled. Invited participants will still see this collection in their
              Collections list with status canceled so it is clear the project was canceled (not removed). They
              cannot edit participants or settings. You can re-activate it from the sidebar menu when appropriate.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setCancelCollectionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={handleConfirmCancelCollection}
              loading={isCancelingCollection}
              loadingText="Canceling..."
            >
              Cancel collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate canceled collection */}
      <Dialog open={reactivateCollectionDialogOpen} onOpenChange={setReactivateCollectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-activate collection?</DialogTitle>
            <DialogDescription>
              {draft.publishedAt?.trim()
                ? "This restores the collection to your published workflow (upcoming or in progress, matching dates and recorded step progress). Invited participants will see it again on Collections."
                : "This restores the collection to draft. You can review the setup and publish again when ready."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setReactivateCollectionDialogOpen(false)}
            >
              Back
            </Button>
            <Button
              size="lg"
              onClick={handleConfirmReactivateCollection}
              loading={isReactivatingCollection}
              loadingText="Re-activating..."
            >
              Re-activate collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Collection settings modal (main characteristics) */}
      <NewCollectionModal
        key={draft.id}
        open={isSettingsModalOpen}
        onOpenChange={setIsSettingsModalOpen}
        managerUserId={user?.id ?? draft.config.managerUserId ?? ""}
        initialConfig={draft.config}
        onSubmit={handleSettingsSubmit}
        isSubmitting={isSavingSettings}
        wasPublished={Boolean(draft.publishedAt?.trim())}
      />

      {/* Structural workflow change — destructive confirm dialog (plan §4.3). */}
      <Dialog
        open={structuralConfirmDialog.open}
        onOpenChange={(open) =>
          setStructuralConfirmDialog((prev) =>
            open ? prev : { open: false, pendingConfig: null, wasPublished: false }
          )
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {structuralConfirmDialog.wasPublished
                ? "Apply workflow change and move to draft?"
                : "Apply workflow change?"}
            </DialogTitle>
            <DialogDescription>
              {structuralConfirmDialog.wasPublished
                ? "This change updates the steps, deadlines and required participants of the collection. The collection will move back to draft until you complete the missing setup and republish — external participants temporarily lose access and will be re-invited automatically on republish."
                : "This change updates the steps, deadlines and required participants of the collection. Complete the missing setup before publishing — affected artefacts of removed steps will be cleared."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              size="lg"
              onClick={() =>
                setStructuralConfirmDialog({
                  open: false,
                  pendingConfig: null,
                  wasPublished: false,
                })
              }
              disabled={isApplyingStructural}
            >
              Cancel
            </Button>
            <Button
              size="lg"
              variant={structuralConfirmDialog.wasPublished ? "destructive" : "default"}
              onClick={handleConfirmStructuralChange}
              loading={isApplyingStructural}
              loadingText="Applying…"
            >
              {structuralConfirmDialog.wasPublished
                ? "Apply and move to draft"
                : "Apply workflow change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Structural workflow change — remediation checklist (plan §3 final). */}
      <Dialog
        open={structuralRemediation.open}
        onOpenChange={(open) =>
          setStructuralRemediation((prev) =>
            open ? prev : { ...prev, open: false }
          )
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Workflow updated</DialogTitle>
            <DialogDescription>
              Review the impact below and finish the missing setup before publishing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {structuralRemediation.removedSteps.length > 0 ? (
              <div>
                <p className="font-medium">Steps removed</p>
                <p className="text-muted-foreground">
                  {structuralRemediation.removedSteps.join(", ")}
                </p>
              </div>
            ) : null}
            {structuralRemediation.addedSteps.length > 0 ? (
              <div>
                <p className="font-medium">New steps</p>
                <p className="text-muted-foreground">
                  {structuralRemediation.addedSteps.join(", ")}
                </p>
              </div>
            ) : null}
            {structuralRemediation.summary?.missingRequiredRoles &&
            structuralRemediation.summary.missingRequiredRoles.length > 0 ? (
              <div>
                <p className="font-medium">Participants to invite</p>
                <p className="text-muted-foreground">
                  {structuralRemediation.summary.missingRequiredRoles.join(", ")}
                </p>
              </div>
            ) : null}
            {structuralRemediation.summary?.orphanedRoles &&
            structuralRemediation.summary.orphanedRoles.length > 0 ? (
              <div>
                <p className="font-medium">Participants no longer required</p>
                <p className="text-muted-foreground">
                  {structuralRemediation.summary.orphanedRoles.join(", ")} — you can remove them
                  from the Participants step or keep them for record.
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              size="lg"
              onClick={() => setStructuralRemediation((prev) => ({ ...prev, open: false }))}
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edition mode: Save changes confirmation */}
      <Dialog open={saveChangesDialogOpen} onOpenChange={setSaveChangesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save changes?</DialogTitle>
            <DialogDescription>
              Making these changes means that all participants have accepted new deadlines and conditions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setSaveChangesDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="lg"
              onClick={handleConfirmSaveChanges}
              loading={isSavingChanges}
              loadingText="Saving..."
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}