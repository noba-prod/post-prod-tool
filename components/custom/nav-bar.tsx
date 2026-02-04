"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, Menu, CircleUserRound, CircleDotDashed, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Logo } from "./logo"
import { Notifications } from "./notifications"
import { UserInformation } from "./user-information"
import { CreateEntityCommand } from "./create-entity-command"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command"
import { roleToLabel } from "@/lib/types"

type NavBarVariant = "noba" | "collaborator" | "photographer"

interface NavBarProps {
  /** Variante de navegación según tipo de usuario */
  variant?: NavBarVariant
  /** Nombre del usuario */
  userName?: string
  /** Nombre de la organización */
  organization?: string
  /** Rol del usuario */
  role?: string
  /** Si el usuario es admin */
  isAdmin?: boolean
  /** Si el usuario es self-photographer */
  isSelfPhotographer?: boolean
  /** URL del avatar del usuario */
  avatarSrc?: string
  /** Si hay notificaciones nuevas */
  hasNotifications?: boolean
  /** Callback para búsqueda */
  onSearch?: () => void
  /** Callback para crear nuevo */
  onCreateNew?: () => void
  /** Callback para notificaciones */
  onNotifications?: () => void
  /** Callback para menu mobile */
  onMenuClick?: () => void
  /** Callbacks de user information */
  onEditProfile?: () => void
  onEditCompany?: () => void
  onLogout?: () => void
  className?: string
}

// Tabs según la variante
const variantTabs: Record<NavBarVariant, string[]> = {
  noba: ["Collections", "Players", "Team"],
  collaborator: ["Collections", "Team"],
  photographer: ["Collections"],
}

/**
 * Nav Bar component con variantes para diferentes tipos de usuario
 * 
 * @example
 * ```tsx
 * <NavBar variant="noba" userName="Martin Becerra" organization="noba" role="admin" isAdmin />
 * <NavBar variant="collaborator" userName="Erika Goldner" organization="zara" role="admin" />
 * <NavBar variant="photographer" userName="Tom Haser" role="photographer" />
 * ```
 */
