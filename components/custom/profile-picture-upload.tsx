"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ProfilePictureUploadProps {
  /** Current file (when user selected a new file) */
  value?: File | null
  /** Existing image URL (when editing, for preview before new file selected) */
  existingUrl?: string | null
  /** When true, hide existingUrl preview (e.g. user clicked remove) */
  hideExisting?: boolean
  /** Called when file selection changes */
  onChange: (file: File | null) => void
  /** Label text */
  label?: string
  /** Input id for accessibility */
  id?: string
  /** Whether the control is disabled */
  disabled?: boolean
  /** Optional className for the wrapper */
  className?: string
}

/**
 * Reusable profile picture upload control.
 * Shows file name or preview (image + remove button) when file/URL is set.
 * Standardized behavior for UserCreationForm, EntityBasicInformationForm, etc.
 */
export function ProfilePictureUpload({
  value = null,
  existingUrl,
  hideExisting = false,
  onChange,
  label = "Profile picture",
  id = "profile-picture-upload",
  disabled = false,
  className,
}: ProfilePictureUploadProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Object URL for File preview (must revoke on cleanup)
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (value instanceof File) {
      const url = URL.createObjectURL(value)
      setObjectUrl(url)
      return () => {
        URL.revokeObjectURL(url)
        setObjectUrl(null)
      }
    }
    setObjectUrl(null)
    return undefined
  }, [value])

  const previewUrl =
    value instanceof File
      ? objectUrl
      : !hideExisting && existingUrl?.trim()
        ? existingUrl.trim()
        : null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    onChange(file)
  }

  const handleChooseFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemove = () => {
    onChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className={cn("grid w-full items-center gap-1.5", className)}>
      <Label htmlFor={id} className={cn("h-3.5 leading-snug w-fit", disabled && "opacity-50")}>
        {label}
      </Label>
      <div
        className={cn(
          "flex items-center gap-1.5 h-9 py-1 px-0.5 border border-border rounded-lg",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Input
          ref={fileInputRef}
          id={id}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt=""
              className="size-8 shrink-0 rounded-[10px] object-cover border border-border"
            />
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
              className="shrink-0 rounded p-0.5 text-destructive hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              aria-label="Remove profile picture"
            >
              <Trash2 className="size-4" />
            </button>
          </>
        ) : null}
        <span className="text-sm text-muted-foreground truncate flex-1 min-w-0">
          {value instanceof File ? value.name : previewUrl ? "" : "No file chosen"}
        </span>
        <Button
          type="button"
          variant="secondary"
          size="default"
          className="rounded-lg cursor-pointer h-8 shrink-0"
          onClick={handleChooseFileClick}
          disabled={disabled}
        >
          <Upload className="size-4 mr-2" />
          Choose file
        </Button>
      </div>
    </div>
  )
}
