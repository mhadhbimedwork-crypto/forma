/* FORGIA – altri esercizi e nomi inglesi/abbreviati, così le schede in inglese si leggono da sole. */
(function (F) {
  'use strict';
  const add = (id, name, pat, prim, sec, loads, lvl, unit, cue, al) => {
    const e = { id, name, type: 'gym', pat, prim, sec, loads, lvl, unit, cue, al };
    F.EX.push(e); F.EXMAP[id] = e;
  };
  add('tbar_row', 'T-bar row', 'pull', ['lats', 'upback'], ['biceps', 'lowback'], { lower_back: 2, shoulder: 1, elbow: 1 }, 2, 'reps', 'Busto inclinato a schiena neutra, tira i gomiti indietro e stringi le scapole, niente slancio.', ['t bar', 'tbar', 't-bar row', 't bar row', 'rematore t bar', 'rematore al t bar', 't bar rematore']);
  add('db_bench', 'Panca piana con manubri', 'push', ['chest'], ['triceps', 'delts'], { shoulder: 2, elbow: 1, wrist: 1 }, 1, 'reps', 'Scapole addotte, gomiti a 45°, scendi controllato fino ai lati del petto.', ['dumbbell bench press', 'db bench press', 'db bench', 'panca manubri', 'spinte manubri', 'spinte con manubri panca piana', 'dumbbell press']);
  add('db_incline', 'Panca inclinata con manubri', 'push', ['chest', 'delts'], ['triceps'], { shoulder: 2, elbow: 1, wrist: 1 }, 2, 'reps', 'Panca a 30°, spingi in alto e leggermente indietro, controlla la discesa.', ['incline dumbbell press', 'incline db press', 'incline dumbbell bench press', 'spinte manubri inclinata', 'panca inclinata manubri']);
  add('pec_deck', 'Pec deck (croci in macchina)', 'fly', ['chest'], ['delts'], { shoulder: 1 }, 1, 'reps', 'Gomiti all\'altezza delle spalle, chiudi davanti al petto e fai pausa.', ['pec deck', 'peck deck', 'butterfly', 'chest fly machine', 'machine fly', 'croci macchina', 'croci alla macchina']);
  add('db_shoulder', 'Shoulder press (manubri o macchina)', 'vpush', ['delts'], ['triceps', 'upback'], { shoulder: 3, neck: 1 }, 2, 'reps', 'Spingi sopra la testa senza inarcare la schiena, gomiti leggermente avanti.', ['shoulder press', 'dumbbell shoulder press', 'machine shoulder press', 'military press', 'arnold press', 'lento avanti', 'lento manubri', 'spinte spalle', 'spalle macchina']);
  add('incline_curl', 'Curl su panca inclinata 45°', 'arms', ['biceps'], ['forearm'], { elbow: 2, wrist: 1, shoulder: 1 }, 2, 'reps', 'Braccia cadenti dietro il busto, gomiti fermi: allunga bene il bicipite.', ['incline curl', 'incline dumbbell curl', 'incline db curl', 'curl panca inclinata', 'bicipiti panca inclinata', 'bicipiti su panca inclinata', 'bicipiti panca 45']);
  add('preacher', 'Curl alla panca Scott', 'arms', ['biceps'], ['forearm'], { elbow: 3, wrist: 1 }, 2, 'reps', 'Braccia appoggiate, non allungare del tutto in basso se senti tirare il gomito.', ['preacher curl', 'scott curl', 'curl scott', 'curl panca scott', 'curl alla scott']);
  add('cable_curl', 'Curl ai cavi', 'arms', ['biceps'], ['forearm'], { elbow: 1, wrist: 1 }, 1, 'reps', 'Gomiti fermi, tensione costante dal cavo basso.', ['cable curl', 'curl ai cavi', 'curl cavo', 'curl ai cavi bassi', 'curl cavi bassi']);
  add('hack_squat', 'Hack squat', 'squat', ['quads', 'glutes'], ['hams'], { knee: 2, hip: 1 }, 2, 'reps', 'Schiena e bacino aderenti, scendi fino a dove la schiena non si stacca.', ['hack squat', 'pendulum squat', 'hack machine']);
  add('goblet', 'Goblet squat', 'squat', ['quads', 'glutes'], ['abs'], { knee: 1, hip: 1 }, 1, 'reps', 'Manubrio al petto, busto alto, scendi con talloni a terra.', ['goblet squat', 'squat con manubrio', 'squat goblet']);
  add('hip_thrust', 'Hip thrust', 'hinge', ['glutes'], ['hams'], { hip: 1, lower_back: 1 }, 2, 'reps', 'Schiena alta sulla panca, spingi coi talloni, bacino in estensione e glutei stretti in alto.', ['hip thrust', 'barbell hip thrust', 'glute bridge barbell', 'spinte di bacino', 'hip thrust bilanciere']);
  add('walking_lunge', 'Affondi con manubri', 'lunge', ['quads', 'glutes'], ['hams'], { knee: 2, hip: 1 }, 2, 'reps', 'Passo lungo, busto alto, ginocchio dietro che sfiora il pavimento.', ['walking lunge', 'walking lunges', 'dumbbell lunge', 'lunges', 'lunge', 'affondi', 'affondi in cammino', 'affondi manubri']);
  add('seated_leg_curl', 'Leg curl seduto', 'leg', ['hams'], ['calves'], { knee: 1, hamstring: 2 }, 1, 'reps', 'Schiena ferma allo schienale, fletti e fai pausa, risali lento.', ['seated leg curl', 'leg curl seduto', 'leg curl macchina seduta']);
  add('ab_wheel', 'Ab wheel (rullo addominale)', 'core', ['abs'], ['lowback', 'delts'], { shoulder: 1, lower_back: 2 }, 3, 'reps', 'Bacino sotto il bacino, scendi solo finché la schiena resta neutra.', ['ab wheel', 'ab roller', 'rullo addominali']);
  add('close_grip', 'Panca presa stretta', 'push', ['triceps'], ['chest', 'delts'], { elbow: 2, wrist: 2, shoulder: 1 }, 2, 'reps', 'Mani a larghezza spalle, gomiti vicini al corpo.', ['close grip bench press', 'close grip bench', 'cgbp', 'panca presa stretta']);
  add('tri_overhead', 'Tricipiti sopra la testa (cavi)', 'arms', ['triceps'], [], { elbow: 2, shoulder: 1 }, 2, 'reps', 'Gomiti vicini alle orecchie, estendi senza muovere le spalle.', ['overhead triceps extension', 'overhead tricep extension', 'triceps overhead', 'tricipiti sopra la testa', 'estensioni sopra la testa']);
  add('assisted_dip', 'Dip assistiti (macchina)', 'push', ['triceps', 'chest'], ['delts'], { shoulder: 2, elbow: 1 }, 1, 'reps', 'Spalle basse, scendi fino a gomiti a 90°.', ['assisted dip', 'assisted dips', 'machine dip', 'dip macchina', 'dip assistiti']);
  add('assisted_pullup', 'Trazioni assistite (macchina)', 'vpull', ['lats'], ['biceps', 'upback'], { shoulder: 2, elbow: 1 }, 1, 'reps', 'Scapole basse e petto verso la sbarra.', ['assisted pull up', 'assisted pullup', 'assisted pull-up', 'trazioni macchina', 'gravitron']);
  add('chest_row', 'Rematore al petto (macchina)', 'pull', ['upback', 'lats'], ['biceps'], { shoulder: 1, elbow: 1 }, 1, 'reps', 'Petto sul supporto, tira i gomiti indietro e stringi le scapole.', ['chest supported row', 'machine row', 'row machine', 'seated machine row', 'rematore macchina', 'rematore al petto']);
  add('ez_skull', 'Estensioni tricipiti sdraiato (manubri)', 'arms', ['triceps'], [], { elbow: 3, shoulder: 1 }, 2, 'reps', 'Gomiti fermi, scendi verso la fronte e risali senza aprire i gomiti.', ['lying triceps extension', 'dumbbell skull crusher', 'tricipiti manubri sdraiato']);

  const more = {
    bench: ['bench press', 'barbell bench press', 'flat bench press', 'flat bench', 'bp', 'panca'],
    bench_incl: ['incline bench press', 'incline barbell press', 'incline press', 'incline bench', 'panca inclinata'],
    chest_press: ['chest press', 'machine chest press', 'seated chest press', 'chest press macchina', 'pettorali macchina'],
    cable_fly: ['cable fly', 'cable flyes', 'cable crossover', 'cable chest fly', 'crossover', 'croci cavi'],
    ohp: ['overhead press', 'ohp', 'standing press', 'standing overhead press', 'barbell overhead press'],
    lat_raise: ['lateral raise', 'lateral raises', 'side raise', 'side lateral raise', 'dumbbell lateral raise', 'alzate laterali manubri'],
    front_raise: ['front raise', 'front raises', 'dumbbell front raise'],
    rear_raise: ['rear delt fly', 'rear delt raise', 'reverse fly', 'reverse flyes', 'rear delt', 'bent over lateral raise', 'reverse pec deck', 'alzate posteriori'],
    face_pull: ['face pull', 'face pulls', 'facepull'],
    shrug: ['shrug', 'shrugs', 'dumbbell shrug', 'barbell shrug', 'trapezi'],
    upright_row: ['upright row', 'upright rows'],
    lat_machine: ['lat pulldown', 'lat pull down', 'pulldown', 'pull down', 'cable pulldown', 'wide grip pulldown', 'lat pulldown wide', 'trazioni al lat', 'lat machine avanti'],
    seated_row: ['seated cable row', 'cable row', 'seated row', 'low row', 'low cable row', 'pulley', 'rematore ai cavi'],
    bb_row: ['barbell row', 'bent over row', 'bent-over row', 'bent over barbell row', 'bb row', 'rematore bilanciere'],
    hyper: ['back extension', 'back extensions', 'hyperextension', 'hyperextensions', 'lombari panca'],
    deadlift: ['deadlift', 'conventional deadlift', 'dead lift', 'stacco'],
    rdl: ['romanian deadlift', 'rdl', 'stiff leg deadlift', 'stiff legged deadlift', 'stacco rumeno', 'stacco gambe tese'],
    curl_bb: ['barbell curl', 'ez bar curl', 'ez curl', 'ez bar', 'bb curl', 'curl bar', 'curl ez'],
    curl_db: ['hammer curl', 'hammer curls', 'dumbbell curl', 'dumbbell curls', 'db curl', 'biceps curl', 'bicep curl', 'alternating curl'],
    tri_cable: ['triceps pushdown', 'tricep pushdown', 'tricep pushdowns', 'rope pushdown', 'cable triceps extension', 'triceps rope', 'push down', 'pushdowns'],
    french: ['skull crusher', 'skullcrusher', 'skull crushers', 'lying triceps extension', 'ez skull crusher'],
    squat_bb: ['back squat', 'barbell squat', 'barbell back squat', 'squats', 'squat bilanciere'],
    leg_press: ['leg press', '45 degree leg press', 'pressa'],
    leg_ext: ['leg extension', 'leg extensions', 'knee extension'],
    leg_curl: ['lying leg curl', 'prone leg curl', 'hamstring curl', 'leg curls'],
    adductor: ['hip adduction', 'adduction machine', 'adductors'],
    calf_machine: ['calf raise', 'calf raises', 'standing calf raise', 'seated calf raise', 'calves', 'calf'],
    cable_crunch: ['cable crunch', 'kneeling cable crunch', 'rope crunch'],
    pushup: ['push up', 'push ups', 'pushup', 'pushups', 'push-up', 'press up'],
    pullup: ['pull up', 'pull ups', 'pullup', 'pullups', 'pull-up', 'pull-ups'],
    chinup: ['chin up', 'chin ups', 'chinup', 'chin-up'],
    dip_parallel: ['dips', 'dip', 'parallel bar dips', 'chest dips', 'tricep dips'],
    dip_bench: ['bench dips', 'bench dip'],
    inv_row: ['inverted row', 'inverted rows', 'bodyweight row', 'australian pull up', 'ring row'],
    plank: ['planks', 'front plank', 'forearm plank'],
    crunch: ['crunches', 'sit up', 'sit ups', 'situps', 'abs', 'ab crunch'],
    knee_raise: ['hanging knee raise', 'hanging knee raises', 'knee raises'],
    leg_raise: ['hanging leg raise', 'hanging leg raises', 'leg raises', 'toes to bar'],
    squat_bw: ['bodyweight squat', 'air squat', 'bw squat'],
    split_squat: ['split squat', 'split squats', 'static lunge'],
    bulgarian: ['bulgarian split squat', 'bulgarian split squats', 'rear foot elevated split squat', 'rfess'],
    step_up: ['step up', 'step ups', 'step-up'],
    glute_bridge: ['glute bridge', 'glute bridges', 'bridge'],
    pike_pushup: ['pike push up', 'pike pushup', 'pike push-ups'],
    superman: ['superman', 'back raise'],
    side_plank: ['side plank', 'side planks'],
    dead_bug: ['dead bug', 'dead bugs'],
    hollow: ['hollow hold', 'hollow body hold']
  };
  Object.keys(more).forEach(id => { if (F.EXMAP[id]) F.EXMAP[id].al = F.EXMAP[id].al.concat(more[id]); });
})(window.FORMA);
