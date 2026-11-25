// Taille des chaînes suivies, pour situer une chaîne parmi les autres : viewers actifs uniques sur 30 jours (esquisses HyperLogLog,
// fonction SQL period_reach). Sert à « Son univers » (chaînes juste au-dessus) et à la fidélité comparée aux chaînes de taille voisine.
import type { PeriodReach } from "@/legacy/bridge"

export type Sized = { c: string; n: number }

/** Les chaînes suivies de la plus grande à la plus petite. Vide si aucune journée n'est encore agrégée. */
export function bySize(reach: PeriodReach | null, wanted: string[]): Sized[] {
  if (!reach || reach.days <= 0) return []
  const set = new Set(wanted)
  return reach.chans.filter((x) => set.has(x.c) && x.n > 0).sort((a, b) => b.n - a.n)
}

/** Rang (à partir de 0) d'une chaîne, -1 si elle n'a pas de taille connue. */
export const rankOf = (sized: Sized[], c: string) => sized.findIndex((x) => x.c === c)

/** Les k chaînes les plus proches en taille (au-dessus et au-dessous), sans la chaîne elle-même. */
export function peersOf(sized: Sized[], c: string, k: number): Sized[] {
  const i = rankOf(sized, c)
  if (i < 0) return []
  const me = sized[i].n
  return sized.filter((x) => x.c !== c).sort((a, b) => Math.abs(Math.log(a.n / me)) - Math.abs(Math.log(b.n / me))).slice(0, k)
}
