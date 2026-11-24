// Export utilities for PDF and CSV generation
// Uses html2pdf CDN library for PDF generation (lightweight client-side)

import type { OverviewData, FlowsData } from "@/legacy/bridge"

// Types are imported from bridge.ts - no need to redefine them

/** Generate a PDF report with dark theme using html2pdf CDN */
export async function generatePDFReport(overviewData: OverviewData, flowsData: FlowsData): Promise<void> {
  // Create HTML content for the report
  const htmlContent = createReportHTML(overviewData, flowsData)

  // Inject HTML into a temporary container
  const container = document.createElement("div")
  container.style.position = "fixed"
  container.style.top = "0"
  container.style.left = "0"
  container.style.width = "210mm"
  container.style.height = "297mm"
  container.style.backgroundColor = "#09090b"
  container.style.color = "#f1f1f1"
  container.style.padding = "15mm"
  container.style.transform = "rotate(-0.01rad)"
  container.innerHTML = htmlContent

  document.body.appendChild(container)

  try {
    // Use html2pdf from CDN
    const html2pdf = await loadHtml2Pdf()
    if (html2pdf) {
      await html2pdf(container)
        .set({
          margin: 15,
          filename: "rapport-audience-twitch-overlap.pdf",
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        })
    } else {
      // Fallback: download as HTML
      downloadAsHTML(container)
    }
  } finally {
    document.body.removeChild(container)
  }
}

/** Load html2pdf from CDN */
async function loadHtml2Pdf(): Promise<any> {
  if (typeof window === "undefined") return null

  // Check if already loaded
  if ((window as any).html2pdf) return (window as any).html2pdf

  // Load from CDN
  return new Promise((resolve) => {
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
    script.onload = () => resolve((window as any).html2pdf)
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })
}

/** Create HTML content for the report */
function createReportHTML(overviewData: OverviewData, flowsData: FlowsData): string {
  const primary = "#1e40af"
  const accent = "#8b7cff"
  const secondary = "#64748b"

  const topChannels = overviewData.channels
    .filter(c => c.viewers && c.viewers > 0)
    .sort((a, b) => (b.viewers || 0) - (a.viewers || 0))
    .slice(0, 5)

  const topFlows = flowsData.flows
    .sort((a, b) => b.n - a.n)
    .slice(0, 3)

  const netGain = flowsData.balance.filter(b => b.net > 0).reduce((sum, b) => sum + b.net, 0)
  const netLoss = Math.abs(flowsData.balance.filter(b => b.net < 0).reduce((sum, b) => sum + b.net, 0))

  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; color: #f1f1f1; background: #09090b; padding: 15mm;">
      <h1 style="margin: 0 0 5mm 0; font-size: 24pt; color: #f1f1f1; font-weight: bold;">
        Rapport d'Audience Croisé & Migration Twitch Overlap
      </h1>
      <p style="margin: 0 0 15mm 0; color: #8b7cff; font-size: 12pt;">
        Généré le ${new Date().toLocaleDateString('fr-FR')}
      </p>

      <h2 style="margin: 0 0 5mm 0; font-size: 14pt; color: #f1f1f1; font-weight: bold; border-bottom: 1px solid #475569; padding-bottom: 3mm;">
        Indicateurs clés
      </h2>
      ${overviewData.kpis.slice(0, 6).map(kpi => `
        <div style="display: flex; margin-bottom: 3mm;">
          <span style="color: #8b7cff; font-weight: bold; width: 120px;">${kpi.label}</span>
          <span style="color: #f1f1f1; font-weight: bold; margin-right: 10px;">${kpi.value}</span>
          <span style="color: #64748b; font-size: 10pt;">${kpi.hint || ''}</span>
        </div>
      `).join('')}

      <h2 style="margin: 15mm 0 5mm 0; font-size: 14pt; color: #f1f1f1; font-weight: bold; border-bottom: 1px solid #475569; padding-bottom: 3mm;">
        Chaînes principales
      </h2>
      ${topChannels.map(ch => `
        <div style="display: flex; margin-bottom: 2mm;">
          <span style="color: #8b7cff;">@${ch.c}</span>
          <span style="color: #f1f1f1; margin-left: 10px; margin-right: 20px;">Viewers: ${(ch.viewers ?? 0).toLocaleString()}</span>
          ${ch.live !== null ? `<span style="color: ${ch.live ? '#22c55e' : '#64748b'}; font-size: 10pt;">${ch.live ? 'Live' : 'Offline'}</span>` : ''}
        </div>
      `).join('')}

      <h2 style="margin: 15mm 0 5mm 0; font-size: 14pt; color: #f1f1f1; font-weight: bold; border-bottom: 1px solid #475569; padding-bottom: 3mm;">
        Top 3 synergies de migration
      </h2>
      ${topFlows.map((flow, i) => `
        <div style="display: flex; margin-bottom: 3mm;">
          <span style="width: 30px;">${i + 1}.</span>
          <span style="color: #8b7cff; margin-right: 5px;">${flow.a.c}</span>
          <span style="color: #64748b; margin: 0 5px;">→</span>
          <span style="color: #8b7cff;">${flow.b.c}</span>
          <span style="color: #f1f1f1; margin-left: auto; font-weight: bold;">${flow.n} viewers</span>
        </div>
      `).join('')}

      ${flowsData.balance.length > 0 ? `
        <div style="margin-top: 10mm; padding: 8mm; background: rgba(255,255,255,0.05); border-radius: 4px;">
          <h3 style="margin: 0 0 5mm 0; font-size: 12pt;">Bilan réseau</h3>
          <div style="display: flex; gap: 20mm;">
            <div><span style="color: #22c55e; font-weight: bold;">Net gagnant: ${netGain} viewers</span></div>
            <div><span style="color: #ef4444; font-weight: bold;">Net perdant: ${netLoss} viewers</span></div>
          </div>
        </div>
      ` : ''}

      <div style="margin-top: 15mm; padding-top: 10mm; border-top: 1px solid #475569; color: #64748b; font-size: 10pt;">
        <p>Confidentialité: Les pseudos sont anonymisés via hachage SHA-256. Aucune donnée personnelle n'est exposée.</p>
      </div>
    </div>
  `
}

/** Fallback download as HTML */
function downloadAsHTML(element: HTMLElement): void {
  const content = element.outerHTML
  const blob = new Blob([content], { type: "text/html;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", "rapport-audience-twitch-overlap.html")
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/** Generate CSV export of flow data */
export async function generateCSVExport(flowsData: FlowsData): Promise<void> {
  const headers = ["Source", "Cible", "Viewers", "Type"]
  const rows: string[] = []

  // All flows
  for (const flow of flowsData.flows) {
    const type = flow.n <= 0 ? "raid" : "organique"
    rows.push([
      flow.a.c,
      flow.b.c,
      flow.n.toString(),
      type
    ].join(","))
  }

  // Raids received
  for (const raid of flowsData.raids) {
    rows.push([
      raid.from?.c || "Raid",
      raid.to.c,
      raid.n.toString(),
      "raid"
    ].join(","))
  }

  const csvContent = [headers.join(","), ...rows].join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", "flux-viewers-twitch.csv")
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}