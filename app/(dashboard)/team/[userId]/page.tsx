"use client"

import * as React from "react"
import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { MainTemplate } from "@/components/custom/templates/main-template"
import { Layout, LayoutSection } from "@/components/custom/layout"
import { Button } from "@/components/ui/button"
import { UserCreationForm } from "@/components/custom/user-creation-form"
import { useAuthAdapter } from "@/lib/auth"
import type { Session } from "@/lib/auth/adapter"
import { useUserContext } from "@/lib/contexts/user-context"
import { getRepositoryInstances } from "@/lib/services"
import { roleToLabel } from "@/lib/types"
import { mapFormToUpdateUserPayload } from "@/lib/utils/form-mappers"
import { toast } from "sonner"
import type { User } from "@/lib/types"
import { ArrowLeft, Pencil } from "lucide-react"

const USE_MOCK_AUTH = process.env.NEXT_PUBLIC_USE_MOCK_AUTH !== "false"

export default function TeamMemberProfilePage() {
  const router = useRouter()
  const params = useParams()
  const userId = typeof params?.userId === "string" ? params.userId : null
  const authAdapter = useAuthAdapter()
  const userContext = useUserContext()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const canEdit = userContext.user?.role === "admin" || userContext.user?.role === "editor"

  const loadUser = useCallback(async () => {
    if (!userId) return
    setLoadingUser(true)
    try {
      if (USE_MOCK_AUTH) {
        const repos = getRepositoryInstances()
        if (!repos.userRepository) {
          setUser(null)
          return
        }
        const u = await repos.userRepository.getUserById(userId)
        if (!u) {
          setUser(null)
          return
        }
        if (userContext.user?.entityId && u.entityId !== userContext.user.entityId) {
          setUser(null)
          return
        }
        setUser(u)
      } else {
        const res = await fetch(`/api/users/${userId}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          if (res.status === 404) setUser(null)
          else throw new Error(data.error ?? "Failed to load user")
          return
        }
        const data = await res.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error("Failed to load user:", error)
      setUser(null)
      toast.error("Failed to load profile", {
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      })
    } finally {
      setLoadingUser(false)
    }
  }, [userId, userContext.user?.entityId])

  useEffect(() => {
    if (userId && !userContext.loading) {
      loadUser()
    }
  }, [userId, userContext.loading, loadUser])

  useEffect(() => {
    const checkSession = async () => {
      const currentSession = await authAdapter.getSession()
      if (!currentSession) {
        router.push("/auth/login")
        return
      }
      setSession(currentSession)
      setLoading(false)
    }
    checkSession()
  }, [router, authAdapter])

  const handleUpdateUser = useCallback(
    async (userData: {
      firstName: string
      lastName: string
      email: string
      phoneNumber: string
      countryCode: string
      entity: { type: string; name: string } | null
      role: "admin" | "editor" | "viewer"
    }) => {
      if (!userId || !userContext.entity) return
      setIsSaving(true)
      try {
        const payload = mapFormToUpdateUserPayload({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phoneNumber: userData.phoneNumber,
          countryCode: userData.countryCode,
          entity: userData.entity
            ? { type: userData.entity.type as import("@/lib/types").StandardEntityType, name: userData.entity.name }
            : null,
          role: userData.role,
        })
        if (USE_MOCK_AUTH) {
          const repos = getRepositoryInstances()
          if (!repos.userRepository) throw new Error("User repository not available")
          const updated = await repos.userRepository.updateUser(userId, payload)
          if (updated) {
            setUser(updated)
            setIsEditModalOpen(false)
            toast.success("User updated", {
              description: `${updated.firstName} ${updated.lastName ?? ""}`.trim() + " has been updated.",
            })
          } else {
            throw new Error("User not found")
          }
        } else {
          const res = await fetch(`/api/users/${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(data.error ?? "Failed to update user")
          setUser(data.user)
          setIsEditModalOpen(false)
          toast.success("User updated", {
            description: `${data.user.firstName} ${data.user.lastName ?? ""}`.trim() + " has been updated.",
          })
        }
      } catch (error) {
        console.error("Failed to update user:", error)
        toast.error("Failed to update user", {
          description: error instanceof Error ? error.message : "An unexpected error occurred.",
        })
      } finally {
        setIsSaving(false)
      }
    },
    [userId, userContext.entity]
  )

  if (loading || userContext.loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!session) return null

  if (!userContext.canAccessTeam) {
    router.replace("/team")
    return null
  }

  if (!userId) {
    router.replace("/team")
    return null
  }

  if (loadingUser) {
    return (
      <MainTemplate>
        <Layout padding="none" showSeparators={false}>
          <LayoutSection>
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">Loading profile...</p>
            </div>
          </LayoutSection>
        </Layout>
      </MainTemplate>
    )
  }

  if (!user) {
    return (
      <MainTemplate>
        <Layout padding="none" showSeparators={false}>
          <LayoutSection>
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <p className="text-muted-foreground">User not found or you don’t have access.</p>
              <Button asChild variant="outline">
                <Link href="/team">Back to team</Link>
              </Button>
            </div>
          </LayoutSection>
        </Layout>
      </MainTemplate>
    )
  }

  const displayName = `${user.firstName} ${user.lastName ?? ""}`.trim() || "No name"

  return (
    <MainTemplate>
      <Layout padding="none" showSeparators={false}>
        <LayoutSection>
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild className="shrink-0">
                <Link href="/team" aria-label="Back to team">
                  <ArrowLeft className="size-5" />
                </Link>
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-semibold text-foreground truncate">{displayName}</h1>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              </div>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditModalOpen(true)}
                  className="shrink-0"
                >
                  <Pencil className="size-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>

            <div className="rounded-lg border bg-card p-6 space-y-4 max-w-xl">
              <div className="grid gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</span>
                <p className="text-foreground">{displayName}</p>
              </div>
              <div className="grid gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</span>
                <p className="text-foreground">{user.email}</p>
              </div>
              <div className="grid gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</span>
                <p className="text-foreground">{user.phoneNumber || "—"}</p>
              </div>
              <div className="grid gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</span>
                <p className="text-foreground">{roleToLabel(user.role)}</p>
              </div>
            </div>
          </div>
        </LayoutSection>
      </Layout>

      {userContext.entity && (
        <UserCreationForm
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          mode="edit"
          entity={{ type: userContext.entity.type, name: userContext.entity.name }}
          initialUserData={user}
          disabled={!canEdit}
          onSubmit={handleUpdateUser}
          onCancel={() => setIsEditModalOpen(false)}
          primaryLabel="Save changes"
        />
      )}
    </MainTemplate>
  )
}
