// Onglet « Chevauchement », en React. Les chiffres viennent de l'ancien code (événement legacy:overlap) ;
// le filtre de viewers passe par setOverlapFilter(), qui recalcule tout l'onglet.
import { ChevronRight, ExternalLink } from "lucide-react"
import { ChannelAvatar } from "@/components/channel-avatar"
import { ChannelCell, DataTable, Empty, MeterList, Section, heat, muted, panel, type Col, Pending } from "@/components/overview/parts"
import { Kpis } from "@/components/shared/blocks"
import { Matrix } from "@/components/shared/matrix"
import { Button } from "@/components/ui/button"
import { fmt, fmt1, pct } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useOverlapData, type OverlapData } from "@/legacy/bridge"
import { useState, type ReactNode } from "react"

// Spinner simple pour indicateur de chargement
function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent", className)} />
  )
}

// Lien avec indicateur de chargement (spinner au survol)
function NavLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  const [loading, setLoading] = useState(false)
  return (
    <a
      href="#"
      data-goto={to}
      className={cn("text-primary-soft underline underline-offset-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", className)}
      onMouseEnter={() => setLoading(true)}
      onMouseLeave={() => setLoading(false)}
      onClick={(e) => {
        e.preventDefault()
        setLoading(true)
        setTimeout(() => {
          setLoading(false)
          window.showTab?.(to as "flows" | "overlap")
        }, 300)
      }}
    >
      {children}
      {loading && <Spinner className="ml-1 border-white" />}
    </a>
  )
}

type Movers = NonNullable<OverlapData["movers"]>
type MoverRow = Movers["rows"][number]
type TopRow = Movers["top"][number]
const maxOf = <T,>(a: T[], f: (x: T) => number) => Math.max(0, ...a.map(f)) || 1

/** Filtre de viewers : contrôle segmenté, avec le nombre de viewers de chaque groupe. */
function FilterBar({ d }: { d: OverlapData }) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-dusk">Viewers</span>
        <div role="radiogroup" aria-label="Viewers pris en compte" className="inline-flex flex-wrap gap-0.5 rounded-[11px] border border-border bg-well p-[3px] shadow-field-well">
          {d.filters.map((f) => {
            const on = f.key === d.filter
            return (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={on}
                title={f.tip}
                onClick={() => window.setOverlapFilter?.(f.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  on ? "bg-accent text-foreground shadow-thumb" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
                <span className={cn("font-mono text-[11px]", on ? "text-primary-soft" : "text-dusk")}>{fmt(f.count)}</span>
              </button>
            )
          })}
        </div>
      </div>
      {d.filterNote && (
        <p className="mt-2.5 max-w-[72ch] text-xs leading-relaxed text-muted-foreground">
          Tout l'onglet est calculé sur les <b className="font-semibold text-foreground">{fmt(d.filterNote.count)}</b> viewers actifs qui {d.filterNote.desc}, soit {pct(d.filterNote.share)} des {fmt(d.filterNote.total)}.
        </p>
      )}
    </div>
  )
}

function Side({ x }: { x: MoverRow["to"] }) {
  if (!x) return muted("—")
  return (
    <span className="inline-flex items-center gap-1.5">
      <ChannelAvatar {...x} />
      <span>{x.c}</span>
      <span className="font-mono text-xs text-muted-foreground">{fmt(x.n)}</span>
    </span>
  )
}

function MoverTable({ rows }: { rows: MoverRow[] }) {
  const mM = maxOf(rows, (r) => r.m), mO = maxOf(rows, (r) => r.o)
  const cols: Col<MoverRow>[] = [
    { head: "Chaîne", left: true, cell: (r) => <ChannelCell who={r} /> },
    { head: "Viewers actifs", cell: (r) => fmt(r.n) },
    { head: "Changent de stream", title: "Part de ses viewers actifs qui ont changé de stream au moins une fois sur la période", cell: (r) => pct(r.m), style: (r) => heat((r.m / mM) * 0.4) },
    { head: "Souvent", title: "3 changements ou plus", cell: (r) => pct(r.o), style: (r) => heat((r.o / mO) * 0.4) },
    { head: "Partent surtout vers", left: true, cell: (r) => <Side x={r.to} /> },
    { head: "Arrivent surtout de", left: true, cell: (r) => <Side x={r.from} /> },
  ]
  return <DataTable cols={cols} rows={rows} rowKey={(r) => r.c} />
}

/** Parcours d'un viewer : photos des chaînes dans l'ordre (survol : chaîne et heure). */
function Path({ r }: { r: TopRow }) {
  return (
    <span className="inline-flex max-w-[520px] flex-wrap items-center gap-0.5 whitespace-normal">
      {r.path.map((p, i) => (
        <span key={i} className="inline-flex items-center gap-0.5">
          {i > 0 && <ChevronRight className="size-3 text-dusk" />}
          <span title={`${p.c} · ${p.when}`}><ChannelAvatar {...p} /></span>
        </span>
      ))}
      {r.more > 0 && <span className="ml-1 font-mono text-[11px] text-dusk">… +{r.more}</span>}
    </span>
  )
}

