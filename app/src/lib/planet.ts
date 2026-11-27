// Planète d'une chaîne (choix du 27/11 : piste « terrasses », composition B2) : sa photo de profil collée sur une
// planète à facettes dont la forme est tirée de son nom (toujours la même), avec sa couleur sur le bord. Sans photo (inconnue
// ou refusée) : la planète aux deux tons de sa couleur, avec son initiale. Les formes neutres viennent de Blender
// (scripts/planetes/planetes.py) et sont intégrées au fichier HTML.
// Une seule source pour les deux mondes : ChannelAvatar (React) appelle planetInner ; l'ancien code (legacy.js) appelle
// window.planetInner (av()) et window.planetSvgBody (la Carte). Chaque planète est UNE image tirée d'un cache de compositions.
// Une composition est faite une fois, par petites tranches ; quand elle est prête, seules les images concernées sont remplacées.

declare global {
  interface Window {
    /** Balisage intérieur d'une planète en HTML (image, anneau éventuel) ; l'enveloppe .planet est posée par l'appelant. */
    planetInner?: (name: string, ring?: boolean, color?: string, img?: string, initial?: boolean) => string
    /** La même planète pour la Carte (SVG), de rayon 1, centrée en (0, 0). */
    planetSvgBody?: (name: string, color: string, img?: string, ring?: boolean) => string
    /** Une photo vient d'arriver ou de changer : les planètes déjà dessinées de la chaîne la prennent. */
    planetPhotoChanged?: (name: string) => void
    /** Photo de profil connue d'une chaîne (ou ''), fournie par l'ancien code. */
    channelPhoto?: (name: string) => string
    /** Chaînes qui portent un anneau (les 3 plus fortes de la vue en cours), tenu à jour par l'ancien code à chaque rendu. */
    planetRing?: Set<string>
  }
}

const FICHIERS = import.meta.glob<string>("../assets/planetes/*.png", { eager: true, query: "?inline", import: "default" })
const image = (nom: string) => FICHIERS[`../assets/planetes/${nom}.png`]

const FORMES = ["c1", "c2", "c3", "c4", "c5"]
const RES = 160 // côté des images (repris de planetes.py)
const HALF = 1.2 // demi-largeur de l'image, en rayons de planète (repris de planetes.py)
// B2 : dose de relief posée sur la photo. Les facettes les plus éclairées (au-delà de REFLET_SEUIL) prennent en plus un reflet
// ajouté, qui les détache jusque sur les photos claires. La version aux reflets adoucis lissait trop le relief (retirée le 27/11).
const DOSE = 0.82
const REFLET_SEUIL = 0.82
const REFLET_FORCE = 280

const hash = (s: string) => {
  let h = 2166136261
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!)
const borne = (x: number, max = 1) => (x < 0 ? 0 : x > max ? max : x)

/** Couleur de repli stable (teinte tirée du nom) quand une chaîne n'a pas de couleur. */
export function planetColor(name: string, color?: string): string {
  return color || `hsl(${hash(name.toLowerCase()) % 360} 60% 58%)`
}

// ---------------------------------------------------------------- lecture des images
function charger(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, ko) => {
    const im = new Image()
    // les photos Twitch autorisent la lecture de leurs pixels (CORS ouvert) ; mêmes réglages que lib/avatar-color.ts
    im.crossOrigin = "anonymous"
    im.referrerPolicy = "no-referrer"
    im.onload = () => ok(im)
    im.onerror = () => ko(new Error("image illisible"))
    im.src = src
  })
}

function toile(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas")
  c.width = c.height = RES
  return [c, c.getContext("2d", { willReadFrequently: true })!]
}

/** Pixels d'une image, recadrée au carré et ramenée à RES px. */
function pixels(im: HTMLImageElement): Uint8ClampedArray {
  const [, x] = toile()
  const w = im.naturalWidth, h = im.naturalHeight, s = Math.min(w, h)
  x.imageSmoothingQuality = "high"
  x.drawImage(im, (w - s) / 2, (h - s) / 2, s, s, 0, 0, RES, RES)
  return x.getImageData(0, 0, RES, RES).data
}

interface Forme { px: Uint8ClampedArray; uv: Uint8ClampedArray; lo: number; hi: number }
const formes = new Map<string, Promise<Forme>>()

