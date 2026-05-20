/** True when profile is noba internal staff with admin role (can delete clients). */
export function isNobaInternalAdmin(profile: {
  is_internal?: boolean | null
  role?: string | null
} | null | undefined): boolean {
  if (!profile?.is_internal) return false
  return String(profile.role ?? "").toLowerCase() === "admin"
}
