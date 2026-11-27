// Onglet « Flux », en React. Les chiffres viennent de l'ancien code (événement legacy:flows).
import { ArrowRight, Share2 } from "lucide-react"
import { ChannelAvatar } from "@/components/channel-avatar"
import { ChannelCell, DataTable, Empty, MeterList, Section, muted, panel, type Col, Pending } from "@/components/overview/parts"
import { Kpis } from "@/components/shared/blocks"
import { SankeyDiagram, type SankeyNode, type SankeyLink } from "@/components/charts/sankey"
import { FlowsMap, daysFromByDay, mapOrder } from "@/components/flows/flows-map"
import { fmt } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useFlowsData, type FlowsData, type FlowRoute, triggerFlowsRender } from "@/legacy/bridge"
import { useState, useMemo, useEffect, useRef } from "react"

type Bal = FlowsData["balance"][number]
type Raid = FlowsData["raids"][number]

function Balance({ rows }: { rows: Bal[] }) {
  const mx = Math.max(1, ...rows.map((r) => Math.abs(r.net)))
  const cols: Col<Bal>[] = [
    { head: "Chaîne", left: true, cell: (r) => <ChannelCell who={r} /> },
    { head: "Arrivent d'une autre chaîne", cell: (r) => fmt(r.in) },
    { head: "Partent vers une autre chaîne", cell: (r) => fmt(r.out) },
    {
      head: "Solde",
      title: "Arrivées − départs",
      cell: (r) => (
        <span className="inline-flex items-center justify-end gap-2.5">
          {/* barre centrée : à droite si la chaîne gagne des viewers, à gauche si elle en perd */}
          <span aria-hidden className="relative hidden h-1.5 w-24 overflow-hidden rounded-full bg-white/5 sm:block">
            <span className="absolute inset-y-0 left-1/2 w-px bg-white/15" />
            <span
              className={cn("absolute inset-y-0 rounded-full", r.net >= 0 ? "left-1/2 bg-signal-green" : "right-1/2 bg-destructive")}
              style={{ width: `${(Math.abs(r.net) / mx) * 50}%` }}
            />
          </span>
          <span className={cn("min-w-12", r.net > 0 ? "text-signal-green" : r.net < 0 ? "text-destructive" : undefined)}>{(r.net > 0 ? "+" : "") + fmt(r.net)}</span>
        </span>
      ),
    },
  ]
  return <DataTable cols={cols} rows={rows} rowKey={(r) => r.c} />
}

function Raids({ rows }: { rows: Raid[] }) {
  const cols: Col<Raid>[] = [
    { head: "Quand", left: true, cell: (r) => <span className="whitespace-nowrap">{r.when}</span> },
    { head: "De", left: true, cell: (r) => (r.from ? <span className="inline-flex items-center gap-2"><ChannelAvatar {...r.from} /><span className="font-medium">{r.from.name}</span></span> : muted("—")) },
    { head: "Vers", left: true, cell: (r) => <ChannelCell who={r.to} /> },
    { head: "Viewers", cell: (r) => fmt(r.n) },
  ]
  return <DataTable cols={cols} rows={rows} rowKey={(r) => r.when + r.to.c + (r.from?.c ?? "")} />
}

// Convertir les flux en nœuds Sankey
function flowsToSankeyNodesAndLinks(flows: FlowRoute[], allChannels: string[]): { nodes: SankeyNode[]; links: SankeyLink[] } {
  // Collecter tous les nœuds uniques
  const nodeMap = new Map<string, SankeyNode & { incoming: number; outgoing: number }>()

  // Initialiser les nœuds depuis les chaînes connues
  allChannels.forEach(c => {
    // Couleur par défaut - sera mise à jour
    nodeMap.set(c, { id: c, label: c, color: "#666", incoming: 0, outgoing: 0 })
  })

  // Calculer les totaux et créer les nœuds
  for (const f of flows) {
    if (!nodeMap.has(f.a.c)) {
      nodeMap.set(f.a.c, { id: f.a.c, label: f.a.c, color: f.a.color, incoming: 0, outgoing: 0 })
    }
    if (!nodeMap.has(f.b.c)) {
      nodeMap.set(f.b.c, { id: f.b.c, label: f.b.c, color: f.b.color, incoming: 0, outgoing: 0 })
    }
    nodeMap.get(f.a.c)!.outgoing += f.n
    nodeMap.get(f.b.c)!.incoming += f.n
  }

  const nodes: SankeyNode[] = Array.from(nodeMap.values()).map(n => ({
    id: n.id,
    label: n.label,
    color: n.color,
  }))

  const links: SankeyLink[] = flows.map(f => ({
    source: f.a.c,
    target: f.b.c,
    value: f.n,
  }))

  return { nodes, links }
}

