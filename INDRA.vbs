' INDRA — Sovereign AI Workbench Silent Launcher
Dim WshShell
Set WshShell = CreateObject("WScript.Shell")

' 1. Ensure virtual drive D: is mapped for local model access
WshShell.Run "subst D: C:\", 0, True

' 2. Launch master desktop supervisor via pythonw (zero console flash)
Dim pythonExe, launcherScript
pythonExe = "C:\Users\booya\AppData\Local\Programs\Python\Python314\pythonw.exe"
launcherScript = "C:\Users\booya\OneDrive\Desktop\SIH260117-main\desktop_launcher.py"

WshShell.Run Chr(34) & pythonExe & Chr(34) & " " & Chr(34) & launcherScript & Chr(34), 0, False

Set WshShell = Nothing
