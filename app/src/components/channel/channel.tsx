// Onglet « Par chaîne », en React. Les chiffres viennent de l'ancien code (événement legacy:channel).
import React from "react"
import { ChannelAvatar } from "@/components/channel-avatar"
import { BarChart } from "@/components/charts/bar-chart"
import { LineChart } from "@/components/charts/line-chart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable, Delta, Empty, MeterList, Section, panel, type Col } from "@/components/overview/parts"
import { API_NOTE, CLIPS_NOTE, ChannelPicker, Clips, Hero, Kpis, Moments, NO_CLIPS, NO_MOMENTS, Two } from "@/components/shared/blocks"
import { fmt, fmt1, pct } from "@/lib/format"
import { cn } from "@/lib/utils"
import { History } from "./history"
import { Universe } from "./universe"
import { useChannelData, type SwitchRow } from "@/legacy/bridge"

// Copy raid command to clipboard and show feedback
function copyRaidCommand(channelName: string) {
  const cmd = `/raid ${channelName}`
  navigator.clipboard.writeText(cmd).then(() => {
    // Show a temporary toast-like feedback
    const event = new CustomEvent('raid-copied', { detail: { channel: channelName } })
    window.dispatchEvent(event)
  })
}

function Switches({ rows }: { rows: SwitchRow[] }) {
  const cols: Col<SwitchRow>[] = [
    { head: "Quand", left: true, cell: (r) => <span className="whitespace-nowrap">{r.when}</span> },
    { head: "De → vers", left: true, cell: (r) => <span className="block max-w-[300px] truncate" title={`${r.from} → ${r.to}`}>{r.from} <span className="text-dusk">→</span> {r.to}</span> },
    { head: "Viewers avant", cell: (r) => (r.vB != null ? fmt(r.vB) : "—") },
    { head: "Viewers après", cell: (r) => <Delta after={r.vA} before={r.vB} /> },
    { head: "Chat avant", cell: (r) => (r.mB != null ? fmt1(r.mB) + " msg/min" : "—") },
    { head: "Chat après", cell: (r) => <Delta after={r.mA} before={r.mB} /> },
  ]
  return <DataTable cols={cols} rows={rows} rowKey={(r) => r.when + r.to} />
}

// Retour visuel après « Copier la commande de raid ». Composant à part : ses hooks ne doivent jamais suivre les
// « return » anticipés de Channel (sinon React plante avec l'erreur #310 quand les données arrivent).
function RaidCopiedToast() {
  const [channel, setChannel] = React.useState<string | null>(null)
  React.useEffect(() => {
    let timer = 0
    const handle = (e: CustomEvent<{ channel: string }>) => {
      setChannel(e.detail.channel)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setChannel(null), 2000)
    }
    window.addEventListener("raid-copied", handle as EventListener)
    return () => { window.removeEventListener("raid-copied", handle as EventListener); window.clearTimeout(timer) }
  }, [])
  if (!channel) return null
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-lg animate-in fade-in-0" role="status" aria-live="polite">
      Commande copiée : <code className="rounded bg-white/20 px-1 font-mono">/raid {channel}</code>
    </div>
  )
}

