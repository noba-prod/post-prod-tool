import { createClient } from "./server"

/**
 * RPC function to check if email is allowed to request OTP
 * Returns: { allowed: boolean, reason?: string }
 */
export async function checkEmailAllowed(email: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase.rpc("check_email_allowed", {
    email_to_check: email,
  })

  if (error) {
    console.error("Error checking email:", error)
    return { allowed: false, reason: "error" }
  }

  return data || { allowed: false, reason: "not_invited" }
}




