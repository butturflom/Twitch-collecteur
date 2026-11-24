// Onglet « Carte ». React possède la page : menu de filtres, boutons, fiche de la chaîne choisie, messages.
// La carte elle-même (radar, disposition, rotation, glisser, zoom, activité en direct) est dessinée image par image par le
// moteur de l’ancien code, dans les éléments que React lui fournit (mount) ; il renvoie ses commandes (MapApi).
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { ChevronsLeft, CircleQuestionMark, Crosshair, Globe, Maximize2, Menu, Minus, Pause, Play, Plus, RotateCcw, Shuffle, X } from "lucide-react"
import { LangBadge } from "@/components/lang-badge"
import { Tabs } from "radix-ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChannelAvatar } from "@/components/channel-avatar"
import { MeterList } from "@/components/overview/parts"
import { Galaxy } from "@/components/map/galaxy"
import { fmt, pct } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useMapData, type MapApi, type MapData, type MapNotice, type MapViewState } from "@/legacy/bridge"

const act = (...a: Parameters<NonNullable<Window["mapAction"]>>) => window.mapAction?.(...a)

function Sec({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="text-xs font-medium text-dusk">{title}</div>
      {children}
    </div>
  )
}

/** Contrôle segmenté (période, langue) : piste sombre, segment actif en relief ; les segments prennent la largeur de leur texte et passent à la ligne si besoin. */
function Seg({ items, onPick, label }: { items: { key: string; label: string; on: boolean; count?: number }[]; onPick: (k: string) => void; label: string }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap gap-0.5 rounded-lg border border-white/5 bg-zinc-950/80 p-1 shadow-well"
    >
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          aria-pressed={it.on}
          onClick={() => onPick(it.key)}
          className={cn(
            "flex h-8 flex-auto items-center justify-center gap-1 rounded-md px-1.5 text-xs font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,opacity,transform] motion-reduce:transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none",
            it.on
              ? "bg-zinc-800 text-white shadow-sm shadow-black/40 ring-1 ring-white/10"
              : "text-zinc-400 hover:bg-white/[.03] hover:text-zinc-100",
          )}
        >
          <span>{it.label}</span>
          {it.count != null && <span className={cn("font-mono text-[10.5px] tabular-nums transition-colors duration-200", it.on ? "text-zinc-400" : "text-dusk")}>{it.count}</span>}
        </button>
      ))}
    </div>
  )
}

