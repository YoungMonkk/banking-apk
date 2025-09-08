# 🚀 APKGuard Quick Start Guide

Get your real APK security scanner running in 5 minutes!

## ⚡ Super Quick Setup

### 1. Prerequisites Check
```powershell
# Check Node.js version (must be 16+)
node --version

# If not installed, download from: https://nodejs.org/
```

### 2. Install Dependencies (copy-paste these exact commands)
```powershell
# From project root (frontend)
npm install

# From backend folder
cd server
npm install
cd ..
```

### 3. Start Backend (Terminal 1)
```powershell
# Navigate to server folder and start with environment variables
cd server
$env:FRONTEND_URL='http://localhost:8080'
$env:ALLOW_ALL_CORS='true'
$env:MAX_APK_SIZE_MB='200'
$env:PORT='3000'

# Install dependencies if not already done
npm install

# Start the server
node apkguard-server.js
```

**Expected output:**
```
🚀 APKGuard Server running on http://localhost:3000
📊 Health check: http://localhost:3000/api/health
```

**Verify the server is running by visiting:**
- http://localhost:3000 (should show "APKGuard Server is running")
- http://localhost:3000/api/health (should show status: "ok")
- 📊 Health check: http://localhost:3000/api/health

### 4. Verify Backend Health
```powershell
# Test backend is working (run in separate terminal)
Invoke-WebRequest http://localhost:3000/api/health -UseBasicParsing
```

**Expected:** JSON response with `"status":"ok"`

### 5. Start Frontend (Terminal 2)
```powershell
# From project root
npm run serve
```

**Expected output:**
- Local: http://localhost:8080
- Network: http://192.168.x.x:8080

### 6. Open Your Browser
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3000/api/health

### 7. Test APK Upload
1. Upload any APK file
2. Watch progress in real-time
3. Get detailed security report

## 🔧 Fixes Applied (v2.1)

✅ **Backend Crash Fix**: Fixed ThreatDatabase isReady() method conflict  
✅ **Dependency Fix**: Removed problematic crypto/path dependencies  
✅ **Progress Monitoring**: Stable scan progress without "Failed to monitor" errors  
✅ **CORS Configuration**: Proper cross-origin setup for localhost development

## 🔍 What You Get

✅ **Real APK Analysis** - Not just simulation!  
✅ **Threat Database** - Built-in malware signatures  
✅ **Permission Analysis** - Detects suspicious requests  
✅ **Code Pattern Scanning** - Finds malicious code  
✅ **Dark Mode UI** - Toggle with the moon/sun button in the header  
✅ **Improved Scan Stability** - Proper step tracking and timeouts  

## 📱 Test It Out

1. **Upload an APK file** (any Android app)
2. **Watch real-time analysis** with progress tracking
3. **Get detailed security report** with risk assessment
4. **See specific threats** and recommendations

## 🎨 UI Tips

- **Dark Mode**: Click the moon/sun button in the header. Your choice is saved and follows system theme by default.

## 🛠️ Development Mode

```bash
# Backend with auto-reload
cd server
$env:FRONTEND_URL='http://localhost:8080'
$env:ALLOW_ALL_CORS='true'   # optional during local dev
$env:PORT='3000'
npm run dev

# Frontend with live reload (from project root)
npm run dev
```

## 🔧 Troubleshooting

### Backend Won't Start?
```bash
cd server
npm install
$env:FRONTEND_URL='http://localhost:8080'
$env:ALLOW_ALL_CORS='true'
$env:PORT='3000'
npm run dev
```
Make sure dependencies are installed in `server/` (backend has its own `package.json`). `adm-zip` is already listed in `server/package.json`.

If you see a banner saying "Backend server not available - using demo mode", your frontend is up but the backend isn't reachable. Start the backend (above) and refresh.

### Port Already in Use?
```bash
# Kill process on port 3000
Get-NetTCPConnection -LocalPort 3000 -State Listen | Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000 -State Listen).OwningProcess -Force

# Or use npx kill-port
npx kill-port 3000

# Frontend port 8080
npx kill-port 8080
```

### Use a Different Backend Port
```bash
# Start backend on port 4000
cd server
$env:PORT='4000'
npm run dev
```
Then update frontend backend URL in `js/scan.js`:
```js
// js/scan.js
this.backendUrl = 'http://localhost:4000/api';
```

### Backend 500 Error Fixed?
✅ **Issue Resolved**: The `threatDatabase.isReady()` method call error has been fixed.  
✅ **Backend Integration**: Frontend now connects to real backend instead of showing "backend server not available".

### APK Analysis Not Working?
✅ **Issue Resolved**: Fixed APK extraction logic that was causing "AndroidManifest.xml not found" errors.  
✅ **Real APK Parsing**: Now properly extracts and analyzes APK files instead of failing at 40% progress.
  
Also ensure you upload using key `apk` (frontend uses this), and try a smaller APK first. Backend analysis times out after ~5 minutes.

### Frontend Issues?
```bash
# Clear cache and restart
npm run serve
```

## 📊 What's New in v2.0

- **Real APK parsing** and analysis
- **Express.js backend** with REST API
- **Threat intelligence database**
- **Automatic file cleanup**
- **Progress monitoring**
- **Fallback to demo mode**
- **Fixed backend integration** - No more 500 errors!

## 🎯 Current Status

✅ **Backend**: Running on http://localhost:3000  
✅ **Frontend**: Running on http://localhost:8080  
✅ **API Health**: http://localhost:3000/api/health  
✅ **API Health**: Working correctly  
✅ **CORS**: Configured for frontend communication  
✅ **APK Analysis**: Ready for real file uploads  

## 🎯 Next Steps

1. **Test with real APK files**
2. **Customize threat patterns**
3. **Add your own malware signatures**
4. **Deploy to production**

---

**Need help?** Check the main README.md for detailed documentation!

