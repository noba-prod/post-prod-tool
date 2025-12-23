"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp"
import { useAuthAdapter } from "@/lib/auth"
import { toast } from "sonner"
import Link from "next/link"
import Image from "next/image"

export default function OTPPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const authAdapter = useAuthAdapter()
  const email = searchParams.get("email") || ""

  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [timeLeft, setTimeLeft] = useState(15 * 60) // 15 minutes in seconds
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    setIsAnimating(true)
  }, [])

  useEffect(() => {
    if (!email) {
      router.push("/auth/login")
    }
  }, [email, router])

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const maskEmail = (email: string) => {
    if (!email) return ""
    const [localPart, domain] = email.split("@")
    if (!localPart || !domain) return email
    const masked = localPart.slice(0, 2) + "******"
    return `${masked}@${domain}`
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!otp.trim() || otp.length < 6) {
      toast.error("Please enter the 6-digit code")
      return
    }

    setLoading(true)

    try {
      const result = await authAdapter.verifyOtp(email, otp)

      if (result.ok && result.session) {
        toast.success("Successfully signed in!")
        router.push("/app")
      } else {
        toast.error(result.error || "Invalid or expired OTP")
      }
    } catch (err) {
      console.error("Verify OTP error:", err)
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)

    try {
      const result = await authAdapter.requestOtp(email)

      if (result.ok) {
        setTimeLeft(15 * 60) // Reset timer
        toast.success("OTP resent! Check your email.")
      } else {
        toast.error(result.error || "Failed to resend OTP")
      }
    } catch (err) {
      console.error("Resend OTP error:", err)
      toast.error("Failed to resend OTP")
    } finally {
      setResending(false)
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

      {/* Right side - OTP form */}
      <div className="flex-1 flex flex-col items-center justify-center p-10 bg-background min-h-screen relative w-full lg:w-1/2 overflow-hidden">
        {/* Content wrapper with animation */}
        <div className={`w-full flex-1 flex flex-col items-center justify-center relative ${isAnimating ? 'page-enter' : ''}`}>
        {/* Top Navigation - Back button (aligned with footer) */}
          <div className="absolute top-10 left-10 z-20">
          <Button
            variant="ghost"
            className="h-10 text-[#18181b] hover:text-[#18181b] font-medium text-sm bg-transparent px-4 py-2 rounded-xl hover:bg-transparent"
            onClick={() => router.push("/auth/login")}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

          <div className="w-full max-w-[456px] min-w-[190px] flex flex-col gap-[10px] items-center justify-center flex-1 relative">
          {/* Main Content (centered) */}
          <div className="w-full flex flex-col gap-6 items-center flex-1 justify-center">
            {/* Header */}
            <div className="flex flex-col gap-2 items-center text-center w-full">
              <h1 className="text-[30px] font-semibold leading-[36px] text-[#09090b]">
                Check your email
              </h1>
              <p className="text-sm leading-[20px] text-[#71717a]">
                We have sent and OTP code to{" "}
                <span className="font-semibold">{maskEmail(email)}</span>. Code will expired in{" "}
                <span className="font-semibold">{formatTime(timeLeft)}</span>
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleVerifyOTP} className="w-full flex flex-col gap-6">
              {/* OTP Input with separators */}
              <div className="flex justify-center w-full">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  disabled={loading}
                  containerClassName="gap-2"
                >
                  <InputOTPGroup>
                    <InputOTPSlot 
                      index={0} 
                      className="w-10 h-10 rounded-l-md rounded-r-none border border-[#e4e4e7] bg-white text-base font-medium border-r-0" 
                    />
                    <InputOTPSlot 
                      index={1} 
                      className="w-10 h-10 rounded-r-md rounded-l-none border border-[#e4e4e7] bg-white text-base font-medium" 
                    />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot 
                      index={2} 
                      className="w-10 h-10 rounded-l-md rounded-r-none border border-[#e4e4e7] bg-white text-base font-medium border-r-0" 
                    />
                    <InputOTPSlot 
                      index={3} 
                      className="w-10 h-10 rounded-r-md rounded-l-none border border-[#e4e4e7] bg-white text-base font-medium" 
                    />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot 
                      index={4} 
                      className="w-10 h-10 rounded-l-md rounded-r-none border border-[#e4e4e7] bg-white text-base font-medium border-r-0" 
                    />
                    <InputOTPSlot 
                      index={5} 
                      className="w-10 h-10 rounded-r-md rounded-l-none border border-[#e4e4e7] bg-white text-base font-medium" 
                    />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-10 rounded-xl bg-[#18181b] text-[#fafafa] hover:bg-[#18181b]/90 font-medium text-sm"
                disabled={loading || otp.length < 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  "Validate"
                )}
              </Button>
            </form>

            {/* Resend Link */}
            <div className="flex items-center justify-center w-full">
              <p className="text-sm text-[#18181b] text-center leading-none">
                <span>Don't receive the email? </span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="underline underline-offset-2 decoration-solid hover:no-underline"
                >
                  {resending ? "Sending..." : "Try again"}
                </button>
              </p>
            </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation - Static (no animation) */}
        <div className="absolute bottom-10 left-0 right-0 flex items-center justify-between px-10 z-10">
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
