@echo off
echo Starting APKGuard Server in debug mode...
echo.

echo [1/4] Setting environment variables...
set NODE_ENV=development
set PORT=3000
set DEBUG=*
set NODE_OPTIONS=--trace-warnings

echo [2/4] Checking for processes on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Found process using port 3000. Killing process ID: %%~nxa
    taskkill /F /PID %%~nxa
)

echo [3/4] Installing dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo Error installing dependencies. Check the logs above.
    pause
    exit /b %ERRORLEVEL%
)

echo [4/4] Starting server...
echo ===================================
echo APKGuard Server Starting...
echo ===================================

node --trace-warnings apkguard-server.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ===================================
    echo Server failed to start with error code %ERRORLEVEL%
    echo ===================================
    echo.
    pause
) else (
    echo.
    echo ===================================
    echo Server stopped normally.
    echo ===================================
    echo.
)

pause
