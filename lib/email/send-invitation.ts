/**
 * Sends the collection invitation email via Resend.
 * Used when a collection is published so participants receive an activation link.
 * If RESEND_API_KEY is not set, logs a warning and returns without sending.
 */

import { Resend } from "resend"

export interface SendInvitationEmailResult {
  sent: boolean
  error?: string
}

function buildInvitationEmailHtml(activationUrl: string, collectionName: string): string {
  const displayName = collectionName?.trim() || "a collection"
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p>Hi,</p>
  <p>You've been invited to collaborate on <strong>${escapeHtml(displayName)}</strong> on noba*.</p>
  <p>You can log in to noba*, track the collection's progress, and receive notifications.</p>
  <p style="margin: 28px 0;">
    <a href="${escapeHtml(activationUrl)}" style="display: inline-block; background: #1a1a1a; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">Accept invitation</a>
  </p>
  <p style="font-size: 14px; color: #666;">This link expires in 7 days.</p>
  <p style="font-size: 14px; color: #666;">If you didn't expect this invitation, you can ignore this email.</p>
</body>
</html>
`.trim()
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Sends the collection invitation email to one recipient.
 * Returns { sent: true } on success; { sent: false, error } on failure.
 * Does not throw; if RESEND_API_KEY is missing, returns without sending and logs a warning.
 */
export async function sendInvitationEmail(
  to: string,
  activationUrl: string,
  collectionName?: string
): Promise<SendInvitationEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    console.warn("[sendInvitationEmail] RESEND_API_KEY is not set; skipping email send.")
    return { sent: false, error: "RESEND_API_KEY not configured" }
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim() || "noba* <onboarding@resend.dev>"
  const displayName = collectionName?.trim() || "a collection"
  const subject = `You're invited to join "${displayName}" on noba*`
  const html = buildInvitationEmailHtml(activationUrl, displayName)

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from,
      to: to.trim(),
      subject,
      html,
    })

    if (error) {
      console.error("[sendInvitationEmail] Resend error:", error)
      return { sent: false, error: error.message }
    }

    return { sent: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[sendInvitationEmail] Failed to send:", err)
    return { sent: false, error: message }
  }
}
