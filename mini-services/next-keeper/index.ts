import { spawn } from 'child_process';
import { resolve } from 'path';

const PROJECT_DIR = resolve('/home/z/my-project');
const PORT = 3000;

function startNext() {
  console.log(`[keeper] Starting Next.js on port ${PORT}...`);
  
  const child = spawn('node', ['node_modules/.bin/next', 'dev', '-p', String(PORT), '--turbopack'], {
    cwd: PROJECT_DIR,
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout?.on('data', (data: Buffer) => {
    process.stdout.write(data);
  });

  child.stderr?.on('data', (data: Buffer) => {
    process.stderr.write(data);
  });

  child.on('exit', (code, signal) => {
    console.log(`[keeper] Next.js exited with code=${code} signal=${signal}. Restarting in 5s...`);
    setTimeout(startNext, 5000);
  });

  child.on('error', (err) => {
    console.error(`[keeper] Failed to start Next.js:`, err);
    setTimeout(startNext, 5000);
  });

  console.log(`[keeper] Next.js spawned with PID=${child.pid}`);
}

startNext();

// Keep alive
setInterval(() => {
  // heartbeat
}, 30000);
