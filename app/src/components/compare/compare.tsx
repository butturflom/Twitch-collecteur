// Rosters → Comparer des chaînes : 2 à 4 chaînes côte à côte sur 30 ou 90 jours, lues dans les rollups quotidiens (fonctions SQL
// channel_history, channel_stickiness et period_reach, voir schema.sql). Les viewers actifs uniques viennent d'esquisses HyperLogLog
// (± 2,3 %) : une même personne n'est comptée qu'une fois par chaîne, et une fois pour le groupe.
import { useEffect, useState } from "react"
import { ChannelAvatar } from "@/components/channel-avatar"
import { STICKY_MIN, stickyScore } from "@/components/channel/sticky"
import { DataTable, Empty, Section, panel, type Col } from "@/components/overview/parts"
import { Kpis } from "@/components/shared/blocks"
import { Segmented } from "@/components/shared/segmented"
import { Input } from "@/components/ui/input"
import { fmt } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ChannelHistory, Kpi, PeriodReach, RosterChannel } from "@/legacy/bridge"

const MAX = 4

type Stat = { c: string; avg: number | null; peak: number; msgs: number; uniq: number | null; sticky: number | null }
type Pair = { a: string; b: string; shared: number; ofSmaller: number | null }
type Result = { stats: Stat[]; net: number | null; sum: number | null; covered: number; pairs: Pair[] }
type State = { s: "idle" } | { s: "loading" } | { s: "none" } | { s: "error"; msg: string } | { s: "ok"; r: Result }

const nOf = (c: string, p: PeriodReach) => p.chans.find((x) => x.c === c)?.n ?? null

/** Lit les rollups pour les chaînes choisies. null : pas de base Supabase, ou base pas à jour. */
async function load(sel: string[], days: number): Promise<Result | null> {
  const fh = window.channelHistory, fs = window.channelSticky, fr = window.periodReach
  if (!fh || !fr) return null
  const pairIdx = sel.flatMap((a, i) => sel.slice(i + 1).map((b) => [a, b] as const))
  const [hist, stick, reach, pairReach] = await Promise.all([
    Promise.all(sel.map((c) => fh(c, days))),
    Promise.all(sel.map((c) => (fs ? fs(c, days).catch(() => null) : Promise.resolve(null)))),
    fr(sel, days),
    Promise.all(pairIdx.map(([a, b]) => fr([a, b], days))),
  ])
  if (!reach || hist.some((h) => !h)) return null
  const stats = sel.map((c, i): Stat => {
    const h = hist[i] as ChannelHistory
    const live = h.days.filter((d) => d.avg > 0) // une journée sans relevé « en live » n'a pas de moyenne
    const st = stick[i]
    return {
      c,
      avg: live.length ? Math.round(live.reduce((s, d) => s + d.avg, 0) / live.length) : null,
      peak: Math.max(0, ...h.days.map((d) => d.peak)),
      msgs: h.days.reduce((s, d) => s + d.msgs, 0),
      uniq: nOf(c, reach),
      sticky: st && st.actives >= STICKY_MIN ? stickyScore(st.leavers, st.actives) : null,
    }
  })
  const pairs = pairIdx.flatMap(([a, b], k): Pair[] => {
    const p = pairReach[k]
    const na = p ? nOf(a, p) : null, nb = p ? nOf(b, p) : null
    if (!p || na == null || nb == null) return []
    const shared = Math.max(0, na + nb - p.net) // réunion plus petite que la somme : la différence est le recoupement
    const small = Math.min(na, nb)
    return [{ a, b, shared, ofSmaller: small > 0 ? shared / small : null }]
  })
  const uniqs = stats.map((s) => s.uniq)
  const sum = uniqs.every((u) => u != null) ? (uniqs as number[]).reduce((s, u) => s + u, 0) : null
  return { stats, net: reach.net, sum, covered: reach.days, pairs }
}

type Row = { label: string; vals: (number | null)[]; f: (v: number) => string }

function Table({ r }: { r: Result }) {
  const s = r.stats
  const rows: Row[] = [
    { label: "Viewers moyens", vals: s.map((x) => x.avg), f: fmt },
    { label: "Pic de viewers", vals: s.map((x) => x.peak || null), f: fmt },
    { label: "Viewers actifs uniques ≈", vals: s.map((x) => x.uniq), f: fmt },
    { label: "Messages", vals: s.map((x) => x.msgs), f: fmt },
    { label: "Messages par viewer actif", vals: s.map((x) => (x.uniq ? x.msgs / x.uniq : null)), f: (v) => v.toFixed(1).replace(".", ",") },
    { label: "Fidélité du chat, sur 100", vals: s.map((x) => x.sticky), f: (v) => String(Math.round(v)) },
  ]
  const cols: Col<Row>[] = [
    { head: "Mesure", key: "mesure", left: true, cell: (row) => <span className="font-sans">{row.label}</span> },
    ...s.map((x, i): Col<Row> => ({
      head: x.c,
      key: x.c,
      cell: (row) => {
        const v = row.vals[i]
        if (v == null) return <span className="text-dusk">—</span>
        const known = row.vals.filter((y): y is number => y != null)
        const best = known.length > 1 && v === Math.max(...known) && Math.max(...known) > Math.min(...known)
        return <span className={best ? "font-semibold text-foreground" : "text-muted-foreground"}>{row.f(v)}</span>
      },
    })),
  ]
  return <DataTable cols={cols} rows={rows} rowKey={(row) => row.label} />
}

