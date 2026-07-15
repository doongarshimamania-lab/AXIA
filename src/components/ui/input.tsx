import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  /** When true, applies error styling: red border + red box-shadow ring */
  error?: boolean
}

function Input({ className, type, error, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      data-error={error ? "true" : undefined}
      className={cn(
        // Base styles — Phase 5 standard: h-10 (40px), text-sm, border-input, rounded-md
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-10 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] duration-150 ease-out outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
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

export { Input }
