"use client"

import type { AuthAdapter, PrecheckResult, AuthResult, VerifyResult, Session, InvitationResult } from "./adapter"

const STORAGE_KEYS = {
  INVITED_EMAILS: "mock_auth_invited_emails",
  INTERNAL_EMAILS: "mock_auth_internal_emails",
  EMAIL_VERIFIED: "mock_auth_email_verified",
  OTP_STORE: "mock_auth_otp_store",
  SESSION: "mock_auth_session",
  INVITATIONS: "mock_auth_invitations",
  OTP_REQUESTS: "mock_auth_otp_requests",
} as const

const OTP_CODE = "123456" // Fixed OTP for testing
const OTP_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const MAX_OTP_REQUESTS = 3

type OtpStore = {
  [email: string]: {
    code: string
    expiresAt: number
  }
}

type OtpRequests = {
  [email: string]: number[] // timestamps
}

type InvitedEmails = {
  [email: string]: string[] // collection IDs
}

type Invitations = {
  [token: string]: {
    email: string
    collectionId: string
    expiresAt: number
  }
}

class MockAuthAdapter implements AuthAdapter {
  private getStorageItem<T>(key: string, defaultValue: T): T {
    if (typeof window === "undefined") return defaultValue
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  }

  private setStorageItem<T>(key: string, value: T): void {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error("Failed to save to localStorage:", error)
    }
  }

  private validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  private checkRateLimit(email: string): boolean {
    const requests = this.getStorageItem<OtpRequests>(STORAGE_KEYS.OTP_REQUESTS, {})
    const emailRequests = requests[email] || []
    const now = Date.now()
    const recentRequests = emailRequests.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)

    if (recentRequests.length >= MAX_OTP_REQUESTS) {
      return false
    }

    recentRequests.push(now)
    requests[email] = recentRequests
    this.setStorageItem(STORAGE_KEYS.OTP_REQUESTS, requests)
    return true
  }

  async precheck(email: string): Promise<PrecheckResult> {
    const normalizedEmail = email.toLowerCase().trim()

    if (!this.validateEmail(normalizedEmail)) {
      return { allowed: false, reason: "invalid_email" }
    }

    const internalEmails = this.getStorageItem<string[]>(STORAGE_KEYS.INTERNAL_EMAILS, [])
    const invitedEmails = this.getStorageItem<InvitedEmails>(STORAGE_KEYS.INVITED_EMAILS, {})
    const emailVerified = this.getStorageItem<{ [email: string]: boolean }>(
      STORAGE_KEYS.EMAIL_VERIFIED,
      {}
    )

    const isInternal = internalEmails.includes(normalizedEmail)
    const isInvited = !!invitedEmails[normalizedEmail]
    const isVerified = emailVerified[normalizedEmail] === true

    if (isInternal) {
      if (!isVerified) {
        return { allowed: false, reason: "not_verified" }
      }
      return { allowed: true, reason: "ok" }
    }

    if (isInvited) {
      if (!isVerified) {
        return { allowed: false, reason: "not_verified" }
      }
      return { allowed: true, reason: "ok" }
    }

    return { allowed: false, reason: "not_invited" }
  }

  async requestOtp(email: string): Promise<AuthResult> {
    const normalizedEmail = email.toLowerCase().trim()

    if (!this.validateEmail(normalizedEmail)) {
      return { ok: false, error: "Invalid email address" }
    }

    // Precheck
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

    // Rate limit check
    if (!this.checkRateLimit(normalizedEmail)) {
      return { ok: false, error: "Too many OTP requests. Please try again later." }
    }

    // Generate OTP
    const otpStore = this.getStorageItem<OtpStore>(STORAGE_KEYS.OTP_STORE, {})
    otpStore[normalizedEmail] = {
      code: OTP_CODE,
      expiresAt: Date.now() + OTP_EXPIRY_MS,
    }
    this.setStorageItem(STORAGE_KEYS.OTP_STORE, otpStore)

    // Log OTP in development
    if (process.env.NODE_ENV === "development") {
      console.log(`[MOCK AUTH] OTP for ${normalizedEmail}: ${OTP_CODE}`)
    }

    return { ok: true }
  }

  async verifyOtp(email: string, otp: string): Promise<VerifyResult> {
    const normalizedEmail = email.toLowerCase().trim()
    const otpStore = this.getStorageItem<OtpStore>(STORAGE_KEYS.OTP_STORE, {})
    const storedOtp = otpStore[normalizedEmail]

    if (!storedOtp) {
      return { ok: false, error: "No OTP found. Please request a new one." }
    }

    if (Date.now() > storedOtp.expiresAt) {
      delete otpStore[normalizedEmail]
      this.setStorageItem(STORAGE_KEYS.OTP_STORE, otpStore)
      return { ok: false, error: "OTP has expired. Please request a new one." }
    }

    if (storedOtp.code !== otp.trim()) {
      return { ok: false, error: "Invalid OTP code" }
    }

    // Create session
    const session: Session = {
      userId: `user_${normalizedEmail.replace(/[^a-z0-9]/g, "_")}`,
      email: normalizedEmail,
    }

    this.setStorageItem(STORAGE_KEYS.SESSION, session)

    // Clean up OTP
    delete otpStore[normalizedEmail]
    this.setStorageItem(STORAGE_KEYS.OTP_STORE, otpStore)

    return { ok: true, session }
  }

  async logout(): Promise<void> {
    this.setStorageItem(STORAGE_KEYS.SESSION, null)
  }

  async getSession(): Promise<Session | null> {
    return this.getStorageItem<Session | null>(STORAGE_KEYS.SESSION, null)
  }

  async markEmailVerified(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim()
    const emailVerified = this.getStorageItem<{ [email: string]: boolean }>(
      STORAGE_KEYS.EMAIL_VERIFIED,
      {}
    )
    emailVerified[normalizedEmail] = true
    this.setStorageItem(STORAGE_KEYS.EMAIL_VERIFIED, emailVerified)
  }

  async inviteEmailToCollection(email: string, collectionId: string): Promise<InvitationResult> {
    const normalizedEmail = email.toLowerCase().trim()

    if (!this.validateEmail(normalizedEmail)) {
      return { ok: false, error: "Invalid email address" }
    }

    // Add to invited emails
    const invitedEmails = this.getStorageItem<InvitedEmails>(STORAGE_KEYS.INVITED_EMAILS, {})
    if (!invitedEmails[normalizedEmail]) {
      invitedEmails[normalizedEmail] = []
    }
    if (!invitedEmails[normalizedEmail].includes(collectionId)) {
      invitedEmails[normalizedEmail].push(collectionId)
    }
    this.setStorageItem(STORAGE_KEYS.INVITED_EMAILS, invitedEmails)

    // Create invitation token
    const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")

    const invitations = this.getStorageItem<Invitations>(STORAGE_KEYS.INVITATIONS, {})
    invitations[token] = {
      email: normalizedEmail,
      collectionId,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    }
    this.setStorageItem(STORAGE_KEYS.INVITATIONS, invitations)

    const siteUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
    const activationUrl = `${siteUrl}/auth/activate?token=${token}`

    return {
      ok: true,
      token,
      activationUrl,
    }
  }

  // Helper methods for seed panel
  async addInternalEmail(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim()
    const internalEmails = this.getStorageItem<string[]>(STORAGE_KEYS.INTERNAL_EMAILS, [])
    if (!internalEmails.includes(normalizedEmail)) {
      internalEmails.push(normalizedEmail)
      this.setStorageItem(STORAGE_KEYS.INTERNAL_EMAILS, internalEmails)
    }
  }

  async getInvitationByToken(token: string): Promise<{ email: string; collectionId: string } | null> {
    const invitations = this.getStorageItem<Invitations>(STORAGE_KEYS.INVITATIONS, {})
    const invitation = invitations[token]

    if (!invitation) {
      return null
    }

    if (Date.now() > invitation.expiresAt) {
      delete invitations[token]
      this.setStorageItem(STORAGE_KEYS.INVITATIONS, invitations)
      return null
    }

    return {
      email: invitation.email,
      collectionId: invitation.collectionId,
    }
  }

  async clearAllData(): Promise<void> {
    Object.values(STORAGE_KEYS).forEach((key) => {
      if (typeof window !== "undefined") {
        localStorage.removeItem(key)
      }
    })
  }
}

// Export singleton instance
export const mockAuthAdapter = new MockAuthAdapter()




