// Cadre commun des graphiques : légende à gauche, bascule Graphique / Tableau à droite.
// La vue tableau donne accès à toutes les valeurs sans survol (l'infobulle ne doit jamais être le seul moyen de lire un chiffre).
import { useEffect, useState, type ReactNode } from "react"
import { ChartLine, Table2 } from "lucide-react"
import { panel } from "@/components/overview/parts"
import { cn } from "@/lib/utils"

export function ChartFrame({ legend, table, children, bare, label }: { legend?: ReactNode; table: ReactNode; children: ReactNode; bare?: boolean; label: string }) {
  const [view, setView] = useState<"chart" | "table">("chart")
  const btn = (v: "chart" | "table", icon: ReactNode, text: string) => (
    <button
      type="button"
      aria-pressed={view === v}
      title={text}
      onClick={() => setView(v)}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&>svg]:size-3.5",
        view === v ? "bg-accent text-foreground shadow-[0_0_0_1px_var(--input)]" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}<span className="hidden sm:inline">{text}</span>
    </button>
  )
  return (
    <div className={cn("flex flex-col", !bare && cn(panel, "p-4"))}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">{legend}</div>
        <div role="group" aria-label={`Affichage : ${label}`} className="flex shrink-0 gap-0.5 rounded-lg border border-border p-0.5">
          {btn("chart", <ChartLine />, "Graphique")}
          {btn("table", <Table2 />, "Tableau")}
        </div>
      </div>
      <div className="mt-auto">{view === "chart" ? children : <div className="max-h-80 overflow-auto rounded-lg border border-border">{table}</div>}</div>
    </div>
  )
}

/** Largeur d'un élément, suivie quand la fenêtre change de taille. L'élément arrive par une ref-fonction
 *  (setEl) : la mesure repart s'il apparaît plus tard (données arrivées, retour de la vue tableau). */
export function useWidth() {
  const [el, setEl] = useState<HTMLElement | null>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [el])
  return [setEl, w] as const
}

/** Arrondit vers le haut à une valeur « ronde » (1, 2, 2,5, 5, 10 × 10ⁿ), pour l'axe vertical. */
export function niceMax(v: number) {
  if (!(v > 0)) return 1
  const p = Math.pow(10, Math.floor(Math.log10(v))), r = v / p
  return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * p
}

export const tableCls = "w-full border-collapse font-mono text-xs tabular-nums [&_th]:sticky [&_th]:top-0 [&_th]:bg-card [&_th]:px-3 [&_th]:py-2 [&_th]:text-right [&_th]:font-sans [&_th]:text-[11px] [&_th]:font-medium [&_th]:text-dusk [&_th:first-child]:text-left [&_td]:border-t [&_td]:border-white/5 [&_td]:px-3 [&_td]:py-1.5 [&_td]:text-right [&_td:first-child]:text-left [&_td:first-child]:font-sans [&_td:first-child]:text-muted-foreground"
