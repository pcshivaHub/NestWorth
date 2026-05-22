# NestWorth startup script
# Detects current IP, updates frontend/.env, then starts backend and Expo in separate windows.

$PORT     = 8000
$ROOT     = $PSScriptRoot
$ENV_FILE = "$ROOT\frontend\.env"
$BACKEND  = "$ROOT\backend"
$FRONTEND = "$ROOT\frontend"

# ── 1. Detect active local IP ────────────────────────────────────────────────
$IP = (Get-NetIPAddress -AddressFamily IPv4 |
       Where-Object { $_.IPAddress -notmatch '^127\.' -and $_.PrefixOrigin -ne 'WellKnown' } |
       Sort-Object InterfaceMetric |
       Select-Object -First 1).IPAddress

if (-not $IP) {
    Write-Host "ERROR: Could not detect local IP. Are you connected to a network?" -ForegroundColor Red
    exit 1
}

$API_URL = "http://${IP}:${PORT}"
Write-Host ""
Write-Host "  Network IP  : $IP"          -ForegroundColor Cyan
Write-Host "  Backend URL : $API_URL"     -ForegroundColor Cyan
Write-Host ""

# ── 2. Write frontend/.env ───────────────────────────────────────────────────
"EXPO_PUBLIC_API_URL=$API_URL" | Set-Content $ENV_FILE -Encoding utf8
Write-Host "  Updated frontend\.env" -ForegroundColor Green

# ── 3. Start backend in a new window (activate venv + uvicorn) ───────────────
$backendCmd = @"
Write-Host '── NestWorth Backend ──' -ForegroundColor Yellow
Set-Location '$BACKEND'
& '.\venv\Scripts\Activate.ps1'
uvicorn main:app --host 0.0.0.0 --port $PORT --reload
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd
Write-Host "  Backend window launched" -ForegroundColor Green

# ── 4. Start Expo in a new window ────────────────────────────────────────────
$frontendCmd = @"
Write-Host '── NestWorth Frontend ──' -ForegroundColor Yellow
Set-Location '$FRONTEND'
npm start
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd
Write-Host "  Frontend window launched" -ForegroundColor Green

Write-Host ""
Write-Host "  Both servers starting. Open http://${IP}:8081 in your browser." -ForegroundColor White
Write-Host ""
