// Diagramme de Sankey pour visualiser les flux de viewers.
// Vue utilisant un composant SVG pur, pas de dépendance externe.
// Deux colonnes : à gauche les chaînes d'où partent les viewers, à droite celles où ils arrivent (une chaîne peut figurer des deux côtés).
// Avant le 26/11, tous les nœuds étaient posés dans une seule colonne à x = 40 : le dessin tenait dans ~130 px de large,
// quelle que soit la largeur de la page, avec un grand vide à droite.
import { useMemo } from "react"
import { useWidth } from "./frame"

export interface SankeyNode {
  id: string
  label: string
  color: string
  img?: string
}

export interface SankeyLink {
  source: string  // id de la source
  target: string  // id de la cible
  value: number
}

type Placed = SankeyNode & { x: number; y: number; right: boolean }

const NODE_W = 24
const NODE_H = 30
const NODE_GAP = 8
const PAD_TOP = 40
/** Largeur réservée de chaque côté aux noms des chaînes. */
const LABEL_W = 110

const cut = (s: string) => (s.length > 14 ? s.slice(0, 13) + "…" : s)

export function SankeyDiagram({
  nodes,
  links,
  height = 200,
}: {
  nodes: SankeyNode[]
  links: SankeyLink[]
  height?: number
}) {
  const [box, width] = useWidth()
  const widthAvailable = Math.max(width, 400)

  // Positions des nœuds : tous les hooks restent avant le retour anticipé (même nombre de hooks à chaque rendu)
  const { left, right } = useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const out = new Map<string, number>() // viewers partis de la chaîne
    const inn = new Map<string, number>() // viewers arrivés à la chaîne
    for (const l of links) {
      out.set(l.source, (out.get(l.source) ?? 0) + l.value)
      inn.set(l.target, (inn.get(l.target) ?? 0) + l.value)
    }
    const node = (id: string) => byId.get(id) ?? { id, label: id, color: "#666" }
    // tri par total décroissant, de chaque côté
    const column = (tot: Map<string, number>, x: number, isRight: boolean): Placed[] =>
      [...tot.keys()]
        .sort((a, b) => (tot.get(b) ?? 0) - (tot.get(a) ?? 0))
        .map((id, i) => ({ ...node(id), x, y: PAD_TOP + i * (NODE_H + NODE_GAP) + NODE_H / 2, right: isRight }))
    return {
      left: column(out, LABEL_W, false),
      right: column(inn, widthAvailable - LABEL_W - NODE_W, true),
    }
  }, [nodes, links, widthAvailable])

  // Rien à afficher
  if (links.length === 0) return null

  const rows = Math.max(left.length, right.length)
  // la hauteur suit le nombre de chaînes : sans cela, au-delà de 6 ou 7 chaînes le bas du dessin serait coupé
  const heightAvailable = Math.max(height + 100, PAD_TOP * 2 + rows * (NODE_H + NODE_GAP))

  return (
    <div ref={box} className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${widthAvailable} ${heightAvailable}`}
        width="100%"
        height={heightAvailable}
        className="block"
        role="img"
        aria-label="Diagramme de flux de viewers"
      >
        {/* Dégradé pour les liens */}
        <defs>
          <linearGradient id="sankey-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(139, 124, 255, 0.6)" />
            <stop offset="100%" stopColor="rgba(111, 103, 240, 0.8)" />
          </linearGradient>
        </defs>

        {/* Lignes de flux */}
        {links.map((link, i) => {
          const src = left.find((n) => n.id === link.source)
          const tgt = right.find((n) => n.id === link.target)
          if (!src || !tgt) return null

          const srcY = src.y + 15
          const tgtY = tgt.y + 15
          const bandWidth = Math.max(3, Math.sqrt(link.value) / 5)

          // Chemin Sankey avec courbure : sort du bord droit de la source, entre par le bord gauche de la cible
          const x0 = src.x + NODE_W
          const mid = (tgt.x - x0) / 2
          const pathD = `
            M ${x0} ${srcY}
            C ${x0 + mid} ${srcY}, ${tgt.x - mid} ${tgtY}, ${tgt.x} ${tgtY}
          `

          return (
            <g key={`link-${i}`}>
              <path
                d={pathD}
                fill="none"
                stroke="rgba(139, 124, 255, 0.7)"
                strokeWidth={bandWidth * 2}
                strokeLinecap="round"
              />
              <path
                d={pathD}
                fill="none"
                stroke="url(#sankey-gradient)"
                strokeWidth={bandWidth * 1.5}
                strokeLinecap="round"
                style={{ opacity: 0.9 }}
              />
            </g>
          )
        })}

        {/* Nœuds : noms à gauche des nœuds de gauche, à droite des nœuds de droite */}
        {[...left, ...right].map((node, i) => (
          <g key={`node-${i}`}>
            <rect
              x={node.x}
              y={node.y}
              width={NODE_W}
              height={NODE_H}
              fill={node.color}
              rx={2}
              ry={2}
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))" }}
            />
            <text
              x={node.right ? node.x + NODE_W + 4 : node.x - 4}
              y={node.y + 19}
              textAnchor={node.right ? "start" : "end"}
              fontSize={12}
              fill="#f4f4f5"
              fontFamily="Inter, ui-sans-serif, system-ui"
            >
              {cut(node.label)}
              {node.label.length > 14 && <title>{node.label}</title>}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
