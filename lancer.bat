@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js n'est pas installe. Telecharge la version LTS sur https://nodejs.org puis relance. & pause & exit /b 1)
if not exist config.json (copy config.exemple.json config.json >nul & echo config.json cree : remplis-le, enregistre, puis relance lancer.bat. & notepad config.json & exit /b 1)
echo Collecteur Twitch Overlap - Ctrl+C pour arreter.
node collecteur.mjs
pause
