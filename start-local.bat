@echo off
echo Starting Kindred in local environment...
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo Error: Node.js is not installed or not in PATH.
  echo Please install Node.js from https://nodejs.org/
  pause
  exit /b 1
)

:: Check for required packages
echo Checking for required packages...
call npm list ts-node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo Installing ts-node...
  call npm install --save-dev ts-node
)

:: Check if the .env file exists
if not exist .env (
  echo Creating .env file from .env.example...
  copy .env.example .env
  echo Please edit the .env file with your configuration before running again.
  pause
  exit /b 0
)

:: Run the local development script
echo Starting application with local environment patching...
node local-run.js

pause