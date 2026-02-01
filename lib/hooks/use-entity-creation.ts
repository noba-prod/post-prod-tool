"use client"

import * as React from "react"
import { toast } from "sonner"

// Service imports
import { getRepositoryInstances } from "@/lib/services"
import {
  mapFormToEntityDraft,
  mapEntityToFormData,
  mapEntityToDraft,
  mapFormToUpdateUserPayload,
} from "@/lib/utils/form-mappers"
import type { EntityBasicInformationFormData } from "@/lib/utils/form-mappers"
import {
  createAdminForOrganization,
  createOrganizationFromDraft,
} from "@/app/actions/entity-creation"

// Type imports
import type {
  StandardEntityType,
  User,
  CreateEntityDraftPayload,
  Entity,
} from "@/lib/types"

// Re-export form data type for convenience
export type { EntityBasicInformationFormData } from "@/lib/utils/form-mappers"

// =============================================================================
// TYPES
// =============================================================================

/**
 * State managed by the entity creation hook.
 */
export interface EntityCreationHookState {
  /** Draft data from Step 1 - NOT persisted until admin user is created */
  basicDraft: CreateEntityDraftPayload | null
  /** Raw form data for display purposes (e.g., entity name in modal) */
  basicFormData: EntityBasicInformationFormData | null
  /** Entity ID - null until entity is created (commit point) */
  entityId: string | null
  /** Created entity - null until entity is created */
  entity: Entity | null
  /** Current step focus - "basic" or "team" */
  currentStep: "basic" | "team"
  /** Team members list */
  teamMembers: User[]
  /** Form validation state */
  isBasicInfoValid: boolean
  /** Admin user modal open state */
  isAdminModalOpen: boolean
  /** New member modal open state */
  isNewMemberModalOpen: boolean
  /** User ID being edited (opens edit user modal when set) */
  editingUserId: string | null
  /** Loading state for async operations */
  isCreating: boolean
  /** Loading state for update operations */
  isUpdating: boolean
  /** Loading state for creating team member */
  isCreatingMember: boolean
  /** Loading state for updating team member */
  isUpdatingMember: boolean
}

/**
 * Derived state computed from the core state.
 */
export interface EntityCreationDerivedState {
  /** Step 1 variant: active when editing/creating, completed otherwise */
  step1Variant: "active" | "completed"
  /** Step 2 variant: disabled until entity exists, then active or completed */
  step2Variant: "disabled" | "active" | "completed"
  /** Active sidebar item ID for stepper ("step-1" or "step-2") */
  activeSidebarItem: "step-1" | "step-2"
  /** Whether we're editing basic info after entity creation */
  isEditingBasicInfo: boolean
  /** Primary button label for Step 1 ("Next" or "Save") */
  step1PrimaryLabel: "Next" | "Save"
}

/**
 * Actions/handlers exposed by the hook.
 */
export interface EntityCreationActions {
  /** Handle form data changes from EntityBasicInformationForm */
  handleFormDataChange: (data: EntityBasicInformationFormData) => void
  /** Handle validation state changes from EntityBasicInformationForm */
  handleValidationChange: (isValid: boolean) => void
  /** Handle Step 1 primary button click (Next or Save depending on mode) */
  handleStep1Primary: () => void
  /** Open the admin user modal (called on "Next" click in create mode) */
  openAdminModal: () => void
  /** Close the admin user modal */
  closeAdminModal: () => void
  /** Handle admin user modal submit - COMMIT POINT */
  handleAdminSubmit: (userData: { 
    firstName: string
    lastName: string
    email: string
    phoneNumber: string
    countryCode: string
    role: "admin" | "editor" | "viewer"
  }) => Promise<void>
  /** Open the new member modal */
  openNewMemberModal: () => void
  /** Close the new member modal */
  closeNewMemberModal: () => void
  /** Handle new team member submit */
  handleNewMemberSubmit: (userData: { 
    firstName: string
    lastName: string
    email: string
    phoneNumber: string
    countryCode: string
    role: "admin" | "editor" | "viewer"
  }) => Promise<void>
  /** Open edit user modal for a team member */
  openEditUserModal: (userId: string) => void
  /** Close edit user modal */
  closeEditUserModal: () => void
  /** Handle edit user submit (update team member) */
  handleEditUserSubmit: (userData: {
    firstName: string
    lastName: string
    email: string
    phoneNumber: string
    countryCode: string
    entity: { type: import("@/lib/types").EntityType; name: string } | null
    role: "admin" | "editor" | "viewer"
  }) => Promise<void>
  /** Navigate to a specific step */
  goToStep: (step: "basic" | "team") => void
  /** Handle edit button click on Step 1 block */
  handleEditBasicInfo: () => void
}

