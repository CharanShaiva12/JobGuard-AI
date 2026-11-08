# ==============================================================================
# JobGuard AI - Unified Localhost Development Service Orchestrator
# Module: C:\JobGuard-AI\start_services.ps1
# Architecture: Vite (5173) -> Express Gateway (5000) -> FastAPI (8000) + MySQL 8.4 (3306)
# Note: Zero Apache or XAMPP dependency. Pure Windows native localhost workflow.
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RootDir

function Write-Header {
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host "                 JOBGUARD AI - SERVICE ORCHESTRATOR                   " -ForegroundColor Cyan
    Write-Host "            Spot Fake Jobs & Internships Before You Apply.            " -ForegroundColor DarkCyan
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$StepNumber, [string]$Title)
    Write-Host "[$StepNumber] $Title" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "  [SUCCESS] $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "  [INFO] $Message" -ForegroundColor Cyan
}

function Write-WarningMsg {
    param([string]$Message)
    Write-Host "  [WARNING] $Message" -ForegroundColor Magenta
}

function Write-Failure {
    param([string]$Message)
    Write-Host "  [ERROR] $Message" -ForegroundColor Red
}

# ------------------------------------------------------------------------------
# Helper: Detect if a TCP port is currently in LISTEN state
# ------------------------------------------------------------------------------
function Get-PortListenerProcess {
    param([int]$Port)
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($conn) {
            $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            return @{
                InUse = $true
                Pid = $conn.OwningProcess
                ProcessName = if ($proc) { $proc.ProcessName } else { "Unknown" }
            }
        }
    } catch {
        # Fallback if NetTCP cmdlet encounters an environmental restriction
    }
    return @{ InUse = $false; Pid = $null; ProcessName = $null }
}

# ------------------------------------------------------------------------------
# Helper: Poll an HTTP endpoint until HTTP 200 or timeout
# ------------------------------------------------------------------------------
function Wait-ForHttpOk {
    param([string]$Url, [int]$TimeoutSeconds = 15)
    $startTime = Get-Date
    while ((Get-Date) -lt $startTime.AddSeconds($TimeoutSeconds)) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                return $true
            }
        } catch {
            # Endpoint still initializing; wait and retry
        }
        Start-Sleep -Milliseconds 800
    }
    return $false
}

Write-Header

# ------------------------------------------------------------------------------
# STEP 1: Verify MySQL 8.4 Service & Database Connectivity (Port 3306)
# ------------------------------------------------------------------------------
Write-Step "1/5" "Verifying MySQL 8.4 Service & Database Connectivity (Port 3306)..."

$mysqlService = Get-Service -Name "MySQL84" -ErrorAction SilentlyContinue
if ($mysqlService) {
    if ($mysqlService.Status -ne "Running") {
        Write-Info "MySQL84 service is currently '$($mysqlService.Status)'. Attempting to start..."
        try {
            Start-Service -Name "MySQL84" -ErrorAction Stop
            Start-Sleep -Seconds 2
            Write-Success "MySQL84 service started successfully."
        } catch {
            Write-Failure "Unable to start MySQL84 service: $($_.Exception.Message)"
            Write-Failure "Please run 'net start MySQL84' from an Administrator Command Prompt."
            exit 1
        }
    } else {
        Write-Success "MySQL84 Windows service is actively running."
    }
} else {
    Write-WarningMsg "Windows service 'MySQL84' not registered by that name. Checking port 3306..."
}

$port3306Check = Get-PortListenerProcess -Port 3306
if (-not $port3306Check.InUse) {
    Write-Failure "No service is listening on MySQL port 3306."
    Write-Failure "Ensure MySQL Community Server 8.4 is installed and running."
    exit 1
} else {
    Write-Success "Port 3306 is listening (PID: $($port3306Check.Pid) - $($port3306Check.ProcessName))."
}

