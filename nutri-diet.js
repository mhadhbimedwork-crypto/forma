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
    const D = () => (st.dd = st.dd || { title: '', text: '', plan: null, day: 0, sel: null, q: '', manual: false, msg: '', sent: null, p: { nutrition: { foods: [] } } });
    const foodOf = it => (it && it.f ? F.getFood(D().p, it.f) : null);
    const fmtD = ctx.fmtD;

    function sentCard() {
      const dd = D();
      if (dd.sent === null) return '<div class="card"><h2>Diete inviate</h2><p class="mut">Carico…</p></div>';
      if (dd.sent === false) return '<div class="card"><h2>Diete inviate</h2><p class="mut">Non riesco a caricare l\'elenco: controlla la connessione.</p></div>';
      return '<div class="card"><h2>Diete inviate</h2>' + (dd.sent.length ? '<table><tr><th>Data</th><th>Titolo</th><th>Stato</th></tr>' + dd.sent.map(x => '<tr><td>' + fmtD(String(x.created_at).slice(0, 10)) + '</td><td>' + esc(x.title) + '</td><td>' + esc(STATE[x.resp] || STATE[null]) + (x.resp_at ? ' · ' + fmtD(String(x.resp_at).slice(0, 10)) : '') + '</td></tr>').join('') + '</table>' : '<p class="mut">Nessuna dieta inviata a questo cliente.</p>') + '</div>';
    }
    function inputCard() {
      const dd = D();
      return '<div class="card"><h2>Nuova dieta</h2><p class="mut" style="font-size:13px">Scrivi o incolla la dieta come l\'hai preparata: un alimento per riga con la quantità (es. "Pane integrale 50 g"), con i titoli dei giorni e dei pasti. Il programma riconosce alimenti e quantità dalle tabelle CREA e tu controlli e correggi ogni voce prima di inviare. Il cliente riceverà il testo identico a come l\'hai scritto e anche la versione digitale.</p>' +
        '<label>Titolo</label><input id="nd_title" value="' + esc(dd.title) + '" placeholder="Es. Dieta di novembre">' +
        '<label style="margin-top:8px">Testo della dieta</label><textarea id="nd_text" rows="14" placeholder="Lunedì&#10;Colazione&#10;Latte parzialmente scremato 200 ml&#10;Pane integrale 50 g&#10;Pranzo&#10;…">' + esc(dd.text) + '</textarea>' +
        '<div class="save"><button class="pri" id="nd_parse">Riconosci alimenti e quantità</button><span class="msg bad" id="nd_msg">' + esc(dd.msg) + '</span></div></div>';
    }
    function itemRow(d, m, i, it) {
      const fd = foodOf(it), x = fd && it.g > 0 ? F.foodMacros(fd, it.g) : null, bad = !fd || !(it.g > 0);
      return '<tr' + (bad ? ' style="background:rgba(255,160,0,.12)"' : '') + '><td>' + (fd ? esc(fd.name) : '<b class="bad">da scegliere</b> <span class="mut">(' + esc(it.raw || '') + ')</span>') + (it.note ? ' <span class="mut">· ' + esc(it.note) + '</span>' : '') + (it.alt ? ' <span class="mut">· oppure ' + esc(it.alt) + '</span>' : '') + '</td>' +
        '<td><input data-nd-g="' + m + ':' + i + '" inputmode="decimal" style="width:70px" value="' + (it.g > 0 ? it.g : '') + '"> ' + (fd && fd.liq ? 'ml' : 'g') + '</td>' +
        '<td class="mut" style="font-size:12px">' + (x ? Math.round(x.k) + ' kcal · P ' + r1(x.p) + ' · C ' + r1(x.c) + ' · G ' + r1(x.f) : '') + '</td>' +
        '<td style="white-space:nowrap"><button data-nd-sw="' + m + ':' + i + '">Cambia</button> <button class="dan" data-nd-rm="' + m + ':' + i + '">✕</button></td></tr>';
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
      let bad = 0; pl.days.forEach(d => d.meals.forEach(m => m.forEach(it => { if (!foodOf(it) || !(it.g > 0)) bad++; })));
      return '<div class="card"><h2>Controlla la dieta</h2><label>Titolo</label><input id="nd_title" value="' + esc(dd.title) + '">' +
        (pl.days.length > 1 ? '<div class="tabs" style="margin-top:8px">' + pl.days.map((d, i) => '<button data-nd-day="' + i + '" class="' + (i === dd.day ? 'on' : '') + '">' + esc(d.name) + '</button>').join('') + '</div>' : '') +
        day.meals.map((m, mi) => '<h3 style="margin:12px 0 4px">' + MEALS[mi] + '</h3>' + (m.length ? '<table>' + m.map((it, i) => itemRow(day, mi, i, it)).join('') + '</table>' : '<p class="mut" style="margin:0">Nessun alimento.</p>') + '<button data-nd-add="' + mi + '" style="margin-top:4px">+ Aggiungi alimento</button>').join('') +
        '<p style="margin-top:12px"><b>' + esc(day.name) + ':</b> ' + Math.round(tot.k) + ' kcal · P ' + r1(tot.p) + ' · C ' + r1(tot.c) + ' · G ' + r1(tot.f) + ' g <span class="mut">(somma delle quantità scritte)</span></p>' +
        (bad ? '<p class="bad">' + bad + ' voci da sistemare (alimento da scegliere o quantità mancante): senza queste non puoi inviare.</p>' : '<p class="ok">Tutte le voci sono complete.</p>') +
        '<p class="mut" style="font-size:12px">Valori nutrizionali: tabelle CREA o valori inseriti da te. Il cliente potrà vedere anche vitamine e minerali dove disponibili.</p>' +
        '<div class="save"><button id="nd_back">← Modifica il testo</button><button class="pri" id="nd_send">Invia al cliente</button><span class="msg bad" id="nd_msg">' + esc(dd.msg) + '</span></div></div>';
    }
    function html() { const dd = D(); return sentCard() + (dd.plan ? (dd.sel ? pickerCard() : '') + reviewCard() : inputCard()); }

    async function load() {
      const dd = D(); if (dd.sent !== null) return;
      try { dd.sent = await A.sentDiets(st.cur.client_id); } catch (e) { dd.sent = false; }
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
        dd.plan = pl; dd.day = 0; dd.msg = ''; dd.sel = null; ctx.rerender();
      };
      if (!dd.plan) return;
      const day = () => dd.plan.days[Math.min(dd.day, dd.plan.days.length - 1)];
      const at = s => { const [m, i] = s.split(':').map(Number); return { m, i, it: day().meals[m][i] }; };
      root.querySelectorAll('[data-nd-day]').forEach(b => b.onclick = () => { keepText(); dd.day = +b.dataset.ndDay; dd.sel = null; ctx.rerender(); });
      root.querySelectorAll('[data-nd-g]').forEach(i => i.onchange = () => { const o = at(i.dataset.ndG), g = parseFloat(String(i.value).replace(',', '.')); o.it.g = g > 0 ? g : 0; o.it.est = false; o.it.noq = false; keepText(); ctx.rerender(); });
      root.querySelectorAll('[data-nd-rm]').forEach(b => b.onclick = () => { const o = at(b.dataset.ndRm); day().meals[o.m].splice(o.i, 1); keepText(); ctx.rerender(); });
      root.querySelectorAll('[data-nd-sw]').forEach(b => b.onclick = () => { const o = at(b.dataset.ndSw); keepText(); dd.sel = { m: o.m, i: o.i }; dd.q = o.it.name || ''; dd.manual = false; ctx.rerender(); });
      root.querySelectorAll('[data-nd-add]').forEach(b => b.onclick = () => { keepText(); dd.sel = { m: +b.dataset.ndAdd, i: -1 }; dd.q = ''; dd.manual = false; ctx.rerender(); });
      if (dd.sel) {
        const apply = fd => { const d = day(), s = dd.sel; if (s.i < 0) d.meals[s.m].push({ raw: fd.name, f: fd.id, g: 100, conf: 'ok', base: fd.id }); else { const it = d.meals[s.m][s.i]; Object.assign(it, { f: fd.id, conf: 'ok', est: false, noq: false }); if (!(it.g > 0)) it.g = 100; } dd.sel = null; ctx.rerender(); };
        if ($('nd_q')) { $('nd_q').oninput = () => { dd.q = $('nd_q').value; const pos = $('nd_q').selectionStart; ctx.rerender(); const q = $('nd_q'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (e) { } } }; }
        root.querySelectorAll('[data-nd-pick]').forEach(b => b.onclick = () => { const fd = F.getFood(dd.p, b.dataset.ndPick); if (fd) apply(fd); });
        if ($('nd_selx')) $('nd_selx').onclick = () => { dd.sel = null; ctx.rerender(); };
        if ($('nd_mok')) $('nd_mok').onclick = () => {
          const n = (id) => { const v = parseFloat(String($(id).value).replace(',', '.')); return isFinite(v) && v >= 0 ? v : null; }, name = $('nd_mn').value.trim(), k = n('nd_mk'), p = n('nd_mp'), c = n('nd_mc'), f = n('nd_mf');
          if (!name || k == null || p == null || c == null || f == null) { $('nd_mmsg').textContent = 'Compila nome, kcal, proteine, carboidrati e grassi.'; return; }
          const fd = { id: 'nf' + Date.now().toString(36), name, k, p, c, f, grp: 'Del nutrizionista' }; dd.p.nutrition.foods.push(fd); apply(fd);
        };
      }
      if ($('nd_back')) $('nd_back').onclick = () => { keepText(); dd.plan = null; dd.sel = null; ctx.rerender(); };
      if ($('nd_send')) $('nd_send').onclick = async () => {
        keepText(); const pl = dd.plan; let bad = 0; pl.days.forEach(d => d.meals.forEach(m => m.forEach(it => { if (!foodOf(it) || !(it.g > 0)) bad++; })));
        const title = (dd.title || '').trim();
        if (!title) { dd.msg = 'Scrivi un titolo.'; return ctx.rerender(); }
        if (bad) { dd.msg = 'Sistema le ' + bad + ' voci incomplete.'; return ctx.rerender(); }
        if (!await ctx.confirmBox('Inviare la dieta "' + title + '" a ' + st.cur.name + '? Il cliente la riceve nella sua app e sceglie se attivarla o continuare con la sua.', 'Invia')) return;
        const used = new Set(); pl.days.forEach(d => d.meals.forEach(m => m.forEach(it => used.add(it.f))));
        const payload = { v: 1, by: (A.me && A.me.full_name) || '', text: dd.text, plan: { name: title, days: pl.days.map(d => ({ name: d.name, dow: d.dow, meals: d.meals.map(m => m.map(it => ({ f: it.f, g: it.g, raw: it.raw || '', note: it.note || '', alt: it.alt || '' }))) })) }, foods: dd.p.nutrition.foods.filter(x => used.has(x.id)) };
        try { await A.sendDiet(st.cur.client_id, title, payload); st.dd = null; st.ddOk = 'Dieta inviata a ' + st.cur.name + ' ✓'; ctx.rerender(); }
        catch (e) { dd.msg = /row-level|policy|violat/i.test(e.message) ? 'Non puoi inviare: il collegamento con il cliente non è attivo.' : 'Non inviata: ' + e.message; ctx.rerender(); }
      };
    }
    return { html, bind, load };
  };
})(window.FORMA);
