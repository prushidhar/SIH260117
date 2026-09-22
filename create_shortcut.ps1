$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath "Sovereign AI Workbench.lnk"
$TargetDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"$TargetDir\launch_silent.vbs`""
$Shortcut.WorkingDirectory = $TargetDir
$Shortcut.Description = "INDRA-X Sovereign AI Workbench & Repo Monitor"
$Shortcut.IconLocation = "shell32.dll,220"
$Shortcut.Save()

Write-Host "Desktop Shortcut Created: $ShortcutPath"
