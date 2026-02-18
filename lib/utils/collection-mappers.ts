/**
 * Collection Mappers — domain ↔ Supabase DB.
 * DB has no status/published_at columns; domain defaults to "draft".
 */

import type {
  Collection as DomainCollection,
  CollectionConfig,
  CollectionParticipant,
  CurrentOwnerRole,
  CreationBlockId,
  CreationData,
  ParticipantRole,
  StepNoteEntry,
} from "@/lib/domain/collections"
import type {
  Collection as DbCollection,
  CollectionInsert,
  CollectionUpdate,
  CollectionMember,
  CollectionMemberInsert,
  CollectionMemberRole,
} from "@/lib/supabase/database.types"

function dbDateToIso(v: string | null): string | undefined {
  if (!v) return undefined
  return v
}

function isoToDbDate(v: string | undefined): string | null {
  if (!v?.trim()) return null
  return v
}

// =============================================================================
// JSONB ARRAY HELPERS (migration 034)
// =============================================================================

/** Parse a JSONB string array from DB (may be null, string, or already parsed array). */
function parseJsonbStringArray(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === "string")
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string")
    } catch { /* ignore */ }
    // Single string → wrap in array
    return [raw]
  }
  return []
}

/** Parse a JSONB note array from DB. */
function parseJsonbNoteArray(raw: unknown): StepNoteEntry[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.filter(
      (v): v is StepNoteEntry =>
        typeof v === "object" && v !== null && typeof v.from === "string" && typeof v.text === "string" && typeof v.at === "string"
    )
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parseJsonbNoteArray(parsed)
    } catch { /* ignore */ }
  }
  return []
}

/** Parse current_owners array from DB (text[]/enum[]). */
function parseCurrentOwners(raw: unknown): CurrentOwnerRole[] {
  if (!raw) return []
  if (!Array.isArray(raw)) return []
  return raw.filter((v): v is CurrentOwnerRole =>
    v === "noba" ||
    v === "client" ||
    v === "photographer" ||
    v === "agency" ||
    v === "photo_lab" ||
    v === "retouch_studio" ||
    v === "handprint_lab"
  )
}

/** Append a URL to an existing URL array (non-destructive). */
export function appendToUrlArray(existing: string[] | undefined, newUrl: string): string[] {
  return [...(existing ?? []), newUrl]
}

/** Append a note entry to an existing notes array (non-destructive). */
export function appendNote(existing: StepNoteEntry[] | undefined, entry: StepNoteEntry): StepNoteEntry[] {
  return [...(existing ?? []), entry]
}

/** DB → Domain: build config from flat DB row */
function dbRowToConfig(row: DbCollection, members: CollectionMember[]): CollectionConfig {
  const managerUserId =
    members.find((m) => m.role === "client")?.user_id ?? ""
  const ownerMember = members.find((m) => m.role === "noba" && (m as { is_owner?: boolean }).is_owner === true)
  const ownerUserId =
    ownerMember?.user_id ?? members.find((m) => m.role === "noba")?.user_id ?? undefined
  const producerMembers = members.filter((m) => m.role === "noba")
  const producerUserIds = producerMembers.map((m) => m.user_id)
  const rowNobaUserIds = Array.isArray((row as { noba_user_ids?: unknown }).noba_user_ids)
    ? (row as { noba_user_ids: string[] }).noba_user_ids
    : null
  // Derive nobaEditPermissionByUserId from producer members' can_edit column (source of truth).
  // Fall back to legacy JSON columns for pre-028 data.
  const rowNobaEdit = (row as { noba_edit_permission_by_user_id?: unknown }).noba_edit_permission_by_user_id
  const storedEdit = (row as { participant_edit_permissions?: Record<string, Record<string, boolean>> }).participant_edit_permissions
  const nobaEditFromMembers: Record<string, boolean> | undefined =
    producerMembers.length > 0
      ? Object.fromEntries(producerMembers.map((m) => [m.user_id, (m as { can_edit?: boolean }).can_edit ?? true]))
      : undefined
  return {
    name: row.name,
    reference: row.reference ?? undefined,
    clientEntityId: row.client_id,
    managerUserId,
    ownerUserId,
    nobaUserIds: rowNobaUserIds ?? (producerUserIds.length > 0 ? producerUserIds : undefined),
    nobaEditPermissionByUserId:
      nobaEditFromMembers ??
      (rowNobaEdit != null && typeof rowNobaEdit === "object"
        ? (rowNobaEdit as Record<string, boolean>)
        : (storedEdit?.producer != null && typeof storedEdit.producer === "object"
          ? storedEdit.producer
          : undefined)),
    hasAgency: row.photographer_collaborates_with_agency,
    hasLowResLab: row.low_res_to_high_res_digital,
    hasHandprint: row.low_res_to_high_res_hand_print,
    handprintIsDifferentLab: row.handprint_different_from_original_lab,
    hasEditionStudio: row.photographer_request_edition,
    clientFinalsDeadline: dbDateToIso(row.project_deadline),
    clientFinalsDeadlineTime: row.project_deadline_time ?? undefined,
    publishingDate: dbDateToIso(row.publishing_date ?? null),
    publishingTime: row.publishing_time ?? undefined,
    shootingStartDate: dbDateToIso(row.shooting_start_date),
    shootingStartTime: row.shooting_start_time ?? undefined,
    shootingEndDate: dbDateToIso(row.shooting_end_date),
    shootingEndTime: row.shooting_end_time ?? undefined,
    shootingStreetAddress: row.shooting_street_address ?? undefined,
    shootingZipCode: row.shooting_zip_code ?? undefined,
    shootingCity: row.shooting_city ?? undefined,
    shootingCountry: row.shooting_country ?? undefined,
    dropoff_shipping_origin_address: row.dropoff_shipping_origin_address ?? undefined,
    dropoff_shipping_date: dbDateToIso(row.dropoff_shipping_date),
    dropoff_shipping_time: row.dropoff_shipping_time ?? undefined,
    dropoff_shipping_destination_address: row.dropoff_shipping_destination_address ?? undefined,
    dropoff_delivery_date: dbDateToIso(row.dropoff_delivery_date),
    dropoff_delivery_time: row.dropoff_delivery_time ?? undefined,
    dropoff_managing_shipping: row.dropoff_managing_shipping ?? undefined,
    dropoff_shipping_carrier: row.dropoff_shipping_carrier ?? undefined,
    dropoff_shipping_tracking: row.dropoff_shipping_tracking ?? undefined,
    lowResScanDeadlineDate: dbDateToIso(row.lowres_deadline_date),
    lowResScanDeadlineTime: row.lowres_deadline_time ?? undefined,
    lowResShippingOriginAddress: row.lowres_shipping_origin_address ?? undefined,
    lowResShippingPickupDate: dbDateToIso(row.lowres_shipping_date),
    lowResShippingPickupTime: row.lowres_shipping_time ?? undefined,
    lowResShippingDestinationAddress: row.lowres_shipping_destination_address ?? undefined,
    lowResShippingDeliveryDate: dbDateToIso(row.lowres_delivery_date),
    lowResShippingDeliveryTime: row.lowres_delivery_time ?? undefined,
    lowResShippingManaging: row.lowres_managing_shipping ?? undefined,
    lowResShippingProvider: row.lowres_shipping_carrier ?? undefined,
    lowResShippingTracking: row.lowres_shipping_tracking ?? undefined,
    photoSelectionPhotographerDueDate: dbDateToIso(row.photo_selection_photographer_preselection_date),
    photoSelectionPhotographerDueTime: row.photo_selection_photographer_preselection_time ?? undefined,
    photoSelectionClientDueDate: dbDateToIso(row.photo_selection_client_selection_date),
    photoSelectionClientDueTime: row.photo_selection_client_selection_time ?? undefined,
    photographerCheckDueDate: dbDateToIso(row.photographer_check_due_date ?? null),
    photographerCheckDueTime: row.photographer_check_due_time ?? undefined,
    lrToHrDueDate: dbDateToIso(row.low_to_high_date),
    lrToHrDueTime: row.low_to_high_time ?? undefined,
    editionPhotographerDueDate: dbDateToIso(row.precheck_photographer_comments_date),
    editionPhotographerDueTime: row.precheck_photographer_comments_time ?? undefined,
    editionStudioDueDate: dbDateToIso(row.precheck_studio_final_edits_date),
    editionStudioDueTime: row.precheck_studio_final_edits_time ?? undefined,
    checkFinalsPhotographerDueDate: dbDateToIso(row.check_finals_photographer_check_date),
    checkFinalsPhotographerDueTime: row.check_finals_photographer_check_time ?? undefined,
  }
}

