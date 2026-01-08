"use client"

import * as React from "react"

// UI Components
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { ButtonGroup } from "@/components/ui/button-group"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarTrigger } from "@/components/ui/menubar"
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Spinner } from "@/components/ui/spinner"
import { Kbd } from "@/components/ui/kbd"
import { NativeSelect } from "@/components/ui/native-select"
import { Empty } from "@/components/ui/empty"

// Icons
import { 
  AlertCircle, 
  Bell, 
  Bold, 
  Calendar as CalendarIcon, 
  Check, 
  ChevronRight, 
  ChevronsUpDown,
  Cloud,
  CreditCard,
  FileText,
  Home,
  Italic,
  Keyboard,
  LifeBuoy,
  LogOut,
  Mail,
  MessageSquare,
  Plus,
  PlusCircle,
  Settings,
  Underline,
  User,
  UserPlus,
  Users,
  Inbox,
} from "lucide-react"

export interface ComponentEntry {
  id: string
  name: string
  title: string
  description: string
  demo: React.ReactNode
}

export const shadcnRegistry: ComponentEntry[] = [
  {
    id: "accordion",
    name: "accordion",
    title: "Accordion",
    description: "A vertically stacked set of interactive headings that each reveal a section of content. Built on Radix UI primitives with WAI-ARIA compliance for accessibility.",
    demo: (
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger>Is it accessible?</AccordionTrigger>
          <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Is it styled?</AccordionTrigger>
          <AccordionContent>Yes. Comes with default styles that match your theme.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>Is it animated?</AccordionTrigger>
          <AccordionContent>Yes. Animated by default with smooth transitions.</AccordionContent>
        </AccordionItem>
      </Accordion>
    ),
  },
  {
    id: "alert",
    name: "alert",
    title: "Alert",
    description: "Displays a callout for user attention. Ideal for important messages, warnings, or success notifications that need to stand out in the interface.",
    demo: (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription>You can add components to your app using the CLI.</AlertDescription>
      </Alert>
    ),
  },
  {
    id: "alert-dialog",
    name: "alert-dialog",
    title: "Alert Dialog",
    description: "A modal dialog that interrupts the user with important content and expects a response. Used for destructive actions or critical confirmations.",
    demo: (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline">Show Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ),
  },
  {
    id: "aspect-ratio",
    name: "aspect-ratio",
    title: "Aspect Ratio",
    description: "Displays content within a desired ratio. Useful for images, videos, and responsive media that need to maintain proportions across screen sizes.",
    demo: (
      <AspectRatio ratio={16 / 9} className="bg-muted rounded-md flex items-center justify-center">
        <span className="text-muted-foreground text-sm">16:9 Aspect Ratio</span>
      </AspectRatio>
    ),
  },
  {
    id: "avatar",
    name: "avatar",
    title: "Avatar",
    description: "An image element with a fallback for representing the user. Supports images, initials, and icons with customizable sizes and shapes.",
    demo: (
      <div className="flex gap-4">
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      </div>
    ),
  },
  {
    id: "badge",
    name: "badge",
    title: "Badge",
    description: "Displays a badge or pill-like component. Perfect for status indicators, labels, counts, or category tags throughout the interface.",
    demo: (
      <div className="flex gap-2 flex-wrap">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Destructive</Badge>
      </div>
    ),
  },
  {
    id: "breadcrumb",
    name: "breadcrumb",
    title: "Breadcrumb",
    description: "Shows the user's location within a navigational hierarchy. Helps users understand context and navigate back through the application structure.",
    demo: (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Components</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    ),
  },
  {
    id: "button-group",
    name: "button-group",
    title: "Button Group",
    description: "Groups multiple buttons together visually. Useful for related actions, toolbar controls, or segmented options that belong together.",
    demo: (
      <ButtonGroup>
        <Button variant="outline">Left</Button>
        <Button variant="outline">Center</Button>
        <Button variant="outline">Right</Button>
      </ButtonGroup>
    ),
  },
  {
    id: "button",
    name: "button",
    title: "Button",
    description: "Displays a button or button-like component. The primary interactive element for user actions with multiple variants, sizes, and states.",
    demo: (
      <div className="flex gap-2 flex-wrap">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
      </div>
    ),
  },
  {
    id: "calendar",
    name: "calendar",
    title: "Calendar",
    description: "A date field component that allows users to enter and edit date values. Built with react-day-picker for robust date selection functionality.",
    demo: (
      <Calendar
        mode="single"
        className="rounded-md border"
      />
    ),
  },
  {
    id: "card",
    name: "card",
    title: "Card",
    description: "Displays a card with header, content, and footer sections. A versatile container for grouping related information and actions.",
    demo: (
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description goes here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card content with any elements.</p>
        </CardContent>
        <CardFooter>
          <Button>Action</Button>
        </CardFooter>
      </Card>
    ),
  },
  {
    id: "carousel",
    name: "carousel",
    title: "Carousel",
    description: "A carousel with motion and swipe capabilities built using Embla. Perfect for image galleries, testimonials, or any sliding content.",
    demo: (
      <Carousel className="w-full max-w-xs">
        <CarouselContent>
          {[1, 2, 3].map((i) => (
            <CarouselItem key={i}>
              <div className="p-1">
                <Card>
                  <CardContent className="flex aspect-square items-center justify-center p-6">
                    <span className="text-4xl font-semibold">{i}</span>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    ),
  },
  {
    id: "chart",
    name: "chart",
    title: "Chart",
    description: "Beautiful charts built with Recharts. Provides configurable, accessible data visualizations including bar, line, area, and pie charts.",
    demo: (
      <div className="h-[200px] w-full flex items-center justify-center bg-muted/50 rounded-md">
        <span className="text-muted-foreground text-sm">Chart component requires data configuration</span>
      </div>
    ),
  },
  {
    id: "checkbox",
    name: "checkbox",
    title: "Checkbox",
    description: "A control that allows the user to toggle between checked and not checked states. Supports indeterminate state and form integration.",
    demo: (
      <div className="flex items-center space-x-2">
        <Checkbox id="terms" />
        <Label htmlFor="terms">Accept terms and conditions</Label>
      </div>
    ),
  },
  {
    id: "collapsible",
    name: "collapsible",
    title: "Collapsible",
    description: "An interactive component which expands and collapses a panel. Useful for progressive disclosure and managing content density.",
    demo: (
      <Collapsible className="w-[350px] space-y-2">
        <div className="flex items-center justify-between space-x-4 px-4">
          <h4 className="text-sm font-semibold">@peduarte starred 3 repositories</h4>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm"><ChevronsUpDown className="h-4 w-4" /></Button>
          </CollapsibleTrigger>
        </div>
        <div className="rounded-md border px-4 py-3 font-mono text-sm">@radix-ui/primitives</div>
        <CollapsibleContent className="space-y-2">
          <div className="rounded-md border px-4 py-3 font-mono text-sm">@radix-ui/colors</div>
          <div className="rounded-md border px-4 py-3 font-mono text-sm">@stitches/react</div>
        </CollapsibleContent>
      </Collapsible>
    ),
  },
  {
    id: "combobox",
    name: "combobox",
    title: "Combobox",
    description: "Autocomplete input with dropdown selection. Combines text input with a listbox, allowing users to filter and select from options.",
    demo: (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[200px] justify-between">
            Select framework...
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search framework..." />
            <CommandList>
              <CommandEmpty>No framework found.</CommandEmpty>
              <CommandGroup>
                <CommandItem>Next.js</CommandItem>
                <CommandItem>Remix</CommandItem>
                <CommandItem>Astro</CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    ),
  },
  {
    id: "command",
    name: "command",
    title: "Command",
    description: "Fast, composable command menu for your application. Powers command palettes, search dialogs, and quick action interfaces.",
    demo: (
      <Command className="rounded-lg border shadow-md w-[300px]">
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem><CalendarIcon className="mr-2 h-4 w-4" />Calendar</CommandItem>
            <CommandItem><Mail className="mr-2 h-4 w-4" />Mail</CommandItem>
            <CommandItem><Settings className="mr-2 h-4 w-4" />Settings</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    ),
  },
  {
    id: "context-menu",
    name: "context-menu",
    title: "Context Menu",
    description: "Displays a menu at the pointer position when triggered by right-click. Provides contextual actions for specific elements.",
    demo: (
      <ContextMenu>
        <ContextMenuTrigger className="flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm">
          Right click here
        </ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          <ContextMenuItem>Back</ContextMenuItem>
          <ContextMenuItem>Forward</ContextMenuItem>
          <ContextMenuItem>Reload</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    ),
  },
  {
    id: "data-table",
    name: "data-table",
    title: "Data Table",
    description: "Powerful table component with sorting, filtering, and pagination built on TanStack Table. For displaying and manipulating large datasets.",
    demo: (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Alice</TableCell>
            <TableCell>Active</TableCell>
            <TableCell>Admin</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Bob</TableCell>
            <TableCell>Pending</TableCell>
            <TableCell>User</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    ),
  },
  {
    id: "date-picker",
    name: "date-picker",
    title: "Date Picker",
    description: "A date picker component with range and presets. Combines calendar with popover for intuitive date selection experiences.",
    demo: (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            Pick a date
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" />
        </PopoverContent>
      </Popover>
    ),
  },
  {
    id: "dialog",
    name: "dialog",
    title: "Dialog",
    description: "A window overlaid on the primary content. Used for important interactions that require user attention without leaving the current context.",
    demo: (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog description or content goes here.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    ),
  },
  {
    id: "drawer",
    name: "drawer",
    title: "Drawer",
    description: "A drawer component for mobile-friendly interactions. Slides in from screen edges with smooth animations and gesture support.",
    demo: (
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="outline">Open Drawer</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Drawer Title</DrawerTitle>
            <DrawerDescription>Drawer description here.</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button>Submit</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    ),
  },
  {
    id: "dropdown-menu",
    name: "dropdown-menu",
    title: "Dropdown Menu",
    description: "Displays a menu with a set of actions or options. Triggered by a button, with support for submenus, checkboxes, and radio items.",
    demo: (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Open Menu</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem><User className="mr-2 h-4 w-4" />Profile</DropdownMenuItem>
          <DropdownMenuItem><CreditCard className="mr-2 h-4 w-4" />Billing</DropdownMenuItem>
          <DropdownMenuItem><Settings className="mr-2 h-4 w-4" />Settings</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
  {
    id: "empty",
    name: "empty",
    title: "Empty",
    description: "A placeholder component for empty states. Displays helpful messaging when there is no data or content to show.",
    demo: (
      <Empty>
        <Inbox className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">No items found</p>
      </Empty>
    ),
  },
  {
    id: "field",
    name: "field",
    title: "Field",
    description: "A form field wrapper that combines label, input, and error messaging. Provides consistent styling and accessibility for form controls.",
    demo: (
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input type="email" id="email" placeholder="Email" />
      </div>
    ),
  },
  {
    id: "hover-card",
    name: "hover-card",
    title: "Hover Card",
    description: "Shows additional content when hovering over an element. Perfect for previews, user profiles, or supplementary information on hover.",
    demo: (
      <HoverCard>
        <HoverCardTrigger asChild>
          <Button variant="link">@nextjs</Button>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          <div className="flex justify-between space-x-4">
            <Avatar>
              <AvatarImage src="https://github.com/vercel.png" />
              <AvatarFallback>VC</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">@nextjs</h4>
              <p className="text-sm">The React Framework – created and maintained by @vercel.</p>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    ),
  },
  {
    id: "input-group",
    name: "input-group",
    title: "Input Group",
    description: "Groups input with related elements like icons, buttons, or text. Creates cohesive input patterns for enhanced user experience.",
    demo: (
      <div className="flex w-full max-w-sm items-center space-x-2">
        <Input type="email" placeholder="Email" />
        <Button type="submit">Subscribe</Button>
      </div>
    ),
  },
  {
    id: "input-otp",
    name: "input-otp",
    title: "Input OTP",
    description: "Accessible one-time password input component. Designed for verification codes with auto-focus and paste support.",
    demo: (
      <InputOTP maxLength={6}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
    ),
  },
  {
    id: "input",
    name: "input",
    title: "Input",
    description: "Displays a text input field. The fundamental form control for collecting user text input with various types and states.",
    demo: (
      <div className="grid w-full max-w-sm gap-2">
        <Input type="email" placeholder="Email" />
        <Input type="password" placeholder="Password" />
        <Input disabled placeholder="Disabled" />
      </div>
    ),
  },
  {
    id: "item",
    name: "item",
    title: "Item",
    description: "A generic list item component with consistent styling. Used as a building block for lists, menus, and selection interfaces.",
    demo: (
      <div className="space-y-2 w-full max-w-sm">
        <div className="flex items-center gap-2 p-2 rounded-md border">
          <FileText className="h-4 w-4" />
          <span className="text-sm">Document item</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-md border">
          <User className="h-4 w-4" />
          <span className="text-sm">User item</span>
        </div>
      </div>
    ),
  },
  {
    id: "kbd",
    name: "kbd",
    title: "Kbd",
    description: "Displays keyboard key indicators. Shows keyboard shortcuts or key combinations in documentation and help interfaces.",
    demo: (
      <div className="flex gap-2 items-center">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
        <span className="text-muted-foreground text-sm ml-2">to open command menu</span>
      </div>
    ),
  },
  {
    id: "label",
    name: "label",
    title: "Label",
    description: "Renders an accessible label associated with controls. Essential for form accessibility and proper input identification.",
    demo: (
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="picture">Picture</Label>
        <Input id="picture" type="file" />
      </div>
    ),
  },
  {
    id: "menubar",
    name: "menubar",
    title: "Menubar",
    description: "A horizontal menu bar component. Provides application-level navigation similar to desktop software menu systems.",
    demo: (
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>New Tab</MenubarItem>
            <MenubarItem>New Window</MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Share</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>Undo</MenubarItem>
            <MenubarItem>Redo</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    ),
  },
  {
    id: "native-select",
    name: "native-select",
    title: "Native Select",
    description: "A styled native HTML select element. Provides consistent styling while maintaining native browser behaviors and accessibility.",
    demo: (
      <NativeSelect className="w-[180px]">
        <option value="">Select an option</option>
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
        <option value="3">Option 3</option>
      </NativeSelect>
    ),
  },
  {
    id: "navigation-menu",
    name: "navigation-menu",
    title: "Navigation Menu",
    description: "A collection of navigation links. Provides accessible mega-menu style navigation with support for complex nested structures.",
    demo: (
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid gap-3 p-4 w-[400px]">
                <li><NavigationMenuLink href="#">Introduction</NavigationMenuLink></li>
                <li><NavigationMenuLink href="#">Installation</NavigationMenuLink></li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="#">Documentation</NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    ),
  },
  {
    id: "pagination",
    name: "pagination",
    title: "Pagination",
    description: "Navigation for paginated content. Provides controls to move between pages of data with clear visual indicators.",
    demo: (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#" isActive>2</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">3</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    ),
  },
  {
    id: "popover",
    name: "popover",
    title: "Popover",
    description: "Displays rich content in a floating container. Positioned relative to a trigger element for contextual overlays.",
    demo: (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Open Popover</Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Dimensions</h4>
              <p className="text-sm text-muted-foreground">Set the dimensions for the layer.</p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    ),
  },
  {
    id: "progress",
    name: "progress",
    title: "Progress",
    description: "Displays a progress bar indicating completion status. Used for loading states, upload progress, or step completion.",
    demo: (
      <div className="w-full max-w-sm space-y-2">
        <Progress value={33} />
        <Progress value={66} />
        <Progress value={100} />
      </div>
    ),
  },
  {
    id: "radio-group",
    name: "radio-group",
    title: "Radio Group",
    description: "A set of checkable buttons where only one can be checked. Used for selecting a single option from multiple choices.",
    demo: (
      <RadioGroup defaultValue="option-one">
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="option-one" id="option-one" />
          <Label htmlFor="option-one">Option One</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="option-two" id="option-two" />
          <Label htmlFor="option-two">Option Two</Label>
        </div>
      </RadioGroup>
    ),
  },
  {
    id: "scroll-area",
    name: "scroll-area",
    title: "Scroll Area",
    description: "Augments native scroll with custom styling. Provides consistent cross-browser scrolling behavior with optional scrollbars.",
    demo: (
      <ScrollArea className="h-[200px] w-[350px] rounded-md border p-4">
        <div className="space-y-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="text-sm">
              Scrollable content item {i + 1}. This is a longer text to demonstrate the scroll area functionality.
            </div>
          ))}
        </div>
      </ScrollArea>
    ),
  },
  {
    id: "select",
    name: "select",
    title: "Select",
    description: "Displays a list of options for the user to pick from. A fully accessible select menu with customizable styling.",
    demo: (
      <Select>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
          <SelectItem value="orange">Orange</SelectItem>
        </SelectContent>
      </Select>
    ),
  },
  {
    id: "separator",
    name: "separator",
    title: "Separator",
    description: "Visually separates content. A simple horizontal or vertical line used to divide sections or group related content.",
    demo: (
      <div className="space-y-4 w-full max-w-sm">
        <div>
          <p className="text-sm">Content above</p>
        </div>
        <Separator />
        <div>
          <p className="text-sm">Content below</p>
        </div>
      </div>
    ),
  },
  {
    id: "sheet",
    name: "sheet",
    title: "Sheet",
    description: "Extends the dialog component to display content that complements the main content. Slides in from screen edge as an overlay.",
    demo: (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Open Sheet</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Sheet Title</SheetTitle>
            <SheetDescription>Sheet description and content here.</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    ),
  },
  {
    id: "sidebar",
    name: "sidebar",
    title: "Sidebar",
    description: "A composable sidebar component. Creates responsive navigation sidebars with collapsible sections and mobile support.",
    demo: (
      <div className="flex h-[200px] w-[300px] rounded-md border">
        <div className="w-16 border-r bg-muted/50 flex flex-col items-center py-4 gap-4">
          <Home className="h-5 w-5" />
          <FileText className="h-5 w-5" />
          <Settings className="h-5 w-5" />
        </div>
        <div className="flex-1 p-4">
          <p className="text-sm text-muted-foreground">Main content area</p>
        </div>
      </div>
    ),
  },
  {
    id: "skeleton",
    name: "skeleton",
    title: "Skeleton",
    description: "Loading placeholder that mimics content shape. Shows animated placeholders while content is loading for better UX.",
    demo: (
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>
    ),
  },
  {
    id: "slider",
    name: "slider",
    title: "Slider",
    description: "An input for selecting values from a range. Provides intuitive draggable control for numeric value selection.",
    demo: (
      <div className="w-full max-w-sm space-y-4">
        <Slider defaultValue={[50]} max={100} step={1} />
        <Slider defaultValue={[25, 75]} max={100} step={1} />
      </div>
    ),
  },
  {
    id: "sonner",
    name: "sonner",
    title: "Sonner",
    description: "An opinionated toast component. Provides elegant, animated notifications for user feedback and system messages.",
    demo: (
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => {}}>Show Toast</Button>
        <span className="text-sm text-muted-foreground">(Requires Toaster provider)</span>
      </div>
    ),
  },
  {
    id: "spinner",
    name: "spinner",
    title: "Spinner",
    description: "A loading spinner indicator. Shows that a process is ongoing with an animated circular indicator.",
    demo: (
      <div className="flex gap-4 items-center">
        <Spinner />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    ),
  },
  {
    id: "switch",
    name: "switch",
    title: "Switch",
    description: "A toggle control for switching between two states. Ideal for on/off settings and binary preferences.",
    demo: (
      <div className="flex items-center space-x-2">
        <Switch id="airplane-mode" />
        <Label htmlFor="airplane-mode">Airplane Mode</Label>
      </div>
    ),
  },
  {
    id: "table",
    name: "table",
    title: "Table",
    description: "A responsive table component. Displays tabular data with consistent styling and accessibility features.",
    demo: (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>INV001</TableCell>
            <TableCell>Paid</TableCell>
            <TableCell className="text-right">$250.00</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>INV002</TableCell>
            <TableCell>Pending</TableCell>
            <TableCell className="text-right">$150.00</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    ),
  },
  {
    id: "tabs",
    name: "tabs",
    title: "Tabs",
    description: "A set of layered sections of content. Organizes related content into separate views within a shared context.",
    demo: (
      <Tabs defaultValue="account" className="w-[400px]">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>
        <TabsContent value="account">Account settings content here.</TabsContent>
        <TabsContent value="password">Password settings content here.</TabsContent>
      </Tabs>
    ),
  },
  {
    id: "textarea",
    name: "textarea",
    title: "Textarea",
    description: "A multi-line text input field. Used for longer form content like messages, descriptions, or comments.",
    demo: (
      <Textarea placeholder="Type your message here." className="w-full max-w-sm" />
    ),
  },
  {
    id: "toggle-group",
    name: "toggle-group",
    title: "Toggle Group",
    description: "A group of toggle buttons that work together. Used for selecting one or multiple options from a set.",
    demo: (
      <ToggleGroup type="multiple">
        <ToggleGroupItem value="bold" aria-label="Toggle bold"><Bold className="h-4 w-4" /></ToggleGroupItem>
        <ToggleGroupItem value="italic" aria-label="Toggle italic"><Italic className="h-4 w-4" /></ToggleGroupItem>
        <ToggleGroupItem value="underline" aria-label="Toggle underline"><Underline className="h-4 w-4" /></ToggleGroupItem>
      </ToggleGroup>
    ),
  },
  {
    id: "toggle",
    name: "toggle",
    title: "Toggle",
    description: "A two-state button that can be on or off. Used for enabling/disabling features or modes.",
    demo: (
      <div className="flex gap-2">
        <Toggle aria-label="Toggle bold"><Bold className="h-4 w-4" /></Toggle>
        <Toggle aria-label="Toggle italic"><Italic className="h-4 w-4" /></Toggle>
      </div>
    ),
  },
  {
    id: "tooltip",
    name: "tooltip",
    title: "Tooltip",
    description: "A popup that displays information on hover or focus. Provides helpful hints or descriptions for UI elements.",
    demo: (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Hover me</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>This is a tooltip</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
  },
]

