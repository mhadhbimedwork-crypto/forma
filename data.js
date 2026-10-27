/* FORGIA – dati: esercizi, zone del corpo, schede di esempio. Script classico (funziona anche da file://). */
window.FORMA = window.FORMA || {};
(function (F) {
  F.VERSION = { version: '1.2.0', build: 3 };
  F.REPO = 'mhadhbimedwork-crypto/forma';
  // muscolo -> zona di dolore associata
  F.MUSCLE_ZONE = {
    chest: 'chest', lats: 'upper_back', upback: 'upper_back', delts: 'shoulder', biceps: 'elbow', triceps: 'elbow',
    forearm: 'wrist', abs: 'abdomen', lowback: 'lower_back', glutes: 'hip', quads: 'quad', hams: 'hamstring',
    calves: 'calf', adductors: 'hip'
  };
  F.MUSCLE_LABEL = {
    chest: 'Petto', lats: 'Dorsali', upback: 'Alto dorso/trapezi', delts: 'Spalle', biceps: 'Bicipiti', triceps: 'Tricipiti',
    forearm: 'Avambracci', abs: 'Addominali', lowback: 'Lombari', glutes: 'Glutei', quads: 'Quadricipiti',
    hams: 'Femorali', calves: 'Polpacci', adductors: 'Adduttori'
  };
  F.ZONES = {
    neck: 'Collo', shoulder: 'Spalla', chest: 'Petto/costole', upper_back: 'Alto dorso', lower_back: 'Zona lombare',
    abdomen: 'Addome', elbow: 'Gomito', wrist: 'Polso/mano', hip: 'Anca/gluteo', quad: 'Coscia (davanti)',
    hamstring: 'Coscia (dietro)', knee: 'Ginocchio', calf: 'Polpaccio/tibia', ankle: 'Caviglia/piede'
  };
  F.ZONE_TIPS = {
    neck: 'Evita carichi sopra la testa e movimenti con il collo in tensione; lavora su mobilità e tenuta del busto.',
    shoulder: 'Preferisci trazioni orizzontali e spinte a gomiti vicini al corpo; evita spinte sopra la testa e dip profondi.',
    chest: 'Riduci il range nelle spinte e sali lentamente di carico.',
    upper_back: 'Rematori leggeri e controllati, niente scatti; cura la postura del collo.',
    lower_back: 'Evita stacchi pesanti e flessioni sotto carico; preferisci esercizi che stabilizzano il busto (plank, bridge).',
    abdomen: 'Evita crunch ripetuti; usa tenute isometriche leggere.',
    elbow: 'Evita estensioni sopra la testa e curl pesanti; usa carichi leggeri e tempo lento.',
    wrist: 'Usa maniglie/parallette o pugni al posto del palmo a terra; evita appoggi con polso piegato.',
    hip: 'Riduci ampiezza in affondi e squat; privilegia bridge e movimenti controllati.',
    quad: 'Riduci il carico sulle gambe e usa un range comodo.',
    hamstring: 'Niente allungamenti forzati; lavora leggero e progressivo.',
    knee: 'Evita affondi, salti e squat profondi; usa bridge, leg curl leggeri o isometrie.',
    calf: 'Riduci salti e rimbalzi; lavora lentamente sul range comodo.',
    ankle: 'Evita salti e appoggi instabili; lavora da seduto o sdraiato.'
  };

  // E(id, nome, tipo, schema, muscoli primari, secondari, carichi articolari {zona:stress 1-3}, livello 1-3, unità, nota tecnica, alias)
  const X = [];
  function E(id, name, type, pat, prim, sec, loads, lvl, unit, cue, al, extra) {
    X.push(Object.assign({ id, name, type, pat, prim, sec, loads, lvl, unit, cue, al: al || [] }, extra || {}));
  }
  // ---- Calisthenics: spinta
  E('pushup_knee', 'Piegamenti sulle ginocchia', 'cali', 'push', ['chest'], ['triceps', 'delts'], { wrist: 1, shoulder: 1 }, 1, 'reps', 'Corpo in linea dalle ginocchia alla testa, gomiti a 45°, petto a pochi cm da terra.', ['piegamenti ginocchia'], { next: 'pushup', prev: 'pushup_wall' });
  E('pushup_wall', 'Piegamenti al muro/rialzati', 'cali', 'push', ['chest'], ['triceps', 'delts'], { wrist: 1 }, 1, 'reps', 'Mani su un piano alto (muro o tavolo), corpo teso. Più è alto il piano, più è facile.', ['piegamenti inclinati', 'push up inclinati'], { next: 'pushup_knee' });
  E('pushup', 'Piegamenti a terra', 'cali', 'push', ['chest'], ['triceps', 'delts', 'abs'], { wrist: 2, shoulder: 1, elbow: 1 }, 2, 'reps', 'Plank rigido, scapole stabili, scendi controllato in 2-3 secondi.', ['piegamenti', 'push up', 'flessioni'], { next: 'pushup_decline', prev: 'pushup_knee' });
  E('pushup_diamond', 'Piegamenti a diamante', 'cali', 'push', ['triceps'], ['chest'], { wrist: 2, elbow: 2 }, 2, 'reps', 'Mani vicine sotto il petto, gomiti stretti lungo il corpo.', [], { prev: 'pushup' });
  E('pushup_decline', 'Piegamenti piedi rialzati', 'cali', 'push', ['chest', 'delts'], ['triceps'], { wrist: 2, shoulder: 2 }, 3, 'reps', 'Piedi su un rialzo, corpo in linea; carico maggiore su petto alto e spalle.', [], { prev: 'pushup' });
  E('pike_pushup', 'Pike push-up (spalle)', 'cali', 'vpush', ['delts'], ['triceps', 'upback'], { shoulder: 3, wrist: 2, neck: 1 }, 2, 'reps', 'Bacino alto a V, testa verso il pavimento tra le mani, spingi in verticale.', ['pike pushup'], { next: 'hspu_wall' });
  E('hspu_wall', 'Verticale al muro (tenuta)', 'cali', 'vpush', ['delts'], ['triceps', 'abs'], { shoulder: 3, wrist: 3, neck: 1 }, 3, 'sec', 'Pancia al muro, corpo in linea, spingi il pavimento lontano.', [], { prev: 'pike_pushup' });
  E('dip_bench', 'Dip su panca/sedia', 'cali', 'push', ['triceps'], ['chest', 'delts'], { shoulder: 2, elbow: 2, wrist: 2 }, 1, 'reps', 'Schiena vicina alla panca, scendi fino a gomiti a 90° senza lasciar cadere le spalle.', [], { next: 'dip_parallel' });
  E('dip_parallel', 'Dip alle parallele', 'cali', 'push', ['triceps', 'chest'], ['delts'], { shoulder: 3, elbow: 2, wrist: 1 }, 3, 'reps', 'Spalle basse, busto leggermente avanti, discesa fino a gomiti a 90°.', ['dip', 'parallele'], { prev: 'dip_bench' });
  // ---- Calisthenics: trazione
  E('inv_row', 'Rematore inverso (australian row)', 'cali', 'pull', ['lats', 'upback'], ['biceps', 'forearm'], { shoulder: 1, elbow: 1 }, 1, 'reps', 'Sotto una barra bassa o un tavolo robusto: corpo teso, tira il petto alla barra e stringi le scapole.', ['rematore corpo libero', 'australian pull'], { next: 'pullup_neg' });
  E('pullup_neg', 'Trazioni negative (discesa lenta)', 'cali', 'vpull', ['lats'], ['biceps', 'upback', 'forearm'], { shoulder: 2, elbow: 2 }, 2, 'reps', 'Parti con il mento sopra la sbarra, scendi in 4-5 secondi controllando le spalle.', ['negative'], { next: 'pullup', prev: 'inv_row' });
  E('pullup_band', 'Trazioni assistite (elastico)', 'cali', 'vpull', ['lats'], ['biceps', 'upback', 'forearm'], { shoulder: 2, elbow: 2 }, 2, 'reps', 'Elastico sotto le ginocchia: usa la minima assistenza che ti permette di completare il range.', ['trazioni assistite'], { next: 'pullup' });
  E('pullup', 'Trazioni alla sbarra', 'cali', 'vpull', ['lats'], ['biceps', 'upback', 'forearm'], { shoulder: 2, elbow: 2 }, 3, 'reps', 'Parti da braccia tese con scapole basse, mento sopra la sbarra, nessun dondolio.', ['trazioni', 'pull up', 'pullup'], { prev: 'pullup_neg' });
  E('chinup', 'Trazioni supine (chin-up)', 'cali', 'vpull', ['lats', 'biceps'], ['upback'], { shoulder: 2, elbow: 3 }, 3, 'reps', 'Presa a palmi verso di te, a larghezza spalle; più lavoro per i bicipiti.', ['chin up'], { prev: 'pullup_neg' });
  E('scap_pull', 'Scapular pull (tenuta passiva-attiva)', 'cali', 'vpull', ['upback', 'lats'], ['forearm'], { shoulder: 1 }, 1, 'reps', 'Appeso alla sbarra, abbassa e solleva le scapole senza piegare i gomiti.', ['scapola pull'], { next: 'pullup_neg' });
  E('superman', 'Superman (estensioni a terra)', 'cali', 'hinge', ['lowback'], ['glutes', 'upback'], { lower_back: 1 }, 1, 'sec', 'Sdraiato a pancia in giù, solleva braccia e gambe leggermente e tieni 2 secondi.', ['superman'], {});
  // ---- Calisthenics: gambe
  E('squat_bw', 'Squat a corpo libero', 'cali', 'squat', ['quads', 'glutes'], ['hams', 'abs'], { knee: 2, hip: 1, lower_back: 1 }, 1, 'reps', 'Piedi larghi quanto le spalle, scendi seduto indietro, ginocchia in linea con i piedi.', ['squat', 'accosciata'], { next: 'split_squat' });
  E('box_squat', 'Squat alla panca (box squat)', 'cali', 'squat', ['quads', 'glutes'], ['hams'], { knee: 1, hip: 1 }, 1, 'reps', 'Siediti su una panca e rialzati senza spingere con le mani: range corto e sicuro.', [], { next: 'squat_bw' });
  E('split_squat', 'Affondi statici (split squat)', 'cali', 'lunge', ['quads', 'glutes'], ['hams', 'adductors'], { knee: 2, hip: 1 }, 2, 'reps', 'Piede avanti, busto dritto, scendi in verticale; ginocchio dietro sfiora il pavimento.', ['affondi', 'affondi statici', 'affondi cammino', 'affondi con manubri'], { next: 'bulgarian' });
  E('bulgarian', 'Squat bulgaro', 'cali', 'lunge', ['quads', 'glutes'], ['hams'], { knee: 3, hip: 2 }, 3, 'reps', 'Piede dietro su una panca, tronco leggermente inclinato, scendi controllato.', ['bulgari'], { prev: 'split_squat' });
  E('step_up', 'Step-up su rialzo', 'cali', 'lunge', ['quads', 'glutes'], ['calves'], { knee: 2, hip: 1 }, 1, 'reps', 'Sali su un gradino stabile spingendo col tallone; scendi lento.', [], {});
  E('glute_bridge', 'Ponte glutei', 'cali', 'hinge', ['glutes'], ['hams', 'lowback'], { hip: 1, lower_back: 1 }, 1, 'reps', 'Schiena a terra, spingi i talloni, stringi i glutei in alto per 1-2 secondi.', ['ponte glutei', 'hip thrust', 'glute bridge', 'contrazioni glutei'], { next: 'sl_bridge' });
  E('sl_bridge', 'Ponte glutei a una gamba', 'cali', 'hinge', ['glutes', 'hams'], ['lowback'], { hip: 2, lower_back: 1 }, 2, 'reps', 'Una gamba tesa, bacino in linea; non ruotare il bacino.', [], { prev: 'glute_bridge' });
  E('nordic_neg', 'Nordic curl negativo', 'cali', 'hinge', ['hams'], ['glutes'], { knee: 2, hamstring: 3 }, 3, 'reps', 'Ginocchia a terra, piedi bloccati: scendi il più lentamente possibile, poi aiutati con le mani.', ['nordic'], { minor: false });
  E('calf_bw', 'Calf raise a corpo libero', 'cali', 'calf', ['calves'], [], { ankle: 1, calf: 1 }, 1, 'reps', 'Sali sulle punte fino in cima, pausa 1 secondo, scendi lento.', ['polpacci', 'calf raise'], {});
  // ---- Calisthenics: core
  E('plank', 'Plank', 'cali', 'core', ['abs'], ['lowback', 'delts'], { shoulder: 1, lower_back: 1, wrist: 1 }, 1, 'sec', 'Gomiti sotto le spalle, schiena neutra, stringi glutei e addome.', ['plank', 'tavola'], { next: 'hollow' });
  E('side_plank', 'Plank laterale', 'cali', 'core', ['abs'], ['lowback'], { shoulder: 1 }, 1, 'sec', 'Corpo in linea, bacino alto, respira regolarmente.', ['plank laterale'], {});
  E('dead_bug', 'Dead bug', 'cali', 'core', ['abs'], [], {}, 1, 'reps', 'Schiena incollata al pavimento, muovi braccio e gamba opposti lentamente.', [], { next: 'hollow' });
  E('hollow', 'Hollow body (tenuta)', 'cali', 'core', ['abs'], [], { lower_back: 1 }, 2, 'sec', 'Schiena a terra, gambe e spalle alzate, tieni la zona lombare premuta.', ['hollow body'], {});
  E('knee_raise', 'Sollevamento ginocchia alla sbarra', 'cali', 'core', ['abs'], ['forearm'], { shoulder: 1 }, 2, 'reps', 'Appeso, porta le ginocchia al petto senza dondolare.', ['crunch alla sbarra'], { next: 'leg_raise' });
  E('leg_raise', 'Sollevamento gambe alla sbarra', 'cali', 'core', ['abs'], ['forearm'], { shoulder: 2, lower_back: 1 }, 3, 'reps', 'Gambe tese, bacino in retroversione, niente slancio.', [], { prev: 'knee_raise' });
  E('crunch', 'Crunch a terra', 'cali', 'core', ['abs'], [], { lower_back: 1, neck: 1 }, 1, 'reps', 'Solleva solo spalle e parte alta della schiena, espira in alto.', ['addominali', 'addominali crunch', 'crunch'], {});
  // ---- Palestra: spinta
  E('bench', 'Panca piana', 'gym', 'push', ['chest'], ['triceps', 'delts'], { shoulder: 2, elbow: 1, wrist: 1 }, 2, 'reps', 'Scapole addotte, piedi a terra, barra al petto controllata, spingi in linea.', ['panca piana', 'panca'], {});
  E('bench_incl', 'Panca inclinata (alta)', 'gym', 'push', ['chest', 'delts'], ['triceps'], { shoulder: 2, elbow: 1 }, 2, 'reps', 'Inclinazione 30°, scendi alla parte alta del petto.', ['panca alta', 'panca alta spinte', 'panca alta bilanciere', 'panca inclinata'], {});
  E('chest_press', 'Chest press (macchina)', 'gym', 'push', ['chest'], ['triceps', 'delts'], { shoulder: 1, elbow: 1 }, 1, 'reps', 'Schiena aderente, spingi senza bloccare i gomiti.', ['chest press', 'pectoral machine'], {});
  E('cable_fly', 'Croci ai cavi', 'gym', 'fly', ['chest'], ['delts'], { shoulder: 2 }, 2, 'reps', 'Gomiti leggermente piegati e fissi, abbraccia in avanti stringendo il petto.', ['croci ai cavi', 'croci ai cavi bassi', 'croci ai cavi bassi su panca inclinata', 'croci ai cavi bassi panca piana', 'croci'], {});
  E('ohp', 'Spinte sopra la testa', 'gym', 'vpush', ['delts'], ['triceps', 'upback'], { shoulder: 3, neck: 1, lower_back: 1, elbow: 1 }, 2, 'reps', 'Core serrato, spingi in linea sopra le orecchie, non inarcare la schiena.', ['spinte sopra la testa', 'military press', 'lento avanti', 'shoulder press'], {});
  E('lat_raise', 'Alzate laterali', 'gym', 'delt', ['delts'], [], { shoulder: 1 }, 1, 'reps', 'Gomiti leggermente flessi, solleva fino all\'altezza delle spalle senza slancio.', ['alzate laterali'], {});
  E('front_raise', 'Alzate frontali', 'gym', 'delt', ['delts'], [], { shoulder: 2 }, 1, 'reps', 'Controlla la salita fino all\'altezza delle spalle, scendi lento.', ['alzate frontali', 'alzate frontali bilanciere'], {});
  E('rear_raise', 'Alzate a 90° (deltoidi posteriori)', 'gym', 'delt', ['upback'], ['delts'], { shoulder: 1 }, 1, 'reps', 'Busto flesso in avanti, apri le braccia stringendo le scapole.', ['alzate a 90', 'alzate a 90°', 'alzate posteriori'], {});
  E('face_pull', 'Face pull', 'gym', 'pull', ['upback'], ['delts'], { shoulder: 1 }, 1, 'reps', 'Corda all\'altezza del viso, tira verso le orecchie aprendo i gomiti.', ['face pull'], {});
  E('shrug', 'Scrollate (trapezi)', 'gym', 'delt', ['upback'], ['forearm'], { neck: 1 }, 1, 'reps', 'Solleva le spalle verso le orecchie, pausa in alto, niente rotazioni.', ['scrollate', 'scrollate manubri', 'scrollate bilanciere'], {});
  E('upright_row', 'Tirate al mento', 'gym', 'delt', ['delts', 'upback'], ['biceps'], { shoulder: 3, wrist: 1 }, 2, 'reps', 'Presa larga, gomiti sopra i polsi ma sotto l\'altezza delle spalle.', ['tirate al mento', 'tirate al mento bilanciere'], {});
  // ---- Palestra: trazione
  E('lat_machine', 'Lat machine', 'gym', 'vpull', ['lats'], ['biceps', 'upback'], { shoulder: 2, elbow: 1 }, 1, 'reps', 'Petto in fuori, tira la sbarra al petto, gomiti verso i fianchi.', ['lat machine', 'lat machine presa stretta', 'lat pulldown', 'lat inverso', 'trazioni al cavo'], {});
  E('seated_row', 'Pulley basso', 'gym', 'pull', ['lats', 'upback'], ['biceps'], { lower_back: 1, shoulder: 1 }, 1, 'reps', 'Busto fermo, tira verso l\'ombelico stringendo le scapole.', ['pulley basso', 'pulley', 'rematore ai cavi'], {});
  E('bb_row', 'Rematore con bilanciere', 'gym', 'pull', ['lats', 'upback'], ['biceps', 'lowback'], { lower_back: 3, elbow: 1, shoulder: 1 }, 3, 'reps', 'Busto a 45°, schiena neutra, tira la barra verso l\'ombelico.', ['rematore bilanciere', 'rematore con bilanciere', 'rematore'], {});
  E('hyper', 'Hyperextension', 'gym', 'hinge', ['lowback', 'glutes'], ['hams'], { lower_back: 2, hip: 1 }, 1, 'reps', 'Scendi controllato, risali fino alla linea del corpo senza inarcare.', ['hyperextension', 'panca hyperextension', 'panca hyperextension contrazioni glutei'], {});
  E('deadlift', 'Stacco da terra', 'gym', 'hinge', ['hams', 'glutes', 'lowback'], ['lats', 'forearm', 'quads'], { lower_back: 3, hip: 2, knee: 1 }, 3, 'reps', 'Barra vicina agli stinchi, schiena neutra, spingi il pavimento con le gambe.', ['stacchi da terra', 'stacco da terra', 'stacco'], { minor: false });
  E('rdl', 'Stacco rumeno / mezzi stacchi', 'gym', 'hinge', ['hams', 'glutes'], ['lowback'], { lower_back: 2, hip: 1, hamstring: 2 }, 2, 'reps', 'Ginocchia sciolte, bacino indietro, scendi fino a sentire i femorali.', ['mezzi stacchi', 'stacchi rumeni', 'stacco rumeno'], {});
  // ---- Palestra: braccia
  E('curl_bb', 'Curl con bilanciere', 'gym', 'arms', ['biceps'], ['forearm'], { elbow: 2, wrist: 1 }, 1, 'reps', 'Gomiti fermi ai fianchi, niente slancio con la schiena.', ['curl bilanciere', 'curl bilanciere dritto', 'curl con bilanciere'], {});
  E('curl_db', 'Curl a martello', 'gym', 'arms', ['biceps'], ['forearm'], { elbow: 1, wrist: 1 }, 1, 'reps', 'Presa neutra, alterna controllando la discesa.', ['curl a martello', 'curl in piedi a martello alternati', 'curl panca scott seduta inversa a martello', 'curl concentrato su panca scott singolo', 'curl ai cavi bassi', 'curl'], {});
  E('tri_cable', 'Tricipiti ai cavi', 'gym', 'arms', ['triceps'], [], { elbow: 2 }, 1, 'reps', 'Gomiti fissi, estendi fino in fondo, ritorno lento.', ['tricipiti ai cavi', 'tricipiti corda', 'tricipiti inversi', 'tricipiti inversi singole', 'pushdown'], {});
  E('french', 'French press', 'gym', 'arms', ['triceps'], [], { elbow: 3, wrist: 1, shoulder: 1 }, 2, 'reps', 'Gomiti puntati in alto e fermi, scendi dietro la testa con controllo.', ['tricipiti french press', 'french press', 'skull crusher'], {});
  // ---- Palestra: gambe
  E('squat_bb', 'Squat con bilanciere', 'gym', 'squat', ['quads', 'glutes'], ['hams', 'lowback', 'abs'], { knee: 2, hip: 2, lower_back: 2 }, 3, 'reps', 'Barra stabile, core serrato, scendi sotto il parallelo solo se la tecnica regge.', ['squat', 'squat bilanciere'], {});
  E('leg_press', 'Leg press', 'gym', 'squat', ['quads', 'glutes'], ['hams'], { knee: 2, hip: 1 }, 1, 'reps', 'Schiena aderente, ginocchia in linea con le punte, non bloccare le ginocchia.', ['leg press'], {});
  E('leg_ext', 'Leg extension', 'gym', 'leg', ['quads'], [], { knee: 2 }, 1, 'reps', 'Estendi lentamente, pausa in alto, discesa controllata.', ['leg extension'], {});
  E('leg_curl', 'Leg curl sdraiato', 'gym', 'leg', ['hams'], ['calves'], { knee: 1, hamstring: 2 }, 1, 'reps', 'Bacino a contatto, fletti lentamente, discesa in 3 secondi.', ['leg curl sdraiato', 'leg curl sdraiato una gamba', 'leg curl'], {});
  E('adductor', 'Adductor machine', 'gym', 'leg', ['adductors'], [], { hip: 1 }, 1, 'reps', 'Range comodo, chiudi lentamente, nessuno strappo.', ['adductor machine', 'adductor'], {});
  E('calf_machine', 'Polpacci (seduto/in piedi)', 'gym', 'calf', ['calves'], [], { ankle: 1, calf: 1 }, 1, 'reps', 'Pausa in alto e in basso, ritmo lento.', ['polpacci calf seduto', 'polpacci in piedi', 'polpacci in piedi talloni verso l esterno', 'polpacci seduto', 'calf seduto'], {});
  E('cable_crunch', 'Crunch ai cavi', 'gym', 'core', ['abs'], [], { lower_back: 1, neck: 1 }, 2, 'reps', 'Fletti la colonna portando i gomiti alle ginocchia, non solo i fianchi.', [], {});

  F.EX = X;
  F.EXMAP = Object.fromEntries(X.map(e => [e.id, e]));

  // Schede di esempio (dal vecchio personal trainer) – formato importabile
  F.SAMPLES = [{
    id: 'old1', title: 'ALLENAMENTO (vecchia scheda, split 4 giorni)',
    text: `# Petto/Bicipiti
CROCI AI CAVI BASSI SU PANCA INCLINATA | 4 | 15-12-10 CARICO CRESCENTE
PANCA ALTA SPINTE | 3 | 10
CROCI AI CAVI BASSI PANCA PIANA | 3 | 10
PANCA PIANA | 3 | 12
CURL AI CAVI BASSI | 4 | 15-12-10 CARICO CRESCENTE
CURL IN PIEDI A MARTELLO ALTERNATI | 3 | 12
CURL BILANCIERE | 3 | 10
ADDOMINALI CRUNCH | 4 | MAX
# Quadricipiti/Femorali/Glutei
LEG EXTENSION | 4 | 15-12-10 CARICO CRESCENTE
LEG PRESS | 4 | 15/12
ADDUCTOR MACHINE | 3 | 12
AFFONDI CON MANUBRI | 4 | 12
LEG CURL SDRAIATO | 4 | 15-12-10 CARICO CRESCENTE
MEZZI STACCHI | 3 | 12
PANCA HYPEREXTENSION CONTRAZIONI GLUTEI | 3 | MAX
POLPACCI CALF SEDUTO | 5 | 12
POLPACCI IN PIEDI (TALLONI VERSO L'ESTERNO) | 5 | 12
# Deltoidi/Trapezi
ALZATE LATERALI | 4 | 15-12-10
SPINTE SOPRA LA TESTA | 3 | 10
ALZATE FRONTALI | 3 | 10
ALZATE A 90° | 3 | 10
SCROLLATE MANUBRI | 3 | 15-12-10
TIRATE AL MENTO BILANCIERE | 3 | 10
ADDOMINALI CRUNCH | 4 | MAX
# Dorso/Tricipiti
LAT MACHINE | 4 | 12-10-8
LAT INVERSO | 3 | 12
PULLEY BASSO | 3 | 10
STACCHI DA TERRA | 3 | 12
TRICIPITI AI CAVI | 4 | 15-12-10
TRICIPITI INVERSI SINGOLE | 3 | 12
ADDOMINALI CRUNCH | 3 | MAX`
  }, {
    id: 'old2', title: '1MASS (vecchia scheda, split 3 giorni)',
    text: `# Giorno 1 - Dorso + deltoide posteriore + bicipiti
REMATORE BILANCIERE | 4 | 8 PESO CRESCENTE
LAT MACHINE PRESA STRETTA | 4 | 15-12-10-8
LAT PULLDOWN | 4 | 12
ALZATE A 90 | 4 | 12
PANCA HYPEREXTENSION | 4 | 8 PESO CRESCENTE
CURL BILANCIERE DRITTO | 5 | 8 PESO CRESCENTE
CURL PANCA SCOTT (SEDUTA INVERSA) A MARTELLO | 4 | 12-10-8-6
CURL CONCENTRATO SU PANCA SCOTT SINGOLO | 3 | 10
ADDOMINALI | 4 | 20
# Giorno 2 - Petto + spalle + tricipiti
PANCA ALTA BILANCIERE | 4 | 8 PESO CRESCENTE
CROCI AI CAVI | 4 | 10
PANCA PIANA | 4 | 15-12-10-8
ALZATE LATERALI | 4 | 8 PESO CRESCENTE
ALZATE FRONTALI BILANCIERE | 4 | 10
SCROLLATE BILANCIERE | 4 | 8
TRICIPITI FRENCH PRESS | 4 | 8 PESO CRESCENTE
TRICIPITI CORDA | 4 | 10
TRICIPITI INVERSI | 4 | 8
ADDOMINALI | 4 | 20
# Giorno 3 - Gambe
SQUAT | 4 | 8 PESO CRESCENTE
LEG PRESS | 4 | 15-12-10-8
AFFONDI (IN CAMMINO) | 4 | 10 (x gamba)
LEG CURL SDRAIATO | 5 | 8 PESO CRESCENTE
MEZZI STACCHI | 4 | 12
LEG CURL SDRAIATO (UNA GAMBA) | 3 | 8
POLPACCI IN PIEDI | 4 | 12-12-10-8
POLPACCI SEDUTO | 4 | 12-10-10-8
ADDOMINALI | 4 | 20`
  }];
})(window.FORMA);