export function Channel() {
  const d = useChannelData()
  if (d === undefined) return null
  if (d === null) return <Empty>Ajoute des chaînes avec le bouton « Ajouter un streamer ».</Empty>
  return (
    <div key={d.ch.c} className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <ChannelPicker list={d.list} current={d.ch.c} attr="data-open" />
      <Hero ch={d.ch} />
      <Kpis items={d.main} />

      <Section title="Communauté et événements">
        <Kpis items={d.more} compact />
      </Section>

      <Two>
        <Section title="Messages par minute"><LineChart spec={d.msgChart} label="Messages par minute" /></Section>
        <Section title="Viewers">{d.viewerChart ? <LineChart spec={d.viewerChart} label="Viewers" /> : <Empty>{API_NOTE} pour suivre les viewers.</Empty>}</Section>
      </Two>

      <Two>
        <Section title="Activité selon l'heure" note="Messages par heure de la journée sur la période.">
          <BarChart spec={d.hourChart} label="Activité selon l'heure" />
        </Section>
        <Section title="Jeux streamés">
          {!d.games ? (
            <Empty>{API_NOTE} pour savoir quels jeux sont streamés.</Empty>
          ) : d.games.length ? (
            <div className={cn(panel, "px-4 py-2")}>
              <MeterList rows={d.games.map((g) => ({ key: g.g, v: g.hours, label: g.g, right: fmt1(g.hours) + " h", color: d.ch.color }))} />
            </div>
          ) : (
            <Empty>Pas encore de live relevé sur cette période.</Empty>
          )}
        </Section>
      </Two>

      <Section className="mt-9" title="Moments à clipper" note="Pics de chat par rapport à la normale des 20 minutes d'avant. Le lien VOD ouvre la rediffusion 30 s avant. Détails dans l'onglet Chat.">
        {d.moments.length ? <Moments rows={d.moments} /> : <Empty>{NO_MOMENTS}</Empty>}
      </Section>

      <Section
        className="mt-9"
        title="Clips et chat"
        note={CLIPS_NOTE}
      >
        {d.clips ? <Clips d={d.clips} /> : <Empty>{NO_CLIPS}</Empty>}
      </Section>

      <Section className="mt-9" title="Changements de jeu" note={d.switches?.length ? "Moyenne des 20 minutes avant le changement, comparée aux 20 minutes après." : undefined}>
        {!d.switches ? <Empty>{API_NOTE} pour repérer les changements de jeu.</Empty> : d.switches.length ? <Switches rows={d.switches} /> : <Empty>Aucun changement de jeu repéré sur cette période.</Empty>}
      </Section>

      <Section className="mt-9" title="Recommandations de raid" note="Chaînes cibles basées sur le chevauchement de viewers actifs et la réciprocité des flux.">
        {!d.raids ? (
          <Empty>Pas assez de données pour recommander des raids pour l'instant.</Empty>
        ) : d.raids.length ? (
          <div className={cn(panel, "px-4 py-2")}>
            <MeterList
              rows={d.raids.map((r) => ({
                key: r.to.c,
                v: r.score,
                max: 100,
                color: r.to.color,
                right: (
                  <span className="inline-flex items-center gap-3">
                    {r.live && <Badge variant="outline" className="border-signal-green text-signal-green">LIVE</Badge>}
                    {fmt(r.viewers)} viewers · {fmt1(r.share)}%
                  </span>
                ),
                label: (
                  <button type="button" data-open={r.to.c} className="inline-flex items-center gap-2 hover:text-primary-soft">
                    <ChannelAvatar {...r.to} className="pointer-events-none" />
                    <span className="pointer-events-none font-medium">{r.name}</span>
                  </button>
                ),
                sub: (
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); copyRaidCommand(r.name) }} className="mt-1 w-full justify-start">
                    Copier la commande de raid
                  </Button>
                ),
              }))}
            />
          </div>
        ) : (
          <Empty>Aucune recommandation pour l'instant.</Empty>
        )}
      </Section>

      <RaidCopiedToast />

      <Universe ch={d.ch} also={d.also} list={d.list} />

      <Section className="mt-9" title="Ses viewers actifs écrivent aussi chez">
        {d.also.length ? (
          <div className={cn(panel, "px-4 py-2")}>
            <MeterList
              rows={d.also.map((a) => ({
                key: a.c, v: a.share, color: a.color, right: <>{pct(a.share)} · {fmt(a.n)}</>,
                label: <button type="button" data-open={a.c} className="inline-flex items-center gap-2 hover:text-primary-soft"><ChannelAvatar {...a} className="pointer-events-none" /><span className="pointer-events-none">{a.c}</span></button>,
              }))}
            />
          </div>
        ) : (
          <Empty>Aucun viewer actif en commun pour l'instant. Ça apparaît en cumulant plusieurs jours d'écoute.</Empty>
        )}
      </Section>

      <History ch={d.ch.c} color={d.ch.color} />
    </div>
  )
}
