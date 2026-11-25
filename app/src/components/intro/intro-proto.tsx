// Prototype B2 de l'intro de la page d'accueil (storyboard B1 de IDEES.md), isolé : il ne s'affiche que sur l'adresse `?intro`
// (aiguillage dans main.tsx) et ne touche ni au tableau de bord ni à la vraie page d'accueil.
// Le moteur est Three.js (noyau seulement, imports ciblés, sans @react-three/fiber) : la scène est créée dans un useEffect et détruite
// au démontage. Séquence de 4,0 s au total, pilotée par l'horloge (pas par le nombre d'images) : 0 nuit, 1 approche, 2 mise en orbite,
// 3 titre, 4 arrivée sur la pose de l'illustration (landing-map.tsx).
// Options d'adresse : `&fps` (compteur d'images par seconde) et `&t=2.7` (fige l'image à cet instant, en secondes, pour les captures).
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
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  RingGeometry,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  WebGLRenderer,
} from "three"
import { Button } from "@/components/ui/button"

// ---------------------------------------------------------------------------------------------------------------------------
// Données FICTIVES : galaxie illustrée de 12 planètes (aucune vraie chaîne, aucun pseudo). Les neuf premières sont celles de
// landing-map.tsx (mêmes rayons d'orbite 92, 152 et 214, mêmes angles, mêmes couleurs) ; j, k et l complètent à douze.
// Dans la version livrée (B3), ce sont les chaînes en direct qui prendront leur place.
// ---------------------------------------------------------------------------------------------------------------------------
type Token = "--primary" | "--primary-soft" | "--map-link" | "--star-gold"
interface Planet { id: string; r: number; deg: number; size: number; fill: Token }
const PLANETS: Planet[] = [
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

// ---------------------------------------------------------------------------------------------------------------------------
// Chronologie du storyboard (secondes)
// ---------------------------------------------------------------------------------------------------------------------------
const END = 4.0
const T_APPROACH = 0.3 // début du plan 1
const T_ORBIT = 1.7 // début du plan 2
const T_TITLE = 2.5 // début du plan 3
const T_ARRIVAL = 3.5 // début du plan 4
const SPEED_FAST = 4 // °/s pendant l'approche
const SPEED_SLOW = 1.5 // °/s : la vitesse de .landing-orbit (un tour en 240 s)
const BOX = 520 // le viewBox de landing-map.tsx : une unité de la scène = une unité du SVG

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
export function IntroProto() {
  const params = new URLSearchParams(location.search)
  const showFps = params.has("fps")
  const frozenRaw = params.get("t")
  const frozen = frozenRaw !== null && frozenRaw !== "" && !Number.isNaN(Number(frozenRaw)) ? Number(frozenRaw) : null

  const stageRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const veilRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const captionRef = useRef<HTMLDivElement>(null)
  const skipRef = useRef<HTMLDivElement>(null)
  const fpsRef = useRef<HTMLDivElement>(null)
  const skipNow = useRef<() => void>(() => {})
  const [run, setRun] = useState(0)
  const [done, setDone] = useState(false)
  const [reduced] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches)

  useEffect(() => {
    const host = hostRef.current!
    const stage = stageRef.current!
    setDone(false)

    // Couleurs : les jetons de DESIGN.md lus dans la page, avec leur valeur écrite en secours.
    const css = getComputedStyle(document.documentElement)
    const tok = (n: keyof typeof FALLBACK) => new Color(css.getPropertyValue(n).trim() || FALLBACK[n])

    const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
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

    // Orbites (traits fins, tracés au plan 2) et liens entre planètes (tracés ensuite).
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

    const at = (id: string) => {
      const p = PLANETS.find((x) => x.id === id)!
      const a = (p.deg * Math.PI) / 180
      return [p.r * Math.cos(a), -p.r * Math.sin(a)] as const
    }
    const linkLines: { attr: Float32BufferAttribute; a: readonly [number, number]; b: readonly [number, number] }[] = []
    for (const [ia, ib] of LINKS) {
      const a = at(ia)
      const b = at(ib)
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

    // Planètes : elles s'allument toutes les 0,08 s (fondu de 0,3 s), des orbites internes vers l'externe.
    const sphere = keep(geoms, new SphereGeometry(1, 22, 14))
    const ordered = [...PLANETS].sort((p, q) => p.r - q.r)
    ordered.forEach((p, i) => {
      const [x, y] = at(p.id)
      const col = tok(p.fill)
      const start = T_APPROACH + i * 0.08
      const body = new Mesh(sphere, basic(col, 0.92, start, 0.3))
      body.scale.setScalar(p.size)
      body.position.set(x, y, 0)
      body.renderOrder = 5
      const atmos = new Mesh(sphere, basic(col, 0.1, start, 0.3))
      atmos.scale.setScalar(p.size + 5)
      atmos.position.set(x, y, 0)
      atmos.renderOrder = 4
      spin.add(atmos, body)
    })

    // L'astre central : Twitch.
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

    // ---- Mise en page : taille de l'écran, échelle plein cadre, pose finale (la colonne de l'illustration sur écran large)
    let W = 1
    let H = 1
    let ppu = 1 // pixels par unité de scène, au plan de la galaxie
    let hero = 1 // échelle qui fait tenir la galaxie dans l'écran
    let finalScale = 1
    let finalX = 0
    let finalY = 0
    const layout = () => {
      W = Math.max(host.clientWidth, 1)
      H = Math.max(host.clientHeight, 1)
      renderer.setSize(W, H)
      cam.aspect = W / H
      cam.updateProjectionMatrix()
      ppu = H / (2 * D * Math.tan((cam.fov * Math.PI) / 360))
      hero = (Math.min(W, H) * 0.95) / (BOX * ppu)
      const wide = W >= 1024
      const finalPx = wide ? Math.min(BOX, W * 0.4, H * 0.8) : Math.min(W * 0.8, 420, H * 0.45)
      const cx = wide ? W * 0.72 : W * 0.5
      const cy = wide ? H * 0.5 : H * 0.66
      finalScale = finalPx / (BOX * ppu)
      finalX = (cx - W / 2) / ppu
      finalY = -(cy - H / 2) / ppu
    }

    // ---- Une image à l'instant t
    let doneSet = false
    const apply = (t: number, stageOpacity: number) => {
      const c = camera(t)
      const s = lerp(hero * c.scale, finalScale, c.glide)
      root.scale.setScalar(s)
      root.position.set(lerp(0, finalX, c.glide), lerp(0, finalY, c.glide), 0)
      root.rotation.x = (c.tilt * Math.PI) / 180
      spin.rotation.z = -(spinDeg(t) * Math.PI) / 180

      // Plan 3 : la galaxie descend à 30 % ; plan 4 : elle remonte à 100 %.
      const galaxyAlpha = t < T_TITLE ? 1 : t < T_ARRIVAL ? lerp(1, 0.3, clamp01((t - T_TITLE) / 0.3)) : lerp(0.3, 1, clamp01((t - T_ARRIVAL) / (END - T_ARRIVAL)))
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

      // Habillage HTML : voile, titre « Observer » (masque de gauche à droite), en-tête, légende, bouton « Passer ».
      const titleIn = drawer((t - 2.6) / 0.5)
      const titleOut = 1 - clamp01((t - T_ARRIVAL) / 0.3)
      const veil = veilRef.current
      if (veil) veil.style.opacity = String(clamp01((t - T_TITLE) / 0.3) * titleOut)
      const title = titleRef.current
      if (title) {
        title.style.clipPath = `inset(0 ${((1 - titleIn) * 100).toFixed(2)}% 0 0)`
        title.style.opacity = String(titleOut)
      }
      if (headerRef.current) headerRef.current.style.opacity = String(clamp01((t - T_ARRIVAL) / 0.3))
      if (captionRef.current) captionRef.current.style.opacity = String(clamp01((t - 3.7) / 0.3))
      const skipEl = skipRef.current
      if (skipEl) {
        const o = 1 - clamp01((t - 3.7) / 0.2)
        skipEl.style.opacity = String(o)
        skipEl.style.pointerEvents = o < 0.5 ? "none" : "auto"
      }
      stage.style.opacity = String(stageOpacity)
      if (!doneSet && t >= END) {
        doneSet = true
        setDone(true)
      }
    }

    layout()
    const ro = new ResizeObserver(() => {
      layout()
      if (reduced || frozen !== null) apply(frozen ?? END, 1) // pas de boucle : on redessine à la main
    })
    ro.observe(host)

    // ---- Mouvement réduit : pas d'intro, image fixe de la pose finale (fondu d'opacité de 0,2 s seulement).
    let raf = 0
    let stopped = false
    const cleanups: (() => void)[] = []
    if (reduced) {
      stage.style.transition = "opacity 0.2s linear"
      apply(END, 0)
      requestAnimationFrame(() => { stage.style.opacity = "1" })
    } else {
      // ---- Lecture : l'horloge décide, pas le nombre d'images. Si l'onglet est caché au chargement, on attend qu'il soit visible.
      let t0 = -1
      let skipAt = -1
      let tAtSkip = 0
      let lastT = 0
      let frames = 0
      let winStart = -1
      let fpsMin = Infinity
      let worst = 0
      let prevTs = -1
      let sumFrames = 0
      let sumStart = -1
      const SKIP_FADE = 0.1 // 0,1 s pour s'éteindre, 0,1 s pour revenir : fin en 0,2 s

      skipNow.current = () => {
        if (skipAt >= 0 || lastT >= END || frozen !== null) return
        skipAt = performance.now() / 1000
        tAtSkip = lastT
        if (skipRef.current) skipRef.current.style.pointerEvents = "none"
      }
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.stopPropagation()
          skipNow.current()
        }
      }
      window.addEventListener("keydown", onKey, true)
      cleanups.push(() => window.removeEventListener("keydown", onKey, true))

      const frame = (ts: number) => {
        if (stopped) return
        raf = requestAnimationFrame(frame)
        const now = ts / 1000
        if (t0 < 0) t0 = now
        let t = now - t0
        let op = 1
        if (frozen !== null) t = frozen
        else if (skipAt >= 0) {
          const e = now - skipAt
          t = e < SKIP_FADE ? tAtSkip + e : END + (e - SKIP_FADE)
          op = e < SKIP_FADE ? 1 - e / SKIP_FADE : clamp01((e - SKIP_FADE) / SKIP_FADE)
        }
        lastT = t
        apply(t, op)

        if (showFps && fpsRef.current) {
          if (prevTs >= 0) worst = Math.max(worst, ts - prevTs)
          prevTs = ts
          if (winStart < 0) { winStart = ts; sumStart = ts }
          frames++
          sumFrames++
          if (ts - winStart >= 500) {
            const fps = (frames * 1000) / (ts - winStart)
            if (t < END + 0.2) fpsMin = Math.min(fpsMin, fps)
            const avg = (sumFrames * 1000) / (ts - sumStart)
            fpsRef.current.textContent = `${Math.round(fps)} i/s · mini ${Math.round(fpsMin)} · moy. ${Math.round(avg)} · pire image ${Math.round(worst)} ms`
            ;(window as unknown as { __introFps?: object }).__introFps = { fps, min: fpsMin, avg, worstMs: worst, t }
            frames = 0
            winStart = ts
          }
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
    }

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      cleanups.forEach((f) => f())
      geoms.forEach((g) => g.dispose())
      mats.forEach((m) => m.dispose())
      texs.forEach((tx) => tx.dispose())
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [run, reduced, frozen, showFps])

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-background text-foreground" onClick={() => skipNow.current()}>
      {/* Le film : aria-hidden, seul « Passer l'intro » est annoncé aux lecteurs d'écran. */}
      <div ref={stageRef} aria-hidden="true" className="absolute inset-0">
        <div ref={hostRef} className="absolute inset-0" />
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
        <div ref={headerRef} className="pointer-events-none absolute left-4 top-4 text-sm font-semibold opacity-0 sm:left-6 sm:top-5">
          Twitch Overlap
        </div>
        <div ref={captionRef} className="pointer-events-none absolute inset-x-0 bottom-5 px-6 text-center text-xs text-dusk opacity-0">
          Illustration. La Carte de ton tableau de bord affiche tes vraies chaînes.
        </div>
      </div>

      {!reduced && !done && (
        <div ref={skipRef} className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6" onClick={(e) => e.stopPropagation()}>
          <Button variant="secondary" autoFocus aria-keyshortcuts="Escape" className="h-11 border border-white/10 bg-popover sm:h-9" onClick={() => skipNow.current()}>
            Passer l'intro
          </Button>
        </div>
      )}
      {!reduced && done && (
        <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6" onClick={(e) => e.stopPropagation()}>
          <Button variant="secondary" className="h-11 border border-white/10 bg-popover sm:h-9" onClick={() => setRun((n) => n + 1)}>
            Rejouer l'intro
          </Button>
        </div>
      )}
      {showFps && <div ref={fpsRef} className="pointer-events-none absolute bottom-3 left-3 font-mono text-xs text-muted-foreground">mesure en cours…</div>}
    </div>
  )
}
