(function () {
  const FT = window.FT;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => FT.esc(s);

  const ICONS = {
    zoomIn: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm2.5-4h-2v2H9v-2H7V9h2V7h1v2h2v1z',
    zoomOut: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7z',
    center: 'M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-7 3H3v4c0 1.1.9 2 2 2h4v-2H5v-4zM5 5h4V3H5c-1.1 0-2 .9-2 2v4h2V5zm14-2h-4v2h4v4h2V5c0-1.1-.9-2-2-2zm0 16h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4z',
    viewMenu: 'M7 10l5 5 5-5z',
    settings: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
    manual: 'M22 11V3h-7v3H9V3H2v8h7V8h2v10h4v3h7v-8h-7v3h-2V8h2v3z',
    export: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
    share: 'M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z',
    undo: 'M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z',
    redo: 'M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z',
    reset: 'M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
    views: 'M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z',
    edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'
  };
  const icon = (n, size) => `<svg viewBox="0 0 24 24" width="${size || 20}" height="${size || 20}" aria-hidden="true"><path fill="currentColor" d="${ICONS[n]}"/></svg>`;

  const svg = $('#canvas');
  const viewport = $('#viewport');
  const panel = $('#panel');
  const view = { tx: 0, ty: 0, k: 1 };
  let scene = null;
  let panelCollapsed = false;
  let fitPending = true;
  let initialFocus = true;

  // ---- toolbar ---------------------------------------------------------
  document.querySelectorAll('.toolbar [data-act]').forEach((b) => {
    const a = b.dataset.act;
    b.innerHTML = icon(a) + (a === 'export' ? '<span>Export</span>' : a === 'share' ? '<span>Share</span>' : a === 'views' ? '<span id="viewsLabel">Family tree</span>' : '');
  });

  // ---- view ------------------------------------------------------------
  function applyView() {
    viewport.setAttribute('transform', `translate(${view.tx},${view.ty}) scale(${view.k})`);
    const g = $('#grid');
    g.setAttribute('patternTransform', `translate(${view.tx},${view.ty}) scale(${view.k})`);
  }
  function fit() {
    const r = svg.getBoundingClientRect();
    if (!scene || r.width < 10) { fitPending = true; return; }
    fitPending = false;
    const b = scene.bounds;
    const bw = b.x1 - b.x0;
    const bh = b.y1 - b.y0;
    const top = 64;
    view.k = Math.max(0.12, Math.min(1, r.width / bw, (r.height - top) / bh));
    view.tx = (r.width - bw * view.k) / 2 - b.x0 * view.k;
    view.ty = top + (r.height - top - bh * view.k) / 2 - b.y0 * view.k;
    if (initialFocus) {
      // large trees open on the starting person at a readable zoom
      initialFocus = false;
      const c = scene.pos[FT.store.tree.rootId];
      if (c && view.k < 0.6) {
        view.k = 0.6;
        view.tx = r.width / 2 - c.x * view.k;
        view.ty = top + (r.height - top) / 2 - (c.y + scene.d.ch / 2) * view.k;
      }
    }
    applyView();
  }
  function zoomAt(factor, cx, cy) {
    const k = Math.min(3, Math.max(0.1, view.k * factor));
    const f = k / view.k;
    view.tx = cx - (cx - view.tx) * f;
    view.ty = cy - (cy - view.ty) * f;
    view.k = k;
    applyView();
  }
  const zoomCentre = (f) => { const r = svg.getBoundingClientRect(); zoomAt(f, r.width / 2, r.height / 2); };
  window.addEventListener('ft:fit', () => requestAnimationFrame(fit));
  window.addEventListener('resize', () => { if (fitPending) fit(); });

  // ---- auto-adjust: smart framing -------------------------------------
  const TOP_PAD = 64;
  let anim = 0;
  function viewFor(ids, maxK) {
    const r = svg.getBoundingClientRect();
    const { pos, d } = scene;
    const list = ids.filter((i) => pos[i]);
    if (!list.length) return null;
    const pad = 40;
    const x0 = Math.min(...list.map((i) => pos[i].x - d.cw / 2)) - pad;
    const x1 = Math.max(...list.map((i) => pos[i].x + d.cw / 2)) + pad;
    const y0 = Math.min(...list.map((i) => pos[i].y)) - pad;
    const y1 = Math.max(...list.map((i) => pos[i].y + d.ch)) + pad;
    const k = Math.max(0.1, Math.min(maxK, r.width / (x1 - x0), (r.height - TOP_PAD) / (y1 - y0)));
    return {
      k,
      tx: (r.width - (x1 - x0) * k) / 2 - x0 * k,
      ty: TOP_PAD + (r.height - TOP_PAD - (y1 - y0) * k) / 2 - y0 * k
    };
  }
  function animateTo(t) {
    cancelAnimationFrame(anim);
    if (!t) return;
    const from = { tx: view.tx, ty: view.ty, k: view.k };
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / 380);
      const e = 1 - Math.pow(1 - p, 3);
      view.k = from.k + (t.k - from.k) * e;
      view.tx = from.tx + (t.tx - from.tx) * e;
      view.ty = from.ty + (t.ty - from.ty) * e;
      applyView();
      if (p < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }

  function relatives(id) {
    const people = FT.store.tree.people;
    const vis = new Set(scene.vis.map((p) => p.id));
    const kids = {};
    scene.vis.forEach((p) => p.parentIds.forEach((x) => (kids[x] = (kids[x] || []).concat(p.id))));
    const walk = (start, next) => {
      const out = new Set();
      const stack = [start];
      while (stack.length) next(stack.pop()).forEach((n) => { if (vis.has(n) && !out.has(n)) { out.add(n); stack.push(n); } });
      return out;
    };
    const p = people[id];
    const family = new Set([id, ...p.parentIds, ...p.partnerIds, ...(kids[id] || [])]);
    scene.vis.forEach((o) => { if (o.parentIds.some((x) => p.parentIds.includes(x))) family.add(o.id); });
    return {
      family: [...family].filter((i) => vis.has(i)),
      ancestors: [id, ...walk(id, (i) => people[i].parentIds)].flatMap((i) => [i, ...people[i].partnerIds.filter((q) => vis.has(q) && !people[i].parentIds.includes(q))]).filter((i) => vis.has(i)),
      descendants: [id, ...walk(id, (i) => kids[i] || [])].flatMap((i) => [i, ...people[i].partnerIds]).filter((i) => vis.has(i))
    };
  }

  const VIEW_ITEMS = [
    ['fit', 'Fit entire tree'],
    ['selected', 'Focus on selected person'],
    ['family', "Fit selected person's family"],
    ['ancestors', 'Fit ancestors of selected'],
    ['descendants', 'Fit descendants of selected'],
    ['root', 'Go to starting person'],
    ['actual', 'Actual size (100%)'],
    ['sep'],
    ['focus', 'Best view: my direct line (fold other branches)'],
    ['everyone', 'Show everyone (unfold all branches)'],
    ['unfoldSel', 'Unfold everything below selected'],
    ['foldSel', 'Fold everything below selected'],
    ['unfoldUp', 'Unfold ancestors above selected'],
    ['foldUp', 'Fold ancestors above selected'],
    ['sep'],
    ['arrange', 'Auto-arrange all cards'],
    ['autofit', 'Keep tree fitted automatically']
  ];
  function openViewMenu() {
    const menu = $('#viewMenu');
    const auto = FT.store.settings.autoFit;
    menu.innerHTML = VIEW_ITEMS.map(([k, l]) => (k === 'sep' ? '<hr>' : `<button data-view="${k}" role="menuitem">${k === 'autofit' ? (auto ? '✓ ' : '') : ''}${l}</button>`)).join('');
    menu.hidden = false;
  }
  function runView(kind) {
    const sel = FT.store.selectedId;
    const rel = relatives(sel);
    const r = svg.getBoundingClientRect();
    switch (kind) {
      case 'fit': return animateTo(viewFor(scene.vis.map((p) => p.id), 1));
      case 'selected': return animateTo(viewFor([sel], 1));
      case 'family': return animateTo(viewFor(rel.family, 1));
      case 'ancestors': return animateTo(viewFor(rel.ancestors, 1));
      case 'descendants': return animateTo(viewFor(rel.descendants, 1));
      case 'root': FT.select(FT.store.tree.rootId); return requestAnimationFrame(() => animateTo(viewFor([FT.store.tree.rootId], 1)));
      case 'actual': {
        const c = scene.pos[sel];
        return animateTo({ k: 1, tx: r.width / 2 - c.x, ty: TOP_PAD + (r.height - TOP_PAD) / 2 - (c.y + scene.d.ch / 2) });
      }
      case 'focus':
        FT.focusMode();
        return requestAnimationFrame(() => requestAnimationFrame(() => animateTo(viewFor(scene.vis.map((p) => p.id), 1))));
      case 'unfoldSel': return foldBranch(sel, true, false);
      case 'foldSel': return foldBranch(sel, true, true);
      case 'unfoldUp': return foldBranch(sel, true, false, 'up');
      case 'foldUp': return FT.upInfo[sel] ? foldBranch(sel, false, true, 'up') : undefined;
      case 'everyone':
        FT.showEveryone();
        return requestAnimationFrame(() => requestAnimationFrame(() => animateTo(viewFor(scene.vis.map((p) => p.id), 1))));
      case 'arrange':
        FT.mutate((t) => Object.values(t.people).forEach((p) => { delete p.mx; delete p.my; }));
        FT.setSettings({ manual: false });
        return requestAnimationFrame(() => requestAnimationFrame(() => animateTo(viewFor(scene.vis.map((p) => p.id), 1))));
      case 'autofit':
        FT.setSettings({ autoFit: !FT.store.settings.autoFit });
        return requestAnimationFrame(() => animateTo(viewFor(scene.vis.map((p) => p.id), 1)));
    }
  }

  // ---- rendering -------------------------------------------------------
  let rafId = 0;
  const altHost = $('#altView');
  const stageEl = $('.stage');
  const inAlt = () => FT.viewState.view !== 'tree';
  function render() {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(inAlt() ? drawAlt : draw);
  }
  // alternative views (list, outline, charts…): same data, different picture
  function drawAlt() {
    $('[data-act="undo"]').disabled = !FT.store.history.length;
    $('[data-act="redo"]').disabled = !FT.store.future.length;
    renderPanel();
    FT.views.render(altHost);
  }
  function setView(name, initial) {
    const known = FT.VIEWS.some((v) => v.id === name);
    const st = FT.viewState;
    if (!known) name = 'tree';
    if (!initial && ['anc', 'desc', 'fan'].includes(name)) st.center = FT.store.selectedId;
    st.view = name;
    st.resetScroll = true;
    FT.saveViewState();
    stageEl.dataset.view = name;
    const meta = FT.VIEWS.find((v) => v.id === name);
    const label = $('#viewsLabel');
    if (label) label.textContent = meta.name;
    altHost.hidden = name === 'tree';
    $('#viewsMenu').hidden = true;
    if (name === 'tree') {
      draw();
    } else {
      drawAlt();
    }
  }
  function openViewsMenu() {
    const menu = $('#viewsMenu');
    menu.innerHTML = FT.VIEWS.map((v) => `<button data-set-view="${v.id}" role="menuitem" aria-current="${FT.viewState.view === v.id}">
      <span class="vm-top"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="${v.icon}"/></svg>${esc(v.name)}</span><span class="vm-desc">${esc(v.desc)}</span></button>`).join('');
    menu.hidden = false;
  }
  altHost.addEventListener('click', (e) => altEvent(e, 'click'));
  altHost.addEventListener('dblclick', (e) => altEvent(e, 'dblclick'));
  altHost.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const el = e.target.closest('[data-id]');
    if (el && e.target === el) { e.preventDefault(); FT.select(el.dataset.id); }
  });
  altHost.addEventListener('input', (e) => {
    if (e.target.id === 'listFilter') {
      FT.viewState.filter = e.target.value;
      FT.saveViewState();
      const pos = e.target.selectionStart;
      FT.views.render(altHost);
      const f = $('#listFilter');
      f.focus();
      f.setSelectionRange(pos, pos);
    }
  });
  function altEvent(e, kind) {
    const out = FT.views.handle(altHost, e, kind);
    if (out === 'render') FT.views.render(altHost);
    else if (out && out.showInTree) showInTree(out.showInTree);
  }
  function showInTree(id) {
    FT.revealPerson(id);
    FT.select(id);
    setView('tree');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!scene || !scene.pos[id]) return;
      const r = svg.getBoundingClientRect();
      const c = scene.pos[id];
      const k = Math.max(view.k, 0.9);
      animateTo({ k, tx: r.width / 2 - c.x * k, ty: TOP_PAD + (r.height - TOP_PAD) / 2 - (c.y + scene.d.ch / 2) * k });
      const g = viewport.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
      if (g) { g.classList.add('found'); setTimeout(() => g.classList.remove('found'), 3400); }
    }));
  }
  // A fold/unfold in progress: keeps the clicked card where it is on screen and slides the rest.
  let fold = null;
  let lastPos = {};
  function draw() {
    const { settings } = FT.store;
    const oldView = { tx: view.tx, ty: view.ty, k: view.k };
    scene = FT.scene();
    viewport.innerHTML = FT.sceneMarkup(scene, false);
    svg.classList.toggle('manual', settings.manual);
    $('[data-act="manual"]').setAttribute('aria-pressed', String(settings.manual));
    $('[data-act="undo"]').disabled = !FT.store.history.length;
    $('[data-act="redo"]').disabled = !FT.store.future.length;
    renderPanel();
    // make hidden people obvious: folded branches or hidden tree parts
    const total = Object.keys(FT.store.tree.people).length;
    const chip = $('#hiddenChip');
    chip.hidden = scene.vis.length >= total;
    if (!chip.hidden) chip.textContent = `Showing ${scene.vis.length} of ${total} people · Show everyone`;

    if (fold && scene.pos[fold.id]) {
      keepAnchor(fold);
      slideCards(lastPos, oldView);
    }
    fold = null;
    lastPos = {};
    Object.keys(scene.pos).forEach((id) => { lastPos[id] = { x: scene.pos[id].x, y: scene.pos[id].y }; });
    applyHighlight();

    // "keep fitted" reacts to adding / removing people and card size, never to folding branches
    const sig = total + settings.style + settings.fontSize + (settings.manual ? 'm' : '');
    const changed = sig !== lastSig;
    lastSig = sig;
    if (fitPending) fit();
    else if (settings.autoFit && changed) animateTo(viewFor(scene.vis.map((p) => p.id), 1));
  }
  let lastSig = '';
  FT.onChange(render);

  // After a fold/unfold the zoom stays exactly as it was and the clicked card stays under the cursor.
  // When a branch opens, pan just enough to bring the people it revealed into view.
  function keepAnchor(f) {
    cancelAnimationFrame(anim);
    const np = scene.pos[f.id];
    view.tx = f.screen.x - np.x * view.k;
    view.ty = f.screen.y - np.y * view.k;
    if (f.open) {
      const r = svg.getBoundingClientRect();
      const { d, vis } = scene;
      const me = FT.store.tree.people[f.id];
      const related = f.up
        ? vis.filter((p) => me.parentIds.includes(p.id))
        : vis.filter((p) => p.parentIds.includes(f.id) || me.partnerIds.some((q) => p.parentIds.includes(q)));
      const ids = [f.id, ...related.map((p) => p.id)].filter((i) => scene.pos[i]);
      const pad = 28;
      const top = TOP_PAD + 8;
      const sx = (x) => x * view.k + view.tx;
      const sy = (y) => y * view.k + view.ty;
      const minX = Math.min(...ids.map((i) => sx(scene.pos[i].x - d.cw / 2)));
      const maxX = Math.max(...ids.map((i) => sx(scene.pos[i].x + d.cw / 2)));
      const minY = Math.min(...ids.map((i) => sy(scene.pos[i].y)));
      const maxY = Math.max(...ids.map((i) => sy(scene.pos[i].y + d.ch)));
      let dx = 0;
      let dy = 0;
      if (maxX - minX <= r.width - 2 * pad) {
        if (minX < pad) dx = pad - minX;
        else if (maxX > r.width - pad) dx = r.width - pad - maxX;
      }
      if (f.up) {
        // ancestors opened above: pan down just enough, keeping the clicked card on screen
        if (minY < top) dy = Math.min(top - minY, Math.max(0, r.height - pad - sy(np.y + d.ch)));
      } else if (maxY > r.height - pad) {
        const parentTop = sy(np.y);
        dy = -Math.min(maxY - (r.height - pad), Math.max(0, parentTop - top));
      }
      view.tx += dx;
      view.ty += dy;
    }
    applyView();
  }

  // Cards that moved glide from their old on-screen spot; new cards and the lines fade in.
  function slideCards(prev, oldView) {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const dx = (oldView.tx - view.tx) / view.k;
    const dy = (oldView.ty - view.ty) / view.k;
    const hw = scene.d.cw / 2;
    const cards = [...viewport.querySelectorAll('.card')];
    const plan = [];
    cards.forEach((g) => {
      const id = g.dataset.id;
      const np = scene.pos[id];
      const op = prev[id];
      if (op) {
        const ox = op.x + dx;
        const oy = op.y + dy;
        if (Math.abs(ox - np.x) > 1 || Math.abs(oy - np.y) > 1) {
          g.style.transition = 'none';
          g.style.transform = `translate(${ox - hw}px, ${oy}px)`;
          plan.push([g, 'move', np.x - hw, np.y]);
        }
      } else {
        g.style.opacity = 0;
        plan.push([g, 'fade']);
      }
    });
    const edges = viewport.querySelector('.edges');
    edges.style.opacity = 0;
    void viewport.getBoundingClientRect();
    requestAnimationFrame(() => {
      plan.forEach(([g, kind, x, y]) => {
        if (kind === 'move') {
          g.style.transition = 'transform .4s cubic-bezier(.2,.8,.2,1)';
          g.style.transform = `translate(${x}px, ${y}px)`;
        } else {
          g.style.transition = 'opacity .35s ease .1s';
          g.style.opacity = 1;
        }
      });
      edges.style.transition = 'opacity .35s ease .2s';
      edges.style.opacity = 1;
    });
  }

  function foldBranch(id, deep, force, dir) {
    if (!scene || !scene.pos[id]) return;
    const up = dir === 'up';
    const list = (up ? FT.store.settings.collapsedUp : FT.store.settings.collapsed) || [];
    const open = force === undefined ? list.includes(id) : !force;
    const c = scene.pos[id];
    fold = { id, open, up, screen: { x: c.x * view.k + view.tx, y: c.y * view.k + view.ty } };
    if (up) FT.setAncestors(id, force === undefined ? !open : force, deep);
    else if (force === undefined) FT.toggleBranch(id, deep);
    else FT.setBranch(id, force, deep);
  }
  const GENDER = { male: 'Male', female: 'Female', other: 'Other', '': '' };
  function renderPanel() {
    const p = FT.store.tree.people[FT.store.selectedId];
    const fmt = FT.store.settings.dateFormat;
    const row = (k, v) => `<tr><th scope="row">${k}</th><td>${v ? esc(v) : ''}</td></tr>`;
    const root = FT.store.tree.people[FT.store.tree.rootId];
    const rel = FT.kinship()[p.id];
    const relRow = rel && !rel.self
      ? `<tr class="rel-row"><th scope="row">Relation to ${esc(root.name)}</th><td><strong>${esc(rel.mr)}</strong> <span class="muted">(${esc(rel.tr)})</span>${rel.side ? `<br><span class="muted">${esc(rel.side)}</span>` : ''}<br><small class="muted">${esc(rel.en)}</small></td></tr>`
      : '';
    const body = `<table aria-label="person details table">${relRow}${row("Person's Name", p.name)}${row('Surname Now', p.surnameNow)}${row('Surname at Birth', p.surnameBirth)}${row('Gender', GENDER[p.gender])}${row('Date of Birth', FT.formatDate(p.dob, fmt))}${row('Date of Death', FT.formatDate(p.dod, fmt))}${row('Residential City', p.city)}</table>`;
    const isRoot = p.id === FT.store.tree.rootId;
    panel.className = 'panel' + (panelCollapsed ? ' collapsed' : '');
    panel.innerHTML = `
      <button class="collapse" data-a="collapse" aria-label="${panelCollapsed ? 'Expand' : 'Collapse'} person details"><svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg></button>
      <div class="panel-body">
        <h2 class="panel-title">Personal details</h2>
        <div class="tabpanel">${isRoot ? '<div class="main-chip">★ Main person · the tree starts here</div>' : ''}${body}</div>
        <div class="actions">
          ${FT.readOnly ? (inAlt() ? '<button class="btn" data-a="intree">Show in tree</button>' : '') : `
          <button class="btn primary" data-a="edit">${icon('edit', 18)} Edit person</button>
          <button class="btn" data-a="parents" ${p.parentIds.length ? 'disabled' : ''}>Add parents</button>
          <button class="btn" data-a="sibling">Add sibling</button>
          <button class="btn" data-a="partner">Add partner</button>
          <button class="btn" data-a="child">Add child</button>
          <button class="btn" data-a="link">Link relative</button>
          ${inAlt() ? '<button class="btn" data-a="intree">Show in tree</button>' : ''}
          <button class="btn" data-a="main" ${isRoot ? 'disabled' : ''}>Make main person</button>
          <button class="btn" data-a="subtree" title="Start a separate tree from this person: they, their partners and all their descendants">New tree from this person</button>
          <button class="btn danger" data-a="delete" ${isRoot ? 'disabled title="The starting person cannot be deleted"' : ''}>Delete person</button>`}
        </div>
      </div>`;
  }

  // ---- panel actions ---------------------------------------------------
  panel.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-a]');
    if (!t || t.disabled) return;
    if (FT.readOnly && t.dataset.a !== 'collapse' && t.dataset.a !== 'intree') return;
    const id = FT.store.selectedId;
    switch (t.dataset.a) {
      case 'collapse': panelCollapsed = !panelCollapsed; renderPanel(); return setTimeout(() => { if (!scene) return; fit(); }, 60);
      case 'edit': return openEdit(id);
      case 'link': return openLink(id);
      case 'parents': FT.addParents(id); return revealSoon();
      case 'sibling': FT.addSibling(id); return revealSoon();
      case 'partner': FT.addPartner(id); return revealSoon();
      case 'child': {
        const p = FT.store.tree.people[id];
        const partners = p.partnerIds.map((q) => FT.store.tree.people[q]).filter(Boolean);
        let partnerId = partners[0] && partners[0].id;
        if (partners.length > 1) {
          partnerId = await choose('Who is the other parent?', partners.map((q) => ({ value: q.id, label: FT.fullName(q) })).concat([{ value: '__none', label: 'Not specified' }]));
          if (partnerId === '') return;
          if (partnerId === '__none') partnerId = null;
        }
        FT.addChild(id, partnerId);
        return revealSoon();
      }
      case 'delete': {
        const p = FT.store.tree.people[id];
        const n = FT.previewDelete(id);
        const extra = n > 1 ? `\n\n${n - 1} relative${n > 2 ? 's' : ''} connected only through this person will also be removed.` : '';
        if (confirm(`Delete ${FT.fullName(p)}?${extra}`)) { FT.deletePerson(id); revealSoon(); }
        return;
      }
      case 'main': return FT.setMainPerson(id);
      case 'subtree': return openNewTree({ fromPerson: id });
      case 'intree': return showInTree(id);
    }
  });
  // after adding/linking/deleting: centre on the selected person and zoom in on them (never zoom out)
  function focusSelected() {
    if (!scene || inAlt()) return;
    const sel = FT.store.selectedId;
    if (!scene.pos[sel]) return;
    const k = Math.max(view.k, 1);
    const r = svg.getBoundingClientRect();
    const c = scene.pos[sel];
    animateTo({ k, tx: r.width / 2 - c.x * k, ty: TOP_PAD + (r.height - TOP_PAD) / 2 - (c.y + scene.d.ch / 2) * k });
  }
  const revealSoon = () => requestAnimationFrame(() => requestAnimationFrame(focusSelected));
  const fitSoon = () => requestAnimationFrame(() => requestAnimationFrame(() => runView('fit')));

  function readImage(file) {
    return new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const S = 240;
          const c = document.createElement('canvas');
          c.width = c.height = S;
          const side = Math.min(img.width, img.height);
          c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S);
          resolve(c.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = () => alert('That file could not be read as an image.');
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  // ---- dialogs ---------------------------------------------------------
  // ---- modern type-ahead dropdown for name / surname / city -------------------
  // The popup is a child of the dialog (top layer) and is positioned from the input.
  function attachSuggest(host, els, onPick) {
    host.querySelectorAll('.combo-pop').forEach((x) => x.remove());
    const FIELD = { name: 'name', surname: 'surname', city: 'city' };
    const mark = (text, q) => {
      const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
      return i < 0 ? esc(text) : `${esc(text.slice(0, i))}<mark>${esc(text.slice(i, i + q.length))}</mark>${esc(text.slice(i + q.length))}`;
    };
    // each box only suggests values for its own field
    const itemsFor = (key) => {
      const q = els[key].value.trim().toLowerCase();
      const cur = els[key].value.trim().toLowerCase();
      return FT.directoryValues(FIELD[key])
        .filter((v) => (!q || v.value.toLowerCase().includes(q)) && v.value.toLowerCase() !== cur)
        .sort((a, b) => (b.value.toLowerCase().startsWith(q) - a.value.toLowerCase().startsWith(q)) || a.value.localeCompare(b.value))
        .slice(0, 8)
        .map((v) => ({
          icon: key === 'city' ? '📍' : esc(v.value[0].toUpperCase()),
          title: mark(v.value, els[key].value.trim()),
          sub: `${v.count} ${v.count === 1 ? 'entry' : 'entries'} in list`,
          value: v.value
        }));
    };
    Object.keys(els).forEach((key) => {
      const input = els[key];
      const pop = document.createElement('div');
      pop.className = 'combo-pop';
      pop.hidden = true;
      pop.setAttribute('role', 'listbox');
      host.appendChild(pop);
      let items = [];
      let active = -1;
      const close = () => { pop.hidden = true; active = -1; };
      const place = () => {
        const r = input.getBoundingClientRect();
        const below = innerHeight - r.bottom - 12;
        const above = r.top - 12;
        const up = below < 170 && above > below;
        pop.style.left = r.left + 'px';
        pop.style.width = Math.max(r.width, 220) + 'px';
        pop.style.maxHeight = Math.max(110, Math.min(290, up ? above : below)) + 'px';
        pop.style.top = up ? 'auto' : r.bottom + 4 + 'px';
        pop.style.bottom = up ? innerHeight - r.top + 4 + 'px' : 'auto';
      };
      const paint = () => pop.querySelectorAll('.combo-item').forEach((el, i) => {
        el.classList.toggle('active', i === active);
        if (i === active) el.scrollIntoView({ block: 'nearest' });
      });
      const open = () => {
        items = itemsFor(key);
        if (!items.length) return close();
        pop.innerHTML = items.map((it, i) => `<div class="combo-item" role="option" data-i="${i}"><span class="combo-ico">${it.icon}</span><span class="combo-txt"><b>${it.title}</b><small>${it.sub}</small></span></div>`).join('');
        active = -1;
        pop.hidden = false;
        place();
      };
      const choosePick = (it) => {
        els[key].value = it.value;
        close();
        onPick();
      };
      input.addEventListener('input', () => { open(); onPick(true); });
      input.addEventListener('blur', close);
      input.addEventListener('keydown', (e) => {
        const isOpen = !pop.hidden;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          if (!isOpen) open();
          if (!items.length) return;
          active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
          paint();
        } else if (e.key === 'Enter' && isOpen && active >= 0) { e.preventDefault(); choosePick(items[active]); }
        else if (e.key === 'Escape' && isOpen) { e.preventDefault(); e.stopPropagation(); close(); }
        else if (e.key === 'Tab') close();
      });
      pop.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const el = e.target.closest('[data-i]');
        if (el) choosePick(items[+el.dataset.i]);
      });
    });
  }

  const editDlg = $('#editDlg');
  const editForm = $('#editForm');
  function openEdit(id) {
    if (FT.readOnly) return;
    const p = FT.store.tree.people[id];
    const f = (name, label, type, val, extra) => `<label>${label}<input name="${name}" type="${type || 'text'}" value="${esc(val)}" ${extra || ''}></label>`;
    editForm.innerHTML = `<h2>Edit person</h2>
      <div class="grid">
        ${f('name', "Person's Name", 'text', p.name, 'required maxlength="80" autocomplete="off"')}
        ${f('surnameNow', 'Surname Now', 'text', p.surnameNow, 'maxlength="80" autocomplete="off"')}
        ${f('surnameBirth', 'Surname at Birth', 'text', p.surnameBirth, 'maxlength="80"')}
        <label>Gender<select name="gender">${[['', 'Not specified'], ['male', 'Male'], ['female', 'Female'], ['other', 'Other']].map(([v, l]) => `<option value="${v}" ${p.gender === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        ${f('dob', 'Date of birth', 'date', p.dob)}
        ${f('dod', 'Date of death', 'date', p.dod)}
        ${f('city', 'Residential city', 'text', p.city, 'maxlength="60" placeholder="e.g. Pune" autocomplete="off"')}
        ${f('profession', 'Profession', 'text', p.profession, 'maxlength="80"')}
      </div>
      <p class="dir-hint" id="editHint"></p>
      <label>Interesting facts<textarea name="facts" rows="4" maxlength="600">${esc(p.facts)}</textarea></label>
      <div class="img-edit"><span>Image</span>
        <div class="row">
          <img id="editImg" alt="" ${p.image ? `src="${esc(p.image)}"` : 'hidden'}>
          <button type="button" class="btn" id="editImgPick">Choose image</button>
          <button type="button" class="btn" id="editImgClear">Remove</button>
          <input type="file" id="editImgFile" accept="image/*" hidden>
        </div></div>
      <div class="dlg-actions"><button type="button" class="btn" id="editCancel">Cancel</button><button class="btn primary" value="save">Save</button></div>`;
    let image = p.image;
    const preview = $('#editImg');
    $('#editImgPick').onclick = () => $('#editImgFile').click();
    $('#editImgClear').onclick = () => { image = ''; preview.hidden = true; };
    $('#editImgFile').onchange = (e) => e.target.files[0] && readImage(e.target.files[0]).then((u) => { image = u; preview.src = u; preview.hidden = false; });
    $('#editCancel').onclick = () => editDlg.close();
    const current = () => ({ name: editForm.elements.name.value, surname: editForm.elements.surnameNow.value, city: editForm.elements.city.value });
    const refreshHint = () => {
      const cur = current();
      const hint = $('#editHint');
      if (!clean(cur.name)) hint.textContent = '';
      else if (FT.inDirectory(cur)) { hint.textContent = '✓ Already in the Name & City list'; hint.className = 'dir-hint ok'; }
      else { hint.textContent = '+ New name and city, it will be added to the Name & City list when you save'; hint.className = 'dir-hint new'; }
    };
    const clean = (s) => String(s || '').trim().replace(/\s+/g, ' ');
    attachSuggest(editDlg, { name: editForm.elements.name, surname: editForm.elements.surnameNow, city: editForm.elements.city }, refreshHint);
    refreshHint();
    editForm.onsubmit = (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(editForm));
      FT.updatePerson(id, {
        name: d.name.trim() || 'Unnamed', surnameNow: d.surnameNow.trim(), surnameBirth: d.surnameBirth.trim(),
        gender: d.gender, dob: d.dob, dod: d.dod, city: d.city.trim(), profession: d.profession.trim(),
        facts: d.facts.trim(), image
      });
      editDlg.close();
    };
    editDlg.showModal();
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { $('#exportMenu').hidden = true; $('#viewMenu').hidden = true; $('#viewsMenu').hidden = true; $('#menu').hidden = true; }
  });

  function choose(title, options) {
    const dlg = $('#chooseDlg');
    const form = $('#chooseForm');
    form.innerHTML = `<h2>${esc(title)}</h2><div class="choices">${options.map((o) => `<button class="btn" value="${esc(o.value)}">${esc(o.label)}</button>`).join('')}</div><div class="dlg-actions"><button class="btn" value="">Cancel</button></div>`;
    dlg.returnValue = '';
    return new Promise((resolve) => {
      dlg.addEventListener('close', () => resolve(dlg.returnValue), { once: true });
      dlg.showModal();
    });
  }

  // ---- Name & City list dialog -----------------------------------------
  const dirDlg = $('#dirDlg');
  const dirForm = $('#dirForm');
  dirForm.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const picked = e.defaultPrevented; // Enter just chose a suggestion
    e.preventDefault();
    if (!picked && e.target.closest('.dir-add')) $('#dirAdd').click();
  });
  function openDirectory() {
    if (FT.readOnly) return;
    dirForm.innerHTML = `<h2>Name &amp; City list</h2>
      <p class="muted">Every person you save is added here once (same name and city is never repeated). A name or city that nobody uses any more is removed automatically; entries you add by hand stay until you remove them.</p>
      <input type="search" id="dirFilter" placeholder="Search name or city…" autocomplete="off">
      <div class="dir-count" id="dirCount"></div>
      <ul class="dir-list" id="dirList"></ul>
      <div class="dir-add grid">
        <label>Name<input id="dirName" maxlength="80" placeholder="e.g. Rohan" autocomplete="off"></label>
        <label>Surname<input id="dirSurname" maxlength="80" placeholder="e.g. Deshmukh" autocomplete="off"></label>
        <label>City<input id="dirCity" maxlength="60" placeholder="e.g. Pune" autocomplete="off"></label>
        <button type="button" class="btn primary" id="dirAdd">Add to list</button>
      </div>
      <p class="dir-hint" id="dirMsg"></p>
      <div class="dlg-actions"><button class="btn" value="close">Close</button></div>`;
    const used = () => new Set(Object.values(FT.store.tree.people).map((p) => FT.directoryKey({ name: p.name, surname: p.surnameNow, city: p.city })));
    const draw = () => {
      const q = $('#dirFilter').value.trim().toLowerCase();
      const inTree = used();
      const all = FT.searchDirectory({ name: '', surname: '', city: '' });
      const list = all.filter((e) => !q || `${FT.directoryLabel(e)} ${e.city}`.toLowerCase().includes(q));
      $('#dirCount').textContent = `${list.length}${q ? ' of ' + all.length : ''} entries`;
      $('#dirList').innerHTML = list.map((e) => {
        const k = FT.directoryKey(e);
        return `<li><span><strong>${esc(FT.directoryLabel(e))}</strong>${e.city ? ` <em>${esc(e.city)}</em>` : ' <em class="none">no city</em>'}</span>${inTree.has(k) ? '<small class="tag">in tree</small>' : `<button type="button" class="btn mini danger" data-del="${esc(k)}">Remove</button>`}</li>`;
      }).join('') || '<li class="muted">Nothing found.</li>';
    };
    $('#dirFilter').oninput = draw;
    $('#dirList').onclick = (e) => {
      const b = e.target.closest('[data-del]');
      if (b) { FT.removeDirectoryEntry(b.dataset.del); draw(); }
    };
    $('#dirAdd').onclick = () => {
      const res = FT.addDirectoryEntry({ name: $('#dirName').value, surname: $('#dirSurname').value, city: $('#dirCity').value });
      const msg = $('#dirMsg');
      msg.className = 'dir-hint ' + (res === 'added' ? 'ok' : 'new');
      msg.textContent = res === 'added' ? '✓ Added to the list' : res === 'exists' ? 'That name and city is already in the list' : 'Enter a name first';
      if (res === 'added') { ['#dirName', '#dirSurname', '#dirCity'].forEach((s) => { $(s).value = ''; }); $('#dirFilter').value = ''; $('#dirName').focus(); }
      draw();
    };
    draw();
    attachSuggest(dirDlg, { name: $('#dirName'), surname: $('#dirSurname'), city: $('#dirCity') }, () => {});
    dirDlg.showModal();
  }
  $('#dirBtn').addEventListener('click', () => { $('#menu').hidden = true; openDirectory(); });

  // ---- account: sign in / create account / reset password ---------------------
  const authDlg = $('#authDlg');
  const authForm = $('#authForm');
  let authView = 'login';
  let authMsg = { text: '', kind: 'err' };
  let authBusy = false;
  let authEmail = '';

  function showAccountBtn() {
    const u = FT.auth && FT.auth.user;
    $('#authLabel').textContent = u ? u.name.split(' ')[0] : 'Sign in';
    $('#authAvatar').textContent = u ? (u.name[0] || '?').toUpperCase() : '';
    $('#authAvatar').classList.toggle('guest', !u);
    $('#authBtn').title = u ? `Signed in as ${u.name} (${u.email})` : 'Sign in or create an account';
  }
  showAccountBtn();

  function openAuth(view, msg) {
    if (FT.readOnly) return;
    authView = view === 'register' && !FT.sync.config.signup ? 'login' : view || 'login';
    authMsg = msg || { text: '', kind: 'err' };
    paintAuth();
    if (!authDlg.open) authDlg.showModal();
  }

  const eye = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 5C7 5 2.7 8.1 1 12.5 2.7 16.9 7 20 12 20s9.3-3.1 11-7.5C21.3 8.1 17 5 12 5zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>';
  const pwField = (name, label, autocomplete) => `<label>${label}<span class="pw"><input name="${name}" type="password" required minlength="8" maxlength="200" autocomplete="${autocomplete}"><button type="button" class="pw-eye" data-eye aria-label="Show or hide password">${eye}</button></span></label>`;
  const msgBox = () => (authMsg.text ? `<p class="auth-msg ${authMsg.kind}" role="alert">${esc(authMsg.text)}</p>` : '');

  function paintAuth() {
    const u = FT.auth && FT.auth.user;
    if (u) {
      authForm.innerHTML = `<div class="auth-card"><span class="avatar big">${esc((u.name[0] || '?').toUpperCase())}</span>
        <h2>${esc(u.name)}</h2><p class="muted">${esc(u.email)}</p>
        <p class="muted">Your trees are saved to this account and follow you to every browser where you sign in.</p></div>
        ${msgBox()}
        <div class="dlg-actions"><button type="button" class="btn danger" data-auth="logout">Sign out</button><button class="btn" value="close">Close</button></div>`;
      return;
    }
    const cfg = FT.sync.config;
    const tabs = cfg.signup && (authView === 'login' || authView === 'register')
      ? `<div class="auth-tabs" role="tablist"><button type="button" role="tab" class="${authView === 'login' ? 'on' : ''}" data-auth="view-login">Sign in</button><button type="button" role="tab" class="${authView === 'register' ? 'on' : ''}" data-auth="view-register">Create account</button></div>` : '';
    const resetHow = cfg.resetVia === 'email' ? 'We email you a 6-digit code.'
      : cfg.realtime ? 'A 6-digit code is shown in the window where the server is running (there is no email service).'
        : 'The 6-digit code is written to the site\'s server log, so ask the site owner for it.';
    let body = '';
    if (authView === 'login') {
      body = `<h2>Welcome back</h2><p class="muted">Sign in to open your trees on this browser.</p>
        <label>Email<input name="email" type="email" required maxlength="120" autocomplete="email" value="${esc(authEmail)}"></label>
        ${pwField('password', 'Password', 'current-password')}
        ${msgBox()}
        <button class="btn primary wide" ${authBusy ? 'disabled' : ''}>${authBusy ? 'Signing in…' : 'Sign in'}</button>
        <button type="button" class="link-btn" data-auth="view-forgot">Forgot your password?</button>`;
    } else if (authView === 'register') {
      body = `<h2>Create your account</h2><p class="muted">Your trees are saved to your account and follow you to every browser.${cfg.realtime ? ' If this is the first account on this server, it takes over the trees already saved here.' : ''}</p>
        <label>Name<input name="name" required maxlength="60" autocomplete="name"></label>
        <label>Email<input name="email" type="email" required maxlength="120" autocomplete="email" value="${esc(authEmail)}"></label>
        ${pwField('password', 'Password (at least 8 characters)', 'new-password')}
        ${msgBox()}
        <button class="btn primary wide" ${authBusy ? 'disabled' : ''}>${authBusy ? 'Creating…' : 'Create account'}</button>`;
    } else if (authView === 'forgot') {
      body = `<h2>Reset your password</h2><p class="muted">Enter your email. ${esc(resetHow)}</p>
        <label>Email<input name="email" type="email" required maxlength="120" autocomplete="email" value="${esc(authEmail)}"></label>
        ${msgBox()}
        <button class="btn primary wide" ${authBusy ? 'disabled' : ''}>Get a reset code</button>
        <button type="button" class="link-btn" data-auth="view-reset">I already have a code</button>
        <button type="button" class="link-btn" data-auth="view-login">Back to sign in</button>`;
    } else {
      body = `<h2>Choose a new password</h2><p class="muted">Type the 6-digit code and your new password.</p>
        <label>Email<input name="email" type="email" required maxlength="120" autocomplete="email" value="${esc(authEmail)}"></label>
        <label>Reset code<input name="code" required inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" placeholder="123456"></label>
        ${pwField('password', 'New password (at least 8 characters)', 'new-password')}
        ${msgBox()}
        <button class="btn primary wide" ${authBusy ? 'disabled' : ''}>Save new password</button>
        <button type="button" class="link-btn" data-auth="view-login">Back to sign in</button>`;
    }
    authForm.innerHTML = `${tabs}${body}<div class="dlg-actions"><button class="btn" value="close">Close</button></div>`;
    const first = authForm.querySelector('input');
    if (first) setTimeout(() => first.focus(), 30);
  }

  const authError = (e) => {
    if (e && e.status) return e.message;
    const local = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    return local ? 'The server is not reachable. Start it with start.cmd and try again.' : 'The server is not reachable. Check your connection and try again.';
  };
  window.addEventListener('ft:config', () => { if (authDlg.open && !FT.auth) paintAuth(); });

  authForm.addEventListener('click', async (e) => {
    const eyeBtn = e.target.closest('[data-eye]');
    if (eyeBtn) {
      const input = eyeBtn.parentElement.querySelector('input');
      input.type = input.type === 'password' ? 'text' : 'password';
      return;
    }
    const b = e.target.closest('[data-auth]');
    if (!b) return;
    const act = b.dataset.auth;
    if (act.startsWith('view-')) {
      const em = authForm.querySelector('[name=email]');
      if (em) authEmail = em.value;
      return openAuth(act.slice(5));
    }
    if (act === 'logout') {
      try { await FT.sync.flush(); } catch (err) { /* offline */ }
      try { await FT.sync.logout(); } catch (err) { /* the session just expires on its own */ }
      FT.setAuth(null);
      location.reload();
    }
  });

  authForm.addEventListener('submit', async (e) => {
    const submitter = e.submitter;
    if (submitter && submitter.value === 'close') return;
    e.preventDefault();
    if (authBusy || FT.auth) return;
    const d = Object.fromEntries(new FormData(authForm));
    authEmail = d.email || '';
    authBusy = true;
    authMsg = { text: '', kind: 'err' };
    paintAuth();
    const keep = { email: authEmail };
    try {
      if (authView === 'login' || authView === 'register') {
        const res = await FT.sync.auth(authView, authView === 'login' ? { email: d.email, password: d.password } : { name: d.name, email: d.email, password: d.password });
        if (res.claimed > 0) FT.adoptGuestData(res.user.id);
        FT.setAuth({ token: res.token, user: res.user });
        location.reload();
        return;
      }
      if (authView === 'forgot') {
        const sent = await FT.sync.auth('forgot', { email: d.email });
        authBusy = false;
        const where = sent.via === 'email' ? 'We emailed a 6-digit code' : FT.sync.config.realtime ? 'a 6-digit code was printed in the server window' : 'a 6-digit code was written to the server log';
        return openAuth('reset', { text: sent.via === 'email' ? `If that account exists, ${where.toLowerCase()}. Enter it below.` : `If that account exists, ${where}. Enter it below.`, kind: 'ok' });
      }
      await FT.sync.auth('reset', { email: d.email, code: d.code, password: d.password });
      authBusy = false;
      authEmail = keep.email;
      return openAuth('login', { text: 'Password changed. Sign in with your new password.', kind: 'ok' });
    } catch (err) {
      authBusy = false;
      authMsg = { text: authError(err), kind: 'err' };
      paintAuth();
    }
  });
  $('#authBtn').addEventListener('click', () => openAuth('login'));
  try {
    const notice = sessionStorage.getItem('ftb.notice');
    if (notice) { sessionStorage.removeItem('ftb.notice'); setTimeout(() => openAuth('login', { text: notice, kind: 'err' }), 400); }
  } catch (e) { /* ignore */ }

  // ---- share a view-only link ----------------------------------------------
  const shareDlg = $('#shareDlg');
  const shareForm = $('#shareForm');
  let share = { token: null, busy: false, error: '', copied: false };

  const shareLink = (token) => `${FT.sync.publicOrigin()}/?share=${token}`;
  const shareError = (e) => (e && e.status ? e.message : 'The server is not reachable. Start it with start.cmd and try again.');

  function paintShare() {
    const name = esc(FT.treeName());
    let body;
    if (share.busy) body = '<p class="muted">One moment…</p>';
    else if (share.error) body = `<p class="auth-msg err" role="alert">${esc(share.error)}</p>`;
    else if (!share.token) {
      body = `<p class="muted">Create a link to <strong>${name}</strong> that anyone can open to look at the tree. They can browse, search and switch views, but <strong>cannot change anything</strong>, and they do not need an account.</p>
        <button type="button" class="btn primary wide" data-share="create">Create view-only link</button>`;
    } else {
      const link = shareLink(share.token);
      const local = /\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(link);
      body = `<p class="muted">Anyone with this link can <strong>view</strong> <strong>${name}</strong>, but not edit it. Changes you make appear for them live.</p>
        <div class="share-row"><input id="shareLinkInput" readonly value="${esc(link)}" aria-label="View-only link" onfocus="this.select()"><button type="button" class="btn primary" data-share="copy">${share.copied ? '✓ Copied' : 'Copy link'}</button></div>
        ${local ? '<p class="auth-msg warn">This address only works on this computer. To let people on other devices open it, start the server with <code>HOST=0.0.0.0</code> and replace <code>localhost</code> in the link with this computer\'s network address.</p>' : ''}
        <button type="button" class="btn danger" data-share="stop">Stop sharing (the link stops working)</button>`;
    }
    shareForm.innerHTML = `<h2>Share a view-only link</h2>${body}<div class="dlg-actions"><button class="btn" value="close">Close</button></div>`;
  }

  async function openShare() {
    if (FT.readOnly) return;
    share = { token: null, busy: true, error: '', copied: false };
    paintShare();
    if (!shareDlg.open) shareDlg.showModal();
    if (FT.sync.state === 'locked') { share.busy = false; share.error = 'Sign in first: view-only links are kept on the server under your account.'; return paintShare(); }
    try {
      await FT.sync.flush();
      share.token = (await FT.sync.getShare(FT.activeId)).token;
    } catch (e) { share.error = shareError(e); }
    share.busy = false;
    paintShare();
  }

  shareForm.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-share]');
    if (!b) return;
    const act = b.dataset.share;
    if (act === 'create') {
      share.busy = true; paintShare();
      try { share.token = (await FT.sync.createShare(FT.activeId)).token; share.error = ''; } catch (err) { share.error = shareError(err); }
      share.busy = false; paintShare();
    } else if (act === 'copy') {
      const input = $('#shareLinkInput');
      try { await navigator.clipboard.writeText(input.value); } catch (err) { input.select(); document.execCommand('copy'); }
      share.copied = true; paintShare();
      setTimeout(() => { share.copied = false; if (shareDlg.open) paintShare(); }, 2000);
    } else if (act === 'stop') {
      if (!confirm('Stop sharing? Anyone using the link will lose access, and the link cannot be reused. You can create a new link later.')) return;
      share.busy = true; paintShare();
      try { await FT.sync.revokeShare(FT.activeId); share.token = null; share.error = ''; } catch (err) { share.error = shareError(err); }
      share.busy = false; paintShare();
    }
  });

  // ---- opened through a view-only link ---------------------------------------
  if (FT.readOnly) {
    document.body.classList.add('readonly');
    $('#viewBadge').hidden = false;
    $('#intro').hidden = true;
    const label = () => {
      $('#viewBadgeName').textContent = FT.treeName();
      document.title = `${FT.treeName()} (view only) | Family Tree Builder`;
    };
    window.addEventListener('ft:treename', label);
    window.addEventListener('ft:syncstate', () => {
      if (FT.sync.state !== 'gone') return;
      $('#goneMsg').textContent = FT.sync.gone;
      $('#goneBox').hidden = false;
    });
  }

  // ---- several trees: open, create, rename, delete ---------------------------
  const treesDlg = $('#treesDlg');
  const treesForm = $('#treesForm');
  const treeNewDlg = $('#treeNewDlg');
  const treeNewForm = $('#treeNewForm');
  const showTreeName = () => { $('#treesBtnName').textContent = FT.treeName(); $('#treesBtn').title = `Open tree: ${FT.treeName()} (click to switch, create or manage trees)`; };
  window.addEventListener('ft:treename', showTreeName);
  showTreeName();

  let treeRows = [];
  let treesOffline = false;
  let renamingId = '';
  let treeMsg = '';

  async function loadTrees() {
    try {
      treeRows = await FT.sync.listTrees();
      treesOffline = false;
      treeRows.forEach((t) => { if (t.name && FT.names()[t.id] !== t.name) FT.setTreeName(t.id, t.name); });
      // trees deleted from another browser: drop the leftover local copy (unless it has unsent work)
      FT.localTrees().forEach((t) => {
        let unsent = false;
        try { unsent = localStorage.getItem(FT.dirtyKey(t.id)) === '1'; } catch (e) { /* ignore */ }
        if (t.id !== 'main' && t.id !== FT.activeId && !treeRows.some((r) => r.id === t.id) && !unsent) FT.forgetTree(t.id);
      });
    } catch (e) {
      treesOffline = true;
      treeRows = FT.localTrees();
    }
    if (!treeRows.some((t) => t.id === FT.activeId)) treeRows.push({ id: FT.activeId, name: FT.treeName() });
  }

  function paintTrees() {
    const when = (u) => (u ? new Date(u).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '');
    const rows = treeRows.map((t) => {
      const current = t.id === FT.activeId;
      const meta = [t.people ? `${t.people} people` : '', t.updatedAt ? 'saved ' + when(t.updatedAt) : ''].filter(Boolean).join(' · ');
      const name = renamingId === t.id
        ? `<input class="tree-rename" data-rename-input="${esc(t.id)}" value="${esc(t.name)}" maxlength="80" aria-label="Tree name">`
        : `<strong>${esc(t.name)}</strong>${current ? '<small class="tag now">open now</small>' : ''}`;
      const actions = renamingId === t.id
        ? `<button type="button" class="btn mini primary" data-tree-act="rename-save" data-id="${esc(t.id)}">Save</button><button type="button" class="btn mini" data-tree-act="rename-cancel">Cancel</button>`
        : `<button type="button" class="btn mini primary" data-tree-act="open" data-id="${esc(t.id)}" ${current ? 'disabled' : ''}>Open</button>
           <button type="button" class="btn mini" data-tree-act="rename" data-id="${esc(t.id)}">Rename</button>
           <button type="button" class="btn mini danger" data-tree-act="delete" data-id="${esc(t.id)}" ${t.id === 'main' || current ? 'disabled' : ''} title="${t.id === 'main' ? 'The first tree cannot be deleted' : current ? 'Open another tree first' : 'Delete this tree'}">Delete</button>`;
      return `<li class="${current ? 'current' : ''}"><div class="tree-info">${name}<small>${esc(meta)}</small></div><div class="tree-actions">${actions}</div></li>`;
    }).join('');
    treesForm.innerHTML = `<h2>My family trees</h2>
      <p class="muted">Every tree is saved separately. Opening another tree never changes this one.</p>
      ${treesOffline ? `<p class="link-msg err">${FT.sync.state === 'locked' ? 'Sign in to see your saved trees: only trees stored in this browser are shown.' : 'Server not reachable: only trees saved in this browser are shown.'}</p>` : ''}
      ${treeMsg ? `<p class="link-msg ok">${esc(treeMsg)}</p>` : ''}
      <ul class="tree-list">${rows}</ul>
      <div class="tree-new">
        <button type="button" class="btn primary" data-tree-act="new">+ New blank tree</button>
        <button type="button" class="btn" data-tree-act="import" title="Add a tree saved with Export → Tree file as a new tree">Import tree from file</button>
        <button type="button" class="btn" data-tree-act="from-selected" title="Copy the selected person, their partners and all descendants into a new tree">New tree from ${esc(FT.fullName(FT.store.tree.people[FT.store.selectedId] || { name: 'selected person' }))}</button>
      </div>
      <div class="dlg-actions"><button class="btn" value="close">Close</button></div>`;
    const input = treesForm.querySelector('[data-rename-input]');
    if (input) { input.focus(); input.select(); }
  }

  async function openTrees() {
    if (FT.readOnly) return;
    renamingId = '';
    treeMsg = '';
    treeRows = FT.localTrees();
    paintTrees();
    if (!treesDlg.open) treesDlg.showModal();
    await loadTrees();
    paintTrees();
  }

  async function openTreeById(id) {
    try { if (FT.sync) await FT.sync.flush(); } catch (e) { /* offline: changes stay in this browser */ }
    try {
      const remote = await FT.sync.fetchTree(id);
      FT.cacheTree(id, remote);
    } catch (e) {
      if (!FT.localTrees().some((t) => t.id === id)) { treeMsg = ''; alert('That tree is not available right now: the server cannot be reached and this browser has no copy.'); return; }
    }
    FT.switchTo(id);
  }

  treesForm.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-tree-act]');
    if (!b) return;
    const id = b.dataset.id;
    const act = b.dataset.treeAct;
    treeMsg = '';
    if (act === 'open') return openTreeById(id);
    if (act === 'new') { treesDlg.close(); return openNewTree({}); }
    if (act === 'import') return pickImport();
    if (act === 'from-selected') { treesDlg.close(); return openNewTree({ fromPerson: FT.store.selectedId }); }
    if (act === 'rename') { renamingId = id; return paintTrees(); }
    if (act === 'rename-cancel') { renamingId = ''; return paintTrees(); }
    if (act === 'rename-save') return saveTreeName(id);
    if (act === 'delete') {
      const row = treeRows.find((t) => t.id === id);
      if (!confirm(`Delete the tree "${row ? row.name : id}"? It is removed from every browser (the server keeps a backup copy).`)) return;
      try { await FT.sync.deleteTree(id); FT.forgetTree(id); } catch (err) { treeMsg = ''; alert('Could not delete: the server is not reachable.'); return; }
      await loadTrees();
      treeMsg = 'Tree deleted.';
      paintTrees();
    }
  });
  async function saveTreeName(id) {
    const input = treesForm.querySelector('[data-rename-input]');
    const name = input ? input.value.replace(/\s+/g, ' ').trim() : '';
    if (!name) return;
    FT.setTreeName(id, name);
    if (id === FT.activeId) FT.sync.queue();
    else { try { await FT.sync.renameTree(id, name); } catch (e) { /* the name is kept in this browser */ } }
    renamingId = '';
    await loadTrees();
    paintTrees();
  }
  treesForm.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const input = e.target.closest('[data-rename-input]');
    if (input) saveTreeName(input.dataset.renameInput);
  });
  window.addEventListener('ft:treelist', () => { if (treesDlg.open) loadTrees().then(paintTrees); });
  // without live push (Vercel) the open list refreshes itself every few seconds
  setInterval(() => { if (treesDlg.open && !FT.sync.config.realtime && !renamingId && !document.hidden) loadTrees().then(paintTrees); }, 8000);
  $('#treesBtn').addEventListener('click', openTrees);

  // blank tree, a copy of one person's branch, or a tree imported from a file
  function openNewTree({ fromPerson, imported }) {
    if (FT.readOnly) return;
    const P = FT.store.tree.people;
    const src = fromPerson && P[fromPerson];
    const c = src ? FT.subtreeCount(fromPerson) : null;
    const first = src ? (src.name || 'Person').split(' ')[0] : '';
    const heading = imported ? 'Import tree' : src ? 'New tree from ' + esc(FT.fullName(src)) : 'New blank tree';
    // an empty current tree is simply filled by the import instead of leaving an empty tree behind
    const reuse = !!imported && FT.isBlankTree();
    const blurb = imported
      ? (reuse
        ? `<p class="muted"><strong>${imported.people} ${imported.people === 1 ? 'person' : 'people'}</strong> found in the file. Your current tree is still empty, so the imported family fills it.</p>`
        : `<p class="muted"><strong>${imported.people} ${imported.people === 1 ? 'person' : 'people'}</strong> found in the file. They are added as a <strong>new tree</strong>, so your current trees stay exactly as they are.</p>`)
      : src ? `<p class="muted"><strong>${c.total} ${c.total === 1 ? 'person' : 'people'}</strong> will be copied: ${esc(FT.fullName(src))}${c.partners ? `, partner${c.partners > 1 ? 's' : ''}` : ''}${c.descendants ? ` and ${c.descendants} descendant${c.descendants > 1 ? 's' : ''}` : ''}. Parents, grandparents, siblings and the in-laws' own families are <strong>not</strong> copied. This tree stays exactly as it is.</p>`
        : '<p class="muted">Starts a separate tree with one person. Your other trees stay as they are.</p>';
    const defaultName = imported ? imported.name : src ? first + "'s family" : 'New family tree';
    const warnSmall = imported && imported.people <= 1
      ? '<p class="auth-msg warn" role="alert">This file contains only <strong>1 person</strong>, so it looks like an empty tree. Your family is not in it. Save the file again from the app where your family is shown (signed in to the right account), using Export → Tree file.</p>' : '';
    treeNewForm.innerHTML = `<h2>${heading}</h2>${blurb}${warnSmall}
      <label>Tree name<input name="name" required maxlength="80" value="${esc(defaultName)}" autocomplete="off"></label>
      ${src || imported ? '' : '<label>First person\'s name<input name="first" maxlength="80" value="Me" autocomplete="off"></label>'}
      ${reuse ? '' : '<label class="chk"><input type="checkbox" name="open" checked> Open the new tree now</label>'}
      <div class="dlg-actions"><button type="button" class="btn" id="treeNewCancel">Cancel</button><button class="btn primary" value="create">${imported ? 'Import tree' : 'Create tree'}</button></div>`;
    $('#treeNewCancel').onclick = () => treeNewDlg.close();
    treeNewForm.onsubmit = async (e) => {
      e.preventDefault();
      const d = new FormData(treeNewForm);
      const name = String(d.get('name') || '').trim() || 'New family tree';
      const id = reuse ? FT.activeId : FT.newTreeId();
      const tree = imported ? imported.tree : src ? FT.buildSubtree(fromPerson) : FT.blankTree(String(d.get('first') || ''));
      let staged;
      try { staged = FT.stageTree(id, name, tree, imported && imported.settings); } catch (err) { alert('Could not save the new tree in this browser (storage is full or the file is not a valid tree).'); return; }
      const btn = treeNewForm.querySelector('button.primary');
      const label = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Saving…';
      let uploaded = true;
      try { await FT.sync.createTree(id, staged); } catch (err) {
        if (err.locked || err.status) { // the server answered and said no: do not keep a half-created copy
          if (!reuse) FT.forgetTree(id);
          btn.disabled = false;
          btn.textContent = label;
          alert(err.locked ? 'Sign in first: on this site trees are saved to your account.' : `The server could not save this tree: ${err.message}`);
          return;
        }
        uploaded = false;
        try { localStorage.setItem(FT.dirtyKey(id), '1'); } catch (x) { /* ignore */ }
      }
      treeNewDlg.close();
      if (reuse || d.get('open')) return FT.switchTo(id);
      await openTrees();
      treeMsg = `"${name}" was ${imported ? 'imported' : 'created'}${uploaded ? '' : ' in this browser (it will be saved to the server when you open it with the server running)'}.`;
      paintTrees();
    };
    treeNewDlg.showModal();
    const nm = treeNewForm.elements.name;
    nm.focus();
    nm.select();
  }

  // pick a saved tree file; it always becomes a new tree
  function pickImport() {
    if (FT.readOnly) return;
    if (FT.sync.state === 'locked') return openAuth('login', { text: 'Sign in first: on this site your trees are saved to your account. Then import your file.', kind: 'err' });
    const input = $('#loadJsonInput');
    input.value = '';
    input.onchange = async () => {
      const file = input.files[0];
      input.value = '';
      if (!file) return;
      try {
        const imported = await FT.readImport(file);
        if (treesDlg.open) treesDlg.close();
        openNewTree({ imported });
      } catch (err) {
        const isSheet = /\.(xlsx?|csv)$/i.test(file.name);
        alert(isSheet
          ? 'Excel and CSV files cannot be imported (they are for reading only). Use the tree file from Export → Tree file (.json) or "Save tree to file".'
          : err instanceof SyntaxError || (err && err.message === 'read')
            ? `"${file.name}" could not be read as a tree file. Pick the .json file saved with Export → Tree file (.json).`
            : `"${file.name}" is a JSON file, but not a Family Tree Builder tree (it needs a "people" list and a starting person). Pick a file saved with Export → Tree file (.json).`);
      }
    };
    input.click();
  }

  // ---- link an existing member -----------------------------------------
  const linkDlg = $('#linkDlg');
  const linkForm = $('#linkForm');
  linkForm.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'linkFilter') e.preventDefault(); });
  const REL_TYPES = [
    ['parent', 'is a parent of'],
    ['child', 'is a child of'],
    ['partner', 'is a partner of'],
    ['sibling', 'is a sibling of']
  ];
  let linkState = { type: 'parent', other: '', filter: '', error: '' };

  function openLink(id) {
    if (FT.readOnly) return;
    linkState = { type: 'parent', other: '', filter: '', error: '', ok: '' };
    renderLink(id);
    if (!linkDlg.open) linkDlg.showModal();
  }

  function renderLink(id) {
    const P = FT.store.tree.people;
    const me = P[id];
    const fmt = FT.store.settings.dateFormat;
    const label = (p) => `${FT.fullName(p)}${p.dob ? ' — ' + FT.formatDate(p.dob, fmt) : ''}`;
    const f = linkState.filter.trim().toLowerCase();
    const options = Object.values(P)
      .filter((p) => p.id !== id && (!f || FT.fullName(p).toLowerCase().includes(f)))
      .sort((a, b) => FT.fullName(a).localeCompare(FT.fullName(b)));
    if (!options.some((p) => p.id === linkState.other)) linkState.other = options[0] ? options[0].id : '';
    const kids = Object.values(P).filter((p) => p.parentIds.includes(id));
    const rows = [
      ...me.parentIds.map((x) => ['Parent', x, 'parent']),
      ...me.partnerIds.map((x) => ['Partner', x, 'partner']),
      ...kids.map((p) => ['Child', p.id, 'child'])
    ].filter(([, x]) => P[x]);
    linkForm.innerHTML = `<h2>Link relative</h2>
      <p class="muted">Connect <strong>${esc(FT.fullName(me))}</strong> with someone already in the tree.</p>
      <label>Search members<input type="search" id="linkFilter" placeholder="Type a name…" value="${esc(linkState.filter)}" autocomplete="off"></label>
      <div class="link-row">
        <label>Existing member<select id="linkOther" size="1">${options.map((p) => `<option value="${esc(p.id)}" ${p.id === linkState.other ? 'selected' : ''}>${esc(label(p))}</option>`).join('') || '<option value="">No matches</option>'}</select></label>
        <label>Relationship<select id="linkType">${REL_TYPES.map(([v, l]) => `<option value="${v}" ${v === linkState.type ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </div>
      <p class="link-preview">${options.length && linkState.other ? `<strong>${esc(FT.fullName(P[linkState.other]))}</strong> ${REL_TYPES.find((r) => r[0] === linkState.type)[1]} <strong>${esc(FT.fullName(me))}</strong>` : ''}</p>
      ${linkState.error ? `<p class="link-msg err" role="alert">${esc(linkState.error)}</p>` : ''}
      ${linkState.ok ? `<p class="link-msg ok">${esc(linkState.ok)}</p>` : ''}
      <div class="dlg-actions"><button type="button" class="btn primary" id="linkApply" ${linkState.other ? '' : 'disabled'}>Link</button></div>
      <h3 class="facts-h">Current relationships</h3>
      <ul class="rel-list">${rows.length ? rows.map(([k, x, kind]) => `<li><span><em>${k}</em> ${esc(FT.fullName(P[x]))}</span><button type="button" class="btn danger" data-unlink="${esc(x)}" data-kind="${kind}">Unlink</button></li>`).join('') : '<li class="muted">None yet.</li>'}</ul>
      <div class="dlg-actions"><button class="btn" value="close">Close</button></div>`;

    $('#linkFilter').oninput = (e) => { linkState.filter = e.target.value; linkState.error = linkState.ok = ''; renderLink(id); const el = $('#linkFilter'); el.focus(); el.setSelectionRange(el.value.length, el.value.length); };
    $('#linkOther').onchange = (e) => { linkState.other = e.target.value; linkState.error = linkState.ok = ''; renderLink(id); };
    $('#linkType').onchange = (e) => { linkState.type = e.target.value; linkState.error = linkState.ok = ''; renderLink(id); };
    $('#linkApply').onclick = () => {
      const err = FT.linkRelation(id, linkState.other, linkState.type);
      linkState.error = err || '';
      linkState.ok = err ? '' : 'Relationship added.';
      renderLink(id);
      if (!err) revealSoon();
    };
    linkForm.querySelectorAll('[data-unlink]').forEach((b) => {
      b.onclick = () => {
        const other = b.dataset.unlink;
        const lost = FT.previewUnlink(id, other, b.dataset.kind);
        if (lost && !confirm(`Unlinking will also remove ${lost} ${lost === 1 ? 'person' : 'people'} who would no longer be connected to the main person. Continue?`)) return;
        FT.unlinkRelation(id, other, b.dataset.kind);
        linkState.error = '';
        linkState.ok = 'Relationship removed.';
        renderLink(id);
        revealSoon();
      };
    });
  }

  const settingsDlg = $('#settingsDlg');
  const settingsForm = $('#settingsForm');
  function openSettings() {
    const s = FT.store.settings;
    const sel = (name, opts, cur) => `<select name="${name}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    const chk = (group, key, label) => `<label class="chk"><input type="checkbox" name="${group}.${key}" ${s[group][key] ? 'checked' : ''}> ${label}</label>`;
    settingsForm.innerHTML = `<h2>Tree settings</h2>
      <div class="grid">
        <label>Date format${sel('dateFormat', FT.DATE_FORMATS.map((f) => [f, f]), s.dateFormat)}</label>
        <label>Font size${sel('fontSize', [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']], s.fontSize)}</label>
        <label>Tree style${sel('style', Object.entries(FT.STYLES), s.style)}</label>
      </div>
      <fieldset><legend>Show on cards</legend>${chk('show', 'photo', 'Photo')}${chk('show', 'dates', 'Dates')}${chk('show', 'city', 'City')}${chk('show', 'profession', 'Profession')}${chk('show', 'facts', 'Interesting facts')}${chk('show', 'relation', 'Relation to main person (Marathi)')}</fieldset>
      <fieldset><legend>Show tree parts</legend>${chk('parts', 'ancestors', 'Ancestors')}${chk('parts', 'siblings', 'Siblings')}${chk('parts', 'descendants', 'Descendants')}</fieldset>
      <div class="dlg-actions"><button type="button" class="btn" id="resetPos">Reset manual positions</button><button class="btn primary" value="close">Done</button></div>`;
    $('#resetPos').onclick = () => {
      FT.mutate((t) => Object.values(t.people).forEach((p) => { delete p.mx; delete p.my; }));
      requestAnimationFrame(fit);
    };
    settingsForm.onchange = () => {
      const d = new FormData(settingsForm);
      const cur = FT.store.settings;
      const next = { dateFormat: d.get('dateFormat'), fontSize: d.get('fontSize'), style: d.get('style'), show: {}, parts: {} };
      Object.keys(cur.show).forEach((k) => (next.show[k] = d.has('show.' + k)));
      Object.keys(cur.parts).forEach((k) => (next.parts[k] = d.has('parts.' + k)));
      FT.setSettings(next);
      requestAnimationFrame(fit);
    };
    settingsDlg.showModal();
  }

  // ---- toolbar actions -------------------------------------------------
  $('.toolbar').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const exp = b.dataset.export;
    if (exp) { $('#exportMenu').hidden = true; return FT.exportAs(exp); }
    const sv = b.dataset.setView;
    if (sv) { $('#viewsMenu').hidden = true; return setView(sv); }
    if (b.dataset.view) { $('#viewMenu').hidden = true; return runView(b.dataset.view); }
    switch (b.dataset.act) {
      case 'views': e.stopPropagation(); $('#exportMenu').hidden = true; $('#viewMenu').hidden = true; return $('#viewsMenu').hidden ? openViewsMenu() : ($('#viewsMenu').hidden = true);
      case 'zoomIn': return zoomCentre(1.25);
      case 'zoomOut': return zoomCentre(0.8);
      case 'center': return runView('fit');
      case 'viewMenu': e.stopPropagation(); $('#exportMenu').hidden = true; return $('#viewMenu').hidden ? openViewMenu() : ($('#viewMenu').hidden = true);
      case 'settings': return openSettings();
      case 'manual': return FT.readOnly ? undefined : toggleManual();
      case 'share': return openShare();
      case 'export': e.stopPropagation(); $('#viewMenu').hidden = true; $('#exportMenu').hidden = !$('#exportMenu').hidden; return;
      case 'undo': FT.undo(); return revealSoon();
      case 'redo': FT.redo(); return revealSoon();
      case 'reset':
        if (confirm('Reset the tree? All people you added will be removed (you can undo this).')) { FT.resetTree(); fitSoon(); }
    }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.export-wrap:not(.view-wrap):not(.views-wrap)')) $('#exportMenu').hidden = true;
    if (!e.target.closest('.views-wrap')) $('#viewsMenu').hidden = true;
    if (!e.target.closest('.view-wrap')) $('#viewMenu').hidden = true;
    if (!e.target.closest('.topbar')) { $('#menu').hidden = true; $('#menuBtn').setAttribute('aria-expanded', 'false'); }
  });

  function toggleManual() {
    const on = !FT.store.settings.manual;
    if (on) {
      const sc = FT.scene();
      sc.vis.forEach((p) => {
        if (p.mx == null) { p.mx = sc.auto[p.id].x; p.my = sc.auto[p.id].y; }
      });
    }
    FT.setSettings({ manual: on });
  }

  // ---- canvas interaction ---------------------------------------------
  const pointers = new Map();
  let drag = null;
  let pinch = null;
  svg.addEventListener('pointerdown', (e) => {
    cancelAnimationFrame(anim);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    svg.setPointerCapture(e.pointerId);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) };
      drag = null;
      return;
    }
    const g = e.target.closest('[data-id]');
    const id = g && g.dataset.id;
    const manual = FT.store.settings.manual;
    const toggle = e.target.closest('[data-toggle]');
    drag = { id, toggle: toggle ? toggle.dataset.toggle : null, dir: toggle ? toggle.dataset.dir : null, sx: e.clientX, sy: e.clientY, tx: view.tx, ty: view.ty, moved: false, card: !!(id && manual && !toggle) };
    if (drag.card) {
      const p = FT.store.tree.people[id];
      drag.before = JSON.stringify(FT.store.tree);
      drag.ox = p.mx != null ? p.mx : scene.pos[id].x;
      drag.oy = p.my != null ? p.my : scene.pos[id].y;
    }
  });
  svg.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const r = svg.getBoundingClientRect();
      zoomAt(d / pinch.d, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      pinch.d = d;
      return;
    }
    if (!drag) return;
    const dx = e.clientX - drag.sx;
    const dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    if (drag.card) {
      const p = FT.store.tree.people[drag.id];
      p.mx = drag.ox + dx / view.k;
      p.my = drag.oy + dy / view.k;
      render();
    } else {
      view.tx = drag.tx + dx;
      view.ty = drag.ty + dy;
      applyView();
    }
  });
  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!drag) return;
    const d = drag;
    drag = null;
    if (d.card && d.moved) { FT.pushHistory(d.before); FT.save(); render(); }
    else if (!d.moved && d.toggle && e.type === 'pointerup') foldBranch(d.toggle, e.shiftKey, undefined, d.dir);
    else if (!d.moved && d.id && e.type === 'pointerup') FT.select(d.id);
  };
  svg.addEventListener('pointerup', endPointer);
  svg.addEventListener('pointercancel', endPointer);
  svg.addEventListener('keydown', (e) => {
    const t = e.target.closest && e.target.closest('[data-toggle]');
    if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); foldBranch(t.dataset.toggle, e.shiftKey, undefined, t.dataset.dir); }
  });
  svg.addEventListener('dblclick', (e) => {
    const g = document.elementsFromPoint(e.clientX, e.clientY).map((n) => n.closest && n.closest('[data-id]')).find(Boolean);
    if (g) { FT.select(g.dataset.id); openEdit(g.dataset.id); }
  });
  svg.addEventListener('wheel', (e) => {
    cancelAnimationFrame(anim);
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  // ---- header menu, intro, cookies ------------------------------------
  $('#menuBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const m = $('#menu');
    m.hidden = !m.hidden;
    e.currentTarget.setAttribute('aria-expanded', String(!m.hidden));
  });
  $('#menu').addEventListener('click', (e) => { if (e.target.closest('a')) $('#menu').hidden = true; });
  $('#saveJson').addEventListener('click', () => { $('#menu').hidden = true; FT.saveJson(); });
  $('#loadJson').addEventListener('click', () => { $('#menu').hidden = true; pickImport(); });
  $('#introClose').addEventListener('click', () => {
    $('#intro').hidden = true;
    try { localStorage.setItem('ftb.intro', '1'); } catch (e) { /* ignore */ }
  });
  try { if (localStorage.getItem('ftb.intro')) $('#intro').hidden = true; } catch (e) { /* ignore */ }
  $('#cookieOk').addEventListener('click', () => {
    $('#cookies').hidden = true;
    try { localStorage.setItem('ftb.cookies', '1'); } catch (e) { /* ignore */ }
  });
  try { $('#cookies').hidden = !!localStorage.getItem('ftb.cookies'); } catch (e) { $('#cookies').hidden = false; }
  // ---- search ------------------------------------------------------------
  const sInput = $('#searchInput');
  const sList = $('#searchList');
  const sWrap = $('#searchWrap');
  const norm = (s) => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  let results = [];
  let active = 0;
  let hits = null;

  function searchPeople(q) {
    const tokens = norm(q).split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    const kin = FT.kinship();
    const visible = new Set(FT.visiblePeople().map((p) => p.id));
    const list = [];
    Object.values(FT.store.tree.people).forEach((p) => {
      const name = norm(FT.fullName(p));
      const words = name.split(/[\s()]+/);
      const k = kin[p.id] || {};
      const relText = norm(`${k.mr || ''} ${k.tr || ''} ${k.en || ''} ${k.side || ''}`);
      const other = norm(`${p.city} ${p.profession} ${p.facts} ${p.dob} ${p.dod} ${FT.formatDate(p.dob, FT.store.settings.dateFormat)} ${p.gender}`);
      let score = 0;
      for (const t of tokens) {
        if (name.startsWith(t)) score += 100;
        else if (words.some((w) => w.startsWith(t))) score += 80;
        else if (name.includes(t)) score += 60;
        else if (relText.includes(t)) score += 40;
        else if (other.includes(t)) score += 25;
        else { score = -1; break; }
      }
      if (score > 0 && tokens.length > 1 && relText.includes(norm(q).trim())) score += 120; // whole phrase matches a relation
      if (score > 0) list.push({ p, score, visible: visible.has(p.id), rel: k });
    });
    return list.sort((a, b) => b.score - a.score || FT.fullName(a.p).localeCompare(FT.fullName(b.p)));
  }

  function mark(text, q) {
    const tokens = norm(q).split(/\s+/).filter(Boolean);
    const n = norm(text);
    if (n.length !== text.length) return esc(text);
    const on = new Array(text.length).fill(false);
    tokens.forEach((t) => { let i = n.indexOf(t); while (i >= 0) { for (let j = i; j < i + t.length; j++) on[j] = true; i = n.indexOf(t, i + t.length); } });
    let out = '';
    let open = false;
    [...text].forEach((ch, i) => {
      if (on[i] && !open) { out += '<mark>'; open = true; }
      if (!on[i] && open) { out += '</mark>'; open = false; }
      out += esc(ch);
    });
    return out + (open ? '</mark>' : '');
  }

  function renderResults() {
    const q = sInput.value;
    const fmt = FT.store.settings.dateFormat;
    if (!q.trim()) {
      hits = null;
      results = [];
      sList.innerHTML = '<li class="note">Search by name, place, profession or relation (for example <b>मामा</b> or <b>mother\'s brother</b>)</li>';
    } else {
      results = searchPeople(q);
      hits = new Set(results.filter((r) => r.visible).map((r) => r.p.id));
      if (active >= results.length) active = 0;
      const shown = results.slice(0, 40);
      sList.innerHTML = shown.length
        ? shown.map((r, i) => {
          const p = r.p;
          const initials = (p.name || '?').trim().charAt(0).toUpperCase();
          const sub = [p.city, p.profession, FT.formatDate(p.dob, fmt)].filter(Boolean).join(' · ');
          return `<li role="option" data-i="${i}" aria-selected="${i === active}">
            <span class="av ${esc(p.gender)}">${p.image ? `<img src="${esc(p.image)}" alt="">` : esc(initials)}</span>
            <span class="meta"><div class="nm">${mark(FT.fullName(p), q)}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</span>
            ${r.rel.mr && !r.rel.self ? `<span class="rel">${esc(r.rel.mr)}</span>` : r.rel.self ? '<span class="rel">★ main</span>' : ''}
            ${r.visible ? '' : '<span class="tag" title="Inside a folded branch; it opens when you pick it">folded</span>'}
          </li>`;
        }).join('') + (results.length > shown.length ? `<li class="note">${results.length - shown.length} more… keep typing to narrow down</li>` : '')
        : '<li class="note">No one matches that</li>';
    }
    sList.hidden = false;
    sInput.setAttribute('aria-expanded', 'true');
    applyHighlight();
  }

  // while searching, matching cards stay bright and the rest fade back
  function applyHighlight() {
    viewport.querySelectorAll('.card').forEach((g) => g.classList.toggle('dim', !!hits && !hits.has(g.dataset.id)));
  }

  function closeSearch(clear) {
    sList.hidden = true;
    sInput.setAttribute('aria-expanded', 'false');
    if (clear) { sInput.value = ''; hits = null; applyHighlight(); }
    sWrap.classList.remove('open');
  }

  function goToPerson(id) {
    hits = null;
    closeSearch(true);
    sInput.blur();
    if (inAlt()) {
      // another view: select the person and scroll to them (the row / card / slot)
      FT.select(id);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!FT.views.reveal(altHost, id)) showInTree(id);
      }));
      return;
    }
    const changed = FT.revealPerson(id);
    FT.select(id);
    // wait for the redraw (two frames), then centre on the person and pulse the card
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!scene || !scene.pos[id]) return;
      const r = svg.getBoundingClientRect();
      const c = scene.pos[id];
      const k = Math.max(view.k, changed ? 0.9 : 0.8);
      animateTo({ k, tx: r.width / 2 - c.x * k, ty: TOP_PAD + (r.height - TOP_PAD) / 2 - (c.y + scene.d.ch / 2) * k });
      const g = viewport.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
      if (g) { g.classList.add('found'); setTimeout(() => g.classList.remove('found'), 3400); }
    }));
  }

  sInput.addEventListener('input', () => { active = 0; renderResults(); });
  sInput.addEventListener('focus', () => { renderResults(); });
  sInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = Math.min(results.length, 40);
      if (!n) return;
      active = (active + (e.key === 'ArrowDown' ? 1 : n - 1)) % n;
      renderResults();
      const el = sList.querySelector('[aria-selected="true"]');
      if (el) el.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[active]) goToPerson(results[active].p.id);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      if (sInput.value) { sInput.value = ''; active = 0; renderResults(); } else { closeSearch(true); sInput.blur(); }
    }
  });
  sList.addEventListener('mousedown', (e) => {
    const li = e.target.closest('li[data-i]');
    if (li) { e.preventDefault(); goToPerson(results[+li.dataset.i].p.id); }
  });
  sList.addEventListener('mousemove', (e) => {
    const li = e.target.closest('li[data-i]');
    if (li && +li.dataset.i !== active) {
      active = +li.dataset.i;
      sList.querySelectorAll('li[data-i]').forEach((x) => x.setAttribute('aria-selected', String(+x.dataset.i === active)));
    }
  });
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#searchWrap') && !e.target.closest('#searchBtn')) { sList.hidden = true; sInput.setAttribute('aria-expanded', 'false'); if (!sInput.value) { hits = null; applyHighlight(); } sWrap.classList.remove('open'); }
  });
  $('#searchBtn').addEventListener('click', () => { sWrap.classList.add('open'); sInput.focus(); });
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || '')) || e.target.isContentEditable;
    if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey)) {
      e.preventDefault();
      sWrap.classList.add('open');
      sInput.focus();
      sInput.select();
    }
  });
  FT.onChange(() => { if (!sList.hidden && sInput.value) requestAnimationFrame(renderResults); });

  $('#hiddenChip').addEventListener('click', () => {
    FT.setSettings({ collapsed: [], collapsedUp: [], parts: { ancestors: true, siblings: true, descendants: true } });
    requestAnimationFrame(() => requestAnimationFrame(() => runView('fit')));
  });
  $('#year').textContent = new Date().getFullYear();

  // ---- light / dark theme ----------------------------------------------
  const THEME_ICONS = {
    sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM2 13h2a1 1 0 1 0 0-2H2a1 1 0 1 0 0 2zm18 0h2a1 1 0 1 0 0-2h-2a1 1 0 1 0 0 2zM11 2v2a1 1 0 1 0 2 0V2a1 1 0 1 0-2 0zm0 18v2a1 1 0 1 0 2 0v-2a1 1 0 1 0-2 0zM5.99 4.58a1 1 0 0 0-1.41 1.41l1.06 1.06a1 1 0 0 0 1.41-1.41L5.99 4.58zm12.37 12.37a1 1 0 0 0-1.41 1.41l1.06 1.06a1 1 0 0 0 1.41-1.41l-1.06-1.06zm1.06-10.96a1 1 0 0 0-1.41-1.41l-1.06 1.06a1 1 0 0 0 1.41 1.41l1.06-1.06zM7.05 18.36a1 1 0 0 0-1.41-1.41l-1.06 1.06a1 1 0 0 0 1.41 1.41l1.06-1.06z',
    moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'
  };
  function applyTheme(t, persist) {
    FT.theme = t;
    document.documentElement.setAttribute('data-theme', t);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', t === 'dark' ? '#0d1310' : '#f2f5f3');
    const b = $('#themeBtn');
    b.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="${t === 'dark' ? THEME_ICONS.sun : THEME_ICONS.moon}"/></svg>`;
    b.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    b.title = t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    if (persist) { try { localStorage.setItem('ftb.theme', t); } catch (e) { /* ignore */ } }
    if (scene) render();
  }
  $('#themeBtn').addEventListener('click', () => applyTheme(FT.theme === 'dark' ? 'light' : 'dark', true));
  try {
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('ftb.theme')) applyTheme(e.matches ? 'dark' : 'light', false);
    });
  } catch (e) { /* older browsers */ }
  applyTheme(FT.theme, false);
  const timeNow = (d) => (d || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  let lastLocalSave = null;
  function showStatus() {
    const el = $('#saveStatus');
    const s = FT.sync.state;
    el.className = 'save-status ' + s;
    if (FT.readOnly) {
      el.textContent = s === 'viewing' ? `👁 View-only link · you can look but not edit · updates live · ${timeNow(FT.sync.lastSync)}`
        : s === 'gone' ? 'This link is no longer available' : '⚠ Reconnecting to the server…';
      return;
    }
    if (s === 'online') {
      el.textContent = FT.sync.remoteAt && (!lastLocalSave || FT.sync.remoteAt > lastLocalSave)
        ? `↻ Updated from another browser at ${timeNow(FT.sync.remoteAt)} · saved to server`
        : `✓ Saved to server and synced with all browsers · ${timeNow(FT.sync.lastSync)}`;
    } else if (s === 'locked') {
      el.textContent = `✓ Autosaved in this browser only${lastLocalSave ? ' at ' + timeNow(lastLocalSave) : ''} · sign in to save your trees on the server and sync browsers`;
    } else if (s === 'error') {
      el.textContent = `⚠ Could not save to the server: ${FT.sync.error}. Your changes are kept in this browser.`;
    } else if (s === 'offline') {
      el.textContent = '⚠ Server not reachable: saved in this browser only, will sync automatically when the server is back';
    } else {
      el.textContent = `✓ Autosaved in this browser${lastLocalSave ? ' at ' + timeNow(lastLocalSave) : ''} · run start.cmd to sync across browsers`;
    }
  }
  window.addEventListener('ft:saved', () => { lastLocalSave = new Date(); showStatus(); });
  window.addEventListener('ft:syncstate', showStatus);

  // ---- routing ---------------------------------------------------------
  function route() {
    const path = decodeURIComponent((location.hash || '').replace(/^#\/?/, ''));
    const page = FT.PAGES[path];
    const home = $('#home');
    const pg = $('#page');
    if (page) {
      home.hidden = true;
      pg.hidden = false;
      pg.innerHTML = `<article><h1>${esc(page.title)}</h1>${page.html}</article>`;
      document.title = `${page.title} | Family Tree Builder`;
      const form = $('#contactForm');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const d = new FormData(form);
          location.href = `mailto:hello@example.com?subject=${encodeURIComponent('Family Tree Builder feedback')}&body=${encodeURIComponent(d.get('message') + '\n\nFrom: ' + d.get('email'))}`;
        });
      }
      window.scrollTo(0, 0);
    } else {
      const wasHidden = home.hidden;
      pg.hidden = true;
      home.hidden = false;
      document.title = 'Online Family Tree Maker | Family Tree Builder';
      if (wasHidden) requestAnimationFrame(() => { fitPending = true; initialFocus = true; draw(); });
    }
  }
  window.addEventListener('hashchange', route);

  FT.load();
  FT.save({ local: true });
  route();
  if (!$('#home').hidden) draw();
  FT.sync.start();
  if (inAlt()) setView(FT.viewState.view, true);
})();
