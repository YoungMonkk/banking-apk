# APKGuard - Banking App Security Scanner

A comprehensive web application for scanning and analyzing Android APK files to detect potential banking malware and security threats.

## 🚀 Features

- **APK File Upload**: Drag & drop or browse to upload APK files
- **Real-time Scanning**: Visual progress tracking with step-by-step analysis
- **Security Analysis**: Multi-layered security scanning including:
  - File structure analysis
  - Permission checking
  - Signature verification
  - Code pattern analysis
  - Threat database comparison
- **Detailed Reports**: Comprehensive security reports with actionable recommendations
- **Responsive Design**: Mobile-friendly interface
- **Interactive UI**: Smooth animations and transitions
- **Real Backend**: Actual APK analysis engine (not just simulation)

## 📁 Project Structure

```
bank-apk-guard/
├── index.html              # Main HTML file
├── css/                    # Stylesheets
│   ├── styles.css         # Main styles and layout
│   ├── components.css     # Component-specific styles
│   └── animations.css     # Animation keyframes and classes
├── js/                    # JavaScript modules
│   ├── navigation.js      # Page navigation and routing
│   ├── scan.js           # APK scanning functionality (with backend integration)
│   ├── faq.js            # FAQ accordion functionality
│   ├── contact.js        # Contact form handling
│   └── main.js           # Main application logic
├── server/                # Backend server
│   ├── server.js         # Express server with APK analysis endpoints
│   ├── package.json      # Backend dependencies
│   ├── apk-analyzer/     # APK analysis engine
│   │   └── analyzer.js   # Core APK analysis logic
│   └── threat-database/  # Threat intelligence database
│       └── database.js   # Threat database management
├── setup.js              # Automated setup script
├── package.json           # Frontend project metadata
└── README.md             # Project documentation
```

## 🛠️ Technology Stack

### Frontend
- **HTML5**: Semantic markup and structure
- **CSS3**: Modern styling with CSS Grid, Flexbox, and Variables
- **Vanilla JavaScript (ES6+)**: Modular architecture with ES6 Classes
- **Animations**: CSS Keyframes and Intersection Observer API

### Backend
- **Node.js**: Server runtime environment
- **Express.js**: Web application framework
- **Multer**: File upload handling
- **APK Analysis**: Real APK parsing and security scanning
- **Threat Database**: Built-in malware signature database

## 🚀 Getting Started

### Prerequisites

