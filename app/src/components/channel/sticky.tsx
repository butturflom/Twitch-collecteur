// « Par chaîne » → Historique → Fidélité du chat (le « Sticky-Factor » du plan V2) : sur 100, la part des viewers actifs qui n'ont écrit
// chez aucune autre chaîne suivie juste après (moins de 3 h), lue dans les rollups quotidiens (fonction SQL channel_stickiness, voir
// schema.sql). Les seuils fixes du plan (vert au-dessus de 70, rouge sous 40) donneraient vert à toutes les chaînes : le 24/11, le
// minimum observé sur 60 chaînes était 72. La chaîne est donc comparée aux quartiles des chaînes suivies.
import { useEffect, useState } from "react"
import { StatCard, StatCardGroup } from "@/components/ui/stat-card"
import { fmt } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ChannelSticky, StickyNet } from "@/legacy/bridge"

/** Viewers actifs sur la période en dessous desquels le score ne dit rien : une poignée de personnes suffit à le faire bouger. */
export const STICKY_FLOOR = 30
/** Au-dessus, le score est solide et on le compare aux chaînes suivies ; entre les deux, il est donné comme fragile, sans comparaison. */
export const STICKY_MIN = 200
/** Nombre minimal de chaînes suivies pour se comparer à elles. */
export const NET_MIN = 5
/** Un jour avec moins de viewers actifs que cela est une journée incomplète : il ne compte pas dans la mini-courbe. */
const DAY_MIN = 30

type State = { s: "loading" } | { s: "none" } | { s: "error"; msg: string } | { s: "ok"; r: ChannelSticky }
type Tier = "good" | "mid" | "warn"

/** Score sur 100 : part des viewers actifs qui ne sont pas partis chez une autre chaîne suivie. null : personne d'actif. */
export const stickyScore = (leavers: number, actives: number) => (actives > 0 ? 100 * (1 - Math.min(1, leavers / actives)) : null)

/** Dans le quart des chaînes suivies les plus fidèles, au milieu, ou dans le quart le moins fidèle. null : trop peu de chaînes pour comparer. */
export function stickyTier(score: number, net: StickyNet): Tier | null {
  if (net.n < NET_MIN || net.q1 == null || net.q3 == null) return null
  return score >= net.q3 ? "good" : score < net.q1 ? "warn" : "mid"
}

const TIER_TEXT: Record<Tier, string> = {
  good: "Parmi le quart des chaînes suivies où le chat est le plus fidèle.",
  mid: "Dans la moyenne des chaînes suivies.",
  warn: "Parmi le quart des chaînes suivies où le chat est le moins fidèle.",
}
// La couleur dit un état (DESIGN.md : vert et ambre signal) ; la phrase ci-dessus le dit aussi, la couleur ne porte rien seule.
const TIER_TONE: Record<Tier, string> = {
  good: "[&_[data-slot=stat-card-value]]:text-signal-green",
  mid: "",
  warn: "[&_[data-slot=stat-card-value]]:text-signal-amber",
}

const note = "mt-3 mb-4 text-xs leading-relaxed text-dusk"

export function Sticky({ ch, days }: { ch: string; days: 30 | 90 }) {
  const [st, setSt] = useState<State>({ s: "loading" })

  useEffect(() => {
    let live = true
    setSt({ s: "loading" })
    const f = window.channelSticky
    if (!f) return setSt({ s: "none" })
    f(ch, days).then(
      (r) => live && setSt(r ? { s: "ok", r } : { s: "none" }),
      (e) => live && setSt({ s: "error", msg: String(e?.message ?? e) })
    )
    return () => { live = false }
  }, [ch, days])

  // tous les hooks sont appelés plus haut : ces retours ne changent pas leur ordre
  if (st.s === "loading") return null
  if (st.s === "none") return <p className={note}>La fidélité du chat demande la base Supabase à jour (schema.sql à rejouer dans le SQL Editor).</p>
  if (st.s === "error") return <p className={note}>La fidélité du chat n'a pas pu être lue : {st.msg}</p>

  const { r } = st
  const score = stickyScore(r.leavers, r.actives)
  if (score == null || r.actives < STICKY_FLOOR) {
    return <p className={note}>Fidélité du chat : pas assez de viewers actifs agrégés pour la mesurer ({fmt(r.actives)} sur la période, il en faut au moins {fmt(STICKY_FLOOR)}).</p>
  }
  // petite chaîne : le score existe mais bouge au moindre départ, et le réseau suivi est fait de chaînes plus grosses : pas de comparaison
  const fragile = r.actives < STICKY_MIN
  const tier = fragile ? null : stickyTier(score, r.net)
  const trend = r.days.filter((d) => d.actives >= DAY_MIN).map((d) => stickyScore(d.leavers, d.actives) ?? 0)

  return (
    <div className="mt-3 mb-4">
      <StatCardGroup className="bg-linear-to-b from-dome-crest to-dome">
        <StatCard
          variant="plain"
          className={cn("px-[18px] py-4", tier && TIER_TONE[tier])}
          label="Fidélité du chat"
          value={Math.round(score)}
          unit="sur 100"
          hint={`${Math.round(100 - score)} % des viewers actifs ont écrit chez une autre chaîne suivie juste après (moins de 3 h).`}
          trend={trend}
          trendLabel="courbe par jour"
        />
      </StatCardGroup>
      <p className="mt-2 max-w-[72ch] px-0.5 text-xs leading-relaxed text-dusk">
        {fragile
          ? `Estimation fragile : ${fmt(r.actives)} viewers actifs sur la période, moins de ${fmt(STICKY_MIN)}. Quelques départs font bouger le score ; la comparaison aux autres chaînes suivies viendra avec plus de viewers.`
          : tier ? TIER_TEXT[tier] : "Pas assez de chaînes suivies pour se comparer."}
        {tier && r.net.med != null ? ` Médiane des chaînes suivies : ${fmt(Math.round(r.net.med))}.` : ""}
        {" "}{fragile ? "" : "Estimation : un viewer parti vers deux chaînes compte deux fois."}
      </p>
    </div>
  )
}
