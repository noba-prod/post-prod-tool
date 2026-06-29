/**
 * Visibility rules for client_confirmation step material links.
 * Clients must only see high-res / final edits after the photographer explicitly
 * shares them via "Share high-res with client" (photographerApprovedMaterialUrls).
 */

export interface ClientConfirmationMaterialVisibilityInput {
  photographerApprovedMaterialUrls?: string[]
  materialUrls?: string[]
  /** URLs added in photographer_last_check (Add new link). */
  photographerLastCheckUrls?: string[]
  photographerLastCheckCompleted: boolean
}

/** Material URLs (high-res or final edits) visible in client_confirmation. */
export function getClientConfirmationMaterialUrls(
  input: ClientConfirmationMaterialVisibilityInput
): string[] {
  const approved = (input.photographerApprovedMaterialUrls ?? []).filter(Boolean)
  if (approved.length > 0) {
    return approved
  }

  const material = (input.materialUrls ?? []).filter(Boolean)
  const lastCheck = (input.photographerLastCheckUrls ?? []).filter(Boolean)

  // Legacy only: collections that completed photographer_last_check before approval
  // tracking existed — no approved list and no separate finals links from step 10.
  if (
    input.photographerLastCheckCompleted &&
    material.length > 0 &&
    lastCheck.length === 0
  ) {
    return material
  }

  return []
}

/** Photographer last-check URLs visible to the client (subset of approved list). */
export function getClientConfirmationLastCheckUrls(
  input: Pick<
    ClientConfirmationMaterialVisibilityInput,
    "photographerApprovedMaterialUrls" | "photographerLastCheckUrls"
  >
): string[] {
  const approved = new Set((input.photographerApprovedMaterialUrls ?? []).filter(Boolean))
  if (approved.size === 0) return []
  return (input.photographerLastCheckUrls ?? []).filter((url) => approved.has(url))
}

/** @deprecated Prefer checking getClientConfirmationLastCheckUrls().length > 0 */
export function canShowPhotographerLastCheckExtraLinks(
  input: Pick<
    ClientConfirmationMaterialVisibilityInput,
    | "photographerApprovedMaterialUrls"
    | "photographerLastCheckUrls"
    | "photographerLastCheckCompleted"
  >
): boolean {
  return getClientConfirmationLastCheckUrls(input).length > 0
}

export function getClientConfirmationLinkTitle(input: {
  url: string
  materialUrls: string[]
  hasEditionStudio: boolean
  materialIndex: number
  lastCheckIndex: number
}): string {
  const materialLabel = input.hasEditionStudio ? "Final edits" : "High-res selection"
  if (input.materialUrls.includes(input.url)) {
    return input.materialIndex === 0
      ? `${materialLabel} (validated by photographer)`
      : `${materialLabel} (validated by photographer) - Additional link ${String(input.materialIndex).padStart(2, "0")}`
  }
  return input.lastCheckIndex === 0
    ? "Finals"
    : `Finals - Additional link ${String(input.lastCheckIndex).padStart(2, "0")}`
}

export interface ClientConfirmationStepLike {
  id: string
  inactive?: boolean
  status: string
}

/** True when the active step immediately before client_confirmation is completed. */
export function isClientConfirmationStepReady(
  steps: ClientConfirmationStepLike[]
): boolean {
  const visible = steps.filter((step) => !step.inactive)
  const clientConfirmationIndex = visible.findIndex((step) => step.id === "client_confirmation")
  if (clientConfirmationIndex <= 0) return false
  const previousStep = visible[clientConfirmationIndex - 1]
  return previousStep?.status === "completed"
}

export function getClientConfirmationBannerCopy(input: {
  isReady: boolean
  hasEditionStudio: boolean
  canShowModalActions: boolean
}): { title: string; subtitle: string } {
  if (!input.isReady) {
    return {
      title: "Final selection yet to come!",
      subtitle: input.hasEditionStudio
        ? "The photographer is still reviewing the final retouches. You'll be notified when they're ready to confirm."
        : "The photographer is still reviewing the high-res selection. You'll be notified when they're ready to confirm.",
    }
  }

  return {
    title: "Final selection is ready!",
    subtitle: input.canShowModalActions
      ? "Check and review the finals before confirming the closing of the project"
      : "View the final selection.",
  }
}

export function canCompleteClientConfirmation(input: {
  isReady: boolean
  canShowModalActions: boolean
  stepStatus: string
}): boolean {
  return (
    input.canShowModalActions &&
    input.stepStatus !== "completed" &&
    input.isReady
  )
}
