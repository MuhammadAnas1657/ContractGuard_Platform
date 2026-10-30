# ==============================================================================
# ContractGuard-X Native Non-Docker Launcher (PowerShell)
# Architecture: Next.js 14 (Port 3001) + FastAPI (Port 8080) + Native PostgreSQL (Port 5432)
# ==============================================================================

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  ContractGuard-X Native Platform Launcher (Zero-Docker)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Verify Native PostgreSQL Service on localhost:5432
Write-Host "[1/3] Checking native PostgreSQL connection on localhost:5432..." -ForegroundColor Yellow
$env:DATABASE_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { "postgresql://postgres:hackathon@localhost:5432/hackathon" }
$env:PYTHONPATH = ".;backend;sdk/python"

python -c "
import sqlalchemy, os, sys
url = os.environ.get('DATABASE_URL', 'postgresql://postgres:hackathon@localhost:5432/hackathon')
try:
    eng = sqlalchemy.create_engine(url, connect_args={'connect_timeout': 5})
    with eng.connect() as conn:
        conn.execute(sqlalchemy.text('SELECT 1'))
    print('  -> Native PostgreSQL connected successfully:', url)
except Exception as e:
    print('  -> ERROR connecting to PostgreSQL:', e)
    sys.exit(1)
"

# 2. Launch FastAPI + SQLAlchemy Backend on Port 8080
Write-Host "[2/3] Starting FastAPI Backend on http://127.0.0.1:8080 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot'; `$env:PYTHONPATH='.;backend;sdk/python'; `$env:DATABASE_URL='$env:DATABASE_URL'; python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8080 --reload"

# 3. Launch Next.js 14 Frontend on Port 3001
Write-Host "[3/3] Starting Next.js 14 Frontend on http://localhost:3001 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "ContractGuard-X is starting natively!" -ForegroundColor Green
Write-Host "  -> Web Studio & SOC Dashboard: http://localhost:3001" -ForegroundColor Green
Write-Host "  -> FastAPI OpenAPI Docs:       http://127.0.0.1:8080/docs" -ForegroundColor Green
Write-Host "  -> Database Readiness Probe:   http://127.0.0.1:8080/ready" -ForegroundColor Green

