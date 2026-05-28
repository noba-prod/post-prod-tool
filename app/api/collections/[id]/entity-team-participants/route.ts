/**
 * POST /api/collections/[id]/entity-team-participants
 * Entity admins can add/remove/update edit permission for their team in a collection.
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createCollectionsServiceForServer } from "@/lib/services/collections/server"
import { createInvitationsForNewMembers } from "@/lib/invitations"
import {
  computeRemovedExternalMemberUserIds,
  fetchExternalMemberUserIds,
  isExternalCollectionMemberRole,
  sendAccessRevokedEmailsForRemovedMembers,
} from "@/lib/invitations/notify-removed-collection-members"
import { CollectionsServiceError } from "@/lib/services/collections"
import { checkInternalUserCollectionMutationScope } from "@/lib/services/collections/internal-scope-guard"
import {
  findParticipantsForEntity,
  isEntityTeamAdminProfile,
} from "@/lib/auth/entity-team-admin"
import { mapPlayerTypeToEntityType } from "@/lib/services/supabase-profile-service"
import type { CollectionParticipant } from "@/lib/domain/collections"
import type { CollectionMember, Profile, Player } from "@/lib/supabase/database.types"

type ActionBody = {
  action: "add" | "remove" | "setEditPermission"
  userId: string
  editPermission?: boolean
}

function cloneParticipants(participants: CollectionParticipant[]): CollectionParticipant[] {
  return participants.map((p) => ({
    ...p,
    userIds: [...(p.userIds ?? [])],
    editPermissionByUserId: { ...(p.editPermissionByUserId ?? {}) },
  }))
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: collectionId } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const scope = await checkInternalUserCollectionMutationScope(user.id, collectionId)
    if (!scope.canMutate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const admin = createAdminClient()
    const { data: profileRow } = await admin
      .from("profiles")
      .select("id, role, is_internal, player_id")
      .eq("id", user.id)
      .maybeSingle()
    const profile = profileRow as Pick<
      Profile,
      "id" | "role" | "is_internal" | "player_id"
    > | null

    if (!profile?.player_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: playerRow } = await admin
      .from("players")
      .select("id, name, type")
      .eq("id", profile.player_id)
      .maybeSingle()
    const player = playerRow as Pick<Player, "id" | "name" | "type"> | null
    if (!player) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 })
    }

    const entityType = mapPlayerTypeToEntityType(player.type)
    if (!isEntityTeamAdminProfile(profile, entityType)) {
      return NextResponse.json(
        { error: "Only entity administrators can manage team participants" },
        { status: 403 }
      )
    }

    const body = (await request.json().catch(() => null)) as ActionBody | null
    if (!body?.action || !body.userId?.trim()) {
      return NextResponse.json({ error: "action and userId are required" }, { status: 400 })
    }

    const targetUserId = body.userId.trim()
    const playerId = profile.player_id

    const { data: targetProfileRow } = await admin
      .from("profiles")
      .select("id, player_id")
      .eq("id", targetUserId)
      .maybeSingle()
    const targetProfile = targetProfileRow as Pick<Profile, "id" | "player_id"> | null

    if (!targetProfile || targetProfile.player_id !== playerId) {
      return NextResponse.json(
        { error: "User must belong to your team" },
        { status: 400 }
      )
    }

    const service = createCollectionsServiceForServer()
    const collection = await service.getCollectionById(collectionId)
    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 })
    }

    const entityParticipants = findParticipantsForEntity(collection.participants, playerId)
    if (entityParticipants.length === 0) {
      return NextResponse.json(
        { error: "Your entity is not a participant in this collection" },
        { status: 403 }
      )
    }

    const { data: oldMembersData } = await admin
      .from("collection_members")
      .select("user_id, role")
      .eq("collection_id", collectionId)
    const oldMembers = (oldMembersData ?? []) as Pick<
      CollectionMember,
      "user_id" | "role"
    >[]
    const oldUserIds = new Set(oldMembers.map((m) => m.user_id))

    const participants = cloneParticipants(collection.participants)

    const applyToEntityParticipants = (
      fn: (participant: CollectionParticipant) => void
    ) => {
      for (const ep of entityParticipants) {
        const idx = participants.findIndex((p) => p.role === ep.role)
        if (idx >= 0) fn(participants[idx])
      }
    }

    if (body.action === "add") {
      const alreadyInCollection = entityParticipants.some((ep) =>
        ep.userIds?.includes(targetUserId)
      )
      if (alreadyInCollection) {
        return NextResponse.json(
          { error: "User is already a participant in this collection" },
          { status: 409 }
        )
      }
      applyToEntityParticipants((participant) => {
        participant.userIds = [...(participant.userIds ?? []), targetUserId]
        participant.editPermissionByUserId = {
          ...(participant.editPermissionByUserId ?? {}),
          [targetUserId]: body.editPermission ?? false,
        }
      })
    } else if (body.action === "remove") {
      if (targetUserId === profile.id) {
        return NextResponse.json(
          { error: "You cannot remove yourself from the collection" },
          { status: 400 }
        )
      }
      applyToEntityParticipants((participant) => {
        participant.userIds = (participant.userIds ?? []).filter((id) => id !== targetUserId)
        const nextEdit = { ...(participant.editPermissionByUserId ?? {}) }
        delete nextEdit[targetUserId]
        participant.editPermissionByUserId = nextEdit
      })
    } else if (body.action === "setEditPermission") {
      if (typeof body.editPermission !== "boolean") {
        return NextResponse.json(
          { error: "editPermission boolean is required" },
          { status: 400 }
        )
      }
      const isMember = entityParticipants.some((ep) =>
        ep.userIds?.includes(targetUserId)
      )
      if (!isMember) {
        return NextResponse.json(
          { error: "User is not a participant in this collection" },
          { status: 404 }
        )
      }
      applyToEntityParticipants((participant) => {
        if (!(participant.userIds ?? []).includes(targetUserId)) return
        participant.editPermissionByUserId = {
          ...(participant.editPermissionByUserId ?? {}),
          [targetUserId]: body.editPermission!,
        }
      })
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    try {
      await service.updateCollection(collectionId, {
        participants,
      })
    } catch (err) {
      if (err instanceof CollectionsServiceError) {
        return NextResponse.json(
          { error: err.message, code: err.code },
          { status: err.code === "NOT_FOUND" ? 404 : 500 }
        )
      }
      throw err
    }

    const { data: newMembersData } = await admin
      .from("collection_members")
      .select("user_id, role")
      .eq("collection_id", collectionId)
    const newMembers = (newMembersData ?? []) as Pick<
      CollectionMember,
      "user_id" | "role"
    >[]

    let invitationsCreated = 0
    if (body.action === "add") {
      const membersToInvite = newMembers.filter(
        (m) => m.user_id === targetUserId && !oldUserIds.has(m.user_id)
      ) as Pick<CollectionMember, "user_id" | "role">[]
      if (membersToInvite.length > 0) {
        const inviteResult = await createInvitationsForNewMembers(
          collectionId,
          membersToInvite
        )
        invitationsCreated = inviteResult.created ?? 0
      }
    }

    let accessRevokedEmailsSent = 0
    if (body.action === "remove") {
      const oldExternalUserIds = oldMembers
        .filter((m) => isExternalCollectionMemberRole(m.role))
        .map((m) => m.user_id)
      const newExternalUserIds = await fetchExternalMemberUserIds(collectionId, admin)
      const removedExternalUserIds = computeRemovedExternalMemberUserIds(
        oldExternalUserIds,
        newExternalUserIds
      )
      if (removedExternalUserIds.includes(targetUserId)) {
        try {
          const revokedResult = await sendAccessRevokedEmailsForRemovedMembers(
            collectionId,
            [targetUserId]
          )
          accessRevokedEmailsSent = revokedResult.sent
        } catch (revokedErr) {
          console.warn(
            "[POST entity-team-participants] Access-revoked email failed:",
            revokedErr
          )
        }
      }
    }

    return NextResponse.json({
      success: true,
      invitationsCreated,
      accessRevokedEmailsSent,
    })
  } catch (err) {
    console.error("[POST /api/collections/[id]/entity-team-participants]", err)
    return NextResponse.json(
      { error: "Failed to update team participants" },
      { status: 500 }
    )
  }
}
