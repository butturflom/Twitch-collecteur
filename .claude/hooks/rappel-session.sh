#!/usr/bin/env bash
# SessionStart : rappelle où en est le projet (SUIVI.md §0) et l'état git.
# Ne bloque jamais la session : sortie 0 dans tous les cas.
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

echo "=== Rappel de session (SUIVI.md §0 : où on en est) ==="
awk '/^## 0\./{f=1; next} /^## 1\./{f=0} f' SUIVI.md 2>/dev/null

echo "=== État git ==="
echo "Branche : $(git branch --show-current 2>/dev/null)"
git status --short 2>/dev/null | head -20
exit 0
