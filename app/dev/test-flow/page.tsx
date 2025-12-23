"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { mockAuthAdapter } from "@/lib/auth/mock-adapter"
import { toast } from "sonner"
import { ArrowRight, UserPlus, LogIn, KeyRound, CheckCircle2 } from "lucide-react"

export default function TestFlowPage() {
  const router = useRouter()
  const [testEmail, setTestEmail] = useState("test@noba.com")
  const [userCreated, setUserCreated] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleCreateUser = async () => {
    if (!testEmail.trim()) {
      toast.error("Please enter an email")
      return
    }

    setLoading(true)
    try {
      // Add as internal user
      await mockAuthAdapter.addInternalEmail(testEmail)
      // Mark as verified
      await mockAuthAdapter.markEmailVerified(testEmail)
      setUserCreated(true)
      toast.success(`User ${testEmail} created and verified!`)
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
                }}
                disabled={loading || userCreated}
              />
            </div>
            <Button 
              onClick={handleCreateUser} 
              className="w-full"
              disabled={loading || userCreated}
            >
              {loading ? "Creando..." : userCreated ? "Usuario Creado ✓" : "Crear Usuario"}
            </Button>
            {userCreated && (
              <Alert>
                <AlertDescription className="text-sm">
                  ✓ Usuario creado y verificado. Puedes continuar al siguiente paso.
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
              }}
            >
              Limpiar Datos de Prueba
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