const DB_ROLE_TO_DOMAIN: Record<CollectionMemberRole, ParticipantRole | null> = {
  client: "client",
  noba: "producer",
  photographer: "photographer",
  agency: "agency",
  photo_lab: "lab",
  retouch_studio: "edition_studio",
  handprint_lab: "handprint_lab",
}

/** Build editPermissionByUserId from member rows using the can_edit column.
 *  Falls back to the legacy participant_edit_permissions JSON (migration 012) when
 *  can_edit is not present (pre-028 data). New members default to true. */
function editPermissionFromMembers(
  members: CollectionMember[],
  role: ParticipantRole,
  storedLegacy: Record<string, Record<string, boolean>>
): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  const legacyForRole = storedLegacy[role] ?? {}
  for (const m of members) {
    // Prefer the DB column; fall back to legacy JSON, then default true
    out[m.user_id] = (m as { can_edit?: boolean }).can_edit ?? legacyForRole[m.user_id] ?? true
  }
  return out
}

function buildParticipants(row: DbCollection, members: CollectionMember[]): CollectionParticipant[] {
  const storedLegacy =
    (row as { participant_edit_permissions?: Record<string, Record<string, boolean>> })
      .participant_edit_permissions ?? {}
  const byRole = new Map<CollectionMemberRole, CollectionMember[]>()
  for (const m of members) {
    const list = byRole.get(m.role) ?? []
    list.push(m)
    byRole.set(m.role, list)
  }
  const participants: CollectionParticipant[] = []
  if (row.client_id) {
    const clientMembers = byRole.get("client") ?? []
    const clientUserIds = clientMembers.map((m) => m.user_id)
    participants.push({
      role: "client",
      entityId: row.client_id,
      userIds: clientUserIds,
      editPermissionByUserId: editPermissionFromMembers(clientMembers, "client", storedLegacy),
    })
  }
  const producerMembers = byRole.get("noba") ?? []
  if (producerMembers.length > 0) {
    const producerUserIds = producerMembers.map((m) => m.user_id)
    participants.push({
      role: "producer",
      entityId: row.client_id ?? undefined,
      userIds: producerUserIds,
      editPermissionByUserId: editPermissionFromMembers(producerMembers, "producer", storedLegacy),
    })
  }
  // Photographer participant: create if photographer_id is set OR if photographer members exist
  // (self-photographer without agency may have entityId undefined → photographer_id is null,
  //  but the user is stored in collection_members with role "photographer").
  // When hasAgency: photographer = self-photographer only. Agency users must NOT appear in
  // photographer (they are separate). Exclude any user_id that is in agency from photographer.
  const hasAgency = row.photographer_collaborates_with_agency
  const agencyMembers = byRole.get("agency") ?? []
  const agencyUserIds = new Set(agencyMembers.map((m) => m.user_id))
  {
    const photoMembers = byRole.get("photographer") ?? []
    const photoUserIds = hasAgency
      ? photoMembers.map((m) => m.user_id).filter((uid) => !agencyUserIds.has(uid))
      : photoMembers.map((m) => m.user_id)
    const filteredPhotoMembers = hasAgency
      ? photoMembers.filter((m) => !agencyUserIds.has(m.user_id))
      : photoMembers
    if ((!hasAgency && row.photographer_id) || filteredPhotoMembers.length > 0) {
      participants.push({
        role: "photographer",
        entityId: hasAgency ? undefined : (row.photographer_id ?? undefined),
        userIds: photoUserIds,
        editPermissionByUserId: editPermissionFromMembers(filteredPhotoMembers, "photographer", storedLegacy),
      })
    }
  }
  if (hasAgency) {
    const agencyUserIdsArr = agencyMembers.map((m) => m.user_id)
    if (row.photographer_id || agencyMembers.length > 0) {
      participants.push({
        role: "agency",
        entityId: row.photographer_id ?? undefined,
        userIds: agencyUserIdsArr,
        editPermissionByUserId: editPermissionFromMembers(agencyMembers, "agency", storedLegacy),
      })
    }
  }
  if (row.lab_low_res_id) {
    const labMembers = byRole.get("photo_lab") ?? []
    const userIds = labMembers.map((m) => m.user_id)
    participants.push({
      role: "lab",
      entityId: row.lab_low_res_id,
      userIds,
      editPermissionByUserId: editPermissionFromMembers(labMembers, "lab", storedLegacy),
    })
  }
  if (row.edition_studio_id) {
    const editorMembers = byRole.get("retouch_studio") ?? []
    const userIds = editorMembers.map((m) => m.user_id)
    participants.push({
      role: "edition_studio",
      entityId: row.edition_studio_id,
      userIds,
      editPermissionByUserId: editPermissionFromMembers(editorMembers, "edition_studio", storedLegacy),
    })
  }
  if (row.hand_print_lab_id) {
    const printMembers = byRole.get("handprint_lab") ?? []
    const userIds = printMembers.map((m) => m.user_id)
    participants.push({
      role: "handprint_lab",
      entityId: row.hand_print_lab_id,
      userIds,
      editPermissionByUserId: editPermissionFromMembers(printMembers, "handprint_lab", storedLegacy),
    })
  }
  return participants
}

