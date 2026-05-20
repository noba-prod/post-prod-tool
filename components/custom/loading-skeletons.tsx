"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function TableWrapper({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("border border-border rounded-xl overflow-hidden", className)}>
      {children}
    </div>
  )
}

function SkeletonCell({ width = "w-32" }: { width?: string }) {
  return (
    <TableCell>
      <Skeleton className={cn("h-4", width)} />
    </TableCell>
  )
}

function SkeletonRow({ columnWidths }: { columnWidths: string[] }) {
  return (
    <TableRow className="h-[52px] hover:bg-transparent">
      {columnWidths.map((width, i) => (
        <SkeletonCell key={i} width={width} />
      ))}
    </TableRow>
  )
}

export function CollectionCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col justify-end gap-3 rounded-xl border border-border p-4 h-[192px] w-full",
        className
      )}
    >
      <Skeleton className="h-5 w-3/4 max-w-[200px]" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-1/2 max-w-[120px]" />
        <Skeleton className="h-3 w-2/3 max-w-[160px]" />
      </div>
    </div>
  )
}

interface CollectionsGridSkeletonProps {
  count?: number
  className?: string
}

export function CollectionsGridSkeleton({ count = 8, className }: CollectionsGridSkeletonProps) {
  return (
    <div
      className={cn("@container w-full", className)}
      aria-busy="true"
      aria-label="Loading collections"
    >
      <div
        className={cn(
          "grid gap-4",
          "grid-cols-1",
          "@[560px]:grid-cols-2",
          "@[768px]:grid-cols-3",
          "@[1024px]:grid-cols-4"
        )}
      >
        {Array.from({ length: count }).map((_, i) => (
          <CollectionCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

type TableSkeletonVariant = "collections" | "entities" | "team-members"

interface TableSkeletonProps {
  variant: TableSkeletonVariant
  rowCount?: number
  className?: string
}

const COLLECTIONS_HEADERS = [
  "Name",
  "Status",
  "Client",
  "Job reference",
  "Starting",
  "Location",
  "Participants",
  "",
] as const

const ENTITIES_HEADERS = [
  "Name",
  "Type",
  "Admin",
  "Admin email",
  "Team members",
  "Collections",
] as const

const TEAM_HEADERS = ["Name", "Email", "Phone", "Role", "Status"] as const

const COLLECTIONS_ROW_WIDTHS = [
  "w-36",
  "w-20",
  "w-24",
  "w-28",
  "w-24",
  "w-32",
  "w-12",
  "w-8",
]

const ENTITIES_ROW_WIDTHS = ["w-32", "w-24", "w-28", "w-40", "w-16", "w-12"]

const TEAM_ROW_WIDTHS = ["w-32", "w-40", "w-28", "w-20", "w-20"]

export function TableSkeleton({ variant, rowCount = 7, className }: TableSkeletonProps) {
  const headers =
    variant === "collections"
      ? COLLECTIONS_HEADERS
      : variant === "entities"
        ? ENTITIES_HEADERS
        : TEAM_HEADERS

  const rowWidths =
    variant === "collections"
      ? COLLECTIONS_ROW_WIDTHS
      : variant === "entities"
        ? ENTITIES_ROW_WIDTHS
        : TEAM_ROW_WIDTHS

  const label =
    variant === "collections"
      ? "Loading collections"
      : variant === "entities"
        ? "Loading players"
        : "Loading team members"

  return (
    <div className={className} aria-busy="true" aria-label={label}>
      <TableWrapper>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {headers.map((label, i) => (
                <TableHead key={i} className="bg-sidebar h-12">
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rowCount }).map((_, i) => (
              <SkeletonRow key={i} columnWidths={[...rowWidths]} />
            ))}
          </TableBody>
        </Table>
      </TableWrapper>
    </div>
  )
}
