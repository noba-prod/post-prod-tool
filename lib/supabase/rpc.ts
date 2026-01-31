import { createClient } from "./server"

/**
 * RPC function to check if email is allowed to request OTP
 * Returns: { allowed: boolean, reason?: string }
 */
export async function checkEmailAllowed(email: string) {
  const supabase = await createClient()
  
  const { data, error } = await (supabase.rpc as any)("check_email_precheck", {
    check_email: email,
  })

  if (error) {
    console.error("Error checking email:", error)
    return { allowed: false, reason: "error" }
  }

  const row = Array.isArray(data) ? data[0] : data
  return row || { allowed: false, reason: "not_invited" }
}






