"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Titles } from "./titles"
import { 
  CollectionProgressTag, 
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
  /** Shooting type: Digital or Handprint (tag to the left of photographer tag) */
  shootingType?: "digital" | "handprint"
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
    shootingType,
    photographerName,
    showPhotographerName = false,
    showParticipantsButton = true,
    showSettingsButton = true,
    onParticipants,
    onSettings,
  } = props as CollectionHeadingMainProps

  return (
    <div className={cn("flex items-center justify-between w-full", className)}>
      {/* Left: Title + Tags */}
      <div className="flex flex-col gap-2">
        {/* Heading: [collection] by [client] */}
        <div className="flex items-start gap-1.5 text-2xl font-semibold">
          <span className="text-foreground">{collectionName}</span>
          <span className="text-foreground">by</span>
          <span className="text-lime-500">{clientName}</span>
        </div>

        {/* Sub-heading: progress + shooting type + photographer name + stage status */}
        <div className="flex items-center gap-2">
          <CollectionProgressTag progress={progress} />
          {shootingType && (
            <ShootingTypeTag type={shootingType} />
          )}
          {showPhotographerName && photographerName && (
            <PhotographerNameTag name={photographerName} />
          )}
          {showStageStatus && (
            <StageStatusTag status={stageStatus} />
          )}
        </div>
      </div>

      {/* Right: CTA buttons */}
      <div className="flex items-center gap-3">
        {showParticipantsButton && (
          <Button
            variant="secondary"
            size="lg"
            onClick={onParticipants}
            className="rounded-xl gap-2"
          >
            <Users className="size-4" />
            Participants
          </Button>
        )}
        {showSettingsButton && (
          <Button
            variant="secondary"
            size="lg"
            onClick={onSettings}
            className="rounded-xl gap-2"
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
