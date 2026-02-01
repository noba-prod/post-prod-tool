/**
 * Shared location data: countries, cities by country, and phone prefixes.
 * Uses country-state-city for a single source of truth.
 */

import { Country, City } from "country-state-city"

const allCountries = Country.getAllCountries()

/** All country names, sorted alphabetically. */
export const COUNTRY_NAMES: string[] = allCountries
  .map((c) => c.name)
  .filter(Boolean)
  .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))

/** Map country name to ISO code for city lookup. */
const countryNameToIsoCode = new Map<string, string>(
  allCountries.map((c) => [c.name, c.isoCode])
)

/**
 * Returns city names for a given country name.
 * Uses isoCode from country-state-city; returns [] if country is unknown or has no cities.
 */
export function getCitiesByCountryName(countryName: string): string[] {
  const isoCode = countryNameToIsoCode.get(countryName)
  if (!isoCode) return []
  const cities = City.getCitiesOfCountry(isoCode)
  if (!cities?.length) return []
  return cities.map((c) => c.name).filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
}

export interface PhonePrefix {
  code: string
  country: string
}

/** Phone prefixes with country name: one per country (e.g. +34 Spain). */
export const PHONE_PREFIXES: PhonePrefix[] = allCountries
  .filter((c) => c.phonecode?.trim())
  .map((c) => ({
    code: c.phonecode.startsWith("+") ? c.phonecode : `+${c.phonecode}`,
    country: c.name,
  }))
  .sort((a, b) => a.country.localeCompare(b.country, undefined, { sensitivity: "base" }))
