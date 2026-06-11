import {
  canCompleteClientConfirmation,
  canShowPhotographerLastCheckExtraLinks,
  getClientConfirmationBannerCopy,
  getClientConfirmationMaterialUrls,
  isClientConfirmationStepReady,
} from "../client-confirmation-visibility"

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function runChecks(): void {
  // Bug case: handprint uploaded high-res but photographer has not shared yet.
  assert(
    getClientConfirmationMaterialUrls({
      materialUrls: ["https://example.com/high-res"],
      photographerLastCheckCompleted: false,
    }).length === 0,
    "Must not expose material before photographer shares"
  )

  assert(
    getClientConfirmationMaterialUrls({
      photographerApprovedMaterialUrls: ["https://example.com/approved"],
      materialUrls: ["https://example.com/high-res"],
      photographerLastCheckCompleted: false,
    }).join() === "https://example.com/approved",
    "Must show explicitly approved URLs"
  )

  assert(
    getClientConfirmationMaterialUrls({
      materialUrls: ["https://example.com/legacy"],
      photographerLastCheckCompleted: true,
    }).join() === "https://example.com/legacy",
    "Legacy completed collections without approval field still show material"
  )

  assert(
    !canShowPhotographerLastCheckExtraLinks({
      photographerLastCheckCompleted: false,
    }),
    "Extra last-check links hidden until photographer shares or step completes"
  )

  assert(
    canShowPhotographerLastCheckExtraLinks({
      photographerApprovedMaterialUrls: ["https://example.com/approved"],
      photographerLastCheckCompleted: false,
    }),
    "Extra links allowed once photographer has shared approved material"
  )

  const analogHpSteps = [
    { id: "handprint_high_res", status: "completed" },
    { id: "photographer_last_check", status: "in-progress" },
    { id: "client_confirmation", status: "locked" },
  ]
  assert(
    !isClientConfirmationStepReady(analogHpSteps),
    "Client confirmation not ready while photographer last check is in progress"
  )

  assert(
    isClientConfirmationStepReady([
      { id: "photographer_last_check", status: "completed" },
      { id: "client_confirmation", status: "active" },
    ]),
    "Client confirmation ready once previous step is completed"
  )

  const pendingBanner = getClientConfirmationBannerCopy({
    isReady: false,
    hasEditionStudio: false,
    canShowModalActions: true,
  })
  assert(
    pendingBanner.title === "Final selection yet to come!",
    "Pending banner title"
  )

  assert(
    !canCompleteClientConfirmation({
      isReady: false,
      canShowModalActions: true,
      stepStatus: "active",
    }),
    "Cannot complete collection before previous step is done"
  )

  assert(
    canCompleteClientConfirmation({
      isReady: true,
      canShowModalActions: true,
      stepStatus: "active",
    }),
    "Can complete collection when previous step is done"
  )

  console.log("client-confirmation-visibility-check: all passed")
}

runChecks()
