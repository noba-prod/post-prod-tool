"use client"

import * as React from "react"
import { toast } from "sonner"

// Service imports
import { createEntityCreationService, getRepositoryInstances } from "@/lib/services"
import { 
  mapFormToEntityDraft, 
  mapFormToAdminPayload,
  mapEntityToFormData,
  mapEntityToDraft,
} from "@/lib/utils/form-mappers"
import type { EntityBasicInformationFormData } from "@/lib/utils/form-mappers"

// Type imports
import type {
  StandardEntityType,
  User,
  CreateEntityDraftPayload,
  CreateUserPayload,
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
  /** Loading state for async operations */
  isCreating: boolean
  /** Loading state for update operations */
  isUpdating: boolean
  /** Loading state for creating team member */
  isCreatingMember: boolean
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

  /** Loading state for async operations (create) */
  const [isCreating, setIsCreating] = React.useState(false)

  /** Loading state for async operations (update) */
  const [isUpdating, setIsUpdating] = React.useState(false)

  /** Loading state for creating team member */
  const [isCreatingMember, setIsCreatingMember] = React.useState(false)

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
   * Updates the existing entity without recreating.
   */
  const handleSaveBasicInfo = React.useCallback(async () => {
    if (!basicDraft || !entityId) return

    setIsUpdating(true)

    try {
      const service = createEntityCreationService()
      const result = await service.updateEntityBasicInfo(entityId, basicDraft)

      // Update local entity state
      setEntity(result.entity)

      // Navigate back to team step
      setCurrentStep("team")

      // Show success toast
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
  }, [basicDraft, entityId])

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
      // Create mode: open admin modal
      setIsAdminModalOpen(true)
    }
  }, [basicDraft, entityId, handleSaveBasicInfo])

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
    if (!basicDraft) return

    setIsCreating(true)

    try {
      // Get the service instance
      const service = createEntityCreationService()

      // Map form data to service payload
      const adminPayload: CreateUserPayload = mapFormToAdminPayload({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        countryCode: userData.countryCode,
        role: userData.role,
        entity: null, // Not needed for mapping
      })

      // Call the service - this creates both entity and admin user
      const result = await service.createStandardEntityWithAdmin({
        draft: basicDraft,
        admin: adminPayload,
      })

      // Update state with result
      setEntityId(result.entityId)
      setEntity(result.entity)
      setTeamMembers(result.teamMembers)
      setCurrentStep("team")

      // Close modal
      setIsAdminModalOpen(false)

      // Show success toast
      toast.success("Entity created successfully", {
        description: `@${result.entity.name} has been added to your list`,
      })
    } catch (error) {
      console.error("Failed to create entity:", error)
      toast.error("Failed to create entity", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsCreating(false)
    }
  }, [basicDraft])

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
   * Handle new team member submit.
   * Creates a new team member for the existing entity.
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
      const service = createEntityCreationService()
      
      // Create user payload
      const payload: CreateUserPayload = {
        firstName: userData.firstName.trim(),
        lastName: userData.lastName?.trim() || undefined,
        email: userData.email.trim(),
        phoneNumber: `${userData.countryCode} ${userData.phoneNumber}`.trim(),
        entityId: entityId,
        role: userData.role,
      }

      // Create the team member using the repository directly
      const repos = getRepositoryInstances()
      if (!repos.userRepository) {
        throw new Error("User repository not available")
      }
      
      const newUser = await repos.userRepository.createUser(payload)
      
      // Refresh team members list
      const allUsers = await repos.userRepository.listUsersByEntityId(entityId)
      setTeamMembers(allUsers)
      
      // Optionally refresh entity if needed
      if (repos.entityRepository) {
        const updatedEntity = await repos.entityRepository.getEntityById(entityId)
        if (updatedEntity) {
          setEntity(updatedEntity)
        }
      }

      // Close modal
      setIsNewMemberModalOpen(false)

      // Show success toast
      toast.success("Team member added", {
        description: `${newUser.firstName} ${newUser.lastName || ""}`.trim() + " has been added to the team.",
      })
    } catch (error) {
      console.error("Failed to create team member:", error)
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
    isCreating,
    isUpdating,
    isCreatingMember,
    isUpdating,

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
    goToStep,
    handleEditBasicInfo,
  }
}
