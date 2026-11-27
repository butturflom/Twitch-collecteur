// Partie « Qui va où » de l'onglet Audiences : les passages d'une chaîne à une autre, où le sens compte. Données : legacy:flows.
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, ChevronDown, Info, Route } from "lucide-react"
import { ChannelAvatar } from "@/components/channel-avatar"
import { daysFromByDay, FlowsMap, longDay, mapOrder, useReducedMotion, type FlowDay } from "@/components/flows/flows-map"
import { ChannelCell, DataTable, Empty, ShowMore, heat, muted, panel, type Col } from "@/components/overview/parts"
import { Kpis } from "@/components/shared/blocks"
import { fmt, pct } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { FlowsData } from "@/legacy/bridge"
import { Block, Note, Part, RankList } from "./parts"

type Row = FlowsData["rows"][number]
type Raid = FlowsData["raids"][number]
type TopRow = FlowsData["top"][number]

/** En dessous de ce nombre de journées passées, la page dit que la lecture jour par jour est encore courte. */
const ENOUGH_DAYS = 14

/** La carte des migrations et, à côté, les trajets de la journée choisie en chiffres. */
function Migrations({ d, period }: { d: FlowsData; period: string }) {
  const reduced = useReducedMotion()
  // journée choisie : sa date, ou null pour suivre la dernière (la journée en cours)
  const [sel, setSel] = useState<string | null>(null)
  const days = useMemo<FlowDay[]>(() => {
    const past = d.byDay ? daysFromByDay(d.byDay).filter((x) => x.d < d.today.d) : []
    return [...past, { d: d.today.d, today: true, routes: d.today.routes }]
  }, [d.byDay, d.today])
  const order = useMemo(() => mapOrder(days), [days])
  const last = days.length - 1
  const found = sel ? days.findIndex((x) => x.d === sel) : -1
  const idx = found < 0 ? last : found
  const day = days[idx]
  const onMove = (to: (i: number) => number) =>
    setSel((prev) => {
      const at = prev ? days.findIndex((x) => x.d === prev) : -1
      const n = Math.max(0, Math.min(last, to(at < 0 ? last : at)))
      return n === last ? null : days[n].d
    })

  // byDay arrive après le reste de la page : la mention « indisponibles » n'apparaît qu'après quelques secondes sans lui
  const has = !!d.byDay
  const [late, setLate] = useState(false)
  useEffect(() => {
    setLate(false)
    if (has) return
    const id = setTimeout(() => setLate(true), 4000)
    return () => clearTimeout(id)
  }, [has])

  const past = last
  const wide = period === "today" || period === "all"
  const few = !has
    ? late ? "Journées passées indisponibles (base non reliée ou pas à jour) : seule la journée en cours est affichée." : ""
    : past === 0 ? "Aucune journée passée résumée pour l’instant : il s’en ajoute une chaque nuit."
    : wide && past < ENOUGH_DAYS ? `${past} journée${past > 1 ? "s" : ""} passée${past > 1 ? "s" : ""} résumée${past > 1 ? "s" : ""} pour l’instant, une de plus chaque nuit : la lecture jour par jour prendra son sens à partir de ${ENOUGH_DAYS} journées.`
    : ""

  const routes = [...day.routes].sort((a, b) => b.n - a.n).slice(0, 12)

  return (
    <Block title="Carte des migrations" className="mt-9">
      {few && (
        <p className="mb-3 flex items-center gap-2.5 rounded-[10px] border border-border bg-white/[.02] px-3 py-2 text-[12.5px] text-muted-foreground">
          <Info aria-hidden className="size-[15px] shrink-0 text-primary-soft" strokeWidth={1.75} />{few}
        </p>
      )}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className={cn(panel, "min-w-0 p-4")}>
          <FlowsMap days={days} order={order} idx={idx} onMove={onMove} />
        </div>
        <div className="min-w-0">
          {routes.length ? (
            <RankList
              rows={routes.map((r) => ({
                key: r.a.c + ">" + r.b.c,
                v: r.n,
                color: r.a.color,
                right: <><b className="font-medium text-foreground">{fmt(r.n)}</b>{r.gap && <> · {r.gap}</>}{r.raid && <span className="font-sans text-primary-soft"> · raid</span>}</>,
                label: (
                  <span className="flex min-w-0 items-center gap-1.5">
                    <ChannelAvatar {...r.a} /><span className="truncate" title={r.a.c}>{r.a.c}</span>
                    <span role="img" aria-label="vers" className="inline-flex shrink-0 text-dusk"><ArrowRight className="size-3.5" /></span>
                    <ChannelAvatar {...r.b} /><span className="truncate" title={r.b.c}>{r.b.c}</span>
                  </span>
                ),
              }))}
            />
          ) : (
            <Empty>{day.today ? "Aucun trajet aujourd’hui pour l’instant." : `Aucun trajet le ${longDay(day.d)}.`}</Empty>
          )}
          <Note>
            Les trajets de la journée choisie, du plus gros au plus petit (12 au plus) : personnes distinctes{day.today ? " et délai médian." : ". Le délai médian n’est connu que pour la journée en cours : le résumé de nuit ne le garde pas."}
          </Note>
          <Note>
            Une flèche = des viewers actifs qui écrivent chez A, puis chez B moins de 3 h après, <b>le même jour</b>, comptés une fois par trajet. À droite, vers une chaîne placée plus bas ; à gauche, vers une chaîne placée plus haut. Épaisseur : même échelle pour toutes les journées.
            {!reduced && <> Les points qui avancent sur une flèche figurent ce passage : leur nombre suit le nombre de personnes, ce ne sont pas des personnes réelles.</>}
            {" "}« raid » : un raid a eu lieu sur ce trajet ce jour-là ; on ne sait pas quels passages en viennent, aucune part due aux raids n’est calculée.
            {days.length <= 16 && <> Le chiffre au-dessus de chaque journée additionne les trajets dessinés (quelqu’un sur deux trajets y compte deux fois).</>}
          </Note>
        </div>
      </div>
    </Block>
  )
}

