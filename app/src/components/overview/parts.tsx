// Briques communes des onglets convertis : titre de section, panneau, note, tableau, cellules.
import { useEffect, useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Hint } from "@/components/ui/hint"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChannelAvatar } from "@/components/channel-avatar"
import { cn } from "@/lib/utils"
import { pct } from "@/lib/format"
import type { Who } from "@/legacy/bridge"

export function Section({ title, note, badge, action, children, className }: { title: string; note?: ReactNode; badge?: string; /** contrôle à droite du titre (bascule de durée, par exemple) */ action?: ReactNode; children: ReactNode; className?: string }) {
  const head = (
    <h2 className={cn("flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.015em] text-balance", !action && "mb-3")}>
      {title}
      {badge && <Badge variant="secondary" className="text-[11px] h-4.5 px-2">{badge}</Badge>}
    </h2>
  )
  return (
    // un <div> et pas un <section> : l'ancien code masque toutes les <section> qui ne sont pas l'onglet affiché
    <div role="region" aria-label={title} className={cn("mt-9 first:mt-0", className)}>
      {action ? <div className="mb-3 flex items-center justify-between gap-4">{head}{action}</div> : head}
      {children}
      {note && <p className="mt-2.5 max-w-[72ch] px-0.5 text-xs leading-relaxed text-dusk [&_b]:font-semibold [&_b]:text-muted-foreground">{note}</p>}
    </div>
  )
}

export const panel = "rounded-[14px] border border-border bg-linear-to-b from-dome-crest to-dome to-[90px] shadow-panel"

/**
 * En attendant les données d'un onglet. Rien pendant 400 ms (un chargement rapide ne clignote pas), puis des
 * blocs à la forme de la page ; au-delà de 10 s, un message dit quoi vérifier au lieu de laisser croire que ça charge.
 */
