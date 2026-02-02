"use client"

import { UserContextProvider } from "@/lib/contexts/user-context"

/**
 * Dashboard layout that provides UserContext to all dashboard pages.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <UserContextProvider>{children}</UserContextProvider>
}