# Verify database credentials and table accessibility via Node.js helper
$dbCheckResult = node -e "
const mysql = require('./backend/node_modules/mysql2/promise');
require('./backend/node_modules/dotenv').config({ path: './.env' });
async function check() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'jobguard_db'
    });
    const [rows] = await conn.query('SHOW TABLES');
    await conn.end();
    process.stdout.write('CONNECTED:' + rows.length);
  } catch(e) {
    process.stdout.write('FAILED:' + e.message);
  }
}
check();
" 2>$null

if ($dbCheckResult -like "CONNECTED:*") {
    $tableCount = $dbCheckResult.Split(":")[1]
    Write-Success "MySQL database 'jobguard_db' verified ($tableCount tables accessible)."
} else {
    Write-Failure "Database connection test failed."
    Write-Failure "Error details: $dbCheckResult"
    Write-Failure "Please verify your DB_PASSWORD in C:\JobGuard-AI\.env."
    exit 1
}

# ------------------------------------------------------------------------------
# STEP 2: FastAPI Machine Learning Microservice (Port 8000)
# ------------------------------------------------------------------------------
Write-Step "2/5" "Orchestrating Python FastAPI ML Microservice (Port 8000)..."

$port8000Check = Get-PortListenerProcess -Port 8000
$fastApiRunning = $false

if ($port8000Check.InUse) {
    Write-Info "Port 8000 is currently occupied (PID: $($port8000Check.Pid) - $($port8000Check.ProcessName))."
    # Check if it is already our healthy JobGuard FastAPI service
    try {
        $healthResp = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 2 -ErrorAction Stop
        if ($healthResp.status -eq "healthy") {
            Write-Success "FastAPI ML service is already running on port 8000 with models loaded. Skipping duplicate spawn."
            $fastApiRunning = $true
        }
    } catch {
        Write-Failure "Port 8000 is occupied by an unresponsive process (PID: $($port8000Check.Pid))."
        Write-Failure "Please terminate the process on port 8000 or run Stop-JobGuard.bat."
        exit 1
    }
}

if (-not $fastApiRunning) {
    Write-Info "Starting FastAPI ML microservice (Uvicorn + Python 3.12)..."
    Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/k title JobGuard AI - ML Microservice [Port 8000] & python -m uvicorn ml.app.main:app --host 127.0.0.1 --port 8000" `
        -WorkingDirectory $RootDir

    Write-Info "Waiting for FastAPI ML models (EMSCAD + PhiUSIIL) to initialize..."
    $fastApiReady = Wait-ForHttpOk -Url "http://127.0.0.1:8000/health" -TimeoutSeconds 15

    if ($fastApiReady) {
        Write-Success "FastAPI ML Microservice is healthy on http://127.0.0.1:8000."
    } else {
        Write-Failure "FastAPI ML microservice failed to respond within 15 seconds."
        Write-Failure "Check that Python 3.12 and required libraries (xgboost, scikit-learn, fastapi) are installed."
        exit 1
    }
}

# ------------------------------------------------------------------------------
# STEP 3: Node.js Express Backend API Gateway (Port 5000)
# ------------------------------------------------------------------------------
Write-Step "3/5" "Orchestrating Express Backend API Gateway (Port 5000)..."

$port5000Check = Get-PortListenerProcess -Port 5000
$expressRunning = $false

if ($port5000Check.InUse) {
    Write-Info "Port 5000 is currently occupied (PID: $($port5000Check.Pid) - $($port5000Check.ProcessName))."
    try {
        $backendHealth = Invoke-RestMethod -Uri "http://127.0.0.1:5000/health" -TimeoutSec 2 -ErrorAction Stop
        if ($backendHealth.status -eq "healthy") {
            Write-Success "Express Backend is already running on port 5000. Skipping duplicate spawn."
            $expressRunning = $true
        }
    } catch {
        Write-Failure "Port 5000 is occupied by another process (PID: $($port5000Check.Pid))."
        Write-Failure "Please terminate the process on port 5000 or run Stop-JobGuard.bat."
        exit 1
    }
}

