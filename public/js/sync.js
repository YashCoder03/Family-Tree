(function () {
  const FT = window.FT;
  const clientId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const treeId = FT.activeId;
  const dirtyKey = FT.dirtyKey(treeId); // set while this browser holds changes the server has not confirmed
  const sync = (FT.sync = { state: 'local', ready: false, dirty: false, base: '', rev: 0, lastSync: null, remoteAt: null });
  const flag = (on) => { try { if (on) localStorage.setItem(dirtyKey, '1'); else localStorage.removeItem(dirtyKey); } catch (e) { /* ignore */ } };

  // Opened from the server: same address. Opened from a file: look for the server on this computer.
  const BASES = location.protocol.startsWith('http') ? [''] : ['http://localhost:3000', 'http://127.0.0.1:3000'];
  let source = null;
  let pushTimer = 0;
  let pollTimer = 0;
  let retryTimer = 0;
  let pushing = false;

  function setState(s) {
    sync.state = s;
    window.dispatchEvent(new CustomEvent('ft:syncstate'));
  }

  // the sign-in expired or was reset elsewhere: go back to guest mode
  function sessionEnded(message) {
    try { sessionStorage.setItem('ftb.notice', message || 'Your session ended. Please sign in again.'); } catch (e) { /* ignore */ }
    FT.setAuth(null);
    location.reload();
  }

  async function api(path, options) {
    const ctl = new AbortController();
    // a cold serverless start plus a database connection can take a few seconds; writes get longer
    const t = setTimeout(() => ctl.abort(), options && options.method && options.method !== 'GET' ? 30000 : 12000);
    try {
      const headers = Object.assign({}, options && options.headers, FT.auth ? { Authorization: 'Bearer ' + FT.auth.token } : {});
      const res = await fetch(sync.base + path, Object.assign({ signal: ctl.signal, cache: 'no-store' }, options, { headers }));
      if (res.status === 401 && FT.auth && !path.startsWith('/api/auth/')) { sessionEnded('Your session expired. Please sign in again.'); throw new Error('HTTP 401'); }
      if (!res.ok) {
        let info = {};
        try { info = await res.json(); } catch (e) { /* not json */ }
        const err = new Error(info.error || (res.status === 413 ? 'This tree is too big to save here. Remove or shrink some photos.' : 'HTTP ' + res.status));
        err.status = res.status;
        err.locked = !!info.locked;
        throw err;
      }
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  }
  // sign in / register / reset calls (these never carry the session token)
  sync.auth = (action, body) => api('/api/auth/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  sync.logout = () => api('/api/auth/logout', { method: 'POST' });
  const stateUrl = '/api/state?tree=' + encodeURIComponent(treeId);

  async function push() {
    if (pushing || !sync.ready) return;
    pushing = true;
    sync.dirty = false;
    try {
      const snap = FT.snapshot();
      const out = await api(stateUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tree: snap.tree, settings: snap.settings, name: snap.name, origin: clientId })
      });
      sync.rev = out.rev;
      sync.lastSync = new Date();
      if (!sync.dirty) flag(false);
      setState('online');
    } catch (e) {
      if (e.locked) { sync.ready = false; setState('locked'); return; }
      if (e.status === 413 || e.status === 400) { sync.error = e.message; setState('error'); return; } // retrying cannot help
      sync.dirty = true;
      setState('offline');
      scheduleRetry();
    } finally {
      pushing = false;
    }
    if (sync.dirty && sync.state === 'online') schedulePush();
  }

  function schedulePush() {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, 120);
  }

  // called by FT.save() after every local change
  sync.queue = function () {
    flag(true);
    if (!sync.ready) return;
    sync.dirty = true;
    schedulePush();
  };

  // wait until pending changes reached the server (used before switching trees)
  sync.flush = async function () {
    clearTimeout(pushTimer);
    for (let i = 0; i < 20 && sync.ready && (sync.dirty || pushing); i++) {
      if (!pushing) await push();
      else await new Promise((r) => setTimeout(r, 100));
    }
  };

  // ---- tree library calls (used by the Trees dialog) ----
  sync.listTrees = () => api('/api/trees');
  // uploads a brand new tree under its own id
  sync.createTree = (id, snap) => api('/api/state?tree=' + encodeURIComponent(id), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tree: snap.tree, settings: snap.settings, name: snap.name, origin: clientId })
  });
  sync.renameTree = (id, name) => api('/api/trees/' + encodeURIComponent(id) + '/name', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name })
  });
  sync.deleteTree = (id) => api('/api/trees/' + encodeURIComponent(id), { method: 'DELETE' });
  // view-only link of a tree (the tree must be saved on the server first)
  sync.getShare = (id) => api('/api/trees/' + encodeURIComponent(id) + '/share');
  sync.createShare = async (id) => { await sync.flush(); return api('/api/trees/' + encodeURIComponent(id) + '/share', { method: 'POST' }); };
  sync.revokeShare = (id) => api('/api/trees/' + encodeURIComponent(id) + '/share', { method: 'DELETE' });
  // address other people use to reach the server
  sync.publicOrigin = () => (location.protocol.startsWith('http') ? location.origin : (sync.base || BASES[0]));

  // what the server can do: live push (local server) or only answer polite checks (Vercel)
  sync.config = { realtime: true, signup: true, resetVia: 'console' };
  const POLL_MS = 6000;
  async function loadConfig() {
    try { Object.assign(sync.config, await api('/api/config')); } catch (e) { /* older server: keep the defaults */ }
    window.dispatchEvent(new CustomEvent('ft:config'));
  }
  sync.loadConfig = loadConfig;

  // ---- opened through a view-only link: read the tree and follow live changes, never write ----
  async function startViewer() {
    const url = '/api/shared/' + FT.shareToken;
    let source2 = null;
    let poller = 0;
    const gone = (msg) => {
      if (source2) source2.close();
      clearInterval(poller);
      sync.gone = msg || 'This link is no longer available.';
      setState('gone');
    };
    const pull = async (poll) => {
      const remote = await api(url + (poll && sync.rev ? '?rev=' + sync.rev : ''));
      if (remote.unchanged) { if (sync.state !== 'viewing') setState('viewing'); return; }
      sync.rev = remote.rev;
      FT.applyShared(remote);
      sync.lastSync = new Date();
      setState('viewing');
    };
    for (const base of BASES) {
      sync.base = base;
      try {
        await loadConfig();
        await pull();
        window.dispatchEvent(new Event('ft:fit'));
        if (!sync.config.realtime) {
          poller = setInterval(() => { if (!document.hidden) pull(true).catch((err) => { if (err.status === 404) gone('The owner stopped sharing this tree.'); else setState('offline'); }); }, POLL_MS);
          document.addEventListener('visibilitychange', () => { if (!document.hidden) pull(true).catch(() => {}); });
          return;
        }
        source2 = new EventSource(sync.base + url + '/events');
        source2.onmessage = (e) => {
          let msg;
          try { msg = JSON.parse(e.data); } catch (err) { return; }
          if (msg.deleted) return gone('The owner stopped sharing this tree.');
          if (msg.rev && msg.rev === sync.rev) return;
          if (msg.rev) sync.rev = msg.rev;
          pull().catch((err) => { if (err.status === 404) gone(); });
        };
        source2.onerror = () => setState('offline');
        source2.onopen = () => { if (sync.state === 'offline') pull().catch(() => {}); };
        return;
      } catch (e) {
        if (e.status === 404) return gone();
      }
    }
    setState('offline');
    setTimeout(startViewer, 4000);
  }
  // downloads another tree and keeps a local copy so it can be opened right away
  sync.fetchTree = async (id) => {
    const remote = await api('/api/state?tree=' + encodeURIComponent(id));
    if (!remote.tree) throw new Error('missing');
    return remote;
  };

  // this tree was deleted from another browser: fall back to the first tree
  function treeGone() {
    try { localStorage.setItem(FT.activeKey, 'main'); } catch (err) { /* ignore */ }
    FT.forgetTree(treeId);
    location.reload();
  }

  // poll: ask only "anything newer than the revision I have?" so a quiet tree costs almost nothing
  async function pullRemote(poll) {
    const remote = await api(stateUrl + (poll && sync.rev ? '&rev=' + sync.rev : ''));
    if (remote.unchanged) { if (sync.state === 'offline' && !sync.dirty) setState('online'); return; }
    if (!remote.tree) {
      if (sync.rev > 0 && treeId !== 'main') return treeGone(); // it was synced before, so it has been deleted
      // the server lost its copy (or is brand new): re-upload this browser's tree if it holds real work
      if (!sync.dirty && !pushing && !FT.isUntouched()) { sync.dirty = true; push(); }
      return;
    }
    if (sync.dirty || pushing) return; // our own change is on its way and will win
    sync.rev = remote.rev;
    if (FT.sameTree(remote.tree, FT.store.tree) && FT.sameSettings(remote.settings, FT.store.settings) && (!remote.name || remote.name === FT.treeName())) return;
    FT.applyRemote(remote);
    sync.remoteAt = new Date();
    sync.lastSync = sync.remoteAt;
    setState('online');
  }

  // servers that cannot push (Vercel): check for changes every few seconds while the page is visible
  function startPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (document.hidden || !sync.ready || sync.dirty || pushing) return;
      pullRemote(true).catch(() => setState('offline'));
    }, POLL_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && sync.ready && !sync.dirty) pullRemote(true).catch(() => {}); });
  }

  function openStream() {
    if (source) source.close();
    source = new EventSource(sync.base + '/api/events' + (FT.auth ? '?token=' + encodeURIComponent(FT.auth.token) : ''));
    let opened = false;
    source.onopen = () => {
      if (opened) pullRemote().catch(() => {}); // catch up on anything missed while disconnected
      opened = true;
      if (!sync.dirty) setState('online');
    };
    source.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch (err) { return; }
      if (msg.signedOut) return sessionEnded('Your password was reset, please sign in again.');
      if (msg.list) window.dispatchEvent(new CustomEvent('ft:treelist'));
      const id = msg.tree || 'main';
      if (id !== treeId) return;
      if (msg.deleted) return treeGone(); // the tree open here was deleted from another browser
      if (msg.origin === clientId || msg.rev === sync.rev) return;
      pullRemote().catch(() => setState('offline'));
    };
    source.onerror = () => { if (!sync.dirty) setState('offline'); };
  }

  function scheduleRetry() {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      if (sync.ready) { if (sync.dirty) push(); } else connect();
    }, 4000);
  }

  // First contact: decide whose copy wins.
  async function reconcile(remote) {
    const local = FT.store.tree;
    if (remote.locked) {
      if (FT.isUntouched()) FT.startBlank();
      sync.ready = false;
      setState('locked');
      return 'locked';
    }
    if (!remote.tree) {
      // server has nothing yet: upload this browser's tree if it holds real work
      sync.ready = true;
      if (!FT.isUntouched()) await push();
      else setState('online');
      return;
    }
    sync.rev = remote.rev;
    const same = FT.sameTree(remote.tree, local) && FT.sameSettings(remote.settings, FT.store.settings);
    if (same || FT.isUntouched()) {
      sync.ready = true;
      if (!same) { FT.applyRemote(remote); sync.remoteAt = new Date(); }
      else if (remote.name && remote.name !== FT.treeName()) FT.setTreeName(treeId, remote.name);
      sync.lastSync = new Date();
      setState('online');
      return;
    }
    // Once change tracking is on, a browser with nothing unsent simply follows the server.
    let tracked = false;
    let unsent = false;
    try { tracked = localStorage.getItem('ftb.tracking') === '1'; unsent = localStorage.getItem(dirtyKey) === '1'; localStorage.setItem('ftb.tracking', '1'); } catch (e) { /* ignore */ }
    const n = (t) => Object.keys(t.people).length;
    const useServer = tracked && !unsent ? true : confirm(
      `This browser has a different family tree from the saved one on the server.\n\n` +
      `Server copy: ${n(remote.tree)} people\nThis browser: ${n(local)} people\n\n` +
      `OK = replace this browser's tree with the server's copy.\nCancel = keep this browser's tree and save it to the server (this replaces the server's copy).\n\n` +
      `A backup of whichever copy is replaced is kept.`
    );
    sync.ready = true;
    if (useServer) {
      try { localStorage.setItem('ftb.backup.local', JSON.stringify(FT.snapshot())); } catch (e) { /* storage full */ }
      FT.applyRemote(remote);
      flag(false);
      sync.remoteAt = new Date();
      sync.lastSync = new Date();
      setState('online');
    } else {
      await push();
    }
  }

  async function connect() {
    for (const base of BASES) {
      sync.base = base;
      try {
        await loadConfig();
        const remote = await api(stateUrl);
        if ((await reconcile(remote)) === 'locked') return true;
        try { localStorage.setItem('ftb.tracking', '1'); } catch (e) { /* ignore */ }
        // a new browser opens the empty first tree: jump to the account's newest tree that has people in it
        if (FT.auth && treeId === 'main' && FT.isBlankTree() && !sessionStorage.getItem('ftb.manual')) {
          try {
            const list = await api('/api/trees');
            const other = list.filter((t) => t.id !== 'main' && t.people > 1).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
            if (other) { localStorage.setItem(FT.activeKey, other.id); location.reload(); return true; }
          } catch (e) { /* stay on the first tree */ }
        }
        if (sync.config.realtime) openStream(); else startPolling();
        window.dispatchEvent(new CustomEvent('ft:treelist'));
        return true;
      } catch (e) {
        sync.ready = false;
      }
    }
    setState(BASES[0] === '' ? 'offline' : 'local');
    scheduleRetry();
    return false;
  }

  sync.start = () => { if (FT.readOnly) startViewer(); else connect(); };
  window.addEventListener('online', () => { if (FT.readOnly) return; if (!sync.ready) connect(); else if (sync.dirty) push(); });
  window.addEventListener('focus', () => { if (!FT.readOnly && sync.ready && !sync.dirty) pullRemote(true).catch(() => {}); });
})();
