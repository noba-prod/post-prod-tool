"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { NavBar } from "../nav-bar"
import { Titles } from "../titles"
import { Layout, LayoutSection, LayoutSlot } from "../layout"
import { UserCreationForm, type UserFormData } from "../user-creation-form"
import { EntityBasicInformationForm } from "../entity-basic-information-form"
import { ModalWindow } from "../modal-window"
import { SearchCommand } from "../search-command"
import { useUserContext } from "@/lib/contexts/user-context"
import { useNavigationConfig } from "@/lib/hooks/use-navigation-config"
import { useAuthAdapter } from "@/lib/auth"
import { getRepositoryInstances } from "@/lib/services"
import { toast } from "sonner"
import { parsePhoneNumber, mapEntityToFormData, mapFormToEntityDraft } from "@/lib/utils/form-mappers"
import type { EntityBasicInformationFormData } from "@/lib/utils/form-mappers"
import { entityRequiresLocation, isStandardEntityType, type StandardEntityType } from "@/lib/types"
import { updateOrganizationFromDraft } from "@/app/actions/entity-creation"

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
 * 
 * Uses UserContext to determine navigation props dynamically.
 * Falls back to navBarProps if provided (for backward compatibility).
 */
export function MainTemplate({
  title,
  children,
  navBarProps,
  className,
}: MainTemplateProps) {
  const router = useRouter()
  const authAdapter = useAuthAdapter()
  
  // Use UserContext - it should always be available in dashboard pages
  let userContext: ReturnType<typeof useUserContext> | null = null
  let navConfig: ReturnType<typeof useNavigationConfig> | null = null
  
  try {
    userContext = useUserContext()
    navConfig = useNavigationConfig(userContext.entity?.type ?? null)
  } catch (error) {
    // UserContext not available, will use navBarProps fallback
    console.warn("UserContext not available in MainTemplate, using fallback props:", error)
  }

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
      const repos = getRepositoryInstances()
      if (!repos.entityRepository) {
        throw new Error("Entity repository not available")
      }

      // Convert form data to entity draft
      const draft = mapFormToEntityDraft(companyFormData)

      // Update entity: try in-memory repo first (mock auth); if null, update in Supabase (real auth)
      let updatedEntity = repos.entityRepository
        ? await repos.entityRepository.updateEntity(userContext.entity.id, draft)
        : null

      if (!updatedEntity) {
        const result = await updateOrganizationFromDraft(userContext.entity.id, draft)
        updatedEntity = result.entity
      }

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
      const repos = getRepositoryInstances()
      if (!repos.userRepository) {
        throw new Error("User repository not available")
      }

      // Update user data (email, entityId, and role cannot be changed by user editing their own profile)
      const phoneNumber = `${userData.countryCode} ${userData.phoneNumber}`.trim()
      
      const updatedUser = await repos.userRepository.updateUser(userContext.user.id, {
        firstName: userData.firstName.trim(),
        lastName: userData.lastName?.trim() || undefined,
        phoneNumber: phoneNumber,
        // Note: email, entityId, and role are not updated when user edits their own profile
      })

      if (!updatedUser) {
        throw new Error("Failed to update user")
      }

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
    <div className={cn("flex flex-col min-h-screen w-full bg-background", className)}>
      {/* NavBar */}
      <NavBar
        variant={variant}
        userName={userName}
        organization={organization}
        role={role}
        isAdmin={isAdmin}
        isSelfPhotographer={userContext?.isSelfPhotographer || false}
        onEditProfile={handleEditProfile}
        onEditCompany={handleEditCompany}
        onLogout={handleLogout}
        onSearch={() => setIsSearchOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <div className="py-8 px-6 w-full">
          <Layout padding="none" showSeparators={false}>
            <LayoutSection>
              {title && <Titles type="main-section" title={title} showSubtitle={false} />}
              {children || <LayoutSlot />}
            </LayoutSection>
          </Layout>
        </div>
      </main>

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

export type { MainTemplateProps }
