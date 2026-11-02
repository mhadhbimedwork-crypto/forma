/* FORMA – corpo umano SVG stilizzato e muscoloso (fronte/retro), simmetrico. Zone cliccabili per il dolore e muscoli evidenziati per gli esercizi. */
(function (F) {
  const P = d => `<path d="${d}"/>`;
  const MIR = d => `<path d="${d}"/><path d="${d}" transform="translate(200 0) scale(-1 1)"/>`; // lato sinistro + specchio
  const CIR = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}"/><circle cx="${200 - x}" cy="${y}" r="${r}"/>`;

  // ---- anatomia dettagliata (metà sinistra specchiata). Gruppi muscolari separati: ogni regione ha una zona dolore (z) e i muscoli (m). f = fibre ----
  const L = (d) => `<path d="${d}"/>`;
  const FIB = d => `<path d="${d}" fill="none" stroke="#000" stroke-opacity=".30" stroke-width=".5" stroke-linecap="round"/>`;
  const MF = d => FIB(d) + `<path d="${d}" transform="translate(200 0) scale(-1 1)" fill="none" stroke="#000" stroke-opacity=".30" stroke-width=".5" stroke-linecap="round"/>`;
  const ABS = [[89, 108], [89, 122], [89, 136], [90, 150]].map(([x, y], k) => MIR(`M${x} ${y} h9.5 v${k === 3 ? 9 : 11} q0 2 -2 2 h-5.5 q-2 0 -2 -2z`)).join('');
  const OBL = MIR('M79 104 L87 106 L87 160 C83 154 78 142 78 124 C78 114 78 108 79 104Z');
  const SERR = [0, 1, 2].map(k => MIR(`M${72 + k * 1.5} ${90 + k * 6} l7 ${1 + k} l-1 5 l-6 -${1} z`)).join('');

  const FRONT = [
    { z: 'neck', m: [], sh: MIR('M92 46 L99 46 L99 66 C94 64 90 60 88 56Z') },
    { z: 'neck', m: ['upback'], sh: MIR('M91 57 C86 61 78 64 71 63 L73 68 C82 67 91 64 96 60Z') },
    { z: 'shoulder', m: ['delts'], sh: MIR('M70 63 C63 61 56 64 52 71 L60 86 C64 78 68 70 70 63Z'), f: MF('M68 66 C64 72 62 78 60 84 M65 65 C60 70 58 74 56 78') },
    { z: 'shoulder', m: ['delts'], sh: MIR('M52 71 C47 78 44 88 46 98 L55 99 C57 93 58 88 60 86Z'), f: MF('M52 76 C50 84 50 90 51 96') },
    { z: 'chest', m: ['chest'], sh: MIR('M98 67 L72 66 C69 72 69 80 73 86 L99 82Z'), f: MF('M96 70 C88 70 80 71 74 72 M96 75 C88 76 80 78 74 80') },
    { z: 'chest', m: ['chest'], sh: MIR('M99 84 L73 87 C73 96 82 106 99 105Z'), f: MF('M96 88 C88 90 80 92 75 92 M96 94 C90 97 84 99 78 98') },
    { z: 'abdomen', m: ['abs'], sh: SERR },
    { z: 'abdomen', m: ['abs'], sh: ABS },
    { z: 'abdomen', m: ['abs'], sh: OBL, f: MF('M80 110 L85 112 M79 120 L85 122 M79 130 L85 132 M80 140 L85 142') },
    { z: null, m: ['biceps'], sh: MIR('M60 97 C54 106 52 120 54 135 L61 135 C63 122 64 108 64 97Z'), f: MF('M58 102 C56 112 56 124 57 132') },
    { z: null, m: ['biceps'], sh: MIR('M64 97 C64 108 63 122 61 135 L67 131 C69 120 69 106 66 96Z'), f: MF('M65 102 C65 112 64 122 63 130') },
    { z: 'elbow', m: [], sh: CIR(55, 142, 6.5) },
    { z: null, m: ['forearm'], sh: MIR('M44 149 L52 149 C52 168 50 188 48 206 L45 206 C42 188 41 168 44 149Z'), f: MF('M47 156 C47 170 46 186 46 200') },
    { z: null, m: ['forearm'], sh: MIR('M52 149 L60 150 C60 168 58 188 55 206 L48 206 C50 188 52 168 52 149Z'), f: MF('M55 156 C55 170 53 186 51 200') },
    { z: 'wrist', m: [], sh: CIR(50, 211, 5.5) },
    { z: 'hip', m: [], sh: MIR('M99 160 L81 163 C75 170 74 180 78 190 L99 196Z'), f: MF('M96 168 C90 172 84 178 80 186') },
    { z: 'hip', m: ['adductors'], sh: MIR('M99 168 L88 172 C84 180 86 190 91 196 L99 194Z') },
    { z: 'quad', m: ['quads'], sh: MIR('M74 192 C67 218 68 250 76 277 L84 279 C85 250 84 220 82 193Z'), f: MF('M76 200 C73 220 73 244 78 268 M79 198 C77 220 77 244 80 272') },
    { z: 'quad', m: ['quads'], sh: MIR('M82 193 C84 220 85 250 84 279 L92 279 C93 250 93 222 90 192Z'), f: MF('M86 200 C87 222 88 248 88 272') },
    { z: 'quad', m: ['quads'], sh: MIR('M90 224 C95 238 98 256 96 276 L91 280 C90 262 88 242 90 224Z') },
    { z: 'quad', m: ['adductors'], sh: MIR('M90 193 L99 190 L99 238 C95 236 91 216 90 193Z') },
    { z: 'knee', m: [], sh: CIR(86, 291, 8) },
    { z: 'calf', m: ['calves'], sh: MIR('M79 301 C75 324 77 348 82 372 L87 372 C88 346 88 322 88 301Z'), f: MF('M82 306 C80 326 81 348 84 366') },
    { z: 'calf', m: ['calves'], sh: MIR('M88 301 C95 312 97 330 93 352 L88 372 C89 346 89 322 88 301Z') },
    { z: 'ankle', m: [], sh: CIR(87, 384, 5.5) }
  ];
  const BACK = [
    { z: 'neck', m: [], sh: MIR('M92 46 L99 46 L99 60 C94 58 90 55 88 52Z') },
    { z: 'upper_back', m: ['upback'], sh: MIR('M99 54 C92 58 82 62 71 63 C73 74 82 88 99 104Z'), f: MF('M97 60 C90 66 82 72 75 68 M97 70 C90 76 82 80 76 76 M97 82 C91 88 85 92 80 90') },
    { z: 'shoulder', m: ['delts'], sh: MIR('M70 63 C63 61 56 64 52 71 L60 86 C64 78 68 70 70 63Z'), f: MF('M68 66 C64 72 62 78 60 84') },
    { z: 'shoulder', m: ['delts'], sh: MIR('M52 71 C47 78 44 88 46 98 L55 99 C57 93 58 88 60 86Z'), f: MF('M52 76 C50 84 50 90 51 96') },
    { z: 'upper_back', m: ['upback'], sh: MIR('M72 74 C80 78 88 84 94 88 L92 98 C84 96 76 92 70 84Z') },
    { z: 'upper_back', m: ['lats'], sh: MIR('M71 88 C77 96 89 104 99 108 L99 134 C90 136 80 128 74 112 C70 102 69 94 71 88Z'), f: MF('M96 112 C88 108 80 102 75 96 M96 120 C88 118 80 112 76 106') },
    { z: 'lower_back', m: ['lowback'], sh: MIR('M91 112 L99 112 L99 162 C94 162 90 154 89 142Z'), f: MF('M95 118 L95 156 M92 124 C91 136 92 146 94 154') },
    { z: null, m: ['triceps'], sh: MIR('M60 96 C54 106 52 120 54 136 L61 137 C64 122 65 108 65 94Z'), f: MF('M58 102 C56 112 56 124 58 132') },
    { z: null, m: ['triceps'], sh: MIR('M52 99 C48 108 47 124 50 134 L54 137 C52 122 54 108 58 97Z'), f: MF('M52 106 C50 114 50 124 52 132') },
    { z: 'elbow', m: [], sh: CIR(55, 142, 6.5) },
    { z: null, m: ['forearm'], sh: MIR('M44 149 L60 150 C60 168 58 188 55 206 L45 206 C42 188 41 168 44 149Z'), f: MF('M48 156 C48 172 47 188 47 200 M54 156 C54 172 52 188 51 200') },
    { z: 'wrist', m: [], sh: CIR(50, 211, 5.5) },
    { z: 'hip', m: ['glutes'], sh: MIR('M99 156 C88 154 78 156 74 164 C76 168 86 170 99 168Z') },
    { z: 'hip', m: ['glutes'], sh: MIR('M99 169 C86 169 76 170 74 178 C74 190 82 199 99 198Z'), f: MF('M97 176 C90 178 82 180 78 186 M97 186 C90 190 84 194 80 192') },
    { z: 'hamstring', m: ['hams'], sh: MIR('M74 200 C68 224 70 254 77 281 L86 283 C86 254 85 226 84 200Z'), f: MF('M78 208 C74 230 75 254 79 274') },
    { z: 'hamstring', m: ['hams'], sh: MIR('M84 200 C85 226 86 254 86 283 L96 283 C101 255 101 224 98 200Z'), f: MF('M89 208 C90 230 91 254 91 276') },
    { z: 'knee', m: [], sh: CIR(86, 291, 8) },
    { z: 'calf', m: ['calves'], sh: MIR('M79 302 C70 322 75 346 82 364 L87 364 C86 340 87 318 88 302Z'), f: MF('M81 308 C76 326 78 346 83 360') },
    { z: 'calf', m: ['calves'], sh: MIR('M88 302 C98 318 102 340 93 364 L87 364 C88 340 88 318 88 302Z') },
    { z: 'calf', m: ['calves'], sh: MIR('M81 352 C80 366 82 374 85 379 L89 379 C92 372 94 362 93 350Z') },
    { z: 'ankle', m: [], sh: CIR(87, 384, 5.5) }
  ];
  const painColor = p => p >= 7 ? '#ef4444' : p >= 4 ? '#f97316' : p >= 1 ? '#facc15' : null;

  /**
   * bodySVG(view, opts)
   *  opts.pain: {zona: 0-10}  (modalità dolore, cliccabile)
   *  opts.prim / opts.sec: array di muscoli (modalità esercizio)
   *  opts.sel: zona selezionata
   */
  F.bodySVG = function (view, opts) {
    opts = opts || {};
    const back = view === 'b', regs = back ? BACK : FRONT;
    // sagoma di base: testa, collo, tronco, braccia, mani, gambe, piedi
    const head = P('M100 7 C89 7 84 16 85 27 C86 36 90 43 95 46 L105 46 C110 43 114 36 115 27 C116 16 111 7 100 7Z') +
      `<ellipse cx="84.5" cy="28" rx="2.2" ry="4.2"/><ellipse cx="115.5" cy="28" rx="2.2" ry="4.2"/>`;
    const hair = back
      ? `<path d="M85 28 C83 12 91 6 100 6 C109 6 117 12 115 28 C113 36 108 40 100 41 C92 40 87 36 85 28Z" fill="#17181c" stroke="none"/>`
      : `<path d="M85 25 C84 12 92 6 100 6 C108 6 116 12 115 25 C112 18 108 13 100 13 C92 13 88 18 85 25Z" fill="#17181c" stroke="none"/>` +
        `<path d="M91 24 q4 -2 7 0 M102 24 q4 -2 7 0" fill="none" stroke="#0b0c10" stroke-width="1.1"/><path d="M92 28 q3 1.4 6 0 M102 28 q3 1.4 6 0" fill="none" stroke="#0b0c10" stroke-width=".8"/><path d="M100 28 L99 35 L102 36" fill="none" stroke="#000" stroke-opacity=".45" stroke-width=".7"/><path d="M94 40 q6 2.4 12 0" fill="none" stroke="#000" stroke-opacity=".55" stroke-width=".9"/>`;
    const torso = P('M91 44 L109 44 L112 62 C120 62 130 62 133 70 C134 90 130 110 128 130 C127 150 125 160 124 168 L130 192 L70 192 L76 168 C75 160 73 150 72 130 C70 110 66 90 67 70 C70 62 80 62 88 62Z');
    const arms = MIR('M52 62 C45 68 43 82 44 98 C45 114 49 128 50 142 C48 160 44 184 43 206 L58 206 C60 186 62 160 62 142 C64 126 68 110 69 96 L70 66Z');
    const hands = MIR('M43 206 C38 214 37 224 42 231 C47 235 54 234 57 228 C59 220 58 212 57 206Z') + (back ? '' : MIR('M43 224 q4 3 9 1 M42 219 q5 3 11 0'));
    const legs = MIR('M70 190 C66 220 68 256 76 282 L78 300 C76 330 78 356 82 380 L93 380 C97 356 98 330 96 300 L98 282 C100 256 100 220 99 190Z');
    const feet = MIR('M80 380 C75 392 73 402 77 407 C84 410 94 408 96 402 L94 380Z');
    const defs = `<defs><linearGradient id="bv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset=".45" stop-color="#fff" stop-opacity=".02"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>` +
      `<filter id="bsh" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx=".5" dy=".7" stdDeviation=".55" flood-color="#000" flood-opacity=".65"/></filter><linearGradient id="bs" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1c2531"/><stop offset=".5" stop-color="#2b3747"/><stop offset="1" stop-color="#1c2531"/></linearGradient></defs>`;
    let out = `<svg class="body" viewBox="0 0 200 414" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${back ? 'Retro' : 'Fronte'} del corpo">${defs}`;
    out += `<g fill="url(#bs)" stroke="var(--body-line)" stroke-width="1" stroke-linejoin="round">${legs}${feet}${torso}${arms}${hands}${head}</g>${hair}`;
    for (const r of regs) {
      let fill = 'var(--body-fill)', op = 1;
      if (opts.pain) {
        const col = r.z ? painColor(opts.pain[r.z] || 0) : null;
        if (col) { fill = col; op = 0.95; }
      }
      if (opts.rec) {
        const ms = r.m.filter(m => opts.rec[m]);
        if (ms.length) { const pc = Math.min.apply(null, ms.map(m => opts.rec[m].pct)); fill = F.recColor(pc); op = 0.95; }
      }
      if (opts.prim || opts.sec) {
        if (r.m.some(m => (opts.prim || []).includes(m))) { fill = 'var(--accent)'; op = 1; }
        else if (r.m.some(m => (opts.sec || []).includes(m))) { fill = 'var(--accent)'; op = 0.45; }
      }
      const attr = opts.rec ? '' : (r.z ? ` data-zone="${r.z}"` : '');
      const sel = r.z && opts.sel === r.z ? ' sel' : '';
      out += `<g class="reg${r.z && opts.pain && !opts.rec ? ' hit' : ''}${sel}"${attr}><g fill="${fill}" fill-opacity="${op}" stroke="var(--body-line)" stroke-width="0.8" stroke-linejoin="round"${opts.rec || opts.pain ? ' filter="url(#bsh)"' : ''}>${r.sh}</g>` +
        `<g fill="url(#bv)" stroke="none" pointer-events="none">${r.sh}</g>${r.f || ''}</g>`;
    }
    return out + '</svg>';
  };
})(window.FORMA);
