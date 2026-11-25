// Vue d'ensemble → Historique du réseau : l'activité de toutes les chaînes suivies sur 30 ou 90 jours, lue dans les rollups
// quotidiens (fonction SQL network_history) ; les viewers uniques du réseau viennent des esquisses HyperLogLog (period_reach, chaîne « * »).
import { useEffect, useState } from "react"
import { ChannelAvatar } from "@/components/channel-avatar"
import { LineChart } from "@/components/charts/line-chart"
import { Empty, MeterList, Section, panel } from "@/components/overview/parts"
import { Two } from "@/components/shared/blocks"
import { fmt } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { LineSpec, NetworkHistory, PeriodReach } from "@/legacy/bridge"

type State = { s: "loading" } | { s: "none" } | { s: "error"; msg: string } | { s: "ok"; h: NetworkHistory }

const at = (d: string) => Date.parse(d + "T12:00:00") // midi du jour : le point tombe au milieu de sa journée
const MAIN = "#8b7cff" // violet nébuleuse, première série des graphiques (DESIGN.md)

function spec(h: NetworkHistory, name: string, key: "msgs" | "avg"): LineSpec {
  return { series: [{ name, c: "", color: MAIN, img: "", pts: h.days.map((d) => [at(d.d), d[key]] as [number, number]) }], unit: "", pct: false, yFloor: 0, gaps: [], height: 190 }
}

export function NetworkHistoryBlock() {
  const [days, setDays] = useState<30 | 90>(30)
  const [st, setSt] = useState<State>({ s: "loading" })
  const [uniq, setUniq] = useState<PeriodReach | null>(null)
  // lue à chaque rendu : l'effet repart si l'ancien code remplace ces fonctions (la démo le fait après le premier affichage) ;
  // en production elles ne changent jamais, donc aucun appel de plus
  const fetchHistory = window.networkHistory
  const fetchReach = window.periodReach

  useEffect(() => {
    let live = true
    setSt({ s: "loading" })
    setUniq(null)
    if (!fetchHistory) return setSt({ s: "none" })
    fetchHistory(days).then(
      (h) => live && setSt(h ? { s: "ok", h } : { s: "none" }),
      (e) => live && setSt({ s: "error", msg: String(e?.message ?? e) })
    )
    fetchReach?.(["*"], days).then((p) => live && setUniq(p), () => live && setUniq(null))
    return () => { live = false }
  }, [days, fetchHistory, fetchReach])

  const toggle = (
    <div className="flex items-center gap-1 rounded-lg bg-card p-1 shadow-sm" role="group" aria-label="Durée de l'historique du réseau">
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
        <h2 className="text-[15px] font-semibold tracking-[-0.015em]">Historique du réseau</h2>
        {toggle}
      </div>

      {st.s === "loading" && <Empty>Chargement de l'historique…</Empty>}
      {st.s === "none" && <Empty>L'historique demande la base Supabase à jour (Réglages → Source des données, puis schema.sql à rejouer dans le SQL Editor).</Empty>}
      {st.s === "error" && <Empty>L'historique n'a pas pu être lu : {st.msg}</Empty>}
      {st.s === "ok" && st.h.days.length === 0 && <Empty>Aucune journée agrégée pour l'instant. Les agrégats se calculent chaque nuit pour la veille.</Empty>}
      {st.s === "ok" && st.h.days.length > 0 && (
        <>
          {st.h.days.length < 2 && (
            <p className="mb-3 text-xs text-dusk">{st.h.days.length} seule journée agrégée pour l'instant : les courbes se dessineront au fil des nuits.</p>
          )}
          {uniq && uniq.days > 0 && (
            <p className="mb-1 text-sm text-muted-foreground">
              <span className="font-mono text-base font-semibold tabular-nums text-foreground">≈ {fmt(uniq.net)}</span> viewers actifs uniques sur le réseau, sur {uniq.days} jour{uniq.days > 1 ? "s" : ""} complet{uniq.days > 1 ? "s" : ""}
              <span className="text-dusk"> · estimation à ± 2,3 %, une même personne n'est comptée qu'une fois</span>
            </p>
          )}
          <Two>
            <Section title="Messages par jour" note="Total des messages de toutes les chaînes suivies.">
              <LineChart spec={spec(st.h, "Messages", "msgs")} label="Messages par jour" />
            </Section>
            <Section title="Audience moyenne cumulée" note="Somme des viewers moyens des chaînes pendant leurs lives. Quelqu'un qui regarde deux lives compte deux fois.">
              <LineChart spec={spec(st.h, "Audience", "avg")} label="Audience moyenne cumulée" />
            </Section>
          </Two>
          <Section className="mt-9" title="Les chaînes qui ont le plus écrit" note="Messages sur la période et viewers moyens pendant leurs lives.">
            {st.h.top.length ? (
              <div className={cn(panel, "px-4 py-2")}>
                <MeterList
                  rows={st.h.top.map((r) => ({
                    key: r.c, v: r.msgs, color: r.color,
                    right: <>{fmt(r.msgs)} messages{r.avg ? <span className="text-dusk"> · {fmt(r.avg)} viewers</span> : null}</>,
                    label: <button type="button" data-open={r.c} className="inline-flex items-center gap-2 hover:text-primary-soft"><ChannelAvatar {...r} className="pointer-events-none" /><span className="pointer-events-none">{r.c}</span></button>,
                  }))}
                />
              </div>
            ) : (
              <Empty>Aucune chaîne n'a écrit sur la période.</Empty>
            )}
          </Section>
        </>
      )}
    </div>
  )
}
