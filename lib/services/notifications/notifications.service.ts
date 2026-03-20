/**
 * Notifications Service Implementation
 * 
 * Handles both event-driven and time-based notifications for the production workflow.
 * Supports email (via Resend) and in-app notification delivery.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import type {
  INotificationsService,
  CollectionEventType,
  UserNotification,
} from "./notifications.interface"
import type { RecipientType } from "./notification-templates"
import {
  resolveRecipients,
  getCollectionContext,
  buildCtaUrl,
  formatNotificationTitle,
} from "./recipient-resolver"
import type { CollectionContext } from "./recipient-resolver"
import { sendNotificationEmail } from "@/lib/email/send-notification"
import {
  inferStepIdFromNotificationBody,
  inferStepIdFromNotificationCtaUrl,
  normalizeStepIdFromQuery,
} from "@/lib/notifications/navigation"

// Database type aliases
type NotificationTemplate = Database["public"]["Tables"]["notification_templates"]["Row"]
type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"]
type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"]
type CollectionEvent = Database["public"]["Tables"]["collection_events"]["Insert"]
type CollectionEventRow = Database["public"]["Tables"]["collection_events"]["Row"]
/** Result of select('*, notification_templates(*)') on scheduled_notification_tracking */
type ScheduledWithTemplate = Database["public"]["Tables"]["scheduled_notification_tracking"]["Row"] & {
  notification_templates: NotificationTemplate | null
}

interface DeadlineMapping {
  dateField: string
  timeField: string
}

/**
 * Maps trigger events to collection deadline fields
 */
const DEADLINE_FIELD_MAP: Record<string, DeadlineMapping> = {
  shooting_end: {
    dateField: "shooting_end_date",
    timeField: "shooting_end_time",
  },
  dropoff_deadline: {
    dateField: "dropoff_delivery_date",
    timeField: "dropoff_delivery_time",
  },
  scanning_deadline: {
    dateField: "lowres_deadline_date",
    timeField: "lowres_deadline_time",
  },
  photographer_selection_deadline: {
    dateField: "photo_selection_photographer_preselection_date",
    timeField: "photo_selection_photographer_preselection_time",
  },
  client_selection_deadline: {
    dateField: "photo_selection_client_selection_date",
    timeField: "photo_selection_client_selection_time",
  },
  highres_deadline: {
    dateField: "low_to_high_date",
    timeField: "low_to_high_time",
  },
  final_edits_deadline: {
    dateField: "precheck_studio_final_edits_date",
    timeField: "precheck_studio_final_edits_time",
  },
  photographer_check_deadline: {
    dateField: "photographer_check_due_date",
    timeField: "photographer_check_due_time",
  },
  photographer_review_deadline: {
    dateField: "check_finals_photographer_check_date",
    timeField: "check_finals_photographer_check_time",
  },
  project_deadline: {
    dateField: "project_deadline",
    timeField: "project_deadline_time",
  },
}

/**
 * Maps collection deadline fields to the *_deadline_missed event that should fire
 * when the deadline passes without the expected action being completed.
 * Format: [dateField, timeField, eventType]
 */
const DEADLINE_TO_MISSED_EVENT: [string, string, string][] = [
  ["dropoff_delivery_date", "dropoff_delivery_time", "dropoff_deadline_missed"],
  ["lowres_deadline_date", "lowres_deadline_time", "scanning_deadline_missed"],
  ["photo_selection_photographer_preselection_date", "photo_selection_photographer_preselection_time", "photographer_selection_deadline_missed"],
  ["photo_selection_client_selection_date", "photo_selection_client_selection_time", "client_selection_deadline_missed"],
  ["photographer_check_due_date", "photographer_check_due_time", "photographer_check_deadline_missed"],
  ["low_to_high_date", "low_to_high_time", "highres_deadline_missed"],
  ["precheck_studio_final_edits_date", "precheck_studio_final_edits_time", "final_edits_deadline_missed"],
  ["check_finals_photographer_check_date", "check_finals_photographer_check_time", "photographer_review_deadline_missed"],
]

/**
 * Maps missed-deadline event types to the minimum substatus that indicates
 * the associated step is already done. Used in detectAndFireMissedDeadlines
 * to avoid firing missed events for steps that have already been completed.
 */
const MISSED_EVENT_MIN_SUBSTATUS: Record<string, (typeof SUBSTATUS_ORDER)[number]> = {
  dropoff_deadline_missed: "low_res_scanning",
  scanning_deadline_missed: "photographer_selection",
  photographer_selection_deadline_missed: "client_selection",
  client_selection_deadline_missed: "low_res_to_high_res",
  photographer_check_deadline_missed: "low_res_to_high_res",
  highres_deadline_missed: "edition_request",
  final_edits_deadline_missed: "photographer_last_check",
  photographer_review_deadline_missed: "client_confirmation",
}

interface DeadlineMissedGuard {
  requiresAnyEvents?: CollectionEventType[]
  blocksIfAnyEvents?: CollectionEventType[]
}

/**
 * Guardrails for *_deadline_missed events.
 * Prevents firing "delayed" signals when the collection has not reached the
 * prerequisite workflow milestone yet.
 */
const DEADLINE_MISSED_GUARDS: Partial<Record<CollectionEventType, DeadlineMissedGuard>> = {
  dropoff_deadline_missed: {
    requiresAnyEvents: ["shooting_completed_confirmed", "negatives_pickup_marked", "shooting_ended"],
    blocksIfAnyEvents: ["dropoff_confirmed"],
  },
  scanning_deadline_missed: {
    requiresAnyEvents: ["dropoff_confirmed"],
    blocksIfAnyEvents: ["scanning_completed"],
  },
  photographer_selection_deadline_missed: {
    requiresAnyEvents: ["scanning_completed"],
    blocksIfAnyEvents: ["photographer_selection_uploaded"],
  },
  client_selection_deadline_missed: {
    requiresAnyEvents: ["photographer_selection_uploaded"],
    blocksIfAnyEvents: ["client_selection_confirmed"],
  },
  photographer_check_deadline_missed: {
    requiresAnyEvents: ["client_selection_confirmed"],
    blocksIfAnyEvents: ["photographer_check_approved"],
  },
  highres_deadline_missed: {
    requiresAnyEvents: ["photographer_check_approved"],
    blocksIfAnyEvents: ["highres_ready"],
  },
  final_edits_deadline_missed: {
    requiresAnyEvents: ["edition_request_submitted", "highres_ready"],
    blocksIfAnyEvents: ["final_edits_completed"],
  },
  photographer_review_deadline_missed: {
    requiresAnyEvents: ["final_edits_completed", "highres_ready"],
    blocksIfAnyEvents: ["photographer_edits_approved"],
  },
}

/**
 * Maps each step note key (from PATCH body) to the step info and all roles
 * that participate in that step's comment thread.
 * When a comment is added, ALL listed roles receive the notification
 * EXCEPT the user who wrote the comment.
 */
const STEP_NOTE_COMMENT_CONFIG: Record<
  string,
  {
    stepName: string
    step: number
    stepSlug: string
    recipients: RecipientType[]
  }
> = {
  step_note_low_res: {
    stepName: "Low-res scanning",
    step: 3,
    stepSlug: "low_res_scanning",
    recipients: ["photo_lab", "photographer"],
  },
  step_note_photographer_selection: {
    stepName: "Photographer selection",
    step: 4,
    stepSlug: "photographer_selection",
    recipients: ["photographer", "client"],
  },
  step_note_client_selection: {
    stepName: "Client selection",
    step: 5,
    stepSlug: "client_selection",
    recipients: ["client", "photographer"],
  },
  step_note_photographer_review: {
    stepName: "Photographer review",
    step: 6,
    stepSlug: "photographer_check",
    recipients: ["photographer", "handprint_lab"],
  },
  step_note_high_res: {
    stepName: "Low-res to high-res",
    step: 7,
    stepSlug: "handprint_high_res",
    recipients: ["handprint_lab", "photographer"],
  },
  step_note_edition_request: {
    stepName: "Retouch request",
    step: 8,
    stepSlug: "edition_request",
    recipients: ["photographer", "retouch_studio"],
  },
  step_note_final_edits: {
    stepName: "Final edits",
    step: 9,
    stepSlug: "final_edits",
    recipients: ["retouch_studio", "photographer"],
  },
  step_note_photographer_last_check: {
    stepName: "Photographer last check",
    step: 10,
    stepSlug: "photographer_last_check",
    recipients: ["photographer", "retouch_studio"],
  },
  step_note_client_confirmation: {
    stepName: "Client confirmation",
    step: 11,
    stepSlug: "client_confirmation",
    recipients: ["client"],
  },
}

/** Substatus order for "substatus >= X" comparison. Matches workflow.ts. */
const SUBSTATUS_ORDER = [
  "shooting",
  "negatives_drop_off",
  "low_res_scanning",
  "photographer_selection",
  "client_selection",
  "low_res_to_high_res",
  "edition_request",
  "final_edits",
  "photographer_last_check",
  "client_confirmation",
] as const

/** Maps trigger_event to completion criteria. Skip scheduled notification if milestone already done. */
const TRIGGER_EVENT_TO_COMPLETION: Record<
  string,
  { minSubstatus?: (typeof SUBSTATUS_ORDER)[number]; completionEvent?: string; completionEvents?: string[] }
> = {
  shooting_end: {
    minSubstatus: "negatives_drop_off",
    completionEvent: "negatives_pickup_marked",
    completionEvents: ["negatives_pickup_marked", "shooting_ended", "shooting_completed_confirmed"],
  },
  dropoff_deadline: { minSubstatus: "low_res_scanning", completionEvent: "dropoff_confirmed" },
  scanning_deadline: { minSubstatus: "photographer_selection", completionEvent: "scanning_completed" },
  photographer_selection_deadline: {
    minSubstatus: "client_selection",
    completionEvent: "photographer_selection_uploaded",
  },
  client_selection_deadline: {
    minSubstatus: "low_res_to_high_res",
    completionEvent: "client_selection_confirmed",
  },
  photographer_check_deadline: { completionEvent: "photographer_check_approved" },
  highres_deadline: { minSubstatus: "edition_request", completionEvent: "highres_ready" },
  final_edits_deadline: {
    minSubstatus: "photographer_last_check",
    completionEvent: "final_edits_completed",
  },
  photographer_review_deadline: {
    minSubstatus: "client_confirmation",
    completionEvent: "photographer_edits_approved",
  },
  project_deadline: { completionEvent: "collection_completed" },
}

