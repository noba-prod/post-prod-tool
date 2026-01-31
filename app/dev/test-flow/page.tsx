"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { mockAuthAdapter } from "@/lib/auth/mock-adapter"
import { createEntityCreationService, getRepositoryInstances } from "@/lib/services"
import { seedTestUser } from "@/lib/utils/test-seed"
import type { EntityType, Role, User, Entity } from "@/lib/types"
import { ENTITY_TYPE_DISPLAY_NAMES, ALL_ROLES, entityTypeToLabel, roleToLabel } from "@/lib/types"
import { toast } from "sonner"
import { ArrowRight, UserPlus, LogIn, KeyRound, CheckCircle2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function TestFlowPage() {
  const router = useRouter()
  const [testEmail, setTestEmail] = useState("test@noba.com")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [entityName, setEntityName] = useState("")
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [userCreated, setUserCreated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [createdUserInfo, setCreatedUserInfo] = useState<{ user: any; entity: any } | null>(null)
  const [existingUsers, setExistingUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [entitiesMap, setEntitiesMap] = useState<Map<string, Entity>>(new Map())

  // Initialize service to ensure repositories are ready
  React.useEffect(() => {
    createEntityCreationService()
  }, [])

  // Load existing users and entities
  const loadExistingUsers = React.useCallback(async () => {
    setLoadingUsers(true)
    try {
      const { userRepository, entityRepository } = getRepositoryInstances()
      if (userRepository && entityRepository) {
        const users = await userRepository.getAllUsers()
        setExistingUsers(users)

        // Load entities for each user
        const entities = new Map<string, Entity>()
        const uniqueEntityIds = [...new Set(users.map(u => u.entityId).filter(Boolean))]
        
        for (const entityId of uniqueEntityIds) {
          try {
            const entity = await entityRepository.getEntityById(entityId)
            if (entity) {
              entities.set(entityId, entity)
            }
          } catch (error) {
            console.warn(`Failed to load entity ${entityId}:`, error)
          }
        }
        
        setEntitiesMap(entities)
      }
    } catch (error) {
      console.error("Failed to load users:", error)
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  // Load users on mount and when a new user is created
  React.useEffect(() => {
    loadExistingUsers()
  }, [loadExistingUsers, userCreated])

  // Check if entity name is required for selected entity type
  const requiresEntityName = selectedEntityType && 
    ["client", "agency", "photo-lab", "edition-studio", "hand-print-lab"].includes(selectedEntityType)

  const handleCreateUser = async () => {
    if (!testEmail.trim()) {
      toast.error("Please enter an email")
      return
    }

    if (!firstName.trim()) {
      toast.error("Please enter a first name")
      return
    }

    if (!selectedEntityType) {
      toast.error("Please select an entity type")
      return
    }

    // For standard entities (client, agency, etc.), require entity name
    if (requiresEntityName && !entityName.trim()) {
      toast.error("Please enter an entity name")
      return
    }

    // For self-photographer, role is ignored (always admin)
    if (selectedEntityType !== "self-photographer" && !selectedRole) {
      toast.error("Please select a role")
      return
    }

    setLoading(true)
    try {
      // Seed user with entity and role
      const result = await seedTestUser(
        testEmail,
        selectedEntityType,
        selectedEntityType === "self-photographer" ? undefined : selectedRole || undefined,
        firstName.trim(),
        lastName.trim() || undefined,
        requiresEntityName ? entityName.trim() : undefined
      )

      // Add as internal user for auth
      await mockAuthAdapter.addInternalEmail(testEmail)
      // Mark as verified
      await mockAuthAdapter.markEmailVerified(testEmail)

      setCreatedUserInfo(result)
      setUserCreated(true)
      
      const roleDisplay = selectedEntityType === "self-photographer" 
        ? "admin (photographer has no roles)" 
        : roleToLabel(selectedRole!)
      
      toast.success(
        `User created: ${testEmail} as ${roleDisplay} in ${entityTypeToLabel(selectedEntityType)}`
      )
    } catch (error) {
      toast.error("Failed to create user")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartFlow = () => {
    if (!userCreated) {
      toast.error("Please create a user first")
      return
    }
    // Redirect to login with email pre-filled
    router.push(`/auth/login?email=${encodeURIComponent(testEmail)}`)
  }

  const handleLoginWithEmail = (email: string) => {
    router.push(`/auth/login?email=${encodeURIComponent(email)}`)
  }

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Flujo de Pruebas - Autenticación</h1>
          <p className="text-muted-foreground mt-2">
            Crea un usuario de prueba y prueba el flujo completo de acceso
          </p>
        </div>

        {/* Step 1: Create User */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                userCreated ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
              }`}>
                {userCreated ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <UserPlus className="h-5 w-5" />
                )}
              </div>
              <div>
                <CardTitle>Paso 1: Crear Usuario de Prueba</CardTitle>
                <CardDescription>
                  Crea un usuario interno verificado para pruebas
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Email del Usuario</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="test@noba.com"
                value={testEmail}
                onChange={(e) => {
                  setTestEmail(e.target.value)
                  setUserCreated(false)
                  setCreatedUserInfo(null)
                }}
                disabled={loading || userCreated}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-name">Nombre</Label>
                <Input
                  id="first-name"
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value)
                    setUserCreated(false)
                    setCreatedUserInfo(null)
                  }}
                  disabled={loading || userCreated}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Apellido</Label>
                <Input
                  id="last-name"
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value)
                    setUserCreated(false)
                    setCreatedUserInfo(null)
                  }}
                  disabled={loading || userCreated}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="entity-type">Tipo de Entidad</Label>
              <Select
                value={selectedEntityType || ""}
                onValueChange={(value) => {
                  setSelectedEntityType(value as EntityType)
                  setUserCreated(false)
                  setCreatedUserInfo(null)
                  setEntityName("") // Reset entity name when type changes
                  // Reset role when entity type changes
                  if (value === "self-photographer") {
                    setSelectedRole(null)
                  }
                }}
                disabled={loading || userCreated}
              >
                <SelectTrigger id="entity-type">
                  <SelectValue placeholder="Selecciona un tipo de entidad" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ENTITY_TYPE_DISPLAY_NAMES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {requiresEntityName && (
              <div className="space-y-2">
                <Label htmlFor="entity-name">Nombre de la Entidad</Label>
                <Input
                  id="entity-name"
                  type="text"
                  placeholder="Ej: Zara, Dior, etc."
                  value={entityName}
                  onChange={(e) => {
                    setEntityName(e.target.value)
                    setUserCreated(false)
                    setCreatedUserInfo(null)
                  }}
                  disabled={loading || userCreated}
                />
                <p className="text-xs text-muted-foreground">
                  Requerido para {entityTypeToLabel(selectedEntityType!)}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select
                value={selectedRole || ""}
                onValueChange={(value) => {
                  setSelectedRole(value as Role)
                  setUserCreated(false)
                  setCreatedUserInfo(null)
                }}
                disabled={loading || userCreated || selectedEntityType === "self-photographer"}
              >
                <SelectTrigger id="role">
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
              {selectedEntityType === "self-photographer" && (
                <p className="text-xs text-muted-foreground">
                  Photographer no tiene roles (siempre admin)
                </p>
              )}
            </div>

            <Button 
              onClick={handleCreateUser} 
              className="w-full"
              disabled={
                loading || 
                userCreated || 
                !firstName.trim() ||
                !selectedEntityType || 
                (requiresEntityName && !entityName.trim()) ||
                (selectedEntityType !== "self-photographer" && !selectedRole)
              }
            >
              {loading ? "Creando..." : userCreated ? "Usuario Creado ✓" : "Crear Usuario"}
            </Button>
            
            {userCreated && createdUserInfo && (
              <Alert>
                <AlertDescription className="text-sm space-y-1">
                  <div>✓ Usuario creado y verificado.</div>
                  <div className="font-medium">
                    Entidad: {createdUserInfo.entity.name} ({entityTypeToLabel(createdUserInfo.entity.type)})
                  </div>
                  <div className="font-medium">
                    Rol: {roleToLabel(createdUserInfo.user.role)}
                  </div>
                  <div>Puedes continuar al siguiente paso.</div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Login */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-600">
                <LogIn className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Paso 2: Login</CardTitle>
                <CardDescription>
                  Ingresa tu email y solicita el código OTP
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertDescription className="text-sm">
                El email se prellenará automáticamente cuando inicies el flujo.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={handleStartFlow} 
              className="w-full"
              disabled={!userCreated}
            >
              Iniciar Flujo de Login
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Step 3: OTP */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-600">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Paso 3: Verificar OTP</CardTitle>
                <CardDescription>
                  Ingresa el código OTP para completar el acceso
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertDescription className="text-sm font-mono">
                <strong>Código OTP de prueba:</strong> <span className="text-2xl font-bold text-yellow-700">123456</span>
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground mt-4">
              Este código funciona para todos los usuarios en modo de prueba.
            </p>
          </CardContent>
        </Card>

        {/* Step 4: Dashboard */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Paso 4: Dashboard</CardTitle>
                <CardDescription>
                  Acceso completo a la aplicación
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Una vez verificado el OTP, serás redirigido automáticamente al dashboard principal.
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/dev/auth-seed")}
            >
              Panel de Seed Avanzado
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                await mockAuthAdapter.clearAllData()
                setUserCreated(false)
                toast.success("Datos de prueba limpiados")
                loadExistingUsers()
              }}
            >
              Limpiar Datos de Prueba
            </Button>
          </CardContent>
        </Card>

        {/* Re-use existing users */}
        <Card>
          <CardHeader>
            <CardTitle>Re-use already existing users</CardTitle>
            <CardDescription>
              Select an existing user to quickly log in
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Loading users...
              </div>
            ) : existingUsers.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No users found. Create a test user above to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Entity Type</TableHead>
                      <TableHead>Entity Name</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {existingUsers.map((user) => {
                      const entity = user.entityId ? entitiesMap.get(user.entityId) : null
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.email}</TableCell>
                          <TableCell>
                            {`${user.firstName} ${user.lastName || ""}`.trim() || "-"}
                          </TableCell>
                          <TableCell>{roleToLabel(user.role)}</TableCell>
                          <TableCell>
                            {entity ? entityTypeToLabel(entity.type) : "-"}
                          </TableCell>
                          <TableCell>
                            {entity ? entity.name : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleLoginWithEmail(user.email)}
                              className="p-2"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



