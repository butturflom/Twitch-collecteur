' Lance le collecteur sans fenêtre. Appelé toutes les 5 minutes par la tâche planifiée « TwitchOverlapCollecteur ».
' Si le collecteur tourne déjà, la nouvelle instance se ferme aussitôt (une seule instance à la fois).
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = fso.GetParentFolderName(WScript.ScriptFullName)
sh.Run "node collecteur.mjs", 0, False
