const { spawn } = require('child_process');
const path = require('path');

const env = { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' };
const child = spawn('node', [path.join(__dirname, 'node_modules/.bin/next'), 'dev', '-p', '3000'], {
  cwd: __dirname,
  env,
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe']
});

child.stdout.on('data', (data) => {
  process.stdout.write(data);
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

child.unref();

// Keep this process alive for a bit to let the server start
setTimeout(() => {
  process.exit(0);
}, 5000);
