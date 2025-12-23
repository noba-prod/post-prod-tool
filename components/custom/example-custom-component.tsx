"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ExampleCustomComponentProps {
  title?: string
  description?: string
  className?: string
  children?: React.ReactNode
}

/**
 * Componente personalizado de ejemplo que reutiliza componentes base de shadcn/ui
 * 
 * @example
 * ```tsx
 * <ExampleCustomComponent 
 *   title="Mi título" 
 *   description="Mi descripción"
 * />
 * ```
 */
export function ExampleCustomComponent({
  title = "Componente Personalizado",
  description = "Este es un ejemplo de componente personalizado",
  className,
  children,
}: ExampleCustomComponentProps) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {children || (
          <div className="flex gap-2">
            <Button variant="default">Acción 1</Button>
            <Button variant="outline">Acción 2</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

