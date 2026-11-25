// Page de démonstration du prototype C0 (carte des migrations), en développement seulement :
// http://localhost:5173/?demo=flows-map (14 journées) ou ?demo=flows-map&jours=2 (2 journées).
// App.tsx ne l'importe que si import.meta.env.DEV est vrai : rien de ce fichier n'entre dans le build.
//
// D'où viennent les journées. Les données de démonstration n'ont PAS de passages par jour et par paire : elles ont
// - les passages par paire sur la période (flowsDemo : tous, organiques, raids),
// - les départs par jour et par chaîne (historyDemo : colonne `out`),
// - la liste datée des raids reçus (flowsDemo().raids).
// On répartit donc le total de chaque paire sur les 14 journées au prorata des départs quotidiens de sa chaîne d'origine ;
// une paire classée « raid » dont le raid est daté dans la fenêtre est posée entière sur ce jour-là. Aucun autre chiffre
// n'est ajouté. La part organique suit le classement existant (paire organique : 100 %, paire de raid : 0 %) ; une paire
// absente des deux listes reste « inconnue ». Les vrais passages par jour viendront de la fonction SQL de C1.
import { SankeyDiagram, type SankeyLink, type SankeyNode } from "@/components/charts/sankey"
import { FlowsMap, mapOrder, type FlowDay } from "@/components/flows/flows-map"
import { Section, panel } from "@/components/overview/parts"
import { Two } from "@/components/shared/blocks"
import { cn } from "@/lib/utils"
import { flowsDemo, historyDemo } from "./demo"

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]

/** Répartit `n` selon des poids, en entiers, sans perdre d'unité (plus forts restes). */
function split(n: number, weights: number[]): number[] {
  const s = weights.reduce((a, b) => a + b, 0) || 1
  const raw = weights.map((w) => (n * w) / s)
  const out = raw.map(Math.floor)
  let rest = n - out.reduce((a, b) => a + b, 0)
  const order = raw.map((v, i) => [v - Math.floor(v), i] as const).sort((x, y) => y[0] - x[0])
  for (const [, i] of order) { if (rest-- <= 0) break; out[i]++ }
  return out
}

function buildDays(): FlowDay[] {
  const P = flowsDemo()
  const key = (a: string, b: string) => a + ">" + b
  const raidPairs = new Set(P.flowsRaid.map((f) => key(f.a.c, f.b.c)))
  const orgPairs = new Set(P.flowsOrganic.map((f) => key(f.a.c, f.b.c)))
  const hist = new Map<string, ReturnType<typeof historyDemo>>()
  const histOf = (c: string) => hist.get(c) ?? hist.set(c, historyDemo(c, 14)).get(c)!
  const dates = histOf(P.flows[0].a.c).days.map((x) => x.d)

  // jour d'un raid daté (« mer. 19 nov. 22h31 ») parmi les 14 journées, ou -1
  const raidDay = (from: string, to: string) => {
    const r = P.raids.find((x) => x.from?.c === from && x.to.c === to)
    const m = r?.when.match(/(\d{1,2}) (\S+)/)
    if (!m) return -1
    const mm = String(MONTHS.indexOf(m[2]) + 1).padStart(2, "0"), dd = m[1].padStart(2, "0")
    return dates.findIndex((d) => d.slice(5) === `${mm}-${dd}`)
  }

  const days: FlowDay[] = dates.map((d) => ({ d, routes: [] }))
  for (const f of P.flows) {
    const k = key(f.a.c, f.b.c)
    const isRaid = raidPairs.has(k)
    const rd = isRaid ? raidDay(f.a.c, f.b.c) : -1
    const per = rd >= 0 ? dates.map((_, i) => (i === rd ? f.n : 0)) : split(f.n, histOf(f.a.c).days.map((x) => x.out))
    per.forEach((n, i) => {
      if (n > 0) days[i].routes.push({ a: f.a, b: f.b, n, organic: isRaid ? 0 : orgPairs.has(k) ? n : null })
    })
  }
  return days
}

export default function FlowsMapDemo() {
  const q = Number(new URLSearchParams(location.search).get("jours"))
  const nDays = Math.max(1, Math.min(14, Number.isFinite(q) && q > 0 ? Math.round(q) : 14))
  const days = buildDays().slice(-nDays)
  const order = mapOrder(days)

  // Le Sankey reçoit la même fenêtre, sommée : la période d'un côté, la journée de l'autre
  const sum = new Map<string, SankeyLink>()
  for (const d of days) for (const r of d.routes) {
    const k = r.a.c + ">" + r.b.c
    const l = sum.get(k)
    if (l) l.value += r.n
    else sum.set(k, { source: r.a.c, target: r.b.c, value: r.n })
  }
  const links = [...sum.values()].sort((x, y) => y.value - x.value)
  const nodes: SankeyNode[] = order.map((o) => ({ id: o.c, label: o.c, color: o.color }))

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:slide-in-from-bottom-0">
      <p className="mb-6 max-w-[72ch] rounded-[10px] border border-dashed border-input px-3.5 py-2.5 text-xs leading-relaxed text-dusk">
        <b className="font-semibold text-muted-foreground">Prototype C0, mode démo.</b> Les journées sont dérivées des données de démonstration
        (totaux par paire sur la période, répartis selon les départs quotidiens de chaque chaîne ; raid daté posé sur son jour).
        Rien n’est lu dans la base. Fenêtre : {days.length} journée{days.length > 1 ? "s" : ""} (<code>&amp;jours=2</code> ou <code>&amp;jours=14</code>).
      </p>
      <Two>
        <Section title="Diagramme de flux" note={<>Le Sankey actuel, sur toute la fenêtre de {days.length} journée{days.length > 1 ? "s" : ""}.</>}>
          <div className={cn(panel, "p-2")}>
            <SankeyDiagram nodes={nodes} links={links} height={180} />
          </div>
        </Section>
        <Section
          title="Carte des migrations"
          note={<>Une flèche = des viewers actifs qui écrivent chez A, puis chez B moins de 3 h après, <b>le même jour</b>. À droite, vers une chaîne placée plus bas ; à gauche, vers une chaîne placée plus haut. Épaisseur : même échelle pour toutes les journées. Chaînes dans l’ordre du Sankey.</>}
        >
          <div className={cn(panel, "p-4")}>
            <FlowsMap days={days} order={order} />
          </div>
        </Section>
      </Two>
    </div>
  )
}
