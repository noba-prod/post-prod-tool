"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { NavBar } from "../nav-bar"
import { SideBar } from "../side-bar"
import { BlockTemplate } from "../block"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Home, User } from "lucide-react"

interface ViewBlock {
  id: string
  title: string
  subtitle?: string
  variant?: "active" | "inactive"
  content?: React.ReactNode
}

interface ViewTemplateProps {
  /** Breadcrumb items */
  breadcrumbs?: Array<{ label: string; href?: string }>
  /** Sidebar menu items */
  sidebarItems?: Array<{ id: string; label: string; icon?: React.ComponentType<{ className?: string }> }>
  /** Current active sidebar item */
  activeSidebarItem?: string
  /** Entity data for sidebar */
  entity?: {
    name: string
    type?: string
    teamMembers?: number
    collections?: number
    lastUpdate?: string
  }
  /** Blocks to display */
  blocks?: ViewBlock[]
  /** NavBar props */
  navBarProps?: {
    variant?: "noba" | "collaborator" | "photographer"
    userName?: string
    organization?: string
    role?: string
    isAdmin?: boolean
  }
  className?: string
}

/**
 * View Template
 * 
 * Template for view flows.
 * Structure: NavBar + Breadcrumb + SideBar (view-entity) + Blocks with spacing
 */
export function ViewTemplate({
  breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Entities", href: "/entities" },
    { label: "View Entity" },
  ],
  sidebarItems = [
    { id: "overview", label: "Overview", icon: Home },
    { id: "details", label: "Details", icon: User },
  ],
  activeSidebarItem,
  entity = {
    name: "Entity Name",
    type: "Client",
    teamMembers: 5,
    collections: 12,
    lastUpdate: "2 days ago",
  },
  blocks = [],
  navBarProps,
  className,
}: ViewTemplateProps) {
  const router = useRouter()

  return (
    <div className={cn("flex flex-col min-h-screen w-full bg-background", className)}>
      {/* NavBar */}
      <NavBar
        variant={navBarProps?.variant || "noba"}
        userName={navBarProps?.userName || "Martin Becerra"}
        organization={navBarProps?.organization}
        role={navBarProps?.role || "admin"}
        isAdmin={navBarProps?.isAdmin || false}
      />

      {/* Content Container with background pattern */}
      <div className="flex-1 flex flex-col bg-sidebar relative">
        {/* Background pattern overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #000000 1.5px, transparent 1.5px)",
            backgroundSize: "25px 25px",
            opacity: 0.1,
          }}
        />
        
        {/* Breadcrumb */}
        <div className="px-6 py-8 relative z-10">
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  <BreadcrumbItem>
                    {crumb.href && index < breadcrumbs.length - 1 ? (
                      <BreadcrumbLink
                        href={crumb.href}
                        onClick={(e) => {
                          e.preventDefault()
                          router.push(crumb.href!)
                        }}
                      >
                        {crumb.label}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Main Layout: Sidebar + Content */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Sidebar Container with padding */}
          <aside className="w-[320px] shrink-0 px-4 pb-4 relative z-10 flex flex-col">
            <div className="h-full rounded-xl overflow-hidden">
              <SideBar
                type="view-entity"
                title={entity?.type ? `${entity.type} details` : "Entity details"}
                items={sidebarItems.map((item) => ({
                  id: item.id,
                  label: item.label,
                  icon: item.icon,
                }))}
                activeId={activeSidebarItem || sidebarItems[0]?.id}
                entity={entity}
                deleteLabel="Delete Entity"
              />
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 overflow-y-auto relative z-10">
            <div className="px-6 pt-0 pb-0 space-y-6">
              {blocks.map((block) => (
                <BlockTemplate
                  key={block.id}
                  mode="view"
                  variant={block.variant || "active"}
                  title={block.title}
                  subtitle={block.subtitle}
                >
                  {block.content}
                </BlockTemplate>
              ))}
              {blocks.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  No blocks defined
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export type { ViewTemplateProps, ViewBlock }
