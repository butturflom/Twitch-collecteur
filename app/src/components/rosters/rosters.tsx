import { useState, useEffect, useMemo } from "react"
import { Plus, Edit, Trash2, Users, RefreshCw, ListPlus, FileDown, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { fmt } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useRostersData, usePeriodInfo, type PeriodReach, type RosterChannel } from "@/legacy/bridge"
import { printRosterReport, rosterCsv } from "./roster-report"

/** Types pour les rosters */
export interface Roster {
  id: string
  name: string
  description: string | null
  channels: string[]
  created_at: number
  updated_at: number
}

/** Les rosters sont gardés dans ce navigateur (localStorage) */
const ROSTERS_KEY = "twitch-overlap-rosters-v2"

function loadRosters(): Roster[] {
  try {
    const data = localStorage.getItem(ROSTERS_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveRosters(rosters: Roster[]) {
  try {
    localStorage.setItem(ROSTERS_KEY, JSON.stringify(rosters))
  } catch {
    // localStorage non disponible
  }
}

/** Hook pour gérer les rosters */
export function useRosters() {
  const [rosters, setRosters] = useState<Roster[]>(() => loadRosters())
  const [loading] = useState<boolean>(false)

  useEffect(() => {
    // Charger depuis localStorage au montage
    setRosters(loadRosters())
  }, [])

  // Chaque modification part de l'état le plus récent (deux clics rapides dans le choix des chaînes ne s'écrasent pas)
  const update = (f: (rs: Roster[]) => Roster[]) =>
    setRosters((rs) => {
      const next = f(rs)
      saveRosters(next)
      return next
    })

  const createRoster = (name: string, description: string, channels: string[] = []) => {
    const newRoster: Roster = {
      id: crypto.randomUUID(),
      name,
      description: description || null,
      channels,
      created_at: Date.now(),
      updated_at: Date.now(),
    }
    update((rs) => [...rs, newRoster])
    return newRoster
  }

  const updateRoster = (id: string, name: string, description: string) =>
    update((rs) => rs.map((r) => (r.id === id ? { ...r, name, description: description || null, updated_at: Date.now() } : r)))

  const addChannelsToRoster = (rosterId: string, channels: string[]) =>
    update((rs) => rs.map((r) => (r.id === rosterId ? { ...r, channels: [...new Set([...r.channels, ...channels])], updated_at: Date.now() } : r)))

  const removeChannelFromRoster = (rosterId: string, channel: string) =>
    update((rs) => rs.map((r) => (r.id === rosterId ? { ...r, channels: r.channels.filter((c) => c !== channel), updated_at: Date.now() } : r)))

  const deleteRoster = (id: string) => update((rs) => rs.filter((r) => r.id !== id))

  const refresh = () => setRosters(loadRosters())

  return { rosters, loading, createRoster, updateRoster, addChannelsToRoster, removeChannelFromRoster, deleteRoster, refresh }
}

/** Net Reach d'un roster, calculé sur les vrais viewers actifs de la période (empreintes envoyées par legacy.js).
 *  - audience brute : somme des viewers de chaque chaîne (un viewer présent sur 3 chaînes compte 3 fois) ;
 *  - Net Reach : réunion des viewers, chacun compté une fois ;
 *  - cannibalisation : part de l'audience brute qui fait doublon (1 − Net Reach ÷ brute) ;
 *  - exclusifs d'une chaîne : ses viewers qu'aucune autre chaîne du roster n'a eus. */
export interface Reach {
  net: number
  gross: number
  cannibal: number
  /** null en estimation : le nombre de viewers sur 2 chaînes ou plus ne se déduit pas des esquisses */
  multi: number | null
  rows: { who: RosterChannel; viewers: number; exclusive: number | null; msgs: number | null }[]
  /** paires du roster qui partagent des viewers, les plus fortes d'abord ; share = communs ÷ audience de la plus petite */
  pairs: { a: RosterChannel; b: RosterChannel; shared: number; share: number }[]
  missing: string[]
  /** présent sur 7, 30 ou 90 jours : estimation HyperLogLog (± 2,3 %), sans exclusifs, messages ni paires */
  estimated?: { days: number; from: string; to: string }
}

function pairsOf(present: RosterChannel[]): Reach["pairs"] {
  const out: Reach["pairs"] = []
  for (let i = 0; i < present.length; i++)
    for (let j = i + 1; j < present.length; j++) {
      const [s, l] = present[i].users.size < present[j].users.size ? [present[i], present[j]] : [present[j], present[i]]
      let shared = 0
      for (const u of s.users) if (l.users.has(u)) shared++
      if (shared) out.push({ a: present[i], b: present[j], shared, share: s.users.size ? shared / s.users.size : 0 })
    }
  return out.sort((x, y) => y.shared - x.shared)
}

export function reachOf(channels: string[], byChan: Map<string, RosterChannel>): Reach {
  const present = channels.map((c) => byChan.get(c)).filter((x): x is RosterChannel => !!x)
  const count = new Map<string, number>()
  for (const ch of present) for (const u of ch.users) count.set(u, (count.get(u) ?? 0) + 1)
  let multi = 0
  for (const n of count.values()) if (n > 1) multi++
  const gross = present.reduce((s, ch) => s + ch.users.size, 0)
  const rows = present
    .map((ch) => {
      let exclusive = 0
      for (const u of ch.users) if (count.get(u) === 1) exclusive++
      return { who: ch, viewers: ch.users.size, exclusive, msgs: ch.msgs }
    })
    .sort((x, y) => y.viewers - x.viewers)
  return { net: count.size, gross, cannibal: gross ? 1 - count.size / gross : 0, multi, rows, pairs: pairsOf(present), missing: channels.filter((c) => !byChan.has(c)) }
}

/** Reach d'un roster sur 7, 30 ou 90 jours, depuis les esquisses (period_reach). Pas d'exclusifs ni de paires : la différence de deux
 *  estimations serait trop bruitée. La cannibalisation compare la réunion à la somme des estimations par chaîne (± 3 points environ). */
export function reachFromEstimate(channels: string[], byChan: Map<string, RosterChannel>, p: PeriodReach): Reach {
  const rows = p.chans.flatMap((x) => {
    const who = byChan.get(x.c)
    return who ? [{ who, viewers: x.n, exclusive: null, msgs: null }] : []
  })
  const gross = rows.reduce((s, x) => s + x.viewers, 0)
  return {
    net: p.net, gross, cannibal: gross ? Math.max(0, 1 - p.net / gross) : 0, multi: null, rows, pairs: [],
    missing: channels.filter((c) => !byChan.has(c)), estimated: { days: p.days, from: p.from ?? "", to: p.to ?? "" },
  }
}

type Est = { s: "loading" } | { s: "none" } | { s: "error"; msg: string } | { s: "ok"; p: PeriodReach }

/** Lit period_reach pour les chaînes d'un roster quand la fenêtre dépasse un jour (win > 0). */
function useEstimate(channels: string[], win: number): Est {
  const key = channels.join(",")
  const [st, setSt] = useState<Est>({ s: "loading" })
  useEffect(() => {
    if (!win) return
    let live = true
    setSt({ s: "loading" })
    const f = window.periodReach
    if (!f || !channels.length) { setSt({ s: "none" }); return }
    f(channels, win).then(
      (p) => live && setSt(p ? { s: "ok", p } : { s: "none" }),
      (e) => live && setSt({ s: "error", msg: String(e?.message ?? e) })
    )
    return () => { live = false }
  }, [key, win])
  return st
}

const pct = (x: number) => (x * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " %"

/** Portée cumulée d'un roster : chiffres réels, détail par chaîne à la demande */
function NetReachCard({ roster, r, status }: { roster: Roster; r: Reach | null; status: string }) {
  const [showBreakdown, setShowBreakdown] = useState(false)

  if (!roster.channels.length) {
    return <p className="text-xs text-muted-foreground">Ajoutez des chaînes pour calculer la portée cumulée.</p>
  }
  if (!r) return <p className="text-xs text-muted-foreground">{status}</p>

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-sm font-medium text-dusk">Portée cumulée (Net Reach)</h5>
        {r.rows.length > 0 && (
          <button type="button" onClick={() => setShowBreakdown(!showBreakdown)} className="text-xs text-primary underline-offset-2 hover:underline">
            {showBreakdown ? "Masquer le détail" : "Voir le détail"}
          </button>
        )}
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold text-foreground font-mono tabular-nums">{r.estimated ? "≈ " : ""}{fmt(r.net)}</span>
        <span className="text-sm text-muted-foreground">viewers actifs uniques</span>
      </div>
      {r.estimated && (
        <p className="mt-1 text-xs text-dusk">
          Estimation à ± 2,3 % sur {r.estimated.days} jour{r.estimated.days > 1 ? "s" : ""} complet{r.estimated.days > 1 ? "s" : ""}
          {r.estimated.from ? ` (${r.estimated.from === r.estimated.to ? r.estimated.from : `${r.estimated.from} → ${r.estimated.to}`})` : ""}.
        </p>
      )}
      <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-xs">
        <dt className="text-dusk">Audience brute (somme des chaînes)</dt>
        <dd className="text-right font-mono tabular-nums">{r.estimated ? "≈ " : ""}{fmt(r.gross)}</dd>
        <dt className="text-dusk" title="Part de l'audience brute qui fait doublon : 1 − Net Reach ÷ audience brute">
          Cannibalisation
        </dt>
        <dd className="text-right font-mono tabular-nums">{r.gross ? (r.estimated ? "≈ " : "") + pct(r.cannibal) : "—"}</dd>
        {r.multi !== null && (
          <>
            <dt className="text-dusk">Sur 2 chaînes ou plus du roster</dt>
            <dd className="text-right font-mono tabular-nums">{fmt(r.multi)}</dd>
          </>
        )}
      </dl>
      {r.missing.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Plus suivie{r.missing.length > 1 ? "s" : ""}, donc sans données : {r.missing.join(", ")}
        </p>
      )}
      {showBreakdown && (
        <div className="mt-3 grid gap-1 border-t border-border/50 pt-3">
          <div className="flex justify-between text-[11px] text-dusk">
            <span>Chaîne</span>
            <span>{r.estimated ? "viewers uniques (≈)" : "viewers · exclusifs"}</span>
          </div>
          {r.rows.map((x) => (
            <div key={x.who.c} className="flex items-center justify-between gap-3 text-sm py-1">
              <span className="truncate font-mono text-muted-foreground">{x.who.c}</span>
              <span className="text-right whitespace-nowrap">
                <span className="font-mono tabular-nums text-foreground">{r.estimated ? "≈ " : ""}{fmt(x.viewers)}</span>
                {x.exclusive !== null && (
                  <>
                    <span className="text-dusk"> · </span>
                    <span className="font-mono tabular-nums" title="Viewers qu'aucune autre chaîne du roster n'a eus">
                      {fmt(x.exclusive)}
                      {x.viewers ? <span className="text-dusk"> ({pct(x.exclusive / x.viewers)})</span> : null}
                    </span>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Choix des chaînes d'un roster parmi les chaînes suivies */
function ChannelPicker({ roster, chans, onToggle }: { roster: Roster; chans: RosterChannel[]; onToggle: (c: string, on: boolean) => void }) {
  const [q, setQ] = useState("")
  const inRoster = new Set(roster.channels)
  const list = chans.filter((c) => c.c.includes(q.trim().toLowerCase()))
  return (
    <div className="space-y-3">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer les chaînes suivies…" aria-label="Filtrer les chaînes suivies" />
      <div className="max-h-80 overflow-y-auto flex flex-wrap gap-1.5">
        {list.map((c) => {
          const on = inRoster.has(c.c)
          return (
            <button
              key={c.c}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(c.c, !on)}
              className={cn(
                "rounded-md border px-2.5 py-1 font-mono text-xs transition-colors",
                on ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {c.c}
            </button>
          )
        })}
        {!list.length && <p className="text-xs text-muted-foreground">Aucune chaîne suivie ne correspond.</p>}
      </div>
      <p className="text-xs text-dusk">
        {roster.channels.length} chaîne{roster.channels.length > 1 ? "s" : ""} dans le roster.
      </p>
    </div>
  )
}

/** Formulaire de création/modification de roster */
function RosterForm({ initialRoster, onSubmit, onCancel }: {
  initialRoster?: Partial<Roster>
  onSubmit: (name: string, description: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initialRoster?.name || "")
  const [description, setDescription] = useState(initialRoster?.description || "")

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit(name.trim(), description.trim())
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="roster-name">Nom du roster</Label>
        <Input
          id="roster-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex: Créateurs indie, streamers amis..."
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="roster-description">Description (optionnel)</Label>
        <Textarea
          id="roster-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Une courte description du thème ou de l'organisation..."
          rows={3}
          className="mt-1"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} disabled={!name.trim()}>
          Sauvegarder
        </Button>
      </div>
    </div>
  )
}

export function Rosters() {
  const { rosters, loading, createRoster, updateRoster, addChannelsToRoster, removeChannelFromRoster, deleteRoster, refresh } = useRosters()
  const data = useRostersData()
  const period = usePeriodInfo()
  const byChan = useMemo(() => new Map((data?.chans ?? []).map((c) => [c.c, c])), [data])
  const [editingRoster, setEditingRoster] = useState<Roster | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [win, setWin] = useState<0 | 7 | 30 | 90>(0)
  const [pickingId, setPickingId] = useState<string | null>(null)
  const picking = rosters.find((r) => r.id === pickingId) ?? null

  const handleCreate = (name: string, description: string) => {
    const r = createRoster(name, description)
    setShowCreateDialog(false)
    setPickingId(r.id) // enchaîne directement sur le choix des chaînes
  }

  const handleUpdate = (roster: Roster, name: string, description: string) => {
    updateRoster(roster.id, name, description)
    setEditingRoster(null)
  }

  const handleDelete = (roster: Roster) => {
    if (window.confirm(`Supprimer le roster "${roster.name}" ? Cette action est irréversible.`)) {
      deleteRoster(roster.id)
    }
  }

  if (loading && !rosters.length) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Rosters</h3>
          <Button variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Actualiser
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Rosters</h3>
          <p className="text-sm text-muted-foreground">Regroupez des chaînes pour mesurer leur audience cumulée sans doublons (Net Reach).</p>
          <p className="mt-1 text-xs text-dusk">
            Viewers actifs (au moins un message) · {period?.range || "période en cours"} · rosters gardés dans ce navigateur.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau roster
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau roster</DialogTitle>
                <DialogDescription>Donnez un nom et une description à votre nouveau groupe de chaînes.</DialogDescription>
              </DialogHeader>
              <RosterForm onSubmit={handleCreate} onCancel={() => setShowCreateDialog(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-card p-1 shadow-sm" role="group" aria-label="Fenêtre du Net Reach">
          {([[0, "Période affichée"], [7, "7 jours"], [30, "30 jours"], [90, "90 jours"]] as const).map(([n, label]) => (
            <button
              key={n} type="button" aria-pressed={win === n} onClick={() => setWin(n)}
              className={cn("px-3 py-1 text-xs font-medium rounded-md transition-colors", win === n ? "bg-accent text-foreground shadow" : "text-muted-foreground hover:text-foreground")}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-dusk max-w-[60ch]">
          {win ? "Estimation à ± 2,3 % sur les jours complets déjà agrégés (la plage exacte est sur chaque carte)." : "Calcul exact sur les viewers en base pour la période choisie en haut de page."}
        </p>
      </div>

      {rosters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Aucun roster</h3>
            <p className="mt-2 text-center text-muted-foreground max-w-md">
              Créez votre premier roster pour regrouper des chaînes et calculer la portée cumulée entre elles.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rosters.map((roster) => (
            <RosterCard
              key={roster.id}
              roster={roster}
              byChan={byChan}
              ready={!!data}
              period={period?.range || "Période en cours"}
              win={win}
              onEdit={setEditingRoster}
              onDelete={handleDelete}
              onPick={(r) => setPickingId(r.id)}
            />
          ))}
        </div>
      )}

      {/* Choix des chaînes */}
      <Dialog open={!!picking} onOpenChange={(open) => !open && setPickingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chaînes de « {picking?.name} »</DialogTitle>
            <DialogDescription>Cliquez sur une chaîne suivie pour l'ajouter au roster ou l'en retirer.</DialogDescription>
          </DialogHeader>
          {picking && (
            <ChannelPicker
              roster={picking}
              chans={data?.chans ?? []}
              onToggle={(c, on) => (on ? addChannelsToRoster(picking.id, [c]) : removeChannelFromRoster(picking.id, c))}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog d'édition */}
      <Dialog open={!!editingRoster} onOpenChange={(open) => !open && setEditingRoster(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le roster</DialogTitle>
            <DialogDescription>Modifiez les informations de ce groupe de chaînes.</DialogDescription>
          </DialogHeader>
          {editingRoster && (
            <RosterForm
              initialRoster={editingRoster}
              onSubmit={(name, desc) => handleUpdate(editingRoster, name, desc)}
              onCancel={() => setEditingRoster(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Carte individuelle d'un roster */
function RosterCard({ roster, byChan, ready, period, win, onEdit, onDelete, onPick }: {
  roster: Roster
  byChan: Map<string, RosterChannel>
  ready: boolean
  period: string
  /** 0 : période affichée, calcul exact sur les viewers en base ; 7, 30 ou 90 : estimation HyperLogLog sur ces jours */
  win: number
  onEdit: (r: Roster) => void
  onDelete: (r: Roster) => void
  onPick: (r: Roster) => void
}) {
  // calculé une fois par carte : l'affichage et les exports montrent exactement les mêmes chiffres
  const exact = useMemo(() => reachOf(roster.channels, byChan), [roster.channels, byChan])
  const est = useEstimate(roster.channels, win)
  const empty = est.s === "ok" && est.p.days === 0
  const r: Reach | null = win ? (est.s === "ok" && !empty ? reachFromEstimate(roster.channels, byChan, est.p) : null) : ready ? exact : null
  const status = !win
    ? "Chargement des viewers de la période…"
    : est.s === "loading" ? "Calcul de l'estimation…"
    : est.s === "error" ? `Estimation impossible : ${est.msg}`
    : empty ? "Aucun jour complet agrégé pour l'instant : les esquisses se calculent chaque nuit pour la veille."
    : "Les estimations sur plusieurs jours demandent la base Supabase à jour (Réglages → Source des données, puis schema.sql à rejouer)."
  const when = r?.estimated ? `${r.estimated.days} jour${r.estimated.days > 1 ? "s" : ""} complet${r.estimated.days > 1 ? "s" : ""} (${r.estimated.from} → ${r.estimated.to}), estimation à ± 2,3 %` : period
  const canExport = !!r && r.rows.length > 0
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{roster.name}</CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(roster)} className="h-7 w-7 p-0">
              <Edit className="h-4 w-4" />
              <span className="sr-only">Modifier</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(roster)} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Supprimer</span>
            </Button>
          </div>
        </div>
        {roster.description && <CardDescription className="mt-1">{roster.description}</CardDescription>}
        <Badge variant="outline" className="mt-2 w-fit">
          {roster.channels.length} chaîne{roster.channels.length > 1 ? "s" : ""}
        </Badge>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <NetReachCard roster={roster} r={r} status={status} />
      </CardContent>

      <CardContent className="border-t border-border pt-3 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onPick(roster)} className="flex-1">
          <ListPlus className="h-4 w-4 mr-1.5" />
          Choisir les chaînes
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!canExport}
          onClick={() => r && void printRosterReport(roster, r, when)}
          title="Ouvre l'impression : choisissez « Enregistrer en PDF »"
        >
          <FileDown className="h-4 w-4 mr-1.5" />
          PDF
        </Button>
        <Button variant="ghost" size="sm" disabled={!canExport} onClick={() => r && rosterCsv(roster, r, when)} title="Tableur (séparateur ;)">
          <Download className="h-4 w-4 mr-1.5" />
          CSV
        </Button>
      </CardContent>
    </Card>
  )
}
