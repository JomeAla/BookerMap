@echo off
cd /d "C:\Users\jomea\booking software\apps\api"
set PATH=C:\Users\jomea\AppData\Roaming\fnm\node-versions\v24.16.0\installation;%PATH%
echo Starting BookerMap API on port 4000...
node dist/main
pause
