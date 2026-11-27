// Page « Réglages », en React. L'état vient de l'ancien code (événement legacy:settings) ;
// chaque bouton appelle une action de l'ancien code (window.saveSupabase, window.genToken…), qui renvoie le nouvel état.
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { Check, ChevronDown, Cloud, Database, Download, FileDown, HardDrive, KeyRound, Laptop, ListPlus, Plus, Search, Trash2, Upload, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ChannelAvatar } from "@/components/channel-avatar"
import { panel, Pending } from "@/components/overview/parts"
import { cn } from "@/lib/utils"
import { onFocusAdd, useSettingsData, type SettingsData } from "@/legacy/bridge"
import { ExportReportButton } from "@/components/export/export-report"
import { RaidSuggestions } from "@/components/settings/raid-suggestions"

/** Carte de réglages : icône, titre, description, puis le contenu. */
function Card({ icon, title, desc, children }: { icon: ReactNode; title: string; desc?: ReactNode; children: ReactNode }) {
  return (
    <div role="region" aria-label={title} className={cn(panel, "overflow-hidden")}>
      <div className="flex items-start gap-3 border-b border-border px-5 py-4">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-secondary text-primary-soft [&>svg]:size-4">{icon}</span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-[-0.015em]">{title}</h2>
          {desc && <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{desc}</p>}
        </div>
      </div>
      <div className="space-y-4 px-5 py-4">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block min-w-0 flex-1">
      <span className="mb-1.5 block text-[12.5px] font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-dusk">{hint}</span>}
    </label>
  )
}

/** Message d'état : rouge pour une erreur, vert pour un succès, gris sinon. */
function Status({ text }: { text: string }) {
  if (!text) return null
  const bad = /^(Erreur|Échec|C'est la clé secrète|Pseudo invalide|Recherche impossible)/.test(text)
  const good = /^(Connecté|API connectée|Sauvegarde restaurée|\d+ ajoutée)/.test(text) || /(ajoutée?s?|retirée|enregistrées)\b/.test(text)
  return (
    <p role="status" className={cn("flex items-start gap-2 text-[12.5px]", bad ? "text-destructive" : good ? "text-signal-green" : "text-muted-foreground")}>
      <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", bad ? "bg-destructive" : good ? "bg-signal-green" : "bg-idle")} />
      {text}
    </p>
  )
}

/** Simple confirmation hook for dangerous actions. */
function useConfirm(defaultDelay = 4000) {
  const [armed, setArmed] = useState<string | null>(null)
  const arm = (what: string) => setArmed(what)
  const clear = () => setArmed(null)
  const isArmed = armed === "reset"
  return { armed, arm, clear, isArmed }
}

function Data({ d }: { d: SettingsData }) {
  const file = useRef<HTMLInputElement>(null)
  const reset = useConfirm()
  const [resyncing, setResyncing] = useState(false)

  async function handleResync() {
    if (!window.forceFullResync) return
    setResyncing(true)
    try {
      await window.forceFullResync()
    } catch (e) {
      // error handled by legacy
    }
    setResyncing(false)
  }

  return (
    <Card icon={<HardDrive />} title="Données" desc="Sauvegarder, restaurer ou effacer la copie des données gardée par ce navigateur.">
      <Status text={d.dbMsg} />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" className="h-9 border border-input" onClick={() => window.exportDb?.()}><Download />Sauvegarde complète (JSON)</Button>
        <input ref={file} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) window.importDbFile?.(f); e.target.value = "" }} />
        <Button variant="secondary" className="h-9 border border-input" onClick={() => file.current?.click()}><Upload />Restaurer une sauvegarde</Button>
        <Button
          variant={reset.isArmed ? "destructive" : "secondary"}
          className={cn("h-9", !reset.isArmed && "border border-input")}
          onClick={() => { if (reset.isArmed) { reset.clear(); window.resetDb?.() } else reset.arm("reset") }}
        >
          <Trash2 />{reset.isArmed ? "Confirmer l'effacement" : "Tout effacer"}
        </Button>
        {d.mode === "cloud" && (
          <Button
            variant="secondary"
            className="h-9 border border-input"
            onClick={handleResync}
            disabled={resyncing}
          >
            {resyncing ? "Synchronisation…" : "Resync depuis le début"}
          </Button>
        )}
      </div>
      <p className="max-w-[72ch] text-xs leading-relaxed text-dusk">{d.dbNote}</p>
    </Card>
  )
}

