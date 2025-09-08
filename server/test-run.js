const { spawn } = require('child_process');

console.log('Starting server...');
const server = spawn('node', ['simple-apkguard.js'], {
  stdio: 'pipe',
  shell: true,
  env: { ...process.env, FORCE_COLOR: '1' }
});

server.stdout.on('data', (data) => {
  console.log(`[SERVER] ${data}`.trim());
});

server.stderr.on('data', (data) => {
  console.error(`[SERVER ERROR] ${data}`.trim());
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

// Test the server after a short delay
setTimeout(() => {
  const http = require('http');
  console.log('\nTesting server...');
  
  http.get('http://localhost:3000', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('Server response:', data);
      console.log('Status Code:', res.statusCode);
      process.exit(0);
    });
  }).on('error', (e) => {
    console.error('Test failed:', e.message);
    process.exit(1);
  });
}, 2000); // Wait 2 seconds for server to start
