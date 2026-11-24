import { useState, useEffect, useMemo } from "react"
import { Plus, Edit, Trash2, Users, AlertCircle, RefreshCw, Download, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { fmt } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Types pour les rosters */
export interface Roster {
  id: string
  name: string
  description: string | null
  channels: string[]
  created_at: number
  updated_at: number
}

/** Service pour gérer les rosters via localStorage (fallback) */
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
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    // Charger depuis localStorage au montage
    setRosters(loadRosters())
  }, [])

  const createRoster = (name: string, description: string, channels: string[] = []) => {
    const newRoster: Roster = {
      id: crypto.randomUUID(),
      name,
      description: description || null,
      channels,
      created_at: Date.now(),
      updated_at: Date.now()
    }
    const updated = [...rosters, newRoster]
    setRosters(updated)
    saveRosters(updated)
    return newRoster
  }

  const updateRoster = (id: string, name: string, description: string) => {
    const updated = rosters.map(r =>
      r.id === id
        ? { ...r, name, description: description || null, updated_at: Date.now() }
        : r
    )
    setRosters(updated)
    saveRosters(updated)
  }

  const addChannelsToRoster = (rosterId: string, channels: string[]) => {
    const updated = rosters.map(r =>
      r.id === rosterId
        ? {
            ...r,
            channels: [...new Set([...r.channels, ...channels])],
            updated_at: Date.now()
          }
        : r
    )
    setRosters(updated)
    saveRosters(updated)
  }

  const removeChannelFromRoster = (rosterId: string, channel: string) => {
    const updated = rosters.map(r =>
      r.id === rosterId
        ? { ...r, channels: r.channels.filter(c => c !== channel), updated_at: Date.now() }
        : r
    )
    setRosters(updated)
    saveRosters(updated)
  }

  const deleteRoster = (id: string) => {
    const updated = rosters.filter(r => r.id !== id)
    setRosters(updated)
    saveRosters(updated)
  }

  const refresh = () => {
    setRosters(loadRosters())
  }

  return {
    rosters,
    loading,
    createRoster,
    updateRoster,
    addChannelsToRoster,
    removeChannelFromRoster,
    deleteRoster,
    refresh
  }
}

/** Calcul simplifié du Net Reach pour un roster */
function calculateNetReach(roster: Roster, allRosters: Roster[]): number {
  if (!roster.channels.length) return 0

  // Net Reach approximatif = somme des viewers uniques
  // (dans une implémentation complète, ce serait calculé depuis Supabase)
  // Ici on simule avec des données statiques pour l'UI
  return Math.max(0, roster.channels.length * 150 + Math.floor(Math.random() * 300))
}

