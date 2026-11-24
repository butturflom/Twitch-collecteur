// Couleur dominante de la photo d'une chaîne, pour accorder l'ambiance de sa carte à son logo.
// Les photos Twitch (static-cdn.jtvnw.net) autorisent la lecture de leurs pixels (CORS ouvert).
import { useEffect, useState } from "react"

/** Teinte neutre pour les photos sans couleur marquée (noir et blanc, gris). */
export const NEUTRAL = "#a1a1aa"

const KEY = "to2-avatar-colors"
const cache = new Map<string, string>()
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, string>
  for (const [k, v] of Object.entries(saved)) cache.set(k, v)
} catch { /* stockage indisponible : on recalculera */ }

function persist() {
  try {
    // on ne garde que les 300 dernières, les liens de photos changent de temps en temps
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries([...cache].slice(-300))))
  } catch { /* tant pis */ }
}

const pending = new Map<string, Promise<string | null>>()

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2
  if (mx === mn) return [0, 0, l]
  const d = mx - mn
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

/** Couleur dominante « vive » des pixels : les teintes saturées comptent plus que le gris ou le fond noir. */
export function dominantColor(data: Uint8ClampedArray): string {
  const BINS = 24
  const w = new Float64Array(BINS), rs = new Float64Array(BINS), gs = new Float64Array(BINS), bs = new Float64Array(BINS)
  let total = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
    const v = mx / 255, s = mx ? (mx - mn) / mx : 0
    total++
    if (v < 0.12 || s < 0.2) continue // presque noir ou presque gris : ne donne pas de teinte
    const h = rgbToHsl(r, g, b)[0]
    const k = Math.floor((h / 360) * BINS) % BINS
    const wt = s * s * v
    w[k] += wt; rs[k] += r * wt; gs[k] += g * wt; bs[k] += b * wt
  }
  if (!total) return NEUTRAL
  // la meilleure teinte, avec ses deux voisines (une couleur à cheval sur deux cases reste une seule couleur)
  let best = 0, bestW = 0
  for (let k = 0; k < BINS; k++) {
    const sum = w[k] + w[(k + 1) % BINS] + w[(k + BINS - 1) % BINS]
    if (sum > bestW) { bestW = sum; best = k }
  }
  if (bestW / total < 0.03) return NEUTRAL // photo quasi sans couleur
  let W = 0, R = 0, G = 0, B = 0
  for (const k of [(best + BINS - 1) % BINS, best, (best + 1) % BINS]) { W += w[k]; R += rs[k]; G += gs[k]; B += bs[k] }
  const [h, s, l] = rgbToHsl(R / W, G / W, B / W)
  // lisible sur fond sombre, sans devenir fluo
  const S = Math.min(Math.max(s, 0.5), 0.85), L = Math.min(Math.max(l, 0.56), 0.7)
  return `hsl(${h.toFixed(0)} ${(S * 100).toFixed(0)}% ${(L * 100).toFixed(0)}%)`
}

function load(url: string): Promise<string | null> {
  let p = pending.get(url)
  if (p) return p
  p = new Promise<string | null>((resolve) => {
    const im = new Image()
    im.crossOrigin = "anonymous"
    im.referrerPolicy = "no-referrer"
    im.decoding = "async"
    im.onload = () => {
      try {
        const n = 32, cv = document.createElement("canvas")
        cv.width = n; cv.height = n
        const ctx = cv.getContext("2d", { willReadFrequently: true })
        if (!ctx) return resolve(null)
        ctx.drawImage(im, 0, 0, n, n)
        const col = dominantColor(ctx.getImageData(0, 0, n, n).data)
        cache.set(url, col)
        persist()
        resolve(col)
      } catch {
        resolve(null) // pixels illisibles (CORS refusé) : on garde la couleur de la chaîne
      }
    }
    im.onerror = () => resolve(null)
    im.src = url
  })
  pending.set(url, p)
  return p
}

/** Couleur tirée de la photo, ou `fallback` tant qu'elle n'est pas connue (ou s'il n'y a pas de photo). */
export function useAvatarColor(img: string | undefined, fallback: string): string {
  const [col, setCol] = useState(() => (img && cache.get(img)) || null)
  useEffect(() => {
    if (!img) return setCol(null)
    const known = cache.get(img)
    if (known) return setCol(known)
    let alive = true
    load(img).then((c) => alive && setCol(c))
    return () => { alive = false }
  }, [img])
  return col ?? fallback
}
