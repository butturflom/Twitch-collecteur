#!/usr/bin/env bash
# UserPromptSubmit : rappel court à chaque message, sans lancer de skill.
# Copie résumée du routage de .claude/agents/orchestrateur.md : en cas d'écart, orchestrateur.md fait foi.
cat <<'EOF'
Rappel projet : idée nouvelle -> orchestrateur (range dans IDEES.md, évalue). Modification de app/src -> worktree, puis /verifier avant commit. Question simple -> réponse directe, sans skill. Design -> ui-ux-pro-max (DESIGN.md prime). 3D -> Higgsfield ou Spline, prototype isolé d'abord. Rien ne se fusionne sans demande.
EOF
exit 0