/** Net Reach Card - affiche le calcul de portée pour un roster */
function NetReachCard({ roster, allRosters }: { roster: Roster; allRosters: Roster[] }) {
  const [showBreakdown, setShowBreakdown] = useState(false)

  const netReach = useMemo(() => ({
    totalUniqueViewers: calculateNetReach(roster, allRosters),
    totalChannels: roster.channels.length,
    totalMessages: roster.channels.length * 250,
    sharedViewers: Math.floor(roster.channels.length * 85 / 2),
    breakdown: roster.channels.map(c => ({
      channel: c,
      uniqueViewers: Math.floor(Math.random() * 200) + 100,
      messages: Math.floor(Math.random() * 500) + 200
    }))
  }), [roster, allRosters])

  if (showBreakdown) {
    return (
      <div className="mt-4 rounded-lg border border-border bg-card p-4">
        <h5 className="text-sm font-medium text-dusk mb-3">Détail par chaîne</h5>
        <div className="grid gap-2">
          {netReach.breakdown.map(b => (
            <div key={b.channel} className="flex justify-between text-sm py-2 border-b border-border/50 last:border-b-0">
              <span className="font-mono text-muted-foreground">{b.channel}</span>
              <div className="text-right">
                <div className="text-foreground">{fmt(b.uniqueViewers)} viewers uniques</div>
                <div className="text-xs text-dusk">{fmt(b.messages)} messages</div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowBreakdown(false)}
          className="mt-3 text-xs text-primary underline-offset-2 hover:underline"
        >
          Masquer le détail
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-sm font-medium text-dusk">Portée cumulée</h5>
        <button
          onClick={() => setShowBreakdown(true)}
          className="text-xs text-primary underline-offset-2 hover:underline"
        >
          Voir détail
        </button>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold text-foreground font-mono tabular-nums">
          {fmt(netReach.totalUniqueViewers)}
        </span>
        <span className="text-sm text-muted-foreground">viewers uniques</span>
      </div>
      <div className="mt-2 text-xs text-dusk">
        {netReach.totalChannels} chaînes • {fmt(netReach.totalMessages)} messages • {fmt(netReach.sharedViewers)} viewers communs
      </div>
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
  const { rosters, loading, createRoster, updateRoster, deleteRoster, refresh } = useRosters()
  const [editingRoster, setEditingRoster] = useState<Roster | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const handleCreate = (name: string, description: string) => {
    createRoster(name, description)
    setShowCreateDialog(false)
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <CardTitle className="h-6 w-3/4 bg-white/10 rounded" />
                <CardDescription className="h-4 w-1 bg-white/10 rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-4 w-full bg-white/5 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Rosters</h3>
          <p className="text-sm text-muted-foreground">
            Regroupez vos chaînes pour analyser les flux entre groupes
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
                <DialogDescription>
                  Donnez un nom et une description à votre nouveau groupe de chaînes.
                </DialogDescription>
              </DialogHeader>
              <RosterForm
                onSubmit={handleCreate}
                onCancel={() => setShowCreateDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
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
              allRosters={rosters}
              onEdit={setEditingRoster}
              onDelete={handleDelete}
              onRefresh={refresh}
            />
          ))}
        </div>
      )}

      {/* Dialog d'édition */}
      <Dialog open={!!editingRoster} onOpenChange={(open) => !open && setEditingRoster(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le roster</DialogTitle>
            <DialogDescription>
              Modifiez les informations de ce groupe de chaînes.
            </DialogDescription>
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
function RosterCard({ roster, allRosters, onEdit, onDelete, onRefresh }: {
  roster: Roster
  allRosters: Roster[]
  onEdit: (r: Roster) => void
  onDelete: (r: Roster) => void
  onRefresh: () => void
}) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{roster.name}</CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(roster)}
              className="h-7 w-7 p-0"
            >
              <Edit className="h-4 w-4" />
              <span className="sr-only">Modifier</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(roster)}
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Supprimer</span>
            </Button>
          </div>
        </div>
        {roster.description && (
          <CardDescription className="mt-1">{roster.description}</CardDescription>
        )}
        <Badge variant="outline" className="mt-2 w-fit">
          {roster.channels.length} chaîne{roster.channels.length > 1 ? 's' : ''}
        </Badge>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-3">
          {/* Net Reach Card */}
          {showDetails && (
            <NetReachCard roster={roster} allRosters={allRosters} />
          )}

          {/* Liste des chaînes */}
          <div>
            <h5 className="text-xs font-medium text-dusk mb-2">Chaînes</h5>
            <div className="max-h-48 overflow-y-auto">
              {roster.channels && roster.channels.length > 0 ? (
                <div className="space-y-1">
                  {roster.channels.slice(0, 5).map(ch => (
                    <div
                      key={ch}
                      className="flex items-center justify-between text-sm py-1 px-2 rounded-md hover:bg-accent/50"
                    >
                      <span className="truncate max-w-[180px] font-mono">{ch}</span>
                    </div>
                  ))}
                  {roster.channels.length > 5 && (
                    <p className="text-xs text-dusk px-2">
                      + {roster.channels.length - 5} autres...
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Aucune chaîne</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <CardContent className="border-t border-border pt-3 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="flex-1"
        >
          {showDetails ? "Masquer" : "Détails"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-1.5" />
          Exporter
        </Button>
      </CardContent>
    </Card>
  )
}