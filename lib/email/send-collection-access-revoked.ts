/**
 * Email sent to participants removed from a collection after a configuration change.
 * No CTA — informational only (they no longer have access to the collection view).
 */

import { Resend } from "resend"
import type { CollectionInvitationContext } from "@/lib/email/send-invitation"

export interface SendCollectionAccessRevokedEmailResult {
  sent: boolean
  error?: string
}

const MODIFIED_CHIP = { bg: "#fef3c7", text: "#b45309" }

const BODY_STYLES =
  "font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 1040px; width: 100%; margin: 0 auto; padding: 0; box-sizing: border-box;"

const CLIENT_MENTION_COLOR = "#84cc16"

function getSiteUrl(): string {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "")
}

function getLogoUrl(): string {
  const envUrl = process.env.EMAIL_LOGO_URL?.trim()
  if (envUrl && !envUrl.includes("placeholder")) return envUrl.replace(/\/$/, "")
  return `${getSiteUrl()}/assets/Logo.png`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function buildAccessRevokedEmailHtml(context: CollectionInvitationContext): string {
  const logoSrc = getLogoUrl()
  const logoImg = `<img src="${escapeHtml(logoSrc)}" alt="noba*" width="112" height="48" style="display: block; max-width: 100%; height: auto;" />`

  const dateRange =
    context.shootingStartDate && context.shootingEndDate
      ? `${context.shootingStartDate} – ${context.shootingEndDate}`
      : context.shootingStartDate ?? context.shootingEndDate ?? ""

  const modifiedChipHtml = `<span style="display: inline-block; background: ${MODIFIED_CHIP.bg}; color: ${MODIFIED_CHIP.text}; font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 6px; white-space: nowrap;">Modified</span>`

  const detailsBlock = `
  <div class="details-block" style="background: #f8f8f8; padding: 20px; border-radius: 8px; margin: 24px 0; box-sizing: border-box;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px;">
      <tr>
        <td style="font-size: 18px; font-weight: 600; color: #1a1a1a; vertical-align: top;">${escapeHtml(context.collectionName)}</td>
        <td style="text-align: right; vertical-align: top; white-space: nowrap;">${modifiedChipHtml}</td>
      </tr>
    </table>
    ${context.clientName ? `<p style="margin: 0 0 12px; font-size: 14px; color: ${CLIENT_MENTION_COLOR}; font-weight: 600;">@${escapeHtml(context.clientName.toLowerCase().replace(/\s+/g, ""))}</p>` : ""}
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="font-size: 13px; color: #666;">${dateRange ? escapeHtml(dateRange) : "&nbsp;"}</td>
        <td style="font-size: 13px; color: #666; text-align: right;">${context.location ? escapeHtml(context.location) : "&nbsp;"}</td>
      </tr>
    </table>
  </div>
`

  const producerLabel = context.creatorName?.trim()
    ? escapeHtml(context.creatorName.trim())
    : "the producer"

  const bodyText = `You no longer have access to this collection because ${producerLabel} updated its configuration. Contact ${producerLabel} if you need more information.`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media only screen and (max-width: 600px) {
      .email-body { padding: 0 !important; }
      .content-pad { padding: 16px !important; }
      .details-block { padding: 16px !important; margin: 16px 0 !important; }
      .footer-pad { padding: 20px 16px !important; }
    }
  </style>
</head>
<body class="email-body" style="${BODY_STYLES}">
  <div class="content-pad" style="padding: 24px;">
    <p style="margin: 0 0 32px; text-align: center;">${logoImg}</p>
    <p style="margin: 0 0 24px; font-size: 16px; font-weight: 600;">Your collection has changed</p>
    ${detailsBlock}
    <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.5;">${bodyText}</p>
  </div>
  <div class="footer-pad" style="background: #18181b; padding: 24px; margin-top: 32px;">
    <p style="margin: 0 0 8px; font-size: 12px; color: #a1a1aa;">© noba 2026</p>
    <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">This platform, developed by noba*, streamlines the post-production process for everyone involved, from filmmakers to photographers, labs and clients.</p>
  </div>
</body>
</html>
`.trim()
}

function getResendFromEmail(): string {
  const fromEnv = process.env.RESEND_FROM_EMAIL?.trim()
  if (fromEnv && fromEnv.length > 0) return fromEnv
  return "noba* <onboarding@resend.dev>"
}

/**
 * Sends the access-revoked email (no activation link / CTA).
 */
export async function sendCollectionAccessRevokedEmail(
  to: string,
  context: CollectionInvitationContext
): Promise<SendCollectionAccessRevokedEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    console.warn(
      "[sendCollectionAccessRevokedEmail] RESEND_API_KEY is not set; skipping email send."
    )
    return { sent: false, error: "RESEND_API_KEY not configured" }
  }

  const collectionName = context.collectionName?.trim() || "a collection"
  const subject = `"${collectionName}" is no longer available on noba*`
  const html = buildAccessRevokedEmailHtml({ ...context, collectionName })
  const from = getResendFromEmail()

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from,
      to: to.trim(),
      subject,
      html,
    })
    if (error) {
      console.error("[sendCollectionAccessRevokedEmail] Resend error:", error)
      return { sent: false, error: error.message }
    }
    return { sent: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[sendCollectionAccessRevokedEmail] Failed to send:", err)
    return { sent: false, error: message }
  }
}
