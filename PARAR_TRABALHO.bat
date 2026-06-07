@echo off
echo Finalizando worker local do Hook Hustle Engine em segundo plano...
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"CommandLine Like '%%worker.py%%'\" | Remove-CimInstance" 2>nul
echo Worker local finalizado com sucesso!
pause