/** Chaîne par chaîne : au-delà de ce nombre, seules les chaînes qui ont le plus de passages restent visibles. */
const ROWS = 12

function Channels({ rows }: { rows: Row[] }) {
  const [open, setOpen] = useState(false)
  const maxNet = Math.max(1, ...rows.map((r) => Math.abs(r.net)))
  const maxM = Math.max(0, ...rows.map((r) => r.m ?? 0)) || 1
  const cut = rows.length > ROWS + 1
  const busy = new Set([...rows].sort((a, b) => b.in + b.out - (a.in + a.out) || b.n - a.n).slice(0, ROWS).map((r) => r.c))
  const shown = cut && !open ? rows.filter((r) => busy.has(r.c)) : rows
  const cols: Col<Row>[] = [
    { head: "Chaîne", left: true, cell: (r) => <ChannelCell who={r} /> },
    { head: "Viewers actifs", cell: (r) => fmt(r.n) },
    { head: "Ont changé de stream", title: "Part de ses viewers actifs qui ont changé de stream au moins une fois sur la période. Non calculée sous 20 viewers actifs.", cell: (r) => (r.m == null ? muted("—") : pct(r.m)), style: (r) => (r.m == null ? undefined : heat((r.m / maxM) * 0.4)) },
    { head: "Arrivent d’une autre chaîne", cell: (r) => fmt(r.in) },
    { head: "Partent vers une autre chaîne", cell: (r) => fmt(r.out) },
    {
      head: "Solde",
      title: "Arrivées − départs",
      cell: (r) => (
        <span className="inline-flex items-center justify-end gap-2.5">
          {/* barre centrée : à droite si la chaîne gagne des viewers, à gauche si elle en perd */}
          <span aria-hidden className="relative hidden h-1.5 w-24 overflow-hidden rounded-full bg-white/5 sm:block">
            <span className="absolute inset-y-0 left-1/2 w-px bg-white/15" />
            <span className={cn("absolute inset-y-0 rounded-full", r.net >= 0 ? "left-1/2 bg-signal-green" : "right-1/2 bg-destructive")} style={{ width: `${(Math.abs(r.net) / maxNet) * 50}%` }} />
          </span>
          <span className={cn("min-w-12", r.net > 0 ? "text-signal-green" : r.net < 0 ? "text-destructive" : undefined)}>{(r.net > 0 ? "+" : "") + fmt(r.net)}</span>
        </span>
      ),
    },
  ]
  return (
    <Block title="Chaîne par chaîne" className="mt-9">
      {rows.length ? (
        <>
          <DataTable cols={cols} rows={shown} rowKey={(r) => r.c} />
          {cut && <ShowMore className="mt-2.5 px-0.5" hidden={rows.length - ROWS} open={open} onToggle={() => setOpen((o) => !o)} noun={["chaîne", "chaînes"]} />}
          <Note>
            Un solde positif = la chaîne reçoit plus de viewers actifs des autres qu’elle ne leur en envoie, sur la période. Arrivées et départs : personnes distinctes, une fois par trajet ; quelqu’un parti vers deux chaînes compte dans les deux. Où ils vont se lit sur la carte au-dessus, jour par jour.
            {cut && !open && <> Replié : les {ROWS} chaînes qui ont le plus de passages.</>}
          </Note>
        </>
      ) : (
        <Empty>Pas encore de données sur cette période.</Empty>
      )}
    </Block>
  )
}

