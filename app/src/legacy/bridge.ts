// Pont entre la coque React et l'ancien code (legacy.js), le temps de convertir les onglets un par un.
//
// - legacy.js reste un script « classique » : on l'injecte tel quel après le premier rendu React,
//   quand les éléments qu'il attend (#dot, #btnStart, #period, les <section>…) existent déjà.
// - Il prévient React par des événements : « legacy:tab » (onglet affiché), « legacy:overview » (données de la vue d'ensemble).
// - React l'appelle par les fonctions globales showTab() et openAddStreamer().
// - Les clics sur un élément [data-open="chaîne"] ou [data-goto="onglet"] sont gérés par l'ancien code, même dans React.
import { useSyncExternalStore } from "react"
import legacySrc from "./legacy.js?raw"
import legacyMarkup from "./legacy-markup.html?raw"

export type TabId = "overview" | "channel" | "game" | "chat" | "overlap" | "map" | "flows" | "settings" | "rosters"

/** Une chaîne telle que l'affiche l'ancien code : couleur attribuée et photo de profil (ou ''). */
export interface Who { c: string; color: string; img: string }
/** Graphique en courbes (préparé par lineSpec() dans l'ancien code). */
export interface LineSpec {
  series: { name: string; c: string; color: string; img: string; pts: [number, number | null][] }[]
  unit: string; pct: boolean; yFloor: number; gaps: [number, number][]; height: number
}
/** Diagramme en barres. */
export interface BarSpec { items: { k: string; lbl: string; v: number }[]; color: string; unit: string }
export interface Kpi { label: string; value: string; hint?: string; trend?: number[] | null; trendLabel?: string }
export interface ChannelInfo extends Who {
  langs: string[] // codes de langue (fr, us, ru…) : plusieurs = chaîne multilingue
  live: boolean | null // null : état inconnu (pas d'API Twitch)
  game: string; title: string
  viewers: number | null; uniq: number; msgs: number
  recent: number | null // msg/min sur les 5 dernières minutes, si l'écoute tourne
  wrote: number | null // part des viewers qui ont écrit pendant le live en cours
}
export interface PartRow extends Who {
  limited: string; avgV: number; perMin: number; msgK: number; uniq: number; react: number | null; inter: number | null
}
export interface FollowerRow extends Who { fol: number; avgV: number | null; grow: number | null }
export interface BrandRow extends Who { with: { msgK: number; perMin: number }; without: { msgK: number; perMin: number } }
export interface ModRow extends Who {
  limited: string; ban: number; to: number; clr: number; del: number; rate: number | null; drate: number | null
}
/** Bloc « Recoupements » de la Vue d'ensemble (recoupData dans legacy.js). */
export interface RecoupData {
  /** chaînes suivies avec des viewers actifs sur la période */
  channels: number
  /** période affichée (boutons Période : all, today, 7d, 30d), pour proposer de l'élargir quand le bloc est vide */
  period: string
  /** les paires ne portent que sur les pairMax chaînes qui ont le plus de viewers actifs */
  pairMax: number
  /** une paire n'est retenue qu'à partir de pairMin viewers actifs en commun */
  pairMin: number
  /** les 3 paires les plus proches (indice de Jaccard j, n viewers actifs en commun) */
  pairs: { a: Who; b: Who; n: number; j: number }[]
  /** les 3 trajets les plus fréquents : n personnes, délai médian entre les deux chats */
  flows: { from: Who; to: Who; n: number; gap: string }[]
  /** le raid le plus récent reçu par une chaîne suivie */
  raid: { from: (Who & { name: string }) | null; to: Who; n: number; ago: string; when: string } | null
}

/** Top Streamers : analyse des streamers par viewers, heures de stream, croissance */
export interface TopStreamerRow {
  c: string
  viewers: number
  peakViewers: number
  hours: number
  growth: number | null // croissance (%)
  avgMsgPerMin: number
  activeDays: number
}

/** Communautés Investies : taux d'interaction, redemptions, bits */
export interface InvestedCommunityRow {
  c: string
  viewers: number
  interactions: number | null
  interactionRate: number | null
  subs: number
  subsRate: number | null
  bits: number
  bitsRate: number | null
  raidsReceived: number
  raidsViewers: number
}

