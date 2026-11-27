// Onglet « Chat », en React. Les chiffres viennent de l'ancien code (événement legacy:chat).
import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { LineChart } from "@/components/charts/line-chart"
import { ChannelCell, DataTable, Empty, MeterList, Section, heat, panel, type Col, Pending } from "@/components/overview/parts"
import { ChannelPicker, ClipLink, Hero, KindBar, Kpis, Two } from "@/components/shared/blocks"
import { fmt, pct } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useChatData, type ChatData } from "@/legacy/bridge"

type KindRow = NonNullable<ChatData["kindRows"]>[number]
type MoodRow = NonNullable<ChatData["moodRows"]>[number]
const maxOf = <T,>(a: T[], f: (x: T) => number) => Math.max(0, ...a.map(f)) || 1

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

/** Les 3 emotes les plus utilisées, en podium : la 1re au centre, la plus haute. */
function Podium({ rows }: { rows: ChatData["emotes"] }) {
  const steps = [{ i: 1, h: "h-12" }, { i: 0, h: "h-20" }, { i: 2, h: "h-8" }]
  return (
    <ol className="grid grid-cols-3 items-end gap-2 px-4 pt-4">
      {steps.map(({ i, h }) => {
        const e = rows[i]
        return (
          <li key={e.k} value={i + 1} className="flex min-w-0 flex-col items-center text-center">
            <span className="max-w-full truncate text-[13.5px] font-semibold" title={e.k}>{e.k}</span>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">{fmt(e.v)}</span>
            {e.share != null && <span className="text-[11px] text-dusk">{pct(e.share)} des msg</span>}
            <span aria-hidden className={cn("mt-2 grid w-full place-items-center rounded-t-lg border border-b-0 border-white/10 font-mono text-lg font-semibold", h, i === 0 ? "bg-primary/20 text-foreground" : "bg-white/[.04] text-muted-foreground")}>{i + 1}</span>
          </li>
        )
      })}
    </ol>
  )
}

function Emotes({ rows }: { rows: ChatData["emotes"] }) {
  const podium = rows.length >= 3, rest = podium ? rows.slice(3) : rows
  return (
    <div className={cn(panel, "overflow-hidden")}>
      {podium && <Podium rows={rows} />}
      {rest.length > 0 && (
        <div className={cn("px-4 py-2", podium && "border-t border-white/10")}>
          <MeterList max={rows[0].v} rows={rest.map((e) => ({ key: e.k, v: e.v, label: e.k, right: <>{fmt(e.v)}{e.share != null && <> · {pct(e.share)} des msg</>}</> }))} />
        </div>
      )}
    </div>
  )
}

/** Tableaux « chaîne par chaîne » : repliés, le détail d'une chaîne est dans Par chaîne. */
function Compare({ d }: { d: ChatData }) {
  const [open, setOpen] = useState(false)
  if (!d.kindRows && !d.moodRows) return null
  return (
    <div className="mt-9">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="inline-flex min-h-6 items-center gap-2 rounded-md text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-200", open && "rotate-180")} />
        {open ? "Masquer la comparaison des chaînes" : "Comparer les types de messages et l'ambiance des chaînes"}
      </button>
      {open && d.kindRows && (
        <Section className="mt-4" title="Types de messages par chaîne" note="Classé de la chaîne la plus « conversation » à la plus « réaction ». La case la plus foncée d'une colonne = la chaîne où ce type pèse le plus.">
          <KindTable rows={d.kindRows} />
        </Section>
      )}
      {open && d.moodRows && (
        <Section className="mt-9" title="Ambiance par chaîne" note="La case la plus foncée d'une colonne = la chaîne où ce type de message pèse le plus.">
          <MoodTable rows={d.moodRows} labels={d.moods.map((m) => m.label)} />
        </Section>
      )}
    </div>
  )
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

      <Section className="mt-9" title="Ambiance du chat au fil du temps" note="Part des messages de chaque type, par tranches de 10 minutes.">
        <LineChart spec={d.moodChart} label="Ambiance du chat au fil du temps" />
      </Section>

      <Compare d={d} />

      <Two>
        <Section title="Emotes (Twitch, 7TV, BTTV, FFZ)">
          {d.emotes.length ? <Emotes rows={d.emotes} /> : <Empty>Pas encore de données sur cette période.</Empty>}
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

      <ClipLink chan={sel} className="mt-9" />
    </div>
  )
}
