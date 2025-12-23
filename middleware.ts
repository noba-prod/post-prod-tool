import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Public auth routes
  const authRoutes = ["/auth/login", "/auth/otp", "/auth/activate"]
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))

  // Dev routes are always accessible
  if (pathname.startsWith("/dev")) {
    return NextResponse.next()
  }

  // Allow auth routes
  if (isAuthRoute) {
    return NextResponse.next()
  }

  // Check if using mock auth - if so, skip Supabase authentication
  const useMockAuth = process.env.NEXT_PUBLIC_USE_MOCK_AUTH !== "false"
  const hasSupabaseConfig = 
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If using mock auth or no Supabase config, allow access (mock auth handles auth client-side)
  if (useMockAuth || !hasSupabaseConfig) {
    return NextResponse.next()
  }

  // Create Supabase client for middleware
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes require authentication
  const protectedRoutes = ["/app"]
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )

  if (isProtectedRoute && !user) {
    // Redirect to login if not authenticated
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // If user is authenticated and tries to access auth routes, redirect to app
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = "/app"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