/**
 * Maps template step number to the minimum substatus that indicates the step is done.
 * If the collection's current substatus index >= this index, the step is already completed
 * and notifications for it should be suppressed.
 * Step 11 (client_confirmation) is only completed when collection status === "completed".
 */
const STEP_TO_COMPLETED_MIN_SUBSTATUS: Record<number, (typeof SUBSTATUS_ORDER)[number]> = {
  1: "negatives_drop_off",
  2: "low_res_scanning",
  3: "photographer_selection",
  4: "client_selection",
  5: "low_res_to_high_res",
  6: "low_res_to_high_res",
  7: "edition_request",
  8: "final_edits",
  9: "photographer_last_check",
  10: "client_confirmation",
}

/** Map a workflow step slug to the next actionable step slug. */
const NEXT_STEP_BY_SLUG: Record<string, string> = {
  shooting: "negatives_dropoff",
  negatives_dropoff: "low_res_scanning",
  low_res_scanning: "photographer_selection",
  photographer_selection: "client_selection",
  client_selection: "photographer_check",
  photographer_check: "handprint_high_res",
  handprint_high_res: "edition_request",
  edition_request: "final_edits",
  final_edits: "photographer_last_check",
  photographer_last_check: "client_confirmation",
}

const WORKFLOW_STEP_SEQUENCE = [
  "shooting",
  "negatives_dropoff",
  "low_res_scanning",
  "photographer_selection",
  "client_selection",
  "photographer_check",
  "handprint_high_res",
  "edition_request",
  "final_edits",
  "photographer_last_check",
  "client_confirmation",
] as const

interface CollectionWorkflowStepOptions {
  hasHandprint: boolean
  hasEditionStudio: boolean
  /** Digital + Retouch: edition_request step is merged into handprint_high_res; photographer is step owner. */
  isDigitalWithRetouch?: boolean
}

/** User-facing step names by URL slug (matches notification copy style). */
const STEP_NAME_BY_SLUG: Record<string, string> = {
  shooting: "Shooting",
  negatives_dropoff: "Negatives drop off",
  low_res_scanning: "Low-res scanning",
  photographer_selection: "Photographer selection",
  client_selection: "Client selection",
  photographer_check: "Photographer review",
  handprint_high_res: "Low-res to high-res",
  edition_request: "Retouch request",
  final_edits: "Final edits",
  photographer_last_check: "Photographer last check",
  client_confirmation: "Client confirmation",
}

/** Comment threads can be visible in different steps depending on recipient role. */
const COMMENT_STEP_SLUG_BY_NOTE_AND_RECIPIENT: Record<string, Partial<Record<RecipientType, string>>> = {
  step_note_low_res: {
    photo_lab: "low_res_scanning",
    photographer: "photographer_selection",
  },
  step_note_photographer_selection: {
    photographer: "photographer_selection",
    client: "client_selection",
  },
  step_note_client_selection: {
    client: "client_selection",
    photographer: "photographer_check",
  },
  step_note_photographer_review: {
    photographer: "photographer_check",
    handprint_lab: "handprint_high_res",
  },
  step_note_high_res: {
    handprint_lab: "handprint_high_res",
    photographer: "edition_request",
  },
  step_note_edition_request: {
    photographer: "edition_request",
    retouch_studio: "final_edits",
  },
  step_note_final_edits: {
    retouch_studio: "final_edits",
    photographer: "photographer_last_check",
  },
  step_note_photographer_last_check: {
    photographer: "photographer_last_check",
    retouch_studio: "final_edits",
  },
  step_note_client_confirmation: {
    client: "client_confirmation",
  },
}

/**
 * Per-template navigation overrides.
 * - "shared additional link": open the step where recipient can see the UrlHistory block.
 * - scanning_completed: photographer goes to step 4 (Photographer selection) to review and upload
 *   their selection, not step 3 (Low-res scanning) where the lab completed the work.
 */
const TEMPLATE_STEP_SLUG_BY_RECIPIENT: Record<string, Partial<Record<RecipientType, string>>> = {
  scanning_completed: {
    photographer: "photographer_selection",
  },
  photographer_selection_uploaded: {
    client: "client_selection",
  },
  client_selection_confirmed: {
    photographer: "photographer_check",
    handprint_lab: "handprint_high_res",
  },
  lab_shared_additional_materials: {
    photographer: "photographer_selection",
  },
  photographer_shared_additional_materials: {
    client: "client_selection",
  },
  retouch_studio_shared_additional_materials: {
    photographer: "photographer_last_check",
  },
  photographer_check_ready_for_hr: {
    handprint_lab: "handprint_high_res",
  },
  highres_deadline_risk: {
    photographer: "handprint_high_res",
  },
  edition_request_ready: {
    retouch_studio: "final_edits",
  },
  edition_request_ready_digital: {
    retouch_studio: "final_edits",
  },
  photographer_edits_approved: {
    client: "client_confirmation",
    producer: "client_confirmation",
  },
  photographer_last_check_shared_additional_materials: {
    client: "client_confirmation",
  },
  final_edits_completed: {
    photographer: "photographer_last_check",
  },
}

/** Step name override per template+recipient when STEP_NAME_BY_SLUG is not appropriate. */
const TEMPLATE_STEP_NAME_BY_RECIPIENT: Record<string, Partial<Record<RecipientType, string>>> = {
  photographer_check_ready_for_hr: {
    handprint_lab: "Handprint to high-res",
  },
  highres_deadline_risk: {
    photographer: "Low-res to high-res and retouch request",
  },
  edition_request_ready: {
    retouch_studio: "Final edits",
  },
  edition_request_ready_digital: {
    retouch_studio: "Final edits",
  },
  photographer_edits_approved: {
    client: "Client confirmation",
    producer: "Client confirmation",
  },
  photographer_last_check_shared_additional_materials: {
    client: "Client confirmation",
  },
  final_edits_completed: {
    photographer: "Photographer last check",
  },
}

const USER_ACTOR_TITLE_TEMPLATE_CODES = new Set([
  "lab_shared_additional_materials",
  "photographer_shared_additional_materials",
  "retouch_studio_shared_additional_materials",
  "photographer_last_check_shared_additional_materials",
])

/** Additional-material templates must notify even if their original step is completed. */
function isAdditionalMaterialsTemplateCode(templateCode: string): boolean {
  return templateCode.endsWith("_shared_additional_materials")
}

