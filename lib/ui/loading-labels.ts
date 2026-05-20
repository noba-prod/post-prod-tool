/**
 * Derives gerund loading text from a button label (e.g. "Save changes" → "Saving...").
 */
export function toLoadingLabel(label: string): string {
  const trimmed = label.trim()
  const map: Record<string, string> = {
    Save: "Saving...",
    "Save changes": "Saving...",
    Create: "Creating...",
    "Create new": "Creating...",
    Delete: "Deleting...",
    Publish: "Publishing...",
    Cancel: "Canceling...",
    Confirm: "Confirming...",
    Submit: "Submitting...",
    Update: "Updating...",
    Send: "Sending...",
    "Request OTP": "Sending OTP...",
    Validate: "Validating...",
    Reactivate: "Reactivating...",
    Upload: "Uploading...",
    "Add comment": "Adding comment...",
    Invite: "Inviting...",
    "Register member": "Registering...",
    "Create admin user": "Creating...",
    "Create photographer": "Creating...",
    "Publish collection": "Publishing...",
  }
  if (map[trimmed]) return map[trimmed]
  return `${trimmed}...`
}
