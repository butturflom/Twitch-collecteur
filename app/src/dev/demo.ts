// Mode démo, en développement seulement : http://localhost:5173/?demo
// Remplace les données de la vue d'ensemble par un jeu fictif, pour travailler le design sans vraie base.
// N'est jamais inclus dans le build (main.tsx ne l'importe que si import.meta.env.DEV).
import type { PeriodInfo, ClipTabData, LiveRun, LiveToday, ChannelHistory, ChannelSticky, NetworkHistory, PeriodReach, LineSpec, RostersData, ChannelData, ChatData, FlowsData, GameData, OverlapData, OverviewData, StatusData, TopStreamerRow, InvestedCommunityRow } from "@/legacy/bridge"

declare global { interface Window { renderOverview?: (q: unknown) => void; renderChannel?: (q: unknown) => void; renderChat?: (q: unknown) => void; renderClip?: (q: unknown) => void; renderGame?: (q: unknown) => void; renderOverlap?: (q: unknown) => void; renderFlows?: (q: unknown) => void; renderRosters?: (q: unknown) => void; channelHistory?: (c: string, days: number) => Promise<ChannelHistory | null>; periodReach?: (chans: string[], days: number) => Promise<PeriodReach | null>; networkHistory?: (days: number) => Promise<NetworkHistory | null>; statusOf?: () => StatusData; periodInfo?: () => PeriodInfo } }

const CH: [string, string][] = [["etoiles", "#4d8dff"], ["xari", "#ff7a45"], ["gotaga", "#2fbf71"], ["kamet0", "#f5b83d"]]
const MIN = 60000

const spec = (series: LineSpec["series"], o: Partial<LineSpec> = {}): LineSpec => ({ series, unit: "", pct: false, yFloor: 0, gaps: [], height: 190, ...o })

function series(seed: number, base: number, now: number): [number, number | null][] {
  const pts: [number, number | null][] = []
  for (let i = 240; i >= 0; i--) {
    const t = now - i * MIN
    const v = base * (1 + 0.35 * Math.sin(i / 17 + seed) + 0.15 * Math.sin(i / 5 + seed * 3)) + (i % 37 === 0 ? base * 1.6 : 0)
    pts.push([t, i > 150 && i < 165 && seed === 2 ? null : Math.max(0, Math.round(v))])
  }
  return pts
}

// bandeau des raids ; ?demo&raidsbande=2 : deux raids (pas de défilement), =0 : aucun (pas de bandeau), =anciens : aucun aujourd'hui
function tickerDemo(): OverviewData["raids"] {
  const m = new URLSearchParams(location.search).get("raidsbande")
  const who = (c: string, color: string) => ({ c, color, img: "" })
  const from = (name: string) => ({ ...who(name.toLowerCase(), "#9b8cff"), name })
  const rows = [
    { t: 1, from: from("ZeratoR"), to: who("etoiles", "#4d8dff"), n: 4120, ago: "12 min" },
    { t: 2, from: from("Mynthos"), to: who("xari", "#ff7a45"), n: 980, ago: "48 min" },
    { t: 3, from: from("JBzz"), to: who("gotaga", "#2fbf71"), n: 312, ago: "2 h 05" },
    { t: 4, from: null, to: who("kamet0", "#f5b83d"), n: 87, ago: "3 h 40" },
    { t: 5, from: from("Maghla"), to: who("etoiles", "#4d8dff"), n: 640, ago: "5 h 12" },
  ]
  return { older: m === "anciens", rows: m === "anciens" ? rows : rows.slice(0, m == null ? 5 : Number(m)) }
}

// Direct fictif : [chaîne, couleur, jeu, viewers, viewers il y a 30 min (null : en live depuis moins de 30 min), msg/min, actifs sur 10 min]
const LIVE: [string, string, string, number, number | null, number, number][] = [
  ["etoiles", "#4d8dff", "Teamfight Tactics", 14520, 13100, 412, 1240], ["mirabelle_tv", "#ff7aa8", "League of Legends", 6900, 5600, 188, 610],
  ["xari", "#ff7a45", "Just Chatting", 6230, 4800, 288, 900], ["zorvan", "#3fb6a8", "VALORANT", 4100, 4350, 96, 410],
  ["lunaestra", "#e9b44c", "Just Chatting", 3800, 2300, 141, 520], ["orionlive", "#4f8df5", "Balatro", 2600, 2550, 54, 190],
  ["velvetfox", "#b26cf0", "Minecraft", 1900, 2200, 47, 110], ["sablier", "#c07a52", "League of Legends", 1700, null, 61, 170],
  ["nopalgames", "#5fbf5a", "Balatro", 1300, 980, 33, 90], ["tidou", "#53c3e0", "Just Chatting", 900, 610, 29, 80],
  ["aurore_gg", "#f08a5d", "Elden Ring", 450, 460, 12, 40],
]
const FOLLOWED = LIVE.length + 3

// « En ce moment ». &direct=vide : aucune chaîne en live ; =calme : personne ne monte ; =debut : moins de 30 min de relevés ;
// =vieux : relevé trop vieux ; =arret : collecteur hors ligne ; =local : écoute à l'arrêt ; =noapi ; =chargement
function liveDemo(): OverviewData["now"] {
  const m = new URLSearchParams(location.search).get("direct")
  const now = Date.now()
  const who = (c: string, color: string) => ({ c, color, img: "" })
  const base: OverviewData["now"] = { state: "ok", mode: "cloud", at: now - 40000, seen: now - 20000, followed: FOLLOWED, live: 0, games: [], rising: [], eligible: 0, young: 0, history: true }
  if (m === "vide") return base
  if (m === "vieux") return { ...base, state: "stale", at: now - 47 * MIN }
  if (m === "arret") return { ...base, state: "off", at: now - 3 * 3600e3, seen: now - 3 * 3600e3 }
  if (m === "local") return { ...base, state: "off", mode: "local", at: null, seen: null }
  if (m === "noapi") return { ...base, state: "noapi", at: null }
  if (m === "chargement") return { ...base, state: "loading", at: null }
  const games = [...new Set(LIVE.map((x) => x[2]))].map((g) => {
    const l = LIVE.filter((x) => x[2] === g).sort((a, b) => b[3] - a[3])
    return { g, chans: l.slice(0, 4).map((x) => who(x[0], x[1])), n: l.length, viewers: l.reduce((s, x) => s + x[3], 0), wrote: l.reduce((s, x) => s + x[6], 0) }
  }).sort((a, b) => b.viewers - a.viewers)
  const old = LIVE.filter((x) => x[4] != null)
  const rising = old.filter((x) => x[3] > x[4]!).map(([c, color, game, v, v30, mpm]) => ({ ...who(c, color), game, v, v30: v30!, gain: v - v30!, rate: v / v30! - 1, mpm, raidAt: c === "mirabelle_tv" ? now - 18 * MIN : null })).sort((a, b) => b.rate - a.rate)
  const d = { ...base, live: LIVE.length, games, rising, eligible: old.length, young: LIVE.length - old.length }
  if (m === "calme") return { ...d, rising: [] }
  if (m === "debut") return { ...d, rising: [], eligible: 0, history: false }
  return d
}

