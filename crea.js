/* FORGIA – Tabelle di composizione degli alimenti CREA (dati per 100 g di parte edibile).
   Fonte: CREA – Centro di ricerca Alimenti e Nutrizione, "Tabelle di composizione degli alimenti, Aggiornamento 2019"
   (a cura di L. Marletta e E. Camilli), https://www.alimentinutrizione.it – https://www.crea.gov.it/alimenti-e-nutrizione
   I dati stanno in crea.json e si caricano al primo uso; senza connessione restano disponibili dalla cache. */
(function (F) {
  'use strict';
  F.CREA = []; F.CREAMAP = {};
  F.CREA_FONTE = 'CREA – Centro di ricerca Alimenti e Nutrizione, Tabelle di composizione degli alimenti, Aggiornamento 2019 (a cura di L. Marletta e E. Camilli)';
  F.CREA_URL = 'https://www.alimentinutrizione.it/tabelle-nutrizionali/';
  F.CREAMICRO = null;   // vitamine e minerali per codice (file facoltativo crea_micro.json): { codice: { m: [[nome, unità, valore]], v: [[...]] } }
  let loading = null;
  // riga: [codice, nome, categoria, % edibile, kcal, proteine, lipidi, carboidrati disponibili, zuccheri solubili, fibra, sodio mg]
  const num = v => (v == null || v === '' ? 0 : +v || 0);
  F.loadCrea = function () {
    if (F.CREA.length) return Promise.resolve(F.CREA);
    if (loading) return loading;
    loading = fetch('crea.json').then(r => { if (!r.ok) throw 0; return r.json(); }).then(d => {
      const rows = d.righe || [];
      F.CREA = rows.map(r => ({ id: 'crea_' + r[0], name: r[1], k: num(r[4]), p: num(r[5]), c: num(r[7]), f: num(r[6]), grp: 'CREA', cat: r[2], edi: r[3], sug: r[8], fib: r[9], na: r[10], src: 'CREA', code: r[0], units: r[11] > 0 ? [['1 porzione (' + r[11] + ' g)', r[11]]] : [] }));
      F.CREAMAP = Object.fromEntries(F.CREA.map(x => [x.id, x]));
      F.CREA.forEach(x => { x.nn = F.normText ? F.normText(x.name + ' ' + x.cat) : x.name.toLowerCase(); });
      return F.CREA;
    }).catch(() => { loading = null; return []; });
    const mp = (!F.CREAMICRO) ? fetch('crea_micro.json').then(r => r.ok ? r.json() : null).then(d => { if (d && d.dati) F.CREAMICRO = d.dati; }).catch(() => { }) : Promise.resolve();
    loading = loading.then(r => mp.then(() => r));
    return loading;
  };
  /** cerca nelle tabelle CREA: tutte le parole devono comparire; prima chi inizia con la ricerca */
  F.searchCrea = function (q, max) {
    const nq = F.normText ? F.normText(q) : String(q || '').toLowerCase(); if (!nq || !F.CREA.length) return [];
    const toks = nq.split(' ');
    return F.CREA.map(fd => {
      if (!toks.every(t => fd.nn.indexOf(t) >= 0)) return null;
      const nm = F.normText(fd.name);
      return { fd, s: nm === nq ? 100 : nm.indexOf(nq) === 0 ? 80 : nm.indexOf(nq) >= 0 ? 60 : 40 };
    }).filter(Boolean).sort((a, b) => b.s - a.s || a.fd.name.length - b.fd.name.length).slice(0, max || 15).map(o => o.fd);
  };
  F.creaLink = fd => F.CREA_URL + encodeURIComponent(fd.code);
})(window.FORMA);