export interface OverviewData {
  kpis: Kpi[]
  channels: ChannelInfo[]
  recoup: RecoupData
  hasApi: boolean
  /** graphiques : chaînes tracées (les plus actives) sur le total suivi */
  chartOf: { shown: number; total: number }
  part: PartRow[] | null
  followers: FollowerRow[]
  brand: BrandRow[] | null
  mod: { rows: ModRow[]; noDel: boolean } | null
  msgChart: LineSpec
  viewerChart: LineSpec | null
  /** Phase 3 : Top Streamers */
  topStreamers: TopStreamerRow[]
  /** Phase 3 : Communautés Investies */
  investedCommunities: InvestedCommunityRow[]
}

export interface MomentRow extends Who {
  t: number; when: string; game: string; m: number; score: number; wave: number | null; mood: string; emote: string; vod: string
}
export interface ClipRow extends Who {
  id: string; when: string; exact: boolean; title: string; views: number; m: number; score: number | null; wave: number | null
}
export interface ClipsData {
  total: number; exact: number; comparable: number; hitRate: number | null; medianScore: number | null; rows: ClipRow[]
}
export interface SwitchRow { when: string; from: string; to: string; vB: number | null; vA: number | null; mB: number | null; mA: number | null }
/** Recommandation de raid : chaîne cible avec score de synergie */
export interface RaidRecommendation {
  /** Chaîne cible (avec photo et couleur) */
  to: Who
  /** Nom de la chaîne cible (si différent de c) */
  name: string
  /** Statut live de la cible */
  live: boolean | null
  /** Score de synergie (0-100) */
  score: number
  /** Viewers actifs communs sur 24h */
  viewers: number
  /** Pourcentage des viewers actifs qui se trouvent chez la cible */
  share: number
}
export interface ChannelHead extends Who { langs: string[]; live: boolean | null; game: string; title: string; viewers: number | null; since: string }
export interface ChannelData {
  ch: ChannelHead
  list: (Who & { live: boolean })[]
  main: Kpi[]
  more: Kpi[]
  hasApi: boolean
  moments: MomentRow[]
  clips: ClipsData | null
  switches: SwitchRow[] | null // null : pas d'API Twitch
  also: (Who & { share: number; n: number })[]
  games: { g: string; hours: number }[] | null // null : pas d'API Twitch
  raids: RaidRecommendation[] | null // null : pas d'API Twitch ou pas en live
  msgChart: LineSpec
  viewerChart: LineSpec | null // null : pas d'API Twitch
  hourChart: BarSpec
}

export interface ChatData {
  all: boolean // true : toutes les chaînes
  ch: ChannelHead | null
  list: (Who & { live: boolean })[]
  n: number // messages analysés
  moods: { key: string; label: string; share: number | null }[]
  kinds: {
    n: number; react: number; wave: number; inter: number; ad: number; co: number; cm: number
    parts: { key: string; label: string; desc: string; color: string; share: number }[]
  } | null
  kindRows: (Who & { n: number; react: number; wave: number; inter: number; ad: number; co: number; cm: number; ct: number })[] | null
  moodRows: (Who & { n: number; moods: number[]; emote: string })[] | null
  emotes: { k: string; v: number; share: number | null }[]
  words: { k: string; v: number }[]
  moments: MomentRow[]
  clips: ClipsData | null
  moodChart: LineSpec
  kindChart: LineSpec | null
}

/** Matrice de chevauchement : cells[i] = part des viewers actifs de la ligne vus aussi chez la colonne i (null sur la diagonale). */
export interface MatrixData { rows: { k: string; size: number; who: Who | null; cells: ({ r: number | null; n: number } | null)[] }[] }
export interface GameData {
  hasApi: boolean
  canSearch: boolean // API Twitch configurée dans ce navigateur (la recherche passe par elle)
  discover: {
    q: string; lang: string; status: "idle" | "loading" | "done" | "error"; error: string; game: string
    streams: (Who & { name: string; title: string; viewers: number; followed: boolean })[]
  }
  games: { g: string; chans: Who[]; air: string; avgV: number | null; users: number; msgs: number; perUser: number | null }[]
  switchGames: { g: string; n: number; dv: number | null; dm: number | null }[]
  matrix: MatrixData | null
}

