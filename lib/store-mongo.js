// MongoDB storage for Vercel (see api/index.js). One database, a few small collections:
//   users, sessions, resets, attempts   accounts and short-lived security records (expired ones clean themselves up)
//   trees                               one document per tree: { space, treeId, name, rev, people, tree, settings }
//   shares                              view-only links
//   deleted_trees                       copies of deleted trees, kept 30 days
const { MongoClient } = require('mongodb');
const { emptyState } = require('./core');

const DAY = 24 * 60 * 60 * 1000;

function createMongoStore({ uri, dbName }) {
  let client = null;
  let ready = null;

  async function ensureIndexes(db) {
    await Promise.all([
      db.collection('users').createIndex({ email: 1 }, { unique: true }),
      db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection('sessions').createIndex({ userId: 1 }),
      db.collection('resets').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection('attempts').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection('trees').createIndex({ space: 1 }),
      db.collection('shares').createIndex({ space: 1, treeId: 1 }),
      db.collection('deleted_trees').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    ]);
  }

  // The connection and indexes are set up once per server instance and reused by later requests.
  async function db() {
    if (!ready) {
      ready = (async () => {
        client = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000, appName: 'family-tree-builder' });
        await client.connect();
        const d = client.db(dbName);
        await ensureIndexes(d);
        return d;
      })().catch((e) => { ready = null; client = null; throw e; });
    }
    return ready;
  }
  const col = async (name) => (await db()).collection(name);
  const docId = (space, id) => `${space}:${id}`;
  const meta = (d) => ({ hasTree: true, rev: d.rev, name: d.name, updatedAt: d.updatedAt });
  const unwrap = (r) => (r && Object.prototype.hasOwnProperty.call(r, 'value') && !r._id ? r.value : r);

  return {
    describe: () => ({ dataDir: 'MongoDB', accounts: 0 }),

    // ---- accounts ----
    publicOpen: async () => false, // on a published site every tree belongs to an account
    async findUserByEmail(email) {
      const u = await (await col('users')).findOne({ email });
      return u ? { id: u._id, name: u.name, email: u.email, salt: u.salt, hash: u.hash, createdAt: u.createdAt } : null;
    },
    async findUserById(id) {
      const u = await (await col('users')).findOne({ _id: id });
      return u ? { id: u._id, name: u.name, email: u.email, salt: u.salt, hash: u.hash, createdAt: u.createdAt } : null;
    },
    async createUser(user) {
      try {
        await (await col('users')).insertOne({ _id: user.id, name: user.name, email: user.email, salt: user.salt, hash: user.hash, createdAt: user.createdAt });
      } catch (e) {
        if (e && e.code === 11000) { const err = new Error('email taken'); err.code = 'EMAIL_TAKEN'; throw err; }
        throw e;
      }
      return 0;
    },
    async updatePassword(id, salt, hash) { await (await col('users')).updateOne({ _id: id }, { $set: { salt, hash } }); },
    async createSession(hash, userId, exp) { await (await col('sessions')).insertOne({ _id: hash, userId, exp, expiresAt: new Date(exp) }); },
    async getSession(hash) {
      const s = await (await col('sessions')).findOne({ _id: hash });
      return s ? { userId: s.userId, exp: s.exp } : null;
    },
    async deleteSession(hash) { await (await col('sessions')).deleteOne({ _id: hash }); },
    async deleteUserSessions(userId) { await (await col('sessions')).deleteMany({ userId }); },
    async setReset(userId, r) { await (await col('resets')).replaceOne({ _id: userId }, { hash: r.hash, exp: r.exp, tries: r.tries, expiresAt: new Date(r.exp) }, { upsert: true }); },
    async getReset(userId) {
      const r = await (await col('resets')).findOne({ _id: userId });
      return r ? { hash: r.hash, exp: r.exp, tries: r.tries } : null;
    },
    async deleteReset(userId) { await (await col('resets')).deleteOne({ _id: userId }); },
    async getAttempt(key) {
      const a = await (await col('attempts')).findOne({ _id: key });
      return a ? { count: a.count, until: a.until } : null;
    },
    async setAttempt(key, a) { await (await col('attempts')).replaceOne({ _id: key }, { count: a.count, until: a.until, expiresAt: new Date(a.until + 60 * 1000) }, { upsert: true }); },
    async deleteAttempt(key) { await (await col('attempts')).deleteOne({ _id: key }); },

    // ---- trees ----
    async getTree(space, id) {
      const d = await (await col('trees')).findOne({ _id: docId(space, id) });
      return d ? { rev: d.rev, updatedAt: d.updatedAt, name: d.name, tree: d.tree, settings: d.settings } : null;
    },
    async getTreeMeta(space, id) {
      const d = await (await col('trees')).findOne({ _id: docId(space, id) }, { projection: { rev: 1, name: 1, updatedAt: 1 } });
      return d ? meta(d) : null;
    },
    async listTrees(space) {
      const docs = await (await col('trees')).find({ space }, { projection: { treeId: 1, name: 1, rev: 1, updatedAt: 1, people: 1 } }).toArray();
      return docs.map((d) => ({ id: d.treeId, name: d.name, people: d.people, rev: d.rev, updatedAt: d.updatedAt }));
    },
    async saveTree(space, id, { name, tree, settings }) {
      const r = await (await col('trees')).findOneAndUpdate(
        { _id: docId(space, id) },
        { $inc: { rev: 1 }, $set: { space, treeId: id, name, updatedAt: new Date().toISOString(), people: Object.keys(tree.people).length, tree, settings } },
        { upsert: true, returnDocument: 'after', projection: { rev: 1, name: 1, updatedAt: 1 } }
      );
      return unwrap(r) || Object.assign(emptyState(), { name });
    },
    async renameTree(space, id, name) {
      const r = await (await col('trees')).findOneAndUpdate({ _id: docId(space, id) }, { $set: { name } }, { returnDocument: 'after', projection: { rev: 1, name: 1, updatedAt: 1 } });
      return unwrap(r) || null;
    },
    async deleteTree(space, id) {
      const r = unwrap(await (await col('trees')).findOneAndDelete({ _id: docId(space, id) }));
      if (!r) return false;
      await (await col('deleted_trees')).insertOne(Object.assign({}, r, { _id: `${r._id}:${Date.now()}`, deletedAt: new Date(), expiresAt: new Date(Date.now() + 30 * DAY) }));
      return true;
    },

    // ---- view-only links ----
    async getShare(token) {
      const s = await (await col('shares')).findOne({ _id: token });
      return s ? { space: s.space, treeId: s.treeId } : null;
    },
    async getShareFor(space, treeId) {
      const s = await (await col('shares')).findOne({ space, treeId });
      return s ? s._id : null;
    },
    async createShare(token, share) { await (await col('shares')).insertOne({ _id: token, space: share.space, treeId: share.treeId, createdAt: share.createdAt }); },
    async deleteSharesForTree(space, treeId) { await (await col('shares')).deleteMany({ space, treeId }); },
    async sharedTreeIds(space) {
      const docs = await (await col('shares')).find({ space }, { projection: { treeId: 1 } }).toArray();
      return new Set(docs.map((d) => d.treeId));
    }
  };
}

module.exports = { createMongoStore };
