"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Logo } from "./logo"
import { Notifications } from "./notifications"
import { UserInformation } from "./user-information"
import { CreateEntityCommand } from "./create-entity-command"

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
  noba: ["Collections", "Organizations", "Team"],
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

  // Valores por defecto para organization según variante
  const displayOrganization = organization ?? (variant === "noba" ? "noba" : variant === "collaborator" ? "company" : undefined)

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
                  "Organizations": "/organizations",
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

          <Notifications
            hasNotifications={hasNotifications}
            onClick={onNotifications}
          />

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
            <Notifications
              hasNotifications={hasNotifications}
              onClick={onNotifications}
            />

            <Button
              variant="ghost"
              size="icon-lg"
              className="rounded-full"
              onClick={onMenuClick}
            >
              <Menu className="size-4" />
            </Button>
          </div>
        </div>
      </div>

    </nav>
  )
}