export function Settings() {
  const d = useSettingsData()
  if (!d) return <Pending stuck="Les réglages ne se chargent pas. Recharge la page ; si ça persiste, rouvre le tableau de bord depuis son raccourci." />
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 grid max-w-[920px] gap-4 duration-300">
      <Source d={d} />
      <Channels d={d} />
      <RaidSuggestions d={d} />
      <Api d={d} />
      <Data d={d} />
      <Card icon={<FileDown />} title="Rapports" desc="Exporter les données affichées dans un rapport PDF ou CSV.">
        <ExportReportButton />
      </Card>
    </div>
  )
}

// Source section
function Source({ d }: { d: SettingsData }) {
  return (
    <Card icon={<Cloud />} title="Source des données" desc="Où sont stockées les données, et comment les importer.">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Les données sont stockées localement dans le navigateur. Elles peuvent être synchronisées vers Supabase pour plusieurs appareils.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Mode :</span>
          {Badge({ variant: d.mode === "cloud" ? "default" : "secondary", children: d.mode === "cloud" ? "Nuage" : "Local" })}
        </div>
        {d.mode === "cloud" && <SupabaseForm d={d} />}
      </div>
    </Card>
  )
}

/**
 * Connexion à la base : URL, clé publique et code du tableau de bord. Le code (« codeTableau » dans config.json) ouvre la lecture des
 * données ET la modification de la liste des chaînes : sans lui, la base ne rend aucune ligne.
 */
function SupabaseForm({ d }: { d: SettingsData }) {
  const [url, setUrl] = useState(d.sbUrl), [key, setKey] = useState(d.sbKey), [code, setCode] = useState(d.sbCode)
  const [busy, setBusy] = useState(false)
  const same = url.trim() === d.sbUrl && key.trim() === d.sbKey
  const go = async () => {
    setBusy(true)
    try {
      // seul le code change : pas besoin de vider et retélécharger la copie locale
      if (same) await window.saveBoardCode?.(code); else await window.saveSupabase?.(url, key, code)
    } finally { setBusy(false) }
  }
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void go() }}>
      <Field label="URL du projet Supabase"><Input value={url} onChange={(e) => setUrl(e.target.value)} autoComplete="off" spellCheck={false} placeholder="https://….supabase.co" /></Field>
      <Field label="Clé publique" hint="La clé « publishable » ou « anon », jamais la clé secrète (elle reste dans config.json sur le PC du collecteur)."><Input value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" spellCheck={false} className="font-mono text-xs" /></Field>
      <Field label="Code du tableau de bord" hint="« codeTableau » dans config.json. Sans lui, la base ne rend aucune donnée et la liste des chaînes reste en lecture seule."><Input type="password" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" spellCheck={false} className="font-mono text-xs" /></Field>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={busy || !url.trim() || !key.trim()}>{busy ? "Connexion…" : "Se connecter"}</Button>
        <Status text={d.sbMsg} />
      </div>
    </form>
  )
}

interface BadgeProps { variant?: "default" | "secondary"; children: ReactNode }
function Badge({ variant = "default", children }: BadgeProps) {
  const vClass = variant === "default"
    ? "bg-primary text-primary-foreground"
    : "bg-secondary text-secondary-foreground"
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", vClass)}>
      {children}
    </span>
  )
}

// Channels section
type Found = NonNullable<SettingsData["addSearch"]>["items"][number]

const languages = new Intl.DisplayNames(["fr"], { type: "language" })
const nf = new Intl.NumberFormat("fr-FR")

/** Ligne sous le nom d'un résultat : pseudo, direct et audience, jeu, langue. */
function describe(x: Found) {
  if (x.unchecked) return "Pseudo non vérifié sur Twitch"
  const live = !x.live ? "" : x.viewers == null ? "en direct" : `en direct, ${nf.format(x.viewers)} viewers`
  return [x.login, live, x.game, x.lang.length === 2 ? languages.of(x.lang) : ""].filter(Boolean).join(" · ")
}

/** Flèches haut et bas : passe de la saisie aux boutons « Ajouter » ; Échap revient à la saisie. */
function arrows(e: KeyboardEvent<HTMLFormElement>, input: HTMLInputElement | null) {
  if (e.key === "Escape") { e.preventDefault(); input?.focus(); input?.select(); return }
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return
  const stops: (HTMLElement | null)[] = [input, ...e.currentTarget.querySelectorAll<HTMLButtonElement>("[data-result]:not(:disabled)")]
  const next = stops[stops.indexOf(document.activeElement as HTMLElement) + (e.key === "ArrowDown" ? 1 : -1)]
  if (next) { e.preventDefault(); next.focus() }
}

