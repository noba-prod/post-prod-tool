"use client"

import * as React from "react"
import { Forms } from "../forms"
import { RowVariants, SlotPlaceholder } from "../row-variants"
import { DatePicker } from "../date-picker"
import { TimePicker } from "../time-picker"
import { OptionPicker } from "../option-picker"
import { EntitySelected } from "../entity-selected"
import { InformativeToast } from "../informative-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Demo for Forms component showing all 4 variants
 */
export function FormsDemo() {
  const [date1, setDate1] = React.useState<Date | undefined>()
  const [date2, setDate2] = React.useState<Date | undefined>()
  const [time1, setTime1] = React.useState<string | undefined>()
  const [time2, setTime2] = React.useState<string | undefined>()
  const [option, setOption] = React.useState<string | undefined>()

  return (
    <div className="flex flex-col gap-12 w-full max-w-4xl">
      {/* Variant 1: Basic */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">
          Variant: Basic (no border)
        </p>
        <Forms variant="basic" title="Basic Form">
          <RowVariants variant="1">
            <SlotPlaceholder />
          </RowVariants>
          <RowVariants variant="2">
            <SlotPlaceholder />
            <SlotPlaceholder />
          </RowVariants>
          <RowVariants variant="1">
            <SlotPlaceholder />
          </RowVariants>
        </Forms>

        <p className="text-xs text-muted-foreground pt-4">
          With real components:
        </p>
        <Forms variant="basic" title="Contact Information">
          <RowVariants variant="2">
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">First name</Label>
              <Input placeholder="Enter first name" className="h-10" />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Last name</Label>
              <Input placeholder="Enter last name" className="h-10" />
            </div>
          </RowVariants>
          <RowVariants variant="1">
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Email</Label>
              <Input type="email" placeholder="Enter email address" className="h-10" />
            </div>
          </RowVariants>
        </Forms>
      </div>

      {/* Variant 2: Capsule */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">
          Variant: Capsule (with border)
        </p>
        <Forms variant="capsule" title="Capsule Form">
          <RowVariants variant="2">
            <SlotPlaceholder />
            <SlotPlaceholder />
          </RowVariants>
          <RowVariants variant="1">
            <SlotPlaceholder />
          </RowVariants>
        </Forms>

        <p className="text-xs text-muted-foreground pt-4">
          With real components:
        </p>
        <Forms variant="capsule" title="Schedule Details">
          <RowVariants variant="2">
            <DatePicker
              label="Start date"
              date={date1}
              onDateChange={setDate1}
            />
            <TimePicker
              label="Time slot"
              value={time1}
              onValueChange={setTime1}
            />
          </RowVariants>
          <RowVariants variant="1">
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
          </RowVariants>
        </Forms>
      </div>

      {/* Variant 3: Shipping Module */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">
          Variant: Shipping Module
        </p>
        <Forms
          variant="shipping-module"
          title="Shipping Configuration"
          showShippingDetails={true}
          showInformativeToast={true}
          originContent={
            <>
              <EntitySelected
                label="Origin"
                entityType="Warehouse"
                value="Madrid"
              />
              <RowVariants variant="2">
                <DatePicker
                  label="Pick up date"
                  date={date1}
                  onDateChange={setDate1}
                />
                <TimePicker
                  label="Estimated time"
                  value={time1}
                  onValueChange={setTime1}
                />
              </RowVariants>
            </>
          }
          destinationContent={
            <>
              <EntitySelected
                label="Destination"
                entityType="Store"
                value="Barcelona"
              />
              <RowVariants variant="2">
                <DatePicker
                  label="Delivery date"
                  date={date2}
                  onDateChange={setDate2}
                />
                <TimePicker
                  label="Estimated time"
                  value={time2}
                  onValueChange={setTime2}
                />
              </RowVariants>
            </>
          }
          shippingDetailsContent={
            <RowVariants variant="3">
              <OptionPicker
                label="Who is managing the shipping?"
                options={[
                  { value: "noba", label: "noba*" },
                  { value: "client", label: "Client" },
                ]}
                placeholder="Select manager"
              />
              <OptionPicker
                label="Shipping provider"
                options={[
                  { value: "ups", label: "UPS" },
                  { value: "fedex", label: "FedEx" },
                  { value: "dhl", label: "DHL" },
                ]}
                placeholder="Search and select a provider"
              />
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">Tracking number</Label>
                <Input placeholder="Paste here the tracking number" className="h-10" />
              </div>
            </RowVariants>
          }
          informativeToastContent={
            <InformativeToast
              message="The client will be responsible for defining key details of the shipping to ensure successful tracking of the drop-off."
            />
          }
        />
      </div>

      {/* Variant 4: Horizontal Flow */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">
          Variant: Horizontal Flow
        </p>
        <Forms
          variant="horizontal-flow"
          firstTitle="Step 1"
          firstContent={
            <>
              <RowVariants variant="2">
                <SlotPlaceholder />
                <SlotPlaceholder />
              </RowVariants>
              <RowVariants variant="1">
                <SlotPlaceholder />
              </RowVariants>
            </>
          }
          secondTitle="Step 2"
          secondContent={
            <>
              <RowVariants variant="2">
                <SlotPlaceholder />
                <SlotPlaceholder />
              </RowVariants>
              <RowVariants variant="1">
                <SlotPlaceholder />
              </RowVariants>
            </>
          }
        />

        <p className="text-xs text-muted-foreground pt-4">
          With real components:
        </p>
        <Forms
          variant="horizontal-flow"
          firstTitle="Origin Details"
          firstContent={
            <>
              <RowVariants variant="2">
                <DatePicker
                  label="Start date"
                  date={date1}
                  onDateChange={setDate1}
                />
                <TimePicker
                  label="Time slot"
                  value={time1}
                  onValueChange={setTime1}
                />
              </RowVariants>
            </>
          }
          secondTitle="Destination Details"
          secondContent={
            <>
              <RowVariants variant="2">
                <DatePicker
                  label="End date"
                  date={date2}
                  onDateChange={setDate2}
                />
                <TimePicker
                  label="Time slot"
                  value={time2}
                  onValueChange={setTime2}
                />
              </RowVariants>
            </>
          }
        />
      </div>

      {/* Description */}
      <div className="p-4 bg-zinc-50 rounded-lg text-sm text-zinc-600">
        <p className="font-medium mb-2">Variants:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Basic:</strong> Title + rows of slots (no border)</li>
          <li><strong>Capsule:</strong> Basic wrapped in a bordered container</li>
          <li><strong>Shipping Module:</strong> Two capsules (origin/destination) with optional shipping details and toast</li>
          <li><strong>Horizontal Flow:</strong> Two capsules side by side with arrow indicator</li>
        </ul>
      </div>
    </div>
  )
}
