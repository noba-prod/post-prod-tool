# Estructura del Proyecto

Este proyecto está organizado siguiendo las mejores prácticas de Next.js App Router con Supabase y shadcn/ui.

## Estructura de Carpetas

```
noba-poc/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route group para autenticación (no afecta URL)
│   │   └── auth/                 # Rutas de autenticación
│   │       ├── activate/         # /auth/activate
│   │       ├── login/            # /auth/login
│   │       ├── otp/              # /auth/otp
│   │       └── layout.tsx        # Layout para rutas de auth
│   ├── (dashboard)/              # Route group para dashboard (no afecta URL)
│   │   └── app/                  # Dashboard principal
│   │       └── page.tsx          # /app
│   ├── actions/                  # Server Actions
│   │   └── auth.ts               # Acciones de autenticación
│   ├── dev/                      # Rutas de desarrollo
│   │   └── auth-seed/            # /dev/auth-seed
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page (/)
│   └── globals.css               # Estilos globales
├── components/                   # Componentes React
│   ├── ui/                       # Componentes shadcn/ui
│   └── custom/                   # Componentes personalizados
├── lib/                          # Utilidades y helpers
│   ├── supabase/                 # Clientes de Supabase
│   │   ├── client.ts            # Cliente para browser
│   │   ├── server.ts            # Cliente para server components/actions
│   │   ├── admin.ts             # Cliente admin (service role)
│   │   └── rpc.ts               # Funciones RPC
│   ├── auth/                     # Adaptadores de autenticación
│   │   ├── adapter.ts
│   │   ├── mock-adapter.ts
│   │   └── index.ts
│   └── utils.ts                  # Utilidades generales
├── hooks/                        # React hooks personalizados
│   └── use-mobile.ts
├── middleware.ts                 # Next.js middleware (autenticación)
├── supabase/                     # Migraciones de Supabase
│   └── migrations/
│       ├── 001_initial_schema.sql
│       └── 002_rpc_functions.sql
└── public/                       # Archivos estáticos
    └── assets/
```

## Convenciones

### Route Groups
- `(auth)` y `(dashboard)` son route groups que organizan las rutas sin afectar las URLs
- Las rutas siguen siendo `/auth/login`, `/app`, etc.

### Server Components vs Client Components
- Por defecto, todos los componentes son Server Components
- Usar `"use client"` solo cuando sea necesario (hooks, interactividad, etc.)

### Server Actions
- Ubicadas en `app/actions/`
- Usar `"use server"` en la parte superior del archivo
- Ejemplo: `app/actions/auth.ts`

### Supabase Clients
- **Browser**: `lib/supabase/client.ts` - Para componentes cliente
- **Server**: `lib/supabase/server.ts` - Para server components y actions
- **Admin**: `lib/supabase/admin.ts` - Para operaciones administrativas (service role)

### Middleware
- `middleware.ts` maneja autenticación server-side
- Protege rutas como `/app`
- Redirige usuarios no autenticados a `/auth/login`

## Rutas Principales

- `/` - Home (redirige según sesión)
- `/auth/login` - Login
- `/auth/otp` - Verificación OTP
- `/auth/activate` - Activación de invitación
- `/app` - Dashboard (protegido)
- `/dev/*` - Rutas de desarrollo

## Stack Tecnológico

- **Frontend**: Next.js 16 (App Router) + React 19
- **UI**: shadcn/ui + Tailwind CSS v4
- **Backend**: Supabase (Auth, Database, Storage)
- **TypeScript**: Configurado con paths aliases (`@/*`)

