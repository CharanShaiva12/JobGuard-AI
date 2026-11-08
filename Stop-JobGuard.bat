@echo off
title JobGuard AI - Shutdown
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop_services.ps1"
pause
