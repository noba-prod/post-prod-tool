"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Dev auth-seed route removed. Mock auth has been removed; use Supabase auth and seed via API/Supabase.
 */
export default function DevAuthSeedPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/auth/login")
  }, [router])
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <p className="text-sm text-muted-foreground">Redirecting to login...</p>
    </div>
  )
}