// Activité de la période choisie et journée en cours. &activite=partiel : relevés détaillés plus courts que la période (voir avec
// « 7 jours ») ; =sansapi : pas de viewers ; =vide : aucun relevé
function activityDemo(): Pick<OverviewData, "activity" | "today"> {
  const m = new URLSearchParams(location.search).get("activite")
  const key = document.querySelector<HTMLButtonElement>("#period button.on")?.dataset.p ?? "today"
  const now = Date.now(), midnight = new Date().setHours(0, 0, 0, 0)
  const asked = key === "today" ? 1 : key === "7d" ? 7 : key === "30d" ? 30 : null
  const from = m === "partiel" ? (key === "today" ? midnight + 14 * 3600e3 : midnight - 86400000) : midnight - ((asked ?? 5) - 1) * 86400000
  const direct = new URLSearchParams(location.search).get("direct")
  const activity: OverviewData["activity"] = {
    from, to: now, partial: m === "partiel" && key !== "all", asked, peak: key === "today" ? 48300 : 66400, peakAt: Math.max(midnight, now - 26 * MIN),
    lived: 13, followed: FOLLOWED, filtered: false, liveNow: direct === "arret" || direct === "vieux" ? null : direct === "vide" ? 0 : LIVE.length, gapMs: m === "partiel" ? 95 * MIN : 0,
  }
  const today: OverviewData["today"] = { d: dayStr(0), at: now, peak: 48300, peakAt: Math.max(midnight, now - 26 * MIN), actives: 18432, msgs: 246118, chans: 13 }
  if (m === "sansapi") return { activity: { ...activity, peak: null, peakAt: null, lived: null, liveNow: null }, today: { ...today, peak: null, peakAt: null } }
  if (m === "vide") return { activity: { ...activity, from: null, to: null, peak: null, peakAt: null, lived: null, liveNow: null }, today: { ...today, peak: null, peakAt: null, actives: null, msgs: null, chans: null } }
  return { activity, today }
}

function demo(): OverviewData {
  const now = Date.now()
  const who = (c: string, color: string) => ({ c, color, img: "" })
  const chart = (k: number) =>
    spec(CH.map(([c, color], i) => ({ name: c, c, color, pts: series(i, k * (4 - i), now) })), {
      unit: k > 50 ? " viewers" : " msg/min",
      gaps: k > 50 ? [] : [[now - 100 * MIN, now - 82 * MIN]], // une période sans écoute, pour la voir
    })
  return {
    ...activityDemo(),
    now: liveDemo(),
    kpis: [
      { label: "Viewers actifs uniques", value: "18 432", hint: "ont écrit au moins un message" },
      { label: "Actifs dans 2 chats ou plus", value: "3 271", hint: "17,7 % du total" },
      { label: "Messages", value: "246 118", hint: "au total", trendLabel: "courbe par heure", trend: [12, 18, 15, 22, 30, 41, 38, 52, 47, 61, 58, 72] },
      { label: "Abonnements et subs offerts", value: "1 284", hint: "annoncés dans le chat" },
    ],
    // ?demo&recoup=vide : bloc Recoupements sans données (état vide)
    recoup: new URLSearchParams(location.search).get("recoup") === "vide"
      ? { channels: 4, period: "today", pairMax: 25, pairMin: 10, pairs: [], flows: [], raid: null }
      : {
          channels: 4,
          period: "today",
          pairMax: 25,
          pairMin: 10,
          pairs: [
            { a: who("xari", "#ff7a45"), b: who("etoiles", "#4d8dff"), n: 1304, share: 0.21, j: 0.14 },
            { a: who("gotaga", "#2fbf71"), b: who("etoiles", "#4d8dff"), n: 745, share: 0.13, j: 0.07 },
            { a: who("kamet0", "#f5b83d"), b: who("xari", "#ff7a45"), n: 290, share: 0.11, j: 0.06 },
          ],
          flows: [
            { from: who("xari", "#ff7a45"), to: who("etoiles", "#4d8dff"), n: 612, gap: "8 min" },
            { from: who("etoiles", "#4d8dff"), to: who("xari", "#ff7a45"), n: 540, gap: "11 min" },
            { from: who("gotaga", "#2fbf71"), to: who("kamet0", "#f5b83d"), n: 310, gap: "25 min" },
          ],
          raid: { from: { ...who("zeratorr", "#9b8cff"), name: "ZeratoR" }, to: who("etoiles", "#4d8dff"), n: 4120, ago: "2 h 05", when: "mer. 19 nov. 23h58" },
        },
    raids: tickerDemo(),
    channels: [
      { ...who("etoiles", "#4d8dff"), langs: ["fr"], live: true, game: "Teamfight Tactics", title: "TFT avec la commu", viewers: 14520, uniq: 6210, peak: 16204, msgs: 98432, recent: 412.6, wrote: 0.214 },
      { ...who("xari", "#ff7a45"), langs: ["fr"], live: true, game: "Just Chatting", title: "On parle de tout", viewers: 6230, uniq: 4120, peak: 8300, msgs: 71204, recent: 288.2, wrote: 0.383 },
      { ...who("gotaga", "#2fbf71"), langs: ["fr"], live: false, game: "", title: "", viewers: null, uniq: 5870, peak: 12100, msgs: 52310, recent: 0, wrote: null },
      { ...who("kamet0", "#f5b83d"), langs: ["fr", "en"], live: false, game: "", title: "", viewers: null, uniq: 2232, peak: 3100, msgs: 24172, recent: null, wrote: null },
      // les autres chaînes du direct fictif, pour que les cartes et « En ce moment » disent la même chose
      ...LIVE.filter(([c]) => c !== "etoiles" && c !== "xari").map(([c, color, game, viewers, , mpm, w]) => ({ ...who(c, color), langs: ["fr"], live: true, game, title: "", viewers, uniq: w * 3, peak: Math.round(viewers * 1.12), msgs: mpm * 90, recent: mpm, wrote: 0.18 })),
    ].sort((a, b) => Number(b.live) - Number(a.live) || (b.viewers ?? 0) - (a.viewers ?? 0)),
    hasApi: true,
    part: [
      { ...who("xari", "#ff7a45"), limited: "", avgV: 6100, perMin: 0.072, msgK: 47.2, uniq: 0.67, react: 0.41, inter: 0.22 },
      { ...who("etoiles", "#4d8dff"), limited: "mode lent 3 s", avgV: 13900, perMin: 0.031, msgK: 29.6, uniq: 0.45, react: 0.55, inter: 0.12 },
      { ...who("gotaga", "#2fbf71"), limited: "", avgV: 9800, perMin: 0.024, msgK: 22.1, uniq: 0.6, react: 0.48, inter: 0.09 },
    ],
    followers: [
      { ...who("gotaga", "#2fbf71"), fol: 4120000, avgV: 9800, grow: 812 },
      { ...who("etoiles", "#4d8dff"), fol: 1030000, avgV: 13900, grow: 1450 },
      { ...who("xari", "#ff7a45"), fol: 512000, avgV: 6100, grow: null },
    ],
    brand: [{ ...who("etoiles", "#4d8dff"), with: { msgK: 24.1, perMin: 0.026 }, without: { msgK: 31.4, perMin: 0.034 } }],
    mod: {
      noDel: false,
      rows: [
        { ...who("xari", "#ff7a45"), limited: "", ban: 12, to: 148, clr: 1, del: 402, rate: 2.25, drate: 5.65 },
        { ...who("etoiles", "#4d8dff"), limited: "mode lent 3 s", ban: 4, to: 61, clr: 0, del: 133, rate: 0.66, drate: 1.35 },
        { ...who("gotaga", "#2fbf71"), limited: "", ban: 1, to: 9, clr: 0, del: 20, rate: null, drate: null },
      ],
    },
    msgChart: chart(30),
    viewerChart: chart(3000),
    chartOf: { shown: 4, total: 4 },
    // croissance des followers : kamet0 a une petite base (60 followers au départ, +179 000 % sans le seuil) et doit afficher « — »
    topStreamers: [
      { ...who("etoiles", "#4d8dff"), viewers: 13900, peakViewers: 16204, hours: 21.5, growth: 0.4, growthBase: 1030000, activeDays: 3 },
      { ...who("gotaga", "#2fbf71"), viewers: 9800, peakViewers: 12100, hours: 14.2, growth: 0.1, growthBase: 4120000, activeDays: 3 },
      { ...who("xari", "#ff7a45"), viewers: 6100, peakViewers: 8300, hours: 17.8, growth: 1.9, growthBase: 512000, activeDays: 3 },
      { ...who("kamet0", "#f5b83d"), viewers: 2232, peakViewers: 3100, hours: 6.1, growth: 179000, growthBase: 60, activeDays: 2 },
    ] as TopStreamerRow[],
    investedCommunities: [
      { ...who("kamet0", "#f5b83d"), viewers: 2232, perMin: 0.031, msgK: 48.2, subs: 96, subsK: 43, bits: 1200, raidsReceived: 1, raidsViewers: 4120 },
      { ...who("xari", "#ff7a45"), viewers: 6100, perMin: 0.018, msgK: 27.5, subs: 210, subsK: 34.4, bits: 5400, raidsReceived: 2, raidsViewers: 980 },
      { ...who("etoiles", "#4d8dff"), viewers: 13900, perMin: 0.007, msgK: 11.3, subs: 402, subsK: 28.9, bits: 9100, raidsReceived: 0, raidsViewers: 0 },
    ] as InvestedCommunityRow[],
  }
}

