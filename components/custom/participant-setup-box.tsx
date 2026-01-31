"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog"
import { Dialog as DialogPrimitive } from "radix-ui"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChevronsUpDown, Plus, Trash2 } from "lucide-react"

// ============================================================================
// TYPES
// ============================================================================

interface Entity {
  id: string
  name: string
  type: string
}

interface User {
  id: string
  name: string
  company: string
}

interface Participant {
  id: string
  name: string
  email: string
  phone: string
  editPermission: boolean
  collections: number
}

interface ParticipantSetupBoxProps {
  /** Title for the setup box */
  title?: string
  /** Placeholder for the combobox */
  placeholder?: string
  /** List of entities for the combobox */
  entities?: Entity[]
  /** List of users for the new member modal */
  users?: User[]
  /** Currently selected participants */
  participants?: Participant[]
  /** Callback when an entity is selected */
  onEntitySelect?: (entity: Entity) => void
  /** Callback when a user is selected from the modal */
  onUserSelect?: (user: User) => void
  /** Callback when a participant is deleted */
  onParticipantDelete?: (id: string) => void
  /** Callback when edit permission changes */
  onEditPermissionChange?: (id: string, value: boolean) => void
  /** Additional class name */
  className?: string
}

// ============================================================================
// MOCK DATA
// ============================================================================

const sampleEntities: Entity[] = [
  { id: "1", name: "Zara", type: "Client" },
  { id: "2", name: "Kodak Scanner", type: "Photo Lab" },
  { id: "3", name: "Tom Haser", type: "Photographer" },
  { id: "4", name: "Photo LUX", type: "Photo Agency" },
  { id: "5", name: "Reveal Coruña", type: "Printer Lab" },
  { id: "6", name: "Mango", type: "Client" },
  { id: "7", name: "Studio Madrid", type: "Retouch/Post Studio" },
  { id: "8", name: "Snapshot Creations", type: "Photo Agency" },
  { id: "9", name: "Loewe", type: "Client" },
]

const sampleUsers: User[] = [
  { id: "1", name: "Tom Haser", company: "Freelance" },
  { id: "2", name: "Michael Smith", company: "Snapshot Creations" },
  { id: "3", name: "Emily Davis", company: "Freelance" },
  { id: "4", name: "James Brown", company: "Freelance" },
  { id: "5", name: "Sophia Garcia", company: "Snapshot Creations" },
  { id: "6", name: "Daniel Martinez", company: "Snapshot Creations" },
  { id: "7", name: "Olivia Rodriguez", company: "Snapshot Creations" },
  { id: "8", name: "Benjamin Wilson", company: "Freelance" },
  { id: "9", name: "Emma Taylor", company: "Snapshot Creations" },
]

const sampleParticipants: Participant[] = [
  { id: "1", name: "Erika Goldner", email: "erika.goldner@zara.com", phone: "+34 649 393 291", editPermission: true, collections: 0 },
  { id: "2", name: "Sophia Johnson", email: "sophia.johnson@zara.com", phone: "+34 672 271 218", editPermission: false, collections: 0 },
  { id: "3", name: "Aiden Smith", email: "kevin.brown@zara.com", phone: "555-555-5555", editPermission: true, collections: 0 },
  { id: "4", name: "Mia Clark", email: "sarah.davis@zara.com", phone: "666-666-6666", editPermission: false, collections: 0 },
  { id: "5", name: "Noah Garcia", email: "james.wilson@zara.com", phone: "777-777-7777", editPermission: false, collections: 0 },
]

// ============================================================================
// CUSTOM DIALOG WITH DARKER OVERLAY
// ============================================================================

function NewMemberDialog({
  open,
  onOpenChange,
  users = sampleUsers,
  onUserSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  users?: User[]
  onUserSelect?: (user: User) => void
}) {
  const [searchTerm, setSearchTerm] = React.useState("")

  const filteredUsers = React.useMemo(() => {
    if (!searchTerm) return users
    const term = searchTerm.toLowerCase()
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(term) ||
        user.company.toLowerCase().includes(term)
    )
  }, [users, searchTerm])

  const handleSelect = (user: User) => {
    onUserSelect?.(user)
    onOpenChange(false)
    setSearchTerm("")
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        {/* Custom overlay with 36% opacity */}
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/[0.36] data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 duration-100"
        />
        {/* Centered content */}
        <DialogPrimitive.Content
          className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-lg p-0 overflow-hidden data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 duration-100"
        >
          <Command className="rounded-xl" shouldFilter={false}>
            <CommandInput
              placeholder="Search and select a member"
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList className="max-h-80">
              <CommandEmpty>No user found.</CommandEmpty>
              <CommandGroup>
                {filteredUsers.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.name}
                    onSelect={() => handleSelect(user)}
                    className="py-3 px-4 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium text-foreground">{user.name}</span>
                      <span className="text-muted-foreground text-sm">{user.company}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  )
}

// ============================================================================
// PARTICIPANTS TABLE (inline version)
// ============================================================================

