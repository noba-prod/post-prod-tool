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
import { ChevronDown, Search, ArrowUpDown, ArrowDownUp, Plus, Circle, Settings2, X } from "lucide-react"
import { ModalWindow } from "./modal-window"

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
  /**
   * When set, collections filter values are controlled by the parent (e.g. derived options + cascade clears).
   * Omit for standalone previews / demos with internal state only.
   */
  collectionFilterState?: {
    client: string | null
    status: string | null
    jobReference: string | null
    photographer: string | null
    sortOrder: "asc" | "desc"
  }
  /**
   * Status rows shown in the Status command (scoped by client selection + collection data).
   * Defaults to all collection statuses when omitted.
   */
  collectionStatusOptions?: { value: string; label: string }[]
  /**
   * When false (default) with `members` or `entities`, the action button is hidden below 940px
   * to avoid duplicating the nav FAB. Set true on routes like `/team` where the inline
   * “New member” control should stay visible on narrow viewports.
   */
  showActionOnNarrowScreens?: boolean
}

export const COLLECTION_STATUSES = [
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
  className,
}: {
  label: string
  children: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  className?: string
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-10 px-4 py-2 bg-background border border-input rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-foreground hover:bg-muted transition-colors",
            className
          )}
        >
          {label}
          <ChevronDown className="size-4 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        {children}
      </PopoverContent>
    </Popover>
  )
}

/** Client / Job reference / Photographer: single selection, no "all" in label, chevron or clear (X). */
function CollectionFilterPopoverButton({
  prefix,
  selectedLabel,
  open,
  onOpenChange,
  onClear,
  children,
  className,
}: {
  prefix: string
  selectedLabel: string | null
  children: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  onClear: () => void
  className?: string
}) {
  const hasSelection = Boolean(selectedLabel)
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <div
        className={cn(
          "flex h-10 min-w-0 max-w-full items-stretch overflow-hidden rounded-xl border border-input bg-background",
          className
        )}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-full min-w-0 flex-1 items-center gap-2 px-4 text-sm font-medium text-foreground transition-colors",
              "hover:bg-muted hover:text-foreground",
              "focus-visible:outline-none focus-visible:bg-muted"
            )}
          >
            <span className="min-w-0 truncate text-left">
              {prefix}
              {selectedLabel ? ` ${selectedLabel}` : ""}
            </span>
            {!hasSelection && <ChevronDown className="size-4 shrink-0" />}
          </button>
        </PopoverTrigger>
        {hasSelection && (
          <button
            type="button"
            aria-label="Clear filter"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onClear()
            }}
            className={cn(
              "flex h-full w-10 shrink-0 items-center justify-center border-l border-input text-muted-foreground transition-colors",
              "hover:bg-muted hover:text-foreground",
              "focus-visible:outline-none focus-visible:bg-muted"
            )}
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <PopoverContent className="w-[200px] p-0" align="start">
        {children}
      </PopoverContent>
    </Popover>
  )
}

/** Shared look for mobile filter modal triggers (Figma): one rounded card per row, label left, chevron/icon right */
const mobileFilterTriggerClass =
  "h-12 w-full min-w-0 rounded-2xl border border-input bg-background px-4 text-sm font-medium text-foreground shadow-none transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"

// Componente SortButton
function SortButton({
  sortOrder,
  onToggle,
  className,
  /** Mobile filter modal: label left, sort icon right (matches design) */
  labelTrailingIcon = false,
}: {
  sortOrder: "asc" | "desc"
  onToggle: () => void
  className?: string
  labelTrailingIcon?: boolean
}) {
  const icon =
    sortOrder === "desc" ? (
      <ArrowDownUp className="size-4 shrink-0 text-foreground" />
    ) : (
      <ArrowUpDown className="size-4 shrink-0 text-foreground" />
    )
  const text = sortOrder === "desc" ? "Most recent" : "Oldest"
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "h-10 px-4 py-2 bg-background border border-input rounded-xl flex items-center justify-center gap-2 text-sm font-medium text-foreground hover:bg-muted transition-colors",
        labelTrailingIcon && "justify-between gap-3",
        className
      )}
    >
      {labelTrailingIcon ? (
        <>
          <span className="min-w-0 truncate text-left">{text}</span>
          {icon}
        </>
      ) : (
        <>
          {icon}
          {text}
        </>
      )}
    </button>
  )
}

