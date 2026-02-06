"use client"

import * as React from "react"
import { Info, AlertCircle, CheckCircle, AlertTriangle, LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type ToastVariant = "info" | "success" | "warning" | "error"

const VARIANT_ICONS: Record<ToastVariant, LucideIcon> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  info: "bg-zinc-50 text-muted-foreground",
  success: "bg-teal-50 text-teal-700",
  warning: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-700",
}

interface InformativeToastProps {
  /** Message content (string or ReactNode for styled parts) */
  message: React.ReactNode
  /** Visual variant */
  variant?: ToastVariant
  /** Custom icon (overrides variant icon) */
  icon?: LucideIcon
  /** Additional class names */
  className?: string
}

/**
 * Informative Toast component - Non-dismissible informational message
 * 
 * Based on Shadcn Alert patterns but styled as inline informative toast.
 * Purely informational, no actions required.
 */
export function InformativeToast({
  message,
  variant = "info",
  icon,
  className,
}: InformativeToastProps) {
  const Icon = icon || VARIANT_ICONS[variant]

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-2 p-4 rounded-xl w-full",
        VARIANT_STYLES[variant],
        className
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <p className="text-sm leading-5 flex-1">
        {message}
      </p>
    </div>
  )
}
