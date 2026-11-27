// Matrice de chevauchement (onglet Par jeu ; Audiences a la sienne, resserrée) : chaque case = part des viewers actifs
// de la ligne qu'on a aussi vus chez la colonne, avec le nombre de personnes en dessous.
import { ChannelAvatar } from "@/components/channel-avatar"
import { Empty, heatFill, panel } from "@/components/overview/parts"
import { fmt, pct } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useScrollCue } from "@/lib/scroll-cue"
import type { MatrixData } from "@/legacy/bridge"

export function Matrix({ data, label }: { data: MatrixData | null; label: string }) {
  if (!data || data.rows.length < 2) return <Empty>Il faut au moins deux éléments avec des viewers actifs sur cette période.</Empty>
  const keys = data.rows
  return <MatrixTable data={data} label={label} keys={keys} />
}

function MatrixTable({ data, label, keys }: { data: MatrixData; label: string; keys: MatrixData["rows"] }) {
  const cue = useScrollCue<HTMLDivElement>()
  return (
    <div ref={cue} className={cn(panel, "scroll-cue overflow-x-auto p-2")}>
      <table className="w-full border-separate border-spacing-[3px] font-mono text-[12.5px] tabular-nums">
        <thead>
          <tr>
            <th className="px-1 text-left align-bottom font-sans text-[11px] font-medium text-dusk max-sm:min-w-32 sm:w-56">{label} la ligne, vus aussi chez la colonne</th>
            {keys.map((k) => (
              <th key={k.k} className="px-2 pb-1 align-bottom font-sans text-xs font-medium text-foreground">
                {k.who ? (
                  <span className="flex flex-col items-center gap-1.5"><ChannelAvatar {...k.who} size={28} /><span>{k.k}</span></span>
                ) : (
                  <span className="block max-w-[120px] truncate" title={k.k}>{k.k}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keys.map((row) => (
            <tr key={row.k} className="group">
              <th className="pr-2 pl-1 text-left font-sans text-[13px] font-medium whitespace-nowrap">
                <span className="inline-flex items-center gap-2">
                  {row.who && <ChannelAvatar {...row.who} />}
                  <span className="max-w-[180px] truncate max-sm:max-w-[7.5rem]" title={row.k}>{row.k}</span>
                  <span className="font-mono text-xs font-normal text-muted-foreground">({fmt(row.size)})</span>
                </span>
              </th>
              {row.cells.map((cell, i) =>
                cell ? (
                  <td key={i} title={`${cell.n} viewers actifs en commun`} style={heatFill(cell.r)} className="rounded-[7px] bg-white/[.025] px-3 py-2 text-center whitespace-nowrap transition-[filter] group-hover:brightness-110">
                    {pct(cell.r)}
                    <span className="block text-[11px] opacity-70">{fmt(cell.n)}</span>
                  </td>
                ) : (
                  <td key={i} aria-label="même élément" className="rounded-[7px] bg-[repeating-linear-gradient(135deg,var(--white-5)_0_2px,transparent_2px_6px)] px-3 py-2 text-center text-dusk"></td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
