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
import { useUserContext } from "@/lib/contexts/user-context"
import { useNavigationConfig } from "@/lib/hooks/use-navigation-config"
import { useAuthAdapter } from "@/lib/auth"
import { toast } from "sonner"
import { SearchCommand } from "../search-command"
import { UserCreationForm, type UserFormData } from "../user-creation-form"
import { EntityBasicInformationForm } from "../entity-basic-information-form"
import { ModalWindow } from "../modal-window"
import { parsePhoneNumber, mapEntityToFormData, mapFormToEntityDraft, mapFormToUpdateUserPayload } from "@/lib/utils/form-mappers"
import type { EntityBasicInformationFormData } from "@/lib/utils/form-mappers"
import { entityRequiresLocation, isStandardEntityType, type StandardEntityType } from "@/lib/types"
import { updateOrganizationFromDraft } from "@/app/actions/entity-creation"

interface CreationBlockParticipant {
  role: string
  name: string
}

interface CreationBlock {
  id: string
  title: string
  subtitle?: string
  variant?: "active" | "completed" | "disabled"
  content?: React.ReactNode
  /** Show participants summary in block header (uses ParticipantSummary) */
  showParticipants?: boolean
  /** Participants for summary (e.g. [{ role: "Client", name: "@zara" }]) */
  participants?: CreationBlockParticipant[]
  /** Callback when "Edit participants" is clicked in summary */
  onEditParticipants?: () => void
  primaryLabel?: string
  onPrimaryClick?: () => void
  primaryDisabled?: boolean
  /** Secondary button label (e.g. "Previous") */
  secondaryLabel?: string
  /** Callback when secondary button is clicked */
  onSecondaryClick?: () => void
  /** Callback when Edit button is clicked (for completed blocks) */
  onEdit?: () => void
}

/** Collection summary for create-collection sidebar variant */
interface CollectionSummaryForSidebar {
  name: string
  status?: "draft" | "upcoming" | "in-progress" | "completed" | "canceled"
  client?: string
  deadline?: string
  lastUpdate?: string
}

