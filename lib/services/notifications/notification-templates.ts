/**
 * Notification Templates Configuration
 * Source: notifications-automations.csv
 * 
 * These templates define all notification types across 11 workflow steps.
 * They are used to seed the notification_templates database table.
 */

import type { Database } from "@/lib/supabase/database.types"

// Type aliases for the enums
export type TriggerType = "before" | "after" | "on" | "if" | "first_time"
export type RecipientType = "producer" | "photo_lab" | "photographer" | "client" | "handprint_lab" | "retouch_studio"

export interface NotificationTemplateConfig {
  code: string
  step: number
  stepName: string
  title: string
  description: string
  emailSubject: string | null
  ctaText: string | null
  ctaUrlTemplate: string | null
  triggerType: TriggerType
  triggerEvent: string
  triggerOffsetMinutes: number
  triggerCondition: string | null
  emailRecipients: RecipientType[]
  inappRecipients: RecipientType[]
}

/**
 * All notification templates
 */
export const NOTIFICATION_TEMPLATES: NotificationTemplateConfig[] = [
  // ==========================================================================
  // Step 1: Shooting
  // ==========================================================================
  {
    code: "shooting_pickup_reminder",
    step: 1,
    stepName: "Shooting",
    title: "Are shooting negatives ready for drop-off?",
    description: "Have the negatives been picked up and prepared for delivery to the lab?",
    emailSubject: "📋 Shooting pickup reminder - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Confirm pickup",
    ctaUrlTemplate: "/collections/{collectionId}?step=shooting",
    triggerType: "before",
    triggerEvent: "shooting_end",
    triggerOffsetMinutes: -30,
    triggerCondition: null,
    emailRecipients: ["producer"],
    inappRecipients: [],
  },

  // ==========================================================================
  // Step 2: Negatives Drop-off
  // ==========================================================================
  {
    code: "dropoff_upcoming",
    step: 2,
    stepName: "Negatives drop off",
    title: "Upcoming negatives drop-off",
    description: "Negatives are on their way to the lab. Get ready and confirm that everything is ready to receive them.",
    emailSubject: "📦 Negatives drop-off upcoming - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Confirm drop-off",
    ctaUrlTemplate: "/collections/{collectionId}?step=negatives_dropoff",
    triggerType: "on",
    triggerEvent: "negatives_pickup_marked",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["photo_lab"],
    inappRecipients: ["photo_lab"],
  },
  {
    code: "dropoff_confirmation_reminder",
    step: 2,
    stepName: "Negatives drop off",
    title: "Have negatives been dropped off?",
    description: "Confirm whether the negatives have already been delivered to the lab.",
    emailSubject: "📦 Negatives drop-off reminder - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Confirm drop-off",
    ctaUrlTemplate: "/collections/{collectionId}?step=negatives_dropoff",
    triggerType: "if",
    triggerEvent: "dropoff_deadline",
    triggerOffsetMinutes: 60,
    triggerCondition: "negatives_not_confirmed",
    emailRecipients: ["photo_lab"],
    inappRecipients: ["photo_lab"],
  },
  {
    code: "dropoff_delayed",
    step: 2,
    stepName: "Negatives drop off",
    title: "Drop-off delayed for {collectionName}",
    description: "Coordinate with the client, photographer and rest of players to update timeline and avoid possible rush-fees.",
    emailSubject: "🚨 Negatives drop off delayed - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Check collection",
    ctaUrlTemplate: "/collections/{collectionId}?step=negatives_dropoff",
    triggerType: "on",
    triggerEvent: "dropoff_deadline_missed",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["producer"],
    inappRecipients: ["producer", "photo_lab"],
  },
  {
    code: "dropoff_confirmed_status",
    step: 2,
    stepName: "Negatives drop off",
    title: "{dropoffConfirmationTitle}",
    description: "{dropoffConfirmationSubtitle}",
    emailSubject: "📦 Negatives drop off confirmed - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Check collection",
    ctaUrlTemplate: "/collections/{collectionId}?step=low_res_scanning",
    triggerType: "on",
    triggerEvent: "dropoff_confirmed",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: [],
    inappRecipients: ["producer"],
  },

  // ==========================================================================
  // Step 3: Low-res Scanning
  // ==========================================================================
  {
    code: "scanning_deadline_risk",
    step: 3,
    stepName: "Low-res scanning",
    title: "Upload low-res to share with photographer",
    description: "The scanning deadline is approaching. Confirm whether scanning will be completed on time.",
    emailSubject: "⚠️ Low-res scanning at risk - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Upload low-res",
    ctaUrlTemplate: "/collections/{collectionId}?step=low_res_scanning",
    triggerType: "before",
    triggerEvent: "scanning_deadline",
    triggerOffsetMinutes: -60,
    triggerCondition: null,
    emailRecipients: ["photo_lab"],
    inappRecipients: ["photo_lab"],
  },
  {
    code: "scanning_completed",
    step: 3,
    stepName: "Low-res scanning",
    title: "Low-resolution scans are ready",
    description: "Download low-res scans review them and share your selection with the client.",
    emailSubject: "✅ Low-res scanning ready - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Review low-res",
    ctaUrlTemplate: "/collections/{collectionId}?step=low_res_scanning",
    triggerType: "on",
    triggerEvent: "scanning_completed",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["photographer"],
    inappRecipients: ["photographer"],
  },
  {
    code: "lab_shared_additional_materials",
    step: 3,
    stepName: "Low-res scanning",
    title: "{photoLabName} has shared an additional link",
    description: "{commentorName} uploaded a new link. Review photos and prepare your selection.",
    emailSubject: "🆕 Low-res scanning new link shared - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Review low-res",
    ctaUrlTemplate: "/collections/{collectionId}?step=low_res_scanning",
    triggerType: "on",
    triggerEvent: "lab_shared_additional_materials",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["photographer"],
    inappRecipients: ["photographer"],
  },
  {
    code: "scanning_delayed",
    step: 3,
    stepName: "Low-res scanning",
    title: "Low-res scans delayed for {collectionName}",
    description: "Coordinate with the client, photographer and rest of players to update timeline and avoid possible rush-fees.",
    emailSubject: "🚨 Low-res scanning delayed - {collectionName} by {clientName} - {photographerName}",
    ctaText: null,
    ctaUrlTemplate: "/collections/{collectionId}?step=low_res_scanning",
    triggerType: "on",
    triggerEvent: "scanning_deadline_missed",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["producer"],
    inappRecipients: ["producer"],
  },

  // ==========================================================================
  // Step 4: Photographer Selection
  // ==========================================================================
  {
    code: "photographer_selection_risk",
    step: 4,
    stepName: "Photographer selection",
    title: "Photographer selection at risk",
    description: "Deadline to upload the photographer's selection is approaching. Confirm your selection is ready.",
    emailSubject: "⚠️ Photographer selection at risk - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Upload selection",
    ctaUrlTemplate: "/collections/{collectionId}?step=photographer_selection",
    triggerType: "before",
    triggerEvent: "photographer_selection_deadline",
    triggerOffsetMinutes: -60,
    triggerCondition: null,
    emailRecipients: ["photographer"],
    inappRecipients: ["photographer"],
  },
  {
    code: "photographer_selection_uploaded",
    step: 4,
    stepName: "Photographer selection",
    title: "Photographer has shared shooting photos",
    description: "The photographer selection is ready. It is now available for the client to review.",
    emailSubject: "✅ Photographer selection ready - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Review photos",
    ctaUrlTemplate: "/collections/{collectionId}?step=photographer_selection",
    triggerType: "on",
    triggerEvent: "photographer_selection_uploaded",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["client"],
    inappRecipients: ["client"],
  },
  {
    code: "photographer_selection_delayed",
    step: 4,
    stepName: "Photographer selection",
    title: "Photographer selection delayed for {collectionName}",
    description: "The collection is delayed. Please coordinate with the client and photographer to update the timeline.",
    emailSubject: "🚨 Photographer selection delayed - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Check collection",
    ctaUrlTemplate: "/collections/{collectionId}?step=photographer_selection",
    triggerType: "on",
    triggerEvent: "photographer_selection_deadline_missed",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["producer"],
    inappRecipients: ["producer"],
  },

  // ==========================================================================
  // Step 5: Client Selection
  // ==========================================================================
  {
    code: "photographer_shared_additional_materials",
    step: 5,
    stepName: "Client selection",
    title: "{photographerName} has shared an additional link",
    description: "{commentorName} uploaded a new link. Review photos and prepare your selection.",
    emailSubject: "🆕 Photographer has shared new link - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Review photos",
    ctaUrlTemplate: "/collections/{collectionId}?step=client_selection",
    triggerType: "on",
    triggerEvent: "photographer_selection_shared",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["client"],
    inappRecipients: ["client"],
  },
  {
    code: "client_selection_delayed",
    step: 5,
    stepName: "Client selection",
    title: "Client selection delayed for {collectionName}",
    description: "Coordinate with the client, photographer and rest of players to update timeline and avoid possible rush-fees.",
    emailSubject: "🚨 Client selection delayed - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Check progress",
    ctaUrlTemplate: "/collections/{collectionId}?step=client_selection",
    triggerType: "on",
    triggerEvent: "photographer_selection_deadline_missed",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["producer"],
    inappRecipients: ["producer"],
  },
  {
    code: "client_selection_morning_reminder",
    step: 5,
    stepName: "Client selection",
    title: "Reminder: you have to upload today your selection",
    description: "Upload your selection today before {slotDeadlineTime}. Make sure to share your link before deadline to avoid delays on the collection.",
    emailSubject: "📋 Client selection reminder - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Upload selection",
    ctaUrlTemplate: "/collections/{collectionId}?step=client_selection",
    triggerType: "first_time",
    triggerEvent: "client_selection_deadline",
    triggerOffsetMinutes: 0,
    triggerCondition: "morning_reminder",
    emailRecipients: ["client"],
    inappRecipients: ["client"],
  },
  {
    code: "client_selection_urgent_reminder",
    step: 5,
    stepName: "Client selection",
    title: "Get your selection ready for HR!",
    description: "Deadline is approaching. Complete your selection to move photos to high resolution.",
    emailSubject: "⚠️ Client selection at risk - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Upload selection",
    ctaUrlTemplate: "/collections/{collectionId}?step=client_selection",
    triggerType: "if",
    triggerEvent: "client_selection_deadline",
    triggerOffsetMinutes: -60,
    triggerCondition: "selection_not_completed",
    emailRecipients: ["client"],
    inappRecipients: ["client"],
  },
  {
    code: "client_selection_confirmed",
    step: 5,
    stepName: "Client selection",
    title: "Review client selection and validate it",
    description: "Client has submitted the final image selection. Review it, validate it and give instructions to handprint lab to proceed with high-resolution processing.",
    emailSubject: "✅ Client selection ready - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Validate selection",
    ctaUrlTemplate: "/collections/{collectionId}?step=client_selection",
    triggerType: "on",
    triggerEvent: "client_selection_confirmed",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["photographer"],
    inappRecipients: ["photographer"],
  },

  // ==========================================================================
  // Step 6: Photographer Review (validates client selection)
  // ==========================================================================
  {
    code: "photographer_review_risk",
    step: 6,
    stepName: "Photographer review",
    title: "Photographer review deadline is coming",
    description: "Deadline for validating client selection is approaching. Please confirm everything is ok and add comments for high-res.",
    emailSubject: "⚠️ Photographer review at risk - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Check HR",
    ctaUrlTemplate: "/collections/{collectionId}?step=photographer_check",
    triggerType: "before",
    triggerEvent: "photographer_check_deadline",
    triggerOffsetMinutes: -60,
    triggerCondition: null,
    emailRecipients: ["photographer"],
    inappRecipients: ["photographer"],
  },
  {
    code: "photographer_check_delayed",
    step: 6,
    stepName: "Photographer review",
    title: "Photographer review delayed for {collectionName}",
    description: "Coordinate with the client, photographer and rest of players to update timeline and avoid possible rush-fees.",
    emailSubject: "🚨 Photographer review delayed - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Check collection",
    ctaUrlTemplate: "/collections/{collectionId}?step=photographer_check",
    triggerType: "on",
    triggerEvent: "photographer_check_deadline_missed",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["producer"],
    inappRecipients: ["producer"],
  },
  {
    code: "photographer_check_ready_for_hr",
    step: 6,
    stepName: "Photographer review",
    title: "Client selection is ready for HR",
    description: "Check if there are photographer comments before converting client selection to HR.",
    emailSubject: "✅ Client selection ready for high-res - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Upload high-res",
    ctaUrlTemplate: "/collections/{collectionId}?step=photographer_check",
    triggerType: "on",
    triggerEvent: "photographer_check_approved",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["handprint_lab"],
    inappRecipients: ["handprint_lab"],
  },

  // ==========================================================================
  // Step 7: Low-res to high-res (Hand print high-res)
  // ==========================================================================
  {
    code: "highres_deadline_risk",
    step: 7,
    stepName: "Low-res to high-res",
    title: "High-resolution delivery at risk",
    description: "Deadline for uploading the client selection in high-resolution is approaching. Make sure to upload selection in time!",
    emailSubject: "⚠️ Low-res to high-res at risk - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Upload high-res",
    ctaUrlTemplate: "/collections/{collectionId}?step=handprint_high_res",
    triggerType: "before",
    triggerEvent: "highres_deadline",
    triggerOffsetMinutes: -60,
    triggerCondition: null,
    emailRecipients: ["handprint_lab"],
    inappRecipients: ["handprint_lab"],
  },
  {
    code: "highres_delayed",
    step: 7,
    stepName: "Low-res to high-res",
    title: "High-res delayed for {collectionName}",
    description: "Coordinate with the client, photographer and rest of players to update timeline and avoid possible rush-fees.",
    emailSubject: "🚨 Low-res to high-res delayed - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Check collection",
    ctaUrlTemplate: "/collections/{collectionId}?step=handprint_high_res",
    triggerType: "on",
    triggerEvent: "highres_deadline_missed",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["producer"],
    inappRecipients: ["producer"],
  },
  {
    code: "highres_ready",
    step: 7,
    stepName: "Low-res to high-res",
    title: "High-res ready for review",
    description: "Check out high-resolution images and leave any comments if needed to get finals ready.",
    emailSubject: "✅ Client selection is ready in high resolution - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Check HR",
    ctaUrlTemplate: "/collections/{collectionId}?step=handprint_high_res",
    triggerType: "on",
    triggerEvent: "highres_ready",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["photographer"],
    inappRecipients: ["photographer"],
  },

  // ==========================================================================
  // Step 8: Retouch request (Edition request)
  // ==========================================================================
  {
    code: "edition_request_ready",
    step: 8,
    stepName: "Retouch request",
    title: "Retouch request ready \u2013 start edits for {collectionName}",
    description: "All comments and instructions are ready. Please proceed with the requested edits.",
    emailSubject: "✅ Retouch request ready - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Start edits",
    ctaUrlTemplate: "/collections/{collectionId}?step=edition_request",
    triggerType: "on",
    triggerEvent: "edition_request_submitted",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["retouch_studio"],
    inappRecipients: ["retouch_studio"],
  },
  {
    code: "edition_request_delayed",
    step: 8,
    stepName: "Retouch request",
    title: "Retouch request delayed for {collectionName}",
    description: "Coordinate with the client, photographer and rest of players to update timeline and avoid possible rush-fees.",
    emailSubject: "🚨 Retouch request delayed - {collectionName} by {clientName} - {photographerName}",
    ctaText: null,
    ctaUrlTemplate: "/collections/{collectionId}?step=edition_request",
    triggerType: "on",
    triggerEvent: "edition_request_deadline_missed",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["producer"],
    inappRecipients: ["producer"],
  },
  {
    code: "edition_completion_check",
    step: 8,
    stepName: "Retouch request",
    title: "Retouch request and comments at risk",
    description: "Deadline for giving retouch comments and instructions is approaching. Confirm everything is ok for final edition.",
    emailSubject: "⚠️ Retouch request at risk - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Add feedback",
    ctaUrlTemplate: "/collections/{collectionId}?step=edition_request",
    triggerType: "before",
    triggerEvent: "final_edits_deadline",
    triggerOffsetMinutes: -60,
    triggerCondition: null,
    emailRecipients: ["photographer"],
    inappRecipients: ["photographer"],
  },

  // ==========================================================================
  // Step 9: Final Edits
  // ==========================================================================
  {
    code: "final_edits_completed",
    step: 9,
    stepName: "Final edits",
    title: "Final edits ready for {collectionName}",
    description: "Review final edits, give feedback if needed, and prepare to share the final photos with the client.",
    emailSubject: "✅ Final edits ready - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Check edits",
    ctaUrlTemplate: "/collections/{collectionId}?step=final_edits",
    triggerType: "on",
    triggerEvent: "final_edits_completed",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["photographer"],
    inappRecipients: ["photographer"],
  },
  {
    code: "final_edits_at_risk",
    step: 9,
    stepName: "Final edits",
    title: "Final edits at risk",
    description: "Deadline for final edits is approaching. Make sure all photos are attached to the final upload.",
    emailSubject: "⚠️ Final edits at risk - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Upload final edits",
    ctaUrlTemplate: "/collections/{collectionId}?step=final_edits",
    triggerType: "before",
    triggerEvent: "final_edits_deadline",
    triggerOffsetMinutes: -60,
    triggerCondition: null,
    emailRecipients: ["retouch_studio"],
    inappRecipients: ["retouch_studio"],
  },
  {
    code: "final_edits_delayed",
    step: 9,
    stepName: "Final edits",
    title: "Final edits delayed for {collectionName}",
    description: "Final edits are delayed. Please review the situation and update the timeline accordingly.",
    emailSubject: "🚨 Final edits delayed - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Check collection",
    ctaUrlTemplate: "/collections/{collectionId}?step=final_edits",
    triggerType: "on",
    triggerEvent: "final_edits_deadline",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["producer"],
    inappRecipients: ["producer"],
  },
  {
    code: "retouch_studio_shared_additional_materials",
    step: 9,
    stepName: "Final edits",
    title: "{retouchStudioName} has shared an additional link",
    description: "{commentorName} uploaded a new link. Review photos and prepare your selection.",
    emailSubject: "🆕 {retouchStudioName} has shared an additional link - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Review new link",
    ctaUrlTemplate: "/collections/{collectionId}?step=photographer_last_check",
    triggerType: "on",
    triggerEvent: "retouch_studio_shared_additional_materials",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["photographer"],
    inappRecipients: ["photographer"],
  },

  // ==========================================================================
  // Step 10: Photographer Last Check
  // ==========================================================================
  {
    code: "photographer_review_reminder",
    step: 10,
    stepName: "Photographer last check",
    title: "Photographer last check at risk",
    description: "Review final edits, give feedback and prepare to share the finals with the client.",
    emailSubject: "⚠️ Photographer last check at risk - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Share final selection",
    ctaUrlTemplate: "/collections/{collectionId}?step=photographer_last_check",
    triggerType: "before",
    triggerEvent: "photographer_review_deadline",
    triggerOffsetMinutes: -60,
    triggerCondition: null,
    emailRecipients: ["photographer"],
    inappRecipients: ["photographer"],
  },
  {
    code: "photographer_edits_approved",
    step: 10,
    stepName: "Photographer last check",
    title: "Finals are ready for {collectionName}",
    description: "The photographer has approved the final selection. Check now and give feedback before completing the collection.",
    emailSubject: "✅ Finals are ready for {collectionName} by {clientName} - {photographerName}",
    ctaText: "Check finals",
    ctaUrlTemplate: "/collections/{collectionId}?step=photographer_last_check",
    triggerType: "on",
    triggerEvent: "photographer_edits_approved",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["client", "producer"],
    inappRecipients: ["client", "producer"],
  },
  {
    code: "photographer_review_delayed",
    step: 10,
    stepName: "Photographer last check",
    title: "Photographer last check is delayed for {collectionName}",
    description: "Coordinate with the client, photographer and rest of players to update timeline and avoid possible rush-fees.",
    emailSubject: "🚨 Photographer last check delayed - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Check collection",
    ctaUrlTemplate: "/collections/{collectionId}?step=photographer_last_check",
    triggerType: "on",
    triggerEvent: "photographer_review_deadline_missed",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["producer"],
    inappRecipients: ["producer"],
  },

  // ==========================================================================
  // Step 11: Client Confirmation
  // ==========================================================================
  {
    code: "client_confirmation_reminder",
    step: 11,
    stepName: "Client confirmation",
    title: "Is collection {collectionName} finished?",
    description: "Make sure all finals are ok and mark confirm the completion of the collection or add comments requesting additional photos.",
    emailSubject: "📋 Client confirmation reminder - {collectionName} by {clientName} - {photographerName}",
    ctaText: "Collection finished",
    ctaUrlTemplate: "/collections/{collectionId}?step=client_confirmation",
    triggerType: "if",
    triggerEvent: "project_deadline",
    triggerOffsetMinutes: 60,
    triggerCondition: "client_not_confirmed_completion",
    emailRecipients: ["producer", "client"],
    inappRecipients: ["producer", "client"],
  },
]

