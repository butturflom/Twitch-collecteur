// Blocs communs aux onglets Par chaîne et Chat : choix de la chaîne, bandeau, indicateurs, moments à clipper, clips.
import type { ReactNode } from "react"
import { ExternalLink, Gamepad2, Users } from "lucide-react"
import { LangBadge } from "@/components/lang-badge"
import { StatCard, StatCardGroup } from "@/components/ui/stat-card"
import { Hint } from "@/components/ui/hint"
import { ChannelAvatar } from "@/components/channel-avatar"
import { ChannelCell, DataTable, Empty, heat, panel, type Col } from "@/components/overview/parts"
import { fmt, fmt1, pct } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ChannelHead, ClipRow, ClipsData, Kpi, MomentRow, Who } from "@/legacy/bridge"

export const API_NOTE = "Il faut l'API Twitch (dans Réglages, ou dans config.json pour le collecteur)"
const ext = "inline-flex items-center gap-1 font-sans text-xs font-medium text-primary-soft hover:text-violet-hover"

/** Deux colonnes sur grand écran, une sur petit. */
export function Two({ children }: { children: ReactNode }) {
  return <div className="mt-9 grid gap-x-4 gap-y-9 lg:grid-cols-2 [&>*]:mt-0 [&>*]:min-w-0">{children}</div>
}

/** Rangée d'indicateurs Stat Card (21st.dev) séparés par des filets. */
export function Kpis({ items, className, compact }: { items: Kpi[]; className?: string; compact?: boolean }) {
  return (
    <StatCardGroup className={cn("bg-linear-to-b from-dome-crest/90 to-dome/85 shadow-console max-sm:[&>[data-slot=stat-card]]:basis-36", className)}>
      {items.map((k) => (
        <StatCard
          key={k.label}
          variant="plain"
          className={compact ? "px-4 py-3.5 [&_[data-slot=stat-card-value]]:text-[1.3rem]/[1.75rem]" : "px-[18px] py-4"}
          label={k.label}
          value={k.value}
          hint={k.hint || undefined}
          trend={k.trend ?? undefined}
          trendLabel={k.trendLabel || undefined}
        />
      ))}
    </StatCardGroup>
  )
}

const pill = "relative inline-flex shrink-0 items-center gap-2 rounded-full border py-1 pr-3.5 pl-1 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&>*]:pointer-events-none"
const pillOn = "border-primary bg-primary/15 text-foreground shadow-focus-soft"
const pillOff = "border-border bg-card text-muted-foreground hover:border-input hover:text-foreground"

/**
 * Choix de la chaîne : photos, en live d'abord. Le clic passe par un attribut lu par l'ancien code :
 * data-open (onglet Par chaîne) ou data-chat (onglet Chat, avec l'option « Toutes » : valeur « * »).
 */
export function ChannelPicker({ list, current, attr, withAll }: { list: (Who & { live: boolean })[]; current: string; attr: "data-open" | "data-chat"; withAll?: boolean }) {
  return (
    <div className="-mx-1 mb-5 flex gap-1.5 overflow-x-auto px-1 pt-0.5 pb-2 [scrollbar-width:thin]">
      {withAll && (
        <button type="button" {...{ [attr]: "*" }} aria-pressed={current === "*"} className={cn(pill, "pl-2.5", current === "*" ? pillOn : pillOff)}>
          <span className="flex -space-x-2">
            {list.slice(0, 3).map((x) => <ChannelAvatar key={x.c} {...x} size={20} />)}
          </span>
          <span>Toutes</span>
        </button>
      )}
      {list.map((x) => (
        <button key={x.c} type="button" {...{ [attr]: x.c }} aria-pressed={x.c === current} className={cn(pill, x.c === current ? pillOn : pillOff)}>
          <ChannelAvatar {...x} size={24} />
          <span>{x.c}</span>
          {x.live && <span aria-label="en live" className="absolute top-1 left-6 size-2 rounded-full bg-live-red shadow-[0_0_0_2px_var(--card),0_0_6px_var(--live-red)]" />}
        </button>
      ))}
    </div>
  )
}

/** Bandeau d'une chaîne : photo, langue, live, jeu, viewers, titre, lien Twitch. */
export function Hero({ ch, compact }: { ch: ChannelHead; compact?: boolean }) {
  return (
    <div className={cn(panel, "relative mb-4 flex flex-wrap items-center gap-x-5 gap-y-3 overflow-hidden", compact ? "p-4" : "p-5")} style={{ "--c": ch.color } as React.CSSProperties}>
      <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-(--c) to-transparent to-70%" />
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_140px_at_0_0,color-mix(in_srgb,var(--c)_16%,transparent),transparent)]" />
      <ChannelAvatar {...ch} size={compact ? 44 : 56} className="relative" />
      <div className="relative min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className={cn("leading-tight font-semibold tracking-[-0.02em]", compact ? "text-lg" : "text-[22px]")}>{ch.c}</h2>
          <LangBadge langs={ch.langs} />
          {ch.live === true ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-live-edge bg-live-wash px-2 py-0.5 text-[11px] font-medium text-live-ink">
              <span className="size-1.5 animate-pulse rounded-full bg-live-red shadow-live-glow" />Live
            </span>
          ) : ch.live === false ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-input px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Hors ligne</span>
          ) : null}
        </div>
        {ch.live === true && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
            {ch.game && <span className="inline-flex items-center gap-1.5" title={ch.title}><Gamepad2 className="size-4" />{ch.game}</span>}
            {ch.viewers != null && <span className="inline-flex items-center gap-1.5"><Users className="size-4" /><b className="font-mono font-medium text-foreground">{fmt(ch.viewers)}</b> viewers</span>}
            {ch.since && <span>depuis {ch.since}</span>}
          </div>
        )}
        {!compact && ch.live === true && ch.title && <p className="mt-1 truncate text-xs text-dusk" title={ch.title}>{ch.title}</p>}
      </div>
      <a href={`https://www.twitch.tv/${encodeURIComponent(ch.c)}`} target="_blank" rel="noopener" className="relative inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-input bg-secondary px-3 text-[12.5px] font-medium text-foreground transition-colors hover:bg-accent max-sm:w-full">
        Ouvrir sur Twitch <ExternalLink className="size-3.5" />
      </a>
    </div>
  )
}

