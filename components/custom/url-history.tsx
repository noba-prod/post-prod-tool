"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { SquareArrowOutUpRight, CirclePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StepDetails } from "./step-details"

// =============================================================================
// TYPES
// =============================================================================

export interface UrlHistoryComment {
  authorUserName: string
  /** User profile image (profiles.image) only. Never use entity logo. If undefined, avatar shows initials. */
  authorUserImageUrl?: string
  /** Secondary label after "·". For photographer: use "Photographer" (type), not entity name (they are their own entity). */
  authorEntityName?: string
  text: string
  timestamp: string
  replies?: UrlHistoryComment[]
}

export interface UrlHistoryProps {
  /** Section title displayed at the top (e.g. "Low-res scans"). */
  title: string
  /** Comment thread entries. Each may contain nested `replies`. */
  comments?: UrlHistoryComment[]
  /** Callback for "Open link" button. Button hidden when undefined. */
  onOpenLink?: () => void
  /** Callback for "Add comment" button. Button hidden when undefined. */
  onAddComment?: () => void
  className?: string
}

// =============================================================================
// Connector-line constants derived from StepDetails notes layout:
//   p-5 (20px) padding + size-5 (20px) avatar → center at 30px from card edge.
// Replies are indented 50px; elbow width = 50 − 30 = 20px.
// =============================================================================

const AVATAR_CENTER_X = 30
const REPLY_INDENT = 50
const ELBOW_WIDTH = REPLY_INDENT - AVATAR_CENTER_X
const AVATAR_CENTER_Y = 30
const REPLY_GAP = 12

// =============================================================================
// SINGLE COMMENT NODE — recursively renders replies with connector lines
// =============================================================================

function CommentNode({
  comment,
  depth = 0,
}: {
  comment: UrlHistoryComment
  depth?: number
}) {
  const hasReplies = (comment.replies?.length ?? 0) > 0

  return (
    <div>
      {/* Comment card — reuses StepDetails notes (compressed) variant */}
      <StepDetails
        variant="notes"
        mainTitle=""
        additionalInfo={comment.text}
        authorUserName={comment.authorUserName}
        authorUserImageUrl={comment.authorUserImageUrl}
        authorName={comment.authorEntityName}
        noteTimestamp={comment.timestamp}
      />

      {/* Nested replies: L-shaped connector only for first reply; vertical separator between the rest */}
      {hasReplies && (
        <div
          className="mt-3"
          style={{ paddingLeft: REPLY_INDENT }}
        >
          {comment.replies!.map((reply, idx) => {
            const isFirst = idx === 0

            return (
              <React.Fragment key={idx}>
                {/* L-shaped connector only between root and first reply; no extension below */}
                {isFirst ? (
                  <div className="relative">
                    {/* L-shaped connector with 8px border-radius corner */}
                    <div
                      className="absolute pointer-events-none border-l border-b border-border rounded-bl-lg"
                      style={{
                        left: -ELBOW_WIDTH,
                        top: -REPLY_GAP,
                        width: ELBOW_WIDTH,
                        height: AVATAR_CENTER_Y + REPLY_GAP,
                      }}
                    />
                    <CommentNode comment={reply} depth={depth + 1} />
                  </div>
                ) : (
                  <CommentNode comment={reply} depth={depth + 1} />
                )}

                {/* Vertical separator between sibling replies: 12px height, 24px left padding, left-aligned */}
                {idx < comment.replies!.length - 1 && (
                  <div className="flex justify-start pl-6 py-0">
                    <div className="w-px h-3 bg-border shrink-0" />
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * URL History — Figma node 1125-1254329.
 *
 * Displays a URL entry (e.g. uploaded link) with its associated comment thread.
 *
 * Layout (top → bottom):
 *  1. Section title (text-lg font-semibold)
 *  2. Comment thread — each entry is a `StepDetails variant="notes"` card.
 *     Nested replies are indented 50 px and connected to the parent via
 *     straight 1 px L-shaped connector lines (border color) that originate
 *     at the parent's avatar center (30 px from card edge).
 *  3. Action buttons — "Open link" (primary) + "Add comment" (outline).
 *
 * Supports unlimited nesting depth; connector lines repeat per level.
 */
export function UrlHistory({
  title,
  comments = [],
  onOpenLink,
  onAddComment,
  className,
}: UrlHistoryProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border bg-sidebar overflow-hidden",
        className
      )}
    >
      {/* ── Section 1: Title + comment thread ── */}
      <div className="flex flex-col gap-5 p-4">
        <span className="text-lg font-semibold text-foreground">{title}</span>

        {comments.length > 0 && (
          <div className="flex flex-col gap-3">
            {comments.map((comment, idx) => (
              <CommentNode key={idx} comment={comment} depth={0} />
            ))}
          </div>
        )}
      </div>

      {/* ── Section 2: Action buttons ── */}
      {(onOpenLink || onAddComment) && (
        <div className="flex items-center gap-3 border-t border-border p-4">
          {onOpenLink && (
            <Button variant="default" size="default" onClick={onOpenLink}>
              <SquareArrowOutUpRight data-icon="inline-start" className="size-4" />
              Open link
            </Button>
          )}
          {onAddComment && (
            <Button variant="secondary" size="default" onClick={onAddComment}>
              <CirclePlus data-icon="inline-start" className="size-4" />
              Add comment
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
