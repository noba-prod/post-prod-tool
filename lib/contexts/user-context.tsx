"use client"

import * as React from "react"
import type { User, Entity } from "@/lib/types"
import { useAuthAdapter } from "@/lib/auth"
import { fetchSupabaseUserData } from "@/lib/services"

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
  /** Derived: true if user can create collections (organization_id = noba producer org AND is_internal = true) */
  isNobaProducerUser: boolean
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
  const [isNobaProducerUser, setIsNobaProducerUser] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  // Load user and entity data when session changes
  React.useEffect(() => {
    let cancelled = false

    async function loadUserData() {
      setLoading(true)

      try {
        const session = await authAdapter.getSession()

        if (!session || !session.userId) {
          if (!cancelled) {
            setUser(null)
            setEntity(null)
            setIsNobaProducerUser(false)
            setLoading(false)
          }
          return
        }

        const userData = await fetchSupabaseUserData(session.userId)

        if (cancelled) return

        if (!userData) {
          console.warn(`[UserContext] User data not found for userId: ${session.userId}`)
          setUser(null)
          setEntity(null)
          setIsNobaProducerUser(false)
          setLoading(false)
          return
        }

        setUser(userData.user)
        setEntity(userData.entity)
        setIsNobaProducerUser("isNobaProducerUser" in userData && userData.isNobaProducerUser === true)
        setLoading(false)
      } catch (error) {
        console.error("[UserContext] Failed to load user data:", error)
        if (!cancelled) {
          setUser(null)
          setEntity(null)
          setIsNobaProducerUser(false)
          setLoading(false)
        }
      }
    }

    loadUserData()

    const handleCustomStorageChange = () => {
      loadUserData()
    }

    window.addEventListener("session-changed", handleCustomStorageChange)

    return () => {
      cancelled = true
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
      isNobaProducerUser,
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
      isNobaProducerUser,
      isSelfPhotographer,
      canAccessEntities,
      canAccessTeam,
      navBarVariant,
    ]
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}
