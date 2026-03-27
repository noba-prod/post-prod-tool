"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp"
import { useAuthAdapter } from "@/lib/auth"
import { toast } from "sonner"
import Link from "next/link"
import Image from "next/image"

function OTPContent() {
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

  /** Active lime border must win over `border-[#e4e4e7]`. Narrow sizes. */
  const slotShared = cn(
    "data-[active=true]:!border-lime-500",
    "max-[759px]:!h-9 max-[759px]:!w-8 max-[759px]:!min-w-0 max-[759px]:text-sm"
  )
  /** Left cell of each pair uses `border-r-0`; when active, restore full rect so ring + border read as one (like before). */
  const slotPairLeft = cn(
    slotShared,
    "data-[active=true]:!border-r data-[active=true]:!rounded-md"
  )

  const maskEmail = (email: string) => {
    if (!email) return ""
    const [localPart, domain] = email.split("@")
    if (!localPart || !domain) return email
    const masked = localPart.slice(0, 2) + "******"
    return `${masked}@${domain}`
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!otp.trim() || otp.length < 8) {
      toast.error("Please enter the 8-digit code")
      return
    }

    setLoading(true)

    try {
      const result = await authAdapter.verifyOtp(email, otp)

      if (result.ok && result.session) {
        toast.success("Successfully signed in!")
        router.push("/collections")
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
      <div className="flex-1 flex flex-col items-center justify-center p-10 max-[759px]:px-4 bg-background min-h-screen relative w-full lg:w-1/2 overflow-hidden">
        {/* Top nav: same horizontal inset as footer row (left-0 + px matches bottom bar) */}
        <div className="absolute top-10 left-0 right-0 z-20 flex justify-start px-10 max-[759px]:px-4">
          <Button
            variant="ghost"
            className="h-10 text-[#18181b] hover:text-[#18181b] font-medium text-sm bg-transparent px-4 py-2 rounded-xl hover:bg-transparent"
            onClick={() => router.push("/auth/login")}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Content wrapper with animation */}
        <div className={`w-full flex-1 flex flex-col items-center justify-center relative ${isAnimating ? 'page-enter' : ''}`}>
          <div className="w-full max-w-[456px] min-w-0 flex flex-col gap-[10px] items-center justify-center flex-1 relative px-0 min-[760px]:min-w-[190px]">
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
              <div className="flex w-full min-w-0 justify-center px-1.5 py-1 max-[759px]:overflow-x-auto max-[759px]:[scrollbar-width:thin]">
                <InputOTP
                  maxLength={8}
                  value={otp}
                  onChange={setOtp}
                  disabled={loading}
                  pushPasswordManagerStrategy="none"
                  containerClassName={cn(
                    /* w-fit + mx-auto: overlay input matches slot width; w-full was stretching input to ~456px while slots looked left-heavy */
                    "mx-auto w-fit min-w-0 max-w-full justify-center gap-3 overflow-visible",
                    "max-[759px]:gap-2"
                  )}
                >
                  <InputOTPGroup className="shrink-0 overflow-visible">
                    <InputOTPSlot
                      index={0}
                      className={cn(
                        "h-10 w-10 border border-[#e4e4e7] bg-white text-base font-medium",
                        "rounded-l-md rounded-r-none border-r-0",
                        slotPairLeft
                      )}
                    />
                    <InputOTPSlot
                      index={1}
                      className={cn(
                        "h-10 w-10 border border-[#e4e4e7] bg-white text-base font-medium",
                        "rounded-r-md rounded-l-none",
                        slotShared,
                        "data-[active=true]:!rounded-md"
                      )}
                    />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup className="shrink-0 overflow-visible">
                    <InputOTPSlot
                      index={2}
                      className={cn(
                        "h-10 w-10 border border-[#e4e4e7] bg-white text-base font-medium",
                        "rounded-l-md rounded-r-none border-r-0",
                        slotPairLeft
                      )}
                    />
                    <InputOTPSlot
                      index={3}
                      className={cn(
                        "h-10 w-10 border border-[#e4e4e7] bg-white text-base font-medium",
                        "rounded-r-md rounded-l-none",
                        slotShared,
                        "data-[active=true]:!rounded-md"
                      )}
                    />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup className="shrink-0 overflow-visible">
                    <InputOTPSlot
                      index={4}
                      className={cn(
                        "h-10 w-10 border border-[#e4e4e7] bg-white text-base font-medium",
                        "rounded-l-md rounded-r-none border-r-0",
                        slotPairLeft
                      )}
                    />
                    <InputOTPSlot
                      index={5}
                      className={cn(
                        "h-10 w-10 border border-[#e4e4e7] bg-white text-base font-medium",
                        "rounded-r-md rounded-l-none",
                        slotShared,
                        "data-[active=true]:!rounded-md"
                      )}
                    />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup className="shrink-0 overflow-visible">
                    <InputOTPSlot
                      index={6}
                      className={cn(
                        "h-10 w-10 border border-[#e4e4e7] bg-white text-base font-medium",
                        "rounded-l-md rounded-r-none border-r-0",
                        slotPairLeft
                      )}
                    />
                    <InputOTPSlot
                      index={7}
                      className={cn(
                        "h-10 w-10 border border-[#e4e4e7] bg-white text-base font-medium",
                        "rounded-r-md rounded-l-none",
                        slotShared,
                        "data-[active=true]:!rounded-md"
                      )}
                    />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-10 rounded-xl bg-[#18181b] text-[#fafafa] hover:bg-[#18181b]/90 font-medium text-sm"
                disabled={loading || otp.length < 8}
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

        {/* Bottom Navigation - same horizontal padding as Back row */}
        <div className="absolute bottom-10 left-0 right-0 z-10 flex items-center justify-between px-10 max-[759px]:px-4">
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

export default function OTPPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <OTPContent />
    </Suspense>
  )
}
