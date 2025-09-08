@echo off
echo Starting APKGuard Server...
set NODE_DEBUG=http,net
set DEBUG=*
node --trace-warnings apkguard-server.js
pause
