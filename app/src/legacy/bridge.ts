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

export type TabId = "overview" | "channel" | "game" | "chat" | "clip" | "audiences" | "map" | "settings" | "rosters"

/** Une chaîne telle que l'affiche l'ancien code : couleur attribuée et photo de profil (ou ''). */
export interface Who { c: string; color: string; img: string }
/** Graphique en courbes (préparé par lineSpec() dans l'ancien code). */
export interface LineSpec {
  series: { name: string; c: string; color: string; pts: [number, number | null][] }[]
  unit: string; pct: boolean; yFloor: number; gaps: [number, number][]; height: number
}
/** Diagramme en barres. */
export interface BarSpec { items: { k: string; lbl: string; v: number }[]; color: string; unit: string }
export interface Kpi { label: string; value: string; hint?: string; trend?: number[] | null; trendLabel?: string }
export interface ChannelInfo extends Who {
  langs: string[] // codes de langue (fr, us, ru…) : plusieurs = chaîne multilingue
  live: boolean | null // null : état inconnu (pas d'API Twitch)
  game: string; title: string
  viewers: number | null // viewers en direct (intro, export)
  peak: number | null // viewers max relevés sur la période : c'est lui qu'affichent les cartes
  uniq: number; msgs: number
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
  /** les 3 paires les plus proches : classées par ressemblance j (communs ÷ réunion) ; share = part des viewers de a (la plus petite) vus chez b */
  pairs: { a: Who; b: Who; n: number; share: number; j: number }[]
  /** les 3 trajets les plus fréquents : n personnes, délai médian entre les deux chats */
  flows: { from: Who; to: Who; n: number; gap: string }[]
  /** le raid le plus récent reçu par une chaîne suivie */
  raid: { from: (Who & { name: string }) | null; to: Who; n: number; ago: string; when: string } | null
}

/** Top Streamers : analyse des streamers par viewers, heures de stream, croissance */
export interface TopStreamerRow extends Who {
  viewers: number
  peakViewers: number
  hours: number
  growth: number | null // croissance des followers entre le premier et le dernier relevé (%)
  growthBase: number | null // followers au premier relevé : la base du pourcentage (null : pas assez de relevés)
  activeDays: number
}

/** Communautés les plus impliquées : classées par perMin puis msgK ; subs, bits et raids à part. */
export interface InvestedCommunityRow extends Who {
  viewers: number
  perMin: number // part des viewers qui écrivent chaque minute
  msgK: number // messages par minute pour 1 000 viewers
  subs: number
  subsK: number // subs pour 1 000 viewers
  bits: number
  raidsReceived: number
  raidsViewers: number
}

/** Bandeau des raids reçus (raidTickerData dans legacy.js). older : aucun aujourd'hui, ce sont les derniers relevés. */
export interface RaidTickerData {
  older: boolean
  rows: { t: number; from: (Who & { name: string }) | null; to: Who; n: number; ago: string }[]
}

/** Activité de la période (activityData dans legacy.js) : les chiffres « nombre annoncé » et ce que couvrent les relevés. */
export interface ActivityData {
  /** début et fin réellement couverts (ms) ; null sans aucun relevé */
  from: number | null; to: number | null
  /** les relevés détaillés commencent après le début de la période demandée : les chiffres ne la couvrent pas toute */
  partial: boolean
  /** jours demandés (null : « Tout ») */
  asked: number | null
  /** pic de viewers simultanés, toutes chaînes ensemble, et son heure (ms) */
  peak: number | null; peakAt: number | null
  /** chaînes passées en live sur la période (null : aucun relevé de l'API) */
  lived: number | null
  followed: number; filtered: boolean
  /** chaînes en live en ce moment (null : direct inconnu) */
  liveNow: number | null
  /** temps où le collecteur n'a rien écouté sur la période (0 sous 15 min) */
  gapMs: number
}
/** Journée en cours pour « Jour par jour » : toutes les chaînes, sans période ni filtre Langue. */
export interface TodayData { d: string; at: number; peak: number | null; peakAt: number | null; actives: number | null; msgs: number | null; chans: number | null }
export interface LiveGame {
  g: string
  /** les 4 chaînes les plus regardées sur ce jeu ; n : toutes */
  chans: Who[]; n: number
  viewers: number
  /** viewers actifs distincts ayant écrit sur ces chaînes dans les 10 dernières minutes */
  wrote: number
}
export interface RisingRow extends Who {
  game: string; v: number; v30: number; gain: number; rate: number
  /** messages par minute sur les 5 dernières minutes */
  mpm: number
  /** heure du dernier raid reçu pendant les 30 min comparées */
  raidAt: number | null
}
/** « En ce moment » (liveNowData dans legacy.js) : le direct, jamais la période. */
export interface LiveNowData {
  state: "ok" | "noapi" | "off" | "stale" | "loading"
  mode: "local" | "cloud"
  /** dernier relevé de l'API (ms) ; seen : dernier signal du collecteur */
  at: number | null; seen: number | null
  followed: number; live: number
  games: LiveGame[]
  rising: RisingRow[]
  /** chaînes qui remplissent les critères du classement ; young : en live depuis moins de 30 min */
  eligible: number; young: number
  /** des relevés remontent à 30 min */
  history: boolean
}

