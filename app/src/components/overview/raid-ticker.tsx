// Bandeau des raids reçus par les chaînes suivies, en tête de la Vue d'ensemble. Il défile à partir de 4 raids ; il se met en
// pause au survol, au clavier ou avec le bouton. Mouvements réduits ou pause : une liste fixe qu'on fait défiler soi-même.
import { useState } from "react"
import { ArrowRight, Pause, Play } from "lucide-react"
import { panel, ChannelCell } from "./parts"
import { fmt } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { RaidTickerData } from "@/legacy/bridge"

const SCROLL_FROM = 4 // en dessous, tout tient à l'écran : rien à faire défiler

type Row = RaidTickerData["rows"][number]

/** copy : second exemplaire, qui sert seulement à boucler sans trou (muet pour le clavier et les lecteurs d'écran). */
function Items({ rows, copy }: { rows: Row[]; copy?: boolean }) {
  return (
    <ul aria-hidden={copy || undefined} className={cn("flex shrink-0 items-center", copy && "to2-ticker-copy")}>
      {rows.map((r) => (
        <li key={r.t + r.to.c + (r.from?.c ?? "")} className="flex shrink-0 items-center gap-1.5 border-r border-white/10 px-4 text-[13px] whitespace-nowrap">
          <span className="max-w-[18ch] truncate font-medium">{r.from ? r.from.name : "Raideur inconnu"}</span>
          <ArrowRight role="img" aria-label="vers" className="size-3 shrink-0 text-dusk" />
          <ChannelCell who={r.to} link={!copy} />
          <span className="font-mono text-xs text-muted-foreground tabular-nums">{fmt(r.n)} viewers</span>
          <span className="text-xs text-dusk">il y a {r.ago}</span>
        </li>
      ))}
    </ul>
  )
}

export function RaidTicker({ d }: { d: RaidTickerData }) {
  const [paused, setPaused] = useState(false)
  if (!d.rows.length) return null
  const moving = d.rows.length >= SCROLL_FROM
  return (
    <div role="region" aria-label="Raids reçus" className={cn(panel, "mb-6 flex items-center gap-x-3 gap-y-1 py-2 pr-2 pl-4 max-sm:flex-wrap max-sm:justify-between")}>
      <h2 className="shrink-0 text-[13px] font-semibold">
        Raids reçus
        {d.older && <span className="block text-[11px] font-normal text-dusk">les derniers, aucun aujourd'hui</span>}
      </h2>
      <div className={cn("to2-ticker min-w-0 flex-1 max-sm:order-last max-sm:basis-full", moving && !paused && "to2-ticker-on")}>
        <div className="to2-ticker-track flex w-max" style={{ "--ticker-s": `${d.rows.length * 6}s` } as React.CSSProperties}>
          <Items rows={d.rows} />
          {moving && !paused && <Items rows={d.rows} copy />}
        </div>
      </div>
      {moving && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          aria-label={paused ? "Reprendre le défilement des raids" : "Mettre le défilement des raids en pause"}
          title={paused ? "Reprendre" : "Pause"}
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none motion-reduce:hidden"
        >
          {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
        </button>
      )}
    </div>
  )
}
