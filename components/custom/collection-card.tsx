"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { CollectionStatusTag } from "./tag"

type CollectionStatus = "draft" | "upcoming" | "in-progress" | "completed" | "canceled"
type CollectionCardFormat = "default" | "landscape"

// Mapeo de estados a thumbnails
const thumbnailMap: Record<CollectionStatus, string> = {
  draft: "/assets/thumbnail-draft.png",
  upcoming: "/assets/thumbnail-upcoming.png",
  "in-progress": "/assets/thumbnail-in-progress.png",
  completed: "/assets/thumbnail-completed.png",
  canceled: "/assets/thumbnail-canceled.png",
}

interface CollectionCardProps {
  /** Formato de la card */
  format?: CollectionCardFormat
  /** Estado de la colección */
  status?: CollectionStatus
  /** Nombre de la colección */
  collectionName?: string
  /** Nombre del cliente (solo visible en formato default) */
  clientName?: string
  /** Ubicación del shooting */
  location?: string
  /** Fecha de inicio */
  startDate?: string
  /** Fecha de fin */
  endDate?: string
  /** URL de imagen personalizada (override del thumbnail por defecto) */
  thumbnailUrl?: string
  /** Callback al hacer click */
  onClick?: () => void
  className?: string
}

export function CollectionCard({
  format = "default",
  status = "draft",
  collectionName = "collection name",
  clientName = "@client",
  location = "city, country",
  startDate = "dec 4, 2025",
  endDate = "dec 14, 2025",
  thumbnailUrl,
  onClick,
  className,
}: CollectionCardProps) {
  const thumbnail = thumbnailUrl || thumbnailMap[status]

  if (format === "landscape") {
    return (
      <div
        onClick={onClick}
        className={cn(
          "relative w-[292px] h-[112px] rounded-xl overflow-hidden cursor-pointer group",
          className
        )}
      >
        {/* Thumbnail Background */}
        <Image
          src={thumbnail}
          alt={collectionName}
          fill
          className="object-cover"
        />

        {/* Content Overlay */}
        <div className="absolute inset-0 bg-[rgba(9,9,11,0.4)] p-3 flex flex-col justify-between rounded-xl">
          {/* Top Row: Title + Status */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-[#fafafa] truncate flex-1 block">
              {collectionName}
            </span>
            <CollectionStatusTag type="overlay" status={status} />
          </div>

          {/* Bottom: Location + Dates */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-white/90 block">
              {location}
            </span>
            <span className="text-xs font-medium text-white/60 block">
              {startDate} - {endDate}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Default format (vertical)
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative w-[262px] h-[192px] rounded-xl overflow-hidden cursor-pointer group",
        className
      )}
    >
      {/* Thumbnail Background */}
      <Image
        src={thumbnail}
        alt={collectionName}
        fill
        className="object-cover"
      />

      {/* Content Overlay */}
      <div className="absolute inset-0 bg-[rgba(9,9,11,0.4)] p-3 flex flex-col justify-between rounded-xl">
        {/* Top: Status Badge */}
        <CollectionStatusTag type="overlay" status={status} className="self-start" />

        {/* Bottom: Collection Info (gap-3 = 12px entre secciones) */}
        <div className="flex flex-col gap-3">
          {/* Collection Details */}
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-[#fafafa] truncate block">
              {collectionName}
            </span>
            <span className="text-xs font-medium text-lime-400 block">
              {clientName}
            </span>
          </div>

          {/* Contextual Info (gap-1 = 4px) */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-white/90 block">
              {location}
            </span>
            <span className="text-xs font-medium text-white/60 block">
              {startDate} - {endDate}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export type { CollectionCardProps, CollectionStatus, CollectionCardFormat }

