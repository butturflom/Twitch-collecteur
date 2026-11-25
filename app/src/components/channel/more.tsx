// « Par chaîne » : les 5 indicateurs de tête se lisent d'un coup d'œil ; les autres (communauté, événements) sont repliés et
// s'ouvrent au clic. Le choix est gardé d'une visite à l'autre.
import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Kpis } from "@/components/shared/blocks"
import { cn } from "@/lib/utils"
import type { Kpi } from "@/legacy/bridge"

const OPEN_KEY = "to2-ch-more"

export function MoreKpis({ items }: { items: Kpi[] }) {
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(OPEN_KEY) === "1" } catch { return false } })
  const toggle = () => setOpen((o) => { try { localStorage.setItem(OPEN_KEY, o ? "0" : "1") } catch { /* stockage indisponible : le choix vaut pour la visite */ } return !o })
  if (items.length === 0) return null
  return (
    <div className="mt-6">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="ch-more"
        onClick={toggle}
        className="group inline-flex min-h-6 items-center gap-2 rounded-md text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-200", open && "rotate-180")} />
        {open ? "Masquer la communauté et les événements" : `Afficher la communauté et les événements (${items.length})`}
      </button>
      <div id="ch-more" hidden={!open} className="mt-3">
        {open && <Kpis items={items} compact />}
      </div>
    </div>
  )
}
