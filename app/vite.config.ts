import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { viteSingleFile } from "vite-plugin-singlefile"

// Le build produit UN seul fichier HTML autonome (JS et CSS inclus),
// recopié ensuite en ../twitch-overlap.html : il s'ouvre toujours en double-clic.
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  build: { outDir: "dist", emptyOutDir: true },
})
