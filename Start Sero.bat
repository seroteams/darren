@echo off
REM Temporary unique title so the cleanup below doesn't close THIS window.
title Sero-launching-%RANDOM%
REM Double-click this file to start Sero.
REM A black window will open and STAY open - that's normal, it's the server running.
REM Your browser will open Sero automatically after a few seconds.
REM Leave the black window open while you use Sero. To stop Sero, just close it.
REM If Sero is already running, opening this again just restarts it fresh.

cd /d "%~dp0"

REM --- If a Sero window is already open, close it (and its server) first ------
taskkill /FI "WINDOWTITLE eq Sero" /T /F >nul 2>nul

REM --- Now claim the real title -----------------------------------------------
title Sero

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
