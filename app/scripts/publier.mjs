// Recopie le build (un seul fichier) à la racine du dossier, là où l'ouvre ouvrir-twitch-overlap.vbs.
import { copyFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
const src = fileURLToPath(new URL("../dist/index.html", import.meta.url))
const dst = fileURLToPath(new URL("../../twitch-overlap.html", import.meta.url))
copyFileSync(src, dst)
console.log("Tableau de bord publié :", dst)
