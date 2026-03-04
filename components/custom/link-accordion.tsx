"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronUp } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { StepDetails } from "./step-details"

// =============================================================================
// TYPES
// =============================================================================

export interface LinkAccordionItem {
  /** Label shown in the accordion header (e.g. "Original link", "Additional footage #01"). Supports ReactNode for styled labels. */
  label: React.ReactNode
  /** StepDetails primary card props */
  primaryTitle: string
  primarySubtitle?: string
  primaryBackgroundImage?: string
  /** Callback when the primary card action button is clicked (e.g. open link). Pass only when this item has one or more links from the database; the button is shown only when this is provided. */
  primaryOnAction?: () => void
  /** StepDetails notes card props (optional) */
  noteText?: string
  noteAuthorName?: string
  noteAuthorImageUrl?: string
  /** User name who wrote the note (profiles.first_name + last_name). Shown as bold primary name in the author row. */
  noteAuthorUserName?: string
  /** User's profile image URL (profiles.image). Used for the avatar in the author row. */
  noteAuthorUserImageUrl?: string
  /** Relative time label for when the note was written (e.g. "2 hours ago"). */
  noteTimestamp?: string
  /** Whether this item is initially expanded */
  defaultOpen?: boolean
}

export interface LinkAccordionProps {
  /** Accordion items to render */
  items: LinkAccordionItem[]
  className?: string
}

// =============================================================================
// SINGLE ACCORDION ITEM
// =============================================================================

function LinkAccordionSection({
  item,
  isLast,
}: {
  item: LinkAccordionItem
  isLast: boolean
}) {
  const [open, setOpen] = React.useState(item.defaultOpen ?? true)

  return (
    <>
      <div className="flex flex-col gap-3 w-full">
        {/* Header: label + chevron toggle */}
        <button
          type="button"
          className="flex items-center justify-between w-full cursor-pointer group"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
        >
          <span className="text-sm font-medium text-muted-foreground">
            {item.label}
          </span>
          <ChevronUp
            className={cn(
              "size-4 text-muted-foreground shrink-0 transition-transform duration-200",
              !open && "rotate-180"
            )}
          />
        </button>

        {/* Collapsible content */}
        {open && (
          <div className="flex flex-col gap-3 w-full">
            {/* Step detail: primary variant (compact h-[96px]); whole card opens link when primaryOnAction is set */}
            <StepDetails
              variant="primary"
              mainTitle={item.primaryTitle}
              additionalInfo={item.primarySubtitle}
              backgroundImage={item.primaryBackgroundImage}
              onAction={item.primaryOnAction}
              makeCardClickable={!!item.primaryOnAction}
              contentGap="compact"
              className="min-h-[96px]"
            />

            {/* Step detail: notes variant (optional) — only when upload form had notes (non-empty) */}
            {item.noteText?.trim() && (
              <StepDetails
                variant="notes"
                mainTitle=""
                additionalInfo={item.noteText}
                authorName={item.noteAuthorName}
                authorImageUrl={item.noteAuthorImageUrl}
                authorUserName={item.noteAuthorUserName}
                authorUserImageUrl={item.noteAuthorUserImageUrl}
                noteTimestamp={item.noteTimestamp}
              />
            )}
          </div>
        )}
      </div>

      {/* Separator between items (not after last) */}
      {!isLast && <Separator />}
    </>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Link Accordion — Figma node 900-51168.
 *
 * A vertical list of collapsible sections. Each section contains:
 * - A label header with a chevron toggle (ChevronUp rotates when collapsed).
 * - A StepDetails primary card (compact 96px height) with background image, title, subtitle, and action button.
 * - An optional StepDetails notes card with text (see more/less) and author avatar + name.
 * - A Separator between items.
 *
 * Usage:
 * ```tsx
 * <LinkAccordion
 *   items={[
 *     {
 *       label: "Original link",
 *       primaryTitle: "Low-res photos",
 *       primarySubtitle: "Uploaded: 1 day ago",
 *       primaryBackgroundImage: "/assets/bg-lowres.png",
 *       primaryOnAction: () => window.open(url, "_blank"),
 *       noteText: "There was some problems...",
 *       noteAuthorName: "Erika Goldner",
 *     },
 *     {
 *       label: <><span>Additional footage </span><span className="text-lime-500">#01</span></>,
 *       primaryTitle: "Low-res photos",
 *       primarySubtitle: "Uploaded: 2 minutes ago",
 *       primaryOnAction: () => window.open(url, "_blank"),
 *       noteText: "New photos are ready!...",
 *       noteAuthorName: "Erika Goldner",
 *     },
 *   ]}
 * />
 * ```
 */
export function LinkAccordion({ items, className }: LinkAccordionProps) {
  if (items.length === 0) return null

  return (
    <div className={cn("flex flex-col gap-6 w-full", className)}>
      {items.map((item, index) => (
        <LinkAccordionSection
          key={index}
          item={item}
          isLast={index === items.length - 1}
        />
      ))}
    </div>
  )
}
