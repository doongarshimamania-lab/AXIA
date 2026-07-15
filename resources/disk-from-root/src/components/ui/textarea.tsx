import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  /** When true, applies error styling: red border + red box-shadow ring */
  error?: boolean
}

function Textarea({ className, error, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      data-error={error ? "true" : undefined}
      className={cn(
        // Base styles — Phase 5 standard: consistent with Input (text-sm, border-input, rounded-md)
        "border-input placeholder:text-muted-foreground dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] duration-150 ease-out outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
        // Focus: border changes to ring color, 3px ring
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        // Error state (aria-invalid or error prop): red border + red ring
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "data-[error=true]:border-destructive data-[error=true]:ring-destructive/20 data-[error=true]:dark:ring-destructive/40 data-[error=true]:ring-[3px]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