function Raids({ d, period }: { d: FlowsData; period: string }) {
  const cols: Col<Raid>[] = [
    {
      head: "Quand",
      left: true,
      // « ven. 27 nov. 21h22 » : l’heure seule sur « Aujourd’hui », sinon la date au-dessus (colonne étroite)
      cell: (r) => {
        const at = r.when.lastIndexOf(" ")
        return (
          <span className="font-mono text-[12.5px] whitespace-nowrap">
            {period !== "today" && <span className="block text-xs text-muted-foreground">{r.when.slice(0, at)}</span>}
            {r.when.slice(at + 1)}
          </span>
        )
      },
    },
    { head: "De", left: true, cell: (r) => (r.from ? <span className="inline-flex items-center gap-2"><ChannelAvatar {...r.from} /><span className="max-w-[14ch] truncate font-medium" title={r.from.name}>{r.from.name}</span></span> : muted("—")) },
    { head: "Vers", left: true, cell: (r) => <ChannelCell who={r.to} /> },
    { head: "Viewers", cell: (r) => fmt(r.n) },
  ]
  return (
    <Block id="aud-raids" title="Raids reçus">
      {d.raids.length ? <DataTable cols={cols} rows={d.raids} rowKey={(r) => r.when + r.to.c + (r.from?.c ?? "") + r.n} limit={4} noun={["raid", "raids"]} /> : <Empty>Aucun raid reçu par les chaînes suivies sur cette période.</Empty>}
      <Note>
        On ne voit que les raids qui arrivent sur une chaîne suivie (l’annonce passe dans le chat de celle qui reçoit).
        {d.raidCount > d.raids.length && <> La liste garde les {d.raids.length} plus récents.</>}
      </Note>
    </Block>
  )
}

/** Parcours d'un viewer : planètes des chaînes dans l'ordre (survol : chaîne et heure). */
function Path({ r }: { r: TopRow }) {
  return (
    <span className="flex flex-col gap-1 whitespace-normal">
      <span className="inline-flex flex-wrap items-center gap-0.5">
        <span className="sr-only">{r.path.map((p) => p.c).join(", puis ")}</span>
        {r.path.map((p, i) => (
          <span key={i} aria-hidden className="inline-flex items-center gap-0.5">
            {i > 0 && <ArrowRight className="size-3 text-dusk" />}
            <span title={`${p.c} · ${p.when}`}><ChannelAvatar {...p} /></span>
          </span>
        ))}
        {r.more > 0 && <span className="ml-1 font-mono text-[11px] text-dusk">… +{r.more}</span>}
      </span>
      <span className="text-[11.5px] text-dusk">{r.chans} chaînes · {r.span}</span>
    </span>
  )
}

