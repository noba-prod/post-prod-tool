/**
 * Hook for managing notifications state and actions
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import type { UserNotification } from "@/lib/services/notifications"

interface UseNotificationsOptions {
  /** Poll interval in ms (default: 30000 = 30s) */
  pollInterval?: number
  /** Whether to start polling immediately */
  enabled?: boolean
}

interface UseNotificationsReturn {
  /** List of notifications */
  notifications: UserNotification[]
  /** Count of unread notifications */
  unreadCount: number
  /** Loading state */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Refresh notifications */
  refresh: () => Promise<void>
  /** Mark a notification as read */
  markAsRead: (notificationId: string) => Promise<void>
  /** Mark all notifications as read */
  markAllAsRead: () => Promise<void>
}

export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const { pollInterval = 30000, enabled = true } = options

  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?limit=50")
      if (!response.ok) {
        throw new Error("Failed to fetch notifications")
      }
      const data = await response.json()
      setNotifications(data.notifications || [])
      setError(null)
    } catch (err) {
      console.error("[useNotifications] Error fetching:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    }
  }, [])

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/unread-count")
      if (!response.ok) {
        throw new Error("Failed to fetch unread count")
      }
      const data = await response.json()
      setUnreadCount(data.count || 0)
    } catch (err) {
      console.error("[useNotifications] Error fetching unread count:", err)
    }
  }, [])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    await Promise.all([fetchNotifications(), fetchUnreadCount()])
    setIsLoading(false)
  }, [fetchNotifications, fetchUnreadCount])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST",
      })
      if (!response.ok) {
        throw new Error("Failed to mark as read")
      }
      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true, status: "read" as const } : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error("[useNotifications] Error marking as read:", err)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    // Mark each unread notification as read
    const unreadNotifications = notifications.filter((n) => !n.isRead)
    await Promise.all(unreadNotifications.map((n) => markAsRead(n.id)))
  }, [notifications, markAsRead])

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      refresh()
    }
  }, [enabled, refresh])

  // Polling for unread count
  useEffect(() => {
    if (!enabled || pollInterval <= 0) return

    const interval = setInterval(() => {
      fetchUnreadCount()
    }, pollInterval)

    return () => clearInterval(interval)
  }, [enabled, pollInterval, fetchUnreadCount])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  }
}
