/* Chiudi la giornata: dati alimenti scelti dall'utente e quanto manca ai suoi obiettivi, calcola le quantità
   (minimi quadrati con quantità >= 0). Non sceglie alimenti: lavora solo su quelli indicati. */
(function (F) {
  'use strict';
  const KEYS = ['k', 'p', 'c', 'f'];
  F.CLOSE_TOL = { k: 0.03, p: 0.05, c: 0.05, f: 0.05 };   // scarto ammesso rispetto all'obiettivo giornaliero
  /* risolve A^T W A x = A^T W r su un sottoinsieme di colonne (eliminazione di Gauss con pivot) */
  function solveSub(cols, r, w) {
    const n = cols.length, M = [];
    for (let i = 0; i < n; i++) {
      const row = new Array(n + 1).fill(0);
      for (let j = 0; j < n; j++) KEYS.forEach((k, t) => { row[j] += cols[i][t] * cols[j][t] * w[t]; });
      KEYS.forEach((k, t) => { row[n] += cols[i][t] * r[t] * w[t]; });
      row[i] += 1e-9;
      M.push(row);
    }
    for (let i = 0; i < n; i++) {
      let m = i; for (let j = i + 1; j < n; j++) if (Math.abs(M[j][i]) > Math.abs(M[m][i])) m = j;
      if (Math.abs(M[m][i]) < 1e-12) return null;
      const tmp = M[i]; M[i] = M[m]; M[m] = tmp;
      for (let j = i + 1; j < n; j++) { const f = M[j][i] / M[i][i]; for (let c = i; c <= n; c++) M[j][c] -= f * M[i][c]; }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) { let s = M[i][n]; for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i]; }
    return x;
  }
  /**
   * foods: [{ k, p, c, f }] per 100 g/ml
   * need:  { k, p, c, f } quanto manca ai totali di oggi (può essere negativo)
   * target:{ k, p, c, f } obiettivi giornalieri (servono a pesare gli scarti)
   * opt:   { step: arrotondamento in g (default 5), max: massimo per alimento (default 800) }
   * ritorna { g: [..], got: {k,p,c,f}, miss: {k,p,c,f}, ok: bool }
   */
  F.closeDay = function (foods, need, target, opt) {
    opt = opt || {}; const step = opt.step || 5, max = opt.max || 800, n = foods.length;
    if (!n) return { g: [], got: { k: 0, p: 0, c: 0, f: 0 }, miss: Object.assign({}, need), ok: false };
    const cols = foods.map(fd => KEYS.map(k => (fd[k] || 0) / 100));   // contributo per 1 g
    /* limite di buon senso per alimento: al massimo il 35% delle kcal giornaliere (evita quantità assurde, per esempio centinaia di grammi di olio) */
    const caps = cols.map(c => c[0] > 0 && target.k > 0 ? Math.min(max, Math.floor(0.35 * target.k / c[0] / step) * step) : max);
    const r = KEYS.map(k => need[k]), w = KEYS.map(k => { const s = Math.max(1, (target[k] || 1) * F.CLOSE_TOL[k]); return 1 / (s * s); });
    const cost = x => { let c = 0; KEYS.forEach((k, t) => { let v = -r[t]; for (let i = 0; i < n; i++) v += cols[i][t] * x[i]; c += w[t] * v * v; }); return c; };
    let best = new Array(n).fill(0), bc = cost(best);
    for (let mask = 1; mask < (1 << n); mask++) {
      const idx = []; for (let i = 0; i < n; i++) if (mask & (1 << i)) idx.push(i);
      const sol = solveSub(idx.map(i => cols[i]), r, w); if (!sol) continue;
      const x = new Array(n).fill(0); let feas = true;
      idx.forEach((i, j) => { if (sol[j] < 0) feas = false; x[i] = Math.min(caps[i], Math.max(0, sol[j])); });
      if (!feas) continue;
      const c = cost(x); if (c < bc) { bc = c; best = x; }
    }
    /* arrotondamento pratico: prova floor/ceil di ogni quantità e tiene la combinazione con scarto minore */
    const opts = best.map((v, i) => { const a = Math.floor(v / step) * step, b = a + step; return [Math.min(caps[i], a), Math.min(caps[i], b)]; });
    let rb = best.map((v, i) => Math.min(caps[i], Math.round(v / step) * step)), rc = cost(rb);
    const rec = (i, cur) => { if (i === n) { const c = cost(cur); if (c < rc) { rc = c; rb = cur.slice(); } return; } opts[i].forEach(v => { cur[i] = v; rec(i + 1, cur); }); };
    rec(0, new Array(n).fill(0));
    const got = { k: 0, p: 0, c: 0, f: 0 }; KEYS.forEach((k, t) => { for (let i = 0; i < n; i++) got[k] += cols[i][t] * rb[i]; });
    const miss = {}, ok0 = {}; let ok = true;
    KEYS.forEach(k => { miss[k] = need[k] - got[k]; const lim = (target[k] || 0) * F.CLOSE_TOL[k]; ok0[k] = Math.abs(miss[k]) <= lim; if (!ok0[k]) ok = false; });
    return { g: rb, got, miss, ok, okBy: ok0 };
  };
})(window.FORMA);
