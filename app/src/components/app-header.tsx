// En-tête collant : fil d'Ariane, état de l'écoute ou du collecteur, démarrer / arrêter.
// #dot, #btnStart et #btnStop sont pilotés par l'ancien code (legacy.js) : React les rend une fois et ne change
// jamais leurs attributs ensuite. Le texte de l'état vient de l'événement « legacy:status » (statusOf dans legacy.js).
import { ChevronDown, Menu, Play, Square } from "lucide-react"
import { Popover } from "radix-ui"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { usePeriodInfo, useStatusData, useTabWithFallback, type StatusData } from "@/legacy/bridge"

// Couleurs du point de statut (légende)
const STATUS_LEGEND = [
  { cls: "dot", label: "État normal", color: "bg-zinc-400" },
  { cls: "dot on", label: "Collecteur en ligne", color: "bg-emerald-400" },
  { cls: "dot err", label: "Erreur", color: "bg-destructive" },
  { cls: '[data-alert]', label: "Alerte", color: "bg-amber-400" },
]

/** Ce que la pilule montre : le problème d'abord (il ne doit jamais être celui que la troncature coupe), puis l'état. */
const alertLbl = (s: StatusData) => (s.alerts.length > 1 ? `${s.alerts.length} problèmes` : s.alerts[0]?.[0] ?? "")
/** Sur téléphone, la pilule n'a la place que pour un mot ou deux. */
const alertShort = (s: StatusData) => (s.alerts.length > 1 ? `${s.alerts.length} problèmes` : s.alerts.length ? "1 problème" : "")
/** Titre d'erreur avec l'onglet concerné pour plus de clarté. */
const alertTitle = (alert: StatusData["alerts"][0], tab: string) => alert[0] + (tab !== "overview" ? ` (${tab})` : "")

/**
 * Pilule d'état : le point (couleur posée par l'ancien code), le problème éventuel puis l'état court, tous deux
 * lisibles même tronqués. Au clic, le détail : problèmes en entier, chiffres du relevé, marche à suivre.
 */
