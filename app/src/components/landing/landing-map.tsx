// Illustration de la page d'accueil : un système d'astres, Twitch au centre et des chaînes en orbite, reliées entre elles.
// Dessin inventé, sans nom de chaîne ni chiffre : la vraie Carte est dans le tableau de bord. Couleurs : jetons de la Carte.
// Un seul mouvement : tout le système tourne très lentement (coupé avec prefers-reduced-motion, voir index.css).
const C = 260
const pos = (r: number, deg: number) => [C + r * Math.cos((deg * Math.PI) / 180), C + r * Math.sin((deg * Math.PI) / 180)] as const

type Planet = { id: string; r: number; deg: number; size: number; fill: string }
const PLANETS: Planet[] = [
  { id: "a", r: 92, deg: 25, size: 11, fill: "var(--primary-soft)" },
  { id: "b", r: 92, deg: 205, size: 8, fill: "var(--map-link)" },
  { id: "c", r: 152, deg: 78, size: 15, fill: "var(--primary)" },
  { id: "d", r: 152, deg: 160, size: 10, fill: "var(--star-gold)" },
  { id: "e", r: 152, deg: 300, size: 13, fill: "var(--primary-soft)" },
  { id: "f", r: 214, deg: 38, size: 11, fill: "var(--map-link)" },
  { id: "g", r: 214, deg: 128, size: 16, fill: "var(--primary)" },
  { id: "h", r: 214, deg: 250, size: 9, fill: "var(--primary-soft)" },
  { id: "i", r: 214, deg: 335, size: 12, fill: "var(--primary)" },
]
const LINKS: [string, string][] = [["a", "c"], ["c", "d"], ["d", "g"], ["g", "h"], ["b", "e"], ["e", "i"], ["i", "f"], ["a", "f"]]
const STARS: [number, number][] = [[40, 70], [470, 60], [500, 300], [60, 410], [250, 18], [430, 480], [120, 250], [395, 175], [310, 505], [18, 190]]

const at = (id: string) => {
  const p = PLANETS.find((x) => x.id === id)!
  return pos(p.r, p.deg)
}

export function LandingMap({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 520"
      role="img"
      aria-label="Illustration : des chaînes Twitch en orbite autour d’un astre central, reliées par des traits clairs."
      className={className}
    >
      <defs>
        <radialGradient id="landing-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style={{ stopColor: "var(--primary)", stopOpacity: 0.38 }} />
          <stop offset="55%" style={{ stopColor: "var(--primary)", stopOpacity: 0.08 }} />
          <stop offset="100%" style={{ stopColor: "var(--primary)", stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r={250} fill="url(#landing-halo)" />
      {STARS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.6 : 1} style={{ fill: "var(--map-link)", opacity: 0.45 }} />
      ))}
      <g className="landing-orbit">
        {[92, 152, 214].map((r) => (
          <circle key={r} cx={C} cy={C} r={r} fill="none" style={{ stroke: "var(--map-link)", strokeOpacity: 0.12 }} strokeWidth={1} />
        ))}
        {LINKS.map(([a, b]) => {
          const [x1, y1] = at(a)
          const [x2, y2] = at(b)
          return <line key={a + b} x1={x1} y1={y1} x2={x2} y2={y2} strokeLinecap="round" strokeWidth={1.4} style={{ stroke: "var(--map-link)", strokeOpacity: 0.34 }} />
        })}
        {PLANETS.map((p) => {
          const [x, y] = pos(p.r, p.deg)
          return (
            <g key={p.id}>
              <circle cx={x} cy={y} r={p.size + 5} style={{ fill: p.fill, opacity: 0.1 }} />
              <circle cx={x} cy={y} r={p.size} style={{ fill: p.fill, opacity: 0.92 }} />
            </g>
          )
        })}
        {/* l'astre central : Twitch */}
        <circle cx={C} cy={C} r={34} style={{ fill: "var(--primary-strong)" }} />
        <circle cx={C} cy={C} r={34} fill="none" strokeWidth={1.5} style={{ stroke: "var(--primary-soft)", strokeOpacity: 0.7 }} />
        <circle cx={C - 9} cy={C - 10} r={9} style={{ fill: "var(--map-link)", opacity: 0.3 }} />
      </g>
    </svg>
  )
}
