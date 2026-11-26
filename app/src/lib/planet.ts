// Planète peinte d'une chaîne : un corps rond dans la couleur de la chaîne, un motif propre à son nom (bandes, cratères ou taches,
// toujours le même pour le même nom), son initiale au centre, et un anneau fin pour les chaînes les plus fortes de la vue en cours.
// Une seule source pour les deux mondes : ChannelAvatar (React) l'utilise directement, et l'ancien code (legacy.js, fonction av())
// l'appelle par window.planetInner. Le balisage est une chaîne : pas de dégradé SVG à identifiant (une centaine de planètes
// partagerait des identifiants), le dégradé du corps est en CSS (.planet dans index.css). Pas de photo : l'avatar ne sert plus ici.

declare global {
  interface Window {
    /** Balisage intérieur d'une planète (corps peint, initiale, anneau éventuel) ; l'enveloppe .planet est posée par l'appelant. */
    planetInner?: (name: string, ring?: boolean) => string
    /** Chaînes qui portent un anneau (les 3 plus fortes de la vue en cours), tenu à jour par l'ancien code à chaque rendu. */
    planetRing?: Set<string>
  }
}

const hash = (s: string) => {
  let h = 2166136261
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const n1 = (x: number) => Math.round(x * 10) / 10
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!)

/** Couleur de repli stable (teinte tirée du nom) quand une chaîne n'a pas de couleur. */
export function planetColor(name: string, color?: string): string {
  return color || `hsl(${hash(name.toLowerCase()) % 360} 60% 58%)`
}

/** Motif peint (viewBox 0 0 100 100, rayon 50), en trois variantes tirées du nom. Les formes sont claires ou sombres et transparentes : elles s'accordent à toute couleur. */
function pattern(name: string): string {
  const h = hash(name.toLowerCase()), r = rng(h)
  const variant = h % 3
  let s = ""
  if (variant === 0) {
    // bandes ondulées, inclinées
    const n = 3 + Math.floor(r() * 2), step = 76 / n
    let bands = ""
    for (let i = 0; i < n; i++) {
      const y = 12 + i * step + r() * 6, hh = 7 + r() * 9, w = (r() < 0.5 ? -1 : 1) * (3 + r() * 3)
      bands += `<path class="${i % 2 ? "pn-dark" : "pn-light"}" fill-opacity="${i % 2 ? 0.26 : 0.24}" d="M-10 ${n1(y)}Q20 ${n1(y - w)} 50 ${n1(y)}T110 ${n1(y)}L110 ${n1(y + hh)}Q80 ${n1(y + hh + w)} 50 ${n1(y + hh)}T-10 ${n1(y + hh)}Z"/>`
    }
    s = `<g transform="rotate(${n1(r() * 50 - 25)} 50 50)">${bands}</g>`
  } else if (variant === 1) {
    // cratères : un creux sombre et un croissant clair du côté éclairé
    for (let i = 0; i < 4; i++) {
      const a = r() * 6.283, d = 6 + r() * 30, cx = 50 + Math.cos(a) * d, cy = 50 + Math.sin(a) * d, rr = 7 + r() * 9
      s += `<ellipse class="pn-dark" fill-opacity=".3" cx="${n1(cx)}" cy="${n1(cy)}" rx="${n1(rr)}" ry="${n1(rr * 0.8)}"/>`
        + `<ellipse class="pn-line" stroke-opacity=".34" stroke-width="2.2" cx="${n1(cx + 1.2)}" cy="${n1(cy + 1.6)}" rx="${n1(rr)}" ry="${n1(rr * 0.8)}"/>`
    }
  } else {
    // taches marbrées, claires et sombres
    for (let i = 0; i < 5; i++) {
      const a = r() * 6.283, d = r() * 36, cx = 50 + Math.cos(a) * d, cy = 50 + Math.sin(a) * d
      const rx = 10 + r() * 12, ry = 5 + r() * 6, rot = r() * 180
      s += `<ellipse class="${i % 2 ? "pn-dark" : "pn-light"}" fill-opacity="${i % 2 ? 0.26 : 0.24}" transform="rotate(${n1(rot)} ${n1(cx)} ${n1(cy)})" cx="${n1(cx)}" cy="${n1(cy)}" rx="${n1(rx)}" ry="${n1(ry)}"/>`
    }
  }
  return s
}

const RING_BACK = '<svg class="pn-ring" viewBox="-70 -70 140 140" aria-hidden="true"><path d="M-66 0A66 17 0 0 1 66 0"/></svg>'
const RING_FRONT = '<svg class="pn-ring pn-front" viewBox="-70 -70 140 140" aria-hidden="true"><path d="M-66 0A66 17 0 0 0 66 0"/></svg>'

const cache = new Map<string, string>()

/** Balisage intérieur de la planète d'une chaîne. L'initiale est masquée par le CSS sous 20 px (voir .planet[data-xs] dans index.css). */
export function planetInner(name: string, ring = false): string {
  const key = name + (ring ? "|r" : "")
  let html = cache.get(key)
  if (html === undefined) {
    const letter = esc(([...(name || "?")][0] || "?").toUpperCase())
    html = (ring ? RING_BACK : "")
      + `<svg class="pn-body" viewBox="0 0 100 100" aria-hidden="true">${pattern(name || "?")}</svg>`
      + `<b class="pn-init">${letter}</b>`
      + (ring ? RING_FRONT : "")
    cache.set(key, html)
  }
  return html
}

/** La chaîne porte-t-elle un anneau dans la vue en cours ? */
export const hasRing = (name: string) => !!window.planetRing?.has(name)

if (typeof window !== "undefined") window.planetInner = planetInner
