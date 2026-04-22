"use client"

import * as React from "react"

import { DialogContent, type DialogContentProps } from "@/components/ui/dialog"
import { TabsList, type TabsListProps } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type WmsDialogSize = "sm" | "md" | "lg" | "xl" | "2xl"

const dialogSizeClassName: Record<WmsDialogSize, string> = {
  sm: "sm:max-w-lg",
  md: "sm:max-w-2xl lg:max-w-3xl",
  lg: "sm:max-w-4xl lg:max-w-5xl xl:max-w-6xl",
  xl: "sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl",
  "2xl": "sm:max-w-6xl lg:max-w-7xl xl:max-w-[90rem]",
}

type WmsDialogContentProps = DialogContentProps & {
  size?: WmsDialogSize
}

type WmsDetailField = {
  label: string
  value: React.ReactNode
  className?: string
}

const WmsDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  WmsDialogContentProps
>(({ className, size = "lg", ...props }, ref) => (
  <DialogContent
    ref={ref}
    className={cn(
      "max-h-[94vh] w-[calc(100vw-1rem)] max-w-full overflow-x-hidden overflow-y-auto px-4 py-5 sm:w-[calc(100vw-2rem)] sm:px-6 sm:py-6",
      dialogSizeClassName[size],
      className
    )}
    {...props}
  />
))
WmsDialogContent.displayName = "WmsDialogContent"

const WmsTabsList = React.forwardRef<React.ElementRef<typeof TabsList>, TabsListProps>(
  ({ className, ...props }, ref) => (
    <TabsList
      ref={ref}
      className={cn(
        "flex h-auto w-full min-w-0 gap-2 overflow-x-auto rounded-xl p-1.5 md:grid md:overflow-visible",
        "[&_button]:min-w-32 [&_button]:flex-none [&_button]:px-3 [&_button]:py-2 [&_button]:text-xs",
        "md:[&_button]:min-w-0 md:[&_button]:flex-1",
        className
      )}
      {...props}
    />
  )
)
WmsTabsList.displayName = "WmsTabsList"

function WmsDetailFieldGrid({
  fields,
  columns = "3",
}: {
  fields: WmsDetailField[]
  columns?: "2" | "3" | "4"
}) {
  const gridClassName =
    columns === "2"
      ? "md:grid-cols-2"
      : columns === "4"
        ? "md:grid-cols-2 xl:grid-cols-4"
        : "md:grid-cols-2 xl:grid-cols-3"

  return (
    <div className={cn("grid gap-3", gridClassName)}>
      {fields.map((field) => (
        <div key={field.label} className={cn("rounded-xl border bg-muted/30 p-3", field.className)}>
          <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {field.label}
          </span>
          <div className="text-sm font-medium text-foreground wrap-break-word">{field.value}</div>
        </div>
      ))}
    </div>
  )
}

export { WmsDetailFieldGrid, WmsDialogContent, WmsTabsList }