/**
 * Complete return type of the useEntityCreation hook.
 */
export interface UseEntityCreationReturn extends EntityCreationHookState, EntityCreationDerivedState, EntityCreationActions {
  /** The entity type this hook is managing */
  entityType: StandardEntityType
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * Hook for managing standard entity creation flow.
 * 
 * Encapsulates all state management, service integration, and derived state
 * for the two-step entity creation wizard (Basic Information → Team Members).
 * 
 * Supports both creation and editing modes:
 * - Create mode: entityId === null, Step 1 "Next" opens admin modal
 * - Edit mode: entityId !== null && currentStep === "basic", "Save" updates entity
 * 
 * @param entityType - The type of entity being created (e.g., "photo-lab", "agency")
 * @returns State, derived state, and action handlers for the creation flow
 */
export function useEntityCreation(entityType: StandardEntityType): UseEntityCreationReturn {
  // ===========================================================================
  // STATE - entityId is the single source of truth for step enablement
  // ===========================================================================

  /** Draft data from Step 1 - NOT persisted until admin user is created */
  const [basicDraft, setBasicDraft] = React.useState<CreateEntityDraftPayload | null>(null)

  /** Raw form data for display purposes */
  const [basicFormData, setBasicFormData] = React.useState<EntityBasicInformationFormData | null>(null)

  /** Entity ID - null until entity is created (commit point) */
  const [entityId, setEntityId] = React.useState<string | null>(null)

  /** Created entity - null until entity is created */
  const [entity, setEntity] = React.useState<Entity | null>(null)

  /** Current step focus - "basic" or "team" */
  const [currentStep, setCurrentStep] = React.useState<"basic" | "team">("basic")

  /** Team members list */
  const [teamMembers, setTeamMembers] = React.useState<User[]>([])

  /** Form validation state */
  const [isBasicInfoValid, setIsBasicInfoValid] = React.useState(false)

  /** Admin user modal state */
  const [isAdminModalOpen, setIsAdminModalOpen] = React.useState(false)

  /** New member modal state */
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = React.useState(false)

  /** Edit user modal - userId being edited, or null */
  const [editingUserId, setEditingUserId] = React.useState<string | null>(null)

  /** Loading state for async operations (create) */
  const [isCreating, setIsCreating] = React.useState(false)

  /** Loading state for async operations (update) */
  const [isUpdating, setIsUpdating] = React.useState(false)

  /** Loading state for creating team member */
  const [isCreatingMember, setIsCreatingMember] = React.useState(false)

  /** Loading state for updating team member */
  const [isUpdatingMember, setIsUpdatingMember] = React.useState(false)

  // ===========================================================================
  // FORM HYDRATION - Pre-fill form when entering edit mode
  // ===========================================================================

  /** Track previous step to detect step transitions */
  const prevStepRef = React.useRef<"basic" | "team">(currentStep)
  
  /** Track if form has been hydrated for current edit session */
  const hasHydratedRef = React.useRef(false)

  /**
   * Hydrate the form with entity data when entering edit mode.
   * This runs when:
   * - Navigating from Step 2 to Step 1 with an existing entity
   * - Entity is updated (entity reference changes)
   */
  React.useEffect(() => {
    // Detect if we just transitioned from "team" to "basic"
    const justEnteredBasic = prevStepRef.current === "team" && currentStep === "basic"
    
    // Update ref for next render
    prevStepRef.current = currentStep

    // Only hydrate if:
    // 1. We're in edit mode (entity exists and on basic step)
    // 2. We just navigated into basic step OR entity was just updated
    const shouldHydrate = 
      entityId !== null && 
      entity !== null && 
      currentStep === "basic" && 
      (justEnteredBasic || !hasHydratedRef.current)

    if (shouldHydrate) {
      // Hydrate form with current entity data
      const formData = mapEntityToFormData(entity)
      const draft = mapEntityToDraft(entity)
      
      setBasicFormData(formData)
      setBasicDraft(draft)
      hasHydratedRef.current = true
    }

    // Reset hydration flag when leaving basic step
    if (currentStep === "team") {
      hasHydratedRef.current = false
    }
  }, [currentStep, entity, entityId])

  // ===========================================================================
  // DERIVED STATE
  // ===========================================================================

  /** Whether we're editing basic info after entity creation */
  const isEditingBasicInfo = entityId !== null && currentStep === "basic"

  /** Step 1 variant: active when focused, completed when not focused and entity exists */
  const step1Variant: "active" | "completed" = currentStep === "basic" ? "active" : "completed"

  /** Step 2 variant: disabled until entity exists, active when focused, completed when not */
  const step2Variant: "disabled" | "active" | "completed" = entityId === null
    ? "disabled"
    : currentStep === "team"
      ? "active"
      : "completed"

  /** Active sidebar item for stepper */
  const activeSidebarItem: "step-1" | "step-2" = currentStep === "basic" ? "step-1" : "step-2"

  /** Primary button label for Step 1 */
  const step1PrimaryLabel: "Next" | "Save" = isEditingBasicInfo ? "Save" : "Next"

  // ===========================================================================
  // HANDLERS
  // ===========================================================================

  /**
   * Handle form data changes from EntityBasicInformationForm.
   * Stores both raw form data and mapped draft.
   */
  const handleFormDataChange = React.useCallback((data: EntityBasicInformationFormData) => {
    setBasicFormData(data)
    setBasicDraft(mapFormToEntityDraft(data))
  }, [])

  /**
   * Handle validation state changes from EntityBasicInformationForm.
   */
  const handleValidationChange = React.useCallback((isValid: boolean) => {
    setIsBasicInfoValid(isValid)
  }, [])

  /**
   * Navigate to a specific step.
   * Only allows going to "team" if entity exists.
   */
  const goToStep = React.useCallback((step: "basic" | "team") => {
    if (step === "team" && entityId === null) {
      // Can't go to team step without entity
      return
    }
    setCurrentStep(step)
  }, [entityId])

  /**
   * Handle edit button click on Step 1 block.
   * Navigates back to basic step for editing.
   */
  const handleEditBasicInfo = React.useCallback(() => {
    setCurrentStep("basic")
  }, [])

  /**
   * Open the admin user modal (called on "Next" click in create mode).
   */
  const openAdminModal = React.useCallback(() => {
    if (basicDraft) {
      setIsAdminModalOpen(true)
    }
  }, [basicDraft])

  /**
   * Close the admin user modal.
   */
  const closeAdminModal = React.useCallback(() => {
    setIsAdminModalOpen(false)
  }, [])

  /**
   * Handle saving basic info in edit mode.
   * Updates the existing entity via API (entity lives in Supabase after createOrganizationFromDraft).
   */
  const handleSaveBasicInfo = React.useCallback(async () => {
    if (!basicDraft || !entityId) return

    setIsUpdating(true)

    try {
      const payload: {
        name?: string
        email?: string
        phoneNumber?: string
        countryCode?: string
        notes?: string
        location?: { streetAddress?: string; zipCode?: string; city?: string; country?: string }
      } = {
        name: basicDraft.name?.trim(),
        email: basicDraft.email?.trim() || undefined,
        phoneNumber: basicFormData?.phoneNumber?.trim() || undefined,
        countryCode: basicFormData?.countryCode?.trim() || undefined,
        notes: basicDraft.notes?.trim() || undefined,
      }
      if (basicDraft.location) {
        payload.location = {
          streetAddress: basicDraft.location.streetAddress?.trim() || undefined,
          zipCode: basicDraft.location.zipCode?.trim() || undefined,
          city: basicDraft.location.city?.trim() || undefined,
          country: basicDraft.location.country?.trim() || undefined,
        }
      }

      const response = await fetch(`/api/organizations/${entityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        throw new Error(body.error || "Failed to update entity")
      }

      const result = (await response.json()) as { entity: Entity }
      setEntity(result.entity)
      setCurrentStep("team")

      toast.success("Entity information updated", {
        description: `@${result.entity.name} has been updated`,
      })
    } catch (error) {
      console.error("Failed to update entity:", error)
      toast.error("Failed to update entity", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsUpdating(false)
    }
  }, [basicDraft, basicFormData, entityId])

  /**
   * Handle creating a new organization (Step 1 -> Next).
   * Persists the organization in Supabase before opening the admin modal.
   */
  const handleCreateOrganization = React.useCallback(async () => {
    if (!basicDraft || !basicFormData) return

    setIsCreating(true)

    try {
      const result = await createOrganizationFromDraft({
        draft: basicDraft,
        phone: {
          prefix: basicFormData.countryCode,
          number: basicFormData.phoneNumber,
        },
        profilePicture: basicFormData.profilePicture ?? null,
      })

      setEntityId(result.entityId)
      setEntity(result.entity)
      setTeamMembers([])
      setIsAdminModalOpen(true)
    } catch (error) {
      console.error("Failed to create organization:", error)
      toast.error("Failed to create organization", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsCreating(false)
    }
  }, [basicDraft, basicFormData])

  /**
   * Handle Step 1 primary button click.
   * - In create mode (entityId === null): Opens admin modal
   * - In edit mode (entityId !== null): Saves changes and returns to team step
   */
  const handleStep1Primary = React.useCallback(() => {
    if (!basicDraft) return

    if (entityId !== null) {
      // Edit mode: save changes
      handleSaveBasicInfo()
    } else {
      // Create mode: create organization then open admin modal
      handleCreateOrganization()
    }
  }, [basicDraft, entityId, handleSaveBasicInfo, handleCreateOrganization])

  /**
   * Handle admin user modal submit.
   * This is the COMMIT POINT - creates both entity and admin user.
   */
  const handleAdminSubmit = React.useCallback(async (userData: {
    firstName: string
    lastName: string
    email: string
    phoneNumber: string
    countryCode: string
    role: "admin" | "editor" | "viewer"
  }) => {
    if (!entityId) return

    setIsCreating(true)

    try {
      const result = await createAdminForOrganization({
        organizationId: entityId,
        admin: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phone: {
            prefix: userData.countryCode,
            number: userData.phoneNumber,
          },
        },
      })

      setTeamMembers(result.teamMembers)
      setCurrentStep("team")

      // Close modal
      setIsAdminModalOpen(false)

      // Show success toast
      toast.success("Admin user created", {
        description: "The admin user has been added to this client.",
      })
    } catch (error) {
      console.error("Failed to create admin user:", error)
      toast.error("Failed to create admin user", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsCreating(false)
    }
  }, [entityId])

  /**
   * Open the new member modal.
   */
  const openNewMemberModal = React.useCallback(() => {
    if (!entityId) {
      toast.error("Cannot add member", {
        description: "Entity must be created before adding team members.",
      })
      return
    }
    console.log("Opening new member modal, entityId:", entityId)
    setIsNewMemberModalOpen(true)
  }, [entityId])

  /**
   * Close the new member modal.
   */
  const closeNewMemberModal = React.useCallback(() => {
    setIsNewMemberModalOpen(false)
  }, [])

  /**
   * Open edit user modal for a team member.
   */
  const openEditUserModal = React.useCallback((userId: string) => {
    setEditingUserId(userId)
  }, [])

  /**
   * Close edit user modal.
   */
  const closeEditUserModal = React.useCallback(() => {
    setEditingUserId(null)
  }, [])

  /**
   * Handle edit user submit. PATCH /api/users/[id]. On success updates teamMembers; on 404 updates local state for in-memory users.
   */
  const handleEditUserSubmit = React.useCallback(async (userData: {
    firstName: string
    lastName: string
    email: string
    phoneNumber: string
    countryCode: string
    entity: { type: import("@/lib/types").EntityType; name: string } | null
    role: "admin" | "editor" | "viewer"
    profilePicture?: File | null
  }) => {
    if (!editingUserId) return

    setIsUpdatingMember(true)
    try {
      let profilePictureUrl: string | undefined
      if (userData.profilePicture) {
        const uploadFormData = new FormData()
        uploadFormData.append("file", userData.profilePicture)
        const uploadRes = await fetch(`/api/users/${editingUserId}/profile-picture`, {
          method: "POST",
          body: uploadFormData,
        })
        const uploadData = await uploadRes.json().catch(() => ({}))
        if (!uploadRes.ok) throw new Error(uploadData.error ?? "Failed to upload profile picture")
        profilePictureUrl = uploadData.profilePictureUrl
      }
      const formData = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        countryCode: userData.countryCode,
        entity: userData.entity && userData.entity.type !== "self-photographer"
          ? { type: userData.entity.type as import("@/lib/types").StandardEntityType, name: userData.entity.name }
          : null,
        role: userData.role,
      }
      const payload = mapFormToUpdateUserPayload(formData, profilePictureUrl)
      const response = await fetch(`/api/users/${editingUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        // 404: user may exist only in-memory (e.g. added via "Register member" in creation flow)
        if (response.status === 404) {
          const repos = getRepositoryInstances()
          const inMemoryUpdate: Partial<Omit<User, "id" | "entityId">> = {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName?.trim() || undefined,
            email: formData.email.trim(),
            phoneNumber: [formData.countryCode, formData.phoneNumber].filter(Boolean).join(" ").trim(),
            role: formData.role,
            ...(profilePictureUrl && { profilePictureUrl }),
          }
          const updated = repos.userRepository
            ? await repos.userRepository.updateUser(editingUserId, inMemoryUpdate)
            : null
          if (updated) {
            setTeamMembers((prev) =>
              prev.map((u) => (u.id === editingUserId ? updated : u))
            )
            setEditingUserId(null)
            toast.success("User updated", {
              description: `${updated.firstName} ${updated.lastName || ""}`.trim() + " has been updated.",
            })
            return
          }
        }
        throw new Error(body.error || "Failed to update user")
      }

      const result = (await response.json()) as { user: User }
      setTeamMembers((prev) =>
        prev.map((u) => (u.id === editingUserId ? result.user : u))
      )
      setEditingUserId(null)
      toast.success("User updated", {
        description: `${result.user.firstName} ${result.user.lastName || ""}`.trim() + " has been updated.",
      })
    } catch (error) {
      console.error("Failed to update user:", error)
      toast.error("Failed to update user", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsUpdatingMember(false)
    }
  }, [editingUserId])

  /**
   * Handle new team member submit.
   * Creates the member in Supabase via POST /api/organizations/[id]/members and refreshes the full team list so the admin is never overwritten.
   */
  const handleNewMemberSubmit = React.useCallback(async (userData: {
    firstName: string
    lastName: string
    email: string
    phoneNumber: string
    countryCode: string
    role: "admin" | "editor" | "viewer"
  }) => {
    if (!entityId || !entity) {
      toast.error("Cannot add member", {
        description: "Entity must be created before adding team members.",
      })
      return
    }

    setIsCreatingMember(true)
    try {
      const payload = {
        firstName: userData.firstName.trim(),
        lastName: userData.lastName?.trim() || undefined,
        email: userData.email.trim(),
        phoneNumber: userData.phoneNumber.trim(),
        countryCode: userData.countryCode.trim(),
        role: userData.role,
      }

      const response = await fetch(`/api/organizations/${entityId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        throw new Error(body.error || "Failed to add team member")
      }

      const result = (await response.json()) as { user: User; teamMembers: User[] }
      setTeamMembers(result.teamMembers)
      setIsNewMemberModalOpen(false)
      toast.success("Team member added", {
        description: `${result.user.firstName} ${result.user.lastName || ""}`.trim() + " has been added to the team.",
      })
    } catch (error) {
      console.error("Failed to add team member:", error)
      toast.error("Failed to add team member", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsCreatingMember(false)
    }
  }, [entityId, entity])

  // ===========================================================================
  // RETURN
  // ===========================================================================

  return {
    // Entity type
    entityType,

    // State
    basicDraft,
    basicFormData,
    entityId,
    entity,
    currentStep,
    teamMembers,
    isBasicInfoValid,
    isAdminModalOpen,
    isNewMemberModalOpen,
    editingUserId,
    isCreating,
    isUpdating,
    isCreatingMember,
    isUpdatingMember,

    // Derived state
    step1Variant,
    step2Variant,
    activeSidebarItem,
    isEditingBasicInfo,
    step1PrimaryLabel,

    // Actions
    handleFormDataChange,
    handleValidationChange,
    handleStep1Primary,
    openAdminModal,
    closeAdminModal,
    handleAdminSubmit,
    openNewMemberModal,
    closeNewMemberModal,
    handleNewMemberSubmit,
    openEditUserModal,
    closeEditUserModal,
    handleEditUserSubmit,
    goToStep,
    handleEditBasicInfo,
  }
}
