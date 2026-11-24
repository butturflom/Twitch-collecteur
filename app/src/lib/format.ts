// Formats de nombres identiques à ceux de l'ancien code (legacy.js : fmt, fmt1, pct).
export const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR")
export const fmt1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString("fr-FR")
export const pct = (x: number | null | undefined) =>
  x != null && isFinite(x) ? (x * 100).toFixed(x < 0.1 ? 1 : 0).replace(".", ",") + " %" : "—"
export const signedPct = (x: number) => (x > 0 ? "+" : "") + pct(x)
