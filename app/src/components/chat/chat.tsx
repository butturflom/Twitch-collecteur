// Onglet « Chat », en React. Les chiffres viennent de l'ancien code (événement legacy:chat).
import { LineChart } from "@/components/charts/line-chart"
import { ChannelCell, DataTable, Empty, MeterList, Section, heat, panel, type Col, Pending } from "@/components/overview/parts"
import { CLIPS_NOTE, ChannelPicker, Clips, Hero, Kpis, Moments, NO_CLIPS, NO_MOMENTS, Two } from "@/components/shared/blocks"
import { Hint } from "@/components/ui/hint"
import { fmt, pct } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useChatData, type ChatData } from "@/legacy/bridge"

type KindRow = NonNullable<ChatData["kindRows"]>[number]
type MoodRow = NonNullable<ChatData["moodRows"]>[number]
const maxOf = <T,>(a: T[], f: (x: T) => number) => Math.max(0, ...a.map(f)) || 1

/** Répartition des types de messages : une barre empilée et sa légende (survol : description du type). */
function KindBar({ parts }: { parts: NonNullable<ChatData["kinds"]>["parts"] }) {
  return (
    <div>
      <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-[5px]" role="img" aria-label={parts.map((p) => `${p.label} ${pct(p.share)}`).join(", ")}>
        {parts.filter((p) => p.share > 0).map((p) => (
          <i key={p.key} title={`${p.label} : ${pct(p.share)}`} className="block h-full first:rounded-l-[5px] last:rounded-r-[5px]" style={{ width: `${(p.share * 100).toFixed(2)}%`, background: p.color }} />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {parts.map((p) => (
          <span key={p.key} className="inline-flex items-center gap-1.5">
            <i className="size-2.5 rounded-full" style={{ background: p.color }} />
            {p.label} <b className="font-mono font-medium text-foreground">{pct(p.share)}</b>
            {p.desc && <Hint label={p.label}>{p.desc}</Hint>}
          </span>
        ))}
      </div>
    </div>
  )
}

function KindTable({ rows }: { rows: KindRow[] }) {
  const defs: [string, string, (r: KindRow) => number][] = [
    ["Réactions", "", (r) => r.react], ["dont vagues", "", (r) => r.wave], ["Interactions", "", (r) => r.inter],
    ["→ streamer", "Questions, tutoiement, @ ou réponse au streamer", (r) => r.ad], ["Entre viewers", "Réponses et @ entre viewers", (r) => r.co],
    ["Commentaires", "4 mots ou plus", (r) => r.cm], ["Courts", "« oui », « jsp », sans signal clair", (r) => r.ct],
  ]
  const cols: Col<KindRow>[] = [
    { head: "Chaîne", left: true, cell: (r) => <ChannelCell who={r} /> },
    { head: "Messages triés", cell: (r) => fmt(r.n) },
    ...defs.map(([head, title, f]) => { const mx = maxOf(rows, f); return { head, title: title || undefined, cell: (r: KindRow) => pct(f(r)), style: (r: KindRow) => heat((f(r) / mx) * 0.4) } }),
  ]
  return <DataTable cols={cols} rows={rows} rowKey={(r) => r.c} />
}

function MoodTable({ rows, labels }: { rows: MoodRow[]; labels: string[] }) {
  const cols: Col<MoodRow>[] = [
    { head: "Chaîne", left: true, cell: (r) => <ChannelCell who={r} /> },
    { head: "Messages", cell: (r) => fmt(r.n) },
    ...labels.map((head, i) => { const mx = maxOf(rows, (r) => r.moods[i]); return { head, cell: (r: MoodRow) => pct(r.moods[i]), style: (r: MoodRow) => heat((r.moods[i] / mx) * 0.4) } }),
    { head: "Emote n°1", left: true, cell: (r) => <span className="block max-w-[140px] truncate">{r.emote || "—"}</span> },
  ]
  return <DataTable cols={cols} rows={rows} rowKey={(r) => r.c} />
}

export function Chat() {
  const d = useChatData()
  if (!d) return <Pending />
  const sel = d.all ? "*" : d.ch!.c
  return (
    <div key={sel} className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <ChannelPicker list={d.list} current={sel} attr="data-chat" withAll />
      {d.ch && <Hero ch={d.ch} compact />}

      <Kpis
        items={[
          { label: "Messages analysés", value: fmt(d.n) },
          ...d.moods.map((m) => ({ label: m.label === "Questions" ? "Questions" : `« ${m.label} »`, value: pct(m.share), hint: "des messages analysés" })),
        ]}
      />
      {!d.n && <div className="mt-3"><Empty>Pas encore de messages analysés sur cette période. L'analyse du texte démarre avec cette version de l'outil.</Empty></div>}

      <Section
        className="mt-9"
        title="Réactions ou interactions"
        note={d.kinds ? "Courbes : part des réactions, des interactions et des commentaires par tranches de 10 minutes. Les viewers taguent rarement le streamer : une question ou un tutoiement compte comme « vers le streamer »." : undefined}
      >
        {!d.kinds ? (
          <Empty>Le tri des messages démarre avec la version 1.1 du collecteur : les premiers chiffres arrivent quelques minutes après sa mise à jour.</Empty>
        ) : (
          <>
            <Kpis
              compact
              className="mb-3"
              items={[
                { label: "Réactions", value: pct(d.kinds.react), hint: `dont ${pct(d.kinds.wave)} en vagues` },
                { label: "Interactions", value: pct(d.kinds.inter), hint: `${pct(d.kinds.ad)} vers le streamer · ${pct(d.kinds.co)} entre viewers` },
                { label: "Commentaires", value: pct(d.kinds.cm), hint: "4 mots ou plus, sans s'adresser à quelqu'un" },
                { label: "Messages triés", value: fmt(d.kinds.n) },
              ]}
            />
            <div className={cn(panel, "p-[18px]")}>
              <KindBar parts={d.kinds.parts} />
              {d.kindChart && <div className="mt-4"><LineChart spec={d.kindChart} bare label="Types de messages au fil du temps" /></div>}
            </div>
          </>
        )}
      </Section>

      {d.kindRows && (
        <Section className="mt-9" title="Types de messages par chaîne" note="Classé de la chaîne la plus « conversation » à la plus « réaction ». La case la plus foncée d'une colonne = la chaîne où ce type pèse le plus.">
          <KindTable rows={d.kindRows} />
        </Section>
      )}

      <Section className="mt-9" title="Ambiance du chat au fil du temps" note="Part des messages de chaque type, par tranches de 10 minutes.">
        <LineChart spec={d.moodChart} label="Ambiance du chat au fil du temps" />
      </Section>

      {d.moodRows && (
        <Section className="mt-9" title="Ambiance par chaîne" note="La case la plus foncée d'une colonne = la chaîne où ce type de message pèse le plus.">
          <MoodTable rows={d.moodRows} labels={d.moods.map((m) => m.label)} />
        </Section>
      )}

      <Two>
        <Section title="Emotes (Twitch, 7TV, BTTV, FFZ)">
          {d.emotes.length ? (
            <div className={cn(panel, "px-4 py-2")}>
              <MeterList rows={d.emotes.map((e) => ({ key: e.k, v: e.v, label: e.k, right: <>{fmt(e.v)}{e.share != null && <> · {pct(e.share)} des msg</>}</> }))} />
            </div>
          ) : (
            <Empty>Pas encore de données sur cette période.</Empty>
          )}
        </Section>
        <Section title="Mots les plus utilisés" note="Depuis la version 1.1, les emotes 7TV, BTTV et FFZ sont reconnues et ne comptent plus comme des mots. Les jours d'avant peuvent encore en contenir.">
          {d.words.length ? (
            <div className={cn(panel, "px-4 py-2")}>
              <MeterList rows={d.words.map((w) => ({ key: w.k, v: w.v, label: w.k, right: fmt(w.v), color: "linear-gradient(90deg,rgba(139,124,255,.45),#8b7cff)" }))} />
            </div>
          ) : (
            <Empty>Pas encore de données sur cette période.</Empty>
          )}
        </Section>
      </Two>

      <Section className="mt-9" title="Moments à clipper" note="Minutes où le chat a écrit au moins 2,5× plus que sa normale des 20 minutes précédentes. Le lien VOD ouvre la rediffusion 30 s avant (API Twitch requise, et VOD activée par le streamer).">
        {d.moments.length ? <Moments rows={d.moments} showChan={d.all} /> : <Empty>{NO_MOMENTS}</Empty>}
      </Section>

      <Section className="mt-9" title="Clips et chat" note={d.clips ? CLIPS_NOTE : undefined}>
        {d.clips ? <Clips d={d.clips} showChan={d.all} /> : <Empty>{NO_CLIPS}</Empty>}
      </Section>
    </div>
  )
}
