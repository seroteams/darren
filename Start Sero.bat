@echo off
REM Double-click this file to start Sero (the website + the login server).
REM A black window will open and stay open - that's normal, it's the server running.
REM Leave it open while you use Sero. To stop Sero, just close that window.
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "scripts\dev.ps1"
