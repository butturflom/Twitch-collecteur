// Intro de la page d'accueil (chantier B, storyboard B1 de IDEES.md). Calque posé PAR-DESSUS la page d'accueil (landing.tsx), qui est déjà
// dans la page dessous, invisible et inerte. Landing décide si l'intro se joue (une seule fois, drapeau `to2-intro-seen`) et la monte ici.
// Le moteur est Three.js (noyau seulement, imports ciblés, sans @react-three/fiber) : la scène est créée dans un useEffect et détruite
// au démontage. Séquence de 4,0 s au total, pilotée par l'horloge (pas par le nombre d'images) : 0 nuit, 1 approche, 2 mise en orbite,
// 3 titre « Observer », 4 arrivée : la galaxie glisse vers l'illustration de la page (écran large) ou s'efface (sous 1 024 px), puis le
// calque est retiré et la page d'accueil, intacte, prend le relais.
//
// Galaxie : décidée UNE SEULE FOIS, à 0,3 s, et jamais changée ensuite.
//  - si le tableau de bord connaît déjà des chaînes en direct à ce moment-là (données de la Vue d'ensemble, `useOverviewData`, aucune
//    requête de plus) : ce sont elles, 12 au plus, en planètes de 20 à 40 px (`ChannelAvatar` posé en HTML, car une photo Twitch en
//    texture WebGL serait refusée sous file://) ;
//  - sinon : l'illustration de landing-map.tsx (douze planètes de formes, sans nom ni chiffre).
// Jamais de nom de chaîne ni de chiffre à l'écran.
import { useEffect, useRef, useState } from "react"
import {
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  RingGeometry,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three"
import { Button } from "@/components/ui/button"
import { ChannelAvatar } from "@/components/channel-avatar"
import { useOverviewData, type ChannelInfo, type Who } from "@/legacy/bridge"

export interface IntroProps {
  /** L'arrivée commence (plan 4, ou tout de suite si on passe l'intro) : la page d'accueil se révèle. `fast` : fondu de 0,2 s. */
  onArrive: (fast: boolean) => void
  /** L'intro est finie (fin naturelle, « Passer », Échap, clic) ou a échoué : le calque peut être retiré. */
  onDone: () => void
  /** Cadre de l'illustration de la page d'accueil (pour y ranger la galaxie), ou null si on ne le trouve pas. */
  getTarget: () => DOMRect | null
}

// ---------------------------------------------------------------------------------------------------------------------------
// Galaxie : douze emplacements. Les neuf premiers sont ceux de landing-map.tsx (mêmes rayons d'orbite 92, 152 et 214, mêmes angles,
// mêmes couleurs) ; j, k et l complètent à douze. Rangés de l'orbite intérieure vers l'extérieure : en direct, les chaînes les plus
// regardées prennent les premiers.
// ---------------------------------------------------------------------------------------------------------------------------
type Token = "--primary" | "--primary-soft" | "--map-link" | "--star-gold"
interface Slot { id: string; r: number; deg: number; size: number; fill: Token }
const SLOTS: Slot[] = [
  { id: "a", r: 92, deg: 25, size: 11, fill: "--primary-soft" },
  { id: "b", r: 92, deg: 205, size: 8, fill: "--map-link" },
  { id: "j", r: 92, deg: 115, size: 9, fill: "--primary" },
  { id: "c", r: 152, deg: 78, size: 15, fill: "--primary" },
  { id: "d", r: 152, deg: 160, size: 10, fill: "--star-gold" },
  { id: "e", r: 152, deg: 300, size: 13, fill: "--primary-soft" },
  { id: "k", r: 152, deg: 235, size: 9, fill: "--map-link" },
  { id: "f", r: 214, deg: 38, size: 11, fill: "--map-link" },
  { id: "g", r: 214, deg: 128, size: 16, fill: "--primary" },
  { id: "h", r: 214, deg: 250, size: 9, fill: "--primary-soft" },
  { id: "i", r: 214, deg: 335, size: 12, fill: "--primary" },
  { id: "l", r: 214, deg: 190, size: 10, fill: "--star-gold" },
]
const LINKS: [string, string][] = [["a", "c"], ["c", "d"], ["d", "g"], ["g", "h"], ["b", "e"], ["e", "i"], ["i", "f"], ["a", "f"], ["j", "c"], ["k", "l"]]
const ORBITS = [92, 152, 214]
const FALLBACK: Record<Token | "--primary-strong" | "--foreground", string> = {
  "--primary": "#8b7cff",
  "--primary-soft": "#b3a9ff",
  "--map-link": "#e6e1ff",
  "--star-gold": "#ffc46b",
  "--primary-strong": "#6f5ff0",
  "--foreground": "#f4f4f5",
}

/** Une chaîne en direct devenue planète : sa photo et sa couleur, et son diamètre (20 à 40 px à l'échelle de l'illustration). */
interface LivePlanet extends Who { d: number }
const MAX_LIVE = 12

/** Les chaînes en direct connues du tableau de bord, les plus regardées d'abord. Vide si aucune n'est connue. */
function pickLive(channels: ChannelInfo[] | undefined): LivePlanet[] {
  const l = (channels ?? []).filter((c) => c.live === true).sort((a, b) => (b.viewers ?? 0) - (a.viewers ?? 0)).slice(0, MAX_LIVE)
  if (!l.length) return []
  // Taille selon la racine carrée des viewers, entre 20 et 40 px ; le chiffre lui-même n'est jamais affiché.
  const roots = l.map((c) => Math.sqrt(Math.max(0, c.viewers ?? 0)))
  const lo = Math.min(...roots)
  const hi = Math.max(...roots)
  return l.map((c, i) => ({ c: c.c, color: c.color, img: c.img, d: hi > lo ? 20 + (20 * (roots[i] - lo)) / (hi - lo) : 30 }))
}

// ---------------------------------------------------------------------------------------------------------------------------
// Chronologie du storyboard (secondes)
// ---------------------------------------------------------------------------------------------------------------------------
const END = 4.0
const T_APPROACH = 0.3 // début du plan 1, et instant de la décision « galaxie en direct ou illustrée »
const T_ORBIT = 1.7 // début du plan 2
const T_TITLE = 2.5 // début du plan 3
const T_ARRIVAL = 3.5 // début du plan 4
const T_LAST_FADE = 3.8 // la galaxie s'efface alors, en laissant l'illustration de la page dessous
const SPEED_FAST = 4 // °/s pendant l'approche
const SPEED_SLOW = 1.5 // °/s : la vitesse de .landing-orbit (un tour en 240 s)
const BOX = 520 // le viewBox de landing-map.tsx : une unité de la scène = une unité du SVG
const SKIP_MS = 200 // « Passer » : fondu du calque en 0,2 s

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const smooth = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k) }

