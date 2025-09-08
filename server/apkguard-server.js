// Core modules
const http = require('http');
const path = require('path');

// Third-party modules
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const AdmZip = require('adm-zip');
require('dotenv').config();

// Enable debug logging
process.env.DEBUG = 'http,server,express:application';
const debug = require('debug')('server');

// Initialize express
const app = express();
const PORT = process.env.PORT || 3000;

// Better error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Basic middleware with error handling
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));

// Add request ID to each request
app.use((req, res, next) => {
  req.id = uuidv4();
  next();
});

// CORS configuration
app.use(cors({
    origin: (origin, callback) => {
        // Allow all in development or if ALLOW_ALL_CORS is true
        if (process.env.NODE_ENV !== 'production' || 
            String(process.env.ALLOW_ALL_CORS).toLowerCase() === 'true') {
            return callback(null, true);
        }
        // In production, only allow specific origins
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:8080',
            process.env.FRONTEND_URL
        ].filter(Boolean);
        
        if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
            status: 'operational'
        }
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.send('APKGuard Server is running');
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads', uuidv4());
        fs.ensureDirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: (process.env.MAX_APK_SIZE_MB || 200) * 1024 * 1024 // Default 200MB
    }
});

// In-memory analysis state
const analysisState = {};

// File upload and analysis endpoint
app.post('/api/analyze', upload.single('apk'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No APK file uploaded' });
        }
        const analysisId = path.basename(path.dirname(req.file.path));
        analysisState[analysisId] = {
            status: 'processing',
            progress: 0,
            results: null,
            error: null,
            steps: ['Extracting APK', 'Checking permissions', 'Scanning for threats', 'Finalizing']
        };
        res.json({
            status: 'success',
            message: 'File uploaded successfully',
            analysisId: analysisId,
            fileName: req.file.originalname
        });
        // Start async analysis
        setTimeout(() => {
            try {
                analysisState[analysisId].progress = 25;
                // Extract APK
                const zip = new AdmZip(req.file.path);
                const entries = zip.getEntries();
                analysisState[analysisId].progress = 50;
                // Check permissions
                let permissions = [];
                const manifestEntry = entries.find(e => e.entryName === 'AndroidManifest.xml');
                if (manifestEntry) {
                    const manifestXml = manifestEntry.getData().toString('utf8');
                    const matches = manifestXml.match(/<uses-permission[^>]*android:name="([^"]+)"/g);
                    if (matches) {
                        permissions = matches.map(m => m.match(/android:name="([^"]+)"/)[1]);
                    }
                }
                analysisState[analysisId].progress = 75;
                // Scan for threats (simple pattern match)
                let threats = [];
                const threatPatterns = ['android.permission.SEND_SMS', 'android.permission.READ_SMS', 'android.permission.WRITE_EXTERNAL_STORAGE'];
                threats = permissions.filter(p => threatPatterns.includes(p));
                analysisState[analysisId].progress = 100;
                analysisState[analysisId].status = 'completed';
                analysisState[analysisId].results = {
                    riskLevel: threats.length > 0 ? 'high' : 'low',
                    threats,
                    permissions
                };
            } catch (err) {
                analysisState[analysisId].status = 'failed';
                analysisState[analysisId].error = err.message;
            }
        }, 2000); // Simulate async analysis
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed: ' + error.message });
    }
});

// Analysis status endpoint
app.get('/api/analysis/:analysisId', (req, res) => {
    const { analysisId } = req.params;
    const state = analysisState[analysisId];
    if (!state) {
        return res.status(404).json({ error: 'Analysis not found' });
    }
    res.json({
        status: state.status,
        progress: state.progress,
        results: state.results,
        error: state.error,
        steps: state.steps
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Create HTTP server
const server = http.createServer(app);

// Start the server with better error handling
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 APKGuard Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📦 Node.js ${process.version}`);
  console.log(`📂 Process ID: ${process.pid}`);
  console.log(`📡 Server time: ${new Date().toISOString()}`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      console.log('Trying to kill the process using port ' + PORT);
      require('child_process').exec(`npx kill-port ${PORT}`, () => {
        console.log('Port ' + PORT + ' should be free now. Please restart the server.');
      });
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
        console.log('Server has been terminated');
        process.exit(0);
    });
});

module.exports = app;
