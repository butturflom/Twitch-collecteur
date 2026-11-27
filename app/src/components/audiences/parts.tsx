// Briques propres à l'onglet Audiences : titre d'une partie, bloc, note et liste classée à deux chaînes.
import type { ReactNode } from "react"
import { panel } from "@/components/overview/parts"
import { cn } from "@/lib/utils"

/** Titre d'une des deux parties de la page. `id` : cible des raccourcis « Aller à » (le défilement s'arrête sous l'en-tête). */
export function Part({ id, icon, title, sub, children }: { id: string; icon: ReactNode; title: string; sub: string; children: ReactNode }) {
  return (
    <div id={id} role="region" aria-label={title} tabIndex={-1} className="mt-12 scroll-mt-[62px] border-t border-border pt-[22px] outline-none">
      <div className="mb-5 flex items-start gap-3">
        <span aria-hidden className="grid size-[34px] shrink-0 place-items-center rounded-[10px] border border-border bg-secondary text-primary-soft [&>svg]:size-[17px]">{icon}</span>
        <div className="min-w-0">
          <h2 className="text-[19px] leading-snug font-semibold tracking-[-0.02em]">{title}</h2>
          <p className="mt-0.5 max-w-[70ch] text-[13px] text-muted-foreground">{sub}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

export function Note({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-2.5 max-w-[72ch] px-0.5 text-xs leading-relaxed text-dusk [&_b]:font-semibold [&_b]:text-muted-foreground", className)}>{children}</p>
}

/** Bloc d'une partie : un titre de niveau 3 (la partie porte le niveau 2). */
export function Block({ id, title, children, className }: { id?: string; title: string; children: ReactNode; className?: string }) {
  return (
    // un <div> et pas un <section> : l'ancien code masque toutes les <section> qui ne sont pas l'onglet affiché
    <div id={id} role="region" aria-label={title} tabIndex={id ? -1 : undefined} className={cn("min-w-0 scroll-mt-[74px] outline-none", className)}>
      <h3 className="mb-3 text-[15px] font-semibold tracking-[-0.015em]">{title}</h3>
      {children}
    </div>
  )
}

/** Liste classée à deux chaînes : libellé, petite barre (relative au maximum), valeur. */
export function RankList({ rows }: { rows: { key: string; label: ReactNode; v: number; right: ReactNode; color?: string }[] }) {
  const mx = Math.max(0, ...rows.map((r) => r.v)) || 1
  return (
    // une seule grille pour toutes les lignes (subgrid) : les barres commencent et finissent au même endroit
    <ul className={cn(panel, "grid grid-cols-[minmax(0,1fr)_40px_auto] gap-x-3 px-4 py-2 text-[13px]")}>
      {rows.map((r, i) => (
        <li key={r.key} className={cn("col-span-full grid grid-cols-subgrid items-center py-2", i > 0 && "border-t border-white/5")}>
          <div className="min-w-0">{r.label}</div>
          <div aria-hidden className="h-0.5 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max((r.v / mx) * 100, 3).toFixed(1)}%`, background: r.color }} />
          </div>
          <div className="text-right font-mono text-xs whitespace-nowrap text-muted-foreground tabular-nums">{r.right}</div>
        </li>
      ))}
    </ul>
  )
}
