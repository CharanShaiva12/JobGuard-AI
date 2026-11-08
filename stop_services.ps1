# ==============================================================================
# JobGuard AI - Graceful Service Shutdown Script
# Module: C:\JobGuard-AI\stop_services.ps1
# Purpose: Gracefully stops FastAPI (8000), Express (5000), and Vite (5173).
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Yellow
Write-Host "                 JOBGUARD AI - SERVICE SHUTDOWN                       " -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Yellow
Write-Host ""

$ports = @(
    @{ Port = 8000; Name = "FastAPI ML Microservice" },
    @{ Port = 5000; Name = "Express Backend API Gateway" },
    @{ Port = 5173; Name = "React Vite Frontend Server" }
)

$stoppedCount = 0

foreach ($item in $ports) {
    $port = $item.Port
    $name = $item.Name

    try {
        $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($connections) {
            foreach ($conn in $connections) {
                $pidToKill = $conn.OwningProcess
                $proc = Get-Process -Id $pidToKill -ErrorAction SilentlyContinue
                $procName = if ($proc) { $proc.ProcessName } else { "PID $pidToKill" }

                Write-Host "Stopping $name on port $port ($procName, PID: $pidToKill)..." -ForegroundColor Cyan
                # Use taskkill to terminate process tree (including cmd console window)
                & taskkill.exe /F /T /PID $pidToKill 2>$null | Out-Null
                $stoppedCount++
            }
            Write-Host "  [OK] $name stopped." -ForegroundColor Green
        } else {
            Write-Host "  [INFO] $name is not currently running on port $port." -ForegroundColor Gray
        }
    } catch {
        Write-Host "  [WARNING] Could not stop process on port ${port}: $($_.Exception.Message)" -ForegroundColor Magenta
    }
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Yellow
Write-Host "Shutdown complete. Total processes stopped: $stoppedCount" -ForegroundColor Green
Write-Host "Note: MySQL 8.4 service remains running in background." -ForegroundColor Gray
Write-Host "======================================================================" -ForegroundColor Yellow
Write-Host ""
