(function () {
  const FT = (window.FT = {});
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };

  // ---- view-only link (?share=...): nothing is saved or edited, the tree is read from the server ----
  FT.shareToken = (() => {
    try { const t = new URLSearchParams(location.search).get('share'); return /^[\w-]{20,64}$/.test(t || '') ? t : ''; } catch (e) { return ''; }
  })();
  FT.readOnly = !!FT.shareToken;

  // ---- account (optional): a signed-in browser keeps its own set of local copies ----
  FT.auth = FT.readOnly ? null : (() => {
    try {
      const a = JSON.parse(lsGet('ftb.auth'));
      return a && a.token && a.user && /^[\w-]{8,64}$/.test(a.user.id) ? a : null;
    } catch (e) { return null; }
  })();
  const NS = FT.auth ? FT.auth.user.id + '.' : '';
  // The guest's first tree keeps its original keys; everything else is namespaced by account.
  const KEY = 'ftb.clone.v2';
  const SETTINGS_KEY = 'ftb.clone.settings.v2';
  const NAMES_KEY = 'ftb.' + NS + 'names';
  const ACTIVE_KEY = 'ftb.' + NS + 'active';
  const legacyMain = (id) => id === 'main' && !FT.auth;
  const keyOf = (id) => (legacyMain(id) ? KEY : 'ftb.' + NS + 't.' + id);
  const settingsKeyOf = (id) => (legacyMain(id) ? SETTINGS_KEY : 'ftb.' + NS + 'ts.' + id);
  FT.dirtyKey = (id) => 'ftb.' + NS + 'dirty.' + id;
  FT.activeKey = ACTIVE_KEY;
  // only the guest's first tree starts with the family data that ships with the app
  const usesSeed = () => FT.activeId === 'main' && !FT.auth;

  FT.activeId = /^[\w-]{1,40}$/.test(lsGet(ACTIVE_KEY) || '') ? lsGet(ACTIVE_KEY) : 'main';

  FT.names = () => { try { return JSON.parse(lsGet(NAMES_KEY)) || {}; } catch (e) { return {}; } };
  FT.treeName = (id) => (FT.readOnly ? (store.sharedName || 'Shared tree') : FT.names()[id || FT.activeId] || ((id || FT.activeId) === 'main' ? 'My family tree' : 'Untitled tree'));
  FT.setTreeName = function (id, name) {
    if (FT.readOnly) return;
    const n = FT.names();
    n[id] = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    try { localStorage.setItem(NAMES_KEY, JSON.stringify(n)); } catch (e) { /* ignore */ }
    window.dispatchEvent(new CustomEvent('ft:treename'));
  };
  FT.forgetTree = function (id) {
    const n = FT.names();
    delete n[id];
    try {
      localStorage.setItem(NAMES_KEY, JSON.stringify(n));
      localStorage.removeItem(keyOf(id));
      localStorage.removeItem(settingsKeyOf(id));
      localStorage.removeItem(FT.dirtyKey(id));
    } catch (e) { /* ignore */ }
  };
  // trees this browser knows about (used when the server cannot be reached)
  FT.localTrees = () => ['main'].concat(Object.keys(FT.names()).filter((id) => id !== 'main' && lsGet(keyOf(id)))).map((id) => ({ id, name: FT.treeName(id) }));

  // When the first account takes over the existing trees, this browser's guest copies move
  // into that account too, so the next guest does not see them.
  FT.adoptGuestData = function (userId) {
    const ns = userId + '.';
    const move = (from, to) => { const v = lsGet(from); if (v !== null) { localStorage.setItem(to, v); localStorage.removeItem(from); } };
    try {
      move(KEY, `ftb.${ns}t.main`);
      move(SETTINGS_KEY, `ftb.${ns}ts.main`);
      move('ftb.names', `ftb.${ns}names`);
      move('ftb.active', `ftb.${ns}active`);
      move('ftb.dirty.main', `ftb.${ns}dirty.main`);
      Object.keys(localStorage).filter((k) => /^ftb\.(t|ts|dirty)\./.test(k)).forEach((k) => move(k, k.replace(/^ftb\./, 'ftb.' + ns)));
    } catch (e) { /* ignore */ }
  };
  FT.setAuth = function (auth) {
    try {
      if (auth) localStorage.setItem('ftb.auth', JSON.stringify(auth)); else localStorage.removeItem('ftb.auth');
      const v = JSON.parse(localStorage.getItem('ftb.viewstate') || '{}');
      v.center = null;
      localStorage.setItem('ftb.viewstate', JSON.stringify(v));
    } catch (e) { /* ignore */ }
  };
  FT.DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'D MMM YYYY', 'YYYY'];
  FT.FONT_SCALE = { small: 0.88, medium: 1, large: 1.18 };
  FT.STYLES = { classic: 'Classic card', compact: 'Compact', photo: 'Large photo' };

  function blank(id, name, gender) {
    return {
      id, name, surnameNow: '', surnameBirth: '', gender: gender || '', dob: '', dod: '',
      city: '', profession: '', facts: '', image: '', parentIds: [], partnerIds: []
    };
  }
  FT.blankPerson = blank;

  FT.defaultTree = function () {
    if (window.FT_SEED) return JSON.parse(JSON.stringify(window.FT_SEED));
    const me = blank('me', 'Me', 'male');
    me.dob = '1994-04-07';
    me.facts = 'A glimpse of who I am. Hide or show tree parts via Family Tree settings in top bar.';
    me.parentIds = ['father', 'mother'];
    const mother = blank('mother', 'My Mother', 'female');
    mother.dob = '1969-06-02';
    mother.facts = 'Meet my mother! Edit her info and expand family connections via left menu.';
    mother.partnerIds = ['father'];
    const father = blank('father', 'My Father', 'male');
    father.dob = '1965-07-03';
    father.facts = "Meet my dad! He'd love if you made a family tree and shared a picture with him.";
    father.partnerIds = ['mother'];
    return { rootId: 'me', seq: 1, people: { me, mother, father } };
  };

  FT.defaultSettings = function () {
    return {
      dateFormat: 'MM/DD/YYYY',
      fontSize: 'medium',
      style: 'classic',
      show: { photo: true, dates: true, city: true, profession: true, facts: true, relation: true },
      parts: { ancestors: true, siblings: true, descendants: true },
      manual: false,
      autoFit: false,
      collapsed: [],
      collapsedUp: []
    };
  };

  const store = (FT.store = {
    tree: null,
    settings: null,
    selectedId: 'me',
    history: [],
    future: [],
    listeners: []
  });

  // ---- name + city list (suggestions) ------------------------------------
  // tree.directory holds unique {name, surname, city} entries. Every saved person is added
  // automatically and entries stay even if the person is later deleted.
  const PLACEHOLDER = /^(new (child|partner|sibling)|unnamed)$|'s (father|mother)$/i;
  const clean = (s) => String(s || '').trim().replace(/\s+/g, ' ');
  const low = (s) => clean(s).toLowerCase();
  FT.directoryKey = (e) => [e.name, e.surname, e.city].map(low).join('|');
  const baseKey = (e) => low(e.name) + '|' + low(e.surname);
  FT.directoryLabel = (e) => [clean(e.name), clean(e.surname)].filter(Boolean).join(' ');

  function dirAdd(t, entry, manual) {
    const e = { name: clean(entry.name), surname: clean(entry.surname), city: clean(entry.city) };
    if (manual) e.manual = true;
    if (!e.name || PLACEHOLDER.test(e.name)) return false;
    const list = t.directory;
    const key = FT.directoryKey(e);
    if (list.some((x) => FT.directoryKey(x) === key)) return false;
    if (!e.city && list.some((x) => x.city && baseKey(x) === baseKey(e))) return false;
    // a name that now has a city replaces its city-less entry
    if (e.city) t.directory = list.filter((x) => x.manual || x.city || baseKey(x) !== baseKey(e));
    t.directory.push(e);
    return true;
  }

  // Keeps the list in step with the tree: new people are added, and entries that no person
  // uses any more are dropped (except ones added by hand from the Name & City list).
  function collectDirectory(t) {
    t.directory = (Array.isArray(t.directory) ? t.directory : []).filter((x) => x && typeof x.name === 'string');
    const seen = new Set();
    t.directory = t.directory.filter((x) => { const k = FT.directoryKey(x); return !seen.has(k) && seen.add(k); });
    const people = Object.values(t.people);
    people.forEach((p) => dirAdd(t, { name: p.name, surname: p.surnameNow, city: p.city }));
    const used = new Set(people.map((p) => FT.directoryKey({ name: p.name, surname: p.surnameNow, city: p.city })));
    t.directory = t.directory.filter((x) => x.manual || used.has(FT.directoryKey(x)));
  }

  // Entries whose name, surname and city all contain the typed text (empty fields are ignored).
  FT.searchDirectory = function (q, limit) {
    const n = low(q.name); const s = low(q.surname); const c = low(q.city);
    const out = store.tree.directory.filter((e) => (!n || low(e.name).includes(n)) && (!s || low(e.surname).includes(s)) && (!c || low(e.city).includes(c)));
    out.sort((a, b) => FT.directoryLabel(a).localeCompare(FT.directoryLabel(b)) || a.city.localeCompare(b.city));
    return limit ? out.slice(0, limit) : out;
  };
  FT.inDirectory = (e) => store.tree.directory.some((x) => FT.directoryKey(x) === FT.directoryKey(e));
  // unique values of one field ('name' | 'surname' | 'city') with how many list entries use each
  FT.directoryValues = function (field) {
    const seen = new Map();
    store.tree.directory.forEach((e) => {
      const v = clean(e[field]);
      if (!v) return;
      const k = v.toLowerCase();
      const prev = seen.get(k);
      seen.set(k, { value: prev ? prev.value : v, count: (prev ? prev.count : 0) + 1 });
    });
    return [...seen.values()].sort((a, b) => a.value.localeCompare(b.value));
  };

  // returns 'added' | 'exists' | 'invalid'
  FT.addDirectoryEntry = function (entry) {
    if (!clean(entry.name) || PLACEHOLDER.test(clean(entry.name))) return 'invalid';
    if (FT.inDirectory(entry)) return 'exists';
    FT.mutate((t) => { dirAdd(t, entry, true); });
    return 'added';
  };
  FT.removeDirectoryEntry = function (key) {
    const used = Object.values(store.tree.people).some((p) => FT.directoryKey({ name: p.name, surname: p.surnameNow, city: p.city }) === key);
    if (used) return false; // still belongs to a person in the tree
    FT.mutate((t) => { t.directory = t.directory.filter((x) => FT.directoryKey(x) !== key); });
    return true;
  };

  function normalizeTree(t) {
    if (!t || !t.people || !t.people[t.rootId]) throw new Error('Invalid tree');
    Object.values(t.people).forEach((p) => {
      Object.assign(p, Object.assign(blank(p.id, p.name || ''), p));
      delete p.country; // replaced by "city"
      p.parentIds = p.parentIds.filter((id) => t.people[id]);
      p.partnerIds = p.partnerIds.filter((id) => t.people[id]);
    });
    t.seq = t.seq || Object.keys(t.people).length + 1;
    collectDirectory(t);
    return t;
  }

  function mergeSettings(s) {
    const d = FT.defaultSettings();
    const out = Object.assign(d, s, {
      show: Object.assign(d.show, s && s.show),
      parts: Object.assign(d.parts, s && s.parts)
    });
    delete out.show.country;
    return out;
  }

  FT.load = function () {
    if (FT.readOnly) { // the real tree arrives from the server (FT.applyShared)
      store.tree = normalizeTree(FT.blankTree('Loading…'));
      store.settings = FT.defaultSettings();
      store.selectedId = store.tree.rootId;
      return;
    }
    const id = FT.activeId;
    try {
      store.tree = normalizeTree(JSON.parse(localStorage.getItem(keyOf(id))));
    } catch (e) {
      // other trees start blank when this browser has no copy; the server copy is pulled in on connect
      store.tree = normalizeTree(usesSeed() ? FT.defaultTree() : FT.blankTree());
      store.fresh = !usesSeed();
    }
    try {
      store.settings = mergeSettings(JSON.parse(localStorage.getItem(settingsKeyOf(id))));
    } catch (e) {
      store.settings = FT.defaultSettings();
    }
    store.selectedId = store.tree.rootId;
  };

  // opts.local: only refresh this browser's copy (used when the data just came from the server)
  FT.save = function (opts) {
    if (FT.readOnly) { window.dispatchEvent(new CustomEvent('ft:saved')); return; }
    try {
      localStorage.setItem(keyOf(FT.activeId), JSON.stringify(store.tree));
      localStorage.setItem(settingsKeyOf(FT.activeId), JSON.stringify(store.settings));
      window.dispatchEvent(new CustomEvent('ft:saved'));
    } catch (e) {
      alert('Could not save the tree in this browser (storage is full). Try a smaller photo or save your tree to a file.');
    }
    if (!(opts && opts.local)) store.fresh = false;
    if (!(opts && opts.local) && FT.sync) FT.sync.queue();
  };

  FT.snapshot = () => ({ tree: store.tree, settings: store.settings, name: FT.treeName() });

  // A guest of a server that already has accounts must not see the family data shipped with the app.
  FT.startBlank = function () {
    store.tree = normalizeTree(FT.blankTree());
    store.selectedId = store.tree.rootId;
    store.history = [];
    store.future = [];
    FT.save({ local: true });
    emit();
  };
  // settings compared after filling in defaults, so an older saved copy still counts as equal
  FT.sameSettings = (a, b) => { try { return JSON.stringify(mergeSettings(a)) === JSON.stringify(mergeSettings(b)); } catch (e) { return false; } };

  const canonical = (t) => JSON.stringify(normalizeTree(JSON.parse(JSON.stringify(t))));
  FT.sameTree = (a, b) => { try { return canonical(a) === canonical(b); } catch (e) { return false; } };
  // true while this browser still holds the untouched starting tree
  FT.isUntouched = () => (usesSeed() ? FT.sameTree(store.tree, FT.defaultTree()) : !!store.fresh);

  // Replace this browser's tree with one received from the server (another browser changed it).
  FT.applyRemote = function (remote) {
    store.tree = normalizeTree(JSON.parse(JSON.stringify(remote.tree)));
    store.settings = mergeSettings(remote.settings);
    if (remote.name) FT.setTreeName(FT.activeId, remote.name);
    store.fresh = false;
    store.history = [];
    store.future = [];
    if (!store.tree.people[store.selectedId]) store.selectedId = store.tree.rootId;
    FT.save({ local: true });
    emit();
  };

  FT.onChange = (fn) => store.listeners.push(fn);
  const emit = () => store.listeners.forEach((fn) => fn());
  FT.emit = emit;

  // View-only link: show the tree the server sent; this browser never writes it anywhere.
  FT.applyShared = function (remote) {
    store.tree = normalizeTree(JSON.parse(JSON.stringify(remote.tree)));
    store.settings = mergeSettings(remote.settings);
    store.sharedName = String(remote.name || '').slice(0, 80);
    if (!store.tree.people[store.selectedId]) store.selectedId = store.tree.rootId;
    emit();
    window.dispatchEvent(new CustomEvent('ft:treename'));
  };

  FT.pushHistory = function (snapshot) {
    store.history.push(snapshot || JSON.stringify(store.tree));
    if (store.history.length > 100) store.history.shift();
    store.future = [];
  };

  FT.mutate = function (fn) {
    if (FT.readOnly) return;
    const before = JSON.stringify(store.tree);
    fn(store.tree);
    collectDirectory(store.tree);
    if (JSON.stringify(store.tree) === before) return;
    FT.pushHistory(before);
    FT.save();
    emit();
  };

  FT.setSettings = function (patch) {
    Object.assign(store.settings, patch);
    FT.save();
    emit();
  };

  FT.undo = function () {
    if (FT.readOnly || !store.history.length) return;
    store.future.push(JSON.stringify(store.tree));
    store.tree = JSON.parse(store.history.pop());
    afterRestore();
  };
  FT.redo = function () {
    if (FT.readOnly || !store.future.length) return;
    store.history.push(JSON.stringify(store.tree));
    store.tree = JSON.parse(store.future.pop());
    afterRestore();
  };
  function afterRestore() {
    if (!store.tree.people[store.selectedId]) store.selectedId = store.tree.rootId;
    FT.save();
    emit();
  }

  FT.replaceTree = function (tree) {
    if (FT.readOnly) return;
    const next = normalizeTree(tree);
    FT.pushHistory();
    store.tree = next;
    store.selectedId = store.tree.rootId;
    FT.save();
    emit();
  };

  FT.select = function (id) {
    if (!store.tree.people[id]) return;
    store.selectedId = id;
    emit();
  };

  // ---- several trees -----------------------------------------------------
  FT.newTreeId = () => 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  FT.blankTree = function (firstName) {
    const me = blank('me', clean(firstName) || 'Me', '');
    return { rootId: 'me', seq: 1, people: { me }, directory: [] };
  };

  // Person + partners + everyone descended from them (with their partners).
  // Anyone's ancestors, and the parents of those partners, are left out.
  function subtreeIds(t, id) {
    const kids = {};
    Object.values(t.people).forEach((p) => p.parentIds.forEach((x) => (kids[x] = (kids[x] || []).concat(p.id))));
    const descendants = new Set([id]);
    const stack = [id];
    while (stack.length) (kids[stack.pop()] || []).forEach((k) => { if (!descendants.has(k)) { descendants.add(k); stack.push(k); } });
    const keep = new Set(descendants);
    descendants.forEach((d) => {
      const p = t.people[d];
      p.partnerIds.forEach((q) => keep.add(q));
      if (d !== id) p.parentIds.forEach((q) => keep.add(q)); // the other parent of a child
    });
    return { keep, descendants };
  }
  FT.subtreeCount = (id) => {
    const t = store.tree;
    const { keep, descendants } = subtreeIds(t, id);
    return { total: keep.size, descendants: descendants.size - 1, partners: keep.size - descendants.size };
  };
  FT.buildSubtree = function (id) {
    const t = JSON.parse(JSON.stringify(store.tree));
    if (!t.people[id]) return null;
    const { keep, descendants } = subtreeIds(t, id);
    const people = {};
    keep.forEach((pid) => {
      const p = t.people[pid];
      p.parentIds = pid !== id && descendants.has(pid) ? p.parentIds.filter((x) => keep.has(x)) : [];
      p.partnerIds = p.partnerIds.filter((x) => keep.has(x));
      people[pid] = p;
    });
    return { rootId: id, seq: t.seq, people, directory: [] };
  };

  // Saves a new tree in this browser under its own keys; the caller uploads it and opens it.
  FT.stageTree = function (id, name, tree, givenSettings) {
    const s = mergeSettings(givenSettings || store.settings);
    if (!givenSettings) {
      s.collapsed = [];
      s.collapsedUp = [];
      s.manual = false;
      s.parts = { ancestors: true, siblings: true, descendants: true };
    }
    const t = normalizeTree(tree);
    localStorage.setItem(keyOf(id), JSON.stringify(t));
    localStorage.setItem(settingsKeyOf(id), JSON.stringify(s));
    FT.setTreeName(id, name);
    return { tree: t, settings: s, name: FT.treeName(id) };
  };

  // Keeps this browser's copy of a tree in step with the server before it is opened.
  // A copy holding changes the server has not seen yet is left alone.
  FT.cacheTree = function (id, remote) {
    if (lsGet(FT.dirtyKey(id)) === '1') return;
    try {
      localStorage.setItem(keyOf(id), JSON.stringify(normalizeTree(JSON.parse(JSON.stringify(remote.tree)))));
      localStorage.setItem(settingsKeyOf(id), JSON.stringify(mergeSettings(remote.settings)));
      if (remote.name) FT.setTreeName(id, remote.name);
    } catch (e) { /* storage full: the server copy is pulled in when the tree opens */ }
  };

  // Makes another tree the one this browser shows (reloads the page so everything starts clean).
  FT.switchTo = function (id) {
    try {
      localStorage.setItem(ACTIVE_KEY, id);
      const v = JSON.parse(localStorage.getItem('ftb.viewstate') || '{}');
      v.center = null;
      localStorage.setItem('ftb.viewstate', JSON.stringify(v));
    } catch (e) { /* ignore */ }
    location.reload();
  };

  // ---- tree operations -------------------------------------------------
  const newId = (t) => {
    let id;
    do { id = 'p' + t.seq++; } while (t.people[id]);
    return id;
  };
  const opposite = (g) => (g === 'male' ? 'female' : g === 'female' ? 'male' : '');
  const link = (a, b) => {
    if (!a.partnerIds.includes(b.id)) a.partnerIds.push(b.id);
    if (!b.partnerIds.includes(a.id)) b.partnerIds.push(a.id);
  };
  const label = (p) => (p.name && p.name.trim()) || 'Unnamed';

  function ensureParents(t, child) {
    if (child.parentIds.length) return null;
    const f = blank(newId(t), label(child) + "'s Father", 'male');
    const m = blank(newId(t), label(child) + "'s Mother", 'female');
    t.people[f.id] = f;
    t.people[m.id] = m;
    link(f, m);
    child.parentIds = [f.id, m.id];
    return m.id;
  }

  FT.addParents = function (id) {
    let made;
    FT.mutate((t) => { made = ensureParents(t, t.people[id]); });
    if (made) FT.select(made);
  };

  FT.addSibling = function (id) {
    let created;
    FT.mutate((t) => {
      const p = t.people[id];
      ensureParents(t, p);
      const s = blank(newId(t), 'New sibling', '');
      s.parentIds = p.parentIds.slice();
      t.people[s.id] = s;
      created = s.id;
    });
    if (created) FT.select(created);
  };

  FT.addPartner = function (id) {
    let created;
    FT.mutate((t) => {
      const p = t.people[id];
      const q = blank(newId(t), 'New partner', opposite(p.gender));
      t.people[q.id] = q;
      link(p, q);
      created = q.id;
    });
    if (created) FT.select(created);
  };

  // partnerId falsy => child of this person alone
  FT.addChild = function (id, partnerId) {
    let created;
    FT.mutate((t) => {
      const c = blank(newId(t), 'New child', '');
      c.parentIds = partnerId && t.people[partnerId] ? [id, partnerId] : [id];
      t.people[c.id] = c;
      created = c.id;
    });
    if (created) FT.select(created);
  };

  function connectedFromRoot(t) {
    const seen = new Set([t.rootId]);
    const queue = [t.rootId];
    const kids = {};
    Object.values(t.people).forEach((p) => p.parentIds.forEach((pid) => (kids[pid] = (kids[pid] || []).concat(p.id))));
    while (queue.length) {
      const p = t.people[queue.pop()];
      [...p.parentIds, ...p.partnerIds, ...(kids[p.id] || [])].forEach((id) => {
        if (t.people[id] && !seen.has(id)) { seen.add(id); queue.push(id); }
      });
    }
    return seen;
  }

  // ---- relationships between existing members ---------------------------
  const descendantsOf = (t, id) => {
    const kids = {};
    Object.values(t.people).forEach((p) => p.parentIds.forEach((x) => (kids[x] = (kids[x] || []).concat(p.id))));
    const out = new Set();
    const stack = [id];
    while (stack.length) (kids[stack.pop()] || []).forEach((k) => { if (!out.has(k)) { out.add(k); stack.push(k); } });
    return out;
  };
  const name = (p) => FT.fullName(p);

  // type: 'parent' (other is a parent of id) | 'child' | 'partner' | 'sibling'. Returns an error message or null.
  function applyLink(t, id, otherId, type) {
    const s = t.people[id];
    const o = t.people[otherId];
    if (!s || !o) return 'Choose a family member to link.';
    if (id === otherId) return 'A person cannot be related to themselves.';
    const addParent = (child, parent) => {
      if (child.parentIds.includes(parent.id)) return `${name(parent)} is already a parent of ${name(child)}.`;
      if (child.parentIds.length >= 2) return `${name(child)} already has two parents. Unlink one first.`;
      if (descendantsOf(t, child.id).has(parent.id) || parent.id === child.id) return `${name(parent)} is a descendant of ${name(child)}, so cannot also be a parent.`;
      const existing = t.people[child.parentIds[0]];
      child.parentIds.push(parent.id);
      if (existing) link(existing, parent);
      return null;
    };
    switch (type) {
      case 'parent': return addParent(s, o);
      case 'child': return addParent(o, s);
      case 'partner':
        if (s.partnerIds.includes(o.id)) return `${name(s)} and ${name(o)} are already partners.`;
        if (s.parentIds.includes(o.id) || o.parentIds.includes(s.id)) return 'A parent and child cannot be partners.';
        if (s.parentIds.some((x) => o.parentIds.includes(x))) return 'Siblings cannot be partners.';
        link(s, o);
        return null;
      case 'sibling': {
        const shared = s.parentIds.some((x) => o.parentIds.includes(x));
        if (shared) return `${name(s)} and ${name(o)} already share a parent.`;
        if (descendantsOf(t, s.id).has(o.id) || descendantsOf(t, o.id).has(s.id)) return 'A person cannot be a sibling of their own descendant.';
        if (s.partnerIds.includes(o.id)) return 'Partners cannot be siblings.';
        if (!s.parentIds.length && !o.parentIds.length) return 'Neither person has parents yet. Use "Add parents" on one of them first.';
        if (s.parentIds.length && o.parentIds.length) return `Both already have different parents. Unlink ${name(o)}'s parents first, then link as siblings.`;
        const [from, to] = s.parentIds.length ? [s, o] : [o, s];
        to.parentIds = from.parentIds.slice();
        return null;
      }
    }
    return 'Unknown relationship type.';
  }

  FT.linkRelation = function (id, otherId, type) {
    const trial = JSON.parse(JSON.stringify(store.tree));
    const err = applyLink(trial, id, otherId, type);
    if (err) return err;
    FT.mutate((t) => applyLink(t, id, otherId, type));
    return null;
  };

  function applyUnlink(t, id, otherId, kind) {
    const s = t.people[id];
    const o = t.people[otherId];
    if (kind === 'parent') s.parentIds = s.parentIds.filter((x) => x !== otherId);
    else if (kind === 'child') o.parentIds = o.parentIds.filter((x) => x !== id);
    else if (kind === 'partner') {
      s.partnerIds = s.partnerIds.filter((x) => x !== otherId);
      o.partnerIds = o.partnerIds.filter((x) => x !== id);
    }
    const keep = connectedFromRoot(t);
    Object.keys(t.people).forEach((k) => { if (!keep.has(k)) delete t.people[k]; });
  }

  // How many people would disappear (they would no longer connect to the main person).
  FT.previewUnlink = function (id, otherId, kind) {
    const trial = JSON.parse(JSON.stringify(store.tree));
    applyUnlink(trial, id, otherId, kind);
    return Object.keys(store.tree.people).length - Object.keys(trial.people).length;
  };

  FT.unlinkRelation = function (id, otherId, kind) {
    FT.mutate((t) => applyUnlink(t, id, otherId, kind));
    if (!store.tree.people[store.selectedId]) store.selectedId = store.tree.rootId;
    emit();
  };

  function removeInto(t, id) {
    delete t.people[id];
    Object.values(t.people).forEach((p) => {
      p.parentIds = p.parentIds.filter((x) => x !== id);
      p.partnerIds = p.partnerIds.filter((x) => x !== id);
    });
    const keep = connectedFromRoot(t);
    Object.keys(t.people).forEach((k) => { if (!keep.has(k)) delete t.people[k]; });
  }

  // How many people (including this one) would disappear on delete.
  FT.previewDelete = function (id) {
    const t = JSON.parse(JSON.stringify(store.tree));
    removeInto(t, id);
    return Object.keys(store.tree.people).length - Object.keys(t.people).length;
  };

  FT.deletePerson = function (id) {
    FT.mutate((t) => {
      if (id !== t.rootId) removeInto(t, id);
    });
    if (!store.tree.people[store.selectedId]) store.selectedId = store.tree.rootId;
    emit();
  };

  FT.updatePerson = function (id, fields) {
    FT.mutate((t) => Object.assign(t.people[id], fields));
  };

  FT.setMainPerson = function (id) {
    FT.mutate((t) => { if (t.people[id]) t.rootId = id; });
  };

  FT.resetTree = function () {
    if (FT.readOnly) return;
    FT.pushHistory();
    store.tree = normalizeTree(usesSeed() ? FT.defaultTree() : FT.blankTree());
    store.selectedId = store.tree.rootId;
    FT.save();
    emit();
  };

  // ---- display helpers -------------------------------------------------
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  FT.formatDate = function (iso, fmt) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return '';
    const [, y, mo, d] = m;
    switch (fmt) {
      case 'MM/DD/YYYY': return `${mo}/${d}/${y}`;
      case 'YYYY-MM-DD': return `${y}-${mo}-${d}`;
      case 'D MMM YYYY': return `${+d} ${MONTHS[+mo - 1]} ${y}`;
      case 'YYYY': return y;
      default: return `${d}/${mo}/${y}`;
    }
  };

  FT.fullName = function (p) {
    let n = (p.name || '').trim();
    if (p.surnameNow) n += ' ' + p.surnameNow.trim();
    if (p.surnameBirth && p.surnameBirth !== p.surnameNow) n += ` (${p.surnameBirth.trim()})`;
    return n.trim() || 'Unnamed';
  };

  // People visible under the "tree parts" settings and collapsed branches, kept only if still
  // connected to the main person. Also records how many people each collapsed branch hides.
  FT.collapseInfo = {};
  FT.childCount = {};
  FT.visiblePeople = function () {
    const { tree, settings } = store;
    const people = tree.people;
    const root = people[tree.rootId];
    const baseHidden = new Set();
    const kids = {};
    Object.values(people).forEach((p) => p.parentIds.forEach((pid) => (kids[pid] = (kids[pid] || []).concat(p.id))));
    const walk = (start, next) => {
      const out = new Set();
      const stack = [start];
      while (stack.length) {
        next(stack.pop()).forEach((n) => { if (people[n] && !out.has(n)) { out.add(n); stack.push(n); } });
      }
      return out;
    };
    if (!settings.parts.ancestors) walk(root.id, (id) => people[id].parentIds).forEach((i) => baseHidden.add(i));
    if (!settings.parts.descendants) walk(root.id, (id) => kids[id] || []).forEach((i) => baseHidden.add(i));
    if (!settings.parts.siblings && root.parentIds.length) {
      Object.values(people).forEach((p) => {
        if (p.id !== root.id && p.parentIds.some((x) => root.parentIds.includes(x))) baseHidden.add(p.id);
      });
    }
    baseHidden.delete(root.id);

    const reach = (hidden) => {
      const seen = new Set([root.id]);
      const stack = [root.id];
      while (stack.length) {
        const p = people[stack.pop()];
        [...p.parentIds, ...p.partnerIds, ...(kids[p.id] || [])].forEach((id) => {
          if (people[id] && !hidden.has(id) && !seen.has(id)) { seen.add(id); stack.push(id); }
        });
      }
      return seen;
    };

    // collapsed branches hide everything below that person, except the main person's own line
    const keep = new Set([root.id, ...walk(root.id, (id) => people[id].parentIds), ...walk(root.id, (id) => kids[id] || [])]);
    const collapsed = (settings.collapsed || []).filter((id) => people[id]);
    const hidden = new Set(baseHidden);
    const below = {};
    collapsed.forEach((c) => {
      below[c] = walk(c, (id) => kids[id] || []);
      below[c].forEach((d) => { if (!keep.has(d)) hidden.add(d); });
    });

    // fold-up: hide a person's ancestors and the family lines that hang only from them
    const reachCut = (hid, cut) => {
      const seenSet = new Set([root.id]);
      const stack = [root.id];
      while (stack.length) {
        const id = stack.pop();
        const p = people[id];
        [...(id === cut ? [] : p.parentIds), ...p.partnerIds, ...(kids[id] || []).filter((k) => k !== cut)].forEach((n) => {
          if (people[n] && !hid.has(n) && !seenSet.has(n)) { seenSet.add(n); stack.push(n); }
        });
      }
      return seenSet;
    };
    const collapsedUp = (settings.collapsedUp || []).filter((id) => people[id]);
    const upHidden = {};
    collapsedUp.forEach((c) => {
      const r0 = reachCut(hidden, c);
      upHidden[c] = new Set([...walk(c, (id) => people[id].parentIds)].filter((a) => !r0.has(a)));
    });
    const hiddenAll = new Set(hidden);
    collapsedUp.forEach((c) => upHidden[c].forEach((a) => hiddenAll.add(a)));
    hiddenAll.delete(root.id);

    const seen = reach(hiddenAll);
    const baseSeen = collapsed.length ? reach(baseHidden) : seen;
    FT.collapseInfo = {};
    collapsed.forEach((c) => {
      FT.collapseInfo[c] = [...below[c]].filter((d) => baseSeen.has(d) && !seen.has(d)).length;
    });
    FT.childCount = {};
    Object.keys(kids).forEach((k) => { FT.childCount[k] = kids[k].length; });

    // who gets an "ancestors" badge, and how many people each folded one hides
    FT.upInfo = {};
    const seenNoUp = collapsedUp.length ? reach(hidden) : seen;
    seen.forEach((id) => {
      const p = people[id];
      if (!p.parentIds.length) return;
      const folded = collapsedUp.includes(id);
      if (!folded && !reachCut(hidden, id).has(id)) return; // this person hangs from their parents: nothing sensible to fold
      let n = 0;
      if (folded) {
        const h2 = new Set(hidden);
        upHidden[id].forEach((a) => h2.add(a));
        h2.delete(root.id);
        const after = reach(h2);
        n = [...seenNoUp].filter((x) => !after.has(x)).length;
      }
      FT.upInfo[id] = { folded, hidden: n };
    });
    return Object.values(people).filter((p) => seen.has(p.id));
  };

  // Fold / unfold the ancestors above a person.
  FT.setAncestors = function (id, collapse, deep) {
    if (!store.tree.people[id]) return;
    const cur = new Set(store.settings.collapsedUp || []);
    if (collapse) cur.add(id);
    else {
      cur.delete(id);
      if (deep) {
        // unfold every ancestor line above as well
        const st = [id];
        const seenIds = new Set();
        while (st.length) {
          const x = st.pop();
          store.tree.people[x].parentIds.forEach((a) => { if (store.tree.people[a] && !seenIds.has(a)) { seenIds.add(a); cur.delete(a); st.push(a); } });
        }
      }
    }
    FT.setSettings({ collapsedUp: [...cur] });
  };
  FT.toggleAncestors = (id) => FT.setAncestors(id, !(store.settings.collapsedUp || []).includes(id));

  // Fold / unfold the branch below a person (and below the partners they share children with).
  // deep = also fold / unfold every branch further down.
  FT.setBranch = function (id, collapse, deep) {
    const people = store.tree.people;
    const p = people[id];
    if (!p) return;
    const kids = {};
    Object.values(people).forEach((c) => c.parentIds.forEach((x) => (kids[x] = (kids[x] || []).concat(c.id))));
    const group = [id, ...p.partnerIds.filter((q) => (kids[id] || []).some((c) => people[c].parentIds.includes(q)))];
    const below = new Set();
    if (deep) {
      const stack = group.slice();
      while (stack.length) {
        (kids[stack.pop()] || []).forEach((c) => {
          if (below.has(c)) return;
          below.add(c);
          stack.push(c, ...people[c].partnerIds);
        });
      }
    }
    const cur = new Set(store.settings.collapsed || []);
    if (collapse) {
      group.forEach((g) => cur.add(g));
      below.forEach((d) => { if (kids[d]) cur.add(d); });
    } else {
      group.forEach((g) => cur.delete(g));
      below.forEach((d) => cur.delete(d));
    }
    FT.setSettings({ collapsed: [...cur] });
  };
  FT.toggleBranch = (id, deep) => FT.setBranch(id, !(store.settings.collapsed || []).includes(id), deep);

  // Show the main person's own line in full (ancestors, partners, descendants) and fold every other branch.
  FT.focusMode = function () {
    const people = store.tree.people;
    const root = people[store.tree.rootId];
    const kids = {};
    Object.values(people).forEach((p) => p.parentIds.forEach((pid) => (kids[pid] = (kids[pid] || []).concat(p.id))));
    const walk = (start, next) => {
      const out = new Set();
      const stack = [start];
      while (stack.length) next(stack.pop()).forEach((n) => { if (people[n] && !out.has(n)) { out.add(n); stack.push(n); } });
      return out;
    };
    const line = new Set([root.id, ...walk(root.id, (id) => people[id].parentIds), ...walk(root.id, (id) => kids[id] || [])]);
    [...line].forEach((id) => people[id].partnerIds.forEach((q) => line.add(q)));
    FT.setSettings({ collapsed: Object.keys(people).filter((id) => kids[id] && !line.has(id)) });
  };

  FT.showEveryone = () => FT.setSettings({ collapsed: [], collapsedUp: [] });

  // Make sure a person can be seen: unfold the branches above them and, if needed, show all tree parts.
  // Returns true when something had to be changed.
  FT.revealPerson = function (id) {
    const people = store.tree.people;
    if (!people[id]) return false;
    const isVisible = () => FT.visiblePeople().some((p) => p.id === id);
    if (isVisible()) return false;
    const keep = new Set();
    const stack = [id, ...people[id].partnerIds];
    while (stack.length) {
      const c = stack.pop();
      if (keep.has(c) || !people[c]) continue;
      keep.add(c);
      people[c].parentIds.forEach((x) => stack.push(x));
      people[c].partnerIds.forEach((x) => stack.push(x));
    }
    const collapsed = (store.settings.collapsed || []).filter((c) => !keep.has(c));
    const patch = { collapsed };
    const before = store.settings.collapsed;
    const beforeUp = store.settings.collapsedUp;
    // also unfold any "ancestors" fold that hides this person's family line
    const upKeep = new Set(keep);
    const collapsedUp = (store.settings.collapsedUp || []).filter((c) => {
      const up = new Set();
      const st = [c];
      while (st.length) (people[st.pop()].parentIds || []).forEach((x) => { if (people[x] && !up.has(x)) { up.add(x); st.push(x); } });
      return ![...up].some((a) => upKeep.has(a));
    });
    patch.collapsedUp = collapsedUp;
    store.settings.collapsed = collapsed;
    store.settings.collapsedUp = collapsedUp;
    if (!isVisible()) patch.parts = { ancestors: true, siblings: true, descendants: true };
    store.settings.collapsed = before;
    store.settings.collapsedUp = beforeUp;
    FT.setSettings(patch);
    return true;
  };
})();
