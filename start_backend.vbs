Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "subst D: C:\", 0, True
WshShell.Run "cmd /c cd /d C:\Users\booya\OneDrive\Desktop\SIH260117-main\backend && ""C:\Users\booya\AppData\Local\Programs\Python\Python314\python.exe"" -m uvicorn main:app --host 0.0.0.0 --port 8000", 0, False
Set WshShell = Nothing
