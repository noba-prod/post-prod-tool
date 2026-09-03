import * as React from "react"

/**
 * Debounced uniqueness check against GET /api/users/check-email.
 * Same alert used on Team member create: invalid field + "already exists".
 */
export function useEmailAlreadyExists(
  email: string,
  options?: {
    enabled?: boolean
    excludeUserId?: string
  }
): boolean {
  const enabled = options?.enabled ?? true
  const excludeUserId = options?.excludeUserId
  const [emailAlreadyExists, setEmailAlreadyExists] = React.useState(false)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    if (!enabled) {
      setEmailAlreadyExists(false)
      return
    }
    const normalized = email.trim().toLowerCase()
    if (!normalized) {
      setEmailAlreadyExists(false)
      return
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    timeoutRef.current = setTimeout(async () => {
      timeoutRef.current = null
      try {
        const params = new URLSearchParams({ email: normalized })
        if (excludeUserId) params.set("excludeUserId", excludeUserId)
        const res = await fetch(`/api/users/check-email?${params}`)
        const data = (await res.json()) as { exists?: boolean }
        setEmailAlreadyExists(Boolean(data.exists))
      } catch {
        setEmailAlreadyExists(false)
      }
    }, 400)
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [email, enabled, excludeUserId])

  return emailAlreadyExists
}
