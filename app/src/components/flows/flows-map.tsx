// Carte des migrations, jour par jour (chantier C, IDEES.md), dans la partie « Qui va où » de l'onglet Audiences.
// Les journées passées viennent de `byDay` (SQL flows_by_day), la journée en cours de `today` (calculée dans legacy.js).
//
// Les chaînes sont posées en colonne (total des passages, arrivées + départs, décroissant). Pour la journée choisie, un arc
// relie A à B : à droite si B est placé plus bas que A, à gauche s'il est plus haut ; la pointe marque l'arrivée. L'épaisseur
// suit le nombre de viewers, sur une échelle commune à toutes les journées (deux jours se comparent d'un coup d'œil). Des
// points avancent sur chaque arc (absents avec la réduction des mouvements). Chaque arc écrit son nombre : rien ne demande de survol.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import { ChannelAvatar } from "@/components/channel-avatar"
import { useWidth } from "@/components/charts/frame"
import { fmt } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { FlowsData, Who } from "@/legacy/bridge"

/** Un passage de A vers B pendant une journée. `raid` : un raid a eu lieu sur ce trajet ce jour-là (on ne sait pas quels passages en viennent). `gap` : délai médian, connu pour la journée en cours seulement. */
export interface DayRoute { a: Who; b: Who; n: number; raid: boolean; gap?: string }
/** Une journée (`d` au format AAAA-MM-JJ, fuseau Europe/Paris). `today` : la journée en cours, encore incomplète. */
export interface FlowDay { d: string; routes: DayRoute[]; today?: boolean }

/**
 * Passe des lignes `byDay` (une par jour et par paire) aux journées de la carte, triées par date.
 * `n` = viewers distincts de la paire ce jour-là ; du SQL, on ne retient qu'un signe : le trajet a eu un raid.
 */
export function daysFromByDay(rows: NonNullable<FlowsData["byDay"]>): FlowDay[] {
  const by = new Map<string, DayRoute[]>()
  for (const r of rows) {
    if (!(r.viewers > 0) || r.a.c === r.b.c) continue
    const list = by.get(r.d)
    const route = { a: r.a, b: r.b, n: r.viewers, raid: r.raid > 0 }
    if (list) list.push(route)
    else by.set(r.d, [route])
  }
  return [...by.entries()].sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)).map(([d, routes]) => ({ d, routes }))
}

/** Ordre des chaînes : somme des passages entrants et sortants sur toutes les journées, du plus grand au plus petit. */
export function mapOrder(days: FlowDay[]): Who[] {
  const tot = new Map<string, { who: Who; t: number }>()
  const add = (w: Who, n: number) => {
    const o = tot.get(w.c)
    if (o) o.t += n
    else tot.set(w.c, { who: w, t: n })
  }
  for (const day of days) for (const r of day.routes) { add(r.a, r.n); add(r.b, r.n) }
  return [...tot.values()].sort((x, y) => y.t - x.t).map((o) => o.who)
}

const ROW = 74 // écart vertical entre deux planètes
const PAD_T = 28
const PAD_B = 38 // place du nom sous la dernière planète
const PLANET = 30
const R = PLANET / 2 + 6 // départ des arcs, juste hors de l'atmosphère
const LABEL_W = 70 // largeur réservée à l'étiquette d'un arc
const STEP_MS = 1400 // lecture automatique : une journée toutes les 1,4 s
const DOT_S = 3 // un point parcourt son arc en 3 s
const MAX_DOTS = 5 // points sur le plus gros trajet ; les autres en proportion

