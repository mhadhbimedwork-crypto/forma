/* FORGIA – formato consigliato per incollare schede: esempio in grigio, guida a tendina e suggerimenti.
   L'app resta libera: i suggerimenti non bloccano mai, servono solo a far leggere meglio la scheda. */
(function (F) {
  'use strict';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  F.FMT = {
    diet: [
      'LUNEDÌ', 'COLAZIONE', 'Latte parzialmente scremato 200 ml', 'Pane integrale 50 g', 'o Fette biscottate 30 g',
      'SPUNTINO 1', 'Yogurt greco 150 g', 'PRANZO', 'Riso 80 g', 'Petto di pollo 150 g', 'Olio extravergine d\'oliva 10 ml',
      'PRIMA DELL\'ALLENAMENTO', 'Banana 1', 'DOPO L\'ALLENAMENTO', 'Proteine in polvere (whey) 30 g',
      'CENA', 'Merluzzo 200 g', 'Patate 250 g', 'INTEGRATORI', 'Creatina 5 g', 'ACQUA', '2,5 litri al giorno', 'NOTE', 'Pesare gli alimenti a crudo.'],
    train: [
      '# Giorno A - Petto e tricipiti', 'Panca piana 4x6 @80% rec 2 min', 'Croci ai cavi 3x12 RPE 8', 'Pushdown ai cavi 3x10-12 rec 90s',
      '# Giorno B - Schiena e bicipiti', 'Lat machine 4x8 RPE 8', 'Rematore con manubrio 3x10', 'Curl con bilanciere 3x10',
      '# Giorno C - Gambe', 'Squat 5x5 @75% rec 3 min', 'Leg press 3x12 rec 90s', 'Leg curl 3x12']
  };
  F.fmtExample = k => F.FMT[k].join('\n');
  // attributo placeholder: il testo grigio mostrato nel riquadro vuoto
  F.fmtPlaceholder = k => esc(F.fmtExample(k)).replace(/\n/g, '&#10;');
  const GUIDE = {
    diet: [
      ['Giorni', 'Scrivi il giorno su una riga da solo (LUNEDÌ, MARTEDÌ…). Se la dieta è uguale tutti i giorni puoi non scriverlo.'],
      ['Pasti e spuntini', 'Un titolo per riga: COLAZIONE, SPUNTINO 1, PRANZO, PRIMA DELL\'ALLENAMENTO, DOPO L\'ALLENAMENTO, CENA… Qualsiasi titolo va bene: l\'app crea la casella con quel nome.'],
      ['Alimenti e quantità', 'Un alimento per riga con la quantità: «Riso 80 g», «Latte 200 ml», «Banana 1». Se scrivi solo il numero («Uova 2») l\'app capisce che sono pezzi.'],
      ['Alternative', 'Metti «o» oppure «in alternativa» all\'inizio della riga: «o Fette biscottate 30 g». L\'atleta potrà scambiare l\'alimento e le calorie non si sommano due volte.'],
      ['Integratori', 'Titolo INTEGRATORI e un prodotto per riga con la dose: «Creatina 5 g». L\'atleta sceglie se contarli nelle calorie.'],
      ['Acqua', 'Titolo ACQUA oppure una riga come «2,5 litri al giorno».'],
      ['Note', 'Titolo NOTE: tutto il testo sotto resta come nota per l\'atleta.']],
    train: [
      ['Giorni', 'Una riga che inizia con # per ogni giorno: «# Giorno A - Petto». Puoi usare anche Push, Lunedì, Upper…'],
      ['Esercizi', 'Un esercizio per riga: nome, poi serie×ripetizioni, per esempio «Panca piana 4x6». Intervalli: «3x10-12».'],
      ['Intensità', 'Percentuale con @ («@80%»), oppure RPE («RPE 8») o RIR («RIR 2»).'],
      ['Recupero', '«rec 90s» oppure «rest 2 min».'],
      ['Metodi particolari', 'Superset, EMOM, back-off, myo-reps: scrivili nella riga o in nota. Se l\'app non li capisce li lascia come testo.']]
  };
  // tendina con spiegazione + bottone per copiare l'esempio nel riquadro (idDelRiquadro)
  F.fmtGuide = (k, taId) => '<details class="fmtg" style="margin:6px 0"><summary style="cursor:pointer" class="small"><b>Come scrivere ' + (k === 'diet' ? 'la dieta' : 'la scheda') + ' per farla leggere bene</b></summary>' +
    '<div class="small" style="margin-top:6px">' + GUIDE[k].map(g => '<p style="margin:6px 0"><b>' + esc(g[0]) + '.</b> ' + esc(g[1]) + '</p>').join('') +
    '<p class="mute" style="margin:6px 0">Non è obbligatorio: puoi scrivere a modo tuo. Se qualcosa non è chiaro l\'app te lo segnala e tu (o l\'atleta) puoi correggere tutto prima di salvare.</p>' +
    '<button type="button" class="sm" data-fmt-ex="' + k + '" data-fmt-for="' + esc(taId) + '">Inserisci l\'esempio nel riquadro</button></div></details>';
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-fmt-ex]'); if (!b) return;
    const ta = document.getElementById(b.dataset.fmtFor); if (!ta) return;
    ta.value = F.fmtExample(b.dataset.fmtEx); ta.dispatchEvent(new Event('input', { bubbles: true })); ta.dispatchEvent(new Event('change', { bubbles: true }));
  });
  // suggerimenti dopo la lettura (mai bloccanti). pl = risultato di parsePlanText.
  F.fmtHintsDiet = function (pl, text) {
    const h = [], bad = [], noq = []; let any = false;
    ((pl && pl.days) || []).forEach(d => (d.meals || []).forEach(m => (m || []).forEach(it => { any = true;
      if (!it || it.kind === 'free') return;
      if (it.kind !== 'supp' && !it.f) bad.push(it.raw || it.name);
      else if (it.kind !== 'supp' && !(it.g > 0)) noq.push(it.raw || it.name); })));
    if (bad.length) h.push('Alimenti non riconosciuti: ' + bad.slice(0, 4).map(x => '«' + x + '»').join(', ') + (bad.length > 4 ? '…' : '') + '. Scrivi il nome come sul catalogo oppure sceglilo a mano nella lista.');
    if (noq.length) h.push('Manca la quantità: ' + noq.slice(0, 4).map(x => '«' + x + '»').join(', ') + '. Scrivila dopo il nome, ad esempio «80 g».');
    if (any && !(pl && pl.water) && !/acqua|litri|\bl\b/i.test(text || '')) h.push('Non trovo l\'acqua. Se vuoi, aggiungi una riga come «ACQUA: 2,5 litri al giorno».');
    if (any && ((pl.days || []).length === 1) && !/(luned|marted|mercoled|gioved|venerd|sabato|domenica)/i.test(text || '')) h.push('Nessun giorno indicato: la dieta vale per tutti i giorni. Per giorni diversi scrivi LUNEDÌ, MARTEDÌ… su righe da sole.');
    return h;
  };
  F.fmtHintsTrain = function (r, text) {
    const h = [], t = String(text || '');
    if (!/^\s*#/m.test(t) && !/^\s*(giorno|day|push|pull|legs|upper|lower|luned|marted|mercoled|gioved|venerd|sabato|domenica)/im.test(t)) h.push('Non vedo titoli dei giorni: scrivi una riga per ogni giorno, ad esempio «# Giorno A - Petto».');
    const all = ((r && r.days) || []).flatMap(d => d.exercises || []);
    const unk = all.filter(x => !x.exId).map(x => x.name);
    if (unk.length) h.push('Esercizi da collegare a mano: ' + unk.slice(0, 4).map(x => '«' + x + '»').join(', ') + (unk.length > 4 ? '…' : '') + '.');
    const nos = all.filter(x => !(x.sets > 0)).map(x => x.name);
    if (nos.length) h.push('Mancano le serie: ' + nos.slice(0, 4).map(x => '«' + x + '»').join(', ') + '. Scrivile così: «4x8».');
    return h;
  };
  F.fmtHintsHtml = h => h && h.length ? '<div class="card" style="border-color:var(--warn,#f5b942)"><b>Suggerimenti per leggere meglio</b><ul class="small" style="margin:6px 0 0;padding-left:18px">' + h.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul><p class="mute small" style="margin:6px 0 0">Sono solo consigli: puoi salvare così e correggere dopo.</p></div>' : '';
})(window.FORMA = window.FORMA || {});