// ?demo&beaucoup : 30 chaînes, pour voir la page à grande échelle (cartes et tableaux repliés, note des graphiques)
const MANY = 30
function many(d: OverviewData): OverviewData {
  if (!new URLSearchParams(location.search).has("beaucoup")) return d
  const who = (c: string, color: string) => ({ c, color, img: "" })
  const hue = (i: number) => `hsl(${(i * 47) % 360} 70% 60%)`
  const extra = (i: number) => who(`chaine${String(i).padStart(2, "0")}`, hue(i))
  const pad = <T,>(rows: T[], make: (i: number) => T) => [...rows, ...Array.from({ length: MANY - rows.length }, (_, k) => make(rows.length + k))]
  return {
    ...d,
    channels: pad(d.channels, (i) => ({ ...extra(i), langs: ["fr"], live: false, game: "", title: "", viewers: null, peak: 900 - i * 7, uniq: 3000 - i * 80, msgs: 20000 - i * 500, recent: null, wrote: null })),
    part: pad(d.part ?? [], (i) => ({ ...extra(i), limited: "", avgV: 4000 - i * 100, perMin: 0.03 - i * 0.0008, msgK: 20 - i * 0.5, uniq: 0.5, react: 0.4, inter: 0.1 })),
    followers: pad(d.followers, (i) => ({ ...extra(i), fol: 300000 - i * 8000, avgV: 3000 - i * 80, grow: 120 - i * 3 })),
    chartOf: { shown: 8, total: MANY },
  }
}