export class NotificationsService implements INotificationsService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  private static isDeadlineMissedEventType(eventType: string): eventType is CollectionEventType {
    return eventType.endsWith("_deadline_missed")
  }

  private static isMissingScheduledProcessingColumnsError(error: unknown): boolean {
    const code = (error as { code?: string } | null)?.code
    const message = String((error as { message?: string } | null)?.message ?? "")
    return (
      code === "42703" &&
      /scheduled_notification_tracking\.(is_processing|processing_started_at|processing_by)/i.test(message)
    )
  }

  private async markScheduledTrackingAsSent(id: string, nowIso: string): Promise<void> {
    const fullUpdate = await this.supabase
      .from("scheduled_notification_tracking")
      .update({
        is_sent: true,
        sent_at: nowIso,
        is_processing: false,
        processing_started_at: null,
        processing_by: null,
      } as never)
      .eq("id", id)
    if (!fullUpdate.error) return

    if (!NotificationsService.isMissingScheduledProcessingColumnsError(fullUpdate.error)) {
      throw fullUpdate.error
    }

    // Backward-compatible fallback for environments that still miss lock columns.
    const fallbackUpdate = await this.supabase
      .from("scheduled_notification_tracking")
      .update({
        is_sent: true,
        sent_at: nowIso,
      } as never)
      .eq("id", id)
    if (fallbackUpdate.error) throw fallbackUpdate.error
  }

  private async clearScheduledTrackingProcessing(id: string): Promise<void> {
    const clearUpdate = await this.supabase
      .from("scheduled_notification_tracking")
      .update({
        is_processing: false,
        processing_started_at: null,
        processing_by: null,
      } as never)
      .eq("id", id)
    if (!clearUpdate.error) return
    if (NotificationsService.isMissingScheduledProcessingColumnsError(clearUpdate.error)) return
    throw clearUpdate.error
  }

  private async getCollectionWorkflowStepOptions(
    collectionId: string
  ): Promise<CollectionWorkflowStepOptions | null> {
    const { data, error } = await this.supabase
      .from("collections")
      .select("low_res_to_high_res_hand_print, photographer_request_edition")
      .eq("id", collectionId)
      .single()
    if (error || !data) {
      console.warn("[NotificationsService] Failed to load workflow options for notification navigation:", {
        collectionId,
        error,
      })
      return null
    }
    const row = data as {
      low_res_to_high_res_hand_print: boolean
      photographer_request_edition: boolean
    }
    return {
      hasHandprint: !!row.low_res_to_high_res_hand_print,
      hasEditionStudio: !!row.photographer_request_edition,
      isDigitalWithRetouch: !row.low_res_to_high_res_hand_print && !!row.photographer_request_edition,
    }
  }

  /**
   * Called when a collection is published
   */
  async collectionPublished(payload: {
    collectionId: string
    participantUserIds: string[]
    participantEntityIds?: string[]
  }): Promise<void> {
    // Schedule all time-based notifications for this collection
    await this.scheduleTimeBasedNotifications(payload.collectionId)
  }

  /**
   * Trigger an event-based notification
   * For shooting_started we only create one event per collection (idempotent).
   */
  async triggerEvent(
    collectionId: string,
    eventType: CollectionEventType,
    triggeredByUserId?: string,
    metadata?: Record<string, unknown>,
    options?: { idempotencyKey?: string }
  ): Promise<void> {
    // Resolve triggered-by user name so templates can use {commentorName}
    if (triggeredByUserId && !metadata?.commentorName) {
      const { data: profile } = await this.supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", triggeredByUserId)
        .single()
      if (profile) {
        const p = profile as { first_name: string | null; last_name: string | null }
        const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ")
        if (fullName) {
          metadata = { ...metadata, commentorName: fullName }
        }
      }
    }

    let eventId: string | null = null
    const idempotencyKey = options?.idempotencyKey?.trim() || null
    if (idempotencyKey) {
      const { data: existingByKey } = await this.supabase
        .from("collection_events")
        .select("id")
        .eq("idempotency_key", idempotencyKey)
        .limit(1)
      if (existingByKey && existingByKey.length > 0) {
        return
      }
    }
    // Idempotent: at most one shooting_started per collection (multiple code paths can call this)
    if (eventType === "shooting_started") {
      const { data: existing } = await this.supabase
        .from("collection_events")
        .select("id")
        .eq("collection_id", collectionId)
        .eq("event_type", "shooting_started")
        .limit(1)
      if (existing && existing.length > 0) return
    }

    // Guardrail #1: don't persist invalid missed-deadline events.
    if (NotificationsService.isDeadlineMissedEventType(eventType)) {
      const { data: colStatusData } = await this.supabase
        .from("collections")
        .select("status, substatus")
        .eq("id", collectionId)
        .single()
      const collectionStatus = colStatusData as { status: string; substatus: string | null } | null

      const eventTypes = await this.getCollectionEventTypes(collectionId)
      const shouldTrigger = await this.shouldTriggerDeadlineMissedEvent(
        collectionId,
        eventType,
        collectionStatus ?? undefined,
        eventTypes
      )
      if (!shouldTrigger) {
        console.log(
          `[NotificationsService] Skipping invalid missed-deadline event ${eventType} for collection ${collectionId}`
        )
        return
      }
    }

    // 1. Record the event
    const eventData: CollectionEvent = {
      collection_id: collectionId,
      event_type: eventType,
      triggered_by_user_id: triggeredByUserId || null,
      metadata: metadata || {},
      idempotency_key: idempotencyKey,
      metadata_hash: NotificationsService.buildMetadataHash(metadata),
      notifications_processed: false,
    }

    const insertResult = await this.supabase
      .from("collection_events")
      .insert(eventData as never)
      .select("id")
      .single()
    const event = insertResult.data as { id: string } | null
    const eventError = insertResult.error

    if (eventError) {
      if ((eventError as { code?: string }).code === "23505") {
        // Unique idempotency key or singleton event constraint hit.
        return
      }
      console.error("[NotificationsService] Failed to record event:", eventError)
      // Continue anyway to send notifications
    } else {
      eventId = event?.id ?? null
    }

    // 1b. photographer_requested_additional_photos: in-app to producer + photo lab
    if (eventType === "photographer_requested_additional_photos") {
      const context = await getCollectionContext(this.supabase, collectionId)
      if (context) {
        const recipients = await resolveRecipients(this.supabase, collectionId, ["producer", "photo_lab"])
        const title = formatNotificationTitle("Missing photos requested", context.name, context.reference)
        const body = "The photographer has requested additional footage. Please upload a new selection in step 3."
        const ctaUrl = buildCtaUrl("/collections/{collectionId}?step=low_res_scanning", collectionId)
        const dedupeSource = eventId ? `event:${eventId}` : null
        for (const recipient of recipients) {
          try {
            await this.createNotification({
              collection_id: collectionId,
              template_id: null,
              user_id: recipient.userId,
              channel: "in_app",
              status: "sent",
              title,
              body,
              cta_text: "View collection",
              cta_url: ctaUrl,
              sent_at: new Date().toISOString(),
              dedupe_key: dedupeSource
                ? `${dedupeSource}:manual:photographer_requested_additional_photos:user:${recipient.userId}:channel:in_app`
                : null,
            })
          } catch (err) {
            console.error("[NotificationsService] Failed creating additional photos notification:", err)
          }
        }
      }
    }

    // 2. Find templates triggered by this event
    const { data: templates, error: templatesError } = await this.supabase
      .from("notification_templates")
      .select("*")
      .eq("trigger_type", "on")
      .eq("trigger_event", eventType)
      .eq("is_active", true)

    if (templatesError) {
      console.error("[NotificationsService] Failed to fetch templates:", templatesError)
      return
    }

    if (!templates || templates.length === 0) {
      console.log(`[NotificationsService] No templates for event: ${eventType}`)
    } else {
      // 3. Get collection context + status for step-completion guard
      const context = await getCollectionContext(this.supabase, collectionId)
      if (!context) {
        console.error("[NotificationsService] Collection not found:", collectionId)
      } else {
        const { data: colStatusData } = await this.supabase
          .from("collections")
          .select("status, substatus")
          .eq("id", collectionId)
          .single()
        const collectionStatus = colStatusData as { status: string; substatus: string | null } | null

        // Guardrail #2: even if an event exists, suppress notification dispatch
        // when event context is invalid for the current workflow state.
        if (NotificationsService.isDeadlineMissedEventType(eventType)) {
          const eventTypes = await this.getCollectionEventTypes(collectionId)
          const shouldDispatch = await this.shouldTriggerDeadlineMissedEvent(
            collectionId,
            eventType,
            collectionStatus ?? undefined,
            eventTypes
          )
          if (!shouldDispatch) {
            console.log(
              `[NotificationsService] Suppressing notification dispatch for invalid event ${eventType} on collection ${collectionId}`
            )
            return
          }
        }

        // 4. Process each template (pass metadata for dynamic description interpolation)
        for (const template of templates as NotificationTemplate[]) {
          try {
            // Skip if template has trigger_condition and it doesn't match this collection
            if (template.trigger_condition) {
              const conditionMet = await this.checkCondition(collectionId, template.trigger_condition)
              if (!conditionMet) continue
            }
            await this.processTemplate(
              template,
              collectionId,
              context,
              metadata,
              collectionStatus ?? undefined,
              eventId ? `event:${eventId}` : null
            )
          } catch (err) {
            // Keep processing remaining templates for this event
            console.error(
              "[NotificationsService] Template processing failed:",
              { templateCode: template.code, eventType, collectionId },
              err
            )
          }
        }
      }
    }

    // 5. Mark event as processed
    if (eventId) {
      const { error: processedError } = await this.supabase
        .from("collection_events")
        .update({ notifications_processed: true, processed_at: new Date().toISOString() } as never)
        .eq("id", eventId)
      if (processedError) {
        console.error("[NotificationsService] Failed to mark event as processed:", {
          collectionId,
          eventType,
          eventId,
          processedError,
        })
      }
    }

    // 6. Process pending email deliveries immediately so event-driven emails
    //    (e.g. dropoff_upcoming to photo_lab) are sent without waiting for cron.
    const now = new Date().toISOString()
    const runId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await this.processPendingNotificationDeliveries(runId, now)
  }

  /**
   * Process scheduled notifications (called by cron)
   */
  async processScheduledNotifications(): Promise<{ processed: number; errors: number }> {
    const now = new Date().toISOString()
    const runId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `cron-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const staleProcessingIso = new Date(Date.now() - 15 * 60_000).toISOString()
    let processed = 0
    let errors = 0

    // 1. Process pending scheduled tracking entries
    const { data: pendingScheduled, error: scheduledError } = await this.supabase
      .from("scheduled_notification_tracking")
      .select("*, notification_templates(*)")
      .eq("is_sent", false)
      .lte("scheduled_for", now)
      .limit(100)

    if (scheduledError) {
      console.error("[NotificationsService] Failed to fetch pending scheduled:", scheduledError)
      return { processed: 0, errors: 1 }
    }

    const scheduledList = (pendingScheduled ?? []) as ScheduledWithTemplate[]
    for (const scheduled of scheduledList) {
      try {
        // Claim row to prevent concurrent cron workers from processing it twice.
        const claimResult = await this.supabase
          .from("scheduled_notification_tracking")
          .update({
            is_processing: true,
            processing_started_at: now,
            processing_by: runId,
          } as never)
          .eq("id", scheduled.id)
          .eq("is_sent", false)
          .or(`is_processing.eq.false,processing_started_at.lt."${staleProcessingIso}"`)
          .select("id")
          .limit(1)
        if (claimResult.error && !NotificationsService.isMissingScheduledProcessingColumnsError(claimResult.error)) {
          console.error("[NotificationsService] Failed to claim scheduled tracking row:", {
            scheduledId: scheduled.id,
            runId,
            claimError: claimResult.error,
          })
          continue
        }

        if (claimResult.error && NotificationsService.isMissingScheduledProcessingColumnsError(claimResult.error)) {
          console.warn("[NotificationsService] Claim lock columns missing; falling back to no-lock scheduled processing.", {
            scheduledId: scheduled.id,
            runId,
          })
        }

        const claimed = claimResult.error
          ? [{ id: scheduled.id }]
          : ((claimResult.data as { id: string }[] | null) ?? [])
        if (claimed.length === 0) {
          continue
        }

        const template = scheduled.notification_templates
        if (!template) continue

        // Fetch collection status once per scheduled entry
        const { data: colStatusData } = await this.supabase
          .from("collections")
          .select("status, substatus")
          .eq("id", scheduled.collection_id)
          .single()
        const collectionStatus = colStatusData as { status: string; substatus: string | null } | null

        // Check if condition is met (for 'if' triggers)
        if (template.trigger_condition) {
          const conditionMet = await this.checkCondition(
            scheduled.collection_id,
            template.trigger_condition
          )
          if (!conditionMet) {
            // Mark as sent (skipped) to avoid re-checking
            await this.markScheduledTrackingAsSent(scheduled.id, now)
            continue
          }
        }

        // Skip if milestone already completed (e.g. client confirmed before deadline)
        const milestoneCompleted = await this.isMilestoneAlreadyCompleted(
          scheduled.collection_id,
          template,
          collectionStatus
        )
        if (milestoneCompleted) {
          await this.markScheduledTrackingAsSent(scheduled.id, now)
          continue
        }

        const context = await getCollectionContext(this.supabase, scheduled.collection_id)
        if (!context) continue

        const scheduledMetadata: Record<string, unknown> = {}
        if (scheduled.deadline_value) {
          const dl = new Date(scheduled.deadline_value)
          if (Number.isFinite(dl.getTime())) {
            scheduledMetadata.slotDeadlineTime = dl.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })
          }
        }

        await this.processTemplate(
          template,
          scheduled.collection_id,
          context,
          scheduledMetadata,
          collectionStatus ?? undefined,
          `scheduled:${scheduled.id}`
        )

        // Mark as sent
        await this.markScheduledTrackingAsSent(scheduled.id, now)

        processed++
      } catch (err) {
        console.error("[NotificationsService] Error processing scheduled:", err)
        try {
          await this.clearScheduledTrackingProcessing(scheduled.id)
        } catch (releaseErr) {
          console.error("[NotificationsService] Failed to clear scheduled processing lock:", {
            scheduledId: scheduled.id,
            releaseErr,
          })
        }
        errors++
      }
    }

    // 2. Process pending notification deliveries (emails, etc.)
    const pendingResult = await this.processPendingNotificationDeliveries(runId, now, staleProcessingIso)
    return { processed: processed + pendingResult.processed, errors: errors + pendingResult.errors }
  }

  /**
   * Process pending notification deliveries (emails with status=pending).
   * Called by cron (processScheduledNotifications) and immediately after triggerEvent
   * so event-driven emails are sent without waiting for the next cron run.
   */
  private async processPendingNotificationDeliveries(
    runId: string,
    now: string,
    staleProcessingIso?: string
  ): Promise<{ processed: number; errors: number }> {
    const stale = staleProcessingIso ?? new Date(Date.now() - 15 * 60_000).toISOString()
    let processed = 0
    let errors = 0

    const { data: pendingNotifications, error: notifError } = await this.supabase
      .from("notifications")
      .select("*")
      .in("status", ["pending", "processing"])
      .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
      .limit(100)

    if (notifError) {
      console.error("[NotificationsService] Failed to fetch pending notifications:", notifError)
      return { processed: 0, errors: 1 }
    }

    const notificationList = (pendingNotifications ?? []) as NotificationRow[]
    for (const notification of notificationList) {
      try {
        // Claim in two steps instead of a complex OR filter to avoid PostgREST parser issues.
        const claimPendingResult = await this.supabase
          .from("notifications")
          .update({
            status: "processing",
            processing_started_at: now,
            processing_by: runId,
          } as never)
          .eq("id", notification.id)
          .eq("status", "pending")
          .select("id")
          .limit(1)

        if (claimPendingResult.error) {
          console.error("[NotificationsService] Failed to claim pending notification row:", {
            notificationId: notification.id,
            runId,
            claimError: claimPendingResult.error,
          })
          errors++
          continue
        }

        let claimedNotification = (claimPendingResult.data as { id: string }[] | null) ?? []
        if (claimedNotification.length === 0) {
          const claimStaleProcessingResult = await this.supabase
            .from("notifications")
            .update({
              status: "processing",
              processing_started_at: now,
              processing_by: runId,
            } as never)
            .eq("id", notification.id)
            .eq("status", "processing")
            .lt("processing_started_at", stale)
            .select("id")
            .limit(1)

          if (claimStaleProcessingResult.error) {
            console.error("[NotificationsService] Failed to claim stale-processing notification row:", {
              notificationId: notification.id,
              runId,
              claimError: claimStaleProcessingResult.error,
            })
            errors++
            continue
          }

          claimedNotification = (claimStaleProcessingResult.data as { id: string }[] | null) ?? []
        }

        if (claimedNotification.length === 0) {
          continue
        }

        if (notification.channel === "email") {
          const { data: userData } = await this.supabase
            .from("profiles")
            .select("email, first_name")
            .eq("id", notification.user_id)
            .single()
          const user = userData as { email: string; first_name: string | null } | null

          if (user?.email) {
            let emailPayload: Record<string, string | null> = {}
            try {
              emailPayload = JSON.parse(notification.body)
            } catch {
              emailPayload = { emailTitle: notification.title, emailDescription: notification.body }
            }

            const result = await sendNotificationEmail({
              to: user.email,
              subject: notification.title,
              body: emailPayload.emailDescription || notification.body,
              emailTitle: emailPayload.emailTitle || undefined,
              ctaText: notification.cta_text || undefined,
              ctaUrl: notification.cta_url || undefined,
              recipientName: user.first_name || undefined,
              collectionName: emailPayload.collectionName || undefined,
              clientName: emailPayload.clientName || undefined,
              shootingStartDate: emailPayload.shootingStartDate || undefined,
              shootingEndDate: emailPayload.shootingEndDate || undefined,
              shootingCity: emailPayload.shootingCity || undefined,
              shootingCountry: emailPayload.shootingCountry || undefined,
              stepStatus: emailPayload.stepStatus || undefined,
              stepName: emailPayload.stepName || undefined,
            })

            if (result.sent) {
              await this.supabase
                .from("notifications")
                .update({
                  status: "sent",
                  sent_at: now,
                  processing_started_at: null,
                  processing_by: null,
                } as never)
                .eq("id", notification.id)
              processed++
            } else {
              await this.supabase
                .from("notifications")
                .update({
                  status: "failed",
                  error_message: result.error,
                  retry_count: notification.retry_count + 1,
                  processing_started_at: null,
                  processing_by: null,
                } as never)
                .eq("id", notification.id)
              errors++
            }
          }
        } else {
          await this.supabase
            .from("notifications")
            .update({
              status: "sent",
              sent_at: now,
              processing_started_at: null,
              processing_by: null,
            } as never)
            .eq("id", notification.id)
          processed++
        }
      } catch (err) {
        console.error("[NotificationsService] Error sending notification:", err)
        await this.supabase
          .from("notifications")
          .update({
            status: "failed",
            error_message: "Unexpected processing error",
            retry_count: notification.retry_count + 1,
            processing_started_at: null,
            processing_by: null,
          } as never)
          .eq("id", notification.id)
        errors++
      }
    }

    return { processed, errors }
  }

  /**
   * Schedule time-based notifications for a collection
   */
  async scheduleTimeBasedNotifications(collectionId: string): Promise<void> {
    // Get all time-based templates (before, after, if, first_time)
    const { data: templates, error: templatesError } = await this.supabase
      .from("notification_templates")
      .select("*")
      .in("trigger_type", ["before", "after", "if", "first_time"])
      .eq("is_active", true)

    if (templatesError || !templates) {
      console.error("[NotificationsService] Failed to fetch time-based templates:", templatesError)
      return
    }

    // Get collection data
    const { data: collection, error: collectionError } = await this.supabase
      .from("collections")
      .select("*")
      .eq("id", collectionId)
      .single()

    if (collectionError || !collection) {
      console.error("[NotificationsService] Collection not found:", collectionId)
      return
    }

    const now = new Date()
    const templateList = templates as NotificationTemplate[]
    let scheduledCount = 0

    for (const template of templateList) {
      const deadlineMapping = DEADLINE_FIELD_MAP[template.trigger_event]
      if (!deadlineMapping) {
        // This is an event-based trigger, skip
        continue
      }

      // Get deadline value from collection
      const dateValue = (collection as Record<string, unknown>)[deadlineMapping.dateField] as string | null
      const timeValue = (collection as Record<string, unknown>)[deadlineMapping.timeField] as string | null

      if (!dateValue) continue

      // Parse deadline
      const deadlineDate = this.parseDeadline(dateValue, timeValue)
      if (!deadlineDate || !Number.isFinite(deadlineDate.getTime())) continue

      // For morning_reminder: schedule at 9:00 AM on the deadline day
      let scheduledFor: Date
      if (template.trigger_condition === "morning_reminder") {
        scheduledFor = new Date(deadlineDate)
        scheduledFor.setHours(9, 0, 0, 0)
      } else {
        scheduledFor = new Date(deadlineDate.getTime() + template.trigger_offset_minutes * 60000)
      }
      if (!Number.isFinite(scheduledFor.getTime())) continue

      // Skip if already in the past
      if (scheduledFor < now) continue

      // If deadline changed, invalidate previous pending rows for the same collection+template.
      await this.supabase
        .from("scheduled_notification_tracking")
        .update({
          is_sent: true,
          sent_at: now.toISOString(),
          is_processing: false,
          processing_started_at: null,
          processing_by: null,
        } as never)
        .eq("collection_id", collectionId)
        .eq("template_id", template.id)
        .eq("is_sent", false)
        .neq("deadline_value", deadlineDate.toISOString())

      // Insert tracking entry (upsert to avoid duplicates)
      const { error: insertError } = await this.supabase
        .from("scheduled_notification_tracking")
        .upsert(
          {
            collection_id: collectionId,
            template_id: template.id,
            deadline_value: deadlineDate.toISOString(),
            scheduled_for: scheduledFor.toISOString(),
            is_sent: false,
            is_processing: false,
            processing_started_at: null,
            processing_by: null,
          } as never,
          { onConflict: "collection_id,template_id,deadline_value" }
        )

      if (insertError) {
        console.error("[NotificationsService] Failed to schedule:", insertError)
      } else {
        scheduledCount++
      }
    }

    if (process.env.NODE_ENV === "development" && scheduledCount === 0 && templateList.length > 0) {
      console.log(
        "[NotificationsService] scheduleTimeBasedNotifications: no rows inserted. " +
          "Ensure the collection has at least one deadline set (e.g. shooting_end_date, lowres_deadline_date, dropoff_delivery_date)."
      )
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from("notifications")
      .update({ status: "read", read_at: new Date().toISOString() } as never)
      .eq("id", notificationId)
      .eq("user_id", userId)
      .eq("channel", "in_app")

    if (error) {
      console.error("[NotificationsService] Failed to mark as read:", error)
      throw error
    }
  }

  /**
   * Mark unread in-app notifications as read using collection + optional step context.
   * This is used when users reach step details from outside the notification panel
   * (e.g. email CTA or direct stepper click).
   */
  async markAsReadByContext(userId: string, collectionId: string, stepId?: string): Promise<number> {
    const hasStepFilter = typeof stepId === "string" && stepId.trim().length > 0
    const normalizedStepId = normalizeStepIdFromQuery(stepId ?? null)
    if (hasStepFilter && !normalizedStepId) {
      return 0
    }
    const { data, error } = await this.supabase
      .from("notifications")
      .select("id, cta_url, body")
      .eq("user_id", userId)
      .eq("collection_id", collectionId)
      .eq("channel", "in_app")
      .eq("status", "sent")

    if (error) {
      console.error("[NotificationsService] Failed to fetch notifications for context read:", error)
      throw error
    }

    const rows = (data ?? []) as Array<{ id: string; cta_url: string | null; body: string }>
    const idsToMark = rows
      .filter((row) => {
        if (!hasStepFilter) return true
        const stepFromCta = inferStepIdFromNotificationCtaUrl(row.cta_url)
        const stepFromBody = inferStepIdFromNotificationBody(row.body)
        return stepFromCta === normalizedStepId || stepFromBody === normalizedStepId
      })
      .map((row) => row.id)

    if (idsToMark.length === 0) return 0

    const { error: updateError } = await this.supabase
      .from("notifications")
      .update({ status: "read", read_at: new Date().toISOString() } as never)
      .in("id", idsToMark)
      .eq("user_id", userId)
      .eq("channel", "in_app")
      .eq("status", "sent")

    if (updateError) {
      console.error("[NotificationsService] Failed to mark context notifications as read:", updateError)
      throw updateError
    }

    return idsToMark.length
  }

  /**
   * Get user's in-app notifications
   */
  async getUserNotifications(
    userId: string,
    options?: { unreadOnly?: boolean; limit?: number }
  ): Promise<UserNotification[]> {
    let query = this.supabase
      .from("notifications")
      .select(`
        id,
        title,
        body,
        cta_text,
        cta_url,
        collection_id,
        status,
        created_at,
        sent_at,
        read_at,
        collections!inner(name)
      `)
      .eq("user_id", userId)
      .eq("channel", "in_app")
      .in("status", ["sent", "read"])
      .order("created_at", { ascending: false })

    if (options?.unreadOnly) {
      query = query.eq("status", "sent")
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error("[NotificationsService] Failed to fetch notifications:", error)
      return []
    }

    type NotificationWithCollection = NotificationRow & { collections: { name: string } | null }
    return ((data || []) as NotificationWithCollection[]).map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      ctaText: n.cta_text,
      ctaUrl: n.cta_url,
      collectionId: n.collection_id,
      collectionName: (n.collections as { name: string })?.name || null,
      status: n.status as "sent" | "read",
      isRead: n.status === "read",
      createdAt: n.created_at,
      sentAt: n.sent_at,
    }))
  }

  /**
   * Get count of unread notifications
   */
  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("channel", "in_app")
      .eq("status", "sent")

    if (error) {
      console.error("[NotificationsService] Failed to get unread count:", error)
      return 0
    }

    return count || 0
  }

  /**
   * Return unique step IDs with unread in-app notifications for a collection.
   */
  async getUnreadStepIdsForCollection(userId: string, collectionId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("notifications")
      .select("cta_url, body")
      .eq("user_id", userId)
      .eq("collection_id", collectionId)
      .eq("channel", "in_app")
      .eq("status", "sent")

    if (error) {
      console.error("[NotificationsService] Failed to fetch unread steps:", error)
      return []
    }

    const rows = (data ?? []) as Array<{ cta_url: string | null; body: string }>
    const stepIds = new Set<string>()
    for (const row of rows) {
      const stepFromCta = inferStepIdFromNotificationCtaUrl(row.cta_url)
      const stepFromBody = inferStepIdFromNotificationBody(row.body)
      const stepId = stepFromCta ?? stepFromBody
      if (stepId) stepIds.add(stepId)
    }

    return Array.from(stepIds)
  }

  /**
   * Re-schedule time-based notifications for in-progress collections that have
   * been updated recently (within the last 5 minutes). This catches deadline
   * changes made after the initial publish.
   */
  async rescheduleForUpdatedCollections(): Promise<{ rescheduled: number }> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString()

    const { data: collections, error } = await this.supabase
      .from("collections")
      .select("id")
      .eq("status", "in_progress")
      .gte("updated_at", fiveMinutesAgo)

    if (error || !collections) return { rescheduled: 0 }

    let rescheduled = 0
    for (const col of collections as { id: string }[]) {
      await this.scheduleTimeBasedNotifications(col.id)
      rescheduled++
    }

    return { rescheduled }
  }

  /**
   * Detect missed deadlines and fire the corresponding *_deadline_missed events.
   * Called by the cron job alongside processScheduledNotifications().
   */
  async detectAndFireMissedDeadlines(): Promise<{ fired: number }> {
    let fired = 0

    const { data: collections, error } = await this.supabase
      .from("collections")
      .select("*")
      .eq("status", "in_progress")

    if (error || !collections) {
      console.error("[NotificationsService] Failed to fetch in-progress collections:", error)
      return { fired: 0 }
    }

    const now = new Date()

    for (const collection of collections as Array<Record<string, unknown> & { id: string }>) {
      const col = collection as Record<string, unknown>

      const collSubstatus = col.substatus as string | null
      const collectionStatus = {
        status: String(col.status ?? "in_progress"),
        substatus: collSubstatus,
      }
      const eventTypes = await this.getCollectionEventTypes(collection.id)

      for (const [dateField, timeField, eventType] of DEADLINE_TO_MISSED_EVENT) {
        const dateVal = col[dateField] as string | null
        if (!dateVal) continue

        const timeVal = col[timeField] as string | null
        const deadline = this.parseDeadline(dateVal, timeVal)
        if (!deadline || deadline > now) continue

        // Skip if the step is already completed — no need to fire a "missed" event
        const minSubstatus = MISSED_EVENT_MIN_SUBSTATUS[eventType]
        if (minSubstatus && collSubstatus) {
          const currentIdx = SUBSTATUS_ORDER.indexOf(collSubstatus as (typeof SUBSTATUS_ORDER)[number])
          const minIdx = SUBSTATUS_ORDER.indexOf(minSubstatus)
          if (currentIdx >= 0 && minIdx >= 0 && currentIdx >= minIdx) continue
        }

        if (eventTypes.has(eventType as CollectionEventType)) continue

        const shouldTrigger = await this.shouldTriggerDeadlineMissedEvent(
          collection.id,
          eventType as CollectionEventType,
          collectionStatus,
          eventTypes
        )
        if (!shouldTrigger) continue

        await this.triggerEvent(collection.id, eventType as CollectionEventType)
        eventTypes.add(eventType as CollectionEventType)
        fired++
      }
    }

    return { fired }
  }

  /**
   * Detect missed deadlines for a single collection and fire events if needed.
   * Used when viewing a collection so missed-deadline notifications fire even
   * without the cron (e.g. in dev). Idempotent: skips if event already exists.
   */
  async detectAndFireMissedDeadlinesForCollection(collectionId: string): Promise<{ fired: number }> {
    const { data: collection, error } = await this.supabase
      .from("collections")
      .select("*")
      .eq("id", collectionId)
      .eq("status", "in_progress")
      .single()

    if (error || !collection) return { fired: 0 }

    const col = collection as Record<string, unknown>
    const collSubstatus = col.substatus as string | null
    const collectionStatus = {
      status: String(col.status ?? "in_progress"),
      substatus: collSubstatus,
    }
    const eventTypes = await this.getCollectionEventTypes(collectionId)
    const now = new Date()
    let fired = 0

    for (const [dateField, timeField, eventType] of DEADLINE_TO_MISSED_EVENT) {
      const dateVal = col[dateField] as string | null
      if (!dateVal) continue

      const timeVal = col[timeField] as string | null
      const deadline = this.parseDeadline(dateVal, timeVal)
      if (!deadline || deadline > now) continue

      const minSubstatus = MISSED_EVENT_MIN_SUBSTATUS[eventType]
      if (minSubstatus && collSubstatus) {
        const currentIdx = SUBSTATUS_ORDER.indexOf(collSubstatus as (typeof SUBSTATUS_ORDER)[number])
        const minIdx = SUBSTATUS_ORDER.indexOf(minSubstatus)
        if (currentIdx >= 0 && minIdx >= 0 && currentIdx >= minIdx) continue
      }

      if (eventTypes.has(eventType as CollectionEventType)) continue

      const shouldTrigger = await this.shouldTriggerDeadlineMissedEvent(
        collectionId,
        eventType as CollectionEventType,
        collectionStatus,
        eventTypes
      )
      if (!shouldTrigger) continue

      await this.triggerEvent(collectionId, eventType as CollectionEventType)
      eventTypes.add(eventType as CollectionEventType)
      fired++
    }

    return { fired }
  }

  /**
   * Handle a new comment being added to a step.
   * Resolves all relevant recipients for the step, excludes the commenter,
   * and creates both email and in-app notifications.
   */
  async handleCommentAdded(
    collectionId: string,
    stepNoteKey: string,
    commentUserId: string,
    commentText: string
  ): Promise<void> {
    const config = STEP_NOTE_COMMENT_CONFIG[stepNoteKey]
    if (!config) {
      console.warn("[NotificationsService] Unknown step note key for comment notification:", stepNoteKey)
      return
    }

    const context = await getCollectionContext(this.supabase, collectionId)
    if (!context) {
      console.error("[NotificationsService] Collection not found for comment notification:", collectionId)
      return
    }

    const { data: commenterProfile } = await this.supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", commentUserId)
      .single()
    const commenter = commenterProfile as {
      first_name: string | null
      last_name: string | null
      email: string | null
    } | null
    const commenterHandle = NotificationsService.buildCommenterHandle(commenter)

    // Record the event
    const commentEventInsert = await this.supabase
      .from("collection_events")
      .insert({
        collection_id: collectionId,
        event_type: "comment_added",
        triggered_by_user_id: commentUserId,
        metadata: { stepNoteKey, stepName: config.stepName, commentText },
        notifications_processed: true,
      } as never)
      .select("id")
      .single()
    const commentEventId = (commentEventInsert.data as { id: string } | null)?.id ?? null

    const recipientsByUserId = new Map<string, {
      userId: string
      email: string
      firstName: string | null
      lastName: string | null
      recipientType?: RecipientType
    }>()
    for (const recipientType of config.recipients) {
      const typedRecipients = await resolveRecipients(this.supabase, collectionId, [recipientType])
      for (const recipient of typedRecipients) {
        if (!recipientsByUserId.has(recipient.userId)) {
          recipientsByUserId.set(recipient.userId, { ...recipient, recipientType })
        }
      }
    }

    const recipients = Array.from(recipientsByUserId.values()).filter((r) => r.userId !== commentUserId)
    if (recipients.length === 0) return

    const title = formatNotificationTitle("New comment", context.name, context.reference)
    const body = `You have a new comment on ${config.stepName}`

    const emailSubject = `💬 New comment on ${config.stepName} - ${context.name} by ${context.clientName || "—"} - ${context.photographerName || "—"}`
    const workflowOptions = await this.getCollectionWorkflowStepOptions(collectionId)

    for (const recipient of recipients) {
      const navigation = NotificationsService.getCommentStepNavigation(
        stepNoteKey,
        recipient.recipientType,
        collectionId,
        config.stepSlug,
        config.stepName,
        workflowOptions
      )
      try {
        await this.createNotification({
          collection_id: collectionId,
          template_id: null,
          user_id: recipient.userId,
          channel: "email",
          status: "pending",
          title: emailSubject,
          body: JSON.stringify({
            emailTitle: "You receive 1 new comment",
            emailDescription: body,
            collectionName: context.name,
            clientName: context.clientName,
            photographerName: context.photographerName,
            shootingStartDate: context.shootingStartDate,
            shootingEndDate: context.shootingEndDate,
            shootingCity: context.shootingCity,
            shootingCountry: context.shootingCountry,
            stepStatus: "In progress",
            stepName: navigation.stepName,
          }),
          cta_text: "Check comment",
          cta_url: navigation.ctaUrl,
          dedupe_key: commentEventId
            ? `comment:${commentEventId}:user:${recipient.userId}:channel:email`
            : null,
        })
      } catch (err) {
        console.error("[NotificationsService] Failed creating comment email notification:", err)
      }
    }

    for (const recipient of recipients) {
      const navigation = NotificationsService.getCommentStepNavigation(
        stepNoteKey,
        recipient.recipientType,
        collectionId,
        config.stepSlug,
        config.stepName,
        workflowOptions
      )
      try {
        await this.createNotification({
          collection_id: collectionId,
          template_id: null,
          user_id: recipient.userId,
          channel: "in_app",
          status: "sent",
          title: `${title} from @${commenterHandle}`,
          body: `${commentText.trim() || body}\n${context.name} · ${navigation.stepName}`,
          cta_text: "Check comment",
          cta_url: navigation.ctaUrl,
          sent_at: new Date().toISOString(),
          dedupe_key: commentEventId
            ? `comment:${commentEventId}:user:${recipient.userId}:channel:in_app`
            : null,
        })
      } catch (err) {
        console.error("[NotificationsService] Failed creating comment in-app notification:", err)
      }
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Determine whether a template's step has already been completed based on
   * the collection's current status and substatus. When true the notification
   * should be silently skipped.
   */
  private static isStepCompleted(
    status: string,
    substatus: string | null,
    templateStep: number
  ): boolean {
    if (status === "completed" || status === "cancelled") return true
    if (templateStep === 11) return false

    const minSubstatus = STEP_TO_COMPLETED_MIN_SUBSTATUS[templateStep]
    if (!minSubstatus || !substatus) return false

    const currentIdx = SUBSTATUS_ORDER.indexOf(substatus as (typeof SUBSTATUS_ORDER)[number])
    const minIdx = SUBSTATUS_ORDER.indexOf(minSubstatus)

    return currentIdx >= 0 && minIdx >= 0 && currentIdx >= minIdx
  }

  private static readonly NOTE_TEXT_FALLBACK = "A request has been made. Please check the collection for details."
  private static readonly DROPOFF_MEETS_DEADLINE_TITLE =
    "Lab received negatives for {collectionName} - low-res scanning can stay on schedule"
  private static readonly DROPOFF_MEETS_DEADLINE_SUBTITLE =
    "The lab has confirmed receipt of the negatives for {collectionName} and can meet the low-res scanning deadline."
  private static readonly DROPOFF_MISSES_DEADLINE_TITLE =
    "Lab received negatives for {collectionName} - low-res scanning deadline at risk"
  private static readonly DROPOFF_MISSES_DEADLINE_SUBTITLE =
    "The lab has confirmed receipt of the negatives for {collectionName} but cannot meet the low-res scanning deadline."
  private static readonly DROPOFF_STATUS_UNKNOWN_TITLE =
    "Lab received negatives for {collectionName}"
  private static readonly DROPOFF_STATUS_UNKNOWN_SUBTITLE =
    "The lab has confirmed receipt of the negatives for {collectionName}. Check if the low-res scanning deadline is still feasible."

  private static getDropoffStatusCopy(
    metadata?: Record<string, unknown>
  ): { title: string; subtitle: string } {
    const canMeetDeadline = (metadata as { canMeetDeadline?: unknown } | undefined)?.canMeetDeadline
    if (canMeetDeadline === true) {
      return {
        title: NotificationsService.DROPOFF_MEETS_DEADLINE_TITLE,
        subtitle: NotificationsService.DROPOFF_MEETS_DEADLINE_SUBTITLE,
      }
    }
    if (canMeetDeadline === false) {
      return {
        title: NotificationsService.DROPOFF_MISSES_DEADLINE_TITLE,
        subtitle: NotificationsService.DROPOFF_MISSES_DEADLINE_SUBTITLE,
      }
    }
    return {
      title: NotificationsService.DROPOFF_STATUS_UNKNOWN_TITLE,
      subtitle: NotificationsService.DROPOFF_STATUS_UNKNOWN_SUBTITLE,
    }
  }

  private static buildMetadataHash(metadata?: Record<string, unknown>): string | null {
    if (!metadata) return null
    try {
      const normalized = JSON.stringify(
        Object.keys(metadata)
          .sort()
          .reduce<Record<string, unknown>>((acc, key) => {
            acc[key] = metadata[key]
            return acc
          }, {})
      )
      return normalized
    } catch {
      return null
    }
  }

  /**
   * Interpolate dynamic placeholders in template text.
   * Supports:
   * - {noteText} from metadata.noteText
   * - {dropoffConfirmationTitle}/{dropoffConfirmationSubtitle} from metadata.canMeetDeadline
   * - {collectionName} from context.name (when context is provided)
   */
  private static interpolateText(
    text: string,
    metadata?: Record<string, unknown>,
    context?: CollectionContext
  ): string {
    let result = text

    if (result.includes("{noteText}")) {
      const noteTextValue =
        (typeof metadata?.noteText === "string" && metadata.noteText.trim()) ||
        (typeof metadata?.notes === "string" && metadata.notes.trim()) ||
        (typeof metadata?.comments === "string" && metadata.comments.trim()) ||
        (typeof metadata?.details === "string" && metadata.details.trim()) ||
        null
      const noteText = noteTextValue
        ? noteTextValue
        : NotificationsService.NOTE_TEXT_FALLBACK
      result = result.replace(/\{noteText\}/g, noteText)
    }

    if (
      result.includes("{dropoffConfirmationTitle}") ||
      result.includes("{dropoffConfirmationSubtitle}")
    ) {
      const dropoffCopy = NotificationsService.getDropoffStatusCopy(metadata)
      result = result.replace(/\{dropoffConfirmationTitle\}/g, dropoffCopy.title)
      result = result.replace(/\{dropoffConfirmationSubtitle\}/g, dropoffCopy.subtitle)
    }

    if (context) {
      if (result.includes("{collectionName}")) {
        result = result.replace(/\{collectionName\}/g, context.name)
      }
      if (result.includes("{photographerName}")) {
        result = result.replace(/\{photographerName\}/g, context.photographerName || "Photographer")
      }
      if (result.includes("{photoLabName}")) {
        result = result.replace(/\{photoLabName\}/g, context.photoLabName || "Photo lab")
      }
      if (result.includes("{retouchStudioName}")) {
        result = result.replace(/\{retouchStudioName\}/g, context.retouchStudioName || "Retouch studio")
      }
    }

    if (result.includes("{commentorName}")) {
      const name =
        (typeof metadata?.commentorName === "string" && metadata.commentorName.trim()) || "Someone"
      result = result.replace(/\{commentorName\}/g, name)
    }

    if (result.includes("{slotDeadlineTime}")) {
      const time =
        (typeof metadata?.slotDeadlineTime === "string" && metadata.slotDeadlineTime.trim()) || "the deadline"
      result = result.replace(/\{slotDeadlineTime\}/g, time)
    }

    return result
  }

  private static getEffectiveTitleTemplate(
    template: NotificationTemplate,
    metadata?: Record<string, unknown>
  ): string {
    const hasCommentorName =
      typeof metadata?.commentorName === "string" && metadata.commentorName.trim().length > 0
    if (!hasCommentorName || !USER_ACTOR_TITLE_TEMPLATE_CODES.has(template.code)) {
      return template.title
    }

    // For "shared additional link" notifications, always show the user actor in title.
    return template.title.replace(
      /\{photographerName\}|\{photoLabName\}|\{retouchStudioName\}/g,
      "{commentorName}"
    )
  }

  /**
   * Interpolate email subject template with collection context values.
   * Replaces {collectionName}, {clientName}, {photographerName}, {stepName}.
   */
  private static interpolateEmailSubject(
    subjectTemplate: string,
    context: CollectionContext,
    stepName: string
  ): string {
    return subjectTemplate
      .replace(/\{collectionName\}/g, context.name)
      .replace(/\{clientName\}/g, context.clientName || "—")
      .replace(/\{photographerName\}/g, context.photographerName || "—")
      .replace(/\{photoLabName\}/g, context.photoLabName || "Photo lab")
      .replace(/\{retouchStudioName\}/g, context.retouchStudioName || "Retouch studio")
      .replace(/\{stepName\}/g, stepName)
  }

  /**
   * Build CTA URL and step name from template's cta_url_template.
   * Uses the step from the template directly (no advancement to "next" step).
   * The template's cta_url_template already points to the correct action step
   * (e.g. negatives_dropoff for dropoff_upcoming — photo_lab must confirm drop-off there).
   */
  private static getUpcomingStepNavigation(
    ctaUrlTemplate: string | null,
    collectionId: string,
    fallbackStepName: string,
    workflowOptions?: CollectionWorkflowStepOptions | null
  ): { ctaUrl: string | null; upcomingStepName: string } {
    const rawUrl = buildCtaUrl(ctaUrlTemplate, collectionId)
    if (!rawUrl) {
      return { ctaUrl: null, upcomingStepName: fallbackStepName }
    }

    try {
      const parsed = new URL(rawUrl, "http://localhost")
      const stepSlug = parsed.searchParams.get("step")
      if (!stepSlug) {
        return { ctaUrl: rawUrl, upcomingStepName: fallbackStepName }
      }
      // Use template's step as-is; map to nearest navigable if workflow skips steps (e.g. no handprint)
      const navigableStepSlug = NotificationsService.getNearestNavigableStepSlug(stepSlug, workflowOptions)
      parsed.searchParams.set("step", navigableStepSlug)
      const ctaUrl = `${parsed.pathname}${parsed.search}${parsed.hash}`
      return {
        ctaUrl,
        upcomingStepName: STEP_NAME_BY_SLUG[navigableStepSlug] ?? fallbackStepName,
      }
    } catch {
      return { ctaUrl: rawUrl, upcomingStepName: fallbackStepName }
    }
  }

  private static getCommentStepNavigation(
    stepNoteKey: string,
    recipientType: RecipientType | undefined,
    collectionId: string,
    fallbackStepSlug: string,
    fallbackStepName: string,
    workflowOptions?: CollectionWorkflowStepOptions | null
  ): { ctaUrl: string; stepName: string } {
    const mappedStepSlugRaw =
      (recipientType && COMMENT_STEP_SLUG_BY_NOTE_AND_RECIPIENT[stepNoteKey]?.[recipientType]) ||
      fallbackStepSlug
    const mappedStepSlug = NotificationsService.getNearestNavigableStepSlug(mappedStepSlugRaw, workflowOptions)
    const ctaUrl = buildCtaUrl(`/collections/{collectionId}?step=${mappedStepSlug}`, collectionId)
      || `/collections/${collectionId}?step=${mappedStepSlug}`
    return {
      ctaUrl,
      stepName: STEP_NAME_BY_SLUG[mappedStepSlug] ?? fallbackStepName,
    }
  }

  private static getTemplateNavigation(
    template: NotificationTemplate,
    recipientType: RecipientType | undefined,
    collectionId: string,
    workflowOptions?: CollectionWorkflowStepOptions | null
  ): { ctaUrl: string | null; stepName: string } {
    // highres_ready: photographer redirect depends on collection config
    // - hasEditionStudio: step 8 (Retouch request) — photographer gives instructions for retouch
    // - !hasEditionStudio: step 10 (Photographer last check) — steps 8–9 are skipped
    let overriddenStepSlugRaw =
      recipientType ? TEMPLATE_STEP_SLUG_BY_RECIPIENT[template.code]?.[recipientType] : undefined
    if (
      template.code === "highres_ready" &&
      recipientType === "photographer" &&
      workflowOptions
    ) {
      overriddenStepSlugRaw = workflowOptions.hasEditionStudio
        ? "edition_request"
        : "photographer_last_check"
    }
    // Digital + Retouch: edition_completion_check → photographer goes to handprint_high_res (merged step)
    if (
      template.code === "edition_completion_check" &&
      recipientType === "photographer" &&
      workflowOptions?.isDigitalWithRetouch
    ) {
      overriddenStepSlugRaw = "handprint_high_res"
    }

    if (overriddenStepSlugRaw) {
      const overriddenStepSlug = NotificationsService.getNearestNavigableStepSlug(
        overriddenStepSlugRaw,
        workflowOptions
      )
      const ctaUrl = buildCtaUrl(
        `/collections/{collectionId}?step=${overriddenStepSlug}`,
        collectionId
      )
      let stepNameOverride =
        recipientType && TEMPLATE_STEP_NAME_BY_RECIPIENT[template.code]?.[recipientType]
      if (!stepNameOverride && overriddenStepSlug === "handprint_high_res" && workflowOptions?.isDigitalWithRetouch) {
        stepNameOverride = "Low-res to high-res and retouch request"
      }
      return {
        ctaUrl,
        stepName: stepNameOverride ?? STEP_NAME_BY_SLUG[overriddenStepSlug] ?? template.step_name,
      }
    }

    const { ctaUrl, upcomingStepName } = NotificationsService.getUpcomingStepNavigation(
      template.cta_url_template,
      collectionId,
      template.step_name,
      workflowOptions
    )
    return { ctaUrl, stepName: upcomingStepName }
  }

  private static normalizeWorkflowStepSlug(stepSlug: string): string {
    const raw = stepSlug.trim().toLowerCase()
    if (raw === "negatives_drop_off") return "negatives_dropoff"
    if (raw === "photographer_check_client_selection") return "photographer_check"
    return raw
  }

  private static isStepNavigable(
    stepSlug: string,
    workflowOptions?: CollectionWorkflowStepOptions | null
  ): boolean {
    if (!workflowOptions) return true
    switch (stepSlug) {
      case "negatives_dropoff":
      case "low_res_scanning":
      case "photographer_check":
        return workflowOptions.hasHandprint
      case "edition_request":
        return workflowOptions.hasEditionStudio && !workflowOptions.isDigitalWithRetouch
      case "final_edits":
        return workflowOptions.hasEditionStudio
      case "photographer_last_check":
        return workflowOptions.hasEditionStudio || workflowOptions.hasHandprint
      default:
        return true
    }
  }

  private static getNearestNavigableStepSlug(
    stepSlug: string,
    workflowOptions?: CollectionWorkflowStepOptions | null
  ): string {
    const normalized = NotificationsService.normalizeWorkflowStepSlug(stepSlug)
    if (!workflowOptions) return normalized
    if (NotificationsService.isStepNavigable(normalized, workflowOptions)) return normalized

    const currentIdx = WORKFLOW_STEP_SEQUENCE.indexOf(normalized as (typeof WORKFLOW_STEP_SEQUENCE)[number])
    if (currentIdx < 0) return normalized
    for (let idx = currentIdx + 1; idx < WORKFLOW_STEP_SEQUENCE.length; idx++) {
      const candidate = WORKFLOW_STEP_SEQUENCE[idx]
      if (NotificationsService.isStepNavigable(candidate, workflowOptions)) {
        return candidate
      }
    }
    return normalized
  }

  private static getNextNavigableStepSlug(
    stepSlug: string,
    workflowOptions?: CollectionWorkflowStepOptions | null
  ): string {
    const normalized = NotificationsService.normalizeWorkflowStepSlug(stepSlug)
    if (!workflowOptions) return NEXT_STEP_BY_SLUG[normalized] ?? normalized

    const currentIdx = WORKFLOW_STEP_SEQUENCE.indexOf(normalized as (typeof WORKFLOW_STEP_SEQUENCE)[number])
    if (currentIdx < 0) return NEXT_STEP_BY_SLUG[normalized] ?? normalized
    for (let idx = currentIdx + 1; idx < WORKFLOW_STEP_SEQUENCE.length; idx++) {
      const candidate = WORKFLOW_STEP_SEQUENCE[idx]
      if (NotificationsService.isStepNavigable(candidate, workflowOptions)) {
        return candidate
      }
    }
    return normalized
  }

  private static buildCommenterHandle(commenter: {
    first_name: string | null
    last_name: string | null
    email: string | null
  } | null): string {
    const fullName = [commenter?.first_name, commenter?.last_name]
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .join(" ")
      .trim()
    if (fullName) return fullName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
    const emailPrefix = commenter?.email?.split("@")[0]?.trim()
    if (emailPrefix) return emailPrefix.toLowerCase().replace(/[^a-z0-9._-]+/g, "")
    return "someone"
  }

  /**
   * Derive step status label from template code for the email summary card.
   * Maps template suffixes to user-facing labels.
   */
  private static deriveStepStatus(code: string): string {
    if (code.includes("_risk") || code.includes("_at_risk") || code.includes("urgent_reminder") || code.includes("completion_check") || code.includes("review_reminder")) return "At risk"
    if (code.includes("_delayed") || code.includes("_missed")) return "Delayed"
    if (code.includes("_ready") || code.includes("_completed") || code.includes("_confirmed") || code.includes("_uploaded") || code.includes("_approved")) return "Ready"
    return "In progress"
  }

  /**
   * Process a single template for a collection.
   * Accepts optional pre-fetched collection status to avoid redundant DB lookups.
   * Silently skips if the template's step has already been completed.
   */
  private async processTemplate(
    template: NotificationTemplate,
    collectionId: string,
    context: CollectionContext,
    metadata?: Record<string, unknown>,
    collectionStatus?: { status: string; substatus: string | null },
    sourceDedupePrefix?: string | null
  ): Promise<void> {
    let statusInfo = collectionStatus
    if (!statusInfo) {
      const { data } = await this.supabase
        .from("collections")
        .select("status, substatus")
        .eq("id", collectionId)
        .single()
      if (data) statusInfo = data as { status: string; substatus: string | null }
    }
    if (
      statusInfo &&
      !isAdditionalMaterialsTemplateCode(template.code) &&
      NotificationsService.isStepCompleted(statusInfo.status, statusInfo.substatus, template.step)
    ) {
      console.log(
        `[NotificationsService] Skipping ${template.code} — step ${template.step} already completed ` +
        `(status=${statusInfo.status}, substatus=${statusInfo.substatus})`
      )
      return
    }

    const resolveRecipientsWithType = async (types: RecipientType[]) => {
      const recipientsByUserId = new Map<string, {
        userId: string
        email: string
        firstName: string | null
        lastName: string | null
        recipientType?: RecipientType
      }>()
      for (const recipientType of types) {
        const typedRecipients = await resolveRecipients(this.supabase, collectionId, [recipientType])
        for (const recipient of typedRecipients) {
          if (!recipientsByUserId.has(recipient.userId)) {
            recipientsByUserId.set(recipient.userId, { ...recipient, recipientType })
          }
        }
      }
      return Array.from(recipientsByUserId.values())
    }

    const workflowOptions = await this.getCollectionWorkflowStepOptions(collectionId)

    // Digital + Retouch: highres_deadline_risk goes to photographer (owner of merged step), not handprint_lab
    let emailRecipientTypes = (template.email_recipients || []) as RecipientType[]
    let inappRecipientTypes = (template.inapp_recipients || []) as RecipientType[]
    if (
      template.code === "highres_deadline_risk" &&
      workflowOptions?.isDigitalWithRetouch
    ) {
      emailRecipientTypes = ["photographer"]
      inappRecipientTypes = ["photographer"]
    }

    // Resolve recipients preserving recipient role/type for per-role navigation.
    const emailRecipients = await resolveRecipientsWithType(emailRecipientTypes)
    const inappRecipients = await resolveRecipientsWithType(inappRecipientTypes)

    const effectiveTitleTemplate = NotificationsService.getEffectiveTitleTemplate(template, metadata)
    const interpolatedTitle = NotificationsService.interpolateText(effectiveTitleTemplate, metadata, context)
    const title = formatNotificationTitle(interpolatedTitle, context.name, context.reference)
    const body = NotificationsService.interpolateText(template.description, metadata, context)

    // Build email subject from template's email_subject column
    const defaultNavigation = NotificationsService.getTemplateNavigation(
      template,
      undefined,
      collectionId,
      workflowOptions
    )
    const emailSubject = template.email_subject
      ? NotificationsService.interpolateEmailSubject(template.email_subject, context, defaultNavigation.stepName)
      : title

    const stepStatus = NotificationsService.deriveStepStatus(template.code)

    // Create email notifications
    for (const recipient of emailRecipients) {
      const navigation = NotificationsService.getTemplateNavigation(
        template,
        recipient.recipientType,
        collectionId,
        workflowOptions
      )
      await this.createNotification({
        collection_id: collectionId,
        template_id: template.id,
        user_id: recipient.userId,
        channel: "email",
        status: "pending",
        title: emailSubject,
        body: JSON.stringify({
          emailTitle: title,
          emailDescription: body,
          collectionName: context.name,
          clientName: context.clientName,
          photographerName: context.photographerName,
          shootingStartDate: context.shootingStartDate,
          shootingEndDate: context.shootingEndDate,
          shootingCity: context.shootingCity,
          shootingCountry: context.shootingCountry,
          stepStatus,
          stepName: navigation.stepName,
        }),
        cta_text: template.cta_text,
        cta_url: navigation.ctaUrl,
        dedupe_key: sourceDedupePrefix
          ? `${sourceDedupePrefix}:template:${template.id}:user:${recipient.userId}:channel:email`
          : null,
      })
    }

    // Build in-app body: description + collection name · step name
    // Create in-app notifications (immediately sent)
    for (const recipient of inappRecipients) {
      const navigation = NotificationsService.getTemplateNavigation(
        template,
        recipient.recipientType,
        collectionId,
        workflowOptions
      )
      const inappBody = `${body}\n${context.name} · ${navigation.stepName}`
      await this.createNotification({
        collection_id: collectionId,
        template_id: template.id,
        user_id: recipient.userId,
        channel: "in_app",
        status: "sent",
        title,
        body: inappBody,
        cta_text: template.cta_text,
        cta_url: navigation.ctaUrl,
        sent_at: new Date().toISOString(),
        dedupe_key: sourceDedupePrefix
          ? `${sourceDedupePrefix}:template:${template.id}:user:${recipient.userId}:channel:in_app`
          : null,
      })
    }
  }

  /**
   * Create a notification record
   */
  private async createNotification(data: NotificationInsert): Promise<void> {
    const { error } = await this.supabase.from("notifications").insert(data as never)

    if (error) {
      if ((error as { code?: string }).code === "23505") {
        // Duplicate notification for the same dedupe key; safe to ignore.
        return
      }
      console.error("[NotificationsService] Failed to create notification:", error)
    }
  }

  /**
   * Map semantic time presets (from SlotPicker) to HH:mm for Date parsing.
   * Matches components/custom/slot-picker.tsx and lib/domain/collections/workflow.ts.
   */
  private static readonly TIME_PRESET_TO_HHMM: Record<string, string> = {
    morning: "09:00",
    "Morning (9:00am)": "09:00",
    midday: "12:00",
    "Midday (12:00pm)": "12:00",
    "Midday - 12:00pm": "12:00",
    "end-of-day": "17:00",
    "End of day (5:00pm)": "17:00",
    "End of day - 05:00pm": "17:00",
  }

  /**
   * Parse a deadline from date and time fields.
   * Handles semantic time presets (morning, midday, end-of-day) from the SlotPicker.
   * Date field may be "YYYY-MM-DD" or "YYYY-MM-DD end-of-day" (preset stored in date column).
   * Returns null if the string cannot be parsed or the result is an invalid date.
   */
  private parseDeadline(dateStr: string, timeStr: string | null): Date | null {
    try {
      const rawDate = dateStr?.trim()
      if (!rawDate) return null
      // Extract date and optional preset from date field (e.g. "2026-02-02 end-of-day" -> date "2026-02-02", preset "end-of-day")
      const presetMatch = rawDate.match(/^(.+?)\s+(morning|midday|end-of-day)$/i)
      const dateOnly = presetMatch ? presetMatch[1].trim() : rawDate
      const presetFromDate = presetMatch ? presetMatch[2].toLowerCase() : null
      const rawTime = timeStr?.trim()
      const preset = presetFromDate ?? (rawTime && /^(morning|midday|end-of-day)$/i.test(rawTime) ? rawTime.toLowerCase() : null)
      const timePart = preset
        ? (NotificationsService.TIME_PRESET_TO_HHMM[preset] ?? NotificationsService.TIME_PRESET_TO_HHMM["end-of-day"])
        : rawTime && NotificationsService.TIME_PRESET_TO_HHMM[rawTime]
          ? NotificationsService.TIME_PRESET_TO_HHMM[rawTime]
          : rawTime && /^\d{1,2}:\d{2}(:\d{2})?$/.test(rawTime)
            ? rawTime.slice(0, 5) // HH:mm (strip HH:mm:ss to HH:mm for combined)
            : null
      const combined = timePart
        ? `${dateOnly}T${timePart}:00`
        : `${dateOnly}T23:59:59`
      const d = new Date(combined)
      if (!Number.isFinite(d.getTime())) {
        console.warn("[NotificationsService] Invalid deadline:", dateStr, timeStr)
        return null
      }
      return d
    } catch {
      console.error("[NotificationsService] Failed to parse deadline:", dateStr, timeStr)
      return null
    }
  }

  /**
   * Check if the milestone for a scheduled notification has already been completed.
   * Uses two complementary strategies:
   *   1. Step-based check via STEP_TO_COMPLETED_MIN_SUBSTATUS (covers all templates).
   *   2. Event-based check via TRIGGER_EVENT_TO_COMPLETION (extra safety for deadline templates).
   * Accepts optional pre-fetched status to avoid redundant DB lookups.
   */
  private async isMilestoneAlreadyCompleted(
    collectionId: string,
    template: NotificationTemplate,
    preloadedStatus?: { status: string; substatus: string | null } | null
  ): Promise<boolean> {
    let statusInfo = preloadedStatus ?? null
    if (!statusInfo) {
      const { data, error } = await this.supabase
        .from("collections")
        .select("status, substatus")
        .eq("id", collectionId)
        .single()
      if (error || !data) return false
      statusInfo = data as { status: string; substatus: string | null }
    }

    if (statusInfo.status === "completed" || statusInfo.status === "cancelled") return true

    // Step-based check (works for every template regardless of trigger_event)
    if (NotificationsService.isStepCompleted(statusInfo.status, statusInfo.substatus, template.step)) {
      return true
    }

    // Event-based check for deadline templates
    const criteria = TRIGGER_EVENT_TO_COMPLETION[template.trigger_event]
    if (!criteria) return false

    const { data: events } = await this.supabase
      .from("collection_events")
      .select("event_type")
      .eq("collection_id", collectionId)
    const eventTypes = ((events || []) as Pick<CollectionEventRow, "event_type">[]).map(
      (e) => e.event_type
    )

    if (
      criteria.completionEvent &&
      eventTypes.includes(criteria.completionEvent as CollectionEventType)
    ) {
      return true
    }
    if (
      criteria.completionEvents &&
      criteria.completionEvents.some((e) => eventTypes.includes(e as CollectionEventType))
    ) {
      return true
    }

    if (criteria.minSubstatus && statusInfo.substatus) {
      const currentIdx = SUBSTATUS_ORDER.indexOf(statusInfo.substatus as (typeof SUBSTATUS_ORDER)[number])
      const minIdx = SUBSTATUS_ORDER.indexOf(criteria.minSubstatus)
      if (currentIdx >= 0 && minIdx >= 0 && currentIdx >= minIdx) {
        return true
      }
    }

    return false
  }

  private async getCollectionEventTypes(collectionId: string): Promise<Set<CollectionEventType>> {
    const { data: events } = await this.supabase
      .from("collection_events")
      .select("event_type")
      .eq("collection_id", collectionId)
    const types = ((events || []) as Pick<CollectionEventRow, "event_type">[]).map((e) => e.event_type)
    return new Set(types as CollectionEventType[])
  }

  private async shouldTriggerDeadlineMissedEvent(
    collectionId: string,
    eventType: CollectionEventType,
    preloadedStatus?: { status: string; substatus: string | null },
    preloadedEventTypes?: Set<CollectionEventType>
  ): Promise<boolean> {
    if (!NotificationsService.isDeadlineMissedEventType(eventType)) return true

    let statusInfo = preloadedStatus
    if (!statusInfo) {
      const { data } = await this.supabase
        .from("collections")
        .select("status, substatus")
        .eq("id", collectionId)
        .single()
      if (data) statusInfo = data as { status: string; substatus: string | null }
    }

    if (statusInfo?.status === "completed" || statusInfo?.status === "cancelled") {
      return false
    }

    const minSubstatus = MISSED_EVENT_MIN_SUBSTATUS[eventType]
    if (minSubstatus && statusInfo?.substatus) {
      const currentIdx = SUBSTATUS_ORDER.indexOf(statusInfo.substatus as (typeof SUBSTATUS_ORDER)[number])
      const minIdx = SUBSTATUS_ORDER.indexOf(minSubstatus)
      if (currentIdx >= 0 && minIdx >= 0 && currentIdx >= minIdx) {
        return false
      }
    }

    const eventTypes = preloadedEventTypes ?? (await this.getCollectionEventTypes(collectionId))
    const guard = DEADLINE_MISSED_GUARDS[eventType]
    if (!guard) return true

    if (guard.requiresAnyEvents && !guard.requiresAnyEvents.some((required) => eventTypes.has(required))) {
      return false
    }

    if (guard.blocksIfAnyEvents && guard.blocksIfAnyEvents.some((blocked) => eventTypes.has(blocked))) {
      return false
    }

    return true
  }

  /**
   * Check collection type for Digital vs Analog notifications
   */
  private async checkCollectionType(
    collectionId: string,
    type: "has_handprint" | "is_digital"
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("collections")
      .select("low_res_to_high_res_digital, low_res_to_high_res_hand_print")
      .eq("id", collectionId)
      .single()
    if (error || !data) return false
    const row = data as {
      low_res_to_high_res_digital: boolean
      low_res_to_high_res_hand_print: boolean
    }
    if (type === "has_handprint") return !!row.low_res_to_high_res_hand_print
    if (type === "is_digital") return !!row.low_res_to_high_res_digital
    return false
  }

  /**
   * Check if a condition is met for conditional notifications
   */
  private async checkCondition(
    collectionId: string,
    condition: string
  ): Promise<boolean> {
    // Get collection and events
    const { data: events } = await this.supabase
      .from("collection_events")
      .select("event_type")
      .eq("collection_id", collectionId)

    const eventTypes = ((events || []) as Pick<CollectionEventRow, "event_type">[]).map((e) => e.event_type)

    switch (condition) {
      case "has_handprint":
        // Analog collections only (low_res_to_high_res_hand_print = true)
        return await this.checkCollectionType(collectionId, "has_handprint")

      case "is_digital":
        // Digital collections only (low_res_to_high_res_digital = true)
        return await this.checkCollectionType(collectionId, "is_digital")

      case "is_digital_and_edition":
        // Digital + Retouch: low_res_to_high_res_digital = true AND photographer_request_edition = true
        const { data: row } = await this.supabase
          .from("collections")
          .select("low_res_to_high_res_digital, low_res_to_high_res_hand_print, photographer_request_edition")
          .eq("id", collectionId)
          .single()
        if (!row) return false
        const r = row as { low_res_to_high_res_digital?: boolean; low_res_to_high_res_hand_print?: boolean; photographer_request_edition?: boolean }
        return !!(r.low_res_to_high_res_digital && !r.low_res_to_high_res_hand_print && r.photographer_request_edition)

      case "negatives_not_confirmed":
        // Check if dropoff has NOT been confirmed
        return !eventTypes.includes("dropoff_confirmed")

      case "selection_not_completed":
        // Check if client selection has NOT been confirmed
        return !eventTypes.includes("client_selection_confirmed")

      case "morning_reminder":
        // Always true for first-time morning reminders (controlled by scheduling)
        return true

      case "client_not_confirmed_completion":
        return !eventTypes.includes("client_confirmation_confirmed")

      default:
        console.warn(`[NotificationsService] Unknown condition: ${condition}`)
        return false
    }
  }
}
