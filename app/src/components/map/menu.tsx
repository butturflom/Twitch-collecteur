// Menu de la Carte, façon menu de jeu vidéo : un bouton « Menu » posé sur la carte (avec les filtres actifs en pastilles), qui ouvre un
// panneau à deux colonnes par-dessus la carte : à gauche les rubriques, à droite leur contenu. La carte garde toute la largeur et
// reste visible à droite du panneau : chaque réglage se voit tout de suite.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Filter, LayoutGrid, Menu, Radio, RotateCcw, Search, Shuffle, Telescope, Wrench, X } from "lucide-react"
import { LangBadge } from "@/components/lang-badge"
import { ChannelAvatar } from "@/components/channel-avatar"
import { Input } from "@/components/ui/input"
import { fmt } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { MapApi, MapData, MapNotice } from "@/legacy/bridge"

const act = (...a: Parameters<NonNullable<Window["mapAction"]>>) => window.mapAction?.(...a)

type Page = "filtres" | "vue" | "aller" | "journal" | "outils"
type Opt = { key: string; label: string; on: boolean; count?: number }

/** Les filtres qui ne sont pas à leur valeur d'origine : la carte les rappelle en pastilles, chacune se retire d'un clic. */
function activeFilters(d: MapData): { id: string; label: string; clear: () => void }[] {
  const out: { id: string; label: string; clear: () => void }[] = []
  if (d.live.on) out.push({ id: "live", label: "En live", clear: () => act("live", "all") })
  const lang = d.langs?.find((l) => l.on && l.key !== "*")
  if (lang) out.push({ id: "lang", label: lang.label, clear: () => act("lang", "*") })
  const game = d.games?.find((g) => g.on && g.key !== "*")
  if (game) out.push({ id: "game", label: game.label, clear: () => act("game", "*") })
  const min = d.mins?.find((m) => m.on && m.key !== "0")
  if (min) out.push({ id: "min", label: `${min.label} viewers actifs`, clear: () => act("min", "0") })
  return out
}

/** Une rangée d'options, une seule active : les boutons de la rubrique Filtres. */
function Choice({ label, items, onPick, hint }: { label: string; items: Opt[]; onPick: (k: string) => void; hint?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="text-xs font-medium text-zinc-300">{label}</div>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            aria-pressed={it.on}
            onClick={() => onPick(it.key)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium whitespace-nowrap transition-[color,background-color,border-color] duration-150 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none",
              it.on ? "border-primary/50 bg-primary/15 text-white" : "border-white/10 bg-zinc-950/50 text-zinc-400 hover:border-white/25 hover:text-zinc-100",
            )}
          >
            {it.label}
            {it.count != null && <span className={cn("font-mono text-[10.5px] tabular-nums", it.on ? "text-zinc-300" : "text-dusk")}>{it.count}</span>}
          </button>
        ))}
      </div>
      {hint && <p className="text-[11.5px] leading-snug text-dusk">{hint}</p>}
    </div>
  )
}

function Filtres({ d }: { d: MapData }) {
  const dirty = activeFilters(d).length > 0 || d.langs?.some((l) => l.on && l.key !== "*")
  return (
    <div className="flex flex-col gap-4">
      <Choice label="Période" items={d.periods} onPick={(k) => act("period", k)} />
      <Choice
        label="Statut"
        items={[{ key: "all", label: "Toutes", count: d.live.total, on: !d.live.on }, { key: "live", label: "En live", count: d.live.count, on: d.live.on }]}
        onPick={(k) => act("live", k)}
      />
      {d.langs && <Choice label="Langue" items={d.langs} onPick={(k) => act("lang", k)} hint="Les nombres comptent les chaînes qui ont des viewers actifs sur la période. La langue vaut aussi pour les autres onglets." />}
      {d.games && <Choice label="Jeu principal" items={d.games} onPick={(k) => act("game", k)} hint="Le jeu le plus relevé de chaque chaîne pendant ses lives de la période : une chaîne qui change de jeu compte pour celui qu'elle a le plus joué." />}
      {d.mins && <Choice label="Audience minimale" items={d.mins} onPick={(k) => act("min", k)} hint="Garde les chaînes qui ont au moins ce nombre de viewers actifs différents sur la période, pour alléger une carte chargée." />}
      <button
        type="button"
        disabled={!dirty}
        onClick={() => act("reset")}
        className="mt-1 inline-flex h-8 w-fit items-center gap-1.5 rounded-md border border-white/10 bg-zinc-950/50 px-2.5 text-xs font-medium text-zinc-300 transition-colors hover:border-white/25 hover:text-white focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
      >
        <RotateCcw className="size-3.5" />Réinitialiser les filtres
      </button>
    </div>
  )
}

