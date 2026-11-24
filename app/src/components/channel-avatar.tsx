// Photo d'une chaîne, cerclée de sa couleur ; l'initiale sur sa couleur si pas de photo (ou lien périmé).
// Pas de classe « av » : l'ancien code remplace lui-même les <img class="av"> en erreur, ce qui casserait React.
import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Who } from "@/legacy/bridge"

export function ChannelAvatar({ c, color, img, size = 20, className }: Who & { size?: number; className?: string }) {
  const [broken, setBroken] = useState<string | null>(null)
  const ring = size >= 32 ? 2 : 1.5
  const style = {
    width: size, height: size,
    boxShadow: `0 0 0 ${ring}px var(--background), 0 0 0 ${ring * 2}px ${color}` + (size >= 32 ? `, 0 8px 20px -8px ${color}` : ""),
  }
  const cls = cn("inline-grid shrink-0 place-items-center rounded-full object-cover align-middle", className)
  if (img && broken !== img)
    return <img src={img} alt="" loading="lazy" referrerPolicy="no-referrer" className={cls} style={style} onError={() => setBroken(img)} />
  return (
    <span
      aria-hidden
      className={cn(cls, "font-semibold text-white")}
      style={{ ...style, fontSize: Math.round(size * 0.42), background: `color-mix(in srgb, ${color} 30%, var(--dome-crest))` }}
    >
      {(c || "?")[0].toUpperCase()}
    </span>
  )
}
