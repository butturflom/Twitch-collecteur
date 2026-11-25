// « Par chaîne » → Historique : l'évolution jour par jour d'une chaîne sur 30 ou 90 jours, lue dans les rollups quotidiens
// (fonction SQL channel_history, voir schema.sql). Les présences brutes ne gardent qu'un jour : seuls ces agrégats remontent plus loin.
import { useEffect, useState } from "react"
import { ChannelAvatar } from "@/components/channel-avatar"
import { LineChart } from "@/components/charts/line-chart"
import { Empty, MeterList, Section, panel } from "@/components/overview/parts"
import { Two } from "@/components/shared/blocks"
import { fmt } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ChannelHistory, HistoryRoute, LineSpec, PeriodReach } from "@/legacy/bridge"

type State = { s: "loading" } | { s: "none" } | { s: "error"; msg: string } | { s: "ok"; h: ChannelHistory }

const at = (d: string) => Date.parse(d + "T12:00:00") // midi du jour (heure locale) : le point tombe au milieu de sa journée

function spec(h: ChannelHistory, series: { name: string; color: string; key: "peak" | "avg" | "chatters" | "msgs" }[], unit: string): LineSpec {
  return {
    series: series.map((x) => ({ name: x.name, c: "", color: x.color, img: "", pts: h.days.map((d) => [at(d.d), d[x.key]] as [number, number]) })),
    unit, pct: false, yFloor: 0, gaps: [], height: 190,
  }
}

function Routes({ rows, note }: { rows: HistoryRoute[]; note: string }) {
  if (!rows.length) return <Empty>{note}</Empty>
  return (
    <div className={cn(panel, "px-4 py-2")}>
      <MeterList
        rows={rows.map((r) => ({
          key: r.c, v: r.n, color: r.color,
          right: <>{fmt(r.n)}{r.raid ? <span className="text-dusk"> · dont raids ≤ {fmt(r.raid)}</span> : null}</>,
          label: <button type="button" data-open={r.c} className="inline-flex items-center gap-2 hover:text-primary-soft"><ChannelAvatar {...r} className="pointer-events-none" /><span className="pointer-events-none">{r.c}</span></button>,
        }))}
      />
    </div>
  )
}

export function History({ ch, color }: { ch: string; color: string }) {
  const [days, setDays] = useState<30 | 90>(30)
  const [st, setSt] = useState<State>({ s: "loading" })
  const [uniq, setUniq] = useState<PeriodReach | null>(null) // viewers uniques sur la période (esquisses HyperLogLog)

  useEffect(() => {
    let live = true
    setUniq(null)
    window.periodReach?.([ch], days).then((p) => live && setUniq(p), () => live && setUniq(null))
    return () => { live = false }
  }, [ch, days])

  useEffect(() => {
    let live = true
    setSt({ s: "loading" })
    const f = window.channelHistory
    if (!f) return setSt({ s: "none" })
    f(ch, days).then(
      (h) => live && setSt(h ? { s: "ok", h } : { s: "none" }),
      (e) => live && setSt({ s: "error", msg: String(e?.message ?? e) })
    )
    return () => { live = false }
  }, [ch, days])

  const toggle = (
    <div className="flex items-center gap-1 rounded-lg bg-card p-1 shadow-sm" role="group" aria-label="Durée de l'historique">
      {([30, 90] as const).map((n) => (
        <button
          key={n} type="button" aria-pressed={days === n} onClick={() => setDays(n)}
          className={cn("px-3 py-1 text-xs font-medium rounded-md transition-colors", days === n ? "bg-accent text-foreground shadow" : "text-muted-foreground hover:text-foreground")}
        >
          {n} jours
        </button>
      ))}
    </div>
  )

  return (
    <div className="mt-9">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-[15px] font-semibold tracking-[-0.015em]">Historique</h2>
        {toggle}
      </div>

      {st.s === "loading" && <Empty>Chargement de l'historique…</Empty>}
      {st.s === "none" && <Empty>L'historique demande la base Supabase à jour (Réglages → Source des données, puis schema.sql à rejouer dans le SQL Editor).</Empty>}
      {st.s === "error" && <Empty>L'historique n'a pas pu être lu : {st.msg}</Empty>}
      {st.s === "ok" && st.h.days.length === 0 && <Empty>Aucune journée agrégée pour cette chaîne. Les agrégats se calculent chaque nuit pour la veille.</Empty>}
      {st.s === "ok" && st.h.days.length > 0 && (
        <>
          {st.h.days.length < 2 && (
            <p className="mb-3 text-xs text-dusk">{st.h.days.length} seule journée agrégée pour l'instant : les courbes se dessineront au fil des nuits.</p>
          )}
          {uniq && uniq.days > 0 && (
            <p className="mb-1 text-sm text-muted-foreground">
              <span className="font-mono text-base font-semibold tabular-nums text-foreground">≈ {fmt(uniq.net)}</span> viewers actifs uniques sur {uniq.days} jour{uniq.days > 1 ? "s" : ""} complet{uniq.days > 1 ? "s" : ""}
              <span className="text-dusk"> · estimation à ± 2,3 %, une même personne n'est comptée qu'une fois</span>
            </p>
          )}
          <Two>
            <Section title="Viewers (pic et moyenne par jour)" note="Relevés de l'API Twitch pendant les lives.">
              <LineChart spec={spec(st.h, [{ name: "Pic", color, key: "peak" }, { name: "Moyenne", color: "#9a9aa8", key: "avg" }], "")} label="Viewers par jour" />
            </Section>
            <Section title="Viewers actifs par jour" note="Personnes différentes qui ont écrit au moins un message ce jour-là.">
              <LineChart spec={spec(st.h, [{ name: "Viewers actifs", color, key: "chatters" }], "")} label="Viewers actifs par jour" />
            </Section>
          </Two>
          <Two>
            <Section title="Où vont ses viewers" note="Total des passages sur la période. Une même personne revenue plusieurs jours compte plusieurs fois.">
              <Routes rows={st.h.out} note="Aucun départ vers une autre chaîne suivie." />
            </Section>
            <Section title="D'où ils viennent" note="« dont raids » est une borne haute : on ne sait pas dire quels passages viennent d'un raid.">
              <Routes rows={st.h.in} note="Aucune arrivée depuis une autre chaîne suivie." />
            </Section>
          </Two>
        </>
      )}
    </div>
  )
}
