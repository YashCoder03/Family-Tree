(function () {
  const FT = window.FT;

  // Marathi kinship terms (mr), Latin transliteration (tr). Paths are written from the main person:
  // F/M father/mother, S/D son/daughter, H/W husband/wife, B/Z brother/sister.
  // P, C, X, E are used when the person's gender is not set (parent, child, partner, sibling).
  const TERMS = {
    F: ['वडील', 'Vadil (Baba)'], M: ['आई', 'Aai'], S: ['मुलगा', 'Mulga'], D: ['मुलगी', 'Mulgi'],
    W: ['बायको', 'Bayko'], H: ['नवरा', 'Navra'], B: ['भाऊ', 'Bhau'], Z: ['बहीण', 'Bahin'],
    FF: ['आजोबा', 'Ajoba'], MF: ['आजोबा', 'Ajoba'], FM: ['आजी', 'Aaji'], MM: ['आजी', 'Aaji'],
    FB: ['काका', 'Kaka'], FZ: ['आत्या', 'Aatya'], MB: ['मामा', 'Mama'], MZ: ['मावशी', 'Mavshi'],
    FBW: ['काकू', 'Kaku'], FZH: ['आतोबा', 'Atoba'], MBW: ['मामी', 'Mami'], MZH: ['मावसा', 'Mavasa'],
    FBS: ['चुलत भाऊ', 'Chulat Bhau'], FBD: ['चुलत बहीण', 'Chulat Bahin'],
    FZS: ['आतेभाऊ', 'Ate Bhau'], FZD: ['आतेबहीण', 'Ate Bahin'],
    MBS: ['मामेभाऊ', 'Mame Bhau'], MBD: ['मामेबहीण', 'Mame Bahin'],
    MZS: ['मावसभाऊ', 'Mavas Bhau'], MZD: ['मावसबहीण', 'Mavas Bahin'],
    BW: ['वहिनी', 'Vahini'], ZH: ['भाऊजी', 'Bhauji'],
    BS: ['पुतण्या', 'Putnya'], BD: ['पुतणी', 'Putni'], ZS: ['भाचा', 'Bhacha'], ZD: ['भाची', 'Bhachi'],
    SW: ['सून', 'Soon'], DH: ['जावई', 'Jawai'],
    SS: ['नातू', 'Natu'], DS: ['नातू', 'Natu'], SD: ['नात', 'Naat'], DD: ['नात', 'Naat'],
    WF: ['सासरे', 'Sasre'], WM: ['सासू', 'Sasu'], HF: ['सासरे', 'Sasre'], HM: ['सासू', 'Sasu'],
    WB: ['मेव्हणा', 'Mevhna'], WZ: ['मेव्हणी', 'Mevhni'], WZH: ['साडू', 'Sadu'],
    HB: ['दीर', 'Deer'], HZ: ['नणंद', 'Nanand'],
    SWF: ['व्याही', 'Vyahi'], DHF: ['व्याही', 'Vyahi'], SWM: ['विहीण', 'Vihin'], DHM: ['विहीण', 'Vihin']
  };
  const UP = new Set(['F', 'M', 'P']);
  const DOWN = new Set(['S', 'D', 'C']);
  const MALE = new Set(['F', 'S', 'H', 'B']);
  const FEMALE = new Set(['M', 'D', 'W', 'Z']);

  // used when a path is not in the table: "<known relation>चा <step>"
  const STEP = {
    F: ['वडील', 'Vadil', 'चे', 'che'], M: ['आई', 'Aai', 'ची', 'chi'], P: ['पालक', 'Palak', 'चे', 'che'],
    S: ['मुलगा', 'Mulga', 'चा', 'cha'], D: ['मुलगी', 'Mulgi', 'ची', 'chi'], C: ['मूल', 'Mul', 'चे', 'che'],
    H: ['नवरा', 'Navra', 'चा', 'cha'], W: ['बायको', 'Bayko', 'ची', 'chi'], X: ['जोडीदार', 'Jodidar', 'चा', 'cha'],
    B: ['भाऊ', 'Bhau', 'चा', 'cha'], Z: ['बहीण', 'Bahin', 'ची', 'chi'], E: ['भावंड', 'Bhavand', 'चे', 'che']
  };
  const OBLIQUE = { 'वडील': 'वडिलां', 'मुलगा': 'मुला', 'मुलगी': 'मुली', 'नवरा': 'नवऱ्या', 'भाऊ': 'भावा', 'बहीण': 'बहिणी', 'आजोबा': 'आजोबां', 'पणजोबा': 'पणजोबां', 'जोडीदार': 'जोडीदारा' };
  const oblique = (t) => { const p = t.split(' '); const l = p.pop(); p.push(OBLIQUE[l] || l); return p.join(' '); };
  const EN = { F: 'father', M: 'mother', P: 'parent', S: 'son', D: 'daughter', C: 'child', H: 'husband', W: 'wife', X: 'partner', B: 'brother', Z: 'sister', E: 'sibling' };

  function generational(tokens) {
    if (tokens.every((t) => UP.has(t)) && tokens.length >= 3) {
      const m = MALE.has(tokens[tokens.length - 1]);
      if (tokens.length === 3) return m ? ['पणजोबा', 'Panjoba'] : ['पणजी', 'Panji'];
      if (tokens.length === 4) return m ? ['खापरपणजोबा', 'Khaparpanjoba'] : ['खापरपणजी', 'Khaparpanji'];
      return ['पूर्वज', 'Purvaj'];
    }
    if (tokens.every((t) => DOWN.has(t)) && tokens.length >= 3) {
      const m = MALE.has(tokens[tokens.length - 1]);
      if (tokens.length === 3) return m ? ['पणतू', 'Panatu'] : ['पणती', 'Panati'];
      if (tokens.length === 4) return m ? ['खापरपणतू', 'Khaparpanatu'] : ['खापरपणती', 'Khaparpanati'];
      return ['वंशज', 'Vanshaj'];
    }
    return null;
  }

  // Parents' cousins are called like uncles and aunts: mother's side मामा / मावशी, father's side काका / आत्या.
  function parentCousin(tokens) {
    const t = tokens.slice();
    const spouse = t.length === 5 && (t[4] === 'H' || t[4] === 'W') ? t.pop() : null;
    if (t.length !== 4 || !(t[0] === 'F' || t[0] === 'M') || !UP.has(t[1]) || !['B', 'Z', 'E'].includes(t[2]) || !['S', 'D'].includes(t[3])) return null;
    const male = t[3] === 'S';
    const mother = t[0] === 'M';
    if (!spouse) return male ? (mother ? TERMS.MB : TERMS.FB) : (mother ? TERMS.MZ : TERMS.FZ);
    if (male && spouse === 'W') return mother ? TERMS.MBW : TERMS.FBW;
    if (!male && spouse === 'H') return mother ? TERMS.MZH : TERMS.FZH;
    return null;
  }

  function term(tokens) {
    return TERMS[tokens.join('')] || generational(tokens) || parentCousin(tokens);
  }

  function describe(tokens, steps, ego) {
    const key = tokens.join('');
    let base = term(tokens);
    let mr;
    let tr;
    if (base) {
      [mr, tr] = base;
      const last = steps[steps.length - 1];
      // older / younger qualifiers where Marathi families use them
      const olderThan = (a, b) => (a.dob && b.dob ? a.dob < b.dob : null);
      if (['FB', 'FZ', 'MB', 'MZ'].includes(key)) {
        const o = olderThan(last.to, last.from);
        const fem = key[1] === 'Z';
        if (o === true) { mr = (fem ? 'मोठी ' : 'मोठे ') + mr; tr = (fem ? 'Mothi ' : 'Mothe ') + tr; }
        else if (o === false) { mr = (fem ? 'धाकटी ' : 'धाकटे ') + mr; tr = (fem ? 'Dhakti ' : 'Dhakte ') + tr; }
      } else if ((key === 'B' || key === 'Z') && olderThan(last.to, ego) === true) {
        mr = key === 'B' ? 'दादा' : 'ताई';
        tr = key === 'B' ? 'Dada' : 'Tai';
      }
    } else {
      // longest known prefix, then spell out the rest
      let n = tokens.length - 1;
      while (n > 0 && !term(tokens.slice(0, n))) n--;
      if (n > 0) {
        // chain of possessives: "<A>च्या <B>च्या <C>चा <D>" (only the last link agrees with the final noun)
        const parts = [term(tokens.slice(0, n)), ...tokens.slice(n).map((t) => STEP[t])];
        const lastTok = tokens[tokens.length - 1];
        const ending = STEP[lastTok];
        mr = parts.map((t, i) => (i === parts.length - 1 ? t[0] : `${oblique(t[0])}${i === parts.length - 2 ? ending[2] : 'च्या'}`)).join(' ');
        tr = parts.map((t, i) => (i === parts.length - 1 ? t[1] : `${t[1]}${i === parts.length - 2 ? ending[3] : 'chya'}`)).join(' ');
      } else {
        mr = tokens.map((t) => STEP[t][0]).join(' / ');
        tr = tokens.map((t) => STEP[t][1]).join(' / ');
      }
    }
    let side = null;
    if (tokens.length >= 2 && UP.has(tokens[0]) && (tokens.every((t) => UP.has(t)) || !TERMS[key])) {
      side = tokens[0] === 'F' ? 'वडिलांकडील' : tokens[0] === 'M' ? 'आईकडील' : null;
    }
    const en = tokens.map((t) => EN[t]).reduce((acc, w, i) => (i ? `${acc}'s ${w}` : w), '');
    return { mr, tr, en: en.charAt(0).toUpperCase() + en.slice(1), side };
  }

  // Relation of everyone in the tree to the main person.
  FT.kinship = function () {
    const { tree } = FT.store;
    const P = tree.people;
    const root = P[tree.rootId];
    const kids = {};
    Object.values(P).forEach((p) => p.parentIds.forEach((x) => (kids[x] = (kids[x] || []).concat(p.id))));
    const tok = (p, m, f, o) => (p.gender === 'male' ? m : p.gender === 'female' ? f : o);
    const edges = (id) => {
      const p = P[id];
      const out = [];
      p.parentIds.forEach((x) => P[x] && out.push({ to: x, t: tok(P[x], 'F', 'M', 'P'), c: 1 }));
      const sib = new Set();
      p.parentIds.forEach((x) => (kids[x] || []).forEach((k) => { if (k !== id) sib.add(k); }));
      sib.forEach((x) => out.push({ to: x, t: tok(P[x], 'B', 'Z', 'E'), c: 1.4 }));
      (kids[id] || []).forEach((x) => out.push({ to: x, t: tok(P[x], 'S', 'D', 'C'), c: 1 }));
      p.partnerIds.forEach((x) => P[x] && out.push({ to: x, t: tok(P[x], 'H', 'W', 'X'), c: 1.3 }));
      return out;
    };

    const dist = { [root.id]: 0 };
    const prev = {};
    const done = new Set();
    for (;;) {
      let cur = null;
      Object.keys(dist).forEach((k) => { if (!done.has(k) && (cur === null || dist[k] < dist[cur])) cur = k; });
      if (cur === null) break;
      done.add(cur);
      edges(cur).forEach((e) => {
        const nd = dist[cur] + e.c;
        if (dist[e.to] === undefined || nd < dist[e.to] - 1e-9) { dist[e.to] = nd; prev[e.to] = { from: cur, t: e.t }; }
      });
    }

    const result = {};
    result[root.id] = { mr: 'मी', tr: 'Mi', en: 'Main person', side: null, self: true };
    Object.keys(dist).forEach((id) => {
      if (id === root.id) return;
      const tokens = [];
      const steps = [];
      for (let x = id; x !== root.id; x = prev[x].from) {
        tokens.unshift(prev[x].t);
        steps.unshift({ from: P[prev[x].from], to: P[x] });
      }
      result[id] = describe(tokens, steps, root);
    });
    return result;
  };
})();
