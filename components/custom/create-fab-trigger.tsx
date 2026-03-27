"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CreateFabTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Override icon (default: Plus, 20×20 per Figma Icon / Plus) */
  children?: React.ReactNode
  iconClassName?: string
}

/**
 * FAB trigger for mobile “Create” (Figma node 1252-39374).
 * Standalone button styles — does not use {@link Button} from `@/components/ui/button`.
 * Use with Radix `PopoverTrigger asChild` (forwardRef).
 */
export const CreateFabTrigger = React.forwardRef<HTMLButtonElement, CreateFabTriggerProps>(
  function CreateFabTrigger({ className, iconClassName, children, type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "group inline-flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-solid border-white/20",
          "bg-primary text-primary-foreground",
          "shadow-[1px_1px_5px_0px_rgba(0,0,0,0.24),4px_4px_24px_0px_rgba(163,230,53,0.2)]",
          "outline-none transition-[color,box-shadow,background-color]",
          "hover:bg-primary/90",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children ?? (
          <Plus
            className={cn(
              "size-5 shrink-0 transition-transform duration-200 ease-in group-data-[state=open]:rotate-45",
              iconClassName
            )}
            strokeWidth={2}
            aria-hidden
          />
        )}
      </button>
    )
  }
)
