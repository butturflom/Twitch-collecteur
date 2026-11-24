// Fond de la Carte : une galaxie en volume, dans une sphère imaginaire centrée sur la planète Twitch.
// Des centaines de nuées de gaz colorées (rose → magenta → violet → bleu → cyan d'un bout à l'autre de la bande), de longs
// filaments de poussière sombre, des voiles de brume et des milliers de grains d'étoiles sont posés en 3D, surtout dans le
// disque de la galaxie, qui est le plan où tournent les systèmes de la carte : vu de face (un peu incliné), c'est une
// galaxie spirale autour de Twitch ; de côté, une bande où passent les systèmes. Tout au fond, sur la paroi de
// la sphère, les petites étoiles fixes à quatre branches ; au-delà, un ciel indigo clair et coloré.
// Le fond suit la vue du moteur de la carte (voir MapViewState) : quand on fait tourner le globe, tout le volume tourne avec
// lui, les nuées proches passent devant les lointaines, la poussière cache le gaz derrière elle, le fond de la sphère est
// plus pâle ; quand on zoome ou déplace la carte, ce qui est proche bouge plus que ce qui est loin (parallaxe). La galaxie
// tourne aussi très lentement sur elle-même (un tour en 15 minutes ; immobile si l'on a demandé moins d'animations).
// Les nuées restent toujours derrière les planètes (le fond est sous le dessin du moteur). Tirages au sort à graine fixe :
// le ciel est toujours le même. Rien n'intercepte la souris.
import { useEffect, useRef, type RefObject } from "react"
import type { MapViewState } from "@/legacy/bridge"

/** Nombres pseudo-aléatoires reproductibles (mulberry32). */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
type RGB = [number, number, number]
const hex = (c: string): RGB => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as RGB
const rgba = ([r, g, b]: RGB, a: number) => `rgba(${r},${g},${b},${a})`
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
// teintes de la bande galactique, d'un bout à l'autre : rose, magenta, violet, bleu, cyan
const BAND = ["#ff6fb5", "#d946ef", "#8b5cf6", "#3b82f6", "#22d3ee"].map(hex)
const along = (u: number): RGB => {
  const t = Math.min(0.999, Math.max(0, u)) * (BAND.length - 1), a = Math.floor(t), f = t - a
  return BAND[a].map((v, j) => Math.round(v + (BAND[a + 1][j] - v) * f)) as RGB
}
/** Rotation d'un vecteur par un quaternion [w, x, y, z] (celui du globe de la carte). */
const qRot = (q: number[], v: number[]) => {
  const [w, x, y, z] = q, tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0])
  return [v[0] + w * tx + y * tz - z * ty, v[1] + w * ty + z * tx - x * tz, v[2] + w * tz + x * ty - y * tx]
}

/** Tache de lumière douce (dégradé radial qui s'éteint en cloche). */
function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: RGB, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, rgba(c, a)); g.addColorStop(0.35, rgba(c, a * 0.55)); g.addColorStop(0.7, rgba(c, a * 0.14)); g.addColorStop(1, rgba(c, 0))
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r)
}
/** Nuée prête à poser (64 px), de la couleur donnée, opaque au centre et qui s'éteint en cloche. */
function sprite(c: RGB) {
  const s = document.createElement("canvas"); s.width = s.height = 64
  const g = s.getContext("2d")
  if (g) blob(g, 32, 32, 32, c, 1)
  return s
}

/**
 * Petite étoile fixe en facettes : quatre branches, chacune coupée en deux triangles, un côté éclairé (lumière venant d'en
 * haut à gauche, comme la planète Twitch) et un côté ombré ; les plus grandes ont un halo pâle en hexagone, les plus
 * petites sont de simples losanges en deux tons.
 */
