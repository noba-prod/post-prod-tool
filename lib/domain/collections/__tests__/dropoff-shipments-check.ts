import {
  dedupeDropoffAdditionalShipments,
  getDropoffShipmentsForDisplay,
  isDuplicateDropoffShipment,
  stripPrimaryFromDropoffAdditionalShipments,
} from "../dropoff-shipments"

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

// Confirmed primary with no supplemental rows
const displayPrimaryOnly = getDropoffShipmentsForDisplay({
  primaryProvider: "ups",
  primaryTracking: "654321",
  additionalShipments: [],
})
assert(displayPrimaryOnly.length === 1, "expected only the primary confirmed shipment")
assert(displayPrimaryOnly[0].provider === "ups", "expected UPS primary shipment")

// Stray supplemental rows still render when they differ from primary (data should be cleaned on write)
const displayWithStray = getDropoffShipmentsForDisplay({
  primaryProvider: "ups",
  primaryTracking: "654321",
  additionalShipments: [{ provider: "fedex", tracking: "123456" }],
})
assert(displayWithStray.length === 2, "expected primary plus stray supplemental until cleaned")

// Primary + unique supplemental → both cards
const displayMixed = getDropoffShipmentsForDisplay({
  primaryProvider: "ups",
  primaryTracking: "654321",
  additionalShipments: [{ provider: "fedex", tracking: "999999" }],
})
assert(displayMixed.length === 2, "expected primary and supplemental cards")

// Dedupe supplemental rows
assert(
  dedupeDropoffAdditionalShipments([
    { provider: "fedex", tracking: "1" },
    { provider: "fedex", tracking: "1" },
  ]).length === 1,
  "expected duplicate supplemental rows to collapse"
)

// Strip primary from supplemental list
assert(
  stripPrimaryFromDropoffAdditionalShipments(
    { provider: "ups", tracking: "654321" },
    [
      { provider: "ups", tracking: "654321" },
      { provider: "fedex", tracking: "999999" },
    ]
  ).length === 1,
  "expected primary duplicate to be removed from supplemental list"
)

assert(
  isDuplicateDropoffShipment(
    { provider: "@FedEx", tracking: "123456" },
    [{ provider: "fedex", tracking: "123456" }]
  ),
  "expected duplicate detection to ignore provider @ prefix and case"
)

console.log("dropoff-shipments-check: ok")
