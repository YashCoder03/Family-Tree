// Family Tree Builder API (no framework). One request handler used by both the local server
// (server.js, file storage) and Vercel (api/[...path].js, MongoDB). Storage and live-update
// delivery are plugged in, so the rules below are identical everywhere.
const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
const ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/i;
const MAX_AUTH_BODY = 16 * 1024;
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_PEOPLE = 5000;

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const hashPassword = async (password, salt) => (await scrypt(password, salt, 64)).toString('hex');
const sameHex = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
const loopback = (h) => /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(h);
const hostName = (hostHeader) => String(hostHeader || '').replace(/:\d+$/, '');
const normEmail = (e) => String(e || '').trim().toLowerCase();
const cleanName = (n) => String(n || '').replace(/\s+/g, ' ').trim().slice(0, 80);
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });
const emptyState = () => ({ rev: 0, updatedAt: null, name: '', tree: null, settings: null });

function validState(s) {
  return !!(s && s.tree && typeof s.tree === 'object' && s.tree.people && typeof s.tree.people === 'object'
    && s.tree.rootId && s.tree.people[s.tree.rootId] && s.settings && typeof s.settings === 'object'
    && Object.keys(s.tree.people).length <= MAX_PEOPLE);
}

// store: async storage (see lib/store-file.js and lib/store-mongo.js)
// hooks: { broadcast(space, payload), endShared(space, treeId), signOutEverywhere(userId),
//          openStream(req, res, space, cors, rev), openShareStream(req, res, space, treeId, cors, rev) }
//        left out on Vercel, where the browser checks for changes every few seconds instead
// options: { allowSignup, allowNullOrigin, hostGuard(req), trustProxy, maxBody, email: { send(to, subject, text) }, log(msg) }
function createHandler({ store, hooks = {}, options = {} }) {
  const maxBody = options.maxBody || 100 * 1024 * 1024;
  const log = options.log || (() => {});
  const allowSignup = options.allowSignup !== false;
  const realtime = !!hooks.openStream;
  const resetVia = options.email ? 'email' : 'console';
  const broadcast = (space, payload) => { if (hooks.broadcast) hooks.broadcast(space, payload); };

  function corsFor(req) {
    const origin = req.headers.origin;
    if (!origin) return {};
    let ok = origin === 'null' && options.allowNullOrigin !== false;
    if (!ok && origin !== 'null') {
      try {
        const u = new URL(origin);
        ok = u.host === req.headers.host || (loopback(u.hostname) && loopback(hostName(req.headers.host)));
      } catch (e) { ok = false; }
    }
    return ok ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } : null;
  }

  function send(res, code, body, headers) {
    res.writeHead(code, Object.assign({ 'Cache-Control': 'no-store' }, headers));
    res.end(body);
  }
  const sendJson = (res, code, obj, headers) => send(res, code, JSON.stringify(obj), Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, headers));

  function readBody(req, limit) {
    const max = limit || maxBody;
    if (req.body !== undefined && req.body !== null) { // already read by the platform (Vercel)
      const b = req.body;
      const text = Buffer.isBuffer(b) ? b.toString('utf8') : typeof b === 'string' ? b : JSON.stringify(b);
      return text.length > max ? Promise.reject(new Error('too large')) : Promise.resolve(text);
    }
    return new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      req.on('data', (c) => {
        size += c.length;
        if (size > max) { reject(new Error('too large')); req.destroy(); return; }
        chunks.push(c);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }

  async function userFor(req, q) {
    const h = String(req.headers.authorization || '');
    const token = h.startsWith('Bearer ') ? h.slice(7) : q.get('token') || '';
    if (!token) return null;
    const s = await store.getSession(sha(token));
    if (!s || s.exp < Date.now()) return null;
    return store.findUserById(s.userId);
  }

  async function newSession(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    await store.createSession(sha(token), userId, Date.now() + SESSION_MS);
    return token;
  }

  // limits repeated attempts: key -> { count, until }
  async function tooMany(key, max) {
    const a = await store.getAttempt(key);
    return !!(a && a.until > Date.now() && a.count >= max);
  }
  async function noteAttempt(key, ms) {
    const a = await store.getAttempt(key);
    const now = Date.now();
    const cur = a && a.until > now ? a : { count: 0, until: now + ms };
    cur.count += 1;
    await store.setAttempt(key, cur);
  }

  const clientIp = (req) => {
    const fwd = options.trustProxy ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '';
    return fwd || (req.socket && req.socket.remoteAddress) || '?';
  };

  async function handle(req, res) {
    try {
      await route(req, res);
    } catch (e) {
      log(`error: ${e && e.stack ? e.stack : e}`);
      if (!res.headersSent) sendJson(res, 500, { error: 'Something went wrong on the server. Try again.' });
      else try { res.end(); } catch (x) { /* already closed */ }
    }
  }

  async function route(req, res) {
    const urlObj = new URL(req.url, 'http://localhost');
    const pathname = urlObj.pathname.replace(/\/+$/, '') || '/';
    const q = urlObj.searchParams;
    if (options.hostGuard && !options.hostGuard(req)) return send(res, 403, 'Forbidden');

    const cors = corsFor(req);
    if (cors === null) return send(res, 403, 'Origin not allowed');
    if (req.method === 'OPTIONS') return send(res, 204, '', cors);

    const treeId = q.get('tree') || 'main';
    const knownRev = q.get('rev') !== null ? Number(q.get('rev')) : null;
    const ip = clientIp(req);

    if (pathname === '/api/config' && req.method === 'GET') {
      return sendJson(res, 200, { realtime, signup: allowSignup, resetVia }, cors);
    }

    // ---- view-only links: anyone holding the link can read this one tree, nothing else ----
    const sv = /^\/api\/shared\/([\w-]{20,64})(\/events)?$/.exec(pathname);
    if (sv && req.method === 'GET') {
      const sh = await store.getShare(sv[1]);
      const meta = sh && (await store.getTreeMeta(sh.space, sh.treeId));
      if (!meta || !meta.hasTree) return sendJson(res, 404, { error: 'This link is no longer available.' }, cors);
      if (sv[2]) {
        if (!hooks.openShareStream) return sendJson(res, 404, { error: 'Live updates are not available here.' }, cors);
        return hooks.openShareStream(req, res, sh.space, sh.treeId, cors, meta.rev);
      }
      if (knownRev !== null && knownRev === meta.rev) return sendJson(res, 200, { rev: meta.rev, unchanged: true }, cors);
      const st = await store.getTree(sh.space, sh.treeId);
      return sendJson(res, 200, { name: st.name, tree: st.tree, settings: st.settings, rev: st.rev, updatedAt: st.updatedAt }, cors);
    }

    // ---- accounts ----
    if (pathname.startsWith('/api/auth/') || pathname === '/api/me') {
      const body = async () => { try { return JSON.parse(await readBody(req, MAX_AUTH_BODY)) || {}; } catch (e) { return null; } };

      if (pathname === '/api/me' && req.method === 'GET') {
        const u = await userFor(req, q);
        return u ? sendJson(res, 200, { user: publicUser(u) }, cors) : sendJson(res, 401, { error: 'Not signed in' }, cors);
      }

      if (pathname === '/api/auth/register' && req.method === 'POST') {
        const b = await body();
        if (!b) return sendJson(res, 400, { error: 'Bad request' }, cors);
        const name = cleanName(b.name).slice(0, 60);
        const email = normEmail(b.email);
        const password = String(b.password || '');
        if (!allowSignup) return sendJson(res, 403, { error: 'New accounts are turned off on this site.' }, cors);
        if (await tooMany('reg|' + ip, 10)) return sendJson(res, 429, { error: 'Too many sign-ups from this address. Try again later.' }, cors);
        if (!name) return sendJson(res, 400, { error: 'Enter your name.' }, cors);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return sendJson(res, 400, { error: 'Enter a valid email address.' }, cors);
        if (password.length < 8 || password.length > 200) return sendJson(res, 400, { error: 'Use a password of at least 8 characters.' }, cors);
        if (await store.findUserByEmail(email)) return sendJson(res, 409, { error: 'An account with this email already exists. Try signing in.' }, cors);
        await noteAttempt('reg|' + ip, 3600e3);
        const salt = crypto.randomBytes(16).toString('hex');
        const user = { id: crypto.randomUUID(), name, email, salt, hash: await hashPassword(password, salt), createdAt: new Date().toISOString() };
        let claimed = 0;
        try { claimed = await store.createUser(user); } catch (e) {
          if (e && e.code === 'EMAIL_TAKEN') return sendJson(res, 409, { error: 'An account with this email already exists. Try signing in.' }, cors);
          throw e;
        }
        log(`new account: ${email}${claimed ? ` (took over ${claimed} existing tree${claimed === 1 ? '' : 's'})` : ''}`);
        return sendJson(res, 200, { token: await newSession(user.id), user: publicUser(user), claimed }, cors);
      }

      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const b = await body();
        if (!b) return sendJson(res, 400, { error: 'Bad request' }, cors);
        const email = normEmail(b.email);
        const key = 'login|' + ip + '|' + email;
        if (await tooMany(key, 5)) return sendJson(res, 429, { error: 'Too many wrong attempts. Wait 15 minutes or reset your password.' }, cors);
        const u = await store.findUserByEmail(email);
        // same work whether or not the account exists, so timing does not reveal it
        const got = await hashPassword(String(b.password || ''), u ? u.salt : 'ffffffffffffffffffffffffffffffff');
        const ok = !!u && sameHex(got, u.hash);
        if (!ok) { await noteAttempt(key, 15 * 60e3); return sendJson(res, 401, { error: 'Incorrect email or password.' }, cors); }
        await store.deleteAttempt(key);
        return sendJson(res, 200, { token: await newSession(u.id), user: publicUser(u) }, cors);
      }

      if (pathname === '/api/auth/logout' && req.method === 'POST') {
        const h = String(req.headers.authorization || '');
        if (h.startsWith('Bearer ')) await store.deleteSession(sha(h.slice(7)));
        return sendJson(res, 200, { ok: true }, cors);
      }

      if (pathname === '/api/auth/forgot' && req.method === 'POST') {
        const b = await body();
        if (!b) return sendJson(res, 400, { error: 'Bad request' }, cors);
        const email = normEmail(b.email);
        if (await tooMany('forgot|' + ip, 5)) return sendJson(res, 429, { error: 'Too many requests. Try again later.' }, cors);
        await noteAttempt('forgot|' + ip, 3600e3);
        const u = await store.findUserByEmail(email);
        if (u) {
          const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
          await store.setReset(u.id, { hash: sha(code + u.id), exp: Date.now() + 15 * 60e3, tries: 0 });
          if (options.email) {
            try { await options.email.send(u.email, 'Your Family Tree Builder reset code', `Your password reset code is ${code}. It is valid for 15 minutes. If you did not ask for it, you can ignore this email.`); } catch (e) { log(`could not send reset email: ${e.message}`); }
          } else {
            log(`\n*** Password reset code for ${u.email}: ${code}  (valid 15 minutes) ***\n`);
          }
        }
        return sendJson(res, 200, { ok: true, via: resetVia }, cors);
      }

      if (pathname === '/api/auth/reset' && req.method === 'POST') {
        const b = await body();
        if (!b) return sendJson(res, 400, { error: 'Bad request' }, cors);
        const email = normEmail(b.email);
        const password = String(b.password || '');
        if (password.length < 8 || password.length > 200) return sendJson(res, 400, { error: 'Use a password of at least 8 characters.' }, cors);
        const u = await store.findUserByEmail(email);
        const r = u && (await store.getReset(u.id));
        const bad = () => sendJson(res, 400, { error: 'That code is not valid or has expired. Ask for a new one.' }, cors);
        if (!u || !r || r.exp < Date.now() || r.tries >= 5) return bad();
        r.tries += 1;
        await store.setReset(u.id, r);
        if (!sameHex(sha(String(b.code || '').trim() + u.id), r.hash)) return bad();
        await store.deleteReset(u.id);
        const salt = crypto.randomBytes(16).toString('hex');
        await store.updatePassword(u.id, salt, await hashPassword(password, salt));
        await store.deleteUserSessions(u.id);
        if (hooks.signOutEverywhere) hooks.signOutEverywhere(u.id);
        return sendJson(res, 200, { ok: true }, cors);
      }

      return send(res, 404, 'Not found', cors);
    }

    // ---- trees: each signed-in account has its own space ----
    const user = await userFor(req, q);
    if ((req.headers.authorization || q.get('token')) && !user && pathname !== '/api/events') return sendJson(res, 401, { error: 'Session expired' }, cors);
    const space = user ? user.id : 'public';
    const locked = !user && !(await store.publicOpen());
    if (locked && pathname === '/api/trees') return sendJson(res, 403, { error: 'Sign in to see your trees', locked: true }, cors);
    if (locked && req.method !== 'GET' && pathname !== '/api/events') return sendJson(res, 403, { error: 'Sign in to save trees on the server', locked: true }, cors);

    if (pathname === '/api/trees' && req.method === 'GET') {
      const list = await store.listTrees(space);
      const shared = await store.sharedTreeIds(space);
      const out = list.map((t) => ({ id: t.id, name: t.name || (t.id === 'main' ? 'My family tree' : 'Untitled tree'), people: t.people, rev: t.rev, updatedAt: t.updatedAt, shared: shared.has(t.id) }));
      if (!out.some((t) => t.id === 'main')) out.unshift({ id: 'main', name: 'My family tree', people: 0, rev: 0, updatedAt: null, shared: false });
      return sendJson(res, 200, out, cors);
    }

    let m = /^\/api\/trees\/([\w-]+)\/name$/.exec(pathname);
    if (m && req.method === 'PUT') {
      let name;
      try { name = cleanName(JSON.parse(await readBody(req, MAX_AUTH_BODY)).name); } catch (e) { return sendJson(res, 400, { error: 'Bad request' }, cors); }
      const id = m[1];
      const meta = ID_RE.test(id) && (await store.getTreeMeta(space, id));
      if (!meta || !meta.hasTree) return sendJson(res, 404, { error: 'No such tree' }, cors);
      const done = name ? await store.renameTree(space, id, name) : meta;
      broadcast(space, { tree: id, rev: meta.rev, origin: '', list: true });
      return sendJson(res, 200, { name: done.name || name }, cors);
    }

    m = /^\/api\/trees\/([\w-]+)\/share$/.exec(pathname);
    if (m) {
      const id = m[1];
      const meta = ID_RE.test(id) && (await store.getTreeMeta(space, id));
      if (!meta || !meta.hasTree) return sendJson(res, 404, { error: 'Save this tree to the server before sharing it.' }, cors);
      if (req.method === 'GET') return sendJson(res, 200, { token: await store.getShareFor(space, id) }, cors);
      if (req.method === 'POST') {
        let token = await store.getShareFor(space, id);
        if (!token) {
          token = crypto.randomBytes(24).toString('base64url');
          await store.createShare(token, { space, treeId: id, createdAt: new Date().toISOString() });
          broadcast(space, { tree: id, rev: meta.rev, origin: '', list: true });
        }
        return sendJson(res, 200, { token }, cors);
      }
      if (req.method === 'DELETE') {
        if (await store.getShareFor(space, id)) {
          if (hooks.endShared) hooks.endShared(space, id);
          await store.deleteSharesForTree(space, id);
          broadcast(space, { tree: id, rev: meta.rev, origin: '', list: true });
        }
        return sendJson(res, 200, { token: null }, cors);
      }
    }

    m = /^\/api\/trees\/([\w-]+)$/.exec(pathname);
    if (m && req.method === 'DELETE') {
      const id = m[1];
      if (id === 'main' || !ID_RE.test(id) || !(await store.deleteTree(space, id))) return sendJson(res, 400, { error: 'This tree cannot be deleted' }, cors);
      if (hooks.endShared) hooks.endShared(space, id);
      await store.deleteSharesForTree(space, id);
      broadcast(space, { tree: id, rev: 0, origin: '', list: true, deleted: true });
      return sendJson(res, 200, { ok: true }, cors);
    }

    if (pathname === '/api/state' && !ID_RE.test(treeId)) return sendJson(res, 400, { error: 'Bad tree id' }, cors);

    if (pathname === '/api/state' && req.method === 'GET') {
      if (locked) return sendJson(res, 200, Object.assign(emptyState(), { locked: true }), cors);
      const meta = await store.getTreeMeta(space, treeId);
      if (knownRev !== null && meta && meta.hasTree && meta.rev === knownRev) return sendJson(res, 200, { rev: meta.rev, unchanged: true }, cors);
      return sendJson(res, 200, (meta && meta.hasTree && (await store.getTree(space, treeId))) || emptyState(), cors);
    }

    if (pathname === '/api/state' && req.method === 'PUT') {
      let body;
      try { body = JSON.parse(await readBody(req)); } catch (e) {
        if (e && e.message === 'too large') return sendJson(res, 413, { error: 'This tree is too big to save here. Remove or shrink some photos and try again.' }, cors);
        return sendJson(res, 400, { error: 'Bad request' }, cors);
      }
      if (!validState(body)) return sendJson(res, 400, { error: 'Invalid family tree' }, cors);
      const prev = (await store.getTreeMeta(space, treeId)) || { hasTree: false, name: '' };
      const name = cleanName(body.name) || prev.name || '';
      const next = await store.saveTree(space, treeId, { name, tree: body.tree, settings: body.settings });
      log(`saved ${user ? user.email.split('@')[0] + '/' : ''}${treeId} rev ${next.rev}: ${Object.keys(body.tree.people).length} people, from ${String(body.origin || '?').slice(0, 6)} (${String(req.headers['user-agent'] || '').replace(/^Mozilla\/5.0 \(([^)]*)\).*?(Chrome|Edg|Firefox|Safari)\/?([\d.]*).*$/, '$2 $3').slice(0, 24)})`);
      broadcast(space, { tree: treeId, rev: next.rev, origin: String(body.origin || ''), list: !prev.hasTree || name !== prev.name });
      return sendJson(res, 200, { rev: next.rev }, cors);
    }

    if (pathname === '/api/events' && req.method === 'GET') {
      if (!hooks.openStream) return sendJson(res, 404, { error: 'Live updates are not available here.' }, cors);
      const meta = await store.getTreeMeta(space, 'main');
      return hooks.openStream(req, res, space, cors, meta ? meta.rev : 0);
    }

    return send(res, 404, 'Not found', cors);
  }

  return handle;
}

module.exports = { createHandler, ID_RE, emptyState };