export function Flows() {
  const d = useFlowsData()
  const hasTriggeredRef = useRef(false)

  // Forcer le recalcul des flux si les données sont pas encore arrivées (une seule fois)
  useEffect(() => {
    if (!d && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true
      triggerFlowsRender()
    }
  }, [d])

  // Tous les hooks AVANT le retour anticipé : React exige le même nombre de hooks à chaque rendu. Placés après
  // `if (!d) return`, ils n'existaient pas au premier rendu (données absentes) puis apparaissaient à l'arrivée des
  // données : React levait « Rendered more hooks than during the previous render » et l'onglet plantait.
  const displayFlows = useMemo<FlowRoute[]>(() => d?.flows ?? [], [d])

  // Pour le Sankey : nœuds et liens des flux affichés
  const { nodes, links } = useMemo(() => {
    const channels = new Set<string>()
    for (const f of displayFlows) {
      channels.add(f.a.c)
      channels.add(f.b.c)
    }
    return flowsToSankeyNodesAndLinks(displayFlows, Array.from(channels))
  }, [displayFlows])

  // Carte des migrations : une journée à la fois, à partir de byDay (absent tant que la base n'est pas à jour : pas de carte)
  const byDay = d?.byDay
  const mapDays = useMemo(() => (byDay?.length ? daysFromByDay(byDay) : []), [byDay])
  const mapOrder_ = useMemo(() => mapOrder(mapDays), [mapDays])
  const hasMap = mapDays.length > 0

  // byDay arrive en second (le Sankey s'affiche d'abord) : la mention « indisponibles » n'apparaît qu'après quelques secondes sans données
  const [lateMap, setLateMap] = useState(false)
  useEffect(() => {
    setLateMap(false)
    if (!d || hasMap) return
    const id = setTimeout(() => setLateMap(true), 4000)
    return () => clearTimeout(id)
  }, [!!d, hasMap]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!d) return <Pending />

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <h2 className="mb-4 text-base font-semibold">Flux de viewers</h2>

      <Kpis
        items={[
          { label: "Migrations", value: fmt(d.total), hint: d.routes ? `personnes comptées une fois par trajet, sur ${fmt(d.routes)} trajets` : "" },
          { label: "Délai médian", value: d.medianGap || "—", hint: "entre le dernier message chez A et le premier chez B" },
          { label: "Raids reçus", value: fmt(d.raidCount) },
          { label: "Viewers apportés", value: fmt(d.raidViewers) },
        ]}
      />

      {/* Sankey (la période) et, à côté, la carte des migrations (un jour à la fois). Sans byDay : le Sankey seul, comme avant. */}
      <div className={cn("mt-4", hasMap && "grid gap-x-4 gap-y-9 lg:grid-cols-2 [&>*]:mt-0 [&>*]:min-w-0")}>
        <Section title="Diagramme de flux">
          {links.length > 0 ? (
            <div className={cn(panel, "p-2")}>
              <SankeyDiagram nodes={nodes} links={links} height={180} />
            </div>
          ) : (
            <Empty>Aucun flux à afficher.</Empty>
          )}
        </Section>
        {hasMap && (
          <Section
            title="Carte des migrations"
            note={<>Une flèche = des viewers actifs qui écrivent chez A, puis chez B moins de 3 h après, <b>le même jour</b>. À droite, vers une chaîne placée plus bas ; à gauche, vers une chaîne placée plus haut. Épaisseur : même échelle pour toutes les journées. Les 12 plus gros trajets du jour. « raid » : un raid a eu lieu sur ce trajet ce jour-là.</>}
          >
            <div className={cn(panel, "p-4")}>
              <FlowsMap days={mapDays} order={mapOrder_} onlyActive />
            </div>
          </Section>
        )}
      </div>
      {!hasMap && lateMap && <p className="mt-2 px-0.5 text-xs text-dusk">Carte des migrations : données par jour indisponibles.</p>}

      <Section className="mt-4" title="Migrations de viewers actifs" note="Une migration = quelqu'un qui écrit chez A, puis chez B moins de 3 h après son dernier message chez A. « raid » : un raid a eu lieu sur ce trajet ; on ne sait pas quels passages en viennent.">
        {displayFlows.length ? (
          <div className={cn(panel, "px-4 py-2")}>
            <MeterList
              wide
              rows={displayFlows.map((f) => ({
                key: f.a.c + ">" + f.b.c, v: f.n,
                right: <>{fmt(f.n)} pers.{f.gap && <> · délai médian {f.gap}</>}{f.raid && <span className="text-primary-soft"> · raid</span>}</>,
                label: (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <ChannelAvatar {...f.a} /><span className="truncate">{f.a.c}</span>
                    <ArrowRight className="size-3.5 shrink-0 text-dusk" />
                    <ChannelAvatar {...f.b} /><span className="truncate">{f.b.c}</span>
                  </span>
                ),
              }))}
            />
          </div>
        ) : (
          <Empty>Aucune migration repérée pour l'instant.</Empty>
        )}
      </Section>

      <Section className="mt-4" title="Bilan par chaîne" note={d.balance.length ? "Un solde positif = la chaîne récupère plus de viewers actifs des autres qu'elle ne leur en envoie." : undefined}>
        {d.balance.length ? <Balance rows={d.balance} /> : <Empty>Pas encore de données.</Empty>}
      </Section>

      <Section className="mt-4" title="Raids reçus" note="On ne voit que les raids qui arrivent sur une chaîne suivie (l'annonce passe dans le chat de celle qui reçoit).">
        {d.raids.length ? <Raids rows={d.raids} /> : <Empty>Aucun raid reçu par les chaînes suivies sur cette période.</Empty>}
      </Section>
    </div>
  )
}