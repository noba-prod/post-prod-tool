"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { mockAuthAdapter } from "@/lib/auth/mock-adapter"
import { createEntityCreationService } from "@/lib/services"
import { seedTestUser } from "@/lib/utils/test-seed"
import type { EntityType, Role } from "@/lib/types"
import { ENTITY_TYPE_DISPLAY_NAMES, ALL_ROLES, entityTypeToLabel, roleToLabel } from "@/lib/types"
import { toast } from "sonner"
import { Copy, Check, Trash2 } from "lucide-react"

export default function AuthSeedPage() {
  const [internalEmail, setInternalEmail] = useState("")
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")
  const [collectionId, setCollectionId] = useState("collection-1")
  const [invitationUrl, setInvitationUrl] = useState("")
  const [copied, setCopied] = useState(false)

  // Initialize service to ensure repositories are ready
  useEffect(() => {
    createEntityCreationService()
  }, [])

  const handleAddInternal = async () => {
    if (!internalEmail.trim()) {
      toast.error("Please enter an email")
      return
    }

    // If EntityType and Role are selected, use seedTestUser
    if (selectedEntityType) {
      try {
        const result = await seedTestUser(
          internalEmail,
          selectedEntityType,
          selectedEntityType === "self-photographer" ? undefined : selectedRole || undefined
        )
        
        await mockAuthAdapter.addInternalEmail(internalEmail)
        await mockAuthAdapter.markEmailVerified(internalEmail)
        
        const roleDisplay = selectedEntityType === "self-photographer" 
          ? "admin (photographer)" 
          : roleToLabel(selectedRole!)
        
        toast.success(
          `User created: ${internalEmail} as ${roleDisplay} in ${entityTypeToLabel(selectedEntityType)}`
        )
        setInternalEmail("")
        setSelectedEntityType(null)
        setSelectedRole(null)
      } catch (error) {
        toast.error("Failed to create user with entity")
        console.error(error)
      }
    } else {
      // Legacy behavior: just add as internal user
      await mockAuthAdapter.addInternalEmail(internalEmail)
      await mockAuthAdapter.markEmailVerified(internalEmail)
      toast.success(`Added internal user: ${internalEmail}`)
      setInternalEmail("")
    }
  }

  const handleCreateInvitation = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email")
      return
    }

    const result = await mockAuthAdapter.inviteEmailToCollection(inviteEmail, collectionId)

    if (result.ok && result.activationUrl) {
      setInvitationUrl(result.activationUrl)
      toast.success(`Invitation created for: ${inviteEmail}`)
      setInviteEmail("")
    } else {
      toast.error(result.error || "Failed to create invitation")
    }
  }

  const handleCopyUrl = () => {
    if (invitationUrl) {
      navigator.clipboard.writeText(invitationUrl)
      setCopied(true)
      toast.success("Activation URL copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to clear all mock auth data?")) {
      await mockAuthAdapter.clearAllData()
      setInvitationUrl("")
      toast.success("All mock auth data cleared")
    }
  }

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Mock Auth Seed Panel</h1>
          <p className="text-muted-foreground mt-2">
            Development tool for testing authentication flows
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add Internal User</CardTitle>
            <CardDescription>
              Internal users can access without being part of a collection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="internal-email">Email</Label>
              <Input
                id="internal-email"
                type="email"
                placeholder="internal@noba.com"
                value={internalEmail}
                onChange={(e) => setInternalEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddInternal()
                  }
                }}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="entity-type-seed">Tipo de Entidad (Opcional)</Label>
              <Select
                value={selectedEntityType || ""}
                onValueChange={(value) => {
                  setSelectedEntityType(value as EntityType)
                  if (value === "self-photographer") {
                    setSelectedRole(null)
                  }
                }}
              >
                <SelectTrigger id="entity-type-seed">
                  <SelectValue placeholder="Selecciona un tipo (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin entidad (solo auth)</SelectItem>
                  {Object.entries(ENTITY_TYPE_DISPLAY_NAMES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEntityType && selectedEntityType !== "self-photographer" && (
              <div className="space-y-2">
                <Label htmlFor="role-seed">Rol</Label>
                <Select
                  value={selectedRole || ""}
                  onValueChange={(value) => setSelectedRole(value as Role)}
                >
                  <SelectTrigger id="role-seed">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {roleToLabel(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedEntityType === "self-photographer" && (
              <Alert>
                <AlertDescription className="text-sm">
                  Photographer no tiene roles (siempre admin)
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleAddInternal} 
              className="w-full"
              disabled={Boolean(selectedEntityType && selectedEntityType !== "self-photographer" && !selectedRole)}
            >
              {selectedEntityType 
                ? `Add User with Entity (${entityTypeToLabel(selectedEntityType)})` 
                : "Add Internal User (Auto-verified)"}
            </Button>
            <Alert>
              <AlertDescription className="text-sm">
                {selectedEntityType 
                  ? "User will be created with entity and role, then marked as verified."
                  : "Internal users are automatically marked as verified and can request OTP immediately."}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Invitation</CardTitle>
            <CardDescription>
              Create an invitation for an external user to join a collection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collection-id">Collection ID</Label>
              <Input
                id="collection-id"
                type="text"
                placeholder="collection-1"
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
              />
            </div>
            <Button onClick={handleCreateInvitation} className="w-full">
              Create Invitation
            </Button>

            {invitationUrl && (
              <div className="space-y-2">
                <Label>Activation URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={invitationUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyUrl}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Alert>
                  <AlertDescription className="text-sm">
                    Share this URL with the user. They need to click it to verify their email, then they can request OTP.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
            <CardDescription>
              Clear all mock authentication data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleClearAll}
              variant="destructive"
              className="w-full"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All Mock Auth Data
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Testing Flow</CardTitle>
            <CardDescription>
              Steps to test the authentication flow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Add an internal user or create an invitation</li>
              <li>If creating invitation, copy the activation URL and open it in a new tab</li>
              <li>After activation, go to <code className="bg-muted px-1 rounded">/auth/login</code></li>
              <li>Enter the email and request OTP</li>
              <li>Use OTP code: <code className="bg-muted px-1 rounded">123456</code> (shown in console in dev mode)</li>
              <li>You should be redirected to <code className="bg-muted px-1 rounded">/app</code></li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}