function forme(id: string): Promise<Forme> {
  let p = formes.get(id)
  if (!p) {
    p = Promise.all([charger(image(id)), charger(image(`${id}-uv`))]).then(([lum, uv]) => {
      const px = pixels(lum)
      // niveaux automatiques, une fois par forme : la lumière occupe toute la rampe
      const vals: number[] = []
      for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 200) vals.push(px[i])
      vals.sort((a, b) => a - b)
      const lo = vals[Math.floor(vals.length * 0.02)] || 0
      const hi = vals[Math.floor(vals.length * 0.985)] || 255
      return { px, uv: pixels(uv), lo, hi: Math.max(hi, lo + 20) }
    })
    formes.set(id, p)
  }
  return p
}

const photos = new Map<string, Promise<HTMLImageElement | null>>()

/** La photo prête à lire, ou null si elle manque ou si le serveur la refuse. */
function photo(url: string): Promise<HTMLImageElement | null> {
  let p = photos.get(url)
  if (!p) {
    p = charger(url)
      // nouvel essai sous une autre adresse : le cache du navigateur peut garder une réponse obtenue sans CORS
      .catch(() => (url.startsWith("https:") ? charger(`${url}${url.includes("?") ? "&" : "?"}cors=1`) : null))
      .catch(() => null)
    photos.set(url, p)
  }
  return p
}

const lues = new WeakMap<HTMLImageElement, Uint8ClampedArray>()
function pixelsPhoto(im: HTMLImageElement): Uint8ClampedArray {
  let d = lues.get(im)
  if (!d) lues.set(im, (d = pixels(im)))
  return d
}

// ---------------------------------------------------------------- couleurs
let sonde: CanvasRenderingContext2D | undefined
/** N'importe quelle couleur CSS (hex, hsl…) en [r, v, b]. */
function rgb(color: string): number[] {
  sonde ??= document.createElement("canvas").getContext("2d")!
  sonde.fillStyle = "#808080"
  sonde.fillStyle = color
  const s = sonde.fillStyle as string
  return s.startsWith("#") ? [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)) : (s.match(/[\d.]+/g) ?? ["128", "128", "128"]).slice(0, 3).map(Number)
}

function rgbHsl([r, g, b]: number[]): number[] {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2
  if (mx === mn) return [0, 0, l]
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

function hsl(h: number, s: number, l: number): number[] {
  s = borne(s); l = borne(l)
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

/** Rampe de 256 tons, de l'ombre à la lumière, dans une même teinte. */
function rampe(h: number, s: number, l: number): Uint8ClampedArray {
  const stops: [number, number[]][] = [
    [0, hsl(h, s * 0.7, 0.07)], [0.3, hsl(h, s * 0.85, l * 0.5)], [0.62, hsl(h, s, l * 0.84)], [0.85, hsl(h, s, l)],
    [1, hsl(h, s * 0.85, Math.min(0.92, l + 0.2))],
  ]
  const lut = new Uint8ClampedArray(256 * 3)
  for (let i = 0, k = 0; i < 256; i++) {
    const t = i / 255
    while (k < stops.length - 2 && t > stops[k + 1][0]) k++
    const [t0, c0] = stops[k], [t1, c1] = stops[k + 1], u = borne((t - t0) / (t1 - t0))
    for (let j = 0; j < 3; j++) lut[i * 3 + j] = c0[j] + (c1[j] - c0[j]) * u
  }
  return lut
}

// ---------------------------------------------------------------- composition
/** Photo enroulée sur la forme (passe UV), relief dosé, reflet sur les facettes les plus éclairées. */
function coller(f: Forme, ph: Uint8ClampedArray, o: Uint8ClampedArray) {
  const { px, uv, lo, hi } = f, kL = 1 / (hi - lo), N = RES - 1
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3]
    if (!a) continue
    const fx = borne((uv[i] / 255) * N, N), fy = borne((1 - uv[i + 1] / 255) * N, N)
    const x0 = fx | 0, y0 = fy | 0, x1 = Math.min(N, x0 + 1), y1 = Math.min(N, y0 + 1), tx = fx - x0, ty = fy - y0
    const p00 = (y0 * RES + x0) * 4, p10 = (y0 * RES + x1) * 4, p01 = (y1 * RES + x0) * 4, p11 = (y1 * RES + x1) * 4
    const lum = borne((px[i] - lo) * kL), mul = 1 - DOSE + DOSE * (0.3 + lum)
    const reflet = Math.max(0, lum - REFLET_SEUIL) * REFLET_FORCE * DOSE
    for (let j = 0; j < 3; j++) {
      const v = (ph[p00 + j] * (1 - tx) + ph[p10 + j] * tx) * (1 - ty) + (ph[p01 + j] * (1 - tx) + ph[p11 + j] * tx) * ty
      o[i + j] = v * mul + reflet // o est borné à 255 (Uint8ClampedArray)
    }
    o[i + 3] = a
  }
}

