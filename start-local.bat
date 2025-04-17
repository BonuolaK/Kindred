@echo off
echo Starting Kindred in local development mode for Windows...
echo Using dirname polyfill for compatibility...

REM Check if Node.js is installed
where node >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
  echo Error: Node.js is not installed or not in your PATH.
  echo Please install Node.js v18 or later from https://nodejs.org/
  pause
  exit /b 1
)

echo Checking for required dependencies...
IF NOT EXIST node_modules (
  echo Installing dependencies (this may take a few minutes)...
  npm install
  IF %ERRORLEVEL% NEQ 0 (
    echo Error installing dependencies. Please run npm install manually.
    pause
    exit /b 1
  )
)

echo Starting the application...
node start-local.js
IF %ERRORLEVEL% NEQ 0 (
  echo Application failed to start. See error message above.
  pause
)