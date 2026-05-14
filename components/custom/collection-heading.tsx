"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Titles } from "./titles"
import {
  CollectionProgressTag,
  CollectionStatusTag,
  StageStatusTag,
  TimeStampTag,
  DateIndicatorTag,
  PhotographerNameTag,
  ShootingTypeTag,
} from "./tag"
import { Button } from "@/components/ui/button"
import { Settings, Users } from "lucide-react"

type CollectionHeadingType = "main" | "stage"
type StageStatus = "upcoming" | "in-progress" | "in-transit" | "done" | "delivered"
type TimeStampStatus = "on-track" | "on-time" | "delayed" | "at-risk"

// ============================================================================
// MAIN VARIANT PROPS
// ============================================================================

interface CollectionHeadingMainProps {
  type: "main"
  /** Collection name */
  collectionName?: string
  /** Client name (shown in lime color) */
  clientName?: string
  /** Progress percentage (0-100) */
  progress?: number
  /** Stage status tag */
  stageStatus?: StageStatus
  /** Show stage status tag */
  showStageStatus?: boolean
  /** When true, hide the collection progress percentage pill (e.g. canceled collection). */
  hideProgress?: boolean
  /** When set, shows collection lifecycle (e.g. Canceled) instead of workflow StageStatusTag. */
  collectionLifecycleStatus?: "draft" | "upcoming" | "in-progress" | "completed" | "canceled"
  /** Shooting type: Digital or Analog HP/HR (tag to the left of photographer tag) */
  shootingType?: "digital" | "handprint_hp" | "handprint_hr"
  /** Photographer name (shown in photographer tag) */
  photographerName?: string
  /** Show photographer name tag */
  showPhotographerName?: boolean
  /** Show participants button */
  showParticipantsButton?: boolean
  /** Show settings button */
  showSettingsButton?: boolean
  /** Callback when Participants button is clicked */
  onParticipants?: () => void
  /** Callback when Settings button is clicked */
  onSettings?: () => void
  className?: string
}

// ============================================================================
// STAGE VARIANT PROPS
// ============================================================================

interface CollectionHeadingStageProps {
  type: "stage"
  /** Stage title (e.g., "Client selection") */
  stageTitle?: string
  /** Stage status (Upcoming, In progress, etc.) */
  stageStatus?: StageStatus
  /** Show stage status tag */
  showStageStatus?: boolean
  /** Time stamp status (At risk, Delayed, etc.) */
  timeStampStatus?: TimeStampStatus
  /** Show time stamp tag */
  showTimeStamp?: boolean
  /** Deadline label */
  deadlineLabel?: string
  /** Deadline date */
  deadlineDate?: string
  /** Deadline time */
  deadlineTime?: string
  className?: string
}

type CollectionHeadingProps = CollectionHeadingMainProps | CollectionHeadingStageProps

/** Viewport width strictly below this → “mobile” for title/client stacking. */
const COLLECTION_HEADING_SM_BREAKPOINT = 640
/** Collection name + client name + glue “by” must exceed this to stack on mobile. */
const COLLECTION_HEADING_TITLE_CHAR_THRESHOLD = 24

function useViewportBelowWidth(widthPx: number): boolean {
  const query = React.useMemo(
    () => `(max-width: ${widthPx - 1}px)`,
    [widthPx]
  )

  const subscribe = React.useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === "undefined") return () => {}
      const mq = window.matchMedia(query)
      const onChange = () => onStoreChange()
      mq.addEventListener("change", onChange)
      return () => mq.removeEventListener("change", onChange)
    },
    [query]
  )

  const getSnapshot = React.useCallback(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia(query).matches
  }, [query])

  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}

/**
 * Collection Heading Component
 * 
 * Figma variants (node-id: 13444-5735):
 * - main: Collection title + progress + stage status + CTA buttons
 * - stage: Stage title + stage status + time stamp + deadline
 */
