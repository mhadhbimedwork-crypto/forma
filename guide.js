/* Guida all'alimentazione: contenuti di orientamento (non sono consigli medici). */
(function (F) {
  'use strict';
  F.GUIDE_SOURCES = [
    ['OMS – Healthy diet (scheda informativa)', 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet'],
    ['EFSA – Metalli come contaminanti negli alimenti', 'https://www.efsa.europa.eu/en/topics/topic/metals-contaminants-food'],
    ['CREA – Linee guida per una sana alimentazione', 'https://www.crea.gov.it/'],
    ['FAO – Food-based dietary guidelines', 'https://www.fao.org/nutrition/education/food-dietary-guidelines']
  ];
  // valori di riferimento OMS per adulti (scheda "Healthy diet")
  F.WHO = [
    ['Frutta e verdura', 'almeno 400 g al giorno (sopra i 10 anni)'],
    ['Zuccheri liberi', 'meno del 10% delle calorie (meglio meno del 5%)'],
    ['Sale', 'meno di 5 g al giorno (circa 2 g di sodio)'],
    ['Grassi totali', '15-30% delle calorie'],
    ['Grassi saturi', 'meno del 10% delle calorie'],
    ['Grassi trans', 'meno dell\'1% delle calorie'],
    ['Fibre', 'almeno 25 g al giorno'],
    ['Carboidrati', '45-75% delle calorie, soprattutto da cereali integrali, verdura, frutta e legumi'],
    ['Proteine', '10-15% delle calorie per la popolazione generale: chi si allena e gli adolescenti ne hanno bisogno di più (l\'app usa 1,8-2 g per kg)']
  ];
  F.PYRAMID = [
    ['Alla base, ogni giorno', 'Verdura e frutta di stagione, cereali integrali, legumi, acqua, olio extravergine d\'oliva.'],
    ['Più volte a settimana', 'Pesce (2-4 porzioni), uova, yogurt e kefir, frutta secca e semi, carni bianche.'],
    ['Con moderazione', 'Carne rossa (circa 350-500 g cotti a settimana), formaggi, affettati, dolci e zuccheri aggiunti.'],
    ['Stile di vita', 'Movimento, sonno, cucinare in casa, mangiare con calma e in compagnia (come nella dieta mediterranea).']
  ];
  F.BEST = [
    { t: 'Proteine di alta qualità', note: 'Contano la quantità di aminoacidi essenziali (soprattutto leucina) e la digeribilità.', items: [
      ['Uova e albume', 'proteina di riferimento per qualità; l\'albume è quasi solo proteina.'],
      ['Latticini: yogurt greco, skyr, kefir, fiocchi di latte, whey', 'molta leucina, ottimi dopo l\'allenamento.'],
      ['Pesce e frutti di mare', 'proteine complete più omega-3 (salmone, sgombro, sardine, alici).'],
      ['Pollo e tacchino', 'magri e versatili, facili da dosare.'],
      ['Carne rossa magra e frattaglie', 'ferro, zinco e B12 molto assorbibili: poche volte a settimana.'],
      ['Legumi, tofu, tempeh, soia', 'proteine vegetali con fibre; abbinali ai cereali e usa quantità un po\' più alte.']] },
    { t: 'Carboidrati complessi', note: 'Rilascio più lento, fibre e micronutrienti: sono la base dell\'energia per allenarti.', items: [
      ['Avena, orzo, farro, quinoa, riso integrale', 'cereali interi con fibre e minerali.'],
      ['Patate (anche dolci) e castagne', 'energia pulita, ottime prima dell\'allenamento.'],
      ['Legumi', 'carboidrati lenti più proteine e fibre.'],
      ['Pane e pasta integrali', 'più fibre del raffinato; il bianco va bene attorno all\'allenamento.'],
      ['Gallette e riso bianco', 'veloci da digerire: utili vicino all\'allenamento, poco sazianti.']] },
    { t: 'Grassi buoni', note: 'Servono per ormoni (testosterone compreso), assorbimento delle vitamine A-D-E-K e salute di tendini e cervello.', items: [
      ['Olio extravergine d\'oliva', 'grassi monoinsaturi e polifenoli: il condimento di base.'],
      ['Pesce grasso (salmone, sgombro, sardine)', 'omega-3 EPA e DHA, 2-3 volte a settimana.'],
      ['Frutta secca e semi (noci, mandorle, lino, chia)', 'circa 30 g al giorno.'],
      ['Avocado', 'monoinsaturi e potassio, mezzo al giorno.'],
      ['Uova intere', 'colina e vitamina D insieme alle proteine.']] }
  ];
  F.SAFETY = [
    ['Mercurio nel pesce', 'I grandi pesci predatori in cima alla catena alimentare (pesce spada, squalo, tonno grosso) accumulano più mercurio. Preferisci pesci piccoli e a ciclo breve (sardine, alici, sgombro, merluzzo, salmone) e tieni il tonno in scatola a 2-3 volte a settimana. Bambini, adolescenti e donne in gravidanza devono limitarsi ancora di più.'],
    ['Arsenico nel riso', 'Il riso assorbe arsenico inorganico dal terreno: l\'EFSA lo segnala come contaminante da tenere sotto controllo. Alterna riso con avena, pasta, farro e quinoa, sciacqualo e cuocilo con acqua abbondante.'],
    ['Frattaglie e metalli pesanti', 'Fegato e reni concentrano vitamina A e metalli: 100-150 g, una o due volte a settimana.'],
    ['Affettati e carni lavorate', 'Contengono sale e nitriti: usali come eccezione, non tutti i giorni.'],
    ['Albume e uova crude', 'Solo pastorizzati e tenuti in frigo. Crudo si assorbe circa la metà e l\'avidina lega la biotina: meglio cotto.'],
    ['Frutta secca conservata male', 'Muffe come le aflatossine: conservala al fresco e al buio, butta quella rancida o con odore strano.'],
    ['Cottura', 'Evita di bruciare carne e amidi (idrocarburi e acrilammide): meglio forno, vapore e padella senza carbonizzare.']
  ];
  // "Super food": non esiste una certificazione ufficiale. Qui gli alimenti con più evidenza, per obiettivo.
  F.SUPER = [
    { n: 'Avena', g: ['mass', 'strength', 'cut', 'recomp'], b: 'beta-glucani che aiutano colesterolo e sazietà; energia lenta per l\'allenamento.' },
    { n: 'Uova', g: ['mass', 'strength', 'recomp'], b: 'proteina completa, colina e vitamina D.' },
    { n: 'Salmone, sgombro, sardine', g: ['mass', 'strength', 'cut', 'recomp'], b: 'omega-3 per cuore, tendini e recupero, più vitamina D.' },
    { n: 'Legumi', g: ['cut', 'recomp', 'mass'], b: 'proteine, fibre e carboidrati lenti: saziano a poche calorie.' },
    { n: 'Yogurt greco, skyr, kefir', g: ['cut', 'recomp', 'mass', 'strength'], b: 'proteine e probiotici per l\'intestino.' },
    { n: 'Frutti di bosco e melograno', g: ['cut', 'recomp', 'strength'], b: 'polifenoli antiossidanti con poche calorie.' },
    { n: 'Barbabietola', g: ['strength', 'mass', 'recomp'], b: 'nitrati che possono migliorare la resistenza allo sforzo.' },
    { n: 'Broccoli, cavolfiore, verza, cavolo nero', g: ['cut', 'recomp', 'mass', 'strength'], b: 'fibre, vitamina C e K e composti protettivi, pochissime calorie.' },
    { n: 'Spinaci e verdure a foglia', g: ['cut', 'recomp', 'strength'], b: 'magnesio, ferro, nitrati e vitamina K.' },
    { n: 'Noci, mandorle, semi di lino e chia', g: ['mass', 'strength', 'recomp'], b: 'grassi buoni e minerali, calorie dense per salire di peso.' },
    { n: 'Olio extravergine d\'oliva', g: ['mass', 'strength', 'cut', 'recomp'], b: 'grassi monoinsaturi e polifenoli.' },
    { n: 'Cioccolato fondente (70% o più)', g: ['strength', 'mass'], b: 'flavanoli e magnesio, in piccole dosi.' },
    { n: 'Patate dolci, castagne, quinoa', g: ['mass', 'strength'], b: 'carboidrati complessi per spingere negli allenamenti.' },
    { n: 'Aglio, curcuma con pepe nero, zenzero', g: ['recomp', 'cut', 'strength'], b: 'spezie con effetto antinfiammatorio, evidenze moderate.' }
  ];
  F.SUPER_NOTE = 'Il termine "super food" è commerciale: in Europa non esiste una certificazione ufficiale. L\'EFSA autorizza solo specifiche indicazioni sulla salute per singoli nutrienti. Questi alimenti sono scelti perché hanno più evidenza scientifica, ma nessun alimento da solo fa miracoli: conta la dieta intera.';
})(window.FORMA);