function fourStar(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, lc: string, dc: string, al: number) {
  const tri = (a: number[], b: number[], c: number[], col: string) => {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x + a[0], y + a[1]); ctx.lineTo(x + b[0], y + b[1]); ctx.lineTo(x + c[0], y + c[1]); ctx.closePath(); ctx.fill()
  }
  if (R > 3.2) {
    ctx.globalAlpha = al * 0.09; ctx.fillStyle = lc; ctx.beginPath()
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; ctx.lineTo(x + Math.cos(a) * R * 2.1, y + Math.sin(a) * R * 2.1) }
    ctx.closePath(); ctx.fill()
    ctx.globalAlpha = al
    const t = R * 0.28
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2, ca = Math.cos(a), sa = Math.sin(a)
      for (const s of [1, -1]) tri([0, 0], [ca * R, sa * R], [-sa * t * s, ca * t * s], -sa * s * -0.6 + ca * s * -0.8 > 0 ? lc : dc)
    }
  } else {
    ctx.globalAlpha = al
    tri([0, -R], [-R * 0.7, 0], [0, R], lc); tri([0, -R], [R * 0.7, 0], [0, R], dc)
  }
}

// Le volume, en coordonnées « normalisées » comme les planètes du moteur : x et y de −1 à 1 d'un bord du cadre à l'autre,
// z vers soi. Les nuées du disque sont rangées dans le repère du disque (a, b dans son plan, h sa hauteur) : ce disque est
// le plan des orbites de la carte, incliné de TILT vers soi autour de l'axe horizontal (même valeur que TILT dans legacy.js).
type Puff = { a: number; b: number; h: number; s: number; al: number; spr: HTMLCanvasElement; dust?: boolean; ta?: number } // ta : sens du filament (poussière)
type Dot = { a: number; b: number; h: number; w?: number[]; s: number; al: number; col: string }
type Star = { w: number[]; s: number; al: number; R?: number; lc?: string; dc?: string }
const TILT = (16 * Math.PI) / 180, cT = Math.cos(TILT), sT = Math.sin(TILT)
/** Point du disque (repère du disque, tourné de l'angle psi sur lui-même, dans le même sens que les orbites) -> repère normalisé. Le bord du disque est un peu tordu en S. */
function discToWorld(a: number, b: number, h: number, c: number, s: number) {
  const a2 = a * c - b * s, b2 = a * s + b * c, h2 = h + 0.16 * Math.sign(a2) * a2 * a2
  return [a2, b2 * cT - h2 * sT, b2 * sT + h2 * cT]
}

