// Stat Card — composant 21st.dev (@aadixc0de/stat-card, issu de chatcn : https://chatcn.dev).
// Adapté pour Twitch Overlap : nombres au format français, jetons --chatcn-* réglés dans index.css,
// valeurs déjà formatées acceptées telles quelles (chaînes).
import * as React from "react"
import { cn } from "@/lib/utils"

/* Jetons chatcn par défaut (clair et sombre). index.css les surcharge avec html.dark. */
const CHATCN_CSS =
  ":root{--chatcn-border:oklch(0.910 0 0);--chatcn-card:oklch(1 0 0);--chatcn-chart-1:oklch(0.560 0.170 255);--chatcn-fg:oklch(0.145 0 0);--chatcn-fg-faint:oklch(0.700 0 0);--chatcn-fg-muted:oklch(0.440 0 0);--chatcn-fg-subtle:oklch(0.525 0 0);--chatcn-fill:oklch(0.970 0 0);--chatcn-green:oklch(0.530 0.130 150);--chatcn-radius-lg:12px;--chatcn-radius-xs:4px;--chatcn-red:oklch(0.560 0.200 27);--chatcn-shadow-sm:0 0 0 1px oklch(0 0 0 / 0.06), 0 1px 2px -1px oklch(0 0 0 / 0.06), 0 2px 4px oklch(0 0 0 / 0.04)}" +
  ".dark{--chatcn-border:oklch(0.285 0 0);--chatcn-card:oklch(0.175 0 0);--chatcn-chart-1:oklch(0.700 0.150 252);--chatcn-fg:oklch(0.970 0 0);--chatcn-fg-faint:oklch(0.500 0 0);--chatcn-fg-muted:oklch(0.720 0 0);--chatcn-fg-subtle:oklch(0.620 0 0);--chatcn-fill:oklch(0.195 0 0);--chatcn-green:oklch(0.760 0.150 152);--chatcn-red:oklch(0.700 0.175 22);--chatcn-shadow-sm:0 0 0 1px oklch(1 0 0 / 0.08), inset 0 1px 0 oklch(1 0 0 / 0.03), 0 2px 4px oklch(0 0 0 / 0.4)}"
if (typeof document !== "undefined" && !document.getElementById("chatcn-stat-card")) {
  const style = document.createElement("style")
  style.id = "chatcn-stat-card"
  style.textContent = CHATCN_CSS
  // en tête de <head> : les surcharges de l'application passent après
  document.head.prepend(style)
}

