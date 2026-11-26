// Planète peinte d'une chaîne (décision du 26/11 : elle remplace la photo de profil, qui ne s'affiche plus ici).
// Corps dans la couleur de la chaîne, motif propre à son nom (bandes, cratères ou taches), initiale au centre, anneau fin
// pour les chaînes les plus fortes de la vue en cours. Le dessin est dans lib/planet.ts, le style dans index.css (.planet) :
// l'ancien code (av() de legacy.js) rend la même planète avec les mêmes fonctions.
// À partir de 20 px : initiale et atmosphère (halo ambiant de la couleur, très doux). Sous 20 px (légendes, filtres) : le corps
// et son relief seulement, sans initiale ni halo.
import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"
import { hasRing, planetColor, planetInner } from "@/lib/planet"
import type { Who } from "@/legacy/bridge"

export function ChannelAvatar({ c, color, size = 20, className }: Who & { size?: number; className?: string }) {
  const small = size < 20
  const style = { "--s": `${size}px`, "--c": planetColor(c, color) } as CSSProperties
  return (
    <span
      aria-hidden
      className={cn("planet", className)}
      data-xs={small ? "" : undefined}
      style={style}
      dangerouslySetInnerHTML={{ __html: planetInner(c, !small && hasRing(c)) }}
    />
  )
}
