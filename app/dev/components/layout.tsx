"use client"

import { useEffect } from "react"

export default function DevComponentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Force light mode by removing dark class and adding light
    document.documentElement.classList.remove("dark")
    document.documentElement.classList.add("light")
    document.documentElement.style.colorScheme = "light"
    
    return () => {
      document.documentElement.classList.remove("light")
      document.documentElement.style.colorScheme = ""
    }
  }, [])

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {children}
    </div>
  )
}

