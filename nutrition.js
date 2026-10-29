/* FORGIA – alimentazione: database alimenti, 4 pasti, ricette, calcolo dei macro e "bilancia la giornata". Dati per 100 g di prodotto CRUDO (se non scritto altrimenti): valori medi indicativi, correggili con l'etichetta. */
(function (F) {
  'use strict';
  // id, nome, kcal, proteine, carbo, grassi, gruppo, extra{b12,d,note,units:[[etichetta,g]]}
  const L = [];
  const f = (id, name, k, p, c, g, grp, x) => L.push(Object.assign({ id, name, k, p, c, f: g, grp }, x || {}));
  f('pollo_petto', 'Petto di pollo', 110, 23, 0, 1.5, 'Carne', {});
  f('pollo_coscia', 'Cosce di pollo (senza pelle)', 125, 19.5, 0, 4.8, 'Carne', { note: 'peso senza osso' });
  f('pollo_coscia_pelle', 'Cosce di pollo (con pelle)', 180, 17, 0, 12, 'Carne', { note: 'peso senza osso' });
  f('pollo_ali', 'Ali di pollo (con pelle)', 200, 17.5, 0, 14, 'Carne', { note: 'peso senza osso' });
  f('pollo_duroni', 'Duroni di pollo (ventrigli)', 94, 17.7, 0, 2.1, 'Frattaglie', { b12: 1 });
  f('tacchino_petto', 'Petto di tacchino', 107, 24, 0, 1, 'Carne', {});
  f('tacchino_fesa', 'Fesa di tacchino (affettato)', 100, 20, 1, 1.7, 'Carne', {});
  f('bovino_magro', 'Carne rossa di bovino (magra)', 130, 21.5, 0, 4.5, 'Carne', { b12: 1 });
  f('bovino_cuore', 'Cuore di bovino', 112, 17.7, 0.1, 3.9, 'Frattaglie', { b12: 1 });
  f('bovino_fegato', 'Fegato di bovino', 135, 20.4, 3.9, 3.6, 'Frattaglie', { b12: 1, d: 1, note: 'ricchissimo di vitamina A: al massimo 100-150 g, 1-2 volte a settimana' });
  f('merluzzo', 'Merluzzo (filetti congelati)', 80, 17, 0, 0.7, 'Pesce', { b12: 1 });
  f('pesce_bianco', 'Pesce fresco bianco (orata/branzino)', 100, 19, 0, 2.5, 'Pesce', { b12: 1 });
  f('salmone', 'Salmone fresco', 200, 20, 0, 13, 'Pesce', { b12: 1, d: 1 });
  f('tonno_nat', 'Tonno al naturale (scolato)', 110, 25, 0, 1, 'Pesce', { b12: 1, d: 1 });
  f('tonno_olio', 'Tonno sott\'olio (scolato)', 190, 25, 0, 10, 'Pesce', { b12: 1, d: 1 });
  f('uovo', 'Uovo intero', 143, 12.6, 0.7, 9.9, 'Uova e latticini', { b12: 1, d: 1, units: [['1 uovo', 50]] });
  f('albume', 'Albume d\'uovo pastorizzato', 48, 10.6, 0.7, 0.1, 'Uova e latticini', { units: [['100 ml', 103], ['bottiglia 500 ml', 515], ['bottiglia 1 L', 1030]] });
  f('kefir', 'Kefir naturale', 62, 3.5, 4.5, 3.5, 'Uova e latticini', { b12: 1, units: [['1 vasetto 200 g', 200]] });
  f('fiocchi_latte', 'Fiocchi di latte', 98, 11.5, 3, 4.5, 'Uova e latticini', { b12: 1, units: [['1 vaschetta 200 g', 200]] });
  f('ricotta', 'Ricotta vaccina', 146, 8.8, 3.5, 10.9, 'Uova e latticini', { b12: 1 });
  f('latte', 'Latte intero', 64, 3.3, 4.9, 3.6, 'Uova e latticini', { b12: 1, units: [['1 bicchiere', 200]] });
  f('latte_ps', 'Latte parzialmente scremato', 46, 3.4, 5, 1.6, 'Uova e latticini', { b12: 1, units: [['1 bicchiere', 200]] });
  f('parmigiano', 'Parmigiano Reggiano', 392, 33, 0, 28.4, 'Formaggi', { b12: 1 });
  f('mozzarella', 'Mozzarella', 253, 18.7, 0.4, 19.5, 'Formaggi', { b12: 1, units: [['1 mozzarella 125 g', 125]] });
  f('scamorza', 'Scamorza', 334, 25, 1, 25, 'Formaggi', { b12: 1 });
  f('riso', 'Riso (crudo)', 340, 7, 79, 0.6, 'Cereali', {});
  f('avena', 'Fiocchi d\'avena', 375, 13, 65, 7, 'Cereali', {});
  f('pasta', 'Pasta secca', 350, 12, 72, 1.5, 'Cereali', {});
  f('pane', 'Pane', 270, 9, 55, 1.5, 'Cereali', {});
  f('patate', 'Patate', 77, 2, 17, 0.1, 'Cereali', {});
  f('verdura', 'Verdura (mista)', 25, 2, 3, 0.3, 'Frutta e verdura', {});
  f('frutta', 'Frutta (media)', 45, 0.7, 10, 0.2, 'Frutta e verdura', {});
  f('banana', 'Banana (parte edibile)', 90, 1.1, 21, 0.3, 'Frutta e verdura', { units: [['1 banana', 110]] });
  f('mela', 'Mela', 52, 0.3, 11.4, 0.2, 'Frutta e verdura', { units: [['1 mela', 150]] });
  f('burro_arachidi', 'Burro di arachidi', 590, 25, 18, 50, 'Grassi e secchi', { units: [['1 cucchiaio', 16]] });
  f('semini', 'Semini (mix)', 540, 21, 15, 42, 'Grassi e secchi', { units: [['1 cucchiaio', 10]] });
  f('noci', 'Noci', 654, 15, 7, 65, 'Grassi e secchi', {});
  f('mandorle', 'Mandorle', 600, 21, 6, 53, 'Grassi e secchi', {});
  f('frutta_secca', 'Frutta secca (mix)', 620, 18, 8, 57, 'Grassi e secchi', { units: [['1 manciata', 30]] });
  f('olio', 'Olio extravergine d\'oliva', 900, 0, 0, 100, 'Grassi e secchi', { units: [['1 cucchiaio', 10]] });
  f('miele', 'Miele', 304, 0.3, 82, 0, 'Dolci', { units: [['1 cucchiaino', 7], ['1 cucchiaio', 20]] });
  f('fondente', 'Cioccolato fondente (70%)', 580, 9, 33, 43, 'Dolci', { units: [['1 quadretto', 10]] });
  f('cacao', 'Cacao amaro', 230, 20, 10, 12, 'Dolci', {});
  f('whey', 'Proteine in polvere (whey)', 400, 80, 8, 6, 'Integratori', { units: [['1 misurino', 30]] });
  f('spezie', 'Spezie / aromi', 0, 0, 0, 0, 'Altro', {});
  F.FOODS = L; F.FOODMAP = Object.fromEntries(L.map(x => [x.id, x]));
  F.FOOD_GROUPS = Array.from(new Set(L.map(x => x.grp)));

  // ricette di esempio (modificabili): [foodId, grammi]
  F.RECIPE_SAMPLES = [
    { id: 'r_torta', name: 'Torta proteica ricotta e cioccolato', portions: 4, items: [['ricotta', 250], ['uovo', 150], ['albume', 100], ['avena', 60], ['miele', 30], ['fondente', 30]], note: 'Mescola, cuoci in forno a 170 °C per 30-35 minuti.' },
    { id: 'r_frullato', name: 'Frullato albume, banana e kefir', portions: 1, items: [['albume', 200], ['banana', 110], ['kefir', 200], ['miele', 10], ['burro_arachidi', 16]], note: 'Frulla tutto con ghiaccio. Usa albume pastorizzato.' }
  ];
  const r1 = v => Math.round(v * 10) / 10;
  const zero = () => ({ k: 0, p: 0, c: 0, f: 0 });
  const add = (a, b, m) => { a.k += b.k * m; a.p += b.p * m; a.c += b.c * m; a.f += b.f * m; return a; };

  /** alimenti dell'utente (personalizzati) + predefiniti */
  F.getFood = (p, id) => (p.nutrition && (p.nutrition.foods || []).find(x => x.id === id)) || F.FOODMAP[id] || null;
  F.allFoods = p => ((p.nutrition && p.nutrition.foods) || []).map(x => Object.assign({ grp: 'I miei', custom: true }, x)).concat(F.FOODS);
  F.foodMacros = (food, g) => { const m = g / 100; return { k: food.k * m, p: food.p * m, c: food.c * m, f: food.f * m }; };
  F.recipeTotal = (p, rec) => { const t = zero(); (rec.items || []).forEach(([id, g]) => { const fd = F.getFood(p, id); if (fd) add(t, F.foodMacros(fd, g), 1); }); return t; };
  /** una voce di pasto: { f: idAlimento, g } oppure { r: idRicetta, n: porzioni } */
  F.itemMacros = (p, it) => {
    if (it.r) { const rec = F.getRecipe(p, it.r); if (!rec) return zero(); const t = F.recipeTotal(p, rec), s = (it.n || 1) / (rec.portions || 1); return { k: t.k * s, p: t.p * s, c: t.c * s, f: t.f * s }; }
    const fd = F.getFood(p, it.f); return fd ? F.foodMacros(fd, it.g || 0) : zero();
  };
  F.getRecipe = (p, id) => ((p.nutrition && p.nutrition.recipes) || []).find(x => x.id === id) || F.RECIPE_SAMPLES.find(x => x.id === id && p.nutrition && (p.nutrition.useSamples !== false)) || null;
  F.recipesOf = p => { const own = (p.nutrition && p.nutrition.recipes) || []; return own; };
  F.MEALS = ['Colazione', 'Pranzo', 'Spuntino', 'Cena'];
  F.MEAL_SPLIT = [0.25, 0.3, 0.15, 0.3];
  F.dayOf = (p, date) => { p.nutrition = p.nutrition || { days: {}, foods: [], recipes: [] }; p.nutrition.days = p.nutrition.days || {}; return (p.nutrition.days[date] = p.nutrition.days[date] || { meals: [[], [], [], []] }); };
  F.mealTotal = (p, items) => { const t = zero(); items.forEach(it => add(t, F.itemMacros(p, it), 1)); return t; };
  F.dayTotal = (p, day) => { const t = zero(); day.meals.forEach(m => add(t, F.mealTotal(p, m), 1)); return t; };
  F.round1 = r1;

  /** Suggerimenti per colmare ciò che manca: cibi che l'utente mangia di solito, con i grammi da aggiungere */
  F.suggestFill = function (p, rem) {
    const out = [], foods = F.allFoods(p).filter(x => x.id !== 'spezie');
    const pick = (key, need, mx, filt) => {
      const arr = foods.filter(filt).map(x => { const dens = x[key] / 100; return { x, g: Math.min(mx, Math.round(need / dens / 5) * 5) , dens }; }).filter(o => o.dens > 0)
        .map(o => { const m = F.foodMacros(o.x, o.g); return Object.assign(o, { m }); })
        .sort((a, b) => (b.dens / (b.x.k / 100 + 0.2)) - (a.dens / (a.x.k / 100 + 0.2))).slice(0, 4);
      return arr;
    };
    if (rem.p > 12) out.push({ label: `Mancano ${Math.round(rem.p)} g di proteine`, opts: pick('p', rem.p, 350, x => x.p >= 8 && x.k <= 260 && x.grp !== 'Integratori' && x.id !== 'bovino_fegato') });
    if (rem.c > 25) out.push({ label: `Mancano ${Math.round(rem.c)} g di carboidrati`, opts: pick('c', rem.c, 250, x => x.c >= 15 && x.k <= 400 && x.grp !== 'Dolci') });
    if (rem.f > 8) out.push({ label: `Mancano ${Math.round(rem.f)} g di grassi`, opts: pick('f', rem.f, 60, x => x.f >= 20 && x.p >= 0 && x.grp !== 'Dolci').filter(o => o.m.k < 500) });
    return out;
  };
})(window.FORMA);