export interface OverlapData {
  filter: string
  filters: { key: string; label: string; tip: string; count: number }[]
  filterNote: { count: number; desc: string; share: number; total: number } | null
  movers: {
    move: number; often: number; multi: number; total: number; oftenAt: number; medianMoves: number; maxMoves: number
    swStart: string // date (jj/mm/aaaa) depuis laquelle les changements sont comptés exactement, ou ''
    rows: (Who & { n: number; m: number; o: number; to: (Who & { n: number }) | null; from: (Who & { n: number }) | null })[]
    top: { id: string; moves: number; chans: number; path: (Who & { when: string })[]; more: number; span: string }[]
  } | null
  matrix: MatrixData
  pairs: { a: Who; b: Who; n: number; j: number }[]
  dist: { k: number; v: number; share: number }[]
}

export interface FlowRoute {
  a: Who; b: Who; n: number; gap: string; type?: "organic" | "raid"
}

export interface FlowsData {
  total: number; routes: number; medianGap: string; raidCount: number; raidViewers: number
  flows: FlowRoute[]
  flowsOrganic: FlowRoute[]  // Flux naturels (non-raid)
  flowsRaid: FlowRoute[]     // Flux liés aux raids
  balance: (Who & { in: number; out: number; net: number })[]
  raids: { when: string; from: (Who & { name: string }) | null; to: Who; n: number }[]
  flowType: "all" | "organic" | "raid"  // Type de flux affiché
  totalOrganic?: number  // Total des flux organiques
  totalRaid?: number     // Total des flux de raid
  gapOrganic?: string    // Délai médian des flux organiques
  gapRaid?: string       // Délai médian des flux de raid
}

export interface SettingsData {
  mode: "local" | "cloud"; modeNote: string
  sbUrl: string; sbKey: string; sbCode: string; sbMsg: string
  chans: Who[]; chanLimit: number | null; chansMsg: string
  addSearch: { msg: string; items: { login: string; name: string; img: string; live: boolean; game: string; unchecked: boolean; followed: boolean }[] } | null
  apiReady: boolean; pendingLocal: string[]
  clientId: string; token: string; apiMsg: string
  dbNote: string; dbMsg: string
}

/** Commandes du moteur de la Carte (dessin image par image, dans legacy.js). */
export interface MapApi {
  zoomIn: () => void; zoomOut: () => void; fit: () => void; recenter: () => void
  select: (id: string | null) => void; find: (id: string) => void; group: (g: number | null) => void; stop: () => void
  /** lecture / pause du mouvement des orbites (gardé dans la configuration) */
  togglePause: () => void
  /** mode Globe : glisser fait tourner l'univers en 3D au lieu de déplacer la vue */
  toggleGlobe: () => void
}
/** Ce que le moteur signale à React : fiche de la chaîne choisie, noms masqués, chaînes déplacées, groupe mis en avant. */
export interface MapNotice {
  /** links : voisines reliées par un trait ; share : part des viewers actifs de la chaîne vue chez la voisine ; out / inn : passages mesurés vers elle / depuis elle */
  info?: (Who & { sub: string; links: (Who & { share: number; n: number; out: number; inn: number })[] }) | null
  hidden?: string; pins?: number; grp?: number | null
  /** mouvement des orbites mis en pause par l'utilisateur */
  paused?: boolean
  /** mode Globe actif */
  globe?: boolean
  /** derniers passages vus en direct (le plus récent d'abord) : heure, de, vers, nombre */
  log?: { t: number; from: string; to: string; n: number }[]
}
export interface MapData {
  open: boolean // menu de gauche déplié
  view: "all" | "groups" | "sel"
  picked: number
  live: { on: boolean; count: number; total: number } // filtre « En live » : chaînes en live / toutes, parmi celles qui ont un viewer actif sur la période
  periods: { key: string; label: string; on: boolean }[]
  langs: { key: string; label: string; count: number; on: boolean }[] | null
  pick: (Who & { langs: string[]; n: number; on: boolean })[] | null // vue « Ma sélection »
  pins: number
  empty: string // message quand il n'y a pas assez de chaînes pour une carte
  find: string[]
  groups: { i: number; color: string; members: Who[]; viewers: number }[] | null
  solo: Who[]
  mount: ((els: { stage: HTMLElement; radar: HTMLElement; box: HTMLElement; notify: (n: MapNotice) => void; view?: (v: MapViewState) => void }) => MapApi) | null
}
/**
 * Vue de la carte, envoyée par le moteur à chaque dessin (le fond en volume la suit) : zoom k, déplacement tx/ty (pixels de
 * la carte de base), rotation à plat rot (radians) et rotation du globe q (quaternion [w, x, y, z]).
 */
