/**
 * Collection Mappers — domain ↔ Supabase DB.
 * DB has no status/published_at columns; domain defaults to "draft".
 */

import type {
  Collection as DomainCollection,
  CollectionConfig,
  CollectionParticipant,
  CreationBlockId,
  CreationData,
  ParticipantRole,
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

/** DB → Domain: build config from flat DB row */
function dbRowToConfig(row: DbCollection, members: CollectionMember[]): CollectionConfig {
  const managerUserId =
    members.find((m) => m.role === "manager")?.user_id ?? ""
  const ownerMember = members.find((m) => m.role === "producer" && (m as { is_owner?: boolean }).is_owner === true)
  const ownerUserId =
    ownerMember?.user_id ?? members.find((m) => m.role === "producer")?.user_id ?? undefined
  const producerMembers = members.filter((m) => m.role === "producer")
  const producerUserIds = producerMembers.map((m) => m.user_id)
  const rowNobaUserIds = Array.isArray((row as { noba_user_ids?: unknown }).noba_user_ids)
    ? (row as { noba_user_ids: string[] }).noba_user_ids
    : null
  const rowNobaEdit = (row as { noba_edit_permission_by_user_id?: unknown }).noba_edit_permission_by_user_id
  const storedEdit = (row as { participant_edit_permissions?: Record<string, Record<string, boolean>> }).participant_edit_permissions
  return {
    name: row.name,
    reference: row.reference ?? undefined,
    clientEntityId: row.client_id,
    managerUserId,
    ownerUserId,
    nobaUserIds: rowNobaUserIds ?? (producerUserIds.length > 0 ? producerUserIds : undefined),
    nobaEditPermissionByUserId:
      rowNobaEdit != null && typeof rowNobaEdit === "object"
        ? (rowNobaEdit as Record<string, boolean>)
        : (storedEdit?.producer != null && typeof storedEdit.producer === "object"
          ? storedEdit.producer
          : undefined),
    hasAgency: row.photographer_collaborates_with_agency,
    hasLowResLab: row.low_res_to_high_res_digital,
    hasHandprint: row.low_res_to_high_res_hand_print,
    handprintIsDifferentLab: row.handprint_different_from_original_lab,
    hasEditionStudio: row.photographer_request_edition,
    clientFinalsDeadline: dbDateToIso(row.project_deadline),
    clientFinalsDeadlineTime: row.project_deadline_time ?? undefined,
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
  manager: "client",
  producer: "producer",
  photographer: "photographer",
  lab_technician: "lab",
  editor: "edition_studio",
  print_technician: "handprint_lab",
}

/** Stored edit permissions: role -> userId -> boolean. New users default to true. */
function getEditPermissionByUserId(
  role: ParticipantRole,
  userIds: string[],
  stored: Record<string, Record<string, boolean>>
): Record<string, boolean> {
  const forRole = stored[role] ?? {}
  return Object.fromEntries(userIds.map((uid) => [uid, forRole[uid] ?? true]))
}

function buildParticipants(row: DbCollection, members: CollectionMember[]): CollectionParticipant[] {
  const storedEdit =
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
    const clientMembers = byRole.get("manager") ?? []
    const clientUserIds = clientMembers.map((m) => m.user_id)
    participants.push({
      role: "client",
      entityId: row.client_id,
      userIds: clientUserIds,
      editPermissionByUserId: getEditPermissionByUserId("client", clientUserIds, storedEdit),
    })
  }
  const producerMembers = byRole.get("producer") ?? []
  if (producerMembers.length > 0) {
    const producerUserIds = producerMembers.map((m) => m.user_id)
    const editPermissionByUserId = getEditPermissionByUserId("producer", producerUserIds, storedEdit)
    participants.push({
      role: "producer",
      entityId: row.client_id ?? undefined,
      userIds: producerUserIds,
      editPermissionByUserId,
    })
  }
  if (row.photographer_id) {
    const photoMembers = byRole.get("photographer") ?? []
    const userIds = photoMembers.map((m) => m.user_id)
    participants.push({
      role: "photographer",
      entityId: row.photographer_id,
      userIds,
      editPermissionByUserId: getEditPermissionByUserId("photographer", userIds, storedEdit),
    })
  }
  if (row.lab_low_res_id) {
    const labMembers = byRole.get("lab_technician") ?? []
    const userIds = labMembers.map((m) => m.user_id)
    participants.push({
      role: "lab",
      entityId: row.lab_low_res_id,
      userIds,
      editPermissionByUserId: getEditPermissionByUserId("lab", userIds, storedEdit),
    })
  }
  if (row.edition_studio_id) {
    const editorMembers = byRole.get("editor") ?? []
    const userIds = editorMembers.map((m) => m.user_id)
    participants.push({
      role: "edition_studio",
      entityId: row.edition_studio_id,
      userIds,
      editPermissionByUserId: getEditPermissionByUserId("edition_studio", userIds, storedEdit),
    })
  }
  if (row.hand_print_lab_id) {
    const printMembers = byRole.get("print_technician") ?? []
    const userIds = printMembers.map((m) => m.user_id)
    participants.push({
      role: "handprint_lab",
      entityId: row.hand_print_lab_id,
      userIds,
      editPermissionByUserId: getEditPermissionByUserId("handprint_lab", userIds, storedEdit),
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
    if (config.hasHandprint) {
      const lab = participants.find(p => p.role === "lab")
      if (!(lab?.entityId?.trim())) participantsComplete = false
    }
    if (config.hasHandprint && config.handprintIsDifferentLab) {
      const handprintLab = participants.find(p => p.role === "handprint_lab")
      if (!(handprintLab?.entityId?.trim())) participantsComplete = false
    }
    if (config.hasEditionStudio) {
      const editionStudio = participants.find(p => p.role === "edition_studio")
      if (!(editionStudio?.entityId?.trim())) participantsComplete = false
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
  
  // LR to HR setup: needs due date
  const hasLrToHrSetup = !!config.lrToHrDueDate?.trim()
  if (hasLrToHrSetup) {
    completed.push("lr_to_hr_setup")
    completed.push("handprint_high_res_config")
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
  const status = (row.status === "upcoming" || row.status === "in_progress")
    ? row.status
    : "draft"
  const publishedAt = row.published_at ?? undefined

  return {
    id: row.id,
    status,
    config,
    participants,
    creationData,
    updatedAt: row.updated_at,
    publishedAt,
  }
}

const DOMAIN_ROLE_TO_DB: Record<ParticipantRole, CollectionMemberRole> = {
  producer: "producer",
  client: "manager",
  photographer: "photographer",
  agency: "photographer",
  lab: "lab_technician",
  handprint_lab: "print_technician",
  edition_studio: "editor",
}

/** Domain → DB insert */
export function mapDomainToDbInsert(c: DomainCollection): CollectionInsert {
  const conf = c.config
  const photographerId = c.participants.find((p) => p.role === "photographer")?.entityId
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
  }
): CollectionUpdate {
  const u: CollectionUpdate = {}
  if (patch.status !== undefined) u.status = patch.status
  if (patch.publishedAt !== undefined) u.published_at = patch.publishedAt ?? null
  const conf = patch.config
  if (conf) {
    if (conf.clientEntityId !== undefined) u.client_id = conf.clientEntityId
    if (conf.name !== undefined) u.name = conf.name
    if (conf.reference !== undefined) u.reference = conf.reference ?? null
    if (conf.clientFinalsDeadline !== undefined) u.project_deadline = isoToDbDate(conf.clientFinalsDeadline)
    if (conf.clientFinalsDeadlineTime !== undefined) u.project_deadline_time = conf.clientFinalsDeadlineTime ?? null
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
    const photographerId = patch.participants.find((p) => p.role === "photographer")?.entityId
    const labId = patch.participants.find((p) => p.role === "lab")?.entityId
    const editionStudioId = patch.participants.find((p) => p.role === "edition_studio")?.entityId
    const handprintLabId = patch.participants.find((p) => p.role === "handprint_lab")?.entityId
    u.photographer_id = photographerId ?? null
    u.lab_low_res_id = labId ?? null
    u.edition_studio_id = editionStudioId ?? null
    u.hand_print_lab_id = handprintLabId ?? null
    // Omit participant_edit_permissions so UPDATE succeeds when migration 012 is not applied.
    // When 012 is applied, uncomment below to persist Edit permission switch.
    // const participant_edit_permissions: Record<string, Record<string, boolean>> = {}
    // for (const p of patch.participants) {
    //   if (p.editPermissionByUserId && Object.keys(p.editPermissionByUserId).length > 0) {
    //     participant_edit_permissions[p.role] = { ...p.editPermissionByUserId }
    //   }
    // }
    // u.participant_edit_permissions = participant_edit_permissions
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
  
  for (const p of participants) {
    const dbRole = DOMAIN_ROLE_TO_DB[p.role]
    for (const userId of p.userIds ?? []) {
      const key = `${userId}:${dbRole}`
      if (!seen.has(key)) {
        seen.add(key)
        const isOwner = dbRole === "producer" && userId === ownerUserId
        out.push({ collection_id: collectionId, user_id: userId, role: dbRole, is_owner: isOwner })
      }
    }
  }
  return out
}