- **Node.js 16+** (Download from [nodejs.org](https://nodejs.org/))
- **Modern web browser** (Chrome, Firefox, Safari, Edge)
- **APK files** for testing (optional)

### Quick Setup

1. **Clone or download** the project files
2. **Run the automated setup**:
   ```bash
   node setup.js
   ```
3. **Start the backend server** (PowerShell):
   ```bash
   cd server
   $env:FRONTEND_URL='http://localhost:8080'
   $env:ALLOW_ALL_CORS='true'   # optional during local dev
   $env:MAX_APK_SIZE_MB='200'   # optional (MB), backend default is 200
   $env:PORT='3000'
   npm run dev                   # use nodemon; or `npm start` for plain node
   ```
4. **In another terminal, start the frontend** (project root):
   ```bash
   npm run serve   # or: npm run dev
   ```
5. **Verify backend health**: open `http://localhost:3000/api/health` and confirm JSON `{ "status": "ok" }`.
6. **Open your browser** to `http://localhost:8080`

### Manual Setup

If you prefer manual setup:

1. **Install backend dependencies**:
   ```bash
   cd server
   npm install
   ```

2. **Create environment file**:
   ```bash
   cp env.example .env
   # Edit .env with your preferred settings
   ```

3. **Create necessary directories**:
   ```bash
   mkdir -p uploads logs threat-database/data
   ```

4. **Start the backend**:
   ```bash
   $env:FRONTEND_URL='http://localhost:8080'
   $env:ALLOW_ALL_CORS='true'
   $env:PORT='3000'
   npm run dev
   ```

5. **Start the frontend** (in another terminal):
   ```bash
   npm run serve
   ```

## 📱 Usage

### Scanning APK Files

1. Navigate to the **"Scan APK"** page
2. **Upload** your APK file by:
   - Dragging and dropping the file onto the upload area
   - Clicking the upload area to browse files
   - Using the "Browse Files" button
3. **Wait** for the scan to complete (progress is shown in real-time)
4. **Review** the detailed security report
5. **Follow** the recommendations provided

### Real vs. Demo Mode

- **Real Mode**: When backend is running, provides actual APK analysis
- **Demo Mode**: Falls back to simulation when backend is unavailable
- **Automatic Detection**: Frontend automatically detects backend availability

## 🔒 Security Features

### Real APK Analysis

- **File Validation**: Checks file type, size, and integrity
- **APK Extraction**: Parses APK structure and contents
- **Manifest Analysis**: Examines AndroidManifest.xml for suspicious elements
- **Permission Analysis**: Flags dangerous permission requests
- **Code Scanning**: Detects malicious patterns in DEX files
- **Threat Database**: Compares against known malware signatures

### Data Protection

- **Local Processing**: Files are analyzed locally on the server
- **Automatic Cleanup**: Uploads are removed after 1 hour
- **No Storage**: APK files are not permanently stored
- **Privacy Focused**: Minimal data collection and logging

## 🚧 Development

### Backend Development

```bash
cd server
npm run dev  # Start with nodemon for auto-reload
npm test     # Run tests
```

### Frontend Development

```bash
npm run serve  # Start with live-server for auto-reload
npm run build  # Build for production (if needed)
```

### API Endpoints

- `GET /api/health` - Server health check
- `POST /api/analyze` - Upload and analyze APK
- `GET /api/analysis/:id` - Get analysis results
- `GET /api/threats` - Get threat database summary
- `GET /api/stats` - Get analysis statistics

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `server/` directory:

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:8080
MAX_APK_SIZE_MB=200
UPLOAD_TIMEOUT=300000
ALLOW_ALL_CORS=true
```

### Threat Database

The threat database is automatically initialized with:
- Known malware signatures
- Suspicious permission patterns
- Code pattern detection rules
- Banking trojan families

## 🎨 Customization

### Adding New Threat Patterns

1. **Edit** `server/threat-database/database.js`
2. **Add** new patterns to the `createDefaultDatabase()` method
3. **Restart** the server

### Modifying Analysis Logic

1. **Edit** `server/apk-analyzer/analyzer.js`
2. **Modify** the analysis methods as needed
3. **Restart** the server

### Styling Changes

- **Colors**: Modify CSS variables in `css/styles.css`
- **Layouts**: Adjust grid and flexbox properties
- **Animations**: Customize keyframes in `css/animations.css`

## 🐛 Troubleshooting

### Common Issues

1. **Backend Connection Failed**
   - Ensure Node.js 16+ is installed
   - Check if port 3000 is available
   - Verify all dependencies are installed

2. **APK Upload Fails**
   - Check file size (default max 200MB; configurable via `MAX_APK_SIZE_MB`)
   - Ensure file is valid APK format
   - Check server logs for errors

3. **Analysis Stuck**
   - Check backend server status
   - Verify APK file integrity
   - Check server logs for errors

### Backend Logs

```bash
cd server
tail -f logs/server.log
```

### Health Check

Visit `http://localhost:3000/api/health` to check backend status.

### Notes
- Backend has its own `server/package.json` and dependencies. Run `npm install` inside `server/`.
- APK extraction fallback uses `adm-zip`, already listed in `server/package.json`.

## 🔄 Future Enhancements

- **Machine Learning**: AI-powered threat detection
- **Real-time Updates**: Live threat intelligence feeds
- **User Accounts**: Authentication and scan history
- **API Integration**: External threat intelligence services
- **Mobile App**: Native Android/iOS applications
- **Cloud Deployment**: Scalable cloud infrastructure

## 📄 License

This project is for educational and demonstration purposes. Please ensure compliance with local laws and regulations when implementing real security scanning functionality.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For questions or support:
- Email: info@apkguard.com
- Phone: +91 7000822249

## 🔄 Version History

- **v2.0.0**: Real backend implementation with actual APK analysis
- **v1.0.0**: Initial release with demo functionality
- Modular architecture
- Responsive design
- Interactive scanning interface

---

**Note**: This application now includes a real backend for actual APK analysis. For production use, implement proper security measures, rate limiting, and consider deploying to a secure cloud environment.
