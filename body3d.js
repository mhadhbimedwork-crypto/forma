/* FORMA – corpo umano 3D ruotabile. Stessi muscoli (F.MUSCLE_LABEL) e stesse zone (F.ZONES) del modello 2D: recupero, dolore ed esercizi. Three.js viene caricato solo quando serve (lib/three.min.js). */
(function (F) {
  let loading = null;
  F.body3DLoad = function () {
    if (window.THREE) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = 'lib/three.min.js'; s.onload = ok; s.onerror = () => { loading = null; ko(new Error('3D non disponibile')); };
      document.head.appendChild(s);
    });
    return loading;
  };

  const NEUTRAL = '#a8665c', SKIN = '#d3ad98', PRIM = '#ff4234', SEC = '#ff8a1f';
  const painColor = p => p >= 7 ? '#ef4444' : p >= 4 ? '#f97316' : p >= 1 ? '#facc15' : null;

  /* ---------- pose: angoli in radianti. a/l = braccio sinistro/destro (L = lato +x), s = spalla, z = apertura laterale, e = gomito
     h = anca (flessione), k = ginocchio, sp = busto, lie = sdraiato, hang = appeso, hz = apertura gambe ---------- */
  const POSES = {
    stand: { sz: 0.32 },
    squat: { h: -1.45, k: 1.95, sp: 0.55, s: -1.4, e: 0.2, hz: 0.18 },
    squat_front: { h: -1.45, k: 1.95, sp: 0.2, s: -1.6, e: 1.9, hz: 0.18 },
    hinge: { h: -1.25, k: 0.35, sp: 1.15, s: 0.0, e: 0.0 },
    bench: { lie: 1, h: -1.0, k: 1.7, s: -1.45, e: 0.1, hz: 0.25 },
    bench_incl: { lie: 1, tilt: 0.5, h: -1.0, k: 1.7, s: -1.45, e: 0.1, hz: 0.25 },
    fly: { lie: 1, h: -1.0, k: 1.7, s: -1.5, sz: 0.9, e: 0.2, hz: 0.25 },
    ohp: { s: -3.0, sz: 0.25, e: 0.15 },
    row: { h: -1.15, k: 0.5, sp: 1.1, s: -0.3, e: 0.6 },
    pull_down: { sit: 1, s: -2.7, sz: 0.5, e: 0.5 },
    row_seat: { sit: 1, s: -1.2, e: 1.3, sp: -0.1 },
    pullup: { hang: 1, s: -3.1, sz: 0.5, e: 0.25, k: 0.9, h: 0.2 },
    pullup_top: { hang: 1, s: -2.1, sz: 0.55, e: 2.3, k: 0.9, h: 0.2 },
    pushup: { plank: 1, s: -0.1, e: 0.25 },
    plank: { plank: 1, s: -1.5, e: 1.5 },
    dip: { dip: 1, s: 0.15, e: 1.6, sp: 0.3, k: 1.2 },
    curl: { s: 0.0, e: 1.9 },
    triceps: { s: -3.0, e: 2.3 },
    lateral: { s: 0.0, sz: 1.5, e: 0.15 },
    leg_press: { lie: 1, tilt: 0.45, h: -1.8, k: 2.0, hz: 0.25, s: -0.2, e: 0.9 },
    leg_ext: { sit: 1, k: 0.15, h: -1.5, s: 0.0, e: 0.6 },
    leg_curl: { lie: 1, face: 1, h: 0.0, k: 1.6, s: -1.5, e: 0.3 },
    lunge: { h: -1.2, k: 1.5, sp: 0.1, s: 0.0, e: 0.2, hz: 0.45 },
    calf: { s: 0.0, e: 0.1, toes: 1 },
    crunch: { lie: 1, h: -1.2, k: 1.9, sp: -0.8, s: -1.0, e: 2.0 },
    bridge: { lie: 1, h: -0.5, k: 1.7, s: 0.0, e: 0.1 }
  };
  const BY_PATTERN = {
    squat: 'squat', hinge: 'hinge', push: 'bench', vpush: 'ohp', pull: 'row', vpull: 'pullup', delt: 'lateral', arms: 'curl', core: 'crunch',
    leg: 'leg_press', lunge: 'lunge', calf: 'calf', fly: 'fly'
  };
  /* scelta pose: prima per id/nome, poi per schema */
  F.pose3DFor = function (e) {
    if (!e) return 'stand';
    const id = (e.id || '') + ' ' + (e.name || '');
    const t = id.toLowerCase();
    const re = (r, p) => r.test(t) ? p : null;
    return re(/leg[_ ]?press|pressa/, 'leg_press') || re(/leg[_ ]?ext|estension.*gamb|leg_extension/, 'leg_ext') || re(/leg[_ ]?curl|femorali.*(macchina|sdraiat)/, 'leg_curl') ||
      re(/lat[_ ]?machine|lat pull|pulldown|trazioni al/, 'pull_down') || re(/pullup_top/, 'pullup_top') || re(/pull|trazion|chin/, 'pullup') ||
      re(/incline|inclinat/, 'bench_incl') || re(/fly|croci/, 'fly') || re(/bench|panca|chest[_ ]?press/, 'bench') || re(/push[- _]?up|piegament/, 'pushup') ||
      re(/plank|plancia/, 'plank') || re(/dip|parallele/, 'dip') || re(/bridge|hip[_ ]?thrust|ponte/, 'bridge') || re(/front[_ ]?squat/, 'squat_front') ||
      re(/curl|bicip/, 'curl') || re(/pushdown|tricip|french|skull/, 'triceps') || re(/lateral|alzate lat/, 'lateral') ||
      re(/seated[_ ]?row|pulley|cavo|row_seat/, 'row_seat') || re(/rem|row/, 'row') || re(/ohp|spinte sopra|military|shoulder[_ ]?press/, 'ohp') ||
      BY_PATTERN[e.pattern || e.pat || e.p] || 'stand';
  };

  function mat(color, rough) {
    return new THREE.MeshStandardMaterial({ color, roughness: rough == null ? 0.55 : rough, metalness: 0.05 });
  }

  /* ---------- modello anatomico reale: BodyParts3D (CC BY-SA 2.1 JP) + Z-Anatomy (CC BY-SA 4.0), ridotto e quantizzato in anatomy.bin / anatomy.json ---------- */
  let dataP = null;
  function loadData() {
    if (!dataP) dataP = Promise.all([fetch('lib/anatomy.json').then(r => r.json()), fetch('lib/anatomy.bin').then(r => r.arrayBuffer())]).catch(e => { dataP = null; throw e; });
    return dataP;
  }
  const sm = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };


  /* ---------- forma muscolosa (come il modello 2D dell'app): ingrossa i muscoli attorno al loro asse osseo ---------- */
  const BULK = { biceps: 1.38, triceps: 1.4, forearm: 1.28, delts: 1.0, quads: 1.3, hams: 1.28, adductors: 1.22, calves: 1.4, glutes: 1.0 };
  function deform(g, j, x, y, z) {
    const m = g.m, ch = g.chain, sg = g.side === 'R' ? -1 : 1;
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const radial = (A, B, k, shape) => {
      const ab = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], ap = [x - A[0], y - A[1], z - A[2]];
      const t = Math.max(0, Math.min(1, dot(ap, ab) / dot(ab, ab)));
      const c = [A[0] + ab[0] * t, A[1] + ab[1] * t, A[2] + ab[2] * t];
      const w = Math.pow(Math.sin(Math.PI * Math.pow(t, shape || 1)), 0.45);
      const kk = 1 + (k - 1) * w;
      return [c[0] + (x - c[0]) * kk, c[1] + (y - c[1]) * kk, c[2] + (z - c[2]) * kk];
    };
    if (m === 'delts') { const S = j.shoulder; return [S[0] + (x - S[0]) * 1.4 + sg * 0, S[1] + (y - S[1]) * 1.28, S[2] + (z - S[2]) * 1.15]; }
    if (m === 'chest') return [x * 1.14, -77 + (y + 77) * 1.42, z + 0];
    if (m === 'lats') { const k = 1 + 0.18 * sm((z - 1000) / 160); return [x * k, -77 + (y + 77) * 1.3, z]; }
    if (m === 'upback') return [x * 1.14, -77 + (y + 77) * 1.28, z];
    if (m === 'abs') return [x * 1.08, -77 + (y + 77) * 1.22, z];
    if (m === 'lowback') return [x * 1.06, -77 + (y + 77) * 1.18, z];
    if (m === 'glutes') { const H = j.hip; return [H[0] * 0.6 + (x - H[0] * 0.6) * 1.2, -77 + (y + 77) * 1.28, H[2] - 30 + (z - H[2] + 30) * 1.12]; }
    if (ch === 'torso' || ch === 'pelvis') { const k = 1 + 0.15 * sm((z - 1080) / 100) * (1 - sm((z - 1330) / 60)); return [x * k, -77 + (y + 77) * (1 + 0.2 * sm((z - 1000) / 150)), z]; }
    if (ch === 'arm' && BULK[m]) return z >= j.elbow[2] ? radial(j.shoulder, j.elbow, BULK[m]) : radial(j.elbow, j.wrist, BULK[m], 0.8);
    if (ch === 'leg' && BULK[m]) return z >= j.knee[2] ? radial(j.hip, j.knee, BULK[m]) : radial(j.knee, j.ankle, BULK[m], 0.75);
    if (ch === 'arm') return z >= j.elbow[2] ? radial(j.shoulder, j.elbow, 1.2) : radial(j.elbow, j.wrist, 1.15);
    if (ch === 'leg') return z >= j.knee[2] ? radial(j.hip, j.knee, 1.18) : radial(j.knee, j.ankle, 1.2, 0.8);
    return [x, y, z];
  }

  function build(man, bin) {
    const T = THREE, lift = man.lift, bmin = man.bmin, bmax = man.bmax;
    const cv = (p) => new T.Vector3(p[0] / 1000, (p[2] + lift) / 1000, -p[1] / 1000);   // modello (x, y avanti negativo, z su) -> three (x, y su, z avanti)
    const J = man.joints;
    const body = { muscles: {}, zoneMeshes: {} };
    const root = new T.Group();
    const bones = []; const world = [];
    const mk = (name, wp, parent) => {
      const b = new T.Bone(); b.name = name; world.push(wp.clone());
      b.position.copy(parent ? wp.clone().sub(world[bones.indexOf(parent)]) : wp);
      (parent || root).add(b); bones.push(b); return b;
    };
    const hipMid = cv(J.left.hip).add(cv(J.right.hip)).multiplyScalar(0.5);
    const pelvis = mk('pelvis', hipMid);
    const lumbar = hipMid.clone(); lumbar.y = (1010 + lift) / 1000;
    const chest = mk('chest', lumbar, pelvis);
    const arms = {}, legs = {};
    ['L', 'R'].forEach(sd => {
      const j = J[sd === 'L' ? 'left' : 'right'];
      const hp = mk('hip' + sd, cv(j.hip), pelvis), kn = mk('knee' + sd, cv(j.knee), hp), an = mk('ankle' + sd, cv(j.ankle), kn);
      const sh = mk('sh' + sd, cv(j.shoulder), chest), el = mk('el' + sd, cv(j.elbow), sh), wr = mk('wr' + sd, cv(j.wrist), el);
      // correzione di riposo: il modello ha le braccia leggermente aperte; le pose partono da braccia lungo i fianchi
      const tilt = (a, b) => Math.atan2(b.x - a.x, -(b.y - a.y));
      const s0 = cv(j.shoulder), e0 = cv(j.elbow), w0 = cv(j.wrist);
      const a1 = tilt(s0, e0), a2 = tilt(e0, w0);
      const sg = sd === 'L' ? 1 : -1;
      arms[sd] = { sh, el, wr, c1: -a1 * (a1 * sg > 0 ? 1 : 1) * 1, c2: -(a2 - a1) };
      arms[sd].c1 = -a1; arms[sd].c2 = -(a2 - a1);
      legs[sd] = { hp, kn, an };
    });
    root.updateMatrixWorld(true);
    const skeleton = new T.Skeleton(bones);
    const idx = {}; bones.forEach((b, i) => idx[b.name] = i);

    const meshes = [];
    man.groups.forEach(g => {
      const q = new Uint16Array(bin, g.po, g.nv * 3);
      const ind = g.u32 ? new Uint32Array(bin, g.io, g.ni) : new Uint16Array(bin, g.io, g.ni);
      const pos = new Float32Array(g.nv * 3), sIdx = new Uint16Array(g.nv * 4), sW = new Float32Array(g.nv * 4);
      const j = g.side === 'R' ? J.right : J.left;
      const Z = { hip: j.hip[2], knee: j.knee[2], ankle: j.ankle[2], sh: j.shoulder[2], el: j.elbow[2], wr: j.wrist[2] };
      const sdn = g.side === 'R' ? 'R' : 'L';
      for (let v = 0; v < g.nv; v++) {
        const x = bmin[0] + q[v * 3] / 65535 * (bmax[0] - bmin[0]), y = bmin[1] + q[v * 3 + 1] / 65535 * (bmax[1] - bmin[1]), z = bmin[2] + q[v * 3 + 2] / 65535 * (bmax[2] - bmin[2]);
        const d = deform(g, j, x, y, z);   // forma atletica: stessi volumi muscolari del corpo in app
        pos[v * 3] = d[0] / 1000; pos[v * 3 + 1] = (d[2] + lift) / 1000; pos[v * 3 + 2] = -d[1] / 1000;
        const w = {};   // osso -> peso
        const add = (name, val) => { if (val > 0.001) w[name] = (w[name] || 0) + val; };
        const ch = g.chain;
        if (ch === 'pelvis') add('pelvis', 1);
        else if (ch === 'head') add('chest', 1);
        else if (ch === 'torso') { const t = sm((z - 950) / 120); add('chest', t); add('pelvis', 1 - t); }
        else if (ch === 'foot') add('ankle' + sdn, 1);
        else if (ch === 'hand') add('wr' + sdn, 1);
        else if (ch === 'leg') {
          const t1 = sm((Z.hip + 50 - z) / 110), t2 = sm((Z.knee + 45 - z) / 90), t3 = sm((Z.ankle + 40 - z) / 60);
          add('pelvis', 1 - t1); add('hip' + sdn, t1 * (1 - t2)); add('knee' + sdn, t1 * t2 * (1 - t3)); add('ankle' + sdn, t1 * t2 * t3);
        } else if (ch === 'arm') {
          const girdle = (g.m === 'chest' || g.m === 'lats' || g.m === 'upback' || g.key.indexOf('other') === 0);
          const t1 = girdle ? sm((Math.abs(x) - 105) / 55) : sm((Z.sh + 40 - z) / 90);
          const t2 = sm((Z.el + 40 - z) / 80), t3 = sm((Z.wr + 25 - z) / 50);
          add('chest', 1 - t1); add('sh' + sdn, t1 * (1 - t2)); add('el' + sdn, t1 * t2 * (1 - t3)); add('wr' + sdn, t1 * t2 * t3);
        }
        const keys = Object.keys(w); let sum = 0; keys.forEach(k => sum += w[k]);
        keys.slice(0, 4).forEach((k, i) => { sIdx[v * 4 + i] = idx[k]; sW[v * 4 + i] = w[k] / sum; });
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      geo.setAttribute('skinIndex', new T.BufferAttribute(sIdx, 4)); geo.setAttribute('skinWeight', new T.BufferAttribute(sW, 4));
      geo.setIndex(new T.BufferAttribute(ind.slice(), 1)); geo.computeVertexNormals();
      const isMain = g.m !== 'other' && g.m !== 'neck';
      const mt = new T.MeshPhysicalMaterial({ color: NEUTRAL, roughness: 0.5, metalness: 0.02, clearcoat: 0.25, clearcoatRoughness: 0.45, side: T.DoubleSide });
      const mesh = new T.SkinnedMesh(geo, mt); mesh.frustumCulled = false;
      mesh.bind(skeleton, new T.Matrix4());
      const zone = g.m === 'neck' ? 'neck' : (F.MUSCLE_ZONE && F.MUSCLE_ZONE[g.m]) || null;
      mesh.userData = { m: g.m, zone, side: g.side, other: !isMain };
      if (!isMain) mt.color.set(g.chain === 'head' || g.chain === 'hand' || g.chain === 'foot' ? '#8a5048' : '#8c4a42');
      root.add(mesh); meshes.push(mesh);
      if (isMain || g.m === 'neck') (body.muscles[g.m] = body.muscles[g.m] || []).push(mesh);
    });
    // marcatori per le zone articolari (dolore): sfere nei punti di rotazione
    const joint = (bone, r, zone, side, off) => {
      const s = new T.Mesh(new T.SphereGeometry(r, 18, 12), new T.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0, depthTest: false }));
      s.renderOrder = 5; if (off) s.position.copy(off);
      s.userData = { zone, side, joint: true }; bone.add(s);
      (body.zoneMeshes[zone] = body.zoneMeshes[zone] || []).push(s);
    };
    ['L', 'R'].forEach(sd => {
      joint(arms[sd].el, 0.05, 'elbow', sd); joint(arms[sd].wr, 0.04, 'wrist', sd);
      joint(legs[sd].kn, 0.07, 'knee', sd); joint(legs[sd].an, 0.055, 'ankle', sd);
    });
    joint(chest, 0.07, 'neck', 'C', new T.Vector3(0, 0.37, 0));
    return { body, root, pelvis, spine: chest, chest: new T.Object3D(), arms, legs, skeleton, meshes };
  }


  /* profilo di spessore reale (davanti/dietro) per altezza, misurato sul modello anatomico: serve a dare volume vero al disegno 3D */
  F.body3DProfile = function () {
    return loadData().then(([man, bin]) => {
      const bmin = man.bmin, bmax = man.bmax, N = 175, rows = { trunk: [], leg: [], arm: [] };
      const mk = () => Array.from({ length: N }, () => ({ x0: 1e9, x1: -1e9, f: 1e9, b: -1e9 }));
      const R = { trunk: mk(), leg: mk(), arm: mk() };
      man.groups.forEach(g => {
        const j = g.side === 'R' ? man.joints.right : man.joints.left;
        const q = new Uint16Array(bin, g.po, g.nv * 3);
        let cls = null;
        if (g.chain === 'leg' || g.chain === 'foot') cls = g.side === 'L' ? 'leg' : null;
        else if (g.chain === 'arm' || g.chain === 'hand') cls = (g.m === 'chest' || g.m === 'lats' || g.m === 'upback') ? 'trunk' : (g.side === 'L' ? 'arm' : null);
        else cls = 'trunk';
        if (g.chain === 'leg' && (g.m === 'glutes' || g.key.indexOf('other_leg') === 0 && false)) cls = 'trunk';
        if (!cls) return;
        for (let v = 0; v < g.nv; v++) {
          const x = bmin[0] + q[v * 3] / 65535 * (bmax[0] - bmin[0]), y = bmin[1] + q[v * 3 + 1] / 65535 * (bmax[1] - bmin[1]), z = bmin[2] + q[v * 3 + 2] / 65535 * (bmax[2] - bmin[2]);
          const d = deform(g, j, x, y, z), zz = d[2] + man.lift, k = Math.round(zz / 10);
          if (k < 0 || k >= N) continue;
          let c = cls;
          if (c === 'trunk' && zz < 780 && g.chain !== 'torso' && g.chain !== 'pelvis' && g.chain !== 'head') c = null;
          if (!c) continue;
          const r = R[c][k]; r.x0 = Math.min(r.x0, d[0]); r.x1 = Math.max(r.x1, d[0]); r.f = Math.min(r.f, d[1]); r.b = Math.max(r.b, d[1]);
        }
      });
      const out = {};
      Object.keys(R).forEach(c => { out[c] = R[c].map(r => r.f > 1e8 ? null : [Math.round(r.x0), Math.round(r.x1), Math.round(r.f), Math.round(r.b)]); });
      return out;
    });
  };

  /* ---------- scena ---------- */
  F.body3D = function (box, opts) {
    opts = opts || {};
    return Promise.all([F.body3DLoad(), loadData()]).then(([_, data]) => {
      const T = THREE;
      const W = box.clientWidth || 320, H = box.clientHeight || 420;
      const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(W, H);
      renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;cursor:grab';
      box.innerHTML = ''; box.appendChild(renderer.domElement);
      const scene = new T.Scene();
      const cam = new T.PerspectiveCamera(32, W / H, 0.1, 50);
      scene.add(new T.HemisphereLight(0xffffff, 0x556070, 0.95));
      const key = new T.DirectionalLight(0xffffff, 1.05); key.position.set(2, 3, 3); scene.add(key);
      const rim = new T.DirectionalLight(0x9fc4ff, 0.5); rim.position.set(-3, 2, -3); scene.add(rim);
      const world = new T.Group(); scene.add(world);
      const prop = new T.Group(); world.add(prop);
      const m = build(data[0], data[1]); world.add(m.root);
      let yaw = opts.yaw != null ? opts.yaw : 0.5, pitch = 0.12, dist = 5.2, st = {};
      const floorM = new T.Mesh(new T.CircleGeometry(1.1, 48), new T.MeshBasicMaterial({ color: 0x20252d, transparent: true, opacity: 0.5 }));
      floorM.rotation.x = -Math.PI / 2; world.add(floorM);

      const ray = new T.Raycaster(), ptr = new T.Vector2();

      function color(mesh, o) {
        const u = mesh.userData; let c = NEUTRAL;
        const side = u.side;
        if (o.pain && u.zone) {
          let lv = o.pain[u.zone] || 0;
          const sm = o.sides && o.sides[u.zone];
          if (sm && side !== 'C') lv = side === 'L' ? sm.sl : sm.sr;
          if (painColor(lv)) c = painColor(lv);
        }
        if (o.rec && u.m && o.rec[u.m]) c = F.recColor(o.rec[u.m].pct);
        if (u.m && (o.prim || o.sec)) {
          if ((o.prim || []).includes(u.m)) c = PRIM; else if ((o.sec || []).includes(u.m)) c = SEC;
        }
        return c;
      }
      function paint() {
        const o = st;
        Object.keys(m.body.muscles).forEach(k => m.body.muscles[k].forEach(me => {
          const c = color(me, o); me.material.color.set(c);
          const hot = (o.prim || o.sec) ? (c === PRIM || c === SEC) : c !== NEUTRAL;
          me.material.emissive.set(hot ? c : '#000000'); me.material.emissiveIntensity = hot ? 0.28 : 0;
          me.material.opacity = 1;
        }));
        Object.keys(m.body.zoneMeshes).forEach(z => m.body.zoneMeshes[z].forEach(me => {
          let lv = (o.pain && o.pain[z]) || 0; const sm2 = o.sides && o.sides[z];
          if (sm2 && me.userData.side !== 'C') lv = me.userData.side === 'L' ? sm2.sl : sm2.sr;
          const c = o.pain && painColor(lv);
          me.material.color.set(c || '#ffffff'); me.material.opacity = c ? 0.75 : (o.sel === z ? 0.35 : 0);
        }));
      }

      /* ---------- posa ---------- */
      function clearProp() { while (prop.children.length) prop.remove(prop.children[0]); }
      function setPose(name) {
        const P = POSES[name] || POSES.stand;
        const { root, pelvis, spine, chest, arms, legs } = m;
        root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); pelvis.rotation.set(0, 0, 0); spine.rotation.set(0, 0, 0); chest.rotation.set(0, 0, 0);
        clearProp();
        const v = k => P[k] || 0;
        spine.rotation.x = v('sp');
        ['L', 'R'].forEach(sd => {
          const sx = sd === 'L' ? 1 : -1;
          const qa = (b, ex, ey, ez, c) => { b.quaternion.setFromEuler(new T.Euler(ex, ey, ez)).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), c)); };
          qa(arms[sd].sh, v('s'), 0, sx * (v('sz') || 0.12), arms[sd].c1);
          qa(arms[sd].el, -v('e'), 0, 0, arms[sd].c2);
          arms[sd].wr.quaternion.identity();
          legs[sd].hp.rotation.set(v('h'), 0, sx * v('hz'));
          legs[sd].kn.rotation.set(v('k'), 0, 0);
          legs[sd].an.rotation.set(P.toes ? 0.9 : 0, 0, 0);
        });
        if (P.hang) {     // appeso alla sbarra: i polsi alla stessa altezza della sbarra
          pelvis.position.y = 0.95;
        } else pelvis.position.y = 0.95;
        if (P.lie) {
          root.rotation.x = -Math.PI / 2 + (P.tilt ? 0 : 0);
          if (P.face) root.rotation.x = Math.PI / 2;
          if (P.tilt) root.rotation.x += P.face ? 0 : P.tilt;
          root.updateMatrixWorld(true);
        }
        if (P.plank) { root.rotation.x = Math.PI / 2 - 0.12; root.updateMatrixWorld(true); }
        if (P.dip) { root.position.y = 0.0; }
        // appoggio a terra: abbassa/alza il corpo fino a toccare il suolo col punto più basso
        root.position.y = 0; world.updateMatrixWorld(true);
        const refresh = () => { m.skeleton.update(); m.meshes.forEach(x => x.computeBoundingBox()); };
        refresh();
        const box = new T.Box3().setFromObject(root);
        let lift = -box.min.y;
        if (P.lie || P.sit) lift += 0.42;      // panca / sedile
        if (P.hang) { lift = 0.34; }
        root.position.y = lift;
        world.updateMatrixWorld(true); refresh();
        const b2 = new T.Box3().setFromObject(root);
        // attrezzi
        const slab = (w, h, d, x, y, z, c) => { const g = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c || '#39414d', 0.8)); g.position.set(x, y, z); prop.add(g); return g; };
        const bar = (len, x, y, z, axis, r, c) => {
          const g = new T.Mesh(new T.CylinderGeometry(r || 0.016, r || 0.016, len, 14), mat(c || '#b9c0c8', 0.3));
          if (axis === 'x') g.rotation.z = Math.PI / 2; if (axis === 'z') g.rotation.x = Math.PI / 2;
          g.position.set(x, y, z); prop.add(g); return g;
        };
        const wristPos = () => {
          const wp = new T.Vector3(); arms.L.wr.getWorldPosition(wp); return wp;
        };
        if (P.lie && !P.face && !P.tilt) {          // panca piana + bilanciere
          const top = b2.min.y;
          slab(0.32, 0.1, 1.35, 0, top - 0.05, b2.min.z + 0.7 - 0.0, '#2b313b');
          const wp = wristPos(); bar(1.7, 0, wp.y, wp.z, 'x', 0.016);
          [1, -1].forEach(sx => { const d = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 0.05, 28), mat('#20252d', 0.5)); d.rotation.z = Math.PI / 2; d.position.set(sx * 0.7, wp.y, wp.z); prop.add(d); });
        } else if (P.lie && P.tilt) {
          const top = b2.min.y; slab(0.32, 0.1, 1.3, 0, top - 0.05, 0, '#2b313b');
        }
        if (P.hang) {
          const wp = wristPos(); bar(1.1, 0, wp.y + 0.04, wp.z, 'x', 0.017);
          [1, -1].forEach(sx => slab(0.05, 2.4, 0.05, sx * 0.62, 1.2, wp.z, '#39414d'));
          floorM.position.y = 0;
        }
        if (P.sit) slab(0.42, 0.08, 0.42, 0, 0.38, -0.02, '#2b313b');
        if (name === 'ohp' || name === 'squat') {
          const wp = wristPos(); const sp = new T.Vector3(); m.chest.getWorldPosition(sp); bar(1.6, 0, name === 'ohp' ? wp.y + 0.03 : sp.y + 0.3, name === 'ohp' ? wp.z : sp.z - 0.1, 'x', 0.016);
        }
        floorM.visible = true;
        // inquadratura
        refresh(); const bb = new T.Box3().setFromObject(m.root); if (P.hang) bb.expandByPoint(new T.Vector3(0, 2.2, 0));
        const c = bb.getCenter(new T.Vector3()), sz = bb.getSize(new T.Vector3());
        world.userData.center = c;
        dist = Math.max(sz.y / (2 * Math.tan(T.MathUtils.degToRad(16))), sz.x / (2 * Math.tan(T.MathUtils.degToRad(16)) * (W / H)), sz.z / (2 * Math.tan(T.MathUtils.degToRad(16)) * (W / H))) * 1.4;
        if (P.lie) { yaw = opts.yaw != null ? opts.yaw : 1.1; }
      }
      function setView() {
        const c = world.userData.center || new T.Vector3(0, 0.9, 0);
        cam.position.set(c.x + dist * Math.sin(yaw) * Math.cos(pitch), c.y + dist * Math.sin(pitch), c.z + dist * Math.cos(yaw) * Math.cos(pitch));
        cam.lookAt(c);
      }
      function draw() { setView(); renderer.render(scene, cam); }

      /* trascinamento: ruota; tocco senza trascinare: seleziona zona */
      let drag = null, moved = 0, raf = 0;
      const el = renderer.domElement;
      const q = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
      el.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; moved = 0; el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; });
      el.addEventListener('pointermove', e => {
        if (!drag) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved += Math.abs(dx) + Math.abs(dy);
        yaw -= dx * 0.011; pitch = Math.max(-0.6, Math.min(1.0, pitch + dy * 0.008)); drag = { x: e.clientX, y: e.clientY }; q();
      });
      el.addEventListener('pointerup', e => {
        el.style.cursor = 'grab';
        if (drag && moved < 6 && opts.onZone) {
          const r = el.getBoundingClientRect();
          ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
          ray.setFromCamera(ptr, cam);
          const hits = ray.intersectObjects(m.root.children.length ? [m.root] : [], true).filter(h => h.object.userData && h.object.userData.zone);
          if (hits.length) opts.onZone(hits[0].object.userData.zone);
        }
        drag = null;
      });
      el.addEventListener('wheel', e => { e.preventDefault(); dist = Math.max(1.6, Math.min(9, dist * (1 + Math.sign(e.deltaY) * 0.08))); q(); }, { passive: false });

      const api = {
        update(o) { st = Object.assign({}, st, o || {}); if (o && o.pose) setPose(o.pose); paint(); draw(); },
        view(v) { yaw = v === 'b' ? Math.PI : v === 's' ? Math.PI / 2 : 0; draw(); },
        shot() { draw(); return renderer.domElement.toDataURL('image/png'); },
        destroy() { renderer.dispose(); box.innerHTML = ''; }
      };
      st = {}; setPose(opts.pose || 'stand'); api.update(opts);
      return api;
    });
  };

  /* schermata intera con il corpo umano 3D (modello anatomico reale, posabile) */
  F.view3D = function (o) {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0b0d12;display:flex;flex-direction:column';
    ov.innerHTML = '<div style="display:flex;gap:8px;padding:10px;align-items:center"><button data-v="f" class="sm">Fronte</button><button data-v="s" class="sm">Lato</button><button data-v="b" class="sm">Retro</button><span style="flex:1"></span><button data-x class="sm">Chiudi</button></div><div data-box style="flex:1;min-height:0;position:relative"><p style="color:#9aa3b2;text-align:center;margin-top:40vh">Carico il corpo 3D…</p></div><p style="color:#9aa3b2;font-size:12px;text-align:center;margin:6px 0 12px">Trascina per ruotare, pizzica o usa la rotella per ingrandire</p>';
    document.body.appendChild(ov);
    let api = null;
    const close = () => { if (api) api.destroy(); ov.remove(); };
    ov.querySelector('[data-x]').onclick = close;
    ov.querySelectorAll('[data-v]').forEach(b => b.onclick = () => api && api.view(b.dataset.v));
    F.body3D(ov.querySelector('[data-box]'), Object.assign({ pose: 'stand', yaw: 0 }, o || {})).then(a => { api = a; }).catch(() => { ov.querySelector('[data-box]').innerHTML = '<p style="color:#f87171;text-align:center;margin-top:40vh">Il 3D non è disponibile adesso (serve la connessione la prima volta).</p>'; });
  };
})(window.FORMA);
