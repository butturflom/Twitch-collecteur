// Vue d'ensemble → En ce moment : le direct, jamais la période. Les jeux du moment et les streamers montants.
// Calculs et état du relevé : liveNowData() dans legacy.js. Un relevé trop vieux n'est pas montré comme le direct.
import { Gamepad2 } from "lucide-react"
import { ChannelAvatar } from "@/components/channel-avatar"
import { ChannelCell, DataTable, Empty, heat, type Col } from "@/components/overview/parts"
import { fmt } from "@/lib/format"
import { atTime, dayOnly, dayTime } from "./dates"
import type { LiveGame, LiveNowData, RisingRow } from "@/legacy/bridge"

const plural = (n: number, one: string, many = one + "s") => (n > 1 ? many : one)
const when = (t: number) => (dayOnly(t) === dayOnly(Date.now()) ? atTime(t) : dayTime(t))
const rise = (r: number) => (r < 0.01 ? "< 1 %" : `+${fmt(r * 100)} %`)
const settings = <a href="#" data-goto="settings" className="text-primary-soft underline underline-offset-2">Réglages</a>

function Games({ rows }: { rows: LiveGame[] }) {
  const max = Math.max(...rows.map((g) => g.viewers), 0) || 1
  const cols: Col<LiveGame>[] = [
    {
      head: "Jeu", left: true,
      cell: (g) => (
        <span className="flex min-w-0 items-center gap-2">
          <Gamepad2 aria-hidden className="size-3.5 shrink-0 text-dusk" />
          <span className="max-w-[20ch] truncate font-medium" title={g.g}>{g.g}</span>
        </span>
      ),
    },
    {
      head: "Chaînes en live",
      cell: (g) => (
        <span className="inline-flex items-center justify-end gap-2" title={g.chans.map((c) => c.c).join(", ") + (g.n > g.chans.length ? "…" : "")}>
          <span aria-hidden className="flex -space-x-1.5">{g.chans.map((c) => <ChannelAvatar key={c.c} {...c} size={16} />)}</span>
          {fmt(g.n)}
        </span>
      ),
    },
    { head: "Viewers en direct", cell: (g) => fmt(g.viewers), style: (g) => heat((g.viewers / max) * 0.4) },
    { head: "Écrivent (10 min)", cell: (g) => fmt(g.wrote) },
  ]
  return <DataTable limit={5} noun={["jeu", "jeux"]} cols={cols} rows={rows} rowKey={(g) => g.g} />
}

function Rising({ rows }: { rows: RisingRow[] }) {
  const max = Math.max(...rows.map((r) => r.rate), 0) || 1
  const cols: Col<RisingRow>[] = [
    {
      head: "Chaîne", left: true,
      cell: (r) => (
        <span className="block">
          <span className="flex items-center gap-2">
            <ChannelCell who={r} />
            {r.game && <span className="max-w-[14ch] truncate text-xs text-dusk max-xl:hidden" title={r.game}>{r.game}</span>}
          </span>
          {r.game && <span className="mt-0.5 block max-w-[20ch] truncate pl-7 text-[11.5px] text-dusk xl:hidden" title={r.game}>{r.game}</span>}
          {r.raidAt != null && <span className="mt-0.5 block pl-7 text-[11.5px] text-primary-soft">raid reçu à {atTime(r.raidAt)}</span>}
        </span>
      ),
    },
    { head: "Viewers en direct", cell: (r) => fmt(r.v) },
    {
      head: "Sur 30 min",
      cell: (r) => (
        <span className="block whitespace-nowrap" title={`${fmt(r.v30)} viewers il y a 30 min, ${fmt(r.v)} maintenant`}>
          <span className="text-signal-green">{rise(r.rate)}</span>
          <span className="block text-[11px] text-dusk">+{fmt(r.gain)}</span>
        </span>
      ),
      style: (r) => heat((r.rate / max) * 0.4),
    },
    { head: "Msg/min (5 min)", cell: (r) => fmt(r.mpm) },
  ]
  return <DataTable limit={5} cols={cols} rows={rows} rowKey={(r) => r.c} />
}

