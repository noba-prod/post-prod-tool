"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { CollectionCard, CollectionCardProps } from "./collection-card"

/**
 * Grid Component
 * 
 * Responsive grid layout for CollectionCards with automatic column adaptation.
 * 
 * ## Breakpoint Rules (Container-based)
 * - **1 column**: 320px – 559px
 * - **2 columns**: 560px – 767px  
 * - **3 columns**: 768px – 1023px
 * - **4 columns**: 1024px+ (no upper bound)
 * 
 * ## Spacing (from Figma)
 * - Gap between items: 16px
 * - Container padding: 40px
 * 
 * ## Usage
 * The grid automatically adjusts columns based on container width.
 * CollectionCards fill 100% of available space in each cell.
 */

interface GridProps {
  /** Array of collection data to render */
  items?: CollectionCardProps[]
  /** Additional class names */
  className?: string
}

// Default demo items
const defaultItems: CollectionCardProps[] = [
  {
    status: "draft",
    collectionName: "kids summer'25",
    clientName: "@zara",
    location: "a coruña, spain",
    startDate: "dec 4, 2025",
    endDate: "dec 14, 2025",
  },
  {
    status: "upcoming",
    collectionName: "Sakura: Cherry blossom",
    clientName: "@loewe",
    location: "tokyo, japan",
    startDate: "apr 4, 2025",
    endDate: "apr 14, 2025",
  },
  {
    status: "in-progress",
    collectionName: "Beach resort 2025",
    clientName: "@maisondumonde",
    location: "miami, usa",
    startDate: "dec 4, 2025",
    endDate: "dec 14, 2025",
  },
  {
    status: "completed",
    collectionName: "streetwear collection 2025",
    clientName: "@mango",
    location: "los angeles, usa",
    startDate: "nov 24, 2025",
    endDate: "dec 4, 2025",
  },
  {
    status: "draft",
    collectionName: "luxury evening coffee 2025",
    clientName: "@dior",
    location: "paris, france",
    startDate: "dec 4, 2025",
    endDate: "dec 14, 2025",
  },
  {
    status: "completed",
    collectionName: "Speed run 2025",
    clientName: "@zaraathleticz",
    location: "madrid, spain",
    startDate: "nov 19, 2025",
    endDate: "nov 29, 2025",
  },
  {
    status: "draft",
    collectionName: "spring/summer 2025",
    clientName: "@ecoalf",
    location: "menorca, spain",
    startDate: "dec 4, 2025",
    endDate: "dec 14, 2025",
  },
  {
    status: "canceled",
    collectionName: "fall lookbook 2025",
    clientName: "@renatta&go",
    location: "madrid, spain",
    startDate: "dec 4, 2025",
    endDate: "dec 14, 2025",
  },
]

export function Grid({ items = defaultItems, className }: GridProps) {
  return (
    <div
      className={cn(
        // Container query support
        "@container w-full",
        className
      )}
    >
      <div
        className={cn(
          // Base grid styles with gap-4 (16px) and p-10 (40px)
          "grid gap-4 p-10",
          // Responsive columns based on container width
          // Default: 1 column (320px - 559px)
          "grid-cols-1",
          // 2 columns: 560px - 767px
          "@[560px]:grid-cols-2",
          // 3 columns: 768px - 1023px
          "@[768px]:grid-cols-3",
          // 4 columns: 1024px+
          "@[1024px]:grid-cols-4"
        )}
      >
        {items.map((item, index) => (
          <CollectionCard
            key={index}
            {...item}
            className="!w-full h-[192px]"
          />
        ))}
      </div>
    </div>
  )
}

export type { GridProps }

