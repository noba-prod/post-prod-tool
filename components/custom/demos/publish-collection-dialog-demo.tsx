"use client"

import * as React from "react"
import { PublishCollectionDialog } from "../publish-collection-dialog"
import { Button } from "@/components/ui/button"

const cardBase = {
  collectionName: "kids summer'25",
  location: "a coruña, spain",
  startDate: "dec 4, 2025",
  endDate: "dec 14, 2025",
}

const demoParticipants = [
  { role: "Client", name: "@zara", count: 6 },
  { role: "Photographer", name: "@tomhaser", count: 1 },
  { role: "Lab (low-res)", name: "@revealcoruña", count: 3 },
  { role: "Hand print lab (LR to HR)", name: "@reveladospacosl", count: 2 },
  { role: "Retouch/Post Studio", name: "@retoquesfotograficosmariloles", count: 1 },
]

/**
 * Demo for Publish Collection Dialog (Figma 175-32103).
 * Centered dialog: heading, two CollectionCards + arrow, participants listing, actions.
 */
export function PublishCollectionDialogDemo() {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl">
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Publish Collection Dialog (Figma 175-32103)
        </p>
        <Button onClick={() => setOpen(true)}>Open Publish Collection Dialog</Button>
      </div>

      <PublishCollectionDialog
        open={open}
        onOpenChange={setOpen}
        cardLeft={{ ...cardBase, status: "draft" }}
        cardRight={{ ...cardBase, status: "upcoming" }}
        participants={demoParticipants}
        onEditParticipants={() => setOpen(false)}
        publishDisabled={false}
        onPublish={() => setOpen(false)}
      />
    </div>
  )
}
