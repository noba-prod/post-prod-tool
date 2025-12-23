"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthAdapter } from "@/lib/auth"
import type { Session } from "@/lib/auth/adapter"
import { LogOut } from "lucide-react"

export default function AppPage() {
  const router = useRouter()
  const authAdapter = useAuthAdapter()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const currentSession = await authAdapter.getSession()
      if (!currentSession) {
        router.push("/auth/login")
        return
      }
      setSession(currentSession)
      setLoading(false)
    }

    checkSession()
  }, [router])

  const handleLogout = async () => {
    await authAdapter.logout()
    router.push("/auth/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome to noba*</h1>
            <p className="text-muted-foreground mt-2">
              Post Production Tool - Dashboard
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Account</CardTitle>
            <CardDescription>
              You are successfully logged in (Mock Auth Mode)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{session.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="font-mono text-sm">{session.userId}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>
              Continue building your post-production workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This is a placeholder dashboard. You can now:
            </p>
            <ul className="list-disc list-inside mt-4 space-y-2 text-sm text-muted-foreground">
              <li>View and manage collections</li>
              <li>Invite team members</li>
              <li>Track workflow stages</li>
              <li>Manage files and approvals</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

