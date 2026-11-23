(function () {
  const FT = window.FT;
  const FONT = 'Inter, "Segoe UI Variable Text", "Segoe UI", system-ui, "Nirmala UI", "Noto Sans Devanagari", Arial, sans-serif';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  FT.esc = esc;
  FT.FONT = FONT;

  const ctx = document.createElement('canvas').getContext('2d');
  function wrap(text, font, maxW, maxLines) {
    ctx.font = font;
    const width = (s) => ctx.measureText(s).width;
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = '';
    const pushWord = (w) => {
      while (width(w) > maxW && w.length > 1) {
        let n = w.length - 1;
        while (n > 1 && width(w.slice(0, n)) > maxW) n--;
        lines.push(w.slice(0, n));
        w = w.slice(n);
      }
      cur = w;
    };
    words.forEach((w) => {
      if (!cur) return pushWord(w);
      if (width(cur + ' ' + w) <= maxW) cur += ' ' + w;
      else { lines.push(cur); cur = ''; pushWord(w); }
    });
    if (cur) lines.push(cur);
    if (lines.length > maxLines) {
      lines.length = maxLines;
      let last = lines[maxLines - 1];
      while (last.length > 1 && width(last + '…') > maxW) last = last.slice(0, -1);
      lines[maxLines - 1] = last + '…';
    }
    return lines;
  }

  FT.dims = function (style, s) {
    const base = { classic: [156, 196, 34], compact: [176, 66, 22], photo: [150, 196, 40] }[style] || [156, 196, 34];
    return { cw: base[0] * s, ch: base[1] * s, hgap: 28 * s, vgap: 56 * s, pgap: 16 * s };
  };

  // ---- family connectors: geometry shared by the layout spacing and the line drawing
  const LANE = 14;      // distance between neighbouring bus lines
  const BUS_TOP = 16;   // first bus line below the parents
  const BUS_BOTTOM = 18; // clear space kept above the children

  function buildFamilies(vis, pos, d) {
    const present = new Set(vis.map((p) => p.id));
    const fams = new Map();
    vis.forEach((c) => {
      const ps = c.parentIds.filter((id) => present.has(id));
      if (!ps.length) return;
      const key = ps.slice().sort().join('|');
      if (!fams.has(key)) fams.set(key, { key, ps, kids: [] });
      fams.get(key).kids.push(c.id);
    });
    const list = [...fams.values()];
    list.forEach((f) => {
      if (f.ps.length >= 2) {
        const a = pos[f.ps[0]];
        const b = pos[f.ps[1]];
        const touching = Math.abs(a.x - b.x) <= d.cw + d.pgap + 1 && a.y === b.y;
        f.ax = touching ? (a.x + b.x) / 2 : a.x;
        f.ay = touching ? Math.max(a.y, b.y) + d.ch / 2 : a.y + d.ch;
      } else {
        f.ax = pos[f.ps[0]].x;
        f.ay = pos[f.ps[0]].y + d.ch;
      }
      f.bottom = Math.max(...f.ps.map((i) => pos[i].y + d.ch));
      f.kidTop = Math.min(...f.kids.map((k) => pos[k].y));
      const xs = [f.ax, ...f.kids.map((k) => pos[k].x)];
      f.left = Math.min(...xs);
      f.right = Math.max(...xs);
    });
    return list;
  }

  // Families whose spans overlap on one generation gap get different lanes (rows of the gap).
  // A deeper lane's junction line crosses the lanes above it, so wide families go to the top lanes.
  function assignLanes(list) {
    const rows = new Map();
    list.forEach((f) => {
      const k = Math.round(f.bottom);
      if (!rows.has(k)) rows.set(k, { bottom: f.bottom, minKidTop: Infinity, lanes: 0, fams: [] });
      const r = rows.get(k);
      r.fams.push(f);
      r.minKidTop = Math.min(r.minKidTop, f.kidTop);
    });
    rows.forEach((r) => {
      const order = r.fams.slice().sort((a, b) => (b.right - b.left) - (a.right - a.left) || a.left - b.left);
      const lanes = [];
      order.forEach((f) => {
        const clash = (lane) => lane.some(([l, rr]) => f.left < rr + 14 && f.right > l - 14);
        let k = lanes.findIndex((lane) => !clash(lane));
        if (k < 0) { k = lanes.length; lanes.push([]); }
        lanes[k].push([f.left, f.right]);
        f.lane = k;
      });
      r.lanes = lanes.length;
    });
    return rows;
  }

  FT.scene = function () {
    const { settings } = FT.store;
    const s = FT.FONT_SCALE[settings.fontSize] || 1;
    const d = FT.dims(settings.style, s);
    const vis = FT.visiblePeople();
    const lay = FT.layout(vis, Object.assign({ rootId: FT.store.tree.rootId }, d));

    // open up each generation gap just enough for its connector lanes
    const rows0 = assignLanes(buildFamilies(vis, lay.pos, d));
    const lanesAt = {};
    rows0.forEach((r) => { lanesAt[Math.round((r.bottom - d.ch) / (d.ch + d.vgap))] = r.lanes; });
    const maxLevel = Math.max(...Object.values(lay.level));
    const yOf = [0];
    for (let l = 0; l < maxLevel; l++) {
      const gap = Math.max(d.vgap, (BUS_TOP + BUS_BOTTOM) * s + Math.max(0, (lanesAt[l] || 1) - 1) * LANE * s);
      yOf.push(yOf[l] + d.ch + gap);
    }
    const auto = {};
    vis.forEach((p) => { auto[p.id] = { x: lay.pos[p.id].x, y: yOf[lay.level[p.id]] }; });

    const pos = {};
    vis.forEach((p) => {
      const a = auto[p.id];
      pos[p.id] = settings.manual && p.mx != null ? { x: p.mx, y: p.my } : { x: a.x, y: a.y };
    });
    const ids = Object.keys(pos);
    const pad = 30;
    const b = {
      x0: Math.min(...ids.map((i) => pos[i].x - d.cw / 2)) - pad,
      y0: Math.min(...ids.map((i) => pos[i].y)) - pad,
      x1: Math.max(...ids.map((i) => pos[i].x + d.cw / 2)) + pad,
      y1: Math.max(...ids.map((i) => pos[i].y + d.ch)) + pad
    };
    return { vis, pos, auto, d, s, bounds: b, rel: FT.kinship() };
  };

  const AVATAR = {
    male: ['#a9c3d8', '#5f7f99'],
    female: ['#e8bccb', '#a3637b'],
    '': ['#cfd8cf', '#7d8e80']
  };

  function avatar(cx, cy, r, gender, uid) {
    const [bg, fg] = AVATAR[gender] || AVATAR[''];
    return `<g clip-path="url(#clip-${uid})"><rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" fill="${bg}"/>` +
      `<circle cx="${cx}" cy="${cy - r * 0.18}" r="${r * 0.36}" fill="${fg}"/>` +
      `<ellipse cx="${cx}" cy="${cy + r * 0.98}" rx="${r * 0.7}" ry="${r * 0.62}" fill="${fg}"/></g>`;
  }

  function photo(p, cx, cy, r, uid, round) {
    const clip = round
      ? `<clipPath id="clip-${uid}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`
      : `<clipPath id="clip-${uid}"><rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" rx="6"/></clipPath>`;
    const body = p.image
      ? `<image href="${esc(p.image)}" x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-${uid})"/>`
      : avatar(cx, cy, r, p.gender, uid);
    const ring = round
      ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#7f9985" stroke-width="1.2"/>`
      : `<rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" rx="6" fill="none" stroke="#7f9985" stroke-width="1.2"/>`;
    return `<defs>${clip}</defs>${body}${ring}`;
  }

  function text(lines, x, y, size, lh, attrs, anchor) {
    return lines.map((l, i) => `<text x="${x}" y="${y + i * lh}" font-size="${size}" text-anchor="${anchor || 'middle'}" ${attrs}>${esc(l)}</text>`).join('');
  }

  function card(p, pt, sc, selected, forExport) {
    const { d, s } = sc;
    const st = FT.store.settings;
    const show = st.show;
    const style = st.style;
    const w = d.cw;
    const h = d.ch;
    const x = pt.x - w / 2;
    const uid = p.id.replace(/[^\w-]/g, '_');
    const dates = show.dates ? dateLine(p, st.dateFormat) : '';
    const name = FT.fullName(p);
    let out = '';
    const fill = p.gender === 'female' ? '#e4dfe0' : p.gender === 'male' ? '#d4e1d6' : '#dfe6dc';
    const isMain = p.id === FT.store.tree.rootId;
    const stroke = selected && !forExport ? '#304737' : isMain ? '#c9962b' : '#8aa58f';
    const sw = selected && !forExport ? 3 : isMain ? 2.8 : 1.2;
    out += `<rect class="card-bg" width="${w}" height="${h}" rx="${9 * s}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    if (style === 'compact') {
      const r = 22 * s;
      if (show.photo) out += photo(p, 8 * s + r, h / 2, r, uid, true);
      const tx = show.photo ? 16 * s + 2 * r : 10 * s;
      const maxW = w - tx - 8 * s;
      const nl = wrap(name, `bold ${12 * s}px ${FONT}`, maxW, 2);
      const rel = show.relation && sc.rel && sc.rel[p.id];
      const relText = rel ? wrap(rel.mr, `bold ${10.5 * s}px ${FONT}`, maxW, 1) : null;
      const total = nl.length * 13 * s + (relText ? 12 * s : 0) + (dates ? 12 * s : 0);
      let y = (h - total) / 2 + 10 * s;
      out += text(nl, tx, y, 12 * s, 13 * s, 'font-weight="bold" fill="#1f2d23"', 'start');
      y += nl.length * 13 * s;
      if (relText) { out += text(relText, tx, y, 10.5 * s, 12 * s, 'font-weight="bold" fill="#8a4b14"', 'start'); y += 12 * s; }
      if (dates) out += text([dates], tx, y, 10 * s, 12 * s, 'fill="#3e5444"', 'start');
    } else {
      const big = style === 'photo';
      const r = (big ? 48 : 28) * s;
      let y = 10 * s;
      if (show.photo) { out += photo(p, w / 2, y + r, r, uid, !big); y += 2 * r + 12 * s; } else y += 6 * s;
      const nl = wrap(name, `bold ${12.5 * s}px ${FONT}`, w - 14 * s, 2);
      out += text(nl, w / 2, y + 8 * s, 12.5 * s, 14 * s, 'font-weight="bold" fill="#1f2d23"');
      y += nl.length * 14 * s + 4 * s;
      const rel = show.relation && sc.rel && sc.rel[p.id];
      if (rel) {
        const label = rel.side ? `${rel.mr} (${rel.side})` : rel.mr;
        out += text(wrap(label, `bold ${10.5 * s}px ${FONT}`, w - 14 * s, 1), w / 2, y + 6 * s, 10.5 * s, 12 * s, 'font-weight="bold" fill="#8a4b14"');
        y += 14 * s;
      }
      if (show.city && p.city) {
        out += text([p.city], w / 2, y + 5 * s, 9.5 * s, 11 * s, 'fill="#3e5444"');
        y += 12 * s;
      }
      if (dates) { out += text([dates], w / 2, y + 6 * s, 10 * s, 12 * s, 'fill="#2f4336"'); y += 13 * s; }
      if (show.profession && p.profession) {
        const pl = wrap(p.profession, `${9.5 * s}px ${FONT}`, w - 16 * s, 1);
        out += text(pl, w / 2, y + 6 * s, 9.5 * s, 11 * s, 'fill="#3e5444" font-weight="600"');
        y += 12 * s;
      }
      if (show.facts && p.facts && !big) {
        const room = Math.max(0, Math.floor((h - y - 8 * s) / (10.5 * s)));
        if (room > 0) {
          const fl = wrap(p.facts, `italic ${8.5 * s}px ${FONT}`, w - 16 * s, Math.min(room, 5));
          out += text(fl, w / 2, y + 8 * s, 8.5 * s, 10.5 * s, 'font-style="italic" fill="#4a5f50"');
        }
      }
    }
    if (isMain) {
      // gold star badge marks the main person the tree starts from
      const r = 12 * s;
      const star = Array.from({ length: 10 }, (_, i) => {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rr = i % 2 ? r * 0.42 : r * 0.78;
        return `${(Math.cos(a) * rr).toFixed(2)},${(Math.sin(a) * rr).toFixed(2)}`;
      }).join(' ');
      out += `<g transform="translate(${6 * s},${6 * s})"><circle r="${r}" fill="#fff" stroke="#c9962b" stroke-width="1.6"/><polygon points="${star}" fill="#e0a82e" stroke="#a87714" stroke-width="0.8"/></g>`;
    }
    if (!forExport && FT.childCount[p.id]) {
      // fold / unfold the family below this person
      const coll = (FT.store.settings.collapsed || []).includes(p.id);
      const hiddenN = FT.collapseInfo[p.id] || 0;
      out += badge(p, coll, hiddenN, 'down', w / 2, h, s);
    }
    const up = !forExport && FT.upInfo && FT.upInfo[p.id];
    if (up) {
      // fold / unfold the ancestors above this person
      out += badge(p, up.folded, up.hidden, 'up', w - 20 * s, 0, s);
    }
    return `<g class="card${selected && !forExport ? ' selected' : ''}" data-id="${esc(p.id)}" transform="translate(${x},${pt.y})">${out}</g>`;
  }

  // small pill on a card edge: "−" when open, "↓+N" / "↑+N" when folded (N = people hidden)
  function badge(p, folded, n, dir, bx, by, s) {
    const label = folded ? `${dir === 'up' ? '↑' : '↓'}${n ? '+' + n : '+'}` : '−';
    const bw = (folded ? 16 + label.length * 6.2 : 22) * s;
    const nm = esc(FT.fullName(p));
    const what = dir === 'up' ? 'ancestors above' : 'family below';
    return `<g class="toggle ${folded ? 'closed' : 'open'}" data-toggle="${esc(p.id)}" data-dir="${dir}" role="button" tabindex="0" aria-expanded="${!folded}" aria-label="${folded ? 'Show' : 'Hide'} the ${what} ${nm}" transform="translate(${bx},${by})">` +
      `<title>${folded ? 'Show' : 'Hide'} the ${what} ${nm} (Shift+click: whole branch)</title>` +
      `<rect x="${-bw / 2}" y="${-9 * s}" width="${bw}" height="${18 * s}" rx="${9 * s}" fill="${folded ? '#fff1cc' : '#ffffff'}" stroke="${folded ? '#c9962b' : '#8aa58f'}" stroke-width="1.4"/>` +
      `<text y="${4.2 * s}" font-size="${11 * s}" font-weight="bold" text-anchor="middle" fill="${folded ? '#7a5a10' : '#3e5444'}">${label}</text></g>`;
  }

  function dateLine(p, fmt) {
    const b = FT.formatDate(p.dob, fmt);
    const dd = FT.formatDate(p.dod, fmt);
    if (b && dd) return `${b} – ${dd}`;
    if (b) return b;
    if (dd) return `† ${dd}`;
    return '';
  }

  // One colour per family (a set of parents and their children). Lines of the selected
  // person's own families are drawn bold; all others are softened.
  const PALETTE = ['#2e7d5b', '#c0502f', '#2f6fb0', '#8e4fb0', '#c28a12', '#1c8f93', '#b03a6b', '#6a8a2a', '#8a5a3c', '#d4572a'];
  const NEUTRAL = '#6d7c71';

  function edges(sc, sel, forExport) {
    const { d, pos, vis, s } = sc;
    const present = new Set(vis.map((p) => p.id));
    const list = buildFamilies(vis, pos, d);
    const rows = assignLanes(list);
    // bus lines sit in the gap between generations, one lane per overlapping family
    rows.forEach((info) => {
      const room = info.minKidTop - info.bottom - (BUS_TOP + BUS_BOTTOM) * s;
      const step = info.lanes > 1 ? Math.max(3 * s, Math.min(LANE * s, room / (info.lanes - 1))) : 0;
      info.fams.forEach((f) => { f.busY = f.bottom + BUS_TOP * s + f.lane * step; });
    });

    // colours: neighbouring families (left to right) get different hues
    list.slice().sort((a, b) => a.left - b.left).forEach((f, i) => { f.color = PALETTE[i % PALETTE.length]; });
    const colorOfCouple = new Map();
    list.forEach((f) => { if (f.ps.length >= 2) colorOfCouple.set(f.ps.slice().sort().join('|'), f.color); });

    const isRel = (ids) => !sel || forExport || ids.includes(sel);
    const items = [];

    vis.forEach((p) => {
      p.partnerIds.filter((q) => present.has(q) && p.id < q).forEach((q) => {
        const a = pos[p.id];
        const b = pos[q];
        const [l, r] = a.x <= b.x ? [a, b] : [b, a];
        const y = l.y + d.ch / 2;
        const color = colorOfCouple.get([p.id, q].sort().join('|')) || NEUTRAL;
        const rel = isRel([p.id, q]);
        items.push({ rel, svg: `<path d="M${l.x + d.cw / 2} ${y}H${r.x - d.cw / 2}" stroke="${color}" stroke-width="${rel ? 5 : 3}" vector-effect="non-scaling-stroke" stroke-linecap="round" fill="none" opacity="${rel ? 1 : 0.4}"/>` });
      });
    });

    list.forEach((f) => {
      const rel = isRel([...f.ps, ...f.kids]);
      const op = rel ? 1 : 0.4;
      const w = rel ? 3 : 2;
      const xs = f.kids.map((k) => pos[k].x).concat(f.ax);
      let path = `M${f.ax} ${f.ay}V${f.busY}M${Math.min(...xs)} ${f.busY}H${Math.max(...xs)}`;
      f.kids.forEach((k) => { path += `M${pos[k].x} ${f.busY}V${pos[k].y - 2 * s}`; });
      // a pale halo under each connector makes crossings read as one line passing over another
      let svg = `<path d="${path}" stroke="#fbfdfa" stroke-width="${w + 4}" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${rel ? 0.9 : 0.6}"/>`;
      svg += `<path d="${path}" stroke="${f.color}" stroke-width="${w}" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${op}"/>`;
      svg += `<circle cx="${f.ax}" cy="${f.ay}" r="${(rel ? 6 : 4.5) * s}" fill="${f.color}" opacity="${op}"/>`;
      f.kids.forEach((k) => {
        const x = pos[k].x;
        const y = pos[k].y;
        svg += `<path d="M${x - 5 * s} ${y - 8 * s}L${x} ${y - 1 * s}L${x + 5 * s} ${y - 8 * s}Z" fill="${f.color}" opacity="${op}"/>`;
      });
      items.push({ rel, svg });
    });

    // highlighted lines last so they stay on top
    return items.sort((a, b) => a.rel - b.rel).map((i) => i.svg).join('');
  }

  // The drawing code uses one base palette; recolour() maps it to the light or dark theme.
  // Exports always use the light theme so printed / shared pictures stay readable.
  const THEME_MAP = {
    light: {
      '#d4e1d6': '#e7f0fb', '#e4dfe0': '#fdecf2', '#dfe6dc': '#eef3ef', '#8aa58f': '#bfcec5', '#304737': '#1f8a5b', '#7f9985': '#b3c4ba',
      '#1f2d23': '#14211a', '#3e5444': '#4f645a', '#2f4336': '#394d42', '#4a5f50': '#5b7064', '#8a4b14': '#9a5410',
      '#a9c3d8': '#bcd4ee', '#5f7f99': '#6f93b8', '#e8bccb': '#f5c6d6', '#a3637b': '#c0728e', '#cfd8cf': '#d6dfd9', '#7d8e80': '#869a8d',
      '#fbfdfa': '#f7faf8'
    },
    dark: {
      '#d4e1d6': '#1b2a3a', '#e4dfe0': '#33222b', '#dfe6dc': '#202b25', '#8aa58f': '#3a4b41', '#304737': '#3ecf8e', '#7f9985': '#4a5d52',
      '#1f2d23': '#eaf2ed', '#3e5444': '#aabdb1', '#2f4336': '#c3d3c9', '#4a5f50': '#9eb3a6', '#8a4b14': '#f0b45a',
      '#a9c3d8': '#2b4157', '#5f7f99': '#78a0c4', '#e8bccb': '#4a2c38', '#a3637b': '#d08aa3', '#cfd8cf': '#33403a', '#7d8e80': '#90a69a',
      '#ffffff': '#19231e', '#fff': '#19231e', '#fff1cc': '#3a3118', '#7a5a10': '#f5d27a',
      '#2e7d5b': '#4ade80', '#c0502f': '#fb923c', '#2f6fb0': '#60a5fa', '#8e4fb0': '#c084fc', '#c28a12': '#facc15',
      '#1c8f93': '#2dd4bf', '#b03a6b': '#f472b6', '#6a8a2a': '#a3e635', '#8a5a3c': '#d6a77a', '#d4572a': '#f87171',
      '#6d7c71': '#8aa094', '#fbfdfa': '#0b100d'
    }
  };
  FT.theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const recolour = (markup, theme) => {
    const map = THEME_MAP[theme] || THEME_MAP.light;
    return markup.replace(/(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, (m, attr, c) => (map[c.toLowerCase()] ? `${attr}="${map[c.toLowerCase()]}"` : m));
  };

  FT.sceneMarkup = function (sc, forExport) {
    const sel = FT.store.selectedId;
    let cards = '';
    // selected card drawn last so its outline is never covered
    const order = sc.vis.slice().sort((a, b) => (a.id === sel) - (b.id === sel));
    order.forEach((p) => (cards += card(p, sc.pos[p.id], sc, p.id === sel, forExport)));
    const markup = `<g class="edges">${edges(sc, sel, forExport)}</g><g class="cards" font-family='${FONT}'>${cards}</g>`;
    return recolour(markup, forExport ? 'light' : FT.theme);
  };
})();
