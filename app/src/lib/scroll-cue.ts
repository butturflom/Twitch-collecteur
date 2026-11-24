// Indice de défilement horizontal : marque le conteneur quand il reste du contenu à droite (data-more-end) ou
// qu'on a déjà défilé (data-scrolled). index.css s'en sert pour estomper le bord droit et ombrer la colonne collée :
// sur petit écran, un tableau coupé ne doit pas avoir l'air complet.
import { useEffect, useRef } from "react"

export function useScrollCue<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const max = el.scrollWidth - el.clientWidth
      el.toggleAttribute("data-more-end", max > 1 && el.scrollLeft < max - 1)
      el.toggleAttribute("data-scrolled", el.scrollLeft > 1)
    }
    update()
    el.addEventListener("scroll", update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    // le contenu change sans que le conteneur change de taille (nouvelles données)
    const mo = new MutationObserver(update)
    mo.observe(el, { childList: true, subtree: true })
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); mo.disconnect() }
  }, [])
  return ref
}
