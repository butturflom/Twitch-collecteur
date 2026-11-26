// Prototype E1 (planètes low-poly), en développement seulement : générateur des modèles, sans Three.js.
// Un modèle = une icosphère déformée (plateaux, roc, cratères ou pics), tournée sous un angle tiré de la graine, projetée
// de face, triée de l'arrière vers l'avant et ombrée à plat (une lumière d'en haut à gauche, une faible lumière d'appoint).
// Chaque facette reçoit un des sept tons --t0 (le plus sombre) à --t6 (le plus clair) : le dessin est calculé une fois par
// modèle et posé dans des <defs>, puis repris par <use> avec les tons de la chaîne en variables CSS (elles traversent
// l'arbre cloné du <use>). C'est le même principe que PLANET_DEFS dans la Carte : transposable tel quel au moteur SVG.
// La forme ne porte aucune donnée : elle varie seulement les modèles.

export type Variant = "plateaux" | "roc" | "crateres" | "pics"
export const VARIANTS: { id: Variant; label: string; note: string }[] = [
  { id: "plateaux", label: "Plateaux", note: "continents en relief sur une mer plus sombre" },
  { id: "roc", label: "Roc", note: "astéroïde aux grosses facettes, contour irrégulier" },
  { id: "crateres", label: "Cratères", note: "sphère creusée de trois ou quatre bassins à rebord" },
  { id: "pics", label: "Pics", note: "montagnes coniques, sommets plus clairs" },
]

type V3 = [number, number, number]

export const hash = (s: string) => {
  let h = 2166136261
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

export function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const nz = (v: V3): V3 => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l] }
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const angle = (a: V3, b: V3) => Math.acos(Math.max(-1, Math.min(1, dot(a, b))))
const randDir = (r: () => number): V3 => { const z = r() * 2 - 1, t = r() * 2 * Math.PI, s = Math.sqrt(1 - z * z); return [s * Math.cos(t), s * Math.sin(t), z] }

/** Icosphère à sommets partagés (12, 42 ou 162 sommets ; 20, 80 ou 320 faces) : la déformer garde la surface fermée. */
function icosphere(level: number) {
  const t = (1 + Math.sqrt(5)) / 2
  const verts: V3[] = ([[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]] as V3[]).map(nz)
  let faces: [number, number, number][] = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]]
  for (let k = 0; k < level; k++) {
    const cache = new Map<string, number>()
    const mid = (a: number, b: number) => {
      const key = a < b ? a + "_" + b : b + "_" + a
      let i = cache.get(key)
      if (i === undefined) { const A = verts[a], B = verts[b]; i = verts.push(nz([A[0] + B[0], A[1] + B[1], A[2] + B[2]])) - 1; cache.set(key, i) }
      return i
    }
    faces = faces.flatMap(([a, b, c]) => { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); return [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]] as [number, number, number][] })
  }
  return { verts, faces }
}

/** Rayon de chaque sommet et décalage de ton de chaque face (mer plus sombre, sommets plus clairs), selon la variante. */
function shape(variant: Variant, seed: number, fromView: (v: V3) => V3) {
  const r = rng(seed)
  const level = variant === "roc" ? 1 : 2
  const { verts, faces } = icosphere(level)
  const rad = verts.map(() => 1)
  let shift: (f: [number, number, number]) => number = () => 0
  if (variant === "plateaux") {
    // trois ou quatre continents : un sommet est « terre » s'il tombe dans un des disques, avec un bord dentelé
    const cs = Array.from({ length: 3 + Math.floor(r() * 2) }, () => ({ c: randDir(r), a: 0.55 + r() * 0.4 }))
    const land = verts.map((v) => cs.some((k) => angle(v, k.c) < k.a + (r() - 0.5) * 0.3))
    verts.forEach((_, i) => { rad[i] = land[i] ? 1.04 + (r() < 0.18 ? 0.05 : 0) : 0.93 })
    shift = (f) => (f.every((i) => !land[i]) ? -2 : 0)
  } else if (variant === "roc") {
    // grosses facettes, rayon tiré par sommet : contour irrégulier dès 22 px
    verts.forEach((_, i) => { rad[i] = 0.84 + r() * 0.26 })
    const bump = randDir(r)
    verts.forEach((v, i) => { const d = angle(v, bump); if (d < 0.7) rad[i] += 0.12 * (1 - d / 0.7) })
  } else if (variant === "crateres") {
    verts.forEach((_, i) => { rad[i] = 1 + (r() - 0.5) * 0.03 })
    // deux ou trois grands bassins (les petits disparaissent sous 48 px), le premier tourné vers l'observateur
    const cs = Array.from({ length: 2 + Math.floor(r() * 2) }, (_, j) => ({ c: j === 0 ? fromView(nz([-0.3 + r() * 0.3, -0.15 + r() * 0.3, 1])) : randDir(r), a: 0.46 + r() * 0.22 }))
    const floor = verts.map(() => false)
    verts.forEach((v, i) => {
      for (const k of cs) {
        const d = angle(v, k.c)
        if (d < k.a) { rad[i] -= 0.24 * (1 - (d / k.a) ** 2); floor[i] = true }
        else if (d < k.a * 1.35) rad[i] += 0.07
      }
    })
    shift = (f) => (f.every((i) => floor[i]) ? -2 : f.some((i) => floor[i]) ? -1 : 0)
  } else {
    // pics : cinq à sept cônes hauts, posés sur des sommets du maillage (pointe nette), sommets d'un ton plus clair
    verts.forEach((_, i) => { rad[i] = 0.93 + r() * 0.03 })
    const ps = Array.from({ length: 5 + Math.floor(r() * 3) }, () => ({ c: verts[Math.floor(r() * verts.length)], h: 0.32 + r() * 0.16 }))
    verts.forEach((v, i) => { for (const p of ps) { const d = angle(v, p.c); if (d < 0.36) rad[i] += p.h * (1 - d / 0.36) ** 1.4 } })
    shift = (f) => (f.reduce((s, i) => s + rad[i], 0) / 3 > 1.1 ? 1 : 0)
  }
  return { pts: verts.map((v, i) => [v[0] * rad[i], v[1] * rad[i], v[2] * rad[i]] as V3), faces, shift }
}

