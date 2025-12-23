/**
 * Auth adapter factory
 * Switch between Mock and Supabase based on environment variable
 * 
 * IMPORTANT: This adapter is client-side only (uses localStorage)
 * For server-side, use Supabase adapter when implemented
 */
"use client"

import { mockAuthAdapter } from "./mock-adapter"
import type { AuthAdapter } from "./adapter"

// Use mock adapter if MOCK_AUTH is enabled, otherwise use Supabase
// For now, we'll use mock by default for development
const USE_MOCK_AUTH = process.env.NEXT_PUBLIC_USE_MOCK_AUTH !== "false"

export function getAuthAdapter(): AuthAdapter {
  if (USE_MOCK_AUTH) {
    return mockAuthAdapter
  }

  // TODO: Return Supabase adapter when implemented
  // return supabaseAuthAdapter
  return mockAuthAdapter
}

// Export function instead of instance to avoid SSR issues
export function useAuthAdapter(): AuthAdapter {
  return getAuthAdapter()
}

// For backward compatibility, but only use in client components
export const authAdapter = typeof window !== "undefined" ? getAuthAdapter() : null as any