/**
 * Maps trigger events to collection deadline fields
 */
export const TRIGGER_EVENT_TO_DEADLINE_FIELD: Record<string, string> = {
  // Shooting
  shooting_end: "shooting_end_date", // + shooting_end_time
  
  // Drop-off
  dropoff_deadline: "dropoff_delivery_date", // + dropoff_delivery_time
  
  // Scanning
  scanning_deadline: "lowres_deadline_date", // + lowres_deadline_time
  
  // Photographer selection
  photographer_selection_deadline: "photo_selection_photographer_preselection_date", // + time
  
  // Client selection
  client_selection_deadline: "photo_selection_client_selection_date", // + time
  
  // High-res
  highres_deadline: "low_to_high_date", // + low_to_high_time
  
  // Edition
  final_edits_deadline: "precheck_studio_final_edits_date", // + time
  
  // Photographer check (validates client selection — step 6)
  photographer_check_deadline: "photographer_check_due_date", // + photographer_check_due_time

  // Photographer last check
  photographer_review_deadline: "check_finals_photographer_check_date", // + time

  // Project deadline (used for client confirmation)
  project_deadline: "project_deadline", // + project_deadline_time
}

/**
 * Get SQL INSERT statements for seeding the notification_templates table
 */
export function getTemplateSeedSQL(): string {
  const values = NOTIFICATION_TEMPLATES.map((t) => {
    const emailRecipients = t.emailRecipients.length > 0 
      ? `ARRAY[${t.emailRecipients.map(r => `'${r}'::notification_recipient_type`).join(", ")}]`
      : `'{}'::notification_recipient_type[]`
    
    const inappRecipients = t.inappRecipients.length > 0
      ? `ARRAY[${t.inappRecipients.map(r => `'${r}'::notification_recipient_type`).join(", ")}]`
      : `'{}'::notification_recipient_type[]`

    return `(
      '${t.code}',
      ${t.step},
      '${t.stepName.replace(/'/g, "''")}',
      '${t.title.replace(/'/g, "''")}',
      '${t.description.replace(/'/g, "''")}',
      ${t.emailSubject ? `'${t.emailSubject.replace(/'/g, "''")}'` : 'NULL'},
      ${t.ctaText ? `'${t.ctaText.replace(/'/g, "''")}'` : 'NULL'},
      ${t.ctaUrlTemplate ? `'${t.ctaUrlTemplate}'` : 'NULL'},
      '${t.triggerType}'::notification_trigger_type,
      '${t.triggerEvent}',
      ${t.triggerOffsetMinutes},
      ${t.triggerCondition ? `'${t.triggerCondition}'` : 'NULL'},
      ${emailRecipients},
      ${inappRecipients}
    )`
  }).join(",\n")

  return `
INSERT INTO public.notification_templates (
  code,
  step,
  step_name,
  title,
  description,
  email_subject,
  cta_text,
  cta_url_template,
  trigger_type,
  trigger_event,
  trigger_offset_minutes,
  trigger_condition,
  email_recipients,
  inapp_recipients
) VALUES
${values}
ON CONFLICT (code) DO UPDATE SET
  step = EXCLUDED.step,
  step_name = EXCLUDED.step_name,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  email_subject = EXCLUDED.email_subject,
  cta_text = EXCLUDED.cta_text,
  cta_url_template = EXCLUDED.cta_url_template,
  trigger_type = EXCLUDED.trigger_type,
  trigger_event = EXCLUDED.trigger_event,
  trigger_offset_minutes = EXCLUDED.trigger_offset_minutes,
  trigger_condition = EXCLUDED.trigger_condition,
  email_recipients = EXCLUDED.email_recipients,
  inapp_recipients = EXCLUDED.inapp_recipients,
  updated_at = now();
`
}
