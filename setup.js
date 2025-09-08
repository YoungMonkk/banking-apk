#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 APKGuard Setup Script');
console.log('========================\n');

async function setup() {
    try {
        // Check if we're in the right directory
        if (!fs.existsSync('index.html')) {
            console.error('❌ Please run this script from the project root directory');
            process.exit(1);
        }

        console.log('📋 Checking prerequisites...');
        
        // Check Node.js version
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        
        if (majorVersion < 16) {
            console.error(`❌ Node.js 16+ required. Current version: ${nodeVersion}`);
            console.log('💡 Please install Node.js 16 or later from https://nodejs.org/');
            process.exit(1);
        }
        
        console.log(`✅ Node.js version: ${nodeVersion}`);

        // Check if server directory exists
        if (!fs.existsSync('server')) {
            console.error('❌ Server directory not found. Please ensure the project structure is complete.');
            process.exit(1);
        }

        console.log('✅ Project structure verified');

        // Navigate to server directory
        process.chdir('server');
        
        console.log('\n📦 Installing backend dependencies...');
        
        // Install dependencies
        try {
            execSync('npm install', { stdio: 'inherit' });
            console.log('✅ Backend dependencies installed successfully');
        } catch (error) {
            console.error('❌ Failed to install backend dependencies');
            console.error('💡 Try running: npm install --force');
            process.exit(1);
        }

        // Create necessary directories
        console.log('\n📁 Creating necessary directories...');
        
        const dirs = [
            'uploads',
            'logs',
            'threat-database/data'
        ];

        for (const dir of dirs) {
            await fs.ensureDir(dir);
            console.log(`✅ Created: ${dir}`);
        }

        // Create .env file if it doesn't exist
        const envPath = '.env';
        if (!fs.existsSync(envPath)) {
            const envContent = `# Server Configuration
PORT=3000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:8080

# Security Settings
MAX_FILE_SIZE=104857600
UPLOAD_TIMEOUT=300000
CLEANUP_INTERVAL=1800000

# Database Settings
THREAT_DB_PATH=./threat-database/data
PATTERN_DB_PATH=./threat-database/data

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/server.log

# API Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100

# Threat Intelligence (Future use)
THREAT_INTEL_API_URL=
THREAT_INTEL_API_KEY=
THREAT_INTEL_UPDATE_INTERVAL=86400000
`;
            
            await fs.writeFile(envPath, envContent);
            console.log('✅ Created .env configuration file');
        }

        // Go back to root directory
        process.chdir('..');

        console.log('\n🎯 Setup completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Start the backend server:');
        console.log('   cd server && npm start');
        console.log('\n2. In another terminal, start the frontend:');
        console.log('   npm start');
        console.log('\n3. Open your browser to: http://localhost:8080');
        console.log('\n4. The backend will be available at: http://localhost:3000');
        
        console.log('\n🔧 Available commands:');
        console.log('   npm run dev     - Start backend in development mode');
        console.log('   npm run serve   - Start frontend with live reload');
        console.log('   npm test        - Run backend tests');
        
        console.log('\n📚 For more information, see README.md');
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

// Run setup
setup();
