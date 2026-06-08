@echo off
cd /d "C:\Users\jomea\booking software\apps\web"
set PATH=C:\Users\jomea\AppData\Roaming\fnm\node-versions\v24.16.0\installation;%PATH%
echo Starting BookerMap Web on port 3000...
node node_modules/next/dist/bin/next dev -p 3000
pause
