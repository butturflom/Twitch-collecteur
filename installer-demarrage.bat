@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js n'est pas installe. Telecharge la version LTS sur https://nodejs.org puis relance. & pause & exit /b 1)
if not exist config.json (echo Lance d'abord lancer.bat pour creer et tester config.json. & pause & exit /b 1)
set "VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\TwitchOverlapCollecteur.vbs"
> "%VBS%" echo Set sh = CreateObject("WScript.Shell")
>> "%VBS%" echo sh.CurrentDirectory = "%~dp0."
>> "%VBS%" echo sh.Run "node collecteur.mjs", 0, False
schtasks /Create /TN "TwitchOverlapCollecteur" /TR "wscript.exe \"%~dp0relancer.vbs\"" /SC MINUTE /MO 5 /F >nul
if errorlevel 1 (echo Attention : la tache de relance automatique n'a pas pu etre creee. Le demarrage avec Windows reste actif.) else (echo Relance automatique toutes les 5 minutes : activee.)
start "" wscript "%VBS%"
echo.
echo OK : le collecteur tourne en arriere-plan, se relancera a chaque demarrage de Windows et s'il s'arrete.
echo Journal : %~dp0collecteur.log
pause
