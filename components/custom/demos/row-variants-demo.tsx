"use client"

import * as React from "react"
import { RowVariants, SlotPlaceholder } from "../row-variants"
import { PhoneInput } from "../phone-input"
import { DatePicker } from "../date-picker"
import { TimePicker } from "../time-picker"
import { OptionPicker } from "../option-picker"
import { EntitySelected } from "../entity-selected"
import { SwitchList } from "../switch-list"
import { InformativeToast } from "../informative-toast"
import { CheckSelection } from "../check-selection"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Demo for Row Variants component showing all 3 variants with real components
 */
export function RowVariantsDemo() {
  const [date, setDate] = React.useState<Date | undefined>()
  const [time, setTime] = React.useState<string | undefined>()
  const [option, setOption] = React.useState<string | undefined>()
  const [countryCode, setCountryCode] = React.useState("+34")
  const [phoneNumber, setPhoneNumber] = React.useState("")
  const [selectedItems, setSelectedItems] = React.useState<string[]>([])
  const [switches, setSwitches] = React.useState([
    { id: "switch-1", label: "Option A", checked: false },
    { id: "switch-2", label: "Option B", checked: true },
  ])

  const handleSwitchChange = (id: string, checked: boolean) => {
    setSwitches(prev =>
      prev.map(item => (item.id === id ? { ...item, checked } : item))
    )
  }

  const toggleSelection = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Variant 1: Single column */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Variant 1 (1 column)
        </p>
        <RowVariants variant="1">
          <SlotPlaceholder />
        </RowVariants>
        <p className="text-xs text-muted-foreground">With real component:</p>
        <RowVariants variant="1">
          <InformativeToast
            message="The client will be responsible for defining key details of the shipping to ensure successful tracking."
          />
        </RowVariants>
      </div>

      {/* Variant 2: Two columns */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Variant 2 (2 columns)
        </p>
        <RowVariants variant="2">
          <SlotPlaceholder />
          <SlotPlaceholder />
        </RowVariants>
        <p className="text-xs text-muted-foreground">With real components:</p>
        <RowVariants variant="2">
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Name</Label>
            <Input placeholder="Enter your name" className="h-10" />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Email</Label>
            <Input type="email" placeholder="Enter your email" className="h-10" />
          </div>
        </RowVariants>
        <RowVariants variant="2">
          <DatePicker
            label="Start date"
            date={date}
            onDateChange={setDate}
          />
          <TimePicker
            label="Time slot"
            value={time}
            onValueChange={setTime}
          />
        </RowVariants>
      </div>

      {/* Variant 3: Three columns */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Variant 3 (3 columns)
        </p>
        <RowVariants variant="3">
          <SlotPlaceholder />
          <SlotPlaceholder />
          <SlotPlaceholder />
        </RowVariants>
        <p className="text-xs text-muted-foreground">With real components:</p>
        <RowVariants variant="3">
          <OptionPicker
            label="Category"
            options={[
              { value: "cat-1", label: "Category 1" },
              { value: "cat-2", label: "Category 2" },
              { value: "cat-3", label: "Category 3" },
            ]}
            value={option}
            onValueChange={setOption}
          />
          <EntitySelected
            label="Client"
            entityType="@zara"
            value="Spain"
          />
          <TimePicker
            label="Delivery"
            value={time}
            onValueChange={setTime}
          />
        </RowVariants>
        <RowVariants variant="3">
          <CheckSelection
            label="Option 1"
            selected={selectedItems.includes("opt1")}
            onClick={() => toggleSelection("opt1")}
          />
          <CheckSelection
            label="Option 2"
            selected={selectedItems.includes("opt2")}
            onClick={() => toggleSelection("opt2")}
          />
          <CheckSelection
            label="Option 3"
            selected={selectedItems.includes("opt3")}
            onClick={() => toggleSelection("opt3")}
          />
        </RowVariants>
      </div>

      {/* Mixed example */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Mixed layout example
        </p>
        <RowVariants variant="2">
          <PhoneInput
            countryCode={countryCode}
            phoneNumber={phoneNumber}
            onCountryCodeChange={setCountryCode}
            onPhoneNumberChange={setPhoneNumber}
          />
          <DatePicker
            label="Birth date"
            date={date}
            onDateChange={setDate}
          />
        </RowVariants>
        <RowVariants variant="1">
          <SwitchList
            items={switches}
            onItemChange={handleSwitchChange}
          />
        </RowVariants>
      </div>
    </div>
  )
}