export interface OverviewData {
  activity: ActivityData
  today: TodayData
  now: LiveNowData
  kpis: Kpi[]
  channels: ChannelInfo[]
  recoup: RecoupData
  hasApi: boolean
  /** graphiques : chaînes tracées (les plus actives) sur le total suivi */
  chartOf: { shown: number; total: number }
  part: PartRow[] | null
  followers: FollowerRow[]
  brand: BrandRow[] | null
  /** « avec ou sans pub » calculé sur tout le détail, faute de comparaison possible aujourd'hui */
  brandWide?: boolean
  raids: RaidTickerData
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
  /** Personnes passées de la chaîne vers la cible */
  organicAB: number
}
export interface ChannelHead extends Who { langs: string[]; live: boolean | null; game: string; title: string; viewers: number | null; since: string }
/** Un live (relevés consécutifs d'une chaîne), calculé par l'ancien code ou lu dans la base (channel_lives). Heures déjà mises en forme (Paris). */
export interface LiveRun {
  /** premier et dernier relevé en live (ms) */
  s: number; e: number
  /** jour du début ; début et fin avec « hier » ou la date si ce n'est pas aujourd'hui ; heures seules pour la liste */
  day: string; start: string; end: string; startH: string; endH: string
  startKnown: boolean; endKnown: boolean; ongoing: boolean
  /** durée entre les deux relevés, « » pour un seul relevé */
  dur: string
  peak: number | null; peakAt: string; avg: number | null
  /** minimum après les 10 premières minutes ; null si le live est trop court */
  min: number | null
  /** hours : null pour les lives lus dans la base */
  games: { g: string; hours: number | null }[]
}
export interface LiveToday {
  /** les lives qui touchent aujourd'hui, du plus récent au plus ancien */
  today: LiveRun[]
  /** tous lives du jour confondus, s'il y en a plusieurs */
  total: { peak: number; avg: number } | null
  /** aucun live aujourd'hui : le dernier encore dans les relevés gardés */
  last: LiveRun | null
  /** aucun relevé ni période d'écoute aujourd'hui, toutes chaînes confondues */
  noData: boolean
  /** base Supabase : l'historique des lives peut être demandé */
  cloud: boolean
  /** live en cours : début annoncé par Twitch */
  twitchStart: string
}
export interface ChannelData {
  ch: ChannelHead
  list: (Who & { live: boolean })[]
  main: Kpi[]
  more: Kpi[]
  hasApi: boolean
  live: LiveToday | null // null : pas d'API Twitch
  /** période « Aujourd'hui » : les viewers max et les jeux sont dans le bloc du live, pas répétés plus bas */
  gamesInLive: boolean
  /** types de messages (sorted : messages triés) et ambiance (analysed : messages analysés) de la chaîne */
  talk: {
    sorted: number; parts: { key: string; label: string; desc: string; color: string; share: number }[] | null
    analysed: number; moods: { key: string; label: string; share: number | null }[]
  }
  switches: SwitchRow[] | null // null : pas d'API Twitch
  also: (Who & { share: number; n: number })[]
  alsoBase: number // viewers actifs de la chaîne : la base des pourcentages de « also »
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
  moodChart: LineSpec
  kindChart: LineSpec | null
}

/** Onglet « Clip » : moments à clipper et clips, d'une chaîne ou de toutes. */
export interface ClipTabData {
  all: boolean
  ch: ChannelHead | null
  list: (Who & { live: boolean })[]
  moments: MomentRow[]
  clips: ClipsData | null
}

/** Matrice de chevauchement : cells[i] = part des viewers actifs de la ligne vus aussi chez la colonne i (null sur la diagonale). */
export interface MatrixData { rows: { k: string; size: number; who: Who | null; cells: ({ r: number | null; n: number } | null)[] }[] }
export interface GameData {
  hasApi: boolean
  games: { g: string; chans: Who[]; air: string; avgV: number | null; users: number; msgs: number; perUser: number | null }[]
  switchGames: { g: string; n: number; dv: number | null; dm: number | null }[]
  matrix: MatrixData | null
}

