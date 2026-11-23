(function () {
  const FT = window.FT;

  // Automatic layered layout. Returns { pos: {id: {x (center), y (top)}}, level: {id: n} }.
  FT.layout = function (vis, o) {
    const { cw, ch, hgap, vgap, pgap } = o;
    const idx = new Map();
    vis.forEach((p, i) => idx.set(p.id, i));
    const byId = new Map(vis.map((p) => [p.id, p]));
    const parentsOf = (p) => p.parentIds.filter((id) => idx.has(id));
    const partnersOf = (p) => p.partnerIds.filter((id) => idx.has(id));

    // ---- generation levels
    const lvl = {};
    const kidsOf = {};
    vis.forEach((p) => { lvl[p.id] = 0; kidsOf[p.id] = []; });
    vis.forEach((p) => parentsOf(p).forEach((pid) => kidsOf[pid].push(p.id)));
    const sibGroups = new Map();
    vis.forEach((p) => {
      const ps = parentsOf(p);
      if (!ps.length) return;
      const k = ps.slice().sort().join('|');
      if (!sibGroups.has(k)) sibGroups.set(k, []);
      sibGroups.get(k).push(p.id);
    });
    for (let it = 0; it < 500; it++) {
      let changed = false;
      const raise = (id, v) => { if (lvl[id] < v) { lvl[id] = v; changed = true; } };
      vis.forEach((p) => {
        const ps = parentsOf(p);
        if (ps.length) raise(p.id, Math.max(...ps.map((x) => lvl[x])) + 1);
        partnersOf(p).forEach((q) => {
          const m = Math.max(lvl[p.id], lvl[q]);
          raise(p.id, m);
          raise(q, m);
        });
        const kids = kidsOf[p.id];
        if (kids.length) raise(p.id, Math.min(...kids.map((k) => lvl[k])) - 1);
      });
      sibGroups.forEach((g) => {
        const m = Math.max(...g.map((i) => lvl[i]));
        g.forEach((i) => raise(i, m));
      });
      if (!changed) break;
    }

    // ---- units: connected partner groups (parents of a shared child count as partners)
    const parent = {};
    const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    const union = (a, b) => { parent[find(a)] = find(b); };
    vis.forEach((p) => (parent[p.id] = p.id));
    vis.forEach((p) => {
      partnersOf(p).forEach((q) => union(p.id, q));
      const ps = parentsOf(p);
      if (ps.length === 2) union(ps[0], ps[1]);
    });
    const unitMap = new Map();
    vis.forEach((p) => {
      const r = find(p.id);
      if (!unitMap.has(r)) unitMap.set(r, { members: [], kids: [], parentUnit: null, bloodline: null });
      unitMap.get(r).members.push(p.id);
    });
    const units = [...unitMap.values()];
    const unitOf = (id) => unitMap.get(find(id));

    // the bigger family is the main block (kept contiguous); the smaller one is attached beside it.
    // Size = everyone descending from the person's oldest known ancestors.
    const famSize = (m) => {
      const tops = new Set();
      const climb = new Set();
      const up = parentsOf(byId.get(m)).slice();
      while (up.length) {
        const id = up.pop();
        if (climb.has(id)) continue;
        climb.add(id);
        const ps = parentsOf(byId.get(id));
        if (!ps.length) tops.add(id);
        ps.forEach((x) => up.push(x));
      }
      const seen = new Set();
      const stack = [...tops];
      while (stack.length) {
        const id = stack.pop();
        if (seen.has(id)) continue;
        seen.add(id);
        kidsOf[id].forEach((k) => stack.push(k));
        partnersOf(byId.get(id)).forEach((q) => stack.push(q));
      }
      return seen.size;
    };
    units.forEach((u) => {
      u.members.sort((a, b) => idx.get(a) - idx.get(b));
      const withParents = u.members.filter((m) => parentsOf(byId.get(m)).length);
      u.bloodline = withParents.length > 1
        ? withParents.map((m) => [m, famSize(m)]).sort((a, b) => b[1] - a[1] || idx.get(a[0]) - idx.get(b[0]))[0][0]
        : withParents[0] || null;
      u.level = lvl[u.members[0]];
      // order members: female left / male right for couples, else bloodline in the middle
      const n = u.members.length;
      if (n === 2) {
        const [a, b] = u.members.map((m) => byId.get(m));
        if (a.gender === 'female' && b.gender === 'male') u.members.reverse();
      } else if (n > 2) {
        const centre = u.bloodline || u.members[0];
        const others = u.members.filter((m) => m !== centre);
        const left = [];
        const right = [];
        others.forEach((m, i) => (i % 2 === 0 ? right : left).push(m));
        u.members = [...left.reverse(), centre, ...right];
      }
      u.w = n * cw + (n - 1) * pgap;
      if (u.bloodline) {
        const pu = unitOf(parentsOf(byId.get(u.bloodline))[0]);
        if (pu !== u) { u.parentUnit = pu; pu.kids.push(u); }
        // a partner with their own family: that family sits on the partner's side
        // (husband and his family on the left, wife and her family on the right)
        const bi = u.members.indexOf(u.bloodline);
        const other = u.members.find((m) => m !== u.bloodline && parentsOf(byId.get(m)).length);
        u.need = other ? (u.members.indexOf(other) < bi ? 'left' : 'right') : null;
      }
    });
    // break accidental cycles so every unit is reachable from a root
    const reach = new Set();
    const mark = (u) => { if (!reach.has(u)) { reach.add(u); u.kids.forEach(mark); } };
    units.filter((u) => !u.parentUnit).forEach(mark);
    units.forEach((u) => {
      if (!reach.has(u)) {
        u.parentUnit.kids = u.parentUnit.kids.filter((k) => k !== u);
        u.parentUnit = null;
        mark(u);
      }
    });
    const sortKey = (u) => byId.get(u.bloodline).dob || '9999';
    // The main person's ancestors sit right above that line. Their family is kept on one side: if the
    // line runs through the mother (right-hand partner) the family extends to the right, otherwise left.
    const rootUnit = unitOf(vis.find((p) => p.id === o.rootId) ? o.rootId : vis[0].id);
    for (let x = rootUnit; x; x = x.parentUnit) x.keyLine = true;
    const lineage = (() => {
      const pu = rootUnit.parentUnit;
      if (!pu || pu.members.length < 2) return 1;
      return pu.members.indexOf(pu.bloodline) === pu.members.length - 1 ? 0 : 2;
    })();
    // children whose partner's family sits on the left go first, on the right go last
    const rank = (u) => (u.keyLine && u !== rootUnit && lineage !== 1 ? lineage : u.need === 'left' ? 0 : u.need === 'right' ? 2 : 1);
    units.forEach((u) => u.kids.sort((a, b) => rank(a) - rank(b) || sortKey(a).localeCompare(sortKey(b)) || idx.get(a.bloodline) - idx.get(b.bloodline)));

    // A partner whose own parents have no ancestors brings their other children into the family
    // they married into, right beside the couple (their parents are then placed above them).
    const adopted = new Set();
    units.forEach((pu) => {
      pu.kids.slice().forEach((k) => {
        if (!k.bloodline) return;
        const other = k.members.find((m) => m !== k.bloodline && parentsOf(byId.get(m)).length);
        if (!other) return;
        const f = unitOf(parentsOf(byId.get(other))[0]);
        let top = pu;
        while (top.parentUnit) top = top.parentUnit;
        if (!f || f === pu || f.parentUnit || f === top || adopted.has(f) || !f.kids.length) return;
        adopted.add(f);
        const at = pu.kids.indexOf(k) + (k.members.indexOf(other) < k.members.indexOf(k.bloodline) ? 0 : 1);
        pu.kids.splice(at, 0, ...f.kids);
        f.kids.forEach((x) => { x.parentUnit = pu; });
        f.adoptedKids = f.kids;
        f.kids = [];
      });
    });

    // ---- relative subtree layout
    // parents of the main person's line sit right above that child, not over the middle of its siblings
    function build(u) {      u.kids.forEach(build);
      const bloodIdx = (k) => k.members.indexOf(k.bloodline);
      const bx = (k) => k.cx + (-k.w / 2 + bloodIdx(k) * (cw + pgap) + cw / 2);
      if (!u.kids.length) { u.sw = u.w; u.cx = u.w / 2; return; }
      let x = 0;
      u.kids.forEach((k) => { k.off = x; x += k.sw + hgap; });
      const childrenW = x - hgap;
      const first = u.kids[0];
      const last = u.kids[u.kids.length - 1];
      const key = u.kids.find((k) => k.keyLine);
      const centre = key ? key.off + bx(key) : (first.off + bx(first) + last.off + bx(last)) / 2;
      const left = Math.min(0, centre - u.w / 2);
      const right = Math.max(childrenW, centre + u.w / 2);
      u.kids.forEach((k) => (k.off -= left));
      u.cx = centre - left;
      u.sw = right - left;
    }
    function absolute(u, left) {
      u.rx = left + u.cx;
      u.kids.forEach((k) => absolute(k, left + k.off));
    }
    const collect = (u, out) => { out.push(u); u.kids.forEach((k) => collect(k, out)); return out; };

    const roots = units.filter((u) => !u.parentUnit);
    roots.forEach((r) => { build(r); absolute(r, 0); r.list = collect(r, []); });

    // ---- place the trees on a shared canvas without overlaps
    const pos = {};
    const occ = {};
    const fits = (list, shift) => list.every((u) => {
      const l = shift + u.rx - u.w / 2 - hgap / 2;
      const r = shift + u.rx + u.w / 2 + hgap / 2;
      return !(occ[u.level] || []).some(([a, b]) => l < b && r > a);
    });
    const unitFits = (u, ax) => {
      const l = ax - u.w / 2 - hgap / 2;
      const r = ax + u.w / 2 + hgap / 2;
      return !(occ[u.level] || []).some(([a, b]) => l < b && r > a);
    };
    const commit = (list, shift, pin) => list.forEach((u) => {
      u.ax = shift + u.rx;
      if (pin && pin.u === u) {
        // keep the parents close to the child they link to: slide only as far as needed to avoid overlaps
        const dirStep = u.ax >= pin.x ? 1 : -1;
        for (let n = 0; n < 3000; n++) {
          const ax = pin.x + dirStep * n * (cw / 4);
          if ((dirStep > 0 ? ax > u.ax : ax < u.ax)) break;
          if (unitFits(u, ax)) { u.ax = ax; break; }
        }
      }
      (occ[u.level] = occ[u.level] || []).push([u.ax - u.w / 2 - hgap / 2, u.ax + u.w / 2 + hgap / 2]);
      u.members.forEach((m, i) => {
        pos[m] = { x: u.ax - u.w / 2 + i * (cw + pgap) + cw / 2, y: u.level * (ch + vgap) };
      });
    });
    // dir is the preferred side ('left' / 'right') for a partner's family; the other side is used
    // only when it is much closer, so no connector has to run across the whole tree
    const nearest = (t, desired, sign) => {
      for (let n = 0; n < 5000; n++) {
        const shift = desired + sign * (n * cw) / 4;
        if (fits(t.list, shift)) return shift;
      }
      return null;
    };
    const placeTree = (t, desired, dir, pin) => {
      const l = dir === 'right' ? null : nearest(t, desired, -1);
      const r = dir === 'left' ? null : nearest(t, desired, 1);
      let shift;
      if (dir) {
        const [pref, alt] = dir === 'left' ? [l, nearest(t, desired, 1)] : [r, nearest(t, desired, -1)];
        shift = pref != null && (alt == null || Math.abs(pref - desired) <= Math.abs(alt - desired) + 4 * cw) ? pref : alt;
      } else {
        shift = l != null && (r == null || Math.abs(l - desired) < Math.abs(r - desired)) ? l : r;
      }
      // a block that had to be pushed far from the child it links to is placed unit by unit instead,
      // so its parents and children stay next to each other
      if (pin && Math.abs(shift + pin.u.rx - pin.x) > 3 * cw) return placeLoose(pin.u, pin.x);
      commit(t.list, shift, pin);
    };
    function placeLoose(u, desiredAx) {
      let ax = desiredAx;
      for (let n = 0; n < 5000; n++) {
        const off = (n * cw) / 4;
        if (unitFits(u, desiredAx + off)) { ax = desiredAx + off; break; }
        if (unitFits(u, desiredAx - off)) { ax = desiredAx - off; break; }
      }
      u.ax = ax;
      (occ[u.level] = occ[u.level] || []).push([ax - u.w / 2 - hgap / 2, ax + u.w / 2 + hgap / 2]);
      u.members.forEach((m, i) => {
        pos[m] = { x: ax - u.w / 2 + i * (cw + pgap) + cw / 2, y: u.level * (ch + vgap) };
      });
      u.kids.forEach((k) => placeLoose(k, ax + (k.rx - u.rx)));
    }

    let main = rootUnit;
    while (main.parentUnit) main = main.parentUnit;
    placeTree(main, 0);
    const remaining = roots.filter((r) => r !== main);
    while (remaining.length) {
      // prefer a tree that holds the parents of someone already placed
      let pick = null;
      let desired = 0;
      let dir = null;
      let pin = null;
      for (const t of remaining) {
        for (const u of t.list) {
          for (const m of u.members) {
            const child = vis.find((c) => pos[c.id] && parentsOf(c).includes(m));
            if (child) {
              pick = t;
              desired = pos[child.id].x - u.rx;
              const cu = unitOf(child.id);
              dir = cu.bloodline && pos[cu.bloodline] ? (pos[child.id].x < pos[cu.bloodline].x ? 'left' : 'right') : null;
              if (u === t) pin = { u, x: pos[child.id].x };
              if (u === t && u.adoptedKids) {
                // parents whose other children were adopted: sit above the middle of all their children
                const placedKids = vis.filter((c) => pos[c.id] && parentsOf(c).some((x) => u.members.includes(x)));
                const mean = placedKids.reduce((s, c) => s + pos[c.id].x, 0) / placedKids.length;
                desired = mean - u.rx;
                pin = { u, x: mean };
                dir = null;
              }
              break;
            }
          }
          if (pick) break;
        }
        if (pick) break;
      }
      if (!pick) {
        pick = remaining[0];
        const maxRight = Math.max(...Object.values(occ).flat().map((i) => i[1]));
        desired = maxRight + hgap / 2;
        dir = 'right';
      }
      remaining.splice(remaining.indexOf(pick), 1);
      placeTree(pick, desired, dir, pin);
    }
    return { pos, level: lvl };
  };
})();
