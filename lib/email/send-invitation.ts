/**
 * Sends the collection invitation email via Resend.
 * Used when a collection is published so participants receive an activation link.
 * If RESEND_API_KEY is not set, logs a warning and returns without sending.
 */

import { readFileSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { Resend } from "resend"

/** Project root = directory that contains package.json (with "next" dependency). Used to resolve .env. */
function getProjectRoot(): string | null {
  try {
    const currentDir =
      typeof __dirname !== "undefined"
        ? __dirname
        : dirname(fileURLToPath(import.meta.url))
    let dir = currentDir
    for (let i = 0; i < 10; i++) {
      const pkgPath = join(dir, "package.json")
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
          name?: string
          dependencies?: Record<string, string>
        }
        if (pkg.dependencies?.next) return dir
      }
      const parent = join(dir, "..")
      if (parent === dir) break
      dir = parent
    }
  } catch {
    // ignore
  }
  return null
}

/** Path to .env: always use the project root (where package.json + next is), never cwd. */
function getEnvPath(): string {
  const root = getProjectRoot()
  if (root) {
    const p = join(root, ".env")
    if (existsSync(p)) return p
  }
  return join(process.cwd(), ".env")
}

/** Preferred from-address (subdomain). If file/env gives root domain, we still use this when set. */
const PREFERRED_FROM_ENV_KEY = "RESEND_FROM_EMAIL"

/** Base URL for the app (logo, links). */
function getSiteUrl(): string {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "")
}

