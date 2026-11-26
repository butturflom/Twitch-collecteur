import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App"

// Pas de <StrictMode> : il monte les composants deux fois en développement,
// et l'ancien code (injecté une seule fois) n'aime pas que ses éléments soient recréés.
const root = createRoot(document.getElementById("root")!)

// Prototype E1 (planètes low-poly), en développement seulement : ?demo=planets monte une page autonome à la place du
// tableau de bord (sans l'ancien code ni les données de démo). Au build, la condition vaut false : l'import disparaît.
if (import.meta.env.DEV && new URLSearchParams(location.search).get("demo") === "planets") {
  import("./dev/planets-demo").then((m) => root.render(<m.default />))
} else {
  root.render(<App />)
}

// Mode démo (développement seulement) : http://localhost:5173/?demo
if (import.meta.env.DEV && new URLSearchParams(location.search).has("demo") && new URLSearchParams(location.search).get("demo") !== "planets") {
  import("./dev/demo").then((m) => m.installDemo())
}