const dayOf = (d: string) => new Date(d + "T12:00:00")
export const longDay = (d: string) => dayOf(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
const shortDay = (d: string) => dayOf(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
const weekday = (d: string) => dayOf(d).toLocaleDateString("fr-FR", { weekday: "short" })
const dayNum = (d: string) => String(dayOf(d).getDate())

const totalOf = (day: FlowDay) => day.routes.reduce((s, r) => s + r.n, 0)

const QUERY = "(prefers-reduced-motion: reduce)"
/** Réduction des mouvements, suivie en direct. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => matchMedia(QUERY).matches)
  useEffect(() => {
    const m = matchMedia(QUERY)
    const on = () => setReduced(m.matches)
    m.addEventListener("change", on)
    return () => m.removeEventListener("change", on)
  }, [])
  return reduced
}

/** Seules les chaînes qui ont un arc ce jour-là sont posées (l’ordre reste celui de `order`),
 *  sans quoi la colonne serait trop haute. `onMove` reçoit une fonction de l'index courant vers le nouveau. */
export function FlowsMap({ days, order, idx, onMove, maxArcs = 12 }: { days: FlowDay[]; order: Who[]; idx: number; onMove: (to: (i: number) => number) => void; maxArcs?: number }) {
  const last = days.length - 1
  const dense = days.length > 16
  const [playing, setPlaying] = useState(false)
  const [box, w] = useWidth()
  const [svg, setSvg] = useState<SVGSVGElement | null>(null)
  const reduced = useReducedMotion()
  const paths = useRef(new Map<string, SVGPathElement>())
  const labels = useRef(new Map<string, SVGGElement>())

  const day = days[Math.min(idx, last)]

  // Lecture automatique : une journée après l'autre, arrêt sur la dernière
  useEffect(() => {
    if (!playing) return
    const id = setTimeout(() => (idx < last ? onMove((i) => i + 1) : setPlaying(false)), STEP_MS)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, idx, last])

  // Rien ne bouge quand la carte n'est pas à l'écran (page cachée ou carte hors de la fenêtre). En changeant d'onglet du
  // tableau de bord, la page entière est démontée.
  useEffect(() => {
    if (!svg) return
    let seen = true
    const apply = () => {
      if (document.hidden) setPlaying(false)
      if (seen && !document.hidden) svg.unpauseAnimations()
      else svg.pauseAnimations()
    }
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; apply() })
    io.observe(svg)
    document.addEventListener("visibilitychange", apply)
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", apply) }
  }, [svg])

  const maxN = useMemo(() => Math.max(1, ...days.flatMap((d) => d.routes.map((r) => r.n))), [days])
  const dayTotals = useMemo(() => days.map(totalOf), [days])
  const maxT = Math.max(1, ...dayTotals)

  const shown = useMemo(() => (day ? day.routes.filter((r) => r.n > 0).sort((x, y) => y.n - x.n).slice(0, maxArcs) : []), [day, maxArcs])

  // Les arcs se dessinent à l'arrivée d'une journée (trait qui avance), puis l'étiquette et les points apparaissent.
  // Avec la réduction des mouvements : rien ne bouge, tout s'affiche d'un coup.
  const drawn = day ? day.d : ""
  useLayoutEffect(() => {
    if (reduced || !w) return
    const easing = "cubic-bezier(.32,.72,0,1)"
    shown.forEach((r, i) => {
      const k = r.a.c + ">" + r.b.c
      paths.current.get(k)?.animate(
        [{ strokeDasharray: "1 1", strokeDashoffset: 1 }, { strokeDasharray: "1 1", strokeDashoffset: 0 }],
        { duration: 650, delay: i * 45, easing, fill: "backwards" },
      )
      labels.current.get(k)?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: i * 45 + 420, fill: "backwards" })
    })
    // une seule fois par journée affichée (pas à chaque changement de largeur ou nouveau relevé)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawn, w > 0])

  if (!day) return null

  const active = new Set(shown.flatMap((r) => [r.a.c, r.b.c]))
  const rows = order.filter((o) => active.has(o.c))
  const N = rows.length
  const pos = new Map(rows.map((o, i) => [o.c, i]))
  const yOf = (i: number) => PAD_T + i * ROW
  const H = N ? PAD_T + (N - 1) * ROW + PAD_B : 120
  const cx = w / 2
  const base = (span: number) => 26 + 56 * span
  const apexMax = 0.75 * base(Math.max(1, N - 1))
  const k = Math.min(1, Math.max(0.35, (w / 2 - R - LABEL_W - 10) / apexMax))
  const title = day.today ? "Aujourd’hui, en cours" : longDay(day.d)

  // fonction de l'index courant : des touches répétées avant le rendu suivant avancent bien d'une journée chacune
  const move = (to: (i: number) => number) => { setPlaying(false); onMove(to) }
  const pick = (i: number) => move(() => i)
  const onKey = (e: KeyboardEvent) => {
    const to = e.key === "ArrowLeft" || e.key === "ArrowDown" ? (i: number) => i - 1 : e.key === "ArrowRight" || e.key === "ArrowUp" ? (i: number) => i + 1 : e.key === "Home" ? () => 0 : e.key === "End" ? () => last : null
    if (!to) return
    e.preventDefault()
    move(to)
  }
  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const b = e.currentTarget.getBoundingClientRect()
    pick(Math.floor(((e.clientX - b.left) / Math.max(1, b.width)) * days.length))
  }
  const iconBtn = "inline-grid size-8 place-items-center rounded-[10px] text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold first-letter:uppercase">{title}</p>
          <p className="mt-0.5 text-xs text-dusk">Viewers actifs qui écrivent, par jour</p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button type="button" className={iconBtn} onClick={() => move((i) => i - 1)} disabled={idx === 0} aria-label="Journée précédente"><ChevronLeft className="size-4" strokeWidth={1.75} /></button>
          <button
            type="button"
            className={iconBtn}
            onClick={() => { if (!playing && idx === last) onMove(() => 0); setPlaying(!playing) }}
            disabled={last === 0}
            aria-label={playing ? "Arrêter la lecture" : "Faire défiler les journées"}
            aria-pressed={playing}
          >
            {playing ? <Pause className="size-4" strokeWidth={1.75} /> : <Play className="size-4" strokeWidth={1.75} />}
          </button>
          <button type="button" className={iconBtn} onClick={() => move((i) => i + 1)} disabled={idx === last} aria-label="Journée suivante"><ChevronRight className="size-4" strokeWidth={1.75} /></button>
        </div>
      </div>

      {/* La carte : SVG pour les arcs, planètes en HTML par-dessus (ChannelAvatar), sur les mêmes coordonnées */}
      <div ref={box} className="relative mt-2" style={{ height: H }}>
        {w > 0 && !N && (
          <p className="flex h-full items-center justify-center px-4 text-center text-[12.5px] text-muted-foreground">
            {day.today
              ? "Aucun passage entre tes chaînes suivies aujourd’hui pour l’instant. La carte se remplit dès qu’un viewer actif écrit chez une chaîne, puis chez une autre."
              : "Aucun passage entre tes chaînes suivies ce jour-là."}
          </p>
        )}
        {w > 0 && N > 0 && (
          <>
            <svg ref={setSvg} width={w} height={H} className="absolute inset-0 block" role="img" aria-label={`Passages entre les chaînes suivies, ${day.today ? "aujourd’hui" : longDay(day.d)} (détail dans la liste à côté)`}>
              {[...shown].reverse().map((r) => {
                const ia = pos.get(r.a.c), ib = pos.get(r.b.c)
                if (ia == null || ib == null || ia === ib) return null
                const side = ib > ia ? 1 : -1
                const span = Math.abs(ib - ia)
                const bend = base(span) * k
                const sx = cx + side * R, sy = yOf(ia) + side * 4
                const tip = cx + side * R, ex = cx + side * (R + 6), ey = yOf(ib) - side * 4
                const d = `M ${sx} ${sy} C ${sx + side * bend} ${sy}, ${ex + side * bend} ${ey}, ${ex} ${ey}`
                const px = sx + side * 0.75 * bend // sommet de l'arc
                const ax = px + side * 8, ay = (sy + ey) / 2
                const sw = 1.5 + 9 * (r.n / maxN)
                const dots = Math.max(1, Math.round((MAX_DOTS * r.n) / maxN))
                const key = r.a.c + ">" + r.b.c
                return (
                  <g key={key}>
                    <path
                      ref={(el) => { if (el) paths.current.set(key, el); else paths.current.delete(key) }}
                      d={d}
                      pathLength={1}
                      fill="none"
                      stroke={r.a.color}
                      strokeOpacity={0.62}
                      strokeWidth={sw}
                      strokeLinecap="round"
                    />
                    <polygon points={`${tip},${ey} ${tip + side * 8},${ey - 4.5} ${tip + side * 8},${ey + 4.5}`} fill={r.a.color} fillOpacity={0.9} />
                    <g ref={(el) => { if (el) labels.current.set(key, el); else labels.current.delete(key) }}>
                      {!reduced && Array.from({ length: dots }, (_, j) => (
                        <circle key={`${dots}-${j}`} className="flow-dot" r={2 + sw * 0.12} style={{ fill: `color-mix(in srgb, ${r.a.color} 70%, var(--foreground))` }}>
                          {/* départ négatif : les points sont déjà répartis le long de l'arc quand ils apparaissent */}
                          <animateMotion path={d} dur={`${DOT_S}s`} begin={`${(-(j * DOT_S) / dots).toFixed(2)}s`} repeatCount="indefinite" />
                        </circle>
                      ))}
                      <g textAnchor={side > 0 ? "start" : "end"} stroke="var(--background)" strokeWidth={3} strokeLinejoin="round" style={{ paintOrder: "stroke" }}>
                        {/* point au sommet de l'arc : rattache l'étiquette à son arc quand des arcs s'emboîtent */}
                        <circle cx={px} cy={ay} r={3.5} fill={r.a.color} strokeWidth={2} />
                        <text x={ax} y={r.raid ? ay - 2 : ay + 4} fontFamily="var(--font-mono)" fontSize={12} fontWeight={600} fill="var(--foreground)" style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(r.n)}</text>
                        {r.raid && <text x={ax} y={ay + 11} fontFamily="var(--font-sans)" fontSize={10.5} fill="var(--primary-soft)">raid</text>}
                      </g>
                    </g>
                  </g>
                )
              })}
            </svg>
            {rows.map((o, i) => (
              <div key={o.c} className="absolute flex flex-col items-center" style={{ left: cx, top: yOf(i) - PLANET / 2, transform: "translateX(-50%)" }}>
                <ChannelAvatar {...o} size={PLANET} />
                <span className="mt-1.5 rounded-full bg-background/70 px-1.5 text-[11.5px] leading-4 whitespace-nowrap text-muted-foreground">{o.c}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Curseur de date : une colonne par journée (total des passages), la journée en cours hachurée. */}
      <div
        role="slider"
        tabIndex={0}
        aria-label="Journée affichée"
        aria-valuemin={0}
        aria-valuemax={last}
        aria-valuenow={idx}
        aria-valuetext={day.today ? "aujourd’hui, en cours" : longDay(day.d)}
        onKeyDown={onKey}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); fromPointer(e) }}
        onPointerMove={(e) => { if (e.buttons & 1) fromPointer(e) }}
        className={cn("mt-3.5 grid cursor-pointer touch-none rounded-[10px] outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/50", dense ? "gap-px" : "gap-1")}
        // au moins 7 emplacements : avec un ou deux jours, les colonnes ne s'étirent pas sur toute la largeur
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, ${days.length < 7 ? "84px" : "1fr"}))`, justifyContent: "center" }}
      >
        {days.map((dd, i) => {
          const tt = dayTotals[i]
          return (
            <div key={dd.d} className={cn("flex min-w-0 flex-col items-center gap-1 rounded-[8px] border pt-1.5 pb-1 transition-colors", dense ? "px-0" : "px-0.5", i === idx ? "border-primary/60 bg-white/[0.06]" : "border-transparent hover:bg-white/[0.03]")}>
              {!dense && <span className="font-mono text-[10.5px] text-foreground tabular-nums">{fmt(tt)}</span>}
              <span className="flex h-11 w-full max-w-5 flex-col-reverse overflow-hidden rounded-[3px] bg-white/[0.04]">
                <span
                  className={dd.today ? "bg-[repeating-linear-gradient(135deg,var(--primary)_0_3px,color-mix(in_srgb,var(--primary)_35%,transparent)_3px_6px)]" : "bg-primary"}
                  style={{ height: `${(tt / maxT) * 100}%` }}
                />
              </span>
              {!dense && (
                <span className="text-center text-[10.5px] leading-tight text-dusk">
                  {dd.today ? "auj." : weekday(dd.d)}<br /><span className="text-muted-foreground">{dd.today ? "en cours" : dayNum(dd.d)}</span>
                </span>
              )}
            </div>
          )
        })}
      </div>
      {/* Au-delà de 16 journées, les colonnes sont trop étroites pour leurs chiffres : on garde les deux bornes et le jour choisi (en tête). */}
      {dense && <p className="mt-1 flex justify-between px-0.5 text-[10.5px] text-dusk"><span>{shortDay(days[0].d)}</span><span>{days[last].today ? "aujourd’hui, en cours" : shortDay(days[last].d)}</span></p>}
    </div>
  )
}
