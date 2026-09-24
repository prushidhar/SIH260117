' INDRA — Sovereign AI Workbench Launcher
' Double-click this file to launch the full workbench control panel.
' No console window. No popups. Just the GUI.

Dim WshShell
Set WshShell = CreateObject("WScript.Shell")

Dim pythonExe
pythonExe = "C:\Users\booya\AppData\Local\Programs\Python\Python314\pythonw.exe"

Dim launcherScript
launcherScript = "C:\Users\booya\OneDrive\Desktop\SIH260117-main\desktop_launcher.py"

' Run pythonw (no console) — window style 0 = hidden, bWaitOnReturn = False
WshShell.Run Chr(34) & pythonExe & Chr(34) & " " & Chr(34) & launcherScript & Chr(34), 1, False

Set WshShell = Nothing
