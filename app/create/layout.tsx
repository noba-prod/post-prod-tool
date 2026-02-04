"use client"

import { UserContextProvider } from "@/lib/contexts/user-context"

/**
 * Create flow layout: provides UserContext so the NavBar and CreationTemplate
 * show the correct user info, tabs, and redirects when on /create/client, /create/agency, etc.
 */
export default function CreateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <UserContextProvider>{children}</UserContextProvider>
}
