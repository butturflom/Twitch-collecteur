// Carte d'une chaîne suivie : état du live, jeu, quatre mesures et part des viewers qui écrivent pendant le live.
import { ArrowRight, Gamepad2 } from "lucide-react"
import { LangBadge } from "@/components/lang-badge"
import { ChannelAvatar } from "@/components/channel-avatar"
import { Hint } from "@/components/ui/hint"
import { fmt, fmt1, pct } from "@/lib/format"
import { useAvatarColor } from "@/lib/avatar-color"
import type { ChannelInfo } from "@/legacy/bridge"

function Metric({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="min-w-0 rounded-[10px] border border-white/[.05] bg-white/[.02] px-2.5 py-2">
      {/* le libellé lui-même ouvre la définition (souligné en pointillés) : pas d'icône qui mange la largeur */}
      <div className="flex min-w-0 text-[11px] text-muted-foreground">
        {title ? (
          <Hint className="min-w-0 text-muted-foreground" trigger={<span className="truncate underline decoration-dusk decoration-dotted underline-offset-[3px]">{label}</span>}>{title}</Hint>
        ) : (
          <span className="truncate">{label}</span>
        )}
      </div>
      <div className="mt-0.5 font-mono text-[15px] font-medium text-foreground tabular-nums">{value}</div>
    </div>
  )
}

export function ChannelCard({ ch }: { ch: ChannelInfo }) {
  // l'ambiance de la carte reprend la couleur dominante du logo du streamer
  const color = useAvatarColor(ch.img, ch.color)
  return (
    <article
      className="relative flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-border bg-linear-to-b from-dome-crest to-dome p-4 shadow-panel"
      style={{ "--c": color } as React.CSSProperties}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-(--c) to-transparent to-80%" />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(260px_90px_at_0_0,color-mix(in_srgb,var(--c)_14%,transparent),transparent)]" />

      <header className="relative flex min-w-0 items-center gap-3">
        <ChannelAvatar {...ch} color={color} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <h3 className="truncate text-[14.5px] font-semibold tracking-[-0.015em]">{ch.c}</h3>
            <LangBadge langs={ch.langs} className="h-[18px]" />
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            {ch.live === true ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-live-edge bg-live-wash px-1.5 py-px text-[11px] font-medium text-live-ink">
                  <span className="size-1.5 animate-pulse rounded-full bg-live-red shadow-live-glow" />Live
                </span>
                {ch.game && (
                  <span className="flex min-w-0 items-center gap-1" title={ch.title}>
                    <Gamepad2 className="size-3.5 shrink-0" /><span className="truncate">{ch.game}</span>
                  </span>
                )}
              </>
            ) : ch.live === false ? (
              <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-idle" />Hors ligne</span>
            ) : (
              <span>État inconnu</span>
            )}
          </div>
        </div>
      </header>

      {/* deux échelles de temps, jamais mélangées : l'instant présent, puis la période choisie en haut de page */}
      <div className="relative mt-3.5">
        <p className="mb-1 text-[11px] text-dusk">Maintenant</p>
        <div className="grid grid-cols-2 gap-1.5">
          <Metric label="Viewers" value={ch.viewers != null ? fmt(ch.viewers) : "—"} />
          <Metric label="Msg/min (5 min)" title="Messages par minute sur les 5 dernières minutes" value={ch.recent != null ? fmt1(ch.recent) : "—"} />
        </div>
        <p className="mt-2.5 mb-1 text-[11px] text-dusk">Sur la période</p>
        <div className="grid grid-cols-2 gap-1.5">
          <Metric label="Actifs uniques" title="Viewers différents qui ont écrit au moins un message sur la période" value={fmt(ch.uniq)} />
          <Metric label="Messages" value={fmt(ch.msgs)} />
        </div>
      </div>

      {ch.wrote != null && (
        <div className="relative mt-3">
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              Ont écrit pendant ce live
              <Hint label="Ont écrit pendant ce live">Viewers différents qui ont écrit depuis le début du live, divisés par le nombre moyen de viewers depuis le début du live.</Hint>
            </span>
            <span className="font-mono font-medium tabular-nums">{pct(ch.wrote)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-(--c)" style={{ width: `${Math.min(100, Math.max(1, ch.wrote * 100))}%` }} />
          </div>
        </div>
      )}

      <button
        type="button"
        data-open={ch.c}
        className="relative mt-3.5 inline-flex items-center gap-1 self-start rounded-md text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Voir le détail <ArrowRight className="pointer-events-none size-3.5" />
      </button>
    </article>
  )
}

/**
 * Ligne compacte d'une chaîne hors ligne : ses deux chiffres de la période et le lien vers son détail.
 * Une chaîne hors ligne n'a ni viewers ni messages « maintenant » à montrer : une carte entière serait presque vide.
 */
export function ChannelRow({ ch }: { ch: ChannelInfo }) {
  const color = useAvatarColor(ch.img, ch.color)
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-3.5 py-2.5">
      <div className="flex min-w-0 flex-1 basis-44 items-center gap-2.5">
        <ChannelAvatar {...ch} color={color} size={28} />
        <span className="truncate text-[13.5px] font-medium">{ch.c}</span>
        <LangBadge langs={ch.langs} className="h-[18px]" />
      </div>
      <dl className="flex items-baseline gap-5 text-xs">
        <div className="flex items-baseline gap-1.5">
          <dt className="text-muted-foreground">Actifs uniques</dt>
          <dd className="font-mono text-[13px] font-medium text-foreground tabular-nums">{fmt(ch.uniq)}</dd>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dt className="text-muted-foreground">Messages</dt>
          <dd className="font-mono text-[13px] font-medium text-foreground tabular-nums">{fmt(ch.msgs)}</dd>
        </div>
      </dl>
      <button
        type="button"
        data-open={ch.c}
        className="inline-flex items-center gap-1 rounded-md text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Voir le détail <ArrowRight className="pointer-events-none size-3.5" />
      </button>
    </div>
  )
}
