import type { CollectionConfig } from "./types"

export type CollectionShootingType = "digital" | "handprint_hp" | "handprint_hr"

export const COLLECTION_TYPE_FILTER_OPTIONS: Array<{
  value: CollectionShootingType
  label: string
}> = [
  { value: "handprint_hp", label: "Analog (HP)" },
  { value: "handprint_hr", label: "Analog (HR)" },
  { value: "digital", label: "Digital" },
]

export function getCollectionShootingType(
  config: Pick<CollectionConfig, "hasHandprint" | "handprintVariant">
): CollectionShootingType {
  if (!config.hasHandprint) return "digital"
  return config.handprintVariant === "hr" ? "handprint_hr" : "handprint_hp"
}

export function collectionMatchesShootingTypeFilter(
  config: Pick<CollectionConfig, "hasHandprint" | "handprintVariant">,
  filterValue: CollectionShootingType
): boolean {
  return getCollectionShootingType(config) === filterValue
}
