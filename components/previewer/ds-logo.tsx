"use client"

import { cn } from "@/lib/utils"

interface DSLogoProps {
  className?: string
}

export function DSLogo({ className }: DSLogoProps) {
  return (
    <span className={cn("text-lg font-bold tracking-tight select-none", className)}>
      DS<span className="text-lime-500">*</span>
    </span>
  )
}

