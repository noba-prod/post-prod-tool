"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import type { User } from "@/lib/types"

export interface AddMemberOverlayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: User[]
  existingIds: Set<string>
  onSelect: (user: User) => void
  getSupportiveText?: (user: User) => string
  /** Portal to document.body (default true). Required when nested inside Radix Dialog modals. */
  portaled?: boolean
}

/**
 * Centered command search overlay for picking an existing team member.
 * Used in collection participant setup and the Participants modal "My team" section.
 */
export function AddMemberOverlay({
  open,
  onOpenChange,
  users,
  existingIds,
  onSelect,
  getSupportiveText,
  portaled = true,
}: AddMemberOverlayProps) {
  const [search, setSearch] = React.useState("")
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!open) setSearch("")
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      event.stopPropagation()
      onOpenChange(false)
    }
    window.addEventListener("keydown", onKeyDown, true)
    return () => window.removeEventListener("keydown", onKeyDown, true)
  }, [open, onOpenChange])

  const filtered = React.useMemo(() => {
    if (!search.trim()) return users.filter((u) => !existingIds.has(u.id))
    const t = search.toLowerCase()
    return users.filter(
      (u) =>
        !existingIds.has(u.id) &&
        (u.firstName?.toLowerCase().includes(t) ||
          u.lastName?.toLowerCase().includes(t) ||
          u.email?.toLowerCase().includes(t))
    )
  }, [users, existingIds, search])

  const handleSelect = React.useCallback(
    (user: User) => {
      onSelect(user)
      onOpenChange(false)
    },
    [onSelect, onOpenChange]
  )

  if (!open || !mounted) return null

  const overlay = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Add new member"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close add member dialog"
        onClick={() => onOpenChange(false)}
      />
      <div
        className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-background p-2 shadow-xl mx-4"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="rounded-lg border-0 bg-transparent" shouldFilter={false}>
          <CommandInput
            placeholder="Search by name or email"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-60 mt-2">
            <CommandEmpty>No member found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((u) => (
                <CommandItem
                  key={u.id}
                  value={u.id}
                  onSelect={() => handleSelect(u)}
                  onMouseDown={(e) => e.preventDefault()}
                  className="w-full py-2.5 px-3 cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="flex flex-1 min-w-0 justify-between items-center gap-2">
                    <span className="font-medium text-foreground truncate min-w-0">
                      {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email}
                    </span>
                    {getSupportiveText ? (
                      <span className="text-muted-foreground text-sm shrink-0">
                        {getSupportiveText(u)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm truncate min-w-0">
                        {u.email}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </div>
  )

  if (portaled && typeof document !== "undefined") {
    return createPortal(overlay, document.body)
  }

  return overlay
}
