#!/usr/bin/env node
/**
 * Minimal static server for the offline build. Binds ONLY to 127.0.0.1.
 * No dependencies, no downloads, no compilation.
 *   node scripts/serve.mjs --root dist --port 4173 [--open] [--strict-port]
 * If the port is busy it tries the next 10 ports (unless --strict-port) and prints the real URL.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HOST = '127.0.0.1';
const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
};
const flag = (name) => args.includes(`--${name}`);

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.cwd(), arg('root', path.join(here, '..', 'dist')));
const basePort = Number(arg('port', process.env.BEERAI_PORT || '4173'));
const strict = flag('strict-port');
const open = flag('open');

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error(`[BeerAI] index.html not found in ${root}. The production build (dist/) is missing.`);
  process.exit(2);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.hdr': 'application/octet-stream',
  '.ktx2': 'image/ktx2',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${HOST}`);
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.resolve(root, '.' + rel);
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
        return;
      }
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Content-Length': st.size,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    });
  } catch {
    res.writeHead(400).end('Bad request');
  }
});

function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const a = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try {
    spawn(cmd, a, { stdio: 'ignore', detached: true }).unref();
  } catch {
    /* ignore */
  }
}

function listen(port, attemptsLeft) {
  const onError = (e) => {
    server.off('listening', onListening);
    if (e.code === 'EADDRINUSE' && !strict && attemptsLeft > 0) {
      console.warn(`[BeerAI] Port ${port} busy, trying ${port + 1}…`);
      listen(port + 1, attemptsLeft - 1);
    } else {
      console.error(`[BeerAI] Cannot listen on ${HOST}:${port}: ${e.message}`);
      process.exit(1);
    }
  };
  const onListening = () => {
    server.off('error', onError);
    const actual = server.address().port;
    const url = `http://${HOST}:${actual}/`;
    console.log(`[BeerAI] Brewery Control Room 3D served from ${root}`);
    console.log(`[BeerAI] Open ${url}   (Ctrl+C to stop)`);
    if (open) openBrowser(url);
  };
  server.once('error', onError);
  server.once('listening', onListening);
  server.listen(port, HOST);
}

const stop = () => {
  console.log('\n[BeerAI] Server stopped.');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 500).unref();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

listen(basePort, 10);
