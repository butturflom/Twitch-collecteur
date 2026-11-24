// Onglet « Par jeu », en React. Les chiffres viennent de l'ancien code (événement legacy:game) ;
// la recherche de streamers passe par runDiscover() (API Twitch), qui renvoie ses résultats par le même événement.
import { useEffect, useState } from "react"
import { Check, Loader2, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChannelAvatar } from "@/components/channel-avatar"
import { ChannelCell, DataTable, Delta, Empty, Section, panel, muted, type Col, Pending } from "@/components/overview/parts"
import { Matrix } from "@/components/shared/matrix"
import { fmt, fmt1 } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useGameData, type GameData } from "@/legacy/bridge"

type GameRow = GameData["games"][number]
type SwitchGame = GameData["switchGames"][number]
type Stream = GameData["discover"]["streams"][number]

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

/** Recherche des plus gros lives d'une catégorie, pour les suivre en un clic (boutons data-add / data-addtop, gérés par l'ancien code). */
function Discover({ d, canSearch }: { d: GameData["discover"]; canSearch: boolean }) {
  const [q, setQ] = useState(d.q)
  const [lang, setLang] = useState(d.lang)
  useEffect(() => { if (d.q) setQ(d.q) }, [d.q])
  const go = () => window.runDiscover?.(q, lang)
  const cols: Col<Stream>[] = [
    { head: "Chaîne", left: true, cell: (r) => <ChannelCell who={r} link={false} /> },
    { head: "Titre", left: true, cell: (r) => <span className="block max-w-[360px] truncate text-muted-foreground" title={r.title}>{r.title}</span> },
    { head: "Viewers", cell: (r) => fmt(r.viewers) },
    {
      head: "", cell: (r) =>
        r.followed ? (
          <span className="inline-flex items-center gap-1 font-sans text-xs text-muted-foreground"><Check className="size-3.5" />suivie</span>
        ) : (
          <Button size="sm" variant="secondary" className="h-7 border border-input font-sans text-xs" data-add={r.c}><Plus className="pointer-events-none" />Suivre</Button>
        ),
    },
  ]
  return (
    <div className={cn(panel, "p-4")}>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); go() }}>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nom de la catégorie, ex. VALORANT, Grand Theft Auto VI, Just Chatting"
          aria-label="Catégorie Twitch"
          className="h-9 min-w-[220px] flex-1 bg-background"
        />
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          aria-label="Langue des lives"
          className="h-9 rounded-md border border-field-edge bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="fr">Français</option>
          <option value="">Toutes langues</option>
        </select>
        <Button type="submit" className="h-9" disabled={!canSearch || !q.trim() || d.status === "loading"}>
          {d.status === "loading" ? <Loader2 className="animate-spin" /> : <Search />}Chercher
        </Button>
      </form>
      {!canSearch && (
        <p className="mt-3 text-xs text-muted-foreground">
          La recherche passe par l'API Twitch de ce navigateur : <a href="#" data-goto="settings" className="text-primary-soft underline underline-offset-2">configure-la dans Réglages</a>.
        </p>
      )}
      <div className="mt-4">
        {d.status === "idle" && <p className="text-xs text-dusk">Liste les plus gros lives du moment dans une catégorie, pour les ajouter au suivi en un clic.</p>}
        {d.status === "loading" && <p className="text-xs text-muted-foreground">Recherche…</p>}
        {d.status === "error" && <p className="text-xs text-destructive">Erreur : {d.error}</p>}
        {d.status === "done" && (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px]"><b className="font-semibold">{d.game}</b> <span className="text-muted-foreground">· {d.streams.length} lives</span></p>
              {d.streams.length > 0 && (
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" className="h-7 border border-input text-xs" data-addtop="10">Suivre le top 10</Button>
                  <Button size="sm" variant="secondary" className="h-7 border border-input text-xs" data-addtop="20">Suivre le top 20</Button>
                </div>
              )}
            </div>
            {d.streams.length ? <DataTable bare cols={cols} rows={d.streams} rowKey={(r) => r.c} /> : <Empty>Aucun live dans cette catégorie pour l'instant.</Empty>}
          </>
        )}
      </div>
    </div>
  )
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
      <Section className="mt-9" title="Trouver des streamers par catégorie">
        <Discover d={d.discover} canSearch={d.canSearch} />
      </Section>
    </div>
  )
}
