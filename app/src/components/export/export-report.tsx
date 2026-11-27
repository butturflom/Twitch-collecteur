// Réglages → Rapports : rapport général en PDF (impression du navigateur) et flux en CSV.
// Les données sont recalculées au clic pour la période choisie : pas besoin d'avoir ouvert la Vue d'ensemble ou Audiences avant.
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, FileDown } from "lucide-react"
import { usePeriodInfo } from "@/legacy/bridge"
import { currentData, flowsCsv, printGeneralReport } from "@/lib/export-utils"

export function ExportReportButton() {
  const period = usePeriodInfo()
  const [msg, setMsg] = useState("")
  const label = period?.range || "Période en cours"

  const pdf = () => {
    const { overview, flows } = currentData()
    if (!overview || !flows) return setMsg("Les données ne sont pas encore chargées. Réessaie dans quelques secondes.")
    setMsg("")
    void printGeneralReport(overview, flows, label)
  }
  const csv = () => {
    const { flows } = currentData()
    if (!flows) return setMsg("Les données ne sont pas encore chargées. Réessaie dans quelques secondes.")
    setMsg("")
    flowsCsv(flows, label)
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="h-8 border-input" onClick={pdf} title="Ouvre l'impression : choisis « Enregistrer en PDF »">
          <FileDown className="mr-1.5 size-4" />
          Rapport PDF
        </Button>
        <Button size="sm" variant="outline" className="h-8 border-input" onClick={csv} title="Tableur (séparateur ;)">
          <Download className="mr-1.5 size-4" />
          Flux en CSV
        </Button>
      </div>
      <p className="text-xs text-dusk">
        Période : {label}. Le PDF s'ouvre dans la fenêtre d'impression : choisis « Enregistrer en PDF ». Le rapport d'un roster s'exporte depuis l'onglet Rosters.
      </p>
      {msg && (
        <p role="status" className="text-xs text-muted-foreground">
          {msg}
        </p>
      )}
    </div>
  )
}
