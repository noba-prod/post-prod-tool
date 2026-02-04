"use client"

import * as React from "react"
import { PhoneInput } from "../phone-input"
import { DatePicker } from "../date-picker"
import { SlotPicker } from "../slot-picker"
import { OptionPicker } from "../option-picker"
import { EntitySelected } from "../entity-selected"
import { SwitchList } from "../switch-list"
import { InformativeToast } from "../informative-toast"

const OPTION_ITEMS = [
  { value: "option-01", label: "Option 01" },
  { value: "option-02", label: "Option 02" },
  { value: "option-03", label: "Option 03" },
  { value: "option-04", label: "Option 04" },
  { value: "option-05", label: "Option 05" },
  { value: "option-06", label: "Option 06" },
  { value: "option-07", label: "Option 07" },
  { value: "option-08", label: "Option 08" },
  { value: "option-09", label: "Option 09" },
]

/**
 * Interactive demo for all Form Item components
 */
export function FormItemsDemo() {
  // Phone Input state
  const [countryCode, setCountryCode] = React.useState("+34")
  const [phoneNumber, setPhoneNumber] = React.useState("")

  // Date Picker state
  const [date, setDate] = React.useState<Date | undefined>()

  // Time Picker state
  const [time, setTime] = React.useState<string | undefined>()

  // Option Picker state
  const [option, setOption] = React.useState<string | undefined>()

  // Switch List state
  const [switches, setSwitches] = React.useState([
    { id: "switch-1", label: "Switch Text", checked: false },
    { id: "switch-2", label: "Switch Text", checked: true },
  ])

  const handleSwitchChange = (id: string, checked: boolean) => {
    setSwitches(prev =>
      prev.map(item =>
        item.id === id ? { ...item, checked } : item
      )
    )
  }

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Phone Input */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">Phone Input</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Default (interactive)</p>
            <PhoneInput
              countryCode={countryCode}
              phoneNumber={phoneNumber}
              onCountryCodeChange={setCountryCode}
              onPhoneNumberChange={setPhoneNumber}
              className="max-w-[280px]"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Disabled</p>
            <PhoneInput
              countryCode="+34"
              phoneNumber="649 393 291"
              disabled
              className="max-w-[280px]"
            />
          </div>
        </div>
      </div>

      {/* Date Picker */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">Date Picker</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Default (interactive)</p>
            <DatePicker
              date={date}
              onDateChange={setDate}
              className="max-w-[275px]"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Disabled</p>
            <DatePicker
              disabled
              className="max-w-[275px]"
            />
          </div>
        </div>
      </div>

      {/* Time Picker */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">Time Picker</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Default (interactive)</p>
            <SlotPicker
              value={time}
              onValueChange={setTime}
              className="max-w-[176px]"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Disabled</p>
            <SlotPicker
              disabled
              className="max-w-[176px]"
            />
          </div>
        </div>
      </div>

      {/* Option Picker */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">Option Picker</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Default (interactive)</p>
            <OptionPicker
              options={OPTION_ITEMS}
              value={option}
              onValueChange={setOption}
              className="max-w-[176px]"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Disabled</p>
            <OptionPicker
              options={OPTION_ITEMS}
              disabled
              className="max-w-[176px]"
            />
          </div>
        </div>
      </div>

      {/* Entity Selected */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">Entity Selected</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Default (removable)</p>
            <EntitySelected
              entityType="Entity"
              value="Value"
              onRemove={() => alert("Remove clicked!")}
              className="max-w-[194px]"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Locked (disabled)</p>
            <EntitySelected
              entityType="Entity"
              value="Value"
              locked
              disabled
              className="max-w-[194px]"
            />
          </div>
        </div>
      </div>

      {/* Switch List */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">Switch List</p>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Interactive switches</p>
          <SwitchList
            items={switches}
            onItemChange={handleSwitchChange}
            className="max-w-[400px]"
          />
        </div>
      </div>

      {/* Informative Toast */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">Informative Toast</p>
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Info (default)</p>
            <InformativeToast
              message="The client will be responsible for defining key details of the shipping to ensure successful tracking of the drop-off."
              className="max-w-[617px]"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Success</p>
            <InformativeToast
              variant="success"
              message="Your changes have been saved successfully."
              className="max-w-[617px]"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Warning</p>
            <InformativeToast
              variant="warning"
              message="Please review your settings before continuing."
              className="max-w-[617px]"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Error</p>
            <InformativeToast
              variant="error"
              message="An error occurred while processing your request."
              className="max-w-[617px]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