/**
 * Derives which creation blocks are complete based on filled config fields.
 * This allows the Edit button to work on previous steps when fetching from DB.
 */
export function deriveCompletedBlockIds(
  config: CollectionConfig,
  participants: CollectionParticipant[]
): CreationBlockId[] {
  const completed: CreationBlockId[] = []
  
  // Participants: check if required participants have entity IDs and users
  const hasClient = !!config.clientEntityId?.trim()
  const photographer = participants.find(p => p.role === "photographer")
  const hasPhotographer = (photographer?.userIds?.length ?? 0) > 0
  const producer = participants.find(p => p.role === "producer")
  const hasProducer = (producer?.userIds?.length ?? 0) > 0
  
  if (hasClient && hasPhotographer && hasProducer) {
    // Also check optional participants based on config
    let participantsComplete = true
    if (config.hasAgency) {
      const agency = participants.find(p => p.role === "agency")
      if (!(agency?.entityId?.trim()) || (agency?.userIds?.length ?? 0) === 0) {
        participantsComplete = false
      }
    }
    if (config.hasHandprint) {
      const lab = participants.find(p => p.role === "lab")
      if (!(lab?.entityId?.trim()) || (lab?.userIds?.length ?? 0) === 0) participantsComplete = false
    }
    if (config.hasHandprint && config.handprintIsDifferentLab) {
      const handprintLab = participants.find(p => p.role === "handprint_lab")
      if (!(handprintLab?.entityId?.trim()) || (handprintLab?.userIds?.length ?? 0) === 0) participantsComplete = false
    }
    if (config.hasEditionStudio) {
      const editionStudio = participants.find(p => p.role === "edition_studio")
      if (!(editionStudio?.entityId?.trim()) || (editionStudio?.userIds?.length ?? 0) === 0) participantsComplete = false
    }
    if (participantsComplete) {
      completed.push("participants")
    }
  }
  
  // Shooting setup: needs start date, end date, and location
  const hasShootingSetup = 
    !!config.shootingStartDate?.trim() &&
    !!config.shootingEndDate?.trim() &&
    (!!config.shootingCity?.trim() || !!config.shootingCountry?.trim())
  if (hasShootingSetup) {
    completed.push("shooting_setup")
  }
  
  // Drop-off plan: needs shipping date and delivery date
  const hasDropoffPlan = 
    !!config.dropoff_shipping_date?.trim() &&
    !!config.dropoff_delivery_date?.trim()
  if (hasDropoffPlan) {
    completed.push("dropoff_plan")
  }
  
  // Low-res config: needs deadline date
  const hasLowResConfig = !!config.lowResScanDeadlineDate?.trim()
  if (hasLowResConfig) {
    completed.push("low_res_config")
  }
  
  // Photo selection: needs both photographer and client due dates
  const hasPhotoSelection = 
    !!config.photoSelectionPhotographerDueDate?.trim() &&
    !!config.photoSelectionClientDueDate?.trim()
  if (hasPhotoSelection) {
    completed.push("photo_selection")
    completed.push("photographer_selection_config")
    completed.push("client_selection_config")
  }

  // LR to HR setup: needs due date. Hand print block also includes photographer check form (both required).
  const hasLrToHrSetup = !!config.lrToHrDueDate?.trim()
  const hasPhotographerCheck =
    !!config.photographerCheckDueDate?.trim() && !!config.photographerCheckDueTime?.trim()
  if (config.hasHandprint) {
    if (hasPhotographerCheck && hasLrToHrSetup) {
      completed.push("handprint_high_res_config")
    }
  } else if (hasLrToHrSetup) {
    completed.push("lr_to_hr_setup")
  }
  
  // Edition config: needs both photographer and studio due dates
  const hasEditionConfig = 
    !!config.editionPhotographerDueDate?.trim() &&
    !!config.editionStudioDueDate?.trim()
  if (hasEditionConfig) {
    completed.push("edition_config")
  }
  
  // Check finals: client deadline always; photographer date/time only when that block is shown (not digital-only without edition)
  const isPhotographerCheckRedundant = !config.hasHandprint && !config.hasEditionStudio
  const hasCheckFinalsClient =
    !!config.clientFinalsDeadline?.trim() && !!config.clientFinalsDeadlineTime?.trim()
  const hasCheckFinals =
    hasCheckFinalsClient &&
    (isPhotographerCheckRedundant ||
      (!!config.checkFinalsPhotographerDueDate?.trim() &&
        !!config.checkFinalsPhotographerDueTime?.trim()))
  if (hasCheckFinals) {
    completed.push("check_finals")
  }
  
  return completed
}

