/* FORGIA – area nutrizionista: scrivi la dieta, controlla gli alimenti (tabelle CREA, catalogo o valori tuoi) e invia al cliente.
   Il cliente riceve il testo identico a come l'hai scritto e la versione digitale; poi sceglie se attivarla o restare con la sua. */
(function (F) {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const r1 = n => Math.round(n * 10) / 10;
  const MEALS = ['Colazione', 'Pranzo', 'Spuntino', 'Cena'];
  const STATE = { null: 'In attesa del cliente', activated: 'Attivata dal cliente', kept: 'Il cliente continua con la sua' };

  F.nutriDiet = function (ctx) {
    const A = ctx.A, st = ctx.st;
    const D = () => (st.dd = st.dd || { title: '', text: '', plan: null, day: 0, sel: null, q: '', manual: false, msg: '', sent: null, p: { nutrition: { foods: F.mem.load().foods.slice() } } });
    const foodOf = it => (it && it.f ? F.getFood(D().p, it.f) : null);
    const fmtD = ctx.fmtD;

    function sentCard() {
      const dd = D();
      if (dd.sent === null) return '<div class="card"><h2>Diete inviate</h2><p class="mut">Carico…</p></div>';
      if (dd.sent === false) return '<div class="card"><h2>Diete inviate</h2><p class="mut">Non riesco a caricare l\'elenco: controlla la connessione.</p></div>';
      return '<div class="card"><h2>Diete inviate</h2>' + (dd.sent.length ? '<table><tr><th>Data</th><th>Titolo</th><th>Stato</th></tr>' + dd.sent.map(x => '<tr><td>' + fmtD(String(x.created_at).slice(0, 10)) + '</td><td>' + esc(x.title) + '</td><td>' + esc(STATE[x.resp] || STATE[null]) + (x.resp_at ? ' · ' + fmtD(String(x.resp_at).slice(0, 10)) : '') + '</td></tr>').join('') + '</table>' : '<p class="mut">Nessuna dieta inviata a questo cliente.</p>') + '</div>';
    }

    /* ---------- monitoraggio: diario del cliente confrontato con la dieta che ha attivato ---------- */
    const iso = d => d.toISOString().slice(0, 10);
    function monitorCard() {
      const dd = D(), c = st.cur;
      if (dd.active === undefined) return '';
      if (!dd.active) return '<div class="card"><h2>Monitoraggio dieta</h2><p class="mut">Il cliente non ha ancora attivato una dieta inviata da te: il confronto parte quando la attiva.</p></div>';
      if (!c.scope_diary) return '<div class="card"><h2>Monitoraggio dieta</h2><p class="mut">Il cliente ha attivato "' + esc(dd.active.title) + '" ma non ti ha consentito di vedere il diario alimentare, quindi non posso confrontare ciò che mangia. Puoi chiedergli di consentirlo dal suo collegamento.</p></div>';
      const days = (st.view.nutrition && st.view.nutrition.days) || {}, pp = { nutrition: { foods: dd.active.foods || [] } }, pl = dd.active.plan, rows = [];
      const from = dd.active.since || '0000-00-00'; let reg = 0, sumR = 0, ok = 0, n14 = 0; const sd = { p: 0, c: 0, f: 0, n: 0 };
      for (let i = 0; i < 14; i++) {
        const d = new Date(); d.setDate(d.getDate() - i); const k = iso(d); if (k < from) continue;
        const day = F.planDayFor(pl, k), tg = day ? F.planDayTotals(pp, day).total : null, dy = days[k];
        let e = null; if (dy) { e = { k: 0, p: 0, c: 0, f: 0 }; (dy.meals || []).forEach(m => (m || []).forEach(it => { e.k += it.k || 0; e.p += it.p || 0; e.c += it.c || 0; e.f += it.f || 0; })); if (!(e.k > 0)) e = null; }
        n14++;
        let st2 = 'non registrato', cls = 'mut', dev = '';
        if (e && tg && tg.k > 0) { reg++; const r = e.k / tg.k; sumR += r; dev = Math.round((r - 1) * 100) + '%'; sd.p += tg.p ? e.p / tg.p : 0; sd.c += tg.c ? e.c / tg.c : 0; sd.f += tg.f ? e.f / tg.f : 0; sd.n++; if (r >= 0.9 && r <= 1.1) { st2 = 'in linea'; cls = 'ok'; ok++; } else if (r >= 0.8 && r <= 1.2) { st2 = r < 1 ? 'un po\' sotto' : 'un po\' sopra'; cls = 'warn'; } else { st2 = r < 1 ? 'sotto' : 'sopra'; cls = 'bad'; } }
        rows.push('<tr><td>' + fmtD(k) + '</td><td>' + (tg ? Math.round(tg.k) + ' kcal<br><span class="mut" style="font-size:11px">P ' + r1(tg.p) + ' · C ' + r1(tg.c) + ' · G ' + r1(tg.f) + '</span>' : '–') + '</td><td>' + (e ? Math.round(e.k) + ' kcal<br><span class="mut" style="font-size:11px">P ' + r1(e.p) + ' · C ' + r1(e.c) + ' · G ' + r1(e.f) + '</span>' : '–') + '</td><td>' + dev + '</td><td class="' + cls + '">' + st2 + '</td></tr>');
      }
      const pc = x => sd.n ? Math.round(x / sd.n * 100) + '%' : '–';
      return '<div class="card"><h2>Monitoraggio dieta</h2><p class="mut" style="font-size:13px">Dieta attiva: <b>' + esc(dd.active.title) + '</b>' + (dd.active.since ? ' · dal ' + fmtD(dd.active.since) : '') + '. Confronto tra ciò che il cliente ha registrato nel diario e le quantità scritte nel piano per quel giorno. I valori sono quelli registrati dal cliente.</p>' +
        '<div class="der">Giorni registrati: <b>' + reg + '/' + n14 + '</b> · Giorni in linea (±10% kcal): <b>' + ok + '</b>' + (reg ? ' · Media kcal rispetto al piano: <b>' + Math.round(sumR / reg * 100) + '%</b> · Proteine ' + pc(sd.p) + ' · Carboidrati ' + pc(sd.c) + ' · Grassi ' + pc(sd.f) : '') + '</div>' +
        '<table style="margin-top:8px"><tr><th>Giorno</th><th>Piano</th><th>Registrato</th><th>Scost.</th><th>Esito</th></tr>' + rows.join('') + '</table></div>';
    }
    function inputCard() {
      const dd = D();
      return '<div class="card"><h2>Nuova dieta</h2><p class="mut" style="font-size:13px">Scrivi o incolla la dieta come l\'hai preparata: un alimento per riga con la quantità (es. "Pane integrale 50 g"), con i titoli dei giorni e dei pasti. Il programma riconosce alimenti e quantità dalle tabelle CREA e tu controlli e correggi ogni voce prima di inviare. Il cliente riceverà il testo identico a come l\'hai scritto e anche la versione digitale.</p>' +
        '<label>Titolo</label><input id="nd_title" value="' + esc(dd.title) + '" placeholder="Es. Dieta di novembre">' +
        '<label style="margin-top:8px">Testo della dieta</label><textarea id="nd_text" rows="14" placeholder="' + F.fmtPlaceholder('diet') + '">' + esc(dd.text) + '</textarea>' + F.fmtGuide('diet', 'nd_text') +
        '<div class="save"><button class="pri" id="nd_parse">Riconosci alimenti e quantità</button><span class="msg bad" id="nd_msg">' + esc(dd.msg) + '</span></div></div>';
    }
    function itemRow(d, m, i, it) {
      const fd = foodOf(it), x = fd && it.g > 0 ? F.foodMacros(fd, it.g) : null, bad = F.itemOpen(it);
      const nm = it.kind ? esc(it.name || it.raw) + ' <span class="chip">' + (it.kind === 'supp' ? 'integratore' : 'a piacere') + '</span>' : (fd ? esc(fd.name) : '<b class="bad">da scegliere</b> <span class="mut">(' + esc(it.raw || '') + ')</span>');
      const alts = (it.alts || []).length ? ' <span class="mut">· oppure ' + esc(F.altText(it)) + '</span>' : (it.alt ? ' <span class="mut">· oppure ' + esc(it.alt) + '</span>' : '');
      const qty = it.kind === 'supp' ? '<span class="mut">' + esc(it.q || (it.gram ? it.gram + ' g' : '')) + '</span>' : it.kind === 'free' ? '<span class="mut">a piacere</span>' : '<input data-nd-g="' + m + ':' + i + '" inputmode="decimal" style="width:70px" value="' + (it.g > 0 ? it.g : '') + '"> ' + (fd && fd.liq ? 'ml' : 'g');
      const sw = (it.alts || []).map((a, k) => '<button data-nd-alt="' + m + ':' + i + ':' + k + '" title="Metti questa come voce principale">Usa ' + esc((a.name || '').slice(0, 18)) + '</button>').join(' ');
      return '<tr' + (bad ? ' style="background:rgba(255,160,0,.12)"' : '') + '><td>' + nm + (it.note ? ' <span class="mut">· ' + esc(it.note) + '</span>' : '') + (!it.kind && fd && !(it.g > 0) && it.q ? ' <span class="mut">(scritto: ' + esc(it.q) + ' — indica i grammi)</span>' : '') + alts + '</td>' +
        '<td>' + qty + '</td>' +
        '<td class="mut" style="font-size:12px">' + (x ? Math.round(x.k) + ' kcal · P ' + r1(x.p) + ' · C ' + r1(x.c) + ' · G ' + r1(x.f) : '') + '</td>' +
        '<td style="white-space:nowrap">' + (it.kind ? '' : '<button data-nd-sw="' + m + ':' + i + '">Cambia</button> ') + sw + ' <button class="dan" data-nd-rm="' + m + ':' + i + '">✕</button></td></tr>';
    }
    function pickerCard() {
      const dd = D(), sel = dd.sel, res = dd.q ? F.searchFoods(dd.p, dd.q, 12) : [];
      return '<div class="card" style="border-color:var(--ac)"><h2>' + (sel.i < 0 ? 'Aggiungi alimento' : 'Cambia alimento') + ' · ' + MEALS[sel.m] + '</h2>' +
        '<label>Cerca nel catalogo e nelle tabelle CREA</label><input id="nd_q" value="' + esc(dd.q) + '" placeholder="Es. pane integrale" autocomplete="off">' +
        (dd.q ? (res.length ? '<table style="margin-top:8px">' + res.map(f => '<tr><td>' + esc(f.name) + (f.src === 'CREA' ? ' <span class="mut">(CREA)</span>' : '') + '</td><td class="mut" style="font-size:12px">' + Math.round(f.k) + ' kcal · P ' + r1(f.p) + ' · C ' + r1(f.c) + ' · G ' + r1(f.f) + ' per 100 ' + (f.liq ? 'ml' : 'g') + '</td><td><button data-nd-pick="' + esc(f.id) + '">Scegli</button></td></tr>').join('') + '</table>' : '<p class="mut">Nessun risultato: prova un altro nome oppure inserisci i valori a mano.</p>') : '') +
        '<details style="margin-top:10px"' + (dd.manual ? ' open' : '') + '><summary><b>Non lo trovo: inserisco i valori io</b></summary><p class="mut" style="font-size:12px">Valori per 100 g (o 100 ml) di prodotto, come da etichetta o da tua fonte.</p><div class="grid"><div><label>Nome</label><input id="nd_mn"></div><div><label>kcal</label><input id="nd_mk" inputmode="decimal"></div><div><label>Proteine (g)</label><input id="nd_mp" inputmode="decimal"></div><div><label>Carboidrati (g)</label><input id="nd_mc" inputmode="decimal"></div><div><label>Grassi (g)</label><input id="nd_mf" inputmode="decimal"></div></div><div class="save"><button id="nd_mok">Usa questi valori</button><span class="msg bad" id="nd_mmsg"></span></div></details>' +
        '<div class="save"><button id="nd_selx">Annulla</button></div></div>';
    }
    function reviewCard() {
      const dd = D(), pl = dd.plan, day = pl.days[Math.min(dd.day, pl.days.length - 1)], tot = F.planDayTotals(dd.p, day).total;
      let bad = 0; pl.days.forEach(d => d.meals.forEach(m => m.forEach(it => { if (F.itemOpen(it)) bad++; })));
      return F.fmtHintsHtml(dd.hints) + '<div class="card"><h2>Controlla la dieta</h2><label>Titolo</label><input id="nd_title" value="' + esc(dd.title) + '">' +
        (pl.days.length > 1 ? '<div class="tabs" style="margin-top:8px">' + pl.days.map((d, i) => '<button data-nd-day="' + i + '" class="' + (i === dd.day ? 'on' : '') + '">' + esc(d.name) + '</button>').join('') + '</div>' : '') +
        F.planSections(dd.p, day).map(sc => '<h3 style="margin:14px 0 4px">' + esc(sc.lab) + ' <span class="mut" style="font-weight:400;font-size:13px">' + (sc.supp ? 'integratori' : Math.round(sc.tot.k) + ' kcal · P ' + r1(sc.tot.p) + ' · C ' + r1(sc.tot.c) + ' · G ' + r1(sc.tot.f)) + '</span></h3>' + sc.groups.map(g => (g.head ? '<div class="mut" style="font-weight:600;margin:6px 0 2px">' + g.head + '</div>' : '') + '<table>' + g.rows.map(r => itemRow(day, r[1], r[2], r[0])).join('') + '</table>').join('')).join('') +
        '<div style="margin-top:12px"><span class="mut">Aggiungi un alimento a:</span> ' + MEALS.map((n, mi) => '<button data-nd-add="' + mi + '">' + n + '</button>').join(' ') + '</div>' +
        '<div class="row" style="margin-top:12px;gap:8px;align-items:center"><label for="nd_water" style="margin:0">Acqua al giorno (litri)</label><input id="nd_water" inputmode="decimal" style="width:80px" value="' + (pl.water || '') + '" placeholder="es. 2,5"></div>' +
        '<p style="margin-top:12px"><b>' + esc(day.name) + ':</b> ' + Math.round(tot.k) + ' kcal · P ' + r1(tot.p) + ' · C ' + r1(tot.c) + ' · G ' + r1(tot.f) + ' g <span class="mut">(somma delle quantità scritte)</span></p>' +
        (bad ? '<p class="bad">' + bad + ' voci da sistemare (alimento da scegliere o quantità mancante): senza queste non puoi inviare.</p>' : '<p class="ok">Tutte le voci sono complete.</p>') +
        '<p class="mut" style="font-size:12px">Valori nutrizionali: tabelle CREA o valori inseriti da te. Il cliente potrà vedere anche vitamine e minerali dove disponibili.</p>' +
        '<div class="save"><button id="nd_back">← Modifica il testo</button><button class="pri" id="nd_send">Invia al cliente</button><span class="msg bad" id="nd_msg">' + esc(dd.msg) + '</span></div></div>';
    }
    function html() { const dd = D(); return monitorCard() + sentCard() + (dd.plan ? (dd.sel ? pickerCard() : '') + reviewCard() : inputCard()); }

    async function load() {
      const dd = D(); if (dd.sent !== null) return;
      try { dd.sent = await A.sentDiets(st.cur.client_id); } catch (e) { dd.sent = false; }
      try { const r = await A.activeDiet(st.cur.client_id); let d = null; if (r && r[0]) { try { d = JSON.parse(r[0].body); } catch (e) { } if (d) d.since = String(r[0].resp_at || '').slice(0, 10); if (d) d.title = r[0].title; } dd.active = d && d.plan ? d : false; } catch (e) { dd.active = false; }
      if (st.tab === 'dieta') ctx.rerender();
    }
    const $ = id => document.getElementById(id);
    const keepText = () => { const dd = D(); if ($('nd_title')) dd.title = $('nd_title').value; if ($('nd_text')) dd.text = $('nd_text').value; };

    function bind() {
      const dd = D(), root = ctx.root;
      if ($('nd_title')) $('nd_title').oninput = () => { dd.title = $('nd_title').value; };
      if ($('nd_parse')) $('nd_parse').onclick = async () => {
        keepText(); if (dd.text.trim().length < 5) { dd.msg = 'Scrivi o incolla la dieta.'; return ctx.rerender(); }
        $('nd_parse').disabled = true; $('nd_msg').textContent = 'Riconosco…'; $('nd_msg').className = 'msg';
        await F.loadCrea(); const pl = F.parsePlanText(dd.p, dd.text);
        if (!pl.days.length) { dd.msg = 'Non trovo alimenti: scrivi un alimento per riga, ad esempio "Pane 50 g".'; return ctx.rerender(); }
        dd.plan = pl; dd.hints = F.fmtHintsDiet(pl, dd.text); dd.day = 0; dd.msg = ''; dd.sel = null; ctx.rerender();
      };
      if (!dd.plan) return;
      const day = () => dd.plan.days[Math.min(dd.day, dd.plan.days.length - 1)];
      const at = s => { const [m, i] = s.split(':').map(Number); return { m, i, it: day().meals[m][i] }; };
      root.querySelectorAll('[data-nd-day]').forEach(b => b.onclick = () => { keepText(); dd.day = +b.dataset.ndDay; dd.sel = null; ctx.rerender(); });
      root.querySelectorAll('[data-nd-g]').forEach(i => i.onchange = () => { const o = at(i.dataset.ndG), g = parseFloat(String(i.value).replace(',', '.')); o.it.g = g > 0 ? g : 0; o.it.est = false; o.it.noq = false; keepText(); ctx.rerender(); });
      if ($('nd_water')) $('nd_water').onchange = () => { const v = parseFloat(String($('nd_water').value).replace(',', '.')); if (v > 0) dd.plan.water = Math.round(v * 100) / 100; else delete dd.plan.water; keepText(); ctx.rerender(); };
      root.querySelectorAll('[data-nd-alt]').forEach(b => b.onclick = () => { const [m, i, k] = b.dataset.ndAlt.split(':').map(Number); F.swapAlt(day().meals[m][i], k); keepText(); ctx.rerender(); });
      root.querySelectorAll('[data-nd-rm]').forEach(b => b.onclick = () => { const o = at(b.dataset.ndRm); day().meals[o.m].splice(o.i, 1); keepText(); ctx.rerender(); });
      root.querySelectorAll('[data-nd-sw]').forEach(b => b.onclick = () => { const o = at(b.dataset.ndSw); keepText(); dd.sel = { m: o.m, i: o.i }; dd.q = o.it.name || ''; dd.manual = false; ctx.rerender(); });
      root.querySelectorAll('[data-nd-add]').forEach(b => b.onclick = () => { keepText(); dd.sel = { m: +b.dataset.ndAdd, i: -1 }; dd.q = ''; dd.manual = false; ctx.rerender(); });
      if (dd.sel) {
        const apply = fd => { const d = day(), s = dd.sel; if (s.i >= 0) { const cur = d.meals[s.m][s.i]; if (cur && cur.name) F.mem.alias(cur.name, fd.id); } if (s.i < 0) d.meals[s.m].push({ raw: fd.name, f: fd.id, g: 100, conf: 'ok', base: fd.id }); else { const it = d.meals[s.m][s.i]; Object.assign(it, { f: fd.id, conf: 'ok', est: false, noq: false }); if (!(it.g > 0)) it.g = 100; } dd.sel = null; ctx.rerender(); };
        if ($('nd_q')) { $('nd_q').oninput = () => { dd.q = $('nd_q').value; const pos = $('nd_q').selectionStart; ctx.rerender(); const q = $('nd_q'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (e) { } } }; }
        root.querySelectorAll('[data-nd-pick]').forEach(b => b.onclick = () => { const fd = F.getFood(dd.p, b.dataset.ndPick); if (fd) apply(fd); });
        if ($('nd_selx')) $('nd_selx').onclick = () => { dd.sel = null; ctx.rerender(); };
        if ($('nd_mok')) $('nd_mok').onclick = () => {
          const n = (id) => { const v = parseFloat(String($(id).value).replace(',', '.')); return isFinite(v) && v >= 0 ? v : null; }, name = $('nd_mn').value.trim(), k = n('nd_mk'), p = n('nd_mp'), c = n('nd_mc'), f = n('nd_mf');
          if (!name || k == null || p == null || c == null || f == null) { $('nd_mmsg').textContent = 'Compila nome, kcal, proteine, carboidrati e grassi.'; return; }
          const fd = { id: 'nf' + Date.now().toString(36), name, k, p, c, f, grp: 'Del nutrizionista' }; dd.p.nutrition.foods.push(fd); F.mem.food(fd); apply(fd);
        };
      }
      if ($('nd_back')) $('nd_back').onclick = () => { keepText(); dd.plan = null; dd.sel = null; ctx.rerender(); };
      if ($('nd_send')) $('nd_send').onclick = async () => {
        keepText(); const pl = dd.plan; let bad = 0; pl.days.forEach(d => d.meals.forEach(m => m.forEach(it => { if (F.itemOpen(it)) bad++; })));
        const title = (dd.title || '').trim();
        if (!title) { dd.msg = 'Scrivi un titolo.'; return ctx.rerender(); }
        if (bad) { dd.msg = 'Sistema le ' + bad + ' voci incomplete.'; return ctx.rerender(); }
        if (!await ctx.confirmBox('Inviare la dieta "' + title + '" a ' + st.cur.name + '? Il cliente la riceve nella sua app e sceglie se attivarla o continuare con la sua.', 'Invia')) return;
        const used = new Set(); pl.days.forEach(d => d.meals.forEach(m => m.forEach(it => { if (it.f) used.add(it.f); (it.alts || []).forEach(a => { if (a.f) used.add(a.f); }); })));
        const payload = { v: 1, by: (A.me && A.me.full_name) || '', text: dd.text, plan: { name: title, days: pl.days.map(d => ({ name: d.name, dow: d.dow, meals: d.meals.map(m => m.map(it => { const o = { f: it.f, g: it.g, raw: it.raw || '', note: it.note || '', alt: it.alt || '' }; if (it.name) o.name = it.name; if (it.q) o.q = it.q; if (it.lab) o.lab = it.lab; if (it.opt) o.opt = it.opt; if (it.kind) o.kind = it.kind; if (it.gram) o.gram = it.gram; if ((it.alts || []).length) o.alts = it.alts.map(a => ({ f: a.f, g: a.g, name: a.name, q: a.q || '' })); return o; })) })), water: pl.water || undefined, notes: pl.notes || undefined }, foods: dd.p.nutrition.foods.filter(x => used.has(x.id)) };
        try { await A.sendDiet(st.cur.client_id, title, payload); st.dd = null; st.ddOk = 'Dieta inviata a ' + st.cur.name + ' ✓'; ctx.rerender(); }
        catch (e) { dd.msg = /row-level|policy|violat/i.test(e.message) ? 'Non puoi inviare: il collegamento con il cliente non è attivo.' : 'Non inviata: ' + e.message; ctx.rerender(); }
      };
    }
    return { html, bind, load };
  };
})(window.FORMA);
