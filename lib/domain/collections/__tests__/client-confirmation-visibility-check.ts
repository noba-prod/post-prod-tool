import {
  canCompleteClientConfirmation,
  canShowPhotographerLastCheckExtraLinks,
  getClientConfirmationBannerCopy,
  getClientConfirmationLastCheckUrls,
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
    getClientConfirmationMaterialUrls({
      photographerApprovedMaterialUrls: ["https://example.com/photographer-new"],
      materialUrls: ["https://example.com/lab"],
      photographerLastCheckUrls: ["https://example.com/photographer-new"],
      photographerLastCheckCompleted: true,
    }).join() === "https://example.com/photographer-new",
    "Client sees only photographer-approved new link, not lab"
  )

  assert(
    getClientConfirmationMaterialUrls({
      photographerApprovedMaterialUrls: ["https://example.com/lab"],
      materialUrls: ["https://example.com/lab"],
      photographerLastCheckUrls: ["https://example.com/photographer-new"],
      photographerLastCheckCompleted: true,
    }).join() === "https://example.com/lab",
    "Client sees only lab link when photographer validated lab selection"
  )

  // Add-new-link bug: step completed with photographer finals link but no approved list.
  assert(
    getClientConfirmationMaterialUrls({
      materialUrls: ["https://example.com/lab"],
      photographerLastCheckUrls: ["https://example.com/photographer"],
      photographerLastCheckCompleted: true,
    }).length === 0,
    "Must not legacy-fallback lab link when photographer added separate finals link"
  )

  assert(
    getClientConfirmationLastCheckUrls({
      photographerApprovedMaterialUrls: ["https://example.com/finals"],
      photographerLastCheckUrls: ["https://example.com/finals", "https://example.com/other"],
    }).join() === "https://example.com/finals",
    "Only approved last-check URLs are visible"
  )

  assert(
    !canShowPhotographerLastCheckExtraLinks({
      photographerLastCheckCompleted: false,
      photographerLastCheckUrls: ["https://example.com/finals"],
    }),
    "Extra last-check links hidden until photographer shares approved material"
  )

  assert(
    canShowPhotographerLastCheckExtraLinks({
      photographerApprovedMaterialUrls: ["https://example.com/finals"],
      photographerLastCheckUrls: ["https://example.com/finals"],
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
