"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { mockAuthAdapter } from "@/lib/auth/mock-adapter"
import { toast } from "sonner"
import { Copy, Check, Trash2 } from "lucide-react"

export default function AuthSeedPage() {
  const [internalEmail, setInternalEmail] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [collectionId, setCollectionId] = useState("collection-1")
  const [invitationUrl, setInvitationUrl] = useState("")
  const [copied, setCopied] = useState(false)

  const handleAddInternal = async () => {
    if (!internalEmail.trim()) {
      toast.error("Please enter an email")
      return
    }

    await mockAuthAdapter.addInternalEmail(internalEmail)
    await mockAuthAdapter.markEmailVerified(internalEmail)
    toast.success(`Added internal user: ${internalEmail}`)
    setInternalEmail("")
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
            <Button onClick={handleAddInternal} className="w-full">
              Add Internal User (Auto-verified)
            </Button>
            <Alert>
              <AlertDescription className="text-sm">
                Internal users are automatically marked as verified and can request OTP immediately.
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




