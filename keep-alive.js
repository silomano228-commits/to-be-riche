const { spawn } = require('child_process');
const http = require('http');

function startServer() {
  const child = spawn('npx', ['next', 'dev', '-p', '3000', '--webpack'], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=1024' }
  });

  child.stdout.on('data', (data) => process.stdout.write(data.toString()));
  child.stderr.on('data', (data) => process.stderr.write(data.toString()));

  child.on('exit', (code, signal) => {
    console.log(`\n[${new Date().toISOString()}] Server died (code=${code}, signal=${signal}). Restarting in 2s...`);
    setTimeout(startServer, 2000);
  });

  // Health-check pings every 3s to keep server warm
  const interval = setInterval(() => {
    http.get('http://localhost:3000/', (res) => {
      res.resume();
    }).on('error', () => {});
  }, 3000);

  child.on('exit', () => clearInterval(interval));
}

console.log(`[${new Date().toISOString()}] Keep-alive starting...`);
startServer();