/** Map DB collection + members → domain Collection (collections-logic §5.3, §6). */
export function mapDbCollectionToDomain(
  row: DbCollection,
  members: CollectionMember[] = []
): DomainCollection {
  const config = dbRowToConfig(row, members)
  const participants = buildParticipants(row, members)
  const completedBlockIds = deriveCompletedBlockIds(config, participants)
  const creationData: CreationData = { completedBlockIds }
  const status = row.status as DomainCollection["status"]
  const publishedAt = row.published_at ?? undefined
  const substatus =
    (row as { substatus?: string | null }).substatus?.trim() || undefined

  // URL arrays (JSONB — migration 034)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = row as any
  const lowresSelectionUrl = parseJsonbStringArray(r.lowres_selection_url)
  const lowresSelectionUploadedAt = (r.lowres_selection_uploaded_at as string | null) ?? null
  const photographerSelectionUrl = parseJsonbStringArray(r.photographer_selection_url)
  const photographerSelectionUploadedAt = (r.photographer_selection_uploaded_at as string | null) ?? null
  const clientSelectionUrl = parseJsonbStringArray(r.client_selection_url)
  const clientSelectionUploadedAt = (r.client_selection_uploaded_at as string | null) ?? null
  const highresSelectionUrl = parseJsonbStringArray(r.highres_selection_url)
  const highresSelectionUploadedAt = (r.highres_selection_uploaded_at as string | null) ?? null
  const editionInstructionsUrl = parseJsonbStringArray(r.edition_instructions_url)
  const editionInstructionsUploadedAt = (r.edition_instructions_uploaded_at as string | null) ?? null
  const finalsSelectionUrl = parseJsonbStringArray(r.finals_selection_url)
  const finalsSelectionUploadedAt = (r.finals_selection_uploaded_at as string | null) ?? null
  // Step notes conversations (JSONB arrays — migration 034)
  const stepNotesLowRes = parseJsonbNoteArray(r.step_notes_low_res)
  const stepNotesPhotographerSelection = parseJsonbNoteArray(r.step_notes_photographer_selection)
  const stepNotesClientSelection = parseJsonbNoteArray(r.step_notes_client_selection)
  const stepNotesPhotographerReview = parseJsonbNoteArray(r.step_notes_photographer_review)
  const stepNotesHighRes = parseJsonbNoteArray(r.step_notes_high_res)
  const stepNotesEditionRequest = parseJsonbNoteArray(r.step_notes_edition_request)
  const stepNotesFinalEdits = parseJsonbNoteArray(r.step_notes_final_edits)
  const stepNotesPhotographerLastCheck = parseJsonbNoteArray(r.step_notes_photographer_last_check)
  const stepNotesClientConfirmation = parseJsonbNoteArray(r.step_notes_client_confirmation)
  // Step statuses (migration 032)
  const rawStepStatuses = (row as { step_statuses?: Record<string, { stage: string; health: string | null }> | null }).step_statuses
  const stepStatuses = rawStepStatuses && typeof rawStepStatuses === "object" ? rawStepStatuses : undefined
  const completionPercentage = (row as { completion_percentage?: number | null }).completion_percentage ?? 0
  const currentOwners = parseCurrentOwners((row as { current_owners?: unknown }).current_owners)
  return {
    id: row.id,
    status,
    substatus: status === "in_progress" ? (substatus as DomainCollection["substatus"]) : undefined,
    stepStatuses,
    completionPercentage,
    currentOwners: currentOwners.length > 0 ? currentOwners : undefined,
    config,
    participants,
    creationData,
    updatedAt: row.updated_at,
    publishedAt,
    lowResSelectionUrl: lowresSelectionUrl.length > 0 ? lowresSelectionUrl : undefined,
    lowResSelectionUploadedAt: lowresSelectionUploadedAt ?? undefined,
    photographerSelectionUrl: photographerSelectionUrl.length > 0 ? photographerSelectionUrl : undefined,
    photographerSelectionUploadedAt: photographerSelectionUploadedAt ?? undefined,
    clientSelectionUrl: clientSelectionUrl.length > 0 ? clientSelectionUrl : undefined,
    clientSelectionUploadedAt: clientSelectionUploadedAt ?? undefined,
    highResSelectionUrl: highresSelectionUrl.length > 0 ? highresSelectionUrl : undefined,
    highResSelectionUploadedAt: highresSelectionUploadedAt ?? undefined,
    editionInstructionsUrl: editionInstructionsUrl.length > 0 ? editionInstructionsUrl : undefined,
    editionInstructionsUploadedAt: editionInstructionsUploadedAt ?? undefined,
    finalsSelectionUrl: finalsSelectionUrl.length > 0 ? finalsSelectionUrl : undefined,
    finalsSelectionUploadedAt: finalsSelectionUploadedAt ?? undefined,
    stepNotesLowRes: stepNotesLowRes.length > 0 ? stepNotesLowRes : undefined,
    stepNotesPhotographerSelection: stepNotesPhotographerSelection.length > 0 ? stepNotesPhotographerSelection : undefined,
    stepNotesClientSelection: stepNotesClientSelection.length > 0 ? stepNotesClientSelection : undefined,
    stepNotesPhotographerReview: stepNotesPhotographerReview.length > 0 ? stepNotesPhotographerReview : undefined,
    stepNotesHighRes: stepNotesHighRes.length > 0 ? stepNotesHighRes : undefined,
    stepNotesEditionRequest: stepNotesEditionRequest.length > 0 ? stepNotesEditionRequest : undefined,
    stepNotesFinalEdits: stepNotesFinalEdits.length > 0 ? stepNotesFinalEdits : undefined,
    stepNotesPhotographerLastCheck: stepNotesPhotographerLastCheck.length > 0 ? stepNotesPhotographerLastCheck : undefined,
    stepNotesClientConfirmation: stepNotesClientConfirmation.length > 0 ? stepNotesClientConfirmation : undefined,
  }
}

