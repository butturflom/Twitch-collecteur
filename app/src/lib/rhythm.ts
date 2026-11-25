// Alerte de rythme d'une chaîne : ses viewers actifs par jour sur les 7 derniers jours agrégés, comparés aux jours d'avant.
// Deux conditions, pour ne pas crier au loup : un écart d'au moins 15 %, et hors des variations habituelles de la chaîne (plus de 2 erreurs
// types de la moyenne de 7 jours). Une petite chaîne est plus irrégulière : son écart type est plus grand, il lui faut un changement plus net.
import type { RhythmRow } from "@/legacy/bridge"

/** Viewers actifs par jour avant lesquels on ne dit rien : trop peu pour parler de rythme. */
export const RHYTHM_BASE_MIN = 30
export const RHYTHM_REL = 0.15
export const RHYTHM_Z = 2

export type Rhythm = { kind: "up" | "down"; rel: number; z: number }

export function rhythmOf(r: Pick<RhythmRow, "nr" | "recent" | "base" | "sd">): Rhythm | null {
  if (!(r.base >= RHYTHM_BASE_MIN) || r.nr < 2) return null
  const rel = (r.recent - r.base) / r.base
  const se = r.sd / Math.sqrt(r.nr)
  const z = se > 0 ? (r.recent - r.base) / se : Math.sign(rel) * Infinity // aucune variation avant : tout écart est net
  if (Math.abs(rel) < RHYTHM_REL || Math.abs(z) < RHYTHM_Z) return null
  return { kind: rel > 0 ? "up" : "down", rel, z }
}
