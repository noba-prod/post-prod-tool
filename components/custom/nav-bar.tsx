"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandList, CommandItem } from "@/components/ui/command"
import { Logo } from "./logo"
import { Notifications } from "./notifications"
import { UserInformation } from "./user-information"
import { ModalWindow } from "./modal-window"

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
  noba: ["Collections", "Entities", "Team"],
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
  const [createMenuOpen, setCreateMenuOpen] = React.useState(false)
  const [selfPhotographerModalOpen, setSelfPhotographerModalOpen] = React.useState(false)

  // Valores por defecto para organization según variante
  const displayOrganization = organization ?? (variant === "noba" ? "noba" : variant === "collaborator" ? "company" : undefined)

  // Command options for "Create new" menu
  const createOptions = [
    { id: "collection", label: "Collection" },
    { id: "client", label: "Client" },
    { id: "self-photographer", label: "Self-photographer" },
    { id: "agency", label: "Agency" },
    { id: "photo-lab", label: "Photo lab" },
    { id: "edition-studio", label: "Edition studio" },
    { id: "hand-print-lab", label: "Hand print lab" },
  ]

  const handleCreateOption = (optionId: string) => {
    setCreateMenuOpen(false)
    
    switch (optionId) {
      case "collection":
        router.push("/create/collection")
        break
      case "client":
        router.push("/create/client")
        break
      case "self-photographer":
        setSelfPhotographerModalOpen(true)
        break
      case "agency":
        router.push("/create/agency")
        break
      case "photo-lab":
        router.push("/create/photo-lab")
        break
      case "edition-studio":
        router.push("/create/edition-studio")
        break
      case "hand-print-lab":
        router.push("/create/hand-print-lab")
        break
    }
    
    onCreateNew?.()
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
                  "Entities": "/entities",
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
          {/* Create new button - solo para variante noba */}
          {variant === "noba" && (
            <Popover open={createMenuOpen} onOpenChange={setCreateMenuOpen}>
              <PopoverTrigger asChild>
                <Button size="lg" className="rounded-xl gap-2 px-4">
                  <Plus className="size-4" />
                  Create new
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-[200px] p-1" 
                align="end"
                sideOffset={8}
              >
                <Command shouldFilter={false}>
                  <CommandList>
                    {createOptions.map((option) => (
                      <CommandItem
                        key={option.id}
                        value={option.label}
                        onSelect={() => handleCreateOption(option.id)}
                        className="cursor-pointer"
                      >
                        {option.label}
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}

          <Notifications
            hasNotifications={hasNotifications}
            onClick={onNotifications}
          />

          <div className="w-px h-5 bg-border" />

          <UserInformation
            userName={userName}
            organization={displayOrganization}
            role={variant === "photographer" ? "photographer" : role}
            isAdmin={isAdmin}
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

      {/* Self-photographer Modal */}
      {variant === "noba" && (
        <ModalWindow
          open={selfPhotographerModalOpen}
          onOpenChange={setSelfPhotographerModalOpen}
          title="New photographer"
          primaryLabel="Create"
          secondaryLabel="Cancel"
          onSecondaryClick={() => setSelfPhotographerModalOpen(false)}
        >
          <div className="p-5">
            <p className="text-sm text-muted-foreground">
              Self-photographer creation form will be implemented here.
            </p>
          </div>
        </ModalWindow>
      )}
    </nav>
  )
}

