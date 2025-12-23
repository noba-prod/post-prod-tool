# Componentes Personalizados

Esta carpeta contiene componentes personalizados que reutilizan los componentes base de shadcn/ui.

## Estructura

```
components/
├── ui/              # Componentes base de shadcn/ui (no modificar)
└── custom/          # Componentes personalizados (aquí)
    ├── index.ts     # Exportaciones centralizadas
    └── *.tsx        # Componentes personalizados
```

## Convenciones

### Naming
- Usa nombres descriptivos en `kebab-case` para los archivos
- Usa nombres en `PascalCase` para los componentes
- Ejemplo: `user-profile-card.tsx` → `UserProfileCard`

### Estructura de un componente

```tsx
"use client"

import * as React from "react"
import { ComponentBase } from "@/components/ui/component-base"
import { cn } from "@/lib/utils"

interface MyCustomComponentProps {
  // Props del componente
  className?: string
}

/**
 * Descripción del componente
 * 
 * @example
 * ```tsx
 * <MyCustomComponent />
 * ```
 */
export function MyCustomComponent({
  className,
  ...props
}: MyCustomComponentProps) {
  return (
    <div className={cn("base-styles", className)} {...props}>
      {/* Contenido */}
    </div>
  )
}
```

## Importaciones

### Opción 1: Importación directa
```tsx
import { ExampleCustomComponent } from "@/components/custom/example-custom-component"
```

### Opción 2: Desde el index (recomendado)
```tsx
import { ExampleCustomComponent } from "@/components/custom"
```

### Opción 3: Usando el alias
```tsx
import { ExampleCustomComponent } from "@/custom"
```

## Ejemplo

Ver `example-custom-component.tsx` para un ejemplo completo de cómo crear un componente personalizado.

## Mejores Prácticas

1. **Reutiliza componentes base**: Siempre usa componentes de `@/components/ui` en lugar de crear desde cero
2. **Usa TypeScript**: Define interfaces claras para las props
3. **Documenta con JSDoc**: Añade documentación cuando el componente sea complejo
4. **Exporta desde index.ts**: Añade tus componentes al `index.ts` para facilitar las importaciones
5. **Mantén consistencia**: Sigue el mismo patrón de diseño que los componentes base

