/* FORGIA – lettura e scrittura di file Excel (.xlsx) e CSV, senza librerie esterne.
   Scrittura: ZIP non compresso + XML. Lettura: ZIP con inflate nativo del browser (DecompressionStream). */
(function (F) {
  'use strict';
  const enc = new TextEncoder(), dec = new TextDecoder();
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const xe = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

  function zip(files) { /* files: [{name, data:Uint8Array}] */
    const parts = [], cd = []; let off = 0;
    const u16 = n => [n & 255, (n >> 8) & 255], u32 = n => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
    files.forEach(f => {
      const nm = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
      const lh = new Uint8Array([0x50, 0x4b, 3, 4, 20, 0, 0, 8, 0, 0, 0, 0, 0x21, 0, ...u32(crc), ...u32(sz), ...u32(sz), ...u16(nm.length), 0, 0]);
      parts.push(lh, nm, f.data);
      cd.push(new Uint8Array([0x50, 0x4b, 1, 2, 20, 0, 20, 0, 0, 8, 0, 0, 0, 0, 0x21, 0, ...u32(crc), ...u32(sz), ...u32(sz), ...u16(nm.length), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(off)]), nm);
      off += lh.length + nm.length + sz;
    });
    const cdLen = cd.reduce((a, b) => a + b.length, 0);
    parts.push(...cd, new Uint8Array([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(files.length), ...u16(files.length), ...u32(cdLen), ...u32(off), 0, 0]));
    return new Blob(parts, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  /** files: [{path, data:Uint8Array}] → Blob .zip (nomi in UTF-8) */
  F.zipBuild = files => new Blob([zip(files.map(f => ({ name: f.path, data: f.data })))], { type: 'application/zip' });
  const colName = i => { let s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s; return s; };

  /** sheets: [{name, cols:[...], rows:[[...]]}] → Blob .xlsx */
  F.xlsxBuild = function (sheets) {
    const used = new Set(), names = sheets.map(s => { let n = String(s.name).replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31) || 'Foglio', k = 2, b = n; while (used.has(n.toLowerCase())) n = b.slice(0, 28) + ' ' + k++; used.add(n.toLowerCase()); return n; });
    const files = [];
    files.push({ name: '[Content_Types].xml', data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') + '</Types>') });
    files.push({ name: '_rels/.rels', data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>') });
    files.push({ name: 'xl/workbook.xml', data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + names.map((n, i) => `<sheet name="${xe(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>') });
    files.push({ name: 'xl/_rels/workbook.xml.rels', data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') + `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`) });
    files.push({ name: 'xl/styles.xml', data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFB91C1C"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>') });
    sheets.forEach((sh, si) => {
      const all = [sh.cols].concat(sh.rows), w = sh.cols.map((c, i) => Math.min(48, Math.max(8, ...all.map(r => String(r[i] == null ? '' : r[i]).length)) + 2));
      const rowsXml = all.map((r, ri) => `<row r="${ri + 1}">` + sh.cols.map((_, ci) => {
        const v = r[ci], ref = colName(ci) + (ri + 1), st = ri === 0 ? ' s="1"' : '';
        if (v == null || v === '') return ri === 0 ? `<c r="${ref}"${st}/>` : '';
        if (typeof v === 'number' && isFinite(v) && ri > 0) return `<c r="${ref}"><v>${v}</v></c>`;
        return `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${xe(v)}</t></is></c>`;
      }).join('') + '</row>').join('');
      files.push({ name: `xl/worksheets/sheet${si + 1}.xml`, data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${w.map((x, i) => `<col min="${i + 1}" max="${i + 1}" width="${x}" customWidth="1"/>`).join('')}</cols><sheetData>${rowsXml}</sheetData><autoFilter ref="A1:${colName(Math.max(0, sh.cols.length - 1))}${all.length}"/></worksheet>`) });
    });
    return zip(files);
  };

  /* ---------- lettura ---------- */
  async function inflate(u8) { const ds = new DecompressionStream('deflate-raw'), w = ds.writable.getWriter(); w.write(u8); w.close(); return new Uint8Array(await new Response(ds.readable).arrayBuffer()); }
  async function unzip(buf) {
    const u = new Uint8Array(buf), dv = new DataView(buf); let e = u.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('file Excel non valido');
    const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = {};
    for (let i = 0; i < n; i++) {
      const method = dv.getUint16(p + 10, true), csz = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
      const name = dec.decode(u.subarray(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
      const ln = dv.getUint16(lo + 26, true), lx = dv.getUint16(lo + 28, true), start = lo + 30 + ln + lx, raw = u.subarray(start, start + csz);
      if (/\.(xml|rels)$/.test(name)) out[name] = dec.decode(method === 0 ? raw : await inflate(raw));
    }
    return out;
  }
  const colIdx = ref => { const m = /^([A-Z]+)/.exec(ref); let n = 0; for (const ch of m[1]) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  /** → { 'Nome foglio': [[celle...], ...] } */
  F.xlsxParse = async function (buf) {
    const z = await unzip(buf), dp = new DOMParser(), X = s => dp.parseFromString(s, 'application/xml');
    const ss = z['xl/sharedStrings.xml'] ? [...X(z['xl/sharedStrings.xml']).getElementsByTagName('si')].map(si => [...si.getElementsByTagName('t')].map(t => t.textContent).join('')) : [];
    const wb = X(z['xl/workbook.xml']), rels = X(z['xl/_rels/workbook.xml.rels']), tgt = {};
    [...rels.getElementsByTagName('Relationship')].forEach(r => { tgt[r.getAttribute('Id')] = r.getAttribute('Target'); });
    const res = {};
    for (const sh of wb.getElementsByTagName('sheet')) {
      const rid = sh.getAttribute('r:id') || sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
      let path = tgt[rid] || ''; path = path.startsWith('/') ? path.slice(1) : 'xl/' + path;
      if (!z[path]) continue;
      const rows = [];
      [...X(z[path]).getElementsByTagName('row')].forEach(r => {
        const row = [];
        [...r.getElementsByTagName('c')].forEach(c => {
          const t = c.getAttribute('t'), vEl = c.getElementsByTagName('v')[0], v = vEl ? vEl.textContent : null; let val = '';
          if (t === 's') val = ss[+v] || ''; else if (t === 'inlineStr') val = [...c.getElementsByTagName('t')].map(x => x.textContent).join(''); else if (t === 'b') val = v === '1'; else if (t === 'str' || t === 'e') val = v || ''; else if (v != null && v !== '') val = isFinite(+v) ? +v : v;
          row[colIdx(c.getAttribute('r'))] = val;
        });
        rows.push(Array.from(row, x => x === undefined ? '' : x));
      });
      res[sh.getAttribute('name')] = rows;
    }
    return res;
  };

  /* ---------- CSV (separatore ; per l'Excel italiano, con BOM) ---------- */
  const cell = v => { v = v == null ? '' : String(v); return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  F.csvBuild = sh => '﻿' + [sh.cols].concat(sh.rows).map(r => sh.cols.map((_, i) => cell(r[i])).join(';')).join('\r\n');
  F.csvParse = function (text) {
    text = text.replace(/^﻿/, ''); const first = text.split(/\r?\n/)[0] || '', sep = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true; else if (c === sep) { row.push(cur); cur = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(x => x !== '')) rows.push(row); row = []; } else cur += c;
    }
    row.push(cur); if (row.some(x => x !== '')) rows.push(row);
    return rows.map(r => r.map(x => (x !== '' && /^-?\d+([.,]\d+)?$/.test(x.trim()) ? +x.replace(',', '.') : x)));
  };
})(window.FORMA);