/** Moments à clipper ; showChan ajoute la colonne Chaîne (onglet Chat, toutes les chaînes). */
export function Moments({ rows, showChan }: { rows: MomentRow[]; showChan?: boolean }) {
  const cols: Col<MomentRow>[] = [
    { head: "Quand", left: true, cell: (r) => <span className="whitespace-nowrap">{r.when}</span> },
    ...(showChan ? [{ head: "Chaîne", left: true, cell: (r: MomentRow) => <ChannelCell who={r} /> }] : []),
    { head: "Jeu", left: true, cell: (r) => <span className="block max-w-[150px] truncate" title={r.game}>{r.game || "—"}</span> },
    { head: "Messages", cell: (r) => fmt(r.m) },
    { head: "vs normal", cell: (r) => "×" + fmt1(r.score) },
    { head: "En vague", title: "Part des messages de cette minute repris en chœur par plusieurs personnes", cell: (r) => pct(r.wave), style: (r) => heat(r.wave != null ? r.wave * 0.5 : 0) },
    { head: "Ambiance", left: true, cell: (r) => r.mood || "—" },
    { head: "Emote", left: true, cell: (r) => <span className="block max-w-[120px] truncate">{r.emote || "—"}</span> },
    { head: "", cell: (r) => (r.vod ? <a href={r.vod} target="_blank" rel="noopener" className={ext}>VOD <ExternalLink className="size-3" /></a> : null) },
  ]
  return <DataTable cols={cols} rows={rows} rowKey={(r) => r.c + r.t} />
}

/** Clips et chat : trois chiffres puis les clips les plus vus ; showChan ajoute la colonne Chaîne. */
export function Clips({ d, showChan }: { d: ClipsData; showChan?: boolean }) {
  const cols: Col<ClipRow>[] = [
    { head: "Quand", left: true, cell: (r) => <span className="whitespace-nowrap">{r.when}{!r.exact && <Hint className="ml-1 px-0.5 text-muted-foreground" trigger={<span aria-label="moment estimé">~</span>}>Moment estimé : la position exacte dans le replay n'est pas connue.</Hint>}</span> },
    ...(showChan ? [{ head: "Chaîne", left: true, cell: (r: ClipRow) => <ChannelCell who={r} /> }] : []),
    { head: "Clip", left: true, cell: (r) => <span className="block max-w-[260px] truncate" title={r.title}>{r.title || "—"}</span> },
    { head: "Vues", cell: (r) => fmt(r.views) },
    { head: "Msg/min", cell: (r) => fmt(r.m) },
    { head: "vs normal", cell: (r) => (r.score != null ? "×" + fmt1(r.score) : "—"), style: (r) => (r.score != null ? heat(Math.min(r.score / 6, 1) * 0.5) : undefined) },
    { head: "En vague", title: "Part des messages de cette minute repris en chœur", cell: (r) => pct(r.wave), style: (r) => (r.wave != null ? heat(r.wave * 0.5) : undefined) },
    { head: "", cell: (r) => <a href={`https://clips.twitch.tv/${encodeURIComponent(r.id)}`} target="_blank" rel="noopener" className={ext}>Clip <ExternalLink className="size-3" /></a> },
  ]
  return (
    <>
      <Kpis
        compact
        className="mb-3"
        items={[
          { label: "Clips relevés", value: fmt(d.total), hint: `${fmt(d.exact)} calés sur le moment exact` },
          { label: "Tombent sur un pic de chat", value: pct(d.hitRate), hint: d.comparable ? `sur ${fmt(d.comparable)} clips comparables (pic = 2,5× la normale)` : "pas assez de chat autour des clips" },
          { label: "Chat pendant le clip vs normal", value: d.medianScore != null ? "×" + fmt1(d.medianScore) : "—", hint: "médiane des clips" },
        ]}
      />
      {d.rows.length ? (
        <DataTable cols={cols} rows={d.rows} rowKey={(r) => r.id} />
      ) : (
        <Empty>Les clips sont relevés, mais le chat de cette période ne les couvre pas encore (le détail minute par minute est gardé 14 jours).</Empty>
      )}
    </>
  )
}

export const CLIPS_NOTE = "Les meilleurs clips de la période (jusqu'à 100 par chaîne), placés sur la minute exacte du live grâce à leur position dans le replay. « vs normal » compare le chat pendant le clip aux 20 minutes d'avant : un clip sur un pic de chat est un vrai moment fort."
export const NO_CLIPS = "Aucun clip relevé sur cette période. Le collecteur 1.2 récupère les meilleurs clips de chaque chaîne (7 jours au démarrage, puis toutes les 15 minutes)."
export const NO_MOMENTS = "Aucun pic net pour l'instant. Il faut quelques minutes de chat actif pour avoir une base de comparaison."
