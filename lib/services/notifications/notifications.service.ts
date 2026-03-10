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
    recipients: ["photo_lab", "photographer", "producer"],
  },
  step_note_photographer_selection: {
    stepName: "Photographer selection",
    step: 4,
    stepSlug: "photographer_selection",
    recipients: ["photographer", "client", "producer"],
  },
  step_note_client_selection: {
    stepName: "Client selection",
    step: 5,
    stepSlug: "client_selection",
    recipients: ["client", "photographer", "producer"],
  },
  step_note_photographer_review: {
    stepName: "Photographer review",
    step: 6,
    stepSlug: "photographer_check",
    recipients: ["photographer", "handprint_lab", "producer"],
  },
  step_note_high_res: {
    stepName: "Low-res to high-res",
    step: 7,
    stepSlug: "handprint_high_res",
    recipients: ["handprint_lab", "photographer", "producer"],
  },
  step_note_edition_request: {
    stepName: "Retouch request",
    step: 8,
    stepSlug: "edition_request",
    recipients: ["photographer", "retouch_studio", "producer"],
  },
  step_note_final_edits: {
    stepName: "Final edits",
    step: 9,
    stepSlug: "final_edits",
    recipients: ["retouch_studio", "photographer", "producer"],
  },
  step_note_photographer_last_check: {
    stepName: "Photographer last check",
    step: 10,
    stepSlug: "photographer_last_check",
    recipients: ["photographer", "retouch_studio", "producer"],
  },
  step_note_client_confirmation: {
    stepName: "Client confirmation",
    step: 11,
    stepSlug: "client_confirmation",
    recipients: ["client", "producer"],
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
  { minSubstatus?: (typeof SUBSTATUS_ORDER)[number]; completionEvent?: string }
> = {
  shooting_end: { minSubstatus: "negatives_drop_off", completionEvent: "negatives_pickup_marked" },
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

export class NotificationsService implements INotificationsService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

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
    metadata?: Record<string, unknown>
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

    // 1. Record the event
    const eventData: CollectionEvent = {
      collection_id: collectionId,
      event_type: eventType,
      triggered_by_user_id: triggeredByUserId || null,
      metadata: metadata || {},
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
        const ctaUrl = buildCtaUrl("/collections/{collectionId}", collectionId)
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

        // 4. Process each template (pass metadata for dynamic description interpolation)
        for (const template of templates as NotificationTemplate[]) {
          try {
            await this.processTemplate(template, collectionId, context, metadata, collectionStatus ?? undefined)
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
  }

  /**
   * Process scheduled notifications (called by cron)
   */
  async processScheduledNotifications(): Promise<{ processed: number; errors: number }> {
    const now = new Date().toISOString()
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
            await this.supabase
              .from("scheduled_notification_tracking")
              .update({ is_sent: true, sent_at: now } as never)
              .eq("id", scheduled.id)
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
          await this.supabase
            .from("scheduled_notification_tracking")
            .update({ is_sent: true, sent_at: now } as never)
            .eq("id", scheduled.id)
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

        await this.processTemplate(template, scheduled.collection_id, context, scheduledMetadata, collectionStatus ?? undefined)

        // Mark as sent
        await this.supabase
          .from("scheduled_notification_tracking")
          .update({ is_sent: true, sent_at: now } as never)
          .eq("id", scheduled.id)

        processed++
      } catch (err) {
        console.error("[NotificationsService] Error processing scheduled:", err)
        errors++
      }
    }

    // 2. Process pending notification deliveries
    const { data: pendingNotifications, error: notifError } = await this.supabase
      .from("notifications")
      .select("*")
      .eq("status", "pending")
      .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
      .limit(100)

    if (notifError) {
      console.error("[NotificationsService] Failed to fetch pending notifications:", notifError)
      return { processed, errors: errors + 1 }
    }

    const notificationList = (pendingNotifications ?? []) as NotificationRow[]
    for (const notification of notificationList) {
      try {
        if (notification.channel === "email") {
          // Get user email
          const { data: userData } = await this.supabase
            .from("profiles")
            .select("email, first_name")
            .eq("id", notification.user_id)
            .single()
          const user = userData as { email: string; first_name: string | null } | null

          if (user?.email) {
            // Email body is stored as JSON with structured fields
            let emailPayload: Record<string, string | null> = {}
            try {
              emailPayload = JSON.parse(notification.body)
            } catch {
              // Legacy plain-text body fallback
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
                .update({ status: "sent", sent_at: now } as never)
                .eq("id", notification.id)
              processed++
            } else {
              await this.supabase
                .from("notifications")
                .update({
                  status: "failed",
                  error_message: result.error,
                  retry_count: notification.retry_count + 1,
                } as never)
                .eq("id", notification.id)
              errors++
            }
          }
        } else {
          // In-app notifications are immediately "sent"
          await this.supabase
            .from("notifications")
            .update({ status: "sent", sent_at: now } as never)
            .eq("id", notification.id)
          processed++
        }
      } catch (err) {
        console.error("[NotificationsService] Error sending notification:", err)
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

        const { data: existing } = await this.supabase
          .from("collection_events")
          .select("id")
          .eq("collection_id", collection.id)
          .eq("event_type", eventType)
          .limit(1)

        if (existing && existing.length > 0) continue

        await this.triggerEvent(collection.id, eventType as CollectionEventType)
        fired++
      }
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

    // Record the event
    await this.supabase
      .from("collection_events")
      .insert({
        collection_id: collectionId,
        event_type: "comment_added",
        triggered_by_user_id: commentUserId,
        metadata: { stepNoteKey, stepName: config.stepName, commentText },
        notifications_processed: true,
      } as never)

    const allRecipients = await resolveRecipients(
      this.supabase,
      collectionId,
      config.recipients
    )

    const recipients = allRecipients.filter((r) => r.userId !== commentUserId)
    if (recipients.length === 0) return

    const title = formatNotificationTitle("New comment", context.name, context.reference)
    const body = `You have a new comment on ${config.stepName}`
    const ctaUrl = buildCtaUrl(
      `/collections/{collectionId}?step=${config.stepSlug}`,
      collectionId
    )

    const emailSubject = `💬 New comment on ${config.stepName} - ${context.name} by ${context.clientName || "—"} - ${context.photographerName || "—"}`

    for (const recipient of recipients) {
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
            stepName: config.stepName,
          }),
          cta_text: "Check comment",
          cta_url: ctaUrl,
        })
      } catch (err) {
        console.error("[NotificationsService] Failed creating comment email notification:", err)
      }
    }

    const inappBody = `${body}\n${context.name} · ${config.stepName}`
    for (const recipient of recipients) {
      try {
        await this.createNotification({
          collection_id: collectionId,
          template_id: null,
          user_id: recipient.userId,
          channel: "in_app",
          status: "sent",
          title,
          body: inappBody,
          cta_text: "Check comment",
          cta_url: ctaUrl,
          sent_at: new Date().toISOString(),
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
    collectionStatus?: { status: string; substatus: string | null }
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
      NotificationsService.isStepCompleted(statusInfo.status, statusInfo.substatus, template.step)
    ) {
      console.log(
        `[NotificationsService] Skipping ${template.code} — step ${template.step} already completed ` +
        `(status=${statusInfo.status}, substatus=${statusInfo.substatus})`
      )
      return
    }

    // Resolve email recipients
    const emailRecipients = await resolveRecipients(
      this.supabase,
      collectionId,
      (template.email_recipients || []) as RecipientType[]
    )

    // Resolve in-app recipients
    const inappRecipients = await resolveRecipients(
      this.supabase,
      collectionId,
      (template.inapp_recipients || []) as RecipientType[]
    )

    const interpolatedTitle = NotificationsService.interpolateText(template.title, metadata, context)
    const title = formatNotificationTitle(interpolatedTitle, context.name, context.reference)
    const ctaUrl = buildCtaUrl(template.cta_url_template, collectionId)
    const body = NotificationsService.interpolateText(template.description, metadata, context)

    // Build email subject from template's email_subject column
    const emailSubject = template.email_subject
      ? NotificationsService.interpolateEmailSubject(template.email_subject, context, template.step_name)
      : title

    const stepStatus = NotificationsService.deriveStepStatus(template.code)

    // Create email notifications
    for (const recipient of emailRecipients) {
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
          stepName: template.step_name,
        }),
        cta_text: template.cta_text,
        cta_url: ctaUrl,
      })
    }

    // Build in-app body: description + collection name · step name
    const inappBody = `${body}\n${context.name} · ${template.step_name}`

    // Create in-app notifications (immediately sent)
    for (const recipient of inappRecipients) {
      await this.createNotification({
        collection_id: collectionId,
        template_id: template.id,
        user_id: recipient.userId,
        channel: "in_app",
        status: "sent",
        title,
        body: inappBody,
        cta_text: template.cta_text,
        cta_url: ctaUrl,
        sent_at: new Date().toISOString(),
      })
    }
  }

  /**
   * Create a notification record
   */
  private async createNotification(data: NotificationInsert): Promise<void> {
    const { error } = await this.supabase.from("notifications").insert(data as never)

    if (error) {
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
          : rawTime && /^\d{1,2}:\d{2}$/.test(rawTime)
            ? rawTime
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

    if (criteria.minSubstatus && statusInfo.substatus) {
      const currentIdx = SUBSTATUS_ORDER.indexOf(statusInfo.substatus as (typeof SUBSTATUS_ORDER)[number])
      const minIdx = SUBSTATUS_ORDER.indexOf(criteria.minSubstatus)
      if (currentIdx >= 0 && minIdx >= 0 && currentIdx >= minIdx) {
        return true
      }
    }

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
