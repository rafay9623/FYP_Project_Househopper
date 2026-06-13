# PowerShell script to start all HouseHoppers services with optimized startup logic

Clear-Host
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   HouseHoppers - Performance Bootstrapper     " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Function to check if a port is in use
function Check-Port($port) {
    return Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
}

# 1. ML Recommendation Service
Write-Host "`n[1/3] Initializing ML Discovery Engine..." -ForegroundColor Yellow
if (Check-Port 5001) { Write-Host "⚠️ Port 5001 already in use. Skipping start." -ForegroundColor Red }
else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'ML Service'; cd '$PSScriptRoot\ml'; if (Test-Path '.\.venv\Scripts\python.exe') { & '.\.venv\Scripts\python.exe' -m uvicorn app:app --port 5001 } else { Write-Host 'Error: .venv not found in ml folder' -ForegroundColor Red }"
}

# 2. Backend Server
Write-Host "[2/3] Booting Optimized Backend (with Cache)..." -ForegroundColor Yellow
if (Check-Port 3001) { Write-Host "⚠️ Port 3001 already in use. Skipping start." -ForegroundColor Red }
else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'Backend API'; cd '$PSScriptRoot\backend'; npm run dev"
}

# 3. Frontend Server
Write-Host "[3/3] Launching Optimized Frontend..." -ForegroundColor Yellow
if (Check-Port 5173) { Write-Host "⚠️ Port 5173 already in use. Skipping start." -ForegroundColor Red }
else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$Host.UI.RawUI.WindowTitle = 'Frontend UI'; cd '$PSScriptRoot\frontend'; npm run dev"
}

Write-Host "`n🚀 ALL SERVICES INITIALIZED" -ForegroundColor Green
Write-Host "-----------------------------------------------" -ForegroundColor Gray
Write-Host "ML Service:    http://localhost:5001" -ForegroundColor Gray
Write-Host "Backend API:   http://localhost:3001" -ForegroundColor Gray
Write-Host "Frontend UI:   http://localhost:5173" -ForegroundColor Gray
Write-Host "-----------------------------------------------" -ForegroundColor Gray

Write-Host "`nSystem is running with aggressive caching enabled." -ForegroundColor Cyan
Write-Host "Press any key to exit this controller..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")


