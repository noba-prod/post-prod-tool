"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Titles } from "@/components/custom/titles"
import { ActionBar } from "@/components/custom/action-bar"
import { CollectionCard, type CollectionStatus } from "@/components/custom/collection-card"

export interface PublishParticipantSummary {
  role: string
  name: string
  count?: number
}

export interface PublishCollectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Left card (draft state) – landscape */
  cardLeft: {
    status?: CollectionStatus
    collectionName: string
    location: string
    startDate: string
    endDate: string
  }
  /** Right card (upcoming state) – landscape, same collection */
  cardRight: {
    status?: CollectionStatus
    collectionName: string
    location: string
    startDate: string
    endDate: string
  }
  /** Participants listing (who will receive the invite). Count = number of users per role. */
  participants?: PublishParticipantSummary[]
  /** Called when Edit in participants section is clicked (optional) */
  onEditParticipants?: () => void
  /** Disable publish CTA (until draft is complete) */
  publishDisabled?: boolean
  /** Called when user confirms publish */
  onPublish?: () => void
}

/**
 * Publish Collection Dialog (Figma 175-32103)
 * Centered modal with 40% black overlay.
 * Heading/subtitle and button copies from Figma. Two CollectionCards (draft → upcoming) with arrow, then participants listing, then actions.
 */
export function PublishCollectionDialog({
  open,
  onOpenChange,
  cardLeft,
  cardRight,
  participants = [],
  onEditParticipants,
  publishDisabled = false,
  onPublish,
}: PublishCollectionDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2",
            "max-w-[calc(100%-2rem)] sm:max-w-[640px]",
            "rounded-xl border border-border bg-background p-6 shadow-lg",
            "grid gap-6"
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            Are you ready to roll?
          </DialogPrimitive.Title>
          <div className="flex flex-col gap-3">
            <Titles
              type="block"
              title="Are you ready to roll?"
              subtitle="We will notify all parties by sending a verification email, allowing them to log into noba*, track the collection's progress, and receive notifications."
              showSubtitle
            />

            {/* Wrapper (Figma: sidebar-background + padding 16 + radius 12) */}
            <div className="bg-sidebar rounded-xl p-5 flex flex-col gap-6">
              {/* Two cards with arrow (Figma: Collection Overview) */}
              <div className="flex items-center justify-center gap-5 w-full min-w-0">
                <div className="flex-1 basis-0 min-w-0">
                  <CollectionCard
                    format="landscape"
                    status={cardLeft.status ?? "draft"}
                    collectionName={cardLeft.collectionName}
                    location={cardLeft.location}
                    startDate={cardLeft.startDate}
                    endDate={cardLeft.endDate}
                    className="!w-full"
                  />
                </div>
                <ArrowRight className="w-4 h-4 shrink-0 text-zinc-500" aria-hidden />
                <div className="flex-1 basis-0 min-w-0">
                  <CollectionCard
                    format="landscape"
                    status={cardRight.status ?? "upcoming"}
                    collectionName={cardRight.collectionName}
                    location={cardRight.location}
                    startDate={cardRight.startDate}
                    endDate={cardRight.endDate}
                    className="!w-full"
                  />
                </div>
              </div>

              {/* Participants listing (no container styling here; wrapper owns bg/padding) */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-6">
                  <h3 className="text-sm font-semibold text-foreground">Participants</h3>
                  {onEditParticipants && (
                    <button
                      type="button"
                      onClick={onEditParticipants}
                      className="text-sm font-medium text-foreground underline underline-offset-4 shrink-0 hover:text-foreground/80"
                    >
                      Edit
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  {participants.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">No participants yet.</p>
                  ) : (
                    participants.map((p, i) => (
                      <div
                        key={`${p.role}-${p.name}-${i}`}
                        className="flex items-center justify-between gap-4 py-3.5 px-4 rounded-xl bg-background min-h-[48px]"
                      >
                        <span className="text-sm font-medium text-foreground">{p.role}</span>
                        <div className="flex items-center gap-1 text-sm">
                          <span className="font-semibold text-lime-600">{p.name}</span>
                          {p.count != null && <span className="text-muted-foreground">({p.count})</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <ActionBar
            secondaryLabel="Back to setup"
            primaryLabel="Publish collection"
            onSecondaryClick={() => onOpenChange(false)}
            onPrimaryClick={() => onPublish?.()}
            primaryDisabled={publishDisabled}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

