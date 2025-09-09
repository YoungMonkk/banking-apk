const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const APKAnalyzer = require('./apk-analyzer/analyzer');
const ThreatDatabase = require('./threat-database/database');

const app = express();
const PORT = process.env.PORT || 3000; // Default to 3000

// Security and middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
app.use(cors({
    origin: (origin, callback) => {
        // Allow all origins in development
        if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_ALL_CORS === 'true') {
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

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        fs.ensureDirSync(uploadDir);
        const uniqueDir = path.join(uploadDir, uuidv4());
        fs.ensureDirSync(uniqueDir);
        req.uploadDir = uniqueDir;
        cb(null, uniqueDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '200') * 1024 * 1024, // MB to bytes
        files: 1
    },
    fileFilter: (req, file, cb) => {
        try {
            console.log('Processing file:', file.originalname, 'MIME type:', file.mimetype);
            if (file.mimetype === 'application/vnd.android.package-archive' || 
                file.originalname.endsWith('.apk')) {
                cb(null, true);
            } else {
                const error = new Error('Invalid file type. Only .apk files are allowed!');
                error.status = 400;
                cb(error, false);
            }
        } catch (err) {
            console.error('File filter error:', err);
            cb(err, false);
        }
    }
});

// Initialize services
const threatDatabase = new ThreatDatabase();
const apkAnalyzer = new APKAnalyzer(threatDatabase);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
            threatDatabase: threatDatabase.isReady,
            apkAnalyzer: apkAnalyzer.isReady
        }
    });
});

// APK Analysis endpoint
app.post('/api/analyze', upload.single('apk'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No APK file provided' });
        }

        const apkPath = req.file.path;
        const analysisId = uuidv4();

        console.log(`Starting analysis for: ${req.file.originalname} | Size: ${req.file.size} bytes`);

        // Seed an initial processing record
        apkAnalyzer.analysisResults = apkAnalyzer.analysisResults || new Map();
        apkAnalyzer.analysisResults.set(analysisId, {
            id: analysisId,
            status: 'processing',
            progress: 0,
            steps: [],
            startTime: new Date().toISOString(),
            filename: req.file.originalname
        });

        // Start analysis in background
        apkAnalyzer.analyzeAPK(apkPath, analysisId)
            .then(result => {
                console.log(`Analysis completed for ${analysisId}:`, result.summary);
            })
            .catch(error => {
                console.error(`Analysis failed for ${analysisId}:`, error);
                if (apkAnalyzer.analysisResults) {
                    apkAnalyzer.analysisResults.set(analysisId, {
                        id: analysisId,
                        status: 'failed',
                        error: error.message,
                        endTime: new Date().toISOString(),
                        filename: req.file.originalname
                    });
                }
            });

        // Return analysis ID immediately
        return res.json({
            analysisId: analysisId,
            message: 'Analysis started',
            filename: req.file.originalname,
            status: 'processing'
        });

    } catch (error) {
        console.error('Analysis processing error:', error);
        return res.status(500).json({ 
            error: 'Failed to process APK file',
            details: error.message 
        });
    }
});

// Get analysis status and results
app.get('/api/analysis/:id', async (req, res) => {
    try {
        const analysisId = req.params.id;
        if (!apkAnalyzer.analysisResults) {
            return res.status(404).json({ error: 'Analysis results not available' });
        }
        
        const result = apkAnalyzer.analysisResults.get(analysisId);
        if (!result) {
            return res.status(404).json({ error: 'Analysis not found' });
        }

        res.json(result);
    } catch (error) {
        console.error('Error fetching analysis result:', error);
        res.status(500).json({ error: 'Failed to fetch analysis result' });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                error: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE || 200}MB.` 
            });
        }
        return res.status(400).json({ 
            error: 'File upload error',
            details: error.message 
        });
    }
    
    res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 APKGuard Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔍 APK Analysis: http://localhost:${PORT}/api/analyze`);
});

// Handle server errors
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please stop the other process or use a different port.`);
    } else {
        console.error('Server error:', error);
    }
    process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.close(() => {
        console.log('Server has been terminated');
        process.exit(0);
    });
});

module.exports = app;
