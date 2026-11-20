/* FORGIA – strumenti del professionista (nutrizionista / dietista): misure, plicometria, bioimpedenza, esami, calcolatrice del metabolismo.
   Sono CALCOLATRICI per il professionista: l'app non interpreta i risultati e non dà indicazioni. Ogni formula è dichiarata con la sua fonte. */
(function (F) {
  'use strict';
  const num = v => { if (v == null || v === '') return null; const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; };
  const r1 = v => v == null ? null : Math.round(v * 10) / 10, r2 = v => v == null ? null : Math.round(v * 100) / 100;
  const sum = (o, keys) => { let s = 0; for (const k of keys) { const v = num(o && o[k]); if (!(v > 0)) return null; s += v; } return s; };

  /** Campi guidati: etichette e unità, nell'ordine in cui il professionista li compila */
  F.NUTRI_FIELDS = {
    visit: [['w', 'Peso', 'kg']],
    circ: [['vita', 'Vita', 'cm'], ['fianchi', 'Fianchi', 'cm'], ['torace', 'Torace', 'cm'], ['braccio', 'Braccio', 'cm'], ['avambraccio', 'Avambraccio', 'cm'], ['coscia', 'Coscia', 'cm'], ['polpaccio', 'Polpaccio', 'cm'], ['collo', 'Collo', 'cm']],
    skin: [['petto', 'Pettorale', 'mm'], ['ascellare', 'Ascellare media', 'mm'], ['tricipite', 'Tricipite', 'mm'], ['bicipite', 'Bicipite', 'mm'], ['sottoscapolare', 'Sottoscapolare', 'mm'], ['addome', 'Addominale', 'mm'], ['soprailiaca', 'Soprailiaca', 'mm'], ['coscia', 'Coscia', 'mm'], ['polpaccio', 'Polpaccio', 'mm']],
    bia: [['r', 'Resistenza (R)', 'Ω'], ['xc', 'Reattanza (Xc)', 'Ω'], ['pa', 'Angolo di fase', '°'], ['tbw', 'Acqua totale (TBW)', 'l'], ['ecw', 'Acqua extracellulare (ECW)', 'l'], ['icw', 'Acqua intracellulare (ICW)', 'l'], ['ffm', 'Massa magra (FFM)', 'kg'], ['fm', 'Massa grassa (FM)', 'kg'], ['fmPct', 'Massa grassa', '%'], ['bcm', 'Massa cellulare (BCM)', 'kg'], ['smm', 'Massa muscolare scheletrica', 'kg'], ['bmr', 'Metabolismo basale misurato', 'kcal']]
  };
  /** Esami del sangue/urine più usati: nome e unità; i valori di riferimento li scrive chi carica l'esame, dal referto del laboratorio */
  F.NUTRI_LABS = [['Glicemia', 'mg/dl'], ['Emoglobina glicata (HbA1c)', 'mmol/mol'], ['Insulina', 'µUI/ml'], ['Colesterolo totale', 'mg/dl'], ['Colesterolo HDL', 'mg/dl'], ['Colesterolo LDL', 'mg/dl'], ['Trigliceridi', 'mg/dl'], ['Emoglobina', 'g/dl'], ['Ferritina', 'ng/ml'], ['Sideremia', 'µg/dl'], ['Vitamina D (25-OH)', 'ng/ml'], ['Vitamina B12', 'pg/ml'], ['Folati', 'ng/ml'], ['TSH', 'µUI/ml'], ['Creatinina', 'mg/dl'], ['Azotemia', 'mg/dl'], ['AST (GOT)', 'U/l'], ['ALT (GPT)', 'U/l'], ['Gamma-GT', 'U/l'], ['Acido urico', 'mg/dl'], ['PCR', 'mg/l'], ['Sodio', 'mmol/l'], ['Potassio', 'mmol/l'], ['Calcio', 'mg/dl'], ['Magnesio', 'mg/dl']];

  /** Densità corporea → % massa grassa (Siri 1961: 495/D − 450) */
  const siri = d => 495 / d - 450;
  /** Jackson & Pollock (1978/1980) 3 pliche; Jackson, Pollock & Ward (1980) donne */
  function jp3(sex, age, s) {
    let S, D;
    if (sex === 'M') { S = sum(s, ['petto', 'addome', 'coscia']); if (S == null) return null; D = 1.10938 - 0.0008267 * S + 0.0000016 * S * S - 0.0002574 * age; }
    else { S = sum(s, ['tricipite', 'soprailiaca', 'coscia']); if (S == null) return null; D = 1.0994921 - 0.0009929 * S + 0.0000023 * S * S - 0.0001392 * age; }
    return { S, D };
  }
  /** Jackson & Pollock 7 pliche: petto, ascellare, tricipite, sottoscapolare, addome, soprailiaca, coscia */
  function jp7(sex, age, s) {
    const S = sum(s, ['petto', 'ascellare', 'tricipite', 'sottoscapolare', 'addome', 'soprailiaca', 'coscia']); if (S == null) return null;
    const D = sex === 'M' ? 1.112 - 0.00043499 * S + 0.00000055 * S * S - 0.00028826 * age : 1.097 - 0.00046971 * S + 0.00000056 * S * S - 0.00012828 * age;
    return { S, D };
  }
  /** Durnin & Womersley (1974): bicipite, tricipite, sottoscapolare, soprailiaca; D = c − m·log10(somma) */
  const DW = { M: [[17, 1.1620, 0.0630], [20, 1.1631, 0.0632], [30, 1.1422, 0.0544], [40, 1.1620, 0.0700], [50, 1.1715, 0.0779]], F: [[17, 1.1549, 0.0678], [20, 1.1599, 0.0717], [30, 1.1423, 0.0632], [40, 1.1333, 0.0612], [50, 1.1339, 0.0645]] };
  function dw(sex, age, s) {
    const S = sum(s, ['bicipite', 'tricipite', 'sottoscapolare', 'soprailiaca']); if (S == null) return null;
    const rows = DW[sex === 'M' ? 'M' : 'F'], row = rows.filter(r => age >= r[0]).pop() || rows[0];
    return { S, D: row[1] - row[2] * Math.log10(S) };
  }
  F.SKINFOLD_METHODS = { jp3: ['Jackson-Pollock 3 pliche', jp3], jp7: ['Jackson-Pollock 7 pliche', jp7], dw: ['Durnin-Womersley 4 pliche', dw] };

  /** Calcoli derivati di una visita: { sex, age, h (cm), w (kg) } + record { circ, skin, bia } */
  F.nutriDerive = function (c, rec) {
    const h = num(c.h), w = num(rec.w != null ? rec.w : c.w), age = num(c.age), sex = c.sex === 'F' ? 'F' : 'M', out = { notes: [] };
    if (h > 0 && w > 0) out.bmi = r1(w / Math.pow(h / 100, 2));
    const ci = rec.circ || {}, vita = num(ci.vita), fian = num(ci.fianchi);
    if (vita > 0 && fian > 0) out.whr = r2(vita / fian);
    if (vita > 0 && h > 0) out.whtr = r2(vita / h);
    out.skin = [];
    if (age > 0) Object.keys(F.SKINFOLD_METHODS).forEach(k => {
      const res = F.SKINFOLD_METHODS[k][1](sex, age, rec.skin || {}); if (!res) return;
      const bf = siri(res.D); if (!isFinite(bf)) return;
      const item = { k, name: F.SKINFOLD_METHODS[k][0], sum: r1(res.S), density: Math.round(res.D * 10000) / 10000, bfPct: r1(bf) };
      if (w > 0) { item.fm = r1(w * bf / 100); item.ffm = r1(w - w * bf / 100); }
      out.skin.push(item);
    });
    const b = rec.bia || {}, R = num(b.r), Xc = num(b.xc);
    let pa = num(b.pa); if (pa == null && R > 0 && Xc > 0) { pa = Math.atan(Xc / R) * 180 / Math.PI; out.paDerived = true; }
    if (pa != null) out.pa = r1(pa);
    const tbw = num(b.tbw), ecw = num(b.ecw), icw = num(b.icw), ffm = num(b.ffm), fm = num(b.fm);
    if (tbw > 0 && ecw > 0) out.ecwTbw = r1(ecw / tbw * 100);
    else if (ecw > 0 && icw > 0) out.ecwTbw = r1(ecw / (ecw + icw) * 100);
    if (tbw > 0 && ffm > 0) out.hydration = r1(tbw / ffm * 100);
    if (h > 0 && ffm > 0) out.ffmi = r1(ffm / Math.pow(h / 100, 2));
    if (h > 0 && fm > 0) out.fmi = r1(fm / Math.pow(h / 100, 2));
    if (w > 0 && fm > 0 && num(b.fmPct) == null) out.fmPct = r1(fm / w * 100);
    return out;
  };

  /** Calcolatrice del metabolismo per il professionista (formule pubblicate; nessuna indicazione calorica) */
  F.nutriBMR = function (c) {
    const w = num(c.w), h = num(c.h), a = num(c.age), M = c.sex !== 'F', ffm = num(c.ffm), out = [];
    if (w > 0 && h > 0 && a > 0) {
      out.push({ k: 'mifflin', name: 'Mifflin-St Jeor (1990)', kcal: Math.round(10 * w + 6.25 * h - 5 * a + (M ? 5 : -161)) });
      out.push({ k: 'hb', name: 'Harris-Benedict rivista (Roza e Shizgal, 1984)', kcal: Math.round(M ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * a : 447.593 + 9.247 * w + 3.098 * h - 4.330 * a) });
    }
    if (ffm > 0) { out.push({ k: 'katch', name: 'Katch-McArdle', kcal: Math.round(370 + 21.6 * ffm) }); out.push({ k: 'cunn', name: 'Cunningham', kcal: Math.round(500 + 22 * ffm) }); }
    const laf = num(c.laf); if (laf > 0) out.forEach(o => { o.total = Math.round(o.kcal * laf); });
    return out;
  };

  /** Screening MUST (BAPEN): BMI, calo di peso non voluto, malattia acuta */
  F.nutriMUST = function (a) {
    const bmi = num(a.bmi), loss = num(a.lossPct); if (!(bmi > 0) || loss == null) return null;
    const sb = bmi > 20 ? 0 : bmi >= 18.5 ? 1 : 2, sl = loss < 5 ? 0 : loss <= 10 ? 1 : 2, sa = a.acute ? 2 : 0, tot = sb + sl + sa;
    return { score: tot, parts: { bmi: sb, loss: sl, acute: sa }, level: tot === 0 ? 'basso' : tot === 1 ? 'medio' : 'alto' };
  };

  /** Esame: segna i valori fuori dall'intervallo scritto dal professionista (dal referto), senza interpretarli */
  F.nutriLabFlag = function (l) {
    const v = num(l.value), lo = num(l.lo), hi = num(l.hi); if (v == null) return '';
    if (lo != null && v < lo) return 'low'; if (hi != null && v > hi) return 'high'; return (lo != null || hi != null) ? 'ok' : '';
  };

  /* ---- importazione: testo libero o CSV (nome;valore;unità) dagli strumenti -> campi riconosciuti ---- */
  const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const KEYS = [
    ['w', ['peso corporeo', 'peso', 'weight', 'body weight']], ['h', ['altezza', 'statura', 'height']],
    ['circ.vita', ['vita', 'circonferenza vita', 'waist']], ['circ.fianchi', ['fianchi', 'circonferenza fianchi', 'hip']], ['circ.torace', ['torace', 'petto circonferenza', 'chest']], ['circ.braccio', ['braccio', 'arm']], ['circ.avambraccio', ['avambraccio']], ['circ.coscia', ['circonferenza coscia']], ['circ.polpaccio', ['circonferenza polpaccio']], ['circ.collo', ['collo', 'neck']],
    ['skin.tricipite', ['plica tricipite', 'tricipite', 'triceps']], ['skin.bicipite', ['plica bicipite', 'bicipite']], ['skin.sottoscapolare', ['plica sottoscapolare', 'sottoscapolare', 'subscapular']], ['skin.soprailiaca', ['plica soprailiaca', 'soprailiaca', 'suprailiac']], ['skin.addome', ['plica addominale', 'addominale']], ['skin.coscia', ['plica coscia']], ['skin.petto', ['plica pettorale', 'pettorale']], ['skin.ascellare', ['plica ascellare', 'ascellare']],
    ['bia.r', ['resistenza', 'resistance', 'rz', 'r (ohm)']], ['bia.xc', ['reattanza', 'reactance', 'xc']], ['bia.pa', ['angolo di fase', 'phase angle', 'pa']],
    ['bia.tbw', ['acqua totale', 'total body water', 'tbw']], ['bia.ecw', ['acqua extracellulare', 'extracellular water', 'ecw']], ['bia.icw', ['acqua intracellulare', 'intracellular water', 'icw']],
    ['bia.ffm', ['massa magra', 'fat free mass', 'ffm']], ['bia.fm', ['massa grassa kg', 'fat mass', 'fm']], ['bia.fmPct', ['massa grassa', 'grasso corporeo', 'body fat', 'percentuale grasso', 'pbf']],
    ['bia.bcm', ['massa cellulare', 'body cell mass', 'bcm']], ['bia.smm', ['massa muscolare scheletrica', 'skeletal muscle mass', 'smm']], ['bia.bmr', ['metabolismo basale', 'bmr', 'rmr']]
  ];
  /** Ritorna { found: {chiave: valore}, lines: [{raw, key, value}], unknown: [riga] } */
  F.nutriParse = function (text) {
    const found = {}, lines = [], unknown = [];
    String(text || '').split(/\r?\n/).forEach(raw => {
      const ln = raw.trim(); if (!ln) return;
      const m = /^(.*?)[\s]*[:;=\t]\s*(-?\d+(?:[.,]\d+)?)\s*([a-zA-ZΩ%°µ/]*)\s*$/.exec(ln) || /^(.*?)\s+(-?\d+(?:[.,]\d+)?)\s*([a-zA-ZΩ%°µ/]*)\s*$/.exec(ln);
      if (!m) { unknown.push(ln); return; }
      const label = norm(m[1]).replace(/\s+/g, ' ').trim(), unit = norm(m[3] || ''); let val = num(m[2]);
      let hit = null;
      // la chiave con il nome più lungo contenuto nell'etichetta vince ("massa grassa kg" prima di "massa grassa")
      KEYS.forEach(([key, names]) => names.forEach(n => { const nn = norm(n); if (label === nn || (nn.length > 3 && label.indexOf(nn) >= 0)) { if (!hit || nn.length > hit.len) hit = { key, len: nn.length }; } }));
      if (hit && hit.key === 'bia.fmPct' && unit === 'kg') hit.key = 'bia.fm';
      if (hit && hit.key === 'bia.fm' && unit === '%') hit.key = 'bia.fmPct';
      if (hit && /^(h|circ\.)/.test(hit.key) && unit === 'm' && val < 3) val = Math.round(val * 1000) / 10;   // metri → cm
      if (!hit) { unknown.push(ln); return; }
      found[hit.key] = val; lines.push({ raw: ln, key: hit.key, value: val });
    });
    return { found, lines, unknown };
  };
  /** Applica i campi riconosciuti a un record { w, circ, skin, bia } */
  F.nutriApply = function (rec, found) {
    Object.keys(found).forEach(k => { const p = k.split('.'); if (p.length === 1) rec[p[0]] = found[k]; else { rec[p[0]] = rec[p[0]] || {}; rec[p[0]][p[1]] = found[k]; } });
    return rec;
  };
  /** Condizioni d'uso dell'area professionale: si accettano al primo accesso (e a ogni nuova versione) */
  F.NUTRI_TERMS_VERSION = '2026-11-a';
  F.NUTRI_TERMS = [
    ['Strumento di lavoro', 'Quest\'area è uno strumento per registrare, calcolare ed esportare dati. Non fornisce valutazioni cliniche, diagnosi, diete o indicazioni: le formule sono quelle pubblicate e i risultati sono un supporto al tuo giudizio professionale, che resta l\'unico a decidere.'],
    ['Responsabilità del professionista', 'Sei il solo responsabile di ciò che inserisci, misuri, interpreti, prescrivi e comunichi ai tuoi clienti, del rispetto delle norme della tua professione e del tuo codice deontologico, e dell\'abilitazione all\'esercizio. Dichiari di essere abilitato e iscritto all\'albo o all\'ordine, ove richiesto.'],
    ['Dati dei clienti', 'Puoi vedere solo i dati che il cliente ha consentito. Per i dati che inserisci e conservi sei autonomo titolare del trattamento: informa i clienti, ottieni i consensi necessari, usa i dati solo per le finalità della prestazione e non condividerli con altri. Esporta e conserva i file scaricati con adeguate misure di sicurezza.'],
    ['Minorenni', 'Per i minorenni serve il consenso di un genitore o tutore, che devi poter documentare.'],
    ['Nessuna garanzia', 'Il servizio è fornito così com\'è, senza garanzie di continuità, assenza di errori o idoneità a uno scopo particolare. Mantieni copie dei dati che ti servono.'],
    ['Limiti di responsabilità', 'Nei limiti consentiti dalla legge, chi sviluppa e pubblica l\'app non risponde dei danni derivanti dall\'uso dell\'area professionale né delle scelte professionali dell\'utente. Resta ferma la responsabilità che la legge non permette di escludere (ad esempio per dolo o colpa grave) e i diritti inderogabili dei consumatori.']
  ];
})(window.FORMA || (window.FORMA = {}));
