"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { mockAuthAdapter } from "@/lib/auth/mock-adapter"
import { toast } from "sonner"
import Image from "next/image"

export default function ActivatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      toast.error("Invalid invitation link")
      setLoading(false)
      return
    }

    const handleActivation = async () => {
      try {
        // Get invitation by token
        const invitation = await mockAuthAdapter.getInvitationByToken(token)

        if (!invitation) {
          toast.error("Invalid or expired invitation")
          setLoading(false)
          return
        }

        // Mark email as verified
        await mockAuthAdapter.markEmailVerified(invitation.email)

        setSuccess(true)
        setEmail(invitation.email)
        toast.success("Email verified successfully! You can now sign in.")

        // Redirect to login after a brief delay
        setTimeout(() => {
          router.push(`/auth/login?email=${encodeURIComponent(invitation.email)}`)
        }, 2000)
      } catch (err) {
        console.error("Activation error:", err)
        toast.error("An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }

    handleActivation()
  }, [token, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Activating invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex w-full">
      {/* Left side - Logo/Cover */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#f6f6f6] items-center justify-center relative min-h-screen flex-shrink-0">
        <div className="w-[466px] h-[216.597px] relative flex items-center justify-center">
          {/* Logo - neomorphic image from assets */}
          <Image
            src="/assets/logo-neomorphic.png"
            alt="Noba Logo"
            width={466}
            height={217}
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Right side - Activation status */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background min-h-screen">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">
                {success ? "Invitation accepted" : "Activation failed"}
              </CardTitle>
              <CardDescription>
                {success
                  ? "Your email has been verified. You can now sign in."
                  : "There was a problem activating your invitation"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {success ? (
                <Button
                  onClick={() => router.push(`/auth/login?email=${encodeURIComponent(email || "")}`)}
                  className="w-full"
                >
                  Go to login
                </Button>
              ) : (
                <Button
                  onClick={() => router.push("/auth/login")}
                  variant="outline"
                  className="w-full"
                >
                  Go to login
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
