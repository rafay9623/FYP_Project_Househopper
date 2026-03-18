# PowerShell script to start all three servers (backend, frontend, ML recommendation)

Write-Host "Starting ML Recommendation Service..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\ml'; .venv\Scripts\python.exe -m uvicorn app:app --port 5001"

Start-Sleep -Seconds 3

Write-Host "Starting Backend Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev"

Start-Sleep -Seconds 3

Write-Host "Starting Frontend Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host "`nAll three servers are starting in separate windows." -ForegroundColor Cyan
Write-Host "ML Service will run on:  http://localhost:5001" -ForegroundColor Yellow
Write-Host "Backend will run on:     http://localhost:3001" -ForegroundColor Yellow
Write-Host "Frontend will run on:    http://localhost:5173" -ForegroundColor Yellow
Write-Host "`nPress any key to exit this window (servers will continue running)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

