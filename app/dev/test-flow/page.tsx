"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

/**
 * Dev test-flow route. Mock auth has been removed; use real Supabase auth.
 */
export default function TestFlowPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-md mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dev Test Flow</CardTitle>
            <CardDescription>
              Mock auth has been removed. Use Supabase authentication and seed users via API or Supabase directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={() => router.push("/auth/login")} variant="default">
              Go to Login
            </Button>
            <Button onClick={() => router.push("/app")} variant="outline">
              Go to App
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
