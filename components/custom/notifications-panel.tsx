"use client"

import * as React from "react"
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { UserNotification } from "@/lib/services/notifications"

interface NotificationsPanelProps {
  /** List of notifications to display */
  notifications: UserNotification[]
  /** Count of unread notifications */
  unreadCount: number
  /** Loading state */
  isLoading?: boolean
  /** Callback when a notification is clicked */
  onNotificationClick?: (notification: UserNotification) => void
  /** Callback when mark as read is clicked */
  onMarkAsRead?: (notificationId: string) => void
  /** Callback when mark all as read is clicked */
  onMarkAllAsRead?: () => void
  /** Callback when the panel is opened/closed */
  onOpenChange?: (open: boolean) => void
  className?: string
}

/**
 * Format relative time (e.g., "2 hours ago", "Just now")
 */
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/**
 * Single notification item
 */
function NotificationItem({
  notification,
  onClick,
  onMarkAsRead,
}: {
  notification: UserNotification
  onClick?: () => void
  onMarkAsRead?: () => void
}) {
  const handleClick = () => {
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead()
    }
    onClick?.()
  }

  const handleCtaClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead()
    }
    if (notification.ctaUrl) {
      window.location.href = notification.ctaUrl
    }
  }

  return (
    <div
      className={cn(
        "p-4 border-b border-border last:border-b-0 cursor-pointer transition-colors hover:bg-muted/50",
        !notification.isRead && "bg-blue-50/50 dark:bg-blue-950/20"
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        {/* Unread indicator */}
        <div className="mt-1.5 shrink-0">
          {!notification.isRead ? (
            <div className="size-2 rounded-full bg-blue-500" />
          ) : (
            <div className="size-2" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn(
              "text-sm leading-tight",
              !notification.isRead ? "font-semibold" : "font-medium"
            )}>
              {notification.title}
            </h4>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatTimeAgo(notification.createdAt)}
            </span>
          </div>
          
          {(() => {
            const lines = notification.body.split("\n")
            const hasMetaLine = lines.length > 1 && lines[lines.length - 1].includes(" · ")
            const description = hasMetaLine ? lines.slice(0, -1).join("\n") : notification.body
            const metaLine = hasMetaLine ? lines[lines.length - 1] : null
            return (
              <>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {description}
                </p>
                {metaLine && (
                  <p className="mt-1.5 text-xs text-muted-foreground/70">
                    {metaLine}
                  </p>
                )}
              </>
            )
          })()}

          {/* CTA Button */}
          {notification.ctaText && notification.ctaUrl && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 h-7 text-xs"
              onClick={handleCtaClick}
            >
              {notification.ctaText}
              <ExternalLink className="ml-1 size-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Notifications Panel Component
 * 
 * Displays a list of notifications in a popover panel.
 * Shows unread count badge on the bell icon.
 */
export function NotificationsPanel({
  notifications,
  unreadCount,
  isLoading = false,
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
  onOpenChange,
  className,
}: NotificationsPanelProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    onOpenChange?.(open)
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative flex items-center justify-center size-10 rounded-xl transition-colors",
            "hover:bg-sidebar-background",
            isOpen && "bg-accent",
            className
          )}
        >
          <Bell className="size-4 text-foreground" />
          
          {/* Unread badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold text-white bg-rose-500 rounded-full">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] p-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && onMarkAllAsRead && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={onMarkAllAsRead}
            >
              <CheckCheck className="mr-1 size-3" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notifications list */}
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="size-6 border-2 border-muted-foreground/20 border-t-muted-foreground rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="size-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                You'll see updates about your collections here
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => onNotificationClick?.(notification)}
                onMarkAsRead={() => onMarkAsRead?.(notification.id)}
              />
            ))
          )}
        </div>

        {/* Footer - View all link */}
        {notifications.length > 0 && (
          <div className="px-4 py-3 border-t border-border bg-muted/30">
            <p className="text-xs text-center text-muted-foreground">
              Showing {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
