// « Par chaîne » → Live du jour : les lives qui touchent aujourd'hui (début, fin, viewers max, moyenne, minimum, jeux), calculés par
// l'ancien code sur les relevés gardés (liveRuns dans legacy.js), puis les lives précédents lus dans la base (fonction SQL
// channel_lives, voir schema.sql). Jamais filtré par la période. Formules et limites : CALCULS.md.
import { useEffect, useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { DataTable, panel, type Col } from "@/components/overview/parts"
import { fmt, fmt1 } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { LiveRun, LiveToday } from "@/legacy/bridge"

const DAYS = 30
type Hist = { s: "off" } | { s: "loading" } | { s: "none" } | { s: "error"; msg: string } | { s: "ok"; lives: LiveRun[] }

const num = (n: number | null) => (n == null ? "—" : fmt(n))
/** Même moment couvert : la base et le navigateur ne découpent pas forcément à la milliseconde près. */
const overlaps = (a: LiveRun, b: LiveRun) => a.s <= b.e && a.e >= b.s

function Pill({ l }: { l: LiveRun }) {
  if (l.ongoing)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-live-edge bg-live-wash px-2 py-0.5 text-[11px] font-medium text-live-ink">
        <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-live-red shadow-live-glow motion-reduce:animate-none" />En direct
      </span>
    )
  return <span className="inline-flex rounded-full border border-input px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{l.endKnown ? "Terminé" : "Fin non observée"}</span>
}

