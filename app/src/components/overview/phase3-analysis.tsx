// Module Phase 3 : Top Streamers et Communautés Investies
// Fournit des analyses avancées basées sur les données collectées
import { useState } from "react"
import { useOverviewData, type TopStreamerRow, type InvestedCommunityRow } from "@/legacy/bridge"
import { StatCard } from "@/components/ui/stat-card"
import { cn } from "@/lib/utils"
import { fmt, fmt1, pct } from "@/lib/format"
import { quartiles } from "@/lib/universe"
import { ChannelCell, DataTable, Section, Empty, heat, type Col } from "./parts"

/** Followers au premier relevé en dessous desquels un pourcentage de croissance ne dit rien (une chaîne passée de 60 à 110
 *  followers affiche 83 %, une autre de 1 à 1 790 affiche 179 000 %). Sous ce seuil la ligne montre « — ». */
export const GROWTH_BASE_MIN = 100
/** Nombre minimal de chaînes (de base suffisante) pour donner une médiane. */
const GROWTH_CHANS_MIN = 3
const hasGrowth = (r: TopStreamerRow) => r.growth != null && r.growthBase != null && r.growthBase >= GROWTH_BASE_MIN

// Ré-export des types pour compatibilité avec d'anciens imports
export type { TopStreamerRow, InvestedCommunityRow }

/** Choix du classement affiché : deux onglets plutôt que deux longs blocs l'un sous l'autre. */
type Tab = "top" | "invested"
function TabBar({ tab, onPick, nTop, nInv }: { tab: Tab; onPick: (t: Tab) => void; nTop: number; nInv: number }) {
  const items: [Tab, string, number][] = [["top", "Top des chaînes", nTop], ["invested", "Communautés investies", nInv]]
  return (
    <div role="group" aria-label="Classement affiché" className="mb-4 inline-flex gap-0.5 rounded-lg border border-white/5 bg-zinc-950/80 p-1">
      {items.map(([k, label, n]) => (
        <button key={k} type="button" aria-pressed={tab === k} onClick={() => onPick(k)}
          className={cn("flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium whitespace-nowrap transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none",
            tab === k ? "bg-zinc-800 text-white ring-1 ring-white/10" : "text-zinc-400 hover:bg-white/[.03] hover:text-zinc-100")}>
          {label}<span className={cn("font-mono text-[10.5px] tabular-nums", tab === k ? "text-zinc-400" : "text-dusk")}>{n}</span>
        </button>
      ))}
    </div>
  )
}

