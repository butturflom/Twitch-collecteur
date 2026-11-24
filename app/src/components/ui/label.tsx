import * as React from "react"
import { cn } from "@/lib/utils"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "text-sm font-medium text-foreground leading-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "group-data-[disabled=true]:pointer-events-none",
        className
      )}
      {...props}
    />
  )
}

export { Label }