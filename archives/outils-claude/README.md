# Outils Claude archivés

Éléments de `.claude/` retirés du projet le 26/11. Ils ne sont plus chargés par Claude Code (seuls `.claude/skills/` et `.claude/agents/` le sont). Historique seulement.

| Élément | Raison |
|---|---|
| `skills/impeccable/` et `agents/impeccable-*.md` | Remplacé par `ui-ux-pro-max` pour le design (décision de l'utilisateur, 26/11 : rendu jugé trop « AI slop ») |
| `skills/vercel-*`, `skills/deploy-to-vercel/` | Hors sujet : tableau de bord en HTML unique et base Supabase, pas d'hébergement Vercel |
| `agents/analyste.md`, `agents/app-developer.md` | Gabarits génériques sans lien avec le projet (« score >85 % », commande inconnue), jamais appelés. Retirés le 26/11 sur demande |
| `skills/web-design-guidelines/`, `skills/writing-guidelines/` | Recoupent `ui-ux-pro-max` (design) et la discipline de rédaction déjà dans `CLAUDE.md`. Retirés le 26/11 sur demande |
| `skills/contremaitre/` | Fusionné dans l'agent `orchestrateur` (section « Idées et plans ») le 26/11 : un seul agent tient les idées et les plans, donc un seul suivi |

Pour restaurer un élément : `git mv archives/outils-claude/skills/<nom> .claude/skills/<nom>` (ou `agents/`), puis le référencer dans `CLAUDE.md`.
