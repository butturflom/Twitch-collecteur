// Onglet « Par jeu », en React. Les chiffres viennent de l'ancien code (événement legacy:game).
import { ChannelAvatar } from "@/components/channel-avatar"
import { ChannelCell, DataTable, Delta, Empty, Section, panel, muted, type Col, Pending } from "@/components/overview/parts"
import { Matrix } from "@/components/shared/matrix"
import { fmt, fmt1 } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useGameData, type GameData } from "@/legacy/bridge"

type GameRow = GameData["games"][number]
type SwitchGame = GameData["switchGames"][number]

function AvatarStack({ list, max = 5 }: { list: GameRow["chans"]; max?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex -space-x-1.5">
        {list.slice(0, max).map((c) => <span key={c.c} title={c.c}><ChannelAvatar {...c} /></span>)}
        {list.length > max && <span className="z-10 grid size-5 place-items-center rounded-full bg-accent font-sans text-[9px] font-semibold text-muted-foreground ring-[1.5px] ring-background">+{list.length - max}</span>}
      </span>
      <span className="min-w-5 text-right">{list.length}</span>
    </span>
  )
}

function Games({ rows }: { rows: GameRow[] }) {
  const cols: Col<GameRow>[] = [
    { head: "Jeu / catégorie", left: true, cell: (r) => <span className="block max-w-[280px] truncate font-medium" title={r.g}>{r.g}</span> },
    { head: "Chaînes", cell: (r) => <AvatarStack list={r.chans} /> },
    { head: "Temps de stream", cell: (r) => r.air },
    { head: "Viewers moyens", cell: (r) => (r.avgV != null ? fmt(r.avgV) : "—") },
    { head: "Viewers actifs", cell: (r) => fmt(r.users) },
    { head: "Messages", cell: (r) => fmt(r.msgs) },
    { head: "Msg / viewer actif", cell: (r) => (r.perUser != null ? fmt1(r.perUser) : "—") },
  ]
  return <DataTable cols={cols} rows={rows} rowKey={(r) => r.g} />
}

function Switches({ rows }: { rows: SwitchGame[] }) {
  const eff = (x: number | null) => (x == null ? muted("—") : <Delta after={1 + x} before={1} />)
  const cols: Col<SwitchGame>[] = [
    { head: "Nouveau jeu", left: true, cell: (r) => <span className="block max-w-[320px] truncate font-medium" title={r.g}>{r.g}</span> },
    { head: "Passages", cell: (r) => fmt(r.n) },
    { head: "Effet médian sur les viewers", cell: (r) => eff(r.dv) },
    { head: "Effet médian sur le chat", cell: (r) => eff(r.dm) },
  ]
  return <DataTable cols={cols} rows={rows} rowKey={(r) => r.g} />
}

export function Game() {
  const d = useGameData()
  if (!d) return <Pending />
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      {!d.hasApi ? (
        <Empty>
          Cet onglet a besoin de l'API Twitch pour savoir à quel jeu joue chaque chaîne.{" "}
          <a href="#" data-goto="settings" className="text-primary-soft underline underline-offset-2">Configurer</a>
        </Empty>
      ) : (
        <>
          <Section title="Catégories">
            {d.games.length ? <Games rows={d.games} /> : <Empty>Pas encore de données sur cette période. Lance l'écoute pendant que les chaînes sont en live.</Empty>}
          </Section>
          <Section className="mt-9" title="Quand une chaîne passe sur ce jeu" note={d.switchGames.length ? "Compare les 20 minutes après le changement aux 20 minutes avant, toutes chaînes suivies confondues. Fiable à partir de quelques dizaines de passages." : undefined}>
            {d.switchGames.length ? <Switches rows={d.switchGames} /> : <Empty>Aucun changement de jeu repéré sur cette période.</Empty>}
          </Section>
          <Section className="mt-9" title="Chevauchement entre jeux" note={d.matrix ? "% des viewers actifs d'un jeu (toutes chaînes confondues) qu'on a aussi vus écrire pendant un stream de l'autre jeu." : undefined}>
            <Matrix data={d.matrix} label="Viewers actifs de" />
          </Section>
        </>
      )}
    </div>
  )
}
