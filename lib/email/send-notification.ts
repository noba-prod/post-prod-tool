/**
 * Sends notification emails via Resend.
 * Used for workflow notifications (deadline reminders, status updates, etc.)
 * Uses process.env only so this module is safe to bundle in the client
 * (email sending only runs in API routes / cron).
 */

import { Resend } from "resend"

/** Read RESEND_FROM_EMAIL from environment */
function getResendFromEmail(): string {
  const fromEnv = process.env.RESEND_FROM_EMAIL?.trim()
  if (fromEnv) return fromEnv
  return ""
}

/** Base URL for the app (used for absolute links in emails). Same as invitations. */
function getSiteUrl(): string {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "")
}

/**
 * Converts a CTA URL to an absolute URL for email links.
 * Relative paths (e.g. /collections/xxx?step=yyy) are resolved against SITE_URL
 * so links open correctly in the user's browser.
 */
function toAbsoluteCtaUrl(ctaUrl: string | undefined): string | undefined {
  if (!ctaUrl?.trim()) return undefined
  const trimmed = ctaUrl.trim()
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed
  const base = getSiteUrl()
  return `${base}${trimmed.startsWith("/") ? trimmed : "/" + trimmed}`
}

export interface SendNotificationEmailResult {
  sent: boolean
  error?: string
}

export interface SendNotificationEmailParams {
  to: string
  subject: string
  body: string
  ctaText?: string
  ctaUrl?: string
  recipientName?: string
  collectionName?: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function buildNotificationEmailHtml(params: SendNotificationEmailParams): string {
  const greeting = params.recipientName 
    ? `Hi ${escapeHtml(params.recipientName)},`
    : "Hi,"

  const absoluteCtaUrl = toAbsoluteCtaUrl(params.ctaUrl)
  const ctaButton = params.ctaText && absoluteCtaUrl
    ? `
    <p style="margin: 28px 0;">
      <a href="${escapeHtml(absoluteCtaUrl)}" style="display: inline-block; background: #1a1a1a; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">${escapeHtml(params.ctaText)}</a>
    </p>
    `
    : ""

  const collectionInfo = params.collectionName
    ? `<p style="font-size: 12px; color: #999; margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee;">Collection: ${escapeHtml(params.collectionName)}</p>`
    : ""

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p>${greeting}</p>
  <p>${escapeHtml(params.body)}</p>
  ${ctaButton}
  <p style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee;">
    <span style="font-size: 14px; color: #666;">— The noba* team</span>
  </p>
  ${collectionInfo}
</body>
</html>
`.trim()
}

/**
 * Sends a notification email to one recipient.
 * Returns { sent: true } on success; { sent: false, error } on failure.
 * Does not throw; if RESEND_API_KEY is missing, returns without sending.
 */
export async function sendNotificationEmail(
  params: SendNotificationEmailParams
): Promise<SendNotificationEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    console.warn("[sendNotificationEmail] RESEND_API_KEY is not set; skipping email send.")
    return { sent: false, error: "RESEND_API_KEY not configured" }
  }

  const fromEnv = getResendFromEmail()
  const from =
    fromEnv && fromEnv.length > 0 ? fromEnv : "noba* <onboarding@resend.dev>"

  if (process.env.NODE_ENV === "development") {
    const masked = from.includes("@") ? `***@${from.split("@")[1]}` : "***"
    console.log("[sendNotificationEmail] Using from:", masked, "| To:", params.to)
  }

  const html = buildNotificationEmailHtml(params)

  const sendOnce = async (): Promise<
    SendNotificationEmailResult | { sent: false; error: string; statusCode: number }
  > => {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from,
      to: params.to.trim(),
      subject: params.subject,
      html,
    })
    if (error) {
      const statusCode = (error as { statusCode?: number }).statusCode ?? 0
      if (statusCode !== 429) {
        console.error("[sendNotificationEmail] Resend error:", error)
      }
      return { sent: false, error: error.message, statusCode }
    }
    return { sent: true }
  }

  try {
    let result = await sendOnce()
    // Retry once on rate limit
    if (!result.sent && "statusCode" in result && result.statusCode === 429) {
      await new Promise((r) => setTimeout(r, 1000))
      result = await sendOnce()
    }
    if (result.sent) return { sent: true }
    return { sent: false, error: result.error }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[sendNotificationEmail] Failed to send:", err)
    return { sent: false, error: message }
  }
}
