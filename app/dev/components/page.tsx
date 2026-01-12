"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Logo } from "@/components/custom/logo"
import { shadcnRegistry, type ComponentEntry } from "@/components/previewer/registry/shadcn"
import { customRegistry } from "@/components/previewer/registry/custom"

function ComponentList({ 
  components, 
  searchQuery 
}: { 
  components: ComponentEntry[]
  searchQuery: string 
}) {
  const filtered = components.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12" style={{ color: '#71717a' }}>
        <p>No components found matching "{searchQuery}"</p>
      </div>
    )
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {filtered.map((component) => (
        <AccordionItem key={component.id} value={component.id} style={{ borderColor: '#e4e4e7' }}>
          <AccordionTrigger className="text-base font-medium hover:no-underline" style={{ color: '#09090b' }}>
            {component.title}
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 pt-2 pb-4">
              {/* Live Preview */}
              <div className="rounded-lg border p-6 flex items-start justify-center" style={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7' }}>
                <div className="w-full">
                  {component.demo}
                </div>
              </div>
              
              {/* Description */}
              <div className="rounded-lg p-6 h-fit" style={{ backgroundColor: '#f4f4f5' }}>
                <h4 className="font-semibold mb-3" style={{ color: '#09090b' }}>Description</h4>
                <p className="text-sm leading-relaxed" style={{ color: '#71717a' }}>
                  {component.description}
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

export default function DevComponentsPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("shadcn")

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setSearchQuery("")
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffffff', color: '#09090b' }}>
      {/* Top Bar - fixed */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full border-b backdrop-blur" style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e4e4e7' }}>
        <div className="flex h-14 items-center px-6 gap-6">
          <Logo variant="isotype" size="md" />
          
          <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-none">
            <TabsList className="h-9">
              <TabsTrigger value="shadcn">Shadcn originals</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex-1" />

          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search component"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
        </div>
      </header>

      {/* Main Content - scrolleable */}
      <main className="px-6 pt-24 pb-8 w-full" style={{ color: '#09090b' }}>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsContent value="shadcn" className="mt-0">
            <h1 className="text-3xl font-bold tracking-tight mb-8" style={{ color: '#09090b' }}>Shadcn originals</h1>
            <ComponentList 
              components={shadcnRegistry} 
              searchQuery={searchQuery} 
            />
          </TabsContent>

          <TabsContent value="custom" className="mt-0">
            <h1 className="text-3xl font-bold tracking-tight mb-8" style={{ color: '#09090b' }}>Custom</h1>
            <ComponentList 
              components={customRegistry} 
              searchQuery={searchQuery} 
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

