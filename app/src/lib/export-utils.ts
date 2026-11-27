// Rapport général (Réglages → Rapports) : vue d'ensemble et flux, en PDF (impression du navigateur) ou en CSV.
// 25/11/2026 : réécrit sur src/lib/report.ts. L'ancienne version téléchargeait html2pdf depuis un CDN au moment de
// l'export et classait en « organique » tout flux positif (donc tous) dans le CSV.
import type { OverviewData, FlowsData, LegacyQuery } from "@/legacy/bridge"
import { downloadCsv, esc, num, printReport, privacyFooter, today } from "@/lib/report"

type W = Window & {
  renderOverview?: (q: LegacyQuery) => void
  renderFlows?: (q: LegacyQuery, t?: string) => void
  getCurrentQuery?: () => LegacyQuery
}

/** Recalcule une donnée de l'ancien code pour la période en cours et la renvoie (l'onglet concerné n'a pas besoin d'être ouvert). */
function fresh<T>(event: string, run: (w: W, q: LegacyQuery) => void): T | null {
  const w = window as W
  if (!w.getCurrentQuery) return null
  let got: T | null = null
  const on = (e: Event) => (got = (e as CustomEvent<T>).detail)
  window.addEventListener(event, on)
  try {
    run(w, w.getCurrentQuery()) // les fonctions render* émettent leur événement de façon synchrone
  } finally {
    window.removeEventListener(event, on)
  }
  return got
}

export function currentData(): { overview: OverviewData | null; flows: FlowsData | null } {
  return {
    overview: fresh<OverviewData>("legacy:overview", (w, q) => w.renderOverview?.(q)),
    flows: fresh<FlowsData>("legacy:flows", (w, q) => w.renderFlows?.(q, "all")),
  }
}

const kpi = (l: string, v: string, h = "") => `<div class="kpi"><div class="l">${esc(l)}</div><div class="v">${esc(v)}</div>${h ? `<div class="h">${esc(h)}</div>` : ""}</div>`

export function printGeneralReport(o: OverviewData, f: FlowsData, period: string) {
  const top = [...o.channels].sort((a, b) => b.uniq - a.uniq).slice(0, 10)
  const flows = [...f.flows].sort((a, b) => b.n - a.n).slice(0, 10)
  const kpis = o.kpis.slice(0, 4)
  const body = `
<h1>Rapport d'audience et de migrations</h1>
<p class="sub">Toutes les chaînes suivies</p>
<p class="meta">${esc(period)} · ${o.channels.length} chaîne${o.channels.length > 1 ? "s" : ""} · généré le ${esc(today())}</p>

${kpis.length ? `<div class="kpis" style="--n:${kpis.length}">${kpis.map((k) => kpi(k.label, k.value, k.hint)).join("")}</div>` : ""}

<h2>Chaînes les plus actives</h2>
<table>
  <thead><tr><th>Chaîne</th><th>Viewers actifs</th><th>Messages</th><th>Viewers (API)</th></tr></thead>
  <tbody>${top
    .map(
      (c) => `<tr><td class="name"><span class="dot" style="background:${esc(c.color)}"></span>${esc(c.c)}</td><td>${num(c.uniq)}</td><td>${num(c.msgs)}</td><td>${c.viewers != null ? num(c.viewers) : "—"}</td></tr>`
    )
    .join("")}</tbody>
</table>
<p class="note"><b>Viewers actifs</b> : personnes qui ont écrit au moins un message sur la période. <b>Viewers (API)</b> : dernier relevé de Twitch, si l'API est configurée.</p>

<h2>Principales migrations</h2>
${
  flows.length
    ? `<table>
  <thead><tr><th>Trajet</th><th>Personnes</th><th>Délai médian</th></tr></thead>
  <tbody>${flows.map((x) => `<tr><td class="name">${esc(x.a.c)} → ${esc(x.b.c)}</td><td>${num(x.n)}</td><td>${esc(x.gap)}</td></tr>`).join("")}</tbody>
</table>
<p class="note">Une <b>migration</b> : quelqu'un qui écrit chez A, puis chez B moins de 3 h après son dernier message chez A. Au total : ${num(f.total)} migrations sur ${num(f.routes)} trajets différents.</p>`
    : `<p class="empty">Aucune migration repérée sur la période.</p>`
}

<h2>Raids reçus</h2>
${
  f.raids.length
    ? `<table>
  <thead><tr><th>Quand</th><th>De</th><th>Vers</th><th>Viewers</th></tr></thead>
  <tbody>${f.raids
    .slice(0, 15)
    .map((r) => `<tr><td class="name">${esc(r.when)}</td><td class="name">${r.from ? esc(r.from.name) : "—"}</td><td class="name">${esc(r.to.c)}</td><td>${num(r.n)}</td></tr>`)
    .join("")}</tbody>
</table>`
    : `<p class="empty">Aucun raid reçu par les chaînes suivies sur la période.</p>`
}
${privacyFooter}`
  return printReport("Rapport Twitch Overlap", body)
}

/** CSV des flux : chaque trajet (et s'il a connu un raid), puis les raids reçus. */
export function flowsCsv(f: FlowsData, period: string) {
  downloadCsv("flux-viewers", [
    ["Période", period],
    [],
    ["Source", "Cible", "Personnes", "Délai médian", "Raid sur le trajet"],
    ...f.flows.map((x) => [x.a.c, x.b.c, x.n, x.gap, x.raid ? "oui" : ""]),
    [],
    ["Raids reçus : quand", "De", "Vers", "Viewers"],
    ...f.raids.map((r) => [r.when, r.from?.name ?? "", r.to.c, r.n]),
  ])
}