/** Sans photo : mer et terres dans la couleur de la chaîne, la mer plus sombre (même teinte). */
function teinter(f: Forme, color: number[], o: Uint8ClampedArray) {
  let [h, s, l] = rgbHsl(color)
  l = Math.max(0.46, Math.min(0.64, l))
  if (s > 0.12) s = Math.max(0.45, s) // une chaîne grise reste grise
  const mer = rampe(h, Math.min(1, s * 1.05), l * 0.68), terre = rampe(h, s * 0.9, Math.min(0.76, l * 1.16))
  const { px, lo, hi } = f, k = 255 / (hi - lo)
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3]
    if (!a) continue
    const li = (borne((px[i] - lo) * k, 255) | 0) * 3, m = px[i + 1] / 255
    for (let j = 0; j < 3; j++) o[i + j] = mer[li + j] + (terre[li + j] - mer[li + j]) * m
    o[i + 3] = a
  }
}

const police = () => getComputedStyle(document.body).fontFamily

function composer(f: Forme, ph: HTMLImageElement | null, color: string, lettre: string): HTMLCanvasElement {
  const [c, x] = toile(), out = x.createImageData(RES, RES), col = rgb(color)
  if (ph) coller(f, pixelsPhoto(ph), out.data)
  else teinter(f, col, out.data)
  x.putImageData(out, 0, 0)
  // couleur de la chaîne, exacte (sans décalage de teinte), en bande le long du contour, à l'intérieur de la planète
  const m = RES / 2, r = RES / (2 * HALF), g = x.createRadialGradient(m, m, r * 0.7, m, m, r * 1.1)
  for (const [t, a] of [[0, 0], [0.62, 0.38], [1, 0.95]]) g.addColorStop(t, `rgba(${col.join(",")},${a})`)
  x.globalCompositeOperation = "source-atop"
  x.fillStyle = g
  x.fillRect(0, 0, RES, RES)
  x.globalCompositeOperation = "source-over"
  if (!ph && lettre) {
    x.font = `600 ${r * 0.95}px ${police()}`
    x.textAlign = "center"; x.textBaseline = "middle"
    x.shadowColor = "rgba(5,4,26,.8)"; x.shadowBlur = r * 0.12; x.shadowOffsetY = r * 0.04
    x.fillStyle = "#fafafa"
    x.fillText(lettre, m, m + r * 0.05)
  }
  return c
}

// ---------------------------------------------------------------- cache, file par tranches, remplacement des images
interface Entree { id: string; url: string }
const cache = new Map<string, Entree>()
const parId = new Map<string, Entree>()

// Composer prend quelques millisecondes : on s'arrête toutes les 6 ms pour laisser la page se dessiner (la Carte anime).
const file: (() => void)[] = []
let enCours = false
function tranche() {
  const t0 = performance.now()
  while (file.length && performance.now() - t0 < 6) {
    try { file.shift()!() } catch { /* cette planète garde son disque d'attente */ }
  }
  if (file.length) setTimeout(tranche, 16)
  else enCours = false
}

let pose = 0
const planifierPose = () => { pose ||= window.setTimeout(poser, 40) }
/** Remplace l'image des seules planètes dont la composition est arrivée : rien d'autre n'est redessiné. */
function poser() {
  pose = 0
  for (const el of document.querySelectorAll("[data-planet]")) {
    const e = parId.get(el.getAttribute("data-planet")!)
    if (!e?.url) continue
    const a = el.localName === "image" ? "href" : "src"
    if (el.getAttribute(a) !== e.url) el.setAttribute(a, e.url)
  }
}

/** Adresse blob: de l'image. Encodage immédiat (environ 1 ms pour 160 px) : canvas.toBlob et convertToBlob attendent un temps
 *  mort de la page, rare quand la Carte anime (0,5 à 1 s par image mesurées). */
