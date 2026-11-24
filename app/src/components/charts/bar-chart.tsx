// Diagramme en barres (activité selon l'heure de la journée).
// Barres de 24 px au plus, haut arrondi (4 px) et pied droit sur la ligne de base ; chaque barre est sa propre zone de survol.
import { useState, type KeyboardEvent } from "react"
import { Empty } from "@/components/overview/parts"
import { fmt } from "@/lib/format"
import { ChartFrame, niceMax, tableCls, useWidth } from "./frame"
import type { BarSpec } from "@/legacy/bridge"

const compact = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 })

export function BarChart({ spec, label }: { spec: BarSpec; label: string }) {
  const [box, width] = useWidth()
  const [hover, setHover] = useState<number | null>(null)
  const [byKey, setByKey] = useState(false) // survol venu du clavier : seul cas où l'infobulle est annoncée
  const { items, color, unit } = spec
  if (!items.some((i) => i.v > 0)) return <Empty>Pas encore de données sur cette période.</Empty>
  const W = Math.max(width, 300), H = 150, L = 40, R = 6, T = 8, B = 20, n = items.length
  const slot = (W - L - R) / n, bw = Math.max(Math.min(24, slot - 2), 1)
  const y1 = niceMax(Math.max(...items.map((i) => i.v)))
  const Y = (v: number) => T + (1 - v / y1) * (H - T - B)
  const tick = (v: number) => (y1 >= 10000 ? compact.format(v) : fmt(v))
  const onKey = (e: KeyboardEvent) => {
    setByKey(true)
    if (e.key === "ArrowRight") setHover((h) => (h == null ? 0 : Math.min(n - 1, h + 1)))
    else if (e.key === "ArrowLeft") setHover((h) => (h == null ? n - 1 : Math.max(0, h - 1)))
    else if (e.key === "Escape") setHover(null)
    else return
    e.preventDefault()
  }
  const hi = hover != null ? items[hover] : null
  const hx = hover != null ? L + hover * slot + slot / 2 : 0
  const table = (
    <table className={tableCls}>
      <thead><tr><th>Heure</th><th>{unit.trim() || "Valeur"}</th></tr></thead>
      <tbody>{items.map((it) => <tr key={it.k}><td>{it.lbl}</td><td>{fmt(it.v)}</td></tr>)}</tbody>
    </table>
  )
  return (
    <ChartFrame table={table} label={label}>
      <div
        ref={box}
        tabIndex={0}
        role="group"
        aria-label={`${label}. Flèches gauche et droite pour parcourir les barres.`}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
        className="relative rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="block font-mono text-[10.5px]" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => {
            const v = (y1 * i) / 4, y = Y(v)
            return (
              <g key={i}>
                <line x1={L} x2={W - R} y1={y} y2={y} stroke="rgba(255,255,255,.06)" />
                <text x={L - 6} y={y + 4} textAnchor="end" fill="#868693">{tick(v)}</text>
              </g>
            )
          })}
          {items.map((it, i) => {
            const x = L + i * slot + (slot - bw) / 2, y = Y(it.v), h = H - B - y, r = Math.min(4, h, bw / 2)
            return (
              <g key={it.k}>
                {h > 0 && (
                  <path
                    d={`M${x},${H - B}V${y + r}q0,-${r} ${r},-${r}h${bw - 2 * r}q${r},0 ${r},${r}V${H - B}Z`}
                    fill={color}
                    style={{ filter: hover === i ? "brightness(1.25)" : undefined, opacity: hover != null && hover !== i ? 0.7 : 1, transition: "opacity .15s" }}
                  />
                )}
                {(n <= 24 ? i % 3 === 0 : i % Math.ceil(n / 8) === 0) && (
                  <text x={L + i * slot + slot / 2} y={H - 5} textAnchor="middle" fill="#868693">{it.k}</text>
                )}
                <rect x={L + i * slot} y={T} width={slot} height={H - T} fill="transparent" onPointerEnter={() => { setByKey(false); setHover(i) }} onPointerLeave={() => setHover(null)} />
              </g>
            )
          })}
        </svg>
        {hi && (
          <div
            role={byKey ? "status" : undefined}
            aria-hidden={byKey ? undefined : true}
            className="pointer-events-none absolute top-1 z-10 rounded-xl border border-input bg-dome-crest/95 px-3 py-2 text-xs whitespace-nowrap shadow-tooltip backdrop-blur-md"
            style={hx > W * 0.6 ? { right: W - hx + 14 } : { left: hx + 14 }}
          >
            <div className="mb-0.5 font-mono text-[11px] text-dusk">{hi.lbl}</div>
            <b className="font-mono font-semibold tabular-nums">{fmt(hi.v)}</b> <span className="text-muted-foreground">{unit.trim()}</span>
          </div>
        )}
      </div>
    </ChartFrame>
  )
}