// Repère de l'écran : x vers la droite, y vers le bas, z vers l'observateur. Lumière d'en haut à gauche et de face (comme
// la planète Twitch de la Carte), appoint faible d'en bas à droite pour que la face sombre garde ses facettes.
const L = nz([-0.5, -0.62, 0.6])
const FL = nz([0.55, 0.6, 0.2])
const n3 = (x: number) => Math.round(x * 1000) / 1000

export type Model = { id: string; svg: string; faces: number }

/** Dessin d'un modèle (viewBox -1.3 -1.3 2.6 2.6, rayon moyen 1) : des <path> remplis par var(--tN), facettes contiguës de même ton fusionnées. */
export function buildModel(variant: Variant, seed: number): Model {
  const r = rng(seed ^ 0x9e3779b9)
  // angle de vue tiré de la graine : chaque planète montre une autre face de son relief
  const yaw = r() * Math.PI * 2, tilt = -0.25 - r() * 0.35
  const cy = Math.cos(yaw), sy = Math.sin(yaw), ct = Math.cos(tilt), st = Math.sin(tilt)
  // rotation inverse : une direction de l'écran ramenée dans le repère du modèle (pour tourner un relief vers l'observateur)
  const fromView = ([x1, y2, z2]: V3): V3 => { const y = y2 * ct + z2 * st, z1 = -y2 * st + z2 * ct; return [x1 * cy - z1 * sy, y, x1 * sy + z1 * cy] }
  const { pts, faces, shift } = shape(variant, seed, fromView)
  const P = pts.map(([x, y, z]) => { const x1 = x * cy + z * sy, z1 = -x * sy + z * cy; return [x1, y * ct - z1 * st, y * st + z1 * ct] as V3 })
  const vis: { z: number; tone: number; d: string }[] = []
  for (const f of faces) {
    const [A, B, C] = f.map((i) => P[i])
    let n = nz(cross(sub(B, A), sub(C, A)))
    const cen: V3 = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3, (A[2] + B[2] + C[2]) / 3]
    if (dot(n, cen) < 0) n = [-n[0], -n[1], -n[2]] // normale vers l'extérieur
    if (n[2] <= 0.02) continue // face cachée
    const l = Math.min(1, 0.1 + 0.9 * Math.max(0, dot(n, L)) + 0.25 * Math.max(0, dot(n, FL)))
    const tone = Math.max(0, Math.min(6, Math.min(4, Math.floor(l * 5)) + 2 + shift(f)))
    vis.push({ z: cen[2], tone, d: "M" + [A, B, C].map((p) => n3(p[0]) + " " + n3(p[1])).join("L") + "Z" })
  }
  vis.sort((a, b) => a.z - b.z)
  let svg = "", cur = -1, d = ""
  const flush = () => { if (d) svg += `<path style="fill:var(--t${cur});stroke:var(--t${cur})" d="${d}"/>` }
  for (const v of vis) { if (v.tone !== cur) { flush(); cur = v.tone; d = "" } d += v.d }
  flush()
  return { id: `lp-${variant}-${seed.toString(36)}`, svg, faces: vis.length }
}

const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const A = p(a), B = p(b)
  return "#" + A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, "0")).join("")
}

/** Sept tons d'une couleur de chaîne (#rrggbb) : cinq plus sombres, la couleur, une plus claire. */
export function tones(col: string): string[] {
  return [mix(col, "#05030f", 0.8), mix(col, "#05030f", 0.64), mix(col, "#05030f", 0.46), mix(col, "#05030f", 0.28), mix(col, "#05030f", 0.12), col, mix(col, "#ffffff", 0.36)]
}

/** Les violets de la planète Twitch (ceux de l'icosphère actuelle, prolongés d'un ton à chaque bout). */
export const TWITCH_TONES = ["#16073a", "#2a0f66", "#4c1d95", "#6d28d9", "#7c3aed", "#9146ff", "#b794ff"]

export const toneVars = (t: string[]) => Object.fromEntries(t.map((c, i) => [`--t${i}`, c])) as Record<string, string>

/** Couleur plus sombre de la chaîne, pour le fond de l'initiale du pin's (texte #f4f4f5 dessus). */
export const pinBg = (col: string) => mix(col, "#05030f", 0.55)