// Composant affichant les analyses Phase 3 : classement des chaînes et communautés investies, sous un seul titre
export function Phase3Analysis() {
  const d = useOverviewData()
  const [tab, setTab] = useState<Tab>("top")

  // Les données sont déjà calculées dans legacy.js, on les utilise directement
  const topStreamers = d?.topStreamers || []
  const investedCommunities = d?.investedCommunities || []
  // la croissance n'est donnée que pour les chaînes dont la base est assez grande ; la médiane résiste aux valeurs extrêmes d'une petite base
  const growable = topStreamers.filter(hasGrowth)
  const growthMedian = quartiles(growable.map((r) => r.growth!), GROWTH_CHANS_MIN)?.med ?? null

  if (!d) return <PendingPhase3 />

  return (
    <Section title="Classements · audience et communautés">
      <TabBar tab={tab} onPick={setTab} nTop={topStreamers.length} nInv={investedCommunities.length} />
      {tab === "top" && (
        <>
        {topStreamers.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <StatCard
                label="Viewers totaux"
                value={fmt(topStreamers.reduce((s, r) => s + r.viewers, 0))}
                hint="Somme des moyennes par chaîne : un même viewer peut compter dans plusieurs"
              />
              <StatCard
                label="Peak maximum"
                value={fmt(Math.max(...topStreamers.map(r => r.peakViewers)))}
                hint="Plus haut pic d'audience relevé"
              />
              <StatCard
                label="Heures cumulées"
                value={fmt(topStreamers.reduce((s, r) => s + r.hours, 0))}
                hint="Heures de stream cumulées"
              />
              <StatCard
                label="Croissance médiane"
                value={growthMedian == null ? "—" : pct(growthMedian / 100)}
                hint={growthMedian == null
                  ? `Moins de ${GROWTH_CHANS_MIN} chaînes avec au moins ${fmt(GROWTH_BASE_MIN)} followers au départ : pas de médiane`
                  : `Médiane des followers gagnés, sur ${growable.length} chaîne${growable.length > 1 ? "s" : ""} de ${fmt(GROWTH_BASE_MIN)} followers ou plus au départ`}
              />
            </div>
            <TopStreamersTable rows={topStreamers} />
          </>
        ) : (
          <Empty>
            Pas encore assez de données pour classer les chaînes : il faut au moins un relevé de viewers par chaîne et des viewers actifs sur la période.
          </Empty>
        )}
        </>
      )}

      {tab === "invested" && (
        <>
        {investedCommunities.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <StatCard
                label="Subs totaux"
                value={fmt(investedCommunities.reduce((s, r) => s + r.subs, 0))}
                hint="Abonnés + subs offerts"
              />
              <StatCard
                label="Bits totaux"
                value={fmt(investedCommunities.reduce((s, r) => s + r.bits, 0))}
                hint="Bits cheered cumulés"
              />
              <StatCard
                label="Raids reçus"
                value={fmt(investedCommunities.reduce((s, r) => s + r.raidsReceived, 0))}
                hint="Nombre de raids reçus"
              />
              <StatCard
                label="Chaînes classées"
                value={fmt(investedCommunities.length)}
                hint="Au moins 10 min de live et 50 viewers en moyenne"
              />
            </div>
            <InvestedCommunitiesTable rows={investedCommunities} />
          </>
        ) : (
          <Empty>
            Pas encore assez de données : il faut une chaîne avec au moins 10 minutes de live et 50 viewers en moyenne sur la période (API Twitch requise).
          </Empty>
        )}
        </>
      )}
    </Section>
  )
}

function PendingPhase3() {
  return (
    <div className="py-4 text-center text-muted-foreground">
      <p>Calcul des analyses avancées...</p>
    </div>
  )
}

function TopStreamersTable({ rows }: { rows: TopStreamerRow[] }) {
  const maxV = Math.max(1, ...rows.map((r) => r.viewers))
  const cols: Col<TopStreamerRow>[] = [
    { head: "Chaîne", left: true, cell: (r) => <ChannelCell who={r} />, style: (r) => heat((r.viewers / maxV) * 0.4) },
    { head: "Viewers", cell: (r) => fmt(r.viewers) },
    { head: "Peak", cell: (r) => fmt(r.peakViewers) },
    { head: "Heures", cell: (r) => `${r.hours} h` },
    { head: "Croissance", cell: (r) => (hasGrowth(r) ? pct(r.growth! / 100) : "—") },
    { head: "Jours actifs", cell: (r) => fmt(r.activeDays) },
  ]

  return <DataTable limit={10} cols={cols} rows={rows} rowKey={(r) => r.c} />
}

function InvestedCommunitiesTable({ rows }: { rows: InvestedCommunityRow[] }) {
  const maxP = Math.max(0, ...rows.map((r) => r.perMin)) || 1
  const cols: Col<InvestedCommunityRow>[] = [
    { head: "Chaîne", left: true, cell: (r) => <ChannelCell who={r} />, style: (r) => heat((r.perMin / maxP) * 0.4) },
    { head: "Viewers moyens", cell: (r) => fmt(r.viewers) },
    { head: "Écrivent chaque minute", title: "Viewers actifs différents par minute ÷ viewers : c'est l'ordre du classement", cell: (r) => pct(r.perMin) },
    { head: "Msg/min pour 1 000 viewers", cell: (r) => fmt1(r.msgK) },
    { head: "Subs pour 1 000 viewers", title: "Abonnements et subs offerts de la période, pour 1 000 viewers en moyenne", cell: (r) => fmt1(r.subsK) },
    { head: "Subs", cell: (r) => fmt(r.subs) },
    { head: "Bits", cell: (r) => fmt(r.bits) },
    { head: "Raids", cell: (r) => `${fmt(r.raidsReceived)} (${fmt(r.raidsViewers)} viewers)` },
  ]

  return <DataTable limit={10} cols={cols} rows={rows} rowKey={(r) => r.c} />
}
