"use client"

import * as React from "react"
import { CreationTemplate } from "@/components/custom/templates/creation-template"
import { EntityBasicInformationForm } from "@/components/custom/entity-basic-information-form"
import { UserCreationForm, type UserFormData } from "@/components/custom/user-creation-form"
import { Layout, LayoutSection } from "@/components/custom/layout"
import { FilterBar } from "@/components/custom/filter-bar"
import { Tables } from "@/components/custom/tables"

// Hook and type imports
import { useEntityCreation } from "@/lib/hooks"
import { entityRequiresLocation, roleToLabel } from "@/lib/types"

export default function AgencyCreationPage() {
  // ==========================================================================
  // HOOK - All business logic extracted to shared hook
  // ==========================================================================

  const creation = useEntityCreation("agency")

  // ==========================================================================
  // SIDEBAR ITEM CLICK HANDLER
  // ==========================================================================

  const handleSidebarItemClick = React.useCallback(
    (id: string) => {
      if (id === "step-1") {
        creation.goToStep("basic")
      } else if (id === "step-2") {
        creation.goToStep("team")
      }
    },
    [creation.goToStep]
  )

  // ==========================================================================
  // TEAM MEMBERS CONTENT (UI-only, no business logic)
  // ==========================================================================

  const teamMembersContent = React.useMemo(
    () => (
      <Layout padding="none" showSeparators={false}>
        {/* First row: Filter Bar */}
        <LayoutSection>
          <FilterBar
            variant="members"
            searchPlaceholder="Search members..."
            onActionClick={creation.openNewMemberModal}
          />
        </LayoutSection>

        {/* Second row: Team Members Table */}
        <LayoutSection>
          {creation.teamMembers.length > 0 ? (
            <Tables
              variant="team-members"
              teamMembersData={creation.teamMembers.map((member) => ({
                id: member.id,
                name: `${member.firstName}${member.lastName ? ` ${member.lastName}` : ""}`.trim(),
                email: member.email,
                phone: member.phoneNumber,
                role: roleToLabel(member.role) as "Admin" | "Editor" | "Viewer",
                collections: 0,
              }))}
              onEditUser={creation.openEditUserModal}
              onDelete={(id) => {
                console.log("Delete member:", id)
              }}
            />
          ) : (
            <div className="w-full py-12 text-center text-muted-foreground">
              No team members yet
            </div>
          )}
        </LayoutSection>
      </Layout>
    ),
    [creation.teamMembers, creation.openNewMemberModal, creation.openEditUserModal]
  )

  // ==========================================================================
  // ADMIN SUBMIT HANDLER (adapts UserFormData to hook API)
  // ==========================================================================

  const handleAdminUserSubmit = React.useCallback(
    (userData: UserFormData) => {
      creation.handleAdminSubmit({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        countryCode: userData.countryCode,
        role: userData.role,
      })
    },
    [creation.handleAdminSubmit]
  )

  // ==========================================================================
  // RENDER (declarative - just wires values to components)
  // ==========================================================================

  return (
    <>
      <CreationTemplate
        title="Create new agency"
        breadcrumbs={[
          { label: "Players", href: "/organizations" },
          { label: "Create new agency" },
        ]}
        sidebarItems={[
          { id: "step-1", label: "Basic information" },
          { id: "step-2", label: "Team members" },
        ]}
        activeSidebarItem={creation.activeSidebarItem}
        onSidebarItemClick={handleSidebarItemClick}
        blocks={[
          {
            id: "basic-information",
            title: "Basic information",
            subtitle: "Please provide all necessary details for this entity to ensure completeness.",
            variant: creation.step1Variant,
            content: (
              <EntityBasicInformationForm
                key={`${creation.entityId || "new"}-${creation.currentStep}`}
                entityType={creation.entityType}
                showLocation={entityRequiresLocation(creation.entityType)}
                initialData={creation.basicFormData ?? undefined}
                existingProfilePictureUrl={creation.entity?.profilePictureUrl}
                validateNameUniqueness={creation.entityId === null}
                excludeOrganizationId={creation.entityId ?? undefined}
                onDataChange={creation.handleFormDataChange}
                onValidationChange={creation.handleValidationChange}
              />
            ),
            primaryLabel: creation.step1PrimaryLabel,
            onPrimaryClick: creation.handleStep1Primary,
            primaryDisabled: !creation.isBasicInfoValid || creation.isUpdating,
            onEdit: creation.handleEditBasicInfo,
          },
          {
            id: "team-members",
            title: "Team members",
            subtitle: "Add team members to this entity",
            variant: creation.step2Variant,
            content: teamMembersContent,
          },
        ]}
      />

      {/* New Admin User Modal - only shown in create mode */}
      <UserCreationForm
        open={creation.isAdminModalOpen}
        onOpenChange={(open) => {
          if (!open) creation.closeAdminModal()
        }}
        entity={
          creation.basicFormData
            ? {
                type: creation.entityType,
                name: creation.basicFormData.entityName,
              }
            : null
        }
        isAdminUser={true}
        onSubmit={handleAdminUserSubmit}
        onCancel={creation.closeAdminModal}
        primaryLabel="Create admin user"
        secondaryLabel="Cancel"
      />

      {/* New Team Member Modal */}
      {creation.entity && (
        <UserCreationForm
          open={creation.isNewMemberModalOpen}
          onOpenChange={(open) => {
            if (!open) creation.closeNewMemberModal()
          }}
          entity={{
            type: creation.entityType,
            name: creation.entity.name,
          }}
          isAdminUser={false}
          onSubmit={async (userData) => {
            await creation.handleNewMemberSubmit({
              firstName: userData.firstName,
              lastName: userData.lastName,
              email: userData.email,
              phoneNumber: userData.phoneNumber,
              countryCode: userData.countryCode,
              role: userData.role,
              profilePicture: userData.profilePicture,
            })
          }}
          onCancel={creation.closeNewMemberModal}
          primaryLabel="Register member"
          secondaryLabel="Cancel"
        />
      )}

      {/* Edit User Modal (creation flow) */}
      {creation.entity && creation.editingUserId && (
        <UserCreationForm
          open={!!creation.editingUserId}
          onOpenChange={(open) => {
            if (!open) creation.closeEditUserModal()
          }}
          mode="edit"
          entity={{
            type: creation.entityType,
            name: creation.entity.name,
          }}
          initialUserData={creation.teamMembers.find((u) => u.id === creation.editingUserId) ?? undefined}
          disabled={false}
          onSubmit={creation.handleEditUserSubmit}
          onCancel={creation.closeEditUserModal}
          primaryLabel={creation.isUpdatingMember ? "Saving..." : "Save changes"}
          secondaryLabel="Cancel"
        />
      )}
    </>
  )
}
