"use client"

import * as React from "react"
import { EntityBasicInformationForm } from "@/components/custom/entity-basic-information-form"
import { BlockTemplate } from "@/components/custom/block"
import type { EntityBasicInformationFormData } from "@/components/custom/entity-basic-information-form"

export function EntityBasicInformationFormDemo() {
  const [isFormValid, setIsFormValid] = React.useState(false)

  const handleFormDataChange = (data: EntityBasicInformationFormData) => {
    console.log("Form data changed:", data)
  }

  const handleNext = () => {
    console.log("Next clicked")
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Photo Lab (with Location)</p>
        <div className="border rounded-xl overflow-hidden">
          <BlockTemplate
            mode="creation"
            variant="active"
            title="Basic information"
            subtitle="Please provide all necessary details for this entity to ensure completeness."
            primaryLabel="Next"
            onPrimaryClick={handleNext}
            primaryDisabled={!isFormValid}
          >
            <EntityBasicInformationForm
              entityType="Photo Lab"
              showLocation={true}
              onDataChange={handleFormDataChange}
              onValidationChange={setIsFormValid}
            />
          </BlockTemplate>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Client (without Location)</p>
        <div className="border rounded-xl overflow-hidden">
          <BlockTemplate
            mode="creation"
            variant="active"
            title="Basic information"
            subtitle="Please provide all necessary details for this entity to ensure completeness."
            primaryLabel="Next"
            onPrimaryClick={handleNext}
            primaryDisabled={!isFormValid}
          >
            <EntityBasicInformationForm
              entityType="Client"
              showLocation={false}
              onDataChange={handleFormDataChange}
              onValidationChange={setIsFormValid}
            />
          </BlockTemplate>
        </div>
      </div>
    </div>
  )
}