/** Onglet Audiences, partie « En commun » (renderOverlap dans legacy.js). Le filtre de viewers ne touche pas `spread`. */
export interface OverlapData {
  filter: string
  filters: { key: string; label: string; tip: string; count: number }[]
  filterNote: { count: number; desc: string; share: number; total: number } | null
  /** viewers actifs (total) répartis selon le nombre de chaînes où ils écrivent : one, two, more (3 ou plus). single : un seul
   *  message ; talk3 : au moins 3 messages, dont talk3one sur une seule chaîne. chans : chaînes suivies (filtered : filtre Langue). */
  spread: { total: number; one: number; two: number; more: number; single: number; talk3: number; talk3one: number; chans: number; filtered: boolean }
  /** les chaînes qui ont le plus de viewers actifs (7 au plus) */
  matrix: MatrixData
  /** nombre de chaînes qui ont des viewers actifs (la matrice n'en montre qu'une partie) */
  chans: number
  /** les paires les plus proches, rangées sur le pourcentage affiché (share) */
  pairs: { a: Who; b: Who; n: number; share: number; j: number }[]
}

export interface FlowRoute {
  a: Who; b: Who; n: number; gap: string
  /** un raid a eu lieu sur ce trajet pendant la période (on ne sait pas quels passages en viennent) */
  raid?: boolean
}

/** Onglet Audiences, partie « Qui va où » (renderFlows dans legacy.js) ; sert aussi au rapport général et au CSV. */
export interface FlowsData {
  total: number; routes: number; medianGap: string; raidCount: number; raidViewers: number
  flows: FlowRoute[]
  /** viewers actifs de la période ; ceux qui ont changé de stream au moins une fois (move) et oftenAt fois ou plus (often) */
  actives: number; move: number; often: number; oftenAt: number
  swStart: string // date (jj/mm/aaaa) depuis laquelle les changements sont comptés exactement, ou ''
  /** chaîne par chaîne, par solde décroissant. m : part de ses viewers actifs qui ont changé de stream (null sous 20 actifs) */
  rows: (Who & { n: number; m: number | null; in: number; out: number; net: number })[]
  /** parcours les plus nomades (anonymes : début de l'empreinte) */
  top: { id: string; moves: number; chans: number; path: (Who & { when: string })[]; more: number; span: string }[]
  /** journée en cours pour la carte des migrations (jamais dans byDay) : les 12 plus gros trajets */
  today: { d: string; routes: { a: Who; b: Who; n: number; gap: string; raid: boolean }[] }
  raids: { when: string; from: (Who & { name: string }) | null; to: Who; n: number }[]
  /** Passages des journées passées, par jour et par paire (SQL flows_by_day). Absent si pas de base, base pas à jour ou erreur. Les viewers sont distincts
   *  par jour et par paire : ils ne s'additionnent pas d'un jour à l'autre. `raid` est une borne haute ; organic + raid = passages. */
  byDay?: { d: string; a: Who; b: Who; viewers: number; passages: number; organic: number; raid: number }[]
}

export interface SettingsData {
  mode: "local" | "cloud"; modeNote: string
  sbUrl: string; sbKey: string; sbCode: string; sbMsg: string
  chans: Who[]; chanLimit: number | null; chansMsg: string
  addSearch: { msg: string; items: { login: string; name: string; img: string; live: boolean; viewers: number | null; lang: string; game: string; unchecked: boolean; followed: boolean }[] } | null
  apiReady: boolean; pendingLocal: string[]
  clientId: string; token: string; apiMsg: string
  dbNote: string; dbMsg: string
}

