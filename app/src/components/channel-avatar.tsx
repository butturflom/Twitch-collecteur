// Planète d'une chaîne : sa photo de profil collée sur une planète à facettes (forme tirée de son nom), sa couleur sur le bord,
// et un anneau fin pour les chaînes les plus fortes de la vue en cours. La composition est dans lib/planet.ts (même cache que
// l'ancien code : av() et la Carte de legacy.js), le style dans index.css (.planet).
// À partir de 20 px : atmosphère (halo ambiant de la couleur, très doux), et initiale si la photo manque. Sous 20 px (légendes,
// filtres) : la planète seule, sans initiale, halo ni anneau.
import { useMemo, type CSSProperties } from "react"
import { cn } from "@/lib/utils"
import { hasRing, planetColor, planetInner } from "@/lib/planet"
import type { Who } from "@/legacy/bridge"

export function ChannelAvatar({ c, color, img, size = 20, className }: Omit<Who, "img"> & { img?: string; size?: number; className?: string }) {
  const small = size < 20
  const col = planetColor(c, color)
  const style = { "--s": `${size}px`, "--c": col } as CSSProperties
  const html = planetInner(c, !small && hasRing(c), col, img, !small)
  // même objet tant que le balisage ne change pas : React ne réécrit pas l'image à chaque rendu
  const inner = useMemo(() => ({ __html: html }), [html])
  return <span aria-hidden className={cn("planet", className)} data-xs={small ? "" : undefined} style={style} dangerouslySetInnerHTML={inner} />
}
