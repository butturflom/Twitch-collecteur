// Module Phase 3 : Top Streamers et Communautés Investies
// Fournit des analyses avancées basées sur les données collectées
import { useOverviewData, type TopStreamerRow, type InvestedCommunityRow } from "@/legacy/bridge"
import { StatCard } from "@/components/ui/stat-card"
import { fmt, pct } from "@/lib/format"
import { DataTable, Section, Empty, heat } from "./parts"

// Ré-export des types pour compatibilité avec d'anciens imports
export type { TopStreamerRow, InvestedCommunityRow }

// Composant affichant les analyses Phase 3
export function Phase3Analysis() {
  const d = useOverviewData()

  // Les données sont déjà calculées dans legacy.js, on les utilise directement
  const topStreamers = d?.topStreamers || []
  const investedCommunities = d?.investedCommunities || []

  if (!d) return <PendingPhase3 />

  return (
    <div className="space-y-6">
      {/* Top Streamers */}
      <Section title="Top Streamers - Analyse des Viewers">
        {topStreamers.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <StatCard
                label="Viewers totaux"
                value={fmt(topStreamers.reduce((s, r) => s + r.viewers, 0))}
                hint="Moyenne des viewers en direct"
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
                label="Croissance moyenne"
                value={pct(topStreamers.reduce((s, r) => s + (r.growth || 0), 0) / topStreamers.length)}
                hint="Croissance moyenne des followers"
              />
            </div>
            <TopStreamersTable rows={topStreamers} />
          </>
        ) : (
          <Empty>
            Pas assez de données pour calculer les Top Streamers.
            Besoin d'au moins 1 snapshot par chaîne et de données de présence.
          </Empty>
        )}
      </Section>

      {/* Communautés Investies */}
      <Section title="Communautés Investies - Taux d'Interaction">
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
                label="Viewers moyens"
                value={fmt(investedCommunities.reduce((s, r) => s + r.viewers, 0) / investedCommunities.length)}
                hint="Viewers moyens par chaîne"
              />
            </div>
            <InvestedCommunitiesTable rows={investedCommunities} />
          </>
        ) : (
          <Empty>
            Pas assez de données pour calculer les Communautés Investies.
            Besoin de données d'événements (subs, bits, raids).
          </Empty>
        )}
      </Section>
    </div>
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
  const cols = [
    { head: "Chaîne", left: true, cell: (r: TopStreamerRow) => `<span style="color:${heat((r.viewers/1000)*0.3)}">${r.c}</span>` },
    { head: "Viewers", cell: (r: TopStreamerRow) => fmt(r.viewers) },
    { head: "Peak", cell: (r: TopStreamerRow) => fmt(r.peakViewers) },
    { head: "Heures", cell: (r: TopStreamerRow) => `${r.hours} h` },
    { head: "Croissance", cell: (r: TopStreamerRow) => r.growth != null ? pct(r.growth / 100) : "—" },
    { head: "Jours actifs", cell: (r: TopStreamerRow) => fmt(r.activeDays) },
  ]

  return (
    <DataTable
      cols={cols}
      rows={rows.map(r => ({ ...r, c: r.c }))}
      rowKey={(r) => r.c}
    />
  )
}

function InvestedCommunitiesTable({ rows }: { rows: InvestedCommunityRow[] }) {
  const cols = [
    { head: "Chaîne", left: true, cell: (r: InvestedCommunityRow) => `<span style="color:${heat(((r.interactions||0)/1000)*0.3)}">${r.c}</span>` },
    { head: "Viewers", cell: (r: InvestedCommunityRow) => fmt(r.viewers) },
    { head: "Interactions", cell: (r: InvestedCommunityRow) => fmt(r.interactions || 0) },
    { head: "Taux d'interaction", cell: (r: InvestedCommunityRow) => r.interactionRate != null ? pct(r.interactionRate / 100) : "—" },
    { head: "Subs", cell: (r: InvestedCommunityRow) => fmt(r.subs) },
    { head: "Bits", cell: (r: InvestedCommunityRow) => fmt(r.bits) },
    { head: "Raids", cell: (r: InvestedCommunityRow) => `${fmt(r.raidsReceived)} (${fmt(r.raidsViewers)} viewers)` },
  ]

  return (
    <DataTable
      cols={cols}
      rows={rows.map(r => ({ ...r, c: r.c }))}
      rowKey={(r) => r.c}
    />
  )
}