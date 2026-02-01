/**
 * Sends notification emails via Resend.
 * Used for workflow notifications (deadline reminders, status updates, etc.)
 */

import { readFileSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { Resend } from "resend"

/** Project root = directory that contains package.json (with "next" dependency). */
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

/** Path to .env */
function getEnvPath(): string {
  const root = getProjectRoot()
  if (root) {
    const p = join(root, ".env")
    if (existsSync(p)) return p
  }
  return join(process.cwd(), ".env")
}

/** Read RESEND_FROM_EMAIL from .env file */
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
    const fromEnv = process.env.RESEND_FROM_EMAIL?.trim()
    if (fromEnv && fromEnv.includes("postproduction")) return fromEnv
    return ""
  } catch {
    return ""
  }
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

  const ctaButton = params.ctaText && params.ctaUrl
    ? `
    <p style="margin: 28px 0;">
      <a href="${escapeHtml(params.ctaUrl)}" style="display: inline-block; background: #1a1a1a; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">${escapeHtml(params.ctaText)}</a>
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