/* Groupe : une rangée d'indicateurs séparés par des filets plutôt que des cartes imbriquées. */
export function StatCardGroup({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-card-group"
      role="group"
      className={cn(
        "rounded-(--chatcn-radius-lg) bg-(color:--chatcn-card) shadow-(--chatcn-shadow-sm) flex min-w-0 flex-wrap overflow-hidden",
        // Filets entre cellules, quel que soit le retour à la ligne : chaque cellule trace son bord
        // de début et son bord haut, et recule d'1 px ; les bords extérieurs sortent de la découpe.
        "[&>[data-slot=stat-card]]:-ms-px [&>[data-slot=stat-card]]:-mt-px [&>[data-slot=stat-card]]:flex-[1_1_13rem]",
        "[&>[data-slot=stat-card]]:border-(color:--chatcn-border) [&>[data-slot=stat-card]]:border-s [&>[data-slot=stat-card]]:border-t",
        "[&>[data-slot=stat-card]]:rounded-none [&>[data-slot=stat-card]]:shadow-none",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export type StatValueFormat = "number" | "compact" | "percent" | "currency"

export interface StatDelta {
  /** Variation signée. `0.124` avec `format="percent"` donne +12,4 %. */
  value: number
  format?: StatValueFormat
  /** La période comparée : « vs semaine dernière ». */
  label?: string
}

export interface StatCardProps extends Omit<React.ComponentProps<"div">, "children"> {
  label: React.ReactNode
  /** La valeur. Les nombres sont formatés avec `format` ; les chaînes sont affichées telles quelles. */
  value?: number | string | null
  format?: StatValueFormat
  unit?: string
  currency?: string
  locale?: string
  delta?: StatDelta
  /** Le sens qui est une bonne nouvelle (couleur de la variation). */
  goodDirection?: "up" | "down" | "neutral"
  /** Valeurs récentes, de la plus ancienne à la plus récente, dessinées en mini-courbe. */
  trend?: number[]
  /** Ce que montre la mini-courbe (« courbe par heure ») : écrit sous la courbe, pour ne pas le confondre avec la valeur. */
  trendLabel?: string
  hint?: React.ReactNode
  loading?: boolean
  size?: "default" | "lg"
  variant?: "card" | "plain"
}

function formatValue(
  value: number,
  format: StatValueFormat = "number",
  { currency = "EUR", locale = "fr-FR", signed = false } = {},
) {
  const options: Intl.NumberFormatOptions =
    format === "currency"
      ? { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }
      : format === "percent"
        ? { style: "percent", maximumFractionDigits: 1 }
        : format === "compact"
          ? { notation: "compact", maximumFractionDigits: 1 }
          : { maximumFractionDigits: 2 }
  return new Intl.NumberFormat(locale, { ...options, ...(signed ? { signDisplay: "exceptZero" } : {}) }).format(value)
}

const iconProps = {
  viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5,
  strokeLinecap: "round", strokeLinejoin: "round",
} as const
const MinusIcon = (p: React.SVGProps<SVGSVGElement>) => <svg aria-hidden="true" {...iconProps} {...p}><path d="M5 12h14" /></svg>
const ArrowUpRightIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg aria-hidden="true" {...iconProps} {...p}><path d="M7 7h7.5A2.5 2.5 0 0 1 17 9.5V17" /><path d="m7 17 6.46-6.46" /></svg>
)
const ArrowDownRightIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg aria-hidden="true" {...iconProps} {...p}><path d="M17 7v7.5a2.5 2.5 0 0 1-2.5 2.5H7" /><path d="m7 7 6.46 6.46" /></svg>
)

/** Mini-courbe : trait de 1,5 px, point final marqué. S'adapte à sa boîte sans déformer le trait. */
export function Sparkline({ values, area = true, className, ...props }: Omit<React.ComponentProps<"svg">, "values"> & { values: number[]; area?: boolean }) {
  const points = values.filter((v) => Number.isFinite(v))
  if (points.length < 2) return <svg aria-hidden="true" className={cn("h-8 w-24", className)} {...props} />
  const min = Math.min(...points)
  const span = Math.max(...points) - min || 1
  const xy = points.map((v, i) => [(i / (points.length - 1)) * 94 + 3, 29 - ((v - min) / span) * 26])
  const d = xy.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join("")
  const [lx, ly] = xy[xy.length - 1]
  const [fx] = xy[0]
  return (
    <svg aria-hidden="true" viewBox="0 0 100 32" preserveAspectRatio="none" data-slot="sparkline" className={cn("h-8 w-24 overflow-visible", className)} {...props}>
      {area ? <path d={`${d}L${lx},32L${fx},32Z`} fill="var(--chatcn-chart-1)" opacity="0.12" /> : null}
      <path d={d} fill="none" stroke="var(--chatcn-chart-1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <path d={`M${lx},${ly}h0`} stroke="var(--chatcn-card)" strokeWidth="9" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <path d={`M${lx},${ly}h0`} stroke="var(--chatcn-chart-1)" strokeWidth="6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function StatCard({
  label, value, format = "number", unit, currency, locale, delta, goodDirection = "up",
  trend, trendLabel, hint, loading = false, size = "default", variant = "card", className, ...props
}: StatCardProps) {
  const hasValue = value !== undefined && value !== null && value !== ""
  const shown = typeof value === "number" ? formatValue(value, format, { currency, locale }) : String(value ?? "")

  let tone = "text-(color:--chatcn-fg-muted)"
  let DeltaIcon = MinusIcon
  let deltaWord = "Stable"
  if (delta && delta.value !== 0) {
    const up = delta.value > 0
    DeltaIcon = up ? ArrowUpRightIcon : ArrowDownRightIcon
    deltaWord = up ? "En hausse" : "En baisse"
    if (goodDirection !== "neutral") {
      const good = (goodDirection === "up") === up
      tone = good ? "text-(color:--chatcn-green) font-medium" : "text-(color:--chatcn-red)"
    }
  }
  const deltaText = delta ? formatValue(delta.value, delta.format ?? "percent", { currency, locale, signed: true }) : ""

  return (
    <div
      data-slot="stat-card"
      aria-busy={loading || undefined}
      className={cn(
        "text-[0.875rem]/[1.25rem] tracking-[-0.003em] text-(color:--chatcn-fg) flex min-w-0 flex-col gap-1",
        variant === "card" && "rounded-(--chatcn-radius-lg) bg-(color:--chatcn-card) shadow-(--chatcn-shadow-sm) p-4",
        className,
      )}
      {...props}
    >
      {/* sur téléphone, le libellé peut tenir sur 2 lignes (hauteur fixe pour garder les valeurs alignées) */}
      <div className="text-[0.8125rem]/[1.25rem] text-(color:--chatcn-fg-subtle) flex min-w-0 items-start gap-2 max-sm:min-h-10">
        <span className="max-sm:line-clamp-2 sm:truncate">{label}</span>
      </div>
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-3">
        {loading ? (
          <span aria-hidden="true" className={cn("bg-(color:--chatcn-fill) rounded-(--chatcn-radius-xs) block", size === "lg" ? "my-1.5 h-8 w-28" : "my-1 h-6 w-20")} />
        ) : (
          <span
            data-slot="stat-card-value"
            className={cn(
              "text-(color:--chatcn-fg) shrink-0 font-semibold whitespace-nowrap tabular-nums",
              size === "lg" ? "text-[2.5rem]/[2.75rem] tracking-[-0.035em]" : "text-[1.625rem]/[2rem] tracking-[-0.03em]",
            )}
          >
            {hasValue ? shown : "—"}
            {unit && hasValue ? (
              <span className="text-[0.875rem]/[1.25rem] text-(color:--chatcn-fg-subtle) ms-0.5 font-normal tracking-normal">{" "}{unit}</span>
            ) : null}
          </span>
        )}
        {trend && trend.length > 1 ? (
          <Sparkline values={trend} className={cn("mb-1 min-w-6 flex-1", size === "lg" ? "h-10 max-w-32" : "h-7 max-w-20")} />
        ) : null}
      </div>
      {delta ? (
        <span className={cn("text-[0.8125rem]/[1.25rem] flex min-w-0 items-center gap-1 tabular-nums", tone)}>
          <DeltaIcon className="size-3.5 shrink-0" />
          <span className="sr-only">{deltaWord}</span>
          <span className="shrink-0 font-medium">{deltaText}</span>
          {delta.label ? <span className="text-(color:--chatcn-fg-subtle) truncate">{delta.label}</span> : null}
        </span>
      ) : null}
      {hint || (trendLabel && trend && trend.length > 1) ? (
        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3">
          {hint ? <p className="text-[0.75rem]/[1rem] text-(color:--chatcn-fg-subtle) text-pretty">{hint}</p> : null}
          {trendLabel && trend && trend.length > 1 ? (
            <p aria-hidden="true" className="ms-auto text-[0.6875rem]/[1rem] whitespace-nowrap text-dusk">{trendLabel}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default StatCard