export interface MapViewState { k: number; tx: number; ty: number; rot: number; q: number[] }

/** Historique d'une chaîne lu dans les rollups quotidiens (une ligne par jour agrégé). */
export interface HistoryDay { d: string; chatters: number; msgs: number; mins: number; peak: number; avg: number; out: number; in: number }
export interface HistoryRoute extends Who { n: number; raid: number }
export interface ChannelHistory { days: HistoryDay[]; out: HistoryRoute[]; in: HistoryRoute[] }

/** Viewers uniques sur plusieurs jours, estimés par HyperLogLog (± 2,3 %) : réunion des chaînes (net) et chaque chaîne. */
export interface PeriodReach { from: string | null; to: string | null; days: number; net: number; chans: { c: string; n: number }[] }

/** Historique du réseau entier lu dans les rollups quotidiens (Vue d'ensemble). */
export interface NetworkDay { d: string; msgs: number; avg: number; chans: number }
export interface NetworkTop extends Who { msgs: number; avg: number }
export interface NetworkHistory { days: NetworkDay[]; top: NetworkTop[] }

declare global {
  interface Window {
    /** null : pas de base Supabase (mode local) ou base pas à jour */
    networkHistory?: (days: number) => Promise<NetworkHistory | null>
    periodReach?: (chans: string[], days: number) => Promise<PeriodReach | null>
    channelHistory?: (c: string, days: number) => Promise<ChannelHistory | null>
    showTab?: (t: TabId) => void
    openAddStreamer?: () => void
    runDiscover?: (q: string, lang: string) => void
    setOverlapFilter?: (f: string) => void
    // Réglages (actions de l'ancien code)
    settingsMode?: (m: "local" | "cloud") => Promise<void>
    saveSupabase?: (url: string, key: string, code: string) => Promise<void>
    runAddSearch?: (q: string) => Promise<void>
    addFromSearch?: (login: string, img: string) => void
    importLocal?: () => void
    dropLocal?: () => void
    removeChan?: (c: string) => void
    saveChanList?: (text: string) => void
    saveApi?: (clientId: string, token: string) => void
    genToken?: (clientId: string, secret: string) => Promise<boolean>
    exportDb?: () => void
    importDbFile?: (f: File) => Promise<void>
    resetDb?: () => Promise<void>
    forceFullResync?: () => Promise<boolean>
    // Carte
    mapAction?: (a: "side" | "period" | "lang" | "view" | "live" | "pick" | "pins" | "relayout", v?: string | string[], on?: boolean) => void
    __legacyLoaded?: boolean
  }
}

// Le balisage ancien est coupé en deux : les filtres (dans l'en-tête de page React) et les onglets.
const cut = legacyMarkup.indexOf('<section id="t-overview"')
export const filtersHtml = legacyMarkup.slice(0, cut)
export const sectionsHtml = legacyMarkup.slice(cut)

export function loadLegacy() {
  if (window.__legacyLoaded) return
  window.__legacyLoaded = true
  const s = document.createElement("script")
  s.textContent = legacySrc
  document.body.appendChild(s)
}

