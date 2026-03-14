"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { ChevronDown, Search, ArrowUpDown, ArrowDownUp, Plus, Circle } from "lucide-react"

type FilterBarVariant = "default" | "collections" | "members" | "entities"

interface FilterOption {
  label: string
  value: string
}

interface FilterBarProps {
  variant?: FilterBarVariant
  onSearchChange?: (value: string) => void
  onActionClick?: () => void
  onViewChange?: (view: string) => void
  onFilterChange?: (filterId: string, value: string) => void
  onSortChange?: (order: "asc" | "desc") => void
  activeView?: string
  searchPlaceholder?: string
  actionLabel?: string
  actionIcon?: React.ReactNode
  showAction?: boolean
  showViewTabs?: boolean
  viewLabels?: [string, string]
  filters?: FilterOption[]
  className?: string
  /** Whether the action button should be disabled */
  actionDisabled?: boolean
  /** Whether to hide the Client filter (useful in entity view context) */
  hideClientFilter?: boolean
  /** Client options for collections variant (from registered entities). */
  clientOptions?: { id: string; name: string }[]
  /** Photographer options for collections variant (from registered entities). Enables Photographer filter. */
  photographerOptions?: { id: string; name: string }[]
  /** Job reference options for collections variant (unique reference values from collections). Enables "Job reference" filter. */
  jobReferenceOptions?: { value: string }[]
}

const COLLECTION_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "in-progress", label: "In progress" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
]

const USER_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
]

const ENTITY_TYPES = [
  { value: "client", label: "Client" },
  { value: "photographer", label: "Photographer" },
  { value: "agency", label: "Agency" },
  { value: "photo-lab", label: "Photo Lab" },
  { value: "hand-print-lab", label: "Hand Print Lab" },
  { value: "edition-studio", label: "Retouch/Post Studio" },
]

// Componente FilterButton con Popover
function FilterButtonWithPopover({
  label,
  children,
  open,
  onOpenChange,
}: {
  label: string
  children: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-10 px-4 py-2 bg-background border border-input rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          {label}
          <ChevronDown className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        {children}
      </PopoverContent>
    </Popover>
  )
}

// Componente SortButton
function SortButton({
  sortOrder,
  onToggle,
}: {
  sortOrder: "asc" | "desc"
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="h-10 px-4 py-2 bg-background border border-input rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
    >
      {sortOrder === "desc" ? (
        <ArrowDownUp className="size-4" />
      ) : (
        <ArrowUpDown className="size-4" />
      )}
      {sortOrder === "desc" ? "Most recent" : "Oldest"}
    </button>
  )
}

// Componente SearchInput
function SearchInput({
  placeholder = "Search...",
  onChange,
}: {
  placeholder?: string
  onChange?: (value: string) => void
}) {
  return (
    <div className="relative w-[192px]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-10 pl-9 rounded-lg"
      />
    </div>
  )
}

// Componente ViewTabs
function ViewTabs({
  labels = ["View 01", "View 02"],
  activeView,
  onViewChange,
}: {
  labels?: [string, string]
  activeView?: string
  onViewChange?: (view: string) => void
}) {
  return (
    <Tabs
      value={activeView || labels[0]}
      onValueChange={onViewChange}
      className="flex-row"
    >
      <TabsList className="h-10 p-1 bg-muted rounded-lg">
        <TabsTrigger value={labels[0]} className="px-3 py-1.5 text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
          {labels[0]}
        </TabsTrigger>
        <TabsTrigger value={labels[1]} className="px-3 py-1.5 text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
          {labels[1]}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

// Componente FilterButton simple (para default variant)
function FilterButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 px-4 py-2 bg-background border border-input rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
    >
      {children}
      <ChevronDown className="size-4" />
    </button>
  )
}