function buildVolume() {
  const r = rng(11), gauss = () => Math.sqrt(-2 * Math.log(1 - r() * 0.999)) * Math.cos(2 * Math.PI * r())
  const sig = (rho: number) => 0.5 * (0.07 + 0.25 * Math.exp(-rho / 0.3)) // épaisseur du disque, plus grande au cœur (le bulbe)
  const disc = (maxR: number, sc: number) => { const rho = Math.min(maxR, -sc * Math.log(1 - r() * 0.95)), th = r() * 2 * Math.PI; return [rho * Math.cos(th), rho * Math.sin(th), rho] }
  const GAS = Array.from({ length: 12 }, (_, i) => sprite(along(i / 11))), WHITE = sprite(hex("#f3eeff")), CORE = sprite(hex("#ffe9c7")), DUST = sprite(hex("#120a28"))
  const VEIL = [sprite(hex("#ffffff")), sprite(hex("#e4dbff")), sprite(hex("#d9ecff"))]
  const puffs: Puff[] = [], dots: Dot[] = [], shell: Star[] = []
  // gaz : étalé le long de la bande, un peu moins dense au cœur pour ne pas brûler
  for (let i = 0; i < 340; i++) {
    const [a, b, rho] = disc(1.8, 1.0), t = clamp01((a / 1.8 + 1) / 2 + (r() - 0.5) * 0.15)
    puffs.push({ a, b, h: gauss() * sig(rho) * 1.1, s: 0.1 + r() * 0.26, al: (0.05 + r() * 0.07) * (0.45 + 0.55 * Math.min(1, rho / 0.6)), spr: r() < 0.18 ? WHITE : GAS[Math.min(11, Math.floor(t * 12))] })
  }
  for (let i = 0; i < 16; i++) { const [a, b] = disc(0.3, 0.15); puffs.push({ a, b, h: gauss() * 0.1, s: 0.12 + r() * 0.18, al: 0.025 + r() * 0.025, spr: CORE }) } // cœur, un peu doré
  // brume : grands voiles blancs et lavande très pâles dans l'épaisseur du disque
  for (let i = 0; i < 26; i++) { const [a, b, rho] = disc(1.6, 0.9); puffs.push({ a, b, h: gauss() * sig(rho) * 2.5, s: 0.32 + r() * 0.34, al: 0.03 + r() * 0.03, spr: VEIL[Math.floor(r() * 3)] }) }
  // poussière : de longs filaments sombres près du plan du disque (chacun fait de petites taches le long d'un arc)
  for (let i = 0; i < 270;) {
    const [a0, b0, rho] = disc(1.6, 0.8)
    if (rho < 0.35) continue // pas de poussière au cœur, là où est la planète Twitch
    const th0 = Math.atan2(b0, a0), len = 5 + Math.floor(r() * 9), dr = (r() - 0.5) * 0.04, h0 = gauss() * sig(rho) * 0.3
    for (let k = 0; k < len && i < 270; k++, i++) { const th = th0 + k * 0.04, rr = rho + dr * k; puffs.push({ a: rr * Math.cos(th), b: rr * Math.sin(th), h: h0 + gauss() * 0.01, s: 0.04 + r() * 0.08, al: 0.22 + r() * 0.24, spr: DUST, dust: true, ta: th + Math.PI / 2 }) }
  }
  // grains d'étoiles : très serrés dans le disque, quelques-uns partout dans la sphère ; ceux du cœur un peu dorés
  for (let i = 0; i < 3400; i++) { const [a, b, rho] = disc(1.8, 0.85); dots.push({ a, b, h: gauss() * sig(rho) * 0.8, s: 0.5 + r() ** 3 * 1.1, al: 0.25 + r() * 0.55, col: rho < 0.3 && r() < 0.6 ? "#ffe3b0" : r() < 0.75 ? "#ffffff" : "#dbe4ff" }) }
  for (let i = 0; i < 700; i++) {
    let x, y, z
    do { x = r() * 2 - 1; y = r() * 2 - 1; z = r() * 2 - 1 } while (x * x + y * y + z * z > 1)
    dots.push({ a: 0, b: 0, h: 0, w: [x * 1.75, y * 1.75, z * 1.75], s: 0.5 + r() ** 3 * 0.8, al: 0.15 + r() * 0.35, col: "#e9e4ff" })
  }
  // paroi de la sphère : grains pâles et étoiles à quatre branches (surtout blanches, quelques dorées, bleutées ou rosées)
  const cols: [string, string][] = [["#ffffff", "#cbbcff"], ["#fff6d6", "#e2c27a"], ["#eef6ff", "#9fbcff"], ["#ffe8f6", "#e09bc8"]]
  const onSphere = () => { const z = r() * 2 - 1, th = r() * 2 * Math.PI, s = Math.sqrt(1 - z * z); return [s * Math.cos(th) * 2.05, s * Math.sin(th) * 2.05, z * 2.05] }
  for (let i = 0; i < 1200; i++) shell.push({ w: onSphere(), s: 0.5 + r() ** 4 * 1.4, al: 0.2 + r() * 0.6 })
  for (let i = 0; i < 320; i++) { const m = r() ** 2.6, [lc, dc] = cols[r() < 0.6 ? 0 : 1 + Math.floor(r() * 3)]; shell.push({ w: onSphere(), s: 0, al: 0.6 + m * 0.4, R: 1.6 + m * 6.5, lc, dc }) }
  return { puffs, dots, shell }
}

/** Ciel au-delà de la sphère : indigo violet assez clair, grands nuages colorés et voiles blancs (peint une fois, plus grand que le cadre). */
function paintFar(w: number, h: number) {
  const c = document.createElement("canvas"), W = Math.round(w * 1.7), H = Math.round(h * 1.7), M = Math.max(W, H)
  c.width = W; c.height = H
  const g = c.getContext("2d")
  if (!g) return c
  const base = g.createLinearGradient(0, 0, W, H)
  base.addColorStop(0, "#2a2466"); base.addColorStop(0.5, "#2c1f6b"); base.addColorStop(1, "#1b1747")
  g.fillStyle = base; g.fillRect(0, 0, W, H)
  g.globalCompositeOperation = "lighter"
  const clouds: [number, number, number, string, number][] = [
    [0.82, 0.18, 0.5, "#c026d3", 0.15], [0.12, 0.3, 0.55, "#2563eb", 0.14], [0.3, 0.88, 0.5, "#0d9488", 0.11], [0.62, 0.72, 0.45, "#7c3aed", 0.15],
    [0.97, 0.04, 0.35, "#06b6d4", 0.12], [0.03, 0.97, 0.38, "#ec4899", 0.12], [0.15, 0.1, 0.4, "#ece6ff", 0.1], [0.88, 0.9, 0.42, "#f1eaff", 0.09], [0.5, 0.5, 0.65, "#ffffff", 0.05],
  ]
  for (const [x, y, s, col, a] of clouds) blob(g, x * W, y * H, s * M, hex(col), a)
  return c
}

