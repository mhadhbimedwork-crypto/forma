/* FORGIA – backup su file: per ogni profilo una cartella con JSON (modificabile e reimportabile), Markdown (leggibile) e CSV (Excel).
   Canali: cartella del PC (File System Access, Chrome/Edge) · cartella del telefono (app Android) · download manuale. */
(function (F) {
  'use strict';
  const DAY = 864e5, EVERY_DAYS = 15;
  F.BACKUP_EVERY_DAYS = EVERY_DAYS;
  const safe = s => (String(s).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '')) || 'profilo';
  const pad = n => String(n).padStart(2, '0');
  const csvCell = v => { v = v == null ? '' : String(v); return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const BOM = '﻿';

  /* ---------- contenuto dei file ---------- */
  F.profileObject = p => ({ app: 'FORGIA', format: 'forma-profile', version: 1, exportedAt: new Date().toISOString(), profile: p });

  function markdown(p) {
    const L = F.LABELS || { GOALS: {}, STYLES: {}, LEVELS: {} }, c = F.calc(p), pl = p.plans.find(x => x.id === p.activePlan);
    const o = [];
    o.push(`# ${p.name} – riepilogo FORGIA`, `*Esportato il ${F.todayISO()}. Per modificare i dati usa il file .json con lo stesso nome e reimportalo da Profilo → Importa.*`, '');
    o.push('## Dati', `- Età: ${c.age} anni (nato il ${p.birth})`, `- Altezza: ${p.height} cm · Peso: ${p.weight} kg · BMI ${c.bmi.toFixed(1)}`,
      `- Obiettivo: ${L.GOALS[p.goal] || p.goal}`, `- Allenamento: ${L.STYLES[p.style] || p.style} · ${p.days} giorni/settimana · livello ${L.LEVELS[p.level] || p.level}`,
      `- Mesi di stop prima di iniziare: ${p.stopMonths || 0}`, '');
    o.push('## Obiettivi nutrizionali', `- ${c.kcal} kcal · proteine ${c.protein} g · carboidrati ${c.carbs} g · grassi ${c.fat} g · acqua ~${c.water} l`, '');
    const pain = Object.entries(p.pain || {}).filter(([, v]) => v > 0);
    o.push('## Dolori segnalati', pain.length ? pain.map(([z, v]) => `- ${F.ZONES[z] || z}: ${v}/10`).join('\n') : '- nessuno', '');
    if (pl) {
      o.push(`## Scheda attiva: ${pl.title}`);
      pl.days.forEach(d => { o.push(`### ${d.name}`); d.exercises.forEach(x => o.push(`- ${x.name}: ${x.sets} × ${F.repsLabel(x)}${x.note ? ' (' + x.note + ')' : ''}`)); o.push(''); });
    }
    const ws = (p.weights || []).slice(-30);
    o.push('## Peso corporeo (ultime misurazioni)', ws.length ? ws.map(w => `- ${w.date}: ${w.kg} kg`).join('\n') : '- nessuna', '');
    const ss = (p.sessions || []).slice(-15).reverse();
    o.push('## Ultime sedute');
    if (!ss.length) o.push('- nessuna');
    ss.forEach(s => { o.push(`### ${s.date} – ${s.dayName}`); s.ex.forEach(e => o.push(`- ${e.name}: ` + e.sets.map(t => `${t.kg ? t.kg + ' kg × ' : ''}${t.reps}${t.rpe ? ' (RPE ' + t.rpe + ')' : ''}`).join(' · '))); o.push(''); });
    return o.join('\n');
  }
  function csvSessions(p) {
    const rows = [['data', 'seduta', 'esercizio', 'serie', 'kg', 'ripetizioni_o_secondi', 'rpe']];
    (p.sessions || []).forEach(s => s.ex.forEach(e => e.sets.forEach((t, i) => rows.push([s.date, s.dayName, e.name, i + 1, t.kg || 0, t.reps || 0, t.rpe || '']))));
    return BOM + rows.map(r => r.map(csvCell).join(';')).join('\r\n');
  }
  function csvWeights(p) {
    return BOM + [['data', 'kg']].concat((p.weights || []).map(w => [w.date, w.kg])).map(r => r.map(csvCell).join(';')).join('\r\n');
  }
  /** File di un profilo: cartella "<Nome>" con JSON, MD e CSV datati. */
  F.profileFiles = function (p, date) {
    date = date || F.todayISO();
    const n = safe(p.name), fn = safe(p.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')), base = `${n}/${fn}_${date}`;
    return [
      { path: base + '.json', mime: 'application/json', text: JSON.stringify(F.profileObject(p), null, 2) },
      { path: base + '_riepilogo.md', mime: 'text/markdown', text: markdown(p) },
      { path: base + '_sedute.csv', mime: 'text/csv', text: csvSessions(p) },
      { path: base + '_peso.csv', mime: 'text/csv', text: csvWeights(p) }
    ];
  };
  F.allFiles = S => S.profiles.flatMap(p => F.profileFiles(p));

  /* ---------- import ---------- */
  F.normalizeProfile = function (p) {
    if (!p || typeof p !== 'object' || !p.name || !p.birth || isNaN(new Date(p.birth))) throw new Error('profilo non valido');
    const num = (v, d) => (isFinite(+v) && +v > 0 ? +v : d);
    const o = Object.assign({}, p);
    o.id = String(p.id || 'u' + Date.now().toString(36));
    o.name = String(p.name).slice(0, 60); o.sex = p.sex === 'F' ? 'F' : 'M';
    o.height = num(p.height, 170); o.weight = num(p.weight, 70);
    o.goal = ['auto', 'recomp', 'cut', 'mass', 'strength'].includes(p.goal) ? p.goal : 'recomp';
    o.waist = num(p.waist, 0); o.bf = num(p.bf, 0);
    o.style = ['cali', 'gym', 'mix'].includes(p.style) ? p.style : 'mix';
    o.days = Math.min(5, Math.max(2, +p.days || 3)); o.level = Math.min(3, Math.max(1, +p.level || 1)); o.stopMonths = Math.max(0, +p.stopMonths || 0);
    o.pain = (p.pain && typeof p.pain === 'object') ? p.pain : {}; Object.keys(o.pain).forEach(z => { o.pain[z] = Math.min(10, Math.max(0, +o.pain[z] || 0)); if (!o.pain[z] || !F.ZONES[z]) delete o.pain[z]; });
    ['painLog', 'weights', 'sessions', 'plans'].forEach(k => { o[k] = Array.isArray(p[k]) ? p[k] : []; });
    o.weights = o.weights.filter(w => w && w.date && +w.kg > 0).map(w => ({ date: String(w.date), kg: +w.kg }));
    o.plans = o.plans.filter(x => x && x.id && Array.isArray(x.days));
    o.sessions = o.sessions.filter(s => s && Array.isArray(s.ex));
    o.activePlan = o.plans.some(x => x.id === p.activePlan) ? p.activePlan : (o.plans.length ? o.plans[o.plans.length - 1].id : null);
    o.draft = null; o.createdAt = p.createdAt || F.todayISO();
    return o;
  };
  /** Legge un file FORGIA: profilo singolo o backup completo. */
  F.parseImport = function (text) {
    let d; try { d = JSON.parse(text.replace(/^﻿/, '')); } catch (e) { throw new Error('il file non è un JSON valido'); }
    if (d && d.format === 'forma-profile' && d.profile) return { kind: 'profile', profile: F.normalizeProfile(d.profile) };
    if (d && Array.isArray(d.profiles)) return { kind: 'all', profiles: d.profiles.map(F.normalizeProfile), settings: d.settings || {}, requests: d.requests || [] };
    throw new Error('formato non riconosciuto');
  };

  /* ---------- canali di scrittura ---------- */
  function idb() { return new Promise((res, rej) => { const r = indexedDB.open('forgia-fs', 1); r.onupgradeneeded = () => r.result.createObjectStore('h'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
  async function idbGet(k) { try { const db = await idb(); return await new Promise(res => { const t = db.transaction('h').objectStore('h').get(k); t.onsuccess = () => res(t.result || null); t.onerror = () => res(null); }); } catch (e) { return null; } }
  async function idbSet(k, v) { try { const db = await idb(); await new Promise((res, rej) => { const t = db.transaction('h', 'readwrite'); t.objectStore('h').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); return true; } catch (e) { return false; } }
  async function idbDel(k) { try { const db = await idb(); await new Promise(res => { const t = db.transaction('h', 'readwrite'); t.objectStore('h').delete(k); t.oncomplete = res; t.onerror = res; }); } catch (e) { } }

  F.fsSupported = () => typeof window.showDirectoryPicker === 'function';
  F.isNative = () => !!(window.Capacitor && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform());

  F.pickDir = async function () {
    const h = await window.showDirectoryPicker({ id: 'forgia-backup', mode: 'readwrite', startIn: 'desktop' });
    await idbSet('dir', h); return h;
  };
  F.forgetDir = () => idbDel('dir');
  F.getDir = () => idbGet('dir');
  F.dirPermission = async function (h, request) {
    if (!h || !h.queryPermission) return 'denied';
    let p = await h.queryPermission({ mode: 'readwrite' });
    if (p !== 'granted' && request) p = await h.requestPermission({ mode: 'readwrite' });
    return p;
  };
  async function writeToDir(root, files) {
    for (const f of files) {
      const parts = f.path.split('/'); let d = root;
      for (const part of parts.slice(0, -1)) d = await d.getDirectoryHandle(part, { create: true });
      const fh = await d.getFileHandle(parts[parts.length - 1], { create: true });
      const w = await fh.createWritable(); await w.write(f.text); await w.close();
    }
  }
  F._writeToDir = writeToDir;

  async function nativeWrite(files) {
    const FS = Capacitor.Plugins.Filesystem; let where = 'Documenti/FORGIA-Backup';
    for (const f of files) {
      try { await FS.writeFile({ path: 'FORGIA-Backup/' + f.path, data: f.text, directory: 'DOCUMENTS', encoding: 'utf8', recursive: true }); }
      catch (e) { where = 'memoria dell\'app (FORGIA-Backup)'; await FS.writeFile({ path: 'FORGIA-Backup/' + f.path, data: f.text, directory: 'DATA', encoding: 'utf8', recursive: true }); }
    }
    return where;
  }
  /** Condivisione nativa (Android): scrive in cache e apre il menu Condividi (Drive, Files, WhatsApp, email…). */
  F.nativeShare = async function (files, title) {
    const FS = Capacitor.Plugins.Filesystem, SH = Capacitor.Plugins.Share, uris = [];
    for (const f of files) {
      const path = 'FORGIA-Export/' + f.path.replace(/\//g, '__');
      await FS.writeFile({ path, data: f.text, directory: 'CACHE', encoding: 'utf8', recursive: true });
      uris.push((await FS.getUri({ path, directory: 'CACHE' })).uri);
    }
    await SH.share({ title: title || 'FORGIA backup', files: uris, dialogTitle: 'Salva o invia il backup' });
  };
  F.download = function (files) {
    files.forEach((f, i) => setTimeout(() => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([f.text], { type: f.mime + ';charset=utf-8' }));
      a.download = f.path.split('/').pop(); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, i * 350));
  };

  /* ---------- pianificazione ---------- */
  F.backupInfo = function (S) {
    const b = S.settings.backup || {}, last = b.lastAt ? new Date(b.lastAt) : null, ref = last || new Date(b.since || Date.now());
    const next = new Date(ref.getTime() + EVERY_DAYS * DAY);
    return { last, next, due: Date.now() >= next.getTime(), channel: b.channel || null, where: b.where || null };
  };
  /**
   * Esegue il backup di tutti i profili.
   * opts.interactive: può chiedere permessi (serve un gesto dell'utente) · opts.manual: può scaricare i file.
   * Ritorna { ok, channel, where, profiles } oppure { ok:false, reason }.
   */
  F.runBackup = async function (S, opts) {
    opts = opts || {};
    if (!S.profiles.length) return { ok: false, reason: 'nessun profilo' };
    const files = F.allFiles(S); let res = null;
    const dirH = F.fsSupported() ? await F.getDir() : null;
    if (dirH) {
      try {
        const perm = await F.dirPermission(dirH, !!opts.interactive);
        if (perm === 'granted') { await writeToDir(dirH, files); res = { ok: true, channel: 'pc', where: 'cartella "' + dirH.name + '" del PC' }; }
        else if (!opts.manual) return { ok: false, reason: 'permission' };
      } catch (e) { if (!opts.manual) return { ok: false, reason: 'error:' + (e && e.message) }; }
    }
    if (!res && F.isNative()) {
      try { res = { ok: true, channel: 'native', where: await nativeWrite(files) }; } catch (e) { if (!opts.manual) return { ok: false, reason: 'error:' + (e && e.message) }; }
    }
    if (!res && opts.manual) { F.download(files); res = { ok: true, channel: 'download', where: 'cartella Download' }; }
    if (!res) return { ok: false, reason: 'nochannel' };
    S.settings.backup = Object.assign(S.settings.backup || {}, { lastAt: new Date().toISOString(), channel: res.channel, where: res.where });
    res.profiles = S.profiles.length; return res;
  };
})(window.FORMA);
