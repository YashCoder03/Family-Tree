(function () {
  const FT = window.FT;

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function svgString() {
    const sc = FT.scene();
    const b = sc.bounds;
    const w = Math.ceil(b.x1 - b.x0);
    const h = Math.ceil(b.y1 - b.y0);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${b.x0} ${b.y0} ${w} ${h}">` +
      `<rect x="${b.x0}" y="${b.y0}" width="${w}" height="${h}" fill="#ffffff"/>${FT.sceneMarkup(sc, true)}</svg>`;
    return { xml, w, h };
  }

  function raster(type) {
    const { xml, w, h } = svgString();
    const img = new Image();
    const scale = Math.min(3, Math.max(1, 4000 / Math.max(w, h)));
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.round(w * scale);
      c.height = Math.round(h * scale);
      const g = c.getContext('2d');
      g.fillStyle = '#fff';
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((blob) => download(blob, `family-tree.${type === 'jpeg' ? 'jpg' : 'png'}`), `image/${type}`, 0.92);
    };
    img.onerror = () => alert('Could not render the image export.');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  }

  // ---- minimal xlsx writer (stored zip, inline strings)
  const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };

  function zip(files) {
    const enc = new TextEncoder();
    const parts = [];
    const central = [];
    let offset = 0;
    const u16 = (v) => [v & 255, (v >> 8) & 255];
    const u32 = (v) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
    files.forEach((f) => {
      const name = enc.encode(f.name);
      const data = enc.encode(f.data);
      const crc = crc32(data);
      const common = [...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)];
      const local = new Uint8Array([...u32(0x04034b50), ...common, ...name]);
      parts.push(local, data);
      central.push(new Uint8Array([
        ...u32(0x02014b50), ...u16(20), ...common, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...name
      ]));
      offset += local.length + data.length;
    });
    const cdSize = central.reduce((n, c) => n + c.length, 0);
    const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(offset), ...u16(0)]);
    return new Blob([...parts, ...central, end], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  function xlsx() {
    const { tree, settings } = FT.store;
    const people = Object.values(tree.people);
    const nameOf = (id) => (tree.people[id] ? FT.fullName(tree.people[id]) : '');
    const header = ['ID', 'Name', 'Surname now', 'Surname at birth', 'Gender', 'Date of birth', 'Date of death', 'Residential city', 'Profession', 'Interesting facts', 'Father', 'Mother', 'Partners', 'Relation to main person (Marathi)', 'Relation (English)'];
    const kin = FT.kinship();
    const rows = [header].concat(people.map((p) => {
      const father = p.parentIds.map((i) => tree.people[i]).find((x) => x && x.gender === 'male');
      const mother = p.parentIds.map((i) => tree.people[i]).find((x) => x && x.gender === 'female');
      const rest = p.parentIds.filter((i) => ![father, mother].filter(Boolean).some((x) => x.id === i));
      const k = kin[p.id];
      return [
        p.id, p.name, p.surnameNow, p.surnameBirth, p.gender,
        FT.formatDate(p.dob, settings.dateFormat), FT.formatDate(p.dod, settings.dateFormat),
        p.city, p.profession, p.facts,
        father ? FT.fullName(father) : nameOf(rest[0]), mother ? FT.fullName(mother) : nameOf(rest[1]),
        p.partnerIds.map(nameOf).join('; '),
        k ? `${k.mr} (${k.tr})${k.side ? ' ' + k.side : ''}` : '', k ? k.en : ''
      ];
    }));
    const col = (n) => String.fromCharCode(65 + n);
    const X = (s) => FT.esc(String(s == null ? '' : s)).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
    const sheetRows = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => `<c r="${col(ci)}${ri + 1}" t="inlineStr"><is><t xml:space="preserve">${X(v)}</t></is></c>`).join('')}</row>`).join('');
    const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    const files = [
      { name: '[Content_Types].xml', data: head + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>' },
      { name: '_rels/.rels', data: head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: 'xl/workbook.xml', data: head + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Family tree" sheetId="1" r:id="rId1"/></sheets></workbook>' },
      { name: 'xl/_rels/workbook.xml.rels', data: head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>' },
      { name: 'xl/worksheets/sheet1.xml', data: head + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>` }
    ];
    download(zip(files), 'family-tree.xlsx');
  }

  FT.exportAs = function (type) {
    if (type === 'svg') download(new Blob([svgString().xml], { type: 'image/svg+xml' }), 'family-tree.svg');
    else if (type === 'json') FT.saveJson();
    else if (type === 'xlsx') xlsx();
    else raster(type);
  };

  // The saved file holds the tree, its display settings and its name, so it can be imported anywhere.
  FT.saveJson = function () {
    const file = {
      format: 'family-tree-builder', version: 2, exportedAt: new Date().toISOString(),
      name: FT.treeName(), tree: FT.store.tree, settings: FT.store.settings
    };
    const safe = FT.treeName().replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'family-tree';
    download(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }), `${safe}.json`);
  };

  // Reads a saved tree file (this version or an older plain-tree file). Resolves { name, tree, settings }.
  FT.readImport = (file) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('read'));
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        const tree = data && data.tree && data.tree.people ? data.tree : data;
        if (!tree || typeof tree.people !== 'object' || !tree.people[tree.rootId]) throw new Error('shape');
        Object.values(tree.people).forEach((p) => {
          if (!p || typeof p !== 'object' || !Array.isArray(p.parentIds || []) || !Array.isArray(p.partnerIds || [])) throw new Error('shape');
        });
        resolve({
          name: String((data && data.name) || file.name.replace(/\.json$/i, '')).trim().slice(0, 80) || 'Imported tree',
          tree,
          settings: data && data.tree && data.settings && typeof data.settings === 'object' ? data.settings : null,
          people: Object.keys(tree.people).length
        });
      } catch (e) {
        reject(e);
      }
    };
    r.readAsText(file);
  });
})();
