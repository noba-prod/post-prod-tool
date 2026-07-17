import type { DropoffAdditionalShipment } from "./types"

/** Normalize provider/tracking for dedupe comparisons. */
export function dropoffShipmentIdentityKey(
  shipment: Pick<DropoffAdditionalShipment, "provider" | "tracking">
): string | null {
  const provider = (shipment.provider ?? "").replace(/^@/, "").trim().toLowerCase()
  const tracking = (shipment.tracking ?? "").trim()
  if (!provider && !tracking) return null
  return `${provider}|${tracking}`
}

export function hasDropoffShipmentData(
  shipment: Pick<DropoffAdditionalShipment, "provider" | "tracking">
): boolean {
  return dropoffShipmentIdentityKey(shipment) !== null
}

/** Remove duplicate supplemental rows (same provider + tracking). */
export function dedupeDropoffAdditionalShipments(
  shipments: DropoffAdditionalShipment[]
): DropoffAdditionalShipment[] {
  const out: DropoffAdditionalShipment[] = []
  const seen = new Set<string>()
  for (const shipment of shipments) {
    const key = dropoffShipmentIdentityKey(shipment)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(shipment)
  }
  return out
}

/** Drop supplemental rows that duplicate the primary shipment. */
export function stripPrimaryFromDropoffAdditionalShipments(
  primary: Pick<DropoffAdditionalShipment, "provider" | "tracking">,
  additional: DropoffAdditionalShipment[]
): DropoffAdditionalShipment[] {
  const primaryKey = dropoffShipmentIdentityKey(primary)
  if (!primaryKey) return dedupeDropoffAdditionalShipments(additional)
  return dedupeDropoffAdditionalShipments(additional).filter(
    (s) => dropoffShipmentIdentityKey(s) !== primaryKey
  )
}

export type DropoffShipmentsForDisplayInput = {
  primaryProvider?: string
  primaryTracking?: string
  primaryManagingShipping?: string
  primaryRolls?: number
  additionalShipments?: DropoffAdditionalShipment[]
}

/**
 * Cards shown in the Negatives drop-off step.
 * Primary (dropoff_shipping_*) is the confirmed shipment at pickup.
 * Additional rows are supplemental negatives added after pickup — deduped and
 * never repeated when they match the primary.
 */
export function getDropoffShipmentsForDisplay(
  input: DropoffShipmentsForDisplayInput
): DropoffAdditionalShipment[] {
  const primary: DropoffAdditionalShipment = {
    managingShipping: input.primaryManagingShipping,
    provider: input.primaryProvider,
    tracking: input.primaryTracking,
    rolls: input.primaryRolls,
  }

  const primaryKey = dropoffShipmentIdentityKey(primary)
  const supplemental = stripPrimaryFromDropoffAdditionalShipments(
    primary,
    input.additionalShipments ?? []
  )

  if (!primaryKey) return supplemental
  if (supplemental.length === 0) return [primary]

  return [primary, ...supplemental]
}

export function isDuplicateDropoffShipment(
  candidate: DropoffAdditionalShipment,
  existing: DropoffAdditionalShipment[]
): boolean {
  const key = dropoffShipmentIdentityKey(candidate)
  if (!key) return false
  return existing.some((s) => dropoffShipmentIdentityKey(s) === key)
}