if (-not $expressRunning) {
    # Ensure backend compiled files exist
    if (-not (Test-Path "$RootDir\backend\dist\server.js")) {
        Write-Info "Compiling backend TypeScript..."
        Set-Location "$RootDir\backend"
        npm run build | Out-Null
        Set-Location $RootDir
    }

    Write-Info "Starting Express API Gateway on port 5000..."
    Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/k title JobGuard AI - Express API Gateway [Port 5000] & node dist/server.js" `
        -WorkingDirectory "$RootDir\backend"

    Write-Info "Waiting for Express API Gateway to bind port 5000..."
    $expressReady = Wait-ForHttpOk -Url "http://127.0.0.1:5000/health" -TimeoutSeconds 15

    if ($expressReady) {
        Write-Success "Express API Gateway is healthy on http://127.0.0.1:5000."
    } else {
        Write-Failure "Express API Gateway failed to respond on port 5000 within 15 seconds."
        exit 1
    }
}

# Deep verification: Express talking to MySQL and FastAPI
try {
    $deepHealth = Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/dashboard/health" -TimeoutSec 3 -ErrorAction Stop
    $dbDep = $deepHealth.dependencies.database_mysql8
    $mlDep = $deepHealth.dependencies.ml_fastapi_microservice
    $geminiDep = $deepHealth.dependencies.gemini_contextual_ai

    Write-Success "Express verified dependencies: MySQL 8.4 = $dbDep, FastAPI ML = $mlDep, Gemini AI = $geminiDep."
} catch {
    Write-WarningMsg "Express deep dependency health probe could not be confirmed: $($_.Exception.Message)"
}

# ------------------------------------------------------------------------------
# STEP 4: React 18 + Vite Frontend Dev Server (Port 5173)
# ------------------------------------------------------------------------------
Write-Step "4/5" "Orchestrating React 18 + Vite Frontend (Port 5173)..."

$port5173Check = Get-PortListenerProcess -Port 5173
$viteRunning = $false

if ($port5173Check.InUse) {
    Write-Success "Vite frontend server is already listening on port 5173 (PID: $($port5173Check.Pid))."
    $viteRunning = $true
} else {
    Write-Info "Starting Vite dev server..."
    Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/k title JobGuard AI - React Vite Frontend [Port 5173] & npm run dev" `
        -WorkingDirectory "$RootDir\frontend"

    Write-Info "Waiting for Vite server to listen on port 5173..."
    $viteReady = $false
    for ($i = 0; $i -lt 15; $i++) {
        $check = Get-PortListenerProcess -Port 5173
        if ($check.InUse) {
            $viteReady = $true
            break
        }
        Start-Sleep -Seconds 1
    }

    if ($viteReady) {
        Write-Success "React Vite Frontend is active on http://localhost:5173."
    } else {
        Write-Failure "Vite frontend failed to start on port 5173."
        exit 1
    }
}

# ------------------------------------------------------------------------------
# STEP 5: Launch Browser & Display System Dashboard
# ------------------------------------------------------------------------------
Write-Step "5/5" "Opening JobGuard AI in your default web browser..."
Start-Sleep -Seconds 1
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "             JOBGUARD AI - SYSTEM OPERATIONAL & READY                 " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  Frontend Web UI:   http://localhost:5173" -ForegroundColor White
Write-Host "  Backend API:       http://127.0.0.1:5000/api" -ForegroundColor White
Write-Host "  FastAPI ML API:    http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "  MySQL Database:    127.0.0.1:3306 (jobguard_db)" -ForegroundColor White
Write-Host "  Architecture:      Vite (Reverse Proxy) -> Express -> FastAPI + MySQL" -ForegroundColor Gray
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  To stop all services, run: .\stop_services.ps1 or Stop-JobGuard.bat" -ForegroundColor Cyan
Write-Host ""
