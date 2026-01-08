"use client"

import * as React from "react"
import { Bell } from "lucide-react"
import { cn } from "@/lib/utils"

type NotificationStatus = "default" | "hover" | "active"

interface NotificationsProps {
  /** Muestra el indicador de nuevas notificaciones (punto rojo) */
  hasNotifications?: boolean
  /** Estado visual del componente */
  status?: NotificationStatus
  /** Callback al hacer click */
  onClick?: () => void
  className?: string
}

/**
 * Componente de notificaciones con indicador de nuevas notificaciones
 * 
 * @example
 * ```tsx
 * <Notifications hasNotifications />
 * <Notifications status="active" hasNotifications />
 * ```
 */
export function Notifications({
  hasNotifications = false,
  status = "default",
  onClick,
  className,
}: NotificationsProps) {
  const [internalStatus, setInternalStatus] = React.useState<NotificationStatus>(status)

  // Sync con prop status
  React.useEffect(() => {
    setInternalStatus(status)
  }, [status])

  const handleMouseEnter = () => {
    if (status === "default") setInternalStatus("hover")
  }

  const handleMouseLeave = () => {
    if (status === "default") setInternalStatus("default")
  }

  const handleClick = () => {
    setInternalStatus("active")
    onClick?.()
  }

  return (
    <div
      className={cn("relative inline-flex items-center", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Ring - solo visible en estado active */}
      {internalStatus === "active" && (
        <div className="absolute inset-[-2px] rounded-xl border-2 border-foreground pointer-events-none" />
      )}

      {/* Button */}
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "relative flex items-center justify-center size-10 rounded-xl transition-colors",
          internalStatus === "default" && "bg-transparent",
          internalStatus === "hover" && "bg-sidebar-background",
          internalStatus === "active" && "bg-accent"
        )}
      >
        <Bell className="size-4 text-foreground" />
      </button>

      {/* Dot - indicador de notificaciones */}
      {hasNotifications && (
        <span className="absolute top-[14px] left-[21px] size-1.5 rounded-full bg-rose-500" />
      )}
    </div>
  )
}

