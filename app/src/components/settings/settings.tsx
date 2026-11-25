// Page « Réglages », en React. L'état vient de l'ancien code (événement legacy:settings) ;
// chaque bouton appelle une action de l'ancien code (window.saveSupabase, window.genToken…), qui renvoie le nouvel état.
import { useEffect, useRef, useState, type ReactNode } from "react"
import { Check, ChevronDown, Cloud, Database, Download, FileDown, HardDrive, KeyRound, Laptop, Plus, Search, Trash2, Upload, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ChannelAvatar } from "@/components/channel-avatar"
import { panel, Pending } from "@/components/overview/parts"
import { cn } from "@/lib/utils"
import { onFocusAdd, useSettingsData, type SettingsData } from "@/legacy/bridge"
import { ExportReportButton } from "@/components/export/export-report"

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
  const good = /^(Connecté|API connectée|Sauvegarde restaurée)/.test(text) || /(ajoutée?s?|retirée|enregistrées)\b/.test(text)
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
interface AddSearchItem {
  login: string
  img: string
  name: string
  live: boolean
  game: string
}

interface AddSearch {
  msg: string
  items: AddSearchItem[]
}

function Channels({ d }: { d: SettingsData & { addSearch?: AddSearch | null } }) {
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState("")

  return (
    <Card icon={<Users />} title="Chaînes suivies" desc={d.chansMsg}>
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {d.chans.length} chaîne(s) suivie(s) sur la période actuelle.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="mr-2 size-4" />
            {showAdd ? "Annuler" : "Ajouter un streamer"}
          </Button>
        </div>
        {showAdd && (
          <div className="space-y-2">
            <Field label="Rechercher">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom de la chaîne Twitch..."
              />
            </Field>
            {d.addSearch ? (
              <div className="space-y-1">
                {d.addSearch.items.map((item: AddSearchItem) => (
                  <div key={item.login} className="flex items-center justify-between rounded-lg border p-2">
                    <ChannelAvatar c={item.login} color="#8b7cff" img={item.img} />
                    <span className="text-sm">{item.name}</span>
                    <Button size="sm" onClick={() => {
                      window.addFromSearch?.(item.login, item.img)
                      setShowAdd(false)
                      setSearch("")
                    }}>
                      Ajouter
                    </Button>
                  </div>
                ))}
                {d.addSearch.items.length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucune chaîne trouvée.</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Recherche API Twitch non configurée.</p>
            )}
          </div>
        )}
        {d.chans.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {d.chans.slice(0, 5).map((chan) => (
              <span key={chan.c} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                {chan.c}
              </span>
            ))}
            {d.chans.length > 5 && (
              <span className="text-xs text-muted-foreground">
                +{d.chans.length - 5} autres
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

// API section
function Api({ d }: { d: SettingsData }) {
  const [showToken, setShowToken] = useState(false)

  return (
    <Card icon={<KeyRound />} title="API Twitch" desc={d.apiMsg}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">État :</span>
          {Badge({ variant: d.apiReady ? "default" : "secondary", children: d.apiReady ? "Connecté" : "Non connecté" })}
        </div>
        {!d.apiReady && (
          <Button variant="outline" size="sm" onClick={() => window.genToken?.(d.clientId, d.token)}>
            <KeyRound className="mr-2 size-4" />
            Générer un token
          </Button>
        )}
        {showToken && d.token && (
          <Field label="Token actuel">
            <Input value={d.token} onChange={() => {}} readOnly className="font-mono text-xs" />
          </Field>
        )}
      </div>
    </Card>
  )
}