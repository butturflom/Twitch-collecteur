// Diagramme de Sankey pour visualiser les flux de viewers.
// Vue utilisant un composant SVG pur, pas de dépendance externe.
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

  // Rien à afficher
  if (links.length === 0) return null

  // Calculer les positions des nœuds et les liens
  const { nodePos } = useMemo(() => {
    // Trouver les nœuds uniques dans les liens
    const nodeIds = new Set<string>()
    for (const link of links) {
      nodeIds.add(link.source)
      nodeIds.add(link.target)
    }

    const totalValue = links.reduce((s, l) => s + l.value, 0)
    if (nodeIds.size === 0 || totalValue === 0) {
      return { nodePos: [] }
    }

    // Tri des nœuds par valeur totale (entrées + sorties)
    const nodeMap = new Map<string, SankeyNode & { total: number }>()
    for (const node of nodes) {
      nodeMap.set(node.id, { ...node, total: 0 })
    }

    // Calculer les totaux
    for (const link of links) {
      const src = nodeMap.get(link.source)
      const tgt = nodeMap.get(link.target)
      if (src) src.total += link.value
      if (tgt) tgt.total += link.value
    }

    // Trier par total décroissant
    const sortedIds = [...nodeIds].sort((a, b) => {
      const ta = nodeMap.get(a)?.total ?? 0
      const tb = nodeMap.get(b)?.total ?? 0
      return tb - ta
    })

    // Calculer les positions
    const padding = 40
    const nodeHeight = 30
    const nodeSpacing = 8

    const nodePos: (SankeyNode & { x: number; y: number })[] = []

    sortedIds.forEach((id, i) => {
      const node = nodeMap.get(id) ?? nodes.find(n => n.id === id) ?? { id, label: id, color: "#666", total: 0 }
      const y = padding + i * (nodeHeight + nodeSpacing) + nodeHeight / 2
      nodePos.push({ ...node, x: padding, y })
    })

    return { nodePos }
  }, [nodes, links, width])

  const widthAvailable = Math.max(width, 400)
  const heightAvailable = height

  return (
    <div ref={box} className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${widthAvailable} ${heightAvailable + 100}`}
        width="100%"
        height={heightAvailable + 100}
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
          const src = nodePos.find(n => n.id === link.source)
          const tgt = nodePos.find(n => n.id === link.target)
          if (!src || !tgt) return null

          const srcY = src.y + 15
          const tgtY = tgt.y + 15
          const bandWidth = Math.max(3, Math.sqrt(link.value) / 5)

          // Chemin Sankey avec courbure
          const pathD = `
            M ${src.x + 24} ${srcY}
            C ${src.x + 24 + 30} ${srcY}, ${tgt.x - 30} ${tgtY}, ${tgt.x} ${tgtY}
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

        {/* Nœuds */}
        {nodePos.map((node, i) => (
          <g key={`node-${i}`}>
            <rect
              x={node.x}
              y={node.y}
              width={24}
              height={30}
              fill={node.color}
              rx={2}
              ry={2}
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))" }}
            />
            <text
              x={node.x + 28}
              y={node.y + 19}
              fontSize={12}
              fill="#f4f4f5"
              fontFamily="Inter, ui-sans-serif, system-ui"
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}