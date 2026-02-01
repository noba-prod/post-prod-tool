/**
 * Recipient Resolver
 * 
 * Resolves notification recipient types (Producer, Lab, Client, etc.) to actual users
 * based on their collection membership and organization assignments.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import type { RecipientType } from "./notification-templates"

export interface ResolvedRecipient {
  userId: string
  email: string
  firstName: string | null
  lastName: string | null
}

interface CollectionWithAssignments {
  id: string
  client_id: string
  photographer_id: string | null
  lab_low_res_id: string | null
  edition_studio_id: string | null
  hand_print_lab_id: string | null
}

/**
 * Resolves a list of recipient types to actual users for a given collection.
 * 
 * Recipient mapping:
 * - producer: collection_members with role='producer'
 * - lab: collection_members with role='lab_technician' + all users from lab_low_res_id org
 * - photographer: collection_members with role='photographer'
 * - client: collection_members with role='manager' + all users from client_id org
 * - hand_print_lab: all users from hand_print_lab_id org
 * - edition_studio: all users from edition_studio_id org
 */
export async function resolveRecipients(
  supabase: SupabaseClient<Database>,
  collectionId: string,
  recipientTypes: RecipientType[]
): Promise<ResolvedRecipient[]> {
  if (recipientTypes.length === 0) {
    return []
  }

  // Get collection with organization assignments
  const { data: collection, error: collectionError } = await supabase
    .from("collections")
    .select("id, client_id, photographer_id, lab_low_res_id, edition_studio_id, hand_print_lab_id")
    .eq("id", collectionId)
    .single()

  if (collectionError || !collection) {
    console.error("[resolveRecipients] Collection not found:", collectionId, collectionError)
    return []
  }

  const userIds = new Set<string>()
  const orgIds = new Set<string>()

  // Collect member roles and org IDs to query
  const memberRoles: string[] = []

  for (const type of recipientTypes) {
    switch (type) {
      case "producer":
        memberRoles.push("producer")
        break
      
      case "lab":
        memberRoles.push("lab_technician")
        if (collection.lab_low_res_id) {
          orgIds.add(collection.lab_low_res_id)
        }
        break
      
      case "photographer":
        memberRoles.push("photographer")
        break
      
      case "client":
        memberRoles.push("manager")
        if (collection.client_id) {
          orgIds.add(collection.client_id)
        }
        break
      
      case "hand_print_lab":
        if (collection.hand_print_lab_id) {
          orgIds.add(collection.hand_print_lab_id)
        }
        break
      
      case "edition_studio":
        if (collection.edition_studio_id) {
          orgIds.add(collection.edition_studio_id)
        }
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
      for (const member of members) {
        userIds.add(member.user_id)
      }
    }
  }

  // Query users from assigned organizations
  if (orgIds.size > 0) {
    const { data: orgUsers, error: orgUsersError } = await supabase
      .from("profiles")
      .select("id")
      .in("organization_id", Array.from(orgIds))

    if (orgUsersError) {
      console.error("[resolveRecipients] Error fetching org users:", orgUsersError)
    } else if (orgUsers) {
      for (const user of orgUsers) {
        userIds.add(user.id)
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

  return (users || [])
    .filter((u) => u.email) // Only users with email addresses
    .map((u) => ({
      userId: u.id,
      email: u.email!,
      firstName: u.first_name,
      lastName: u.last_name,
    }))
}

/**
 * Get collection details for notification context (name, reference, etc.)
 */
export async function getCollectionContext(
  supabase: SupabaseClient<Database>,
  collectionId: string
): Promise<{ name: string; reference: string | null } | null> {
  const { data, error } = await supabase
    .from("collections")
    .select("name, reference")
    .eq("id", collectionId)
    .single()

  if (error || !data) {
    console.error("[getCollectionContext] Error:", error)
    return null
  }

  return data
}

/**
 * Build the CTA URL from a template by replacing placeholders
 */
export function buildCtaUrl(template: string | null, collectionId: string): string | null {
  if (!template) return null
  return template.replace("{collectionId}", collectionId)
}

/**
 * Replace [ID] placeholder in notification title with collection reference or name
 */
export function formatNotificationTitle(
  title: string,
  collectionName: string,
  collectionReference: string | null
): string {
  const identifier = collectionReference || collectionName
  return title.replace("[ID]", identifier)
}
