"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { NavBar } from "../nav-bar"
import { Titles } from "../titles"
import { Layout, LayoutSection, LayoutSlot } from "../layout"

interface MainTemplateProps {
  /** Page title */
  title?: string
  /** Page content */
  children?: React.ReactNode
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
 * Main Template
 * 
 * Template for main pages (Collections, Entities, Team).
 * Structure: NavBar + Titles (main) + Layout
 */
export function MainTemplate({
  title = "Page Title",
  children,
  navBarProps,
  className,
}: MainTemplateProps) {
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <div className="py-8 px-6 w-full">
          <Layout padding="none" showSeparators={false}>
            <LayoutSection>
              <Titles type="main-section" title={title} showSubtitle={false} />
              {children || <LayoutSlot />}
            </LayoutSection>
          </Layout>
        </div>
      </main>
    </div>
  )
}

export type { MainTemplateProps }
