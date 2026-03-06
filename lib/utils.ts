import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Ensures a URL is absolute so it opens externally instead of as a relative path.
 * URLs without protocol (e.g. "link.com/low-res01") are treated as relative by the browser,
 * resulting in wrong URLs like "http://localhost:3000/collections/link.com/low-res01".
 */
export function ensureAbsoluteUrl(url: string): string {
  const trimmed = (url ?? "").trim()
  if (!trimmed) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}
