"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandList, CommandItem } from "@/components/ui/command"
import { SelfPhotographerCreationForm, type SelfPhotographerFormData } from "./self-photographer-creation-form"

// Service imports
import { createEntityCreationService } from "@/lib/services"

// =============================================================================
// TYPES
// =============================================================================

/** Entity types that can be created */
export type CreateEntityOption = 
  | "collection"
  | "client"
  | "self-photographer"
  | "agency"
  | "photo-lab"
  | "edition-studio"
  | "hand-print-lab"

/** Option display configuration */
interface EntityOptionConfig {
  id: CreateEntityOption
  label: string
  route?: string // Route to navigate to, if not a modal-based creation
}

/** All available options with their configurations */
const ALL_OPTIONS: EntityOptionConfig[] = [
  { id: "collection", label: "Collection", route: "/create/collection" },
  { id: "client", label: "Client", route: "/create/client" },
  { id: "self-photographer", label: "Self-photographer" }, // Modal-based, no route
  { id: "agency", label: "Agency", route: "/create/agency" },
  { id: "photo-lab", label: "Photo lab", route: "/create/photo-lab" },
  { id: "edition-studio", label: "Edition studio", route: "/create/edition-studio" },
  { id: "hand-print-lab", label: "Hand print lab", route: "/create/hand-print-lab" },
]

// =============================================================================
// HOOK: useCreateEntity
// =============================================================================

interface UseCreateEntityOptions {
  /** Options to include in the command menu */
  allowedOptions?: CreateEntityOption[]
  /** Callback after successful entity creation */
  onCreated?: () => void
  /** Whether to redirect to /entities after creation (default: true) */
  redirectAfterCreate?: boolean
}

interface UseCreateEntityReturn {
  /** Whether the command popover is open */
  commandOpen: boolean
  /** Set command popover open state */
  setCommandOpen: (open: boolean) => void
  /** Whether the self-photographer modal is open */
  selfPhotographerModalOpen: boolean
  /** Set self-photographer modal open state */
  setSelfPhotographerModalOpen: (open: boolean) => void
  /** Whether self-photographer creation is in progress */
  isCreating: boolean
  /** Handle option selection from command menu */
  handleOptionSelect: (optionId: CreateEntityOption) => void
  /** Handle self-photographer form submit */
  handleSelfPhotographerSubmit: (data: SelfPhotographerFormData) => Promise<void>
  /** Handle self-photographer modal cancel */
  handleSelfPhotographerCancel: () => void
  /** Filtered options based on configuration */
  options: EntityOptionConfig[]
}

/**
 * Hook that manages entity creation flow.
 * Centralizes all entity creation logic for both navbar and entities page.
 */
export function useCreateEntity(config: UseCreateEntityOptions = {}): UseCreateEntityReturn {
  const {
    allowedOptions,
    onCreated,
    redirectAfterCreate = true,
  } = config

  const router = useRouter()
  const [commandOpen, setCommandOpen] = React.useState(false)
  const [selfPhotographerModalOpen, setSelfPhotographerModalOpen] = React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)

  // Filter options based on configuration
  const options = React.useMemo(() => {
    if (!allowedOptions || allowedOptions.length === 0) {
      return ALL_OPTIONS
    }
    return ALL_OPTIONS.filter(opt => allowedOptions.includes(opt.id))
  }, [allowedOptions])

  // Handle option selection
  const handleOptionSelect = React.useCallback((optionId: CreateEntityOption) => {
    setCommandOpen(false)

    const option = ALL_OPTIONS.find(o => o.id === optionId)
    if (!option) return

    // If option has a route, navigate to it
    if (option.route) {
      router.push(option.route)
      return
    }

    // Otherwise, handle modal-based creation
    if (optionId === "self-photographer") {
      setSelfPhotographerModalOpen(true)
    }
  }, [router])

  // Handle self-photographer form submit
  const handleSelfPhotographerSubmit = React.useCallback(async (formData: SelfPhotographerFormData) => {
    setIsCreating(true)

    try {
      const service = createEntityCreationService()

      const result = await service.createSelfPhotographer({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        countryCode: formData.countryCode,
        notes: formData.notes,
      })

      // Close modal
      setSelfPhotographerModalOpen(false)

      // Derive display name for toast
      const displayName = result.entity.name

      // Show success toast
      toast.success("Entity created successfully", {
        description: `@${displayName} has been added to your list`,
      })

      // Callback for additional actions (e.g., refresh list)
      onCreated?.()

      // Redirect to entities page if configured
      if (redirectAfterCreate) {
        router.push("/entities")
      }
    } catch (error) {
      console.error("Failed to create self-photographer:", error)
      toast.error("Failed to create self-photographer", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsCreating(false)
    }
  }, [onCreated, redirectAfterCreate, router])

  // Handle modal cancel
  const handleSelfPhotographerCancel = React.useCallback(() => {
    setSelfPhotographerModalOpen(false)
  }, [])

  return {
    commandOpen,
    setCommandOpen,
    selfPhotographerModalOpen,
    setSelfPhotographerModalOpen,
    isCreating,
    handleOptionSelect,
    handleSelfPhotographerSubmit,
    handleSelfPhotographerCancel,
    options,
  }
}

