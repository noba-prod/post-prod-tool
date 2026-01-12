"use client"

import * as React from "react"
import { ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"

// Common country codes with country names
const COUNTRY_CODES = [
  { code: "+34", country: "Spain" },
  { code: "+1", country: "United States" },
  { code: "+44", country: "United Kingdom" },
  { code: "+33", country: "France" },
  { code: "+49", country: "Germany" },
  { code: "+39", country: "Italy" },
  { code: "+351", country: "Portugal" },
  { code: "+52", country: "Mexico" },
  { code: "+55", country: "Brazil" },
  { code: "+54", country: "Argentina" },
  { code: "+57", country: "Colombia" },
  { code: "+56", country: "Chile" },
  { code: "+81", country: "Japan" },
  { code: "+86", country: "China" },
  { code: "+91", country: "India" },
  { code: "+82", country: "South Korea" },
  { code: "+61", country: "Australia" },
  { code: "+64", country: "New Zealand" },
  { code: "+31", country: "Netherlands" },
  { code: "+32", country: "Belgium" },
  { code: "+41", country: "Switzerland" },
  { code: "+43", country: "Austria" },
  { code: "+46", country: "Sweden" },
  { code: "+47", country: "Norway" },
  { code: "+45", country: "Denmark" },
  { code: "+358", country: "Finland" },
  { code: "+48", country: "Poland" },
  { code: "+420", country: "Czech Republic" },
  { code: "+7", country: "Russia" },
  { code: "+380", country: "Ukraine" },
] as const

interface PhoneInputProps {
  /** Label text */
  label?: string
  /** Country code value */
  countryCode?: string
  /** Phone number value */
  phoneNumber?: string
  /** Placeholder for phone input */
  placeholder?: string
  /** Callback when country code changes */
  onCountryCodeChange?: (code: string) => void
  /** Callback when phone number changes */
  onPhoneNumberChange?: (number: string) => void
  /** Whether the input is disabled */
  disabled?: boolean
  /** Additional class names */
  className?: string
}

/**
 * Phone Input component - Country code combobox with search + phone number input
 * 
 * Wraps Shadcn Popover, Command, and Input components for phone number entry.
 * Supports default, disabled, focus, and filled states.
 */
export function PhoneInput({
  label = "Phone number",
  countryCode = "+34",
  phoneNumber = "",
  placeholder = "649 393 291",
  onCountryCodeChange,
  onPhoneNumberChange,
  disabled = false,
  className,
}: PhoneInputProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (value: string) => {
    onCountryCodeChange?.(value)
    setOpen(false)
  }

  return (
    <div className={cn("flex flex-col gap-2 w-full", className)}>
      {/* Label */}
      <Label
        className={cn(
          "text-sm font-medium leading-none",
          disabled ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {label}
      </Label>

      {/* Inputs row - 8px gap (gap-2) */}
      <div className="flex gap-2 items-center">
        {/* Country Code Combobox */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className={cn(
                "w-16 h-10 justify-between px-3 font-medium text-sm shrink-0",
                disabled && "opacity-50"
              )}
            >
              {countryCode}
              <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search country..." />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {COUNTRY_CODES.map((item) => (
                    <CommandItem
                      key={item.code}
                      value={`${item.code} ${item.country}`}
                      onSelect={() => handleSelect(item.code)}
                      data-checked={countryCode === item.code}
                    >
                      <span className="font-medium">{item.code}</span>
                      <span className="text-muted-foreground">({item.country})</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Phone Number Input */}
        <Input
          type="tel"
          value={phoneNumber}
          onChange={(e) => onPhoneNumberChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "h-10 flex-1 rounded-md px-3",
            disabled && "opacity-50"
          )}
        />
      </div>
    </div>
  )
}
