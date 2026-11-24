import { toast } from "sonner"

/**
 * Copies text to the clipboard. Falls back to a hidden textarea + execCommand when the
 * async Clipboard API is unavailable (insecure context, older browsers) or rejected.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Permission denied or document not focused: try the legacy path below.
    }
  }

  try {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.setAttribute("readonly", "")
    textarea.style.position = "fixed"
    textarea.style.top = "-9999px"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand("copy")
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

/** Copies a link and reports the result through the global Sonner toaster. */
export async function copyLinkWithToast(url: string): Promise<boolean> {
  const ok = await copyTextToClipboard(url)
  if (ok) {
    toast.success("Link copied", { description: "The link is ready to paste." })
  } else {
    toast.error("Couldn't copy the link", {
      description: "Your browser blocked clipboard access. Please copy it manually.",
    })
  }
  return ok
}
