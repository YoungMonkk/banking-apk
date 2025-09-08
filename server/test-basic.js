const http = require('http');
const PORT = 3000;

const server = http.createServer((req, res) => {
  console.log('Request received:', req.url);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello from Basic Server!');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Basic server running at http://localhost:${PORT}/`);
  console.log('Press Ctrl+C to stop the server');
});

server.on('error', (error) => {
  console.error('Server error:', error);
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
