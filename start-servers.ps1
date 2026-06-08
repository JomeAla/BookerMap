$nodePath = "C:\Users\jomea\AppData\Roaming\fnm\node-versions\v24.16.0\installation"
$env:Path = "$nodePath;$env:Path"

Write-Host "Starting BookerMap API server on port 4000..."
$apiProcess = Start-Process -FilePath "$nodePath\node.exe" -ArgumentList "dist/main" -WorkingDirectory "C:\Users\jomea\booking software\apps\api" -PassThru -WindowStyle Hidden

Write-Host "Starting BookerMap Web server on port 3000..."
$webProcess = Start-Process -FilePath "$nodePath\node.exe" -ArgumentList "node_modules/next/dist/bin/next dev -p 3000" -WorkingDirectory "C:\Users\jomea\booking software\apps\web" -PassThru -WindowStyle Hidden

Write-Host "Waiting for servers to start..."
$maxWait = 60
$started = @{ api = $false; web = $false }

for ($i = 0; $i -lt $maxWait; $i++) {
    Start-Sleep -Seconds 2
    $connections = netstat -an 2>$null
    if ($connections | Select-String ":4000.*LISTENING") { $started.api = $true }
    if ($connections | Select-String ":3000.*LISTENING") { $started.web = $true }
    if ($started.api -and $started.web) { break }
}

if ($started.api) { Write-Host "API server :4000 - RUNNING (PID $($apiProcess.Id))" } else { Write-Host "API server :4000 - FAILED" }
if ($started.web) { Write-Host "Web server :3000 - RUNNING (PID $($webProcess.Id))" } else { Write-Host "Web server :3000 - FAILED" }

if ($started.api -and $started.web) {
    Write-Host "Both servers started successfully."
}