function Cell({ label, value, hint, className, big }: { label: string; value: ReactNode; hint?: ReactNode; className?: string; big?: boolean }) {
  return (
    <div className={cn("flex min-w-0 flex-col bg-dome px-[18px] py-3", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 font-semibold tracking-[-0.03em] tabular-nums", big ? "text-[2.25rem]/[2.5rem]" : "text-[1.3rem]/[1.75rem]")}>{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-dusk">{hint}</dd>}
    </div>
  )
}

function Run({ l, twitch, color }: { l: LiveRun; twitch?: string; color: string }) {
  const length = !l.dur ? "un seul relevé" : l.ongoing ? `${l.startKnown ? "" : "au moins "}${l.dur} à ce stade` : l.startKnown && l.endKnown ? l.dur : `au moins ${l.dur}`
  const started = [l.startKnown ? "" : "déjà en direct : début non observé", twitch ? `Twitch annonce ${twitch}` : ""].filter(Boolean).join(" · ")
  return (
    <div className="border-t border-border">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-[18px] py-2.5 text-[12.5px] text-muted-foreground">
        <Pill l={l} />
        <span>Durée : <span className="font-mono font-medium text-foreground tabular-nums">{length}</span></span>
      </div>
      <dl className="grid grid-cols-2 gap-px border-y border-border bg-border lg:grid-cols-[1.5fr_1.15fr_1.15fr_1fr_1fr]" style={{ "--c": color } as React.CSSProperties}>
        <Cell big label="Viewers max" value={num(l.peak)} hint={!l.peakAt ? undefined : l.peakAt.includes(" ") ? l.peakAt : `à ${l.peakAt}`} className="col-span-2 bg-[linear-gradient(color-mix(in_srgb,var(--c)_11%,transparent),color-mix(in_srgb,var(--c)_11%,transparent))] lg:col-span-1" />
        <Cell label={l.startKnown ? "Début" : "Premier relevé"} value={l.start} hint={started || undefined} />
        {l.ongoing ? <Cell label="Fin" value="En direct" hint={`dernier relevé ${l.end}`} />
          : l.endKnown ? <Cell label="Fin" value={l.end} />
          : <Cell label="Dernier relevé" value={l.end} hint="fin non observée" />}
        <Cell label="Viewers moyens" value={num(l.avg)} />
        <Cell label="Minimum" value={num(l.min)} hint={l.min == null ? "moins de 10 minutes relevées" : "après les 10 premières minutes"} />
      </dl>
      {l.games.length > 0 && (
        <ul aria-label="Jeux du live" className="flex flex-wrap gap-2 px-[18px] py-3">
          {l.games.map((g) => (
            <li key={g.g} className="inline-flex max-w-full items-center gap-2 rounded-full border border-input bg-secondary py-1 pr-2.5 pl-3 text-[12.5px] font-medium">
              <span className="truncate" title={g.g}>{g.g}</span>
              {g.hours != null && <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{fmt1(g.hours)} h</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const COLS: Col<LiveRun>[] = [
  { head: "Jour", left: true, cell: (l) => <span className="whitespace-nowrap">{l.day}</span> },
  { head: "Horaires", left: true, cell: (l) => <span className="whitespace-nowrap">{l.startKnown ? "" : "avant "}{l.startH} → {l.ongoing ? "en direct" : `${l.endKnown ? "" : "après "}${l.endH}`}</span> },
  { head: "Durée", cell: (l) => (l.dur ? <span className="whitespace-nowrap">{l.startKnown && l.endKnown ? "" : "≥ "}{l.dur}</span> : "—") },
  { head: "Viewers max", cell: (l) => <b className="font-semibold">{num(l.peak)}</b> },
  { head: "Viewers moyens", cell: (l) => num(l.avg) },
  { head: "Minimum", cell: (l) => num(l.min) },
  {
    head: "Jeux", left: true,
    cell: (l) => (
      <span className="flex min-w-60 flex-wrap gap-1">
        {l.games.map((g) => <span key={g.g} className="rounded-full border border-input bg-secondary px-2 py-0.5 text-[11.5px] font-medium">{g.g}</span>)}
      </span>
    ),
  },
]

const line = "px-[18px] py-3 text-xs text-dusk"

function Past({ h, rows, alone }: { h: Hist; rows: LiveRun[]; /** aucun live affiché au-dessus */ alone: boolean }) {
  const [open, setOpen] = useState(false)
  if (h.s === "off") return null // mode local : pas d'historique
  if (h.s === "loading") return <p className={line}>Chargement des lives précédents…</p>
  if (h.s === "none") return <p className={line}>L'historique des lives demande la base Supabase à jour (Réglages → Source des données, puis schema.sql à rejouer dans le SQL Editor).</p>
  if (h.s === "error") return <p className={line}>L'historique des lives n'a pas pu être lu : {h.msg}</p>
  if (!rows.length) return <p className={line}>{alone ? "Aucun live" : "Pas d'autre live"} dans l'historique des {DAYS} derniers jours.</p>
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="ch-lives"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-[18px] py-3 text-left text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
      >
        <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")} />
        Lives précédents ({fmt(rows.length)}, sur {DAYS} jours)
      </button>
      <div id="ch-lives" hidden={!open}>
        {open && (
          <div className="px-4 pb-4">
            <DataTable bare cols={COLS} rows={rows} rowKey={(l) => String(l.s)} limit={10} noun={["live", "lives"]} />
          </div>
        )}
      </div>
      {open && rows.some((l) => !l.startKnown || (!l.endKnown && !l.ongoing)) && (
        <p className={cn(line, "border-t border-border")}>« avant » : déjà en direct au premier relevé. « après » : fin non observée, heure du dernier relevé.</p>
      )}
    </div>
  )
}

export function LiveDay({ ch, color, live }: { ch: string; color: string; live: LiveToday }) {
  const [h, setH] = useState<Hist>({ s: "loading" })

  useEffect(() => {
    let on = true
    const f = window.channelLives
    if (!live.cloud || !f) return setH({ s: "off" })
    setH({ s: "loading" })
    f(ch, DAYS).then(
      (lives) => on && setH(lives ? { s: "ok", lives } : { s: "none" }),
      (e) => on && setH({ s: "error", msg: String(e?.message ?? e) })
    )
    return () => { on = false }
  }, [ch, live.cloud])

  const past = h.s === "ok" ? h.lives : []
  const n = live.today.length
  // aucun live aujourd'hui : le plus récent connu, dans les relevés gardés ou dans l'historique de la base
  const last = n ? null : past[0] && (!live.last || past[0].s > live.last.e) ? past[0] : live.last
  const shown = n ? live.today : last ? [last] : []
  const rest = past.filter((p) => !shown.some((x) => overlaps(p, x)))

  return (
    // un <div> et pas un <section> : l'ancien code masque toutes les <section> qui ne sont pas l'onglet affiché
    <div role="region" aria-label="Live du jour" className="mb-4">
      <div className={cn(panel, "overflow-hidden")}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-[18px] pt-3.5 pb-3">
          <h2 className="text-[15px] font-semibold tracking-[-0.015em]">Live du jour</h2>
          {live.total && (
            <p className="text-[12.5px] text-muted-foreground">
              {n} lives aujourd'hui · tous confondus : viewers max <span className="font-mono font-medium text-foreground tabular-nums">{fmt(live.total.peak)}</span>, moyenne <span className="font-mono font-medium text-foreground tabular-nums">{fmt(live.total.avg)}</span>
            </p>
          )}
        </div>
        {n === 0 && (
          <div className="border-t border-border px-[18px] py-3">
            <p className="text-[13.5px] font-medium">
              {live.noData ? "Aucun relevé aujourd'hui, toutes chaînes confondues." : "Pas de live relevé aujourd'hui."}
            </p>
            <p className="mt-0.5 text-xs text-dusk">
              {live.noData && "Le collecteur ne tournait pas, ou la synchronisation n'est pas finie. "}
              {last ? <>Dernier live connu, ci-dessous : {last.day}</> : "Aucun live dans les relevés gardés."}
            </p>
          </div>
        )}
        {shown.map((l, i) => <Run key={l.s} l={l} color={color} twitch={n && i === 0 ? live.twitchStart : undefined} />)}
        <div className={cn(shown.length === 0 && "border-t border-border", "empty:hidden")}>
          <Past h={h} rows={rest} alone={!shown.length} />
        </div>
      </div>
      <p className="mt-2.5 max-w-[72ch] px-0.5 text-xs leading-relaxed text-dusk">
        Relevés Twitch, un toutes les 2 minutes environ : heures précises à environ 2 minutes. Un live s'arrête à un relevé hors ligne ou à un trou de plus de 10 minutes. Les lives qui touchent aujourd'hui (heure de Paris) sont entiers, même commencés la veille : la période choisie ne change rien ici.
      </p>
    </div>
  )
}