// « Live du jour » (Par chaîne). &live=encours|termine|plusieurs|veille|debut|fin|aucun|jamais|sansreleve (par défaut : en cours pour les
// chaînes en live, terminé pour les autres). &lives=non : fonction SQL absente ; =local : mode local, pas d'historique ; =vide : rien d'autre.
const demoHm = (t: number) => new Date(t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h")
const demoDay = (t: number) => new Date(t).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
function demoWhen(t: number) {
  const k = new Date(t).toDateString()
  return k === new Date().toDateString() ? demoHm(t) : k === new Date(Date.now() - 86400000).toDateString() ? `hier ${demoHm(t)}` : `${demoDay(t)} ${demoHm(t)}`
}
function runDemo(s: number, minutes: number, o: { ongoing?: boolean; startKnown?: boolean; endKnown?: boolean; peak?: number; games?: [string, number | null][] } = {}): LiveRun {
  const e = s + minutes * MIN, ongoing = !!o.ongoing, peak = o.peak ?? 16204
  const startKnown = o.startKnown ?? true, endKnown = ongoing ? false : o.endKnown ?? true
  return {
    s, e, day: demoDay(s), start: demoWhen(s), end: demoWhen(e), startH: demoHm(s),
    endH: demoHm(e) + (new Date(e).toDateString() !== new Date(s).toDateString() ? " (le lendemain)" : ""),
    startKnown, endKnown, ongoing,
    dur: minutes < 1 ? "" : minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`,
    peak, peakAt: demoWhen(s + Math.round(minutes * 0.7) * MIN), avg: Math.round(peak * 0.84), min: minutes > 10 ? Math.round(peak * 0.61) : null,
    games: (o.games ?? [["Teamfight Tactics", Math.round(minutes * 0.75) / 60], ["Just Chatting", Math.round(minutes * 0.25) / 60]]).map(([g, hours]) => ({ g, hours })),
  }
}
const liveParam = () => new URLSearchParams(location.search).get("live")
function liveDayDemo(mode: string): LiveToday {
  const now = Date.now(), ago = (m: number) => now - m * MIN, midnight = new Date().setHours(0, 0, 0, 0)
  const older = () => runDemo(midnight - 26 * 3600e3, 232, { peak: 13480 })
  const base: LiveToday = { today: [], total: null, last: null, noData: false, cloud: new URLSearchParams(location.search).get("lives") !== "local", twitchStart: "" }
  const one = (r: LiveRun) => ({ ...base, today: [r], twitchStart: r.ongoing ? demoWhen(r.s - (r.startKnown ? MIN : 95 * MIN)) : "" })
  if (mode === "encours") return one(runDemo(ago(164), 162, { ongoing: true }))
  if (mode === "termine") return one(runDemo(ago(330), 262))
  if (mode === "veille") { const s = midnight - 110 * MIN; return one(runDemo(s, Math.min(212, Math.round((now - s) / MIN) - 1))) } // commencé hier, fini cette nuit
  if (mode === "debut") return one(runDemo(ago(96), 94, { ongoing: true, startKnown: false }))
  if (mode === "fin") return one(runDemo(ago(400), 188, { endKnown: false }))
  if (mode === "plusieurs") {
    const today = [runDemo(ago(74), 72, { ongoing: true }), runDemo(ago(190), 6, { peak: 4210, games: [["Just Chatting", 0.1]] }), runDemo(ago(520), 228, { peak: 12950, games: [["VALORANT", 2.9], ["Just Chatting", 0.9]] })]
    return { ...base, today, total: { peak: 16204, avg: 11980 }, twitchStart: demoWhen(today[0].s - MIN) }
  }
  if (mode === "jamais") return base
  return { ...base, last: older(), noData: mode === "sansreleve" }
}
function livesDemo(c: string): LiveRun[] | null {
  const m = new URLSearchParams(location.search).get("lives")
  if (m === "non") return null
  const i = CH.findIndex(([x]) => x === c)
  const mode = liveParam() ?? (i < 2 ? "encours" : "termine")
  if (mode === "jamais") return []
  const d = liveDayDemo(mode), midnight = new Date().setHours(0, 0, 0, 0)
  // la base connaît aussi les lives déjà affichés au-dessus (ici décalés d'une minute) : ils ne doivent pas être répétés
  const same = [...d.today, ...(d.last ? [d.last] : [])].map((r) => ({ ...r, s: r.s + MIN, games: r.games.map((g) => ({ g: g.g, hours: null })) }))
  if (m === "vide") return same
  const past = Array.from({ length: 14 }, (_, k) => runDemo(midnight - (k * 2 + 3) * 86400000 + (18 * 60 + ((k * 17) % 50)) * MIN, 150 + ((k * 43) % 170), {
    peak: 9800 + ((k * 1373) % 6200), startKnown: k !== 2, endKnown: k !== 4,
    games: k % 3 ? [["Teamfight Tactics", null]] : [["Just Chatting", null], ["League of Legends", null]],
  }))
  return [...same, ...past]
}

function channelDemo(c: string): ChannelData {
  const [, color] = CH.find(([x]) => x === c) ?? CH[0]
  const i = CH.findIndex(([x]) => x === c)
  const now = Date.now()
  const day = liveDayDemo(liveParam() ?? (i < 2 ? "encours" : "termine"))
  const live = !!day.today[0]?.ongoing
  const inLive = window.periodInfo?.().key === "today"
  const who = (x: string, col: string) => ({ c: x, color: col, img: "" })
  const hours = Array.from({ length: 24 }, (_, h) => ({ k: h + "h", lbl: `${h}h – ${h + 1}h`, v: Math.round(400 + 2600 * Math.max(0, Math.sin((h - 12) / 4))) }))
  // « Recommandations de raid » : &reco=peu (en direct, pas assez de données), =vide (aucune cible), =sansapi (bloc seul, sans API)
  const reco = new URLSearchParams(location.search).get("reco")
  return {
    ch: { ...who(c, color), langs: ["fr"], live, game: live ? "Teamfight Tactics" : "", title: live ? "TFT avec la commu, on vise le top 1" : "", viewers: live ? 14520 : null, since: live ? "18h02" : "" },
    list: CH.map(([x, col], k) => ({ ...who(x, col), live: k < 2 })),
    live: day, gamesInLive: inLive,
    main: [
      { label: "Viewers actifs uniques", value: "6 210" },
      { label: "Messages", value: "98 432", hint: "61,3 msg/min en moyenne", trendLabel: "courbe par heure", trend: [8, 12, 9, 14, 22, 31, 27, 35, 41, 38, 46, 52] },
      ...(inLive ? [] : [{ label: "Viewers max", value: "16 204", hint: "moyenne : 13 900" }]),
      { label: "Écrivent chaque minute", value: "3,1 %", hint: "29,6 msg/min pour 1\u00a0000 viewers" },
      { label: "Followers", value: "1 030 000", hint: "1,3 % en moyenne devant le live" },
    ],
    more: [
      { label: "Interactions", value: "12 %", hint: "55 % de réactions · détail plus bas" },
      { label: "Viewers actifs fidèles", value: "38 %", hint: "revenus sur 2 jours ou plus" },
      { label: "Messages du top 10 %", value: "47 %", hint: "concentration du chat" },
      { label: "Premiers messages", value: "812", hint: "nouveaux venus dans le chat" },
      { label: "Abonnements", value: "642", hint: "dont 230 offerts" },
      { label: "Bits", value: "48 200" },
      { label: "Raids reçus", value: "3", hint: "4 120 viewers apportés" },
      { label: "Bans et timeouts", value: "65", hint: "4 bans · 61 timeouts" },
      { label: "Messages supprimés", value: "133", hint: "par un modérateur ou un bot" },
      { label: "Pub déclarée", value: "Non", hint: "mode lent 3 s" },
    ],
    hasApi: reco !== "sansapi",
    talk: talkDemo,
    switches: [
      { when: "mer. 19 nov. 20h15", from: "Teamfight Tactics", to: "Just Chatting", vB: 14800, vA: 12100, mB: 58.2, mA: 71.4 },
      { when: "mer. 19 nov. 18h02", from: "Just Chatting", to: "Teamfight Tactics", vB: 9200, vA: null, mB: 44.1, mA: null },
    ],
    // &also=petit : petite chaîne (6 viewers actifs), un viewer sur 6 = 17 % : le pourcentage ne doit pas s'afficher
    ...(new URLSearchParams(location.search).get("also") === "petit"
      ? { alsoBase: 6, also: CH.filter(([x]) => x !== c).map(([x, col], k) => ({ ...who(x, col), share: [2 / 6, 1 / 6, 1 / 6][k], n: [2, 1, 1][k] })) }
      : { alsoBase: 6210, also: CH.filter(([x]) => x !== c).map(([x, col], k) => ({ ...who(x, col), share: [0.21, 0.12, 0.05][k], n: [1304, 745, 310][k] })) }),
    games: [{ g: "Teamfight Tactics", hours: 21.5 }, { g: "Just Chatting", hours: 8.2 }, { g: "League of Legends", hours: 3.1 }],
    raids: reco === "vide" ? [] : live && reco !== "peu" && reco !== "sansapi" ? [
      { to: who(CH[1][0], CH[1][1]), name: CH[1][0], live: true, score: 87, viewers: 1304, share: 21, organicAB: 612 },
      { to: who(CH[2][0], CH[2][1]), name: CH[2][0], live: false, score: 64, viewers: 745, share: 12, organicAB: 288 },
      { to: who(CH[3][0], CH[3][1]), name: CH[3][0], live: false, score: 42, viewers: 310, share: 5, organicAB: 92 },
    ] : null,
    msgChart: spec([{ name: c, c, color, pts: series(i, 60, now) }], { unit: " msg/min" }),
    viewerChart: spec([{ name: c, c, color, pts: series(i, 6000, now) }], { unit: " viewers" }),
    hourChart: { items: hours, color, unit: " messages" },
  }
}

function MOMENTS(c: string): ClipTabData["moments"] {
  const color = (CH.find(([x]) => x === c) ?? CH[0])[1], now = Date.now()
  const who = (x: string, col: string) => ({ c: x, color: col, img: "" })
  return [
      { ...who(c, color), t: now - 3 * 3600e3, when: "mer. 19 nov. 18h47", game: "Teamfight Tactics", m: 1820, score: 6.4, wave: 0.42, mood: "Hype", emote: "PogChamp", vod: "https://www.twitch.tv/" },
      { ...who(c, color), t: now - 2 * 3600e3, when: "mer. 19 nov. 19h52", game: "Teamfight Tactics", m: 1204, score: 4.1, wave: 0.18, mood: "Rire", emote: "KEKW", vod: "" },
      { ...who(c, color), t: now - 3600e3, when: "mer. 19 nov. 20h31", game: "Just Chatting", m: 960, score: 2.9, wave: 0.07, mood: "", emote: "", vod: "https://www.twitch.tv/" },
    ]
}
function CLIPS(c: string): ClipTabData["clips"] {
  const color = (CH.find(([x]) => x === c) ?? CH[0])[1]
  const who = (x: string, col: string) => ({ c: x, color: col, img: "" })
  return {
      total: 41, exact: 33, comparable: 28, hitRate: 0.46, medianScore: 2.3,
      rows: [
        { ...who(c, color), id: "demo1", when: "mer. 19 nov. 18h47", exact: true, title: "LE TOP 1 LE PLUS IMPROBABLE DE L'HISTOIRE", views: 48210, m: 1820, score: 6.4, wave: 0.42 },
        { ...who(c, color), id: "demo2", when: "mar. 18 nov. 22h10", exact: false, title: "Il rage quit en direct", views: 21044, m: 640, score: 2.1, wave: 0.12 },
        { ...who(c, color), id: "demo3", when: "lun. 17 nov. 20h03", exact: true, title: "Le chat a deviné avant lui", views: 9812, m: 410, score: 1.2, wave: null },
      ],
    }
}
const talkDemo: ChannelData["talk"] = {
  sorted: 58710, analysed: 61204,
  parts: ([["re", "Réactions", "emote seule, « mdr », « GG »…", "#d95926", 0.38], ["va", "Vagues", "même message repris en chœur", "#e66767", 0.11], ["ad", "Vers le streamer", "questions, tutoiement, @", "#3987e5", 0.12], ["co", "Entre viewers", "réponses entre viewers", "#9085e9", 0.06], ["cm", "Commentaires", "4 mots ou plus", "#199e70", 0.17], ["ct", "Courts", "sans signal clair", "#6b6b75", 0.16]] as [string, string, string, string, number][])
    .map(([key, label, desc, color, share]) => ({ key, label, desc, color, share })),
  moods: [{ key: "rire", label: "Rire", share: 0.142 }, { key: "hype", label: "Hype", share: 0.087 }, { key: "negatif", label: "Négatif", share: 0.031 }, { key: "question", label: "Questions", share: 0.064 }],
}

// moments et clips d'une chaîne, ou de toutes (&demo=clip)
function clipDemo(sel: string): ClipTabData {
  const all = sel === "*"
  const d = channelDemo(all ? CH[0][0] : sel)
  const who = (x: string, col: string) => ({ c: x, color: col, img: "" })
  return { all, ch: all ? null : d.ch, list: CH.map(([x, col], k) => ({ ...who(x, col), live: k < 2 })), moments: MOMENTS(all ? CH[1][0] : sel), clips: CLIPS(all ? CH[1][0] : sel) }
}

const MOODS: [string, string][] = [["Rire", "#4d8dff"], ["Hype", "#ff7a45"], ["Négatif", "#2fbf71"], ["Questions", "#f5b83d"]]
const KIND_LINES: [string, string][] = [["Réactions", "#d95926"], ["Interactions", "#3987e5"], ["Commentaires", "#199e70"]]

function chatDemo(sel: string): ChatData {
  const all = sel === "*"
  const now = Date.now()
  const who = (x: string, col: string) => ({ c: x, color: col, img: "" })
  const head = channelDemo(all ? CH[0][0] : sel).ch
  const KINDS: [string, string, string, string, number][] = [
    ["re", "Réactions", "emote seule, « mdr », « GG »…", "#d95926", 0.38], ["va", "Vagues", "même message repris par 3 personnes ou plus en 15 s", "#e66767", 0.11],
    ["ad", "Vers le streamer", "questions, tutoiement, @ ou réponse au streamer", "#3987e5", 0.12], ["co", "Entre viewers", "réponses et @ entre viewers", "#9085e9", 0.06],
    ["cm", "Commentaires", "4 mots ou plus", "#199e70", 0.17], ["ct", "Courts", "« oui », « jsp », sans signal clair", "#6b6b75", 0.13], ["cmd", "Commandes", "!xxx", "#45454d", 0.03],
  ]
  const pctSeries = (seed: number, base: number): [number, number | null][] => series(seed, base, now).filter((_, i) => i % 10 === 0).map(([t, v]) => [t, v == null ? null : Math.min(v, 92)])
  return {
    all, ch: all ? null : head,
    list: CH.map(([x, col], k) => ({ ...who(x, col), live: k < 2 })),
    n: all ? 182340 : 61204,
    moods: [{ key: "rire", label: "Rire", share: 0.142 }, { key: "hype", label: "Hype", share: 0.087 }, { key: "negatif", label: "Négatif", share: 0.031 }, { key: "question", label: "Questions", share: 0.064 }],
    kinds: { n: all ? 175022 : 58710, react: 0.49, wave: 0.11, inter: 0.18, ad: 0.12, co: 0.06, cm: 0.17, parts: KINDS.map(([key, label, desc, c, share]) => ({ key, label, desc, color: c, share })) },
    kindRows: all ? CH.map(([x, col], k) => ({ ...who(x, col), n: [58710, 61002, 40112, 15198][k], react: [0.55, 0.41, 0.48, 0.52][k], wave: [0.14, 0.08, 0.1, 0.06][k], inter: [0.12, 0.22, 0.09, 0.15][k], ad: [0.08, 0.14, 0.06, 0.1][k], co: [0.04, 0.08, 0.03, 0.05][k], cm: [0.15, 0.2, 0.18, 0.14][k], ct: [0.13, 0.12, 0.2, 0.14][k] })) : null,
    moodRows: all ? CH.map(([x, col], k) => ({ ...who(x, col), n: [61204, 64110, 41020, 16006][k], moods: [[0.16, 0.11, 0.02, 0.05], [0.12, 0.06, 0.04, 0.09], [0.14, 0.09, 0.03, 0.04], [0.1, 0.05, 0.05, 0.07]][k], emote: ["PogChamp", "KEKW", "LUL", "Kappa"][k] })) : null,
    emotes: [["KEKW", 8210], ["PogChamp", 6120], ["LUL", 4380], ["Kappa", 2910], ["catJAM", 2105], ["OMEGALUL", 1802], ["monkaS", 1210]].map(([k, v]) => ({ k: k as string, v: v as number, share: (v as number) / 61204 })),
    words: [["gg", 3120], ["mdr", 2810], ["top", 1504], ["chat", 1320], ["bien", 1102], ["jeu", 980], ["trop", 912], ["encore", 640]].map(([k, v]) => ({ k: k as string, v: v as number })),
    moodChart: spec(MOODS.map(([name, c], k) => ({ name, c: "", color: c, pts: pctSeries(k, [14, 9, 3, 6][k]) })), { pct: true, yFloor: 10 }),
    kindChart: spec(KIND_LINES.map(([name, c], k) => ({ name, c: "", color: c, pts: pctSeries(k, [48, 18, 17][k]) })), { pct: true, yFloor: 10, height: 170 }),
  }
}

function gameDemo(): GameData {
  const who = (x: string, col: string) => ({ c: x, color: col, img: "" })
  const W = CH.map(([x, col]) => who(x, col))
  const G = ["Teamfight Tactics", "Just Chatting", "League of Legends", "VALORANT"]
  return {
    hasApi: true,
    games: [
      { g: G[0], chans: [W[0], W[2]], air: "21 h 30", avgV: 13900, users: 9120, msgs: 141020, perUser: 15.5 },
      { g: G[1], chans: [W[1], W[0], W[3], W[2]], air: "14 h 05", avgV: 7400, users: 8410, msgs: 120400, perUser: 14.3 },
      { g: G[2], chans: [W[2]], air: "6 h 10", avgV: 9800, users: 3120, msgs: 31002, perUser: 9.9 },
      { g: G[3], chans: [W[3]], air: "3 h 20", avgV: 2100, users: 980, msgs: 8210, perUser: 8.4 },
    ],
    switchGames: [{ g: G[1], n: 14, dv: -0.12, dm: 0.21 }, { g: G[0], n: 9, dv: 0.06, dm: -0.04 }, { g: G[3], n: 2, dv: null, dm: 0.1 }],
    matrix: { rows: G.map((k, i) => ({ k, size: [9120, 8410, 3120, 980][i], who: null, cells: G.map((_, j) => (i === j ? null : { r: [[0, 0.31, 0.12, 0.03], [0.34, 0, 0.09, 0.05], [0.36, 0.25, 0, 0.08], [0.28, 0.41, 0.26, 0]][i][j], n: Math.round([9120, 8410, 3120, 980][i] * [[0, 0.31, 0.12, 0.03], [0.34, 0, 0.09, 0.05], [0.36, 0.25, 0, 0.08], [0.28, 0.41, 0.26, 0]][i][j]) })) })) },
  }
}

// Onglet Audiences (?demo=audiences ; ?demo=overlap et ?demo=flows y mènent aussi) : huit chaînes, chiffres fictifs.
// &aud=vide : aucune donnée ; &aud=calme : aucun trajet aujourd'hui ; &beaucoup : 30 chaînes dans « Chaîne par chaîne » ;
// &byday=N journées passées (4 par défaut, 0 : aucune encore), &byday=non : base pas à jour.
const AUD: [string, string][] = [...CH, ["mirabelle_tv", "#ff7aa8"], ["zorvan", "#3fb6a8"], ["velvetfox", "#b26cf0"], ["nopalgames", "#5fbf5a"]]
const audWho = (i: number) => ({ c: AUD[i][0], color: AUD[i][1], img: "" })
const audParam = () => new URLSearchParams(location.search).get("aud")
const ACTIVES = [3120, 1980, 1410, 1150, 860, 790, 640, 520]
// viewers actifs en commun par paire [chaîne, chaîne, personnes]
const SHARED: [number, number, number][] = [[0, 1, 134], [0, 2, 22], [0, 3, 18], [0, 4, 31], [0, 5, 19], [0, 6, 9], [1, 2, 12], [1, 3, 25], [1, 4, 8], [1, 5, 6], [2, 3, 68], [2, 4, 7], [2, 6, 11], [3, 6, 7], [4, 5, 3], [5, 6, 26], [6, 7, 16]]
const shared = (a: number, b: number) => SHARED.find(([x, y]) => (x === a && y === b) || (x === b && y === a))?.[2] ?? 0

let overlapFilter = "all"
function overlapDemo(): OverlapData {
  const counts: Record<string, number> = { all: 12480, multi: 499, move: 412, often: 88 }
  const k = counts[overlapFilter] / counts.all
  // filtré, les parts montent (on ne garde que des viewers présents sur plusieurs chaînes)
  const boost = overlapFilter === "all" ? 1 : 1 / Math.max(k * 6, 0.2)
  const sizes = ACTIVES.map((n) => Math.max(1, Math.round(n * (overlapFilter === "all" ? 1 : k * 4))))
  const share = (a: number, b: number) => Math.min(1, (shared(a, b) / ACTIVES[a]) * boost)
  const top = [0, 1, 2, 3, 4, 5, 6]
  const pairs = SHARED.map(([a, b]) => {
    const [x, y] = ACTIVES[a] <= ACTIVES[b] ? [a, b] : [b, a]
    return { a: audWho(x), b: audWho(y), n: shared(a, b), share: share(x, y), j: shared(a, b) / (ACTIVES[a] + ACTIVES[b] - shared(a, b)) }
  }).sort((p, q) => q.j - p.j).slice(0, 7).sort((p, q) => q.share - p.share || q.n - p.n)
  const d: OverlapData = {
    filter: overlapFilter,
    filters: [["all", "Tous"], ["multi", "Sur 2 chaînes ou plus"], ["move", "Ont changé de stream"], ["often", "Souvent (3 fois ou plus)"]].map(([key, label]) => ({ key, label, tip: "", count: counts[key] })),
    filterNote: overlapFilter === "all" ? null : { count: counts[overlapFilter], desc: "ont changé de stream au moins une fois", share: k, total: counts.all },
    spread: { total: 12480, one: 11981, two: 386, more: 113, single: 4742, talk3: 5600, talk3one: 5101, chans: AUD.length, filtered: false },
    matrix: { rows: top.map((a) => ({ k: AUD[a][0], size: sizes[a], who: audWho(a), cells: top.map((b) => (a === b ? null : { r: share(a, b), n: shared(a, b) })) })) },
    chans: AUD.length,
    pairs,
  }
  if (audParam() !== "vide") return d
  return { ...d, filters: d.filters.map((x) => ({ ...x, count: 0 })), spread: { ...d.spread, total: 0, one: 0, two: 0, more: 0, single: 0, talk3: 0, talk3one: 0 }, matrix: { rows: [] }, chans: 0, pairs: [] }
}

const dayStr = (back: number) => {
  const t = new Date(Date.now() - back * 86400000)
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`
}
// trajets d'une journée type : [de, vers, personnes, délai, raid]
const ROUTES: [number, number, number, string, boolean][] = [[0, 4, 74, "8 min", false], [5, 3, 41, "7 min", false], [4, 0, 39, "13 min", false], [2, 0, 27, "2 min", true], [6, 7, 16, "19 min", false]]

function flowsDemo(): FlowsData {
  const route = ([a, b, n, gap, raid]: (typeof ROUTES)[number]) => ({ a: audWho(a), b: audWho(b), n, gap, raid })
  // chaînes : [indice, actifs, part qui change, arrivées, départs]
  const base: [number, number, number, number, number][] = [[4, 1980, 0.059, 74, 39], [3, 1150, 0.048, 41, 9], [6, 640, 0.031, 16, 5], [7, 520, 0.019, 7, 2], [0, 3120, 0.061, 66, 74], [1, 790, 0.028, 4, 16], [2, 860, 0.039, 3, 27], [5, 1410, 0.042, 12, 41]]
  const rows: FlowsData["rows"] = base.map(([i, n, m, inn, out]) => ({ ...audWho(i), n, m, in: inn, out, net: inn - out }))
  if (new URLSearchParams(location.search).has("beaucoup"))
    for (let i = 0; i < 22; i++) {
      const inn = (i * 7) % 11, out = (i * 5) % 9, n = 15 + ((i * 37) % 300)
      rows.push({ c: `chaine${String(i).padStart(2, "0")}`, color: `hsl(${(i * 47) % 360} 60% 58%)`, img: "", n, m: n < 20 ? null : 0.01 + (i % 5) / 100, in: inn, out, net: inn - out })
    }
  rows.sort((a, b) => b.net - a.net || b.n - a.n)
  const raid = (when: string, from: number, to: number, n: number) => ({ when, from: { ...audWho(from), name: AUD[from][0] }, to: audWho(to), n })
  const path = (ids: number[]) => ids.map((i, j) => ({ ...audWho(i), when: `ven. 27 nov. ${18 + (j % 6)}h${String((j * 7) % 60).padStart(2, "0")}` }))
  const d: FlowsData = {
    total: 197, routes: 5, medianGap: "11 min",
    actives: 12480, move: 412, often: 88, oftenAt: 3, swStart: "24/11/2026",
    raidCount: 6, raidViewers: 2310,
    flows: ROUTES.map(route),
    rows,
    top: Array.from({ length: 10 }, (_, i) => ({ id: ((0xa3f91c + i * 48271) % 0xffffff).toString(16).padStart(6, "0"), moves: 9 - Math.floor(i / 2), chans: 3 + (i % 2), path: path(i % 2 ? [0, 4, 0, 3, 5] : [5, 3, 5, 7]), more: i ? 0 : 6, span: "ven. 27 nov. 18h00 → 21h12" })),
    today: { d: dayStr(0), routes: audParam() === "calme" ? [] : ROUTES.map(route) },
    raids: [raid("ven. 27 nov. 21h22", 2, 0, 1120), raid("ven. 27 nov. 20h05", 6, 4, 540), raid("ven. 27 nov. 18h47", 7, 1, 210), raid("ven. 27 nov. 16h30", 5, 3, 260), raid("ven. 27 nov. 14h12", 3, 7, 120), raid("ven. 27 nov. 11h58", 1, 6, 60)],
  }
  if (audParam() !== "vide") return d
  return { ...d, total: 0, routes: 0, medianGap: "", actives: 0, move: 0, often: 0, swStart: "", raidCount: 0, raidViewers: 0, flows: [], rows: [], top: [], today: { d: dayStr(0), routes: [] }, raids: [] }
}

// Journées passées (format de FlowsData.byDay, fictives) : les n jours avant aujourd'hui, avec des poids qui varient.
function byDayDemo(nDays: number): NonNullable<FlowsData["byDay"]> {
  const more: [number, number, number, string, boolean][] = [...ROUTES, [3, 5, 22, "", false], [7, 2, 18, "", false]]
  const out: NonNullable<FlowsData["byDay"]> = []
  for (let k = nDays; k >= 1; k--) {
    more.forEach(([a, b, n, , raid], i) => {
      const viewers = Math.round(n * (1.1 + Math.sin(k * 1.7 + i * 2.3)))
      if (viewers < 3) return
      const passages = Math.round(viewers * 1.35)
      const r = raid ? Math.round(passages * 0.85) : 0
      out.push({ d: dayStr(k), a: audWho(a), b: audWho(b), viewers, passages, organic: passages - r, raid: r })
    })
  }
  return out
}

// ?demo=map : la Carte a besoin de vraies présences pour que son moteur calcule la disposition. On remplit la base locale
// EN MÉMOIRE (rien n'est enregistré) : 12 chaînes, 3 000 viewers fictifs répartis en 3 communautés qui se recoupent un peu.
// ?demo=map&dense : beaucoup de chevauchements entre groupes, pour qu'une chaîne ait plus de 4 voisines (fiche : « Voir les N autres »)
function seedMap() {
  const s = document.createElement("script")
  s.textContent = `(()=>{const chans=['etoiles','xari','gotaga','kamet0','zerator','mynthos','jbzz','ponce','antoinedaniel','domingo','sardoche','rivenzi'];
    for(const c of chans)if(!cfg.chans.includes(c))cfg.chans.push(c);
    const grp={etoiles:0,zerator:0,mynthos:0,jbzz:0,xari:1,ponce:1,antoinedaniel:1,domingo:1,gotaga:2,kamet0:2,sardoche:2,rivenzi:2};
    const d=dayKey(Date.now()),now=Date.now();let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
    for(let u=0;u<3000;u++){const g=u%3,mine=chans.filter(c=>grp[c]===g),set=new Set([mine[Math.floor(rnd()*4)]]);
      if(rnd()<.35)set.add(mine[Math.floor(rnd()*4)]);if(rnd()<${new URLSearchParams(location.search).has("dense") ? 0.35 : 0.08})set.add(chans[Math.floor(rnd()*chans.length)]);
      for(const c of set){const t=now-rnd()*5*3600e3;DB.presence['demo'+u+'|'+c+'|'+d+'|x']={u:'demo'+u,c,d,g:'Just Chatting',f:t,l:t+rnd()*1800e3,n:1+Math.floor(rnd()*20)}}}
    // chaînes en live (viewers du moment, pour la taille des ronds) ; les autres sont hors live
    const lv={zerator:21040,etoiles:14520,xari:6230,ponce:9800,mynthos:3120,jbzz:1840,sardoche:4400,domingo:900};
    // jeu de chaque chaîne : en cours pour les lives (filtre « Jeu en cours » du menu de la Carte) et dans ses relevés
    const gm={etoiles:'Teamfight Tactics',xari:'Just Chatting',gotaga:'VALORANT',kamet0:'VALORANT',zerator:'Just Chatting',mynthos:'League of Legends',jbzz:'Teamfight Tactics',ponce:'Just Chatting',antoinedaniel:'Just Chatting',domingo:'League of Legends',sardoche:'League of Legends',rivenzi:'VALORANT'};
    for(const c of chans)info[c]=lv[c]?{live:true,v:lv[c],g:gm[c],since:now-2*3600e3}:{live:false};
    for(const c of chans)for(let k=0;k<3;k++)DB.snaps.push({t:now-(k+1)*1800e3,c,live:1,v:lv[c]||600,g:gm[c]})})();`
  document.body.appendChild(s)
}

function statusDemo(err: boolean): StatusData {
  return {
    head: "Collecteur en ligne",
    short: "En ligne",
    alerts: err
      ? [
          ["Base injoignable", "Ce navigateur n'arrive pas à joindre Supabase. Vérifie ta connexion et l'URL dans Réglages, section Source des données.", "TypeError: Failed to fetch", "settings"],
          ["Jeton Twitch refusé", "Twitch n'accepte plus le jeton : les viewers et les lives ne sont plus relevés. Génère-en un nouveau dans Réglages, section API Twitch.", "jeton refusé (401), régénère-le dans Réglages", "settings"],
        ]
      : [],
    facts: [
      ["Chaînes suivies", "12"],
      ["Viewers actifs aujourd'hui", "4 321"],
      ["Temps d'écoute au total", "3 j 4 h"],
      ["Dernier signal du collecteur", "il y a 42 s"],
      ["Base de données", "212 Mo sur 500"],
    ],
    note: "",
    action: null,
  }
}

// Rosters : des viewers fictifs (v0, v1…) répartis sur les 4 chaînes avec des recouvrements connus
// (v0-v3999 : etoiles ; v3000-v6999 : xari ; v6500-v9999 : gotaga ; v0-v499 + v9500-v10999 : kamet0)
function rostersDemo(): RostersData {
  const range = (a: number, b: number) => Array.from({ length: b - a }, (_, i) => "v" + (a + i))
  const U = [range(0, 4000), range(3000, 7000), range(6500, 10000), [...range(0, 500), ...range(9500, 11000)]]
  return { chans: CH.map(([c, color], i) => ({ c, color, img: "", users: new Set(U[i]), msgs: U[i].length * (3 + i) })) }
}

// Historique : n jours agrégés fictifs (courbes qui montent avec un creux le week-end), pour voir la section « Historique » de Par chaîne
function historyDemo(c: string, n: number): ChannelHistory {
  const k = Math.max(1, CH.findIndex(([x]) => x === c) + 1)
  const days = Array.from({ length: n }, (_, i) => {
    const t = new Date(Date.now() - (n - i) * 86400000), wk = [0, 6].includes(t.getDay()) ? 1.35 : 1
    const base = (3000 + 900 * k) * (0.8 + (i / n) * 0.5) * wk
    const avg = Math.round(base), chatters = Math.round(base * 0.32)
    return { d: t.toLocaleDateString("sv-SE"), chatters, msgs: chatters * 14, mins: 240 + ((i * 37) % 200), peak: Math.round(avg * 1.6), avg, out: Math.round(chatters * 0.08), in: Math.round(chatters * 0.07) }
  })
  const who = (x: string, col: string, n2: number, raid: number) => ({ c: x, color: col, img: "", n: n2, raid })
  return { days, out: [who("xari", "#ff7a45", 612 * k, 0), who("gotaga", "#2fbf71", 310 * k, 48), who("kamet0", "#f5b83d", 120 * k, 0)], in: [who("gotaga", "#2fbf71", 540 * k, 0), who("etoiles", "#4d8dff", 204 * k, 120)] }
}

// Viewers uniques sur 7, 30 ou 90 jours (esquisses HyperLogLog) : valeurs fictives, la réunion est plus petite que la somme (chevauchement)
function reachDemo(chans: string[], days: number): PeriodReach {
  const n = (c: string) => Math.round((2400 + 1100 * Math.max(1, CH.findIndex(([x]) => x === c) + 1)) * Math.sqrt(days))
  const per = chans.map((c) => ({ c, n: n(c) })).sort((a, b) => b.n - a.n)
  const gross = per.reduce((s, x) => s + x.n, 0)
  const d = (k: number) => new Date(Date.now() - k * 86400000).toLocaleDateString("sv-SE")
  return { from: d(Math.min(days, 12)), to: d(1), days: Math.min(days, 12), net: Math.round(gross * 0.82), chans: per }
}

// Fidélité du chat : la part de viewers actifs partis ailleurs dépend de la chaîne (haut, milieu, bas du classement fictif des chaînes suivies) ;
// &sticky=bas ou &sticky=haut force le rang, &sticky=petit : petite chaîne (sous 200 viewers actifs, pas de score), &sticky=peu : trop peu de viewers actifs pour mesurer
function stickyDemo(c: string, n: number, mode: string | null): ChannelSticky {
  const k = Math.max(1, CH.findIndex(([x]) => x === c) + 1)
  const rate = mode === "bas" ? 0.16 : mode === "haut" ? 0.03 : [0.03, 0.07, 0.15, 0.1][(k - 1) % 4]
  const days = Array.from({ length: n }, (_, i) => {
    const t = new Date(Date.now() - (n - i) * 86400000)
    const actives = mode === "peu" ? (i < 3 ? 4 : 0) : mode === "petit" ? 4 : Math.round((900 + 350 * k) * (0.85 + (i / n) * 0.3))
    return { d: t.toLocaleDateString("sv-SE"), actives, leavers: Math.round(actives * rate * (0.8 + ((i * 7) % 5) / 12)) }
  })
  return { days, actives: days.reduce((s, d) => s + d.actives, 0), leavers: days.reduce((s, d) => s + d.leavers, 0), net: { n: 12, q1: 89.1, med: 93, q3: 96.3 } }
}

// « Jour par jour » de la Vue d'ensemble : les journées passées fictives de network_history. Par défaut, peu de jours (4), le pic
// connu seulement pour les 2 derniers. &histo=plein : toute la durée ; =1 : une journée ; =ancien : schema.sql pas rejoué (les clés
// actives, peak, peakAt sont absentes) ; =trou : une journée sans agrégat au milieu ; =non : pas de base
function historyDays(days: number) {
  const m = new URLSearchParams(location.search).get("histo")
  return m === "plein" ? days - 1 : m === "1" ? 1 : Math.min(days - 1, m === "trou" ? 5 : 4)
}
function networkDemo(days: number): NetworkHistory {
  const m = new URLSearchParams(location.search).get("histo")
  const n = historyDays(days)
  const list = Array.from({ length: n }, (_, i) => {
    const back = n - i, t = new Date(Date.now() - back * 86400000), wk = [0, 6].includes(t.getDay()) ? 1.2 : 1
    const k = wk * (0.93 + 0.07 * Math.sin(i * 1.7))
    const row = { d: dayStr(back), msgs: Math.round(402_000 * k), avg: Math.round(52_000 * k), chans: 11 + (i % 3) }
    const full = m === "plein" || back <= 2
    return m === "ancien" ? row : { ...row, actives: Math.round(24_100 * k), peak: full ? Math.round(61_200 * k) : null, peakAt: full ? t.setHours(21, 14) : null }
  }).filter((_, i) => !(m === "trou" && i === 2))
  const who = (c: string, color: string, msgs: number, avg: number) => ({ c, color, img: "", msgs, avg })
  return { days: list, top: [who("etoiles", "#4d8dff", 98432 * n, 14520), who("xari", "#ff7a45", 71204 * n, 6230), who("gotaga", "#2fbf71", 52310 * n, 5870), who("kamet0", "#f5b83d", 24172 * n, 2232)] }
}

export function installDemo() {
  // l'ancien code se charge après le premier rendu : on remplace ses fonctions dès qu'elles existent
  const id = setInterval(() => {
    if (!window.renderOverview) return
    clearInterval(id)
    window.renderOverview = () => window.dispatchEvent(new CustomEvent("legacy:overview", { detail: many(demo()) }))
    window.renderChannel = () => {
      const sel = document.getElementById("chanSel") as HTMLSelectElement | null
      window.dispatchEvent(new CustomEvent("legacy:channel", { detail: channelDemo(sel?.value || CH[0][0]) }))
    }
    window.renderChat = () => {
      const sel = document.getElementById("chanSel") as HTMLSelectElement | null
      window.dispatchEvent(new CustomEvent("legacy:chat", { detail: chatDemo(sel?.value || "*") }))
    }
    window.renderClip = () => {
      const sel = new URLSearchParams(location.search).get("chaine") ?? "*"
      window.dispatchEvent(new CustomEvent("legacy:clip", { detail: clipDemo(sel) }))
    }
    window.renderGame = () => window.dispatchEvent(new CustomEvent("legacy:game", { detail: gameDemo() }))
    window.renderOverlap = () => window.dispatchEvent(new CustomEvent("legacy:overlap", { detail: overlapDemo() }))
    window.setOverlapFilter = (f: string) => { overlapFilter = f; window.renderOverlap?.(null) }
    window.renderFlows = () => {
      const q = new URLSearchParams(location.search).get("byday")
      const d = flowsDemo()
      if (q !== "non") d.byDay = audParam() === "vide" ? [] : byDayDemo(Math.max(0, Math.min(60, q == null ? 4 : Number(q) || 0)))
      window.dispatchEvent(new CustomEvent("legacy:flows", { detail: d }))
    }
    // &histo=non : base pas à jour ; &histo=1 : une seule journée agrégée
    const histo = () => new URLSearchParams(location.search).get("histo")
    window.channelHistory = async (c, days) => (histo() === "non" ? null : historyDemo(c, histo() === "1" ? 1 : days))
    window.channelLives = async (c) => livesDemo(c)
    window.periodReach = async (chans, days) => {
      if (histo() === "non") return null
      if (chans[0] !== "*") return reachDemo(chans, days)
      const n = historyDays(days) // réseau entier : cohérent avec les journées de « Jour par jour »
      return { from: dayStr(n), to: dayStr(1), days: n, net: Math.round(24_100 * (1 + Math.sqrt(n))), chans: [] }
    }
    // &sticky=bas|haut : chaîne en bas ou en haut du classement de fidélité ; &sticky=peu : trop peu de viewers actifs (&histo=non couvre aussi la fidélité)
    const sticky = () => new URLSearchParams(location.search).get("sticky")
    // &rythme=vide : pas encore 14 journées ; &rythme=calme : aucune chaîne ne sort de son rythme ; &histo=non : base pas à jour
    window.channelsRhythm = async () => {
      const m = new URLSearchParams(location.search).get("rythme")
      if (histo() === "non") return null
      if (m === "vide") return []
      const mk = (i: number, base: number, recent: number, sd: number) => ({ c: CH[i][0], color: CH[i][1], img: "", nr: 7, nb: 14, recent, base, sd })
      return m === "calme" ? [mk(0, 4000, 4100, 300), mk(1, 5200, 5000, 400)] : [mk(0, 4000, 5600, 350), mk(1, 5200, 3900, 420), mk(2, 6100, 6200, 500), mk(3, 90, 130, 60)]
    }
    window.channelSticky = async (c, days) => (histo() === "non" ? null : stickyDemo(c, histo() === "1" ? 1 : days, sticky()))
    window.networkHistory = async (days) => (histo() === "non" ? null : networkDemo(days))
    // la ligne de période sous le titre vient de la base locale, vide en démo (« Pas encore de relevé ») : plage fictive
    const realPeriod = window.periodInfo!
    window.periodInfo = () => {
      const p = realPeriod()
      if (audParam() === "vide") return p
      const days = p.key === "today" ? 1 : p.key === "7d" ? 7 : p.key === "30d" ? 30 : 5
      const dm = (back: number) => new Date(Date.now() - back * 86400000).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
      return { ...p, range: days === 1 ? `Aujourd'hui, ${dm(0)}` : `Du ${dm(days - 1)} au ${dm(0)} (${days} jours)` }
    }
    window.raidSuggestions = async () => {
      const m = new URLSearchParams(location.search).get("raids")
      if (m === "non") return null
      const h = 3600e3, now = Date.now()
      const mk = (i: number, raids: number, viewers: number, to: string[]) => ({ c: "voisine_demo_" + i, raids, viewers, to, last: now - i * 20 * h })
      return { since: now - 4 * 24 * h, items: m === "vide" ? [] : [mk(1, 3, 5400, ["etoiles", "xari", "gotaga", "kamet0"]), mk(2, 1, 1250, ["etoiles"]), ...Array.from({ length: 12 }, (_, i) => mk(i + 3, 2, 300 - i * 20, ["gotaga"]))] }
    }
    window.renderRosters = () => window.dispatchEvent(new CustomEvent("legacy:rosters", { detail: rostersDemo() }))
    // pilule d'état : collecteur en ligne ; ?demo&etat=erreur : synchro et API en échec (problèmes affichés avant l'état)
    window.statusOf = () => statusDemo(new URLSearchParams(location.search).get("etat") === "erreur")
    const t = new URLSearchParams(location.search).get("demo")
    // anneaux des planètes : l'ancien code les calcule d'après la base locale, vide ici (sauf sur la Carte, qui la remplit) :
    // on fige les trois chaînes les plus fortes de la démo
    if (t !== "map") {
      const ring = new Set(["etoiles", "xari", "gotaga"])
      Object.defineProperty(window, "planetRing", { get: () => ring, set: () => {}, configurable: true })
    }
    if (t === "map") seedMap()
    // ?demo=settings&chaines=40 : ajoute des chaînes fictives pour voir la liste défiler
    const n = Number(new URLSearchParams(location.search).get("chaines"))
    if (t === "settings" && n > 0) window.addChanList?.(Array.from({ length: n }, (_, i) => `chaine_demo_${i + 1}`).join(" "))
    // les anciennes adresses des onglets Chevauchement et Flux mènent à Audiences
    const old = t === "overlap" || t === "flows" || t === "flows-map"
    window.showTab?.(old || t === "audiences" ? "audiences" : t === "channel" || t === "chat" || t === "clip" || t === "game" || t === "rosters" || t === "settings" || t === "map" ? t : "overview")
    // ?demo&hover=0.4 : simule le survol du premier graphique à 40 % de sa largeur (pour vérifier l'infobulle)
    const hv = Number(new URLSearchParams(location.search).get("hover"))
    if (hv > 0) setTimeout(() => {
      const hit = document.querySelector<SVGRectElement>('[role=group] svg rect[fill="transparent"]')
      if (!hit) return
      hit.closest("[role=group]")?.scrollIntoView({ block: "center" })
      const b = hit.getBoundingClientRect()
      hit.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: b.left + b.width * hv, clientY: b.top + 40, pointerType: "mouse" }))
    }, 1200)
  }, 50)
}
