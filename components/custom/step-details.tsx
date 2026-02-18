"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SquareArrowOutUpRight, Repeat2, Check } from "lucide-react"

export type StepDetailsVariant = "primary" | "secondary" | "notes" | "missingPhotos" | "additionalRequest"

export interface StepDetailsProps {
  /** Variant: primary (bg image + overlay), secondary (solid zinc), notes (notes from entity), missingPhotos (missing photos CTA), additionalRequest (entity requesting additional photos). */
  variant?: StepDetailsVariant
  /** Main title (e.g. "Main title", "Notes from Client", "Missing photos?") */
  mainTitle: string
  /** Subtitle (primary/secondary/missingPhotos). For missingPhotos, use entity placeholder in text. Can be ReactNode for styled value (e.g. provider with lime-400). */
  subtitle?: string | React.ReactNode
  /** Additional information line (primary/secondary/notes/additionalRequest). Can be ReactNode for styled content (e.g. @entity in lime). */
  additionalInfo?: string | React.ReactNode
  /** Entity name for notes variant ("Notes from {entityName}"), missingPhotos subtitle ("... to {entityName}"), and additionalRequest title ("{entityName} is requesting additional photos"). */
  entityName?: string
  /** Background image URL for primary variant only. Default: /assets/bg-finals.png (documentation). Can vary per usage. */
  backgroundImage?: string
  /** Callback when the CTA button is clicked (primary: arrow button, secondary: arrow button, missingPhotos: repeat button). Not used for notes or additionalRequest. */
  onAction?: () => void
  /** When true (primary variant), the whole card is clickable with the same onAction; button click stops propagation to avoid double fire. */
  makeCardClickable?: boolean
  /** When true, hide the arrow/action button (e.g. for secondary cards in Negatives drop-off step). */
  hideActionButton?: boolean
  /** When true (secondary variant), height hugs content instead of min-h-[244px]. */
  hugContent?: boolean
  /** When true, subtitle is truncated to a single line (overflow ellipsis). */
  truncateSubtitle?: boolean
  /** Gap between title and subtitle block (primary/secondary). Use "compact" (6px) e.g. in LinkAccordion; default is 12px. */
  contentGap?: "default" | "compact"
  /** Author name shown below notes content (notes variant only). */
  authorName?: string
  /** Author avatar image URL (notes variant only). */
  authorImageUrl?: string
  /** When true (additionalRequest variant), shows a "Completed" chip indicating the request has been addressed. */
  isCompleted?: boolean
  className?: string
}

/** Shared quote-style border: #0A0A0A at 40% opacity, 2px left. */
const quoteBorderClasses = "border-l-2 border-[#0A0A0A]/40 pl-4 min-w-0"