/**
 * Mobile filter modal only: Command list rendered inline (no Popover portal).
 * Popovers portaled to body are treated as "outside" by non-modal Dialog and break modal Dialog focus;
 * inline panels stay inside DialogContent and match desktop selection handlers.
 */
function CollectionFilterInlineRow({
  prefix,
  selectedLabel,
  open,
  onOpenChange,
  onClear,
  children,
  className,
}: {
  /** Same as desktop CollectionFilterPopoverButton, e.g. "Client:", "Job reference:" */
  prefix: string
  selectedLabel: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onClear: () => void
  children: React.ReactNode
  className?: string
}) {
  const hasSelection = Boolean(selectedLabel)
  return (
    <div className={cn("w-full min-w-0 max-w-full", className)}>
      <div className="flex h-12 min-w-0 max-w-full items-stretch overflow-hidden rounded-2xl border border-input bg-background">
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 text-left text-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
        >
          <span className="shrink-0 font-medium text-foreground">{prefix}</span>
          {hasSelection ? (
            <span className="min-w-0 flex-1 truncate text-right font-normal text-muted-foreground">
              {selectedLabel}
            </span>
          ) : (
            <ChevronDown className="size-4 shrink-0 text-foreground/80" aria-hidden />
          )}
        </button>
        {hasSelection && (
          <button
            type="button"
            aria-label="Clear filter"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onClear()
            }}
            className="flex w-11 shrink-0 items-center justify-center border-l border-input text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 rounded-2xl border border-input bg-popover text-popover-foreground p-1 shadow-md max-h-[min(50vh,280px)] overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  )
}

function FilterButtonInlineRow({
  prefix,
  valueLabel,
  open,
  onOpenChange,
  children,
  className,
}: {
  /** Left label, e.g. "Status" or "Role:" (match desktop FilterButton / getRoleLabel pattern) */
  prefix: string
  /** When set, shown right like desktop chips; omit chevron (same as collection filters when selected) */
  valueLabel?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  className?: string
}) {
  const hasValue = valueLabel != null && valueLabel !== ""
  return (
    <div className={cn("w-full min-w-0 max-w-full", className)}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={cn(
          mobileFilterTriggerClass,
          "flex items-center justify-between gap-3"
        )}
      >
        <span className="shrink-0 font-medium text-foreground">{prefix}</span>
        {hasValue ? (
          <span className="min-w-0 flex-1 truncate text-right font-normal text-muted-foreground">
            {valueLabel}
          </span>
        ) : (
          <ChevronDown className="size-4 shrink-0 text-foreground/80" aria-hidden />
        )}
      </button>
      {open && (
        <div className="mt-2 rounded-2xl border border-input bg-popover text-popover-foreground p-1 shadow-md max-h-[min(50vh,280px)] overflow-y-auto">
          {children}
        </div>
      )}
    </div>
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
  collectionFilterState,
  collectionStatusOptions,
  showActionOnNarrowScreens = false,
}: FilterBarProps) {
  const isCollectionsControlled =
    variant === "collections" && collectionFilterState != null

  const collectionStatusOptionsResolved =
    collectionStatusOptions ?? COLLECTION_STATUSES
  // State for popover open/close
  const [clientOpen, setClientOpen] = React.useState(false)
  const [statusOpen, setStatusOpen] = React.useState(false)
  const [jobReferenceOpen, setJobReferenceOpen] = React.useState(false)
  const [photographerOpen, setPhotographerOpen] = React.useState(false)
  const [roleOpen, setRoleOpen] = React.useState(false)
  const [typeOpen, setTypeOpen] = React.useState(false)
  const [filterModalOpen, setFilterModalOpen] = React.useState(false)

  /** Collapse inline / popover panels when the mobile filter modal closes so state does not leak to desktop. */
  React.useEffect(() => {
    if (!filterModalOpen) {
      setClientOpen(false)
      setStatusOpen(false)
      setJobReferenceOpen(false)
      setPhotographerOpen(false)
      setRoleOpen(false)
      setTypeOpen(false)
    }
  }, [filterModalOpen])

  // State for selected values (internal; overridden when collectionFilterState is set)
  const [clientInternal, setClientInternal] = React.useState<string | null>(null)
  const [statusInternal, setStatusInternal] = React.useState<string | null>(null)
  const [jobRefInternal, setJobRefInternal] = React.useState<string | null>(null)
  const [photographerInternal, setPhotographerInternal] = React.useState<string | null>(null)
  const [selectedRole, setSelectedRole] = React.useState<string | null>(null)
  const [selectedType, setSelectedType] = React.useState<string | null>(null)
  const [sortOrderInternal, setSortOrderInternal] = React.useState<"asc" | "desc">("desc")

  const ctl = collectionFilterState
  const selectedClient = isCollectionsControlled ? ctl!.client : clientInternal
  const selectedStatus = isCollectionsControlled ? ctl!.status : statusInternal
  const selectedJobReference = isCollectionsControlled ? ctl!.jobReference : jobRefInternal
  const selectedPhotographer = isCollectionsControlled ? ctl!.photographer : photographerInternal
  const sortOrder = isCollectionsControlled ? ctl!.sortOrder : sortOrderInternal

  const clientsForFilter = clientOptions ?? []
  const jobReferencesForFilter = jobReferenceOptions ?? []

  // Handlers
  const handleClientSelect = (clientId: string) => {
    if (!isCollectionsControlled) {
      setClientInternal(clientId)
      setStatusInternal(null)
      setJobRefInternal(null)
      setPhotographerInternal(null)
    }
    setClientOpen(false)
    onFilterChange?.("client", clientId)
  }

  const clearClientFilter = () => {
    if (!isCollectionsControlled) {
      setClientInternal(null)
      setStatusInternal(null)
      setJobRefInternal(null)
      setPhotographerInternal(null)
    }
    onFilterChange?.("client", "")
  }

  const handleStatusSelect = (status: string) => {
    if (!isCollectionsControlled) {
      setStatusInternal(status)
      setJobRefInternal(null)
      setPhotographerInternal(null)
    }
    setStatusOpen(false)
    onFilterChange?.("status", status)
  }

  const handleJobReferenceSelect = (value: string) => {
    if (!isCollectionsControlled) {
      setJobRefInternal(value)
      setPhotographerInternal(null)
    }
    setJobReferenceOpen(false)
    onFilterChange?.("jobReference", value)
  }

  const clearJobReferenceFilter = () => {
    if (!isCollectionsControlled) {
      setJobRefInternal(null)
      setPhotographerInternal(null)
    }
    onFilterChange?.("jobReference", "")
  }

  const handlePhotographerSelect = (photographerId: string) => {
    if (!isCollectionsControlled) {
      setPhotographerInternal(photographerId)
    }
    setPhotographerOpen(false)
    onFilterChange?.("photographer", photographerId)
  }

  const clearPhotographerFilter = () => {
    if (!isCollectionsControlled) {
      setPhotographerInternal(null)
    }
    onFilterChange?.("photographer", "")
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
    if (!isCollectionsControlled) {
      setSortOrderInternal(newOrder)
    }
    onSortChange?.(newOrder)
  }

  const handleClearAll = () => {
    if (variant === "collections") {
      if (!isCollectionsControlled) {
        setClientInternal(null)
        setStatusInternal(null)
        setJobRefInternal(null)
        setPhotographerInternal(null)
        setSortOrderInternal("desc")
      }
      onFilterChange?.("client", "")
      onSortChange?.("desc")
      setFilterModalOpen(false)
      return
    }
    setClientInternal(null)
    setStatusInternal(null)
    setJobRefInternal(null)
    setPhotographerInternal(null)
    setSelectedRole(null)
    setSelectedType(null)
    setSortOrderInternal("desc")
    onFilterChange?.("client", "")
    onFilterChange?.("status", "")
    onFilterChange?.("jobReference", "")
    onFilterChange?.("photographer", "")
    onFilterChange?.("role", "")
    onFilterChange?.("type", "")
    onSortChange?.("desc")
    setFilterModalOpen(false)
  }

  const handleFilterModalSave = () => {
    setFilterModalOpen(false)
  }

  const selectedClientName =
    selectedClient != null
      ? clientsForFilter.find((c) => c.id === selectedClient)?.name ?? null
      : null

  const selectedPhotographerName =
    selectedPhotographer != null
      ? photographerOptions.find((p) => p.id === selectedPhotographer)?.name ?? null
      : null

  const getStatusLabel = () => {
    if (selectedStatus) {
      const status = collectionStatusOptionsResolved.find(
        (s) => s.value === selectedStatus
      )
      return status?.label || "Status"
    }
    return "Status"
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

  /** Desktop: Popover + Command (unchanged). */
  const renderCollectionsFiltersDesktop = () => (
    <>
      {!hideClientFilter && (
        <CollectionFilterPopoverButton
          prefix="Client:"
          selectedLabel={selectedClientName}
          open={clientOpen}
          onOpenChange={setClientOpen}
          onClear={clearClientFilter}
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
                    onSelect={() => handleClientSelect(client.id)}
                    data-checked={selectedClient === client.id}
                  >
                    {client.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </CollectionFilterPopoverButton>
      )}

      <FilterButtonWithPopover
        label={getStatusLabel()}
        open={statusOpen}
        onOpenChange={setStatusOpen}
      >
        <Command>
          <CommandList>
            <CommandGroup>
              {collectionStatusOptionsResolved.map((status) => (
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

      <CollectionFilterPopoverButton
        prefix="Job reference:"
        selectedLabel={selectedJobReference}
        open={jobReferenceOpen}
        onOpenChange={setJobReferenceOpen}
        onClear={clearJobReferenceFilter}
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
      </CollectionFilterPopoverButton>

      <CollectionFilterPopoverButton
        prefix="Photographer:"
        selectedLabel={selectedPhotographerName}
        open={photographerOpen}
        onOpenChange={setPhotographerOpen}
        onClear={clearPhotographerFilter}
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
                  onSelect={() => handlePhotographerSelect(photographer.id)}
                  data-checked={selectedPhotographer === photographer.id}
                >
                  {photographer.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CollectionFilterPopoverButton>

      <SortButton sortOrder={sortOrder} onToggle={handleSortToggle} />
    </>
  )

  /** Mobile modal: inline Command panels (same handlers as desktop). */
  const renderCollectionsFiltersModal = () => {
    const openClient = (open: boolean) => {
      if (open) {
        setStatusOpen(false)
        setJobReferenceOpen(false)
        setPhotographerOpen(false)
      }
      setClientOpen(open)
    }
    const openStatus = (open: boolean) => {
      if (open) {
        setClientOpen(false)
        setJobReferenceOpen(false)
        setPhotographerOpen(false)
      }
      setStatusOpen(open)
    }
    const openJobRef = (open: boolean) => {
      if (open) {
        setClientOpen(false)
        setStatusOpen(false)
        setPhotographerOpen(false)
      }
      setJobReferenceOpen(open)
    }
    const openPhoto = (open: boolean) => {
      if (open) {
        setClientOpen(false)
        setStatusOpen(false)
        setJobReferenceOpen(false)
      }
      setPhotographerOpen(open)
    }

    return (
      <>
        {!hideClientFilter && (
          <CollectionFilterInlineRow
            prefix="Client:"
            selectedLabel={selectedClientName}
            open={clientOpen}
            onOpenChange={openClient}
            onClear={clearClientFilter}
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
                      onSelect={() => handleClientSelect(client.id)}
                      data-checked={selectedClient === client.id}
                    >
                      {client.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </CollectionFilterInlineRow>
        )}

        <FilterButtonInlineRow
          prefix="Status"
          valueLabel={
            selectedStatus
              ? collectionStatusOptionsResolved.find((s) => s.value === selectedStatus)?.label ?? null
              : null
          }
          open={statusOpen}
          onOpenChange={openStatus}
        >
          <Command>
            <CommandList>
              <CommandGroup>
                {collectionStatusOptionsResolved.map((status) => (
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
        </FilterButtonInlineRow>

        <CollectionFilterInlineRow
          prefix="Job reference:"
          selectedLabel={selectedJobReference}
          open={jobReferenceOpen}
          onOpenChange={openJobRef}
          onClear={clearJobReferenceFilter}
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
        </CollectionFilterInlineRow>

        <CollectionFilterInlineRow
          prefix="Photographer:"
          selectedLabel={selectedPhotographerName}
          open={photographerOpen}
          onOpenChange={openPhoto}
          onClear={clearPhotographerFilter}
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
                    onSelect={() => handlePhotographerSelect(photographer.id)}
                    data-checked={selectedPhotographer === photographer.id}
                  >
                    {photographer.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </CollectionFilterInlineRow>

        <SortButton
          sortOrder={sortOrder}
          onToggle={handleSortToggle}
          labelTrailingIcon
          className={cn(
            mobileFilterTriggerClass,
            "h-12 hover:bg-muted/60"
          )}
        />
      </>
    )
  }

  // Render filter modal content (for mobile) — Figma 1238-38978: stacked rows, gap-4, generous padding
  const renderFilterModalContent = () => {
    if (variant === "collections") {
      return (
        <div className="flex flex-col gap-4 w-full px-5 pb-6 pt-0">
          {renderCollectionsFiltersModal()}
        </div>
      )
    }

    if (variant === "members") {
      return (
        <div className="flex flex-col gap-4 w-full px-5 pb-6 pt-0">
          <FilterButtonInlineRow
            prefix="Role:"
            valueLabel={
              selectedRole
                ? USER_ROLES.find((r) => r.value === selectedRole)?.label ?? "all"
                : "all"
            }
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
          </FilterButtonInlineRow>
        </div>
      )
    }

    if (variant === "entities") {
      return (
        <div className="flex flex-col gap-4 w-full px-5 pb-6 pt-0">
          <FilterButtonInlineRow
            prefix="Type:"
            valueLabel={
              selectedType
                ? ENTITY_TYPES.find((t) => t.value === selectedType)?.label ?? "all"
                : "all"
            }
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
          </FilterButtonInlineRow>
        </div>
      )
    }

    return null
  }

  // Render variant-specific filters
  const renderFilters = () => {
    switch (variant) {
      case "collections":
        return renderCollectionsFiltersDesktop()

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
    <>
      <div className={cn("flex items-center justify-between w-full h-10", className)}>
        {/* Left side: Search + Filters (desktop >=940px) OR Filter by button (mobile <940px) */}
        <div className="flex items-center gap-3 flex-1">
          {/* Desktop: Search + Filters */}
          <div className="hidden min-[940px]:flex items-center gap-3 flex-1">
            {config.showSearch && (
              <SearchInput
                placeholder={searchPlaceholder}
                onChange={onSearchChange}
              />
            )}
            {/* Unmount while mobile filter modal is open: hidden desktop filters still mount Popovers
                and share clientOpen/statusOpen/etc., causing a portaled duplicate + broken inline Command */}
            {!filterModalOpen && renderFilters()}
          </div>

          {/* Mobile: Filter by button (secondary variant, 10px rounded) - only when filters exist */}
          {(variant === "collections" || variant === "members" || variant === "entities") && (
            <div className="flex min-[940px]:hidden">
              <Button
                variant="secondary"
                onClick={() => setFilterModalOpen(true)}
                className="h-10 px-4 rounded-[10px] gap-2"
              >
                <Settings2 className="size-4" />
                Filter by
              </Button>
            </div>
          )}
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
                onActionClick?.()
              }}
              disabled={actionDisabled}
              className={cn(
                "h-10 px-4 rounded-xl gap-2",
                (variant === "members" || variant === "entities") &&
                  !showActionOnNarrowScreens &&
                  "hidden min-[940px]:inline-flex"
              )}
            >
              {effectiveActionIcon}
              {effectiveActionLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Filter Modal */}
      <ModalWindow
        open={filterModalOpen}
        onOpenChange={setFilterModalOpen}
        title="Filter by"
        subtitle="Apply filters to refine your results"
        showSubtitle={false}
        primaryLabel="See results"
        secondaryLabel="Clean all"
        showPrimary={true}
        showSecondary={true}
        onPrimaryClick={handleFilterModalSave}
        onSecondaryClick={handleClearAll}
        width="400px"
      >
        {renderFilterModalContent()}
      </ModalWindow>
    </>
  )
}

export type { FilterBarProps, FilterBarVariant, FilterOption }