function StatusPill() {
  const s = useStatusData()
  const tab = useTabWithFallback()
  const alert = s ? alertLbl(s) : ""
  // annoncé aux lecteurs d'écran à chaque changement d'état (pas à chaque rafraîchissement des chiffres)
  const spoken = s ? [alert, s.head].filter(Boolean).join(" · ") : ""
  return (
    <>
      <Popover.Root>
        <Popover.Trigger
          type="button"
          aria-label={spoken ? `État : ${spoken}. Afficher le détail` : "État du relevé"}
          className="group flex h-8 min-w-0 flex-1 cursor-pointer items-center rounded-full border border-white/10 bg-zinc-900/70 px-2.5 text-xs sm:px-3 font-medium text-zinc-400 tabular-nums shadow-inset-top backdrop-blur-xl transition-colors hover:border-white/20 hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[state=open]:border-white/20 data-[state=open]:text-zinc-200 sm:max-w-[min(520px,45vw)] sm:flex-none"
        >
          <span id="dot" className="dot" />
          {/* ordinateur : problème · état ; téléphone : le problème s'il y en a un, sinon l'état court */}
          <span className="min-w-0 truncate max-sm:hidden">
            {alert && <span className="font-semibold text-destructive">{alert}</span>}
            {alert && s?.head && <span className="text-dusk"> · </span>}
            {s?.head}
          </span>
          {s && (
            <span className={cn("min-w-0 truncate sm:hidden", alert && "font-semibold text-destructive")}>{alert ? alertShort(s) : s.short}</span>
          )}
          <ChevronDown aria-hidden className="ms-1.5 size-3.5 shrink-0 text-dusk max-sm:hidden transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </Popover.Trigger>
        {s && (
          <Popover.Portal>
            <Popover.Content
              align="end"
              sideOffset={8}
              collisionPadding={12}
              className="z-50 w-[min(340px,calc(100vw-24px))] rounded-xl border border-input bg-dome-crest/95 p-4 text-xs shadow-popover backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
            >
              <p className="text-[13px] font-semibold text-foreground">{s.head}</p>

              {/* Légende des couleurs du point */}
              <div className="my-3 border-t border-border pt-3">
                <p className="mb-1.5 text-[11px] font-medium text-dusk">Couleurs du point</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_LEGEND.map((item) => (
                    <div key={item.cls} className="flex items-center gap-1.5">
                      <span className={cn("dot", item.color)} />
                      <span className="text-[11px] text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {s.alerts.length > 0 && (
                <ul className="mt-3 space-y-2.5 border-t border-border pt-3">
                  {s.alerts.map(([title, text, raw, goto]) => (
                    <li key={title}>
                      <p className="font-semibold text-destructive">{alertTitle([title, text, raw, goto], tab)}</p>
                      <p className="mt-0.5 leading-relaxed break-words text-muted-foreground">{text}</p>
                      {goto && (
                        <Popover.Close asChild>
                          <a href="#" data-goto={goto} className="mt-1.5 inline-flex items-center rounded-md text-[12.5px] font-medium text-primary-soft underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">Ouvrir les Réglages</a>
                        </Popover.Close>
                      )}
                      {raw && (
                        <div className="mt-1.5">
                          <p className="font-mono text-[11px] leading-snug break-words text-dusk">Message reçu :</p>
                          <p className="font-mono text-[11px] leading-snug break-words text-dusk">{raw}</p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {s.facts.length > 0 && (
                <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 border-t border-border pt-3">
                  {s.facts.map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="text-right font-mono text-foreground tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {s.note && <p className="mt-3 border-t border-border pt-3 leading-relaxed text-dusk">{s.note}</p>}
              {s.action && (
                <Popover.Close asChild>
                  <a href="#" data-goto={s.action.goto} className="mt-3 inline-flex items-center rounded-md text-[12.5px] font-medium text-primary-soft underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                    {s.action.label}
                  </a>
                </Popover.Close>
              )}
            </Popover.Content>
          </Popover.Portal>
        )}
      </Popover.Root>
      <span role="status" className="sr-only">{spoken}</span>
    </>
  )
}

export function AppHeader({ title, onMenu }: { title: string; onMenu: () => void }) {
  const period = usePeriodInfo()
  return (
    <header className="sticky top-0 z-20 flex h-[58px] items-center gap-2 sm:gap-3 border-b border-white/[.06] bg-zinc-950/60 px-4 backdrop-blur-xl backdrop-saturate-150 sm:px-7">
      <Button variant="secondary" size="icon" className="size-[34px] border border-input lg:hidden" aria-label="Ouvrir la navigation" onClick={onMenu}>
        <Menu />
      </Button>
      <nav aria-label="Fil d'Ariane" className="flex min-w-0 items-center gap-2 text-[13px] whitespace-nowrap">
        <span className="hidden text-dusk sm:inline">Twitch Overlap</span>
        <span className="hidden text-zinc-700 sm:inline">/</span>
        <span className="truncate font-medium text-zinc-100">{title}</span>
        {/* la période reste visible quand les filtres de la page ont défilé hors de l’écran */}
        {period?.show && <span className="hidden text-dusk md:inline"><span aria-hidden className="me-2 text-zinc-700">/</span>Période : <span className="text-zinc-300">{period.label}</span></span>}
      </nav>
      <span className="hidden flex-1 sm:block" />
      <StatusPill />
      <Button id="btnStart" title="Démarrer l'écoute" className="shadow-action">
        <Play className="fill-current" /><span className="hidden sm:inline">Démarrer l'écoute</span>
      </Button>
      <Button id="btnStop" variant="secondary" title="Arrêter" className="border border-white/10 bg-zinc-900/70 transition-colors duration-200 hover:bg-zinc-800" disabled>
        <Square className="fill-current" /><span className="hidden sm:inline">Arrêter</span>
      </Button>
    </header>
  )
}
