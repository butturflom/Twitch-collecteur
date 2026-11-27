// Onglet « Audiences » (il remplace « Chevauchement » et « Flux ») : une page en deux parties titrées, « En commun » et
// « Qui va où ». Les chiffres viennent de l'ancien code (événements legacy:overlap et legacy:flows).
import { useEffect } from "react"
import { Route } from "lucide-react"
import { OverlapIcon } from "@/components/app-sidebar"
import { Empty, Pending, panel } from "@/components/overview/parts"
import { fmt } from "@/lib/format"
import { cn } from "@/lib/utils"
import { onGotoPart, useFlowsData, useOverlapData, usePeriodInfo, type OverlapData } from "@/legacy/bridge"
import { Commun } from "./commun"
import { Note } from "./parts"
import { Trajets } from "./trajets"

const pct1 = (x: number) => (x * 100).toFixed(1).replace(".", ",") + " %"
/** Pourcentage mis en avant, sans décimale ; il n'annonce jamais « 100 % » tant qu'il reste quelqu'un à côté. */
const pctBig = (x: number) => (x >= 0.995 && x < 1 ? "> 99 %" : Math.round(x * 100) + " %")

/** Va à une partie de la page ; le focus suit, pour que le clavier reparte de là. */
function goTo(part: string, smooth: boolean) {
  if (part === "haut") return window.scrollTo(0, 0)
  const el = document.getElementById("aud-" + part)
  if (!el) return
  el.scrollIntoView({ block: "start", behavior: smooth && !matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto" })
  el.focus({ preventScroll: true })
}

/** Le chiffre mis en avant et la répartition 1 / 2 / 3 chaînes ou plus. Toujours sur tous les viewers actifs, sans le filtre. */
function Spread({ s, period }: { s: OverlapData["spread"]; period: string }) {
  const when = period === "today" ? "Aujourd’hui" : "Sur la période"
  if (!s.total)
    return <Empty>Aucun viewer actif relevé {period === "today" ? "aujourd’hui" : "sur cette période"}. Le chiffre apparaît dès qu’un message est écrit dans le chat d’une chaîne suivie.</Empty>
  const one = s.one / s.total
  const single = s.single / s.total
  const talk3 = s.talk3 ? s.talk3one / s.talk3 : null
  const dist = [
    { k: "1 seule chaîne", v: s.one, c: "bg-primary" },
    { k: "2 chaînes", v: s.two, c: "bg-chart-2" },
    { k: "3 chaînes ou plus", v: s.more, c: "bg-primary-soft" },
  ]
  return (
    <>
      <div className={cn(panel, "grid items-center gap-x-10 gap-y-5 px-6 py-[22px] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]")}>
        <div>
          <p className="flex items-baseline gap-4">
            <span className="text-[52px] leading-none font-semibold tracking-[-0.04em] whitespace-nowrap tabular-nums">{pctBig(one)}</span>
            <span className="max-w-[30ch] text-base leading-snug font-medium tracking-[-0.01em]">des viewers actifs n’écrivent que sur une seule de tes chaînes suivies</span>
          </p>
          <p className="mt-2.5 text-[12.5px] text-muted-foreground">
            {when}, <span className="font-mono text-foreground tabular-nums">{fmt(s.total)}</span> viewer{s.total > 1 ? "s" : ""} actif{s.total > 1 ? "s" : ""} sur les {fmt(s.chans)} chaînes {s.filtered ? "affichées (filtre de langue)" : "suivies"}.
          </p>
        </div>
        <div>
          <div role="img" aria-label="Répartition des viewers actifs selon le nombre de chaînes où ils écrivent (détail ci-dessous)" className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-white/5">
            {dist.filter((x) => x.v > 0).map((x) => <span key={x.k} className={cn("h-full min-w-[3px]", x.c)} style={{ width: `${((x.v / s.total) * 100).toFixed(2)}%` }} />)}
          </div>
          <ul className="mt-3 grid gap-1.5 text-[13px]">
            {dist.map((x) => (
              <li key={x.k} className="grid grid-cols-[10px_minmax(0,1fr)_auto_auto] items-center gap-2.5">
                <i aria-hidden className={cn("size-2.5 rounded-[3px]", x.c)} />
                <span>{x.k}</span>
                <span className="min-w-[4.5rem] text-right font-mono text-[12.5px] tabular-nums">{fmt(x.v)}</span>
                <span className="min-w-[3.5rem] text-right font-mono text-[12.5px] text-muted-foreground tabular-nums">{pct1(x.v / s.total)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Note>
        Un <b>viewer actif</b> a écrit au moins un message ; les viewers silencieux ne sont pas comptés.
        {s.single > 0 && <> {when}, {pctBig(single)} n’ont écrit qu’un seul message et ne pouvaient donc pas être vus sur deux chaînes.</>}
        {talk3 != null && <> Parmi ceux qui ont écrit au moins 3 messages, la part de ceux qui n’écrivent que sur une seule chaîne {talk3 < one ? "tombe à" : "est de"} <b>{pctBig(talk3)}</b>.</>}
        {" "}Seules les chaînes suivies sont vues : quelqu’un qui écrit aussi ailleurs sur Twitch compte ici « sur une seule ».
      </Note>
    </>
  )
}

export function Audiences() {
  const o = useOverlapData()
  const f = useFlowsData()
  const period = usePeriodInfo()?.key ?? "today"
  const ready = !!o && !!f

  // lien venu d'une autre page vers une partie précise (data-goto="audiences" data-part="…")
  useEffect(() => {
    if (!ready) return
    return onGotoPart((part) => requestAnimationFrame(() => goTo(part, false)))
  }, [ready])

  if (!o || !f) return <Pending />

  const multi = o.spread.two + o.spread.more
  const jump = "inline-flex h-7 items-center gap-1.5 rounded-full border border-white/10 bg-background/50 px-2.5 text-xs font-medium text-foreground transition-colors hover:border-white/25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&>svg]:size-3.5"

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:slide-in-from-bottom-0">
      <div role="region" aria-label="Viewers actifs sur une seule chaîne">
        <Spread s={o.spread} period={period} />
        <nav aria-label="Aller à une partie de la page" className="mt-3.5 flex flex-wrap items-center gap-1">
          <span className="mr-1 text-xs font-medium text-dusk">Aller à</span>
          <button type="button" className={jump} onClick={() => goTo("commun", true)}>
            <OverlapIcon />En commun · <span className="font-mono tabular-nums">{fmt(multi)}</span> sur 2 chaînes ou plus
          </button>
          <button type="button" className={jump} onClick={() => goTo("trajets", true)}>
            <Route strokeWidth={1.75} />Qui va où · <span className="font-mono tabular-nums">{fmt(f.move)}</span> {f.move > 1 ? "ont" : "a"} changé de stream
          </button>
        </nav>
      </div>
      <Commun d={o} />
      <Trajets d={f} period={period} />
    </div>
  )
}
