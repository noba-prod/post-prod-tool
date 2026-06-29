/**
 * Maps collection workflow step IDs to DB URL/notes columns for link edit/delete.
 */

export interface StepLinkMutationConfig {
  urlDbKey: string
  notesDbKey: string
  uploadedAtDbKey: string
  stepNoteKey: string
  /** When true, also sync highres_selection_url (digital + retouch combined link). */
  syncHighResOnMutation?: boolean
}

export const STEP_LINK_MUTATION_CONFIG: Record<string, StepLinkMutationConfig> = {
  low_res_scanning: {
    urlDbKey: "lowres_selection_url",
    notesDbKey: "step_notes_low_res",
    uploadedAtDbKey: "lowres_selection_uploaded_at",
    stepNoteKey: "step_note_low_res",
  },
  photographer_selection: {
    urlDbKey: "photographer_selection_url",
    notesDbKey: "step_notes_photographer_selection",
    uploadedAtDbKey: "photographer_selection_uploaded_at",
    stepNoteKey: "step_note_photographer_selection",
  },
  client_selection: {
    urlDbKey: "client_selection_url",
    notesDbKey: "step_notes_client_selection",
    uploadedAtDbKey: "client_selection_uploaded_at",
    stepNoteKey: "step_note_client_selection",
  },
  handprint_high_res: {
    urlDbKey: "highres_selection_url",
    notesDbKey: "step_notes_high_res",
    uploadedAtDbKey: "highres_selection_uploaded_at",
    stepNoteKey: "step_note_high_res",
  },
  edition_request: {
    urlDbKey: "edition_instructions_url",
    notesDbKey: "step_notes_edition_request",
    uploadedAtDbKey: "edition_instructions_uploaded_at",
    stepNoteKey: "step_note_edition_request",
    syncHighResOnMutation: true,
  },
  final_edits: {
    urlDbKey: "finals_selection_url",
    notesDbKey: "step_notes_final_edits",
    uploadedAtDbKey: "finals_selection_uploaded_at",
    stepNoteKey: "step_note_final_edits",
  },
  photographer_last_check: {
    urlDbKey: "photographer_last_check_url",
    notesDbKey: "step_notes_photographer_last_check",
    uploadedAtDbKey: "photographer_last_check_uploaded_at",
    stepNoteKey: "step_note_photographer_last_check",
  },
}

export function getStepLinkMutationConfig(stepId: string): StepLinkMutationConfig | null {
  return STEP_LINK_MUTATION_CONFIG[stepId] ?? null
}
