const http = require('http');
const PORT = 3003;

const server = http.createServer((req, res) => {
  console.log('Request received:', req.url);
  
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
  }
  
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('APKGuard Server is running');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

console.log('Starting server...');
