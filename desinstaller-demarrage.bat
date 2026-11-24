@echo off
chcp 65001 >nul
cd /d "%~dp0"
schtasks /Delete /TN "TwitchOverlapCollecteur" /F >nul 2>nul
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\TwitchOverlapCollecteur.vbs" 2>nul
if not exist collecteur.pid goto fin
rem Arrêt propre : le collecteur voit ce fichier, envoie ses dernières données puis s'arrête de lui-même.
echo.> arreter.flag
echo Arret du collecteur, envoi des dernieres donnees (20 s au plus)...
for /l %%i in (1,1,20) do if exist collecteur.pid ping -n 2 127.0.0.1 >nul
rem S'il ne s'est pas arrêté (version ancienne, bloqué), on le force. Ce qui n'est pas envoyé reste dans en-attente.json.
rem Seulement si ce numéro de processus est bien le collecteur : après une coupure de courant, le fichier peut être resté
rem et Windows a pu redonner ce numéro à un tout autre programme.
if exist collecteur.pid (for /f "tokens=1 delims=:" %%p in (collecteur.pid) do powershell -NoProfile -Command "$x = Get-CimInstance Win32_Process -Filter 'ProcessId=%%p'; if ($x -and $x.CommandLine -like '*collecteur.mjs*') { Stop-Process -Id %%p -Force }" >nul 2>nul)
del collecteur.pid 2>nul
:fin
del arreter.flag 2>nul
echo Collecteur arrete et retire du demarrage de Windows.
pause
