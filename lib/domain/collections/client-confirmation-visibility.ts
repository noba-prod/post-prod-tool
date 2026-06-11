/**
 * Visibility rules for client_confirmation step material links.
 * Clients must only see high-res / final edits after the photographer explicitly
 * shares them (photographerApprovedMaterialUrls) or, for legacy collections,
 * after photographer_last_check is completed.
 */

export interface ClientConfirmationMaterialVisibilityInput {
  photographerApprovedMaterialUrls?: string[]
  materialUrls?: string[]
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
  // Legacy: collections that completed photographer_last_check before approval tracking.
  if (input.photographerLastCheckCompleted && material.length > 0) {
    return material
  }

  return []
}

/** Extra links added during photographer_last_check (photographerLastCheckUrl). */
export function canShowPhotographerLastCheckExtraLinks(
  input: Pick<
    ClientConfirmationMaterialVisibilityInput,
    "photographerApprovedMaterialUrls" | "photographerLastCheckCompleted"
  >
): boolean {
  if ((input.photographerApprovedMaterialUrls ?? []).length > 0) {
    return true
  }
  return input.photographerLastCheckCompleted
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
