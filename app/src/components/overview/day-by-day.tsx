// Vue d'ensemble → Jour par jour : pic de viewers simultanés (nombre annoncé), viewers actifs et messages, sur trois lignes à
// échelles propres. Les journées passées viennent des rollups (fonction SQL network_history), la journée en cours de legacy.js
// (todayData). Sa durée (7, 30, 90 jours) est indépendante de la période en haut de page. Il remplace « Historique du réseau ».
import { useEffect, useState, type ReactNode } from "react"
import { Info } from "lucide-react"
import { DataTable, Section, muted, panel, type Col } from "@/components/overview/parts"
import { Segmented } from "@/components/shared/segmented"
import { fmt } from "@/lib/format"
import { dayLbl, dayNum } from "@/lib/time"
import { cn } from "@/lib/utils"
import { atTime, longDay } from "./dates"
import type { NetworkHistory, PeriodReach, TodayData } from "@/legacy/bridge"

type Span = 7 | 30 | 90
type State = { s: "loading" } | { s: "none" } | { s: "error"; msg: string } | { s: "ok"; h: NetworkHistory }
interface Day { d: string; today?: boolean; none?: boolean; peak: number | null; peakAt: number | null; actives: number | null; msgs: number | null; chans: number | null }

const DAY = 86400000
const noon = (d: string) => Date.parse(d + "T12:00:00Z") // midi : le même jour à Paris, été comme hiver
const addDays = (d: string, n: number) => new Date(noon(d) + n * DAY).toISOString().slice(0, 10)
const plural = (n: number, one: string, many = one + "s") => (n > 1 ? many : one)
const compact = (v: number) => (v >= 100000 ? `${fmt(v / 1000)} k` : fmt(v))

// La page se remonte à chaque retour sur l’onglet : les journées passées ne changent qu’une fois par nuit, on les garde 10 min.
// La clé porte le jour en cours (après minuit, on relit) ; une réponse vide n’est pas gardée (base pas encore reliée).
const cache = new Map<string, { fn: unknown; at: number; p: Promise<NetworkHistory | null> }>()
function read(fn: NonNullable<Window["networkHistory"]>, days: Span, today: string) {
  const key = `${days}|${today}`
  const c = cache.get(key)
  if (c && c.fn === fn && Date.now() - c.at < 600000) return c.p
  const p = fn(days)
  cache.set(key, { fn, at: Date.now(), p })
  p.then((h) => { if (!h?.days.length) cache.delete(key) }, () => cache.delete(key))
  return p
}

/** Les colonnes : toutes les journées du calendrier, de la première montrée à aujourd'hui. Une journée sans agrégat reste un trou. */
function columns(h: NetworkHistory | null, today: TodayData, days: Span) {
  const first = addDays(today.d, 1 - days)
  const past = (h?.days ?? []).filter((x) => x.d >= first && x.d < today.d)
  const byD = new Map(past.map((x) => [x.d, x]))
  // 7 jours : les sept cases ; 30 et 90 jours : à partir de la première journée qui existe
  const start = days === 7 ? first : past.reduce((m, x) => (x.d < m ? x.d : m), today.d)
  const cols: Day[] = []
  for (let d = start; d < today.d; d = addDays(d, 1)) {
    const x = byD.get(d)
    cols.push(x
      ? { d, peak: x.peak ?? null, peakAt: x.peakAt ?? null, actives: x.actives ?? null, msgs: x.msgs, chans: x.chans }
      : { d, none: true, peak: null, peakAt: null, actives: null, msgs: null, chans: null })
  }
  cols.push({ d: today.d, today: true, peak: today.peak, peakAt: today.peakAt, actives: today.actives, msgs: today.msgs, chans: today.chans })
  // base pas à jour : les clés sont absentes (une journée sans calcul, elle, les porte à null)
  const outdated = past.length > 0 && past.every((x) => x.actives === undefined && x.peak === undefined)
  return { cols, done: past.length, peaks: past.filter((x) => x.peak != null).length, firstDone: past.length ? past.reduce((m, x) => (x.d < m ? x.d : m), today.d) : null, outdated }
}

const ROWS: { key: "peak" | "actives" | "msgs"; label: string; sub: string; color: string }[] = [
  { key: "peak", label: "Viewers", sub: "pic simultané · nombre annoncé par Twitch", color: "bg-chart-2" },
  { key: "actives", label: "Viewers actifs", sub: "personnes distinctes qui ont écrit", color: "bg-primary" },
  { key: "msgs", label: "Messages", sub: "dans le chat", color: "bg-primary/55" },
]
const BAR = 40 // hauteur de la plus grande barre d'une ligne, en pixels