interface CreationTemplateProps {
  /** Title for the creation page */
  title?: string
  /** Breadcrumb items */
  breadcrumbs?: Array<{ label: string; href?: string }>
  /** Sidebar variant: create-entity (default) or create-collection */
  sidebarVariant?: "create-entity" | "create-collection"
  /** Collection summary for sidebar when sidebarVariant is create-collection */
  collectionSummary?: CollectionSummaryForSidebar
  /** Sidebar stepper items */
  sidebarItems?: Array<{ id: string; label: string }>
  /** Current active sidebar item */
  activeSidebarItem?: string
  /** Blocks to display */
  blocks?: CreationBlock[]
  /** Optional: step/block ids to show as completed in the sidebar (overrides derivation from blocks) */
  completedStepIds?: string[]
  /** Callback when a sidebar item is clicked */
  onSidebarItemClick?: (id: string) => void
  /** When create-collection: callback when Delete collection is clicked */
  onDeleteCollection?: () => void
  /** When create-collection: callback when Settings (collection config) is clicked */
  onSettingsCollection?: () => void
  /** When create-collection: callback when Publish collection is clicked */
  onPublishCollection?: () => void
  /** When create-collection: disable Publish until draft is complete */
  publishCollectionDisabled?: boolean
  /** NavBar props */
  navBarProps?: {
    variant?: "noba" | "collaborator" | "photographer"
    userName?: string
    organization?: string
    role?: string
    isAdmin?: boolean
    avatarSrc?: string
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
    { label: "Organizations", href: "/organizations" },
    { label: "Create Entity" },
  ],
  sidebarVariant = "create-entity",
  collectionSummary,
  sidebarItems = [
    { id: "step-1", label: "Step 1" },
    { id: "step-2", label: "Step 2" },
    { id: "step-3", label: "Step 3" },
  ],
  activeSidebarItem,
  blocks = [],
  completedStepIds,
  onSidebarItemClick,
  onDeleteCollection,
  onSettingsCollection,
  onPublishCollection,
  publishCollectionDisabled = true,
  navBarProps,
  className,
}: CreationTemplateProps) {
  const router = useRouter()
  const authAdapter = useAuthAdapter()
  const userContext = useUserContext()
  const navConfig = useNavigationConfig(userContext.entity?.type ?? null)

  // State for profile edit modal
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false)
  const [isUpdatingProfile, setIsUpdatingProfile] = React.useState(false)

  // State for company edit modal
  const [isCompanyModalOpen, setIsCompanyModalOpen] = React.useState(false)
  const [isUpdatingCompany, setIsUpdatingCompany] = React.useState(false)
  const [companyFormData, setCompanyFormData] = React.useState<EntityBasicInformationFormData | null>(null)
  const [isCompanyFormValid, setIsCompanyFormValid] = React.useState(false)

  // State for search command
  const [isSearchOpen, setIsSearchOpen] = React.useState(false)

  // Handle logout
  const handleLogout = React.useCallback(async () => {
    try {
      await authAdapter.logout()
      // Dispatch session-changed event to notify UserContext
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("session-changed"))
      }
      // Redirect to login page
      router.push("/auth/login")
    } catch (error) {
      console.error("Failed to logout:", error)
      // Still redirect to login even if logout fails
      router.push("/auth/login")
    }
  }, [authAdapter, router])

  // Handle edit profile
  const handleEditProfile = React.useCallback(() => {
    setIsProfileModalOpen(true)
  }, [])

  // Handle edit company - initialize form data when opening
  const handleEditCompany = React.useCallback(() => {
    if (userContext?.entity && isStandardEntityType(userContext.entity.type)) {
      const formData = mapEntityToFormData(userContext.entity)
      setCompanyFormData(formData)
      setIsCompanyModalOpen(true)
    }
  }, [userContext?.entity])

  // Handle company form data change
  const handleCompanyFormDataChange = React.useCallback((data: EntityBasicInformationFormData) => {
    setCompanyFormData(data)
  }, [])

  // Handle company form validation change
  const handleCompanyFormValidationChange = React.useCallback((isValid: boolean) => {
    setIsCompanyFormValid(isValid)
  }, [])

  // Handle company update
  const handleCompanyUpdate = React.useCallback(async () => {
    if (!userContext?.entity || !companyFormData || !isCompanyFormValid) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsUpdatingCompany(true)
    try {
      const draft = mapFormToEntityDraft(companyFormData)
      await updateOrganizationFromDraft(userContext.entity.id, draft)

      // Dispatch session-changed event to refresh UserContext
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("session-changed"))
      }

      // Close modal
      setIsCompanyModalOpen(false)

      // Show success toast
      toast.success("Company details updated successfully", {
        description: "Your company information has been updated.",
      })
    } catch (error) {
      console.error("Failed to update company details:", error)
      toast.error("Failed to update company details", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsUpdatingCompany(false)
    }
  }, [userContext?.entity, companyFormData, isCompanyFormValid])

  // Handle profile update
  const handleProfileUpdate = React.useCallback(async (userData: UserFormData) => {
    if (!userContext?.user) {
      toast.error("User information not available")
      return
    }

    setIsUpdatingProfile(true)
    try {
      let profilePictureUrl: string | undefined
      if (userData.profilePicture) {
        const formData = new FormData()
        formData.append("file", userData.profilePicture)
        const uploadRes = await fetch(`/api/users/${userContext.user.id}/profile-picture`, {
          method: "POST",
          body: formData,
        })
        const uploadData = await uploadRes.json().catch(() => ({}))
        if (!uploadRes.ok) throw new Error(uploadData.error ?? "Failed to upload profile picture")
        profilePictureUrl = uploadData.profilePictureUrl
      }
      const payload = mapFormToUpdateUserPayload(userData, profilePictureUrl)
      const res = await fetch(`/api/users/${userContext.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Failed to update user")

      // Dispatch session-changed event to refresh UserContext
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("session-changed"))
      }

      // Close modal
      setIsProfileModalOpen(false)

      // Show success toast
      toast.success("Profile updated successfully", {
        description: "Your profile information has been updated.",
      })
    } catch (error) {
      console.error("Failed to update profile:", error)
      toast.error("Failed to update profile", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsUpdatingProfile(false)
    }
  }, [userContext?.user])

  // Determine NavBar props: prioritize userContext if available, then navBarProps, then defaults
  // Only use navBarProps if userContext is not available (for backward compatibility)
  const variant = userContext?.navBarVariant || navConfig?.navBarVariant || navBarProps?.variant || "noba"
  
  // Build userName from firstName and lastName, handling empty lastName
  const userName = React.useMemo(() => {
    if (userContext?.user) {
      const firstName = (userContext.user.firstName || "").trim()
      const lastName = (userContext.user.lastName || "").trim()
      
      // If both firstName and lastName exist, combine them
      if (firstName && lastName) {
        return `${firstName} ${lastName}`
      }
      // If only firstName exists, use it
      if (firstName) {
        return firstName
      }
      // If only lastName exists, use it
      if (lastName) {
        return lastName
      }
      // Fallback to email or "User"
      return userContext.user.email?.split("@")[0] || "User"
    }
    return navBarProps?.userName || "User"
  }, [userContext?.user?.firstName, userContext?.user?.lastName, userContext?.user?.email, navBarProps?.userName])
  
  const organization = userContext?.entity?.name || navBarProps?.organization
  const role = userContext?.user?.role || navBarProps?.role || "admin"
  // Calculate isAdmin dynamically from role - only "admin" role can access company details
  // This ensures editor and viewer roles cannot see "Company details" option
  const isAdmin = React.useMemo(() => {
    const userRole = role?.toLowerCase()
    // Only explicitly "admin" role should be considered admin
    return userRole === "admin"
  }, [role])

  return (
    <div className={cn("flex flex-col h-screen w-full bg-background overflow-hidden", className)}>
      {/* NavBar */}
      <NavBar
        variant={variant}
        userName={userName}
        organization={organization}
        role={role}
        isAdmin={isAdmin}
        isSelfPhotographer={userContext?.isSelfPhotographer || false}
        avatarSrc={userContext?.user?.profilePictureUrl || navBarProps?.avatarSrc}
        onEditProfile={handleEditProfile}
        onEditCompany={handleEditCompany}
        onLogout={handleLogout}
        onSearch={() => setIsSearchOpen(true)}
      />

      {/* Content Container with background pattern */}
      <div className="flex-1 flex flex-col bg-sidebar relative min-h-0 overflow-hidden">
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
        <div className="border-border px-6 py-8 relative z-10 shrink-0">
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
        <div className="flex-1 flex overflow-visible relative min-h-0">
          {/* Sidebar Container with padding */}
          <aside className="w-[320px] shrink-0 px-4 pb-4 relative z-10 flex flex-col min-h-0">
            <div className="h-full max-h-full rounded-xl overflow-hidden flex flex-col">
              {sidebarVariant === "create-collection" ? (
                <SideBar
                  type="create-collection"
                  title="Set up collection"
                  items={sidebarItems}
                  activeId={activeSidebarItem || sidebarItems[0]?.id}
                  completedItems={
                    completedStepIds ??
                    blocks
                      .map((block, index) => {
                        const sidebarItem = sidebarItems[index]
                        if (block.variant === "completed" && sidebarItem) {
                          return sidebarItem.id
                        }
                        return null
                      })
                      .filter((id): id is string => id !== null)
                  }
                  collection={collectionSummary ?? { name: title }}
                  onItemClick={onSidebarItemClick}
                  onDelete={onDeleteCollection}
                  deleteLabel="Delete collection"
                  onSettingsCollection={onSettingsCollection}
                  onPublish={onPublishCollection}
                  publishDisabled={publishCollectionDisabled}
                />
              ) : (
                <SideBar
                  type="create-entity"
                  title={title}
                  items={sidebarItems}
                  activeId={activeSidebarItem || sidebarItems[0]?.id}
                  completedItems={
                    completedStepIds ??
                    blocks
                      .map((block, index) => {
                        const sidebarItem = sidebarItems[index]
                        if (block.variant === "completed" && sidebarItem) {
                          return sidebarItem.id
                        }
                        return null
                      })
                      .filter((id): id is string => id !== null)
                  }
                  onItemClick={onSidebarItemClick}
                  deleteLabel="Delete"
                />
              )}
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 overflow-y-auto relative z-10 min-w-0">
            <div className="px-6 space-y-0 pb-[45px]">
              {blocks.map((block, index) => (
                <React.Fragment key={block.id}>
                  <BlockTemplate
                    mode="creation"
                    variant={block.variant || "active"}
                    currentVariant={block.variant || "active"}
                    title={block.title}
                    subtitle={block.subtitle}
                    showParticipants={block.showParticipants}
                    participants={block.participants}
                    onEditParticipants={block.onEditParticipants}
                    primaryLabel={block.primaryLabel}
                    onPrimaryClick={block.onPrimaryClick}
                    primaryDisabled={block.primaryDisabled}
                    secondaryLabel={block.secondaryLabel}
                    onSecondaryClick={block.onSecondaryClick}
                    onEdit={block.onEdit}
                  >
                    {block.content}
                  </BlockTemplate>
                  {index < blocks.length - 1 && (
                    <div className="flex justify-center">
                      <StepConnector
                        status="uncompleted"
                        orientation="vertical"
                        className="h-5"
                      />
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

      {/* Profile Edit Modal */}
      {userContext?.user && userContext?.entity && (
        <UserCreationForm
          open={isProfileModalOpen}
          onOpenChange={(open) => {
            if (!open) setIsProfileModalOpen(false)
          }}
          mode="edit"
          initialUserData={userContext.user}
          entity={{
            type: userContext.entity.type,
            name: userContext.entity.name,
          }}
          isAdminUser={false}
          onSubmit={handleProfileUpdate}
          onCancel={() => setIsProfileModalOpen(false)}
          primaryLabel="Save changes"
          secondaryLabel="Cancel"
        />
      )}

      {/* Company Edit Modal */}
      {userContext?.entity && companyFormData && isStandardEntityType(userContext.entity.type) && (
        <ModalWindow
          open={isCompanyModalOpen}
          onOpenChange={(open) => {
            if (!open) setIsCompanyModalOpen(false)
          }}
          title="Edit Company Details"
          subtitle="Update your company's basic information"
          primaryLabel="Save changes"
          secondaryLabel="Cancel"
          showSecondary={true}
          primaryDisabled={!isCompanyFormValid || isUpdatingCompany}
          onPrimaryClick={handleCompanyUpdate}
          onSecondaryClick={() => setIsCompanyModalOpen(false)}
          width="644px"
        >
          <div className="p-5">
            <EntityBasicInformationForm
              entityType={userContext.entity.type}
              initialData={companyFormData}
              showLocation={entityRequiresLocation(userContext.entity.type)}
              disabled={isUpdatingCompany}
              onDataChange={handleCompanyFormDataChange}
              onValidationChange={handleCompanyFormValidationChange}
            />
          </div>
        </ModalWindow>
      )}

      {/* Search Command */}
      <SearchCommand
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
      />
    </div>
  )
}

export type { CreationTemplateProps, CreationBlock }
