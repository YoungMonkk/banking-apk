@echo off
echo Starting APKGuard Server...
echo.
echo Environment:
echo NODE_ENV=%NODE_ENV%
echo PORT=3000
echo.

:: Kill any existing Node.js processes on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Killing process using port 3000 (PID: %%~nxa)
    taskkill /F /PID %%~nxa
)

:: Set environment variables
set NODE_ENV=development
set PORT=3000
set DEBUG=*

:: Start the server
node --trace-warnings simple-apkguard.js

:: Keep the window open if there's an error
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Server failed to start with error code %ERRORLEVEL%
    echo.
    pause
)
