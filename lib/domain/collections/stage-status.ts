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

  const timeStr = (config.shootingStartTime ?? "00:00:00").trim()
  const timePart = timeStr.split(":").map(Number)
  const [hh = 0, mm = 0] = timePart
  const dateTimeStr = `${dateOnly}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`
  const shootingStart = new Date(dateTimeStr)
  if (Number.isNaN(shootingStart.getTime())) return fallback
  return shootingStart.getTime() <= Date.now() ? "in-progress" : "upcoming"
}