function TopTable({ rows }: { rows: TopRow[] }) {
  const cols: Col<TopRow>[] = [
    { head: "Viewer (anonyme)", left: true, cell: (r) => <code className="rounded-md border border-border bg-secondary px-1.5 py-0.5 font-mono text-xs">{r.id}</code> },
    { head: "Changements", cell: (r) => fmt(r.moves) },
    { head: "Chaînes", cell: (r) => fmt(r.chans) },
    { head: "Parcours (survole une photo)", left: true, cell: (r) => <Path r={r} /> },
    { head: "Quand", left: true, cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{r.span}</span> },
  ]
  return <DataTable cols={cols} rows={rows} rowKey={(r) => r.id + r.span} />
}

export function Overlap() {
  const d = useOverlapData()

  if (!d) return <Pending />
  const m = d.movers
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      {/* En-tête avec bouton Voir tout en haut à droite */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Chevauchement</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 text-[12.5px]"
          onClick={() => window.showTab?.("flows")}
        >
          <ExternalLink className="size-3.5" />
          Voir tous les flux
        </Button>
      </div>
      <FilterBar d={d} />

      <Section title="Viewers qui changent de stream" note={m ? (m.swStart
        ? <>Changements comptés message par message, allers-retours compris, depuis le <b>{m.swStart}</b> (collecteur 1.5). Même source que l'onglet Flux.</>
        : "Pour l'instant, les changements sont estimés à partir du premier et du dernier message de chaque journée : les va-et-vient d'une même soirée ne sont pas vus. Le collecteur 1.5 les compte message par message.") : undefined}>
        {!m ? (
          <Empty>Personne n'a encore changé de stream sur cette période : il faut que des chaînes suivies soient en live en même temps, ou à la suite.</Empty>
        ) : (
          <Kpis
            items={[
              { label: "Changent de stream", value: fmt(m.move), hint: `${pct(m.move / m.total)} des viewers actifs · au moins une fois` },
              { label: "Changent souvent", value: fmt(m.often), hint: `${m.oftenAt} changements ou plus · ${pct(m.often / m.total)} des viewers actifs` },
              { label: "Changements par viewer qui bouge", value: fmt1(m.medianMoves), hint: `médiane · jusqu'à ${fmt(m.maxMoves)} pour le plus nomade` },
              { label: "Écrivent sur 2 chaînes ou plus", value: fmt(m.multi), hint: `${pct(m.multi / m.total)} des viewers actifs` },
            ]}
          />
        )}
      </Section>

      {m && m.rows.length > 0 && (
        <Section
          className="mt-9"
          title="Chaîne par chaîne"
          note={<>Classé de la chaîne dont le chat bouge le plus à celle dont le chat reste le plus fidèle. Le chiffre après une chaîne = nombre de passages dans ce sens, allers-retours compris. L'onglet <NavLink to="flows">Flux</NavLink>, lui, ne compte que les départs d'un chat vers un autre (quelqu'un qui finit d'écrire chez A puis va chez B).</>}
        >
          <MoverTable rows={m.rows} />
        </Section>
      )}

      {m && m.top.length > 0 && (
        <Section className="mt-9" title="Les parcours les plus nomades" note="Chaque viewer n'est connu que par une empreinte (jamais son pseudo) : on voit qu'une même personne passe d'un chat à l'autre, pas qui elle est. Le parcours montre les chaînes dans l'ordre de ses premiers messages de chaque journée ; le nombre de changements, lui, compte chaque aller-retour.">
          <TopTable rows={m.top} />
        </Section>
      )}

      <Section className="mt-9" title="Entre chaînes" note={d.matrix.rows.length >= 2 && <>Chaque case = % des viewers actifs de la <b>ligne</b> qu'on a aussi vus écrire dans la <b>colonne</b> sur la période. Le chiffre en dessous est le nombre de personnes.</>}>
        <Matrix data={d.matrix} label="Viewers actifs de" />
      </Section>

      <div className="mt-9 grid gap-x-4 gap-y-9 lg:grid-cols-2 [&>*]:mt-0 [&>*]:min-w-0">
        <Section title="Paires les plus proches" note="Pourcentage : part des viewers actifs de la première chaîne (la plus petite des deux) qui écrivent aussi chez la seconde. Classées par ressemblance (communs ÷ viewers des deux réunies).">
          {d.pairs.length ? (
            <div className={cn(panel, "px-4 py-2")}>
              <MeterList
                wide
                rows={d.pairs.map((p) => ({
                  key: p.a.c + p.b.c, v: p.share, right: <>{pct(p.share)} · {fmt(p.n)} en commun</>,
                  label: (
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <ChannelAvatar {...p.a} /><span className="truncate">{p.a.c}</span>
                      <ChevronRight className="size-3 shrink-0 text-dusk" />
                      <ChannelAvatar {...p.b} /><span className="truncate">{p.b.c}</span>
                    </span>
                  ),
                }))}
              />
            </div>
          ) : (
            <Empty>Il faut au moins deux chaînes avec des viewers actifs sur cette période.</Empty>
          )}
        </Section>
        <Section title="Sur combien de chaînes écrivent les gens">
          {d.dist.length ? (
            <div className={cn(panel, "px-4 py-2")}>
              <MeterList rows={d.dist.map((x) => ({ key: String(x.k), v: x.v, label: x.k === 1 ? "1 seule chaîne" : `${x.k} chaînes`, right: <>{fmt(x.v)} · {pct(x.share)}</> }))} />
            </div>
          ) : (
            <Empty>Pas encore de données sur cette période.</Empty>
          )}
        </Section>
      </div>
    </div>
  )
}
