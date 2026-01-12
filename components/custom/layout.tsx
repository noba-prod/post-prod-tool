"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

// ============================================================================
// LAYOUT SLOT (placeholder for content)
// ============================================================================

interface LayoutSlotProps {
  children?: React.ReactNode
  className?: string
}

/**
 * LayoutSlot - A placeholder/wrapper for content within a LayoutSection
 * When empty, shows a dashed border placeholder
 */
export function LayoutSlot({ children, className }: LayoutSlotProps) {
  if (children) {
    return <div className={cn("w-full", className)}>{children}</div>
  }

  // Placeholder visual when no content
  return (
    <div
      className={cn(
        "w-full py-4 px-6 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50",
        "flex items-center justify-center text-sm text-muted-foreground",
        className
      )}
    >
      Slot (swap it with your content)
    </div>
  )
}

// ============================================================================
// LAYOUT SECTION
// ============================================================================

interface LayoutSectionProps {
  children: React.ReactNode
  /** Gap between items in the section (default: 20px / gap-5) */
  gap?: "sm" | "md" | "lg"
  className?: string
}

const sectionGapStyles = {
  sm: "gap-3",   // 12px
  md: "gap-5",   // 20px (default)
  lg: "gap-8",   // 32px
}

/**
 * LayoutSection - Groups related content/slots together
 * 
 * Use multiple sections to organize content into logical groups.
 * Sections are separated by a Separator in the parent Layout.
 */
export function LayoutSection({ 
  children, 
  gap = "md",
  className 
}: LayoutSectionProps) {
  return (
    <div
      className={cn(
        "flex flex-col w-full",
        sectionGapStyles[gap],
        className
      )}
    >
      {children}
    </div>
  )
}

// ============================================================================
// LAYOUT
// ============================================================================

interface LayoutProps {
  children: React.ReactNode
  /** Padding around the layout (default: 40px / p-10) */
  padding?: "none" | "sm" | "md" | "lg"
  /** Gap between sections (default: 20px) */
  sectionGap?: "sm" | "md" | "lg"
  /** Show separators between sections */
  showSeparators?: boolean
  className?: string
}

const paddingStyles = {
  none: "p-0",
  sm: "p-4",    // 16px
  md: "p-6",    // 24px
  lg: "p-10",   // 40px (default)
}

const layoutGapStyles = {
  sm: 20,  // 20px
  md: 40,  // 40px (default)
  lg: 64,  // 64px
}

/**
 * Layout Component
 * 
 * A slot-based layout container for organizing page content.
 * 
 * ## Structure
 * - Layout (main container with padding)
 *   - LayoutSection (groups of related content)
 *     - LayoutSlot or any component (Tables, Grid, FilterBar, Titles, etc.)
 *   - Separator (automatic between sections)
 *   - LayoutSection
 *     - ...
 * 
 * ## Spacing (from Figma)
 * - Container padding: 40px (default)
 * - Section gap: 40px (default)
 * - Slot gap within section: 20px (default)
 * 
 * ## Usage
 * ```tsx
 * <Layout>
 *   <LayoutSection>
 *     <Titles type="main-section" title="Page Title" />
 *   </LayoutSection>
 *   <LayoutSection>
 *     <FilterBar variant="collections" />
 *     <Grid />
 *   </LayoutSection>
 * </Layout>
 * ```
 */
export function Layout({
  children,
  padding = "lg",
  sectionGap = "sm",
  showSeparators = true,
  className,
}: LayoutProps) {
  // Process children to inject separators between sections
  const childArray = React.Children.toArray(children)
  const gap = layoutGapStyles[sectionGap]

  return (
    <div
      className={cn(
        "flex flex-col w-full",
        paddingStyles[padding],
        className
      )}
      style={{ gap: `${gap}px` }}
    >
      {childArray.map((child, index) => {
        const isLast = index === childArray.length - 1

        return (
          <React.Fragment key={index}>
            {child}
            {showSeparators && !isLast && (
              <Separator className="my-0" />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { LayoutProps, LayoutSectionProps, LayoutSlotProps }
