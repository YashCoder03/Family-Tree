(function () {
  const FT = window.FT;
  const esc = FT.esc;

  // ---- per-browser view settings ------------------------------------------
  const KEY = 'ftb.viewstate';
  const state = (FT.viewState = Object.assign(
    { view: 'tree', anc: 5, desc: 4, fan: 5, center: null, sortCol: 'name', sortDir: 1, filter: '', openDepth: 2 },
    (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })()
  ));
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } };
  FT.saveViewState = save;

  const VIEWS = [
    { id: 'tree', name: 'Family tree', desc: 'The full interactive tree with fold / unfold', icon: 'M22 11V3h-7v3H9V3H2v8h7V8h2v10h4v3h7v-8h-7v3h-2V8h2v3z' },
    { id: 'anc', name: 'Ancestors chart', desc: 'Parents above, father left and mother right', icon: 'M12 4l-8 8h5v8h6v-8h5z' },
    { id: 'desc', name: 'Descendants chart', desc: 'One person and everyone who descends from them', icon: 'M12 20l8-8h-5V4H9v8H4z' },
    { id: 'fan', name: 'Fan chart', desc: 'Half-circle of ancestors, generation by generation', icon: 'M12 3a9 9 0 0 0-9 9h2a7 7 0 0 1 14 0h2a9 9 0 0 0-9-9zm0 5a4 4 0 0 0-4 4h2a2 2 0 0 1 4 0h2a4 4 0 0 0-4-4z' },
    { id: 'gens', name: 'Generations', desc: 'Everyone grouped by generation in a tidy grid', icon: 'M3 5h18v3H3zm0 5.5h18v3H3zM3 16h18v3H3z' },
    { id: 'outline', name: 'Outline', desc: 'Indented list you can open and close', icon: 'M3 4h18v2H3zm4 5h14v2H7zm4 5h10v2H11zm-4 5h14v2H7z' },
    { id: 'list', name: 'List / table', desc: 'Sortable table with search and filters', icon: 'M3 5h18v2H3zm0 6h18v2H3zm0 6h18v2H3z' },
    { id: 'timeline', name: 'Timeline', desc: 'Lifespans on a time axis', icon: 'M3 6h12v3H3zm6 5h12v3H9zm-4 5h10v3H5z' }
  ];
  FT.VIEWS = VIEWS;

  const P = () => FT.store.tree.people;
  const mainId = () => FT.store.tree.rootId;
  const year = (iso) => (/^\d{4}/.test(iso || '') ? +iso.slice(0, 4) : null);

  function ageOf(p) {
    if (!p.dob) return '';
    const b = new Date(p.dob);
    const e = p.dod ? new Date(p.dod) : new Date();
    if (isNaN(b) || isNaN(e)) return '';
    const a = Math.floor((e - b) / (365.2425 * 864e5));
    return a >= 0 ? String(a) : '';
  }

  function dates(p) {
    const fmt = FT.store.settings.dateFormat;
    const b = FT.formatDate(p.dob, fmt);
    const d = FT.formatDate(p.dod, fmt);
    return b && d ? `${b} – ${d}` : b || (d ? `† ${d}` : '');
  }

  function avatar(p) {
    return p.image ? `<img src="${esc(p.image)}" alt="">` : esc((p.name || '?').trim().charAt(0).toUpperCase());
  }

  // person card used by most views
  function chip(p, kin, o) {
    o = o || {};
    const k = kin[p.id];
    const sub = [dates(p), p.city].filter(Boolean).join(' · ');
    return `<div class="pc ${esc(p.gender)}${p.id === FT.store.selectedId ? ' sel' : ''}${p.id === mainId() ? ' main' : ''}${o.small ? ' small' : ''}" data-id="${esc(p.id)}" tabindex="0" title="${esc(FT.fullName(p))} — double-click to ${o.center ? 'centre here' : 'show in the tree'}">
      <span class="pc-av">${avatar(p)}</span>
      <span class="pc-body"><b class="pc-name">${esc(FT.fullName(p))}</b>${k && !k.self ? `<span class="pc-rel">${esc(k.mr)}${k.side ? ' · ' + esc(k.side) : ''}</span>` : k ? '<span class="pc-rel">★ main person</span>' : ''}${sub && !o.small ? `<span class="pc-sub">${esc(sub)}</span>` : ''}</span>
    </div>`;
  }

  const byBirth = (a, b) => (a.dob || '9999').localeCompare(b.dob || '9999') || a.id.localeCompare(b.id, undefined, { numeric: true });
  const kidsOf = (ids) => Object.values(P()).filter((c) => ids.some((i) => c.parentIds.includes(i))).sort(byBirth);

  function centreId() {
    const id = state.center;
    return id && P()[id] ? id : mainId();
  }

  // ---- ancestors / descendants (org-chart style) --------------------------
  function ancNode(id, depth, kin, seen) {
    const p = P()[id];
    const ps = p.parentIds.map((x) => P()[x]).filter(Boolean).sort((a, b) => (a.gender === 'male' ? 0 : a.gender === 'female' ? 2 : 1) - (b.gender === 'male' ? 0 : b.gender === 'female' ? 2 : 1));
    const more = ps.length && depth <= 0 ? `<div class="more" title="${ps.length} more above">＋</div>` : '';
    const up = depth > 0 && ps.length ? `<ul>${ps.filter((x) => !seen.has(x.id)).map((x) => { seen.add(x.id); return ancNode(x.id, depth - 1, kin, seen); }).join('')}</ul>` : '';
    return `<li>${chip(p, kin, { center: true })}${more}${up}</li>`;
  }

  function descNode(id, depth, kin, seen) {
    const p = P()[id];
    const unit = [p, ...p.partnerIds.map((x) => P()[x]).filter((x) => x && !seen.has(x.id))];
    unit.forEach((u) => seen.add(u.id));
    unit.sort((a, b) => (a.gender === 'male' ? 0 : a.gender === 'female' ? 2 : 1) - (b.gender === 'male' ? 0 : b.gender === 'female' ? 2 : 1));
    const kids = kidsOf(unit.map((u) => u.id)).filter((c) => !seen.has(c.id));
    const couple = `<div class="couple">${unit.map((u) => chip(u, kin, { center: true })).join('')}</div>`;
    if (!kids.length) return `<li>${couple}</li>`;
    if (depth <= 0) return `<li>${couple}<div class="more" title="${kids.length} children below">＋${kids.length}</div></li>`;
    kids.forEach((c) => seen.add(c.id));
    return `<li>${couple}<ul>${kids.map((c) => descNode(c.id, depth - 1, kin, seen)).join('')}</ul></li>`;
  }

  function depthControl(key, label, min, max) {
    return `<span class="ctl"><span class="ctl-l">${label}</span><button class="btn mini" data-depth="${key}" data-d="-1" ${state[key] <= min ? 'disabled' : ''}>−</button><b>${state[key]}</b><button class="btn mini" data-depth="${key}" data-d="1" ${state[key] >= max ? 'disabled' : ''}>＋</button></span>`;
  }

  function centreControl() {
    const c = P()[centreId()];
    return `<span class="ctl"><span class="ctl-l">Centred on</span><b class="ctl-name">${esc(FT.fullName(c))}</b>
      <button class="btn mini" data-act="useSelected">Use selected</button><button class="btn mini" data-act="useMain">Main person</button></span>`;
  }

  function renderAnc(kin) {
    const id = centreId();
    const tree = `<ul class="org flip">${ancNode(id, state.anc, kin, new Set([id]))}</ul>`;
    return {
      title: 'Ancestors chart',
      controls: centreControl() + depthControl('anc', 'Generations', 1, 8),
      body: `<div class="org-scroll">${tree}</div>`
    };
  }

  function renderDesc(kin) {
    const id = centreId();
    return {
      title: 'Descendants chart',
      controls: centreControl() + depthControl('desc', 'Generations', 1, 8),
      body: `<div class="org-scroll"><ul class="org">${descNode(id, state.desc, kin, new Set())}</ul></div>`
    };
  }

  // ---- fan chart ----------------------------------------------------------
  function renderFan(kin) {
    const rootId = centreId();
    const gens = state.fan;
    const ring = 82;
    const r0 = 62;
    const R = r0 + gens * ring;
    const W = 2 * R + 40;
    const H = R + 70;
    const cx = W / 2;
    const cy = H - 40;
    const pt = (t, r) => [cx + r * Math.cos(t), cy + r * Math.sin(t)];
    const fill = { male: 'var(--male-bg)', female: 'var(--female-bg)', '': 'var(--neutral-bg)' };
    let svg = '';
    const slots = (id, g, i) => {
      const p = id && P()[id];
      if (g > 0) {
        const span = Math.PI / 2 ** g;
        const t0 = Math.PI + i * span;
        const t1 = t0 + span;
        const rIn = r0 + (g - 1) * ring;
        const rOut = rIn + ring;
        const [x0, y0] = pt(t0, rOut);
        const [x1, y1] = pt(t1, rOut);
        const [x2, y2] = pt(t1, rIn);
        const [x3, y3] = pt(t0, rIn);
        const d = `M${x0} ${y0}A${rOut} ${rOut} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${rIn} ${rIn} 0 0 0 ${x3} ${y3}Z`;
        const tm = (t0 + t1) / 2;
        const [tx, ty] = pt(tm, (rIn + rOut) / 2);
        const deg = (tm * 180) / Math.PI;
        const flat = g <= 2;
        let rot = flat ? 0 : deg > 270 ? deg : deg - 180;
        if (flat) rot = 0;
        const label = p ? FT.fullName(p) : '';
        const maxChars = flat ? 16 : Math.max(6, Math.floor((ring - 6) / 5.4));
        const short = label.length > maxChars ? label.slice(0, maxChars - 1) + '…' : label;
        const k = p && kin[p.id];
        svg += `<g class="fan-slot${p ? '' : ' empty'}" ${p ? `data-id="${esc(p.id)}"` : ''}>
          <path d="${d}" fill="${p ? fill[p.gender] || fill[''] : 'transparent'}"/>
          ${p ? `<text transform="translate(${tx} ${ty}) rotate(${rot})" text-anchor="middle" font-size="${flat ? 11.5 : 10.5}"><tspan x="0" dy="${k && flat ? '-0.2em' : '0.35em'}" font-weight="700">${esc(short)}</tspan>${k && flat ? `<tspan x="0" dy="1.35em" class="fan-rel">${esc(k.mr)}</tspan>` : ''}</text><title>${esc(label)}${k ? ' · ' + esc(k.mr) : ''}${dates(p) ? ' · ' + esc(dates(p)) : ''}</title>` : ''}
        </g>`;
      }
      if (g < gens && p) {
        const ps = p.parentIds.map((x) => P()[x]).filter(Boolean).sort((a, b) => (a.gender === 'male' ? 0 : 1) - (b.gender === 'male' ? 0 : 1));
        // father in the left slot, mother in the right slot
        const father = ps.find((x) => x.gender === 'male') || (ps.find((x) => x.gender !== 'female') || null);
        const mother = ps.find((x) => x.gender === 'female') || ps.find((x) => x !== father) || null;
        slots(father && father.id, g + 1, i * 2);
        slots(mother && mother.id && mother !== father ? mother.id : null, g + 1, i * 2 + 1);
      }
    };
    slots(rootId, 0, 0);
    const root = P()[rootId];
    const sel = rootId === FT.store.selectedId ? ' sel' : '';
    svg += `<g class="fan-slot fan-root${sel}" data-id="${esc(rootId)}"><circle cx="${cx}" cy="${cy}" r="${r0 - 4}" fill="${fill[root.gender] || fill['']}"/>
      <text x="${cx}" y="${cy - 14}" text-anchor="middle" font-size="13" font-weight="800">${esc(FT.fullName(root).slice(0, 18))}</text>
      <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="11" class="fan-rel">${esc((kin[rootId] || {}).mr || '')}</text>
      <text x="${cx}" y="${cy + 20}" text-anchor="middle" font-size="10" class="fan-sub">${esc(dates(root))}</text></g>`;
    return {
      title: 'Fan chart',
      controls: centreControl() + depthControl('fan', 'Generations', 2, 6),
      body: `<div class="fan-wrap"><svg class="fan" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Fan chart of ancestors">${svg}</svg></div>`
    };
  }

  // ---- generations --------------------------------------------------------
  function renderGens(kin) {
    const all = Object.values(P());
    const lay = FT.layout(all, { rootId: mainId(), cw: 156, ch: 196, hgap: 28, vgap: 56, pgap: 16 });
    const groups = {};
    all.forEach((p) => { (groups[lay.level[p.id]] = groups[lay.level[p.id]] || []).push(p); });
    const levels = Object.keys(groups).map(Number).sort((a, b) => a - b);
    const body = levels.map((lv) => {
      const g = groups[lv].sort((a, b) => lay.pos[a.id].x - lay.pos[b.id].x);
      const ys = g.map((p) => year(p.dob)).filter(Boolean);
      const span = ys.length ? `${Math.min(...ys)}${Math.max(...ys) !== Math.min(...ys) ? '–' + Math.max(...ys) : ''}` : 'dates unknown';
      return `<section class="gen"><h3><span class="gen-n">Generation ${lv + 1}</span><span class="gen-meta">${g.length} ${g.length === 1 ? 'person' : 'people'} · born ${span}</span></h3>
        <div class="gen-grid">${g.map((p) => chip(p, kin)).join('')}</div></section>`;
    }).join('');
    return { title: 'Generations', controls: '<span class="ctl-l">Families stay side by side, oldest generation first</span>', body: `<div class="gens">${body}</div>` };
  }

  // ---- outline ------------------------------------------------------------
  function renderOutline(kin) {
    const people = P();
    const all = Object.values(people);
    const idx = new Map(all.map((p, i) => [p.id, i]));
    const shown = new Set();
    const roots = all.filter((p) => !p.parentIds.length)
      .filter((p) => !p.partnerIds.some((q) => people[q] && people[q].parentIds.length))
      .sort((a, b) => byBirth(a, b));
    const node = (p, depth) => {
      if (shown.has(p.id)) return '';
      const unit = [p, ...p.partnerIds.map((x) => people[x]).filter((x) => x && !shown.has(x.id))];
      unit.forEach((u) => shown.add(u.id));
      const kids = kidsOf(unit.map((u) => u.id)).filter((c) => !shown.has(c.id));
      const head = `<span class="ol-unit">${unit.map((u, i) => (i ? '<span class="ol-join">⚭</span>' : '') + chip(u, kin, { small: true })).join('')}</span>${kids.length ? `<span class="ol-count">${kids.length}</span>` : ''}`;
      if (!kids.length) return `<div class="ol-leaf">${head}</div>`;
      const body = kids.map((c) => node(c, depth + 1)).join('');
      return `<details class="ol-node" ${depth < state.openDepth ? 'open' : ''}><summary>${head}</summary><div class="ol-kids">${body}</div></details>`;
    };
    const html = roots.map((r) => node(r, 0)).join('');
    const rest = all.filter((p) => !shown.has(p.id)).map((p) => `<div class="ol-leaf">${chip(p, kin, { small: true })}</div>`).join('');
    return {
      title: 'Outline',
      controls: '<button class="btn mini" data-act="openAll">Open all</button><button class="btn mini" data-act="closeAll">Close all</button>',
      body: `<div class="outline">${html}${rest ? `<h4 class="ol-h">Not connected to the lines above</h4>${rest}` : ''}</div>`
    };
  }

  // ---- list / table -------------------------------------------------------
  const COLS = [
    ['name', 'Name'], ['rel', 'Relation'], ['gender', 'Gender'], ['dob', 'Born'], ['dod', 'Died'], ['age', 'Age'],
    ['city', 'City'], ['profession', 'Profession'], ['parents', 'Parents'], ['partners', 'Partners'], ['kids', 'Children']
  ];
  function renderList(kin) {
    const people = P();
    const fmt = FT.store.settings.dateFormat;
    const nameOf = (id) => (people[id] ? FT.fullName(people[id]) : '');
    const rows = Object.values(people).map((p) => ({
      p,
      name: FT.fullName(p),
      rel: (kin[p.id] || {}).mr || '',
      gender: p.gender,
      dob: p.dob || '',
      dod: p.dod || '',
      age: ageOf(p),
      city: p.city,
      profession: p.profession,
      parents: p.parentIds.map(nameOf).join(', '),
      partners: p.partnerIds.map(nameOf).join(', '),
      kids: Object.values(people).filter((c) => c.parentIds.includes(p.id)).length
    }));
    const f = state.filter.trim().toLowerCase();
    let list = rows.filter((r) => !f || [r.name, r.rel, r.gender, r.city, r.profession, r.parents, r.partners, r.p.facts].join(' ').toLowerCase().includes(f));
    const col = state.sortCol;
    list.sort((a, b) => {
      const x = a[col];
      const y = b[col];
      const num = typeof x === 'number' || col === 'age';
      const c = num ? (+x || -1) - (+y || -1) : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' });
      return c * state.sortDir || a.name.localeCompare(b.name);
    });
    const cell = (r, c) => {
      if (c === 'name') return `<td class="t-name"><span class="pc-av ${esc(r.p.gender)}">${avatar(r.p)}</span>${esc(r.name)}</td>`;
      if (c === 'dob' || c === 'dod') return `<td>${esc(FT.formatDate(r[c], fmt))}</td>`;
      if (c === 'gender') return `<td>${esc(r.gender ? r.gender.charAt(0).toUpperCase() + r.gender.slice(1) : '')}</td>`;
      if (c === 'kids') return `<td class="num">${r.kids || ''}</td>`;
      if (c === 'age') return `<td class="num">${esc(r.age)}</td>`;
      return `<td>${esc(r[c])}</td>`;
    };
    const head = COLS.map(([k, l]) => `<th data-sort="${k}" class="${state.sortCol === k ? 'on' : ''}">${l}<i>${state.sortCol === k ? (state.sortDir > 0 ? '▲' : '▼') : ''}</i></th>`).join('');
    const body = list.map((r) => `<tr data-id="${esc(r.p.id)}" class="${r.p.id === FT.store.selectedId ? 'sel' : ''}" tabindex="0">${COLS.map(([c]) => cell(r, c)).join('')}</tr>`).join('');
    return {
      title: 'List / table',
      controls: `<input class="list-filter" id="listFilter" type="search" placeholder="Filter this list…" value="${esc(state.filter)}"><span class="ctl-l">${list.length} of ${rows.length}</span>`,
      body: `<div class="table-wrap"><table class="people-table"><thead><tr>${head}</tr></thead><tbody>${body || '<tr><td colspan="11" class="muted">No one matches that filter</td></tr>'}</tbody></table></div>`
    };
  }

  // ---- timeline -----------------------------------------------------------
  function renderTimeline(kin) {
    const now = new Date().getFullYear();
    const withDob = Object.values(P()).filter((p) => year(p.dob)).sort(byBirth);
    const without = Object.values(P()).filter((p) => !year(p.dob));
    if (!withDob.length) {
      return { title: 'Timeline', controls: '', body: '<div class="empty-view">Add birth dates to people to see them on the timeline.</div>' };
    }
    const min = Math.floor(Math.min(...withDob.map((p) => year(p.dob))) / 10) * 10;
    const max = Math.max(now, ...withDob.map((p) => year(p.dod) || 0)) + 1;
    const pct = (y) => ((y - min) / (max - min)) * 100;
    const ticks = [];
    for (let y = min; y <= max; y += 10) ticks.push(y);
    const axis = ticks.map((y) => `<span class="tl-tick" style="left:${pct(y)}%">${y}</span>`).join('');
    const grid = ticks.map((y) => `<i class="tl-grid" style="left:${pct(y)}%"></i>`).join('');
    const rows = withDob.map((p) => {
      const b = year(p.dob);
      const d = year(p.dod);
      const end = d || now;
      const left = pct(b);
      const width = Math.max(0.6, pct(end) - left);
      const k = kin[p.id];
      return `<div class="tl-row${p.id === FT.store.selectedId ? ' sel' : ''}" data-id="${esc(p.id)}" tabindex="0">
        <div class="tl-label"><b>${esc(FT.fullName(p))}</b>${k && !k.self ? `<span class="pc-rel">${esc(k.mr)}</span>` : ''}</div>
        <div class="tl-track">${grid}<span class="tl-bar ${esc(p.gender)}${d ? '' : ' alive'}" style="left:${left}%;width:${width}%" title="${esc(FT.fullName(p))}: ${b}–${d || 'now'}"><em>${b}${d ? '–' + d : ''}</em></span></div>
      </div>`;
    }).join('');
    return {
      title: 'Timeline',
      controls: '<span class="ctl-l">Bars show each life from birth to death (open-ended = living)</span>',
      body: `<div class="timeline"><div class="tl-head"><div class="tl-label"></div><div class="tl-track tl-axis">${axis}</div></div>${rows}
        ${without.length ? `<h4 class="ol-h">No birth date (${without.length})</h4><div class="gen-grid">${without.map((p) => chip(p, kin, { small: true })).join('')}</div>` : ''}</div>`
    };
  }

  // ---- host ---------------------------------------------------------------
  const RENDER = { anc: renderAnc, desc: renderDesc, fan: renderFan, gens: renderGens, outline: renderOutline, list: renderList, timeline: renderTimeline };

  FT.views = {
    // fills the host element for the current alternative view
    render(host) {
      const fn = RENDER[state.view];
      if (!fn) return;
      const prev = host.querySelector('.alt-body');
      const sx = prev ? prev.scrollLeft : 0;
      const sy = prev ? prev.scrollTop : 0;
      const kin = FT.kinship();
      const out = fn(kin);
      const meta = VIEWS.find((v) => v.id === state.view);
      host.innerHTML = `<div class="alt-head"><div class="alt-title"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="${meta.icon}"/></svg><h2>${esc(out.title)}</h2></div>
        <div class="alt-controls">${out.controls}<button class="btn mini" data-act="print" title="Print this view">Print</button></div></div>
        <div class="alt-body" id="altBody">${out.body}</div>`;
      const body = host.querySelector('.alt-body');
      if (!state.resetScroll) { body.scrollLeft = sx; body.scrollTop = sy; }
      else if (['anc', 'desc', 'fan'].includes(state.view)) {
        // start centred on the person at the middle / bottom of the chart
        body.scrollLeft = (body.scrollWidth - body.clientWidth) / 2;
        body.scrollTop = state.view === 'desc' ? 0 : body.scrollHeight;
      }
      state.resetScroll = false;
    },
    // scroll a person into view in the current alternative view and flash them
    reveal(host, id) {
      const el = host.querySelector(`[data-id="${CSS.escape(id)}"]`);
      if (!el) return false;
      el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 2200);
      return true;
    }
  };

  // click handling shared by all views (installed by app.js)
  FT.views.handle = function (host, e, kind) {
    const depth = e.target.closest('[data-depth]');
    if (depth && kind === 'click') {
      const k = depth.dataset.depth;
      state[k] = Math.max(1, Math.min(8, state[k] + +depth.dataset.d));
      state.resetScroll = true;
      save();
      return 'render';
    }
    const act = e.target.closest('[data-act]');
    if (act && kind === 'click') {
      const a = act.dataset.act;
      if (a === 'useSelected') { state.center = FT.store.selectedId; state.resetScroll = true; save(); return 'render'; }
      if (a === 'useMain') { state.center = mainId(); state.resetScroll = true; save(); return 'render'; }
      if (a === 'openAll') { host.querySelectorAll('details').forEach((d) => { d.open = true; }); return 'none'; }
      if (a === 'closeAll') { host.querySelectorAll('details').forEach((d) => { d.open = false; }); return 'none'; }
      if (a === 'print') { window.print(); return 'none'; }
    }
    const th = e.target.closest('[data-sort]');
    if (th && kind === 'click') {
      const c = th.dataset.sort;
      if (state.sortCol === c) state.sortDir *= -1; else { state.sortCol = c; state.sortDir = 1; }
      save();
      return 'render';
    }
    const el = e.target.closest('[data-id]');
    if (el && !e.target.closest('summary .ol-join')) {
      const id = el.dataset.id;
      if (kind === 'dblclick') {
        if (['anc', 'desc', 'fan'].includes(state.view)) { state.center = id; state.resetScroll = true; save(); FT.select(id); return 'render'; }
        return { showInTree: id };
      }
      if (kind === 'click') { FT.select(id); return 'none'; }
    }
    return 'none';
  };
})();