function adresse(c: HTMLCanvasElement): string {
  const bin = atob(c.toDataURL("image/png").split(",")[1])
  return URL.createObjectURL(new Blob([Uint8Array.from(bin, (x) => x.charCodeAt(0))], { type: "image/png" }))
}

async function preparer(e: Entree, id: string, color: string, url: string, lettre: string) {
  const [f, ph] = await Promise.all([forme(id), url ? photo(url) : null, lettre ? document.fonts?.load(`600 64px ${police()}`) : null])
  file.push(() => {
    const u = adresse(composer(f, ph, color, lettre)), im = new Image()
    im.src = u
    // image décodée avant d'être posée : pas de trou le temps d'une image à l'écran
    im.decode().catch(() => {}).then(() => { e.url = u; planifierPose() })
  })
  if (!enCours) { enCours = true; setTimeout(tranche, 0) }
}

function entree(name: string, color: string, url: string, initial: boolean): Entree {
  const id = FORMES[hash(name.toLowerCase()) % FORMES.length]
  const lettre = initial ? ([...(name || "?")][0] || "?").toUpperCase() : ""
  const cle = [id, color, url, lettre].join("\n")
  let e = cache.get(cle)
  if (!e) {
    e = { id: String(cache.size), url: "" }
    cache.set(cle, e)
    parId.set(e.id, e)
    preparer(e, id, color, url, lettre).catch(() => {}) // en cas d'échec, le disque d'attente reste
  }
  return e
}

const photoDe = (name: string, img?: string) => {
  const u = img || window.channelPhoto?.(name) || ""
  return /^(https:|blob:|data:image\/)/.test(u) ? u : ""
}

/** En attendant la composition : un disque pâle de la couleur de la chaîne. */
const attente = (color: string) =>
  "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -60 120 120"><circle r="50" fill="${color}" fill-opacity=".35"/></svg>`)

function marques(name: string, color: string, img: string | undefined, initial: boolean) {
  const e = entree(name, color, photoDe(name, img), initial)
  return { src: e.url || attente(color), data: `data-planet="${e.id}" data-pc="${esc(name)}" data-col="${esc(color)}" data-pi="${initial ? 1 : 0}"` }
}

const RING_BACK = '<svg class="pn-ring" viewBox="-70 -70 140 140" aria-hidden="true"><path d="M-66 0A66 17 0 0 1 66 0"/></svg>'
const RING_FRONT = '<svg class="pn-ring pn-front" viewBox="-70 -70 140 140" aria-hidden="true"><path d="M-66 0A66 17 0 0 0 66 0"/></svg>'

/** Balisage intérieur de la planète d'une chaîne (HTML). initial : initiale quand la photo manque (pas sous 20 px). */
export function planetInner(name: string, ring = false, color?: string, img?: string, initial = true): string {
  const m = marques(name, planetColor(name, color), img, initial)
  return (ring ? RING_BACK : "") + `<img class="pn-img" alt="" draggable="false" src="${esc(m.src)}" ${m.data}>` + (ring ? RING_FRONT : "")
}

/** La planète de la Carte : mêmes image et anneau, en SVG, pour un rayon 1 (le moteur la place et la met à l'échelle). */
function planetSvgBody(name: string, color: string, img?: string, ring = false): string {
  const m = marques(name, color, img, true)
  const arc = (devant: number) => (ring ? `<path class="pn-orb${devant ? "" : " pn-back"}" style="color:${esc(color)}" transform="rotate(-18)" d="M-1.32 0A1.32 .34 0 0 ${devant ? 0 : 1} 1.32 0"/>` : "")
  return arc(0) + `<image class="pn-img" x="${-HALF}" y="${-HALF}" width="${2 * HALF}" height="${2 * HALF}" href="${esc(m.src)}" ${m.data}/>` + arc(1)
}

function planetPhotoChanged(name: string) {
  const url = photoDe(name)
  if (!url) return
  for (const el of document.querySelectorAll("[data-planet]")) {
    if (el.getAttribute("data-pc") !== name) continue
    el.setAttribute("data-planet", entree(name, el.getAttribute("data-col")!, url, el.getAttribute("data-pi") === "1").id)
  }
  planifierPose()
}

/** La chaîne porte-t-elle un anneau dans la vue en cours ? */
export const hasRing = (name: string) => !!window.planetRing?.has(name)

if (typeof window !== "undefined") {
  window.planetInner = planetInner
  window.planetSvgBody = planetSvgBody
  window.planetPhotoChanged = planetPhotoChanged
}
