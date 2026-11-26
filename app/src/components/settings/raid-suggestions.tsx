// Réglages : chaînes non suivies qui ont raidé des chaînes suivies (table raid_events, lue par raidSuggestions() dans legacy.js).
// Une aide pour choisir quoi suivre : on montre des faits (raids, viewers annoncés, vers qui), sans note ni prédiction.
import { useEffect, useState } from "react"
import { Check, Radio } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChannelAvatar } from "@/components/channel-avatar"
import { panel } from "@/components/overview/parts"
import { cn } from "@/lib/utils"
import type { RaidSuggestions as Data, SettingsData } from "@/legacy/bridge"

const nf = new Intl.NumberFormat("fr-FR")
const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" })
const PAGE = 10

const targets = (to: string[]) => (to.length > 3 ? `${to.slice(0, 3).join(", ")} et ${to.length - 3} autre(s)` : to.join(", "))

export function RaidSuggestions({ d }: { d: SettingsData }) {
  const [data, setData] = useState<Data | null>()
  const [error, setError] = useState("")
  const [shown, setShown] = useState(PAGE)
  const [tries, setTries] = useState(0)
  const full = d.chanLimit != null && d.chans.length >= d.chanLimit
  const followed = new Set(d.chans.map((x) => x.c))

  // relu quand la source change ; ajouter ou retirer une chaîne ne relance pas de requête (legacy garde la réponse 10 min)
  useEffect(() => {
    let gone = false
    setData(undefined)
    setError("")
    void (async () => {
      try {
        const r = (await window.raidSuggestions?.()) ?? null
        if (!gone) setData(r)
      } catch (e) {
        if (!gone) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => { gone = true }
  }, [d.mode, d.sbUrl, d.sbCode, tries])

  return (
    <div role="region" aria-label="Elles ont raidé tes chaînes" className={cn(panel, "overflow-hidden")}>
      <div className="flex items-start gap-3 border-b border-border px-5 py-4">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-secondary text-primary-soft [&>svg]:size-4"><Radio /></span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-[-0.015em]">Elles ont raidé tes chaînes</h2>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
            Chaînes que tu ne suis pas, classées par viewers envoyés à tes chaînes en raid{data?.since ? ` (depuis le ${day.format(data.since)})` : ""}. Les viewers sont ceux que Twitch annonce au moment du raid.
          </p>
        </div>
      </div>
      <div className="space-y-3 px-5 py-4">
        {error ? (
          <div className="flex flex-wrap items-center gap-3">
            <p role="status" className="text-[12.5px] text-destructive">Lecture impossible : {error}</p>
            <Button size="sm" variant="secondary" onClick={() => setTries(tries + 1)}>Réessayer</Button>
          </div>
        ) : data === undefined ? (
          <p role="status" className="text-xs text-muted-foreground">Lecture des raids…</p>
        ) : data === null ? (
          <p className="text-xs text-muted-foreground">Disponible avec la base Supabase du collecteur : les raids y sont enregistrés.</p>
        ) : !data.items.length ? (
          <p className="text-xs text-muted-foreground">Aucune chaîne à proposer pour l'instant. Si la base contient des raids, vérifie le code du tableau de bord.</p>
        ) : (
          <>
            {full && <p role="status" className="text-[12.5px] text-muted-foreground">Tu suis déjà {d.chanLimit} chaînes, le maximum : retire-en une avant d'ajouter.</p>}
            <ul className="divide-y divide-border rounded-lg border border-border">
              {data.items.slice(0, shown).map((x) => (
                <li key={x.c} className="flex items-center gap-3 px-3 py-2">
                  <ChannelAvatar c={x.c} color="#8b7cff" />
                  <div className="min-w-0 flex-1">
                    <a href={`https://www.twitch.tv/${x.c}`} target="_blank" rel="noreferrer" className="text-sm underline-offset-2 hover:underline">{x.c}</a>
                    <p className="text-xs text-muted-foreground">
                      {x.raids} raid(s), {nf.format(x.viewers)} viewers · vers {targets(x.to)} · dernier le {day.format(x.last)}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" disabled={full || followed.has(x.c)} aria-label={followed.has(x.c) ? undefined : `Ajouter ${x.c}`} onClick={() => window.addFromSearch?.(x.c, "")}>
                    {followed.has(x.c) ? <><Check />Suivie</> : "Ajouter"}
                  </Button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3">
              {shown < data.items.length && <Button size="sm" variant="ghost" onClick={() => setShown(shown + PAGE)}>Voir plus</Button>}
              <p className="text-xs text-muted-foreground">
                {Math.min(shown, data.items.length)} sur {data.items.length}. Seules comptent les chaînes avec au moins 2 raids ou 20 viewers envoyés.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
