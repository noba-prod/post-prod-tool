/**
 * GET /api/collections/[id]/participants-display
 * Returns the full list of participants (Noba team + Main players) for the Participants modal.
 * Only callable by users who can view the collection (RLS). Data is resolved server-side with
 * admin so all participants are visible to everyone who can see the collection.
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { SupabaseCollectionsRepository } from "@/lib/infra/collections/supabase-collections.repository"
import type { Profile, Organization } from "@/lib/supabase/database.types"

type ParticipantsModalIndividual = {
  name: string
  email?: string
  phone?: string
  imageUrl?: string
  initials?: string
  roleLabel?: string
}

type ParticipantsModalEntity = {
  entityName: string
  managerName?: string
  teamMembersCount?: number
  imageUrl?: string
  entityTypeLabel?: string
}

type EntityDisplayTarget = {
  entityId: string
  entityTypeLabel: string
  memberRoles: string[]
}

function combinePhone(prefix: string | null, phone: string | null): string | undefined {
  if (phone && prefix) return `${prefix} ${phone}`.trim()
  if (phone) return phone
  if (prefix) return prefix
  return undefined
}

function profileToIndividual(
  profile: Profile,
  roleLabel: string
): ParticipantsModalIndividual {
  const firstName = profile.first_name ?? ""
  const lastName = profile.last_name ?? ""
  const email = profile.email ?? ""
  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || email || "—"
  const initials = name !== "—" ? name.slice(0, 2).toUpperCase().replace(/\s/g, "") : undefined
  const phone = combinePhone(profile.prefix, profile.phone)
  return {
    name,
    email: email || undefined,
    phone: phone || undefined,
    imageUrl: profile.image || undefined,
    initials: initials || undefined,
    roleLabel,
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1) Verify user can view the collection (RLS check)
    const userRepo = new SupabaseCollectionsRepository(supabase)
    const canView = await userRepo.getById(id)
    if (!canView) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 })
    }

    // 2) Fetch full collection + members with admin (avoid RLS filtering members for non-noba users)
    const admin = createAdminClient()
    const adminRepo = new SupabaseCollectionsRepository(admin)
    const collection = await adminRepo.getById(id)
    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 })
    }

    const config = collection.config
    const participants = collection.participants
    const producer = participants.find((p) => p.role === "producer")
    const nobaUserIds = config.nobaUserIds ?? producer?.userIds ?? []
    const photographer = participants.find((p) => p.role === "photographer")
    const agencyParticipant = participants.find((p) => p.role === "agency")
    const agencyUserIds = new Set(agencyParticipant?.userIds ?? [])
    const photographerUserIds = (photographer?.userIds ?? []).filter(
      (uid) => !agencyUserIds.has(uid)
    )

    const clientId = config.clientEntityId?.trim() ? config.clientEntityId : undefined
    const agencyId =
      config.hasAgency && agencyParticipant?.entityId ? agencyParticipant.entityId : undefined
    const labParticipant = participants.find((p) => p.role === "photo_lab")
    const handprintLabParticipant = participants.find((p) => p.role === "handprint_lab")
    const retouchStudioParticipant = participants.find((p) => p.role === "retouch_studio")
    const isSharedPhotoAndHandprintLab =
      config.hasHandprint === true && config.handprintIsDifferentLab === false

    const entityDisplayTargets: EntityDisplayTarget[] = []
    if (clientId) {
      entityDisplayTargets.push({
        entityId: clientId,
        entityTypeLabel: "Client",
        memberRoles: ["client"],
      })
    }
    if (agencyId) {
      entityDisplayTargets.push({
        entityId: agencyId,
        entityTypeLabel: "Agency",
        memberRoles: ["agency"],
      })
    }
    if (labParticipant?.entityId) {
      entityDisplayTargets.push({
        entityId: labParticipant.entityId,
        entityTypeLabel: isSharedPhotoAndHandprintLab
          ? "Photo lab & Handprint"
          : "Photo Lab",
        memberRoles: isSharedPhotoAndHandprintLab
          ? ["handprint_lab", "photo_lab"]
          : ["photo_lab"],
      })
    }
    if (!isSharedPhotoAndHandprintLab && handprintLabParticipant?.entityId) {
      entityDisplayTargets.push({
        entityId: handprintLabParticipant.entityId,
        entityTypeLabel: "Hand Print Lab",
        memberRoles: ["handprint_lab"],
      })
    }
    if (retouchStudioParticipant?.entityId) {
      entityDisplayTargets.push({
        entityId: retouchStudioParticipant.entityId,
        entityTypeLabel: "Retouch studio",
        memberRoles: ["retouch_studio"],
      })
    }

    const ownerUserId = config.ownerUserId?.trim()

    // Resolve Noba team (profiles by nobaUserIds)
    const nobaTeam: ParticipantsModalIndividual[] = []
    if (nobaUserIds.length > 0) {
      const { data: nobaProfiles } = await admin
        .from("profiles")
        .select("*")
        .in("id", nobaUserIds)
      const profilesList = (nobaProfiles ?? []) as Profile[]
      for (const p of profilesList) {
        const uid = p.id?.trim() ?? ""
        const isOwner = !!ownerUserId && uid === ownerUserId
        nobaTeam.push(profileToIndividual(p, isOwner ? "producer" : "collaborator"))
      }
    }

    // Resolve photographer individuals (exclude agency team members from "photographer" display)
    let agencyTeamMemberIds = new Set<string>()
    if (agencyId) {
      const { data: agencyProfiles } = await admin
        .from("profiles")
        .select("id")
        .eq("organization_id", agencyId)
      agencyTeamMemberIds = new Set(
        (agencyProfiles ?? []).map((r: { id: string }) => r.id)
      )
    }

    const mainIndividuals: ParticipantsModalIndividual[] = []
    if (photographerUserIds.length > 0) {
      const { data: photoProfiles } = await admin
        .from("profiles")
        .select("*")
        .in("id", photographerUserIds)
      const photoList = (photoProfiles ?? []) as Profile[]
      for (const p of photoList) {
        if (agencyTeamMemberIds.has(p.id ?? "")) continue
        mainIndividuals.push(profileToIndividual(p, "photographer"))
      }
    }

    const participantRoles = Array.from(
      new Set(entityDisplayTargets.flatMap((target) => target.memberRoles))
    )
    const { data: participantMembers } = participantRoles.length > 0
      ? await admin
        .from("collection_members")
        .select("role, user_id, can_edit")
        .eq("collection_id", id)
        .in("role", participantRoles)
      : { data: [] as Array<{ role: string; user_id: string; can_edit: boolean | null }> }

    const membersByRole = new Map<string, Array<{ user_id: string; can_edit: boolean | null }>>()
    for (const row of (participantMembers ?? []) as Array<{ role: string; user_id: string; can_edit: boolean | null }>) {
      const existing = membersByRole.get(row.role) ?? []
      existing.push({ user_id: row.user_id, can_edit: row.can_edit })
      membersByRole.set(row.role, existing)
    }

    const participantUserIds = Array.from(
      new Set(
        (participantMembers ?? []).map((row: { user_id: string }) => row.user_id).filter(Boolean)
      )
    )
    const { data: participantProfiles } = participantUserIds.length
      ? await admin
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", participantUserIds)
      : { data: [] as Array<{ id: string; first_name: string | null; last_name: string | null }> }

    const participantProfileById = new Map<string, { first_name: string | null; last_name: string | null }>()
    for (const p of (participantProfiles ?? []) as Array<{ id: string; first_name: string | null; last_name: string | null }>) {
      participantProfileById.set(p.id, { first_name: p.first_name, last_name: p.last_name })
    }

    // Resolve entities (client, agency, lab, handprint, retouch)
    const entities: ParticipantsModalEntity[] = []
    for (const target of entityDisplayTargets) {
      const eid = target.entityId
      const { data: org, error: orgErr } = await admin
        .from("organizations")
        .select("*")
        .eq("id", eid)
        .maybeSingle()
      if (orgErr || !org) continue
      const organization = org as Organization

      // Responsible + total members use invited collection members from display role(s).
      // In shared Photo/Handprint flows we prioritize handprint_lab ownership (step 7),
      // then fallback to photo_lab if needed.
      let managerName: string | undefined
      let teamCount = 0
      for (const dbRole of target.memberRoles) {
        const roleMembers = membersByRole.get(dbRole) ?? []
        const roleMemberIds = Array.from(new Set(roleMembers.map((m) => m.user_id).filter(Boolean)))
        if (roleMemberIds.length === 0) continue
        teamCount = roleMemberIds.length
        const editUserIds = Array.from(
          new Set(roleMembers.filter((m) => m.can_edit === true).map((m) => m.user_id).filter(Boolean))
        )
        if (editUserIds.length > 0) {
          const firstProfile = participantProfileById.get(editUserIds[0])
          const firstUserName = [firstProfile?.first_name, firstProfile?.last_name].filter(Boolean).join(" ").trim()
          managerName = editUserIds.length === 1
            ? (firstUserName || undefined)
            : (firstUserName ? `${firstUserName} + ${editUserIds.length - 1} more` : `${editUserIds.length - 1} more`)
        } else if (roleMemberIds.length > 0) {
          const firstProfile = participantProfileById.get(roleMemberIds[0])
          const fallbackName = [firstProfile?.first_name, firstProfile?.last_name].filter(Boolean).join(" ").trim()
          managerName = fallbackName || undefined
        }
        break
      }

      const imageUrl =
        organization.profile_picture_url && organization.profile_picture_url.trim() !== ""
          ? organization.profile_picture_url
          : undefined
      entities.push({
        entityName: organization.name,
        managerName: managerName ?? undefined,
        teamMembersCount: teamCount,
        imageUrl,
        entityTypeLabel: target.entityTypeLabel,
      })
    }

    // For CollectionHeading: photographer + client display names (visible to all collection viewers)
    const photographerName =
      mainIndividuals.length > 0 ? mainIndividuals[0].name : undefined
    const clientEntity = entities.find(
      (e) => (e.entityTypeLabel ?? "").toLowerCase() === "client"
    )
    const clientDisplayName = clientEntity?.entityName

    // Build userId → { name, entityName, entityImageUrl } map for all collection members
    const allMemberUserIds = new Set<string>()
    for (const uid of nobaUserIds) allMemberUserIds.add(uid)
    for (const uid of photographerUserIds) allMemberUserIds.add(uid)
    for (const uid of agencyParticipant?.userIds ?? []) allMemberUserIds.add(uid)
    for (const p of participants) {
      for (const uid of p.userIds ?? []) allMemberUserIds.add(uid)
    }
    const noteAuthorsByUserId: Record<string, { name: string; userImageUrl?: string; entityName?: string; entityImageUrl?: string }> = {}
    const allIds = Array.from(allMemberUserIds).filter(Boolean)
    if (allIds.length > 0) {
      const { data: allProfiles } = await admin
        .from("profiles")
        .select("id, first_name, last_name, organization_id, image")
        .in("id", allIds)
      const orgIds = new Set<string>()
      for (const p of (allProfiles ?? []) as Array<{ id: string; first_name?: string | null; last_name?: string | null; organization_id?: string | null }>) {
        if (p.organization_id) orgIds.add(p.organization_id)
      }
      const orgMap: Record<string, { name: string; imageUrl?: string }> = {}
      const orgIdArr = Array.from(orgIds).filter(Boolean)
      if (orgIdArr.length > 0) {
        const { data: orgs } = await admin
          .from("organizations")
          .select("id, name, profile_picture_url")
          .in("id", orgIdArr)
        for (const o of (orgs ?? []) as Array<{ id: string; name: string; profile_picture_url?: string | null }>) {
          orgMap[o.id] = { name: o.name, imageUrl: o.profile_picture_url?.trim() || undefined }
        }
      }
      for (const p of (allProfiles ?? []) as Array<{ id: string; first_name?: string | null; last_name?: string | null; organization_id?: string | null; image?: string | null }>) {
        const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim()
        if (!name) continue
        const org = p.organization_id ? orgMap[p.organization_id] : undefined
        noteAuthorsByUserId[p.id] = {
          name,
          userImageUrl: p.image?.trim() || undefined,
          entityName: org?.name,
          entityImageUrl: org?.imageUrl,
        }
      }
    }

    return NextResponse.json({
      nobaTeam,
      mainPlayersIndividuals: mainIndividuals,
      mainPlayersEntities: entities,
      photographerName,
      clientDisplayName,
      noteAuthorsByUserId,
    })
  } catch (err) {
    console.error("[GET /api/collections/[id]/participants-display]", err)
    return NextResponse.json(
      { error: "Failed to load participants" },
      { status: 500 }
    )
  }
}
