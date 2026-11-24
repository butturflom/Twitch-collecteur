// Définition au survol, au clic, au toucher et au clavier : remplace les attributs title=, que seule la souris atteint.
// Une petite icône d'info (ou un déclencheur fourni) ouvre une bulle Radix Popover ; le texte est aussi lié au
// déclencheur pour les lecteurs d'écran (aria-describedby), sans attendre l'ouverture.
import { useId, useRef, useState, type ReactNode } from "react"
import { Info } from "lucide-react"
import { Popover } from "radix-ui"
import { cn } from "@/lib/utils"

export function Hint({ children, trigger, label, className, side = "top" }: {
  /** Le texte de la définition. */
  children: ReactNode
  /** Élément déclencheur ; par défaut, une icône d'info de 12 px. */
  trigger?: ReactNode
  /** Nom accessible du déclencheur par défaut (« Définition : … »). */
  label?: string
  className?: string
  side?: "top" | "bottom" | "left" | "right"
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  // survol : un court délai à la fermeture laisse le temps d'aller dans la bulle (WCAG 1.4.13, contenu survolable)
  const t = useRef(0)
  const hoverOpen = () => { clearTimeout(t.current); setOpen(true) }
  const hoverClose = () => { clearTimeout(t.current); t.current = window.setTimeout(() => setOpen(false), 120) }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        type="button"
        aria-label={trigger ? undefined : label ? `Définition : ${label}` : "Définition"}
        aria-describedby={id}
        onPointerEnter={(e) => e.pointerType === "mouse" && hoverOpen()}
        onPointerLeave={(e) => e.pointerType === "mouse" && hoverClose()}
        className={cn(
          "inline-flex shrink-0 cursor-help items-center rounded-sm align-middle text-dusk transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[state=open]:text-foreground",
          // zone de toucher d'au moins 24 px autour de l'icône, sans changer la mise en page
          !trigger && "relative before:absolute before:-inset-1.5 before:content-['']",
          className,
        )}
      >
        {trigger ?? <Info aria-hidden className="size-3" strokeWidth={2} />}
      </Popover.Trigger>
      <span id={id} hidden>{children}</span>
      <Popover.Portal>
        <Popover.Content
          side={side}
          sideOffset={6}
          collisionPadding={12}
          onPointerEnter={(e) => e.pointerType === "mouse" && hoverOpen()}
          onPointerLeave={(e) => e.pointerType === "mouse" && hoverClose()}
          // une bulle d'aide ne vole pas le focus : le clavier reste sur le déclencheur, Échap la ferme
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-50 max-w-72 rounded-xl border border-input bg-dome-crest/95 px-3 py-2 font-sans text-xs leading-relaxed font-normal tracking-normal text-muted-foreground normal-case shadow-popover backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
