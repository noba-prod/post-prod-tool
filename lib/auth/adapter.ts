/**
 * Auth Adapter Interface
 * Allows switching between Mock and Supabase implementations
 */
export interface AuthAdapter {
  /**
   * Check if email is allowed to request OTP
   */
  precheck(email: string): Promise<PrecheckResult>

  /**
   * Request OTP for email
   */
  requestOtp(email: string): Promise<AuthResult>

  /**
   * Verify OTP and create session
   */
  verifyOtp(email: string, otp: string): Promise<VerifyResult>

  /**
   * Logout current user
   */
  logout(): Promise<void>

  /**
   * Get current session
   */
  getSession(): Promise<Session | null>

  /**
   * Mark email as verified (for activation flow)
   */
  markEmailVerified(email: string): Promise<void>

  /**
   * Invite email to collection (for testing)
   */
  inviteEmailToCollection(email: string, collectionId: string): Promise<InvitationResult>
}

export type PrecheckResult = {
  allowed: boolean
  reason?: "not_invited" | "not_verified" | "ok" | "invalid_email" | "error"
}

export type AuthResult = {
  ok: boolean
  error?: string
}

export type VerifyResult = {
  ok: boolean
  error?: string
  session?: Session
}

export type Session = {
  userId: string
  email: string
}

export type InvitationResult = {
  ok: boolean
  error?: string
  token?: string
  activationUrl?: string
}




