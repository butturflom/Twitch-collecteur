// Prototype E1 (planètes low-poly des chaînes), en développement seulement : http://localhost:5173/?demo=planets
// Page autonome (ni l'ancien code ni les données de démo) : main.tsx la monte à la place du tableau de bord quand
// import.meta.env.DEV est vrai, rien de ce fichier n'entre dans le build. Jetable : il sert à choisir un modèle sur captures.
// Paramètres : &vue=tailles | reconnaitre | petites | charge (une seule section, pour les captures), &n=100 (planètes de
// l'essai de charge), &anim=0 (essai de charge figé).
// Les « photos » sont des images factices dessinées ici (aucun réseau) ; trois chaînes n'en ont pas : leur pin's montre l'initiale.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { buildModel, hash, pinBg, rng, tones, toneVars, TWITCH_TONES, VARIANTS, type Model, type Variant } from "./planets-lowpoly"

const SIZES = [22, 30, 48, 100]
const q = new URLSearchParams(location.search)
const VUE = q.get("vue")
const show = (id: string) => !VUE || VUE === id

// ---------- photos factices (SVG en data URI, dessinées pour ce prototype) ----------
const AV: Record<string, string> = {
  visage: `<rect width="64" height="64" fill="#f59e0b"/><circle cx="32" cy="25" r="12" fill="#1f2937"/><path d="M10 64c2-14 11-21 22-21s20 7 22 21z" fill="#1f2937"/>`,
  visage2: `<rect width="64" height="64" fill="#0ea5e9"/><circle cx="32" cy="26" r="13" fill="#fde68a"/><path d="M19 22c2-10 24-12 27 0-6-4-20-4-27 0z" fill="#7c2d12"/><path d="M8 64c3-13 12-19 24-19s21 6 24 19z" fill="#f8fafc"/>`,
  chat: `<rect width="64" height="64" fill="#111827"/><path d="M14 18l8 12h20l8-12v26a18 18 0 0 1-36 0z" fill="#fb923c"/><circle cx="25" cy="39" r="3" fill="#111827"/><circle cx="39" cy="39" r="3" fill="#111827"/>`,
  monogramme: `<rect width="64" height="64" fill="#f8fafc"/><text x="32" y="43" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="30" fill="#1d4ed8">KB</text>`,
  etoile: `<rect width="64" height="64" fill="#4c1d95"/><path d="M32 8l7 16 17 2-13 11 4 17-15-9-15 9 4-17L8 26l17-2z" fill="#fde047"/>`,
  rayures: `<rect width="64" height="64" fill="#fef3c7"/><path d="M-8 16L16-8h10L-8 26zM-8 40L40-8h10L-8 50zM-8 64L64-8v10L2 72h-10zM16 72L72 16v10L26 72zM40 72L72 40v10L50 72z" fill="#0f766e"/>`,
  eclair: `<rect width="64" height="64" fill="#18181b"/><path d="M36 6L14 36h14l-4 22 22-32H32z" fill="#ef4444"/>`,
  manette: `<rect width="64" height="64" fill="#22c55e"/><rect x="10" y="22" width="44" height="22" rx="11" fill="#14532d"/><path d="M19 30h4v-4h3v4h4v3h-4v4h-3v-4h-4z" fill="#dcfce7"/><circle cx="42" cy="30" r="2.6" fill="#dcfce7"/><circle cx="47" cy="36" r="2.6" fill="#dcfce7"/>`,
  cible: `<rect width="64" height="64" fill="#e11d48"/><circle cx="32" cy="32" r="22" fill="#fff"/><circle cx="32" cy="32" r="15" fill="#e11d48"/><circle cx="32" cy="32" r="7" fill="#fff"/>`,
}
const avatarUrl = (k: string) => "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${AV[k]}</svg>`)

type Ch = { name: string; color: string; avatar: string | null }
const CHANNELS: Ch[] = [
  { name: "lunaroc", color: "#ff7a59", avatar: "visage" },
  { name: "pixelfox", color: "#3ccf86", avatar: "chat" },
  { name: "kaizenbleu", color: "#5b93ff", avatar: "monogramme" },
  { name: "Zéphyra", color: "#e05bd0", avatar: "etoile" },
  { name: "tortuegeniale", color: "#ffc46b", avatar: null },
  { name: "nordwind", color: "#4fd1c5", avatar: "rayures" },
  { name: "brasero", color: "#f2636f", avatar: "eclair" },
  { name: "mangue_tv", color: "#f6ad55", avatar: "manette" },
  { name: "orbitale", color: "#8b7cff", avatar: "cible" },
  { name: "Sablier", color: "#c8b88a", avatar: null },
  { name: "glaciale", color: "#9fd8ff", avatar: "visage2" },
  { name: "vertige", color: "#a3e635", avatar: null },
]