function Side({ d, api, grp, sel, log }: { d: MapData; api: MapApi | null; grp: number | null; sel: string | null; log: NonNullable<MapNotice["log"]> }) {
  const [q, setQ] = useState("")
  const shown = useMemo(() => (d.pick ?? []).filter((c) => !q.trim() || c.c.includes(q.trim().toLowerCase())), [d.pick, q])
  const views: [MapData["view"], string, number | null][] = [["all", "Toutes les chaînes", null], ["groups", "Groupes", null], ["sel", "Ma sélection", d.picked]]
  return (
    <aside
      aria-label="Filtres de la carte"
      className="flex w-[290px] shrink-0 flex-col gap-5 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] rounded-2xl border border-white/10 bg-zinc-900/70 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl backdrop-saturate-150 max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-30 max-md:w-[min(320px,calc(100%-16px))]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold tracking-[-0.01em] text-zinc-100">Filtres de la carte</span>
        <Button variant="secondary" size="icon" className="size-7 border border-white/10 bg-zinc-950/60 text-zinc-400 transition-[color,background-color,border-color,box-shadow,opacity,transform] motion-reduce:transition-colors duration-200 hover:bg-zinc-800 hover:text-white" aria-label="Replier le menu" title="Replier le menu" onClick={() => act("side")}><ChevronsLeft /></Button>
      </div>
      <Sec title="Période"><Seg label="Période" items={d.periods} onPick={(k) => act("period", k)} /></Sec>
      <Sec title="Statut">
        <Seg
          label="Statut des chaînes"
          items={[
            { key: "all", label: "Toutes", count: d.live.total, on: !d.live.on },
            { key: "live", label: "En live", count: d.live.count, on: d.live.on },
          ]}
          onPick={(k) => act("live", k)}
        />
      </Sec>
      {d.langs && <Sec title="Langue"><Seg label="Langue" items={d.langs} onPick={(k) => act("lang", k)} /></Sec>}
      <Sec title="Vue">
        <div role="group" aria-label="Vue de la carte" className="flex flex-col gap-1">
          {views.map(([k, label, n]) => (
            <button
              key={k}
              type="button"
              aria-pressed={d.view === k}
              onClick={() => act("view", k)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[13px] font-medium transition-[color,background-color,border-color,box-shadow,opacity,transform] motion-reduce:transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none",
                d.view === k
                  ? "border-primary/40 bg-primary/10 text-white shadow-select"
                  : "border-white/[.06] bg-zinc-950/40 text-zinc-400 hover:border-white/15 hover:bg-white/[.03] hover:text-zinc-100",
              )}
            >
              {label}{n != null && <span className="ml-auto font-mono text-[11px] text-dusk tabular-nums">{n}</span>}
            </button>
          ))}
        </div>
      </Sec>
      {d.pick && (
        <Sec title={<>Chaînes cochées <span className="text-zinc-300 tabular-nums">{d.picked}</span></>}>
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher une chaîne…" aria-label="Chercher une chaîne" className="h-8 border-field-edge bg-zinc-950/80 text-[13px] transition-[color,background-color,border-color,box-shadow,opacity,transform] motion-reduce:transition-colors duration-200 focus-visible:border-primary/50 focus-visible:ring-primary/20" />
          <div className="flex gap-1.5">
            <Button size="sm" variant="secondary" className="h-8 flex-1 border border-white/10 bg-zinc-950/60 text-xs text-zinc-300 transition-[color,background-color,border-color,box-shadow,opacity,transform] motion-reduce:transition-colors duration-200 hover:bg-zinc-800 hover:text-white" onClick={() => act("pick", shown.map((c) => c.c), true)}>Tout cocher</Button>
            <Button size="sm" variant="secondary" className="h-8 flex-1 border border-white/10 bg-zinc-950/60 text-xs text-zinc-300 transition-[color,background-color,border-color,box-shadow,opacity,transform] motion-reduce:transition-colors duration-200 hover:bg-zinc-800 hover:text-white" onClick={() => act("pick", shown.map((c) => c.c), false)}>Tout décocher</Button>
          </div>
          <div className="-mx-1.5 flex max-h-[42vh] flex-col gap-px overflow-auto">
            {shown.map((c) => (
              <label key={c.c} className="flex min-w-0 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-[13px] text-zinc-200 transition-colors duration-200 hover:bg-white/[.04]">
                <input type="checkbox" checked={c.on} onChange={(e) => act("pick", c.c, e.target.checked)} className="accent-primary" />
                <ChannelAvatar {...c} />
                <span className="truncate">{c.c}</span>
                <LangBadge langs={c.langs} className="h-4 px-1 text-[9.5px]" />
                <span className="ml-auto font-mono text-[11px] text-dusk tabular-nums">{fmt(c.n)}</span>
              </label>
            ))}
          </div>
        </Sec>
      )}
      {d.find.length > 0 && (
        <Sec title="Aller à une chaîne">
          <select
            aria-label="Aller à une chaîne"
            value={sel && d.find.includes(sel) ? sel : ""}
            onChange={(e) => { if (e.target.value) api?.find(e.target.value); else api?.select(null) }}
            className="h-9 w-full cursor-pointer rounded-lg border border-field-edge bg-zinc-950/80 px-2.5 text-[13px] text-zinc-200 outline-none transition-[color,background-color,border-color,box-shadow,opacity,transform] motion-reduce:transition-colors duration-200 hover:border-zinc-400 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 [&>option]:bg-zinc-900"
          >
            <option value="">Choisir une chaîne…</option>
            {d.find.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Sec>
      )}
      {d.groups && (
        <Sec title="Groupes">
          <button type="button" aria-pressed={grp == null} onClick={() => api?.group(null)} className={cn("rounded-lg border px-3 py-1.5 text-left text-xs font-medium transition-[color,background-color,border-color,box-shadow,opacity,transform] motion-reduce:transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none", grp == null ? "border-primary/40 bg-primary/10 text-white shadow-lg shadow-primary/20" : "border-white/[.06] bg-zinc-950/40 text-zinc-400 hover:border-white/15 hover:text-zinc-100")}>Tous les groupes</button>
          {d.groups.map((g) => (
            <div key={g.i} className={cn("rounded-lg border p-2 transition-[color,background-color,border-color,box-shadow,opacity,transform] motion-reduce:transition-colors duration-200", grp === g.i ? "border-primary/40 bg-primary/10 shadow-xl shadow-primary/30" : "border-white/[.06] bg-zinc-950/40 hover:border-white/15")}>
              <button type="button" aria-pressed={grp === g.i} onClick={() => api?.group(g.i)} className="flex w-full items-center gap-2 rounded text-left text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none">
                <i className="size-2.5 rounded-full" style={{ background: g.color }} />Groupe {g.i + 1}
                <span className="ml-auto font-normal text-dusk tabular-nums"><span className="text-zinc-300">{g.members.length}</span> chaînes · <span className="text-zinc-300">{fmt(g.viewers)}</span> viewers</span>
              </button>
              <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-1">
                {g.members.map((m) => <button key={m.c} type="button" onClick={() => api?.select(m.c)} className="inline-flex items-center gap-1 rounded text-xs text-zinc-300 transition-colors duration-200 hover:text-primary-soft focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"><ChannelAvatar {...m} size={16} />{m.c}</button>)}
              </div>
            </div>
          ))}
          {d.solo.length > 0 && (
            <div className="rounded-lg border border-white/[.06] bg-zinc-950/40 p-2">
              <div className="flex items-center gap-2 text-xs text-zinc-400"><i className="size-2.5 rounded-full bg-zinc-500" />Isolées : aucun lien fort</div>
              <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-1">
                {d.solo.map((m) => <button key={m.c} type="button" onClick={() => api?.select(m.c)} className="inline-flex items-center gap-1 rounded text-xs text-zinc-300 transition-colors duration-200 hover:text-primary-soft focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"><ChannelAvatar {...m} size={16} />{m.c}</button>)}
              </div>
            </div>
          )}
        </Sec>
      )}
      {!d.empty && (
        <>
        <Sec title="Derniers passages">
          {log.length ? (
            <ul className="flex flex-col gap-1 text-xs text-zinc-300">
              {log.map((p) => (
                <li key={p.t + p.from + p.to} className="flex min-w-0 items-baseline gap-2">
                  <span className="shrink-0 font-mono text-[11px] text-dusk tabular-nums">{new Date(p.t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                  <button type="button" onClick={() => api?.select(p.to)} className="min-h-6 min-w-0 truncate text-left transition-colors duration-200 hover:text-primary-soft">
                    {p.from} → {p.to}{p.n > 1 && <span className="text-dusk"> × {p.n}</span>}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-dusk">Aucun passage depuis l’ouverture de la carte. Ils s’ajoutent ici quand quelqu’un passe d’un chat à l’autre.</p>
          )}
        </Sec>
        <Sec title="Disposition">
          <Button variant="secondary" className="h-9 border border-white/10 bg-zinc-950/60 text-xs text-zinc-200 transition-[color,background-color,border-color,box-shadow,opacity,transform] motion-reduce:transition-colors duration-200 hover:border-white/20 hover:bg-zinc-800 hover:text-white active:scale-[.98]" title="Recalculer toute la disposition pour la rendre la plus lisible possible (les chaînes déplacées à la main reprennent aussi leur place calculée)" onClick={() => act("relayout")}><Shuffle />Réorganiser la carte</Button>
        </Sec>
        </>
      )}
    </aside>
  )
}

/** Sens des passages entre la chaîne choisie et une voisine : les deux nombres, puis un verdict court (même règle que les pointes des traits : au moins 10 passages, dont 60 % dans un sens). */
function passWords(c: string, out: number, inn: number) {
  const t = out + inn, m = Math.max(out, inn)
  const verdict = t < 10 ? "trop peu de passages pour un sens" : m / t >= 0.6 ? `surtout ${out > inn ? "vers" : "depuis"} ${c}` : "dans les deux sens"
  return `${fmt(out)} vers ${c} · ${fmt(inn)} depuis ${c} (${verdict})`
}
/** « de » devant un nom de chaîne, élidé devant une voyelle (« Fiche d’etoiles »). */
const deC = (c: string) => (/^[aeiouyhàâéèêëîïôöûü]/i.test(c) ? "d’" : "de ") + c

/** Aide de la carte : une fenêtre à trois onglets (Lire, Signaux, Manipuler), ouverte par le bouton « ? » de la colonne de contrôles. */
function MapHelp({ d, onClose }: { d: MapData; onClose: () => void }) {
  const tab = "rounded-md px-2.5 py-1 text-xs font-medium text-dusk transition-colors duration-200 hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[state=active]:bg-white/[.07] data-[state=active]:text-zinc-100"
  const list = "mt-2.5 list-disc space-y-1.5 ps-4 leading-relaxed marker:text-zinc-600 [&_b]:font-semibold [&_b]:text-zinc-100"
  const links = d.view === "sel" ? 6 : 4
  const scope = (d.view === "all" ? "Toutes les chaînes suivies qui ont au moins un viewer actif sur la période" : d.view === "sel" ? "Seulement les chaînes cochées, quelle que soit la langue" : "Chaînes avec au moins 5 viewers actifs sur la période") + (d.live.on ? ", et seulement celles en live en ce moment" : "")
  return (
    <div role="dialog" aria-label="Aide de la carte" className="absolute top-2.5 right-14 z-30 flex max-h-[calc(100%-20px)] w-[min(400px,calc(100%-76px))] flex-col rounded-xl border border-white/10 bg-zinc-950/90 p-3 text-xs text-zinc-300 shadow-2xl shadow-black/50 backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between gap-2">
        <b className="text-sm font-semibold text-zinc-100">Aide de la carte</b>
        <button type="button" className="grid size-6 place-items-center rounded-md text-zinc-400 transition-colors duration-200 hover:text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label="Fermer l’aide (Échap)" title="Fermer l’aide (Échap)" onClick={onClose}><X className="size-4" /></button>
      </div>
      <Tabs.Root defaultValue="lire" className="min-h-0 overflow-y-auto">
        <Tabs.List aria-label="Sections de l’aide" className="flex gap-1">
          <Tabs.Trigger value="lire" className={tab}>Lire</Tabs.Trigger>
          <Tabs.Trigger value="signaux" className={tab}>Signaux</Tabs.Trigger>
          <Tabs.Trigger value="manipuler" className={tab}>Manipuler</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="lire" className="outline-none">
          <ul className={list}>
            <li>{scope}.</li>
            <li><b>Un rond</b> est une chaîne ; sa <b>taille</b> dit ses viewers actifs sur la période. Le live s’affiche dans sa fiche. Au centre, la planète Twitch.</li>
            <li>Les chaînes qui partagent leurs viewers forment un <b>système</b> : l’<b>étoile</b> (couronne dorée) est celle qui en a le plus, les autres tournent autour d’elle, d’autant plus près qu’elles ont de viewers en commun avec elle. Les chaînes sans groupe restent seules.</li>
            <li>Un <b>trait</b> relie deux chaînes qui partagent des viewers actifs (les {links} liens les plus forts de chaque chaîne). Plus il est épais, plus la part en commun est grande, jusqu’à 50 % et plus.</li>
            <li>Au repos, cette part est vue du côté de la plus petite des deux chaînes. Une chaîne choisie prend sa part à elle : le même chiffre que sur le trait, dans sa fiche et dans la bulle.</li>
            <li><b>Noms</b> : jusqu’à 30 chaînes, chacun s’affiche dès qu’il a la place (les étoiles d’abord) ; au-delà, seuls restent ceux des étoiles, de la chaîne choisie et de ses voisines.</li>
          </ul>
        </Tabs.Content>
        <Tabs.Content value="signaux" className="outline-none">
          <ul className={list}>
            <li><b>Comète</b> : quelqu’un qui écrivait chez une chaîne dans les 3 dernières heures vient d’écrire pour la première fois chez une autre. Le bandeau l’écrit (arc pâle si les deux ne sont pas reliées).</li>
            <li><b>Lueurs le long d’un trait</b> : les passages mesurés sur la période, rejoués dans leur sens. Plus il y en a eu, plus elles sont nombreuses.</li>
            <li><b>Pointe au milieu d’un trait</b> : le sens le plus fréquent, quand il domine nettement (au moins 60 % de 10 passages ou plus).</li>
            <li><b>Onde sur une planète</b> : son chat vient d’écrire. <b>Pastilles</b> : abonnements, subs offerts, bits et raids.</li>
            <li>Dans la fiche, le sens est écrit « 7 vers X · 3 depuis X » ; sous 10 passages, on ne dit pas de sens.</li>
          </ul>
        </Tabs.Content>
        <Tabs.Content value="manipuler" className="outline-none">
          <ul className={list}>
            <li><b>Déplacer la carte</b> : glisser (un doigt sur téléphone). <b>Zoomer</b> : molette, pincement, boutons + et −, ou double-clic sur un endroit.</li>
            <li><b>Tourner en 3D</b> : bouton Globe (<Kbd>G</Kbd>), ou <Kbd>Alt</Kbd> enfoncé en glissant. Lâché en mouvement, le globe garde son élan ; un clic l’arrête. <b>Tourner à plat</b> : <Kbd>Maj</Kbd> + glisser autour du logo.</li>
            <li><b>Déplacer une chaîne ou un système</b> : glisser avec le clic droit. « Remettre les chaînes à leur place » remet tout en place.</li>
            <li><b>Choisir une chaîne</b> : un clic affiche sa fiche, avec son nom et ceux de ses voisines ; un double-clic l’ouvre dans Par chaîne.</li>
          </ul>
          <dl className="mt-3 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 border-t border-white/10 pt-3">
            {([
              [["+", "−"], "zoomer"], [["0"], "tout afficher"], [["C"], "recentrer"], [["P", "Espace"], "pause"], [["G"], "globe"],
              [["←", "→", "↑", "↓"], "déplacer la carte (chaîne choisie)"], [["?"], "cette aide"], [["Échap"], "fermer l’aide ou la fiche"],
            ] as [string[], string][]).map(([keys, what]) => (
              <div key={what} className="col-span-2 grid grid-cols-subgrid items-center">
                <dt className="flex flex-wrap gap-1">{keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</dt>
                <dd>{what}</dd>
              </div>
            ))}
          </dl>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}

/** Légende, toujours visible sur ordinateur ; sur téléphone, repliée derrière « Comment lire la carte » pour ne pas couvrir la carte. */
const LEGEND = (
  <>
    <span className="inline-flex items-center gap-1.5"><i aria-hidden className="size-2 rounded-full bg-zinc-300" /><i aria-hidden className="size-3 rounded-full bg-zinc-300" />taille = viewers actifs</span>
    <span className="inline-flex items-center gap-1.5"><i aria-hidden className="size-3 rounded-full bg-[radial-gradient(circle,var(--star-core)_0_35%,var(--star-gold)_36%_60%,transparent_62%)]" />étoile = le plus de viewers actifs du système</span>
    <span className="inline-flex items-center gap-1.5"><i aria-hidden className="inline-flex size-3 items-center justify-center rounded-full border border-dashed border-zinc-400"><i className="size-1 rounded-full bg-zinc-300" /></i>plus près de l’étoile = plus de viewers en commun avec elle</span>
    <span className="inline-flex items-center gap-1.5"><i aria-hidden className="h-[2px] w-4 rounded-full bg-map-link" />10 %<i aria-hidden className="ms-1 h-[4.5px] w-4 rounded-full bg-map-link" />50 % et plus : part de viewers en commun</span>
  </>
)
const SIGNALS = (
  <>
    <span className="inline-flex items-center gap-1.5"><i aria-hidden className="relative h-1.5 w-4 rounded-full bg-linear-to-r from-transparent to-foreground" />comète = quelqu’un passe d’un chat à l’autre, maintenant</span>
    <span className="inline-flex items-center gap-1.5"><i aria-hidden className="size-1.5 rounded-full bg-foreground shadow-glint" />lueur = passages de la période</span>
    <span className="inline-flex items-center gap-1.5"><svg aria-hidden viewBox="0 0 10 10" className="size-2.5"><path d="M3 1.5L7 5L3 8.5" fill="none" stroke="var(--map-link)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>pointe = sens le plus fréquent</span>
  </>
)
const helpH = "text-xs font-medium text-dusk"
/** Touche du clavier, dans l’aide. */
const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="rounded border border-white/15 bg-zinc-900 px-1 py-px font-mono text-[11px] text-zinc-200">{children}</kbd>
)
function Legend({ groups }: { groups: boolean }) {
  const grp = groups ? <span className="inline-flex items-center gap-1.5">couleur = groupe</span> : null
  const box = "rounded-xl border border-white/10 bg-zinc-950/75 px-3 py-1.5 text-xs text-zinc-300 backdrop-blur-sm"
  return (
    <>
      <div className={cn(box, "pointer-events-auto max-sm:hidden")}>
        <p className="flex flex-wrap items-center justify-end gap-x-3.5 gap-y-1">{LEGEND}{grp}</p>
        <details className="group mt-1 text-right">
          <summary className="cursor-pointer list-none text-zinc-400 transition-colors hover:text-zinc-200 [&::-webkit-details-marker]:hidden">Signaux <span aria-hidden className="inline-block transition-transform group-open:rotate-180 motion-reduce:transition-none">▾</span></summary>
          <p className="mt-1 flex flex-wrap items-center justify-end gap-x-3.5 gap-y-1">{SIGNALS}</p>
        </details>
      </div>
      <details className={cn(box, "pointer-events-auto sm:hidden")}>
        <summary className="cursor-pointer list-none text-right text-zinc-200 [&::-webkit-details-marker]:hidden">Comment lire la carte</summary>
        <div className="mt-1.5 flex flex-col gap-1">{LEGEND}{grp}{SIGNALS}</div>
      </details>
    </>
  )
}

const ctl = "grid size-8 place-items-center rounded-lg border border-white/10 bg-zinc-900/70 text-zinc-400 shadow-lg shadow-black/40 backdrop-blur-xl transition-[color,background-color,border-color,box-shadow,opacity,transform] motion-reduce:transition-colors duration-200 hover:border-white/20 hover:bg-zinc-800 hover:text-white active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none [&>svg]:size-3.5"
/** Curseur en mode Globe : crosshair au lieu de grab/grabbing pour signaler la rotation 3D. */
const GLOBE_CURSOR = "crosshair"
const MAP_CURSOR_DEFAULT = "grab"
const MAP_CURSOR_DRAGGING = "grabbing"

/** Épaisseur de barre progressive selon la valeur (pour MeterList dans la fiche).
 *  4 paliers : ≤10% = 1.5px (traits fins), ≤30% = 2.5px, ≤50% = 3.5px, >50% = 4.5px.
 *  Cela reflète visuellement l'échelle des traits sur la carte (fins à épais). */
function barHeight(v: number, mx: number): number {
  const pct = mx > 0 ? v / mx : 0
  if (pct <= 0.1) return 1.5
  if (pct <= 0.3) return 2.5
  if (pct <= 0.5) return 3.5
  return 4.5
}

export function MapView() {
  const d = useMapData()
  const stage = useRef<HTMLDivElement>(null), radar = useRef<HTMLDivElement>(null), box = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [api, setApi] = useState<MapApi | null>(null)
  const [help, setHelp] = useState(false)
  const [st, setSt] = useState<Required<MapNotice>>({ info: null, hidden: "", pins: 0, grp: null, paused: false, globe: false, log: [] })
  // sans animation demandée par le système, la carte ne bouge pas : le bouton lecture / pause n’a pas lieu d’être
  const still = useMemo(() => matchMedia("(prefers-reduced-motion: reduce)").matches, [])
  // vue du moteur (globe, zoom, déplacement), lue par le fond en volume à chaque image ; sans re-rendu React
  const skyView = useRef<MapViewState | null>(null)

  // à chaque nouvelle carte (période, vue, taille de la fenêtre…), le moteur est lancé dans les éléments de la page
  useEffect(() => {
    if (!api) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as Element | null
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || t?.closest?.(".mapsvg, input, select, textarea, [contenteditable]")) return
      const k = e.key
      if (k === "p" || k === "P") api.togglePause()
      else if (k === "g" || k === "G") api.toggleGlobe()
      else if (k === "c" || k === "C") api.recenter()
      else if (k === "+" || k === "=") api.zoomIn()
      else if (k === "-" || k === "_") api.zoomOut()
      else if (k === "0") api.fit()
      else if (k === "?") setHelp((h) => !h)
      else return
      e.preventDefault()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [api])

  // Échap ferme l’aide d’abord (écouté en capture, avant la fermeture de la fiche)
  useEffect(() => {
    if (!help) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); setHelp(false) } }
    document.addEventListener("keydown", onKey, true)
    return () => document.removeEventListener("keydown", onKey, true)
  }, [help])

  // Met à jour le curseur du SVG quand le mode Globe change
  useEffect(() => {
    if (!svgRef.current) return
    svgRef.current.style.cursor = st.globe ? GLOBE_CURSOR : MAP_CURSOR_DEFAULT
    return () => {
      if (svgRef.current) svgRef.current.style.cursor = MAP_CURSOR_DEFAULT
    }
  }, [st.globe])

  useEffect(() => {
    if (!st.info) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || (e.target as Element | null)?.closest?.(".mapsvg")) return
      api?.select(null)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [st.info, api])

  useLayoutEffect(() => {
    if (!d || !stage.current || !radar.current || !box.current) return
    setSt((s) => ({ info: null, hidden: "", pins: d.pins, grp: null, paused: s.paused, globe: s.globe, log: s.log }))
    if (!d.mount) { box.current.innerHTML = ""; radar.current.innerHTML = ""; setApi(null); return }
    const a = d.mount({ stage: stage.current, radar: radar.current, box: box.current, notify: (n) => setSt((s) => ({ ...s, ...n })), view: (v) => { skyView.current = v } })
    setApi(a)
    // Le SVG de la carte est le premier enfant du conteneur .chart.mapbox
    const svg = box.current.querySelector("svg") as SVGSVGElement | null
    if (svg) {
      svgRef.current = svg
      // Curseur adaptatif selon le mode Globe
      svg.style.cursor = st.globe ? GLOBE_CURSOR : MAP_CURSOR_DEFAULT
    }
    return () => {
      a.stop()
      if (svgRef.current) svgRef.current.style.cursor = MAP_CURSOR_DEFAULT
    }
  }, [d])

  if (!d)
    return (
      <div className="grid h-[calc(100dvh-84px)] min-h-[420px] place-items-center rounded-2xl border border-white/10 bg-card/40" role="status">
        <p className="text-[13px] text-dusk">Préparation de la carte…</p>
      </div>
    )
  const info = st.info
  return (
    <div className="relative flex h-[calc(100dvh-84px)] min-h-[420px] gap-3">
      {d.open ? (
        <Side d={d} api={api} grp={st.grp} sel={st.info?.c ?? null} log={st.log} />
      ) : (
        <button
          type="button"
          onClick={() => act("side")}
          title="Afficher les filtres de la carte"
          aria-label="Afficher les filtres de la carte"
          className="flex w-10 shrink-0 flex-col items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/70 py-3 text-zinc-400 shadow-2xl shadow-black/50 backdrop-blur-xl transition-[color,background-color,border-color,box-shadow,opacity,transform] motion-reduce:transition-colors duration-200 hover:border-white/20 hover:text-white"
        >
          <Menu className="size-4" />
          <span className="text-xs font-medium [writing-mode:vertical-rl] rotate-180">Filtres</span>
        </button>
      )}

      <div className="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/50">
        {/* zone du moteur : styles de l’ancienne interface (.legacy) pour le radar et le dessin SVG */}
        <div className="legacy h-full">
          <div className="panel mappanel h-full">
            <div className="mapstage" ref={stage}>
              <Galaxy view={skyView} />
              {/* voile très doux entre le ciel et la carte, plus dense au centre : les traits restent lisibles sur le cœur clair de la galaxie (le ciel lui-même ne change pas) */}
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-(image:--map-veil-gradient)" />
              <div className="radar" ref={radar} />
              <div className="chart mapbox" ref={box} />
            </div>
          </div>
        </div>

        {d.empty ? (
          <div className="absolute inset-0 grid place-items-center p-6">
            <p className="max-w-md rounded-2xl border border-dashed border-white/15 bg-card px-5 py-6 text-center text-[13px] text-muted-foreground">{d.empty}</p>
          </div>
        ) : (
          <>
            <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5">
              {!still && (
                <button
                  type="button"
                  className={cn(ctl, st.paused && "border-primary/40 text-primary-soft")}
                  aria-pressed={st.paused}
                  title={st.paused
                    ? "Relancer le mouvement des orbites et des lueurs (P)"
                    : info
                      ? "Mouvement arrêté tant qu’une chaîne est choisie. Mettre en pause pour qu’il reste arrêté après (P)."
                      : "Mettre en pause le mouvement des orbites et des lueurs (P). Les signaux en direct (comètes, ondes) continuent."}
                  aria-label={st.paused ? "Relancer le mouvement" : "Mettre en pause le mouvement"}
                  onClick={() => api?.togglePause()}
                >
                  {st.paused ? <Play /> : <Pause />}
                </button>
              )}
              <button
                type="button"
                className={cn(ctl, st.globe && "border-primary/40 text-primary-soft")}
                aria-pressed={st.globe}
                title={st.globe ? "Mode Globe : glisser fait tourner l’univers en 3D. Cliquer pour revenir au déplacement de la carte (G)" : "Mode Globe : glisser fera tourner l’univers en 3D au lieu de déplacer la carte (G, ou Alt en glissant)"}
                aria-label="Mode Globe : glisser pour tourner en 3D"
                onClick={() => api?.toggleGlobe()}
              >
                <Globe />
              </button>
              <button type="button" className={ctl} title="Zoomer (+)" aria-label="Zoomer" onClick={() => api?.zoomIn()}><Plus /></button>
              <button type="button" className={ctl} title="Dézoomer (−)" aria-label="Dézoomer" onClick={() => api?.zoomOut()}><Minus /></button>
              <button type="button" className={ctl} title="Tout afficher, sans rotation (0)" aria-label="Tout afficher" onClick={() => api?.fit()}><Maximize2 /></button>
              <button type="button" className={ctl} title="Recentrer : la chaîne choisie, le groupe mis en avant, ou sinon le centre de la carte (C)" aria-label="Recentrer la carte" onClick={() => api?.recenter()}><Crosshair /></button>
              {st.pins > 0 && <button type="button" className={ctl} title="Remettre à leur place les chaînes déplacées" aria-label="Remettre les chaînes à leur place" onClick={() => act("pins")}><RotateCcw /></button>}
              <button type="button" className={cn(ctl, help && "border-primary/40 text-primary-soft")} aria-haspopup="dialog" aria-expanded={help} title="Aide : lire, signaux, manipuler (?)" aria-label="Aide de la carte" onClick={() => setHelp((h) => !h)}><CircleQuestionMark /></button>
              {st.globe && (
                <span className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary-soft shadow-sm" aria-live="polite">
                  <span className="inline-flex size-1.5 shrink-0 items-center justify-center rounded-full bg-primary-soft" aria-hidden>●</span>
                  MODE GLOBE
                </span>
              )}
            </div>
            {help && <MapHelp d={d} onClose={() => setHelp(false)} />}
            <div data-maplegend className={cn("pointer-events-none absolute right-3 bottom-3 flex max-w-[min(720px,calc(100%-24px))] flex-col items-end gap-1.5", info && "max-lg:hidden")}>
              {st.hidden && <p className="rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-1 text-right text-xs text-zinc-400 tabular-nums backdrop-blur-sm">{st.hidden}</p>}
              <Legend groups={!!d.groups} />
            </div>
            <p className="sr-only" aria-live="polite">{info ? `Fiche ${deC(info.c)} : ${info.sub}` : ""}</p>
            {info && (
              <div role="region" aria-label={`Fiche ${deC(info.c)}`} className="absolute bottom-3 left-3 max-h-[calc(100%-70px)] w-[min(380px,calc(100%-24px))] animate-in fade-in-0 slide-in-from-bottom-2 overflow-auto rounded-2xl border border-white/10 bg-zinc-900/80 p-3.5 shadow-2xl shadow-black/60 backdrop-blur-xl backdrop-saturate-150 duration-200">
                <div className="flex items-center gap-2.5">
                  <ChannelAvatar {...info} size={32} />
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-sm font-semibold text-zinc-100">{info.c}</b>
                    <span className="text-xs text-zinc-400 tabular-nums">{info.sub}</span>
                  </div>
                  <button type="button" className={ctl} title="Recentrer la carte sur cette chaîne (C)" aria-label="Recentrer sur cette chaîne" onClick={() => api?.recenter()}><Crosshair /></button>
                  <button type="button" className={ctl} title="Fermer la fiche (Échap)" aria-label="Fermer la fiche" onClick={() => api?.select(null)}><X /></button>
                </div>
                <Button size="sm" className="mt-2.5 h-8 text-xs shadow-action transition-[color,background-color,border-color,box-shadow,opacity,transform] motion-reduce:transition-colors duration-200" data-open={info.c}>Ouvrir dans Par chaîne</Button>
                {info.links.length ? (
                  <>
                    <p className="mt-3 mb-1 text-xs text-zinc-400">Part de ses viewers actifs qu’on voit aussi écrire chez chaque voisine (barre pleine à 50 % et plus, comme l’épaisseur des traits), puis le sens des passages sur la période</p>
                    <MeterList
                      max={0.5}
                      thick
                      rows={info.links.map((l) => ({
                        key: l.c, v: l.share, color: l.color,
                        right: <>{pct(l.share)} · {fmt(l.n)} pers.</>,
                        sub: l.out + l.inn > 0 ? (
                          <span title={`→ : ${fmt(l.out)} passages ${deC(info.c)} vers ${l.c} · ← : ${fmt(l.inn)} ${deC(l.c)} vers ${info.c}`}>{passWords(l.c, l.out, l.inn)}</span>
                        ) : undefined,
                        label: <button type="button" onClick={() => api?.select(l.c)} className="inline-flex min-h-6 items-center gap-1.5 transition-colors duration-200 hover:text-primary-soft"><ChannelAvatar {...l} />{l.c}</button>,
                      }))}
                    />
                  </>
                ) : (
                  <p className="mt-2 text-xs text-zinc-400">Aucun viewer actif en commun avec les autres chaînes de la carte.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
