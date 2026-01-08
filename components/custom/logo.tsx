"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

// Tamaños para Logotype (según Figma)
const logotypeSizes = {
  xl: { width: 112, height: 48 },
  md: { width: 72, height: 32 },
  sm: { width: 56, height: 24 },
} as const

// Tamaños para Isotype (según Figma)
const isotypeSizes = {
  xl: { width: 48, height: 48 },
  lg: { width: 40, height: 40 },
  md: { width: 32, height: 32 },
  sm: { width: 24, height: 24 },
  xs: { width: 16, height: 16 },
} as const

type LogotypeSize = keyof typeof logotypeSizes
type IsotypeSize = keyof typeof isotypeSizes

interface LogoBaseProps {
  className?: string
}

interface LogotypeProps extends LogoBaseProps {
  variant?: "logotype"
  size?: LogotypeSize
}

interface IsotypeProps extends LogoBaseProps {
  variant: "isotype"
  size?: IsotypeSize
}

type LogoProps = LogotypeProps | IsotypeProps

/**
 * Componente Logo con variantes logotype e isotype
 * 
 * @example
 * ```tsx
 * // Logotype (default)
 * <Logo size="xl" />
 * <Logo variant="logotype" size="md" />
 * 
 * // Isotype
 * <Logo variant="isotype" size="lg" />
 * ```
 */
export function Logo(props: LogoProps) {
  const { variant = "logotype", className } = props

  if (variant === "isotype") {
    const { size = "md" } = props as IsotypeProps
    const dimensions = isotypeSizes[size]
    
    return (
      <Image
        src="/assets/Isotype.svg"
        alt="noba"
        width={dimensions.width}
        height={dimensions.height}
        className={cn("shrink-0", className)}
        priority
      />
    )
  }

  const { size = "md" } = props as LogotypeProps
  const dimensions = logotypeSizes[size]

  return (
    <Image
      src="/assets/Logo.svg"
      alt="noba"
      width={dimensions.width}
      height={dimensions.height}
      className={cn("shrink-0", className)}
      priority
    />
  )
}

