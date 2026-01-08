"use client"

import * as React from "react"
import { Logo } from "@/components/custom/logo"
import { Notifications } from "@/components/custom/notifications"
import { UserInformation } from "@/components/custom/user-information"
import { NavBar } from "@/components/custom/nav-bar"
import {
  CollectionStatusTag,
  StageStatusTag,
  DateIndicatorTag,
  TimeStampTag,
  CollectionProgressTag,
} from "@/components/custom/tag"
import { CollectionCard } from "@/components/custom/collection-card"
import { Titles } from "@/components/custom/titles"
import { FilterBar } from "@/components/custom/filter-bar"
import { Tables } from "@/components/custom/tables"
import { Grid } from "@/components/custom/grid"

export interface ComponentEntry {
  id: string
  name: string
  title: string
  description: string
  demo: React.ReactNode
}

export const customRegistry: ComponentEntry[] = [
  {
    id: "logo",
    name: "logo",
    title: "Logo",
    description: "Brand logo component with two variants: logotype (full logo) and isotype (symbol only). Supports multiple sizes as defined in Figma design system.",
    demo: (
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Logotype</p>
          <div className="flex items-end gap-4">
            <Logo variant="logotype" size="xl" />
            <Logo variant="logotype" size="md" />
            <Logo variant="logotype" size="sm" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Isotype</p>
          <div className="flex items-end gap-4">
            <Logo variant="isotype" size="xl" />
            <Logo variant="isotype" size="lg" />
            <Logo variant="isotype" size="md" />
            <Logo variant="isotype" size="sm" />
            <Logo variant="isotype" size="xs" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "notifications",
    name: "notifications",
    title: "Notifications",
    description: "Bell notification button with three states (default, hover, active) and optional red dot indicator for new notifications.",
    demo: (
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">States</p>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <Notifications status="default" />
              <span className="text-xs text-muted-foreground">Default</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Notifications status="hover" />
              <span className="text-xs text-muted-foreground">Hover</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Notifications status="active" />
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">With notifications</p>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <Notifications status="default" hasNotifications />
              <span className="text-xs text-muted-foreground">Default</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Notifications status="hover" hasNotifications />
              <span className="text-xs text-muted-foreground">Hover</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Notifications status="active" hasNotifications />
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "user-information",
    name: "user-information",
    title: "User Information",
    description: "User profile component with avatar, name, organization and role. Includes dropdown menu with profile actions. Admin users can see 'Company details' option.",
    demo: (
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">States</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <UserInformation status="default" />
              <span className="text-xs text-muted-foreground">Default</span>
            </div>
            <div className="flex items-center gap-2">
              <UserInformation status="hover" />
              <span className="text-xs text-muted-foreground">Hover</span>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Admin (shows Company details)</p>
          <UserInformation 
            userName="Martin Becerra"
            organization="noba"
            role="admin"
            isAdmin
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Non-admin (no Company details)</p>
          <UserInformation 
            userName="John Doe"
            organization="noba"
            role="editor"
            isAdmin={false}
          />
        </div>
      </div>
    ),
  },
  {
    id: "collection-card",
    name: "collection-card",
    title: "Collection Card",
    description: "Card component showing collection information with thumbnail background. Two formats: default (vertical 262x192) and landscape (horizontal 292x112). Five status variants: draft, upcoming, in-progress, completed, canceled.",
    demo: (
      <div className="flex flex-col gap-6">
        {/* Default Format */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Default Format (vertical)</p>
          <div className="flex flex-wrap gap-4">
            <CollectionCard status="draft" collectionName="Summer Campaign" clientName="@zara" location="Barcelona, Spain" />
            <CollectionCard status="upcoming" collectionName="Fall Lookbook" clientName="@mango" location="Milan, Italy" />
            <CollectionCard status="in-progress" collectionName="SS25 Collection" clientName="@hm" location="Paris, France" />
          </div>
          <div className="flex flex-wrap gap-4">
            <CollectionCard status="completed" collectionName="Holiday Special" clientName="@uniqlo" location="Tokyo, Japan" />
            <CollectionCard status="canceled" collectionName="Winter Drop" clientName="@gap" location="New York, USA" />
          </div>
        </div>
        {/* Landscape Format */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Landscape Format (horizontal)</p>
          <div className="flex flex-wrap gap-4">
            <CollectionCard format="landscape" status="draft" collectionName="Summer Campaign" location="Barcelona, Spain" />
            <CollectionCard format="landscape" status="upcoming" collectionName="Fall Lookbook" location="Milan, Italy" />
            <CollectionCard format="landscape" status="in-progress" collectionName="SS25 Collection" location="Paris, France" />
          </div>
          <div className="flex flex-wrap gap-4">
            <CollectionCard format="landscape" status="completed" collectionName="Holiday Special" location="Tokyo, Japan" />
            <CollectionCard format="landscape" status="canceled" collectionName="Winter Drop" location="New York, USA" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "titles",
    name: "titles",
    title: "Titles",
    description: "Title component with four variants: main-section (36px), block (24px with optional subtitle, 8px gap), section (18px with optional subtitle, 4px gap), and form (16px with optional subtitle, 4px gap).",
    demo: (
      <div className="flex flex-col gap-8 w-full">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Main Section Title (36px)</p>
          <Titles type="main-section" title="This is a title" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Block Title (24px, with subtitle)</p>
          <Titles type="block" title="This is a title" subtitle="This is a subtitle" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Section Title (18px, with subtitle)</p>
          <Titles type="section" title="This is a title" subtitle="This is a subtitle" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Form Title (16px, with subtitle)</p>
          <Titles type="form" title="This is a title" subtitle="This is a subtitle" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Without subtitle (showSubtitle=false)</p>
          <Titles type="block" title="Block without subtitle" showSubtitle={false} />
        </div>
      </div>
    ),
  },
  {
    id: "tags",
    name: "tags",
    title: "Tags",
    description: "Collection of tag components: CollectionStatus (draft, upcoming, in-progress, completed, canceled), StageStatus (upcoming, in-progress, in-transit, done, delivered), TimeStamp (on-track, on-time, delayed, at-risk), and CollectionProgress (circular progress indicator).",
    demo: (
      <div className="flex flex-col gap-6">
        {/* Collection Status */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Collection Status (default)</p>
          <div className="flex flex-wrap items-center gap-2">
            <CollectionStatusTag status="draft" />
            <CollectionStatusTag status="upcoming" />
            <CollectionStatusTag status="in-progress" />
            <CollectionStatusTag status="completed" />
            <CollectionStatusTag status="canceled" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Collection Status (overlay - for dark backgrounds)</p>
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-zinc-800">
            <CollectionStatusTag type="overlay" status="draft" />
            <CollectionStatusTag type="overlay" status="upcoming" />
            <CollectionStatusTag type="overlay" status="in-progress" />
            <CollectionStatusTag type="overlay" status="completed" />
            <CollectionStatusTag type="overlay" status="canceled" />
          </div>
        </div>
        {/* Stage Status */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Stage Status</p>
          <div className="flex flex-wrap items-center gap-2">
            <StageStatusTag status="upcoming" />
            <StageStatusTag status="in-progress" />
            <StageStatusTag status="in-transit" />
            <StageStatusTag status="done" />
            <StageStatusTag status="delivered" />
          </div>
        </div>
        {/* Date Indicator */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Date Indicator</p>
          <div className="flex flex-wrap items-center gap-2">
            <DateIndicatorTag />
          </div>
        </div>
        {/* Time Stamp */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Time Stamp</p>
          <div className="flex flex-wrap items-center gap-2">
            <TimeStampTag status="on-track" />
            <TimeStampTag status="on-time" />
            <TimeStampTag status="delayed" />
            <TimeStampTag status="at-risk" />
          </div>
        </div>
        {/* Collection Progress */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Collection Progress</p>
          <div className="flex flex-wrap items-center gap-2">
            <CollectionProgressTag progress={0} />
            <CollectionProgressTag progress={10} />
            <CollectionProgressTag progress={20} />
            <CollectionProgressTag progress={30} />
            <CollectionProgressTag progress={40} />
            <CollectionProgressTag progress={50} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CollectionProgressTag progress={60} />
            <CollectionProgressTag progress={70} />
            <CollectionProgressTag progress={80} />
            <CollectionProgressTag progress={90} />
            <CollectionProgressTag progress={95} />
            <CollectionProgressTag progress={100} />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "nav-bar",
    name: "nav-bar",
    title: "Nav Bar",
    description: "Navigation bar with three variants: noba (full features), collaborator (limited tabs), photographer (minimal). Responsive design with mobile hamburger menu.",
    demo: (
      <div className="flex flex-col gap-6 w-full">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Variant: noba (desktop)</p>
          <div className="border rounded-lg overflow-hidden">
            <NavBar 
              variant="noba"
              userName="Martin Becerra"
              organization="noba"
              role="admin"
              isAdmin
              hasNotifications
            />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Variant: collaborator</p>
          <div className="border rounded-lg overflow-hidden">
            <NavBar 
              variant="collaborator"
              userName="Erika Goldner"
              organization="zara"
              role="admin"
            />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Variant: photographer</p>
          <div className="border rounded-lg overflow-hidden">
            <NavBar 
              variant="photographer"
              userName="Tom Haser"
              role="photographer"
            />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Mobile (resize window to see)</p>
          <p className="text-xs text-muted-foreground">La versión mobile se muestra automáticamente en viewports menores a 768px</p>
        </div>
      </div>
    ),
  },
  {
    id: "filter-bar",
    name: "filter-bar",
    title: "Filter Bar",
    description: "Contextual filter bar with 4 variants: default (generic filters), collections (client/status/creator + sort + gallery/list views), members (search + role filter + new member action), entities (search + type filter + new entity action).",
    demo: (
      <div className="flex flex-col gap-8 w-full">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Default</p>
          <div className="bg-muted/30 p-4 rounded-lg">
            <FilterBar variant="default" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Collections</p>
          <div className="bg-muted/30 p-4 rounded-lg">
            <FilterBar variant="collections" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Members</p>
          <div className="bg-muted/30 p-4 rounded-lg">
            <FilterBar variant="members" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Entities</p>
          <div className="bg-muted/30 p-4 rounded-lg">
            <FilterBar variant="entities" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "tables",
    name: "tables",
    title: "Tables",
    description: "Table component with 4 variants: team-members (Name, Email, Phone, Role, Collections), entities (Name, Type, Admin, Team members, Collections), collections (Name, Status, Client, Starting, Location, Participants), participants (Name, Email, Phone, Edit permission, Collections).",
    demo: (
      <div className="flex flex-col gap-8 w-full">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Team Members</p>
          <Tables variant="team-members" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Entities</p>
          <Tables variant="entities" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Collections</p>
          <Tables variant="collections" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Participants</p>
          <Tables variant="participants" />
        </div>
      </div>
    ),
  },
  {
    id: "grid",
    name: "grid",
    title: "Grid",
    description: `Responsive grid layout for CollectionCards. Columns adapt automatically based on container width:
• 1 column: 320px – 559px
• 2 columns: 560px – 767px
• 3 columns: 768px – 1023px
• 4 columns: 1024px+
Gap: 16px | Padding: 40px`,
    demo: (
      <div className="w-full border border-dashed border-muted-foreground/30 rounded-lg">
        <p className="text-xs font-medium text-muted-foreground p-2 border-b border-dashed border-muted-foreground/30">
          Resize the panel to see the grid adapt (1–4 columns)
        </p>
        <Grid />
      </div>
    ),
  },
]

