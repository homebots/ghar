import { createServer } from 'http';
import { start } from 'repl';
import { readFileSync } from 'fs';

const key = readFileSync('./key').toString().trim();
let inputQueue = [];
let outputQueue = [];

start({
  eval(input, _a, _b, cb) {
    inputQueue.push(input);
    outputQueue.push(cb);
  },
});

function readData(req) {
  return new Promise((resolve, reject) => {
    const a = [];
    req.on('end', () => {
      const buffer = Buffer.concat(a).toString('utf-8');
      resolve(buffer);
    });
    req.on('data', (c) => a.push(c));
    req.on('error', (e) => {
      reject(e);
    });
  });
}

async function output(req, res) {
  res.writeHead(200, 'OK');
  res.end('');

  const log = await readData(req);
  const output = JSON.parse(log);
  const cb = outputQueue.shift();

  if (output.stdout) {
    console.log(output.status, output.stdout);
  }

  if (output.stderr) {
    console.log(output.status, output.stderr);
  }

  if (cb) {
    cb(null);
  }
}

async function input(req, res) {
  if (!inputQueue.length) {
    res.end('');
    return;
  }

  const remoteKey = await readData(req);

  if (key !== remoteKey) {
    console.log('Invalid key', remoteKey);
    res.writeHead(403, 'Forbidden');
    res.end();
    return;
  }

  res.writeHead(200, 'OK');
  res.end(inputQueue.shift());
}

createServer(async (req, res) => {
  if (req.url === '/in') {
    input(req, res);
    return;
  }

  if (req.url === '/out') {
    output(req, res);

    return;
  }

  res.writeHead(404, 'Not found');
  res.end('');
}).listen(process.env.PORT || 8000);
