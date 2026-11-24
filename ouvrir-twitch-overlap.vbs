' Ouvre le tableau de bord Twitch Overlap dans le navigateur par défaut.
' Relance aussi le collecteur s'il ne tourne pas (s'il tourne déjà, la nouvelle instance se ferme aussitôt).
' C'est ce fichier que lance l'icône « Twitch Overlap » du Bureau (créée par creer-raccourci.bat).
On Error Resume Next
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
dossier = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dossier
If fso.FileExists(dossier & "\config.json") Then sh.Run "node collecteur.mjs", 0, False
Err.Clear
sh.Run """" & dossier & "\twitch-overlap.html""", 1, False
If Err.Number <> 0 Then MsgBox "Impossible d'ouvrir twitch-overlap.html : " & Err.Description, vbExclamation, "Twitch Overlap"
