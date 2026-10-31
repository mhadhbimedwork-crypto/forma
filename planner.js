/* Piano della giornata: pasti composti, abbinamenti sensati, dosi entro i limiti, intolleranze.
   Regole nutrizionali generali di orientamento: non sostituiscono un nutrizionista o un medico. */
(function (F) {
  'use strict';
  const T = {
    lattosio: ['latte', 'latte_ps', 'kefir', 'yogurt_greco', 'skyr', 'fiocchi_latte', 'ricotta', 'parmigiano', 'mozzarella', 'scamorza', 'whey'],
    glutine: ['avena', 'pasta', 'pane', 'fette_biscottate', 'quinoa', 'panino', 'pane_tramezzino', 'birra'],
    legumi: ['legumi', 'ceci_cotti', 'tofu', 'hummus', 'latte_soia'],
    soia: ['tofu', 'latte_soia'],
    uova: ['uovo', 'albume'],
    frutta_secca: ['noci', 'mandorle', 'frutta_secca', 'burro_arachidi', 'noci_fresche', 'semini', 'latte_mandorla'],
    crucifere: ['cavolfiore', 'broccoli', 'verza', 'cime_rapa'],
    carne_rossa: ['bovino_magro', 'bovino_cuore', 'bovino_fegato', 'salame']
  };
  F.INTOL = [['lattosio', 'Lattosio e latticini'], ['glutine', 'Glutine'], ['legumi', 'Legumi (anche tofu e soia)'], ['uova', 'Uova'], ['pesce', 'Pesce e crostacei'], ['frutta_secca', 'Frutta secca e arachidi']];
  F.foodTags = function (fd) {
    const t = [];
    for (const k in T) if (T[k].indexOf(fd.id) >= 0) t.push(k);
    if (fd.grp === 'Pesce') t.push('pesce');
    if (fd.grp === 'Formaggi' && t.indexOf('lattosio') < 0) t.push('lattosio');
    return t;
  };
  // true se l'alimento va evitato per il profilo
  F.isAvoided = function (p, fd) {
    const it = p.intol || {}, tags = F.foodTags(fd);
    if (F.INTOL.some(([k]) => it[k] && (tags.indexOf(k) >= 0 || (k === 'legumi' && tags.indexOf('soia') >= 0)))) return true;
    const words = F.normText(it.other || '').split(' ').filter(w => w.length >= 3);
    if (words.length) { const nm = F.normText(fd.name + ' ' + (fd.al || []).join(' ')); if (words.some(w => nm.indexOf(w) >= 0)) return true; }
    return false;
  };
  F.avoidedLabels = function (p) {
    const it = p.intol || [], out = F.INTOL.filter(([k]) => (p.intol || {})[k]).map(x => x[1].split(' (')[0]);
    if ((p.intol || {}).other && p.intol.other.trim()) out.push(p.intol.other.trim());
    return out;
  };
  // avvisi su cosa è già nel diario
  F.intolWarnings = function (p, date) {
    const u = F.usageOf(p, date), out = [];
    F.allFoods(p).forEach(fd => { if (u[fd.id] > 0 && F.isAvoided(p, fd)) out.push({ k: 'danger', text: `${fd.name} è tra gli alimenti che hai segnato come fastidiosi: evitalo o sostituiscilo.` }); });
    return out;
  };

  // quantità massima ragionevole in un singolo pasto
  const MEALMAX = { Carne: 250, Pesce: 250, Frattaglie: 120, 'Uova e latticini': 300, Formaggi: 60, Cereali: 130, Verdura: 300, Frutta: 250, 'Grassi e secchi': 30, Dolci: 20, Integratori: 40, 'Affettati e panini': 100, Bevande: 300, Altro: 150 };
  const MM = { uovo: 150, olio: 15, patate: 250, patate_dolci: 200, ceci_cotti: 200, riso_cotto: 300, pane: 100, avena: 100, gallette_riso: 40, gallette_mais: 40, burro_arachidi: 32, albume: 200, yogurt_greco: 250, skyr: 250, whey: 40, fiocchi_latte: 200, panino: 100, noci: 30, mandorle: 30, frutta_secca: 30, semini: 15, avocado: 100, legumi: 60, verdura: 300, tofu: 150 };
  const mealMax = fd => MM[fd.id] || MEALMAX[fd.grp] || 150;
  const roundG = (fd, g) => { const un = fd.units && fd.units[0] && fd.units[0][1] <= 60 && fd.units[0][1] >= 8 ? fd.units[0][1] : 0; if (un && g >= un * 0.75) return Math.max(un, Math.round(g / un) * un); return g >= 100 ? Math.round(g / 10) * 10 : Math.round(g / 5) * 5; };
  const has = (items, tag) => items.some(o => F.foodTags(o.fd).indexOf(tag) >= 0);
  // abbinamenti da evitare nello stesso pasto (gonfiori, digestione pesante)
  function compat(items, fd) {
    const tg = F.foodTags(fd);
    if (tg.indexOf('legumi') >= 0 && (has(items, 'lattosio') || has(items, 'crucifere'))) return false;
    if (tg.indexOf('lattosio') >= 0 && (has(items, 'legumi') || (has(items, 'pesce') && fd.grp === 'Formaggi'))) return false;
    if (tg.indexOf('crucifere') >= 0 && has(items, 'legumi')) return false;
    if (tg.indexOf('pesce') >= 0 && items.some(o => o.fd.grp === 'Formaggi')) return false;
    if (tg.indexOf('carne_rossa') >= 0 && items.some(o => o.fd.grp === 'Formaggi')) return false;
    if ((fd.id === 'patate' || fd.id === 'patate_dolci') && items.some(o => o.fd.id === 'patate' || o.fd.id === 'patate_dolci')) return false;
    if (fd.grp === 'Cereali' && fd.id !== 'ceci_cotti' && fd.id !== 'legumi' && fd.id !== 'patate' && fd.id !== 'patate_dolci' && items.some(o => o.fd.grp === 'Cereali' && o.fd.id !== 'ceci_cotti' && o.fd.id !== 'legumi' && o.role === 'carb' && o.fd.id !== 'patate')) return false;
    return true;
  }

  F.planDay = function (p, date, opt) {
    opt = opt || {};
    const c = F.calc(p), day = F.dayOf(p, date), tot = F.dayTotal(p, day), month = new Date(date + 'T12:00:00').getMonth() + 1;
    const goal = c.goal, lean = goal === 'cut' || goal === 'recomp', ex = opt.exclude || {}, mode = opt.mode === 'tune' ? 'tune' : 'fill';
    const ud = F.usageOf(p, date), uw = F.weekUsage(p, date);
    const target = { k: c.kcal, p: c.protein, c: c.carbs, f: c.fat };
    const rem = { k: target.k - tot.k, p: target.p - tot.p, c: target.c - tot.c, f: target.f - tot.f };
    const foods = F.allFoods(p).filter(x => (x.pr || 1) < 99 && x.k > 0 && !ex[x.id] && !F.isAvoided(p, x) && !(c.minor && (x.grp === 'Integratori' || x.id === 'cacao' || x.grp === 'Bevande' && /birra|vino/.test(x.id))) && !(lean && (x.id === 'miele' || x.grp === 'Dolci')));
    const byId = {}; foods.forEach(x => { byId[x.id] = x; });
    const used = {}, notes = [], raises = [];
    const capNow = fd => Math.max(0, F.capLeft(p, fd, date, ud, uw) - (used[fd.id] || 0));
    const season = fd => F.inSeason(fd, month);
    const ok = fd => season(fd) && capNow(fd) >= 5;
    const ids = (...a) => a.map(i => byId[i]).filter(Boolean);
    const meals = [], addedBySlot = [0, 0, 0, 0];

    /* 1) tune: alzo le dosi di quello che l'utente ha già inserito, entro il massimo consigliato */
    if (mode === 'tune') {
      const dom = fd => { const ps = fd.p * 4, cs = fd.c * 4, fs = fd.f * 9, m = Math.max(ps, cs, fs); return m === ps ? 'p' : m === cs ? 'c' : 'f'; };
      day.meals.forEach((items, mi) => (items || []).forEach((it, ii) => {
        if (!it.f) return; const fd = F.getFood(p, it.f); if (!fd || F.isAvoided(p, fd) || fd.grp === 'Dolci' || fd.grp === 'Bevande') return;
        const key = dom(fd), th = key === 'p' ? 12 : key === 'c' ? 25 : 8; if (rem[key] <= th || fd[key] <= 0) return;
        const room = Math.min(capNow(fd), it.g * 0.5, mealMax(fd) - it.g); if (room < 10) return;
        let add = Math.min(room, rem[key] / (fd[key] / 100)); add = roundG(fd, add); if (add < 10) return;
        const m = F.foodMacros(fd, add); used[fd.id] = (used[fd.id] || 0) + add;
        rem.k -= m.k; rem.p -= m.p; rem.c -= m.c; rem.f -= m.f; addedBySlot[mi] += m.k;
        raises.push({ mi, ii, fd, from: it.g, to: it.g + add });
      }));
    }

    /* 2) quali pasti riempire e con quali obiettivi */
    const slots = F.MEALS.map((nm, mi) => {
      const mt = F.mealTotal(p, day.meals[mi]), tg = c.kcal * F.MEAL_SPLIT[mi], have = mt.k + addedBySlot[mi], def = tg - have;
      return { mi, nm, tg, def, fill: def > tg * 0.4 };
    });
    const act = slots.filter(s => s.fill), sumDef = act.reduce((a, s) => a + s.def, 0) || 1;
    if (rem.k > 120 && act.length) {
      act.forEach(s => { const sh = Math.min(1, s.def / sumDef); s.t = { k: Math.max(0, rem.k * sh), p: Math.max(0, rem.p * sh), c: Math.max(0, rem.c * sh), f: Math.max(0, rem.f * sh) }; });

      const pick = (list, score) => list.map(x => ({ x, s: score(x) })).sort((a, b) => b.s - a.s)[0];
      const protUsedIds = {};
      const add = (meal, fd, g, role, why) => {
        g = roundG(fd, Math.min(g, capNow(fd), mealMax(fd))); if (g < 5) return null;
        const ex1 = meal.items.find(o => o.fd === fd);
        if (ex1) { ex1.g += g; } else meal.items.push({ fd, g, role });
        used[fd.id] = (used[fd.id] || 0) + g; if (why && meal.why.indexOf(why) < 0) meal.why.push(why);
        return g;
      };
      const mtot = meal => meal.items.reduce((a, o) => { const m = F.foodMacros(o.fd, o.g); return { k: a.k + m.k, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }; }, { k: 0, p: 0, c: 0, f: 0 });
      const eatenToday = fd => (ud[fd.id] || 0) > 0;

      act.forEach(s => {
        const meal = { mi: s.mi, nm: s.nm, items: [], why: [], t: s.t }, t = s.t, main = s.mi === 1 || s.mi === 3, bf = s.mi === 0;
        const protPool = bf ? ids('albume', 'uovo', 'yogurt_greco', 'skyr', 'fiocchi_latte', 'kefir', 'ricotta', 'whey') : s.mi === 2 ? ids('yogurt_greco', 'skyr', 'fiocchi_latte', 'albume', 'kefir', 'whey', 'tacchino_fesa', 'bresaola') : foods.filter(x => (x.grp === 'Carne' || x.grp === 'Pesce' || x.id === 'uovo' || x.id === 'tofu' || x.id === 'fiocchi_latte') && x.id !== 'pollo_ali' && x.id !== 'pollo_coscia_pelle');
        const carbPool = bf ? ids('avena', 'fette_biscottate', 'pane', 'gallette_riso', 'gallette_mais') : s.mi === 2 ? ids('gallette_riso', 'gallette_mais', 'datteri') : ids('riso', 'pasta', 'patate', 'patate_dolci', 'quinoa', 'pane', 'ceci_cotti');
        // proteina principale
        if (t.p > 8) {
          const cand = protPool.filter(ok).filter(x => compat(meal.items, x));
          const needG = Math.max(main ? 80 : 30, (t.p * (main ? 0.75 : 0.8)) / 0.2);
          const best = pick(cand, x => (x.p / (x.k + 40)) / (x.pr || 1) * (0.3 + 0.7 * Math.min(1, Math.min(capNow(x), mealMax(x)) / Math.max(30, t.p * 0.75 / (x.p / 100)))) * (protUsedIds[x.id] || usedElsewhere(x) ? 0.55 : 1) * (bf && eatenToday(x) ? 1.15 : 1));
          function usedElsewhere(x) { return meals.some(m => m.items.some(o => o.fd === x && o.role === 'prot')); }
          if (best) { const fd = best.x, g = add(meal, fd, Math.max(main ? 80 : 30, (t.p * (main ? 0.75 : 0.8)) / (fd.p / 100)), 'prot'); if (g) protUsedIds[fd.id] = 1; }
        }
        // carboidrato
        if (t.c > 12) {
          const m0 = mtot(meal), need = Math.max(0, t.c - m0.c);
          let cand = carbPool.filter(ok).filter(x => compat(meal.items, x));
          if (main) cand = cand.filter(x => x.id !== 'ceci_cotti' || t.p > 25);
          const best = pick(cand, x => (1 / (x.pr || 1)) * (0.25 + 0.75 * Math.min(1, Math.min(capNow(x), mealMax(x)) / Math.max(30, need / (x.c / 100)))) * ((eatenToday(x) || meals.some(m => m.items.some(o => o.fd === x))) ? 1.4 : 1) * (x.id === 'ceci_cotti' ? 0.6 : 1) * (lean && (x.id === 'pane' || x.id === 'gallette_riso') ? 0.8 : 1));
          if (best) { const fd = best.x; add(meal, fd, need / (fd.c / 100) * (fd.id === 'ceci_cotti' ? 0.6 : 1), 'carb'); }
        }
        // frutta a colazione/spuntino
        if ((bf || s.mi === 2) && rem.c > 10) {
          const fr = foods.filter(x => x.grp === 'Frutta' && ['banana', 'mela', 'pera', 'caco', 'kiwi', 'arance', 'mandarini', 'uva', 'melograno'].indexOf(x.id) >= 0 && ok(x) && !meal.items.some(o => o.fd.grp === 'Frutta'));
          if (bf || !meal.items.some(o => o.fd.grp === 'Frutta')) { const best = pick(fr, x => 1 / (x.pr || 1) * (eatenToday(x) ? 1.2 : 1)); if (best) add(meal, best.x, best.x.units && best.x.units[0] ? best.x.units[0][1] : 150, 'fruit', 'Frutta: vitamine e zuccheri veloci'); }
        }
        // verdura
        if (main) {
          const vg = foods.filter(x => x.grp === 'Verdura' && x.id !== 'avocado' && ok(x) && compat(meal.items, x));
          const best = pick(vg, x => (x.id === 'verdura' ? 0.7 : 1) * (x.se && x.se.length < 12 ? 1.3 : 1));
          if (best) add(meal, best.x, 200, 'veg', 'Verdura: fibre e sazietà con poche calorie');
        }
        // proteine ancora scarse: aumento o secondo alimento compatibile
        let m1 = mtot(meal);
        if (t.p - m1.p > 12) {
          const pr = meal.items.find(o => o.role === 'prot');
          if (pr) { const room = Math.min(capNow(pr.fd), mealMax(pr.fd) - pr.g); if (room >= 10) { const extra = roundG(pr.fd, Math.min(room, (t.p - m1.p) / (pr.fd.p / 100))); if (extra >= 10) { pr.g += extra; used[pr.fd.id] = (used[pr.fd.id] || 0) + extra; } } }
          m1 = mtot(meal);
          if (t.p - m1.p > 12 && main) {
            const cand = ids('ceci_cotti', 'uovo', 'albume', 'fiocchi_latte', 'tofu').filter(x => ok(x) && compat(meal.items, x) && !meal.items.some(o => o.fd === x));
            const best = pick(cand, x => x.p / (x.k + 40) / (x.pr || 1));
            if (best) { const fd = best.x, g = add(meal, fd, Math.min(fd.id === 'ceci_cotti' ? 100 : 150, (t.p - m1.p) / (fd.p / 100)), 'prot2', fd.id === 'ceci_cotti' ? 'Legumi in porzione piccola accanto alla proteina: più proteine e fibre senza appesantire (aumenta piano se non sei abituato)' : null); }
          }
        }
        // grassi buoni
        m1 = mtot(meal);
        if (t.f - m1.f >= 4) {
          const fp = main ? ids('olio') : bf ? ids('burro_arachidi', 'noci', 'mandorle', 'frutta_secca', 'semini') : ids('frutta_secca', 'mandorle', 'noci', 'burro_arachidi');
          const best = pick(fp.filter(ok).filter(x => compat(meal.items, x)), x => 1 / (x.pr || 1));
          if (best) { const fd = best.x, cap = lean && fd.id === 'olio' ? 10 : fd.id === 'olio' ? 15 : 30; add(meal, fd, Math.min(cap, (t.f - m1.f) / (fd.f / 100)), 'fat', fd.id === 'olio' ? 'Olio a crudo: aiuta ad assorbire le vitamine della verdura' : 'Grassi buoni: ormoni, tendini e sazietà'); }
        }
        // calorie ancora scarse: aumento il carboidrato
        m1 = mtot(meal);
        if (t.k - m1.k > t.k * 0.2) {
          const cr = meal.items.find(o => o.role === 'carb');
          if (cr) { const room = Math.min(capNow(cr.fd), mealMax(cr.fd) - cr.g); if (room >= 10) { const extra = roundG(cr.fd, Math.min(room, (t.k - m1.k) / (cr.fd.k / 100))); if (extra >= 10) { cr.g += extra; used[cr.fd.id] = (used[cr.fd.id] || 0) + extra; } } }
        }
        // spiegazioni
        const prot = meal.items.find(o => o.role === 'prot'), carb = meal.items.find(o => o.role === 'carb');
        if (prot && carb) {
          const leg = F.foodTags(carb.fd).indexOf('legumi') >= 0;
          meal.why.unshift(leg ? 'Legumi con proteine animali o cereali: aminoacidi che si completano. Tieni la porzione di legumi piccola per evitare gonfiore.' : `${prot.fd.name.split(' (')[0]} + ${carb.fd.name.split(' (')[0].toLowerCase()}: proteine per il muscolo e carboidrati per l'energia.`);
        } else if (prot) meal.why.unshift('Proteine per recupero e sazietà.');
        meal.items.forEach(o => { o.m = F.foodMacros(o.fd, o.g); });
        meal.tot = mtot(meal);
        if (meal.items.length) meals.push(meal);
      });
    }

    /* 3) chiudo il divario: prima alzo le dosi già nel piano (entro i limiti), poi aggiungo un solo alimento compatibile */
    const sumTot = () => { const a = meals.reduce((q, m) => { m.items.forEach(o => { const x = F.foodMacros(o.fd, o.g); q.k += x.k; q.p += x.p; q.c += x.c; q.f += x.f; }); return q; }, { k: 0, p: 0, c: 0, f: 0 }); const rk0 = raises.reduce((q, w) => { const x = F.foodMacros(w.fd, w.to - w.from); return { k: q.k + x.k, p: q.p + x.p, c: q.c + x.c, f: q.f + x.f }; }, { k: 0, p: 0, c: 0, f: 0 }); return { k: tot.k + a.k + rk0.k, p: tot.p + a.p + rk0.p, c: tot.c + a.c + rk0.c, f: tot.f + a.f + rk0.f }; };
    const ratioOf = m => m.items.reduce((q, o) => q + F.foodMacros(o.fd, o.g).k, 0) / Math.max(1, c.kcal * F.MEAL_SPLIT[m.mi]);
    for (let it = 0; it < 10 && meals.length; it++) {
      const fin0 = sumTot(), g = { k: target.k - fin0.k, p: target.p - fin0.p, c: target.c - fin0.c, f: target.f - fin0.f };
      if (g.k < Math.max(120, target.k * 0.05)) break;
      const key = [['c', g.c * 4], ['f', g.f * 9], ['p', g.p * 4]].sort((a, b) => b[1] - a[1])[0];
      const k = key[1] > 20 ? key[0] : 'c', gk = g[k], th = k === 'f' ? 4 : 10;
      let done = false;
      for (const m of meals.slice().sort((a, b) => ratioOf(a) - ratioOf(b))) for (const o of m.items) { if (done) break; if (o.fd[k] < (k === 'f' ? 20 : k === 'p' ? 15 : 15) || o.fd.id === 'verdura') continue; const room = Math.min(capNow(o.fd), mealMax(o.fd) - o.g); if (room < th) continue; const ex2 = roundG(o.fd, Math.min(room, gk / (o.fd[k] / 100))); if (ex2 < 5) continue; o.g += ex2; used[o.fd.id] = (used[o.fd.id] || 0) + ex2; done = true; }
      if (!done) {
        const poolMain = k === 'c' ? ids('patate_dolci', 'patate', 'pane', 'quinoa', 'pasta', 'riso') : k === 'f' ? ids('olio', 'mandorle', 'noci', 'burro_arachidi') : ids('albume', 'fiocchi_latte', 'tofu');
        const poolLight = k === 'c' ? ids('gallette_riso', 'gallette_mais', 'datteri', 'banana', 'fette_biscottate', 'pane') : k === 'f' ? ids('mandorle', 'noci', 'burro_arachidi', 'frutta_secca') : ids('yogurt_greco', 'skyr', 'albume');
        const ratio = m => m.items.reduce((q, o) => q + F.foodMacros(o.fd, o.g).k, 0) / Math.max(1, c.kcal * F.MEAL_SPLIT[m.mi]);
        const order = meals.slice().filter(m => m.items.filter(o => o.fd.grp === 'Cereali' || o.fd.id === 'patate' || o.fd.id === 'patate_dolci').length < 2).sort((a, b) => ratio(a) - ratio(b));
        for (const m of order) { if (done) break; const main2 = m.mi === 1 || m.mi === 3; const pool = (main2 ? poolMain : poolLight).filter(x => ok(x) && compat(m.items, x) && !m.items.some(o => o.fd === x)).sort((a, b) => (a.pr || 1) - (b.pr || 1)); const fd = pool[0]; if (!fd) continue; const gg = roundG(fd, Math.min(capNow(fd), mealMax(fd), gk / (fd[k] / 100))); if (gg < 5) continue; m.items.push({ fd, g: gg, role: 'extra' }); used[fd.id] = (used[fd.id] || 0) + gg; const why2 = k === 'c' ? 'Carboidrati in più per arrivare alle calorie del tuo obiettivo' : k === 'f' ? 'Grassi buoni per completare le calorie' : 'Proteine in più per il tuo obiettivo'; if (m.why.indexOf(why2) < 0) m.why.push(why2); done = true; }
      }
      if (!done) break;
    }
    meals.forEach(m => { m.items.forEach(o => { o.m = F.foodMacros(o.fd, o.g); }); m.tot = m.items.reduce((a, o) => ({ k: a.k + o.m.k, p: a.p + o.m.p, c: a.c + o.m.c, f: a.f + o.m.f }), { k: 0, p: 0, c: 0, f: 0 }); if (m.items.some(o => o.fd.id === 'albume') && m.why.indexOf('Albume: cuocilo (frittata, pancake) per assorbire meglio le proteine') < 0) m.why.push('Albume: cuocilo (frittata, pancake) per assorbire meglio le proteine'); });
    const added = meals.reduce((a, m) => ({ k: a.k + m.tot.k, p: a.p + m.tot.p, c: a.c + m.tot.c, f: a.f + m.tot.f }), { k: 0, p: 0, c: 0, f: 0 });
    const rk = raises.reduce((a, r) => { const m = F.foodMacros(r.fd, r.to - r.from); return { k: a.k + m.k, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }; }, { k: 0, p: 0, c: 0, f: 0 });
    const final = { k: tot.k + added.k + rk.k, p: tot.p + added.p + rk.p, c: tot.c + added.c + rk.c, f: tot.f + added.f + rk.f };
    return { mode, goal, minor: c.minor, target, tot, final, added, raises, meals, avoided: F.avoidedLabels(p), gap: { k: target.k - final.k, p: target.p - final.p, c: target.c - final.c, f: target.f - final.f } };
  };
})(window.FORMA);