function Chart({ cols }: { cols: Day[] }) {
  const dense = cols.length > 14
  const every = Math.ceil(cols.length / 10)
  return (
    <div className={cn(panel, "px-[18px] pt-4 pb-3")}>
      <div role="img" aria-label={`Graphique jour par jour sur ${cols.length} journées : pic de viewers simultanés, viewers actifs et messages. Les valeurs sont dans la vue Tableau.`}
        className={cn("grid items-end", dense ? "gap-x-0.5" : "gap-x-1.5")} style={{ gridTemplateColumns: `168px repeat(${cols.length}, minmax(0, 1fr))` }}>
        {ROWS.map((r) => {
          const max = Math.max(0, ...cols.map((c) => c[r.key] ?? 0))
          return [
            <div key={r.key} className="self-center pr-3.5 text-xs leading-snug text-muted-foreground">
              <b className="flex items-center gap-1.5 text-[12.5px] font-medium text-foreground"><i aria-hidden className={cn("size-2 rounded-[2px]", r.color)} />{r.label}</b>
              {r.sub}
              {dense && max > 0 && <span className="block text-dusk">plus haut : <span className="font-mono tabular-nums">{compact(max)}</span></span>}
            </div>,
            ...cols.map((c) => {
              const v = c[r.key]
              const approx = r.key === "actives" && !c.today ? "≈ " : ""
              const tip = `${c.today ? "Aujourd’hui (en cours)" : dayLbl(noon(c.d))} : ${v == null ? "pas de chiffre" : approx + fmt(v)}${r.key === "peak" && v != null && c.peakAt ? ` à ${atTime(c.peakAt)}` : ""}`
              return (
                <div key={r.key + c.d} title={tip} className="flex h-[74px] min-w-0 flex-col items-center justify-end border-b border-white/5 pt-1.5 pb-2">
                  {v == null ? (
                    <span className="my-auto font-mono text-[11px] text-dusk">{dense ? "·" : "—"}</span>
                  ) : (
                    <>
                      {!dense && <span className="mb-1 font-mono text-[11px] whitespace-nowrap text-foreground tabular-nums">{approx}{compact(v)}</span>}
                      <span className={cn("w-[70%] max-w-11 rounded-t-[3px]", r.color, c.today && "to2-hatch")} style={{ height: Math.max(3, Math.round((v / (max || 1)) * BAR)) }} />
                    </>
                  )}
                </div>
              )
            }),
          ]
        })}
        <div />
        {cols.map((c, i) => {
          const last = cols.length - 1
          const labelled = !dense || c.today || (i % every === 0 && last - i >= every)
          return (
            <div key={c.d} className={cn("min-w-0 self-start pt-2 text-center text-[11px] leading-snug text-dusk", dense && "overflow-visible whitespace-nowrap")}>
              {c.today ? (
                <><b className="block font-medium text-foreground">auj.</b>{!dense && "en cours"}</>
              ) : labelled ? (
                <><b className="block font-medium text-muted-foreground">{dense ? dayNum(noon(c.d)) : dayLbl(noon(c.d)).replace(/ [^ ]+$/, "")}</b>{c.none && !dense && "pas de données"}</>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Table({ cols }: { cols: Day[] }) {
  const rows = cols.filter((c) => !c.none).reverse()
  const num = (v: number | null, prefix = "") => (v == null ? "—" : prefix + fmt(v))
  const head: Col<Day>[] = [
    { head: "Jour", left: true, cell: (c) => (c.today ? <>Aujourd’hui {muted("(en cours)")}</> : longDay(noon(c.d))) },
    { head: "Viewers · pic simultané", cell: (c) => <>{num(c.peak)}{c.peak != null && c.peakAt != null && <span className="block text-[11px] text-dusk">à {atTime(c.peakAt)}</span>}</> },
    { head: "Viewers actifs", cell: (c) => num(c.actives, c.today ? "" : "≈ ") },
    { head: "Messages", cell: (c) => num(c.msgs) },
    { head: "Chaînes avec des messages", cell: (c) => num(c.chans) },
  ]
  return <DataTable limit={10} noun={["journée", "journées"]} cols={head} rows={rows} rowKey={(c) => c.d} />
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex items-start gap-2.5 rounded-[10px] border border-border bg-white/[.02] px-3 py-2 text-[12.5px] leading-relaxed text-muted-foreground">
      <Info aria-hidden className="mt-[3px] size-3.5 shrink-0 text-primary-soft" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

const link = <a href="#" data-goto="settings" className="text-primary-soft underline underline-offset-2">Réglages</a>

/** Ce qui manque au bloc, dit en clair ; rien quand toutes les journées demandées sont là. */
function Missing({ st, info, days, today }: { st: State; info: ReturnType<typeof columns>; days: Span; today: string }) {
  if (st.s === "loading") return <Notice><span role="status">Chargement des journées passées…</span></Notice>
  if (st.s === "none") return <Notice>Les journées passées demandent une base Supabase à jour. Relie la base dans {link} ; si elle est déjà reliée, rejoue schema.sql dans le SQL Editor de Supabase. Seule la journée en cours est montrée.</Notice>
  if (st.s === "error")
    return (
      <Notice>
        Les journées passées n’ont pas pu être lues. Réessaie dans un instant ; si ça dure, vérifie la connexion à la base dans {link}.
        <span className="block text-[11px] text-dusk">Message reçu : <span className="font-mono break-words">{st.msg}</span></span>
      </Notice>
    )
  const asked = days - 1
  const { done, peaks, firstDone, outdated } = info
  if (outdated) return <Notice>Viewers actifs et pic des journées passées : la base n’est pas à jour, rejoue schema.sql dans le SQL Editor de Supabase.{done < asked && <> {done} {plural(done, "journée agrégée", "journées agrégées")} sur les {asked} précédentes.</>}</Notice>
  if (done >= asked && peaks >= done) return null
  return (
    <Notice>
      {done === 0 ? (
        <>Aucune journée passée agrégée pour l’instant : les agrégats se calculent chaque nuit pour la veille. Seule la journée en cours est montrée.</>
      ) : done < asked ? (
        <>
          {done} {plural(done, "journée terminée agrégée", "journées terminées agrégées")} sur les {asked} précédentes, plus aujourd’hui en cours.{" "}
          {days === 7
            ? <>Une journée s’ajoute chaque nuit{firstDone && firstDone > addDays(today, -asked) ? <> ; rien avant le {dayNum(noon(firstDone))}</> : null}.</>
            : <>L’échelle de {days} jours sera complète au plus tôt le {longDay(noon(addDays(today, asked - done))).replace(/^\S+ /, "")}.</>}
        </>
      ) : null}
      {done > 0 && peaks < done && (
        <span className="block">
          Pic de viewers connu pour {peaks === 0 ? "aucune" : peaks} des {done} journées : il ne se calcule que tant que les relevés du jour sont en base, puis une journée par nuit.
        </span>
      )}
    </Notice>
  )
}

export function DayByDay({ today }: { today: TodayData }) {
  const [days, setDays] = useState<Span>(7)
  const [view, setView] = useState<"chart" | "table">("chart")
  const [st, setSt] = useState<State>({ s: "loading" })
  const [uniq, setUniq] = useState<PeriodReach | null>(null)
  // lues à chaque rendu : l'effet repart si l'ancien code remplace ces fonctions (la démo le fait après le premier affichage) ;
  // en production elles ne changent jamais, donc aucun appel de plus
  const fetchHistory = window.networkHistory
  const fetchReach = window.periodReach

  // today.d : après minuit, la veille vient d'être (ou va être) agrégée
  useEffect(() => {
    let live = true
    setSt({ s: "loading" })
    setUniq(null)
    if (!fetchHistory) return setSt({ s: "none" })
    read(fetchHistory, days, today.d).then(
      (h) => live && setSt(h ? { s: "ok", h } : { s: "none" }),
      (e) => live && setSt({ s: "error", msg: String(e?.message ?? e) })
    )
    fetchReach?.(["*"], days).then((p) => live && setUniq(p), () => live && setUniq(null))
    return () => { live = false }
  }, [days, today.d, fetchHistory, fetchReach])

  const info = columns(st.s === "ok" ? st.h : null, today, days)
  const action = (
    <div className="flex flex-wrap items-center justify-end gap-2.5">
      <Segmented value={days} onChange={setDays} label="Durée du jour par jour" options={[[7, "7 jours"], [30, "30 jours"], [90, "90 jours"]]} />
      <Segmented value={view} onChange={setView} label="Affichage du jour par jour" options={[["chart", "Graphique"], ["table", "Tableau"]]} />
    </div>
  )

  return (
    <Section title="Jour par jour" action={action}>
      <Missing st={st} info={info} days={days} today={today.d} />
      {view === "table" ? <Table cols={info.cols} /> : <Chart cols={info.cols} />}
      <p className="mt-2.5 max-w-[92ch] px-0.5 text-xs leading-relaxed text-dusk [&_b]:font-semibold [&_b]:text-muted-foreground">
        <b>Viewers</b> : le plus haut total relevé au même moment sur toutes tes chaînes suivies (un relevé toutes les 2 min) ; quelqu’un qui regarde deux lives compte deux fois.{" "}
        <b>Viewers actifs</b> : personnes distinctes qui ont écrit au moins un message, toutes chaînes ; estimées à ± 2,3 % pour les journées passées (≈), exactes pour aujourd’hui.
        Les deux ne mesurent pas la même chose : ne les divise pas l’un par l’autre. Hachuré : aujourd’hui, pas fini. Ce bloc a sa propre durée, et ne suit ni la période ni le filtre de langue. Les journées passées gardent les chaînes suivies ces jours-là, même retirées depuis.
        {uniq && uniq.days > 1 && (
          <> Sur {uniq.days < days ? `les ${uniq.days} journées terminées disponibles` : `les ${uniq.days} dernières journées terminées`}, <b>≈ {fmt(uniq.net)} viewers actifs uniques</b> au total : une même personne n’y compte qu’une fois, les journées ne s’additionnent pas.</>
        )}
      </p>
    </Section>
  )
}
