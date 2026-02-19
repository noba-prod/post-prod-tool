import type { Organization, OrganizationType, Profile } from "@/lib/supabase/database.types"
import type { Entity, EntityType, Role, User } from "@/lib/types"

const organizationTypeToEntityType: Record<OrganizationType, EntityType> = {
  noba: "noba",
  client: "client",
  photography_agency: "agency",
  self_photographer: "self-photographer",
  lab_low_res_scan: "photo-lab",
  retouch_studio: "edition-studio",
  hand_print_lab: "hand-print-lab",
}

function combinePhone(prefix: string | null, phone: string | null): string | undefined {
  if (phone && prefix) {
    return `${prefix} ${phone}`.trim()
  }
  if (phone) {
    return phone
  }
  if (prefix) {
    return prefix
  }
  return undefined
}

function resolveRole(role: Profile["role"]): Role {
  return role || "viewer"
}

export function mapOrganizationTypeToEntityType(type: OrganizationType): EntityType {
  return organizationTypeToEntityType[type]
}

export function mapOrganizationToEntity(org: Organization): Entity {
  const hasLocation =
    org.street_address || org.zip_code || org.city || org.country

  return {
    id: org.id,
    type: mapOrganizationTypeToEntityType(org.type),
    name: org.name,
    email: org.email || undefined,
    phoneNumber: combinePhone(org.prefix, org.phone),
    profilePictureUrl: org.profile_picture_url || undefined,
    notes: org.notes || undefined,
    location: hasLocation
      ? {
          streetAddress: org.street_address || "",
          zipCode: org.zip_code || "",
          city: org.city || "",
          country: org.country || "",
        }
      : undefined,
    updatedAt: org.updated_at ? new Date(org.updated_at) : undefined,
  }
}

export function mapProfileToUser(profile: Profile): User {
  return {
    id: profile.id,
    firstName: profile.first_name || "",
    lastName: profile.last_name || undefined,
    email: profile.email,
    phoneNumber: combinePhone(profile.prefix, profile.phone) || "",
    entityId: profile.organization_id || "",
    role: resolveRole(profile.role),
    profilePictureUrl: profile.image || undefined,
    notes: undefined,
  }
}

export function mapProfilesToUsers(profiles: Profile[]): User[] {
  return profiles.map(mapProfileToUser)
}
