// Dates à l'heure de Paris, aux mêmes formats que l'ancien code (hhmm, dayLbl, dayKey dans legacy.js).
const TZ = "Europe/Paris"
const parts = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
const day = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" })
const dayShort = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, day: "2-digit", month: "2-digit" })

function tz(t: number) {
  const o: Record<string, string> = {}
  for (const p of parts.formatToParts(t)) o[p.type] = p.value
  return o
}
/** « 18h47 » */
export const hhmm = (t: number) => { const p = tz(t); return `${p.hour}h${p.minute}` }
/** « mer. 19 nov. » */
export const dayLbl = (t: number) => day.format(t)
/** « 19/11 » : pour les axes étroits, où « mer. 19 nov. » se chevauche */
export const dayNum = (t: number) => dayShort.format(t)
/** « 2026-11-19 » */
export const dayKey = (t: number) => { const p = tz(t); return `${p.year}-${p.month}-${p.day}` }
/** « mer. 19 nov. · 18h47 » */
export const when = (t: number) => `${dayLbl(t)} · ${hhmm(t)}`
