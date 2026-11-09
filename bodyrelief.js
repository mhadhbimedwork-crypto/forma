/* FORMA – il disegno del corpo dell'app (fronte e retro) reso in 3D ruotabile, senza cambiarlo.
   La sagoma del disegno diventa un volume (spessore dal bordo verso il centro); fronte e retro portano il disegno originale con le zone colorate sopra. */
(function (F) {
  const W = 402, H = 768, STEP = 2;
  let imgs = null;
  function loadImgs() {
    if (!imgs) imgs = Promise.all(['img/body-front.jpg', 'img/body-back.jpg'].map(src => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; })));
    return imgs;
  }

  /* sagoma: tutto ciò che non è sfondo nero collegato al bordo; poi distanza dal bordo (chamfer 3-4) */
  function silhouette(img) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(img, 0, 0, W, H);
    const d = x.getImageData(0, 0, W, H).data, bg = new Uint8Array(W * H), st = [];
    const dark = i => (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3 < 20;
    for (let i = 0; i < W; i++) { st.push(i, (H - 1) * W + i); }
    for (let j = 0; j < H; j++) { st.push(j * W, j * W + W - 1); }
    while (st.length) { const i = st.pop(); if (bg[i] || !dark(i)) continue; bg[i] = 1; const xx = i % W, yy = (i / W) | 0; if (xx > 0) st.push(i - 1); if (xx < W - 1) st.push(i + 1); if (yy > 0) st.push(i - W); if (yy < H - 1) st.push(i + W); }
    const mask = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) mask[i] = bg[i] ? 0 : 1;
    return mask;
  }
  function distance(mask) {
    const D = new Float32Array(W * H), INF = 1e6;
    for (let i = 0; i < W * H; i++) D[i] = mask[i] ? INF : 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; let v = D[i]; if (!v) continue; if (x > 0) v = Math.min(v, D[i - 1] + 3); if (y > 0) { v = Math.min(v, D[i - W] + 3); if (x > 0) v = Math.min(v, D[i - W - 1] + 4); if (x < W - 1) v = Math.min(v, D[i - W + 1] + 4); } D[i] = v; }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; let v = D[i]; if (!v) continue; if (x < W - 1) v = Math.min(v, D[i + 1] + 3); if (y < H - 1) { v = Math.min(v, D[i + W] + 3); if (x < W - 1) v = Math.min(v, D[i + W + 1] + 4); if (x > 0) v = Math.min(v, D[i + W - 1] + 4); } D[i] = v; }
    for (let i = 0; i < D.length; i++) D[i] /= 3;
    return D;
  }
  function mblur(a, mask, n) {   // sfocatura solo dentro la sagoma
    const o = new Float32Array(a.length);
    for (let k = 0; k < n; k++) {
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x; if (!mask[i]) continue;
        let s = a[i] * 4, w = 4;
        if (mask[i - 1]) { s += a[i - 1]; w++; } if (mask[i + 1]) { s += a[i + 1]; w++; } if (mask[i - W]) { s += a[i - W]; w++; } if (mask[i + W]) { s += a[i + W]; w++; }
        o[i] = s / w;
      }
      for (let i = 0; i < a.length; i++) if (mask[i]) a[i] = o[i];
    }
    return a;
  }
  function blur(a, n) {
    const o = new Float32Array(a.length);
    for (let k = 0; k < n; k++) { for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; o[i] = (a[i] * 4 + a[i - 1] + a[i + 1] + a[i - W] + a[i + W]) / 8; } a.set(o); }
    return a;
  }

  /* misure reali dello spessore (mm, asse y del modello: davanti negativo) per altezza, ogni 10 mm: [davanti, dietro]. Misurate sul modello anatomico muscoloso. */
  const PROF = {"trunk":[[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-137,-24],[-136,-23],[-136,-21],[-136,-19],[-135,-14],[-134,-8],[-137,-3],[-141,4],[-146,8],[-151,14],[-157,19],[-163,25],[-170,26],[-178,29],[-187,31],[-191,33],[-195,33],[-199,36],[-203,36],[-208,35],[-211,32],[-214,32],[-217,28],[-219,24],[-221,19],[-222,16],[-223,12],[-225,9],[-226,8],[-227,7],[-229,6],[-230,7],[-232,9],[-234,10],[-236,13],[-238,16],[-240,19],[-241,21],[-243,23],[-244,25],[-247,27],[-250,29],[-253,31],[-256,33],[-259,34],[-262,36],[-265,38],[-268,41],[-270,44],[-272,46],[-273,47],[-273,48],[-273,49],[-272,48],[-270,48],[-265,47],[-262,45],[-258,43],[-252,41],[-245,40],[-236,40],[-226,39],[-216,38],[-205,37],[-194,35],[-182,33],[-171,30],[-160,27],[-151,23],[-144,18],[-138,12],[-138,7],[-141,1],[-146,-5],[-152,-10],[-159,-14],[-166,-17],[-172,-18],[-178,-17],[-185,-14],[-188,-10],[-190,-16],[-189,-20],[-189,-22],[-188,-25],[-188,-28],[-187,-33],[-188,-39],[-186,-48],[-183,-66],[-180,-73],[-178,-82],[-177,-93],[-175,-104],[-173,-114],[-171,-125],[-170,-135],[-169,-143],[-169,-143],[-169,-143],[-169,-143]],"arm":[[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-169],[-187,-167],[-185,-165],[-183,-161],[-181,-157],[-178,-153],[-174,-148],[-171,-142],[-168,-137],[-165,-131],[-161,-126],[-159,-122],[-156,-119],[-154,-116],[-152,-113],[-150,-110],[-147,-106],[-144,-103],[-141,-99],[-139,-96],[-137,-92],[-134,-87],[-132,-83],[-131,-79],[-131,-75],[-131,-71],[-130,-66],[-130,-63],[-130,-59],[-129,-55],[-128,-52],[-127,-49],[-125,-46],[-124,-43],[-122,-40],[-120,-39],[-118,-37],[-115,-37],[-112,-37],[-109,-36],[-107,-34],[-105,-33],[-103,-32],[-102,-30],[-101,-28],[-101,-25],[-102,-21],[-105,-17],[-108,-14],[-110,-11],[-113,-7],[-116,-5],[-118,-3],[-119,-1],[-120,1],[-120,3],[-119,3],[-119,4],[-119,5],[-119,6],[-120,7],[-120,9],[-122,10],[-124,10],[-126,11],[-127,12],[-128,11],[-128,8],[-125,2],[-120,-7],[-115,-17],[-110,-27],[-104,-36],[-99,-45],[-94,-54],[-90,-61],[-87,-67],[-84,-70],[-84,-70],[-84,-70],[-84,-70],[-84,-70],[-84,-70],[-84,-70],[-84,-70],[-84,-70],[-84,-70],[-84,-70],[-84,-70],[-84,-70],[-84,-70],[-84,-70],[-84,-70],[-84,-70],[-84,-70],[-84,-70],[-84,-70],[-84,-70],[-84,-70],[-84,-70],[-84,-70],[-84,-70],[-84,-70],[-84,-70],[-84,-70]],"leg":[[-204,-33],[-195,-33],[-186,-34],[-178,-34],[-171,-33],[-158,-32],[-143,-30],[-131,-31],[-120,-31],[-112,-32],[-105,-31],[-101,-30],[-98,-29],[-96,-28],[-95,-26],[-96,-25],[-96,-23],[-95,-20],[-96,-18],[-98,-15],[-99,-12],[-99,-8],[-101,-5],[-103,-1],[-106,2],[-108,6],[-112,9],[-113,12],[-114,15],[-116,16],[-120,18],[-121,19],[-121,19],[-122,19],[-121,18],[-122,16],[-123,15],[-123,12],[-123,9],[-123,5],[-122,1],[-121,-4],[-121,-8],[-121,-13],[-122,-18],[-123,-23],[-125,-27],[-127,-30],[-130,-32],[-134,-33],[-138,-34],[-142,-33],[-146,-32],[-149,-30],[-152,-28],[-155,-24],[-157,-22],[-160,-20],[-162,-17],[-164,-14],[-165,-12],[-167,-11],[-167,-9],[-169,-7],[-170,-6],[-170,-5],[-171,-4],[-171,-4],[-171,-4],[-171,-4],[-170,-5],[-170,-6],[-168,-7],[-166,-9],[-164,-11],[-162,-13],[-159,-15],[-156,-17],[-154,-18],[-152,-20],[-150,-21],[-148,-29],[-146,-37],[-145,-46],[-144,-54],[-142,-63],[-142,-70],[-140,-77],[-139,-84],[-138,-91],[-137,-91],[-137,-89],[-136,-86],[-135,-82],[-134,-77],[-132,-73],[-130,-69],[-127,-65],[-123,-61],[-120,-57],[-116,-56],[-112,-55],[-109,-56],[-106,-56],[-104,-58],[-103,-58],[-102,-60],[-101,-61],[-101,-62],[-100,-61],[-98,-63],[-97,-63],[-95,-65],[-94,-66],[-92,-68],[-91,-70],[-90,-72],[-89,-74],[-89,-76],[-89,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77],[-88,-77]]};
  const PX_PER_MM = 0.4416, Y_HEAD = 14, Y_SOLE = 752;
  const HW = [[0, 50], [140, 52], [150, 62], [165, 86], [185, 80], [220, 74], [260, 71], [300, 63], [340, 65], [380, 77], [415, 81], [452, 81], [770, 81]];
  const hwAt = y => { for (let i = 1; i < HW.length; i++) if (y <= HW[i][0]) { const a = HW[i - 1], b = HW[i]; return a[1] + (b[1] - a[1]) * (y - a[0]) / (b[0] - a[0]); } return 81; };

  let geoCache = null;
  function buildGeo(T, img) {
    if (geoCache) return geoCache;
    const mask0 = silhouette(img);
    const mf = new Float32Array(W * H); for (let i = 0; i < mf.length; i++) mf[i] = mask0[i]; blur(mf, 3);
    const mask = new Uint8Array(W * H); for (let i = 0; i < mask.length; i++) mask[i] = mf[i] > 0.5 ? 1 : 0;
    for (let k = 0; k < 2; k++) { const m2 = mask.slice(); for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (mask[i] && !(mask[i - 1] && mask[i + 1] && mask[i - W] && mask[i + W])) m2[i] = 0; } mask.set(m2); }
    const D = distance(mask); blur(D, 2);
    /* classi: 1 busto/testa, 2 braccio, 3 gamba */
    const cls = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!mask[i]) continue;
      let c = 1;
      if (y >= 150 && y <= 450 && Math.abs(x - 201) > hwAt(y) + 3) c = 2;
      if (y > 430 && Math.abs(x - 201) <= hwAt(y) + 3 && y < 452) c = 1;
      if (y >= 450 || (y > 425 && c === 1 && Math.abs(x - 201) > 8 && false)) c = 3;
      cls[i] = c;
    }
    /* semi-larghezza locale: massimo di D lungo ogni tratto orizzontale della stessa classe */
    const Rw = new Float32Array(W * H);
    for (let y = 0; y < H; y++) { let x = 0; while (x < W) { const i = y * W + x, c = cls[i]; if (!c) { x++; continue; } let e = x, mx = 0; while (e < W && cls[y * W + e] === c) { mx = Math.max(mx, D[y * W + e]); e++; } for (let k = x; k < e; k++) Rw[y * W + k] = Math.max(mx, 3); x = e; } }
    const prof = c => { const t = PROF[c === 1 ? 'trunk' : c === 2 ? 'arm' : 'leg']; return t; };
    const Zf = new Float32Array(W * H), Zb = new Float32Array(W * H);
    let zsum = 0, zn = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!mask[i]) continue;
      const zmm = Math.max(0, (Y_SOLE - y) / PX_PER_MM), k = Math.min(PROF.trunk.length - 1, Math.round(zmm / 10));
      const pr = prof(cls[i])[k] || [0, 0];
      const zF = -pr[0] * PX_PER_MM, zB = -pr[1] * PX_PER_MM, zc = (zF + zB) / 2;
      const t = Math.min(1, Math.max(0, (D[i] - 1) / Rw[i])), s = 1 - (1 - t) * (1 - t);
      Zf[i] = zc + (zF - zc) * s; Zb[i] = zc + (zB - zc) * s;
      if (cls[i] === 1) { zsum += zc; zn++; }
    }
    mblur(Zf, mask, 8); mblur(Zb, mask, 8);
    const zoff = zsum / Math.max(1, zn);
    const ix = new Int32Array(W * H).fill(-1), pos = [], uv = [], idx = [];
    for (let y = 0; y < H; y += STEP) for (let x = 0; x < W; x += STEP) { const i = y * W + x; if (mask[i]) { ix[i] = pos.length / 4; pos.push(x, y, Zf[i] - zoff, Zb[i] - zoff); uv.push(x / W, 1 - y / H); } }
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? -1 : ix[y * W + x];
    for (let y = 0; y < H; y += STEP) for (let x = 0; x < W; x += STEP) {
      const a = at(x, y), b = at(x + STEP, y), c = at(x, y + STEP), d = at(x + STEP, y + STEP);
      if (a >= 0 && b >= 0 && c >= 0) idx.push(a, c, b);
      if (b >= 0 && c >= 0 && d >= 0) idx.push(b, c, d);
    }
    geoCache = { pos, uv, idx };
    return geoCache;
  }
  function shell(T, g, front, mat) {
    const n = g.pos.length / 4, p = new Float32Array(n * 3), u = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      p[i * 3] = (g.pos[i * 4] - W / 2) * (front ? 1 : -1) * 0.01;           // il retro è visto da dietro: x speculare
      p[i * 3 + 1] = (H * 0.5 - g.pos[i * 4 + 1]) * 0.01;
      p[i * 3 + 2] = g.pos[i * 4 + (front ? 2 : 3)] * 0.01;
      u[i * 2] = front ? g.uv[i * 2] : 1 - g.uv[i * 2]; u[i * 2 + 1] = g.uv[i * 2 + 1];
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(p, 3)); geo.setAttribute('uv', new T.BufferAttribute(u, 2));
    geo.setIndex(g.idx.slice()); geo.computeVertexNormals();
    return new T.Mesh(geo, mat);
  }

  /* disegno + zone colorate in un'unica immagine (le zone si fondono in moltiplicazione, come nel 2D) */
  function compose(img, view, o, scale) {
    const c = document.createElement('canvas'); c.width = W * scale; c.height = H * scale; const x = c.getContext('2d');
    x.drawImage(img, 0, 0, c.width, c.height);
    const svg = F.bodySVG(view, o).replace(/<image[^>]*\/>/, '').replace('<svg ', `<svg width="${W * scale}" height="${H * scale}" `);
    return new Promise(ok => {
      const im = new Image();
      im.onload = () => { x.globalCompositeOperation = 'multiply'; x.drawImage(im, 0, 0, c.width, c.height); x.globalCompositeOperation = 'source-over'; ok(c); };
      im.onerror = () => ok(c);
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  if (!F.body3DLoad) {
    let ld = null;
    F.body3DLoad = function () {
      if (window.THREE) return Promise.resolve();
      if (!ld) ld = new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'lib/three.min.js'; s.onload = ok; s.onerror = () => { ld = null; ko(new Error('3D non disponibile')); }; document.head.appendChild(s); });
      return ld;
    };
  }
  /* schermata intera con il corpo 3D */
  F.view3D = function (o) {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0b0d12;display:flex;flex-direction:column';
    ov.innerHTML = '<div style="display:flex;gap:8px;padding:10px;align-items:center"><button data-v="f" class="sm">Fronte</button><button data-v="s" class="sm">Lato</button><button data-v="b" class="sm">Retro</button><span style="flex:1"></span><button data-x class="sm">Chiudi</button></div><div data-box style="flex:1;min-height:0;position:relative"><p style="color:#9aa3b2;text-align:center;margin-top:40vh">Carico il corpo 3D…</p></div><p style="color:#9aa3b2;font-size:12px;text-align:center;margin:6px 0 12px">Trascina per ruotare, pizzica o usa la rotella per ingrandire</p>';
    document.body.appendChild(ov);
    let api = null;
    const close = () => { if (api) api.destroy(); ov.remove(); };
    ov.querySelector('[data-x]').onclick = close;
    ov.querySelectorAll('[data-v]').forEach(b => b.onclick = () => api && api.view(b.dataset.v));
    F.bodyRelief(ov.querySelector('[data-box]'), o || {}).then(a => { api = a; }).catch(() => { ov.querySelector('[data-box]').innerHTML = '<p style="color:#f87171;text-align:center;margin-top:40vh">Il 3D non è disponibile adesso (serve la connessione la prima volta).</p>'; });
  };
  F.bodyRelief = function (box, opts) {
    opts = opts || {};
    return Promise.all([F.body3DLoad(), loadImgs()]).then(([_, im]) => {
      const T = THREE;
      const w = box.clientWidth || 320, h = box.clientHeight || 460;
      const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(w, h);
      renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;cursor:grab';
      box.innerHTML = ''; box.appendChild(renderer.domElement);
      const scene = new T.Scene(), cam = new T.PerspectiveCamera(30, w / h, 0.1, 60);
      scene.add(new T.AmbientLight(0xffffff, 0.95));
      const key = new T.DirectionalLight(0xffffff, 0.55); key.position.set(1, 2, 3); scene.add(key);
      const key2 = new T.DirectionalLight(0xffffff, 0.45); key2.position.set(-1, 2, -3); scene.add(key2);
      const g = buildGeo(T, im[0]);
      const texF = new T.CanvasTexture(document.createElement('canvas')), texB = new T.CanvasTexture(document.createElement('canvas'));
      [texF, texB].forEach(t => { t.anisotropy = 4; t.colorSpace = T.SRGBColorSpace; });
      const mF = new T.MeshLambertMaterial({ map: texF }), mB = new T.MeshLambertMaterial({ map: texB });
      const fr = shell(T, g, true, mF), bk = shell(T, g, false, mB);
      const grp = new T.Group(); grp.add(fr, bk); scene.add(grp);
      let yaw = opts.yaw || 0, pitch = 0.05, dist = 15.5, st = {};
      const view = () => { cam.position.set(dist * Math.sin(yaw) * Math.cos(pitch), dist * Math.sin(pitch), dist * Math.cos(yaw) * Math.cos(pitch)); cam.lookAt(0, 0, 0); };
      const draw = () => { view(); renderer.render(scene, cam); };
      const hostSvg = document.createElement('div'); hostSvg.style.cssText = 'position:fixed;left:-9999px;top:0;width:402px;height:768px;pointer-events:none';
      document.body.appendChild(hostSvg);
      let seq = 0;
      const refresh = () => {
        const my = ++seq;
        return Promise.all([compose(im[0], 'f', st, 2), compose(im[1], 'b', st, 2)]).then(([cf, cb]) => {
          if (my !== seq) return;
          texF.image = cf; texF.needsUpdate = true; texB.image = cb; texB.needsUpdate = true; draw();
        });
      };
      /* tocco: zona sotto il dito (stesse forme del 2D) */
      const ray = new T.Raycaster(), ptr = new T.Vector2();
      const zoneAt = (hit) => {
        const front = hit.object === fr; let u = hit.uv.x; if (!front) u = 1 - u;
        const px = u * W, py = (1 - hit.uv.y) * H;
        hostSvg.innerHTML = F.bodySVG(front ? 'f' : 'b', { pain: {} });
        const els = hostSvg.querySelectorAll('[data-zone]'); let found = null;
        els.forEach(gz => { if (found) return; gz.querySelectorAll('path,ellipse').forEach(sh => { if (found) return; const mir = sh.getAttribute('transform'); try { if (sh.isPointInFill(new DOMPoint(mir ? W - px : px, py))) found = gz.getAttribute('data-zone'); } catch (e) { } }); });
        return found;
      };
      let drag = null, moved = 0, raf = 0;
      const el = renderer.domElement, q = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
      el.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; moved = 0; el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; });
      el.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved += Math.abs(dx) + Math.abs(dy); yaw -= dx * 0.011; pitch = Math.max(-0.5, Math.min(0.7, pitch + dy * 0.006)); drag = { x: e.clientX, y: e.clientY }; q(); });
      el.addEventListener('pointerup', e => {
        el.style.cursor = 'grab';
        if (drag && moved < 6 && opts.onZone) {
          const r = el.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
          ray.setFromCamera(ptr, cam); const hs = ray.intersectObjects([fr, bk]);
          if (hs.length) { const z = zoneAt(hs[0]); if (z) opts.onZone(z); }
        }
        drag = null;
      });
      el.addEventListener('wheel', e => { e.preventDefault(); dist = Math.max(6, Math.min(20, dist * (1 + Math.sign(e.deltaY) * 0.08))); q(); }, { passive: false });
      const api = {
        update(o) { st = Object.assign({}, st, o || {}); return refresh(); },
        view(v) { yaw = v === 'b' ? Math.PI : v === 's' ? Math.PI / 2 : 0; draw(); },
        shot() { draw(); return renderer.domElement.toDataURL('image/png'); },
        destroy() { renderer.dispose(); box.innerHTML = ''; hostSvg.remove(); }
      };
      return api.update(opts).then(() => api);
    });
  };
})(window.FORMA);
