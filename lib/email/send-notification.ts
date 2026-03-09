/**
 * Sends notification emails via Resend.
 * Uses process.env only so this module is safe to bundle in the client
 * (email sending only runs in API routes / cron).
 */

import { Resend } from "resend"

function getResendFromEmail(): string {
  const fromEnv = process.env.RESEND_FROM_EMAIL?.trim()
  if (fromEnv) return fromEnv
  return ""
}

function getSiteUrl(): string {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "")
}

/**
 * Converts a CTA URL to an absolute URL for email links.
 * Relative paths are resolved against SITE_URL.
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
  /** Title displayed inside the email body (distinct from subject line) */
  emailTitle?: string
  ctaText?: string
  ctaUrl?: string
  recipientName?: string
  collectionName?: string
  clientName?: string
  shootingStartDate?: string
  shootingEndDate?: string
  shootingCity?: string
  shootingCountry?: string
  stepStatus?: string
  stepName?: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—"
  try {
    const d = new Date(dateStr)
    if (!Number.isFinite(d.getTime())) return "—"
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return "—"
  }
}

function getStepStatusBgColor(status: string): string {
  switch (status) {
    case "At risk": return "#FFF3CD"
    case "Delayed": return "#F8D7DA"
    case "Ready": return "#D4EDDA"
    default: return "#E2E3E5"
  }
}

function getStepStatusTextColor(status: string): string {
  switch (status) {
    case "At risk": return "#856404"
    case "Delayed": return "#721C24"
    case "Ready": return "#155724"
    default: return "#383D41"
  }
}

function buildNotificationEmailHtml(params: SendNotificationEmailParams): string {
  const absoluteCtaUrl = toAbsoluteCtaUrl(params.ctaUrl)

  const ctaButton = params.ctaText && absoluteCtaUrl
    ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 0;">
      <tr>
        <td style="border-radius: 8px; background: #A3C540;" valign="middle">
          <a href="${escapeHtml(absoluteCtaUrl)}" target="_blank" style="display: inline-block; color: #fff; text-decoration: none; padding: 12px 28px; font-weight: 600; font-size: 14px; font-family: system-ui, -apple-system, sans-serif;">${escapeHtml(params.ctaText)}</a>
        </td>
      </tr>
    </table>
    `
    : ""

  const startDate = formatDate(params.shootingStartDate)
  const endDate = formatDate(params.shootingEndDate)
  const dateRange = params.shootingStartDate
    ? (params.shootingEndDate ? `${startDate} - ${endDate}` : startDate)
    : ""

  const locationParts = [params.shootingCity, params.shootingCountry].filter(Boolean)
  const location = locationParts.length > 0
    ? locationParts.map(l => escapeHtml(l!)).join(", ")
    : ""

  const stepStatusBg = getStepStatusBgColor(params.stepStatus || "")
  const stepStatusColor = getStepStatusTextColor(params.stepStatus || "")
  const stepStatusBadge = params.stepStatus
    ? `<span style="display: inline-block; padding: 4px 12px; border-radius: 6px; background: ${stepStatusBg}; color: ${stepStatusColor}; font-size: 12px; font-weight: 600;">${escapeHtml(params.stepStatus)}</span>`
    : ""

  const collectionCard = params.collectionName
    ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #E5E7EB; border-radius: 12px; margin: 24px 0;">
      <tr>
        <td style="padding: 20px 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="font-size: 16px; font-weight: 700; color: #1a1a1a; font-family: system-ui, -apple-system, sans-serif;">
                ${escapeHtml(params.collectionName)}
              </td>
              <td align="right" style="vertical-align: top;">
                ${stepStatusBadge}
              </td>
            </tr>
            ${params.clientName ? `
            <tr>
              <td colspan="2" style="padding-top: 4px; font-size: 14px; color: #A3C540; font-family: system-ui, -apple-system, sans-serif;">
                @${escapeHtml(params.clientName)}
              </td>
            </tr>
            ` : ""}
            ${dateRange || location ? `
            <tr>
              <td style="padding-top: 8px; font-size: 13px; color: #6B7280; font-family: system-ui, -apple-system, sans-serif;">
                ${dateRange ? escapeHtml(dateRange) : ""}
              </td>
              <td align="right" style="padding-top: 8px; font-size: 13px; color: #6B7280; font-family: system-ui, -apple-system, sans-serif;">
                ${location}
              </td>
            </tr>
            ` : ""}
          </table>
        </td>
      </tr>
    </table>
    `
    : ""

  const emailTitle = params.emailTitle || params.subject
  const emailBody = params.body

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #FFFFFF;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
    <!-- Header -->
    <tr>
      <td style="padding: 28px 24px 20px;">
        <img src="https://prneklhdbujxmbuswplp.supabase.co/storage/v1/object/public/email-assets/Logotype.png" alt="noba*" width="100" style="display: block; height: auto;" />
      </td>
    </tr>

    <!-- Collection Summary Card -->
    <tr>
      <td style="padding: 0 24px;">
        ${collectionCard}
      </td>
    </tr>

    <!-- Email Title -->
    <tr>
      <td style="padding: 8px 24px 0;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">
          ${escapeHtml(emailTitle)}
        </h2>
      </td>
    </tr>

    <!-- Email Description -->
    <tr>
      <td style="padding: 8px 24px 0;">
        <p style="margin: 0; font-size: 15px; color: #4B5563; line-height: 1.6;">
          ${escapeHtml(emailBody)}
        </p>
      </td>
    </tr>

    <!-- CTA Button -->
    <tr>
      <td style="padding: 0 24px;">
        ${ctaButton}
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 48px 24px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top: 1px solid #E5E7EB;">
          <tr>
            <td style="padding-top: 20px;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #9CA3AF; font-family: system-ui, -apple-system, sans-serif;">
                &copy;noba-prod2026
              </p>
              <p style="margin: 0; font-size: 12px; color: #9CA3AF; line-height: 1.5; font-family: system-ui, -apple-system, sans-serif;">
                This platform, developed by noba*, streamlines the post-production process for everyone involved, from filmmakers to photographers, labs and client.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()
}

/**
 * Sends a notification email to one recipient.
 * Returns { sent: true } on success; { sent: false, error } on failure.
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
