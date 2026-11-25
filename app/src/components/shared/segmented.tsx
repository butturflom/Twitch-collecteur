// Contrôle segmenté du système (DESIGN.md) : une gouttière à filet, l'option active monte d'un palier, les autres restent en brume.
// Même style que la bascule Graphique / Tableau des graphiques (ChartFrame). Zone de toucher de 24 px de haut.
import { cn } from "@/lib/utils"

export function Segmented<T extends string | number>({ value, onChange, options, label }: {
  value: T
  onChange: (v: T) => void
  options: readonly (readonly [T, string])[]
  /** Nom du groupe pour les lecteurs d'écran. */
  label: string
}) {
  return (
    <div role="group" aria-label={label} className="flex shrink-0 gap-0.5 rounded-lg border border-border p-0.5">
      {options.map(([v, text]) => (
        <button
          key={String(v)}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "inline-flex h-6 items-center rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            value === v ? "bg-accent text-foreground shadow-[0_0_0_1px_var(--input)]" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {text}
        </button>
      ))}
    </div>
  )
}
