const http = require('http');
const PORT = 3000;

const server = http.createServer((req, res) => {
  console.log('Request received:', req.url);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello from Test Server!');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running at http://localhost:${PORT}/`);
});

console.log('Starting test server...');