function ParticipantsTableInline({
  participants,
  onDelete,
  onEditPermissionChange,
}: {
  participants: Participant[]
  onDelete?: (id: string) => void
  onEditPermissionChange?: (id: string, value: boolean) => void
}) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="bg-sidebar h-12">Name</TableHead>
            <TableHead className="bg-sidebar h-12">Email</TableHead>
            <TableHead className="bg-sidebar h-12">Phone</TableHead>
            <TableHead className="bg-sidebar h-12">Edit permission</TableHead>
            <TableHead className="bg-sidebar h-12">Collections</TableHead>
            <TableHead className="bg-sidebar h-12 w-[85px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {participants.map((participant) => (
            <TableRow key={participant.id} className="h-[52px]">
              <TableCell className="font-medium">{participant.name}</TableCell>
              <TableCell className="text-muted-foreground truncate max-w-[120px]">
                {participant.email}
              </TableCell>
              <TableCell>{participant.phone}</TableCell>
              <TableCell>
                <Switch
                  checked={participant.editPermission}
                  onCheckedChange={(checked) => onEditPermissionChange?.(participant.id, checked)}
                />
              </TableCell>
              <TableCell>{participant.collections}</TableCell>
              <TableCell className="text-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete?.(participant.id)}
                  className="h-10 w-10"
                >
                  <Trash2 className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Participant Setup Box Component
 * 
 * A dynamic box-block with:
 * - Title using form title styles
 * - Combobox to select entities (opens Command with search)
 * - "New member" button that opens a centered modal overlay
 * - When participants are selected, displays a participants table
 */
export function ParticipantSetupBox({
  title = "This is a title",
  placeholder = "Select one",
  entities = sampleEntities,
  users = sampleUsers,
  participants: initialParticipants,
  onEntitySelect,
  onUserSelect,
  onParticipantDelete,
  onEditPermissionChange,
  className,
}: ParticipantSetupBoxProps) {
  const [comboboxOpen, setComboboxOpen] = React.useState(false)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [selectedEntity, setSelectedEntity] = React.useState<Entity | null>(null)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [participants, setParticipants] = React.useState<Participant[]>(
    initialParticipants || []
  )

  const filteredEntities = React.useMemo(() => {
    if (!searchTerm) return entities
    const term = searchTerm.toLowerCase()
    return entities.filter(
      (entity) =>
        entity.name.toLowerCase().includes(term) ||
        entity.type.toLowerCase().includes(term)
    )
  }, [entities, searchTerm])

  const handleEntitySelect = (entity: Entity) => {
    setSelectedEntity(entity)
    setComboboxOpen(false)
    setSearchTerm("")
    onEntitySelect?.(entity)
  }

  const handleUserSelect = (user: User) => {
    // Add user as participant
    const newParticipant: Participant = {
      id: `participant-${Date.now()}`,
      name: user.name,
      email: `${user.name.toLowerCase().replace(" ", ".")}@example.com`,
      phone: "+1 000 000 000",
      editPermission: false,
      collections: 0,
    }
    setParticipants((prev) => [...prev, newParticipant])
    onUserSelect?.(user)
  }

  const handleDelete = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id))
    onParticipantDelete?.(id)
  }

  const handleEditPermissionChange = (id: string, value: boolean) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, editPermission: value } : p))
    )
    onEditPermissionChange?.(id, value)
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-4 bg-white border border-zinc-200 rounded-xl w-full",
        className
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        {/* Title - using form title styles */}
        <span className="text-base font-semibold text-foreground">
          {title}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Combobox */}
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={comboboxOpen}
                className="w-[180px] justify-between h-10 px-4 font-normal"
              >
                <span className="truncate">
                  {selectedEntity ? selectedEntity.name : placeholder}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="end">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Search and select an entity"
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                />
                <CommandList>
                  <CommandEmpty>No entity found.</CommandEmpty>
                  <CommandGroup>
                    {filteredEntities.map((entity) => (
                      <CommandItem
                        key={entity.id}
                        value={entity.name}
                        onSelect={() => handleEntitySelect(entity)}
                        className="py-2.5 px-3 cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium text-foreground">{entity.name}</span>
                          <span className="text-muted-foreground text-sm">{entity.type}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* New member button */}
          <Button
            variant="secondary"
            onClick={() => setModalOpen(true)}
            className="h-10 gap-2 rounded-xl"
          >
            <Plus className="h-4 w-4" />
            New member
          </Button>
        </div>
      </div>

      {/* Participants table (shown when there are participants) */}
      {participants.length > 0 && (
        <ParticipantsTableInline
          participants={participants}
          onDelete={handleDelete}
          onEditPermissionChange={handleEditPermissionChange}
        />
      )}

      {/* New member modal */}
      <NewMemberDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        users={users}
        onUserSelect={handleUserSelect}
      />
    </div>
  )
}

export type { ParticipantSetupBoxProps, Entity, User, Participant }
