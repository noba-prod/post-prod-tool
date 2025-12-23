# Mock Auth Mode - Local Testing

Este proyecto incluye un modo "LOCAL MOCK AUTH" para probar el flujo de autenticación completo sin necesidad de configurar Supabase o cualquier backend externo.

## Características

- ✅ Autenticación sin contraseña (solo OTP)
- ✅ Verificación de email simulada
- ✅ Sistema de invitaciones
- ✅ Usuarios internos y externos
- ✅ Persistencia en localStorage
- ✅ UI completa con Shadcn UI
- ✅ Fácil migración a Supabase (adapter pattern)

## Cómo usar

### 1. Activar Mock Auth

El modo mock está activado por defecto. Para desactivarlo, configura:

```env
NEXT_PUBLIC_USE_MOCK_AUTH=false
```

### 2. Panel de Seed (Desarrollo)

Accede a `/dev/auth-seed` para gestionar usuarios de prueba:

- **Añadir usuario interno**: Crea un usuario que puede acceder sin estar en una colección
- **Crear invitación**: Genera un link de activación para usuarios externos
- **Limpiar datos**: Borra todos los datos de mock auth

### 3. Flujo de Prueba

#### Caso 1: Usuario Interno

1. Ve a `/dev/auth-seed`
2. Añade un email interno (ej: `internal@noba.com`)
3. Ve a `/auth/login`
4. Ingresa el email
5. Solicita OTP
6. Ingresa el código: `123456` (fijo en modo mock)
7. Serás redirigido a `/app`

#### Caso 2: Usuario Externo Invitado

1. Ve a `/dev/auth-seed`
2. Crea una invitación con un email (ej: `user@example.com`)
3. Copia el link de activación
4. Abre el link en una nueva pestaña
5. El email se marca como verificado automáticamente
6. Ve a `/auth/login` (el email se pre-llenará)
7. Solicita OTP
8. Ingresa `123456`
9. Serás redirigido a `/app`

#### Caso 3: Usuario NO Invitado

1. Intenta ingresar un email que no está invitado
2. Verás el mensaje: "You need to be invited to access this platform"

## OTP en Desarrollo

En modo desarrollo (`NODE_ENV=development`), el OTP se muestra en:
- Consola del navegador
- Mensaje en la página de OTP

El código fijo es: **123456**

## Estructura del Adapter

El sistema usa el patrón Adapter para facilitar la migración a Supabase:

```
lib/auth/
├── adapter.ts          # Interfaz AuthAdapter
├── mock-adapter.ts     # Implementación Mock
└── index.ts            # Factory para seleccionar adapter
```

### Interfaz AuthAdapter

```typescript
interface AuthAdapter {
  precheck(email: string): Promise<PrecheckResult>
  requestOtp(email: string): Promise<AuthResult>
  verifyOtp(email: string, otp: string): Promise<VerifyResult>
  logout(): Promise<void>
  getSession(): Promise<Session | null>
  markEmailVerified(email: string): Promise<void>
  inviteEmailToCollection(email: string, collectionId: string): Promise<InvitationResult>
}
```

## Persistencia

Los datos se guardan en `localStorage` con las siguientes claves:

- `mock_auth_invited_emails`: Emails invitados y sus colecciones
- `mock_auth_internal_emails`: Lista de emails internos
- `mock_auth_email_verified`: Map de emails verificados
- `mock_auth_otp_store`: OTPs temporales
- `mock_auth_session`: Sesión actual
- `mock_auth_invitations`: Invitaciones con tokens
- `mock_auth_otp_requests`: Historial de requests (para rate limiting)

## Rate Limiting

El mock adapter incluye rate limiting básico:
- Máximo 3 requests de OTP en 10 minutos por email
- Si se excede, muestra error: "Too many OTP requests"

## Migración a Supabase

Para migrar a Supabase:

1. Crea `lib/auth/supabase-adapter.ts` implementando `AuthAdapter`
2. Actualiza `lib/auth/index.ts` para usar Supabase cuando `NEXT_PUBLIC_USE_MOCK_AUTH=false`
3. Las páginas de auth no necesitan cambios (usan el adapter)

## Rutas

- `/auth/login` - Login con email
- `/auth/otp` - Verificación de OTP
- `/auth/activate?token=...` - Activación de invitación
- `/app` - Dashboard (requiere sesión)
- `/dev/auth-seed` - Panel de seed (solo desarrollo)

## Notas

- El OTP expira después de 5 minutos
- Las invitaciones expiran después de 7 días
- Los datos persisten entre recargas de página (localStorage)
- Para limpiar todo, usa el botón en `/dev/auth-seed`




