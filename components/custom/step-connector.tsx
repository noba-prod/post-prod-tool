"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface StepConnectorProps {
  /** The status of the connector */
  status?: "uncompleted" | "completed"
  /** Orientation of the connector */
  orientation?: "horizontal" | "vertical"
  className?: string
}

/**
 * Base Step Connector component (divider line between steps):
 * - uncompleted: Gray line (zinc-200)
 * - completed: Teal line (teal-200)
 */
export function StepConnector({ 
  status = "uncompleted", 
  orientation = "vertical",
  className 
}: StepConnectorProps) {
  return (
    <div
      className={cn(
        "shrink-0",
        orientation === "vertical" ? "w-px h-full min-h-[16px]" : "h-px w-full min-w-[16px]",
        status === "completed" ? "bg-teal-200" : "bg-zinc-200",
        className
      )}
    />
  )
}
