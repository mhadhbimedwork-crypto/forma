/* FORGIA – importazione della scheda da file: Excel (.xlsx), CSV, PDF con testo, TXT.
   Il file viene convertito in testo e passa dallo stesso lettore dell'incolla (F.parseScheda). I PDF-immagine servono OCR/IA (server). */
(function (F) {
  'use strict';
  const norm = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9%]+/g, ' ').trim();
  const has = v => v !== '' && v != null && String(v).trim() !== '';
  const COLS = { ex: /^(esercizio|esercizi|exercise|movimento|nome)\b/, sets: /^(serie|set|sets)\b/, reps: /^(rip|reps|ripetizioni|repetitions)\b/, rest: /^(rec|recupero|rest|pausa|riposo)\b/, load: /^(%|carico|load|intensita)/, rpe: /^(rpe|rir)\b/, note: /^(note|nota|esecuzione|tecnica|commenti|cue)/, day: /^(giorno|day|seduta|sessione|workout|allenamento)\b/ };
  const fmtRest = v => typeof v === 'number' ? (v <= 10 ? v + ' min' : v + 's') : (/^\d+$/.test(String(v).trim()) ? (+v <= 10 ? v + ' min' : v + 's') : String(v));
  /** {foglio: righe[][]} → testo per F.parseScheda */
  F.sheetsToPlanText = function (sheets) {
    const out = [], names = Object.keys(sheets);
    names.forEach(n => {
      const rows = (sheets[n] || []).filter(r => r.some(has)); if (!rows.length) return;
      let hi = rows.findIndex(r => r.some(c => COLS.ex.test(norm(c))));
      const col = {}; if (hi >= 0) rows[hi].forEach((c, i) => { const k = Object.keys(COLS).find(k => COLS[k].test(norm(c))); if (k && col[k] == null) col[k] = i; });
      const body = hi >= 0 ? rows.slice(hi + 1) : rows;
      if (names.length > 1 && col.day == null) out.push('# ' + n);
      let lastDay = null;
      body.forEach(r => {
        const filled = r.filter(has);
        if (filled.length === 1 && !/^\d+$/.test(String(filled[0]).trim())) { out.push('# ' + String(filled[0]).trim()); lastDay = null; return; }
        if (hi >= 0 && col.ex != null) {
          if (col.day != null && has(r[col.day]) && r[col.day] !== lastDay) { lastDay = r[col.day]; out.push('# ' + String(lastDay).trim()); }
          const ex = r[col.ex]; if (!has(ex)) return;
          const parts = [String(ex).trim(), has(r[col.sets]) ? String(r[col.sets]).trim() : '', has(r[col.reps]) ? String(r[col.reps]).trim() : ''];
          if (!parts[1] && !parts[2]) { out.push('# ' + parts[0]); return; }
          if (has(r[col.load]) && /%/.test(String(r[col.load]) + String(rows[hi][col.load])) ) { const l = String(r[col.load]).replace('%', '').trim(); parts.push('@' + (/^0?\.\d+$/.test(l) ? Math.round(l * 100) : l) + '%'); }
          if (has(r[col.rest])) parts.push('rec ' + fmtRest(r[col.rest]));
          if (has(r[col.rpe])) parts.push('RPE ' + String(r[col.rpe]).trim());
          if (has(r[col.note])) parts.push('(' + String(r[col.note]).trim() + ')');
          out.push(parts.join(' | '));
        } else out.push(filled.map(x => String(x).trim()).join(' | '));
      });
    });
    return out.join('\n');
  };
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('libreria PDF non disponibile (serve la connessione la prima volta)')); document.head.appendChild(s); }); }
  /** Riga di tabella senza "NxN": "Nome 3 8-10 90s" → "Nome | 3 | 8-10 | 90s". */
  function tableLine(t) {
    if (/\d\s*[x×]\s*\d/i.test(t)) return t;
    const flat = t.replace(/\s*\|\s*/g, ' ').replace(/\s+/g, ' ').trim(), m = /^(.*?[^\d\s])\s+(\d{1,2})\s+(\d{1,2}(?:\s*[-–]\s*\d{1,2})?|max)(?![\d\w%])\s*(.*)$/i.exec(flat);
    return m ? [m[1], m[2], m[3]].concat(m[4] ? [m[4]] : []).join(' | ') : t;
  }
  /** Testo di un PDF con testo selezionabile: righe ricostruite dalla posizione, colonne separate da " | ". */
  F.pdfToText = async function (buf) {
    if (!window.pdfjsLib) await loadScript('lib/pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise, lines = [];
    for (let pn = 1; pn <= doc.numPages; pn++) {
      const tc = await (await doc.getPage(pn)).getTextContent(), rows = [];
      tc.items.forEach(it => { if (!it.str.trim()) return; const y = it.transform[5], x = it.transform[4]; let r = rows.find(q => Math.abs(q.y - y) < 3); if (!r) rows.push(r = { y, items: [] }); r.items.push({ x, w: it.width || 0, h: it.height || 10, s: it.str }); });
      const cnt = {}; rows.forEach(r => new Set(r.items.map(i => Math.round(i.x / 4))).forEach(k => { cnt[k] = (cnt[k] || 0) + 1; }));
      const isCol = x => [-1, 0, 1].some(d => (cnt[Math.round(x / 4) + d] || 0) >= 2);
      rows.sort((a, b) => b.y - a.y).forEach(r => { r.items.sort((a, b) => a.x - b.x); let t = '', end = null; r.items.forEach(i => { t += (end == null ? '' : (i.x - end > i.h * 0.8 || (isCol(i.x) && r.items.length > 1) ? ' | ' : ' ')) + i.s.trim(); end = i.x + i.w; }); t = t.replace(/\s+\|\s+\|/g, ' |'); if (/esercizi\w*.*\bserie\b|exercise.*\bsets\b/i.test(t)) return; lines.push(tableLine(t)); });
    }
    return lines.join('\n');
  };
  /** File → testo della scheda. Lancia un Error con messaggio leggibile se non è possibile. */
  F.fileToPlanText = async function (file) {
    const n = file.name.toLowerCase();
    if (/\.xlsx$/.test(n)) return F.sheetsToPlanText(await F.xlsxParse(await file.arrayBuffer()));
    if (/\.csv$/.test(n)) { const rows = F.csvParse(await file.text()); return F.sheetsToPlanText({ csv: rows }); }
    if (/\.(txt|md)$/.test(n)) return file.text();
    if (/\.pdf$/.test(n)) { const t = await F.pdfToText(await file.arrayBuffer()); if (t.replace(/\W/g, '').length < 20) throw new Error('questo PDF contiene solo immagini (scansione): usa "Da foto" con il server IA oppure incolla il testo'); return t; }
    throw new Error('formato non supportato: usa .xlsx, .csv, .pdf o .txt');
  };
})(window.FORMA);
