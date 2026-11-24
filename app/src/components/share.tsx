import { useState } from "react"
import { Share2, Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePeriodInfo } from "@/legacy/bridge"

export function ShareButton({ title, kpis }: { title: string; kpis?: { label: string; value: string }[] }) {
  const [copied, setCopied] = useState(false)
  const period = usePeriodInfo()

  const handleShare = async () => {
    // 1. Générer le lien de partage avec paramètres
    const params = new URLSearchParams({
      t: window.location.pathname.split("/").pop() || "overview",
      p: period?.key || "all",
    })
    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`

    // 2. Copier les informations dans le presse-papier
    const shareText = period
      ? `${title}\n\nPériode: ${period.label}\n\nKPIs:\n${kpis?.map(k => `• ${k.label}: ${k.value}`).join("\n") || ""}`
      : `${title}\n\n${kpis?.map(k => `• ${k.label}: ${k.value}`).join("\n") || ""}`

    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      // Fallback pour navigateurs sans clipboard API
      navigator.clipboard.writeText(shareText).catch(() => {
        // Dernière alternative : créer un textarea temporaire
        const ta = document.createElement("textarea")
        ta.value = shareText
        document.body.appendChild(ta)
        ta.select()
        document.execCommand("copy")
        document.body.removeChild(ta)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(
        "ml-auto inline-flex items-center gap-1.5 rounded-md bg-muted/30 px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      )}
      title="Partager cette analyse">
      {copied ? (
        <>
          <Check className="size-3.5 text-green-500" />
          <span className="text-green-600 dark:text-green-400">Copié !</span>
        </>
      ) : (
        <>
          <Share2 className="size-3.5" />
          <span>Partager</span>
        </>
      )}
    </button>
  )
}

/** Bouton mini de partage pour les titres de section (sans KPI) */
export function ShareLink({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)
  const period = usePeriodInfo()

  const handleShare = async () => {
    const params = new URLSearchParams({
      t: window.location.pathname.split("/").pop() || "overview",
      p: period?.key || "all",
    })
    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`
    const shareText = period
      ? `${title}\n\nPériode: ${period.label}\n${shareUrl}`
      : `${title}\n\n${shareUrl}`

    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = shareText
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(
        "ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      )}
      title="Partager cette section">
      {copied ? (
        <Check className="size-3 text-green-500" />
      ) : (
        <Copy className="size-3" />
      )}
    </button>
  )
}