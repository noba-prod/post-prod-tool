/**
 * Derives display stage status (Upcoming vs In progress) from shooting start date/time.
 * Used so that changing shooting dates after publish updates the status without
 * requiring a separate backend status field update.
 */

export type StageStatusDisplay = "upcoming" | "in-progress"

export interface ShootingStartConfig {
  shootingStartDate?: string
  shootingStartTime?: string
  /** Fallback key used elsewhere (e.g. view-mode-steps) */
  shootingDate?: string
}

function normalizeTimeForComparison(timeStr: string | undefined): string {
  const t = (timeStr ?? "").trim().toLowerCase()
  if (!t) return "00:00:00"
  if (t === "morning" || t === "morning (9:00am)") return "09:00:00"
  if (t === "midday" || t === "midday (12:00pm)" || t === "midday - 12:00pm") return "12:00:00"
  if (t === "end-of-day" || t === "end of day (5:00pm)" || t === "end of day - 05:00pm") return "17:00:00"
  if (t === "afternoon") return "14:00:00"
  if (t === "evening") return "18:00:00"
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(t)) return t.length === 5 ? `${t}:00` : t
  return "00:00:00"
}

/**
 * Returns "in-progress" if shooting has started (start date+time <= now), else "upcoming".
 * If no shooting start date is set, returns the fallback (e.g. from collection.status).
 * Handles DB date formats: "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss.sssZ".
 * Uses shootingStartDate first, then shootingDate as fallback.
 */
export function deriveStageStatusFromShootingStart(
  config: ShootingStartConfig,
  fallback: StageStatusDisplay
): StageStatusDisplay {
  const raw = (config.shootingStartDate ?? config.shootingDate ?? "").trim()
  if (!raw) return fallback

  const dateOnly = raw.includes("T") ? raw.slice(0, 10) : raw
  if (dateOnly.length < 10) return fallback

  const normalizedTime = normalizeTimeForComparison(config.shootingStartTime)
  const [hhRaw, mmRaw] = normalizedTime.split(":").map(Number)
  const hh = Number.isFinite(hhRaw) ? hhRaw : 0
  const mm = Number.isFinite(mmRaw) ? mmRaw : 0
  const dateTimeStr = `${dateOnly}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`
  const shootingStart = new Date(dateTimeStr)
  if (Number.isNaN(shootingStart.getTime())) return fallback
  return shootingStart.getTime() <= Date.now() ? "in-progress" : "upcoming"
}
