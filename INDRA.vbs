' INDRA — Sovereign AI Workbench Silent Launcher
On Error Resume Next
Dim WshShell, fso, scriptDir
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir

' 1. Ensure virtual drive D: is mapped for local model access
WshShell.Run "subst D: C:\", 0, True
Err.Clear

' 2. Launch master desktop supervisor via pythonw (zero console flash)
Dim pythonExe, launcherScript
pythonExe = "C:\Users\booya\AppData\Local\Programs\Python\Python314\pythonw.exe"
launcherScript = scriptDir & "\desktop_launcher.py"

WshShell.Run Chr(34) & pythonExe & Chr(34) & " " & Chr(34) & launcherScript & Chr(34), 0, False

Set WshShell = Nothing
Set fso = Nothing
