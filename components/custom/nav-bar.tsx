"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Search, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Notifications } from "./notifications"
import { UserInformation } from "./user-information"
import { CreateEntityCommand } from "./create-entity-command"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet"
import { roleToLabel } from "@/lib/types"

const mobileMenuRowClass =
  "flex items-center h-10 w-full px-3 text-sm font-medium text-foreground rounded-xl hover:bg-muted transition-colors text-left"

const logoNavButtonClass =
  "shrink-0 rounded-md p-0 border-0 bg-transparent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

/** Same PNG + dimensions for desktop (≥940px) and mobile nav. */
function NavBarLogoImage({ className }: { className?: string }) {
  return (
    <Image
      src="/assets/Logo.png"
      alt="noba"
      width={160}
      height={40}
      className={cn(
        "h-8 w-auto max-w-[min(52vw,220px)] min-[940px]:max-w-[240px] object-contain object-left shrink-0",
        className
      )}
      priority
    />
  )
}

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

  const handleLogoClick = () => {
    router.push("/collections")
    setIsMobileMenuOpen(false)
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
      <div className="hidden min-[940px]:flex items-center justify-between h-16 px-6 border-b border-border">
        {/* Left section: Logo + Tabs + Search */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={handleLogoClick}
            className={logoNavButtonClass}
            aria-label="Go to Collections"
          >
            <NavBarLogoImage />
          </button>
          
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
              className="flex items-center gap-2 h-10 px-4 pr-8 bg-secondary rounded-full w-fit text-sm font-medium text-secondary-foreground"
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

      {/* Mobile version - per Figma: Logo | Notifications | Pill (Avatar + Menu) */}
      <div className="flex min-[940px]:hidden items-center justify-between h-16 px-6 border-b border-border">
        {/* Left: Logo (PNG) → Collections */}
        <button
          type="button"
          onClick={handleLogoClick}
          className={logoNavButtonClass}
          aria-label="Go to Collections"
        >
          <NavBarLogoImage />
        </button>

        {/* Right: Notifications + Pill button (Avatar + Hamburger) */}
        <div className="flex items-center gap-4">
          <Notifications usePanel />

          {/* Pill-shaped button combining Avatar + Menu (Figma design) */}
          <button
            type="button"
            onClick={handleMenuClick}
            className="flex items-center gap-2 rounded-full border border-border px-2 py-1.5 transition-colors hover:bg-sidebar-background active:bg-accent"
            style={{ touchAction: 'manipulation' }}
            aria-label="Open menu"
          >
            <Avatar size="sm">
              {avatarSrc ? (
                <AvatarImage src={avatarSrc} alt={userName} />
              ) : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <Menu className="size-4 text-foreground shrink-0" />
          </button>
        </div>
      </div>

      {/* Mobile Menu Sheet — ModalWindow shell; Figma 1248-50640 layout inside */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          overlayClassName="bg-black/[0.36]"
          className={cn(
            // Same responsive shell as ModalWindow / NotificationsPanel: full width below 768px (inset-x-3), 380px from 768px up
            "p-0 gap-0 flex flex-col overflow-hidden shadow-xl rounded-xl bg-background",
            "fixed inset-x-3 top-3 bottom-3 z-50 w-auto max-w-none h-[calc(100vh-24px)]",
            "min-[768px]:left-auto min-[768px]:right-3 min-[768px]:inset-x-auto min-[768px]:w-[380px]",
            "data-open:animate-in data-closed:animate-out duration-300 ease-in-out",
            // Override sheet defaults so mobile matches ModalWindow (slide from bottom below 768px)
            "max-[767px]:data-[side=right]:data-closed:slide-out-to-bottom max-[767px]:data-[side=right]:data-open:slide-in-from-bottom",
            "min-[768px]:data-[side=right]:data-closed:slide-out-to-right min-[768px]:data-[side=right]:data-open:slide-in-from-right",
            "data-[side=right]:!top-3 data-[side=right]:!bottom-3 data-[side=right]:!h-[calc(100vh-24px)]",
            "max-[767px]:data-[side=right]:!inset-x-3 max-[767px]:data-[side=right]:!w-auto max-[767px]:data-[side=right]:!max-w-none",
            "min-[768px]:data-[side=right]:!left-auto min-[768px]:data-[side=right]:!right-3 min-[768px]:data-[side=right]:!w-[380px]"
          )}
        >
          <SheetTitle className="sr-only">Menu</SheetTitle>

          {/* Figma 1248-50640: header = user + close; nav; separator; account links. Search/Create hidden below 768px only. */}
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Top: avatar, name, org/role, close */}
            <div className="flex items-start justify-between gap-4 p-5 pb-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar size="sm">
                  {avatarSrc ? (
                    <AvatarImage src={avatarSrc} alt={userName} />
                  ) : null}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start gap-0.5 flex-1 min-w-0">
                  <span className="text-sm font-semibold leading-tight truncate w-full text-left text-foreground">
                    {userName}
                  </span>
                  <span className="text-xs leading-tight truncate w-full text-left">
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
              <SheetClose asChild>
                <Button variant="outline" size="icon" className="rounded-xl size-10 shrink-0">
                  <X className="size-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </SheetClose>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {/* Primary navigation */}
              <div className="px-2 py-2">
                <nav className="flex flex-col gap-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => handleTabClick(tab)}
                      className={mobileMenuRowClass}
                    >
                      {tab}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Creation/search flows: visible in sheet from 768px up (narrow phones: hidden). Desktop ≥940px unchanged. */}
              <div className="hidden min-[768px]:block px-6 pb-4 space-y-4">
                <button
                  type="button"
                  onClick={handleSearchClick}
                  className="flex items-center gap-2 h-10 w-full px-4 bg-secondary rounded-full text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  <Search className="size-4" />
                  <span>Search...</span>
                </button>
                {variant === "noba" && role?.toLowerCase() !== "viewer" && (
                  <CreateEntityCommand
                    buttonLabel="Create new"
                    popoverAlign="start"
                  />
                )}
              </div>

              <div className="mx-2 border-t border-border" aria-hidden />

              {/* Account actions — same row style as primary nav (Figma 1248-50640), not Command/popover */}
              <div className="px-2 py-2">
                <nav className="flex flex-col gap-1" aria-label="Account">
                  <button
                    type="button"
                    onClick={handleEditProfile}
                    className={mobileMenuRowClass}
                  >
                    Profile details
                  </button>
                  {isAdminUser && !isSelfPhotographer && (
                    <button
                      type="button"
                      onClick={handleEditCompany}
                      className={mobileMenuRowClass}
                    >
                      Company details
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={mobileMenuRowClass}
                  >
                    Logout
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

    </nav>
  )
}

