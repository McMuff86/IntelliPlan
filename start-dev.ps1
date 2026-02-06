# IntelliPlan – Dev-Umgebung starten
# Startet Docker-Infra (PostgreSQL, Mailpit), migriert DB, seeded Daten,
# und startet Backend + Frontend lokal.

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "`n=== IntelliPlan Dev-Startup ===" -ForegroundColor Green

# ── 0. Alte Prozesse auf den Ports beenden ──
Write-Host "`n[0/5] Alte Prozesse bereinigen..." -ForegroundColor Cyan
foreach ($port in @(3000, 5173)) {
    $procIds = netstat -ano | Select-String ":$port\s" | ForEach-Object {
        ($_ -split '\s+')[-1]
    } | Sort-Object -Unique | Where-Object { $_ -ne '0' }
    foreach ($procId in $procIds) {
        try {
            $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
            if ($proc -and $proc.ProcessName -eq 'node') {
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                Write-Host "      Port ${port}: node PID $procId beendet" -ForegroundColor Yellow
            }
        } catch {}
    }
}
# Docker App-Container stoppen (falls noch aktiv)
$ErrorActionPreference = "Continue"
docker compose stop frontend backend 2>&1 | Out-Null
$ErrorActionPreference = "Stop"

# ── 1. Docker Infra (nur DB + Mail) ──
Write-Host "`n[1/5] Docker: PostgreSQL + Mailpit starten..." -ForegroundColor Cyan
docker compose up -d postgres mailpit
if ($LASTEXITCODE -ne 0) { Write-Host "Docker compose fehlgeschlagen!" -ForegroundColor Red; exit 1 }

# Warten bis PostgreSQL healthy ist
Write-Host "      Warte auf PostgreSQL..." -ForegroundColor Yellow
$maxWait = 30
$waited = 0
while ($waited -lt $maxWait) {
    $health = docker inspect --format='{{.State.Health.Status}}' intelliplan-postgres 2>$null
    if ($health -eq "healthy") { break }
    Start-Sleep -Seconds 1
    $waited++
}
if ($waited -ge $maxWait) {
    Write-Host "PostgreSQL nicht ready nach ${maxWait}s!" -ForegroundColor Red
    exit 1
}
Write-Host "      PostgreSQL ready." -ForegroundColor Green

# ── 2. Migrationen ──
Write-Host "`n[2/5] Datenbank migrieren..." -ForegroundColor Cyan
Push-Location "$root\backend"
npm run migrate
if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Host "Migration fehlgeschlagen!" -ForegroundColor Red; exit 1 }
Pop-Location

# ── 3. Seed-Daten ──
Write-Host "`n[3/5] Seed-Daten laden (User + Industries/Templates)..." -ForegroundColor Cyan
Push-Location "$root\backend"
npm run seed:user
npm run seed:industries
Pop-Location
Write-Host "      Seed-Daten geladen." -ForegroundColor Green

# ── 4. Backend starten ──
Write-Host "`n[4/5] Backend starten (Port 3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; npm run dev"

# ── 5. Frontend starten ──
Write-Host "`n[5/5] Frontend starten (Port 5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

# ── Zusammenfassung ──
Write-Host "`n=== Alles gestartet ===" -ForegroundColor Green
Write-Host "  Frontend:  http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:   http://localhost:3000" -ForegroundColor White
Write-Host "  Mailpit:   http://localhost:8025" -ForegroundColor White
Write-Host "  DB:        localhost:5432 (intelliplan/postgres)" -ForegroundColor White
Write-Host ""
