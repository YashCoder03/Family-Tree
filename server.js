// Family Tree Builder local server (no dependencies).
//   node server.js            -> http://localhost:3000
//   PORT=8080 node server.js  -> another port
//   HOST=0.0.0.0 node server.js -> reachable from other devices on your network
//
// Trees, accounts and view-only links are stored in the data folder. Every browser that opens the
// app talks to this server: changes are saved immediately and pushed to the other open browsers.
// (On Vercel the same API runs from api/[...path].js with MongoDB instead.)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createHandler } = require('./lib/core');
const { createFileStore } = require('./lib/store-file');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const LOCAL_SEED = path.join(ROOT, 'local', 'family-data.js');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');

const loopback = (h) => /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(h);
const hostName = (hostHeader) => String(hostHeader || '').replace(/:\d+$/, '');
const stamp = () => new Date().toLocaleTimeString();

const store = createFileStore(DATA_DIR);

// ---- live updates (server-sent events) ----
const streams = new Map(); // response -> "who listens": a space, or share:<space>:<treeId>
const shareKey = (space, treeId) => `share:${space}:${treeId}`;
function openSse(res, cors, key, first) {
  res.writeHead(200, Object.assign({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' }, cors));
  res.write(`retry: 2000\ndata: ${JSON.stringify(first)}\n\n`);
  streams.set(res, key);
  const beat = setInterval(() => res.write(': keep-alive\n\n'), 20000);
  res.on('close', () => { clearInterval(beat); streams.delete(res); });
}
const hooks = {
  openStream: (req, res, space, cors, rev) => openSse(res, cors, space, { tree: 'main', rev, origin: '' }),
  openShareStream: (req, res, space, treeId, cors, rev) => openSse(res, cors, shareKey(space, treeId), { rev }),
  broadcast(space, payload) {
    const msg = `data: ${JSON.stringify(payload)}\n\n`;
    const viewers = shareKey(space, payload.tree);
    streams.forEach((key, r) => { if (key === space || key === viewers) r.write(msg); });
  },
  // tell everyone watching a tree through a view-only link that it is gone
  endShared(space, treeId) {
    const viewers = shareKey(space, treeId);
    streams.forEach((key, r) => { if (key === viewers) r.write(`data: ${JSON.stringify({ deleted: true })}\n\n`); });
  },
  signOutEverywhere(userId) {
    streams.forEach((key, r) => { if (key === userId) r.write(`data: ${JSON.stringify({ signedOut: true })}\n\n`); });
  }
};

const api = createHandler({
  store,
  hooks,
  options: {
    allowNullOrigin: true, // the page may also be opened straight from a file
    hostGuard: (req) => !(loopback(HOST) && !loopback(hostName(req.headers.host))),
    log: (msg) => console.log(`${stamp()} ${msg}`)
  }
});

// ---- the app files ----
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon'
};

function send(res, code, body, headers) {
  res.writeHead(code, Object.assign({ 'Cache-Control': 'no-store' }, headers));
  res.end(body);
}

function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? '/index.html' : pathname;
  // only the app files are public: never the server, the data folder or dot files
  if (!/^\/(index\.html|favicon\.svg|(js|css)\/[\w.-]+)$/.test(rel)) return send(res, 404, 'Not found');
  // the starting family lives outside public/ so it is never part of a published site
  const file = rel === '/js/family-data.js' && fs.existsSync(LOCAL_SEED) ? LOCAL_SEED : path.join(PUBLIC_DIR, rel);
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'Not found');
    send(res, 200, buf, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  });
}

const server = http.createServer((req, res) => {
  if (loopback(HOST) && !loopback(hostName(req.headers.host))) return send(res, 403, 'Forbidden');
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname.startsWith('/api/')) return api(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
  return serveStatic(req, res, pathname);
});

server.listen(PORT, HOST, () => {
  const info = store.describe();
  console.log(`Family Tree Builder running at http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`Data folder: ${info.dataDir} (accounts: users.json, each account's trees: users/<id>/)`);
  console.log(info.accounts ? `${info.accounts} account${info.accounts === 1 ? '' : 's'} registered.` : 'No accounts yet: the first account to register takes over the existing trees.');
});
