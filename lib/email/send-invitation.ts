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

function buildInvitationEmailHtml(
  activationUrl: string,
  displayName: string,
  kind: InvitationEmailKind
): string {
  const name = displayName?.trim() || (kind === "platform" ? "noba*" : "a collection")
  if (kind === "platform") {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p>Hi,</p>
  <p>You've been invited to join <strong>${escapeHtml(name)}</strong> and access the platform.</p>
  <p>Accept the invitation to create your account and start collaborating.</p>
  <p style="margin: 28px 0;">
    <a href="${escapeHtml(activationUrl)}" style="display: inline-block; background: #1a1a1a; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">Accept invitation</a>
  </p>
  <p style="font-size: 14px; color: #666;">This link expires in 7 days.</p>
  <p style="font-size: 14px; color: #666;">If you didn't expect this invitation, you can ignore this email.</p>
</body>
</html>
`.trim()
  }
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p>Hi,</p>
  <p>You've been invited to collaborate on <strong>${escapeHtml(name)}</strong> on noba*.</p>
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
 * Sends the invitation email to one recipient.
 * kind "collection" = invite to a collection; kind "platform" = invite to join the team/platform.
 * Returns { sent: true } on success; { sent: false, error } on failure.
 * Does not throw; if RESEND_API_KEY is missing, returns without sending and logs a warning.
 */
export async function sendInvitationEmail(
  to: string,
  activationUrl: string,
  collectionName?: string,
  kind: InvitationEmailKind = "collection"
): Promise<SendInvitationEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    console.warn("[sendInvitationEmail] RESEND_API_KEY is not set; skipping email send.")
    return { sent: false, error: "RESEND_API_KEY not configured" }
  }

  // Use only project .env (resolved via package.json root), never process.env (can be cached/wrong).
  const envPath = getEnvPath()
  const fromEnv = getResendFromEmail()
  const from =
    fromEnv && fromEnv.length > 0 ? fromEnv : "noba* <onboarding@resend.dev>"
  if (process.env.NODE_ENV === "development") {
    const masked = from.includes("@") ? `***@${from.split("@")[1]}` : "***"
    console.log("[sendInvitationEmail] .env path:", envPath, "| Using from:", masked)
  }
  const displayName = collectionName?.trim() || (kind === "platform" ? "noba*" : "a collection")
  const subject =
    kind === "platform"
      ? "You're invited to join noba*"
      : `You're invited to join "${displayName}" on noba*`
  const html = buildInvitationEmailHtml(activationUrl, displayName, kind)

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
