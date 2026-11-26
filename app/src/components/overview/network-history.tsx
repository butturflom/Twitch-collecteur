// Vue d'ensemble → Historique du réseau : l'activité de toutes les chaînes suivies sur 30 ou 90 jours, lue dans les rollups
// quotidiens (fonction SQL network_history) ; les viewers uniques du réseau viennent des esquisses HyperLogLog (period_reach, chaîne « * »).
// Critique du 25/11/2026 : replié par défaut (comme les analyses de fond) et lu seulement une fois ouvert ; un seul graphique ; le chiffre
// des viewers uniques dit la fenêtre réellement couverte ; sous 2 jours agrégés, une phrase à la place de courbes vides.
import { useEffect, useState } from "react"
import { ChevronDown } from "lucide-react"
import { LineChart } from "@/components/charts/line-chart"
import { Empty, Section } from "@/components/overview/parts"
import { Kpis } from "@/components/shared/blocks"
import { Segmented } from "@/components/shared/segmented"
import { fmt } from "@/lib/format"
import { dayLbl } from "@/lib/time"
import { cn } from "@/lib/utils"
import type { Kpi, LineSpec, NetworkHistory, PeriodReach } from "@/legacy/bridge"

type State = { s: "loading" } | { s: "none" } | { s: "error"; msg: string } | { s: "ok"; h: NetworkHistory }

const OPEN_KEY = "to2-ov-histo"
const at = (d: string) => Date.parse(d + "T12:00:00") // midi du jour : le point tombe au milieu de sa journée
// la couleur du graphique vient du jeton du système, pas d'un hexadécimal écrit ici
const primary = () => (typeof document !== "undefined" && getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()) || "currentColor"

function messagesSpec(h: NetworkHistory): LineSpec {
  return { series: [{ name: "Messages", c: "", color: primary(), pts: h.days.map((d) => [at(d.d), d.msgs] as [number, number]) }], unit: "", pct: false, yFloor: 0, gaps: [], height: 190 }
}

const plural = (n: number, one: string, many = one + "s") => (n > 1 ? many : one)

export function NetworkHistoryBlock() {
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(OPEN_KEY) === "1" } catch { return false } })
  const toggle = () => setOpen((o) => { try { localStorage.setItem(OPEN_KEY, o ? "0" : "1") } catch { /* stockage indisponible : le choix vaut pour la visite */ } return !o })
  const [days, setDays] = useState<30 | 90>(30)
  const [st, setSt] = useState<State>({ s: "loading" })
  const [uniq, setUniq] = useState<PeriodReach | null>(null)
  // lues à chaque rendu : l'effet repart si l'ancien code remplace ces fonctions (la démo le fait après le premier affichage) ;
  // en production elles ne changent jamais, donc aucun appel de plus
  const fetchHistory = window.networkHistory
  const fetchReach = window.periodReach

  // rien n'est lu tant que le bloc est replié
  useEffect(() => {
    if (!open) return
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
  }, [open, days, fetchHistory, fetchReach])

  return (
    <div className="mt-12 border-t border-border pt-5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="ov-histo"
        onClick={toggle}
        className="group inline-flex min-h-6 items-center gap-2 rounded-md text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-200", open && "rotate-180")} />
        {open ? "Masquer l'historique du réseau" : "Afficher l'historique du réseau (30 et 90 jours)"}
      </button>

      <div id="ov-histo" hidden={!open} className="mt-6">
        {open && (
          <Section title="Historique du réseau" action={<Segmented value={days} onChange={setDays} label="Durée de l'historique du réseau" options={[[30, "30 jours"], [90, "90 jours"]]} />}>
            <Body st={st} uniq={uniq} days={days} />
          </Section>
        )}
      </div>
    </div>
  )
}

function Body({ st, uniq, days }: { st: State; uniq: PeriodReach | null; days: 30 | 90 }) {
  if (st.s === "loading") return <div role="status"><Empty>Chargement de l'historique…</Empty></div>
  if (st.s === "none") {
    return (
      <Empty>
        L'historique demande une base Supabase à jour. Relie la base dans{" "}
        <a href="#" data-goto="settings" className="text-primary-soft underline underline-offset-2">Réglages</a> ; si elle est déjà reliée, rejoue schema.sql dans le SQL Editor de Supabase.
      </Empty>
    )
  }
  if (st.s === "error") {
    return (
      <Empty>
        L'historique du réseau n'a pas pu être lu. Réessaie dans un instant ; si ça dure, vérifie la connexion à la base dans Réglages.
        <span className="mt-1.5 block text-[11px] leading-snug text-dusk">Message reçu : <span className="font-mono break-words">{st.msg}</span></span>
      </Empty>
    )
  }
  const { h } = st
  if (h.days.length === 0) return <Empty>Aucune journée agrégée pour l'instant. Les agrégats se calculent chaque nuit pour la veille.</Empty>

  // fenêtre réellement couverte par l'estimation, dite en clair quand elle est plus courte que celle demandée
  const win = uniq && uniq.days > 0 ? (uniq.days < days ? `sur ${uniq.days} ${plural(uniq.days, "jour")}, sur les ${days} demandés` : `sur ${uniq.days} jours`) : ""

  // sous 2 jours agrégés, une courbe n'a rien à montrer : on dit les chiffres en une phrase
  if (h.days.length < 2) {
    const d0 = h.days[0]
    return (
      <p className="max-w-[72ch] text-sm leading-relaxed text-muted-foreground">
        Un seul jour agrégé pour l'instant ({dayLbl(at(d0.d))}) :{" "}
        {uniq && uniq.days > 0 && <><b className="font-mono font-semibold text-foreground tabular-nums">≈ {fmt(uniq.net)}</b> viewers actifs uniques et </>}
        <b className="font-mono font-semibold text-foreground tabular-nums">{fmt(d0.msgs)}</b> messages. Les courbes se dessineront au fil des nuits.
      </p>
    )
  }

  const totalMsgs = h.days.reduce((s, d) => s + d.msgs, 0)
  const avgAud = Math.round(h.days.reduce((s, d) => s + d.avg, 0) / h.days.length)
  const items: Kpi[] = [
    ...(uniq && uniq.days > 0 ? [{ label: "Actifs uniques du réseau", value: "≈ " + fmt(uniq.net), hint: `${win} · estimation à ± 2,3 %` }] : []),
    { label: "Messages", value: fmt(totalMsgs), hint: `sur ${h.days.length} jours agrégés` },
    { label: "Audience moyenne cumulée", value: fmt(avgAud), hint: "somme des viewers moyens des chaînes en live", trend: h.days.map((d) => d.avg), trendLabel: "courbe par jour" },
  ]

  return (
    <>
      <Kpis items={items} />
      <div className="mt-4">
        <LineChart spec={messagesSpec(h)} label="Messages par jour" />
      </div>
      <p className="mt-2.5 max-w-[72ch] px-0.5 text-xs leading-relaxed text-dusk">
        <b className="font-semibold text-muted-foreground">Messages par jour</b>, toutes chaînes suivies. Un même viewer n'est compté qu'une fois dans « viewers actifs uniques » ; l'audience moyenne cumulée, elle, additionne les chaînes : quelqu'un qui regarde deux lives compte deux fois.
      </p>
    </>
  )
}
