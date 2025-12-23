"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthAdapter } from "@/lib/auth"

export default function HomePage() {
  const router = useRouter()
  const authAdapter = useAuthAdapter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    // Always redirect to test flow in development
    // You can change this to check window.location.hostname === 'localhost' if needed
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    
    if (isDevelopment) {
      router.replace("/dev/test-flow")
      return
    }

    // In production, check session and redirect accordingly
    const checkSession = async () => {
      try {
        const session = await authAdapter.getSession()
        if (session) {
          router.replace("/app")
        } else {
          router.replace("/auth/login")
        }
      } catch (error) {
        console.error("Session check error:", error)
        router.replace("/auth/login")
      }
    }

    checkSession()
  }, [router, authAdapter, mounted])

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  )
}
