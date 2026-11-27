// Dates des blocs de tête de la Vue d'ensemble, en toutes lettres et à l'heure de Paris.
const TZ = "Europe/Paris"
const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, ...o })
const time = f({ hour: "numeric", minute: "2-digit", hourCycle: "h23" })
const long = f({ weekday: "long", day: "numeric", month: "long" })
const dayMonth = f({ day: "numeric", month: "long" })
const short = f({ weekday: "short", day: "numeric", month: "short" })
const only = f({ year: "numeric", month: "2-digit", day: "2-digit" })
const dayNo = f({ day: "numeric" })
const month = f({ year: "numeric", month: "2-digit" })

/** « 21 h 40 » (espaces insécables) */
export const atTime = (t: number) => time.format(t).replace(":", " h ")
/** « vendredi 27 novembre » */
export const longDay = (t: number) => long.format(t)
/** « 27/11/2026 », pour comparer deux jours */
export const dayOnly = (t: number) => only.format(t)
/** « jeu. 26 nov. à 18 h 05 » */
export const dayTime = (t: number) => `${short.format(t)} à ${atTime(t)}`
/** « 23 au 27 novembre », ou « 28 octobre au 27 novembre » à cheval sur deux mois */
export const span = (a: number, b: number) => `${month.format(a) === month.format(b) ? dayNo.format(a) : dayMonth.format(a)} au ${dayMonth.format(b)}`
