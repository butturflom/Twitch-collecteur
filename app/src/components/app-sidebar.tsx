// Barre latérale : structure reprise de « Dashboard Shell » (21st.dev, @isaiahbjork) —
// groupes titrés, élément actif surligné avec une barre d'accent, encart et action en pied.
import {
  Users, Gamepad2, LayoutDashboard, Map as MapIcon, MessageSquare,
  Plus, Scissors, ShieldCheck, SlidersHorizontal, Tv, X, type LucideIcon,
} from "lucide-react"
import type { SVGProps } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { TabId } from "@/legacy/bridge"

/** Deux cercles qui se recoupent : « en commun », sans sens de lecture. */
export const OverlapIcon: LucideIcon = ((p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true" {...p}>
    <circle cx="9" cy="12" r="6" /><circle cx="15" cy="12" r="6" />
  </svg>
)) as unknown as LucideIcon

export const NAV: { label: string; items: { id: TabId; label: string; icon: LucideIcon }[] }[] = [
  { label: "Observatoire", items: [
    { id: "map", label: "Carte", icon: MapIcon },
    { id: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
  ] },
  { label: "Analyse et flux", items: [
    { id: "audiences", label: "Audiences", icon: OverlapIcon },
    { id: "rosters", label: "Rosters", icon: Users },
  ] },
  { label: "Exploration", items: [
    { id: "channel", label: "Par chaîne", icon: Tv },
    { id: "game", label: "Par jeu", icon: Gamepad2 },
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "clip", label: "Clip", icon: Scissors },
  ] },
  { label: "Configuration", items: [
    { id: "settings", label: "Réglages", icon: SlidersHorizontal },
  ] },
]

function Logo() {
  return (
    <div className="grid size-8 shrink-0 place-items-center rounded-[9px] border border-logo-edge bg-linear-to-br from-logo-top to-logo-bottom shadow-logo">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-5">
        <circle cx="9" cy="12" r="6" stroke="#8b7cff" strokeWidth="1.8" />
        <circle cx="15" cy="12" r="6" stroke="#b3a9ff" strokeWidth="1.8" />
        <path d="M12 7.2a6 6 0 0 1 0 9.6 6 6 0 0 1 0-9.6z" fill="#8b7cff" fillOpacity=".55" />
      </svg>
    </div>
  )
}

export function AppSidebar({ active, open, onNavigate, onClose, onAdd }: {
  active: TabId; open: boolean; onNavigate: (t: TabId) => void; onClose: () => void; onAdd: () => void
}) {
  return (
    <>
      <aside
        aria-label="Navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-white/10 bg-zinc-900/70 shadow-2xl shadow-black/50 backdrop-blur-xl backdrop-saturate-150",
          // fermé sous lg : hors écran ET invisible (la visibilité change à la fin du glissement), pour que Tab n'entre pas dans un menu qu'on ne voit pas
          "transition-[transform,visibility] duration-300 ease-[cubic-bezier(.32,.72,0,1)] motion-reduce:transition-none",
          open ? "translate-x-0 shadow-drawer" : "-translate-x-full max-lg:invisible max-lg:[transition-delay:0s,300ms] lg:translate-x-0",
        )}
      >
        <div className="flex h-[58px] shrink-0 items-center gap-2.5 border-b border-white/[.06] px-4">
          <Logo />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-semibold tracking-[-0.015em] text-zinc-100">Twitch Overlap</div>
            <div className="truncate text-xs text-dusk">Analyse d'audience</div>
          </div>
          <Button variant="ghost" size="icon" className="size-8 lg:hidden" aria-label="Fermer la navigation" onClick={onClose}>
            <X />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3.5 [scrollbar-width:none]">
          {NAV.map((group) => (
            <div key={group.label} className="mt-5 first:mt-0">
              <h4 className="mb-1.5 px-2.5 text-xs font-medium text-dusk">{group.label}</h4>
              <ul className="flex flex-col gap-0.5">
                {group.items.map(({ id, label, icon: Icon }) => {
                  const on = id === active
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        aria-current={on ? "page" : undefined}
                        onClick={() => onNavigate(id)}
                        className={cn(
                          "group relative flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13.5px] font-medium transition-colors duration-200",
                          "outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          on
                            ? "bg-white/[.07] text-white shadow-nav-active"
                            : "text-zinc-400 hover:bg-white/[.04] hover:text-zinc-100",
                        )}
                      >
                        {on && <span aria-hidden className="absolute top-2 -left-3 h-5 w-[3px] rounded-r-full bg-primary shadow-rail" />}
                        <Icon className={cn("size-[17px] shrink-0 transition-colors duration-200", on ? "text-primary-soft" : "text-zinc-500 group-hover:text-zinc-300")} strokeWidth={1.75} />
                        <span className="truncate">{label}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/[.06] p-3">
          <div className="mb-2.5 rounded-xl border border-white/[.06] bg-zinc-950/50 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-zinc-100">
              <ShieldCheck className="size-3.5 text-signal-green" /> Données anonymisées
            </div>
            <p className="text-xs leading-snug text-zinc-400">
              Les pseudos sont remplacés par une empreinte et le texte des messages n'est jamais conservé.
            </p>
          </div>
          <Button variant="secondary" className="w-full border border-white/10 bg-zinc-800/60 text-zinc-100 transition-colors duration-200 hover:border-white/20 hover:bg-zinc-800" onClick={onAdd}>
            <Plus /> Ajouter un streamer
          </Button>
        </div>
      </aside>
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-black/55 backdrop-blur-sm transition-opacity duration-200 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
    </>
  )
}