function Vue({ d, api, grp, close }: { d: MapData; api: MapApi | null; grp: number | null; close: () => void }) {
  const [q, setQ] = useState("")
  const shown = useMemo(() => (d.pick ?? []).filter((c) => !q.trim() || c.c.includes(q.trim().toLowerCase())), [d.pick, q])
  const modes: [MapData["view"], string, string, number | null][] = [
    ["all", "Toutes les chaînes", "Toutes celles qui ont au moins un viewer actif sur la période.", null],
    ["groups", "Groupes", "Chaînes d'au moins 5 viewers actifs, une couleur par groupe de chaînes qui partagent leurs viewers.", null],
    ["sel", "Ma sélection", "Seulement les chaînes que tu coches ci-dessous (au moins 2).", d.picked],
  ]
  const chan = "inline-flex min-h-6 items-center gap-1 rounded text-xs text-zinc-300 transition-colors duration-200 hover:text-primary-soft focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
  const btn = "h-8 flex-1 rounded-md border border-white/10 bg-zinc-950/60 text-xs text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Vue de la carte" className="flex flex-col gap-1.5">
        {modes.map(([k, label, text, n]) => (
          <button
            key={k}
            type="button"
            aria-pressed={d.view === k}
            onClick={() => act("view", k)}
            className={cn(
              "flex flex-col gap-0.5 rounded-lg border px-3 py-2 text-left transition-[color,background-color,border-color] duration-150 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none",
              d.view === k ? "border-primary/50 bg-primary/10 text-white" : "border-white/[.07] bg-zinc-950/40 text-zinc-400 hover:border-white/20 hover:text-zinc-100",
            )}
          >
            <span className="flex items-center gap-2 text-[13px] font-medium">{label}{n != null && <span className="ml-auto font-mono text-[11px] text-dusk tabular-nums">{n}</span>}</span>
            <span className="text-[11.5px] leading-snug text-dusk">{text}</span>
          </button>
        ))}
      </div>

      {d.pick && (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-zinc-300">Chaînes cochées <span className="tabular-nums text-zinc-100">{d.picked}</span></div>
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher une chaîne…" aria-label="Chercher une chaîne" className="h-8 border-field-edge bg-zinc-950/80 text-[13px]" />
          <div className="flex gap-1.5">
            <button type="button" className={btn} onClick={() => act("pick", shown.map((c) => c.c), true)}>Tout cocher</button>
            <button type="button" className={btn} onClick={() => act("pick", shown.map((c) => c.c), false)}>Tout décocher</button>
          </div>
          <div className="-mx-1.5 flex max-h-[34vh] flex-col gap-px overflow-auto">
            {shown.map((c) => (
              <label key={c.c} className="flex min-w-0 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-[13px] text-zinc-200 transition-colors duration-200 hover:bg-white/[.04]">
                <input type="checkbox" checked={c.on} onChange={(e) => act("pick", c.c, e.target.checked)} className="accent-primary" />
                <ChannelAvatar {...c} />
                <span className="truncate">{c.c}</span>
                <LangBadge langs={c.langs} className="h-4 px-1 text-[9.5px]" />
                <span className="ml-auto font-mono text-[11px] text-dusk tabular-nums">{fmt(c.n)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {d.groups && (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-zinc-300">Groupes</div>
          <button type="button" aria-pressed={grp == null} onClick={() => api?.group(null)} className={cn("rounded-lg border px-3 py-1.5 text-left text-xs font-medium focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none", grp == null ? "border-primary/50 bg-primary/10 text-white" : "border-white/[.07] bg-zinc-950/40 text-zinc-400 hover:border-white/20 hover:text-zinc-100")}>Tous les groupes</button>
          {d.groups.map((g) => (
            <div key={g.i} className={cn("rounded-lg border p-2", grp === g.i ? "border-primary/50 bg-primary/10" : "border-white/[.07] bg-zinc-950/40 hover:border-white/20")}>
              <button type="button" aria-pressed={grp === g.i} onClick={() => api?.group(g.i)} className="flex min-h-6 w-full items-center gap-2 rounded text-left text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none">
                <i className="size-2.5 rounded-full" style={{ background: g.color }} />Groupe {g.i + 1}
                <span className="ml-auto font-normal text-dusk tabular-nums"><span className="text-zinc-300">{g.members.length}</span> chaînes · <span className="text-zinc-300">{fmt(g.viewers)}</span> viewers</span>
              </button>
              <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-1">
                {g.members.map((m) => <button key={m.c} type="button" onClick={() => { api?.select(m.c); close() }} className={chan}><ChannelAvatar {...m} size={16} />{m.c}</button>)}
              </div>
            </div>
          ))}
          {d.solo.length > 0 && (
            <div className="rounded-lg border border-white/[.07] bg-zinc-950/40 p-2">
              <div className="flex items-center gap-2 text-xs text-zinc-400"><i className="size-2.5 rounded-full bg-zinc-500" />Isolées : aucun lien fort</div>
              <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-1">
                {d.solo.map((m) => <button key={m.c} type="button" onClick={() => { api?.select(m.c); close() }} className={chan}><ChannelAvatar {...m} size={16} />{m.c}</button>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** « Aller à une chaîne » : une recherche qui filtre la liste, au lieu d'un menu déroulant de 100 noms. */
function Aller({ d, api, close }: { d: MapData; api: MapApi | null; close: () => void }) {
  const [q, setQ] = useState("")
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  const list = useMemo(() => d.find.filter((c) => !q.trim() || c.includes(q.trim().toLowerCase())), [d.find, q])
  if (!d.find.length) return <p className="text-xs text-dusk">Aucune chaîne sur la carte.</p>
  return (
    <div className="flex flex-col gap-2">
      <Input ref={ref} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher une chaîne…" aria-label="Chercher une chaîne sur la carte" className="h-8 border-field-edge bg-zinc-950/80 text-[13px]" />
      <ul className="-mx-1.5 flex max-h-[52vh] flex-col gap-px overflow-auto">
        {list.map((c) => (
          <li key={c}>
            <button type="button" onClick={() => { api?.find(c); close() }} className="flex min-h-8 w-full items-center rounded-md px-1.5 text-left text-[13px] text-zinc-200 transition-colors hover:bg-white/[.05] hover:text-primary-soft focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none">{c}</button>
          </li>
        ))}
        {!list.length && <li className="px-1.5 py-1 text-xs text-dusk">Aucune chaîne de ce nom sur la carte.</li>}
      </ul>
    </div>
  )
}

function Journal({ api, log, close }: { api: MapApi | null; log: NonNullable<MapNotice["log"]>; close: () => void }) {
  if (!log.length) return <p className="text-xs leading-relaxed text-dusk">Aucun passage depuis l’ouverture de la carte. Ils s’ajoutent ici quand quelqu’un passe d’un chat à l’autre.</p>
  return (
    <ul className="flex flex-col gap-1 text-xs text-zinc-300">
      {log.map((p) => (
        <li key={p.t + p.from + p.to} className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 font-mono text-[11px] text-dusk tabular-nums">{new Date(p.t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
          <button type="button" onClick={() => { api?.select(p.to); close() }} className="min-h-6 min-w-0 truncate text-left transition-colors duration-200 hover:text-primary-soft">
            {p.from} → {p.to}{p.n > 1 && <span className="text-dusk"> × {p.n}</span>}
          </button>
        </li>
      ))}
    </ul>
  )
}

function Outils({ d, openHelp }: { d: MapData; openHelp: () => void }) {
  const row = "flex h-10 items-center gap-2.5 rounded-lg border border-white/[.07] bg-zinc-950/40 px-3 text-left text-[13px] text-zinc-200 transition-colors hover:border-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none [&>svg]:size-4 [&>svg]:text-zinc-400"
  return (
    <div className="flex flex-col gap-2">
      <button type="button" className={row} disabled={d.empty !== ""} onClick={() => act("relayout")} title="Recalculer toute la disposition pour la rendre la plus lisible possible (les chaînes déplacées à la main reprennent aussi leur place calculée)"><Shuffle />Réorganiser la carte</button>
      {d.pins > 0 && <button type="button" className={row} onClick={() => act("pins")}><RotateCcw />Remettre à leur place les {d.pins} chaînes déplacées</button>}
      <button type="button" className={row} onClick={openHelp}><Wrench />Aide de la carte <kbd className="ml-auto rounded border border-white/15 bg-zinc-900 px-1 font-mono text-[11px] text-zinc-300">?</kbd></button>
    </div>
  )
}

const PAGES: { id: Page; label: string; icon: ReactNode }[] = [
  { id: "filtres", label: "Filtres", icon: <Filter /> },
  { id: "vue", label: "Vue", icon: <LayoutGrid /> },
  { id: "aller", label: "Aller à", icon: <Search /> },
  { id: "journal", label: "Journal", icon: <Radio /> },
  { id: "outils", label: "Outils", icon: <Telescope /> },
]

/** Le bouton « Menu » et les pastilles de filtres actifs, posés en haut à gauche de la carte (sous le bandeau du moteur). */
export function MenuButton({ d, open, onToggle }: { d: MapData; open: boolean; onToggle: () => void }) {
  const chips = activeFilters(d)
  return (
    <div className="absolute top-11 left-2.5 z-20 flex max-w-[calc(100%-70px)] flex-wrap items-center gap-1.5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="map-menu"
        onClick={onToggle}
        title="Menu de la carte : filtres, vue, recherche (M)"
        className={cn(
          "inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-semibold tracking-wide text-zinc-100 shadow-lg shadow-black/40 backdrop-blur-xl transition-[color,background-color,border-color] duration-150 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none",
          open ? "border-primary/50 bg-primary/20" : "border-white/15 bg-zinc-900/75 hover:border-white/30 hover:bg-zinc-800",
        )}
      >
        <Menu className="size-3.5" />Menu<kbd className="rounded border border-white/15 bg-zinc-950/60 px-1 font-mono text-[10px] font-normal text-zinc-400 max-sm:hidden">M</kbd>
      </button>
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={c.clear}
          title={`Retirer le filtre « ${c.label} »`}
          aria-label={`Retirer le filtre ${c.label}`}
          className="inline-flex h-7 items-center gap-1 rounded-full border border-primary/40 bg-zinc-900/75 pr-1.5 pl-2.5 text-xs text-zinc-100 backdrop-blur-xl transition-colors hover:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
        >
          {c.label}<X className="size-3 text-zinc-400" />
        </button>
      ))}
    </div>
  )
}

/** Le panneau : rubriques à gauche, contenu à droite ; sur petit écran, les rubriques passent en barre au-dessus. */
export function GameMenu({ d, api, grp, log, onClose, openHelp }: { d: MapData; api: MapApi | null; grp: number | null; log: NonNullable<MapNotice["log"]>; onClose: () => void; openHelp: () => void }) {
  // en développement, ?menu=vue (ou aller, journal, outils) ouvre le menu sur cette rubrique : sert aux captures d'écran
  const [page, setPage] = useState<Page>(() => {
    const m = import.meta.env.DEV ? new URLSearchParams(location.search).get("menu") : null
    return PAGES.some((p) => p.id === m) ? (m as Page) : "filtres"
  })
  const nShown = d.live.on ? d.live.count : d.live.total
  return (
    <div
      id="map-menu"
      role="dialog"
      aria-label="Menu de la carte"
      className="absolute top-2.5 left-2.5 z-30 flex h-[min(540px,calc(100%-20px))] w-[min(540px,calc(100%-20px))] animate-in fade-in-0 slide-in-from-left-2 flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/85 shadow-2xl shadow-black/60 backdrop-blur-xl backdrop-saturate-150 duration-200 motion-reduce:animate-none"
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
        <div>
          <b className="text-sm font-semibold tracking-wide text-zinc-100">Menu</b>
          <span className="ml-2 text-xs text-dusk tabular-nums">{d.empty ? "carte vide" : `${nShown} chaîne${nShown > 1 ? "s" : ""} sur la carte`}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer le menu (Échap)" title="Fermer le menu (Échap)" className="grid size-7 place-items-center rounded-md text-zinc-400 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"><X className="size-4" /></button>
      </div>
      <div className="flex min-h-0 flex-1 max-sm:flex-col">
        <nav aria-label="Rubriques du menu" className="flex shrink-0 gap-1 border-white/10 p-2 sm:w-36 sm:flex-col sm:border-r max-sm:overflow-x-auto max-sm:border-b">
          {PAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-current={page === p.id ? "page" : undefined}
              onClick={() => setPage(p.id)}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] font-medium whitespace-nowrap transition-[color,background-color] duration-150 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none [&>svg]:size-4",
                page === p.id ? "bg-primary/15 text-white" : "text-zinc-400 hover:bg-white/[.04] hover:text-zinc-100",
              )}
            >
              {p.icon}{p.label}
              {p.id === "filtres" && activeFilters(d).length > 0 && <span className="ml-auto grid size-4 place-items-center rounded-full bg-primary/80 text-[10px] text-white tabular-nums">{activeFilters(d).length}</span>}
            </button>
          ))}
        </nav>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 [scrollbar-gutter:stable]">
          {page === "filtres" && <Filtres d={d} />}
          {page === "vue" && <Vue d={d} api={api} grp={grp} close={onClose} />}
          {page === "aller" && <Aller d={d} api={api} close={onClose} />}
          {page === "journal" && <Journal api={api} log={log} close={onClose} />}
          {page === "outils" && <Outils d={d} openHelp={() => { onClose(); openHelp() }} />}
        </div>
      </div>
    </div>
  )
}
