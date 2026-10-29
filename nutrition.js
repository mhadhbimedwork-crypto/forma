/* FORGIA – alimentazione: database alimenti, 4 pasti, ricette, calcolo dei macro e "bilancia la giornata". Dati per 100 g di prodotto CRUDO (se non scritto altrimenti): valori medi indicativi, correggili con l'etichetta. */
(function (F) {
  'use strict';
  // id, nome, kcal, proteine, carbo, grassi, gruppo, extra{b12,d,note,units:[[etichetta,g]]}
  const L = [];
  const f = (id, name, k, p, c, g, grp, x) => L.push(Object.assign({ id, name, k, p, c, f: g, grp }, x || {}));
  const M = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };
  const ALLY = M(1, 12);
  // lim: d = massimo al giorno (g), w = massimo a settimana (g), t = regola; pr = quanto è "poco adatto" come suggerimento (1 = di base)
  // ---- Carne e frattaglie
  f('pollo_petto', 'Petto di pollo', 110, 23, 0, 1.5, 'Carne', { al: ['pollo', 'petto pollo', 'petti di pollo', 'fettine di pollo'], lim: { d: 400, t: 'Fino a 300-400 g al giorno va bene: alterna con tacchino e pesce.' } });
  f('pollo_coscia', 'Cosce di pollo (senza pelle)', 125, 19.5, 0, 4.8, 'Carne', { note: 'peso senza osso', al: ['cosce di pollo', 'coscia di pollo', 'cosce', 'sovracosce'], lim: { d: 300, t: 'Fino a 300 g al giorno, senza pelle.' }, pr: 1.5 });
  f('pollo_coscia_pelle', 'Cosce di pollo (con pelle)', 180, 17, 0, 12, 'Carne', { note: 'peso senza osso', al: ['cosce di pollo con pelle'], lim: { d: 200, w: 600, t: 'Con la pelle i grassi saturi salgono: massimo 2-3 volte a settimana.' }, pr: 3 });
  f('pollo_ali', 'Ali di pollo (con pelle)', 200, 17.5, 0, 14, 'Carne', { note: 'peso senza osso', al: ['ali di pollo', 'ala di pollo', 'ali'], lim: { d: 250, w: 500, t: 'Con pelle: grassi saturi, massimo 1-2 volte a settimana.' }, pr: 4 });
  f('pollo_duroni', 'Duroni di pollo (ventrigli)', 94, 17.7, 0, 2.1, 'Frattaglie', { b12: 1, al: ['duroni', 'duroni di pollo', 'ventrigli', 'stomaco di pollo'], lim: { d: 150, w: 300, t: 'Frattaglie: molte purine e colesterolo, 1-2 volte a settimana.' }, pr: 4 });
  f('tacchino_petto', 'Petto di tacchino', 107, 24, 0, 1, 'Carne', { al: ['tacchino', 'fettine di tacchino'], lim: { d: 400, t: 'Fino a 300-400 g al giorno va bene.' } });
  f('tacchino_fesa', 'Fesa di tacchino (affettato)', 100, 20, 1, 1.7, 'Carne', { al: ['fesa', 'fesa di tacchino', 'affettato di tacchino', 'tacchino affettato'], lim: { d: 100, w: 400, t: 'Affettato: sale e conservanti, non tutti i giorni (circa 100 g, massimo 4 volte a settimana).' }, pr: 2.5 });
  f('bovino_magro', 'Carne rossa di bovino (magra)', 130, 21.5, 0, 4.5, 'Carne', { b12: 1, al: ['carne rossa', 'manzo', 'bovino', 'carne di manzo', 'bistecca', 'fesa di manzo', 'macinato magro'], lim: { d: 250, w: 600, t: 'Carne rossa: circa 350-500 g cotti a settimana in totale (circa 500-700 g crudi).' }, pr: 2 });
  f('bovino_cuore', 'Cuore di bovino', 112, 17.7, 0.1, 3.9, 'Frattaglie', { b12: 1, al: ['cuore', 'cuore di manzo', 'cuore di bovino'], lim: { d: 150, w: 300, t: 'Frattaglie: massimo circa 150 g, 1-2 volte a settimana.' }, pr: 4 });
  f('bovino_fegato', 'Fegato di bovino', 135, 20.4, 3.9, 3.6, 'Frattaglie', { b12: 1, d: 1, al: ['fegato', 'fegato di manzo', 'fegato di bovino'], lim: { d: 150, w: 200, t: 'Molta vitamina A: 100-150 g, 1-2 volte a settimana al massimo.' }, pr: 5 });
  // ---- Pesce
  f('merluzzo', 'Merluzzo (filetti congelati)', 80, 17, 0, 0.7, 'Pesce', { b12: 1, al: ['merluzzo', 'nasello', 'filetti di merluzzo', 'pesce congelato'], lim: { d: 400, t: 'Pesce magro: puoi mangiarlo spesso.' } });
  f('pesce_bianco', 'Pesce fresco bianco (orata/branzino)', 100, 19, 0, 2.5, 'Pesce', { b12: 1, al: ['pesce', 'pesce fresco', 'orata', 'branzino', 'spigola', 'pesce bianco'], lim: { d: 400, t: 'Va bene più volte a settimana: 2-4 porzioni di pesce a settimana.' } });
  f('salmone', 'Salmone fresco', 200, 20, 0, 13, 'Pesce', { b12: 1, d: 1, al: ['salmone'], lim: { d: 200, w: 600, t: 'Ricco di omega-3: 2-3 volte a settimana.' }, pr: 2 });
  f('tonno_nat', 'Tonno al naturale (scolato)', 110, 25, 0, 1, 'Pesce', { b12: 1, d: 1, al: ['tonno', 'tonno al naturale', 'tonno in scatola', 'scatoletta di tonno'], lim: { d: 100, w: 300, t: 'Mercurio: massimo 2-3 volte a settimana (circa 100 g).' }, pr: 2 });
  f('tonno_olio', 'Tonno sott\'olio (scolato)', 190, 25, 0, 10, 'Pesce', { b12: 1, d: 1, al: ['tonno sott olio', 'tonno sott\'olio'], lim: { d: 100, w: 300, t: 'Mercurio: massimo 2-3 volte a settimana.' }, pr: 3 });
  f('gamberi', 'Gamberi / mazzancolle', 85, 18, 0.5, 1, 'Pesce', { b12: 1, al: ['gamberi', 'mazzancolle', 'gamberetti', 'gamberoni'], lim: { d: 250, t: 'Va bene un paio di volte a settimana.' }, pr: 2 });
  // ---- Uova e latticini
  f('uovo', 'Uovo intero', 143, 12.6, 0.7, 9.9, 'Uova e latticini', { b12: 1, d: 1, units: [['1 uovo', 50]], al: ['uovo', 'uova', 'uova intere', 'uovo intero', 'uova sode'], lim: { d: 150, w: 700, t: 'Fino a 3 uova intere al giorno; per più proteine usa l\'albume.' } });
  f('albume', 'Albume d\'uovo pastorizzato', 48, 10.6, 0.7, 0.1, 'Uova e latticini', { units: [['100 ml', 103], ['bottiglia 500 ml', 515], ['bottiglia 1 L', 1030]], al: ['albume', 'albumi', 'albume pastorizzato', 'albume d uovo', 'bianco d uovo'], lim: { d: 400, t: 'Cotto si assorbe quasi del tutto; crudo (frullato o bevuto) circa la metà, e l\'avidina lega la biotina. Pastorizzato e in frigo va bene, ma tieni il crudo sotto i 250 g al giorno e cuoci quando puoi.' } });
  f('kefir', 'Kefir naturale', 62, 3.5, 4.5, 3.5, 'Uova e latticini', { b12: 1, units: [['1 vasetto 200 g', 200]], al: ['kefir'], lim: { d: 500, t: 'Fino a 400-500 g al giorno.' } });
  f('yogurt_greco', 'Yogurt greco 0%', 57, 10, 4, 0.2, 'Uova e latticini', { b12: 1, units: [['1 vasetto 170 g', 170]], al: ['yogurt greco', 'yogurt', 'yogurt magro', 'greco'], lim: { d: 500, t: 'Fino a 400-500 g al giorno.' } });
  f('skyr', 'Skyr', 63, 11, 4, 0.2, 'Uova e latticini', { b12: 1, units: [['1 vasetto 150 g', 150]], al: ['skyr'], lim: { d: 500, t: 'Fino a 400-500 g al giorno.' } });
  f('fiocchi_latte', 'Fiocchi di latte', 98, 11.5, 3, 4.5, 'Uova e latticini', { b12: 1, units: [['1 vaschetta 200 g', 200]], al: ['fiocchi di latte', 'cottage', 'fiocchi latte'], lim: { d: 300, t: 'Fino a 300 g al giorno (contiene sale).' } });
  f('ricotta', 'Ricotta vaccina', 146, 8.8, 3.5, 10.9, 'Uova e latticini', { b12: 1, al: ['ricotta'], lim: { d: 150, w: 700, t: 'Circa 100-150 g al giorno, grassi saturi: non esagerare.' }, pr: 2 });
  f('latte', 'Latte intero', 64, 3.3, 4.9, 3.6, 'Uova e latticini', { b12: 1, units: [['1 bicchiere', 200]], al: ['latte', 'latte intero'], lim: { d: 500, t: 'Fino a 500 ml al giorno.' } });
  f('latte_ps', 'Latte parzialmente scremato', 46, 3.4, 5, 1.6, 'Uova e latticini', { b12: 1, units: [['1 bicchiere', 200]], al: ['latte scremato', 'latte parzialmente scremato', 'latte magro'], lim: { d: 500, t: 'Fino a 500 ml al giorno.' } });
  f('parmigiano', 'Parmigiano Reggiano', 392, 33, 0, 28.4, 'Formaggi', { b12: 1, al: ['parmigiano', 'grana', 'grana padano', 'parmigiano reggiano'], lim: { d: 40, w: 200, t: 'Sale e grassi saturi: 30-40 g al giorno, massimo 200 g a settimana.' }, pr: 3 });
  f('mozzarella', 'Mozzarella', 253, 18.7, 0.4, 19.5, 'Formaggi', { b12: 1, units: [['1 mozzarella 125 g', 125]], al: ['mozzarella', 'fiordilatte'], lim: { d: 125, w: 375, t: 'Massimo 2-3 porzioni a settimana (125 g).' }, pr: 3 });
  f('scamorza', 'Scamorza', 334, 25, 1, 25, 'Formaggi', { b12: 1, al: ['scamorza', 'provola', 'formaggio', 'formaggi'], lim: { d: 80, w: 250, t: 'Formaggio stagionato o filante: circa 50-80 g, 2-3 volte a settimana.' }, pr: 3 });
  // ---- Affettati e panini
  const AFF = 'Affettato: sale e conservanti, non tutti i giorni (circa 50-100 g, massimo 3-4 volte a settimana).';
  f('prosciutto_cotto', 'Prosciutto cotto (affettato)', 125, 19.5, 0.8, 4.5, 'Affettati e panini', { al: ['prosciutto cotto', 'cotto', 'prosciutto', 'affettato', 'affettati'], units: [['1 fetta', 20]], lim: { d: 80, w: 300, t: AFF }, pr: 2.5 });
  f('prosciutto_crudo', 'Prosciutto crudo (affettato)', 220, 26, 0, 13, 'Affettati e panini', { al: ['prosciutto crudo', 'crudo', 'speck'], units: [['1 fetta', 15]], lim: { d: 60, w: 250, t: 'Molto salato: circa 50 g, massimo 3 volte a settimana.' }, pr: 3 });
  f('bresaola', 'Bresaola', 150, 32, 0.5, 2.6, 'Affettati e panini', { b12: 1, al: ['bresaola'], units: [['1 fetta', 12]], lim: { d: 80, w: 300, t: AFF }, pr: 2 });
  f('salame', 'Salame / mortadella', 400, 24, 1, 33, 'Affettati e panini', { al: ['salame', 'mortadella', 'salamino', 'salsiccia'], units: [['1 fetta', 8]], lim: { d: 40, w: 120, t: 'Grasso e sale: solo ogni tanto, massimo 40 g e 1-2 volte a settimana.' }, pr: 9 });
  f('panino', 'Panino (1 panino = 50 g)', 270, 9, 55, 1.5, 'Affettati e panini', { al: ['panino', 'panini', 'rosetta', 'michetta', 'ciabatta'], units: [['1 panino piccolo', 50], ['1 panino medio', 80], ['1 panino grande', 100]], lim: { d: 250, t: 'Fino a 2-3 panini al giorno nei giorni di allenamento, meno nei giorni di riposo.' }, pr: 1.3 });
  f('pane_tramezzino', 'Pane in cassetta (fetta)', 265, 8, 49, 3.5, 'Affettati e panini', { al: ['pane in cassetta', 'pane da toast', 'toast', 'tramezzino'], units: [['1 fetta', 30]], lim: { d: 150, t: 'Fino a 4-5 fette al giorno.' }, pr: 2 });
  f('hummus', 'Hummus', 230, 8, 14, 17, 'Altro', { al: ['hummus'], units: [['1 cucchiaio', 25]], lim: { d: 80, t: 'Circa 50-80 g al giorno.' }, pr: 3 });
  // ---- Cereali, gallette, carboidrati
  f('riso', 'Riso (crudo)', 340, 7, 79, 0.6, 'Cereali', { al: ['riso', 'riso basmati', 'riso bianco', 'riso integrale'], lim: { d: 150, t: 'Fino a 120-150 g crudi al giorno; alterna con altri cereali (il riso contiene arsenico).' } });
  f('riso_cotto', 'Riso (cotto)', 130, 2.7, 28, 0.3, 'Cereali', { al: ['riso cotto', 'riso lessato'], lim: { d: 450, t: 'Fino a 400 g cotti al giorno.' }, pr: 1.5 });
  f('gallette_riso', 'Gallette di riso', 385, 8, 82, 2.8, 'Cereali', { units: [['1 galletta', 9]], al: ['gallette di riso', 'galletta di riso', 'gallette riso', 'gallette'], lim: { d: 60, t: 'Indice glicemico alto, poca fibra: 3-6 gallette al giorno, meglio attorno all\'allenamento.' }, pr: 1.3 });
  f('gallette_mais', 'Gallette di mais', 380, 8, 79, 3, 'Cereali', { units: [['1 galletta', 8]], al: ['gallette di mais', 'galletta di mais', 'gallette mais'], lim: { d: 60, t: 'Indice glicemico alto, poca fibra: 3-6 gallette al giorno, meglio attorno all\'allenamento.' }, pr: 1.3 });
  f('avena', 'Fiocchi d\'avena', 375, 13, 65, 7, 'Cereali', { al: ['avena', 'fiocchi di avena', 'fiocchi d avena', 'farina di avena'], lim: { d: 100, t: 'Fino a 100 g al giorno.' } });
  f('pasta', 'Pasta secca', 350, 12, 72, 1.5, 'Cereali', { al: ['pasta', 'spaghetti', 'penne', 'pasta integrale'], lim: { d: 150, t: 'Fino a 120-150 g crudi al giorno.' } });
  f('pane', 'Pane', 270, 9, 55, 1.5, 'Cereali', { al: ['pane', 'pane integrale', 'fette di pane'], lim: { d: 200, t: 'Fino a 150-200 g al giorno.' }, pr: 1.3 });
  f('fette_biscottate', 'Fette biscottate integrali', 390, 11, 70, 6, 'Cereali', { units: [['1 fetta', 9]], al: ['fette biscottate', 'fetta biscottata'], lim: { d: 60, t: 'Circa 4-6 fette al giorno.' }, pr: 2 });
  f('quinoa', 'Quinoa / farro (crudi)', 365, 14, 64, 6, 'Cereali', { al: ['quinoa', 'farro', 'orzo'], lim: { d: 150, t: 'Fino a 120-150 g crudi al giorno.' } });
  f('patate', 'Patate', 77, 2, 17, 0.1, 'Cereali', { al: ['patate', 'patata'], lim: { d: 500, t: 'Fino a 400-500 g al giorno.' } });
  f('patate_dolci', 'Patate dolci', 86, 1.6, 20, 0.1, 'Cereali', { al: ['patate dolci', 'patata dolce'], lim: { d: 400, t: 'Fino a 400 g al giorno.' } });
  f('legumi', 'Legumi secchi (lenticchie, fagioli, ceci)', 330, 22, 50, 2, 'Cereali', { al: ['legumi', 'lenticchie', 'fagioli', 'ceci'], lim: { d: 100, t: 'Fino a 80-100 g secchi al giorno; aumenta piano per evitare gonfiore.' }, pr: 1.5 });
  f('ceci_cotti', 'Ceci / fagioli cotti', 128, 8, 18, 2.6, 'Cereali', { al: ['ceci cotti', 'fagioli cotti', 'lenticchie cotte', 'legumi cotti'], lim: { d: 300, t: 'Fino a 250-300 g al giorno.' }, pr: 1.5 });
  f('tofu', 'Tofu', 76, 8, 2, 4.8, 'Altro', { al: ['tofu'], lim: { d: 200, t: 'Fino a 150-200 g al giorno.' }, pr: 2 });
  // ---- Verdura (di stagione: mesi in cui è al meglio)
  const V = (id, name, k, p, c, g, se, al, x) => f(id, name, k, p, c, g, 'Verdura', Object.assign({ se, al: al || [], lim: { d: 600, t: 'Verdura: fino a 500-800 g al giorno, più ne mangi meglio è.' }, pr: 1 }, x || {}));
  f('verdura', 'Verdura (mista)', 25, 2, 3, 0.3, 'Verdura', { se: ALLY, al: ['verdura', 'verdure', 'insalata', 'contorno'], lim: { d: 800, t: 'Verdura: fino a 500-800 g al giorno, più ne mangi meglio è.' } });
  V('zucca', 'Zucca', 18, 1.1, 3.5, 0.1, [9, 10, 11, 12, 1], ['zucca']);
  V('funghi', 'Funghi champignon / cardoncelli', 22, 3.1, 0.8, 0.3, [9, 10, 11, 12], ['funghi', 'champignon']);
  V('cavolfiore', 'Cavolfiore', 25, 2.4, 2.3, 0.3, [10, 11, 12, 1, 2, 3], ['cavolfiore']);
  V('broccoli', 'Broccoli', 30, 3.2, 2.4, 0.4, [10, 11, 12, 1, 2, 3], ['broccoli', 'broccoletti']);
  V('verza', 'Verza / cavolo nero', 25, 2.5, 3, 0.3, [10, 11, 12, 1, 2], ['verza', 'cavolo nero', 'cavolo', 'cavolo cappuccio']);
  V('finocchi', 'Finocchi', 12, 1.2, 1, 0.2, [10, 11, 12, 1, 2, 3], ['finocchi', 'finocchio']);
  V('spinaci', 'Spinaci', 31, 3.4, 2.9, 0.7, [10, 11, 12, 1, 2, 3, 4], ['spinaci']);
  V('bietole', 'Bietole', 20, 1.8, 2.8, 0.2, [10, 11, 12, 1, 2, 3, 4], ['bietole', 'biete']);
  V('radicchio', 'Radicchio / indivia', 15, 1.4, 2, 0.2, [10, 11, 12, 1, 2, 3], ['radicchio', 'indivia', 'cicoria']);
  V('carciofi', 'Carciofi', 24, 2.7, 2.5, 0.2, [10, 11, 12, 1, 2, 3, 4], ['carciofi', 'carciofo']);
  V('barbabietola', 'Barbabietola', 36, 1.5, 7, 0.1, [10, 11, 12, 1, 2, 3], ['barbabietola', 'bietola rossa']);
  V('carote', 'Carote', 35, 1.1, 7.6, 0.2, [9, 10, 11, 12, 1, 2, 3, 4, 5], ['carote', 'carota']);
  V('cime_rapa', 'Cime di rapa', 22, 3, 2, 0.3, [10, 11, 12, 1, 2, 3], ['cime di rapa', 'broccoletti di rapa']);
  V('pomodori', 'Pomodori', 18, 0.9, 3.5, 0.2, [5, 6, 7, 8, 9], ['pomodori', 'pomodoro']);
  V('zucchine', 'Zucchine', 17, 1.3, 2.4, 0.2, [5, 6, 7, 8, 9], ['zucchine', 'zucchina']);
  V('melanzane', 'Melanzane', 22, 1, 3.5, 0.2, [6, 7, 8, 9], ['melanzane', 'melanzana']);
  V('peperoni', 'Peperoni', 26, 0.9, 5.5, 0.3, [6, 7, 8, 9], ['peperoni', 'peperone']);
  V('asparagi', 'Asparagi', 24, 2.5, 2, 0.2, [3, 4, 5], ['asparagi']);
  V('piselli', 'Piselli freschi', 80, 5.5, 12, 0.4, [4, 5, 6], ['piselli']);
  V('fave', 'Fave fresche', 70, 5.5, 9, 0.5, [4, 5, 6], ['fave']);
  V('avocado', 'Avocado', 160, 2, 1.8, 15, ALLY, ['avocado'], { lim: { d: 150, t: 'Mezzo-un avocado al giorno (calorico, grassi buoni).' }, pr: 2 });
  // ---- Frutta (di stagione)
  const DMAX = { caco: 300, castagne: 200, uva: 200, datteri: 40, anguria: 500 };
  const Fr = (id, name, k, p, c, g, se, al, units, lim) => f(id, name, k, p, c, g, 'Frutta', { se, al: al || [], units: units || [], lim: { d: DMAX[id] || 300, t: lim || 'Frutta: 2-4 porzioni (300-500 g) al giorno, meglio intera.' }, pr: DMAX[id] && DMAX[id] <= 200 ? 2 : 1 });
  f('frutta', 'Frutta (media)', 45, 0.7, 10, 0.2, 'Frutta', { se: ALLY, al: ['frutta', 'frutto'], lim: { d: 500, t: 'Frutta: 2-4 porzioni (300-500 g) al giorno, meglio intera.' } });
  Fr('banana', 'Banana (parte edibile)', 90, 1.1, 21, 0.3, ALLY, ['banana', 'banane'], [['1 banana', 110]]);
  Fr('mela', 'Mela', 52, 0.3, 11.4, 0.2, [9, 10, 11, 12, 1, 2, 3], ['mela', 'mele'], [['1 mela', 150]]);
  Fr('pera', 'Pera', 45, 0.4, 10, 0.1, [8, 9, 10, 11, 12], ['pera', 'pere'], [['1 pera', 170]]);
  Fr('caco', 'Caco / cachi (caco mela)', 70, 0.6, 17, 0.2, [10, 11, 12], ['caco', 'cachi', 'kaki', 'caco mela', 'cachi mela', 'cachi vaniglia'], [['1 caco', 180]], 'Zuccheri alti: 1-2 frutti al giorno (150-300 g), ben maturi: quelli acerbi hanno tannini che appesantiscono.');
  Fr('castagne', 'Castagne (crude)', 165, 3.2, 36, 1.5, [10, 11, 12], ['castagne', 'castagna', 'caldarroste', 'castagne lesse', 'marroni'], [['1 manciata (6-7 castagne)', 60]], 'Molti carboidrati e poche proteine: come una porzione di cereali, 100-200 g al giorno. Se sono già arrostite pesa la polpa.');
  f('castagne', 'Castagne (crude)', 165, 3.2, 36, 1.5, 'Frutta', { se: [10, 11, 12], al: ['castagne', 'castagna', 'caldarroste', 'castagne lesse', 'marroni'], units: [['1 manciata (6-7 castagne)', 60]], lim: { d: 200, t: 'Molti carboidrati e poche proteine: contale come una porzione di cereali (100-200 g al giorno). Se sono già arrostite pesa la polpa.' } });
  L.splice(L.findIndex(x => x.id === 'castagne'), 1); // evita il duplicato creato dalla scorciatoia sopra
  Fr('uva', 'Uva', 61, 0.6, 16, 0.2, [8, 9, 10], ['uva'], [], 'Zuccheri alti: circa 150-200 g al giorno.');
  Fr('melograno', 'Melograno', 68, 1, 17, 0.3, [10, 11, 12], ['melograno'], [['1 melograno (chicchi)', 150]]);
  Fr('kiwi', 'Kiwi', 44, 1.2, 9, 0.6, [11, 12, 1, 2, 3, 4], ['kiwi'], [['1 kiwi', 80]]);
  Fr('mandarini', 'Mandarini / clementine', 37, 0.7, 8.7, 0.1, [11, 12, 1, 2], ['mandarini', 'mandarino', 'clementine'], [['1 mandarino', 70]]);
  Fr('arance', 'Arance', 34, 0.7, 7.8, 0.2, [11, 12, 1, 2, 3, 4], ['arance', 'arancia'], [['1 arancia', 200]]);
  Fr('fragole', 'Fragole', 30, 0.7, 6, 0.4, [4, 5, 6], ['fragole', 'fragola']);
  Fr('pesche', 'Pesche / albicocche', 38, 0.9, 8.5, 0.2, [6, 7, 8], ['pesche', 'pesca', 'albicocche', 'albicocca', 'nettarine']);
  Fr('anguria', 'Anguria / melone', 30, 0.6, 7, 0.2, [6, 7, 8], ['anguria', 'cocomero', 'melone'], [], 'Frutta acquosa: fino a 400-500 g al giorno.');
  Fr('fichi', 'Fichi', 47, 0.9, 11, 0.2, [8, 9], ['fichi', 'fico']);
  Fr('datteri', 'Datteri', 282, 2.5, 75, 0.4, ALLY, ['datteri', 'dattero'], [['1 dattero', 8]], 'Molto zuccherini: 3-5 datteri (circa 30-40 g) prima dell\'allenamento.');
  // ---- Grassi, semi, dolci, integratori
  f('burro_arachidi', 'Burro di arachidi', 590, 25, 18, 50, 'Grassi e secchi', { units: [['1 cucchiaio', 16]], al: ['burro di arachidi', 'burro arachidi', 'crema di arachidi'], lim: { d: 40, t: 'Calorico: 1-2 cucchiai (16-32 g) al giorno, massimo 40 g.' }, pr: 2 });
  f('semini', 'Semini (mix)', 540, 21, 15, 42, 'Grassi e secchi', { units: [['1 cucchiaio', 10]], al: ['semini', 'semi', 'semi di chia', 'semi di lino', 'semi di zucca'], lim: { d: 30, t: 'Circa 15-30 g al giorno.' }, pr: 2 });
  f('noci', 'Noci', 654, 15, 7, 65, 'Grassi e secchi', { al: ['noci', 'noce'], lim: { d: 40, t: 'Circa 30 g al giorno (una manciata).' }, pr: 2 });
  f('mandorle', 'Mandorle', 600, 21, 6, 53, 'Grassi e secchi', { al: ['mandorle', 'mandorla'], lim: { d: 40, t: 'Circa 30 g al giorno (una manciata).' }, pr: 2 });
  f('frutta_secca', 'Frutta secca (mix)', 620, 18, 8, 57, 'Grassi e secchi', { units: [['1 manciata', 30]], al: ['frutta secca', 'noccioline', 'pistacchi', 'nocciole', 'anacardi'], lim: { d: 40, t: 'Circa 30 g al giorno (una manciata); fino a 40 g se ti alleni.' }, pr: 2 });
  f('olio', 'Olio extravergine d\'oliva', 900, 0, 0, 100, 'Grassi e secchi', { units: [['1 cucchiaio', 10]], al: ['olio', 'olio evo', 'olio d oliva', 'olio extravergine'], lim: { d: 40, t: 'Circa 3-4 cucchiai (30-40 g) al giorno.' }, pr: 2.5 });
  f('miele', 'Miele', 304, 0.3, 82, 0, 'Dolci', { units: [['1 cucchiaino', 7], ['1 cucchiaio', 20]], al: ['miele'], lim: { d: 30, t: 'Zuccheri aggiunti: massimo 25-30 g al giorno.' }, pr: 6 });
  f('fondente', 'Cioccolato fondente (70%)', 580, 9, 33, 43, 'Dolci', { units: [['1 quadretto', 10]], al: ['cioccolato', 'cioccolato fondente', 'fondente', 'gocce di cioccolato', 'gocce di cioccolato fondente'], lim: { d: 30, t: 'Circa 20-30 g al giorno.' }, pr: 8 });
  f('cacao', 'Cacao amaro', 230, 20, 10, 12, 'Dolci', { al: ['cacao', 'cacao amaro'], lim: { d: 20, t: 'Circa 10-20 g al giorno.' }, pr: 9 });
  f('whey', 'Proteine in polvere (whey)', 400, 80, 8, 6, 'Integratori', { units: [['1 misurino', 30]], al: ['whey', 'proteine in polvere', 'proteine', 'proteine whey', 'protein'], lim: { d: 60, t: 'Fino a 1-2 misurini (30-60 g) al giorno, solo se non arrivi con il cibo.' }, pr: 5 });
  f('creatina', 'Creatina monoidrato', 0, 0, 0, 0, 'Integratori', { units: [['1 dose', 5]], al: ['creatina', 'creatina monoidrato'], lim: { d: 5, t: '3-5 g al giorno, tutti i giorni.' }, pr: 99 });
  f('spezie', 'Spezie / aromi', 0, 0, 0, 0, 'Altro', { al: ['spezie', 'sale', 'pepe', 'curcuma', 'cannella', 'aromi', 'erbe'], pr: 99 });
  F.FOODS = L; F.FOODMAP = Object.fromEntries(L.map(x => [x.id, x]));
  F.FOOD_GROUPS = Array.from(new Set(L.map(x => x.grp)));

  // ricette di esempio (modificabili): [foodId, grammi]
  F.RECIPE_SAMPLES = [
    { id: 'r_torta', name: 'Torta proteica ricotta e cioccolato', portions: 4, items: [['ricotta', 250], ['uovo', 150], ['albume', 100], ['avena', 60], ['miele', 30], ['fondente', 30]], note: 'Mescola, cuoci in forno a 170 °C per 30-35 minuti.' },
    { id: 'r_frullato', name: 'Frullato albume, banana e kefir', portions: 1, items: [['albume', 200], ['banana', 110], ['kefir', 200], ['miele', 10], ['burro_arachidi', 16]], note: 'Frulla tutto con ghiaccio. Usa albume pastorizzato.' },
    { id: 'r_panino', name: 'Panino con affettato e provola', portions: 1, items: [['panino', 80], ['prosciutto_cotto', 40], ['scamorza', 30]], note: 'Cambia pane, affettato e formaggio con quello che mangia davvero: pesa il panino intero a casa una volta e usa quel peso.' }
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
  /* ---- limiti, stagione, piano dei soli alimenti mancanti ---- */
  const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  F.monthName = m => MESI[m - 1];
  F.inSeason = (fd, m) => !fd.se || fd.se.indexOf(m) >= 0;
  F.limitOf = fd => fd.lim || null;
  function addDays(date, n) { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  // grammi per alimento nel giorno (le ricette vengono scomposte negli ingredienti)
  F.usageOf = function (p, date) {
    const u = {}, day = p.nutrition && p.nutrition.days && p.nutrition.days[date];
    if (!day) return u;
    (day.meals || []).forEach(items => (items || []).forEach(it => {
      if (it.r) { const rec = F.getRecipe(p, it.r); if (!rec) return; const n = (it.n || 1) / (rec.portions || 1); rec.items.forEach(([id, g]) => { u[id] = (u[id] || 0) + g * n; }); }
      else if (it.f) u[it.f] = (u[it.f] || 0) + (it.g || 0);
    }));
    return u;
  };
  F.weekUsage = function (p, date) {
    const t = {}; for (let i = 0; i < 7; i++) { const u = F.usageOf(p, addDays(date, -i)); for (const k in u) t[k] = (t[k] || 0) + u[k]; }
    return t;
  };
  // avvisi per limiti giornalieri/settimanali superati
  F.checkLimits = function (p, date) {
    const ud = F.usageOf(p, date), uw = F.weekUsage(p, date), out = [];
    F.allFoods(p).forEach(fd => {
      const l = fd.lim; if (!l) return;
      const g = ud[fd.id] || 0, w = uw[fd.id] || 0;
      if (l.d && g > l.d * 1.02) out.push({ fd, k: 'warn', text: `${fd.name}: ${Math.round(g)} g oggi, il limite consigliato è ${l.d} g. ${l.t}` });
      else if (l.w && w > l.w * 1.02) out.push({ fd, k: 'warn', text: `${fd.name}: ${Math.round(w)} g negli ultimi 7 giorni, il limite è ${l.w} g a settimana. ${l.t}` });
    });
    return out;
  };
  // quanto posso ancora aggiungere di un alimento oggi
  F.capLeft = function (p, fd, date, ud, uw) {
    const l = fd.lim || { d: 300 };
    let c = l.d != null ? l.d - ((ud || F.usageOf(p, date))[fd.id] || 0) : 300;
    if (l.w) c = Math.min(c, l.w - ((uw || F.weekUsage(p, date))[fd.id] || 0));
    return Math.max(0, c);
  };
  F.mealGuess = fd => {
    if (fd.id === 'albume' || fd.id === 'uovo' || fd.id === 'avena' || fd.id === 'fette_biscottate' || fd.id === 'kefir' || fd.id === 'yogurt_greco' || fd.id === 'skyr' || fd.id.indexOf('latte') === 0) return 0;
    if (fd.grp === 'Frutta' || fd.id.indexOf('gallette') === 0 || fd.grp === 'Grassi e secchi' || fd.id === 'whey') return 2;
    if (fd.grp === 'Carne' || fd.grp === 'Frattaglie' || fd.grp === 'Formaggi') return 3;
    return 1;
  };
  // piano completo dei soli alimenti che mancano: ogni alimento rispetta il suo limite; se non basta, si mescola con altri
  F.planFill = function (p, rem0, date, opt) {
    opt = opt || {};
    const month = opt.month || (new Date(date + 'T12:00:00').getMonth() + 1);
    const ud = F.usageOf(p, date), uw = F.weekUsage(p, date);
    const rem = { k: rem0.k, p: rem0.p, c: rem0.c, f: rem0.f };
    const c0 = F.calc(p), minor = c0.minor, goal = minor && p.goal === 'cut' ? 'recomp' : p.goal, ex = opt.exclude || {};
    const lean = goal === 'cut' || goal === 'recomp';
    const foods = F.allFoods(p).filter(x => (x.pr || 1) < 99 && x.k > 0 && F.inSeason(x, month) && !ex[x.id] && !(minor && (x.grp === 'Integratori' || x.id === 'cacao')) && !(lean && (x.id === 'miele' || x.grp === 'Dolci')));
    const used = {}, items = [];
    const take = (fd, key, need, why, maxShare) => {
      const dens = fd[key] / 100; if (dens <= 0) return 0;
      const cap = F.capLeft(p, fd, date, ud, uw) - (used[fd.id] || 0);
      if (cap < 5) return 0;
      let g = Math.min(cap, need / dens);
      if (maxShare) g = Math.min(g, maxShare);
      const un = fd.units && fd.units[0] && fd.units[0][1] <= 60 ? fd.units[0][1] : 0;
      g = un && g >= un ? Math.round(g / un) * un : Math.round(g / 5) * 5;
      if (g < 5) return 0;
      const m = F.foodMacros(fd, g);
      used[fd.id] = (used[fd.id] || 0) + g;
      const ex = items.find(o => o.fd === fd);
      if (ex) { ex.g += g; ex.m = F.foodMacros(fd, ex.g); } else items.push({ fd, g, m, why, capped: g >= cap - 2 });
      rem.k -= m.k; rem.p -= m.p; rem.c -= m.c; rem.f -= m.f;
      return g;
    };
    const rank = (key, filt) => foods.filter(x => x[key] > 0 && filt(x)).map(x => ({ x, s: (x[key] / (x.k + (lean ? 40 : goal === 'mass' ? 250 : 120))) / (x.pr || 1) })).sort((a, b) => b.s - a.s).map(o => o.x);
    // 1) proteine: mescola fino a 3 alimenti
    if (rem.p > 8) {
      const c = rank('p', x => x.p >= 8 && x.grp !== 'Integratori' && x.k <= 260);
      let n = 0; const seen = {}; for (const pass of [0, 1]) for (const fd of c) { if (rem.p <= 8 || n >= 3) break; if (pass === 0 && seen[fd.grp]) continue; if (take(fd, 'p', rem.p, 'proteine', n < 2 ? rem0.p * 0.5 / (fd.p / 100) : 0)) { n++; seen[fd.grp] = 1; } }
      if (rem.p > 12) { const w = foods.find(x => x.id === 'whey'); if (w) take(w, 'p', rem.p, 'proteine (integratore, solo se manca il resto)'); }
    }
    // 2) carboidrati (dopo quanto portano già le proteine scelte)
    if (rem.c > 15) {
      const c = rank('c', x => x.c >= 15 && x.grp !== 'Dolci' && x.k <= 400);
      let n = 0; for (const fd of c) { if (rem.c <= 15 || n >= 3) break; if (take(fd, 'c', rem.c, 'carboidrati', n < 2 ? rem0.c * 0.5 / (fd.c / 100) : 0)) n++; }
      if (rem.c > 15) { const d = foods.filter(x => x.grp === 'Dolci' && x.c >= 50); for (const fd of d) { if (rem.c <= 15) break; take(fd, 'c', rem.c, 'carboidrati (zuccheri: solo per chiudere)'); } }
    }
    // 3) grassi
    if (rem.f > 6) {
      const c = rank('f', x => x.f >= 20 && x.grp !== 'Dolci' && x.p >= 0);
      let n = 0; for (const fd of c) { if (rem.f <= 6 || n >= 2) break; if (take(fd, 'f', rem.f, 'grassi')) n++; }
    }
    // 4) verdura per la fibra, se la giornata è molto vuota
    if (opt.veg !== false && rem0.k > 600) { const v = foods.find(x => x.id === 'verdura'); if (v && !(ud.verdura > 250)) take(v, 'k', 200 * v.k / 100, 'fibre e micronutrienti'); }
    // alternative equivalenti (stesso gruppo, stessa macro principale) con quantità
    items.forEach(o => {
      const key = o.why.indexOf('prote') === 0 ? 'p' : o.why.indexOf('carbo') === 0 ? 'c' : o.why.indexOf('grassi') === 0 ? 'f' : 'k';
      const goal = o.m[key];
      o.alts = foods.filter(x => x !== o.fd && !used[x.id] && x[key] / 100 > 0 && x.grp === o.fd.grp && (x.pr || 1) < 5).map(x => {
        const cap = F.capLeft(p, x, date, ud, uw), g = Math.min(cap, Math.round(goal / (x[key] / 100) / 5) * 5);
        return { x, g, ok: g >= goal / (x[key] / 100) - 3 };
      }).filter(a => a.g >= 5).sort((a, b) => (b.ok - a.ok) || ((a.x.pr || 1) - (b.x.pr || 1))).slice(0, 2);
    });
    const added = items.reduce((a, o) => ({ k: a.k + o.m.k, p: a.p + o.m.p, c: a.c + o.m.c, f: a.f + o.m.f }), { k: 0, p: 0, c: 0, f: 0 });
    return { items, added, left: rem, month, goal, minor };
  };
})(window.FORMA);