/** Chaînes non suivies qui ont raidé des chaînes suivies (raidSuggestions dans legacy.js). since : plus ancien raid lu (ms). */
export interface RaidSuggestions {
  since: number
  items: { c: string; raids: number; viewers: number; to: string[]; last: number }[]
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
  pins?: number; grp?: number | null
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
  live: { on: boolean; count: number; total: number } // on : en direct seulement (défaut) ; count : en direct ; total : hors ligne comprises
  since: string // début des données qui portent les liens et les groupes (« 25 novembre ») ; vide sans données
  wake: boolean // carte vide parce que trop peu de chaînes sont en direct : proposer les hors ligne
  langs: { key: string; label: string; count: number; on: boolean }[] | null
  games: { key: string; label: string; count: number; on: boolean }[] | null // jeu en cours des chaînes en direct ; null : moins de 2 jeux
  mins: { key: string; label: string; count: number; on: boolean }[] | null // audience minimale (viewers en direct) ; null : aucun seuil utile
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

/**
 * Fidélité du chat d'une chaîne (« Sticky-Factor »), lue dans les rollups quotidiens : par jour, les viewers actifs et ceux qui ont
 * écrit chez une autre chaîne suivie juste après (partis). Le score sur 100 se calcule côté React : 100 × (1 − partis / actifs).
 */
export interface StickyDay { d: string; actives: number; leavers: number }
/** Quartiles du score parmi les chaînes suivies assez actives sur la période (n : leur nombre) ; null tant qu'aucune chaîne ne compte. */
export interface StickyNet { n: number; q1: number | null; med: number | null; q3: number | null }
/** old : journées de la période dont les partants sont encore la somme des trajets (absent : base pas à jour). */
export interface ChannelSticky { days: StickyDay[]; actives: number; leavers: number; net: StickyNet; old?: number }

/** Rythme d'une chaîne : viewers actifs par jour, moyenne des 7 derniers jours agrégés (recent) et des jours d'avant (base, écart type sd). */
export interface RhythmRow extends Who { nr: number; nb: number; recent: number; base: number; sd: number }

/** Viewers uniques sur plusieurs jours, estimés par HyperLogLog (± 2,3 %) : réunion des chaînes (net) et chaque chaîne. */
export interface PeriodReach { from: string | null; to: string | null; days: number; net: number; chans: { c: string; n: number }[] }

/** Historique du réseau entier lu dans les rollups quotidiens (Vue d'ensemble). */
/** actives, peak, peakAt : absents (undefined) tant que schema.sql n'a pas été rejoué ; null : pas de calcul pour cette journée. */
export interface NetworkDay { d: string; msgs: number; avg: number; chans: number; actives?: number | null; peak?: number | null; peakAt?: number | null }
export interface NetworkTop extends Who { msgs: number; avg: number }
export interface NetworkHistory { days: NetworkDay[]; top: NetworkTop[] }

declare global {
  interface Window {
    /** null : pas de base Supabase (mode local) ou base pas à jour */
    networkHistory?: (days: number) => Promise<NetworkHistory | null>
    periodReach?: (chans: string[], days: number) => Promise<PeriodReach | null>
    channelHistory?: (c: string, days: number) => Promise<ChannelHistory | null>
    /** null : fonction SQL absente (base pas à jour) ; liste vide en mode local */
    channelLives?: (c: string, days: number) => Promise<LiveRun[] | null>
    channelSticky?: (c: string, days: number) => Promise<ChannelSticky | null>
    channelsRhythm?: (days: number) => Promise<RhythmRow[] | null>
    raidSuggestions?: () => Promise<RaidSuggestions | null>
    showTab?: (t: TabId) => void
    openAddStreamer?: () => void
    setOverlapFilter?: (f: string) => void
    // Réglages (actions de l'ancien code)
    settingsMode?: (m: "local" | "cloud") => Promise<void>
    saveSupabase?: (url: string, key: string, code: string) => Promise<void>
    /** change seulement le code du tableau de bord (en-tête x-board-code) et relance la synchro */
    saveBoardCode?: (code: string) => Promise<void>
    runAddSearch?: (q: string) => Promise<void>
    addFromSearch?: (login: string, img: string) => void
    importLocal?: () => void
    dropLocal?: () => void
    removeChan?: (c: string) => void
    saveChanList?: (text: string) => void
    /** ajoute plusieurs chaînes (pseudos ou adresses séparés par des espaces, virgules ou retours à la ligne) ; over : au-delà de la limite */
    addChanList?: (text: string) => { added: number; already: number; invalid: string[]; over: string[] }
    saveApi?: (clientId: string, token: string) => void
    genToken?: (clientId: string, secret: string) => Promise<boolean>
    exportDb?: () => void
    importDbFile?: (f: File) => Promise<void>
    resetDb?: () => Promise<void>
    forceFullResync?: () => Promise<boolean>
    // Carte
    mapAction?: (a: "side" | "lang" | "game" | "view" | "live" | "pick" | "pins" | "relayout" | "min" | "reset", v?: string | string[], on?: boolean) => void
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
export interface PeriodInfo { key: string; label: string; range: string; show: boolean }
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
export const useClipData = legacyStore<ClipTabData>("legacy:clip")
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

// Lien vers une partie d'une page (data-goto="audiences" data-part="raids") : la demande est gardée ici, car elle arrive
// avant que la page soit affichée.
let wantedPart = ""
const partSubs = new Set<() => void>()
window.addEventListener("legacy:goto-part", (e) => { wantedPart = (e as CustomEvent<string>).detail; partSubs.forEach((f) => f()) })
export function onGotoPart(cb: (part: string) => void) {
  const run = () => { if (wantedPart) { const p = wantedPart; wantedPart = ""; cb(p) } }
  partSubs.add(run)
  run()
  return () => void partSubs.delete(run)
}
