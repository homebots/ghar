import { request } from 'https';
import { readFileSync, writeFileSync } from 'fs';
import { spawnSync as sh } from 'child_process';

const key = readFileSync('./key').toString('utf8');
const shell = sh('which', ['sh']).stdout.toString('utf8').trim();
const empty = Buffer.concat([]);

console.log('Using', shell);

function run() {
  const remote = request('https://ghar.homebots.io/in', { method: 'POST' });

  remote.on('response', (response) => {
    const chunks = [];
    response.on('data', (c) => chunks.push(c));
    response.on('end', () => {
      const buffer = Buffer.concat(chunks);
      writeFileSync('./exec.sh', buffer.toString('utf8'));
      const { stdout, stderr } = sh(shell, ['./exec.sh']);
      const out = request('https://ghar.homebots.io/out', { method: 'POST' });
      out.write(JSON.stringify({ stdout: (stdout || empty).toString(), stderr: (stderr || empty).toString() }));
      out.end();
    });
  });
  remote.write(key);
  remote.end();
}
