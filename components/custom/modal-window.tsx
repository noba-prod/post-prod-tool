"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"
import { Titles } from "./titles"
import { ActionBar } from "./action-bar"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

// ============================================================================
// TYPES
// ============================================================================

interface ModalWindowProps {
  /** Whether the modal is open */
  open?: boolean
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void
  /** Modal title (used for a11y and default header when headerContent is not set) */
  title?: string
  /** Modal subtitle */
  subtitle?: string
  /** Show subtitle */
  showSubtitle?: boolean
  /** Custom header content (e.g. Titles + tags for step modal). When set, replaces default title/subtitle block. */
  headerContent?: React.ReactNode
  /** Content of the modal (scrollable area) */
  children?: React.ReactNode
  /** Primary action label */
  primaryLabel?: string
  /** Secondary action label */
  secondaryLabel?: string
  /** Show primary button */
  showPrimary?: boolean
  /** Show secondary button */
  showSecondary?: boolean
  /** Secondary button variant (default | destructive) */
  secondaryVariant?: "default" | "destructive"
  /** Primary button disabled */
  primaryDisabled?: boolean
  /** Secondary button disabled */
  secondaryDisabled?: boolean
  /** Callback when primary action is clicked */
  onPrimaryClick?: () => void
  /** Callback when secondary action is clicked */
  onSecondaryClick?: () => void
  /** Modal width (default: 600px) */
  width?: string
  /** Additional class name for the modal content */
  className?: string
  /**
   * Radix `modal` on the dialog root. Default `true` (focus trap + standard overlay).
   * Use `false` when children need nested Popovers that port to `body` (e.g. FilterBar command lists).
   */
  modal?: boolean
}

// ============================================================================
// MODAL TRIGGER (for convenience)
// ============================================================================

const ModalWindowTrigger = DialogPrimitive.Trigger

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Modal Window Component
 * 
 * A slide-in modal panel that opens from the right with:
 * - Overlay: #000 at 36% opacity
 * - Position: justify-right (slides in from right)
 * - Structure:
 *   1. Header (fixed): Titles + Close button
 *   2. Content (scrollable): Any content
 *   3. Footer (fixed): ActionBar with Primary/Secondary buttons
 * 
 * ## Usage
 * ```tsx
 * <ModalWindow
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Modal Title"
 *   subtitle="Modal description"
 *   primaryLabel="Save"
 *   secondaryLabel="Cancel"
 *   onPrimaryClick={() => handleSave()}
 *   onSecondaryClick={() => setIsOpen(false)}
 * >
 *   <YourContent />
 * </ModalWindow>
 * ```
 */
function ModalWindow({
  open,
  onOpenChange,
  title = "Modal Title",
  subtitle = "Modal description",
  showSubtitle = true,
  headerContent,
  children,
  primaryLabel = "Primary",
  secondaryLabel = "Secondary",
  showPrimary = true,
  showSecondary = true,
  secondaryVariant = "default",
  primaryDisabled = false,
  secondaryDisabled = false,
  onPrimaryClick,
  onSecondaryClick,
  width = "600px",
  className,
  modal = true,
}: ModalWindowProps) {
  const useNonModal = modal === false

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={!useNonModal}>
      <DialogPrimitive.Portal>
        {useNonModal ? (
          open ? (
            <div
              role="presentation"
              aria-hidden
              className="fixed inset-0 z-50 bg-black/[0.36] animate-in fade-in-0 duration-200"
              onClick={() => onOpenChange?.(false)}
            />
          ) : null
        ) : (
          <DialogPrimitive.Overlay
            className="fixed inset-0 z-50 bg-black/[0.36] data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 duration-200"
          />
        )}

        <DialogPrimitive.Content
          className={cn(
            // Below 760px: full width between horizontal margins; height uses dvh so inner scroll works with keyboard
            "fixed inset-x-3 top-3 z-50 w-auto max-w-none bg-background shadow-xl rounded-xl overflow-hidden",
            "flex flex-col min-h-0",
            "max-[759px]:bottom-auto max-[759px]:h-[calc(100dvh-24px)] max-[759px]:max-h-[calc(100dvh-24px)]",
            "min-[760px]:bottom-3 min-[760px]:h-auto min-[760px]:max-h-none",
            "min-[760px]:left-auto min-[760px]:right-3 min-[760px]:w-[var(--modal-width)]",
            "data-open:animate-in data-closed:animate-out",
            "data-closed:slide-out-to-bottom data-open:slide-in-from-bottom",
            "min-[760px]:data-closed:slide-out-to-right min-[760px]:data-open:slide-in-from-right",
            "duration-300 ease-in-out",
            className
          )}
          style={{ "--modal-width": width } as React.CSSProperties}
        >
          {/* Accessible title and description (visually hidden, required by Radix for a11y) */}
          <DialogPrimitive.Title className="sr-only">
            {title}
          </DialogPrimitive.Title>
          {showSubtitle && subtitle && (
            <DialogPrimitive.Description className="sr-only">
              {subtitle}
            </DialogPrimitive.Description>
          )}
          
          {/* Header: Fixed at top (no border, per Figma design) */}
          <div className="flex items-start justify-between gap-7 p-5 shrink-0">
            <div className="flex-1 min-w-0">
              {headerContent ?? (
                <Titles
                  type="block"
                  title={title}
                  subtitle={subtitle}
                  showSubtitle={showSubtitle}
                />
              )}
            </div>
            {/* Close button (outline variant per Figma) */}
            <DialogPrimitive.Close asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl size-10 shrink-0"
              >
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogPrimitive.Close>
          </div>

          {/* Content: Scrollable area */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {children}
          </div>

          {/* Footer: Fixed at bottom (hidden when no actions) */}
          {(showPrimary || showSecondary) && (
            <div className="border-t border-border p-5 shrink-0">
              <ActionBar
                primaryLabel={primaryLabel}
                secondaryLabel={secondaryLabel}
                showPrimary={showPrimary}
                showSecondary={showSecondary}
                secondaryVariant={secondaryVariant}
                primaryDisabled={primaryDisabled}
                secondaryDisabled={secondaryDisabled}
                onPrimaryClick={onPrimaryClick}
                onSecondaryClick={onSecondaryClick}
              />
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

// ============================================================================
// COMPOUND COMPONENT PATTERN
// ============================================================================

// Root component for controlled usage
const ModalWindowRoot = DialogPrimitive.Root

export { 
  ModalWindow, 
  ModalWindowTrigger, 
  ModalWindowRoot 
}
export type { ModalWindowProps }
