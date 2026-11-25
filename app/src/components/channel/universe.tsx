// « Par chaîne » → Son univers : la chaîne au centre, ses voisines autour (plus près = plus de viewers actifs en commun) et, à côté,
// les chaînes juste au-dessus d'elle en taille : le chemin de croissance. Les tailles sont les viewers actifs uniques sur 30 jours
// (rollups, fonction SQL period_reach). Sans elles, le dessin garde les voisines et le classement est remplacé par une phrase.
import { useEffect, useMemo, useState } from "react"
import { ChannelAvatar } from "@/components/channel-avatar"
import { Empty, Section, panel } from "@/components/overview/parts"
import { fmt, pct } from "@/lib/format"
import { bySize, rankOf } from "@/lib/universe"
import { cn } from "@/lib/utils"
import type { ChannelData, PeriodReach } from "@/legacy/bridge"

const MAX_NEAR = 6
const C0 = 180

function System({ ch, near, sizes }: { ch: ChannelData["ch"]; near: ChannelData["also"]; sizes: Map<string, number> | null }) {
  const maxShare = Math.max(...near.map((a) => a.share), 0.0001)
  const mine = sizes?.get(ch.c) ?? null
  const big = Math.max(mine ?? 0, ...near.map((a) => sizes?.get(a.c) ?? 0), 1)
  const r = (n: number | null) => (n && sizes ? 7 + 11 * Math.sqrt(n / big) : 10)
  const nodes = near.map((a, i) => {
    const ang = ((-90 + (i * 360) / near.length) * Math.PI) / 180
    const dist = 64 + (1 - a.share / maxShare) * 70
    return { a, x: C0 + dist * Math.cos(ang), y: C0 + dist * Math.sin(ang), ang, rad: r(sizes?.get(a.c) ?? null) }
  })
  return (
    <svg viewBox="-30 -10 420 390" role="img" aria-label={`${ch.c} au centre, entourée de ${near.map((a) => a.c).join(", ")} : plus une chaîne est proche, plus elles ont de viewers actifs en commun.`} className="mx-auto w-full max-w-[340px]">
      {[64, 104, 134].map((d) => <circle key={d} cx={C0} cy={C0} r={d} fill="none" strokeWidth={1} style={{ stroke: "var(--map-link)", strokeOpacity: 0.1 }} />)}
      {nodes.map(({ a, x, y }) => (
        <line key={a.c} x1={C0} y1={C0} x2={x} y2={y} strokeLinecap="round" strokeWidth={1 + 2.5 * (a.share / maxShare)} style={{ stroke: "var(--map-link)", strokeOpacity: 0.18 + 0.3 * (a.share / maxShare) }} />
      ))}
      <circle cx={C0} cy={C0} r={r(mine) + 6} style={{ fill: ch.color, opacity: 0.14 }} />
      <circle cx={C0} cy={C0} r={r(mine)} style={{ fill: ch.color }} />
      <text x={C0} y={C0 + r(mine) + 20} textAnchor="middle" className="fill-foreground text-[12px] font-semibold">{ch.c}</text>
      {nodes.map(({ a, x, y, ang, rad }) => (
        <g key={a.c}>
          <circle cx={x} cy={y} r={rad + 4} style={{ fill: a.color, opacity: 0.12 }} />
          <circle cx={x} cy={y} r={rad} style={{ fill: a.color }} />
          <text x={x + (rad + 7) * Math.cos(ang)} y={y + (rad + 7) * Math.sin(ang) + 4} textAnchor={Math.cos(ang) > 0.3 ? "start" : Math.cos(ang) < -0.3 ? "end" : "middle"} className="fill-muted-foreground text-[11px]">
            {a.c.length > 13 ? a.c.slice(0, 12) + "…" : a.c}
          </text>
        </g>
      ))}
    </svg>
  )
}

export function Universe({ ch, also, list }: { ch: ChannelData["ch"]; also: ChannelData["also"]; list: ChannelData["list"] }) {
  const [reach, setReach] = useState<PeriodReach | null>(null)
  const key = list.map((x) => x.c).join(",")
  useEffect(() => {
    let live = true
    setReach(null)
    window.periodReach?.(list.map((x) => x.c), 30).then((p) => live && setReach(p), () => live && setReach(null))
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` résume `list`
  }, [key])

  const sized = useMemo(() => bySize(reach, list.map((x) => x.c)), [reach, list])
  const sizes = useMemo(() => (sized.length ? new Map(sized.map((x) => [x.c, x.n])) : null), [sized])
  const near = also.slice(0, MAX_NEAR)
  if (near.length === 0 && !sizes) return null // le bloc « écrivent aussi chez » dit déjà qu'il n'y a rien à montrer

  const rank = rankOf(sized, ch.c)
  const mine = sizes?.get(ch.c) ?? 0
  const above = rank > 0 ? sized.slice(Math.max(0, rank - 3), rank).reverse() : []
  const byC = new Map([...list, ...also].map((x) => [x.c, x]))
  const shareOf = (c: string) => also.find((a) => a.c === c)?.share ?? null

  return (
    <Section
      className="mt-9"
      title="Son univers"
      note="À gauche, les voisines : plus une chaîne est proche, plus elle a de viewers actifs en commun avec celle-ci ; la taille des astres suit les viewers actifs uniques sur 30 jours. À droite, les chaînes suivies juste au-dessus : la distance à franchir."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cn(panel, "px-4 py-4")}>
          {near.length ? <System ch={ch} near={near} sizes={sizes} /> : <Empty>Pas encore de voisines mesurées.</Empty>}
        </div>
        <div className={cn(panel, "px-4 py-3")}>
          <p className="py-1 text-[11px] font-medium text-dusk">Chemin de croissance</p>
          {!sizes || rank < 0 ? (
            <p className="py-3 text-[13px] text-muted-foreground">Le classement par taille apparaît quand des journées sont agrégées dans la base (les agrégats se calculent chaque nuit).</p>
          ) : (
            <>
              <p className="py-2 text-[13.5px]">
                <span className="font-mono font-semibold tabular-nums">n° {rank + 1}</span> sur {sized.length} chaînes suivies, avec ≈ <span className="font-mono tabular-nums">{fmt(mine)}</span> viewers actifs uniques sur 30 jours.
              </p>
              {above.length === 0 ? (
                <p className="border-t border-border py-3 text-[13px] text-muted-foreground">C'est la plus grande des chaînes suivies : personne au-dessus à rattraper.</p>
              ) : (
                <ul className="divide-y divide-border border-t border-border">
                  {above.map((x) => {
                    const w = byC.get(x.c)
                    const sh = shareOf(x.c)
                    return (
                      <li key={x.c} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                        <button type="button" data-open={x.c} className="inline-flex items-center gap-2 text-[13.5px] font-medium hover:text-primary-soft">
                          {w ? <ChannelAvatar {...w} className="pointer-events-none" /> : null}
                          <span className="pointer-events-none">{x.c}</span>
                        </button>
                        <span className="text-right text-xs text-muted-foreground">
                          <span className="font-mono tabular-nums">×{(x.n / mine).toFixed(1).replace(".", ",")}</span> son audience
                          {sh != null ? <> · {pct(sh)} de ses viewers actifs y écrivent aussi</> : <> · aucun recoupement mesuré</>}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </Section>
  )
}