export function CollectionHeading(props: CollectionHeadingProps) {
  const { type, className } = props

  // ============================================================================
  // STAGE VARIANT
  // ============================================================================
  if (type === "stage") {
    const {
      stageTitle = "Client selection",
      stageStatus = "upcoming",
      showStageStatus = true,
      timeStampStatus = "at-risk",
      showTimeStamp = true,
      deadlineLabel = "Deadline:",
      deadlineDate = "Dec 6, 2025",
      deadlineTime = "End of day (5:00pm)",
    } = props as CollectionHeadingStageProps

    return (
      <div className={cn("flex flex-col gap-2 w-full", className)}>
        {/* Stage title (Block, 24px) */}
        <Titles
          type="block"
          title={stageTitle}
          showSubtitle={false}
        />

        {/* Subheading: tags */}
        <div className="flex items-center gap-2">
          {showStageStatus && (
            <StageStatusTag status={stageStatus} />
          )}
          {showTimeStamp && (
            <TimeStampTag status={timeStampStatus} />
          )}
          <DateIndicatorTag
            label={deadlineLabel}
            date={deadlineDate}
            time={deadlineTime}
          />
        </div>
      </div>
    )
  }

  // ============================================================================
  // MAIN VARIANT
  // ============================================================================
  const {
    collectionName = "Kids Summer'25",
    clientName = "@zara",
    progress = 0,
    stageStatus = "upcoming",
    showStageStatus = true,
    hideProgress = false,
    collectionLifecycleStatus,
    shootingType,
    photographerName,
    showPhotographerName = false,
    showParticipantsButton = true,
    showSettingsButton = true,
    onParticipants,
    onSettings,
  } = props as CollectionHeadingMainProps

  const isBelowSm = useViewportBelowWidth(COLLECTION_HEADING_SM_BREAKPOINT)
  const namePart = (collectionName ?? "").trim()
  const clientPart = (clientName ?? "").trim()
  /* Include literal “by” (2 chars) so long single-line headings match visual width vs threshold. */
  const titleCharCount =
    namePart.length +
    clientPart.length +
    (namePart.length > 0 && clientPart.length > 0 ? 2 : 0)
  const stackTitleBlock =
    isBelowSm && titleCharCount > COLLECTION_HEADING_TITLE_CHAR_THRESHOLD

  return (
    <div
      className={cn(
        "flex justify-between w-full",
        isBelowSm ? "items-end" : "items-center",
        className
      )}
    >
      {/* Left: Title + Tags */}
      <div className="flex flex-col gap-2">
        {/* Heading: [collection] by [client] */}
        <div
          className={cn(
            "flex items-start text-2xl font-semibold",
            stackTitleBlock ? "flex-col gap-0" : "flex-row gap-1.5"
          )}
        >
          <div className="flex flex-row items-start gap-1.5">
            <span className="text-foreground">{collectionName}</span>
            <span className="text-foreground">by</span>
          </div>
          <span className="text-lime-500">{clientName}</span>
        </div>

        {/* Sub-heading: progress + shooting type + photographer name + stage status */}
        <div className="flex items-center gap-2">
          {!hideProgress && <CollectionProgressTag progress={progress} />}
          {shootingType && (
            <ShootingTypeTag type={shootingType} />
          )}
          {showPhotographerName && photographerName && (
            <span className="hidden min-[760px]:inline-flex">
              <PhotographerNameTag name={photographerName} />
            </span>
          )}
          {collectionLifecycleStatus ? (
            <CollectionStatusTag
              type="default"
              status={collectionLifecycleStatus}
              className="inline-flex items-center justify-center px-2 py-1 text-sm font-semibold rounded-lg whitespace-nowrap"
            />
          ) : (
            showStageStatus && <StageStatusTag status={stageStatus} />
          )}
        </div>
      </div>

      {/* Right: CTA buttons — below 760px: Participants icon-only; Settings hidden */}
      <div className="flex items-center gap-3">
        {showParticipantsButton && (
          <Button
            variant="secondary"
            size="lg"
            onClick={onParticipants}
            aria-label="Participants"
            className={cn(
              "rounded-xl gap-2",
              "max-[759px]:size-10 max-[759px]:min-h-10 max-[759px]:min-w-10 max-[759px]:gap-0 max-[759px]:px-0"
            )}
          >
            <Users className="size-4 shrink-0" aria-hidden />
            <span className="max-[759px]:sr-only">Participants</span>
          </Button>
        )}
        {showSettingsButton && (
          <Button
            variant="secondary"
            size="lg"
            onClick={onSettings}
            className="hidden min-[760px]:inline-flex rounded-xl gap-2"
          >
            <Settings className="size-4" />
            Settings
          </Button>
        )}
      </div>
    </div>
  )
}

export type { 
  CollectionHeadingProps, 
  CollectionHeadingMainProps, 
  CollectionHeadingStageProps,
  CollectionHeadingType 
}