export function Compare({ chans }: { chans: RosterChannel[] }) {
  // en développement, ?compare=a,b,c remplit la sélection (pour voir le résultat en démo)
  const [sel, setSel] = useState<string[]>(() => (import.meta.env.DEV ? (new URLSearchParams(location.search).get("compare") ?? "").split(",").filter(Boolean).slice(0, MAX) : []))
  const [days, setDays] = useState<30 | 90>(30)
  const [q, setQ] = useState("")
  const [st, setSt] = useState<State>({ s: "idle" })
  const by = new Map(chans.map((c) => [c.c, c]))
  const key = sel.join(",")

  useEffect(() => {
    if (sel.length < 2) return setSt({ s: "idle" })
    let live = true
    setSt({ s: "loading" })
    load(sel, days).then(
      (r) => live && setSt(r ? { s: "ok", r } : { s: "none" }),
      (e) => live && setSt({ s: "error", msg: String(e?.message ?? e) })
    )
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` résume `sel`
  }, [key, days])

  const toggle = (c: string) => setSel((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : cur.length < MAX ? [...cur, c] : cur))
  const f = q.trim().toLowerCase()
  const matches = chans.filter((c) => !sel.includes(c.c) && (!f || c.c.includes(f))).slice(0, 14)
  const pill = "inline-flex shrink-0 items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"

  const kpis: Kpi[] = []
  if (st.s === "ok" && st.r.net != null) {
    kpis.push({ label: "Audience nette du groupe", value: "≈ " + fmt(st.r.net), hint: `sur ${st.r.covered} jour${st.r.covered > 1 ? "s" : ""} agrégé${st.r.covered > 1 ? "s" : ""} · estimation à ± 2,3 %` })
    if (st.r.sum) {
      const dup = Math.max(0, 1 - st.r.net / st.r.sum)
      kpis.push({ label: "Viewers comptés plusieurs fois", value: `${Math.round(dup * 100)} %`, hint: "part de la somme des audiences qui se recoupe entre ces chaînes" })
    }
  }

  return (
    <Section
      title="Comparer des chaînes"
      className="mt-9"
      action={<Segmented value={days} onChange={setDays} label="Durée de la comparaison" options={[[30, "30 jours"], [90, "90 jours"]]} />}
      note="Journées déjà agrégées (la veille et avant, pas aujourd'hui). La meilleure valeur de chaque ligne est en gras. La fidélité n'est pas donnée pour une chaîne de moins de 200 viewers actifs. Une même personne n'est comptée qu'une fois par chaîne."
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {sel.map((c) => (
          <button key={c} type="button" onClick={() => toggle(c)} aria-label={`Retirer ${c} de la comparaison`} className={cn(pill, "border-primary bg-primary/15 text-foreground shadow-focus-soft")}>
            {by.get(c) ? <ChannelAvatar {...by.get(c)!} className="pointer-events-none" /> : null}
            <span>{c}</span>
            <span aria-hidden className="text-dusk">×</span>
          </button>
        ))}
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={sel.length >= MAX ? `${MAX} chaînes au maximum` : "Ajouter une chaîne…"}
          disabled={sel.length >= MAX}
          aria-label="Chercher une chaîne à comparer"
          className="h-9 w-56"
        />
      </div>
      {sel.length < MAX && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {matches.map((c) => (
            <button key={c.c} type="button" onClick={() => toggle(c.c)} className={cn(pill, "border-border bg-card text-muted-foreground hover:border-input hover:text-foreground")}>
              <ChannelAvatar {...c} className="pointer-events-none" />
              <span>{c.c}</span>
            </button>
          ))}
          {chans.length === 0 && <p className="text-xs text-dusk">Aucune chaîne suivie pour l'instant.</p>}
        </div>
      )}

      {sel.length < 2 && <Empty>Choisis 2 à {MAX} chaînes pour les voir côte à côte.</Empty>}
      {st.s === "loading" && <Empty>Chargement de la comparaison…</Empty>}
      {st.s === "none" && <Empty>La comparaison demande la base Supabase à jour (Réglages → Source des données, puis schema.sql à rejouer dans le SQL Editor).</Empty>}
      {st.s === "error" && <Empty>La comparaison n'a pas pu être lue : {st.msg}</Empty>}
      {st.s === "ok" && (
        <>
          {kpis.length > 0 && <Kpis items={kpis} className="mb-4" />}
          <Table r={st.r} />
          {st.r.pairs.length > 0 && (
            <div className={cn(panel, "mt-4 px-4 py-2")}>
              <p className="py-2 text-[11px] font-medium text-dusk">Viewers actifs en commun, deux à deux</p>
              <ul className="divide-y divide-border">
                {st.r.pairs.map((p) => (
                  <li key={p.a + p.b} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2 text-[13.5px]">
                    <span>{p.a} et {p.b}</span>
                    <span className="font-mono text-[12.5px] tabular-nums text-muted-foreground">
                      ≈ {fmt(p.shared)}{p.ofSmaller != null ? ` · ${Math.round(p.ofSmaller * 100)} % de la plus petite audience` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Section>
  )
}
