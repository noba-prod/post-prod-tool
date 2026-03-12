"use client"

import * as React from "react"
import { Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { NotificationsPanel } from "./notifications-panel"
import { useNotifications } from "@/hooks/use-notifications"
import type { UserNotification } from "@/lib/services/notifications"
import { buildNotificationNavigationUrl } from "@/lib/notifications/navigation"

type NotificationStatus = "default" | "hover" | "active"

interface NotificationsProps {
  /** Muestra el indicador de nuevas notificaciones (punto rojo) - deprecated, use API */
  hasNotifications?: boolean
  /** Estado visual del componente */
  status?: NotificationStatus
  /** Callback al hacer click - deprecated, panel opens automatically */
  onClick?: () => void
  /** Whether to use the new notifications panel */
  usePanel?: boolean
  className?: string
}

/**
 * Componente de notificaciones con indicador de nuevas notificaciones
 * 
 * @example
 * ```tsx
 * // New panel mode (recommended)
 * <Notifications usePanel />
 * 
 * // Legacy mode (backward compatibility)
 * <Notifications hasNotifications onClick={handleClick} />
 * ```
 */
export function Notifications({
  hasNotifications = false,
  status = "default",
  onClick,
  usePanel = true,
  className,
}: NotificationsProps) {
  const [internalStatus, setInternalStatus] = React.useState<NotificationStatus>(status)
  
  // Use notifications hook when panel is enabled
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotifications({ enabled: usePanel })

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

  const handleNotificationClick = (notification: UserNotification) => {
    const targetUrl = buildNotificationNavigationUrl(notification)
    if (targetUrl) window.location.href = targetUrl
  }

  const handleOpenChange = (open: boolean) => {
    if (open) {
      refresh()
    }
    setInternalStatus(open ? "active" : "default")
  }

  // New panel mode
  if (usePanel) {
    return (
      <NotificationsPanel
        notifications={notifications}
        unreadCount={unreadCount}
        isLoading={isLoading}
        onNotificationClick={handleNotificationClick}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onOpenChange={handleOpenChange}
        className={className}
      />
    )
  }

  // Legacy mode (backward compatibility)
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
