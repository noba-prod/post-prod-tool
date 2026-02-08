/**
 * Notification Templates Configuration
 * Source: notifications-automations.csv
 * 
 * These templates define all 24 notification types across 9 workflow steps.
 * They are used to seed the notification_templates database table.
 */

import type { Database } from "@/lib/supabase/database.types"

// Type aliases for the enums
export type TriggerType = "before" | "after" | "on" | "if" | "first_time"
export type RecipientType = "producer" | "lab" | "photographer" | "client" | "hand_print_lab" | "edition_studio"

export interface NotificationTemplateConfig {
  code: string
  step: number
  stepName: string
  title: string
  description: string
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
 * All 24 notification templates from the CSV
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
    ctaText: "Confirm pickup",
    ctaUrlTemplate: "/collections/{collectionId}?step=shooting",
    triggerType: "before",
    triggerEvent: "shooting_end",
    triggerOffsetMinutes: -30, // 30 minutes before
    triggerCondition: null,
    emailRecipients: ["producer"],
    inappRecipients: ["producer"],
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
    ctaText: "Confirm drop-off",
    ctaUrlTemplate: "/collections/{collectionId}?step=negatives_dropoff",
    triggerType: "on",
    triggerEvent: "negatives_pickup_marked",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["lab"],
    inappRecipients: [], // in-app for this event sent in triggerEvent (lab + producer)
  },
  {
    code: "dropoff_confirmation_reminder",
    step: 2,
    stepName: "Negatives drop off",
    title: "Have negatives been dropped off?",
    description: "Please confirm whether the negatives have already been delivered to the lab.",
    ctaText: "Confirm drop-off",
    ctaUrlTemplate: "/collections/{collectionId}?step=negatives_dropoff",
    triggerType: "if",
    triggerEvent: "dropoff_deadline",
    triggerOffsetMinutes: 120, // 2 hours after
    triggerCondition: "negatives_not_confirmed",
    emailRecipients: ["lab", "producer"],
    inappRecipients: ["lab", "producer"],
  },
  {
    code: "dropoff_delayed",
    step: 2,
    stepName: "Negatives drop off",
    title: "Drop-off delayed for collection [ID]",
    description: "The collection is delayed compared to the original plan. Please coordinate with the lab to review timings and possible rush options.",
    ctaText: null,
    ctaUrlTemplate: "/collections/{collectionId}?step=negatives_dropoff",
    triggerType: "on",
    triggerEvent: "dropoff_deadline_missed",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["producer"],
    inappRecipients: ["producer"],
  },

  // ==========================================================================
  // Step 3: Low-res Scanning
  // ==========================================================================
  {
    code: "scanning_deadline_risk",
    step: 3,
    stepName: "Low-res scanning",
    title: "Scanning deadline at risk",
    description: "The scanning deadline is approaching. Please confirm whether scanning will be completed on time.",
    ctaText: "Upload low-res",
    ctaUrlTemplate: "/collections/{collectionId}?step=low_res_scanning",
    triggerType: "before",
    triggerEvent: "scanning_deadline",
    triggerOffsetMinutes: -60, // 1 hour before
    triggerCondition: null,
    emailRecipients: ["lab"],
    inappRecipients: ["producer"],
  },
  {
    code: "scanning_completed",
    step: 3,
    stepName: "Low-res scanning",
    title: "Scanning completed",
    description: "Low-resolution scans are ready. Please review them and prepare the selection for the client.",
    ctaText: "Review low-res",
    ctaUrlTemplate: "/collections/{collectionId}?step=low_res_scanning",
    triggerType: "on",
    triggerEvent: "scanning_completed",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["photographer", "producer"],
    inappRecipients: ["photographer", "producer"],
  },
  {
    code: "scanning_delayed",
    step: 3,
    stepName: "Low-res scanning",
    title: "Low-res scanning delayed for collection [ID]",
    description: "The collection is delayed. Please align with the photographer and review updated timelines or rush options.",
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
    description: "The deadline to upload the photographer's selection is approaching. Please confirm that the selection is ready.",
    ctaText: "Upload selection",
    ctaUrlTemplate: "/collections/{collectionId}?step=photographer_selection",
    triggerType: "before",
    triggerEvent: "photographer_selection_deadline",
    triggerOffsetMinutes: -60, // 1 hour before
    triggerCondition: null,
    emailRecipients: ["photographer", "producer"],
    inappRecipients: ["photographer", "producer"],
  },
  {
    code: "photographer_selection_uploaded",
    step: 4,
    stepName: "Photographer selection",
    title: "Selection uploaded and ready",
    description: "The lab has uploaded the photographer selection. It is now ready for the client to review.",
    ctaText: "Review selection",
    ctaUrlTemplate: "/collections/{collectionId}?step=photographer_selection",
    triggerType: "on",
    triggerEvent: "photographer_selection_uploaded",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["producer", "client"],
    inappRecipients: ["producer", "client"],
  },
  {
    code: "photographer_selection_shared",
    step: 4,
    stepName: "Photographer selection",
    title: "Selection shared with client",
    description: "The photographer has shared a first image selection with the client for review.",
    ctaText: "Review selection",
    ctaUrlTemplate: "/collections/{collectionId}?step=photographer_selection",
    triggerType: "on",
    triggerEvent: "photographer_selection_shared",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["client"],
    inappRecipients: ["client"],
  },
  {
    code: "photographer_selection_delayed",
    step: 4,
    stepName: "Photographer selection",
    title: "Photographer selection delayed for collection [ID]",
    description: "The collection is delayed. Please coordinate with the client and photographer to update the timeline.",
    ctaText: null,
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
    code: "client_selection_morning_reminder",
    step: 5,
    stepName: "Client selection",
    title: "Client selection reminder",
    description: "Please complete the final image selection before the deadline.",
    ctaText: "Upload final selection",
    ctaUrlTemplate: "/collections/{collectionId}?step=client_selection",
    triggerType: "first_time",
    triggerEvent: "client_selection_deadline",
    triggerOffsetMinutes: 0, // Morning of the deadline day
    triggerCondition: "morning_reminder",
    emailRecipients: ["client"],
    inappRecipients: ["client"],
  },
  {
    code: "client_selection_urgent_reminder",
    step: 5,
    stepName: "Client selection",
    title: "Client selection reminder",
    description: "Please complete the final image selection before the deadline.",
    ctaText: "Upload final selection",
    ctaUrlTemplate: "/collections/{collectionId}?step=client_selection",
    triggerType: "if",
    triggerEvent: "client_selection_deadline",
    triggerOffsetMinutes: -60, // 1 hour before
    triggerCondition: "selection_not_completed",
    emailRecipients: ["client", "producer"],
    inappRecipients: ["client", "producer"],
  },
  {
    code: "client_selection_confirmed",
    step: 5,
    stepName: "Client selection",
    title: "Client final selection submitted",
    description: "The client has submitted the final image selection. Review it and proceed with high-resolution processing.",
    ctaText: "Review client selection",
    ctaUrlTemplate: "/collections/{collectionId}?step=client_selection",
    triggerType: "on",
    triggerEvent: "client_selection_confirmed",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["hand_print_lab", "photographer"],
    inappRecipients: ["hand_print_lab", "photographer"],
  },

  // ==========================================================================
  // Step 6: Hand Print High-res
  // ==========================================================================
  {
    code: "highres_deadline_risk",
    step: 6,
    stepName: "Hand print high-res",
    title: "High-resolution delivery at risk",
    description: "The deadline for high-resolution images is approaching. Please confirm progress with the lab.",
    ctaText: "Check HR",
    ctaUrlTemplate: "/collections/{collectionId}?step=handprint_high_res",
    triggerType: "before",
    triggerEvent: "highres_deadline",
    triggerOffsetMinutes: -60, // 1 hour before
    triggerCondition: null,
    emailRecipients: ["hand_print_lab", "producer"],
    inappRecipients: ["hand_print_lab", "producer"],
  },
  {
    code: "highres_delayed",
    step: 6,
    stepName: "Hand print high-res",
    title: "High-res delayed for collection [ID]",
    description: "High-resolution delivery is delayed. Please coordinate with the lab to adjust timings.",
    ctaText: null,
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
    step: 6,
    stepName: "Hand print high-res",
    title: "High-res ready for review",
    description: "High-resolution images are ready. Please review them and leave any comments if needed.",
    ctaText: "Check HR",
    ctaUrlTemplate: "/collections/{collectionId}?step=handprint_high_res",
    triggerType: "on",
    triggerEvent: "highres_ready",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["photographer", "producer"],
    inappRecipients: ["photographer", "producer"],
  },

  // ==========================================================================
  // Step 7: Edition Request
  // ==========================================================================
  {
    code: "edition_request_ready",
    step: 7,
    stepName: "Edition request",
    title: "Edition request ready – start edits",
    description: "All comments and instructions are ready. Please proceed with the requested edits.",
    ctaText: "Start edits",
    ctaUrlTemplate: "/collections/{collectionId}?step=edition_request",
    triggerType: "on",
    triggerEvent: "edition_request_submitted",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["edition_studio"],
    inappRecipients: ["edition_studio"],
  },
  {
    code: "edition_request_delayed",
    step: 7,
    stepName: "Edition request",
    title: "Edition request delayed for collection [ID]",
    description: "The collection is delayed. Please coordinate with the edition studio to update timelines.",
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
    step: 7,
    stepName: "Edition request",
    title: "Edits completion check",
    description: "Only 1 hour remains before moving to the final review. Please confirm whether edits are completed.",
    ctaText: null,
    ctaUrlTemplate: "/collections/{collectionId}?step=edition_request",
    triggerType: "before",
    triggerEvent: "final_edits_deadline",
    triggerOffsetMinutes: -60, // 1 hour before
    triggerCondition: null,
    emailRecipients: ["edition_studio"],
    inappRecipients: ["edition_studio"],
  },

  // ==========================================================================
  // Step 8: Final Edits
  // ==========================================================================
  {
    code: "final_edits_completed",
    step: 8,
    stepName: "Final edits",
    title: "Edits completed",
    description: "Edits are complete. Please review them and prepare to share the final images with the client.",
    ctaText: "Review edits",
    ctaUrlTemplate: "/collections/{collectionId}?step=final_edits",
    triggerType: "on",
    triggerEvent: "final_edits_completed",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["photographer", "producer"],
    inappRecipients: ["photographer", "producer"],
  },
  {
    code: "final_edits_delayed",
    step: 8,
    stepName: "Final edits",
    title: "Final edits delayed for collection [ID]",
    description: "Final edits are delayed. Please review the situation and update the timeline accordingly.",
    ctaText: null,
    ctaUrlTemplate: "/collections/{collectionId}?step=final_edits",
    triggerType: "after",
    triggerEvent: "final_edits_deadline",
    triggerOffsetMinutes: 60, // 1 hour after
    triggerCondition: null,
    emailRecipients: ["producer"],
    inappRecipients: ["producer"],
  },

  // ==========================================================================
  // Step 9: Photographer Last Check
  // ==========================================================================
  {
    code: "photographer_review_reminder",
    step: 9,
    stepName: "Photographer last check",
    title: "Photographer review reminder",
    description: "Please review and approve the edited images before the deadline.",
    ctaText: null,
    ctaUrlTemplate: "/collections/{collectionId}?step=photographer_last_check",
    triggerType: "before",
    triggerEvent: "photographer_review_deadline",
    triggerOffsetMinutes: -60, // 1 hour before
    triggerCondition: null,
    emailRecipients: ["photographer"],
    inappRecipients: ["photographer"],
  },
  {
    code: "photographer_edits_approved",
    step: 9,
    stepName: "Photographer last check",
    title: "Edits approved by photographer",
    description: "The photographer has approved the final edits. Finals are ready, check now!",
    ctaText: "Share with client",
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
    step: 9,
    stepName: "Photographer last check",
    title: "Photographer review delayed for collection [ID]",
    description: "The final review is delayed. Please align on next steps and update the timeline.",
    ctaText: null,
    ctaUrlTemplate: "/collections/{collectionId}?step=photographer_last_check",
    triggerType: "on",
    triggerEvent: "photographer_review_deadline_missed",
    triggerOffsetMinutes: 0,
    triggerCondition: null,
    emailRecipients: ["producer"],
    inappRecipients: ["producer"],
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
  
  // Photographer review
  photographer_review_deadline: "check_finals_photographer_check_date", // + time
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