const FLAT: MapViewState = { k: 1, tx: 0, ty: 0, rot: 0, q: [1, 0, 0, 0] }

export function Galaxy({ view }: { view?: RefObject<MapViewState | null> }) {
  const wrap = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = wrap.current, c = cv.current, ctx = c?.getContext("2d")
    if (!el || !c || !ctx) return
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
    const V = buildVolume(), t0 = performance.now()
    let W = 0, H = 0, dpr = 1, far: HTMLCanvasElement | null = null, lastKey = "", lastSpin = 0, raf = 0

    const draw = (v: MapViewState, t: number) => {
      if (!W || !H) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"
      const CX = W / 2, CY = H / 2, hw = W / 2, hh = H / 2, U0 = (Math.min(W, H) / 2) * 0.86, k = Math.min(10, Math.max(0.3, v.k || 1)), q = v.q
      const lx = v.tx + k * CX - CX, ly = v.ty + k * CY - CY, rc = Math.cos(v.rot), rs = Math.sin(v.rot)
      // point du volume -> écran, comme les planètes du moteur (globe, perspective, rotation à plat, zoom, déplacement),
      // mais avec une parallaxe : le zoom et le déplacement comptent d'autant moins que le point est loin (p de 0,33 à 0,77)
      const proj = (w: number[]) => {
        const r3 = qRot(q, w), d = 1 - 0.3 * r3[2]
        if (d < 0.18) return null
        const f = 1 / d, p = 0.55 + (0.22 * Math.max(-1.7, Math.min(1.7, r3[2]))) / 1.7, kz = Math.pow(k, p), bx = r3[0] * hw * f * kz, by = r3[1] * hh * f * kz
        return { x: CX + lx * p + bx * rc - by * rs, y: CY + ly * p + bx * rs + by * rc, z: r3[2], f: f * kz }
      }
      // au-delà de la sphère : le ciel peint, qui glisse à peine
      if (far) {
        const fwd = qRot(q, [0, 0, 1]), p = 0.15, kz = Math.pow(k, p)
        ctx.save(); ctx.translate(CX + lx * p - fwd[0] * U0 * 0.9, CY + ly * p - fwd[1] * U0 * 0.9); ctx.rotate(v.rot); ctx.scale(kz, kz)
        ctx.drawImage(far, -far.width / 2, -far.height / 2); ctx.restore()
      }
      // paroi : seulement la moitié du fond de la sphère (l'autre est derrière nous), plus pâle tout au fond
      for (const s of V.shell) {
        const p = proj(s.w)
        if (!p || p.z > 0.25 || p.x < -20 || p.y < -20 || p.x > W + 20 || p.y > H + 20) continue
        const al = s.al * (0.45 + 0.55 * clamp01(-p.z / 2.05))
        if (s.R) fourStar(ctx, p.x, p.y, s.R, s.lc as string, s.dc as string, al)
        else { ctx.globalAlpha = al; ctx.fillStyle = "#fff"; ctx.fillRect(p.x, p.y, s.s, s.s) }
      }
      // le disque tourne lentement sur lui-même
      const psi = (-t * 2 * Math.PI) / 900, pc = Math.cos(psi), ps = Math.sin(psi)
      const near: [NonNullable<ReturnType<typeof proj>>, Dot][] = [], items: [NonNullable<ReturnType<typeof proj>>, Puff][] = []
      // grains du fond d'abord, ceux de devant après les nuées
      for (const d of V.dots) {
        const p = proj(d.w || discToWorld(d.a, d.b, d.h, pc, ps))
        if (!p) continue
        if (p.z > 0) { near.push([p, d]); continue }
        if (p.x < -4 || p.y < -4 || p.x > W + 4 || p.y > H + 4) continue
        const sz = d.s * p.f
        ctx.globalAlpha = d.al * (0.5 + 0.5 * clamp01(1 + p.z / 1.75)); ctx.fillStyle = d.col; ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz)
      }
      for (const o of V.puffs) { const p = proj(discToWorld(o.a, o.b, o.h, pc, ps)); if (p) items.push([p, o]) }
      items.sort((x, y) => x[0].z - y[0].z)
      for (const [p, o] of items) {
        let size = o.s * U0 * p.f, al = o.al
        if (p.x + size < 0 || p.y + size < 0 || p.x - size > W || p.y - size > H) continue
        if (p.z < 0) al *= 1 - 0.45 * clamp01(-p.z / 1.75) // au fond : plus pâle
        if (p.z > 0.45) { const b = (p.z - 0.45) * 0.96; size *= 1 + b; al /= 1 + 1.6 * b } // tout près : flou
        if (o.dust && p.z > 0.1) { al *= Math.max(0, 1 - (p.z - 0.1) * 1.4); if (al < 0.01) continue } // la poussière proche s'efface : pas de trou sombre devant les planètes
        ctx.globalCompositeOperation = o.dust ? "source-over" : "lighter" // le gaz éclaire, la poussière cache
        ctx.globalAlpha = Math.min(1, al)
        if (o.dust && o.ta != null) {
          // poussière étirée dans le sens de son filament (vu de côté, elle s'allonge ; vue dans l'axe, elle reste courte)
          const q2 = proj(discToWorld(o.a + 0.03 * Math.cos(o.ta), o.b + 0.03 * Math.sin(o.ta), o.h, pc, ps))
          const dx = q2 ? q2.x - p.x : 0, dy = q2 ? q2.y - p.y : 0, st = 1 + 1.6 * clamp01(Math.hypot(dx, dy) / (0.03 * hw * p.f))
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(dy, dx)); ctx.scale(st, 0.65); ctx.drawImage(o.spr, -size, -size, size * 2, size * 2); ctx.restore()
        } else ctx.drawImage(o.spr, p.x - size, p.y - size, size * 2, size * 2)
      }
      ctx.globalCompositeOperation = "source-over"
      for (const [p, d] of near) {
        if (p.x < -4 || p.y < -4 || p.x > W + 4 || p.y > H + 4) continue
        const b = p.z > 0.6 ? (p.z - 0.6) * 0.6 : 0, sz = d.s * p.f * (1 + b)
        ctx.globalAlpha = d.al / (1 + b); ctx.fillStyle = d.col
        if (sz < 1.5) ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz)
        else { ctx.beginPath(); ctx.arc(p.x, p.y, sz / 2, 0, 2 * Math.PI); ctx.fill() } // gros grain proche (zoom) : rond, pas carré
      }
      ctx.globalAlpha = 1
    }

    const resize = () => {
      W = Math.round(el.clientWidth); H = Math.round(el.clientHeight); dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      if (!W || !H) return
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr)
      far = paintFar(W, H); lastKey = ""
    }
    // Redessiné quand la vue de la carte change (globe, zoom, déplacement), et 8 fois par seconde pour la rotation lente de
    // la galaxie ; rien quand l'onglet est caché.
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const v = view?.current || FLAT, key = `${v.k}|${v.tx}|${v.ty}|${v.rot}|${v.q.join(",")}|${W}x${H}`, spin = !reduce && now - lastSpin > 120
      if (key === lastKey && !spin) return
      lastKey = key
      if (spin) lastSpin = now
      draw(v, reduce ? 0 : (now - t0) / 1000)
    }
    resize(); draw(view?.current || FLAT, 0)
    raf = requestAnimationFrame(frame)
    let t = 0
    const ro = new ResizeObserver(() => { clearTimeout(t); t = window.setTimeout(() => { resize(); draw(view?.current || FLAT, reduce ? 0 : (performance.now() - t0) / 1000) }, 60) })
    ro.observe(el)
    return () => { cancelAnimationFrame(raf); ro.disconnect(); clearTimeout(t) }
  }, [view])

  return (
    <div ref={wrap} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <canvas ref={cv} className="absolute inset-0 h-full w-full" />
    </div>
  )
}
