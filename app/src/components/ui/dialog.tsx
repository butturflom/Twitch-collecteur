import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"

function Dialog({ className, ...props }: { className?: string } & Omit<React.ComponentProps<typeof DialogPrimitive.Root>, "className">) {
  return (
    <div className={cn(className)}>
      <DialogPrimitive.Root {...props} />
    </div>
  )
}
Dialog.displayName = DialogPrimitive.Root.displayName

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger {...props} />
}
DialogTrigger.displayName = DialogPrimitive.Trigger.displayName

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return (
    <DialogPrimitive.Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
        {props.children}
      </div>
    </DialogPrimitive.Portal>
  )
}
DialogPortal.displayName = DialogPrimitive.Portal.displayName

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm transition-opacity",
        className
      )}
      {...props}
    />
  )
}
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

function DialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 grid w-full max-w-lg gap-4 border bg-card p-6 shadow-lg duration-200",
          "rounded-lg",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm p-1 text-muted-foreground hover:text-foreground transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md" aria-label="Close">
          <svg
            className="h-4 w-4"
            fill="none"
            height="24"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line
              x1="18"
              y1="6"
              x2="6"
              y2="18"
            />
            <line
              x1="6"
              y1="6"
              x2="18"
              y2="18"
            />
          </svg>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}
DialogContent.displayName = DialogPrimitive.Content.displayName

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
      {...props}
    />
  )
}
DialogHeader.displayName = "DialogHeader"

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col-reverse items-center gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  )
}
DialogFooter.displayName = "DialogFooter"

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  )
}
DialogTitle.displayName = DialogPrimitive.Title.displayName

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}
DialogDescription.displayName = DialogPrimitive.Description.displayName

const DialogClose = DialogPrimitive.Close

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}