function Channels({ d }: { d: SettingsData }) {
  const [panelOpen, setPanel] = useState<"one" | "many" | null>(null)
  const [search, setSearch] = useState("")
  const input = useRef<HTMLInputElement>(null)
  const q = search.trim()
  const showAdd = panelOpen === "one"
  const toggle = (p: "one" | "many") => { setPanel(panelOpen === p ? null : p); setSearch("") }

  // « Ajouter un streamer » de la barre latérale : ouvre la recherche et y place le curseur.
  useEffect(() => onFocusAdd(() => {
    setPanel("one")
    setTimeout(() => { input.current?.scrollIntoView({ block: "center" }); input.current?.focus() }, 50)
  }), [])

  // La recherche part toute seule, un court instant après la dernière frappe.
  useEffect(() => {
    if (!showAdd) return
    const t = setTimeout(() => void window.runAddSearch?.(q.length >= 2 ? q : ""), 350)
    return () => clearTimeout(t)
  }, [q, showAdd, d.apiReady])

  const found = q.length >= 2 ? d.addSearch : null

  return (
    <Card icon={<Users />} title="Chaînes suivies" desc={d.chansMsg}>
      <div className="space-y-3">
        <Quota n={d.chans.length} limit={d.chanLimit} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" aria-expanded={showAdd} onClick={() => toggle("one")}>
            {showAdd ? <X /> : <Plus />}
            {showAdd ? "Fermer" : "Ajouter un streamer"}
          </Button>
          <Button variant="ghost" size="sm" aria-expanded={panelOpen === "many"} onClick={() => toggle("many")}>
            {panelOpen === "many" ? <X /> : <ListPlus />}
            {panelOpen === "many" ? "Fermer" : "Ajouter plusieurs"}
          </Button>
        </div>
        {showAdd && (
          <form className="space-y-2" onKeyDown={(e) => arrows(e, input.current)} onSubmit={(e) => { e.preventDefault(); void window.runAddSearch?.(q) }}>
            <Field
              label="Rechercher"
              hint={d.apiReady ? "Nom, pseudo ou adresse twitch.tv. Flèches pour parcourir les résultats." : "Sans API Twitch dans ce navigateur, tape le pseudo exact ou l'adresse twitch.tv. Pour chercher par nom, configure l'API plus bas."}
            >
              <Input ref={input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom de la chaîne Twitch…" autoComplete="off" spellCheck={false} />
            </Field>
            {found && (
              <div className="space-y-1">
                {found.msg && <Status text={found.msg} />}
                {found.items.map((item) => (
                  <div key={item.login} className="flex items-center gap-3 rounded-lg border border-border p-2">
                    <ChannelAvatar c={item.login} color="#8b7cff" img={item.img} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{item.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{describe(item)}</p>
                    </div>
                    <Button type="button" size="sm" data-result="" disabled={item.followed} aria-label={item.followed ? undefined : `Ajouter ${item.name}`}
                      onClick={() => { window.addFromSearch?.(item.login, item.img); input.current?.focus() }}>
                      {item.followed ? <><Check />Suivie</> : "Ajouter"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </form>
        )}
        {panelOpen === "many" && <BulkAdd limit={d.chanLimit} />}
        <Followed chans={d.chans} />
      </div>
    </Card>
  )
}

/** Combien de chaînes sont suivies, et la limite du collecteur (aucune en mode local). */
function Quota({ n, limit }: { n: number; limit: number | null }) {
  const left = limit != null ? Math.max(0, limit - n) : null
  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-mono text-[28px] leading-none font-semibold tabular-nums">{n}{limit != null && <span className="text-dusk"> / {limit}</span>}</span>
        <span className="text-[13px] text-muted-foreground">chaîne{n > 1 ? "s" : ""} suivie{n > 1 ? "s" : ""}</span>
      </p>
      {limit != null && left != null && (
        <>
          <div role="meter" aria-label="Places utilisées" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={n} className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.06]">
            <div className={cn("h-full rounded-full", left === 0 ? "bg-destructive" : "bg-primary")} style={{ width: `${Math.min(100, (n / limit) * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {left === 0 ? `Limite atteinte : le collecteur suit ${limit} chaînes au maximum. Retire-en une avant d'en ajouter.` : `${left} place${left > 1 ? "s" : ""} libre${left > 1 ? "s" : ""} : le collecteur suit ${limit} chaînes au maximum.`}
          </p>
        </>
      )}
    </div>
  )
}

/** Ajout en bloc : une liste collée, ajoutée sans rien retirer. */
function BulkAdd({ limit }: { limit: number | null }) {
  const [text, setText] = useState("")
  const [report, setReport] = useState("")
  const go = () => {
    const r = window.addChanList?.(text)
    if (!r) return
    setReport([
      r.added ? `${r.added} ajoutée(s)` : "Aucune chaîne ajoutée",
      r.already ? `${r.already} déjà suivie(s)` : "",
      r.invalid.length ? `pseudo(s) invalide(s) : ${r.invalid.join(", ")}` : "",
      r.over.length ? `au-delà de la limite de ${limit} : ${r.over.join(", ")}` : "",
    ].filter(Boolean).join(" · "))
    // il ne reste dans le champ que ce qui n'a pas pu être ajouté, pour le corriger
    setText([...r.invalid, ...r.over].join("\n"))
  }
  return (
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); go() }}>
      <Field label="Liste de chaînes" hint="Pseudos ou adresses twitch.tv, séparés par des espaces, des virgules ou des retours à la ligne. Aucune chaîne déjà suivie n'est retirée.">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} spellCheck={false} className="font-mono text-xs" />
      </Field>
      <Button type="submit" size="sm" disabled={!text.trim()}><Plus />Ajouter la liste</Button>
      <Status text={report} />
    </form>
  )
}

/** Toutes les chaînes suivies, filtrables ; le retrait demande une confirmation. */
function Followed({ chans }: { chans: SettingsData["chans"] }) {
  const [filter, setFilter] = useState("")
  const [armed, setArmed] = useState("")
  const list = useRef<HTMLUListElement>(null)
  const back = useRef("")
  const f = filter.trim().toLowerCase()
  const rows = chans.filter((x) => x.c.includes(f)).sort((a, b) => a.c.localeCompare(b.c))

  // après « Garder », le clavier revient sur le bouton de la même ligne
  useEffect(() => {
    if (armed || !back.current) return
    list.current?.querySelector<HTMLButtonElement>(`[data-drop="${back.current}"]`)?.focus()
    back.current = ""
  }, [armed])
  const keep = () => { back.current = armed; setArmed("") }

  if (!chans.length) return <p className="text-xs text-muted-foreground">Aucune chaîne suivie. Ajoute la première avec le bouton ci-dessus.</p>
  return (
    <div className="space-y-2 border-t border-border pt-3">
      <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrer les chaînes suivies…" aria-label="Filtrer les chaînes suivies" autoComplete="off" spellCheck={false} />
      <ul ref={list} className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border">
        {rows.map((x) => (
          <li key={x.c} className="flex min-h-11 flex-wrap items-center gap-3 px-3 py-1.5" onKeyDown={(e) => { if (e.key === "Escape" && armed === x.c) keep() }}>
            <ChannelAvatar c={x.c} color={x.color} img={x.img} />
            <span className="min-w-0 flex-1 truncate text-sm">{x.c}</span>
            {armed === x.c ? (
              <>
                <span className="text-xs text-muted-foreground">Les données déjà collectées restent.</span>
                <Button size="sm" variant="destructive" onClick={() => { setArmed(""); window.removeChan?.(x.c) }}>Retirer {x.c}</Button>
                <Button size="sm" variant="secondary" autoFocus onClick={keep}>Garder</Button>
              </>
            ) : (
              <Button size="icon-sm" variant="ghost" data-drop={x.c} aria-label={`Retirer ${x.c}`} title="Retirer" onClick={() => setArmed(x.c)}><Trash2 /></Button>
            )}
          </li>
        ))}
        {!rows.length && <li className="px-3 py-3 text-xs text-muted-foreground">Aucune chaîne suivie ne contient « {filter.trim()} ».</li>}
      </ul>
    </div>
  )
}

// API section : Client ID et secret servent à obtenir un jeton ; le secret n'est pas enregistré.
function Api({ d }: { d: SettingsData }) {
  const [id, setId] = useState(d.clientId), [secret, setSecret] = useState("")
  const [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true)
    try {
      if (await window.genToken?.(id, secret)) setSecret("")
    } finally { setBusy(false) }
  }

  return (
    <Card icon={<KeyRound />} title="API Twitch" desc={d.apiMsg}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void go() }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">État :</span>
          {Badge({ variant: d.apiReady ? "default" : "secondary", children: d.apiReady ? "Configurée" : "Non configurée" })}
        </div>
        <Field label="Client ID" hint="« twitchClientId » dans config.json, ou sur dev.twitch.tv/console/apps.">
          <Input value={id} onChange={(e) => setId(e.target.value)} autoComplete="off" spellCheck={false} className="font-mono text-xs" />
        </Field>
        <Field label="Client secret" hint="« twitchClientSecret » dans config.json. Il sert une fois à demander un jeton à Twitch et n'est pas enregistré.">
          <Input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" spellCheck={false} className="font-mono text-xs" />
        </Field>
        <Button type="submit" size="sm" disabled={busy || !id.trim() || !secret.trim()}>
          <KeyRound />{busy ? "Génération…" : d.apiReady ? "Générer un nouveau jeton" : "Générer un jeton"}
        </Button>
      </form>
    </Card>
  )
}
