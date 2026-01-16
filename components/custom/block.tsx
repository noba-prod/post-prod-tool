"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Titles } from "./titles"
import { BlockHeading } from "./block-heading"
import { ParticipantSummary } from "./participant-summary"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"

// ============================================================================
// TYPES
// ============================================================================

type BlockTemplateMode = "creation" | "view"

// Creation mode variants
type CreationVariant = "active" | "completed" | "disabled"

// View mode variants  
type ViewVariant = "active" | "inactive"

interface Participant {
  role: string
  name: string
}

// ============================================================================
// CREATION MODE PROPS
// ============================================================================

interface BlockTemplateCreationProps {
  mode: "creation"
  /** Initial variant (can change via interactions) */
  variant?: CreationVariant
  /** Controlled variant (if provided, component is controlled) */
  currentVariant?: CreationVariant
  /** Callback when variant changes */
  onVariantChange?: (variant: CreationVariant) => void
  title?: string
  subtitle?: string
  /** Content slot - can be any component */
  children?: React.ReactNode
  /** Show participants summary (only for active variant) */
  showParticipants?: boolean
  /** Participants list */
  participants?: Participant[]
  /** Primary button label */
  primaryLabel?: string
  /** Callback when primary button is clicked */
  onPrimaryClick?: () => void
  /** Whether primary button is disabled */
  primaryDisabled?: boolean
  /** Callback when Edit button is clicked */
  onEdit?: () => void
  className?: string
}

// ============================================================================
// VIEW MODE PROPS
// ============================================================================

interface BlockTemplateViewProps {
  mode: "view"
  /** Initial variant (can change via interactions) */
  variant?: ViewVariant
  /** Controlled variant (if provided, component is controlled) */
  currentVariant?: ViewVariant
  /** Callback when variant changes */
  onVariantChange?: (variant: ViewVariant) => void
  title?: string
  subtitle?: string
  /** Content slot - can be any component */
  children?: React.ReactNode
  /** Show participants summary (only for active variant) */
  showParticipants?: boolean
  /** Participants list */
  participants?: Participant[]
  /** Primary button label */
  primaryLabel?: string
  /** Callback when primary button is clicked */
  onPrimaryClick?: () => void
  /** Whether primary button is disabled */
  primaryDisabled?: boolean
  /** Callback when expand/collapse is clicked */
  onExpand?: () => void
  onCollapse?: () => void
  className?: string
}

type BlockTemplateProps = BlockTemplateCreationProps | BlockTemplateViewProps

// ============================================================================
// SLOT PLACEHOLDER
// ============================================================================

