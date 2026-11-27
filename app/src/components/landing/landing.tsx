// Page d'accueil (plan V2, §4) : posée PAR-DESSUS le tableau de bord, qui continue de se charger dessous (l'ancien code a besoin de
// ses éléments dans la page). Elle s'affiche une seule fois : le clic sur le bouton principal enregistre le drapeau « entré » dans le
// localStorage. ?accueil la rouvre ; en démo (?demo) elle ne s'affiche jamais.
// Texte du plan, mis au tutoiement du produit ; rien n'y est inventé (pas de chiffre, de témoignage ni de fonction absente).
// Intro (components/intro/) : un film de 4 s joué AVANT la page d'accueil, une seule fois (drapeau `to2-intro-seen`, distinct de
// `to2-landing-seen`). Voir `introAuChargement` pour les règles.
import { useEffect, useRef, useState, type ComponentType } from "react"
import { Button } from "@/components/ui/button"
import type { TabId } from "@/legacy/bridge"
import type { IntroProps } from "@/components/intro/intro"
import { LandingMap } from "./landing-map"

const KEY = "to2-landing-seen"
const INTRO_KEY = "to2-intro-seen"

export function shouldShowLanding(): boolean {
  try {
    const q = new URLSearchParams(location.search)
    if (q.has("accueil")) return true
    if (q.has("demo")) return false
    return localStorage.getItem(KEY) !== "1"
  } catch {
    return false // stockage indisponible : on ne bloque pas l'accès au tableau de bord
  }
}

export function markLandingSeen() {
  try { localStorage.setItem(KEY, "1") } catch { /* le choix vaut pour cette visite */ }
}

/**
 * L'intro se joue-t-elle à ce chargement ? Évalué UNE fois, au chargement de la page (pas quand l'accueil est rouverte ensuite par
 * l'événement `to2:landing`, où la personne cherche l'explication, pas le film).
 * Il faut que la page d'accueil s'affiche (même condition que `shouldShowLanding`) et :
 *  - jamais en démo (?demo) ;
 *  - jamais avec la réduction des mouvements (la page s'affiche directement) ;
 *  - jamais si le stockage est indisponible (sinon le film se rejouerait à chaque visite) ;
 *  - sinon, si le drapeau `to2-intro-seen` est absent, ou si l'adresse contient ?accueil (le film se rejoue alors à chaque chargement).
 */
function introAuChargement(): boolean {
  try {
    const q = new URLSearchParams(location.search)
    if (q.has("demo")) return false
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return false
    if (!shouldShowLanding()) return false
    const vue = localStorage.getItem(INTRO_KEY) === "1" // lève une erreur si le stockage est indisponible : pas d'intro
    return q.has("accueil") || !vue
  } catch {
    return false
  }
}
let introEnAttente = introAuChargement()
/** Consomme la décision : seule la première page d'accueil de la page chargée peut jouer l'intro. */
const prendreIntro = () => {
  const jouer = introEnAttente
  introEnAttente = false
  return jouer
}
function markIntroSeen() {
  try { localStorage.setItem(INTRO_KEY, "1") } catch { /* tant pis : pas de drapeau, l'intro pourra se rejouer */ }
}

const PILLARS = [
  {
    title: "Ce que les stats publiques ne montrent pas",
    text: "Quels viewers actifs écrivent sur plusieurs chaînes, où ils vont quand un live se termine, et ce que le chat dit vraiment de l’ambiance. Les spectateurs silencieux ne sont pas visibles.",
    where: "Dans l’app : Audiences, Chat.",
  },
  {
    title: "Prépare tes raids, mesure ton audience",
    text: "Des recommandations de raid d’après les flux réels, la fidélité du chat, et le Net Reach d’un groupe de chaînes sans compter deux fois le même viewer actif.",
    where: "Dans l’app : Par chaîne, Rosters, rapports PDF et CSV.",
  },
  {
    title: "Anonyme par construction",
    text: "Les pseudos sont remplacés par une empreinte avant l’envoi, et le texte des messages n’est jamais conservé. Les données sont stockées dans ta propre base Supabase ; le collecteur tourne chez toi, sur ton PC ou dans Docker.",
    where: "Dans l’app : encart « Données anonymisées », en bas du menu latéral.",
  },
]

