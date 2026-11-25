import { memo, useEffect, useState } from "react"
import { flushSync } from "react-dom"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { Overview } from "@/components/overview/overview"
import { Channel } from "@/components/channel/channel"
import { Chat } from "@/components/chat/chat"
import { Game } from "@/components/game/game"
import { Overlap } from "@/components/overlap/overlap"
import { Flows } from "@/components/flows/flows"
import { Settings } from "@/components/settings/settings"
import { MapView } from "@/components/map/map"
import { Rosters } from "@/components/rosters/rosters"
import { Landing, markLandingSeen, shouldShowLanding } from "@/components/landing/landing"
import { cn } from "@/lib/utils"
import { filtersHtml, loadLegacy, sectionsHtml, usePeriodInfo, type TabId } from "@/legacy/bridge"

const PAGES: Record<TabId, [string, string]> = {
  overview: ["Vue d'ensemble", "L'activité de toutes les chaînes suivies sur la période choisie."],
  channel: ["Par chaîne", "Le détail d'une chaîne : audience, chat, clips, jeux et chaînes voisines."],
  game: ["Par jeu", "Les catégories streamées, leur audience et l'effet d'un changement de jeu."],
  chat: ["Chat", "Ambiance, types de messages, emotes et moments forts du chat."],
  overlap: ["Chevauchement", "Les viewers actifs que les chaînes suivies ont en commun."],
  map: ["Carte", ""],
  flows: ["Flux", "Les viewers actifs qui passent d'une chaîne à l'autre, et les raids reçus."],
  settings: ["Réglages", "Source des données, chaînes suivies, API Twitch et sauvegardes."],
  rosters: ["Rosters", "Regroupez vos chaînes pour analyser les flux entre groupes et calculer le Net Reach."],
}

/** Onglets qui montrent le ciel étoilé (la Carte a le sien). Pour étendre le décor à d'autres pages, ajouter leur identifiant ici. */
const SKY_TABS: TabId[] = ["overview"]

// Zones gérées par l'ancien code : rendues une seule fois, React n'y touche plus jamais.
const LegacyFilters = memo(() => <div className="legacy" dangerouslySetInnerHTML={{ __html: filtersHtml }} />)
const LegacySections = memo(() => <div className="legacy" dangerouslySetInnerHTML={{ __html: sectionsHtml }} />)

export default function App() {
  const [tab, setTab] = useState<TabId>("overview")
  const [navOpen, setNavOpen] = useState(false)
  const [landing, setLanding] = useState(shouldShowLanding) // page d'accueil, une seule fois (drapeau dans le localStorage)
  const period = usePeriodInfo()

  useEffect(() => {
    // flushSync : la mise en page doit être à jour avant que l'ancien code dessine l'onglet
    // (la carte calcule sa hauteur d'après sa position dans la page).
    const onTab = (e: Event) => flushSync(() => setTab((e as CustomEvent<TabId>).detail))
    window.addEventListener("legacy:tab", onTab)
    loadLegacy()
    return () => window.removeEventListener("legacy:tab", onTab)
  }, [])

  useEffect(() => {
    document.title = PAGES[tab][0] + " · Twitch Overlap"
  }, [tab])

  useEffect(() => {
    if (!navOpen) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNavOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [navOpen])

  // Naviguer vers un onglet - utilise showTab si disponible, sinon change l'état directement
  const go = (t: TabId) => {
    setNavOpen(false)
    if (window.showTab) {
      window.showTab(t)
    } else {
      // Fallback: changer l'onglet directement si le legacy n'est pas chargé
      setTab(t)
    }
  }
  const enter = (t?: TabId) => {
    markLandingSeen()
    setLanding(false)
    if (t) go(t)
  }
  const [title, sub] = PAGES[tab]

  return (
    <>
    {/* l'accueil est posée par-dessus : le tableau de bord se charge dessous (l'ancien code a besoin de ses éléments), inerte tant qu'elle est là */}
    {landing && <Landing onEnter={enter} />}
    <div inert={landing} className="relative isolate min-h-screen bg-background font-sans text-foreground antialiased">
      {SKY_TABS.includes(tab) && <div aria-hidden className="to2-sky" />}
      <AppSidebar
        active={tab}
        open={navOpen}
        onNavigate={go}
        onClose={() => setNavOpen(false)}
        onAdd={() => { setNavOpen(false); window.openAddStreamer?.() }}
      />
      <div className="min-w-0 lg:pl-[248px]">
        <AppHeader title={title} onMenu={() => setNavOpen(true)} />
        <main className={cn("mx-auto px-4 pb-16 sm:px-7", tab === "map" ? "max-w-none pt-3.5 pb-0" : "max-w-[1320px]")}>
          {/* en-tête de page : masqué (mais présent) sur la carte, car l'ancien code pilote les filtres */}
          <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-3.5 pt-6 pb-5 sm:pt-7 sm:pb-6", tab === "map" && "hidden")}>
            <div className="min-w-0">
              <h1 className="text-[21px] leading-tight font-semibold tracking-[-0.025em] sm:text-2xl">{title}</h1>
              {sub && <p className="mt-1.5 max-w-[640px] text-[13px] text-muted-foreground">{sub}</p>}
              {period?.show && <p className="mt-1 text-[13px] text-dusk tabular-nums">{period.key === "today" ? period.range : `${period.label} : ${period.range[0].toLowerCase() + period.range.slice(1)}`}</p>}
            </div>
            <LegacyFilters />
          </div>
          {tab === "overview" && <Overview />}
          {tab === "channel" && <Channel />}
          {tab === "chat" && <Chat />}
          {tab === "game" && <Game />}
          {tab === "overlap" && <Overlap />}
          {tab === "flows" && <Flows />}
          {tab === "settings" && <Settings />}
          {tab === "map" && <MapView />}
          {tab === "rosters" && <Rosters />}
          <LegacySections />
        </main>
      </div>
    </div>
    </>
  )
}
