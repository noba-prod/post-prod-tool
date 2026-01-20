"use client"

import { UserContextProvider } from "@/lib/contexts/user-context"
import { createEntityCreationService } from "@/lib/services"
import { useEffect } from "react"

/**
 * Dashboard layout that provides UserContext to all dashboard pages.
 * 
 * This layout:
 * - Wraps children with UserContextProvider
 * - Initializes repositories on mount
 * - Ensures user context is available to all dashboard pages
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Initialize service to ensure repositories are ready
  useEffect(() => {
    createEntityCreationService()
  }, [])

  return <UserContextProvider>{children}</UserContextProvider>
}
