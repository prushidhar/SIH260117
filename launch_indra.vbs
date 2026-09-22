Set WshShell = CreateObject("WScript.Shell")

' 1. Ensure D: drive mapped
WshShell.Run "subst D: C:\", 0, True

' 2. Free ports 8000 and 3000 so Errno 10048 never happens
WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -aon ^| findstr "":8000"" ^| findstr ""LISTENING""') do taskkill /f /pid %a", 0, True
WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -aon ^| findstr "":3000"" ^| findstr ""LISTENING""') do taskkill /f /pid %a", 0, True

' 3. Start Backend in 100% invisible console
WshShell.Run "cmd /c cd /d C:\Users\booya\OneDrive\Desktop\SIH260117-main\backend && ""C:\Users\booya\AppData\Local\Programs\Python\Python314\python.exe"" -m uvicorn main:app --host 0.0.0.0 --port 8000", 0, False

' 4. Start Updated Frontend in 100% invisible console
WshShell.Run "cmd /c cd /d ""C:\Users\booya\OneDrive\Desktop\SIH frontend 1\SIH frontend 1\katty\indra"" && ""C:\Program Files\nodejs\npm.cmd"" run dev", 0, False

' 5. Poll until frontend is ready (up to 120 seconds)
Dim http, ready, elapsed
Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
ready = False
elapsed = 0
Do While Not ready And elapsed < 120
    WScript.Sleep 3000
    elapsed = elapsed + 3
    On Error Resume Next
    http.open "GET", "http://localhost:3000", False
    http.setTimeouts 0, 2000, 2000, 2000
    http.send
    If Err.Number = 0 Then
        If http.status = 200 Or http.status = 307 Or http.status = 308 Then
            ready = True
        End If
    End If
    Err.Clear
    On Error GoTo 0
Loop
Set http = Nothing

' 6. Open INDRA Workbench directly in default browser
WshShell.Run "http://localhost:3000/workbench"

Set WshShell = Nothing
