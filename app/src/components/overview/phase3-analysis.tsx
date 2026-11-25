// Module Phase 3 : Top Streamers et Communautés Investies
// Fournit des analyses avancées basées sur les données collectées
import { useOverviewData, type TopStreamerRow, type InvestedCommunityRow } from "@/legacy/bridge"
import { StatCard } from "@/components/ui/stat-card"
import { fmt, pct } from "@/lib/format"
import { ChannelCell, DataTable, Section, Empty, heat, type Col } from "./parts"

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
      <Section title="Top des chaînes · analyse des viewers">
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
                label="Croissance moyenne"
                value={pct(topStreamers.reduce((s, r) => s + (r.growth || 0), 0) / topStreamers.length / 100)}
                hint="Croissance moyenne des followers"
              />
            </div>
            <TopStreamersTable rows={topStreamers} />
          </>
        ) : (
          <Empty>
            Pas encore assez de données pour classer les chaînes : il faut au moins un relevé de viewers par chaîne et des viewers actifs sur la période.
          </Empty>
        )}
      </Section>

      {/* Communautés Investies */}
      <Section title="Communautés investies · taux d'interaction">
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
            Pas encore assez de données pour mesurer l'investissement des communautés : il faut des événements (subs, bits, raids) sur la période.
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
  const maxV = Math.max(1, ...rows.map((r) => r.viewers))
  const cols: Col<TopStreamerRow>[] = [
    { head: "Chaîne", left: true, cell: (r) => <ChannelCell who={r} />, style: (r) => heat((r.viewers / maxV) * 0.4) },
    { head: "Viewers", cell: (r) => fmt(r.viewers) },
    { head: "Peak", cell: (r) => fmt(r.peakViewers) },
    { head: "Heures", cell: (r) => `${r.hours} h` },
    { head: "Croissance", cell: (r) => r.growth != null ? pct(r.growth / 100) : "—" },
    { head: "Jours actifs", cell: (r) => fmt(r.activeDays) },
  ]

  return <DataTable cols={cols} rows={rows} rowKey={(r) => r.c} />
}

function InvestedCommunitiesTable({ rows }: { rows: InvestedCommunityRow[] }) {
  const maxI = Math.max(1, ...rows.map((r) => r.interactions || 0))
  const cols: Col<InvestedCommunityRow>[] = [
    { head: "Chaîne", left: true, cell: (r) => <ChannelCell who={r} />, style: (r) => heat(((r.interactions || 0) / maxI) * 0.4) },
    { head: "Viewers", cell: (r) => fmt(r.viewers) },
    { head: "Interactions", cell: (r) => fmt(r.interactions || 0) },
    { head: "Taux d'interaction", cell: (r) => r.interactionRate != null ? pct(r.interactionRate / 100) : "—" },
    { head: "Subs", cell: (r) => fmt(r.subs) },
    { head: "Bits", cell: (r) => fmt(r.bits) },
    { head: "Raids", cell: (r) => `${fmt(r.raidsReceived)} (${fmt(r.raidsViewers)} viewers)` },
  ]

  return <DataTable cols={cols} rows={rows} rowKey={(r) => r.c} />
}