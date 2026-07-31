@echo off
cd /d "%~dp0"
if "%PORT%"=="" set PORT=8787
node server.js
pause
