import type { UserNotification } from "@/lib/services/notifications"

const STEP_ALIASES: Record<string, string> = {
  shooting: "shooting",
  negatives_dropoff: "negatives_dropoff",
  negatives_drop_off: "negatives_dropoff",
  low_res_scanning: "low_res_scanning",
  photographer_selection: "photographer_selection",
  client_selection: "client_selection",
  photographer_check: "photographer_check_client_selection",
  photographer_review: "photographer_check_client_selection",
  photographer_check_client_selection: "photographer_check_client_selection",
  handprint_high_res: "handprint_high_res",
  low_res_to_high_res: "handprint_high_res",
  edition_request: "edition_request",
  retouch_request: "edition_request",
  final_edits: "final_edits",
  photographer_last_check: "photographer_last_check",
  client_confirmation: "client_confirmation",
}

function normalizeStepKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_")
}

export function inferStepIdFromNotificationBody(body: string): string | null {
  const lines = body.split("\n")
  const lastLine = lines[lines.length - 1]?.trim()
  if (!lastLine || !lastLine.includes(" · ")) return null
  const stepLabel = lastLine.split(" · ").pop()
  if (!stepLabel) return null
  const normalized = normalizeStepKey(stepLabel)
  return STEP_ALIASES[normalized] ?? null
}

export function normalizeStepIdFromQuery(stepParam: string | null): string | null {
  if (!stepParam) return null
  const normalized = normalizeStepKey(stepParam)
  return STEP_ALIASES[normalized] ?? null
}

export function inferStepIdFromNotificationCtaUrl(
  ctaUrl: string | null | undefined
): string | null {
  if (!ctaUrl?.trim()) return null
  try {
    const parsed = /^[a-z]+:\/\//i.test(ctaUrl)
      ? new URL(ctaUrl)
      : new URL(ctaUrl, "http://localhost")
    return normalizeStepIdFromQuery(parsed.searchParams.get("step"))
  } catch {
    return null
  }
}

function appendStepToUrl(url: string, stepId: string): string {
  if (/^[a-z]+:\/\//i.test(url)) {
    const parsed = new URL(url)
    parsed.searchParams.set("step", stepId)
    return parsed.toString()
  }

  const parsed = new URL(url, "http://localhost")
  parsed.searchParams.set("step", stepId)
  return `${parsed.pathname}${parsed.search}${parsed.hash}`
}

export function buildNotificationNavigationUrl(
  notification: Pick<UserNotification, "ctaUrl" | "body" | "collectionId">
): string | null {
  const ctaUrl = notification.ctaUrl?.trim() || `/collections/${notification.collectionId}`

  const inferredStepId = inferStepIdFromNotificationBody(notification.body)
  if (!inferredStepId) return ctaUrl

  try {
    return appendStepToUrl(ctaUrl, inferredStepId)
  } catch {
    return ctaUrl
  }
}
