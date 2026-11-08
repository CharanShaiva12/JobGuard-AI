@echo off
title JobGuard AI - One-Click Launcher
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_services.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] JobGuard AI encountered an issue during startup.
    echo Please review the output above.
    pause
)
