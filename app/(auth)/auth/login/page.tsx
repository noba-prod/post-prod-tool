"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthAdapter } from "@/lib/auth"
import { toast } from "sonner"
import Link from "next/link"
import Image from "next/image"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const authAdapter = useAuthAdapter()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    setIsAnimating(true)
  }, [])

  // Set email from query param if available
  useEffect(() => {
    const emailParam = searchParams.get("email")
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      toast.error("Please enter your email address")
      return
    }

    if (!validateEmail(email)) {
      toast.error("Please enter a valid email address")
      return
    }

    setLoading(true)

    try {
      // Precheck email
      const precheck = await authAdapter.precheck(email)
      
      if (!precheck.allowed) {
        if (precheck.reason === "not_verified") {
          toast.error("Please verify your email address before requesting OTP. Check your inbox for a verification link.")
        } else if (precheck.reason === "not_invited") {
          toast.error("You need to be invited to access this platform. Please contact your administrator.")
        } else if (precheck.reason === "invalid_email") {
          toast.error("Please enter a valid email address")
        } else {
          toast.error("Unable to process your request. Please try again later.")
        }
        setLoading(false)
        return
      }

      // Request OTP
      const result = await authAdapter.requestOtp(email)

      if (result.ok) {
        toast.success("OTP sent! Redirecting to verification...")
        // Redirect to OTP page after a brief delay
        setTimeout(() => {
          router.push(`/auth/otp?email=${encodeURIComponent(email)}`)
        }, 1500)
      } else {
        toast.error(result.error || "Failed to send OTP")
      }
    } catch (err) {
      console.error("Login error:", err)
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
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

      {/* Right side - Login form */}
      <div className="flex-1 flex flex-col items-center bg-background min-h-screen lg:justify-center relative w-full lg:w-1/2 h-screen lg:h-auto overflow-hidden">
        {/* Content wrapper with animation */}
        <div className={`w-full flex-1 flex flex-col items-center justify-center relative ${isAnimating ? 'page-enter' : ''}`}>
        {/* Mobile Logo - Only visible on mobile */}
        <div className="lg:hidden w-full flex items-center justify-center p-10 flex-shrink-0">
          <div className="h-8 w-[112px] flex items-center justify-center">
            <Image
              src="/assets/Logo.svg"
              alt="noba*"
              width={112}
              height={48}
              className="object-contain h-8 w-auto"
              priority
            />
          </div>
        </div>

        {/* Form Container - Centered between logo and footer on mobile */}
          <div className="w-full max-w-[456px] min-w-[190px] flex flex-col gap-6 items-center justify-center flex-1 px-10 lg:px-10 lg:pb-10">
          {/* Header */}
          <div className="flex flex-col gap-2 items-center text-center w-full">
            <h1 className="text-[30px] font-semibold leading-[36px] text-[#09090b]">
              Validate your id
            </h1>
            <p className="text-sm leading-[20px] text-[#71717a]">
              Please enter your email and check your inbox to confirm the OTP (one-time password) for access.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleRequestOTP} className="w-full flex flex-col gap-6">
            {/* Email Input */}
            <div className="flex flex-col gap-2 w-full">
              <Input
                id="email"
                type="email"
                placeholder="Write your email here"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-10 rounded-lg border-[#e4e4e7] bg-white text-sm placeholder:text-[#71717a]"
                autoComplete="email"
                autoFocus
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-10 rounded-xl bg-[#18181b] text-[#fafafa] hover:bg-[#18181b]/90 font-medium text-sm"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                "Request OTP"
              )}
            </Button>
          </form>

          {/* Footer Links */}
          <div className="flex items-center justify-center w-full">
            <p className="text-sm text-[#18181b] text-center leading-none">
              <span>Don't have an account? </span>
              <Link href="#" className="underline underline-offset-2 decoration-solid">
                Request access
              </Link>
            </p>
          </div>
          </div>
        </div>

        {/* Bottom Navigation - Static (no animation) */}
        <div className="w-full lg:absolute lg:bottom-10 bottom-0 left-0 right-0 flex items-center justify-between px-10 py-10 lg:py-0 flex-shrink-0 z-10">
          <Button
            variant="ghost"
            className="h-10 text-[#71717a] hover:text-[#18181b] font-medium text-sm bg-transparent"
            asChild
          >
            <Link href="#">@noba2025</Link>
          </Button>
          <Button
            variant="ghost"
            className="h-10 text-[#71717a] hover:text-[#18181b] font-medium text-sm bg-transparent"
            asChild
          >
            <Link href="#">privacy policy</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
