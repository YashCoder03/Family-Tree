// File storage for the local server: everything lives in the data folder.
//   data/family-tree.json            the original "main" tree (used before anyone registers)
//   data/trees/<id>.json             other trees of that original space
//   data/users.json, sessions.json   accounts and sign-ins
//   data/users/<userId>/main.json    one account's trees (main.json + trees/<id>.json)
//   data/shares.json                 view-only links
const fs = require('fs');
const path = require('path');
const { ID_RE, emptyState } = require('./core');

const BACKUP_EVERY_MS = 5 * 60 * 1000;
const BACKUP_KEEP = 100;

function createFileStore(dataDir) {
  const BACKUP_DIR = path.join(dataDir, 'backups');
  const TREES_DIR = path.join(dataDir, 'trees');
  const USERS_DIR = path.join(dataDir, 'users');
  const MAIN_FILE = path.join(dataDir, 'family-tree.json');
  const USERS_FILE = path.join(dataDir, 'users.json');
  const SESSIONS_FILE = path.join(dataDir, 'sessions.json');
  const SHARES_FILE = path.join(dataDir, 'shares.json');
  [BACKUP_DIR, TREES_DIR, USERS_DIR].forEach((d) => fs.mkdirSync(d, { recursive: true }));

  const readJson = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; } };
  const writeJson = (file, data) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, file);
  };

  // A "space" is where one set of trees lives: "public" (the original data) or one account's folder.
  const spaces = new Map();
  const lastBackup = new Map();
  const dirsOf = (space) => (space === 'public'
    ? { main: MAIN_FILE, trees: TREES_DIR }
    : { main: path.join(USERS_DIR, space, 'main.json'), trees: path.join(USERS_DIR, space, 'trees') });
  const fileFor = (space, id) => (id === 'main' ? dirsOf(space).main : path.join(dirsOf(space).trees, id + '.json'));

  function loadSpace(space) {
    const map = new Map();
    const d = dirsOf(space);
    map.set('main', Object.assign(emptyState(), readJson(d.main, null) || {}));
    try {
      fs.readdirSync(d.trees).filter((f) => f.endsWith('.json')).forEach((f) => {
        const id = f.slice(0, -5);
        const s = readJson(path.join(d.trees, f), null);
        if (ID_RE.test(id) && s && s.tree) map.set(id, Object.assign(emptyState(), s));
      });
    } catch (e) { /* no trees folder yet */ }
    spaces.set(space, map);
    return map;
  }
  const trees = (space) => spaces.get(space) || loadSpace(space);

  function writeTree(space, id) {
    const file = fileFor(space, id);
    writeJson(file, trees(space).get(id));
    const now = Date.now();
    const key = space + '/' + id;
    if (now - (lastBackup.get(key) || 0) > BACKUP_EVERY_MS) {
      lastBackup.set(key, now);
      const stamp = new Date(now).toISOString().replace(/[:.]/g, '-');
      const prefix = space === 'public' ? (id === 'main' ? 'family-tree-' : `tree-${id}-`) : `user-${space.slice(0, 8)}-${id}-`;
      fs.copyFileSync(file, path.join(BACKUP_DIR, `${prefix}${stamp}.json`));
      const old = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith(prefix) && f.endsWith('.json')).sort();
      old.slice(0, Math.max(0, old.length - BACKUP_KEEP)).forEach((f) => fs.unlinkSync(path.join(BACKUP_DIR, f)));
    }
  }

  let users = readJson(USERS_FILE, []);
  let sessions = readJson(SESSIONS_FILE, {});
  let shares = readJson(SHARES_FILE, {});
  const resets = new Map();
  const attempts = new Map();
  const saveUsers = () => writeJson(USERS_FILE, users);
  const saveSessions = () => writeJson(SESSIONS_FILE, sessions);
  const saveShares = () => writeJson(SHARES_FILE, shares);

  // The first account takes over the trees that existed before accounts did.
  function claimPublicTrees(user) {
    const pub = trees('public');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    try { if (fs.existsSync(MAIN_FILE)) fs.copyFileSync(MAIN_FILE, path.join(BACKUP_DIR, `before-accounts-family-tree-${stamp}.json`)); } catch (e) { /* best effort */ }
    const dest = dirsOf(user.id);
    fs.mkdirSync(dest.trees, { recursive: true });
    if (fs.existsSync(MAIN_FILE)) fs.renameSync(MAIN_FILE, dest.main);
    fs.readdirSync(TREES_DIR).filter((f) => f.endsWith('.json')).forEach((f) => fs.renameSync(path.join(TREES_DIR, f), path.join(dest.trees, f)));
    spaces.set(user.id, pub);
    spaces.set('public', new Map([['main', emptyState()]]));
    Object.keys(shares).forEach((t) => { if (shares[t].space === 'public') shares[t].space = user.id; });
    saveShares();
    return [...pub.values()].filter((s) => s.tree).length;
  }

  return {
    describe: () => ({ dataDir, accounts: users.length }),

    // ---- accounts ----
    publicOpen: async () => users.length === 0,
    findUserByEmail: async (email) => users.find((u) => u.email === email) || null,
    findUserById: async (id) => users.find((u) => u.id === id) || null,
    async createUser(user) {
      if (users.some((u) => u.email === user.email)) { const e = new Error('email taken'); e.code = 'EMAIL_TAKEN'; throw e; }
      let claimed = 0;
      if (users.length === 0) { try { claimed = claimPublicTrees(user); } catch (e) { console.log('Could not move the existing trees:', e.message); } }
      users.push(user);
      saveUsers();
      return claimed;
    },
    async updatePassword(id, salt, hash) {
      const u = users.find((x) => x.id === id);
      if (u) { u.salt = salt; u.hash = hash; saveUsers(); }
    },
    async createSession(hash, userId, exp) {
      const now = Date.now();
      Object.keys(sessions).forEach((k) => { if (sessions[k].exp < now) delete sessions[k]; });
      sessions[hash] = { userId, exp };
      saveSessions();
    },
    getSession: async (hash) => sessions[hash] || null,
    async deleteSession(hash) { delete sessions[hash]; saveSessions(); },
    async deleteUserSessions(userId) {
      Object.keys(sessions).forEach((k) => { if (sessions[k].userId === userId) delete sessions[k]; });
      saveSessions();
    },
    setReset: async (userId, r) => { resets.set(userId, r); },
    getReset: async (userId) => resets.get(userId) || null,
    deleteReset: async (userId) => { resets.delete(userId); },
    getAttempt: async (key) => attempts.get(key) || null,
    setAttempt: async (key, a) => { attempts.set(key, a); },
    deleteAttempt: async (key) => { attempts.delete(key); },

    // ---- trees ----
    async getTree(space, id) { const s = trees(space).get(id); return s && s.tree ? s : null; },
    async getTreeMeta(space, id) {
      const s = trees(space).get(id);
      return s ? { hasTree: !!s.tree, rev: s.rev, name: s.name, updatedAt: s.updatedAt } : null;
    },
    async listTrees(space) {
      return [...trees(space).entries()].filter(([, s]) => s.tree).map(([id, s]) => ({
        id, name: s.name, people: Object.keys(s.tree.people).length, rev: s.rev, updatedAt: s.updatedAt
      }));
    },
    async saveTree(space, id, { name, tree, settings }) {
      const map = trees(space);
      const prev = map.get(id) || emptyState();
      const next = { rev: (prev.rev || 0) + 1, updatedAt: new Date().toISOString(), name, tree, settings };
      map.set(id, next);
      writeTree(space, id);
      return next;
    },
    async renameTree(space, id, name) {
      const s = trees(space).get(id);
      if (!s || !s.tree) return null;
      s.name = name;
      writeTree(space, id);
      return s;
    },
    async deleteTree(space, id) {
      const map = trees(space);
      if (!map.has(id)) return false;
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      fs.renameSync(fileFor(space, id), path.join(BACKUP_DIR, `deleted-tree-${id}-${stamp}.json`));
      map.delete(id);
      return true;
    },

    // ---- view-only links ----
    getShare: async (token) => (Object.prototype.hasOwnProperty.call(shares, token) ? shares[token] : null),
    getShareFor: async (space, treeId) => Object.keys(shares).find((t) => shares[t].space === space && shares[t].treeId === treeId) || null,
    async createShare(token, share) { shares[token] = share; saveShares(); },
    async deleteSharesForTree(space, treeId) {
      Object.keys(shares).forEach((t) => { if (shares[t].space === space && shares[t].treeId === treeId) delete shares[t]; });
      saveShares();
    },
    sharedTreeIds: async (space) => new Set(Object.values(shares).filter((s) => s.space === space).map((s) => s.treeId))
  };
}

module.exports = { createFileStore };