export function Pending({ stuck }: { stuck?: ReactNode }) {
  const [phase, setPhase] = useState<0 | 1 | 2>(0)
  useEffect(() => {
    const a = window.setTimeout(() => setPhase(1), 400), b = window.setTimeout(() => setPhase(2), 10000)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [])
  if (phase === 0) return null
  if (phase === 2)
    return (
      <Empty>
        {stuck ?? (
          <>
            Les données n'arrivent pas. Vérifie la source des données et la connexion dans{" "}
            <a href="#" data-goto="settings" className="text-primary-soft underline underline-offset-2">Réglages</a>.
          </>
        )}
      </Empty>
    )
  return (
    <div role="status" aria-label="Chargement des données" className="space-y-9">
      <div className={cn(panel, "h-[106px] animate-pulse")} />
      <div className="space-y-3">
        <div className="h-4 w-44 animate-pulse rounded-md bg-white/[.05]" />
        <div className={cn(panel, "h-56 animate-pulse")} />
      </div>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[14px] border border-dashed border-input bg-card/50 px-5 py-6 text-center text-[12.5px] text-muted-foreground">{children}</p>
  )
}

/** Teinte des repères de valeur (barres, matrices) : le violet de l'interface. */
const ACCENT = "139,124,255"

/**
 * Petite barre violette sous la valeur d'une cellule, proportionnelle au maximum de la colonne
 * (r de 0 à 0,4, comme heat() dans l'ancien code). Remplace l'ancien fond bleu plein :
 * plus discret et compréhensible d'un coup d'œil (barre longue = valeur haute).
 */
export function heat(r: number | null | undefined): React.CSSProperties | undefined {
  if (r == null || !isFinite(r) || r <= 0) return undefined
  const w = Math.max(Math.min(r / 0.4, 1) * 100, 3)
  return {
    backgroundImage: `linear-gradient(90deg,rgba(${ACCENT},.35),rgb(${ACCENT})),linear-gradient(rgba(255,255,255,.06),rgba(255,255,255,.06))`,
    backgroundSize: `${w.toFixed(1)}% 2px, 100% 2px`,
    backgroundPosition: "right bottom -5px, right bottom -5px",
    backgroundRepeat: "no-repeat",
    backgroundOrigin: "content-box",
  }
}

/** Fond de case de matrice selon la valeur (r de 0 à 1) : violet de plus en plus soutenu. */
export function heatFill(r: number | null | undefined): React.CSSProperties | undefined {
  if (r == null || !isFinite(r) || r <= 0) return undefined
  const a = Math.min(0.05 + r * 0.9, 0.5)
  return { background: `rgba(${ACCENT},${a.toFixed(2)})`, color: a > 0.32 ? "#fff" : undefined }
}

/** Nom de chaîne cliquable (ouvre l'onglet Par chaîne), avec sa photo et un badge « chat limité » éventuel. */
export function ChannelCell({ who, limited, link = true }: { who: Who; limited?: string; link?: boolean }) {
  return (
    <span className="inline-flex max-w-full min-w-0 items-center gap-2 max-sm:flex-wrap max-sm:gap-y-1">
      <ChannelAvatar {...who} />
      {link ? (
        <button type="button" data-open={who.c} title={who.c.length > 18 ? who.c : undefined} className="-my-0.5 min-w-6 max-w-[18ch] max-sm:max-w-[11ch] cursor-pointer truncate py-0.5 font-medium decoration-dusk decoration-dotted underline-offset-4 hover:text-primary-soft hover:underline">
          {who.c}
        </button>
      ) : (
        <span title={who.c.length > 18 ? who.c : undefined} className="max-w-[18ch] max-sm:max-w-[11ch] truncate font-medium">{who.c}</span>
      )}
      {limited && (
        <Hint trigger={<Badge variant="outline" className="h-5 border-input px-1.5 text-[11px] text-muted-foreground">chat limité</Badge>}>
          Chat limité pendant la période : {limited}. Ça réduit le nombre de messages sans refléter l'envie d'écrire.
        </Hint>
      )}
    </span>
  )
}

export interface Col<R> {
  head: string
  /** Clé React, si deux colonnes ont le même titre. */
  key?: string
  title?: string
  cell: (r: R) => ReactNode
  style?: (r: R) => React.CSSProperties | undefined
  left?: boolean
}

/** bare : sans panneau, pour un tableau posé dans un panneau existant (pas de carte dans une carte). */
/** Titre de colonne avec sa définition : l'icône reste collée au dernier mot, même quand le titre passe à la ligne. */
function HeadWithHint({ head, title }: { head: string; title: string }) {
  const i = head.lastIndexOf(" ")
  return (
    <>
      {i > 0 && head.slice(0, i + 1)}
      <span className="whitespace-nowrap">
        {head.slice(i + 1)}
        <Hint label={head} className="ml-1 -translate-y-px">{title}</Hint>
      </span>
    </>
  )
}

/**
 * Bouton « afficher / masquer le reste » : à 100 chaînes suivies, une liste complète noie la page.
 * Le libellé dit combien d'éléments sont cachés, jamais un simple « Voir plus ».
 */
export function ShowMore({ hidden, open, onToggle, noun, className }: { hidden: number; open: boolean; onToggle: () => void; noun: [string, string]; className?: string }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      className={cn("inline-flex items-center gap-1.5 rounded-md text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", className)}
    >
      <ChevronDown aria-hidden className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")} />
      {open ? "Afficher moins" : `Afficher ${hidden > 1 ? `les ${fmtInt(hidden)} autres ${noun[1]}` : `l'autre ${noun[0]}`}`}
    </button>
  )
}
const fmtInt = (n: number) => n.toLocaleString("fr-FR")

/** limit : nombre de lignes visibles avant le bouton « Afficher les N autres » (noun : singulier, pluriel). */
export function DataTable<R>({ cols, rows, rowKey, bare, limit, noun = ["chaîne", "chaînes"] }: { cols: Col<R>[]; rows: R[]; rowKey: (r: R) => string; bare?: boolean; limit?: number; noun?: [string, string] }) {
  const [open, setOpen] = useState(false)
  // une seule ligne cachée ne vaut pas un bouton : on la montre
  const cut = limit != null && rows.length > limit + 1 && !open
  const shown = cut ? rows.slice(0, limit) : rows
  return (
    <div className={bare ? "-mx-4 -mb-4 overflow-hidden border-t border-border" : cn(panel, "overflow-hidden")}>
      <Table className="font-mono text-[12.5px] tabular-nums">
        <TableHeader>
          <TableRow className="border-border bg-white/[.015] hover:bg-white/[.015]">
            {cols.map((c) => (
              <TableHead key={c.key ?? c.head} className={cn("h-10 px-3.5 py-2 align-bottom font-sans text-[11px] leading-snug font-medium whitespace-normal text-dusk", c.left ? "text-left max-sm:w-36" : "text-right max-sm:min-w-[5.75rem]")}>
                {c.title ? <HeadWithHint head={c.head} title={c.title} /> : c.head}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((r) => (
            <TableRow key={rowKey(r)} className="border-white/5 hover:bg-primary/[.045]">
              {cols.map((c) => (
                <TableCell key={c.key ?? c.head} style={c.style?.(r)} className={cn("px-3.5 py-2.5", c.left ? "text-left font-sans text-[13px] max-sm:w-36" : "text-right")}>
                  {c.cell(r)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {limit != null && rows.length > limit + 1 && (
        <div className="border-t border-white/5 px-3.5 py-2.5">
          <ShowMore hidden={rows.length - limit} open={open} onToggle={() => setOpen((o) => !o)} noun={noun} />
        </div>
      )}
    </div>
  )
}

export const muted = (s: string) => <span className="font-sans text-xs text-muted-foreground">{s}</span>

/** Écart relatif après / avant, en vert ou rouge (deltaHtml dans l'ancien code). « en cours » si l'après n'est pas encore connu. */
export function Delta({ after, before }: { after: number | null; before: number | null }) {
  if (before == null || !isFinite(before) || before <= 0) return muted("—")
  if (after == null || !isFinite(after)) return muted("en cours")
  const r = after / before - 1
  return <span className={r > 0.02 ? "text-signal-green" : r < -0.02 ? "text-destructive" : undefined}>{(r > 0 ? "+" : "") + pct(r)}</span>
}

/** Liste de barres horizontales (meterRows dans l'ancien code) : libellé, barre relative au maximum, valeur. */
/** wide : colonne des libellés plus large (libellés à deux chaînes, par exemple). */
export function MeterList({ rows, wide, max, thick }: { rows: { key: string; label: ReactNode; v: number; right: ReactNode; color?: string; sub?: ReactNode }[]; wide?: boolean; max?: number; thick?: boolean }) {
  // max : valeur de la barre pleine (échelle fixe, avec un repère au bout) ; sans elle, la plus grande valeur remplit la barre
  const mx = max ?? (Math.max(0, ...rows.map((r) => r.v)) || 1)
  // thick : barres progressivement plus épaisses selon la valeur (comme les traits de la carte)
  // 4 paliers : ≤10% = 1.5px (traits fins), ≤30% = 2.5px, ≤50% = 3.5px, >50% = 4.5px
  const barHeight = thick
    ? rows.map((r) => {
        const pct = mx > 0 ? r.v / mx : 0
        if (pct <= 0.1) return 1.5
        if (pct <= 0.3) return 2.5
        if (pct <= 0.5) return 3.5
        return 4.5
      })
    : rows.map(() => 1.5)
  // une seule grille pour toutes les lignes (subgrid) : les barres commencent et finissent au même endroit
  return (
    // sur téléphone : le libellé sur toute la largeur, puis la barre et la valeur en dessous
    <div className={cn("grid gap-x-3 text-[13px] max-sm:grid-cols-[minmax(0,1fr)_auto]", wide ? "sm:grid-cols-[minmax(0,2.2fr)_minmax(60px,1.6fr)_auto]" : "sm:grid-cols-[minmax(120px,1.4fr)_3fr_auto]")}>
      {rows.map((r, i) => (
        <div key={r.key} className={cn("col-span-full grid grid-cols-subgrid items-center py-2 max-sm:gap-y-1.5", i > 0 && "border-t border-white/5")}>
          <div className="min-w-0 truncate max-sm:col-span-2">{r.label}</div>
          <div className={cn("relative h-[1.5px] overflow-hidden rounded-full bg-white/5", max != null && "after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-white/30", thick && "h-auto")}>
            <div
              className="rounded-full"
              style={{
                height: thick ? `${barHeight[i]}px` : "100%",
                width: `${Math.min(Math.max((r.v / mx) * 100, 1), 100).toFixed(1)}%`,
                background: r.color ?? `linear-gradient(90deg,rgba(${ACCENT},.45),rgb(${ACCENT}))`
              }}
            />
          </div>
          <div className="text-right font-mono text-xs text-muted-foreground tabular-nums">{r.right}</div>
          {/* précision sur toute la largeur, sous la ligne (sans élargir la colonne des valeurs) */}
          {r.sub ? <div className="col-span-full mt-1 text-[11px] text-dusk">{r.sub}</div> : null}
        </div>
      ))}
    </div>
  )
}