function Nomads({ rows }: { rows: TopRow[] }) {
  const [open, setOpen] = useState(false)
  const cols: Col<TopRow>[] = [
    { head: "Viewer (anonyme)", left: true, cell: (r) => <code className="rounded-md border border-border bg-secondary px-1.5 py-0.5 font-mono text-xs">{r.id}</code> },
    { head: "Changements", cell: (r) => fmt(r.moves) },
    { head: "Parcours", left: true, cell: (r) => <Path r={r} /> },
  ]
  return (
    <Block title="Les parcours les plus nomades">
      {rows.length ? (
        <div className={cn(panel, "p-4")}>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 rounded-md text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ChevronDown aria-hidden className={cn("size-3.5 transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")} />
            {open ? "Masquer les parcours" : rows.length > 1 ? `Afficher les ${rows.length} parcours les plus nomades` : "Afficher le parcours le plus nomade"}
          </button>
          {open ? (
            <div className="mt-3">
              <DataTable bare cols={cols} rows={rows} rowKey={(r) => r.id + r.span} />
            </div>
          ) : (
            <p className="mt-2 text-xs text-dusk">Replié par défaut : c’est un détail, pas une lecture de l’audience.</p>
          )}
        </div>
      ) : (
        <Empty>Personne n’a encore changé de stream sur cette période.</Empty>
      )}
      <Note>Chaque viewer n’est connu que par une empreinte, jamais son pseudo : on voit qu’une même personne passe d’un chat à l’autre, pas qui elle est. Le parcours montre les chaînes dans l’ordre de ses premiers messages de chaque journée ; le nombre de changements, lui, compte chaque aller-retour.</Note>
    </Block>
  )
}

export function Trajets({ d, period }: { d: FlowsData; period: string }) {
  return (
    <Part id="aud-trajets" icon={<Route strokeWidth={1.75} />} title="Qui va où" sub="Des viewers actifs qui écrivent chez une chaîne, puis chez une autre moins de 3 h après. Ici le sens compte : de A vers B n’est pas de B vers A.">
      <Kpis
        items={[
          { label: "Ont changé de stream", value: fmt(d.move), hint: d.actives ? `${pct(d.move / d.actives)} des viewers actifs · au moins une fois` : "au moins une fois" },
          { label: "Changent souvent", value: fmt(d.often), hint: `${d.oftenAt} changements ou plus` },
          { label: "Délai médian", value: d.medianGap || "—", hint: "entre le dernier message chez A et le premier chez B" },
          { label: "Raids reçus", value: fmt(d.raidCount), hint: `${fmt(d.raidViewers)} viewers apportés (annoncés)` },
        ]}
      />
      <Note>
        {!d.move
          ? "Personne n’a encore changé de stream sur cette période : il faut que des chaînes suivies soient en live en même temps, ou à la suite."
          : d.swStart
            ? <>Changements comptés message par message, allers-retours compris, depuis le <b>{d.swStart}</b> (collecteur 1.5).</>
            : "Pour l’instant, les changements sont estimés à partir du premier et du dernier message de chaque journée : les va-et-vient d’une même soirée ne sont pas vus. Le collecteur 1.5 les compte message par message."}
      </Note>
      <Migrations d={d} period={period} />
      <Channels rows={d.rows} />
      <div className="mt-9 grid items-start gap-x-4 gap-y-9 lg:grid-cols-2">
        <Raids d={d} period={period} />
        <Nomads rows={d.top} />
      </div>
    </Part>
  )
}
