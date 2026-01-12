"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { MainTemplate } from "@/components/custom/templates/main-template"
import { Layout, LayoutSection, LayoutSlot } from "@/components/custom/layout"

export default function MainTemplatePage() {
  const [view, setView] = React.useState<"basic" | "contextual">("basic")

  return (
    <div className="min-h-screen">
      {/* View Toggle */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button
          variant={view === "basic" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("basic")}
        >
          Basic
        </Button>
        <Button
          variant={view === "contextual" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("contextual")}
        >
          Contextual
        </Button>
      </div>

      {view === "basic" ? (
        <MainTemplate title="Page Title">
          <LayoutSection>
            <LayoutSlot />
          </LayoutSection>
        </MainTemplate>
      ) : (
        <MainTemplate title="Collections">
          <Layout padding="md" showSeparators={true}>
            <LayoutSection>
              <LayoutSlot>
                <div className="p-4 bg-zinc-50 rounded-lg text-sm text-muted-foreground">
                  Collections content goes here (tables, cards, etc.)
                </div>
              </LayoutSlot>
            </LayoutSection>
            <LayoutSection>
              <LayoutSlot>
                <div className="p-4 bg-zinc-50 rounded-lg text-sm text-muted-foreground">
                  Additional sections
                </div>
              </LayoutSlot>
            </LayoutSection>
          </Layout>
        </MainTemplate>
      )}
    </div>
  )
}
