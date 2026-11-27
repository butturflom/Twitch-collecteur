// Onglet « Vue d'ensemble », en React. Les chiffres viennent de l'ancien code (événement legacy:overview).
import { StatCard, StatCardGroup } from "@/components/ui/stat-card"
import { fmt, fmt1, pct } from "@/lib/format"
import { useEffect, useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { Two } from "@/components/shared/blocks"
import { cn } from "@/lib/utils"
import { useOverviewData, usePeriodInfo, type BrandRow, type ChannelInfo, type FollowerRow, type ModRow, type PartRow } from "@/legacy/bridge"
import { Phase3Analysis } from "./phase3-analysis"
import { ChannelCard, ChannelRow } from "./channel-card"
import { NetworkHistoryBlock } from "./network-history"
import { RhythmBlock } from "./rhythm"
import { Recoup } from "./recoup"
import { RaidTicker } from "./raid-ticker"
import { LineChart } from "@/components/charts/line-chart"
import { ChannelCell, DataTable, Delta, Empty, Section, ShowMore, heat, muted, panel, type Col, Pending } from "./parts"
import { ShareButton } from "@/components/share"

/** Deux graphiques côte à côte : le panneau prend toute la hauteur de la rangée, les axes restent alignés. */
const PAIR = "flex flex-col [&>:last-child]:flex-1"
/** L'indicateur qui mène à l'onglet Chevauchement. */
const MULTI = "Actifs dans 2 chats ou plus"
const maxOf = <T,>(a: T[], f: (x: T) => number | null) => Math.max(0, ...a.map((x) => f(x) ?? 0)) || 1
const nf = (x: number | null, f: (n: number) => string) => (x != null && isFinite(x) ? f(x) : "—")
const extraCount = (followers: FollowerRow[], brand: BrandRow[] | null, mod: { rows: ModRow[]; noDel: boolean } | null) =>
  (followers.length > 0 ? 1 : 0) + (brand && brand.length > 0 ? 1 : 0) + (mod ? 1 : 0)

/**
 * Barre de sauts en tête de page : la Vue d'ensemble est longue, et ce qu'on cherche (un classement, le rythme) se trouvait au bout du
 * défilement. Chaque saut vise la région dont le titre est donné ; un saut sans région sur la page (bloc vide, sans API) est omis.
 */
const JUMPS: [string, string][] = [
  ["Recoupements", "Recoupements"],
  ["Les chaînes", "Les chaînes"],
  ["Messages par minute", "Courbes"],
  ["Participation du chat pendant les lives", "Participation"],
  ["Classements · audience et communautés", "Classements"],
  ["Rythme des chaînes", "Rythme"],
  ["Historique du réseau", "Historique"],
]
const regionOf = (title: string) => Array.from(document.querySelectorAll<HTMLElement>("[role=region]")).find((e) => e.getAttribute("aria-label") === title) ?? null
function JumpNav() {
  const [titles, setTitles] = useState<string[]>([])
  // les blocs de l'historique et du rythme se montent un peu après la page : on relit la liste quand le DOM change
  useEffect(() => {
    const read = () => setTitles((old) => {
      const next = JUMPS.filter(([t]) => regionOf(t)).map(([t]) => t)
      return old.length === next.length && old.every((t, i) => t === next[i]) ? old : next
    })
    read()
    const t = setInterval(read, 1500)
    return () => clearInterval(t)
  }, [])
  if (titles.length < 3) return null
  return (
    <nav aria-label="Aller à une section" className="-mt-2 mb-6 flex flex-wrap items-center gap-1">
      <span className="mr-1 text-xs text-dusk">Aller à</span>
      {JUMPS.filter(([t]) => titles.includes(t)).map(([t, label]) => (
        <button key={t} type="button"
          onClick={() => regionOf(t)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" })}
          className="inline-flex h-7 items-center rounded-full border border-white/10 bg-zinc-950/50 px-2.5 text-xs font-medium text-zinc-300 transition-colors hover:border-white/25 hover:text-white focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none">
          {label}
        </button>
      ))}
    </nav>
  )
}

function Participation({ rows }: { rows: PartRow[] }) {
  const mP = maxOf(rows, (r) => r.perMin), mK = maxOf(rows, (r) => r.msgK), mI = maxOf(rows, (r) => r.inter)
  const cols: Col<PartRow>[] = [
    { head: "Chaîne", left: true, cell: (r) => <ChannelCell who={r} limited={r.limited} /> },
    { head: "Viewers moyens en live", cell: (r) => fmt(r.avgV) },
    { head: "Écrivent chaque minute", title: "Viewers actifs différents par minute ÷ viewers", cell: (r) => pct(r.perMin), style: (r) => heat((r.perMin / mP) * 0.4) },
    { head: "Msg/min pour 1 000 viewers", cell: (r) => fmt1(r.msgK), style: (r) => heat((r.msgK / mK) * 0.4) },
    { head: "Actifs ÷ viewers", title: "Viewers actifs sur la période ÷ viewers moyens", cell: (r) => pct(r.uniq) },
    { head: "Réactions", cell: (r) => pct(r.react) },
    { head: "Interactions", cell: (r) => pct(r.inter), style: (r) => (r.inter != null ? heat((r.inter / mI) * 0.4) : undefined) },
  ]
  return <DataTable limit={10} cols={cols} rows={rows} rowKey={(r) => r.c} />
}

function Followers({ rows }: { rows: FollowerRow[] }) {
  const ratio = (r: FollowerRow) => (r.avgV != null ? r.avgV / r.fol : null)
  const mR = maxOf(rows, ratio)
  const cols: Col<FollowerRow>[] = [
    { head: "Chaîne", left: true, cell: (r) => <ChannelCell who={r} /> },
    { head: "Followers", cell: (r) => fmt(r.fol) },
    { head: "Viewers moyens en live", cell: (r) => nf(r.avgV, fmt) },
    { head: "Viewers ÷ followers", title: "Viewers moyens pendant les lives ÷ followers", cell: (r) => pct(ratio(r)), style: (r) => { const x = ratio(r); return x != null ? heat((x / mR) * 0.4) : undefined } },
    { head: "Followers par jour", title: "Évolution moyenne sur toute la durée des relevés", cell: (r) => (r.grow != null ? (r.grow >= 0 ? "+" : "") + fmt(r.grow) : muted("après 24 h de relevés")) },
  ]
  return <DataTable limit={10} cols={cols} rows={rows} rowKey={(r) => r.c} />
}

function Brand({ rows }: { rows: BrandRow[] }) {
  const cols: Col<BrandRow>[] = [
    { head: "Chaîne", left: true, cell: (r) => <ChannelCell who={r} link={false} /> },
    { head: "Msg/min pour 1 000 viewers, avec pub", cell: (r) => fmt1(r.with.msgK) },
    { head: "Sans pub", cell: (r) => fmt1(r.without.msgK) },
    { head: "Écart", cell: (r) => <Delta after={r.with.msgK} before={r.without.msgK} /> },
    { head: "Écrivent chaque minute, avec pub", cell: (r) => pct(r.with.perMin) },
    { head: "Sans pub", key: "sans-pub-ecrivent", cell: (r) => pct(r.without.perMin) },
  ]
  return <DataTable limit={10} cols={cols} rows={rows} rowKey={(r) => r.c} />
}

function Moderation({ rows, noDel }: { rows: ModRow[]; noDel: boolean }) {
  const mR = maxOf(rows, (r) => r.rate), mD = maxOf(rows, (r) => r.drate)
  const cols: Col<ModRow>[] = [
    { head: "Chaîne", left: true, cell: (r) => <ChannelCell who={r} limited={r.limited} /> },
    { head: "Bans", cell: (r) => fmt(r.ban) },
    { head: "Timeouts", cell: (r) => fmt(r.to) },
    { head: "Messages supprimés", title: "Messages supprimés un par un par un modérateur ou un bot", cell: (r) => (noDel ? "—" : fmt(r.del)) },
    { head: "Chat vidé", title: "Chat entièrement vidé par un modérateur (/clear)", cell: (r) => fmt(r.clr) },
    { head: "Sanctions / 1 000 msg", title: "(Bans + timeouts) ÷ messages, depuis le début du relevé", cell: (r) => nf(r.rate, fmt1), style: (r) => (r.rate != null ? heat((r.rate / mR) * 0.4) : undefined) },
    { head: "Supprimés / 1 000 msg", title: "Messages supprimés ÷ messages, depuis le début du relevé", cell: (r) => nf(r.drate, fmt1), style: (r) => (r.drate != null ? heat((r.drate / mD) * 0.4) : undefined) },
  ]
  return <DataTable limit={10} cols={cols} rows={rows} rowKey={(r) => r.c} />
}

/**
 * Les chaînes : une carte entière pour chaque chaîne en live (ou dont l'état est inconnu, sans API Twitch), une ligne compacte
 * pour les chaînes hors ligne, qui n'ont rien « maintenant » à montrer. 8 cartes et 5 lignes visibles, le reste derrière un bouton.
 * Option « 2 premières hors ligne en cartes » : les 2 premières chaînes hors ligne s'affichent aussi en carte.
 */
const CARDS = 8
const ROWS = 5
const ROWS_AS_CARDS_KEY = "to2-ov-rows-as-cards"
function ChannelGrid({ channels }: { channels: ChannelInfo[] }) {
  const [openCards, setOpenCards] = useState(false)
  const [openRows, setOpenRows] = useState(false)
  const [rowsAsCards, setRowsAsCards] = useState(() => {
    try { return localStorage.getItem(ROWS_AS_CARDS_KEY) === "1" }
    catch { return false }
  })
  const cards = channels.filter((c) => c.live !== false)
  const rows = channels.filter((c) => c.live === false)
  // Les 2 premières chaînes hors ligne peuvent être affichées en carte si l'option est activée
  const rowsAsCardsCount = rowsAsCards ? 2 : 0
  const rowCards = rows.slice(0, rowsAsCardsCount)
  const rowLines = rows.slice(rowsAsCardsCount)
  const cutCards = cards.length > CARDS + 1 && !openCards
  const rowLinesCut = rowLines.length > ROWS + 1 && !openRows
  // réglage de présentation, rare : une petite commande à droite du titre, pas un bouton posé dans le contenu
  const rowsToggle = (
    <button
      type="button"
      aria-pressed={rowsAsCards}
      onClick={() => {
        const next = !rowsAsCards
        setRowsAsCards(next)
        try { localStorage.setItem(ROWS_AS_CARDS_KEY, next ? "1" : "0") } catch { /* stockage indisponible */ }
      }}
      className={cn("inline-flex min-h-6 items-center rounded-md px-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        rowsAsCards ? "bg-primary-soft/10 text-primary-soft" : "text-muted-foreground hover:text-foreground")}
      title="Afficher les 2 premières chaînes hors ligne sous forme de carte, au lieu d'une ligne compacte">
      2 premières hors ligne en cartes
    </button>
  )
  return (
    <>
      {cards.length > 0 && (
        <>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <h3 className="text-xs font-medium text-dusk">Chaînes en live ({cards.length})</h3>
            {rows.length > 0 && rowsToggle}
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(272px,1fr))] gap-3">
            {(cutCards ? cards.slice(0, CARDS) : cards).map((ch) => <ChannelCard key={ch.c} ch={ch} />)}
          </div>
          {cards.length > CARDS + 1 && (
            <ShowMore className="mt-3" hidden={cards.length - CARDS} open={openCards} onToggle={() => setOpenCards((o) => !o)} noun={["chaîne en live", "chaînes en live"]} />
          )}
        </>
      )}
      {rowsAsCardsCount > 0 && (
        <>
          <div className={cn("mb-1.5 flex items-center justify-between gap-3", cards.length > 0 ? "mt-5" : "")}>
            <h3 className="text-xs font-medium text-dusk">Hors ligne ({rows.length})</h3>
            {cards.length === 0 && rowsToggle}
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(272px,1fr))] gap-3">
            {rowCards.map((ch) => <ChannelCard key={ch.c} ch={ch} />)}
          </div>
          <div className={cn(panel, "divide-y divide-white/5 overflow-hidden", rowCards.length > 0 ? "mt-3" : "")}>
            {(rowLinesCut ? rowLines.slice(0, ROWS) : rowLines).map((ch) => <ChannelRow key={ch.c} ch={ch} />)}
          </div>
          {rowLines.length > ROWS + 1 && (
            <ShowMore className="mt-3" hidden={rowLines.length - ROWS} open={openRows} onToggle={() => setOpenRows((o) => !o)} noun={["chaîne hors ligne", "chaînes hors ligne"]} />
          )}
        </>
      )}
      {rowsAsCardsCount === 0 && rows.length > 0 && (
        <div className={cards.length > 0 ? "mt-5" : undefined}>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <h3 className="text-xs font-medium text-dusk">Hors ligne ({rows.length})</h3>
            {cards.length === 0 && rowsToggle}
          </div>
          <div className={cn(panel, "divide-y divide-white/5 overflow-hidden")}>
            {(rowLinesCut ? rows.slice(0, ROWS) : rows).map((ch) => <ChannelRow key={ch.c} ch={ch} />)}
          </div>
          {rows.length > ROWS + 1 && (
            <ShowMore className="mt-3" hidden={rows.length - ROWS} open={openRows} onToggle={() => setOpenRows((o) => !o)} noun={["chaîne hors ligne", "chaînes hors ligne"]} />
          )}
        </div>
      )}
      {cards.length === 0 && rows.length === 0 && (
        <p className="text-xs text-dusk">Aucune chaîne en live en ce moment</p>
      )}
    </>
  )
}

