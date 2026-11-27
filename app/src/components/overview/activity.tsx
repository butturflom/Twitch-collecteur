// Vue d'ensemble → bloc d'activité de la période, en tête de page : ce que Twitch annonce (pic de viewers simultanés, chaînes
// passées en live) séparé de ce que le chat montre (viewers actifs). Calculs : activityData() dans legacy.js.
import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { StatCard, StatCardGroup } from "@/components/ui/stat-card"
import { fmt } from "@/lib/format"
import { cn } from "@/lib/utils"
import { atTime, dayOnly, dayTime, longDay, span } from "./dates"
import type { ActivityData, Kpi, PeriodInfo } from "@/legacy/bridge"

/** L'indicateur qui mène à l'onglet Audiences. */
const MULTI = "Actifs dans 2 chats ou plus"
const plural = (n: number, one: string, many = one + "s") => (n > 1 ? many : one)

/** « Aujourd’hui · vendredi 27 novembre, jusqu’à 21 h 40 » ou « Tout · du 23 au 27 novembre ». */
function title(a: ActivityData, p: PeriodInfo | undefined) {
  if (!p) return "Activité sur la période"
  if (a.from == null || a.to == null) return `${p.label} · pas encore de relevé`
  if (p.key === "today") {
    return `Aujourd’hui · ${longDay(a.to)}, ${a.partial ? `de ${atTime(a.from)} à` : "jusqu’à"} ${atTime(a.to)}`
  }
  const days = dayOnly(a.from) === dayOnly(a.to) ? longDay(a.to) : `du ${span(a.from, a.to)}`
  return `${p.label} · ${days}`
}

const group = "rounded-none bg-transparent shadow-none [&>[data-slot=stat-card]]:flex-[1_1_9rem] [&>[data-slot=stat-card]>div:first-child]:min-h-10 [&>[data-slot=stat-card]>div:first-child>span]:whitespace-normal"

function Cluster({ head, className, children }: { head: string; className: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={head} className={cn("-mt-px -ml-px flex min-w-0 flex-col border-t border-l border-border", className)}>
      <h3 className="px-[18px] pt-3 text-xs font-medium text-dusk">{head}</h3>
      <StatCardGroup className={cn(group, "flex-1")}>{children}</StatCardGroup>
    </div>
  )
}

export function Activity({ a, kpis, period, hasApi }: { a: ActivityData; kpis: Kpi[]; period: PeriodInfo | undefined; hasApi: boolean }) {
  const today = period?.key === "today"
  const noApi = "il faut l’API Twitch"
  const peakHint = a.peak == null || a.peakAt == null
    ? hasApi ? "aucun relevé de viewers sur la période" : noApi
    : `${today ? "à" : "le"} ${today ? atTime(a.peakAt) : dayTime(a.peakAt)} · ${a.filtered ? "les chaînes affichées ensemble" : "toutes tes chaînes ensemble"}`
  const livedHint = a.lived == null
    ? hasApi ? "aucun relevé de viewers sur la période" : noApi
    : `sur ${fmt(a.followed)} ${a.filtered ? "affichées" : plural(a.followed, "suivie")}${a.liveNow != null ? ` · ${fmt(a.liveNow)} en ce moment` : ""}`

  return (
    <div role="region" aria-label="Activité">
      <h2 className="mb-3 flex flex-wrap items-center gap-2.5 text-[15px] font-semibold tracking-[-0.015em] text-balance">
        {title(a, period)}
        {(!hasApi || a.from == null || a.partial) && <Badge variant="secondary" className="h-4.5 px-2 text-[11px]">Données incomplètes</Badge>}
      </h2>
      {a.partial && a.from != null && a.to != null && (
        <p className="mb-3 max-w-[92ch] text-[12.5px] leading-relaxed text-muted-foreground">
          Les relevés détaillés ne remontent qu’au <b className="font-semibold text-foreground">{dayTime(a.from)}</b>
          {a.asked != null && a.asked > 1 ? <> : ces chiffres ne couvrent pas les {a.asked} jours demandés.</> : <> : ces chiffres ne couvrent pas toute la journée.</>}
          {a.asked != null && a.asked > 1 && <> Le jour par jour, juste en dessous, remonte plus loin.</>}
        </p>
      )}
      <div className="flex flex-wrap overflow-hidden rounded-[14px] border border-border bg-linear-to-b from-dome-crest/90 to-dome/85 shadow-console">
        <Cluster head="Sur Twitch · nombre annoncé" className="flex-[1_1_21rem]">
          <StatCard variant="plain" className="px-[18px] pt-2 pb-4" label="Pic de viewers simultanés" value={a.peak != null ? fmt(a.peak) : null} hint={peakHint} />
          <StatCard variant="plain" className="px-[18px] pt-2 pb-4" label="Chaînes passées en live" value={a.lived != null ? fmt(a.lived) : null} hint={livedHint} />
        </Cluster>
        <Cluster head="Dans le chat · viewers actifs" className="flex-[2_1_36rem]">
          {kpis.map((k) => (
            <StatCard key={k.label} variant="plain" className="px-[18px] pt-2 pb-4"
              label={k.label === MULTI ? <a href="#" data-goto="audiences" data-part="haut" className="-my-1 inline-block py-1 underline decoration-dusk decoration-dotted underline-offset-[3px] hover:text-foreground">{k.label}</a> : k.label}
              value={k.value} hint={k.hint || undefined} trend={k.trend ?? undefined} trendLabel={k.trendLabel || undefined} />
          ))}
        </Cluster>
      </div>
      {a.gapMs > 0 && (
        <p className="mt-2.5 max-w-[72ch] px-0.5 text-xs leading-relaxed text-dusk">
          Le collecteur n’a rien écouté pendant {duration(a.gapMs)} sur cette période : le pic a pu être manqué, et les totaux sont plus bas que la réalité.
        </p>
      )}
    </div>
  )
}

function duration(ms: number) {
  const m = Math.round(ms / 60000)
  if (m < 60) return `${m} min`
  if (m < 48 * 60) return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`
  return `${Math.round(m / 1440)} jours`
}
