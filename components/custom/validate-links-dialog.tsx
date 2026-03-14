"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ValidateLinksDialogItem {
  label: string
  url: string
}

interface ValidateLinksDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Links to show with checkboxes. First = primary label, rest = "Additional Link 01", etc. */
  links: ValidateLinksDialogItem[]
  /** When true, only one link exists — checkbox is checked and disabled (cannot deselect). */
  singleSelect?: boolean
  /** Primary button label (e.g. "Validate", "Share with client") */
  confirmLabel: string
  /** Called when user confirms with selected URLs. May be async. Dialog closes after it resolves. */
  onConfirm: (selectedUrls: string[]) => void | Promise<void>
}

/**
 * Dialog to select which links to validate/share before proceeding.
 * Shows checkboxes with separators. Single link: cannot deselect.
 */
export function ValidateLinksDialog({
  open,
  onOpenChange,
  links,
  singleSelect = false,
  confirmLabel,
  onConfirm,
}: ValidateLinksDialogProps) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [confirming, setConfirming] = React.useState(false)

  React.useEffect(() => {
    if (open && links.length > 0) {
      if (singleSelect) {
        setSelected(new Set(links.map((l) => l.url)))
      } else {
        setSelected(new Set(links.map((l) => l.url)))
      }
    }
  }, [open, links, singleSelect])

  const handleToggle = (url: string, checked: boolean) => {
    if (singleSelect) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(url)
      else next.delete(url)
      return next
    })
  }

  const handleConfirm = async () => {
    const urls = links.filter((l) => selected.has(l.url)).map((l) => l.url)
    if (urls.length === 0) return
    setConfirming(true)
    try {
      await Promise.resolve(onConfirm(urls))
      onOpenChange(false)
    } finally {
      setConfirming(false)
    }
  }

  const canConfirm = selected.size > 0 && !confirming

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Select links to share</DialogTitle>
          <DialogDescription>
            {singleSelect
              ? "Confirm which link will be shared in the next step."
              : "Choose which links you want to share in the next step."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-0 py-2">
          {links.map((item, index) => (
            <React.Fragment key={item.url}>
              <label
                className={cn(
                  "flex items-center gap-3 py-3 cursor-pointer rounded-md hover:bg-muted/50 -mx-2 px-2",
                  singleSelect && "cursor-default"
                )}
              >
                <Checkbox
                  checked={selected.has(item.url)}
                  onCheckedChange={(checked) => handleToggle(item.url, checked === true)}
                  disabled={singleSelect}
                  className="shrink-0"
                />
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="text-sm font-medium truncate">{item.label}</span>
                  <span className="text-xs text-muted-foreground truncate" title={item.url}>
                    {item.url}
                  </span>
                </div>
              </label>
              {index < links.length - 1 && <Separator className="my-0" />}
            </React.Fragment>
          ))}
        </div>
        <DialogFooter showCloseButton={false} className="justify-start">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            {confirming ? "Confirming…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
