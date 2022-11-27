import { request } from 'http';
import { readFileSync, writeFileSync } from 'fs';
import { spawnSync as sh } from 'child_process';

const key = readFileSync('./key').toString('utf8').trim();
const shell = sh('which', ['sh']).stdout.toString('utf8').trim();
const empty = Buffer.concat([]);
const headers = { connection: 'close' };
const server = 'http://localhost:8000';

let running = false;

function run() {
  if (running) return;

  running = true;
  const remote = request(`${server}/in`, { method: 'POST', headers });

  remote.on('response', (response) => {
    if (response.statusCode !== 200) {
      running = false;
      return;
    }

    const chunks = [];
    response.on('data', (c) => chunks.push(c));
    response.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const commands = buffer.toString('utf8').trim();

      if (commands) {
        console.log(commands);
        writeFileSync('./exec.sh', commands);
        const shellOutput = sh(shell, ['./exec.sh']);
        sendLogs(shellOutput);
      }

      running = false;
    });
  });

  remote.on('error', (e) => {
    console.log('ERROR ' + e.message);
    running = false;
  });

  remote.write(key);
  remote.end();
}

function sendLogs(output) {
  const { stdout, stderr, status } = output;
  const payload = {
    status: status,
    stdout: (stdout || empty).toString(),
    stderr: (stderr || empty).toString(),
  };

  try {
    const out = request(`${server}/out`, { method: 'POST', headers });
    out.write(JSON.stringify(payload));
    out.end();
  } catch (e) {
    console.log(e);
  }
}

setInterval(run, 5000);
