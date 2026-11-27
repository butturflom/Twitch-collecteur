// Partie « En commun » de l'onglet Audiences : ce que les chaînes partagent, sans ordre ni sens. Données : legacy:overlap.
// Le filtre de viewers ne s'applique qu'ici ; il passe par setOverlapFilter(), qui recalcule la page.
import { OverlapIcon } from "@/components/app-sidebar"
import { ChannelAvatar } from "@/components/channel-avatar"
import { Empty, heatFill, panel } from "@/components/overview/parts"
import { fmt, pct } from "@/lib/format"
import { useScrollCue } from "@/lib/scroll-cue"
import { cn } from "@/lib/utils"
import type { MatrixData, OverlapData } from "@/legacy/bridge"
import { Block, Note, Part, RankList } from "./parts"

/** Filtre de viewers : contrôle segmenté, avec le nombre de viewers de chaque groupe. */
function FilterBar({ d }: { d: OverlapData }) {
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-dusk">Viewers</span>
        <div role="radiogroup" aria-label="Viewers pris en compte" className="inline-flex flex-wrap gap-0.5 rounded-[11px] border border-border bg-well p-[3px] shadow-field-well">
          {d.filters.map((f) => {
            const on = f.key === d.filter
            return (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={on}
                title={f.tip}
                onClick={() => window.setOverlapFilter?.(f.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  on ? "bg-accent text-foreground shadow-thumb" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
                <span className={cn("font-mono text-[11px]", on ? "text-primary-soft" : "text-dusk")}>{fmt(f.count)}</span>
              </button>
            )
          })}
        </div>
        <span className="text-xs text-dusk">Ce filtre ne change que « En commun ».</span>
      </div>
      {d.filterNote && (
        <p className="mt-2.5 max-w-[72ch] text-xs leading-relaxed text-muted-foreground">
          « En commun » est calculé sur les <b className="font-semibold text-foreground">{fmt(d.filterNote.count)}</b> viewers actifs qui {d.filterNote.desc}, soit {pct(d.filterNote.share)} des {fmt(d.filterNote.total)}.
        </p>
      )}
    </div>
  )
}

/** Matrice resserrée : les colonnes ne portent que la planète de la chaîne, dans l'ordre des lignes (nom au survol et pour les lecteurs d'écran). */
function Matrix({ data }: { data: MatrixData }) {
  const cue = useScrollCue<HTMLDivElement>()
  // teinte relative à la plus forte case : les parts entre chaînes sont souvent de quelques pour cent
  const max = Math.max(0, ...data.rows.flatMap((r) => r.cells.map((c) => c?.r ?? 0))) || 1
  return (
    <div ref={cue} className={cn(panel, "scroll-cue overflow-x-auto")}>
      <table className="w-full border-collapse font-mono text-[12px] tabular-nums">
        <thead>
          <tr className="border-b border-border bg-white/[.015]">
            <th className="py-2 pr-1 pl-3.5 text-left align-middle font-sans text-[11px] font-medium text-dusk">Viewers actifs de</th>
            {data.rows.map((c) => (
              <th key={c.k} title={c.k} className="px-0.5 py-2 text-center">
                {c.who && <ChannelAvatar {...c.who} size={20} />}
                <span className="sr-only">{c.k}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.k} className="border-t border-white/5">
              <th className="py-1.5 pr-1 pl-3.5 text-left font-sans text-[12.5px] font-medium whitespace-nowrap">
                <span className="inline-flex items-center gap-2">
                  {row.who && <ChannelAvatar {...row.who} />}
                  <span className="max-w-[12ch] truncate" title={row.k}>{row.k}</span>
                </span>
              </th>
              {row.cells.map((cell, i) => {
                if (!cell) return <td key={i} aria-label="même chaîne" className="bg-[repeating-linear-gradient(135deg,var(--white-5)_0_2px,transparent_2px_6px)]" />
                const t = (cell.r ?? 0) / max
                const style = cell.n ? heatFill(t * 0.5) : undefined
                // sur un fond soutenu, la brume passe sous 4,5:1 : le nombre du dessous devient clair
                const strong = t > 0.4
                return (
                  <td key={i} title={`${row.k} vers la colonne ${data.rows[i].k} : ${fmt(cell.n)} en commun`} style={style} className="px-0.5 py-1.5 text-center leading-tight whitespace-nowrap">
                    {cell.n ? pct(cell.r) : <span className="text-dusk">—</span>}
                    {cell.n > 0 && <span className={cn("block text-[10.5px]", strong ? "text-white/90" : "text-muted-foreground")}>{fmt(cell.n)}</span>}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Commun({ d }: { d: OverlapData }) {
  return (
    <Part id="aud-commun" icon={<OverlapIcon />} title="En commun" sub="Qui écrit chez plusieurs de tes chaînes, sans ordre ni sens : deux chaînes partagent des viewers actifs, c’est tout ce que ces chiffres disent.">
      <FilterBar d={d} />
      <div className="grid items-start gap-x-4 gap-y-9 lg:grid-cols-2">
        <Block title="Paires les plus proches">
          {d.pairs.length ? (
            <>
              <RankList
                rows={d.pairs.map((p) => ({
                  key: p.a.c + "+" + p.b.c,
                  v: p.share,
                  right: <><b className="font-medium text-foreground">{pct(p.share)}</b> · {fmt(p.n)} pers.</>,
                  label: (
                    <span className="flex min-w-0 items-center gap-1.5">
                      <ChannelAvatar {...p.a} /><span className="truncate" title={p.a.c}>{p.a.c}</span>
                      {/* deux cercles et pas une flèche : une paire n'a pas de sens, ce n'est pas un trajet */}
                      <span role="img" aria-label="et" className="inline-flex shrink-0 text-dusk"><OverlapIcon className="size-3.5" /></span>
                      <ChannelAvatar {...p.b} /><span className="truncate" title={p.b.c}>{p.b.c}</span>
                    </span>
                  ),
                }))}
              />
              <Note>
                Part des viewers actifs de la première chaîne (la plus petite des deux) qu’on voit aussi écrire chez la seconde, puis le nombre de personnes en commun. Les paires qui se ressemblent le plus (communs ÷ viewers des deux réunies), rangées sur ce pourcentage. Le signe entre les deux noms n’a pas de sens de lecture : ce n’est pas un trajet.
              </Note>
            </>
          ) : (
            <Empty>Aucune paire : il faut au moins un viewer actif en commun entre deux chaînes sur cette période.</Empty>
          )}
        </Block>
        <Block title="Entre chaînes">
          {d.matrix.rows.length >= 2 ? (
            <>
              <Matrix data={d.matrix} />
              <Note>
                Chaque case = % des viewers actifs de la <b>ligne</b> qu’on a aussi vus écrire dans la <b>colonne</b>. Le chiffre en dessous est le nombre de personnes. Les colonnes suivent l’ordre des lignes.
                {d.chans > d.matrix.rows.length && <> Les {d.matrix.rows.length} chaînes qui ont le plus de viewers actifs, sur {fmt(d.chans)}.</>}
              </Note>
            </>
          ) : (
            <Empty>Il faut au moins deux chaînes avec des viewers actifs sur cette période.</Empty>
          )}
        </Block>
      </div>
    </Part>
  )
}
