// Onglet « Clip » : les moments à clipper et les clips, réunis (avant, répartis entre Chat et Par chaîne).
// Les chiffres viennent de l'ancien code (événement legacy:clip).
import { Empty, Section, Pending } from "@/components/overview/parts"
import { CLIPS_NOTE, ChannelPicker, Clips, Hero, Moments, NO_CLIPS, NO_MOMENTS } from "@/components/shared/blocks"
import { useClipData } from "@/legacy/bridge"

export function Clip() {
  const d = useClipData()
  if (!d) return <Pending />
  const sel = d.all ? "*" : d.ch!.c
  return (
    <div key={sel} className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <ChannelPicker list={d.list} current={sel} attr="data-clip" withAll />
      {d.ch && <Hero ch={d.ch} compact />}

      <Section title="Moments à clipper" note="Minutes où le chat a écrit au moins 2,5× plus que sa normale des 20 minutes précédentes. Le lien VOD ouvre la rediffusion 30 s avant (API Twitch requise, et VOD activée par le streamer).">
        {d.moments.length ? <Moments rows={d.moments} showChan={d.all} /> : <Empty>{NO_MOMENTS}</Empty>}
      </Section>

      <Section className="mt-9" title="Clips et chat" note={d.clips ? CLIPS_NOTE : undefined}>
        {d.clips ? <Clips d={d.clips} showChan={d.all} /> : <Empty>{NO_CLIPS}</Empty>}
      </Section>
    </div>
  )
}
