"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { UserCreationForm, type UserFormData } from "@/components/custom/user-creation-form"

export default function UserCreationFormDemoPage() {
  const [createUserOpen, setCreateUserOpen] = React.useState(false)
  const [adminUserOpen, setAdminUserOpen] = React.useState(false)

  const handleCreateUserSubmit = (data: UserFormData) => {
    console.log("Create User submitted:", data)
    alert(`User created:\n${JSON.stringify(data, null, 2)}`)
    setCreateUserOpen(false)
  }

  const handleAdminUserSubmit = (data: UserFormData) => {
    console.log("Admin User submitted:", data)
    alert(`Admin User created:\n${JSON.stringify(data, null, 2)}`)
    setAdminUserOpen(false)
  }

  return (
    <div className="min-h-screen p-8 bg-zinc-50">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">User Creation Form Demo</h1>
          <p className="text-muted-foreground">
            Demo de las variantes del formulario de creación de usuario
          </p>
        </div>

        <div className="grid grid-cols-1 min-[760px]:grid-cols-2 gap-6">
          {/* Create User Variant */}
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Create User</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Variante general para crear usuarios. Todos los campos son editables.
              </p>
            </div>
            <Button onClick={() => setCreateUserOpen(true)} className="w-full">
              Abrir "Create User"
            </Button>
          </div>

          {/* New Admin User Variant */}
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">New Admin User</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Variante para crear el usuario administrador. Entity prellenado y Role fijado a "Admin".
              </p>
            </div>
            <Button onClick={() => setAdminUserOpen(true)} className="w-full">
              Abrir "New Admin User"
            </Button>
          </div>
        </div>

        {/* Create User Modal */}
        <UserCreationForm
          open={createUserOpen}
          onOpenChange={setCreateUserOpen}
          entity={{
            type: "client",
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
            type: "agency",
            name: "Creative Studio",
          }}
          isAdminUser={true}
          onSubmit={handleAdminUserSubmit}
          onCancel={() => setAdminUserOpen(false)}
          primaryLabel="Register member"
          secondaryLabel="Cancel"
        />
      </div>
    </div>
  )
}