/**
 * Analyses de fond (followers, publicité, modération) : repliées par défaut sous un bouton qui dit ce qu'elles contiennent,
 * pour que la page se lise d'abord sur l'essentiel. Le choix ouvert / fermé est gardé d'une visite à l'autre.
 */
const EXTRA_KEY = "to2-ov-extra"
function Extra({ children, count, pulse }: { children: ReactNode; count: number; pulse?: boolean }) {
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(EXTRA_KEY) === "1" } catch { return false } })
  const toggle = () => setOpen((o) => { try { localStorage.setItem(EXTRA_KEY, o ? "0" : "1") } catch { /* stockage indisponible : le choix vaut pour la visite */ } return !o })
  return (
    <div className="mt-12 border-t border-border pt-5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="ov-extra"
        onClick={toggle}
        className={cn("group inline-flex min-h-6 items-center gap-2 rounded-md text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          pulse && "animate-pulse motion-reduce:animate-none")}>
        <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-200", open && "rotate-180")} />
        <span className="hidden sm:inline">
          {open ? "Masquer les analyses supplémentaires" : `Afficher les analyses (${count})`}
        </span>
        {!count && !open && (
          <span className="hidden sm:inline">Aucune analyse supplémentaire</span>
        )}
      </button>
      <div id="ov-extra" hidden={!open || count === 0} className={cn("mt-6", count === 0 && "hidden")}>{children}</div>
    </div>
  )
}

export function Overview() {
  const d = useOverviewData()
  const period = usePeriodInfo()
  const [prevPeriod, setPrevPeriod] = useState<string | null>(null)
  const [pulseExtra, setPulseExtra] = useState(false)

  // Détecter le changement de période et déclencher l'animation
  useEffect(() => {
    if (prevPeriod !== null && period?.key !== prevPeriod) {
      setPulseExtra(true)
      // L'animation s'arrête après 2 secondes
      const timer = setTimeout(() => setPulseExtra(false), 2000)
      return () => clearTimeout(timer)
    }
    if (period?.key) setPrevPeriod(period.key)
  }, [period?.key, prevPeriod])

  if (!d) return <Pending />
  // les graphiques ne tracent que les chaînes les plus actives : on le dit dès qu'une certaines sont laissées de côté
  const hidden = d.chartOf.total - d.chartOf.shown
  const chartNote = hidden > 0
    ? `Les graphiques montrent les ${d.chartOf.shown} chaînes qui ont le plus écrit sur la période, sur ${d.chartOf.total} suivies. Les autres ont leurs courbes dans l'onglet Par chaîne.`
    : undefined
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      {/* sans API, des colonnes et des sections manquent sans bruit : on le dit là où ça se voit, pas en bas de page */}
      {!d.hasApi && (
        <p className="mb-7 max-w-[72ch] text-xs leading-relaxed text-muted-foreground">
          Sans l'API Twitch, les viewers, le jeu en cours et la participation du chat ne sont pas relevés.{" "}
          <a href="#" data-goto="settings" className="text-primary-soft underline underline-offset-2">Configurer l'API dans Réglages</a>
          {" "}(ou dans config.json pour le collecteur).
        </p>
      )}

      <JumpNav />

      <RaidTicker d={d.raids} />

      {/* la page ouvre sur ce qu'aucun site public ne montre : les recoupements, puis l'activité de la même période */}
      <Recoup d={d.recoup} />

      {/* Titre enrichi avec la période, heures de données et badge de données incomplètes */}
      <Section title={period?.key === "today" ? (period.range.startsWith("Aujourd") ? period.range : period.label) : period?.label ? `${period.label} · ${period.range || "Activité"}` : "Activité sur la période"} badge={!d.hasApi || period?.range === "Pas encore de relevé" ? "Données incomplètes" : undefined}>
        <StatCardGroup className="bg-linear-to-b from-dome-crest/90 to-dome/85 shadow-console max-sm:[&>[data-slot=stat-card]]:basis-36">
          {d.kpis.map((k) => (
            <StatCard key={k.label} variant="plain" className="px-[18px] py-4" label={k.label === MULTI ? <a href="#" data-goto="overlap" className="-my-1 inline-block py-1 underline decoration-dusk decoration-dotted underline-offset-[3px] hover:text-foreground">{k.label}</a> : k.label} value={k.value} hint={k.hint || undefined} trend={k.trend ?? undefined} trendLabel={k.trendLabel || undefined} />
          ))}
        </StatCardGroup>
      </Section>

      <Section title="Les chaînes">
        {d.channels.length ? (
          <ChannelGrid channels={d.channels} />
        ) : (
          <Empty>Ajoute des chaînes avec le bouton « Ajouter un streamer ».</Empty>
        )}
      </Section>

      {/* le pouls : chat et audience au fil du temps, côte à côte (comme l'onglet Par chaîne), juste après les chaînes */}
      {d.viewerChart ? (
        <Two>
          <Section title="Messages par minute" className={PAIR}>
            <LineChart spec={d.msgChart} label="Messages par minute" />
          </Section>
          <Section title="Viewers" className={PAIR}>
            <LineChart spec={d.viewerChart} label="Viewers" />
          </Section>
        </Two>
      ) : (
        // sans API, pas de courbe des viewers : celle des messages prend toute la largeur
        <Section title="Messages par minute">
          <LineChart spec={d.msgChart} label="Messages par minute" />
        </Section>
      )}
      {chartNote && <p className="mt-2.5 max-w-[72ch] px-0.5 text-xs leading-relaxed text-dusk">{chartNote}</p>}

      {d.part && (
        <Section
              title="Participation du chat pendant les lives"
              note={d.part.length ? "Rapporte l'activité du chat à la taille de l'audience, pour comparer des chaînes de tailles différentes. Calculé uniquement pendant les lives. Les très grosses chaînes ont presque toujours un taux plus bas (mode lent, chat qui défile trop vite pour suivre)." : undefined} action={<ShareButton title="Participation du chat pendant les lives" kpis={[ { label: "Chaînes analysées", value: String(d.part.length) }, { label: "Viewers moyens", value: fmt(d.part.reduce((a, r) => a + r.avgV, 0) / d.part.length) }, { label: "Perms/min", value: fmt1(d.part.reduce((a, r) => a + r.msgK, 0) * 1000 / d.part.reduce((a, r) => a + r.avgV, 0) / 1000) } ]} />}>
              {d.part.length ? <Participation rows={d.part} /> : <Empty>Il faut au moins 10 minutes de live d'une chaîne suivie sur la période.</Empty>}
            </Section>
      )}

      {/* les classements (ex-Phase 3) : ce qu'on cherche en ouvrant la page, donc hors du repli, juste après la participation */}
      <Phase3Analysis />

      {/* l'historique long vient après l'essentiel, replié : il redit l'activité sur d'autres échelles de temps */}
      <RhythmBlock />
      <NetworkHistoryBlock />

      {(() => {
        const extraCnt = extraCount(d.followers, d.brand, d.mod)
        return (
          <Extra count={extraCnt} pulse={pulseExtra}>
            {d.followers.length > 0 && (
              <Section title="Audience et followers" note="Le nombre de followers est relevé chaque heure. Un rapport viewers ÷ followers élevé veut dire que la communauté suit le live en direct plutôt que de seulement suivre la chaîne." action={<ShareButton title="Audience et followers" kpis={[ { label: "Chaînes analysées", value: String(d.followers.length) }, { label: "Followers moyens", value: fmt(d.followers.reduce((a, r) => a + r.fol, 0) / d.followers.length) } ]} />}>
                    <Followers rows={d.followers} />
                  </Section>
            )}

            {d.brand && (
              <Section title="Avec ou sans pub déclarée" note={d.brand.length ? (d.brandWide ? "Rien à comparer sur aujourd'hui : calculé sur tout le détail gardé. " : "") + "Compare le chat d'une même chaîne quand le stream est déclaré « contenu de marque » (sponsorisé) et quand il ne l'est pas. Calculé sur les minutes où le chat a écrit." : undefined} action={<ShareButton title="Avec ou sans pub déclarée" kpis={[ { label: "Chaînes analysées", value: String(d.brand.length) }, { label: "Écarts pub", value: `${d.brand.length === 0 ? "-" : d.brand.map(r => r.with.msgK - r.without.msgK).filter(d => d !== 0).length}/${d.brand.length}` } ]} />}>
                    {d.brand.length ? <Brand rows={d.brand} /> : <Empty>Pas encore de chaîne avec des lives à la fois avec et sans « contenu de marque » : la comparaison apparaît dès qu'une chaîne a eu les deux, avec au moins 15 minutes de chat de chaque côté.</Empty>}
                  </Section>
            )}

            <Section
                  title="Modération du chat"
                  note={d.mod?.rows.length ? "Compté à partir des annonces de Twitch dans le chat, quel que soit l'auteur (modérateur, bot ou AutoMod). Un message bloqué par AutoMod avant d'être affiché n'est pas annoncé, donc pas compté. Ni les pseudos, ni le modérateur, ni le texte des messages supprimés ne sont gardés. Les rapports aux messages ne sont calculés qu'à partir de 200 messages, et seulement depuis le début du relevé (collecteur 1.6 pour les sanctions, 1.6.1 pour les messages supprimés), pour ne pas les diluer avec les jours d'avant." : undefined} action={<ShareButton title="Modération du chat" kpis={[ { label: "Chaînes analysées", value: String(d.mod?.rows.length ?? 0) }, { label: "Total Bans", value: fmt(d.mod?.rows.reduce((a, r) => a + r.ban, 0) ?? 0) }, { label: "Total Timeouts", value: fmt(d.mod?.rows.reduce((a, r) => a + r.to, 0) ?? 0) } ]} />}
                >
                  {!d.mod ? (
                    <Empty>Bans, timeouts et messages supprimés relevés à partir du collecteur 1.6 : ils apparaîtront ici dès la première sanction.</Empty>
                  ) : d.mod.rows.length ? (
                    <Moderation rows={d.mod.rows} noDel={d.mod.noDel} />
                  ) : (
                    <Empty>Aucune sanction ni message supprimé sur cette période.</Empty>
                  )}
                </Section>
          </Extra>
        )}
      )()}
    </div>
  )
}