// ---------- modèles : calculés une fois, posés dans un seul <defs> ----------
const models = new Map<string, Model>()
function model(variant: Variant, seed: number): Model {
  const k = variant + seed
  let m = models.get(k)
  if (!m) { m = buildModel(variant, seed); models.set(k, m) }
  return m
}
/** Trois modèles par variante : une chaîne prend le sien d'après son nom (forme et relief ne portent aucune donnée). */
const modelOf = (name: string, variant?: Variant) => {
  const h = hash(name.toLowerCase())
  return model(variant ?? VARIANTS[h % VARIANTS.length].id, 1 + ((h >>> 3) % 3))
}

function hslHex(h: number, s: number, l: number) {
  const f = (n: number) => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, "0") }
  return "#" + f(0) + f(8) + f(4)
}

// ---------- une planète ----------
type PinMode = "pin" | "peinte" | "aucune"

function Planet({ D, m, t, ch, pin = "pin", style }: { D: number; m: Model; t: string[]; ch?: Ch; pin?: PinMode; style?: CSSProperties }) {
  const W = D * 1.3
  const col = t[5]
  const p = Math.round(Math.max(12, Math.min(40, D * 0.48))) // diamètre du pin's
  const initial = ch ? ([...ch.name][0] || "?").toUpperCase() : ""
  const face = (size: number): ReactNode => ch?.avatar
    ? <img src={avatarUrl(ch.avatar)} alt="" width={size} height={size} draggable={false} />
    : <b style={{ fontSize: Math.max(7, size * 0.58), background: pinBg(col) }}>{initial}</b>
  return (
    <div className="e1-p" style={{ width: D, height: D, ...toneVars(t), ...style }} title={ch?.name}>
      <div className="e1-halo" style={{ background: `radial-gradient(circle, ${col}59 0%, ${col}1f 42%, transparent 70%)` }} />
      <svg width={W} height={W} viewBox="-1.3 -1.3 2.6 2.6" style={{ left: -(W - D) / 2, top: -(W - D) / 2 }} aria-hidden="true">
        <use href={"#" + m.id} />
      </svg>
      {ch && pin === "pin" && (
        <span className="e1-pin" style={{ width: p, height: p, left: D * 0.86 - p / 2, top: D * 0.14 - p / 2, borderWidth: p < 20 ? 1.5 : 2 }}>{face(p)}</span>
      )}
      {ch && pin === "peinte" && (
        <span className="e1-decal" style={{ width: D * 0.58, height: D * 0.58, left: D * 0.21, top: D * 0.21, borderColor: t[1] }}>{face(D * 0.58)}</span>
      )}
    </div>
  )
}

const chPlanet = (ch: Ch, D: number, extra?: { variant?: Variant; pin?: PinMode; style?: CSSProperties }) =>
  <Planet D={D} m={modelOf(ch.name, extra?.variant)} t={tones(ch.color)} ch={ch} pin={extra?.pin} style={extra?.style} />

