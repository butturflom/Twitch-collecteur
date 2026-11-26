@echo off
chcp 65001 >nul
cd /d "%~dp0"
where claude >/dev/null 2>/dev/null || (echo Claude Code est introuvable. Verifie son installation ou le PATH. & pause & exit /b 1)
echo Claude Code en mode orchestrateur, dans %CD%.
claude --agent orchestrateur
pause
