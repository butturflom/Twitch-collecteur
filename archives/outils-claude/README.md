# Outils Claude archivés

Éléments de `.claude/` retirés du projet le 26/11. Ils ne sont plus chargés par Claude Code (seuls `.claude/skills/` et `.claude/agents/` le sont). Historique seulement.

| Élément | Raison |
|---|---|
| `skills/impeccable/` et `agents/impeccable-*.md` | Remplacé par `ui-ux-pro-max` pour le design (décision de l'utilisateur, 26/11 : rendu jugé trop « AI slop ») |
| `skills/vercel-*`, `skills/deploy-to-vercel/` | Hors sujet : tableau de bord en HTML unique et base Supabase, pas d'hébergement Vercel |

Pour restaurer un élément : `git mv archives/outils-claude/skills/<nom> .claude/skills/<nom>` (ou `agents/`), puis le référencer dans `CLAUDE.md`.