/** cubic-bezier(.32,.72,0,1) : la courbe du tiroir (DESIGN.md), rapide au début puis de plus en plus lente. */
const drawer = ((x1: number, y1: number, x2: number, y2: number) => (x: number) => {
  if (x <= 0) return 0
  if (x >= 1) return 1
  let lo = 0
  let hi = 1
  let u = x
  for (let i = 0; i < 24; i++) {
    const cx = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u * u * x2 + u ** 3
    if (Math.abs(cx - x) < 1e-5) break
    if (cx < x) lo = u
    else hi = u
    u = (lo + hi) / 2
  }
  return 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u * u * y2 + u ** 3
})(0.32, 0.72, 0, 1)

/** Angle de rotation du disque à l'instant t, en degrés (intégrale de la vitesse : 4 °/s, qui ralentit à 1,5 °/s pendant le plan 2). */
function spinDeg(t: number): number {
  const l2 = T_TITLE - T_ORBIT
  if (t <= T_ORBIT) return SPEED_FAST * Math.max(t, 0)
  const u = clamp01((t - T_ORBIT) / l2)
  // intégrale de smoothstep : u³ − u⁴/2
  const during = SPEED_FAST * l2 * u - (SPEED_FAST - SPEED_SLOW) * l2 * (u ** 3 - u ** 4 / 2)
  const after = t > T_TITLE ? SPEED_SLOW * (t - T_TITLE) : 0
  return SPEED_FAST * T_ORBIT + during + after
}

/** Échelle (part de la taille « plein écran »), inclinaison (°) et progression de l'arrivée (0 → 1) à l'instant t. */
function camera(t: number) {
  let scale = 0.35
  let tilt = 55
  if (t > T_ORBIT) {
    const k = smooth((t - T_ORBIT) / (T_TITLE - T_ORBIT))
    scale = lerp(0.85, 1, k)
    tilt = lerp(20, 0, k)
  } else if (t > T_APPROACH) {
    const k = drawer((t - T_APPROACH) / (T_ORBIT - T_APPROACH))
    scale = lerp(0.35, 0.85, k)
    tilt = lerp(55, 20, k)
  }
  return { scale, tilt, glide: drawer((t - T_ARRIVAL) / (END - T_ARRIVAL)) }
}

