// Lanceur persistant : le serveur survit entre les appels Bash
// (spawn detached + unref => re-parenté à PID 1 pendant l'appel)
const { spawn } = require('child_process');
const fs = require('fs');

const LOG = '/home/z/my-project/.zscripts/dev-server.log';
const log = fs.openSync(LOG, 'a');

fs.writeFileSync(LOG, ''); // reset

const child = spawn('bun', ['run', 'dev'], {
  cwd: '/home/z/my-project',
  env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=3072' },
  detached: true,
  stdio: ['ignore', log, log]
});
child.unref();
console.log('dev server launched, pid=' + child.pid);
