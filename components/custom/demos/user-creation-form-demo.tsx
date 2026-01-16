"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { UserCreationForm, type UserFormData } from "@/components/custom/user-creation-form"
import Link from "next/link"

/**
 * Demo for User Creation Form component
 */
export function UserCreationFormDemo() {
  const [createUserOpen, setCreateUserOpen] = React.useState(false)
  const [adminUserOpen, setAdminUserOpen] = React.useState(false)

  const handleCreateUserSubmit = (data: UserFormData) => {
    console.log("Create User submitted:", data)
    setCreateUserOpen(false)
  }

  const handleAdminUserSubmit = (data: UserFormData) => {
    console.log("Admin User submitted:", data)
    setAdminUserOpen(false)
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create User Variant */}
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Create User</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Variante general para crear usuarios. Todos los campos son editables.
            </p>
          </div>
          <Button onClick={() => setCreateUserOpen(true)} className="w-full">
            Abrir "Create User"
          </Button>
          <Link
            href="/dev/user-creation-form"
            className="text-sm text-primary hover:underline block text-center"
          >
            Ver demo completo →
          </Link>
        </div>

        {/* New Admin User Variant */}
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">New Admin User</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Variante para crear el usuario administrador. Entity prellenado y Role fijado a "Admin".
            </p>
          </div>
          <Button onClick={() => setAdminUserOpen(true)} className="w-full">
            Abrir "New Admin User"
          </Button>
          <Link
            href="/dev/user-creation-form"
            className="text-sm text-primary hover:underline block text-center"
          >
            Ver demo completo →
          </Link>
        </div>
      </div>

      {/* Create User Modal */}
      <UserCreationForm
        open={createUserOpen}
        onOpenChange={setCreateUserOpen}
        entity={{
          type: "Client",
          name: "Zara",
        }}
        onSubmit={handleCreateUserSubmit}
        onCancel={() => setCreateUserOpen(false)}
        primaryLabel="Register member"
        secondaryLabel="Cancel"
      />

      {/* New Admin User Modal */}
      <UserCreationForm
        open={adminUserOpen}
        onOpenChange={setAdminUserOpen}
        entity={{
          type: "Agency",
          name: "Creative Studio",
        }}
        isAdminUser={true}
        onSubmit={handleAdminUserSubmit}
        onCancel={() => setAdminUserOpen(false)}
        primaryLabel="Register member"
        secondaryLabel="Cancel"
      />
    </div>
  )
}