// ---------- sections ----------
function Sizes() {
  const rows = VARIANTS.map((v, i) => ({ v, photo: CHANNELS[i], sans: CHANNELS[[4, 9, 11, 4][i]] }))
  return (
    <div className="e1-sec">
      <h2>Quatre modèles et la planète Twitch, à 22, 30, 48 et 100 px</h2>
      <p className="e1-note">Dans chaque case : à gauche une chaîne avec photo (pin's), à droite une chaîne sans photo (initiale en repli). La couleur est celle de la chaîne ; seuls la silhouette et le relief changent d'un modèle à l'autre.</p>
      <table className="e1-grid">
        <thead><tr><th />{SIZES.map((s) => <th key={s}>{s} px</th>)}</tr></thead>
        <tbody>
          {rows.map(({ v, photo, sans }) => (
            <tr key={v.id}>
              <th><div className="e1-rowname">{v.label}</div><div className="e1-rownote">{v.note}</div></th>
              {SIZES.map((s) => (
                <td key={s}><div className="e1-pair" style={{ gap: Math.max(14, s * 0.45) }}>{chPlanet(photo, s, { variant: v.id })}{chPlanet(sans, s, { variant: v.id })}</div></td>
              ))}
            </tr>
          ))}
          <tr>
            <th><div className="e1-rowname">Planète Twitch</div><div className="e1-rownote">modèle Plateaux, les violets de l'icosphère actuelle, sans pin's</div></th>
            {SIZES.map((s) => <td key={s}><div className="e1-pair"><Planet D={s} m={model("plateaux", 7)} t={TWITCH_TONES} /></div></td>)}
          </tr>
        </tbody>
      </table>
      <div className="e1-twitch">
        <span className="e1-rownote">Planète Twitch dans chaque modèle, à 100 px :</span>
        {VARIANTS.map((v) => <div key={v.id} className="e1-tw"><Planet D={100} m={model(v.id, 7)} t={TWITCH_TONES} /><span>{v.label}</span></div>)}
      </div>
    </div>
  )
}

function Recognize() {
  return (
    <div className="e1-sec">
      <h2>Reconnaître une chaîne à 40 px</h2>
      <p className="e1-note">Douze chaînes, modèle tiré du nom. Le nom est dessous pour vérifier, pas pour lire.</p>
      <div className="e1-row">
        {CHANNELS.map((ch) => <div key={ch.name} className="e1-tw">{chPlanet(ch, 40)}<span>{ch.name}</span></div>)}
      </div>
    </div>
  )
}

function Small() {
  const sel = CHANNELS.slice(0, 6)
  const line = (D: number, pin: PinMode, label: string) => (
    <div className="e1-line" key={D + pin}>
      <span className="e1-rownote">{label}</span>
      <div className="e1-row" style={{ gap: 26 }}>{sel.map((ch) => <div key={ch.name}>{chPlanet(ch, D, { pin })}</div>)}</div>
    </div>
  )
  return (
    <div className="e1-sec">
      <h2>Petites tailles : pin's ou pastille peinte</h2>
      <p className="e1-note">Le pin's ne descend pas sous 12 px de diamètre. La pastille peinte est la photo posée au centre de la planète, comme un décor.</p>
      {line(22, "pin", "22 px, pin's")}
      {line(22, "peinte", "22 px, pastille peinte")}
      {line(22, "aucune", "22 px, sans photo")}
      {line(18, "pin", "18 px, pin's")}
      {line(18, "peinte", "18 px, pastille peinte")}
      {line(30, "pin", "30 px, pin's")}
    </div>
  )
}

function Load() {
  const n = Math.max(1, Math.min(400, Number(q.get("n")) || 100))
  const anim = q.get("anim") !== "0"
  const box = useRef<HTMLDivElement>(null)
  const [fps, setFps] = useState<{ avg: number; worst: number } | null>(null)
  const items = useMemo(() => {
    const r = rng(42)
    return Array.from({ length: n }, (_, i) => {
      const base = CHANNELS[i % CHANNELS.length]
      const ch: Ch = { name: base.name + (i >= CHANNELS.length ? i : ""), color: i < CHANNELS.length ? base.color : hslHex(r() * 360, 0.6 + r() * 0.25, 0.55 + r() * 0.12), avatar: r() < 0.75 ? base.avatar ?? "visage" : null }
      return { ch, m: modelOf(ch.name), D: Math.round(22 + r() * 26), x: r(), y: r(), ph: r() * 6.28, w: 0.3 + r() * 0.5 }
    })
  }, [n])
  const nModels = new Set(items.map((it) => it.m.id)).size
  useEffect(() => {
    if (!anim || !box.current) return
    const els = [...box.current.querySelectorAll<HTMLElement>(".e1-mv")]
    let raf = 0, last = performance.now(), frames = 0, worst = 0, t0 = last
    const tick = (now: number) => {
      const t = now / 1000
      els.forEach((el, i) => { const it = items[i]; el.style.transform = `translate(${Math.sin(t * it.w + it.ph) * 18}px, ${Math.cos(t * it.w * 0.8 + it.ph) * 12}px)` })
      frames++; worst = Math.max(worst, now - last); last = now
      if (now - t0 >= 1000) { setFps({ avg: Math.round((frames * 1000) / (now - t0)), worst: Math.round(worst) }); frames = 0; worst = 0; t0 = now }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [anim, items])
  useEffect(() => { (window as unknown as { e1Fps?: unknown }).e1Fps = fps }, [fps])
  return (
    <div className="e1-sec">
      <h2>Charge : {n} planètes en mouvement</h2>
      <p className="e1-note">{nModels} modèles partagés par &lt;use&gt;, 22 à 48 px, 3 chaînes sur 4 avec photo. {anim ? (fps ? `${fps.avg} images/s, pire image ${fps.worst} ms sur la dernière seconde.` : "Mesure en cours…") : "Animation arrêtée (&anim=0)."}</p>
      <div ref={box} className="e1-field">
        {items.map(({ ch, D, x, y }) => (
          <div key={ch.name} className="e1-mv" style={{ left: `calc(${(x * 94).toFixed(2)}% + 10px)`, top: 14 + y * 560 }}>{chPlanet(ch, D)}</div>
        ))}
      </div>
    </div>
  )
}

const CSS = `
.e1-page{min-height:100vh;color:#f4f4f5;font-family:Inter,ui-sans-serif,system-ui,"Segoe UI",sans-serif;padding:28px 32px 48px;
  background-color:#09090b;background-image:radial-gradient(1px 1px at 23px 41px,#f4f4f5b3 50%,transparent 51%),radial-gradient(1px 1px at 147px 113px,#f4f4f580 50%,transparent 51%),
  radial-gradient(1.5px 1.5px at 81px 171px,#ffc46b99 50%,transparent 51%),radial-gradient(1px 1px at 193px 19px,#e6e1ff99 50%,transparent 51%),radial-gradient(1px 1px at 61px 97px,#f4f4f566 50%,transparent 51%);
  background-size:211px 199px}
.e1-page h1{font-size:22px;font-weight:600;letter-spacing:-.02em;margin:0}
.e1-page h2{font-size:15px;font-weight:600;margin:0 0 4px}
.e1-lead{color:#a1a1aa;font-size:13px;margin:6px 0 0;max-width:760px}
.e1-note{color:#a1a1aa;font-size:12.5px;margin:0 0 16px;max-width:760px}
.e1-sec{margin-top:34px}
.e1-grid{border-collapse:collapse}
.e1-grid th,.e1-grid td{padding:14px 22px;text-align:center;vertical-align:middle;border-bottom:1px solid rgba(255,255,255,.08)}
.e1-grid thead th{color:#a1a1aa;font-size:12px;font-weight:500}
.e1-grid tbody th{text-align:left;max-width:190px}
.e1-rowname{font-size:13px;font-weight:600}
.e1-rownote{color:#a1a1aa;font-size:12px;font-weight:400}
.e1-pair{display:flex;align-items:center;justify-content:center;gap:16px}
.e1-row{display:flex;flex-wrap:wrap;align-items:flex-end;gap:22px}
.e1-tw{display:flex;flex-direction:column;align-items:center;gap:8px}
.e1-tw span{color:#a1a1aa;font-size:11.5px}
.e1-twitch{display:flex;align-items:center;gap:34px;margin-top:22px}
.e1-line{display:flex;align-items:center;gap:20px;margin:10px 0}
.e1-line>.e1-rownote{width:150px}
.e1-p{position:relative;flex:none}
.e1-p>svg{position:absolute;overflow:visible}
.e1-halo{position:absolute;inset:-40%;border-radius:50%;pointer-events:none}
.e1-pin,.e1-decal{position:absolute;border-radius:50%;overflow:hidden;display:grid;place-items:center}
.e1-pin{border:2px solid #f4f4f5;box-shadow:0 1px 3px rgba(0,0,0,.7),0 0 0 1px rgba(9,9,11,.55);background:#09090b;box-sizing:border-box}
.e1-decal{border:1px solid;box-sizing:border-box;opacity:.95}
.e1-pin img,.e1-decal img{width:100%;height:100%;display:block}
.e1-pin b,.e1-decal b{width:100%;height:100%;display:grid;place-items:center;color:#f4f4f5;font-weight:700;line-height:1}
.e1-field{position:relative;height:620px;border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden}
.e1-mv{position:absolute;will-change:transform}
`

export default function PlanetsDemo() {
  // les modèles sont calculés au premier rendu des sections ; le <defs> est rendu après elles
  const sections = (
    <>
      {show("tailles") && <Sizes />}
      {show("reconnaitre") && <Recognize />}
      {show("petites") && <Small />}
      {show("charge") && <Load />}
    </>
  )
  useEffect(() => { document.title = "Planètes low-poly · prototype E1" }, [])
  return (
    <div className="e1-page">
      <style>{CSS}</style>
      <h1>Planètes low-poly : prototype E1</h1>
      <p className="e1-lead">Page de travail pour choisir le modèle des planètes de la Carte. Dessin SVG, sans Three.js : chaque modèle est calculé une fois, puis repris par toutes les planètes qui le partagent, teinté de la couleur de leur chaîne. Photos factices.</p>
      {sections}
      <Defs />
    </div>
  )
}

/** Tous les modèles utilisés par la page, dans un seul SVG caché (rendu après les sections, qui les ont déjà créés). */
function Defs() {
  const html = [...models.values()].map((m) => `<g id="${m.id}" stroke-width=".012" stroke-linejoin="round">${m.svg}</g>`).join("")
  return <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true"><defs dangerouslySetInnerHTML={{ __html: html }} /></svg>
}