export function Landing({ onEnter }: { onEnter: (tab?: TabId) => void }) {
  const racine = useRef<HTMLDivElement>(null)
  // Intro : décidée une fois pour toutes au premier affichage. La page est alors dessous, invisible et inerte, jusqu'à l'arrivée.
  const [intro, setIntro] = useState(prendreIntro)
  const [arrivee, setArrivee] = useState<null | "normale" | "rapide">(null)
  const [Intro, setIntroComp] = useState<ComponentType<IntroProps> | null>(null)
  useEffect(() => {
    if (!intro) return
    let vivant = true
    import("@/components/intro/intro").then((m) => vivant && setIntroComp(() => m.Intro), () => vivant && setIntro(false))
    return () => { vivant = false }
  }, [intro])
  // Le focus va sur la page d'accueil dès qu'elle est affichée seule (tout de suite sans intro, à la fin de l'intro sinon).
  useEffect(() => { if (!intro) racine.current?.focus() }, [intro])
  useEffect(() => {
    // Pendant l'intro, Échap la passe (c'est elle qui l'écoute) : il ne ferme pas la page d'accueil.
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !intro && onEnter()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onEnter, intro])

  return (
    <>
    <div
      ref={racine}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Accueil de Twitch Overlap"
      inert={intro}
      className="fixed inset-0 z-[60] outline-none overflow-y-auto overscroll-contain bg-background text-foreground animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
    >
      <div
        className="transition-opacity ease-linear"
        style={{ opacity: intro && !arrivee ? 0 : 1, transitionDuration: arrivee === "rapide" ? "200ms" : "300ms" }}
      >
      <header className="mx-auto flex h-16 max-w-[1120px] items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-6">
            <circle cx="9" cy="12" r="6" strokeWidth="1.8" style={{ stroke: "var(--primary)" }} />
            <circle cx="15" cy="12" r="6" strokeWidth="1.8" style={{ stroke: "var(--primary-soft)" }} />
          </svg>
          <span className="text-sm font-semibold tracking-[-0.015em] whitespace-nowrap">Twitch Overlap</span>
        </div>
        <Button variant="secondary" className="border border-white/10 transition-colors duration-200" onClick={() => onEnter()}>
          Ouvrir le tableau de bord
        </Button>
      </header>

      <main>
        <div className="mx-auto grid max-w-[1120px] items-center gap-10 px-6 pt-8 pb-16 lg:grid-cols-[1.05fr_1fr] lg:pt-14 lg:pb-20">
          <div>
            <h1 className="max-w-[16ch] text-[2.5rem]/[1.08] font-semibold tracking-[-0.03em] text-balance sm:text-[3.25rem]/[1.05]">
              Cartographie les flux invisibles des communautés Twitch.
            </h1>
            <p className="mt-5 max-w-[52ch] text-[1.0625rem]/[1.6] text-pretty text-muted-foreground">
              Suis les déplacements des viewers actifs (ceux qui écrivent dans le chat) d’une chaîne à l’autre, anticipe les raids et mesure le Net Reach de tes groupes de chaînes.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap">
              <Button className="h-11 w-full px-5 text-[15px] shadow-action sm:w-auto" onClick={() => onEnter()}>
                Ouvrir le tableau de bord
              </Button>
              <Button
                variant="ghost"
                className="h-11 w-full px-4 text-[15px] sm:w-auto lg:hidden"
                onClick={() => document.getElementById("landing-piliers")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" })}
              >
                Voir ce que ça mesure
              </Button>
            </div>
          </div>
          <figure className="mx-auto w-full max-w-[300px] sm:max-w-[520px]">
            <LandingMap className="w-full" />
            <figcaption className="mt-3 text-center text-xs text-balance text-dusk">Illustration. La Carte de ton tableau de bord affiche tes vraies chaînes.</figcaption>
          </figure>
        </div>

        <div id="landing-piliers" className="mx-auto max-w-[1120px] px-6 pb-20">
          <h2 className="mb-4 text-[15px] text-muted-foreground">Ce que ça mesure</h2>
          <div className="grid gap-x-12 gap-y-10 border-t border-border pt-10 md:grid-cols-3">
            {PILLARS.map((p) => (
              <div key={p.title}>
                <h3 className="max-w-[26ch] text-[15px] leading-[1.45] font-semibold tracking-[-0.015em] text-balance md:min-h-[2.9em]">{p.title}</h3>
                <p className="mt-2 max-w-[42ch] text-[13.5px]/[1.6] text-pretty text-muted-foreground">{p.text}</p>
                <p className="mt-3 text-xs text-dusk">{p.where}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-6 py-5 text-xs text-dusk">
          <span>Twitch Overlap · analyse d’audience</span>
          <button
            type="button"
            onClick={() => onEnter("settings")}
            className="rounded-md text-primary-soft underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Réglages et source des données
          </button>
        </div>
      </footer>
      </div>
    </div>
    {intro && Intro && (
      <Intro
        onArrive={(rapide) => setArrivee(rapide ? "rapide" : "normale")}
        onDone={() => { markIntroSeen(); setIntro(false) }}
        getTarget={() => racine.current?.querySelector("figure svg")?.getBoundingClientRect() ?? null}
      />
    )}
    </>
  )
}
