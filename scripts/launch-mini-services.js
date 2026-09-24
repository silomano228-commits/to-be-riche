const { spawn } = require('child_process');
const fs = require('fs');
const services = [
  { name: 'chat-service', dir: '/home/z/my-project/mini-services/chat-service' }
];
for (const s of services) {
  const log = fs.openSync(`/home/z/my-project/.zscripts/mini-service-${s.name}.log`, 'w');
  const child = spawn('bun', ['run', 'dev'], {
    cwd: s.dir, env: process.env, detached: true, stdio: ['ignore', log, log]
  });
  child.unref();
  console.log(`${s.name} launched pid=${child.pid}`);
}
