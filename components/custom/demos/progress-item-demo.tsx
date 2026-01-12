"use client"

import * as React from "react"
import { StepIndicator } from "../step-indicator"
import { StepConnector } from "../step-connector"
import { ProgressItem } from "../progress-item"

/**
 * Interactive demo component for ProgressItem
 */
export function ProgressItemDemo() {
  return (
    <div className="flex flex-col gap-8 w-full max-w-md">
      {/* Base Components - Default (black) */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">Base: Step Indicator (default - black)</p>
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <StepIndicator status="active" color="default" />
            <span className="text-xs text-muted-foreground">Active</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <StepIndicator status="disabled" color="default" />
            <span className="text-xs text-muted-foreground">Disabled</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <StepIndicator status="completed" color="default" />
            <span className="text-xs text-muted-foreground">Completed</span>
          </div>
        </div>
      </div>

      {/* Base Components - Semantic colors */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">Base: Step Indicator (semantic colors)</p>
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <StepIndicator status="active" color="default" />
            <span className="text-xs text-muted-foreground">Active (black)</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <StepIndicator status="disabled" color="muted" />
            <span className="text-xs text-muted-foreground">Disabled (gray)</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <StepIndicator status="completed" color="teal" />
            <span className="text-xs text-muted-foreground">Completed (teal)</span>
          </div>
        </div>
      </div>

      {/* Step Connector */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">Base: Step Connector</p>
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 flex items-center">
              <StepConnector status="completed" orientation="vertical" className="h-full" />
            </div>
            <span className="text-xs text-muted-foreground">Completed</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 flex items-center">
              <StepConnector status="uncompleted" orientation="vertical" className="h-full" />
            </div>
            <span className="text-xs text-muted-foreground">Uncompleted</span>
          </div>
        </div>
      </div>

      {/* Progress Item Variants */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">Progress Item: All Variants</p>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Completed (teal bg + teal border)</p>
            <ProgressItem label="Item text" status="completed" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Active (gray bg + black ring)</p>
            <ProgressItem label="Item text" status="active" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Disabled (transparent + gray border)</p>
            <ProgressItem label="Item text" status="disabled" />
          </div>
        </div>
      </div>

      {/* Example: Full Progress Stepper */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted-foreground">Example: Progress Stepper</p>
        <div className="flex flex-col gap-0">
          <ProgressItem label="Account setup" status="completed" showConnector />
          <ProgressItem label="Personal info" status="completed" showConnector />
          <ProgressItem label="Verification" status="active" showConnector />
          <ProgressItem label="Payment" status="disabled" showConnector />
          <ProgressItem label="Confirmation" status="disabled" />
        </div>
      </div>
    </div>
  )
}
