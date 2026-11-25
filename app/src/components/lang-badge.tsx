// Langue(s) d'une chaîne. Une langue : pastille grise (FR, US, ES…). Plusieurs : pastille violette avec une icône,
// pour qu'une chaîne multilingue se remarque (RU · EN).
import { Languages } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const NAMES: Record<string, string> = {
  fr: "français", en: "anglais", us: "anglais (américain)", es: "espagnol", pt: "portugais", de: "allemand",
  it: "italien", ru: "russe", uk: "ukrainien", pl: "polonais", ja: "japonais", ko: "coréen", zh: "chinois",
  ar: "arabe", tr: "turc", nl: "néerlandais",
}
// « uk » est le code de l'ukrainien : affiché UA pour ne pas le confondre avec le Royaume-Uni.
const SHOW: Record<string, string> = { uk: "UA" }
const show = (l: string) => SHOW[l] ?? l.toUpperCase()
const name = (l: string) => NAMES[l] ?? l.toUpperCase()

function sentence(langs: string[]) {
  const n = langs.map(name)
  if (langs.length === 1) return langs[0] === "us" ? "Streamer américain, en anglais" : `Stream en ${n[0]}`
  return `Multilingue : stream en ${n.slice(0, -1).join(", ")} et en ${n[n.length - 1]}`
}

export function LangBadge({ langs, className }: { langs?: string[] | null; className?: string }) {
  if (!langs?.length) return null
  const multi = langs.length > 1
  return (
    <Badge
      variant="outline"
      title={sentence(langs)}
      aria-label={sentence(langs)}
      className={cn(
        "h-5 gap-1 px-1.5 font-mono text-[11px]",
        multi ? "border-primary/60 bg-primary/15 text-violet-ink" : "border-input text-muted-foreground",
        className,
      )}
    >
      {multi && <Languages aria-hidden className="!size-2.5" />}
      {langs.map(show).join(" · ")}
    </Badge>
  )
}
