// Vue d'ensemble → Rythme des chaînes : celles qui décollent ou qui ralentissent, d'après leurs viewers actifs par jour (rollups
// quotidiens, fonction SQL channels_rhythm, voir schema.sql). Il faut 14 journées agrégées ; avant, une phrase le dit.
import { useEffect, useState } from "react"
import { ChannelCell, DataTable, Empty, Section, type Col } from "@/components/overview/parts"
import { fmt } from "@/lib/format"
import { rhythmOf, type Rhythm } from "@/lib/rhythm"
import type { RhythmRow } from "@/legacy/bridge"

type State = { s: "loading" } | { s: "none" } | { s: "error"; msg: string } | { s: "ok"; rows: RhythmRow[] }
type Flag = RhythmRow & { r: Rhythm }

const pctTxt = (x: number) => `${x > 0 ? "+" : "−"}${Math.round(Math.abs(x) * 100)} %`

export function RhythmBlock() {
  const [st, setSt] = useState<State>({ s: "loading" })
  useEffect(() => {
    let live = true
    const f = window.channelsRhythm
    if (!f) return setSt({ s: "none" })
    f(28).then(
      (rows) => live && setSt(rows ? { s: "ok", rows } : { s: "none" }),
      (e) => live && setSt({ s: "error", msg: String(e?.message ?? e) })
    )
    return () => { live = false }
  }, [])

  const note = "Viewers actifs par jour : moyenne des 7 dernières journées agrégées, comparée à celle des journées d'avant (jusqu'à 3 semaines). Une chaîne n'apparaît que si l'écart dépasse 15 % et sort de ses variations habituelles : une petite chaîne, plus irrégulière, demande un changement plus net."
  if (st.s === "loading") return null

  let body
  if (st.s === "none") body = <Empty>Les alertes de rythme demandent la base Supabase à jour (schema.sql à rejouer dans le SQL Editor).</Empty>
  else if (st.s === "error") body = <Empty>Les alertes de rythme n'ont pas pu être lues : {st.msg}</Empty>
  else if (st.rows.length === 0) body = <Empty>Pas encore 14 journées agrégées : les alertes apparaîtront d'elles-mêmes, sans rien à faire.</Empty>
  else {
    const flags: Flag[] = st.rows.flatMap((x) => { const r = rhythmOf(x); return r ? [{ ...x, r }] : [] }).sort((a, b) => Math.abs(b.r.rel) - Math.abs(a.r.rel))
    if (flags.length === 0) body = <Empty>Aucune chaîne ne sort de son rythme habituel, sur les {st.rows.length} suivies qui ont assez de journées.</Empty>
    else {
      const cols: Col<Flag>[] = [
        { head: "Chaîne", left: true, cell: (x) => <ChannelCell who={x} /> },
        { head: "Tendance", left: true, cell: (x) => <span className={x.r.kind === "up" ? "font-sans text-signal-green" : "font-sans text-signal-amber"}>{x.r.kind === "up" ? "Décolle" : "Ralentit"}</span> },
        { head: "7 derniers jours", cell: (x) => fmt(Math.round(x.recent)) },
        { head: "Jours d'avant", cell: (x) => fmt(Math.round(x.base)) },
        { head: "Écart", cell: (x) => pctTxt(x.r.rel) },
      ]
      body = <DataTable cols={cols} rows={flags} rowKey={(x) => x.c} />
    }
  }
  return <Section title="Rythme des chaînes" note={note}>{body}</Section>
}
