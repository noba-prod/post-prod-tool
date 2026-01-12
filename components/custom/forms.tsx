"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Titles } from "./titles"
import { ArrowRight } from "lucide-react"
import { Separator } from "@/components/ui/separator"

type FormVariant = "basic" | "capsule" | "shipping-module" | "horizontal-flow"

interface FormBasicProps {
  /** Form title */
  title?: string
  /** Show title */
  showTitle?: boolean
  /** Form content (rows of slots) */
  children?: React.ReactNode
  /** Additional class name */
  className?: string
}

interface FormCapsuleProps extends FormBasicProps {}

interface FormShippingModuleProps {
  /** Form title */
  title?: string
  /** First capsule content (Origin) */
  originContent?: React.ReactNode
  /** Second capsule content (Destination) */
  destinationContent?: React.ReactNode
  /** Show shipping details section */
  showShippingDetails?: boolean
  /** Shipping details content */
  shippingDetailsContent?: React.ReactNode
  /** Show informative toast */
  showInformativeToast?: boolean
  /** Informative toast content */
  informativeToastContent?: React.ReactNode
  /** Additional class name */
  className?: string
}

interface FormHorizontalFlowProps {
  /** First capsule title */
  firstTitle?: string
  /** First capsule content */
  firstContent?: React.ReactNode
  /** Second capsule title */
  secondTitle?: string
  /** Second capsule content */
  secondContent?: React.ReactNode
  /** Additional class name */
  className?: string
}

type FormsProps = {
  /** Form variant */
  variant?: FormVariant
} & (
  | ({ variant?: "basic" } & FormBasicProps)
  | ({ variant: "capsule" } & FormCapsuleProps)
  | ({ variant: "shipping-module" } & FormShippingModuleProps)
  | ({ variant: "horizontal-flow" } & FormHorizontalFlowProps)
)

/**
 * Basic form variant - Title + rows of content
 * Uses Titles (form type) and flexible row layout
 */
function FormBasic({
  title = "This is a title",
  showTitle = true,
  children,
  className,
}: FormBasicProps) {
  return (
    <div className={cn("flex flex-col gap-5 w-full", className)}>
      {showTitle && (
        <Titles type="form" title={title} showSubtitle={false} />
      )}
      <div className="flex flex-col gap-5 w-full">
        {children}
      </div>
    </div>
  )
}

/**
 * Capsule form variant - Basic form wrapped in a bordered container
 */
function FormCapsule({
  title = "This is a title",
  showTitle = true,
  children,
  className,
}: FormCapsuleProps) {
  return (
    <div
      className={cn(
        "border border-zinc-200 rounded-xl p-4 w-full",
        className
      )}
    >
      <FormBasic title={title} showTitle={showTitle}>
        {children}
      </FormBasic>
    </div>
  )
}

/**
 * Shipping Module form variant - Title + Horizontal Flow + Optional shipping details
 */
function FormShippingModule({
  title = "This is a title",
  originContent,
  destinationContent,
  showShippingDetails = true,
  shippingDetailsContent,
  showInformativeToast = false,
  informativeToastContent,
  className,
}: FormShippingModuleProps) {
  return (
    <div
      className={cn(
        "border border-zinc-200 rounded-xl p-4 flex flex-col gap-5 w-full",
        className
      )}
    >
      {/* Title */}
      <Titles type="form" title={title} showSubtitle={false} />

      {/* Horizontal Flow - Origin -> Destination */}
      <div className="flex items-center gap-5 w-full">
        {/* Origin Capsule */}
        <div className="flex-1 border border-zinc-200 rounded-xl p-4">
          <div className="flex flex-col gap-5 w-full">
            {originContent}
          </div>
        </div>

        {/* Arrow */}
        <ArrowRight className="w-4 h-4 shrink-0 text-zinc-900" />

        {/* Destination Capsule */}
        <div className="flex-1 border border-zinc-200 rounded-xl p-4">
          <div className="flex flex-col gap-5 w-full">
            {destinationContent}
          </div>
        </div>
      </div>

      {/* Shipping Details */}
      {showShippingDetails && (
        <>
          <Separator />
          <div className="w-full">
            {shippingDetailsContent}
          </div>
        </>
      )}

      {/* Informative Toast */}
      {showInformativeToast && informativeToastContent && (
        <div className="w-full">
          {informativeToastContent}
        </div>
      )}
    </div>
  )
}

/**
 * Horizontal Flow form variant - Two capsules side by side with arrow
 */
function FormHorizontalFlow({
  firstTitle = "This is a title",
  firstContent,
  secondTitle = "This is a title",
  secondContent,
  className,
}: FormHorizontalFlowProps) {
  return (
    <div className={cn("flex items-center gap-5 w-full", className)}>
      {/* First Capsule */}
      <div className="flex-1 border border-zinc-200 rounded-xl p-4">
        <FormBasic title={firstTitle} showTitle={true}>
          {firstContent}
        </FormBasic>
      </div>

      {/* Arrow */}
      <ArrowRight className="w-4 h-4 shrink-0 text-zinc-900" />

      {/* Second Capsule */}
      <div className="flex-1 border border-zinc-200 rounded-xl p-4">
        <FormBasic title={secondTitle} showTitle={true}>
          {secondContent}
        </FormBasic>
      </div>
    </div>
  )
}

/**
 * Forms component - Layout wrapper for form content
 * 
 * Variants:
 * - basic: Title + rows of slots (default)
 * - capsule: Basic wrapped in a bordered container
 * - shipping-module: Two capsules (origin/destination) with optional shipping details
 * - horizontal-flow: Two capsules side by side with arrow
 * 
 * Uses RowVariants for flexible slot layouts and Titles (type="form") for headers.
 */
export function Forms(props: FormsProps) {
  const { variant = "basic" } = props

  switch (variant) {
    case "capsule":
      return <FormCapsule {...(props as FormCapsuleProps)} />
    case "shipping-module":
      return <FormShippingModule {...(props as FormShippingModuleProps)} />
    case "horizontal-flow":
      return <FormHorizontalFlow {...(props as FormHorizontalFlowProps)} />
    case "basic":
    default:
      return <FormBasic {...(props as FormBasicProps)} />
  }
}

// Export sub-components for direct use if needed
export { FormBasic, FormCapsule, FormShippingModule, FormHorizontalFlow }
export type { FormsProps, FormVariant, FormBasicProps, FormCapsuleProps, FormShippingModuleProps, FormHorizontalFlowProps }