/** Read RESEND_FROM_EMAIL: from .env file, with fallback to process.env only when it contains "postproduction". */
function getResendFromEmail(): string {
  try {
    const envPath = getEnvPath()
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, "utf-8")
      const lines = content.split(/\r?\n/)
      const line = lines.find((l) => /^\s*RESEND_FROM_EMAIL\s*=/.test(l))
      if (line) {
        const raw = line.replace(/^\s*RESEND_FROM_EMAIL\s*=\s*/, "").trim()
        const beforeComment = raw.split(/#/)[0].trim()
        const unquoted = beforeComment.replace(/^["']|["']$/g, "").trim()
        if (unquoted) return unquoted
      }
    }
    const fromEnv = process.env[PREFERRED_FROM_ENV_KEY]?.trim()
    if (fromEnv && fromEnv.includes("postproduction")) return fromEnv
    return ""
  } catch {
    return ""
  }
}

export interface SendInvitationEmailResult {
  sent: boolean
  error?: string
}

export type InvitationEmailKind = "collection" | "platform"

/** Context for collection invitation emails. All fields except collectionName are optional. */
export interface CollectionInvitationContext {
  collectionName: string
  creatorName?: string
  clientName?: string
  statusDisplay?: string
  shootingStartDate?: string
  shootingEndDate?: string
  publishingDate?: string
  location?: string
}

/** Design system: Lime-400 for CTA button (matches button variant). */
const CTA_BG_COLOR = "#a3e635"
/** CTA text color (white for contrast on lime background). */
const CTA_TEXT_COLOR = "#ffffff"
/** Design system: lime-500 for @ClientName mentions. */
const CLIENT_MENTION_COLOR = "#84cc16"
/** CollectionStatusTag styles (from tag.tsx): upcoming = primary, in-progress = blue. */
const STATUS_CHIP_STYLES: Record<string, { bg: string; text: string }> = {
  Upcoming: { bg: "#18181b", text: "#fafafa" },
  "In progress": { bg: "#eff6ff", text: "#3b82f6" },
}

/** Shared responsive wrapper styles for email body. */
const BODY_STYLES =
  "font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 1040px; width: 100%; margin: 0 auto; padding: 0; box-sizing: border-box;"
const BODY_STYLES_MOBILE = "padding: 0;"
const CONTENT_PADDING = "24px"
const CONTENT_PADDING_MOBILE = "16px"

/** Logo URL for emails. Use EMAIL_LOGO_URL for a public URL (e.g. Supabase Storage) so Gmail can load it. */
function getLogoUrl(): string {
  const envUrl = process.env.EMAIL_LOGO_URL?.trim()
  if (envUrl && !envUrl.includes("placeholder")) return envUrl.replace(/\/$/, "")
  return `${getSiteUrl()}/assets/Logo.png`
}

function buildInvitationEmailHtml(
  activationUrl: string,
  displayName: string,
  kind: InvitationEmailKind,
  context?: CollectionInvitationContext
): string {
  const name = displayName?.trim() || (kind === "platform" ? "noba*" : "a collection")
  const logoSrc = getLogoUrl()
  const logoImg = `<img src="${escapeHtml(logoSrc)}" alt="noba*" width="112" height="48" style="display: block; max-width: 100%; height: auto;" />`

  if (kind === "platform") {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media only screen and (max-width: 600px) {
      .email-body { ${BODY_STYLES_MOBILE} }
      .content-pad { padding: ${CONTENT_PADDING_MOBILE} !important; }
      .cta-wrap { margin: 20px 0 !important; }
      .cta-btn { padding: 12px 24px !important; font-size: 15px !important; }
    }
  </style>
</head>
<body class="email-body" style="${BODY_STYLES}">
  <div class="content-pad" style="padding: ${CONTENT_PADDING};">
    <p style="margin: 0 0 32px; text-align: center;">${logoImg}</p>
    <p style="margin: 0 0 24px;">Hi,</p>
    <p style="margin: 0 0 16px;">You've been invited to join <strong>${escapeHtml(name)}</strong> and access the platform.</p>
    <p style="margin: 0 0 28px;">Accept the invitation to create your account and start collaborating.</p>
    <p class="cta-wrap" style="margin: 28px 0;">
      <a href="${escapeHtml(activationUrl)}" class="cta-btn" style="display: inline-block; background: ${CTA_BG_COLOR}; color: ${CTA_TEXT_COLOR}; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: 600;">Accept invitation</a>
    </p>
    <p style="font-size: 14px; color: #666;">This link expires in 7 days.</p>
    <p style="font-size: 14px; color: #666;">If you didn't expect this invitation, you can ignore this email.</p>
  </div>
</body>
</html>
`.trim()
  }

  const ctx = context ?? { collectionName: name }
  const hasDetails =
    ctx.creatorName ||
    ctx.clientName ||
    ctx.statusDisplay ||
    ctx.shootingStartDate ||
    ctx.shootingEndDate ||
    ctx.publishingDate ||
    ctx.location

  const dateRange =
    ctx.shootingStartDate && ctx.shootingEndDate
      ? `${ctx.shootingStartDate} – ${ctx.shootingEndDate}`
      : ctx.shootingStartDate ?? ctx.shootingEndDate ?? ""

  const statusChipStyle = ctx.statusDisplay && STATUS_CHIP_STYLES[ctx.statusDisplay]
    ? STATUS_CHIP_STYLES[ctx.statusDisplay]
    : { bg: "#18181b", text: "#fafafa" }
  const statusChipHtml = ctx.statusDisplay
    ? `<span style="display: inline-block; background: ${statusChipStyle.bg}; color: ${statusChipStyle.text}; font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 6px; white-space: nowrap;">${escapeHtml(ctx.statusDisplay)}</span>`
    : ""

  const detailsBlock = hasDetails
    ? `
  <div class="details-block" style="background: #f8f8f8; padding: 20px; border-radius: 8px; margin: 24px 0; box-sizing: border-box;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px;">
      <tr>
        <td style="font-size: 18px; font-weight: 600; color: #1a1a1a; vertical-align: top;">${escapeHtml(ctx.collectionName)}</td>
        ${ctx.statusDisplay ? `<td style="text-align: right; vertical-align: top; white-space: nowrap;">${statusChipHtml}</td>` : "<td></td>"}
      </tr>
    </table>
    ${ctx.clientName ? `<p style="margin: 0 0 12px; font-size: 14px; color: ${CLIENT_MENTION_COLOR}; font-weight: 600;">@${escapeHtml(ctx.clientName.toLowerCase().replace(/\s+/g, ""))}</p>` : ""}
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="font-size: 13px; color: #666;">${dateRange ? escapeHtml(dateRange) : "&nbsp;"}</td>
        <td style="font-size: 13px; color: #666; text-align: right;">${ctx.location ? escapeHtml(ctx.location) : "&nbsp;"}</td>
      </tr>
    </table>
  </div>
`
    : `
  <div class="details-block" style="background: #f8f8f8; padding: 20px; border-radius: 8px; margin: 24px 0; box-sizing: border-box;">
    <p style="margin: 0; font-size: 18px; font-weight: 600;">${escapeHtml(ctx.collectionName)}</p>
  </div>
`

  const invitationLine = ctx.creatorName
    ? `${escapeHtml(ctx.creatorName)} invited you to a new collection`
    : "You've been invited to a new collection"

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media only screen and (max-width: 600px) {
      .email-body { ${BODY_STYLES_MOBILE} }
      .content-pad { padding: ${CONTENT_PADDING_MOBILE} !important; }
      .details-block { padding: 16px !important; margin: 16px 0 !important; }
      .details-block table td { display: block !important; text-align: left !important; }
      .details-block table td:last-child { padding-top: 4px !important; }
      .cta-wrap { margin: 24px 0 !important; }
      .cta-btn { padding: 12px 24px !important; font-size: 15px !important; }
      .footer-pad { padding: 20px 16px !important; }
    }
  </style>
</head>
<body class="email-body" style="${BODY_STYLES}">
  <div class="content-pad" style="padding: ${CONTENT_PADDING};">
    <p style="margin: 0 0 32px; text-align: center;">${logoImg}</p>
    <p style="margin: 0 0 24px; font-size: 16px; font-weight: 600;">${invitationLine}</p>
    ${detailsBlock}
    <p style="margin: 24px 0 8px; font-size: 15px; font-weight: 600;">Click the link below to join the collection</p>
    <p style="margin: 0 0 24px; font-size: 14px; color: #666; line-height: 1.5;">If it's your first time working with noba* post-production tool, set up your profile to be better recognised during the collection progress.</p>
    <p class="cta-wrap" style="margin: 28px 0;">
      <a href="${escapeHtml(activationUrl)}" class="cta-btn" style="display: inline-block; background: ${CTA_BG_COLOR}; color: ${CTA_TEXT_COLOR}; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 600; font-size: 16px;">Join collection</a>
    </p>
    <p style="font-size: 13px; color: #999;">This link expires in 7 days.</p>
  </div>
  <div class="footer-pad" style="background: #18181b; padding: 24px; margin-top: 32px;">
    <p style="margin: 0 0 8px; font-size: 12px; color: #a1a1aa;">© noba 2026</p>
    <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">This platform, developed by noba*, streamlines the post-production process for everyone involved, from filmmakers to photographers, labs and clients.</p>
  </div>
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

export interface SendInvitationEmailOptions {
  kind?: InvitationEmailKind
  collectionName?: string
  context?: CollectionInvitationContext
}

/**
 * Sends the invitation email to one recipient.
 * kind "collection" = invite to a collection; kind "platform" = invite to join the team/platform.
 * Returns { sent: true } on success; { sent: false, error } on failure.
 * Does not throw; if RESEND_API_KEY is missing, returns without sending and logs a warning.
 */
export async function sendInvitationEmail(
  to: string,
  activationUrl: string,
  optionsOrCollectionName?: SendInvitationEmailOptions | string,
  kind?: InvitationEmailKind
): Promise<SendInvitationEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    console.warn("[sendInvitationEmail] RESEND_API_KEY is not set; skipping email send.")
    return { sent: false, error: "RESEND_API_KEY not configured" }
  }

  // Support legacy: sendInvitationEmail(to, url, "noba*", "platform")
  const options: SendInvitationEmailOptions =
    typeof optionsOrCollectionName === "string"
      ? { collectionName: optionsOrCollectionName, kind: kind ?? "collection" }
      : optionsOrCollectionName ?? {}

  const finalKind = options.kind ?? kind ?? "collection"
  const displayName =
    options.context?.collectionName?.trim() ??
    options.collectionName?.trim() ??
    (finalKind === "platform" ? "noba*" : "a collection")

  // Use only project .env (resolved via package.json root), never process.env (can be cached/wrong).
  const envPath = getEnvPath()
  const fromEnv = getResendFromEmail()
  const from =
    fromEnv && fromEnv.length > 0 ? fromEnv : "noba* <onboarding@resend.dev>"
  if (process.env.NODE_ENV === "development") {
    const masked = from.includes("@") ? `***@${from.split("@")[1]}` : "***"
    console.log("[sendInvitationEmail] .env path:", envPath, "| Using from:", masked)
  }
  const subject =
    finalKind === "platform"
      ? "You're invited to join noba*"
      : `You're invited to join "${displayName}" on noba*`
  const html = buildInvitationEmailHtml(activationUrl, displayName, finalKind, options.context)

  const sendOnce = async (): Promise<
    SendInvitationEmailResult | { sent: false; error: string; statusCode: number }
  > => {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from,
      to: to.trim(),
      subject,
      html,
    })
    if (error) {
      const statusCode = (error as { statusCode?: number }).statusCode ?? 0
      if (statusCode !== 429) {
        console.error("[sendInvitationEmail] Resend error:", error)
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
    console.error("[sendInvitationEmail] Failed to send:", err)
    return { sent: false, error: message }
  }
}