const DOMAIN_ROLE_TO_DB: Record<ParticipantRole, CollectionMemberRole> = {
  producer: "noba",
  client: "client",
  photographer: "photographer",
  agency: "agency",
  lab: "photo_lab",
  handprint_lab: "handprint_lab",
  edition_studio: "retouch_studio",
}

/** Domain → DB insert */
export function mapDomainToDbInsert(c: DomainCollection): CollectionInsert {
  const conf = c.config
  const photographerParticipant = c.participants.find((p) => p.role === "photographer")
  const agencyParticipant = c.participants.find((p) => p.role === "agency")
  const photographerId = conf.hasAgency
    ? agencyParticipant?.entityId
    : photographerParticipant?.entityId
  const labId = c.participants.find((p) => p.role === "lab")?.entityId
  const editionStudioId = c.participants.find((p) => p.role === "edition_studio")?.entityId
  const handprintLabId = c.participants.find((p) => p.role === "handprint_lab")?.entityId
  return {
    id: c.id,
    client_id: conf.clientEntityId,
    name: conf.name,
    reference: conf.reference ?? null,
    project_deadline: isoToDbDate(conf.clientFinalsDeadline),
    project_deadline_time: conf.clientFinalsDeadlineTime ?? null,
    publishing_date: isoToDbDate(conf.publishingDate),
    publishing_time: conf.publishingTime ?? null,
    low_res_to_high_res_digital: conf.hasLowResLab,
    low_res_to_high_res_hand_print: conf.hasHandprint,
    photographer_request_edition: conf.hasEditionStudio,
    photographer_collaborates_with_agency: conf.hasAgency,
    handprint_different_from_original_lab: conf.handprintIsDifferentLab,
    photographer_id: photographerId ?? null,
    lab_low_res_id: labId ?? null,
    edition_studio_id: editionStudioId ?? null,
    hand_print_lab_id: handprintLabId ?? null,
    shooting_start_date: isoToDbDate(conf.shootingStartDate),
    shooting_start_time: conf.shootingStartTime ?? null,
    shooting_end_date: isoToDbDate(conf.shootingEndDate),
    shooting_end_time: conf.shootingEndTime ?? null,
    shooting_street_address: conf.shootingStreetAddress ?? null,
    shooting_zip_code: conf.shootingZipCode ?? null,
    shooting_city: conf.shootingCity ?? null,
    shooting_country: conf.shootingCountry ?? null,
    dropoff_shipping_origin_address: conf.dropoff_shipping_origin_address ?? null,
    dropoff_shipping_date: isoToDbDate(conf.dropoff_shipping_date),
    dropoff_shipping_time: conf.dropoff_shipping_time ?? null,
    dropoff_shipping_destination_address: conf.dropoff_shipping_destination_address ?? null,
    dropoff_delivery_date: isoToDbDate(conf.dropoff_delivery_date),
    dropoff_delivery_time: conf.dropoff_delivery_time ?? null,
    dropoff_managing_shipping: conf.dropoff_managing_shipping ?? null,
    dropoff_shipping_carrier: conf.dropoff_shipping_carrier ?? null,
    dropoff_shipping_tracking: conf.dropoff_shipping_tracking ?? null,
    lowres_deadline_date: isoToDbDate(conf.lowResScanDeadlineDate),
    lowres_deadline_time: conf.lowResScanDeadlineTime ?? null,
    lowres_shipping_origin_address: conf.lowResShippingOriginAddress ?? null,
    lowres_shipping_date: isoToDbDate(conf.lowResShippingPickupDate),
    lowres_shipping_time: conf.lowResShippingPickupTime ?? null,
    lowres_shipping_destination_address: conf.lowResShippingDestinationAddress ?? null,
    lowres_delivery_date: isoToDbDate(conf.lowResShippingDeliveryDate),
    lowres_delivery_time: conf.lowResShippingDeliveryTime ?? null,
    lowres_managing_shipping: conf.lowResShippingManaging ?? null,
    lowres_shipping_carrier: conf.lowResShippingProvider ?? null,
    lowres_shipping_tracking: conf.lowResShippingTracking ?? null,
    photo_selection_photographer_preselection_date: isoToDbDate(conf.photoSelectionPhotographerDueDate),
    photo_selection_photographer_preselection_time: conf.photoSelectionPhotographerDueTime ?? null,
    photo_selection_client_selection_date: isoToDbDate(conf.photoSelectionClientDueDate),
    photo_selection_client_selection_time: conf.photoSelectionClientDueTime ?? null,
    // Omit photographer_check_due_date/time on INSERT so create works when migration 018 is not yet
    // applied or PostgREST schema cache is stale. They are set on first UPDATE (e.g. when saving the step).
    // photographer_check_due_date: isoToDbDate(conf.photographerCheckDueDate),
    // photographer_check_due_time: conf.photographerCheckDueTime ?? null,
    low_to_high_date: isoToDbDate(conf.lrToHrDueDate),
    low_to_high_time: conf.lrToHrDueTime ?? null,
    precheck_photographer_comments_date: isoToDbDate(conf.editionPhotographerDueDate),
    precheck_photographer_comments_time: conf.editionPhotographerDueTime ?? null,
    precheck_studio_final_edits_date: isoToDbDate(conf.editionStudioDueDate),
    precheck_studio_final_edits_time: conf.editionStudioDueTime ?? null,
    check_finals_photographer_check_date: isoToDbDate(conf.checkFinalsPhotographerDueDate),
    check_finals_photographer_check_time: conf.checkFinalsPhotographerDueTime ?? null,
    status: c.status ?? "draft",
    published_at: c.publishedAt ?? null,
    substatus: c.substatus ?? null,
    // Do not send noba_user_ids, noba_edit_permission_by_user_id, participant_edit_permissions
    // on INSERT so creation works when migrations 011/012 are not applied or schema cache is stale.
    // If those columns exist, the DB will use their DEFAULTs ([] and {}).
  }
}

