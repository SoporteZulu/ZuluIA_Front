"use client"

import * as React from "react"

import { DialogContent, type DialogContentProps } from "@/components/ui/dialog"
import { TabsList, type TabsListProps } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type SalesDialogSize = "sm" | "md" | "lg" | "xl" | "2xl"

const dialogSizeClassName: Record<SalesDialogSize, string> = {
  sm: "sm:max-w-lg",
  md: "sm:max-w-2xl lg:max-w-3xl",
  lg: "sm:max-w-4xl lg:max-w-5xl xl:max-w-6xl",
  xl: "sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl",
  "2xl": "sm:max-w-6xl lg:max-w-7xl xl:max-w-[90rem]",
}

type SalesDialogContentProps = DialogContentProps & {
  size?: SalesDialogSize
}

const SalesDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  SalesDialogContentProps
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
SalesDialogContent.displayName = "SalesDialogContent"

const SalesTabsList = React.forwardRef<React.ElementRef<typeof TabsList>, TabsListProps>(
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
SalesTabsList.displayName = "SalesTabsList"

export { SalesDialogContent, SalesTabsList }
