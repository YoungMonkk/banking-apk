const http = require('http');
const PORT = 3000;

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
  }
  
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Minimal Test Server is running!');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Minimal Test Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log('Press Ctrl+C to stop the server\n');
});

server.on('error', (error) => {
  console.error('\n❌ Server error:', error.message);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
  }
});

process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server has been terminated');
    process.exit(0);
  });
});
