const http = require('http');
const PORT = 3000;

// Simple HTTP server
const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello from Test Server on port 3000!');
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Test server is running on http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop the server\n');
});

// Handle server errors
server.on('error', (error) => {
  console.error('\n❌ Server error:', error.message);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
  }
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server has been terminated');
    process.exit(0);
  });
});