// ---------------------------------------------------------------------------------------------------------------------------
// Aides de scène
// ---------------------------------------------------------------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rgba = (c: Color, a: number) => c.getStyle().replace("rgb(", "rgba(").replace(")", `,${a})`)

function discTexture(draw: (g: CanvasGradient) => void, size: number): CanvasTexture {
  const cv = document.createElement("canvas")
  cv.width = cv.height = size
  const ctx = cv.getContext("2d")!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  draw(g)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new CanvasTexture(cv)
  tex.colorSpace = SRGBColorSpace
  return tex
}

type Fadable = MeshBasicMaterial | LineBasicMaterial | PointsMaterial
interface Fade { mat: Fadable; base: number; start: number; dur: number; kind: "galaxy" | "dust" }

// ---------------------------------------------------------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------------------------------------------------------
export function Intro({ onArrive, onDone, getTarget }: IntroProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)
  const veilRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const skipRef = useRef<HTMLDivElement>(null)
  const avatarEls = useRef<(HTMLDivElement | null)[]>([])
  const skipNow = useRef<() => void>(() => {})
  const [live, setLive] = useState<LivePlanet[]>([]) // rempli une seule fois, à la décision de 0,3 s

  // Les chaînes en direct déjà connues du tableau de bord : lues à 0,3 s par la scène, sans que le composant se redessine pour elles.
  const overview = useOverviewData()
  const overviewRef = useRef(overview)
  overviewRef.current = overview
  const cbs = useRef({ onArrive, onDone, getTarget })
  cbs.current = { onArrive, onDone, getTarget }

  useEffect(() => {
    const host = hostRef.current!
    const overlay = overlayRef.current!

    let finished = false
    let skipped = false
    let arrived = false
    let raf = 0
    let timer = 0
    const cleanups: (() => void)[] = []
    const finish = () => {
      if (finished) return
      finished = true
      cbs.current.onDone()
    }

    // Couleurs : les jetons de DESIGN.md lus dans la page, avec leur valeur écrite en secours.
    const css = getComputedStyle(document.documentElement)
    const tok = (n: keyof typeof FALLBACK) => new Color(css.getPropertyValue(n).trim() || FALLBACK[n])

    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
    } catch {
      // Pas de WebGL : pas d'intro, la page d'accueil s'affiche directement.
      cbs.current.onArrive(true)
      finish()
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x000000, 0)
    host.appendChild(renderer.domElement)
    renderer.domElement.style.display = "block"

    const scene = new Scene()
    const D = 1200
    const cam = new PerspectiveCamera(35, 1, 10, 5000)
    cam.position.set(0, 0, D)

    const root = new Group() // position, échelle et inclinaison
    const spin = new Group() // rotation du disque dans son plan
    root.add(spin)
    scene.add(root)

    const geoms: BufferGeometry[] = []
    const mats: Fadable[] = []
    const texs: CanvasTexture[] = []
    const fades: Fade[] = []
    const keep = <T extends { dispose(): void }>(list: T[], x: T) => { list.push(x); return x }
    const fade = (mat: Fadable, base: number, start: number, dur: number, kind: Fade["kind"] = "galaxy") => {
      mat.opacity = 0
      fades.push({ mat, base, start, dur, kind })
    }
    const basic = (color: Color, base: number, start: number, dur: number) => {
      const m = keep(mats, new MeshBasicMaterial({ color, transparent: true, opacity: 0, depthTest: false, depthWrite: false })) as MeshBasicMaterial
      fade(m, base, start, dur)
      return m
    }

    // Voile lumineux derrière l'astre : le dégradé radial de landing-map.tsx.
    const primary = tok("--primary")
    const haloTex = keep(texs, discTexture((g) => {
      g.addColorStop(0, rgba(primary, 0.38))
      g.addColorStop(0.55, rgba(primary, 0.08))
      g.addColorStop(1, rgba(primary, 0))
    }, 256))
    const planeGeom = keep(geoms, new PlaneGeometry(500, 500))
    const haloMat = keep(mats, new MeshBasicMaterial({ map: haloTex, transparent: true, depthTest: false, depthWrite: false })) as MeshBasicMaterial
    fade(haloMat, 1, T_APPROACH, 0.3)
    const halo = new Mesh(planeGeom, haloMat)
    halo.renderOrder = 0
    spin.add(halo)

    // Poussière d'étoiles : environ 180 points en deux bras spiraux, sans scintillement.
    const dotTex = keep(texs, discTexture((g) => {
      g.addColorStop(0, "rgba(255,255,255,1)")
      g.addColorStop(0.6, "rgba(255,255,255,1)")
      g.addColorStop(1, "rgba(255,255,255,0)")
    }, 32))
    const rnd = mulberry32(2511)
    const dustSet = (n: number, color: Color, opacity: number, size: number) => {
      const pos = new Float32Array(n * 3)
      for (let i = 0; i < n; i++) {
        const arm = i % 2
        const r = 22 + 232 * Math.sqrt(rnd())
        const th = arm * Math.PI + r * 0.021 + (rnd() - 0.5) * 0.7
        pos[i * 3] = r * Math.cos(th)
        pos[i * 3 + 1] = -r * Math.sin(th)
        pos[i * 3 + 2] = (rnd() - 0.5) * 26 // un peu d'épaisseur : la parallaxe se voit pendant l'inclinaison
      }
      const g = keep(geoms, new BufferGeometry())
      g.setAttribute("position", new Float32BufferAttribute(pos, 3))
      const m = keep(mats, new PointsMaterial({ color, size, map: dotTex, transparent: true, depthTest: false, depthWrite: false, sizeAttenuation: true })) as PointsMaterial
      fade(m, opacity, 0, 0.3, "dust")
      const p = new Points(g, m)
      p.renderOrder = 1
      spin.add(p)
    }
    dustSet(110, tok("--map-link"), 0.3, 1.5)
    dustSet(40, tok("--map-link"), 0.6, 2.2)
    dustSet(30, tok("--star-gold"), 0.45, 1.8)

    // Orbites (traits fins, tracés au plan 2).
    const link = tok("--map-link")
    const orbitLines: { line: Line; n: number }[] = []
    for (const r of ORBITS) {
      const n = 129
      const pts = new Float32Array(n * 3)
      for (let i = 0; i < n; i++) {
        const a = (i / (n - 1)) * Math.PI * 2
        pts[i * 3] = r * Math.cos(a)
        pts[i * 3 + 1] = r * Math.sin(a)
      }
      const g = keep(geoms, new BufferGeometry())
      g.setAttribute("position", new Float32BufferAttribute(pts, 3))
      g.setDrawRange(0, 0)
      const m = keep(mats, new LineBasicMaterial({ color: link, transparent: true, depthTest: false, depthWrite: false })) as LineBasicMaterial
      fade(m, 0.12, 0, 0.01)
      const line = new Line(g, m)
      line.renderOrder = 2
      spin.add(line)
      orbitLines.push({ line, n })
    }

    // L'astre central : Twitch.
    const sphere = keep(geoms, new SphereGeometry(1, 22, 14))
    const core = new Mesh(sphere, basic(tok("--primary-strong"), 1, T_APPROACH, 0.3))
    core.scale.setScalar(34)
    core.renderOrder = 6
    const ringGeom = keep(geoms, new RingGeometry(33.25, 34.75, 72))
    const ring = new Mesh(ringGeom, basic(tok("--primary-soft"), 0.7, T_APPROACH, 0.3))
    ring.renderOrder = 7
    const glintGeom = keep(geoms, new CircleGeometry(9, 28))
    const glint = new Mesh(glintGeom, basic(tok("--map-link"), 0.3, T_APPROACH, 0.3))
    glint.position.set(-9, 10, 1)
    glint.renderOrder = 8
    spin.add(core, ring, glint)

    // ---- Planètes et liens : construits UNE fois, à la décision de 0,3 s (galaxie en direct ou illustrée), jamais refaits.
    const linkLines: { attr: Float32BufferAttribute; a: readonly [number, number]; b: readonly [number, number] }[] = []
    const anchors: Object3D[] = [] // en direct : un point d'ancrage par chaîne, l'avatar HTML le suit à l'écran
    let liveSizes: number[] = []
    let decided = false
    const decide = () => {
      decided = true
      const lv = pickLive(overviewRef.current?.channels)
      const slots = lv.length ? SLOTS.slice(0, lv.length) : SLOTS // en direct : les plus regardées sur l'orbite intérieure
      if (lv.length) {
        liveSizes = lv.map((p) => p.d)
        setLive(lv)
      }

      const at = (s: Slot) => {
        const a = (s.deg * Math.PI) / 180
        return [s.r * Math.cos(a), -s.r * Math.sin(a)] as const
      }
      const byId = new Map(slots.map((s) => [s.id, s]))
      for (const [ia, ib] of LINKS) {
        const sa = byId.get(ia)
        const sb = byId.get(ib)
        if (!sa || !sb) continue // en direct, un lien n'existe que si ses deux planètes existent
        const a = at(sa)
        const b = at(sb)
        const attr = new Float32BufferAttribute([a[0], a[1], 0, a[0], a[1], 0], 3)
        const g = keep(geoms, new BufferGeometry())
        g.setAttribute("position", attr)
        const m = keep(mats, new LineBasicMaterial({ color: link, transparent: true, depthTest: false, depthWrite: false })) as LineBasicMaterial
        fade(m, 0.34, 0, 0.01)
        const line = new Line(g, m)
        line.renderOrder = 3
        spin.add(line)
        linkLines.push({ attr, a, b })
      }

      // Elles s'allument toutes les 0,08 s (fondu de 0,3 s), des orbites internes vers l'externe.
      slots.forEach((s, i) => {
        const [x, y] = at(s)
        if (lv.length) {
          const anchor = new Object3D()
          anchor.position.set(x, y, 0)
          spin.add(anchor)
          anchors.push(anchor)
          return
        }
        const col = tok(s.fill)
        const start = T_APPROACH + i * 0.08
        const body = new Mesh(sphere, basic(col, 0.92, start, 0.3))
        body.scale.setScalar(s.size)
        body.position.set(x, y, 0)
        body.renderOrder = 5
        const atmos = new Mesh(sphere, basic(col, 0.1, start, 0.3))
        atmos.scale.setScalar(s.size + 5)
        atmos.position.set(x, y, 0)
        atmos.renderOrder = 4
        spin.add(atmos, body)
      })
    }

    // ---- Mise en page : taille de l'écran, échelle plein cadre, pose finale (le cadre de l'illustration sur écran large)
    let W = 1
    let H = 1
    let ppu = 1 // pixels par unité de scène, au plan de la galaxie
    let hero = 1 // échelle qui fait tenir la galaxie dans l'écran
    let wide = false
    let finalScale = 1
    let finalX = 0
    let finalY = 0
    let measured = false
    const measureTarget = () => {
      measured = true
      const r = wide ? cbs.current.getTarget() : null
      if (r && r.width > 0) {
        // Le vrai cadre de l'illustration, mesuré dans la page d'accueil dessous : la galaxie s'y range au pixel près.
        finalScale = r.width / (BOX * ppu)
        finalX = (r.left + r.width / 2 - W / 2) / ppu
        finalY = -(r.top + r.height / 2 - H / 2) / ppu
      } else {
        const finalPx = Math.min(BOX, W * 0.4, H * 0.8)
        finalScale = finalPx / (BOX * ppu)
        finalX = (W * 0.72 - W / 2) / ppu
        finalY = 0
      }
    }
    const layout = () => {
      W = Math.max(host.clientWidth, 1)
      H = Math.max(host.clientHeight, 1)
      renderer.setSize(W, H)
      cam.aspect = W / H
      cam.updateProjectionMatrix()
      ppu = H / (2 * D * Math.tan((cam.fov * Math.PI) / 360))
      hero = (Math.min(W, H) * 0.95) / (BOX * ppu)
      wide = W >= 1024 // le seuil `lg` de la page d'accueil : en dessous, l'illustration est sous le texte
      measureTarget()
    }

    // ---- Une image à l'instant t
    const vec = new Vector3()
    const apply = (t: number) => {
      if (!decided && t >= T_APPROACH) decide()
      // L'animation d'entrée de la page d'accueil dessous est finie : on remesure le cadre de l'illustration juste avant l'arrivée.
      if (!measured && t >= T_ARRIVAL - 0.1) measureTarget()
      if (!arrived && t >= T_ARRIVAL) {
        arrived = true
        cbs.current.onArrive(false)
      }

      const c = camera(t)
      const glide = wide ? c.glide : 0 // sous 1 024 px, pas de déplacement : la galaxie s'efface sur place
      const s = lerp(hero * c.scale, finalScale, glide)
      root.scale.setScalar(s)
      root.position.set(lerp(0, finalX, glide), lerp(0, finalY, glide), 0)
      root.rotation.x = (c.tilt * Math.PI) / 180
      spin.rotation.z = -(spinDeg(t) * Math.PI) / 180

      // Plan 3 : la galaxie descend à 30 % ; plan 4 : sur écran large elle remonte à 100 % puis s'efface sur l'illustration de la page ;
      // sous 1 024 px elle s'efface directement.
      let galaxyAlpha: number
      if (t < T_TITLE) galaxyAlpha = 1
      else if (t < T_ARRIVAL) galaxyAlpha = lerp(1, 0.3, clamp01((t - T_TITLE) / 0.3))
      else if (wide) galaxyAlpha = lerp(0.3, 1, clamp01((t - T_ARRIVAL) / 0.3)) * (1 - clamp01((t - T_LAST_FADE) / (END - T_LAST_FADE)))
      else galaxyAlpha = lerp(0.3, 0, clamp01((t - T_ARRIVAL) / 0.3))
      const dustOut = 1 - clamp01((t - T_ARRIVAL) / 0.3)
      for (const f of fades) {
        const k = drawer((t - f.start) / f.dur)
        f.mat.opacity = f.base * k * galaxyAlpha * (f.kind === "dust" ? dustOut : 1)
      }
      const orbitK = drawer((t - T_ORBIT) / 0.4)
      for (const o of orbitLines) o.line.geometry.setDrawRange(0, Math.ceil(o.n * orbitK))
      const linkK = drawer((t - (T_ORBIT + 0.4)) / 0.4)
      for (const l of linkLines) {
        l.attr.setXYZ(1, lerp(l.a[0], l.b[0], linkK), lerp(l.a[1], l.b[1], linkK), 0)
        l.attr.needsUpdate = true
      }
      renderer.render(scene, cam)

      // En direct : chaque avatar HTML suit son point d'ancrage (position projetée, taille selon la distance), et s'allume comme une planète.
      for (let i = 0; i < anchors.length; i++) {
        const el = avatarEls.current[i]
        if (!el) continue
        anchors[i].getWorldPosition(vec)
        const k = (s * ppu * D) / (D - vec.z) // pixels par unité de scène à cette profondeur
        vec.project(cam)
        const x = (vec.x * 0.5 + 0.5) * W
        const y = (-vec.y * 0.5 + 0.5) * H
        const n = Math.round(liveSizes[i] * 2) // l'avatar est dessiné au double de sa taille (net quand la galaxie grandit), puis réduit
        el.style.transform = `translate(${(x - n / 2).toFixed(2)}px, ${(y - n / 2).toFixed(2)}px) scale(${(k / 2).toFixed(4)})`
        el.style.opacity = String(drawer((t - (T_APPROACH + i * 0.08)) / 0.3) * galaxyAlpha)
      }

      // Habillage HTML : fond, voile, titre « Observer » (masque de gauche à droite), bouton « Passer ». L'en-tête et la légende sont ceux
      // de la page d'accueil, dessous : ils apparaissent avec elle (onArrive).
      const titleIn = drawer((t - 2.6) / 0.5)
      const titleOut = 1 - clamp01((t - T_ARRIVAL) / 0.3)
      if (bgRef.current) bgRef.current.style.opacity = String(1 - clamp01((t - T_ARRIVAL) / 0.3))
      if (veilRef.current) veilRef.current.style.opacity = String(clamp01((t - T_TITLE) / 0.3) * titleOut)
      const title = titleRef.current
      if (title) {
        title.style.clipPath = `inset(0 ${((1 - titleIn) * 100).toFixed(2)}% 0 0)`
        title.style.opacity = String(titleOut)
      }
      const skipEl = skipRef.current
      if (skipEl) {
        const o = 1 - clamp01((t - 3.7) / 0.2)
        skipEl.style.opacity = String(o)
        skipEl.style.pointerEvents = o < 0.5 ? "none" : "auto"
      }
    }

    layout()
    const ro = new ResizeObserver(layout)
    ro.observe(host)

    // ---- « Passer » (bouton, Échap, clic) : le calque s'efface en 0,2 s sur la page d'accueil, qui se révèle en même temps.
    skipNow.current = () => {
      if (skipped || finished) return
      skipped = true
      cancelAnimationFrame(raf)
      cbs.current.onArrive(true)
      overlay.style.transition = `opacity ${SKIP_MS}ms linear`
      overlay.style.opacity = "0"
      if (skipRef.current) skipRef.current.style.pointerEvents = "none"
      timer = window.setTimeout(finish, SKIP_MS)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation() // le premier Échap passe l'intro ; il ne doit pas fermer la page d'accueil
        skipNow.current()
      }
    }
    window.addEventListener("keydown", onKey, true)
    cleanups.push(() => window.removeEventListener("keydown", onKey, true))

    // ---- Lecture : l'horloge décide, pas le nombre d'images. Si l'onglet est caché au chargement, on attend qu'il soit visible.
    let t0 = -1
    const bail = () => {
      // Une erreur de dessin : on laisse la place à la page d'accueil plutôt que de montrer un film cassé.
      cancelAnimationFrame(raf)
      cbs.current.onArrive(true)
      finish()
    }
    const frame = (ts: number) => {
      if (skipped || finished) return
      raf = requestAnimationFrame(frame)
      const now = ts / 1000
      if (t0 < 0) t0 = now
      const t = Math.min(now - t0, END)
      try {
        apply(t)
      } catch (err) {
        console.error(err)
        bail()
        return
      }
      if (t >= END) {
        cancelAnimationFrame(raf)
        finish()
      }
    }
    const start = () => { raf = requestAnimationFrame(frame) }
    if (document.hidden) {
      const onVis = () => {
        if (!document.hidden) {
          document.removeEventListener("visibilitychange", onVis)
          start()
        }
      }
      document.addEventListener("visibilitychange", onVis)
      cleanups.push(() => document.removeEventListener("visibilitychange", onVis))
    } else start()

    return () => {
      finished = true
      cancelAnimationFrame(raf)
      clearTimeout(timer)
      ro.disconnect()
      cleanups.forEach((f) => f())
      geoms.forEach((g) => g.dispose())
      mats.forEach((m) => m.dispose())
      texs.forEach((tx) => tx.dispose())
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[70] overflow-hidden text-foreground" onClick={() => skipNow.current()}>
      {/* Le film : aria-hidden, seul « Passer l'intro » est annoncé aux lecteurs d'écran. */}
      <div aria-hidden="true" className="absolute inset-0">
        <div ref={bgRef} className="absolute inset-0 bg-background" />
        <div ref={hostRef} className="absolute inset-0" />
        {/* En direct : les chaînes sont des planètes HTML (ChannelAvatar), placées image par image sur leur point de la scène. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {live.map((p, i) => {
            const n = Math.round(p.d * 2)
            return (
              <div key={p.c} ref={(el) => { avatarEls.current[i] = el }} className="absolute top-0 left-0" style={{ width: n, height: n, opacity: 0 }}>
                <ChannelAvatar c={p.c} color={p.color} img={p.img} size={n} />
                {/* point rouge « en direct » : fixe, sans pulsation */}
                <span
                  className="absolute rounded-full"
                  style={{ right: "4%", top: "4%", width: n * 0.16, height: n * 0.16, background: "var(--live-red)", boxShadow: "0 0 0 2px var(--background)" }}
                />
              </div>
            )
          })}
        </div>
        <div
          ref={veilRef}
          className="pointer-events-none absolute inset-0 opacity-0"
          style={{ background: "radial-gradient(ellipse 45% 30% at 50% 50%, rgba(9,9,11,0.82), rgba(9,9,11,0.5) 60%, rgba(9,9,11,0) 100%)" }}
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            ref={titleRef}
            className="px-2 py-[0.12em] font-semibold"
            style={{ fontFamily: "var(--font-sans)", letterSpacing: "-0.03em", fontSize: "clamp(2.25rem, 7vw, 4rem)", color: "var(--foreground)", clipPath: "inset(0 100% 0 0)", opacity: 0 }}
          >
            Observer
          </div>
        </div>
      </div>

      <div ref={skipRef} className="absolute right-4 bottom-4 sm:right-6 sm:bottom-6" onClick={(e) => e.stopPropagation()}>
        <Button variant="secondary" autoFocus aria-keyshortcuts="Escape" className="h-11 border border-white/10 bg-popover sm:h-9" onClick={() => skipNow.current()}>
          Passer l'intro
        </Button>
      </div>
    </div>
  )
}
