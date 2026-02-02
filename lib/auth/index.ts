/**
 * Auth adapter factory
 * Uses Supabase for authentication. Supabase configuration is required.
 */
"use client"

import { supabaseAuthAdapter } from "./supabase-adapter"
import type { AuthAdapter } from "./adapter"

export function getAuthAdapter(): AuthAdapter {
  return supabaseAuthAdapter
}

// Export function instead of instance to avoid SSR issues
export function useAuthAdapter(): AuthAdapter {
  return getAuthAdapter()
}

// For backward compatibility, but only use in client components
export const authAdapter = typeof window !== "undefined" ? getAuthAdapter() : null as any