export function NavBar({
  variant = "noba",
  userName = "Martin Becerra",
  organization,
  role = "admin",
  isAdmin = false,
  isSelfPhotographer = false,
  avatarSrc,
  hasNotifications = false,
  onSearch,
  onCreateNew,
  onNotifications,
  onMenuClick,
  onEditProfile,
  onEditCompany,
  onLogout,
  className,
}: NavBarProps) {
  const router = useRouter()
  const tabs = variantTabs[variant]
  const initials = userName.charAt(0).toUpperCase()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  // Valores por defecto para organization según variante
  const displayOrganization = organization ?? (variant === "noba" ? "noba" : variant === "collaborator" ? "company" : undefined)

  // Calculate isAdmin dynamically from role if not explicitly provided
  const isAdminUser = React.useMemo(() => {
    if (isAdmin !== undefined) {
      return isAdmin
    }
    return role?.toLowerCase() === "admin"
  }, [isAdmin, role])

  const handleMenuClick = () => {
    setIsMobileMenuOpen(true)
    onMenuClick?.()
  }

  const handleTabClick = (tab: string) => {
    const routeMap: Record<string, string> = {
      "Collections": "/collections",
      "Players": "/organizations",
      "Team": "/team",
    }
    const route = routeMap[tab]
    if (route) {
      router.push(route)
      setIsMobileMenuOpen(false)
    }
  }

  const handleSearchClick = () => {
    onSearch?.()
    setIsMobileMenuOpen(false)
  }

  const handleEditProfile = () => {
    onEditProfile?.()
    setIsMobileMenuOpen(false)
  }

  const handleEditCompany = () => {
    onEditCompany?.()
    setIsMobileMenuOpen(false)
  }

  const handleLogout = () => {
    onLogout?.()
    setIsMobileMenuOpen(false)
  }

  return (
    <nav className={cn("w-full bg-background", className)}>
      {/* Desktop version */}
      <div className="hidden md:flex items-center justify-between h-16 px-6 border-b border-border">
        {/* Left section: Logo + Tabs + Search */}
        <div className="flex items-center gap-6">
          <Logo variant="isotype" size="md" />
          
          <div className="flex items-center gap-4">
            {/* Navigation Tabs */}
            {tabs.map((tab) => {
              const handleTabClick = () => {
                const routeMap: Record<string, string> = {
                  "Collections": "/collections",
                  "Players": "/organizations",
                  "Team": "/team",
                }
                const route = routeMap[tab]
                if (route) {
                  router.push(route)
                }
              }
              
              return (
                <Button
                  key={tab}
                  variant="ghost"
                  size="lg"
                  className="rounded-xl px-4 text-sm font-medium text-foreground"
                  onClick={handleTabClick}
                >
                  {tab}
                </Button>
              )
            })}

            {/* Search Button */}
            <button
              type="button"
              onClick={onSearch}
              className="flex items-center gap-2 h-10 px-4 bg-secondary rounded-full w-[224px] text-sm font-medium text-secondary-foreground"
            >
              <Search className="size-4" />
              <span>Search...</span>
            </button>
          </div>
        </div>

        {/* Right section: Create button + Notifications + Separator + User */}
        <div className="flex items-center gap-4">
          {/* Create new button - solo para variante noba y no para viewers */}
          {variant === "noba" && role?.toLowerCase() !== "viewer" && (
            <CreateEntityCommand
              buttonLabel="Create new"
              popoverAlign="end"
            />
          )}

          <Notifications usePanel />

          <div className="w-px h-5 bg-border" />

          <UserInformation
            userName={userName}
            organization={displayOrganization}
            role={role}
            isAdmin={isAdmin}
            isSelfPhotographer={isSelfPhotographer}
            avatarSrc={avatarSrc}
            onEditProfile={onEditProfile}
            onEditCompany={onEditCompany}
            onLogout={onLogout}
          />
        </div>
      </div>

      {/* Mobile version */}
      <div className="flex md:hidden items-center justify-between h-16 px-6 border-b border-border">
        {/* Left: Logo */}
        <Logo variant="isotype" size="md" />

        {/* Right: Avatar + Separator + Notifications + Menu */}
        <div className="flex items-center gap-4">
          <Avatar size="sm">
            {avatarSrc ? (
              <AvatarImage src={avatarSrc} alt={userName} />
            ) : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          <div className="w-px h-5 bg-border" />

          <div className="flex items-center gap-1">
            <Notifications usePanel />

            <button
              type="button"
              onClick={handleMenuClick}
              className="relative flex items-center justify-center size-10 rounded-xl transition-colors hover:bg-sidebar-background active:bg-accent z-10"
              style={{ touchAction: 'manipulation' }}
              aria-label="Open menu"
            >
              <Menu className="size-4 text-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Sheet */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="right" className="w-[300px] sm:w-[380px] p-0">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <SheetTitle className="text-left">Menu</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col h-[calc(100vh-73px)]">
            <div className="flex-1 overflow-y-auto">
              {/* Navigation Tabs */}
              <div className="px-6 py-4">
                <nav className="flex flex-col gap-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => handleTabClick(tab)}
                      className="flex items-center h-10 px-3 text-sm font-medium text-foreground rounded-xl hover:bg-muted transition-colors text-left"
                    >
                      {tab}
                    </button>
                  ))}
                </nav>
              </div>

              <Separator />

              {/* Search */}
              <div className="px-6 py-4">
                <button
                  type="button"
                  onClick={handleSearchClick}
                  className="flex items-center gap-2 h-10 w-full px-4 bg-secondary rounded-full text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  <Search className="size-4" />
                  <span>Search...</span>
                </button>
              </div>

              {/* Create New Button - only for noba variant and not viewers */}
              {variant === "noba" && role?.toLowerCase() !== "viewer" && (
                <>
                  <Separator />
                  <div className="px-6 py-4">
                    <CreateEntityCommand
                      buttonLabel="Create new"
                      popoverAlign="start"
                    />
                  </div>
                </>
              )}
            </div>

            <Separator />

            {/* User Information Section */}
            <div className="px-6 py-4 shrink-0">
              <div className="flex flex-col gap-1">
                {/* User Info Display */}
                <div className="flex items-center gap-3 px-3 py-2 mb-2">
                  <Avatar size="sm">
                    {avatarSrc ? (
                      <AvatarImage src={avatarSrc} alt={userName} />
                    ) : null}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start gap-0.5 flex-1 min-w-0">
                    <span className="text-sm font-semibold leading-none truncate w-full text-left text-foreground">
                      {userName}
                    </span>
                    <span className="text-xs leading-none truncate w-full text-left">
                      <span className="text-lime-500">{displayOrganization}</span>
                      {role && (
                        <span className="text-muted-foreground">
                          {" · "}
                          {["admin", "editor", "viewer"].includes(role.toLowerCase())
                            ? roleToLabel(role.toLowerCase() as "admin" | "editor" | "viewer")
                            : role}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* User Menu Items */}
                <Command className="rounded-lg">
                  <CommandGroup>
                    <CommandItem
                      onSelect={handleEditProfile}
                      className="cursor-pointer"
                    >
                      <CircleUserRound className="size-4" />
                      <span>Profile details</span>
                    </CommandItem>
                    {isAdminUser && !isSelfPhotographer && (
                      <CommandItem
                        onSelect={handleEditCompany}
                        className="cursor-pointer"
                      >
                        <CircleDotDashed className="size-4" />
                        <span>Company details</span>
                      </CommandItem>
                    )}
                    <CommandSeparator />
                    <CommandItem
                      onSelect={handleLogout}
                      className="cursor-pointer"
                    >
                      <LogOut className="size-4" />
                      <span>Logout</span>
                    </CommandItem>
                  </CommandGroup>
                </Command>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

    </nav>
  )
}

