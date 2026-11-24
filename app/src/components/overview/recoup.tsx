// Bloc « Recoupements » de la Vue d'ensemble : ce qu'aucun site public ne montre, en aperçu.
// Une phrase à retenir, puis trois colonnes séparées par des filets : paires les plus proches, trajets les plus
// fréquents, dernier raid. Le détail reste dans les onglets Chevauchement et Flux (liens en pied de colonne).
import type { ReactNode } from "react"
import { ArrowRight, ArrowLeftRight, ExternalLink } from "lucide-react"
import { ChannelAvatar } from "@/components/channel-avatar"
import { ChannelCell, Empty, Section, panel } from "./parts"
import { Button } from "@/components/ui/button"
import { fmt, pct } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useOverviewData, usePeriodInfo, type RecoupData, type Who } from "@/legacy/bridge"

// Actions rapides visibles au-dessus des colonnes : liens vers les vues détaillées et extension de période
function RecoupActions({ d }: { d: RecoupData }) {
  const period = usePeriodInfo()
  const hasRaid = d.raid != null

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <a href="#" data-goto="overlap" className="inline-flex items-center gap-1.5 rounded-md bg-dome-crest/10 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-dome-crest/20">
        <ExternalLink className="size-4" />
        Tout le chevauchement
      </a>
      <a href="#" data-goto="flows" className="inline-flex items-center gap-1.5 rounded-md bg-dome-crest/10 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-dome-crest/20">
        <ExternalLink className="size-4" />
        Tous les flux
      </a>
      {hasRaid && (
        <a href="#" data-goto="flows" className="inline-flex items-center gap-1.5 rounded-md bg-dome-crest/10 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-dome-crest/20">
          <ExternalLink className="size-4" />
          Tous les raids
        </a>
      )}
    </div>
  )
}

const ACCENT = "139,124,255"

/** Nom de chaîne en gras dans la phrase à retenir. */
const Name = ({ c }: { c: string }) => <b className="font-semibold text-foreground">{c}</b>
const Num = ({ children }: { children: ReactNode }) => <b className="font-semibold text-foreground tabular-nums">{children}</b>
const people = (n: number) => (n > 1 ? "personnes" : "personne")

/** Période suivante, plus large : ce que propose le bloc vide. */
const WIDER: Record<string, { p: string; label: string }> = {
  today: { p: "7d", label: "Élargir à 7 jours" },
  "7d": { p: "30d", label: "Élargir à 30 jours" },
  "30d": { p: "all", label: "Voir toute la période" },
}
/** Les boutons Période appartiennent à l'ancien code : on clique le bon, il recalcule toute la page. */
const setPeriod = (p: string) => document.querySelector<HTMLButtonElement>(`#period [data-p="${p}"]`)?.click()

/** La phrase à retenir : le recoupement le plus fort, puis le trajet le plus fréquent s'il existe. */
function Headline({ d }: { d: RecoupData }) {
  const p = d.pairs[0], f = d.flows[0]
  return (
    <p className="max-w-[68ch] text-[17px] leading-snug text-muted-foreground sm:text-lg">
      {p && (
        <>
          <Name c={p.a.c} /> et <Name c={p.b.c} /> ont <Num>{pct(p.j)}</Num> de viewers actifs en commun sur la période (<Num>{fmt(p.n)}</Num> {people(p.n)}).
        </>
      )}
      {p && f && " "}
      {f && (
        <>
          Le trajet le plus fréquent va de <Name c={f.from.c} /> vers <Name c={f.to.c} /> (<Num>{fmt(f.n)}</Num> {people(f.n)}).
        </>
      )}
    </p>
  )
}

/** Une ligne de colonne : les chaînes, puis une barre de 2 px proportionnelle et la valeur. */
function Row({ who, r, right }: { who: ReactNode; r: number; right: ReactNode }) {
  return (
    <li className="py-2.5 first:pt-0">
      <div className="flex min-w-0 items-center gap-1.5 text-[13px]">{who}</div>
      <div className="mt-2 flex items-center gap-3">
        <span className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/[.06]">
          <span className="block h-full rounded-full" style={{ width: `${Math.max(r * 100, 3).toFixed(1)}%`, background: `linear-gradient(90deg,rgba(${ACCENT},.35),rgb(${ACCENT}))` }} />
        </span>
        <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{right}</span>
      </div>
    </li>
  )
}

function Column({ title, sub, children, className }: { title: string; sub: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col px-5 py-4", className)}>
      <h3 className="text-[13px] font-semibold tracking-[-0.01em]">{title}</h3>
      <p className="mt-0.5 mb-3 text-xs text-dusk">{sub}</p>
      <div className="flex-1">{children}</div>
    </div>
  )
}

const None = ({ children }: { children: ReactNode }) => <p className="text-[12.5px] text-dusk">{children}</p>

