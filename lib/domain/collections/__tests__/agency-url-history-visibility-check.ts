import {
  canUserEditStep,
  canUserViewStepUrlHistory,
} from "../workflow"
import type { CollectionDraft, UserForPermission } from "../types"

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

const agencyViewer: UserForPermission = { role: "agency", hasEditPermission: false }
const agencyEditor: UserForPermission = { role: "agency", hasEditPermission: true }

const draftWithAgency: CollectionDraft = {
  status: "in-progress",
  config: {
    hasAgency: true,
    hasHandprint: false,
    hasEditionStudio: false,
    handprintIsDifferentLab: false,
  },
  participants: [],
  stepStatuses: {},
}

function runChecks(): void {
  assert(
    !canUserEditStep(agencyViewer, "photographer_selection", draftWithAgency),
    "Agency viewer cannot edit photographer_selection"
  )
  assert(
    canUserViewStepUrlHistory(agencyViewer, "photographer_selection", draftWithAgency),
    "Agency viewer can see photographer_selection URL history"
  )
  assert(
    canUserEditStep(agencyEditor, "photographer_selection", draftWithAgency),
    "Agency editor can edit photographer_selection"
  )
  assert(
    canUserViewStepUrlHistory(agencyEditor, "photographer_selection", draftWithAgency),
    "Agency editor can see photographer_selection URL history"
  )
  assert(
    !canUserViewStepUrlHistory(agencyViewer, "low_res_scanning", draftWithAgency),
    "Agency viewer cannot see low_res_scanning URL history"
  )
  assert(
    canUserViewStepUrlHistory(agencyViewer, "handprint_high_res", draftWithAgency),
    "Agency viewer can see digital handprint_high_res URL history"
  )
  assert(
    canUserViewStepUrlHistory(agencyViewer, "photographer_last_check", draftWithAgency),
    "Agency viewer can see photographer_last_check URL history"
  )
  assert(
    canUserViewStepUrlHistory(agencyViewer, "client_selection", draftWithAgency),
    "Agency viewer can see client_selection URL history"
  )
  assert(
    !canUserViewStepUrlHistory(agencyViewer, "client_selection", {
      ...draftWithAgency,
      config: { ...draftWithAgency.config, hasAgency: false },
    }),
    "Agency viewer cannot see client_selection when collection has no agency"
  )

  console.log("agency-url-history-visibility-check: all passed")
}

runChecks()