/** Domain patch → DB update (partial). */
export function mapDomainPatchToDbUpdate(
  patch: {
    config?: Partial<CollectionConfig>
    participants?: CollectionParticipant[]
    status?: import("@/lib/domain/collections").CollectionStatus
    publishedAt?: string
    substatus?: import("@/lib/domain/collections").CollectionSubstatus | null
    stepStatuses?: Record<string, { stage: string; health: string | null }>
    completionPercentage?: number
    currentOwners?: import("@/lib/domain/collections").CurrentOwnerRole[]
    // URL arrays (JSONB)
    lowResSelectionUrl?: string[]
    lowResSelectionUploadedAt?: string
    photographerSelectionUrl?: string[]
    photographerSelectionUploadedAt?: string
    clientSelectionUrl?: string[]
    clientSelectionUploadedAt?: string
    highResSelectionUrl?: string[]
    highResSelectionUploadedAt?: string
    editionInstructionsUrl?: string[]
    editionInstructionsUploadedAt?: string
    finalsSelectionUrl?: string[]
    finalsSelectionUploadedAt?: string
    // Step notes conversations (JSONB arrays)
    stepNotesLowRes?: StepNoteEntry[]
    stepNotesPhotographerSelection?: StepNoteEntry[]
    stepNotesClientSelection?: StepNoteEntry[]
    stepNotesPhotographerReview?: StepNoteEntry[]
    stepNotesHighRes?: StepNoteEntry[]
    stepNotesEditionRequest?: StepNoteEntry[]
    stepNotesFinalEdits?: StepNoteEntry[]
    stepNotesPhotographerLastCheck?: StepNoteEntry[]
    stepNotesClientConfirmation?: StepNoteEntry[]
  }
): CollectionUpdate {
  const u: CollectionUpdate = {}
  if (patch.status !== undefined) {
    u.status = patch.status
    // DB constraint: substatus must be NULL when status != in_progress
    if (patch.status !== "in_progress") u.substatus = null
  }
  if (patch.publishedAt !== undefined) u.published_at = patch.publishedAt ?? null
  if (patch.substatus !== undefined) u.substatus = patch.substatus ?? null
  if (patch.stepStatuses !== undefined) u.step_statuses = patch.stepStatuses
  if (patch.completionPercentage !== undefined) u.completion_percentage = patch.completionPercentage
  if (patch.currentOwners !== undefined) u.current_owners = patch.currentOwners as CollectionMemberRole[]
  // URL arrays
  if (patch.lowResSelectionUrl !== undefined) u.lowres_selection_url = patch.lowResSelectionUrl
  if (patch.lowResSelectionUploadedAt !== undefined) u.lowres_selection_uploaded_at = patch.lowResSelectionUploadedAt ?? null
  if (patch.photographerSelectionUrl !== undefined) u.photographer_selection_url = patch.photographerSelectionUrl
  if (patch.photographerSelectionUploadedAt !== undefined) u.photographer_selection_uploaded_at = patch.photographerSelectionUploadedAt ?? null
  if (patch.clientSelectionUrl !== undefined) u.client_selection_url = patch.clientSelectionUrl
  if (patch.clientSelectionUploadedAt !== undefined) u.client_selection_uploaded_at = patch.clientSelectionUploadedAt ?? null
  if (patch.highResSelectionUrl !== undefined) u.highres_selection_url = patch.highResSelectionUrl
  if (patch.highResSelectionUploadedAt !== undefined) u.highres_selection_uploaded_at = patch.highResSelectionUploadedAt ?? null
  if (patch.editionInstructionsUrl !== undefined) u.edition_instructions_url = patch.editionInstructionsUrl
  if (patch.editionInstructionsUploadedAt !== undefined) u.edition_instructions_uploaded_at = patch.editionInstructionsUploadedAt ?? null
  if (patch.finalsSelectionUrl !== undefined) u.finals_selection_url = patch.finalsSelectionUrl
  if (patch.finalsSelectionUploadedAt !== undefined) u.finals_selection_uploaded_at = patch.finalsSelectionUploadedAt ?? null
  // Step notes conversations
  if (patch.stepNotesLowRes !== undefined) u.step_notes_low_res = patch.stepNotesLowRes
  if (patch.stepNotesPhotographerSelection !== undefined) u.step_notes_photographer_selection = patch.stepNotesPhotographerSelection
  if (patch.stepNotesClientSelection !== undefined) u.step_notes_client_selection = patch.stepNotesClientSelection
  if (patch.stepNotesPhotographerReview !== undefined) u.step_notes_photographer_review = patch.stepNotesPhotographerReview
  if (patch.stepNotesHighRes !== undefined) u.step_notes_high_res = patch.stepNotesHighRes
  if (patch.stepNotesEditionRequest !== undefined) u.step_notes_edition_request = patch.stepNotesEditionRequest
  if (patch.stepNotesFinalEdits !== undefined) u.step_notes_final_edits = patch.stepNotesFinalEdits
  if (patch.stepNotesPhotographerLastCheck !== undefined) u.step_notes_photographer_last_check = patch.stepNotesPhotographerLastCheck
  if (patch.stepNotesClientConfirmation !== undefined) u.step_notes_client_confirmation = patch.stepNotesClientConfirmation
  const conf = patch.config
  if (conf) {
    if (conf.clientEntityId !== undefined) u.client_id = conf.clientEntityId
    if (conf.name !== undefined) u.name = conf.name
    if (conf.reference !== undefined) u.reference = conf.reference ?? null
    if (conf.clientFinalsDeadline !== undefined) u.project_deadline = isoToDbDate(conf.clientFinalsDeadline)
    if (conf.clientFinalsDeadlineTime !== undefined) u.project_deadline_time = conf.clientFinalsDeadlineTime ?? null
    if (conf.publishingDate !== undefined) u.publishing_date = isoToDbDate(conf.publishingDate)
    if (conf.publishingTime !== undefined) u.publishing_time = conf.publishingTime ?? null
    if (conf.hasLowResLab !== undefined) u.low_res_to_high_res_digital = conf.hasLowResLab
    if (conf.hasHandprint !== undefined) u.low_res_to_high_res_hand_print = conf.hasHandprint
    if (conf.hasEditionStudio !== undefined) u.photographer_request_edition = conf.hasEditionStudio
    if (conf.hasAgency !== undefined) u.photographer_collaborates_with_agency = conf.hasAgency
    if (conf.handprintIsDifferentLab !== undefined) u.handprint_different_from_original_lab = conf.handprintIsDifferentLab
    if (conf.shootingStartDate !== undefined) u.shooting_start_date = isoToDbDate(conf.shootingStartDate)
    if (conf.shootingStartTime !== undefined) u.shooting_start_time = conf.shootingStartTime ?? null
    if (conf.shootingEndDate !== undefined) u.shooting_end_date = isoToDbDate(conf.shootingEndDate)
    if (conf.shootingEndTime !== undefined) u.shooting_end_time = conf.shootingEndTime ?? null
    if (conf.shootingStreetAddress !== undefined) u.shooting_street_address = conf.shootingStreetAddress ?? null
    if (conf.shootingZipCode !== undefined) u.shooting_zip_code = conf.shootingZipCode ?? null
    if (conf.shootingCity !== undefined) u.shooting_city = conf.shootingCity ?? null
    if (conf.shootingCountry !== undefined) u.shooting_country = conf.shootingCountry ?? null
    if (conf.dropoff_shipping_origin_address !== undefined) u.dropoff_shipping_origin_address = conf.dropoff_shipping_origin_address ?? null
    if (conf.dropoff_shipping_date !== undefined) u.dropoff_shipping_date = isoToDbDate(conf.dropoff_shipping_date)
    if (conf.dropoff_shipping_time !== undefined) u.dropoff_shipping_time = conf.dropoff_shipping_time ?? null
    if (conf.dropoff_shipping_destination_address !== undefined) u.dropoff_shipping_destination_address = conf.dropoff_shipping_destination_address ?? null
    if (conf.dropoff_delivery_date !== undefined) u.dropoff_delivery_date = isoToDbDate(conf.dropoff_delivery_date)
    if (conf.dropoff_delivery_time !== undefined) u.dropoff_delivery_time = conf.dropoff_delivery_time ?? null
    if (conf.dropoff_managing_shipping !== undefined) u.dropoff_managing_shipping = conf.dropoff_managing_shipping ?? null
    if (conf.dropoff_shipping_carrier !== undefined) u.dropoff_shipping_carrier = conf.dropoff_shipping_carrier ?? null
    if (conf.dropoff_shipping_tracking !== undefined) u.dropoff_shipping_tracking = conf.dropoff_shipping_tracking ?? null
    if (conf.lowResScanDeadlineDate !== undefined) u.lowres_deadline_date = isoToDbDate(conf.lowResScanDeadlineDate)
    if (conf.lowResScanDeadlineTime !== undefined) u.lowres_deadline_time = conf.lowResScanDeadlineTime ?? null
    if (conf.lowResShippingOriginAddress !== undefined) u.lowres_shipping_origin_address = conf.lowResShippingOriginAddress ?? null
    if (conf.lowResShippingPickupDate !== undefined) u.lowres_shipping_date = isoToDbDate(conf.lowResShippingPickupDate)
    if (conf.lowResShippingPickupTime !== undefined) u.lowres_shipping_time = conf.lowResShippingPickupTime ?? null
    if (conf.lowResShippingDestinationAddress !== undefined) u.lowres_shipping_destination_address = conf.lowResShippingDestinationAddress ?? null
    if (conf.lowResShippingDeliveryDate !== undefined) u.lowres_delivery_date = isoToDbDate(conf.lowResShippingDeliveryDate)
    if (conf.lowResShippingDeliveryTime !== undefined) u.lowres_delivery_time = conf.lowResShippingDeliveryTime ?? null
    if (conf.lowResShippingManaging !== undefined) u.lowres_managing_shipping = conf.lowResShippingManaging ?? null
    if (conf.lowResShippingProvider !== undefined) u.lowres_shipping_carrier = conf.lowResShippingProvider ?? null
    if (conf.lowResShippingTracking !== undefined) u.lowres_shipping_tracking = conf.lowResShippingTracking ?? null
    if (conf.photoSelectionPhotographerDueDate !== undefined) u.photo_selection_photographer_preselection_date = isoToDbDate(conf.photoSelectionPhotographerDueDate)
    if (conf.photoSelectionPhotographerDueTime !== undefined) u.photo_selection_photographer_preselection_time = conf.photoSelectionPhotographerDueTime ?? null
    if (conf.photoSelectionClientDueDate !== undefined) u.photo_selection_client_selection_date = isoToDbDate(conf.photoSelectionClientDueDate)
    if (conf.photoSelectionClientDueTime !== undefined) u.photo_selection_client_selection_time = conf.photoSelectionClientDueTime ?? null
    if (conf.photographerCheckDueDate !== undefined) u.photographer_check_due_date = isoToDbDate(conf.photographerCheckDueDate)
    if (conf.photographerCheckDueTime !== undefined) u.photographer_check_due_time = conf.photographerCheckDueTime ?? null
    if (conf.lrToHrDueDate !== undefined) u.low_to_high_date = isoToDbDate(conf.lrToHrDueDate)
    if (conf.lrToHrDueTime !== undefined) u.low_to_high_time = conf.lrToHrDueTime ?? null
    if (conf.editionPhotographerDueDate !== undefined) u.precheck_photographer_comments_date = isoToDbDate(conf.editionPhotographerDueDate)
    if (conf.editionPhotographerDueTime !== undefined) u.precheck_photographer_comments_time = conf.editionPhotographerDueTime ?? null
    if (conf.editionStudioDueDate !== undefined) u.precheck_studio_final_edits_date = isoToDbDate(conf.editionStudioDueDate)
    if (conf.editionStudioDueTime !== undefined) u.precheck_studio_final_edits_time = conf.editionStudioDueTime ?? null
    if (conf.checkFinalsPhotographerDueDate !== undefined) u.check_finals_photographer_check_date = isoToDbDate(conf.checkFinalsPhotographerDueDate)
    if (conf.checkFinalsPhotographerDueTime !== undefined) u.check_finals_photographer_check_time = conf.checkFinalsPhotographerDueTime ?? null
    // Omit noba_user_ids / noba_edit_permission_by_user_id so update succeeds when migration 011
    // is not applied or schema cache is stale. Noba members are persisted via collection_members
    // (patch.participants); when loading we derive config from producer members in dbRowToConfig.
    // if (conf.nobaUserIds !== undefined) u.noba_user_ids = conf.nobaUserIds
    // if (conf.nobaEditPermissionByUserId !== undefined) u.noba_edit_permission_by_user_id = conf.nobaEditPermissionByUserId
  }
  if (patch.participants) {
    const photographerParticipant = patch.participants.find((p) => p.role === "photographer")
    const agencyParticipant = patch.participants.find((p) => p.role === "agency")
    const useAgencyRole =
      patch.config?.hasAgency ?? patch.participants.some((p) => p.role === "agency")
    const photographerId = useAgencyRole
      ? agencyParticipant?.entityId
      : photographerParticipant?.entityId
    const labId = patch.participants.find((p) => p.role === "lab")?.entityId
    const editionStudioId = patch.participants.find((p) => p.role === "edition_studio")?.entityId
    const handprintLabId = patch.participants.find((p) => p.role === "handprint_lab")?.entityId
    u.photographer_id = photographerId ?? null
    u.lab_low_res_id = labId ?? null
    u.edition_studio_id = editionStudioId ?? null
    u.hand_print_lab_id = handprintLabId ?? null
    // Edit permissions are persisted via can_edit on collection_members (migration 028).
    // The legacy participant_edit_permissions JSON column (migration 012) is NOT used
    // because migration 012 may not be applied on the remote DB.
  }
  u.updated_at = new Date().toISOString()
  return u
}

/** Build collection_members inserts from domain participants. */
export function mapParticipantsToDbMembers(
  collectionId: string,
  participants: CollectionParticipant[],
  ownerUserId?: string
): CollectionMemberInsert[] {
  // Use a Set to deduplicate by (user_id, role)
  const seen = new Set<string>()
  const out: CollectionMemberInsert[] = []
  const agencyParticipant = participants.find((p) => p.role === "agency")
  const agencyUserIds = new Set(agencyParticipant?.userIds ?? [])

  for (const p of participants) {
    const dbRole = DOMAIN_ROLE_TO_DB[p.role]
    for (const userId of p.userIds ?? []) {
      // When agency exists: never create photographer rows for agency users (they are separate).
      if (dbRole === "photographer" && agencyUserIds.has(userId)) continue
      const key = `${userId}:${dbRole}`
      if (!seen.has(key)) {
        seen.add(key)
        const isOwner = dbRole === "noba" && userId === ownerUserId
        // can_edit: read from editPermissionByUserId; default true for new members
        const canEdit = p.editPermissionByUserId?.[userId] ?? true
        out.push({ collection_id: collectionId, user_id: userId, role: dbRole, is_owner: isOwner, can_edit: canEdit })
      }
    }
  }
  return out
}