// =============================================================================
// COMPONENT: CreateEntityCommand
// =============================================================================

interface CreateEntityCommandProps {
  /** Options to include in the command menu */
  allowedOptions?: CreateEntityOption[]
  /** Callback after successful entity creation */
  onCreated?: () => void
  /** Whether to redirect to /entities after creation (default: true) */
  redirectAfterCreate?: boolean
  /** Custom trigger button (optional) */
  trigger?: React.ReactNode
  /** Button label (if using default trigger) */
  buttonLabel?: string
  /** Button size (if using default trigger) */
  buttonSize?: "default" | "sm" | "lg"
  /** Additional button className (if using default trigger) */
  buttonClassName?: string
  /** Popover alignment */
  popoverAlign?: "start" | "center" | "end"
}

/**
 * Reusable component for entity creation command menu.
 * 
 * Usage:
 * - Navbar: Include "collection" in allowedOptions
 * - Entities page: Exclude "collection" from allowedOptions
 * 
 * @example
 * // Navbar usage (with collection)
 * <CreateEntityCommand 
 *   buttonLabel="Create new" 
 *   popoverAlign="end"
 * />
 * 
 * // Entities page usage (without collection)
 * <CreateEntityCommand 
 *   allowedOptions={["client", "self-photographer", "agency", "photo-lab", "edition-studio", "hand-print-lab"]}
 *   buttonLabel="New entity"
 *   redirectAfterCreate={false}
 *   onCreated={loadEntities}
 * />
 */
export function CreateEntityCommand({
  allowedOptions,
  onCreated,
  redirectAfterCreate = true,
  trigger,
  buttonLabel = "Create new",
  buttonSize = "lg",
  buttonClassName,
  popoverAlign = "end",
}: CreateEntityCommandProps) {
  const {
    commandOpen,
    setCommandOpen,
    selfPhotographerModalOpen,
    setSelfPhotographerModalOpen,
    isCreating,
    handleOptionSelect,
    handleSelfPhotographerSubmit,
    handleSelfPhotographerCancel,
    options,
  } = useCreateEntity({
    allowedOptions,
    onCreated,
    redirectAfterCreate,
  })

  return (
    <>
      <Popover open={commandOpen} onOpenChange={setCommandOpen}>
        <PopoverTrigger asChild>
          {trigger || (
            <Button size={buttonSize} className={buttonClassName || "rounded-xl gap-2 px-4"}>
              <Plus className="size-4" />
              {buttonLabel}
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent
          className="w-[200px] p-1"
          align={popoverAlign}
          sideOffset={8}
        >
          <Command shouldFilter={false}>
            <CommandList>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.label}
                  onSelect={() => handleOptionSelect(option.id)}
                  className="cursor-pointer"
                >
                  {option.label}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Self-Photographer Creation Modal */}
      <SelfPhotographerCreationForm
        open={selfPhotographerModalOpen}
        onOpenChange={setSelfPhotographerModalOpen}
        onSubmit={handleSelfPhotographerSubmit}
        onCancel={handleSelfPhotographerCancel}
        isSubmitting={isCreating}
      />
    </>
  )
}

// =============================================================================
// EXPORTS
// =============================================================================

export type { CreateEntityCommandProps, UseCreateEntityOptions, UseCreateEntityReturn }
