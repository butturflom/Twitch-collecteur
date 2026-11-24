// Rapport d'un roster (PDF via l'impression du navigateur, et CSV) : Net Reach, détail par chaîne, synergies.
// Les chiffres viennent de reachOf() (rosters.tsx) : mêmes valeurs qu'à l'écran.
import { downloadCsv, esc, num, pct, printReport, privacyFooter, slug, today } from "@/lib/report"
import type { Reach, Roster } from "./rosters"

const kpi = (l: string, v: string, h = "") => `<div class="kpi"><div class="l">${esc(l)}</div><div class="v">${esc(v)}</div>${h ? `<div class="h">${esc(h)}</div>` : ""}</div>`

export function printRosterReport(roster: Roster, r: Reach, period: string) {
  const maxV = Math.max(1, ...r.rows.map((x) => x.viewers))
  const body = `
<h1>Rapport d'audience croisée</h1>
<p class="sub">Roster « ${esc(roster.name)} »${roster.description ? ` · ${esc(roster.description)}` : ""}</p>
<p class="meta">${esc(period)} · ${r.rows.length} chaîne${r.rows.length > 1 ? "s" : ""} · généré le ${esc(today())}</p>

<div class="kpis" style="--n:4">
  ${kpi("Net Reach", num(r.net), "viewers actifs uniques")}
  ${kpi("Audience brute", num(r.gross), "somme des chaînes")}
  ${kpi("Cannibalisation", r.gross ? pct(r.cannibal) : "—", "audience en doublon")}
  ${kpi("Sur 2 chaînes ou plus", num(r.multi), "viewers partagés")}
</div>
<p class="note"><b>Net Reach</b> : chaque viewer actif est compté une seule fois, quel que soit le nombre de chaînes du roster où il a écrit. <b>Cannibalisation</b> : part de l'audience brute qui fait doublon (1 − Net Reach ÷ audience brute) ; plus elle est basse, plus les chaînes se complètent.</p>

<h2>Détail par chaîne</h2>
<table>
  <thead><tr><th>Chaîne</th><th>Viewers actifs</th><th>Exclusifs</th><th>Part exclusive</th><th>Messages</th></tr></thead>
  <tbody>${r.rows
    .map(
      (x) => `<tr><td class="name"><span class="dot" style="background:${esc(x.who.color)}"></span>${esc(x.who.c)}</td>
      <td><span class="bar" style="width:${Math.round((x.viewers / maxV) * 22)}mm"></span>${num(x.viewers)}</td>
      <td>${num(x.exclusive)}</td><td>${x.viewers ? pct(x.exclusive / x.viewers) : "—"}</td><td>${num(x.msgs)}</td></tr>`
    )
    .join("")}</tbody>
</table>
<p class="note"><b>Exclusifs</b> : viewers qu'aucune autre chaîne du roster n'a eus sur la période ; c'est ce que la chaîne apporte en propre au roster.</p>

<h2>Synergies d'audience</h2>
${
  r.pairs.length
    ? `<table>
  <thead><tr><th>Paire de chaînes</th><th>Viewers en commun</th><th>Part de la plus petite</th></tr></thead>
  <tbody>${r.pairs
    .slice(0, 10)
    .map((p) => `<tr><td class="name">${esc(p.a.c)} · ${esc(p.b.c)}</td><td>${num(p.shared)}</td><td>${pct(p.share)}</td></tr>`)
    .join("")}</tbody>
</table>
<p class="note">Les ${Math.min(10, r.pairs.length)} paires qui partagent le plus de viewers actifs. <b>Part de la plus petite</b> : viewers en commun rapportés à l'audience de la plus petite des deux chaînes.</p>`
    : `<p class="empty">Aucune paire de chaînes ne partage de viewers sur la période.</p>`
}
${r.missing.length ? `<p class="note">Chaînes du roster qui ne sont plus suivies, donc absentes du calcul : ${esc(r.missing.join(", "))}.</p>` : ""}
<p class="note"><b>Viewers actifs</b> : personnes qui ont écrit au moins un message dans le chat pendant la période. Les spectateurs silencieux ne sont pas visibles.</p>
${privacyFooter}`
  return printReport(`Rapport ${roster.name}`, body)
}

export function rosterCsv(roster: Roster, r: Reach, period: string) {
  downloadCsv(`roster-${slug(roster.name)}`, [
    ["Roster", roster.name],
    ["Période", period],
    ["Net Reach (viewers actifs uniques)", r.net],
    ["Audience brute", r.gross],
    ["Cannibalisation (%)", r.gross ? Math.round(r.cannibal * 1000) / 10 : ""],
    ["Viewers sur 2 chaînes ou plus", r.multi],
    [],
    ["Chaîne", "Viewers actifs", "Exclusifs", "Part exclusive (%)", "Messages"],
    ...r.rows.map((x) => [x.who.c, x.viewers, x.exclusive, x.viewers ? Math.round((x.exclusive / x.viewers) * 1000) / 10 : "", x.msgs]),
    [],
    ["Chaîne A", "Chaîne B", "Viewers en commun", "Part de la plus petite (%)"],
    ...r.pairs.map((p) => [p.a.c, p.b.c, p.shared, Math.round(p.share * 1000) / 10]),
  ])
}
