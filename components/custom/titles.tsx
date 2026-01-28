"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type TitleType = "main-section" | "block" | "section" | "form"

interface TitlesProps {
  /** Tipo de título */
  type?: TitleType
  /** Texto del título */
  title?: string
  /** Texto del subtítulo (solo para block, section, form) */
  subtitle?: string
  /** Mostrar subtítulo */
  showSubtitle?: boolean
  className?: string
}

// Estilos según Figma
const titleStyles: Record<TitleType, string> = {
  "main-section": "text-4xl font-semibold text-foreground", // 36px, 40px line-height
  "block": "text-2xl font-semibold text-foreground", // 24px, 32px line-height
  "section": "text-lg font-semibold text-card-foreground", // 18px, 28px line-height
  "form": "text-base font-semibold text-foreground", // 16px, 24px line-height
}

const gapStyles: Record<TitleType, string> = {
  "main-section": "", // No subtitle
  "block": "gap-2", // 8px
  "section": "gap-1", // 4px
  "form": "gap-1", // 4px
}

export function Titles({
  type = "main-section",
  title = "This is a title",
  subtitle = "This is a subtitle",
  showSubtitle = true,
  className,
}: TitlesProps) {
  const hasSubtitle = type !== "main-section" && showSubtitle && subtitle

  return (
    <div
      className={cn(
        "flex flex-col items-start w-full",
        gapStyles[type],
        className
      )}
    >
      <span className={cn(titleStyles[type], "block w-full", className)}>
        {title}
      </span>
      {hasSubtitle && (
        <span className="text-sm font-normal text-muted-foreground block w-full">
          {subtitle}
        </span>
      )}
    </div>
  )
}

export type { TitlesProps, TitleType }

