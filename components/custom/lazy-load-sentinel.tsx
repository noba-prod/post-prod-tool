"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"

interface LazyLoadSentinelProps {
  sentinelRef: React.RefObject<HTMLDivElement | null>
  isLoading: boolean
  hasMore: boolean
  className?: string
}

export function LazyLoadSentinel({
  sentinelRef,
  isLoading,
  hasMore,
  className,
}: LazyLoadSentinelProps) {
  if (!hasMore && !isLoading) return null

  return (
    <div
      ref={sentinelRef}
      className={cn(
        "flex w-full items-center justify-center py-8 transition-opacity duration-300 ease-in",
        isLoading ? "opacity-100" : "opacity-0",
        className
      )}
      aria-hidden={!isLoading}
    >
      {isLoading && <Spinner className="size-6 text-muted-foreground" />}
    </div>
  )
}
