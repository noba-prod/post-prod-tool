"use client"

import * as React from "react"
import type { User, Entity } from "@/lib/types"
import { useAuthAdapter } from "@/lib/auth"
import { getRepositoryInstances, fetchSupabaseUserData } from "@/lib/services"

// Check if using mock auth
const USE_MOCK_AUTH = process.env.NEXT_PUBLIC_USE_MOCK_AUTH !== "false"

/**
 * User context value interface.
 * Enriches basic Session with User and Entity data from repositories.
 */
interface UserContextValue {
  /** Current user data (null if not loaded or not logged in) */
  user: User | null
  /** Current user's entity (null if user not loaded) */
  entity: Entity | null
  /** Loading state while fetching user/entity data */
  loading: boolean
  /** Derived: true if user belongs to noba entity */
  isNobaUser: boolean
  /** Derived: true if user is a self-photographer */
  isSelfPhotographer: boolean
  /** Derived: true if user can access Entities section (only noba users) */
  canAccessEntities: boolean
  /** Derived: true if user can access Team section (all except self-photographer) */
  canAccessTeam: boolean
  /** Derived: NavBar variant based on entity type */
  navBarVariant: "noba" | "collaborator" | "photographer"
}

/**
 * User context for accessing current user and entity data.
 * Must be used within UserContextProvider.
 */
const UserContext = React.createContext<UserContextValue | null>(null)

/**
 * Hook to access user context.
 * @throws Error if used outside UserContextProvider
 */
export function useUserContext(): UserContextValue {
  const context = React.useContext(UserContext)
  if (!context) {
    throw new Error("useUserContext must be used within UserContextProvider")
  }
  return context
}

interface UserContextProviderProps {
  children: React.ReactNode
}

/**
 * Provider component that enriches Session with User and Entity data.
 * 
 * Flow:
 * 1. Reads Session from auth adapter
 * 2. Fetches User from userRepository using session.userId
 * 3. Fetches Entity from entityRepository using user.entityId
 * 4. Provides enriched context to children
 */
export function UserContextProvider({ children }: UserContextProviderProps) {
  const authAdapter = useAuthAdapter()
  const [user, setUser] = React.useState<User | null>(null)
  const [entity, setEntity] = React.useState<Entity | null>(null)
  const [loading, setLoading] = React.useState(true)

  // Load user and entity data when session changes
  React.useEffect(() => {
    let cancelled = false

    async function loadUserDataFromMock(session: { userId: string; email: string }) {
      // Get repository instances (mock/in-memory)
      const { userRepository, entityRepository } = getRepositoryInstances()
      
      if (!userRepository || !entityRepository) {
        console.warn("Repositories not initialized")
        return null
      }

      // Fetch user by ID first, if not found try by email as fallback
      let fetchedUser = await userRepository.getUserById(session.userId)
      
      // Fallback: if user not found by ID, try to find by email
      if (!fetchedUser && session.email) {
        const allUsers = await userRepository.getAllUsers()
        fetchedUser = allUsers.find(
          (u) => u.email.toLowerCase() === session.email.toLowerCase()
        ) || null
        
        if (fetchedUser) {
          console.log(`[UserContext] Found user by email fallback: ${fetchedUser.id} for email ${session.email}`)
        }
      }
      
      if (!fetchedUser) {
        console.warn(`[UserContext] User not found for userId: ${session.userId}, email: ${session.email}`)
        return null
      }

      console.log(`[UserContext] Loaded user: ${fetchedUser.id}, entityId: ${fetchedUser.entityId}, entityType: ${fetchedUser.entityId ? 'loading...' : 'none'}`)

      // Fetch entity
      let fetchedEntity = null
      if (fetchedUser.entityId) {
        fetchedEntity = await entityRepository.getEntityById(fetchedUser.entityId)
        
        if (fetchedEntity) {
          console.log(`[UserContext] Loaded entity: ${fetchedEntity.id}, type: ${fetchedEntity.type}, name: ${fetchedEntity.name}`)
        } else {
          console.warn(`[UserContext] Entity not found for entityId: ${fetchedUser.entityId}`)
        }
      }

      return { user: fetchedUser, entity: fetchedEntity }
    }

    async function loadUserData() {
      setLoading(true)
      
      try {
        const session = await authAdapter.getSession()
        
        if (!session || !session.userId) {
          if (!cancelled) {
            setUser(null)
            setEntity(null)
            setLoading(false)
          }
          return
        }

        let userData: { user: User; entity: Entity | null } | null = null

        if (USE_MOCK_AUTH) {
          // Use mock/in-memory repositories
          userData = await loadUserDataFromMock(session)
        } else {
          // Use Supabase to fetch profile and organization data
          console.log(`[UserContext] Fetching user data from Supabase for userId: ${session.userId}`)
          userData = await fetchSupabaseUserData(session.userId)
        }
        
        if (cancelled) return

        if (!userData) {
          console.warn(`[UserContext] User data not found for userId: ${session.userId}`)
          setUser(null)
          setEntity(null)
          setLoading(false)
          return
        }

        setUser(userData.user)
        setEntity(userData.entity)
        setLoading(false)
      } catch (error) {
        console.error("[UserContext] Failed to load user data:", error)
        if (!cancelled) {
          setUser(null)
          setEntity(null)
          setLoading(false)
        }
      }
    }

    loadUserData()

    // Listen for storage changes (when session is updated in another tab or same tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "mock_auth_session") {
        loadUserData()
      }
    }

    // Also listen for custom storage events (for same-tab updates)
    const handleCustomStorageChange = () => {
      loadUserData()
    }

    window.addEventListener("storage", handleStorageChange)
    // Listen for custom event dispatched when session changes in same tab
    window.addEventListener("session-changed", handleCustomStorageChange)

    return () => {
      cancelled = true
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("session-changed", handleCustomStorageChange)
    }
  }, [authAdapter])

  // Derived values
  const isNobaUser = React.useMemo(() => entity?.type === "noba", [entity])
  const isSelfPhotographer = React.useMemo(
    () => entity?.type === "self-photographer",
    [entity]
  )
  const canAccessEntities = React.useMemo(() => isNobaUser, [isNobaUser])
  const canAccessTeam = React.useMemo(() => !isSelfPhotographer, [isSelfPhotographer])
  
  const navBarVariant = React.useMemo<"noba" | "collaborator" | "photographer">(() => {
    if (isNobaUser) return "noba"
    if (isSelfPhotographer) return "photographer"
    return "collaborator"
  }, [isNobaUser, isSelfPhotographer])

  const value: UserContextValue = React.useMemo(
    () => ({
      user,
      entity,
      loading,
      isNobaUser,
      isSelfPhotographer,
      canAccessEntities,
      canAccessTeam,
      navBarVariant,
    }),
    [
      user,
      entity,
      loading,
      isNobaUser,
      isSelfPhotographer,
      canAccessEntities,
      canAccessTeam,
      navBarVariant,
    ]
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}
