// Graphique en courbes (messages par minute, viewers, ambiance, types de messages).
// Reprend le lineChart() de l'ancien code : périodes sans écoute grisées, planètes en bout de courbe (4 séries au plus),
// réticule et infobulle ; en plus : navigation au clavier (flèches) et vue tableau.
import { useMemo, useState, type KeyboardEvent, type PointerEvent } from "react"
import { ChannelAvatar } from "@/components/channel-avatar"
import { Empty } from "@/components/overview/parts"
import { fmt, fmt1 } from "@/lib/format"
import { dayKey, dayLbl, dayNum, hhmm, when } from "@/lib/time"
import { ChartFrame, niceMax, tableCls, useWidth } from "./frame"
import type { LineSpec } from "@/legacy/bridge"

const DAY = 86400000
const compact = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 })
const ink = { dim: "#868693", mut: "#9a9aa8", grid: "rgba(255,255,255,.06)", gap: "rgba(154,154,168,.08)", surface: "#121217" }

export function LineChart({ spec, bare, label }: { spec: LineSpec; bare?: boolean; label: string }) {
  const [box, width] = useWidth()
  const W = Math.max(width, 300)
  const [hover, setHover] = useState<number | null>(null) // index dans xs
  const [byKey, setByKey] = useState(false) // survol venu du clavier : seul cas où l'infobulle est annoncée
  const { series, gaps, height: H } = spec
  const chanS = series.length > 0 && series.every((s) => s.c)
  const maxName = Math.min(14, Math.max(0, ...series.map((s) => s.name.length)))
  // sur un écran étroit, pas de libellés en bout de courbe : la légende suffit et la courbe garde sa largeur
  const endLabels = series.length <= 4 && W >= 480
  const L = 46, T = 8, B = 22, R = endLabels ? (chanS ? 100 : Math.max(48, 16 + maxName * 6.4)) : 12

  const geo = useMemo(() => {
    const all = series.flatMap((s) => s.pts.filter((p) => p[1] != null)) as [number, number][]
    if (!all.length) return null
    let x0 = Math.min(...all.map((p) => p[0])), x1 = Math.max(...all.map((p) => p[0]))
    // l'axe s'étend aux périodes sans écoute du début ou de la fin, pour qu'elles se voient
    if (gaps.length) { x0 = Math.min(x0, gaps[0][0]); x1 = Math.max(x1, gaps[gaps.length - 1][1]) }
    x1 = Math.max(x1, x0 + 60000)
    const y1 = niceMax(Math.max(...all.map((p) => p[1]), spec.yFloor))
    const xs = [...new Set(all.map((p) => p[0]))].sort((a, b) => a - b)
    return { x0, x1, y1, xs }
  }, [series, gaps, spec.yFloor])

  if (!geo) return <Empty>Pas encore de données sur cette période.</Empty>
  const { x0, x1, y1, xs } = geo
  const X = (t: number) => L + ((t - x0) / (x1 - x0)) * (W - L - R)
  const Y = (v: number) => T + (1 - v / y1) * (H - T - B)
  const num = (v: number) => (Number.isInteger(v) ? fmt(v) : fmt1(v))
  const tick = (v: number) => (spec.pct ? num(v) + " %" : y1 >= 10000 ? compact.format(v) : num(v))
  const val = (v: number) => (spec.pct ? fmt1(v) + " %" : (v < 10 ? fmt1(v) : fmt(v)) + spec.unit)
  const span = x1 - x0, multiDay = dayKey(x0) !== dayKey(x1)
  // axe étroit (téléphone) : trois repères au lieu de cinq et des dates courtes (« 19/11 »), sinon les libellés se chevauchent
  const narrow = W < 480
  const xLbl = (t: number) => (multiDay && span > 2 * DAY ? (narrow ? dayNum(t) : dayLbl(t)) : hhmm(t))
  const xTicks = narrow ? [0, 2, 4] : [0, 1, 2, 3, 4]

  // tracés : un chemin par série, coupé aux trous ; un point isolé devient un rond
  const paths = series.map((s) => {
    let d = "", pen = false, seg: [number, number][] = []
    const dots: [number, number][] = []
    const close = () => { if (seg.length === 1) dots.push(seg[0]); seg = [] }
    for (const [t, v] of s.pts) {
      if (v == null) { pen = false; close(); continue }
      const x = X(t), y = Y(v)
      d += (pen ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1)
      pen = true; seg.push([x, y])
    }
    close()
    return { s, d, dots }
  })

  // libellés en bout de courbe (4 séries au plus), écartés s'ils se chevauchent, reliés à leur courbe par un trait fin
  const ends = endLabels
    ? series.map((s) => { const p = [...s.pts].reverse().find((p) => p[1] != null)!; return { s, x: X(p[0]), yv: Y(p[1]!), y: Y(p[1]!) } }).sort((a, b) => a.y - b.y)
    : []
  const minGap = chanS ? 20 : 13
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < minGap) ends[i].y = ends[i - 1].y + minGap

  // survol : le réticule s'aligne sur la position de donnée la plus proche
  const nearestIdx = (t: number) => {
    let lo = 0, hi = xs.length - 1
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] < t) lo = m; else hi = m }
    return Math.abs(xs[lo] - t) <= Math.abs(xs[hi] - t) ? lo : hi
  }
  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
    const px = ((e.clientX - r.left) * W) / r.width
    setHover(nearestIdx(x0 + ((px - L) / (W - L - R)) * (x1 - x0)))
  }
  const onKey = (e: KeyboardEvent) => {
    setByKey(true)
    const n = xs.length - 1, step = e.shiftKey ? 10 : 1
    if (e.key === "ArrowRight") setHover((h) => Math.min(n, (h ?? n) + (h == null ? 0 : step)))
    else if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n) - (h == null ? 0 : step)))
    else if (e.key === "Home") setHover(0)
    else if (e.key === "End") setHover(n)
    else if (e.key === "Escape") setHover(null)
    else return
    e.preventDefault()
  }
  const ht = hover != null ? xs[hover] : null
  const rows = ht == null ? [] : series
    .map((s) => {
      let best: [number, number] | null = null, bd = Infinity
      for (const p of s.pts) { if (p[1] == null) continue; const dd = Math.abs(p[0] - ht); if (dd < bd) { bd = dd; best = p as [number, number] } }
      return best && bd < span / 40 ? { s, v: best[1] } : null
    })
    .filter(Boolean)
    .sort((a, b) => b!.v - a!.v) as { s: (typeof series)[number]; v: number }[]
  const gapAt = ht == null ? null : gaps.find(([a, b]) => ht >= a && ht <= b)
  const hx = ht != null ? X(ht) : 0

  const legend = (series.length >= 2 || gaps.length > 0) && (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {series.length >= 2 && series.map((s) => (
        <span key={s.name} className="inline-flex items-center gap-1.5">
          {s.c ? <ChannelAvatar c={s.c} color={s.color} size={16} /> : <i className="h-0.5 w-3.5 rounded-full" style={{ background: s.color }} />}
          {s.name}
        </span>
      ))}
      {gaps.length > 0 && (
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2.5 rounded-[3px] border border-input bg-[repeating-linear-gradient(135deg,var(--white-12)_0_2px,transparent_2px_4px)]" />
          pas d'écoute (PC éteint ou en veille, chat coupé)
        </span>
      )}
    </div>
  )

  const table = <LineTable spec={spec} val={val} />

  return (
    <ChartFrame legend={legend} table={table} bare={bare} label={label}>
      <div
        ref={box}
        tabIndex={0}
        role="group"
        aria-label={`${label}. Flèches gauche et droite pour parcourir les valeurs.`}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
        className="relative rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="block overflow-visible font-mono text-[10.5px]" aria-hidden>
          {gaps.map(([a, b], i) => {
            const xa = Math.max(X(a), L), xb = Math.min(X(b), W - R)
            return xb > xa ? <rect key={i} x={xa} y={T} width={Math.max(xb - xa, 1.5)} height={H - T - B} fill={ink.gap} /> : null
          })}
          {[0, 1, 2, 3, 4].map((i) => {
            const v = (y1 * i) / 4, y = Y(v)
            return (
              <g key={i}>
                <line x1={L} x2={W - R} y1={y} y2={y} stroke={ink.grid} />
                <text x={L - 6} y={y + 4} textAnchor="end" fill={ink.dim}>{tick(v)}</text>
              </g>
            )
          })}
          {xTicks.map((i) => (
            <text key={i} x={X(x0 + (span * i) / 4)} y={H - 5} textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"} fill={ink.dim}>{xLbl(x0 + (span * i) / 4)}</text>
          ))}
          {paths.map(({ s, d, dots }) => (
            <g key={s.name}>
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={4} fill={s.color} stroke={ink.surface} strokeWidth={2} />)}
            </g>
          ))}
          {ends.map((e, i) => {
            const nm = e.s.name.length > 14 ? e.s.name.slice(0, 13) + "…" : e.s.name
            if (!chanS) return (
              <g key={i}>
                {Math.abs(e.y - e.yv) > 2 && <line x1={e.x} y1={e.yv} x2={W - R + 3} y2={e.y} stroke={e.s.color} strokeOpacity={0.45} />}
                <text x={W - R + 6} y={e.y + 4} fill={ink.mut}>{nm}</text>
              </g>
            )
            // planète de la chaîne (16 px, comme les légendes : sans initiale ni anneau), posée dans un foreignObject
            const cx = W - R + 15, cy = e.y
            return (
              <g key={i}>
                <line x1={e.x} y1={e.yv} x2={cx - 10} y2={cy} stroke={e.s.color} strokeOpacity={0.35} />
                <foreignObject x={cx - 8} y={cy - 8} width={16} height={16} className="overflow-visible">
                  <ChannelAvatar c={e.s.c} color={e.s.color} size={16} />
                </foreignObject>
                <text x={cx + 15} y={cy + 4} fill={ink.mut}>{nm}</text>
              </g>
            )
          })}
          {ht != null && (
            <g>
              <line x1={hx} x2={hx} y1={T} y2={H - B} stroke="rgba(255,255,255,.35)" />
              {rows.map((r) => <circle key={r.s.name} cx={hx} cy={Y(r.v)} r={4} fill={r.s.color} stroke={ink.surface} strokeWidth={2} />)}
            </g>
          )}
          <rect x={L} y={0} width={W - L - R} height={H} fill="transparent" onPointerMove={(e) => { setByKey(false); onMove(e) }} onPointerLeave={() => setHover(null)} style={{ cursor: "crosshair" }} />
        </svg>
        {ht != null && (rows.length > 0 || gapAt) && (
          <div
            role={byKey ? "status" : undefined}
            aria-hidden={byKey ? undefined : true}
            className="pointer-events-none absolute top-1 z-10 min-w-40 max-w-64 rounded-xl border border-input bg-dome-crest/95 px-3 py-2 text-xs shadow-tooltip backdrop-blur-md"
            style={hx > W * 0.6 ? { right: W - hx + 12 } : { left: hx + 12 }}
          >
            <div className="mb-1 font-mono text-[11px] text-dusk">{when(ht)}</div>
            {gapAt && <div className="mb-1 text-muted-foreground">Pas d'écoute · {hhmm(gapAt[0])} → {hhmm(gapAt[1])}</div>}
            {rows.map((r) => (
              <div key={r.s.name} className="flex items-center gap-2 py-px">
                <i className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: r.s.color }} />
                <b className="font-mono font-semibold text-foreground tabular-nums">{val(r.v)}</b>
                <span className="truncate text-muted-foreground">{r.s.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ChartFrame>
  )
}

/** Vue tableau : les séries regroupées en 150 tranches au plus (moyenne de chaque tranche). */
function LineTable({ spec, val }: { spec: LineSpec; val: (v: number) => string }) {
  const rows = useMemo(() => {
    const all = spec.series.flatMap((s) => s.pts.filter((p) => p[1] != null).map((p) => p[0]))
    if (!all.length) return []
    const t0 = Math.min(...all), t1 = Math.max(...all)
    const steps = [600000, 1800000, 3600000, 3 * 3600000, 6 * 3600000, DAY, 7 * DAY]
    const step = steps.find((s) => (t1 - t0) / s <= 150) ?? 7 * DAY
    const map = new Map<number, (number | null)[]>()
    spec.series.forEach((s, i) => {
      const acc = new Map<number, [number, number]>()
      for (const [t, v] of s.pts) { if (v == null) continue; const b = Math.floor(t / step) * step; const a = acc.get(b) ?? [0, 0]; a[0] += v; a[1]++; acc.set(b, a) }
      for (const [b, [sum, n]] of acc) { const r = map.get(b) ?? spec.series.map(() => null); r[i] = sum / n; map.set(b, r) }
    })
    return [...map].sort((a, b) => b[0] - a[0])
  }, [spec])
  return (
    <table className={tableCls}>
      <thead><tr><th>Quand</th>{spec.series.map((s) => <th key={s.name}>{s.name}</th>)}</tr></thead>
      <tbody>{rows.map(([t, vs]) => <tr key={t}><td>{when(t)}</td>{vs.map((v, i) => <td key={i}>{v == null ? "—" : val(v)}</td>)}</tr>)}</tbody>
    </table>
  )
}
