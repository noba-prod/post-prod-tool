"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Link2, MoreHorizontal, Pencil, SquareArrowOutUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { copyLinkWithToast } from "@/lib/utils/clipboard"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface CollectionActionsMenuProps {
  /** App-relative URL of the collection (e.g. `/collections/{id}`). */
  href: string
  /** Configuration route; when set, "Edit collection" is shown (noba* Admin only — decided by the caller). */
  editHref?: string
  collectionName?: string
  /** `overlay`: on top of a card thumbnail. `table`: inline in a list row. */
  variant?: "overlay" | "table"
  className?: string
}

/** Stops clicks/keys from reaching ancestors (card link, clickable table row), including through the portal. */
function stopPropagation(e: React.SyntheticEvent) {
  e.stopPropagation()
}

/**
 * "More options" menu for a collection (Collections gallery cards and list rows):
 * Copy link, Open in new tab and, for noba* Admins, Edit collection.
 */
export function CollectionActionsMenu({
  href,
  editHref,
  collectionName,
  variant = "overlay",
  className,
}: CollectionActionsMenuProps) {
  const router = useRouter()

  const absoluteUrl = React.useCallback(
    () => new URL(href, window.location.origin).toString(),
    [href]
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={variant === "overlay" ? "secondary" : "ghost"}
          size={variant === "overlay" ? "icon-sm" : "icon"}
          aria-label={collectionName ? `More options for ${collectionName}` : "More options"}
          onClick={stopPropagation}
          onKeyDown={stopPropagation}
          className={cn(
            variant === "overlay"
              ? "backdrop-blur-xl bg-white/30 text-white hover:bg-white/40 aria-expanded:bg-white/40 aria-expanded:text-white"
              : "h-10 w-10",
            className
          )}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[200px]"
        onClick={stopPropagation}
        onKeyDown={stopPropagation}
      >
        <DropdownMenuItem onSelect={() => void copyLinkWithToast(absoluteUrl())}>
          <Link2 />
          Copy link
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => window.open(absoluteUrl(), "_blank", "noopener,noreferrer")}
        >
          <SquareArrowOutUpRight />
          Open in new tab
        </DropdownMenuItem>
        {editHref && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push(editHref)}>
              <Pencil />
              Edit collection
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
