"use client"

import * as React from "react"
import { ChevronDown, CircleUserRound, CircleDotDashed, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command"
import { roleToLabel } from "@/lib/types"

type UserInformationStatus = "default" | "hover" | "active"

interface UserInformationProps {
  /** Nombre del usuario */
  userName?: string
  /** Nombre de la organización */
  organization?: string
  /** Rol del usuario */
  role?: string
  /** Si el usuario es admin (puede editar company details) */
  isAdmin?: boolean
  /** Si el usuario es self-photographer (no puede editar company details) */
  isSelfPhotographer?: boolean
  /** URL de la imagen del avatar */
  avatarSrc?: string
  /** Estado visual del componente (para preview) */
  status?: UserInformationStatus
  /** Callback al editar perfil */
  onEditProfile?: () => void
  /** Callback al editar compañía */
  onEditCompany?: () => void
  /** Callback al hacer logout */
  onLogout?: () => void
  className?: string
}

/**
 * Componente de información de usuario con menú desplegable
 * 
 * @example
 * ```tsx
 * <UserInformation 
 *   userName="Martin Becerra"
 *   organization="noba"
 *   role="admin"
 * />
 * ```
 */
export function UserInformation({
  userName = "Martin Becerra",
  organization = "noba",
  role = "admin",
  isAdmin: isAdminProp,
  isSelfPhotographer = false,
  avatarSrc,
  status = "default",
  onEditProfile,
  onEditCompany,
  onLogout,
  className,
}: UserInformationProps) {
  const [open, setOpen] = React.useState(status === "active")
  const [isHovered, setIsHovered] = React.useState(status === "hover")

  // Sync con prop status (para preview)
  React.useEffect(() => {
    setOpen(status === "active")
    setIsHovered(status === "hover")
  }, [status])

  // Calculate isAdmin dynamically from role if not explicitly provided
  // Only admin role can see "Company details" option
  const isAdmin = React.useMemo(() => {
    if (isAdminProp !== undefined) {
      return isAdminProp
    }
    // Default to checking if role is "admin" (case-insensitive)
    return role?.toLowerCase() === "admin"
  }, [isAdminProp, role])

  const initials = userName.charAt(0).toUpperCase()

  const handleMouseEnter = () => {
    if (status === "default") setIsHovered(true)
  }

  const handleMouseLeave = () => {
    if (status === "default" && !open) setIsHovered(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={cn(
            "flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl w-[193px] transition-colors",
            (isHovered || open) && "bg-sidebar-accent",
            className
          )}
        >
          <Avatar size="sm">
            {avatarSrc ? (
              <AvatarImage src={avatarSrc} alt={userName} />
            ) : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          <div className="flex flex-col items-start gap-0.5 flex-1 min-w-0 pr-3">
            <span className="text-sm font-semibold leading-none truncate w-full text-left text-sidebar-accent-foreground">
              {userName}
            </span>
            <span className="text-xs leading-none truncate w-full text-left">
              <span className="text-lime-500">{organization}</span>
              <span className="text-sidebar-foreground"> · {
                role && ["admin", "editor", "viewer"].includes(role.toLowerCase())
                  ? roleToLabel(role.toLowerCase() as "admin" | "editor" | "viewer")
                  : role
              }</span>
            </span>
          </div>

          <ChevronDown className="size-4 text-zinc-600 shrink-0" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[205px] p-0 rounded-lg"
      >
        <Command className="rounded-lg">
          <CommandGroup>
            <CommandItem
              onSelect={() => {
                onEditProfile?.()
                setOpen(false)
              }}
            >
              <CircleUserRound className="size-4" />
              <span>Profile details</span>
            </CommandItem>
            {isAdmin && !isSelfPhotographer && (
              <CommandItem
                onSelect={() => {
                  onEditCompany?.()
                  setOpen(false)
                }}
              >
                <CircleDotDashed className="size-4" />
                <span>Company details</span>
              </CommandItem>
            )}
            <CommandSeparator />
            <CommandItem
              onSelect={() => {
                onLogout?.()
                setOpen(false)
              }}
            >
              <LogOut className="size-4" />
              <span>Logout</span>
            </CommandItem>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

