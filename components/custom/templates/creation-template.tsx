"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { NavBar } from "../nav-bar"
import { SideBar } from "../side-bar"
import { BlockTemplate } from "../block"
import { StepConnector } from "../step-connector"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

interface CreationBlock {
  id: string
  title: string
  subtitle?: string
  variant?: "active" | "completed" | "disabled"
  content?: React.ReactNode
}

interface CreationTemplateProps {
  /** Title for the creation page */
  title?: string
  /** Breadcrumb items */
  breadcrumbs?: Array<{ label: string; href?: string }>
  /** Sidebar stepper items */
  sidebarItems?: Array<{ id: string; label: string }>
  /** Current active sidebar item */
  activeSidebarItem?: string
  /** Blocks to display */
  blocks?: CreationBlock[]
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
 * Creation Template
 * 
 * Template for creation flows.
 * Structure: NavBar + Breadcrumb + SideBar (create-entity) + Blocks with StepConnector
 */
export function CreationTemplate({
  title = "Create new entity",
  breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Entities", href: "/entities" },
    { label: "Create Entity" },
  ],
  sidebarItems = [
    { id: "step-1", label: "Step 1" },
    { id: "step-2", label: "Step 2" },
    { id: "step-3", label: "Step 3" },
  ],
  activeSidebarItem,
  blocks = [],
  navBarProps,
  className,
}: CreationTemplateProps) {
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
        <div className="border-border px-6 py-8 relative z-10">
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
                type="create-entity"
                title={title}
                items={sidebarItems}
                activeId={activeSidebarItem || sidebarItems[0]?.id}
                deleteLabel="Delete"
              />
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 overflow-y-auto relative z-10">
            <div className="px-6 space-y-0">
              {blocks.map((block, index) => (
                <React.Fragment key={block.id}>
                  <BlockTemplate
                    mode="creation"
                    variant={block.variant || "active"}
                    title={block.title}
                    subtitle={block.subtitle}
                  >
                    {block.content}
                  </BlockTemplate>
                  {index < blocks.length - 1 && (
                    <div className="flex justify-center">
                      <StepConnector status="uncompleted" orientation="vertical" className="h-5" />
                    </div>
                  )}
                </React.Fragment>
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

export type { CreationTemplateProps, CreationBlock }
