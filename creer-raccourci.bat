@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem Crée l'icône « Twitch Overlap » sur le Bureau et dans le menu Démarrer. À relancer si tu déplaces ce dossier.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$sh = New-Object -ComObject WScript.Shell; foreach ($d in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) { $s = $sh.CreateShortcut((Join-Path $d 'Twitch Overlap.lnk')); $s.TargetPath = (Join-Path $env:WINDIR 'System32\wscript.exe'); $s.Arguments = '\"%~dp0ouvrir-twitch-overlap.vbs\"'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = '%~dp0twitch-overlap.ico,0'; $s.Description = 'Ouvre le tableau de bord Twitch Overlap'; $s.Save() }"
if errorlevel 1 (echo Le raccourci n'a pas pu etre cree.) else (echo Icone "Twitch Overlap" creee sur le Bureau et dans le menu Demarrer.)
pause
