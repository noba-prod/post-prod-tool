/**
 * Comment notification audience.
 *
 * A comment belongs to a step-note thread (`step_note_*`, keyed by the link's step) but it is
 * rendered in one or more stage panels of the collection detail (see `renderUrlHistory` /
 * `buildUrlHistoryItems` in `collection-template.tsx`). Everyone who can see the thread in at
 * least one of those panels is notified — derived from the workflow ownership/visibility rules
 * (`getStepOwner`, `canUserViewStepUrlHistory`) instead of a per-role list.
 *
 * Pure: no database access. The notifications service loads members and config and calls this.
 */

import {
  canUserViewStepUrlHistory,
  getStepOwner,
} from "@/lib/domain/collections/workflow"
import type {
  CollectionDraft,
  ParticipantRole,
  StepId,
  UserForPermission,
} from "@/lib/domain/collections/types"

export type CommentNoteKey =
  | "step_note_low_res"
  | "step_note_photographer_selection"
  | "step_note_client_selection"
  | "step_note_high_res"
  | "step_note_edition_request"
  | "step_note_final_edits"
  | "step_note_photographer_last_check"
  | "step_note_client_confirmation"

export const COMMENT_NOTE_KEYS: readonly CommentNoteKey[] = [
  "step_note_low_res",
  "step_note_photographer_selection",
  "step_note_client_selection",
  "step_note_high_res",
  "step_note_edition_request",
  "step_note_final_edits",
  "step_note_photographer_last_check",
  "step_note_client_confirmation",
]

/** Step that owns each thread (where its links are uploaded). */
export const COMMENT_THREAD_HOME_STEP: Record<CommentNoteKey, StepId> = {
  step_note_low_res: "low_res_scanning",
  step_note_photographer_selection: "photographer_selection",
  step_note_client_selection: "client_selection",
  step_note_high_res: "handprint_high_res",
  step_note_edition_request: "edition_request",
  step_note_final_edits: "final_edits",
  step_note_photographer_last_check: "photographer_last_check",
  step_note_client_confirmation: "client_confirmation",
}

export function isCommentNoteKey(value: string): value is CommentNoteKey {
  return (COMMENT_NOTE_KEYS as readonly string[]).includes(value)
}

export interface CommentWorkflowConfig {
  hasHandprint: boolean
  hasEditionStudio: boolean
  handprintIsDifferentLab: boolean
  hasAgency: boolean
}

/** Execution steps that exist for this workflow variant (inactive steps are greyed out and not openable). */
export function isCommentPanelActive(stepId: StepId, config: CommentWorkflowConfig): boolean {
  switch (stepId) {
    case "negatives_dropoff":
    case "low_res_scanning":
      return config.hasHandprint
    case "edition_request":
      // Digital + Retouch merges the retouch request into handprint_high_res.
      return config.hasHandprint && config.hasEditionStudio
    case "final_edits":
      return config.hasEditionStudio
    case "photographer_last_check":
      return config.hasHandprint || config.hasEditionStudio
    default:
      return true
  }
}

export interface CommentThreadContext {
  /** URL of the link the comment is attached to, if any. */
  noteUrl?: string | null
  /**
   * URLs the photographer shared with the client (`photographer_approved_material_urls`).
   * Photographer last-check comments are only visible in Client confirmation for these links.
   */
  clientVisibleUrls?: string[]
}

/**
 * Stage panels where a thread is rendered, per workflow variant.
 * Keep in sync with the UrlHistory blocks of each stage panel in `collection-template.tsx`.
 */
export function getCommentThreadPanels(
  noteKey: CommentNoteKey,
  config: CommentWorkflowConfig,
  context: CommentThreadContext = {}
): StepId[] {
  const isDigital = !config.hasHandprint
  const panels: StepId[] = []
  switch (noteKey) {
    case "step_note_low_res":
      panels.push("low_res_scanning", "photographer_selection")
      break
    case "step_note_photographer_selection":
      panels.push("photographer_selection", "client_selection")
      break
    case "step_note_client_selection":
      panels.push("client_selection", "handprint_high_res")
      break
    case "step_note_high_res":
      panels.push("handprint_high_res")
      if (config.hasEditionStudio && !isDigital) panels.push("edition_request")
      if (!config.hasEditionStudio && !isDigital) panels.push("photographer_last_check")
      if (!config.hasEditionStudio && isDigital) panels.push("client_confirmation")
      break
    case "step_note_edition_request":
      panels.push("edition_request", "final_edits")
      if (isDigital) panels.push("handprint_high_res")
      break
    case "step_note_final_edits":
      panels.push("final_edits", "photographer_last_check")
      break
    case "step_note_photographer_last_check": {
      panels.push("photographer_last_check")
      const url = context.noteUrl?.trim()
      if (!url || (context.clientVisibleUrls ?? []).includes(url)) {
        panels.push("client_confirmation")
      }
      break
    }
    case "step_note_client_confirmation":
      panels.push("client_confirmation")
      break
  }
  return panels.filter((stepId) => isCommentPanelActive(stepId, config))
}

