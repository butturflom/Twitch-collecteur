// Photo d'une chaîne, cerclée de sa couleur ; l'initiale sur sa couleur si pas de photo (ou lien périmé).
// À partir de 20 px, c'est une petite planète : atmosphère (halo de sa couleur) et relief (lumière en haut à gauche, ombre en bas à droite).
// La photo reste lisible : le relief est un voile léger posé dessus, jamais un filtre.
// Pas de classe « av » : l'ancien code remplace lui-même les <img class="av"> en erreur, ce qui casserait React.
import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Who } from "@/legacy/bridge"

/** Lumière douce en haut à gauche, ombre en bas à droite (même sens que les planètes de la Carte). */
const RELIEF = "radial-gradient(circle at 32% 26%, rgba(255,255,255,0.16), transparent 46%), radial-gradient(circle at 72% 78%, transparent 42%, rgba(5,4,20,0.42) 100%)"

export function ChannelAvatar({ c, color, img, size = 20, className }: Who & { size?: number; className?: string }) {
  const [broken, setBroken] = useState<string | null>(null)
  const ring = size >= 32 ? 2 : 1.5
  const planet = size >= 20
  const boxShadow =
    `0 0 0 ${ring}px var(--background), 0 0 0 ${ring * 2}px ${color}` +
    (planet ? `, 0 0 ${Math.round(size * 0.55)}px ${Math.round(size * 0.04)}px color-mix(in srgb, ${color} 40%, transparent)` : "") +
    (size >= 32 ? `, 0 8px 20px -8px ${color}` : "")
  const photo = !!img && broken !== img
  const letter = (c || "?")[0].toUpperCase()

  if (!planet) {
    // petites pastilles (légendes, filtres) : sans relief
    const style = { width: size, height: size, boxShadow }
    const cls = cn("inline-grid shrink-0 place-items-center rounded-full object-cover align-middle", className)
    return photo ? (
      <img src={img} alt="" loading="lazy" referrerPolicy="no-referrer" className={cls} style={style} onError={() => setBroken(img!)} />
    ) : (
      <span aria-hidden className={cn(cls, "font-semibold text-white")} style={{ ...style, fontSize: Math.round(size * 0.42), background: `color-mix(in srgb, ${color} 30%, var(--dome-crest))` }}>{letter}</span>
    )
  }
  return (
    <span aria-hidden={photo ? undefined : true} className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full align-middle", className)} style={{ width: size, height: size, boxShadow, background: photo ? undefined : `color-mix(in srgb, ${color} 30%, var(--dome-crest))` }}>
      {photo ? (
        <img src={img} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full rounded-full object-cover" onError={() => setBroken(img!)} />
      ) : (
        <span className="font-semibold text-white" style={{ fontSize: Math.round(size * 0.42) }}>{letter}</span>
      )}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full" style={{ background: RELIEF }} />
    </span>
  )
}