export function FilterBar({
  variant = "default",
  onSearchChange,
  onActionClick,
  onViewChange,
  onFilterChange,
  onSortChange,
  activeView,
  searchPlaceholder = "Search...",
  actionLabel,
  actionIcon,
  showAction = true,
  showViewTabs = true,
  viewLabels = ["View 01", "View 02"],
  filters,
  className,
  actionDisabled = false,
  hideClientFilter = false,
  clientOptions,
  photographerOptions = [],
  jobReferenceOptions = [],
}: FilterBarProps) {
  // State for popover open/close
  const [clientOpen, setClientOpen] = React.useState(false)
  const [statusOpen, setStatusOpen] = React.useState(false)
  const [jobReferenceOpen, setJobReferenceOpen] = React.useState(false)
  const [photographerOpen, setPhotographerOpen] = React.useState(false)
  const [roleOpen, setRoleOpen] = React.useState(false)
  const [typeOpen, setTypeOpen] = React.useState(false)

  // State for selected values
  const [selectedClient, setSelectedClient] = React.useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = React.useState<string | null>(null)
  const [selectedJobReference, setSelectedJobReference] = React.useState<string | null>(null)
  const [selectedPhotographer, setSelectedPhotographer] = React.useState<string | null>(null)
  const [selectedRole, setSelectedRole] = React.useState<string | null>(null)
  const [selectedType, setSelectedType] = React.useState<string | null>(null)
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc")

  const clientsForFilter = clientOptions ?? []
  const jobReferencesForFilter = jobReferenceOptions ?? []

  // Handlers
  const handleClientSelect = (clientId: string, clientName: string) => {
    setSelectedClient(clientId === selectedClient ? null : clientId)
    setClientOpen(false)
    onFilterChange?.("client", clientId)
  }

  const handleStatusSelect = (status: string) => {
    setSelectedStatus(status === selectedStatus ? null : status)
    setStatusOpen(false)
    onFilterChange?.("status", status)
  }

  const handleJobReferenceSelect = (value: string) => {
    setSelectedJobReference(value === selectedJobReference ? null : value)
    setJobReferenceOpen(false)
    onFilterChange?.("jobReference", value)
  }

  const handlePhotographerSelect = (photographerId: string, photographerName: string) => {
    setSelectedPhotographer(photographerId === selectedPhotographer ? null : photographerId)
    setPhotographerOpen(false)
    onFilterChange?.("photographer", photographerId)
  }

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role === selectedRole ? null : role)
    setRoleOpen(false)
    onFilterChange?.("role", role)
  }

  const handleTypeSelect = (type: string) => {
    setSelectedType(type === selectedType ? null : type)
    setTypeOpen(false)
    onFilterChange?.("type", type)
  }

  const handleSortToggle = () => {
    const newOrder = sortOrder === "desc" ? "asc" : "desc"
    setSortOrder(newOrder)
    onSortChange?.(newOrder)
  }

  // Get display labels
  const getClientLabel = () => {
    if (selectedClient) {
      const client = clientsForFilter.find((c) => c.id === selectedClient)
      return `Client: ${client?.name || "all"}`
    }
    return "Client: all"
  }

  const getPhotographerLabel = () => {
    if (selectedPhotographer) {
      const photographer = photographerOptions.find((p) => p.id === selectedPhotographer)
      return `Photographer: ${photographer?.name || "all"}`
    }
    return "Photographer: all"
  }

  const getStatusLabel = () => {
    if (selectedStatus) {
      const status = COLLECTION_STATUSES.find(s => s.value === selectedStatus)
      return status?.label || "Status"
    }
    return "Status"
  }

  const getJobReferenceLabel = () => {
    if (selectedJobReference) {
      return `Job reference: ${selectedJobReference}`
    }
    return "Job reference: all"
  }

  const getRoleLabel = () => {
    if (selectedRole) {
      const role = USER_ROLES.find(r => r.value === selectedRole)
      return `Role: ${role?.label || "all"}`
    }
    return "Role: all"
  }

  const getTypeLabel = () => {
    if (selectedType) {
      const type = ENTITY_TYPES.find(t => t.value === selectedType)
      return `Type: ${type?.label || "all"}`
    }
    return "Type: all"
  }

  // Configuración por variante
  const variantConfig = {
    default: {
      showSearch: false,
      showViewTabs: true,
      showAction: true,
      actionLabel: "Button",
      actionIcon: <Circle className="size-4" />,
      viewLabels: viewLabels,
    },
    collections: {
      showSearch: false,
      showViewTabs: true,
      showAction: false,
      actionLabel: "Button",
      actionIcon: <Circle className="size-4" />,
      viewLabels: ["Gallery", "List"] as [string, string],
    },
    members: {
      showSearch: true,
      showViewTabs: false,
      showAction: true,
      actionLabel: "New member",
      actionIcon: <Plus className="size-4" />,
      viewLabels: viewLabels,
    },
    entities: {
      showSearch: true,
      showViewTabs: false,
      showAction: true,
      actionLabel: "New player",
      actionIcon: <Plus className="size-4" />,
      viewLabels: viewLabels,
    },
  }

  const config = variantConfig[variant]
  const effectiveShowAction = showAction && (config.showAction ?? showAction)
  const effectiveShowViewTabs = showViewTabs && (config.showViewTabs ?? showViewTabs)
  const effectiveActionLabel = actionLabel || config.actionLabel || "Button"
  const effectiveActionIcon = actionIcon || config.actionIcon
  const effectiveViewLabels = (variant === "collections" ? config.viewLabels : viewLabels) as [string, string]

  // Render variant-specific filters
  const renderFilters = () => {
    switch (variant) {
      case "collections":
        return (
          <>
            {/* Client Filter - hidden if hideClientFilter is true */}
            {!hideClientFilter && (
              <FilterButtonWithPopover
                label={getClientLabel()}
                open={clientOpen}
                onOpenChange={setClientOpen}
              >
                <Command>
                  <CommandInput placeholder="Search client..." />
                  <CommandList>
                    <CommandEmpty>No client found.</CommandEmpty>
                    <CommandGroup>
                      {clientsForFilter.map((client) => (
                        <CommandItem
                          key={client.id}
                          value={client.name}
                          onSelect={() => handleClientSelect(client.id, client.name)}
                          data-checked={selectedClient === client.id}
                        >
                          {client.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </FilterButtonWithPopover>
            )}

            {/* Status Filter */}
            <FilterButtonWithPopover
              label={getStatusLabel()}
              open={statusOpen}
              onOpenChange={setStatusOpen}
            >
              <Command>
                <CommandList>
                  <CommandGroup>
                    {COLLECTION_STATUSES.map((status) => (
                      <CommandItem
                        key={status.value}
                        value={status.value}
                        onSelect={() => handleStatusSelect(status.value)}
                        data-checked={selectedStatus === status.value}
                      >
                        {status.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </FilterButtonWithPopover>

            {/* Job Reference Filter */}
            <FilterButtonWithPopover
              label={getJobReferenceLabel()}
              open={jobReferenceOpen}
              onOpenChange={setJobReferenceOpen}
            >
              <Command shouldFilter={true}>
                <CommandInput placeholder="Search job reference..." />
                <CommandList>
                  <CommandEmpty>No job reference found.</CommandEmpty>
                  <CommandGroup>
                    {jobReferencesForFilter.map((opt) => (
                      <CommandItem
                        key={opt.value}
                        value={opt.value}
                        onSelect={() => handleJobReferenceSelect(opt.value)}
                        data-checked={selectedJobReference === opt.value}
                      >
                        {opt.value}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </FilterButtonWithPopover>

            {/* Photographer Filter */}
            <FilterButtonWithPopover
              label={getPhotographerLabel()}
              open={photographerOpen}
              onOpenChange={setPhotographerOpen}
            >
              <Command>
                <CommandInput placeholder="Search photographer..." />
                <CommandList>
                  <CommandEmpty>No photographer found.</CommandEmpty>
                  <CommandGroup>
                    {photographerOptions.map((photographer) => (
                      <CommandItem
                        key={photographer.id}
                        value={photographer.name}
                        onSelect={() =>
                          handlePhotographerSelect(photographer.id, photographer.name)
                        }
                        data-checked={selectedPhotographer === photographer.id}
                      >
                        {photographer.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </FilterButtonWithPopover>

            {/* Sort Button */}
            <SortButton sortOrder={sortOrder} onToggle={handleSortToggle} />
          </>
        )

      case "members":
        return (
          <FilterButtonWithPopover
            label={getRoleLabel()}
            open={roleOpen}
            onOpenChange={setRoleOpen}
          >
            <Command>
              <CommandList>
                <CommandGroup>
                  {USER_ROLES.map((role) => (
                    <CommandItem
                      key={role.value}
                      value={role.value}
                      onSelect={() => handleRoleSelect(role.value)}
                      data-checked={selectedRole === role.value}
                    >
                      {role.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </FilterButtonWithPopover>
        )

      case "entities":
        return (
          <FilterButtonWithPopover
            label={getTypeLabel()}
            open={typeOpen}
            onOpenChange={setTypeOpen}
          >
            <Command>
              <CommandList>
                <CommandGroup>
                  {ENTITY_TYPES.map((type) => (
                    <CommandItem
                      key={type.value}
                      value={type.value}
                      onSelect={() => handleTypeSelect(type.value)}
                      data-checked={selectedType === type.value}
                    >
                      {type.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </FilterButtonWithPopover>
        )

      default:
        return (filters || [
          { label: "Filter 01", value: "filter1" },
          { label: "Filter 02", value: "filter2" },
          { label: "Filter 03", value: "filter3" },
        ]).map((filter) => (
          <FilterButton
            key={filter.value}
            onClick={() => onFilterChange?.(filter.value, filter.label)}
          >
            {filter.label}
          </FilterButton>
        ))
    }
  }

  return (
    <div className={cn("flex items-center justify-between w-full h-10", className)}>
      {/* Left side: Search + Filters */}
      <div className="flex items-center gap-3 flex-1">
        {config.showSearch && (
          <SearchInput
            placeholder={searchPlaceholder}
            onChange={onSearchChange}
          />
        )}
        {renderFilters()}
      </div>

      {/* Right side: View tabs + Action button */}
      <div className="flex items-center gap-3">
        {effectiveShowViewTabs && (
          <ViewTabs
            labels={effectiveViewLabels}
            activeView={activeView}
            onViewChange={onViewChange}
          />
        )}
        {effectiveShowAction && (
          <Button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log("FilterBar action button clicked, onActionClick:", onActionClick)
              onActionClick?.()
            }}
            disabled={actionDisabled}
            className="h-10 px-4 rounded-xl gap-2"
          >
            {effectiveActionIcon}
            {effectiveActionLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

export type { FilterBarProps, FilterBarVariant, FilterOption }