/** Chaîne non suivie (raideur venu d'ailleurs) : photo et nom, sans lien vers l'onglet Par chaîne. */
const Outside = ({ who }: { who: Who & { name: string } }) => (
  <span className="inline-flex min-w-0 items-center gap-2">
    <ChannelAvatar {...who} />
    <span className="max-w-[18ch] truncate font-medium">{who.name}</span>
  </span>
)

export function Recoup({ d }: { d: RecoupData }) {
  const period = usePeriodInfo()
  const empty = d.channels < 2 || (!d.pairs.length && !d.flows.length && !d.raid)
  const maxJ = Math.max(...d.pairs.map((p) => p.j), 0) || 1
  const maxN = Math.max(...d.flows.map((f) => f.n), 0) || 1

  // Calculer le nombre d'heures de données pour la période
  const hasApi = period?.hours !== undefined && period.hours > 0

  return (
    <Section
      title="Recoupements"
      note={!empty && (
        <>
          Paires classées par la part de viewers actifs qu'elles ont en commun (communs ÷ viewers des deux chaînes réunies), à partir de {d.pairMin} en commun
          {d.channels > d.pairMax && <>, parmi les {d.pairMax} chaînes qui ont le plus de viewers actifs</>}. Un trajet = quelqu'un qui écrit chez A, puis chez B moins de 3 h
          après ; la durée affichée est le délai médian entre les deux.
        </>
      )}
    >
      {empty ? (
        <Empty>
          {d.channels < 2
            ? "Les recoupements apparaissent dès que deux chaînes suivies ont des viewers actifs sur la période."
            : `Pas encore de recoupement sur cette période : aucune paire de chaînes suivies n'atteint ${d.pairMin} viewers actifs en commun, et personne n'est passé d'un chat à l'autre.`}
          {d.channels >= 2 && WIDER[d.period] && (
            <Button variant="secondary" size="sm" className="mx-auto mt-3 flex border border-input" onClick={() => setPeriod(WIDER[d.period].p)}>
              {WIDER[d.period].label}
            </Button>
          )}
        </Empty>
      ) : (
        <div className={cn(panel, "overflow-hidden")}>
          <RecoupActions d={d} />
          <div className="border-b border-border px-5 pt-5 pb-4">
            <Headline d={d} />
            {hasApi && period && (
              <p className="mt-2 text-xs text-dusk">
                {period.range} - {period.hours}h de données
              </p>
            )}
          </div>
          <div className="grid lg:grid-cols-3 [&>*+*]:border-border max-lg:[&>*+*]:border-t lg:[&>*+*]:border-l">
            <Column title="Paires les plus proches" sub="Part de viewers actifs en commun">
              {d.pairs.length ? (
                <ol>
                  {d.pairs.map((p) => (
                    <Row
                      key={p.a.c + p.b.c}
                      r={p.j / maxJ}
                      who={<><ChannelCell who={p.a} /><ArrowLeftRight role="img" aria-label="et" className="size-3 shrink-0 text-dusk" /><ChannelCell who={p.b} /></>}
                      right={<>{pct(p.j)} <span className="text-dusk">· {fmt(p.n)} {people(p.n)}</span></>}
                    />
                  ))}
                </ol>
              ) : (
                <None>Aucune paire avec au moins {d.pairMin} viewers actifs en commun sur la période.</None>
              )}
            </Column>

            <Column title="Trajets les plus fréquents" sub="Personnes passées d'un chat à l'autre, délai médian">
              {d.flows.length ? (
                <ol>
                  {d.flows.map((f) => (
                    <Row
                      key={f.from.c + ">" + f.to.c}
                      r={f.n / maxN}
                      who={<><ChannelCell who={f.from} /><ArrowRight role="img" aria-label="vers" className="size-3 shrink-0 text-dusk" /><ChannelCell who={f.to} /></>}
                      right={<>{fmt(f.n)} {people(f.n)}{f.gap && <span className="text-dusk"> · {f.gap}</span>}</>}
                    />
                  ))}
                </ol>
              ) : (
                <None>Aucun passage d'un chat à l'autre sur la période.</None>
              )}
            </Column>

            <Column title="Dernier raid" sub="Reçu par une chaîne suivie">
              {d.raid ? (
                <div>
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[13px]">
                    {d.raid.from ? <Outside who={d.raid.from} /> : <span className="text-dusk">Raideur inconnu</span>}
                    <ArrowRight role="img" aria-label="vers" className="size-3 shrink-0 text-dusk" />
                    <ChannelCell who={d.raid.to} />
                  </div>
                  <p className="mt-3 text-[26px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
                    {fmt(d.raid.n)}
                    <span className="ml-1.5 text-[13px] font-normal tracking-normal text-muted-foreground">viewers apportés</span>
                  </p>
                  <p className="mt-2 text-xs text-dusk" title={d.raid.when}>il y a {d.raid.ago}</p>
                </div>
              ) : (
                <None>Aucun raid reçu sur la période.</None>
              )}
            </Column>
          </div>
        </div>
      )}
    </Section>
  )
}