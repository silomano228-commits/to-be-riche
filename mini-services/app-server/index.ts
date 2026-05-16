import { spawn } from 'child_process';
import { resolve } from 'path';

const PROJECT_DIR = resolve('/home/z/my-project');

function startNext() {
  console.log('[app-server] Starting Next.js on port 3000...');
  
  const child = spawn('node', [resolve(PROJECT_DIR, 'node_modules/.bin/next'), 'dev', '-p', '3000'], {
    cwd: PROJECT_DIR,
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });

  child.stdout?.on('data', (data: Buffer) => {
    process.stdout.write(data);
  });

  child.stderr?.on('data', (data: Buffer) => {
    process.stderr.write(data);
  });

  child.on('exit', (code, signal) => {
    console.log(`[app-server] Next.js exited with code=${code} signal=${signal}. Restarting in 5s...`);
    setTimeout(startNext, 5000);
  });

  child.unref();
  console.log(`[app-server] Next.js spawned with PID=${child.pid}`);
}

startNext();

// Keep the process alive
setInterval(() => {
  // heartbeat
}, 30000);