// Dernières données reçues pour un événement, gardées hors des composants : l'ancien code les envoie
// pendant son rendu, parfois avant que le composant qui les affiche soit monté.
function legacyStore<T>(event: string) {
  let value: T | undefined = undefined // undefined : rien reçu pour l'instant
  const subs = new Set<() => void>()
  window.addEventListener(event, (e) => {
    value = (e as CustomEvent<T>).detail
    subs.forEach((f) => f())
  })
  const subscribe = (f: () => void) => (subs.add(f), () => void subs.delete(f))
  return () => useSyncExternalStore(subscribe, () => value)
}

// « Par chaîne » : undefined tant que rien n'est reçu, null s'il n'y a aucune chaîne suivie
export const useChannelData = legacyStore<ChannelData | null>("legacy:channel")

export const useOverviewData = legacyStore<OverviewData>("legacy:overview")
/** La période choisie : son nom, la plage réelle couverte par les relevés, et si les filtres sont affichés (ni Réglages ni Carte). */
export interface PeriodInfo { key: string; label: string; range: string; show: boolean; hours?: number }
export const usePeriodInfo = legacyStore<PeriodInfo>("legacy:period")
/** Onglet actuellement affiché. */
export const useCurrentTab = legacyStore<TabId>("legacy:tab")

// Hook pour obtenir l'onglet actuel avec fallback
export function useTabWithFallback(fallback: TabId = "overview"): TabId {
  const tab = useCurrentTab()
  return tab ?? fallback
}

/** État du relevé (pilule de l'en-tête) : état court, problèmes [titre, détail], chiffres [libellé, valeur]. */
export interface StatusData {
  head: string
  /** l'état en un ou deux mots, pour la pilule sur téléphone */
  short: string
  /** [titre, ce qui se passe et quoi faire, message technique brut, onglet où régler le problème] */
  alerts: [string, string, string?, string?][]
  facts: [string, string][]
  /** marche à suivre quand rien ne tourne encore */
  note: string
  /** bouton vers un onglet (data-goto) */
  action: { label: string; goto: string } | null
}
export const useStatusData = legacyStore<StatusData>("legacy:status")

export const useChatData = legacyStore<ChatData>("legacy:chat")
export const useGameData = legacyStore<GameData>("legacy:game")
export const useOverlapData = legacyStore<OverlapData>("legacy:overlap")
export const useFlowsData = legacyStore<FlowsData>("legacy:flows")
export const useRaidRecommendations = legacyStore<RaidRecommendation[]>("legacy:raid-recommendations")

/** Rosters : une ligne par chaîne suivie, avec l'ensemble des viewers actifs (empreintes) de la période. */
export interface RosterChannel extends Who { users: Set<string>; msgs: number }
export interface RostersData { chans: RosterChannel[] }
export const useRostersData = legacyStore<RostersData>("legacy:rosters")

/** Type pour les données de requête du legacy.js (retour de la fonction Q()) */
export interface LegacyQuery {
  t0: number
  pres: any[]
  mins: any[]
  snaps: any[]
  events: any[]
  clips?: any[]
  sw?: any[]
}

/** Force le recalcul des flux (appelé quand le composant Flows est monté mais n'a pas de données) */
export function triggerFlowsRender() {
  // Récupérer les données courantes du legacy et appeler renderFlows
  if ((window as any).renderFlows && (window as any).getCurrentQuery) {
    const queryObj: LegacyQuery = (window as any).getCurrentQuery()
    ;(window as any).renderFlows(queryObj, "all")
  }
}

export const useSettingsData = legacyStore<SettingsData>("legacy:settings")

// « Ajouter un streamer » (barre latérale) : ouvre les Réglages puis place le curseur dans la recherche.
// La demande est gardée ici, car elle arrive parfois avant que la page Réglages soit affichée.
let focusAdd = false
const focusSubs = new Set<() => void>()
window.addEventListener("legacy:focus-add", () => { focusAdd = true; focusSubs.forEach((f) => f()) })
export function onFocusAdd(cb: () => void) {
  const run = () => { if (focusAdd) { focusAdd = false; cb() } }
  focusSubs.add(run)
  run()
  return () => void focusSubs.delete(run)
}
export const useMapData = legacyStore<MapData>("legacy:map")
