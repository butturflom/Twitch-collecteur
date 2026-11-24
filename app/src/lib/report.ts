// Rapports : CSV et PDF, sans bibliothèque ni script externe.
// Le PDF passe par l'impression du navigateur (« Enregistrer en PDF ») : le rapport est écrit dans une iframe cachée,
// isolée des styles de l'application, avec les polices de la page (Inter, JetBrains Mono) et les couleurs de DESIGN.md.
// 25/11/2026 : remplace html2pdf, qui était téléchargé depuis un CDN au moment de l'export (code tiers exécuté dans une
// page qui contient la clé Supabase, et export impossible hors ligne).

/** Échappe un texte pour l'insérer dans du HTML (noms de roster et de chaîne saisis par l'utilisateur). */
export function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}

/** Nombre au format français (espaces fines), pour les rapports. */
export const num = (n: number) => n.toLocaleString("fr-FR")
export const pct = (x: number) => (x * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " %"

/** Nom de fichier sans caractères gênants : « Roster FPS / Agence A » → « roster-fps-agence-a ». */
export function slug(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "rapport"
  )
}

export const today = () => new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
// date locale (toISOString donnerait la veille entre minuit et 1 h ou 2 h, heure de Paris)
const isoDay = () => new Date().toLocaleDateString("sv-SE")

/** Télécharge un fichier généré dans le navigateur. */
export function download(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** CSV pour Excel en français : séparateur « ; », virgule décimale, BOM UTF-8 (accents), guillemets échappés. */
export function downloadCsv(base: string, rows: (string | number)[][]) {
  const cell = (v: string | number) => {
    const s = typeof v === "number" ? String(v).replace(".", ",") : String(v)
    return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  download(`${base}-${isoDay()}.csv`, "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n"), "text/csv;charset=utf-8")
}

/** Les @font-face de la page (Inter, JetBrains Mono), recopiées dans le rapport. */
function fontFaces(): string {
  let out = ""
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      continue // feuille d'une autre origine : illisible, et sans nos polices
    }
    for (const r of Array.from(rules)) if (r instanceof CSSFontFaceRule) out += r.cssText + "\n"
  }
  return out
}

// Thème sombre de DESIGN.md (« L'Observatoire ») : ciel profond, coupole, violet nébuleuse, crépuscule lisible.
const CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; background: #09090b; color: #f4f4f5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font: 400 10pt/1.5 "Inter", ui-sans-serif, system-ui, "Segoe UI", sans-serif; font-feature-settings: "cv11", "ss01"; padding: 16mm 15mm; }
h1 { font-size: 19pt; font-weight: 600; letter-spacing: -0.025em; margin: 0; }
.sub { color: #a1a1aa; margin: 2mm 0 0; }
.meta { color: #868693; font-size: 8.5pt; margin: 1mm 0 8mm; }
h2 { font-size: 11.5pt; font-weight: 600; letter-spacing: -0.015em; margin: 8mm 0 3mm; display: flex; align-items: center; gap: 2.5mm; break-after: avoid; }
h2::before { content: ""; width: 2.2mm; height: 2.2mm; border-radius: 0.5mm; background: #8b7cff; }
.kpis { display: grid; grid-template-columns: repeat(var(--n, 4), 1fr); border: 1px solid rgba(255,255,255,.08); border-radius: 3mm; background: linear-gradient(#16161c, #121217); overflow: hidden; }
.kpi { padding: 4mm 4.5mm; border-left: 1px solid rgba(255,255,255,.08); }
.kpi:first-child { border-left: 0; }
.kpi .l { color: #868693; font-size: 8.5pt; font-weight: 500; }
.kpi .v { font-size: 17pt; font-weight: 600; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; margin-top: 1mm; }
.kpi .h { color: #868693; font-size: 8pt; margin-top: 0.5mm; }
table { width: 100%; border-collapse: collapse; border: 1px solid rgba(255,255,255,.08); border-radius: 3mm; background: #121217; }
th { color: #868693; font-size: 8.5pt; font-weight: 500; text-align: right; padding: 2.5mm 3.5mm; border-bottom: 1px solid rgba(255,255,255,.08); }
td { padding: 2.2mm 3.5mm; border-bottom: 1px solid rgba(255,255,255,.05); text-align: right; font: 9pt "JetBrains Mono", ui-monospace, Consolas, monospace; font-variant-numeric: tabular-nums; }
th:first-child, td:first-child { text-align: left; }
td.name { font-family: "Inter", ui-sans-serif, system-ui, sans-serif; font-size: 9.5pt; }
tr { break-inside: avoid; }
tr:last-child td { border-bottom: 0; }
.bar { display: inline-block; vertical-align: middle; height: 1.4mm; border-radius: 1mm; background: #8b7cff; margin-right: 2mm; }
.dot { display: inline-block; width: 2mm; height: 2mm; border-radius: 50%; margin-right: 2mm; vertical-align: middle; }
.note { color: #868693; font-size: 8.5pt; margin: 2mm 0 0; max-width: 165mm; }
.note b { color: #a1a1aa; font-weight: 500; }
.empty { color: #868693; font-size: 9pt; }
footer { margin-top: 10mm; padding-top: 4mm; border-top: 1px solid rgba(255,255,255,.08); color: #868693; font-size: 8pt; }
footer b { color: #3ccf86; font-weight: 500; }
`

/** Ouvre la boîte d'impression du navigateur sur un rapport (choisir « Enregistrer en PDF »). */
export async function printReport(title: string, body: string): Promise<void> {
  const frame = document.createElement("iframe")
  frame.setAttribute("aria-hidden", "true")
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden"
  document.body.appendChild(frame)
  const doc = frame.contentDocument!
  doc.open()
  doc.write(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><base href="${esc(location.href)}"><title>${esc(title)}</title>` +
      `<style>${fontFaces()}${CSS}</style></head><body>${body}</body></html>`
  )
  doc.close()
  const win = frame.contentWindow!
  try {
    await win.document.fonts.ready // sans ça, la première impression part avec les polices de secours
  } catch {
    /* navigateur sans FontFaceSet : on imprime quand même */
  }
  const cleanup = () => setTimeout(() => frame.remove(), 500)
  win.addEventListener("afterprint", cleanup, { once: true })
  win.focus()
  win.print()
  setTimeout(() => frame.isConnected && frame.remove(), 60_000) // au cas où « afterprint » ne viendrait pas
}

/** Pied de page commun : rappel de l'anonymisation. */
export const privacyFooter = `<footer><b>Données anonymisées.</b> Les pseudos sont remplacés par une empreinte (SHA-256 salée) avant d'être enregistrés ; le texte des messages n'est jamais conservé. Aucun pseudo n'apparaît dans ce rapport. Généré par Twitch Overlap le ${esc(today())}.</footer>`
