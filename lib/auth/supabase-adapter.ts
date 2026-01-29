"use client"

import type { AuthAdapter, AuthResult, InvitationResult, PrecheckResult, Session, VerifyResult } from "./adapter"
import { createClient } from "@/lib/supabase/client"

const PROFILE_MISSING_ERROR = "No profile found for this account. Please contact your administrator."

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

const supabase = createClient()

let authListenerInitialized = false

const ensureAuthListener = () => {
  if (typeof window === "undefined" || authListenerInitialized) return

  supabase.auth.onAuthStateChange(() => {
    window.dispatchEvent(new Event("session-changed"))
  })

  authListenerInitialized = true
}

class SupabaseAuthAdapter implements AuthAdapter {
  constructor() {
    ensureAuthListener()
  }

  async precheck(email: string): Promise<PrecheckResult> {
    const normalizedEmail = email.toLowerCase().trim()

    if (!validateEmail(normalizedEmail)) {
      return { allowed: false, reason: "invalid_email" }
    }

    try {
      const { data, error } = await supabase.rpc("check_email_precheck", {
        check_email: normalizedEmail,
      })

      if (error) {
        console.error("Precheck error:", error)
        return { allowed: false, reason: "error" }
      }

      const row = Array.isArray(data) ? data[0] : data
      const allowed = row?.allowed ?? false
      return {
        allowed,
        reason: allowed ? "ok" : (row?.reason as PrecheckResult["reason"]) || "not_invited",
      }
    } catch (error) {
      console.error("Precheck exception:", error)
      return { allowed: false, reason: "error" }
    }
  }

  async requestOtp(email: string): Promise<AuthResult> {
    const normalizedEmail = email.toLowerCase().trim()

    if (!validateEmail(normalizedEmail)) {
      return { ok: false, error: "Invalid email address" }
    }

    const precheck = await this.precheck(normalizedEmail)
    if (!precheck.allowed) {
      if (precheck.reason === "not_verified") {
        return { ok: false, error: "Please verify your email before requesting OTP" }
      }
      if (precheck.reason === "not_invited") {
        return { ok: false, error: "You need to be invited to access this platform" }
      }
      return { ok: false, error: "Unable to process request" }
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: true,
        },
      })

      if (error) {
        return { ok: false, error: error.message || "Failed to send OTP" }
      }

      return { ok: true }
    } catch (error) {
      console.error("Request OTP error:", error)
      return { ok: false, error: "An unexpected error occurred" }
    }
  }

  async verifyOtp(email: string, otp: string): Promise<VerifyResult> {
    const normalizedEmail = email.toLowerCase().trim()

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: otp,
        type: "email",
      })

      if (error) {
        return { ok: false, error: error.message || "Invalid or expired OTP" }
      }

      const user = data.user
      if (!user) {
        return { ok: false, error: "Unable to create session" }
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single()

      if (profileError || !profile) {
        if (profileError) {
          console.error("Profile lookup error:", profileError)
        }
        await supabase.auth.signOut()
        return { ok: false, error: PROFILE_MISSING_ERROR }
      }

      const session: Session = {
        userId: user.id,
        email: user.email || normalizedEmail,
      }

      return { ok: true, session }
    } catch (error) {
      console.error("Verify OTP error:", error)
      return { ok: false, error: "An unexpected error occurred" }
    }
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut()
  }

  async getSession(): Promise<Session | null> {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error || !data.session || !data.session.user) {
        return null
      }

      const { user } = data.session
      return {
        userId: user.id,
        email: user.email || "",
      }
    } catch (error) {
      console.error("Get session error:", error)
      return null
    }
  }

  async markEmailVerified(_email: string): Promise<void> {
    console.warn("markEmailVerified is not supported for Supabase adapter.")
  }

  async inviteEmailToCollection(_email: string, _collectionId: string): Promise<InvitationResult> {
    return {
      ok: false,
      error: "Invitation flow is not supported in Supabase adapter.",
    }
  }
}

export const supabaseAuthAdapter = new SupabaseAuthAdapter()
