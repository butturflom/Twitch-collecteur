// « Par chaîne » → Historique : l'évolution jour par jour d'une chaîne sur 30 ou 90 jours, lue dans les rollups quotidiens
// (fonction SQL channel_history, voir schema.sql). Les présences brutes ne gardent qu'un jour : seuls ces agrégats remontent plus loin.
import { useEffect, useState } from "react"
import { ChannelAvatar } from "@/components/channel-avatar"
import { LineChart } from "@/components/charts/line-chart"
import { Empty, MeterList, Section, panel } from "@/components/overview/parts"
import { Two } from "@/components/shared/blocks"
import { Segmented } from "@/components/shared/segmented"
import { Sticky } from "./sticky"
import { fmt } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ChannelHistory, HistoryDay, HistoryRoute, LineSpec, PeriodReach } from "@/legacy/bridge"

type State = { s: "loading" } | { s: "none" } | { s: "error"; msg: string } | { s: "ok"; h: ChannelHistory }

const at = (d: string) => Date.parse(d + "T12:00:00") // midi du jour (heure locale) : le point tombe au milieu de sa journée

function spec(h: ChannelHistory, series: { name: string; color: string; key: "peak" | "avg" | "chatters" | "msgs" }[], unit: string): LineSpec {
  return {
    series: series.map((x) => ({ name: x.name, c: "", color: x.color, pts: h.days.map((d) => [at(d.d), d[x.key]] as [number, number]) })),
    unit, pct: false, yFloor: 0, gaps: [], height: 190,
  }
}

/** Une seule journée complète : une droite entre deux points du même jour ressemblerait à une tendance. On montre un repère par série. */
function OneDay({ day, series }: { day: HistoryDay; series: { name: string; color: string; key: "peak" | "avg" | "chatters" }[] }) {
  const date = new Date(at(day.d)).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
  return (
    <div className={cn(panel, "px-4 py-3")}>
      <p className="mb-2 text-xs text-dusk">Une seule journée complète ({date}) : pas de courbe, il faut au moins deux journées pour voir une évolution.</p>
      <ul className="divide-y divide-border">
        {series.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-4 py-2.5 text-[13.5px]">
            <span className="inline-flex items-center gap-2.5"><i className="size-2.5 rounded-full" style={{ background: s.color }} />{s.name}</span>
            <span className="font-mono font-semibold tabular-nums">{fmt(day[s.key])}</span>
          </li>
        ))}
      </ul>
    </div>
  )
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

export function History({ ch, color, chans }: { ch: string; color: string; chans?: string[] }) {
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

  const single = st.s === "ok" && st.h.days.length === 1 // moins de 2 journées complètes : des repères, pas de courbe (0 journée a son propre message)
  const toggle =<Segmented value={days} onChange={setDays} label="Durée de l'historique" options={[[30, "30 jours"], [90, "90 jours"]]} />

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
          {single && (
            <p className="mb-3 text-xs text-dusk">Une seule journée complète pour l'instant : les courbes se dessineront au fil des nuits.</p>
          )}
          {uniq && uniq.days > 0 && (
            <p className="mb-1 text-sm text-muted-foreground">
              <span className="font-mono text-base font-semibold tabular-nums text-foreground">≈ {fmt(uniq.net)}</span> viewers actifs uniques sur {uniq.days} jour{uniq.days > 1 ? "s" : ""} complet{uniq.days > 1 ? "s" : ""}
              <span className="text-dusk"> · estimation à ± 2,3 %, une même personne n'est comptée qu'une fois</span>
            </p>
          )}
          <Sticky ch={ch} days={days} chans={chans} />
          <Two>
            <Section title="Viewers (pic et moyenne par jour)" note="Relevés de l'API Twitch pendant les lives.">
              {single ? <OneDay day={st.h.days[0]} series={[{ name: "Pic", color, key: "peak" }, { name: "Moyenne", color: "#9a9aa8", key: "avg" }]} />
                : <LineChart spec={spec(st.h, [{ name: "Pic", color, key: "peak" }, { name: "Moyenne", color: "#9a9aa8", key: "avg" }], "")} label="Viewers par jour" />}
            </Section>
            <Section title="Viewers actifs par jour" note="Personnes différentes qui ont écrit au moins un message ce jour-là.">
              {single ? <OneDay day={st.h.days[0]} series={[{ name: "Viewers actifs", color, key: "chatters" }]} />
                : <LineChart spec={spec(st.h, [{ name: "Viewers actifs", color, key: "chatters" }], "")} label="Viewers actifs par jour" />}
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
