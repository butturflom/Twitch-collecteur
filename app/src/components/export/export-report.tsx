// Export Report - PDF/CSV export functionality
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, FileDown } from "lucide-react"
import { useOverviewData, useFlowsData, type OverviewData, type FlowsData } from "@/legacy/bridge"
import { generatePDFReport, generateCSVExport } from "@/lib/export-utils"

export function ExportReportButton() {
  const [isGenerating, setIsGenerating] = useState(false)
  const overviewData = useOverviewData()
  const flowsData = useFlowsData()

  const handlePDFExport = async () => {
    if (!overviewData || !flowsData) return
    setIsGenerating(true)
    try {
      await generatePDFReport(overviewData, flowsData)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCSVExport = async () => {
    if (!flowsData) return
    setIsGenerating(true)
    try {
      await generateCSVExport(flowsData)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        className="h-8 border-input"
        onClick={handlePDFExport}
        disabled={isGenerating || !overviewData || !flowsData}
      >
        <FileDown className="mr-1.5 size-4" />
        Rapport PDF
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 border-input"
        onClick={handleCSVExport}
        disabled={isGenerating || !flowsData}
      >
        <Download className="mr-1.5 size-4" />
        CSV Export
      </Button>
    </div>
  )
}