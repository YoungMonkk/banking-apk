@echo off
echo Starting APKGuard Server...
echo.

:: Set environment variables
set NODE_ENV=development
set PORT=3000
set DEBUG=*
set NODE_OPTIONS=--trace-warnings

:: Kill any process on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Killing process using port 3000 (PID: %%~nxa)
    taskkill /F /PID %%~nxa
)

:: Start the server
echo.
echo Starting server...
echo ==========================

node --trace-warnings apkguard-server.js

:: Keep the window open if there's an error
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ==========================
    echo Server failed to start with error code %ERRORLEVEL%
    echo ==========================
    echo.
)

pause