/** Quote block with "see more/less" shown only when text is actually truncated (overflow). */
function QuoteWithSeeMore({
  text,
  expanded,
  onToggle,
}: {
  text: string
  expanded: boolean
  onToggle: () => void
}) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const [isTruncated, setIsTruncated] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setIsTruncated(el.scrollWidth > el.clientWidth)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [text])

  return (
    <div className={quoteBorderClasses}>
      <div className="flex flex-wrap items-baseline gap-x-1 min-w-0">
        <span
          ref={ref}
          className={cn(
            "text-sm font-medium text-foreground/60",
            !expanded && "truncate min-w-0",
            expanded ? "flex-1 basis-full" : "flex-1 min-w-0"
          )}
        >
          {text}
        </span>
        {(isTruncated || expanded) && (
          <button
            type="button"
            className="text-sm font-semibold text-foreground/80 hover:underline cursor-pointer shrink-0"
            onClick={onToggle}
          >
            {expanded ? "see less" : "see more"}
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Step details card — 6 variants per Figma DS (node-id 13445-2873).
 * Uses design system typography: block-style title (text-xl font-semibold), base subtitle, sm muted additional.
 * - primary: Background image + overlay, white text, CTA with SquareArrowOutUpRight (only when onAction is provided).
 * - secondary: Solid zinc-100, dark text, CTA with SquareArrowOutUpRight (only when onAction is provided).
 * - notes: Solid sidebar-accent; no title visible; additional info in quote-style (left border);
 *          text truncated to 1 line with "see more"/"see less" toggle (only when truncated); author avatar + name below.
 * - missingPhotos: Solid zinc-100, "Missing photos?" + subtitle + CTA with Repeat icon.
 * - additionalRequest: Solid sidebar-accent, "<entity> is requesting additional photos" title + quote-style additional info (see more only when truncated); no CTA.
 */
export function StepDetails({
  variant = "primary",
  mainTitle,
  subtitle,
  additionalInfo,
  entityName,
  backgroundImage = "/assets/bg-finals.png",
  onAction,
  makeCardClickable = false,
  hideActionButton = false,
  hugContent = false,
  truncateSubtitle = false,
  contentGap = "default",
  authorName,
  authorImageUrl,
  isCompleted = false,
  className,
}: StepDetailsProps) {
  const isPrimary = variant === "primary"
  const isNotes = variant === "notes"
  const isMissingPhotos = variant === "missingPhotos"
  const isAdditionalRequest = variant === "additionalRequest"

  const [notesExpanded, setNotesExpanded] = React.useState(false)
  const [additionalRequestExpanded, setAdditionalRequestExpanded] = React.useState(false)

  const resolvedTitle = isNotes && entityName
    ? `Notes from ${entityName}`
    : isAdditionalRequest && entityName
      ? entityName
      : mainTitle
  const resolvedSubtitle = isMissingPhotos && entityName
    ? `Request additional footage to ${entityName}`
    : subtitle

  const hasSubtitle =
    resolvedSubtitle != null &&
    (typeof resolvedSubtitle !== "string" || resolvedSubtitle !== "")

  // ---------------------------------------------------------------------------
  // Notes variant (compressed / displayed toggle)
  // ---------------------------------------------------------------------------
  if (isNotes) {
    const noteText =
      typeof additionalInfo === "string" && additionalInfo.trim()
        ? additionalInfo
        : typeof resolvedSubtitle === "string" && resolvedSubtitle.trim()
          ? resolvedSubtitle
          : null

    const authorFirstInitial = authorName?.trim().charAt(0).toUpperCase() ?? ""

    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-xl bg-sidebar-accent p-5",
          className
        )}
      >
        {/* Quote block: see more/less only when text is truncated */}
        {noteText && (
          <QuoteWithSeeMore
            text={noteText}
            expanded={notesExpanded}
            onToggle={() => setNotesExpanded((p) => !p)}
          />
        )}

        {/* Author row: Avatar ExtraSmall (20px) + name */}
        {authorName && (
          <div className="flex items-center gap-2">
            <Avatar size="xs" className="size-5 shrink-0">
              {authorImageUrl && <AvatarImage src={authorImageUrl} alt="" />}
              <AvatarFallback className="text-[10px]">
                {authorFirstInitial}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-semibold text-sidebar-foreground truncate">
              {authorName}
            </span>
          </div>
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Additional Request variant (with see more/less on additional info)
  // ---------------------------------------------------------------------------
  if (isAdditionalRequest) {
    const additionalRequestText =
      typeof additionalInfo === "string" && additionalInfo.trim()
        ? additionalInfo
        : null

    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-xl bg-sidebar-accent p-5",
          className
        )}
      >
        {/* Title row: <entity> is requesting / requested additional photos + optional Completed chip */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-base font-semibold text-foreground">
            <span className="text-lime-500">{resolvedTitle}</span>
            <span>{isCompleted ? " requested additional photos" : " is requesting additional photos"}</span>
          </p>
          {isCompleted && (
            <span className="inline-flex items-center gap-1 shrink-0 rounded-md bg-lime-50 px-2 py-0.5 text-xs font-semibold text-lime-600">
              <Check className="size-3" strokeWidth={2.5} />
              Completed
            </span>
          )}
        </div>

        {/* Quote-style additional info: see more/less only when text is truncated */}
        {additionalRequestText ? (
          <QuoteWithSeeMore
            text={additionalRequestText}
            expanded={additionalRequestExpanded}
            onToggle={() => setAdditionalRequestExpanded((p) => !p)}
          />
        ) : additionalInfo != null && (typeof additionalInfo !== "string" || additionalInfo !== "") ? (
          <div className={quoteBorderClasses}>
            <span className="text-sm font-medium block text-foreground/60">
              {additionalInfo}
            </span>
          </div>
        ) : null}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Shared text block for primary / secondary / missingPhotos
  // ---------------------------------------------------------------------------
  const textBlock = (
    <div
      className={cn(
        "flex flex-col min-w-0",
        contentGap === "compact" || isMissingPhotos ? "gap-1.5" : "gap-3"
      )}
    >
      <span
        className={cn(
          "block font-semibold",
          isMissingPhotos && "text-base",
          !isMissingPhotos && "text-xl leading-8",
          isPrimary && "text-white",
          !isPrimary && "text-foreground"
        )}
      >
        {resolvedTitle}
      </span>
      {(hasSubtitle || (additionalInfo != null && (typeof additionalInfo !== "string" || additionalInfo !== "") && !isMissingPhotos)) && (
        <div className="flex flex-col gap-1 min-w-0">
          {hasSubtitle && (
            <span
              className={cn(
                "text-sm font-medium block",
                truncateSubtitle && "truncate",
                isPrimary && "text-white/90",
                !isPrimary && (isMissingPhotos ? "text-muted-foreground" : "text-foreground/90")
              )}
            >
              {resolvedSubtitle}
            </span>
          )}
          {additionalInfo != null && (typeof additionalInfo !== "string" || additionalInfo !== "") && !isMissingPhotos && (
            <span
              className={cn(
                "text-sm font-normal block",
                isPrimary && "text-white/60",
                !isPrimary && "text-muted-foreground"
              )}
            >
              {additionalInfo}
            </span>
          )}
        </div>
      )}
    </div>
  )

  const arrowButton = !hideActionButton && onAction != null && (isPrimary || variant === "secondary") && (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      className={cn(
        "shrink-0 rounded-xl",
        isPrimary && "bg-white/10 hover:bg-white/20 text-white",
        variant === "secondary" && "bg-black/5 hover:bg-black/10 text-foreground"
      )}
      onClick={(e) => {
        if (makeCardClickable) e.stopPropagation()
        onAction?.()
      }}
      aria-label="Open or go to"
    >
      <SquareArrowOutUpRight className="size-4" strokeWidth={1.33} />
    </Button>
  )

  const repeatButton = isMissingPhotos && (
    <div className="flex self-stretch min-h-0 shrink-0">
      <Button
        type="button"
        variant="default"
        size="icon-lg"
        className="h-full w-10 rounded-xl"
        onClick={(e) => {
          e.stopPropagation()
          onAction?.()
        }}
        aria-label="Request additional footage"
      >
        <Repeat2 className="size-4" strokeWidth={1.33} />
      </Button>
    </div>
  )

  if (isPrimary) {
    return (
      <div
        role={makeCardClickable ? "button" : undefined}
        tabIndex={makeCardClickable ? 0 : undefined}
        className={cn(
          "relative flex flex-col justify-end rounded-xl overflow-hidden min-h-[244px]",
          makeCardClickable && "cursor-pointer",
          className
        )}
        onClick={makeCardClickable ? onAction : undefined}
        onKeyDown={
          makeCardClickable && onAction
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onAction()
                }
              }
            : undefined
        }
      >
        <img
          src={backgroundImage}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-foreground/40" />
        {/* Button: top-right, 20px from top and right */}
        {arrowButton && (
          <div className="absolute top-5 right-5 z-10">
            {arrowButton}
          </div>
        )}
        {/* Content: bottom, 20px from bottom and sides */}
        <div className="relative z-10 pb-5 pl-5 pr-5">
          {textBlock}
        </div>
      </div>
    )
  }

  if (variant === "secondary") {
    return (
      <div
        className={cn(
          "relative flex flex-col justify-end rounded-xl bg-zinc-100 p-5",
          !hugContent && "min-h-[244px]",
          className
        )}
      >
        {/* Button: top-right, 20px from top and right */}
        {arrowButton && (
          <div className="absolute top-5 right-5">
            {arrowButton}
          </div>
        )}
        {/* Content: bottom, 20px from bottom and sides (p-5 provides 20px) */}
        {textBlock}
      </div>
    )
  }

  // missingPhotos
  return (
    <div
      role={isMissingPhotos && onAction ? "button" : undefined}
      tabIndex={isMissingPhotos && onAction ? 0 : undefined}
      className={cn(
        "flex rounded-xl bg-zinc-100 p-5",
        isMissingPhotos && "flex-row items-stretch justify-between gap-4",
        isMissingPhotos && onAction && "cursor-pointer",
        className
      )}
      onClick={isMissingPhotos ? onAction : undefined}
      onKeyDown={
        isMissingPhotos && onAction
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onAction()
              }
            }
          : undefined
      }
    >
      {textBlock}
      {repeatButton}
    </div>
  )
}
