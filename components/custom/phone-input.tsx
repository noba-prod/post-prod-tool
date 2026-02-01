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
import { PHONE_PREFIXES } from "@/lib/data/location"

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
  const [searchValue, setSearchValue] = React.useState("")

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      // Accept custom prefix on close: if user typed something not in the list, use it
      const trimmed = searchValue.trim()
      if (trimmed && !PHONE_PREFIXES.some((p) => p.code === trimmed || `${p.code} ${p.country}` === trimmed)) {
        onCountryCodeChange?.(trimmed)
      }
      setSearchValue("")
    }
    setOpen(nextOpen)
  }

  const handleSelect = (code: string) => {
    onCountryCodeChange?.(code)
    setOpen(false)
    setSearchValue("")
  }

  const displayLabel = React.useMemo(() => {
    const match = PHONE_PREFIXES.find((p) => p.code === countryCode)
    return match ? `${match.code} ${match.country}` : countryCode
  }, [countryCode])

  return (
    <div
      className={cn(
        "flex flex-col w-full gap-[var(--field-inner-gap,0.5rem)]",
        className
      )}
    >
      {/* Label - uses --field-inner-gap from FieldGroup so height matches other fields */}
      {label && (
        <Label
          className={cn(
            "h-[14px] text-sm font-medium leading-none w-fit",
            disabled ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {label}
        </Label>
      )}

      {/* Inputs row - same gap as Field (from parent --field-inner-gap) */}
      <div className="flex items-center gap-[var(--field-inner-gap,0.5rem)]">
        {/* Country Code Combobox - full list with country name; custom prefix accepted on close */}
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className={cn(
                "h-9 justify-between pl-3 pr-1.5 font-medium text-sm shrink-0 min-w-fit max-w-[200px] truncate",
                disabled && "opacity-50"
              )}
            >
              <span className="truncate">{displayLabel}</span>
              <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0 ml-1.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0" align="start">
            <Command shouldFilter={true}>
              <CommandInput
                placeholder="Search country or code..."
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList>
                <CommandEmpty>No match. You can type your own prefix (e.g. +999).</CommandEmpty>
                <CommandGroup>
                  {PHONE_PREFIXES.map((item) => (
                    <CommandItem
                      key={`${item.code}-${item.country}`}
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
            "h-9 flex-1 rounded-md px-3",
            disabled && "opacity-50"
          )}
        />
      </div>
    </div>
  )
}
