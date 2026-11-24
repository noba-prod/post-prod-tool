/**
 * Comment notification audience. Run with: npm run test:comment-recipients
 */

import type { ParticipantRole, StepId } from "@/lib/domain/collections"
import {
  resolveCommentAudience,
  type CommentAudienceMember,
  type CommentNoteKey,
  type CommentWorkflowConfig,
} from "../comment-recipients"

const ROLES: ParticipantRole[] = [
  "producer",
  "client",
  "photographer",
  "agency",
  "photo_lab",
  "retouch_studio",
  "handprint_lab",
]

function members(overrides: Partial<Record<ParticipantRole, Partial<CommentAudienceMember>>> = {}): CommentAudienceMember[] {
  return ROLES.map((role) => ({
    userId: role,
    role,
    hasEditPermission: true,
    ...overrides[role],
  }))
}

function rolesFor(
  noteKey: CommentNoteKey,
  config: CommentWorkflowConfig,
  options: {
    author?: string
    noteUrl?: string
    approved?: string[]
    contextStepId?: StepId
    memberOverrides?: Partial<Record<ParticipantRole, Partial<CommentAudienceMember>>>
    extraMembers?: CommentAudienceMember[]
  } = {}
): ParticipantRole[] {
  const audience = resolveCommentAudience({
    noteKey,
    config,
    members: [...members(options.memberOverrides), ...(options.extraMembers ?? [])],
    authorUserId: options.author ?? "nobody",
    contextStepId: options.contextStepId,
    context: { noteUrl: options.noteUrl, clientVisibleUrls: options.approved },
  })
  return audience.map((r) => r.role).sort()
}

function expectRoles(label: string, actual: ParticipantRole[], expected: ParticipantRole[]): void {
  const a = actual.join(",")
  const e = [...expected].sort().join(",")
  if (a !== e) throw new Error(`${label}: expected [${e}], got [${a}]`)
}

const digital: CommentWorkflowConfig = {
  hasHandprint: false,
  hasEditionStudio: false,
  handprintIsDifferentLab: false,
  hasAgency: true,
}
const digitalRetouch: CommentWorkflowConfig = { ...digital, hasEditionStudio: true }
const handprint: CommentWorkflowConfig = { ...digital, hasHandprint: true }
const handprintEdition: CommentWorkflowConfig = { ...handprint, hasEditionStudio: true }
const handprintDifferent: CommentWorkflowConfig = { ...handprint, handprintIsDifferentLab: true }

function run(): void {
  // Author is excluded; a user present under two roles is notified once.
  const duplicated = resolveCommentAudience({
    noteKey: "step_note_client_selection",
    config: digital,
    authorUserId: "photographer",
    members: [
      { userId: "photographer", role: "photographer", hasEditPermission: true },
      { userId: "shared", role: "agency", hasEditPermission: true },
      { userId: "shared", role: "producer", hasEditPermission: true },
      { userId: "client", role: "client", hasEditPermission: true },
    ],
  })
  const ids = duplicated.map((r) => r.userId).sort()
  if (ids.join(",") !== "client,shared") {
    throw new Error(`dedupe/author: expected client,shared, got ${ids.join(",")}`)
  }

  // Producer is part of every thread, including on a completed-stage comment (audience ignores status).
  expectRoles(
    "client selection, digital",
    rolesFor("step_note_client_selection", digital),
    ["producer", "client", "photographer", "agency"]
  )
  expectRoles(
    "client selection, different handprint lab",
    rolesFor("step_note_client_selection", handprintDifferent),
    ["producer", "client", "photographer", "agency", "handprint_lab"]
  )
  expectRoles(
    "client selection, same handprint lab",
    rolesFor("step_note_client_selection", handprint),
    ["producer", "client", "photographer", "agency", "photo_lab"]
  )

  // Low-res thread: the lab panel is edit-gated, so a lab member without edit permission is excluded.
  expectRoles(
    "low res, lab without edit",
    rolesFor("step_note_low_res", handprintEdition, {
      memberOverrides: { photo_lab: { hasEditPermission: false } },
    }),
    ["producer", "photographer", "agency"]
  )

  // Digital high-res is also shown to the client in Client confirmation.
  expectRoles(
    "high res, digital",
    rolesFor("step_note_high_res", digital),
    ["producer", "photographer", "agency", "client"]
  )
  expectRoles(
    "high res, handprint same lab",
    rolesFor("step_note_high_res", handprint),
    ["producer", "photographer", "agency", "photo_lab"]
  )

  // Retouch request on digital+retouch lives in the merged high-res panel and in final edits.
  expectRoles(
    "edition request, digital + retouch",
    rolesFor("step_note_edition_request", digitalRetouch),
    ["producer", "photographer", "agency", "retouch_studio"]
  )

  // Last-check comments reach the client only for links the photographer shared.
  expectRoles(
    "last check, shared link",
    rolesFor("step_note_photographer_last_check", handprintEdition, {
      noteUrl: "https://files/a",
      approved: ["https://files/a"],
    }),
    ["producer", "photographer", "agency", "retouch_studio", "client"]
  )
  expectRoles(
    "last check, unshared link",
    rolesFor("step_note_photographer_last_check", handprintEdition, {
      noteUrl: "https://files/private",
      approved: ["https://files/a"],
    }),
    ["producer", "photographer", "agency", "retouch_studio"]
  )

  // Client confirmation notes are requests to the photographer side.
  expectRoles(
    "client confirmation request",
    rolesFor("step_note_client_confirmation", digital, { author: "client" }),
    ["producer", "photographer", "agency"]
  )

  // Writing context adds a panel: a comment on the high-res thread written from client confirmation
  // still reaches the client even on an analog workflow.
  expectRoles(
    "context panel adds the client",
    rolesFor("step_note_high_res", handprint, { contextStepId: "client_confirmation" }),
    ["producer", "photographer", "agency", "photo_lab", "client"]
  )

  console.log("comment recipient checks passed")
}

run()
