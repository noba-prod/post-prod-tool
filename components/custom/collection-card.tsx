"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { CollectionStatusTag } from "./tag"

type CollectionStatus = "draft" | "upcoming" | "in-progress" | "completed" | "canceled"
type CollectionCardFormat = "default" | "landscape"
type StepHealthStatus = "on-track" | "on-time" | "delayed" | "at-risk"

const STEP_HEALTH_LABEL: Record<StepHealthStatus, string> = {
  "on-track": "On time",
  "on-time": "On time",
  "at-risk": "At risk",
  delayed: "Delayed",
}

const STEP_HEALTH_EMOJI: Partial<Record<StepHealthStatus, string>> = {
  "at-risk": "⚠️",
  delayed: "🚨",
}

/** Overlay variant of progress tag — white styling, percentage only. Only for CollectionCard overlay. Does NOT modify DS CollectionProgressTag. */
function OverlayProgressTag({ progress }: { progress: number }) {
  const clampedProgress = Math.max(0, Math.min(100, progress))
  const size = 12
  const strokeWidth = 1.25
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clampedProgress / 100) * circumference

  return (
    <span className="inline-flex items-center justify-center gap-1 px-1.5 py-0.5 text-xs font-semibold rounded-md backdrop-blur-xl bg-white/30 text-white/80 whitespace-nowrap">
      <span className="shrink-0 flex items-center leading-none">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-white/30"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="text-white/80"
            style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
          />
        </svg>
      </span>
      <span>{clampedProgress}%</span>
    </span>
  )
}

/** Overlay variant of step health tag — [emoji + label]. Only for CollectionCard overlay. Does NOT modify DS CollectionProgressTag. */
function OverlayStepHealthTag({ stepHealthStatus }: { stepHealthStatus: StepHealthStatus }) {
  const emoji = STEP_HEALTH_EMOJI[stepHealthStatus]
  const label = STEP_HEALTH_LABEL[stepHealthStatus]

  return (
    <span className="inline-flex items-center justify-center gap-1 px-1.5 py-0.5 text-xs font-semibold rounded-md backdrop-blur-xl bg-white/30 text-white/80 whitespace-nowrap">
      {emoji && <span>{emoji}</span>}
      <span>{label}</span>
    </span>
  )
}

// Mapeo de estados a thumbnails
const thumbnailMap: Record<CollectionStatus, string> = {
  draft: "/assets/thumbnail-draft.png",
  upcoming: "/assets/thumbnail-upcoming.png",
  "in-progress": "/assets/thumbnail-in-progress.png",
  completed: "/assets/thumbnail-completed.png",
  canceled: "/assets/thumbnail-canceled.png",
}

interface CollectionCardProps {
  /** Stable id for the collection/draft (e.g. for React key and navigation) */
  id?: string
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
  /** Fecha de fin (deadline / final de producción) */
  endDate?: string
  /** URL de imagen personalizada (override del thumbnail por defecto) */
  thumbnailUrl?: string
  /** Porcentaje de progreso (0-100) — solo para in-progress en variante vertical */
  progress?: number
  /** Estado de salud del paso activo — solo para in-progress en variante vertical */
  stepHealthStatus?: StepHealthStatus
  /** Callback al hacer click */
  onClick?: () => void
  className?: string
}

export function CollectionCard({
  id,
  format = "default",
  status = "draft",
  collectionName = "collection name",
  clientName = "@client",
  location = "city, country",
  startDate = "dec 4, 2025",
  endDate = "dec 14, 2025",
  thumbnailUrl,
  progress,
  stepHealthStatus,
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
        {/* Top: Status Badge + Progress Tag (solo in-progress) */}
        <div className="flex items-center gap-2 self-start flex-wrap">
          <CollectionStatusTag type="overlay" status={status} />
          {status === "in-progress" &&
            progress !== undefined &&
            stepHealthStatus !== undefined && (
              <>
                <OverlayProgressTag progress={progress} />
                <OverlayStepHealthTag stepHealthStatus={stepHealthStatus} />
              </>
            )}
        </div>

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

