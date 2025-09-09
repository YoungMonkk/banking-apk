const express = require('express');
const app = express();
const PORT = 3000;

// Basic middleware
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('APKGuard Server is running');
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 APKGuard Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  process.exit(0);
});
