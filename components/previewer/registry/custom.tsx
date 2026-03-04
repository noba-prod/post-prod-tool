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
  PhotographerNameTag,
} from "@/components/custom/tag"
import { CollectionCard } from "@/components/custom/collection-card"
import { Titles } from "@/components/custom/titles"
import { FilterBar } from "@/components/custom/filter-bar"
import { Tables } from "@/components/custom/tables"
import { Grid } from "@/components/custom/grid"
import {
  CheckSelectionDemo,
  ProgressItemDemo,
  MenuItemDemo,
  ContextualMenuDemo,
  SideBarDemo,
  FormItemsDemo,
  RowVariantsDemo,
  FormsDemo,
  ParticipantSummaryDemo,
  ParticipantSetupBoxDemo,
  ActionBarDemo,
  BlockHeadingDemo,
  CollectionHeadingDemo,
  LayoutDemo,
  BlockTemplateDemo,
  ModalWindowDemo,
  TemplatesDemo,
  UserCreationFormDemo,
  EntityBasicInformationFormDemo,
  CollectionStepperDemo,
  PublishCollectionDialogDemo,
} from "@/components/custom/demos"
import { PhoneInput } from "@/components/custom/phone-input"
import { DatePicker } from "@/components/custom/date-picker"
import { SlotPicker } from "@/components/custom/slot-picker"
import { OptionPicker } from "@/components/custom/option-picker"
import { EntitySelected } from "@/components/custom/entity-selected"
import { StepDetails } from "@/components/custom/step-details"
import { ParticipantsCard } from "@/components/custom/participants-card"
import { SwitchList } from "@/components/custom/switch-list"
import { InformativeToast } from "@/components/custom/informative-toast"
import { RowVariants, SlotPlaceholder } from "@/components/custom/row-variants"
import { LinkAccordion } from "@/components/custom/link-accordion"
import { UrlHistory } from "@/components/custom/url-history"

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
        {/* Photographer Name */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Photographer Name</p>
          <div className="flex flex-wrap items-center gap-2">
            <PhotographerNameTag name="John Doe" />
            <PhotographerNameTag name="Jane Smith" />
            <PhotographerNameTag name="Mike Johnson" />
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
  {
    id: "check-selection",
    name: "check-selection",
    title: "Check Selection",
    description: "Selectable item component with check indicator. Four variants based on Status (Default/Disabled) and Selected (Yes/No) states. Selected items show a ring indicator (black for default, gray for disabled). Built with a base Check component.",
    demo: <CheckSelectionDemo />,
  },
  {
    id: "progress-item",
    name: "progress-item",
    title: "Progress Item",
    description: "Progress step item with three states: completed (teal check + teal text), active (dot indicator + black text + ring), and disabled (empty indicator + gray text). Built with StepIndicator and StepConnector base components. Includes optional connector line between steps.",
    demo: <ProgressItemDemo />,
  },
  {
    id: "menu-item",
    name: "menu-item",
    title: "Menu Item",
    description: "Navigation menu item with three states: active (gray background), default (no background), and disabled (gray text/icon). Supports custom Lucide icons. Default icon is Circle.",
    demo: <MenuItemDemo />,
  },
  {
    id: "contextual-menu",
    name: "contextual-menu",
    title: "Contextual Menu",
    description: "Contextual menu with two variants: 'menu' (built with MenuItem, gap-2/8px spacing) and 'stepper' (built with ProgressItem + StepConnector, no spacing). Both support interactive item selection.",
    demo: <ContextualMenuDemo />,
  },
  {
    id: "side-bar",
    name: "side-bar",
    title: "Side Bar",
    description: "Sidebar component with four variants: 'default' (custom slot + entity card + action buttons), 'view-entity' (menu + entity card + delete), 'create-entity' (stepper + delete), 'create-collection' (stepper + collection card + delete).",
    demo: <SideBarDemo />,
  },
  {
    id: "phone-input",
    name: "phone-input",
    title: "Phone Input",
    description: "Phone number input with country code selector. Wraps Shadcn Select and Input components. Supports default, disabled, focus, and filled states.",
    demo: (
      <div className="flex flex-col gap-4 w-full">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Default</p>
          <PhoneInput className="max-w-[280px]" />
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Disabled</p>
          <PhoneInput disabled phoneNumber="649 393 291" className="max-w-[280px]" />
        </div>
      </div>
    ),
  },
  {
    id: "date-picker",
    name: "date-picker",
    title: "Date Picker",
    description: "Single date picker with calendar popup. Wraps Shadcn Popover, Button, and Calendar components. Supports closed, open, selected, and disabled states.",
    demo: (
      <div className="flex flex-col gap-4 w-full">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Default</p>
          <DatePicker className="max-w-[275px]" />
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Disabled</p>
          <DatePicker disabled className="max-w-[275px]" />
        </div>
      </div>
    ),
  },
  {
    id: "slot-picker",
    name: "slot-picker",
    title: "Time Picker",
    description: "Time slot selector dropdown. Wraps Shadcn Select components with predefined time slots. Fully keyboard accessible.",
    demo: (
      <div className="flex flex-col gap-4 w-full">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Default</p>
          <SlotPicker className="max-w-[176px]" />
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Disabled</p>
          <SlotPicker disabled className="max-w-[176px]" />
        </div>
      </div>
    ),
  },
  {
    id: "option-picker",
    name: "option-picker",
    title: "Option Picker",
    description: "Generic dropdown selector. Wraps Shadcn Select components for reuse across multiple flows. Supports default, active, and disabled states.",
    demo: (
      <div className="flex flex-col gap-4 w-full">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Default</p>
          <OptionPicker
            options={[
              { value: "option-01", label: "Option 01" },
              { value: "option-02", label: "Option 02" },
              { value: "option-03", label: "Option 03" },
            ]}
            className="max-w-[176px]"
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Disabled</p>
          <OptionPicker
            options={[{ value: "option-01", label: "Option 01" }]}
            disabled
            className="max-w-[176px]"
          />
        </div>
      </div>
    ),
  },
  {
    id: "step-details",
    name: "step-details",
    title: "Step Details",
    description: "Step detail card with 6 variants per Figma DS (node 13445-2873): primary (bg image + overlay, white text, CTA), secondary (zinc-100, dark text, CTA), notes compressed (quote-style text with see more/less + author avatar; no title), notes displayed (expanded), missingPhotos (Missing photos? + subtitle + repeat CTA), additionalRequest (<entity> in lime + 'is requesting additional photos' + quote info). Primary bg image configurable (default: /assets/bg-finals.png).",
    demo: (
      <div className="flex flex-wrap gap-8 items-start">
        <div className="w-[247px] shrink-0 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Primary (bg image)</p>
          <StepDetails
            variant="primary"
            mainTitle="Check Finals"
            subtitle="Review and approve final deliverables"
            additionalInfo="Client and photographer sign-off"
            onAction={() => {}}
          />
        </div>
        <div className="w-[247px] shrink-0 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Secondary</p>
          <StepDetails
            variant="secondary"
            mainTitle="Main title"
            subtitle="Subtitle"
            additionalInfo="Additional information"
            onAction={() => {}}
          />
        </div>
        <div className="w-[365px] shrink-0 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Notes (compressed)</p>
          <StepDetails
            variant="notes"
            mainTitle="Notes"
            entityName="Client"
            additionalInfo="This is a example of a very long text that carry more than on line of content, just to show how this component behave."
            authorName="Zara"
            authorImageUrl=""
            authorUserName="Erika Goldner"
            noteTimestamp="2 hours ago"
          />
        </div>
        <div className="w-[365px] shrink-0 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Additional Request</p>
          <StepDetails
            variant="additionalRequest"
            mainTitle=""
            entityName="Client"
            additionalInfo="Additional information"
          />
        </div>
        <div className="w-[247px] shrink-0 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Missing Photos</p>
          <StepDetails
            variant="missingPhotos"
            mainTitle="Missing photos?"
            entityName="photographer"
            onAction={() => {}}
          />
        </div>
      </div>
    ),
  },
  {
    id: "link-accordion",
    name: "link-accordion",
    title: "Link Accordion",
    description: "Collapsible accordion for file links per Figma node 900-51168. Each item has: a label header with chevron toggle, a StepDetails primary card (compact 96px) with background image and action button, and an optional StepDetails notes card with see more/less and author info. Items separated by Separator.",
    demo: (
      <div className="w-full max-w-[400px]">
        <LinkAccordion
          items={[
            {
              label: "Original link",
              primaryTitle: "Low-res photos",
              primarySubtitle: "Uploaded: 1 day ago",
              primaryBackgroundImage: "/assets/bg-lowres.png",
              primaryOnAction: () => {},
              noteText: "There was some problems when scanning latest negatives. If you notice any missing photos from the shoot, get in touch with us to solve problems.",
              noteAuthorName: "Carmencita Lab",
              noteAuthorUserName: "Erika Goldner",
              noteTimestamp: "1 day ago",
              defaultOpen: true,
            },
            {
              label: <><span>Additional footage </span><span className="text-lime-500">#01</span></>,
              primaryTitle: "Low-res photos",
              primarySubtitle: "Uploaded: 2 minutes ago",
              primaryBackgroundImage: "/assets/bg-lowres.png",
              primaryOnAction: () => {},
              noteText: "New photos are ready! Check them out and let us know if something is missing",
              noteAuthorName: "Carmencita Lab",
              noteAuthorUserName: "Erika Goldner",
              noteTimestamp: "2 minutes ago",
              defaultOpen: true,
            },
            {
              label: <><span>Additional footage </span><span className="text-lime-500">#02</span></>,
              primaryTitle: "Low-res photos",
              primarySubtitle: "Uploaded: 1 minute ago",
              primaryBackgroundImage: "/assets/bg-lowres.png",
              // No primaryOnAction: item has no links from DB, so the action button is not shown
              noteText: "New photos are ready! Check them out and let us know if something is missing",
              noteAuthorName: "Carmencita Lab",
              noteAuthorUserName: "Erika Goldner",
              noteTimestamp: "1 minute ago",
              defaultOpen: true,
            },
          ]}
        />
      </div>
    ),
  },
  {
    id: "participants-card",
    name: "participants-card",
    title: "Participants Card",
    description: "Card for participants list per Figma DS node 13731-2409. Three variants: default (initials + title + 2 lines), individual (person: name, email, phone), entity (entity name + manager + team count). Uses bg-zinc-100, rounded-xl, p-3, gap-3; typography text-base font-semibold (title), text-sm text-muted-foreground (secondary).",
    demo: (
      <div className="flex flex-wrap gap-4 items-start">
        <div className="w-[237px] shrink-0 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Default</p>
          <ParticipantsCard
            variant="default"
            title="Title"
            initials="T"
            line1="Additional information 1"
            line2="Additional information 2"
          />
        </div>
        <div className="w-[237px] shrink-0 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Individual</p>
          <ParticipantsCard
            variant="individual"
            title="Name Surname"
            initials="NS"
            email="email@example.com"
            phone="+34 600 000 000"
          />
        </div>
        <div className="w-[237px] shrink-0 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Entity</p>
          <ParticipantsCard
            variant="entity"
            title="EntityName"
            initials="EN"
            managerName="AdminName"
            teamMembersCount={4}
          />
        </div>
      </div>
    ),
  },
  {
    id: "entity-selected",
    name: "entity-selected",
    title: "Entity Selected",
    description: "Read-only or removable selected entity display. Shows entity type and value with remove button or lock icon. Supports default (removable) and disabled/locked states.",
    demo: (
      <div className="flex flex-col gap-4 w-full">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Default (removable)</p>
          <EntitySelected entityType="Entity" value="Value" className="max-w-[194px]" />
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Locked (disabled)</p>
          <EntitySelected entityType="Entity" value="Value" locked disabled className="max-w-[194px]" />
        </div>
      </div>
    ),
  },
  {
    id: "switch-list",
    name: "switch-list",
    title: "Switch List",
    description: "Vertical list of labeled switches. Wraps Shadcn Switch and Separator components. Each row contains label + switch. Supports enabled/disabled states per item.",
    demo: (
      <div className="space-y-2 w-full">
        <p className="text-xs text-muted-foreground">With separators</p>
        <SwitchList
          items={[
            { id: "switch-1", label: "Switch Text", checked: false },
            { id: "switch-2", label: "Switch Text", checked: true },
          ]}
          className="max-w-[400px]"
        />
      </div>
    ),
  },
  {
    id: "informative-toast",
    name: "informative-toast",
    title: "Informative Toast",
    description: "Non-dismissible informational message. Based on Shadcn Alert patterns. Supports info, success, warning, and error variants. Purely informational, no actions required.",
    demo: (
      <div className="flex flex-col gap-3 w-full">
        <InformativeToast
          variant="info"
          message="The client will be responsible for defining key details of the shipping."
        />
        <InformativeToast
          variant="success"
          message="Your changes have been saved successfully."
        />
        <InformativeToast
          variant="warning"
          message="Please review your settings before continuing."
        />
        <InformativeToast
          variant="error"
          message="An error occurred while processing your request."
        />
      </div>
    ),
  },
  {
    id: "form-items",
    name: "form-items",
    title: "Form Items (All)",
    description: "Interactive demo showcasing all form item components: Phone Input, Date Picker, Time Picker, Option Picker, Entity Selected, Switch List, and Informative Toast.",
    demo: <FormItemsDemo />,
  },
  {
    id: "row-variants",
    name: "row-variants",
    title: "Row Variants",
    description: "Layout wrapper with 1, 2, or 3 column grid. Use variant='1' for single column, '2' for two columns, '3' for three columns. Gap: 16px between columns. Slots can contain any form component.",
    demo: <RowVariantsDemo />,
  },
  {
    id: "forms",
    name: "forms",
    title: "Forms",
    description: "Form layout component with four variants: 'basic' (title + rows), 'capsule' (bordered container), 'shipping-module' (origin/destination with shipping details), 'horizontal-flow' (two capsules side by side with arrow). Uses RowVariants for flexible slot layouts and Titles (type='form') for headers.",
    demo: <FormsDemo />,
  },
  {
    id: "participant-summary",
    name: "participant-summary",
    title: "Participant Summary",
    description: "Summary bar showing participants involved in a phase. Displays role + entity name chips (e.g., 'Client @zara') separated by vertical dividers. Includes 'Edit participants' link button. Receives array of participants with role and name.",
    demo: <ParticipantSummaryDemo />,
  },
  {
    id: "participant-setup-box",
    name: "participant-setup-box",
    title: "Participant Setup Box",
    description: "Dynamic setup box with title, entity combobox (Command search), and 'New member' button. The modal opens centered with 36% black overlay. When users are selected, displays participants table with edit permission toggle and delete action.",
    demo: <ParticipantSetupBoxDemo />,
  },
  {
    id: "action-bar",
    name: "action-bar",
    title: "Action Bar",
    description: "Action bar with primary and secondary buttons aligned to the right. Primary uses default variant (black), secondary uses secondary variant (gray). Both buttons are size 'lg' (40px height) with rounded-xl (12px) border radius. Typically used at the bottom of forms or dialogs.",
    demo: <ActionBarDemo />,
  },
  {
    id: "block-heading",
    name: "block-heading",
    title: "Block Heading",
    description: "Block-level heading with four variants: 'active' (block title + subtitle + children like ParticipantSummary), 'view' (similar to active), 'default' (with Edit button), 'disabled' (muted title + disabled Edit button). Allows injecting content below the heading.",
    demo: <BlockHeadingDemo />,
  },
  {
    id: "collection-heading",
    name: "collection-heading",
    title: "Collection Heading",
    description: "Collection page heading showing '[collection:name] by [client:name]' title, status badge (draft/upcoming/in-progress/completed/canceled), progress indicator, and CTA buttons (Participants, Settings). Uses Main Section title style (36px).",
    demo: <CollectionHeadingDemo />,
  },
  {
    id: "collection-stepper",
    name: "collection-stepper",
    title: "Collection Stepper",
    description: "Master component for a collection phase: Vertical Progress Indicator + Step Summary + optional expand button. Three variants: locked, active, completed. CollectionStepSummary uses Titles (form) + StageStatusTag, TimeStampTag, DateIndicatorTag; active variant has Ring (2px outside stroke, zinc-900) per Figma 13526-38751.",
    demo: (
      <div className="w-full min-w-0 [&>*]:max-w-none [&>*]:w-full">
        <CollectionStepperDemo />
      </div>
    ),
  },
  {
    id: "layout",
    name: "layout",
    title: "Layout",
    description: "Slot-based layout container for organizing page content. Composed of Layout (main container, 40px padding), LayoutSection (groups of content, 20px gap), and LayoutSlot (placeholder/wrapper). Supports automatic separators between sections. Use with Tables, Grid, FilterBar, Titles, ParticipantSetupBox, and other components.",
    demo: <LayoutDemo />,
  },
  {
    id: "block",
    name: "block",
    title: "Block",
    description: "Slot-based block container with two main modes: Creation (active/completed/disabled) and View (active/inactive). Creation mode is for editing workflows with active state showing full form, completed showing edit button, disabled showing grayed out. View mode for displaying content with active showing expanded view and inactive showing collapsed accordion-style.",
    demo: <BlockTemplateDemo />,
  },
  {
    id: "modal-window",
    name: "modal-window",
    title: "Modal Window",
    description: "Right-aligned slide-in modal panel with overlay (#000 at 36% opacity). Structure: Header (Titles + Close button, fixed), Content (scrollable), Footer (ActionBar, fixed). Slides in from right with animation. Click outside or press Escape to close.",
    demo: <ModalWindowDemo />,
  },
  {
    id: "publish-collection-dialog",
    name: "publish-collection-dialog",
    title: "Publish Collection Dialog",
    description: "Centered dialog (Figma 175-32103) with overlay #000 at 40% opacity. Content: Titles (Ready to publish + subtitle), CollectionCard (landscape), ActionBar (Cancel / Publish collection). Used when user clicks Publish collection on Check Finals step.",
    demo: <PublishCollectionDialogDemo />,
  },
  {
    id: "user-creation-form",
    name: "user-creation-form",
    title: "User Creation Form",
    description: "Reusable form for creating users with two variants: 'Create User' (all fields editable) and 'New Admin User' (Entity prefilled/disabled, Role fixed to Admin). Uses ModalWindow structure with Layout and RowVariants (2 columns). Fields: First Name, Last Name, Email, Phone Number (PhoneInput), Entity (disabled select showing EntityType as label and EntityName as value), Role (Admin/Editor/Viewer).",
    demo: <UserCreationFormDemo />,
  },
  {
    id: "entity-basic-information-form",
    name: "entity-basic-information-form",
    title: "Entity Basic Information Form",
    description: "Step 1 form for creating standard entities (Client, Agency, Photo Lab, Edition Studio, Hand Print Lab). Uses BlockTemplate in creation mode. Three blocks: Entity Details (Entity Type + Name), Location (Street Address, ZIP Code, City, Country - optional for Client), Additional Information (Email, Phone, Profile Picture, Notes). Location block uses 1-column for Street Address and 3-columns for ZIP/City/Country. Additional Information uses 3-columns for Email/Phone/Upload and 1-column for Notes.",
    demo: <EntityBasicInformationFormDemo />,
  },
  {
    id: "templates",
    name: "templates",
    title: "Page Templates",
    description: "Reusable page templates for consistent layout and structure. Includes Main Template (for Collections, Entities, Team pages), Creation Template (for creation flows with sidebar stepper), and View Template (for view flows with sidebar menu). Each template has Basic and Contextual views.",
    demo: <TemplatesDemo />,
  },
  {
    id: "url-history",
    name: "url-history",
    title: "URL History",
    description: "Card component (Figma node 1125-1254329) displaying a URL entry with its associated comment thread. Features a title (text-lg semibold), threaded comments using StepDetails notes variant, and action buttons (Open link + Add comment). Nested replies are indented 50px per level and connected by straight 1px L-shaped connector lines (border color) originating at the parent avatar center (30px from card edge). Card: bg-background, border-border, rounded-xl, p-5, gap-5.",
    demo: (
      <div className="flex flex-col gap-8 w-full max-w-[500px]">
        {/* Single comment */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Single comment</p>
          <UrlHistory
            title="Low-res scans"
            comments={[
              {
                authorUserName: "Jorge Muniz",
                authorEntityName: "Aulaga Lab",
                text: "Low-res are ready! Check them out and let us know if something is missing or if there are any issues with the scans.",
                timestamp: "32 minutes ago",
              },
            ]}
            onOpenLink={() => {}}
            onAddComment={() => {}}
          />
        </div>

        {/* With nested replies */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">With nested replies</p>
          <UrlHistory
            title="Low-res scans"
            comments={[
              {
                authorUserName: "Jorge Muniz",
                authorEntityName: "Aulaga Lab",
                text: "Low-res are ready! Check them out and let us know if something is missing or if there are any issues with the scans.",
                timestamp: "32 minutes ago",
                replies: [
                  {
                    authorUserName: "Phill Romer",
                    authorEntityName: "Photographer",
                    text: "I'm missing the last negatives sent in the second drop-off!",
                    timestamp: "2 minutes ago",
                  },
                  {
                    authorUserName: "Phill Romer",
                    authorEntityName: "Photographer",
                    text: "Sorry, my wrong. Everything is okay 😊",
                    timestamp: "1 minute ago",
                  },
                ],
              },
            ]}
            onOpenLink={() => {}}
            onAddComment={() => {}}
          />
        </div>

        {/* Without action buttons */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Without action buttons</p>
          <UrlHistory
            title="Client selection"
            comments={[
              {
                authorUserName: "Erika Goldner",
                authorEntityName: "Zara",
                text: "Selection complete. We've chosen 42 photos for the final edit.",
                timestamp: "3 days ago",
              },
            ]}
          />
        </div>
      </div>
    ),
  },
]

