"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, Repeat2 } from "lucide-react"

export type StepDetailsVariant = "primary" | "secondary" | "notes" | "missingPhotos"

export interface StepDetailsProps {
  /** Variant: primary (bg image + overlay), secondary (solid zinc), notes (notes from entity), missingPhotos (missing photos CTA) */
  variant?: StepDetailsVariant
  /** Main title (e.g. "Main title", "Notes from Client", "Missing photos?") */
  mainTitle: string
  /** Subtitle (primary/secondary/missingPhotos). For missingPhotos, use entity placeholder in text. */
  subtitle?: string
  /** Additional information line (primary/secondary/notes) */
  additionalInfo?: string
  /** Entity name for notes variant ("Notes from {entityName}") and missingPhotos subtitle ("... to {entityName}") */
  entityName?: string
  /** Background image URL for primary variant only. Default: /assets/bg-finals.png (documentation). Can vary per usage. */
  backgroundImage?: string
  /** Callback when the CTA button is clicked (primary: arrow button, secondary: arrow button, missingPhotos: repeat button). Not used for notes. */
  onAction?: () => void
  className?: string
}

/**
 * Step details card — 4 variants per Figma DS (node-id 13445-2873).
 * Uses design system typography: block-style title (text-2xl font-semibold), base subtitle, sm muted additional.
 * - primary: Background image + overlay, white text, CTA with ArrowUpRight.
 * - secondary: Solid zinc-100, dark text, CTA with ArrowUpRight.
 * - notes: Solid zinc-100, no card border; form-style title (text-base); additional info in quote-style div (left border + left padding); no CTA.
 * - missingPhotos: Solid zinc-100, "Missing photos?" + subtitle + CTA with Repeat icon.
 */
export function StepDetails({
  variant = "primary",
  mainTitle,
  subtitle,
  additionalInfo,
  entityName,
  backgroundImage = "/assets/bg-finals.png",
  onAction,
  className,
}: StepDetailsProps) {
  const isPrimary = variant === "primary"
  const isNotes = variant === "notes"
  const isMissingPhotos = variant === "missingPhotos"

  const resolvedTitle = isNotes && entityName
    ? `Notes from ${entityName}`
    : mainTitle
  const resolvedSubtitle = isMissingPhotos && entityName
    ? `Request additional footage to ${entityName}`
    : subtitle

  const textBlock = (
    <div className="flex flex-col gap-3 min-w-0">
      <span
        className={cn(
          "block font-semibold",
          isNotes && "text-base",
          !isNotes && "text-2xl leading-8",
          isPrimary && "text-white",
          !isPrimary && "text-foreground"
        )}
      >
        {resolvedTitle}
      </span>
      {resolvedSubtitle != null && resolvedSubtitle !== "" && (
        <span
          className={cn(
            "text-base font-normal block",
            isPrimary && "text-white/90",
            !isPrimary && (isMissingPhotos ? "text-muted-foreground" : "text-foreground/90")
          )}
        >
          {resolvedSubtitle}
        </span>
      )}
      {additionalInfo != null && additionalInfo !== "" && !isMissingPhotos && (
        isNotes ? (
          <div className="border-l-[3px] border-border pl-4">
            <span className="text-sm font-normal block text-muted-foreground">
              {additionalInfo}
            </span>
          </div>
        ) : (
          <span
            className={cn(
              "text-sm font-normal block",
              isPrimary && "text-white/60",
              !isPrimary && "text-muted-foreground"
            )}
          >
            {additionalInfo}
          </span>
        )
      )}
    </div>
  )

  const arrowButton = !isNotes && (isPrimary || variant === "secondary") && (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      className={cn(
        "shrink-0 rounded-xl",
        isPrimary && "bg-white/10 hover:bg-white/20 text-white",
        variant === "secondary" && "bg-black/5 hover:bg-black/10 text-foreground"
      )}
      onClick={onAction}
      aria-label="Open or go to"
    >
      <ArrowUpRight className="size-4" strokeWidth={1.33} />
    </Button>
  )

  const repeatButton = isMissingPhotos && (
    <div className="flex self-stretch min-h-0 shrink-0">
      <Button
        type="button"
        variant="default"
        size="icon-lg"
        className="h-full w-10 rounded-xl"
        onClick={onAction}
        aria-label="Request additional footage"
      >
        <Repeat2 className="size-4" strokeWidth={1.33} />
      </Button>
    </div>
  )

  if (isPrimary) {
    return (
      <div
        className={cn(
          "relative flex flex-col justify-end rounded-xl overflow-hidden min-h-[244px]",
          className
        )}
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
          "relative flex flex-col justify-end rounded-xl bg-zinc-100 min-h-[244px] p-5",
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

  return (
    <div
      className={cn(
        "flex rounded-xl bg-zinc-100 p-5",
        isNotes && "flex-col gap-1",
        isMissingPhotos && "flex-row items-stretch justify-between gap-4",
        className
      )}
    >
      {textBlock}
      {repeatButton}
    </div>
  )
}
