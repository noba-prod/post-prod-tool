"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export type ParticipantsCardVariant = "default" | "individual" | "entity"

export interface ParticipantsCardProps {
  /** Variant: default (initials + title + 2 lines), individual (person: name, email, phone), entity (entity name + manager + team count) */
  variant?: ParticipantsCardVariant
  /** Card title: "Title" (default), person name (individual), entity name (entity) */
  title?: string
  /** Initials for avatar when no image (default/individual). e.g. "TR" */
  initials?: string
  /** Avatar image URL (individual/entity) */
  imageUrl?: string
  /** Default/Individual: first line of contextual info */
  line1?: string
  /** Default/Individual: second line of contextual info */
  line2?: string
  /** Individual: email address */
  email?: string
  /** Individual: phone number */
  phone?: string
  /** Entity: manager display name */
  managerName?: string
  /** Entity: team members count */
  teamMembersCount?: number
  className?: string
}

/**
 * Participants Card — Figma DS node 13731-2409.
 * Three variants: default (placeholder title + 2 lines), individual (person with email/phone), entity (entity name + manager + team count).
 * Uses design system: bg-zinc-100, rounded-xl, p-3, gap-3; typography text-base font-semibold (title), text-sm text-muted-foreground (secondary).
 */
export function ParticipantsCard({
  variant = "default",
  title = "Title",
  initials,
  imageUrl,
  line1,
  line2,
  email,
  phone,
  managerName,
  teamMembersCount,
  className,
}: ParticipantsCardProps) {
  const showAvatarImage = Boolean(imageUrl) && (variant === "individual" || variant === "entity")
  const fallbackInitials = initials ?? (title ? title.slice(0, 2).toUpperCase() : "—")

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl bg-zinc-100 p-3 w-full min-w-0",
        className
      )}
    >
      <Avatar size="default" className="size-10 shrink-0">
        {showAvatarImage && <AvatarImage src={imageUrl} alt="" />}
        <AvatarFallback className="bg-foreground/10 text-foreground/20 text-base font-medium">
          {fallbackInitials}
        </AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-base font-semibold text-foreground">
          {title}
        </span>

        {variant === "default" && (
          <>
            {line1 != null && line1 !== "" && (
              <span className="text-sm font-normal text-muted-foreground">
                {line1}
              </span>
            )}
            {line2 != null && line2 !== "" && (
              <span className="text-sm font-normal text-muted-foreground">
                {line2}
              </span>
            )}
          </>
        )}

        {variant === "individual" && (
          <>
            {email != null && email !== "" && (
              <span className="text-sm font-normal text-muted-foreground">
                {email}
              </span>
            )}
            {phone != null && phone !== "" && (
              <span className="text-sm font-normal text-muted-foreground">
                {phone}
              </span>
            )}
          </>
        )}

        {variant === "entity" && (
          <>
            {managerName != null && managerName !== "" && (
              <div className="flex items-center gap-1 text-sm">
                <span className="font-normal text-muted-foreground">
                  Manager:
                </span>
                <span className="font-normal text-foreground/90">
                  {managerName}
                </span>
              </div>
            )}
            {teamMembersCount != null && (
              <div className="flex items-center gap-1 text-sm">
                <span className="font-normal text-muted-foreground">
                  Team members:
                </span>
                <span className="font-normal text-foreground/90">
                  {String(teamMembersCount)}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
