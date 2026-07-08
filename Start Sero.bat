@echo off
title Sero
REM Double-click this file to start Sero.
REM A black window will open and STAY open - that's normal, it's the server running.
REM Your browser will open Sero automatically after a few seconds.
REM Leave the black window open while you use Sero. To stop Sero, just close it.

cd /d "%~dp0"

REM --- Check Node is installed -------------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js was not found on this computer.
  echo   Sero needs it to run. Install it from https://nodejs.org  then try again.
  echo.
  pause
  exit /b 1
)

REM --- Open the browser once the server has had a few seconds to boot ----------
start "" /min cmd /c "timeout /t 6 >nul & start http://localhost:3000"

REM --- Start the self-healing dev server (keeps running until you close this) --
powershell -ExecutionPolicy Bypass -File "scripts\dev.ps1"

REM --- If we ever get here, the server stopped. Keep the window open ----------
echo.
echo   Sero has stopped. Read any message above, then press a key to close.
pause
