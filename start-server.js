const { spawn } = require('child_process');
const fs = require('fs');
const log = fs.openSync('/home/z/my-project/dev.log', 'w');
const child = spawn('npx', ['next', 'dev', '-p', '3000'], {
  cwd: '/home/z/my-project',
  stdio: [ 'ignore', log, log ],
  env: { ...process.env }
});
child.on('exit', () => {
  fs.writeSync(log, 'RESTARTING...\n');
  setTimeout(() => {
    const c2 = spawn('npx', ['next', 'dev', '-p', '3000'], {
      cwd: '/home/z/my-project',
      stdio: [ 'ignore', log, log ],
      env: { ...process.env }
    });
    c2.on('exit', () => fs.writeSync(log, 'EXIT2\n'));
  }, 3000);
});
// Keep the Node process alive
setInterval(() => {}, 10000);
