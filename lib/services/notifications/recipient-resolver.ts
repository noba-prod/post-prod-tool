/**
 * Recipient Resolver
 * 
 * Resolves notification recipient types (Producer, Lab, Client, etc.) to actual users
 * based on their collection membership and organization assignments.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import type { RecipientType } from "./notification-templates"

/** Subset of `collections` row used here; explicit Pick avoids Supabase `.select()` inferring `never`. */
type CollectionAssignmentFields = Pick<
  Database["public"]["Tables"]["collections"]["Row"],
  "id" | "client_id" | "photographer_id" | "photo_lab_id" | "retouch_studio_id" | "handprint_lab_id"
>

export interface ResolvedRecipient {
  userId: string
  email: string
  firstName: string | null
  lastName: string | null
}

/**
 * Resolves a list of recipient types to actual users for a given collection.
 * 
 * Recipient mapping:
 * - producer: collection_members with role='noba'
 * - photo_lab: collection_members with role='photo_lab'
 * - photographer: collection_members with role='photographer'
 * - client: collection_members with role='client'
 * - handprint_lab: collection_members with role='handprint_lab' (or photo_lab when shared)
 * - retouch_studio: collection_members with role='retouch_studio'
 */
export async function resolveRecipients(
  supabase: SupabaseClient<Database>,
  collectionId: string,
  recipientTypes: RecipientType[]
): Promise<ResolvedRecipient[]> {
  if (recipientTypes.length === 0) {
    return []
  }

  // Get collection assignments needed for role-specific recipient resolution.
  const { data: rawCollection, error: collectionError } = await supabase
    .from("collections")
    .select("id, client_id, photographer_id, photo_lab_id, retouch_studio_id, handprint_lab_id")
    .eq("id", collectionId)
    .single()

  const collectionData = rawCollection as CollectionAssignmentFields | null

  if (collectionError || !collectionData) {
    console.error("[resolveRecipients] Collection not found:", collectionId, collectionError)
    return []
  }

  const userIds = new Set<string>()

  // Collect member roles and org IDs to query
  const memberRoles: string[] = []
  const sameHandprintAndPhotoLab =
    Boolean(collectionData.handprint_lab_id) &&
    Boolean(collectionData.photo_lab_id) &&
    collectionData.handprint_lab_id === collectionData.photo_lab_id

  for (const type of recipientTypes) {
    switch (type) {
      case "producer":
        memberRoles.push("noba")
        break
      
      case "photo_lab":
        memberRoles.push("photo_lab")
        break
      
      case "photographer":
        memberRoles.push("photographer")
        break
      
      case "client":
        memberRoles.push("client")
        break
      
      case "handprint_lab":
        if (collectionData.handprint_lab_id) {
          memberRoles.push("handprint_lab")
          // When handprint uses the same organization as photo lab, notifications
          // must reach photo_lab members too (they are the effective owners in UI).
          if (sameHandprintAndPhotoLab) {
            memberRoles.push("photo_lab")
          }
        } else if (collectionData.photo_lab_id) {
          memberRoles.push("photo_lab")
        }
        break
      
      case "retouch_studio":
        memberRoles.push("retouch_studio")
        break
    }
  }

  // Query collection members
  if (memberRoles.length > 0) {
    const { data: members, error: membersError } = await supabase
      .from("collection_members")
      .select("user_id")
      .eq("collection_id", collectionId)
      .in("role", memberRoles)

    if (membersError) {
      console.error("[resolveRecipients] Error fetching collection members:", membersError)
    } else if (members) {
      const memberList = members as { user_id: string }[]
      for (const member of memberList) {
        userIds.add(member.user_id)
      }
    }
  }

  if (userIds.size === 0) {
    return []
  }

  // Fetch user details
  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .in("id", Array.from(userIds))

  if (usersError) {
    console.error("[resolveRecipients] Error fetching user details:", usersError)
    return []
  }

  type ProfileRow = { id: string; email: string; first_name: string | null; last_name: string | null }
  return ((users || []) as ProfileRow[])
    .filter((u) => u.email) // Only users with email addresses
    .map((u) => ({
      userId: u.id,
      email: u.email!,
      firstName: u.first_name,
      lastName: u.last_name,
    }))
}

export interface CollectionContext {
  name: string
  reference: string | null
  clientName: string | null
  photographerName: string | null
  photoLabName: string | null
  retouchStudioName: string | null
  handprintLabName: string | null
  shootingStartDate: string | null
  shootingEndDate: string | null
  shootingCity: string | null
  shootingCountry: string | null
}

/**
 * Get collection details for notification context (name, reference, client, photographer, dates, location)
 */
export async function getCollectionContext(
  supabase: SupabaseClient<Database>,
  collectionId: string
): Promise<CollectionContext | null> {
  const { data, error } = await supabase
    .from("collections")
    .select("name, reference, client_id, photographer_id, photo_lab_id, retouch_studio_id, handprint_lab_id, shooting_start_date, shooting_end_date, shooting_city, shooting_country")
    .eq("id", collectionId)
    .single()

  if (error || !data) {
    console.error("[getCollectionContext] Error:", error)
    return null
  }

  const col = data as {
    name: string
    reference: string | null
    client_id: string
    photographer_id: string | null
    photo_lab_id: string | null
    retouch_studio_id: string | null
    handprint_lab_id: string | null
    shooting_start_date: string | null
    shooting_end_date: string | null
    shooting_city: string | null
    shooting_country: string | null
  }

  const orgIds = [col.client_id, col.photographer_id, col.photo_lab_id, col.retouch_studio_id, col.handprint_lab_id].filter(Boolean) as string[]
  const orgMap = new Map<string, string>()
  if (orgIds.length > 0) {
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name")
      .in("id", orgIds)
    for (const org of (orgs || []) as { id: string; name: string }[]) {
      orgMap.set(org.id, org.name)
    }
  }

  return {
    name: col.name,
    reference: col.reference,
    clientName: col.client_id ? (orgMap.get(col.client_id) ?? null) : null,
    photographerName: col.photographer_id ? (orgMap.get(col.photographer_id) ?? null) : null,
    photoLabName: col.photo_lab_id ? (orgMap.get(col.photo_lab_id) ?? null) : null,
    retouchStudioName: col.retouch_studio_id ? (orgMap.get(col.retouch_studio_id) ?? null) : null,
    handprintLabName: col.handprint_lab_id ? (orgMap.get(col.handprint_lab_id) ?? null) : null,
    shootingStartDate: col.shooting_start_date,
    shootingEndDate: col.shooting_end_date,
    shootingCity: col.shooting_city,
    shootingCountry: col.shooting_country,
  }
}

/**
 * Build the CTA URL from a template by replacing placeholders
 */
export function buildCtaUrl(template: string | null, collectionId: string): string | null {
  if (!template) return null
  return template.replace("{collectionId}", collectionId)
}

/**
 * Replace placeholders in notification title:
 * - [ID]: collection reference or name
 * - [collectionName]: collection name
 */
export function formatNotificationTitle(
  title: string,
  collectionName: string,
  collectionReference: string | null
): string {
  const identifier = collectionReference || collectionName
  return title.replace("[ID]", identifier).replace("[collectionName]", collectionName)
}