function SlotPlaceholder() {
  return (
    <div
      className={cn(
        "w-full py-6 px-6 rounded-md border border-dashed border-purple-400/50 bg-purple-50/50",
        "flex items-center justify-center text-sm text-foreground"
      )}
    >
      Slot (swap it with your content)
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Block Template Component
 * 
 * A slot-based block container with two main modes and micro-interactions:
 * 
 * ## Creation Mode (for creating/editing content)
 * - **active**: Block title + subtitle + content slot + Primary button
 *   → Click Primary → changes to "completed"
 * - **completed**: Form title + Edit button (enabled)
 *   → Click Edit → changes to "active"
 * - **disabled**: Form title (muted) + Edit button (disabled, 50% opacity)
 * 
 * ## View Mode (for viewing content)
 * - **active**: Block title + subtitle + content slot + Primary button (expanded)
 *   → Click collapse (ChevronUp) → changes to "inactive"
 * - **inactive**: Form title + ChevronDown (collapsed, clickable)
 *   → Click expand (ChevronDown) → changes to "active"
 * 
 * ## Spacing (from Figma)
 * - Container padding: 20px
 * - Gap between sections: 32px (active) / 0 (collapsed)
 * - Border radius: 12px
 */
export function BlockTemplate(props: BlockTemplateProps) {
  const { mode, className } = props

  // ============================================================================
  // CREATION MODE
  // ============================================================================
  if (mode === "creation") {
    const {
      variant: initialVariant = "active",
      currentVariant,
      onVariantChange,
      title = "This is a title",
      subtitle = "This is a subtitle",
      children,
      showParticipants = false,
      participants = [],
      primaryLabel = "Primary",
      onPrimaryClick,
      primaryDisabled = false,
      onEdit,
    } = props as BlockTemplateCreationProps

    // Internal state for uncontrolled mode
    const [internalVariant, setInternalVariant] = React.useState<CreationVariant>(initialVariant)
    
    // Use controlled or uncontrolled variant
    // If currentVariant is provided, use it (controlled mode)
    // Otherwise, use internal state (uncontrolled mode)
    const activeVariant = currentVariant !== undefined ? currentVariant : internalVariant
    
    // Update internal state when initialVariant changes (for uncontrolled mode)
    React.useEffect(() => {
      if (currentVariant === undefined) {
        setInternalVariant(initialVariant)
      }
    }, [initialVariant, currentVariant])
    
    // Handle variant change
    const handleVariantChange = (newVariant: CreationVariant) => {
      if (currentVariant === undefined) {
        setInternalVariant(newVariant)
      }
      onVariantChange?.(newVariant)
    }

    // Handle Edit click → switch to active
    const handleEditClick = () => {
      handleVariantChange("active")
      onEdit?.()
    }

    // Handle Primary click → switch to completed
    const handlePrimaryClick = () => {
      handleVariantChange("completed")
      onPrimaryClick?.()
    }

    // Creation - Disabled: Muted title + disabled Edit button
    if (activeVariant === "disabled") {
      return (
        <div
          className={cn(
            "flex items-center justify-between h-16 pl-5 pr-3 py-5",
            "bg-background border border-sidebar-border rounded-xl w-full",
            className
          )}
        >
          <BlockHeading
            type="disabled"
            title={title}
          />
        </div>
      )
    }

    // Creation - Completed: Form title + Edit button enabled
    if (activeVariant === "completed") {
      return (
        <div
          className={cn(
            "flex items-center justify-between h-16 pl-5 pr-3 py-5",
            "bg-background border border-sidebar-border rounded-xl w-full",
            className
          )}
        >
          <BlockHeading
            type="default"
            title={title}
            onEdit={handleEditClick}
          />
        </div>
      )
    }

    // Creation - Active: Block title + subtitle + content + Primary button
    return (
      <div
        className={cn(
          "flex flex-col gap-8 p-5",
          "bg-background border border-sidebar-border rounded-xl w-full",
          className
        )}
      >
        {/* Header */}
        <div className="flex flex-col gap-5 w-full">
          <Titles
            type="block"
            title={title}
            subtitle={subtitle}
          />
          {showParticipants && participants.length > 0 && (
            <ParticipantSummary participants={participants} />
          )}
        </div>

        {/* Content slot */}
        <div className="w-full">
          {children || <SlotPlaceholder />}
        </div>

        {/* Actions - only show if onPrimaryClick is provided */}
        {onPrimaryClick && (
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              variant="default"
              size="lg"
              onClick={handlePrimaryClick}
              disabled={primaryDisabled}
              className="rounded-xl"
            >
              {primaryLabel}
            </Button>
          </div>
        )}
      </div>
    )
  }

  // ============================================================================
  // VIEW MODE
  // ============================================================================
  const {
    variant: initialVariant = "inactive",
    currentVariant,
    onVariantChange,
    title = "This is a title",
    subtitle = "This is a subtitle",
    children,
    showParticipants = false,
    participants = [],
    primaryLabel = "Primary",
    onPrimaryClick,
    primaryDisabled = false,
    onExpand,
    onCollapse,
  } = props as BlockTemplateViewProps

  // Internal state for uncontrolled mode
  const [internalVariant, setInternalVariant] = React.useState<ViewVariant>(initialVariant)
  
  // Use controlled or uncontrolled variant
  const activeVariant = currentVariant ?? internalVariant
  
  // Handle variant change
  const handleVariantChange = (newVariant: ViewVariant) => {
    if (currentVariant === undefined) {
      setInternalVariant(newVariant)
    }
    onVariantChange?.(newVariant)
  }

  // Handle expand → switch to active
  const handleExpand = () => {
    handleVariantChange("active")
    onExpand?.()
  }

  // Handle collapse → switch to inactive
  const handleCollapse = () => {
    handleVariantChange("inactive")
    onCollapse?.()
  }

  // View - Inactive: Form title + ChevronDown (collapsed, clickable)
  if (activeVariant === "inactive") {
    return (
      <button
        type="button"
        onClick={handleExpand}
        className={cn(
          "flex items-center justify-between h-16 pl-5 pr-3 py-5",
          "bg-background border border-sidebar-border rounded-xl w-full",
          "cursor-pointer hover:bg-muted/50 transition-colors text-left",
          className
        )}
      >
        <span className="text-base font-semibold text-foreground flex-1">
          {title}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl size-10"
          asChild
        >
          <span>
            <ChevronDown className="size-4" />
          </span>
        </Button>
      </button>
    )
  }

  // View - Active: Block title + subtitle + content + Primary button (optional)
  return (
    <div
      className={cn(
        "flex flex-col gap-8 p-5",
        "bg-background border border-sidebar-border rounded-xl w-full",
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col gap-5 w-full">
        <Titles
          type="block"
          title={title}
          subtitle={subtitle}
        />
        {showParticipants && participants.length > 0 && (
          <ParticipantSummary participants={participants} />
        )}
      </div>

      {/* Content slot */}
      <div className="w-full">
        {children || <SlotPlaceholder />}
      </div>

      {/* Actions - only show if onPrimaryClick is provided */}
      {onPrimaryClick && (
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            variant="default"
            size="lg"
            onClick={onPrimaryClick}
            disabled={primaryDisabled}
            className="rounded-xl"
          >
            {primaryLabel}
          </Button>
        </div>
      )}
    </div>
  )
}

export type { 
  BlockTemplateProps, 
  BlockTemplateCreationProps, 
  BlockTemplateViewProps,
  BlockTemplateMode,
  CreationVariant,
  ViewVariant
}