/** Pourquoi il n'y a pas de direct à montrer. */
function NoLive({ d }: { d: LiveNowData }) {
  const last = d.at ?? d.seen
  if (d.state === "loading") return <div role="status"><Empty>Chargement du direct…</Empty></div>
  if (d.state === "noapi") return <Empty>Le direct (lives, viewers, jeux) demande l’API Twitch. Configure-la dans {settings}, ou dans config.json pour le collecteur.</Empty>
  if (d.state === "off")
    return (
      <Empty>
        {d.mode === "cloud"
          ? <>Le collecteur est hors ligne{d.seen != null && <> depuis {when(d.seen)}</>} : le direct n’est pas connu. Il reviendra dès que le collecteur aura redémarré.</>
          : <>L’écoute est à l’arrêt : démarre-la pour voir le direct.</>}
        {d.at != null && <span className="mt-1 block text-dusk">Dernier relevé de l’API Twitch : {when(d.at)}. Trop vieux pour être montré comme le direct.</span>}
      </Empty>
    )
  return (
    <Empty>
      Le relevé de l’API Twitch est interrompu ou trop vieux{last != null && <> (dernier relevé : {when(last)})</>} : il n’est pas montré comme le direct. Regarde la pilule d’état, en haut de page, pour voir si le collecteur signale un problème.
    </Empty>
  )
}

const note = "mt-2.5 max-w-[72ch] px-0.5 text-xs leading-relaxed text-dusk [&_b]:font-semibold [&_b]:text-muted-foreground"

export function LiveNow({ d }: { d: LiveNowData }) {
  const ok = d.state === "ok"
  return (
    <div role="region" aria-label="En ce moment" className="mt-9">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="text-[15px] font-semibold tracking-[-0.015em]">En ce moment</h2>
        {ok && d.followed > 0 && (
          <p className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
            {d.live > 0 && <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-live-red shadow-live-glow motion-reduce:animate-none" />}
            <span>
              <span className="font-mono text-foreground tabular-nums">{fmt(d.live)}</span> {plural(d.live, "chaîne")} en live sur {fmt(d.followed)}
              {d.at != null && <> · relevé de {when(d.at)}</>}
            </span>
          </p>
        )}
      </div>

      {!ok ? (
        <NoLive d={d} />
      ) : d.live === 0 ? (
        <Empty>
          {d.followed === 0 ? "Aucune chaîne suivie à montrer." : "Aucune chaîne suivie n’est en live en ce moment. Les jeux et les streamers montants reviennent au prochain live."}
        </Empty>
      ) : (
        <div className="grid gap-x-4 gap-y-6 lg:grid-cols-2 [&>*]:min-w-0">
          <div>
            <h3 className="mb-2 text-[13.5px] font-semibold tracking-[-0.01em]">Les jeux du moment</h3>
            <Games rows={d.games} />
            <p className={note}>
              Classés par <b>viewers en direct</b> cumulés de tes chaînes suivies sur ce jeu : ce n’est pas l’audience du jeu sur Twitch. « Écrivent » : viewers actifs distincts qui ont écrit sur ces chaînes dans les 10 dernières minutes.
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-[13.5px] font-semibold tracking-[-0.01em]">Les streamers montants</h3>
            {d.rising.length ? (
              <Rising rows={d.rising} />
            ) : (
              <Empty>
                {d.eligible > 0
                  ? `Personne ne monte en ce moment : aucune des ${d.eligible > 1 ? `${fmt(d.eligible)} chaînes classables` : "chaînes classables"} n’a plus de viewers qu’il y a 30 min.`
                  : !d.history
                    ? "Pas encore 30 minutes de relevés : le classement apparaîtra ensuite."
                    : "Aucune chaîne ne remplit les critères pour l’instant."}
              </Empty>
            )}
            <p className={note}>
              Classés par <b>gain de viewers sur les 30 dernières minutes</b>, en part (dernier relevé de l’API Twitch contre celui d’il y a 30 min). Seulement les chaînes <b>en live depuis 30 min au moins</b>, avec <b>100 viewers ou plus</b> il y a 30 min, et qui montent. Un raid reçu fait monter d’un coup : il est signalé sous le nom.
              {d.young > 0 && <> {fmt(d.young)} {plural(d.young, "chaîne")} en live depuis moins de 30 min {d.young > 1 ? "ne sont pas encore classées" : "n’est pas encore classée"}.</>}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
