import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App"

// Pas de <StrictMode> : il monte les composants deux fois en développement,
// et l'ancien code (injecté une seule fois) n'aime pas que ses éléments soient recréés.
createRoot(document.getElementById("root")!).render(<App />)

// Mode démo (développement seulement) : http://localhost:5173/?demo
if (import.meta.env.DEV && new URLSearchParams(location.search).has("demo")) {
  import("./dev/demo").then((m) => m.installDemo())
}
