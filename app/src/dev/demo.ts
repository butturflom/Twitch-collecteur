// Mode démo, en développement seulement : http://localhost:5173/?demo
// Remplace les données de la vue d'ensemble par un jeu fictif, pour travailler le design sans vraie base.
// N'est jamais inclus dans le build (main.tsx ne l'importe que si import.meta.env.DEV).
import type { ChannelHistory, ChannelSticky, NetworkHistory, PeriodReach, LineSpec, RostersData, ChannelData, ChatData, FlowsData, GameData, OverlapData, OverviewData, StatusData, TopStreamerRow, InvestedCommunityRow } from "@/legacy/bridge"

declare global { interface Window { renderOverview?: (q: unknown) => void; renderChannel?: (q: unknown) => void; renderChat?: (q: unknown) => void; renderGame?: (q: unknown) => void; renderOverlap?: (q: unknown) => void; renderFlows?: (q: unknown) => void; renderRosters?: (q: unknown) => void; channelHistory?: (c: string, days: number) => Promise<ChannelHistory | null>; periodReach?: (chans: string[], days: number) => Promise<PeriodReach | null>; networkHistory?: (days: number) => Promise<NetworkHistory | null>; statusOf?: () => StatusData } }

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

function demo(): OverviewData {
  const now = Date.now()
  const who = (c: string, color: string) => ({ c, color, img: "" })
  const chart = (k: number) =>
    spec(CH.map(([c, color], i) => ({ name: c, c, color, pts: series(i, k * (4 - i), now) })), {
      unit: k > 50 ? " viewers" : " msg/min",
      gaps: k > 50 ? [] : [[now - 100 * MIN, now - 82 * MIN]], // une période sans écoute, pour la voir
    })
  return {
    kpis: [
      { label: "Viewers actifs uniques", value: "18 432", hint: "ont écrit au moins un message" },
      { label: "Messages", value: "246 118", hint: "au total", trendLabel: "courbe par heure", trend: [12, 18, 15, 22, 30, 41, 38, 52, 47, 61, 58, 72] },
      { label: "Actifs dans 2 chats ou plus", value: "3 271", hint: "17,7 % du total" },
      { label: "Abonnements et subs offerts", value: "1 284" },
    ],
    // ?demo&recoup=vide : bloc Recoupements sans données (état vide)
    recoup: new URLSearchParams(location.search).get("recoup") === "vide"
      ? { channels: 4, period: "today", pairMax: 25, pairMin: 10, pairs: [], flows: [], raid: null }
      : {
          channels: 4,
          period: "all",
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
    channels: [
      { ...who("etoiles", "#4d8dff"), langs: ["fr"], live: true, game: "Teamfight Tactics", title: "TFT avec la commu", viewers: 14520, uniq: 6210, msgs: 98432, recent: 412.6, wrote: 0.214 },
      { ...who("xari", "#ff7a45"), langs: ["fr"], live: true, game: "Just Chatting", title: "On parle de tout", viewers: 6230, uniq: 4120, msgs: 71204, recent: 288.2, wrote: 0.383 },
      { ...who("gotaga", "#2fbf71"), langs: ["fr"], live: false, game: "", title: "", viewers: null, uniq: 5870, msgs: 52310, recent: 0, wrote: null },
      { ...who("kamet0", "#f5b83d"), langs: ["fr", "en"], live: false, game: "", title: "", viewers: null, uniq: 2232, msgs: 24172, recent: null, wrote: null },
    ],
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
    channels: pad(d.channels, (i) => ({ ...extra(i), langs: ["fr"], live: false, game: "", title: "", viewers: null, uniq: 3000 - i * 80, msgs: 20000 - i * 500, recent: null, wrote: null })),
    part: pad(d.part ?? [], (i) => ({ ...extra(i), limited: "", avgV: 4000 - i * 100, perMin: 0.03 - i * 0.0008, msgK: 20 - i * 0.5, uniq: 0.5, react: 0.4, inter: 0.1 })),
    followers: pad(d.followers, (i) => ({ ...extra(i), fol: 300000 - i * 8000, avgV: 3000 - i * 80, grow: 120 - i * 3 })),
    chartOf: { shown: 8, total: MANY },
  }
}

function channelDemo(c: string): ChannelData {
  const [, color] = CH.find(([x]) => x === c) ?? CH[0]
  const i = CH.findIndex(([x]) => x === c)
  const now = Date.now()
  const live = i < 2
  const who = (x: string, col: string) => ({ c: x, color: col, img: "" })
  const hours = Array.from({ length: 24 }, (_, h) => ({ k: h + "h", lbl: `${h}h – ${h + 1}h`, v: Math.round(400 + 2600 * Math.max(0, Math.sin((h - 12) / 4))) }))
  return {
    ch: { ...who(c, color), langs: ["fr"], live, game: live ? "Teamfight Tactics" : "", title: live ? "TFT avec la commu, on vise le top 1" : "", viewers: live ? 14520 : null, since: live ? "18h02" : "" },
    list: CH.map(([x, col], k) => ({ ...who(x, col), live: k < 2 })),
    main: [
      { label: "Viewers actifs uniques", value: "6 210" },
      { label: "Messages", value: "98 432", hint: "61,3 msg/min en moyenne", trendLabel: "courbe par heure", trend: [8, 12, 9, 14, 22, 31, 27, 35, 41, 38, 46, 52] },
      { label: "Viewers en moyenne", value: "13 900", hint: "pic : 16 204" },
      { label: "Écrivent chaque minute", value: "3,1 %", hint: "29,6 msg/min pour 1\u00a0000 viewers" },
      { label: "Followers", value: "1 030 000", hint: "1,3 % en moyenne devant le live" },
    ],
    more: [
      { label: "Interactions", value: "12 %", hint: "55 % de réactions · détail dans l'onglet Chat" },
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
    hasApi: true,
    moments: [
      { ...who(c, color), t: now - 3 * 3600e3, when: "mer. 19 nov. 18h47", game: "Teamfight Tactics", m: 1820, score: 6.4, wave: 0.42, mood: "Hype", emote: "PogChamp", vod: "https://www.twitch.tv/" },
      { ...who(c, color), t: now - 2 * 3600e3, when: "mer. 19 nov. 19h52", game: "Teamfight Tactics", m: 1204, score: 4.1, wave: 0.18, mood: "Rire", emote: "KEKW", vod: "" },
      { ...who(c, color), t: now - 3600e3, when: "mer. 19 nov. 20h31", game: "Just Chatting", m: 960, score: 2.9, wave: 0.07, mood: "", emote: "", vod: "https://www.twitch.tv/" },
    ],
    clips: {
      total: 41, exact: 33, comparable: 28, hitRate: 0.46, medianScore: 2.3,
      rows: [
        { ...who(c, color), id: "demo1", when: "mer. 19 nov. 18h47", exact: true, title: "LE TOP 1 LE PLUS IMPROBABLE DE L'HISTOIRE", views: 48210, m: 1820, score: 6.4, wave: 0.42 },
        { ...who(c, color), id: "demo2", when: "mar. 18 nov. 22h10", exact: false, title: "Il rage quit en direct", views: 21044, m: 640, score: 2.1, wave: 0.12 },
        { ...who(c, color), id: "demo3", when: "lun. 17 nov. 20h03", exact: true, title: "Le chat a deviné avant lui", views: 9812, m: 410, score: 1.2, wave: null },
      ],
    },
    switches: [
      { when: "mer. 19 nov. 20h15", from: "Teamfight Tactics", to: "Just Chatting", vB: 14800, vA: 12100, mB: 58.2, mA: 71.4 },
      { when: "mer. 19 nov. 18h02", from: "Just Chatting", to: "Teamfight Tactics", vB: 9200, vA: null, mB: 44.1, mA: null },
    ],
    // &also=petit : petite chaîne (6 viewers actifs), un viewer sur 6 = 17 % : le pourcentage ne doit pas s'afficher
    ...(new URLSearchParams(location.search).get("also") === "petit"
      ? { alsoBase: 6, also: CH.filter(([x]) => x !== c).map(([x, col], k) => ({ ...who(x, col), share: [2 / 6, 1 / 6, 1 / 6][k], n: [2, 1, 1][k] })) }
      : { alsoBase: 6210, also: CH.filter(([x]) => x !== c).map(([x, col], k) => ({ ...who(x, col), share: [0.21, 0.12, 0.05][k], n: [1304, 745, 310][k] })) }),
    games: [{ g: "Teamfight Tactics", hours: 21.5 }, { g: "Just Chatting", hours: 8.2 }, { g: "League of Legends", hours: 3.1 }],
    raids: live ? [
      { to: who(CH[1][0], CH[1][1]), name: CH[1][0], live: true, score: 87, viewers: 1304, share: 21, organicAB: 612 },
      { to: who(CH[2][0], CH[2][1]), name: CH[2][0], live: false, score: 64, viewers: 745, share: 12, organicAB: 288 },
      { to: who(CH[3][0], CH[3][1]), name: CH[3][0], live: false, score: 42, viewers: 310, share: 5, organicAB: 92 },
    ] : null,
    msgChart: spec([{ name: c, c, color, pts: series(i, 60, now) }], { unit: " msg/min" }),
    viewerChart: spec([{ name: c, c, color, pts: series(i, 6000, now) }], { unit: " viewers" }),
    hourChart: { items: hours, color, unit: " messages" },
  }
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
    moments: channelDemo(all ? CH[1][0] : sel).moments,
    clips: channelDemo(all ? CH[1][0] : sel).clips,
    moodChart: spec(MOODS.map(([name, c], k) => ({ name, c: "", color: c, pts: pctSeries(k, [14, 9, 3, 6][k]) })), { pct: true, yFloor: 10 }),
    kindChart: spec(KIND_LINES.map(([name, c], k) => ({ name, c: "", color: c, pts: pctSeries(k, [48, 18, 17][k]) })), { pct: true, yFloor: 10, height: 170 }),
  }
}

let discoverDemo: GameData["discover"] = { q: "", lang: "fr", status: "idle", error: "", game: "", streams: [] }
function gameDemo(): GameData {
  const who = (x: string, col: string) => ({ c: x, color: col, img: "" })
  const W = CH.map(([x, col]) => who(x, col))
  const G = ["Teamfight Tactics", "Just Chatting", "League of Legends", "VALORANT"]
  return {
    hasApi: true, canSearch: true, discover: discoverDemo,
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

let overlapFilter = "all"
function overlapDemo(): OverlapData {
  const W = CH.map(([x, col]) => ({ c: x, color: col, img: "" }))
  const k = { all: 1, multi: 0.177, move: 0.121, often: 0.043 }[overlapFilter] ?? 1
  const sizes = [6210, 4120, 5870, 2232].map((n) => Math.round(n * k))
  const R = [[0, 0.21, 0.12, 0.05], [0.31, 0, 0.09, 0.07], [0.13, 0.06, 0, 0.04], [0.14, 0.13, 0.1, 0]]
  return {
    filter: overlapFilter,
    filters: [["all", "Tous", 18432], ["multi", "Sur 2 chaînes ou plus", 3271], ["move", "Changent de stream", 2230], ["often", "Changent souvent", 802]].map(([key, label, count]) => ({ key: key as string, label: label as string, tip: "", count: count as number })),
    filterNote: overlapFilter === "all" ? null : { count: Math.round(18432 * k), desc: "ont changé de stream au moins une fois", share: k, total: 18432 },
    movers: {
      move: 2230, often: 802, multi: 3271, total: 18432, oftenAt: 3, medianMoves: 2, maxMoves: 41, swStart: "05/11/2026",
      rows: [
        { ...W[1], n: 4120, m: 0.23, o: 0.09, to: { ...W[0], n: 612 }, from: { ...W[0], n: 540 } },
        { ...W[0], n: 6210, m: 0.15, o: 0.05, to: { ...W[1], n: 540 }, from: { ...W[1], n: 612 } },
        { ...W[3], n: 2232, m: 0.12, o: 0.04, to: { ...W[1], n: 120 }, from: { ...W[2], n: 98 } },
        { ...W[2], n: 5870, m: 0.08, o: 0.02, to: { ...W[3], n: 98 }, from: null },
      ],
      top: [
        { id: "a3f9c1", moves: 41, chans: 4, path: [0, 1, 0, 1, 2, 1, 0, 3, 1, 0, 1, 2, 0, 1].map((i, j) => ({ ...W[i], when: `mer. 19 nov. ${18 + Math.floor(j / 4)}h${String((j * 7) % 60).padStart(2, "0")}` })), more: 6, span: "mer. 19 nov. 18h00 → 23h41" },
        { id: "07be44", moves: 18, chans: 3, path: [1, 0, 1, 2].map((i) => ({ ...W[i], when: "mer. 19 nov. 20h12" })), more: 0, span: "lun. 17 nov. 19h03 → mer. 19 nov. 22h10" },
        { id: "c91d0a", moves: 9, chans: 2, path: [0, 1, 0].map((i) => ({ ...W[i], when: "mar. 18 nov. 21h40" })), more: 0, span: "mar. 18 nov. 21h40 → 23h02" },
      ],
    },
    matrix: { rows: W.map((w, i) => ({ k: w.c, size: sizes[i], who: w, cells: W.map((_, j) => (i === j ? null : { r: R[i][j], n: Math.round(sizes[i] * R[i][j]) })) })) },
    pairs: [[0, 1, 0.14, 1304], [0, 2, 0.07, 745], [1, 3, 0.06, 290], [0, 3, 0.04, 310], [2, 3, 0.03, 240], [1, 2, 0.03, 370]].map(([a, b, j, n]) => ({ a: W[a], b: W[b], j, share: j * 1.6, n })),
    dist: [{ k: 1, v: 15161, share: 0.823 }, { k: 2, v: 2410, share: 0.131 }, { k: 3, v: 702, share: 0.038 }, { k: 4, v: 159, share: 0.009 }],
  }
}

// exportée pour le prototype C0 (dev/flows-map-demo.tsx, ?demo=flows-map)
export function flowsDemo(): FlowsData {
  const W = CH.map(([x, col]) => ({ c: x, color: col, img: "" }))
  // ZéroTator -> Etoiles: 4120 (raid), Kamet0 -> Xari: 980 (raid)
  // Autres flux sont organiques
  return {
    total: 2394, routes: 9, medianGap: "12 min", raidCount: 3, raidViewers: 5310,
    flows: [[1, 0, 612, "8 min"], [0, 1, 540, "11 min"], [2, 3, 310, "25 min"], [0, 2, 288, "14 min"], [3, 1, 204, "6 min"], [1, 2, 160, "31 min"], [2, 0, 140, "18 min"], [3, 0, 92, "9 min"], [1, 3, 48, "42 min"]]
      .map(([a, b, n, gap]) => ({ a: W[a as number], b: W[b as number], n: n as number, gap: gap as string, raid: (a === 1 && b === 0) || (a === 3 && b === 1) })),
    balance: [{ ...W[3], in: 358, out: 296 }, { ...W[0], in: 1104, out: 1068 }, { ...W[1], in: 744, out: 820 }, { ...W[2], in: 448, out: 450 }]
      .map((r) => ({ ...r, net: r.in - r.out })).sort((a, b) => b.net - a.net),
    raids: [
      { when: "mer. 19 nov. 23h58", from: { c: "zerator", color: "#8a8a93", img: "", name: "ZeratoR" }, to: W[0], n: 4120 },
      { when: "mer. 19 nov. 22h31", from: { ...W[3], name: "Kamet0" }, to: W[1], n: 980 },
      { when: "mar. 18 nov. 01h12", from: null, to: W[2], n: 210 },
    ],
  }
}

// Passages par jour et par paire (format de FlowsData.byDay, fictifs) : les n derniers jours, les paires de flowsDemo avec un poids
// qui varie d'un jour à l'autre ; la paire « raid » (Etoiles > Xari) porte surtout des raids, l'une des autres un peu.
function byDayDemo(nDays: number): NonNullable<FlowsData["byDay"]> {
  const P = flowsDemo()
  const raid = new Set(P.flows.filter((f) => f.raid).map((f) => f.a.c + ">" + f.b.c))
  const out: NonNullable<FlowsData["byDay"]> = []
  for (let k = nDays - 1; k >= 0; k--) {
    const dt = new Date(Date.now() - k * 86400000)
    const d = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
    P.flows.forEach((f, i) => {
      const w = 0.04 + 0.06 * (1 + Math.sin(k * 1.7 + i * 2.3)) // 4 % à 16 % du total de la paire
      const viewers = Math.round(f.n * w)
      if (viewers < 3) return
      const passages = Math.round(viewers * 1.35)
      const r = raid.has(f.a.c + ">" + f.b.c) ? Math.round(passages * 0.85) : i === 2 ? Math.round(passages * 0.12) : 0
      out.push({ d, a: f.a, b: f.b, viewers, passages, organic: passages - r, raid: r })
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
    for(const c of chans)info[c]=lv[c]?{live:true,v:lv[c],g:'Just Chatting',since:now-2*3600e3}:{live:false};
    // jeu principal de chaque chaîne (relevés en live), pour le filtre « Jeu principal » du menu de la Carte
    const gm={etoiles:'Teamfight Tactics',xari:'Just Chatting',gotaga:'VALORANT',kamet0:'VALORANT',zerator:'Just Chatting',mynthos:'League of Legends',jbzz:'Teamfight Tactics',ponce:'Just Chatting',antoinedaniel:'Just Chatting',domingo:'League of Legends',sardoche:'League of Legends',rivenzi:'VALORANT'};
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
export function historyDemo(c: string, n: number): ChannelHistory {
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

// Historique du réseau : n jours agrégés fictifs (creux en semaine, pics le week-end), pour voir « Historique du réseau » de la Vue d'ensemble
function networkDemo(n: number): NetworkHistory {
  const days = Array.from({ length: n }, (_, i) => {
    const t = new Date(Date.now() - (n - i) * 86400000), wk = [0, 6].includes(t.getDay()) ? 1.3 : 1
    return { d: t.toLocaleDateString("sv-SE"), msgs: Math.round((2_100_000 + i * 14_000) * wk), avg: Math.round((520_000 + i * 2_600) * wk), chans: 78 + (i % 6) }
  })
  const who = (c: string, color: string, msgs: number, avg: number) => ({ c, color, img: "", msgs, avg })
  return { days, top: [who("etoiles", "#4d8dff", 98432 * n, 14520), who("xari", "#ff7a45", 71204 * n, 6230), who("gotaga", "#2fbf71", 52310 * n, 5870), who("kamet0", "#f5b83d", 24172 * n, 2232)] }
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
    window.renderGame = () => window.dispatchEvent(new CustomEvent("legacy:game", { detail: gameDemo() }))
    window.runDiscover = (q: string, lang: string) => {
      discoverDemo = { q, lang, status: "loading", error: "", game: "", streams: [] }
      window.renderGame?.(null)
      setTimeout(() => {
        discoverDemo = { q, lang, status: "done", error: "", game: q, streams: [["zerator", "ZeratoR", 21040], ["etoiles", "Etoiles", 14520], ["mynthos", "Mynthos", 3120], ["jbzz", "JBzz", 1840]].map(([c, name, v], k) => ({ c: c as string, color: ["#7c5cff", "#4d8dff", "#e66767", "#199e70"][k], img: "", name: name as string, title: `${q} en ranked, on monte !`, viewers: v as number, followed: c === "etoiles" })) }
        window.renderGame?.(null)
      }, 600)
    }
    window.renderOverlap = () => window.dispatchEvent(new CustomEvent("legacy:overlap", { detail: overlapDemo() }))
    window.setOverlapFilter = (f: string) => { overlapFilter = f; window.renderOverlap?.(null) }
    // &byday=non : base pas à jour (pas de byDay, donc pas de carte) ; &byday=14 : 14 journées (3 par défaut)
    window.renderFlows = () => {
      const q = new URLSearchParams(location.search).get("byday")
      const d = flowsDemo()
      if (q !== "non") d.byDay = byDayDemo(Math.max(1, Math.min(60, Number(q) || 3)))
      window.dispatchEvent(new CustomEvent("legacy:flows", { detail: d }))
    }
    // &histo=non : base pas à jour ; &histo=1 : une seule journée agrégée
    const histo = () => new URLSearchParams(location.search).get("histo")
    window.channelHistory = async (c, days) => (histo() === "non" ? null : historyDemo(c, histo() === "1" ? 1 : days))
    window.periodReach = async (chans, days) => (histo() === "non" ? null : reachDemo(chans, days))
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
    window.networkHistory = async (days) => (histo() === "non" ? null : networkDemo(histo() === "1" ? 1 : days))
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
    // ?demo=flows-map : onglet Flux, remplacé par le prototype C0 de la carte des migrations (voir App.tsx)
    window.showTab?.(t === "flows-map" ? "flows" : t === "channel" || t === "chat" || t === "game" || t === "overlap" || t === "flows" || t === "rosters" || t === "settings" || t === "map" ? t : "overview")
    if (t === "game") window.runDiscover("VALORANT", "fr") // montre aussi les résultats de recherche
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