/** Panels whose UrlHistory blocks are gated on edit permission (`canShowModalActions` in the template). */
const EDIT_GATED_PANELS: ReadonlySet<StepId> = new Set(["low_res_scanning", "final_edits"])

function toDraft(config: CommentWorkflowConfig): CollectionDraft {
  return { config } as unknown as CollectionDraft
}

/** Whether a collection member sees the thread when opening `panel`. */
export function canMemberSeeCommentPanel(
  user: UserForPermission,
  panel: StepId,
  config: CommentWorkflowConfig
): boolean {
  const draft = toDraft(config)
  const owners = getStepOwner(panel, draft)
  if (EDIT_GATED_PANELS.has(panel)) {
    return owners.includes(user.role) && user.hasEditPermission
  }
  if (panel === "client_confirmation") {
    // No permission gate in the panel; relevant audience is the step owners.
    return owners.includes(user.role)
  }
  return canUserViewStepUrlHistory(user, panel, draft)
}

function extraAudience(
  noteKey: CommentNoteKey,
  user: UserForPermission,
  config: CommentWorkflowConfig
): StepId | undefined {
  if (noteKey === "step_note_client_confirmation") {
    if (user.role === "photographer" || (user.role === "agency" && config.hasAgency)) {
      return "client_confirmation"
    }
  }
  // Change requests written on the last check are addressed to the retouch studio.
  if (
    noteKey === "step_note_photographer_last_check" &&
    config.hasEditionStudio &&
    user.role === "retouch_studio"
  ) {
    return "final_edits"
  }
  return undefined
}

export interface CommentAudienceMember {
  userId: string
  role: ParticipantRole
  hasEditPermission: boolean
}

export interface CommentAudienceInput {
  noteKey: CommentNoteKey
  config: CommentWorkflowConfig
  members: CommentAudienceMember[]
  authorUserId: string
  /** Panel where the comment was written (UI context); always part of the audience. */
  contextStepId?: StepId | null
  context?: CommentThreadContext
}

export interface CommentAudienceRecipient {
  userId: string
  role: ParticipantRole
  /** Panel to deep-link to: the writing context if visible to the recipient, else the first visible panel. */
  panel: StepId
}

/**
 * Members to notify for a new comment: union of the thread's panels (+ the panel where it was
 * written), excluding the author, one entry per user even with several roles.
 */
export function resolveCommentAudience(input: CommentAudienceInput): CommentAudienceRecipient[] {
  const { noteKey, config, members, authorUserId, contextStepId, context } = input
  const panels: StepId[] = []
  if (contextStepId && isCommentPanelActive(contextStepId, config)) panels.push(contextStepId)
  for (const panel of getCommentThreadPanels(noteKey, config, context)) {
    if (!panels.includes(panel)) panels.push(panel)
  }

  const byUser = new Map<string, CommentAudienceRecipient>()
  for (const member of members) {
    // A user can be a member under several roles: one notification per user.
    if (!member.userId || member.userId === authorUserId || byUser.has(member.userId)) continue
    const user: UserForPermission = { role: member.role, hasEditPermission: member.hasEditPermission }
    const visiblePanel = panels.find((panel) => canMemberSeeCommentPanel(user, panel, config))
    const panel = visiblePanel ?? extraAudience(noteKey, user, config)
    if (panel) byUser.set(member.userId, { userId: member.userId, role: member.role, panel })
  }
  return [...byUser.values()]
}

/** Maps `collection_members.role` to the domain participant role. */
export function memberRoleToParticipantRole(dbRole: string): ParticipantRole | null {
  switch (dbRole) {
    case "noba":
    case "producer":
      return "producer"
    case "client":
    case "photographer":
    case "agency":
    case "photo_lab":
    case "retouch_studio":
    case "handprint_lab":
      return dbRole
    default:
      return null
  }
}
