/* FORMA – corpo umano SVG stilizzato e muscoloso (fronte/retro), simmetrico. Zone cliccabili per il dolore e muscoli evidenziati per gli esercizi. */
(function (F) {
  const P = d => `<path d="${d}"/>`;
  const MIR = d => `<path d="${d}"/><path d="${d}" transform="translate(200 0) scale(-1 1)"/>`; // lato sinistro + specchio
  const CIR = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}"/><circle cx="${200 - x}" cy="${y}" r="${r}"/>`;

  // addominali a "tartaruga": 3 file + bassa, specchiate
  const SIXPACK = [[88, 108], [88, 122], [88, 136]].map(([x, y]) => MIR(`M${x} ${y} h10 v11 q0 2 -2 2 h-6 q-2 0 -2 -2z`)).join('') + MIR('M89 150 h9 v9 q-3 4 -7 2 q-2 -2 -2 -6z');
  const OBLIQ = MIR('M79 104 L86 106 L86 158 C82 152 78 140 78 122 C78 114 78 108 79 104Z');

  // regioni: z = zona dolore, m = muscoli, sh = SVG
  const FRONT = [
    { z: 'neck', m: [], sh: P('M91 46 L109 46 L112 62 L88 62Z') },
    { z: 'shoulder', m: ['delts'], sh: MIR('M70 62 C57 60 45 67 43 83 C42 92 46 98 53 99 L65 93 C69 83 73 72 70 62Z') },
    { z: 'chest', m: ['chest'], sh: MIR('M72 65 L99 67 L99 101 C88 107 76 103 70 93 C67 82 69 72 72 65Z') },
    { z: 'abdomen', m: ['abs'], sh: SIXPACK + OBLIQ },
    { z: null, m: ['biceps'], sh: MIR('M46 100 C41 110 41 124 45 136 L58 136 C62 126 63 110 65 96Z') },
    { z: 'elbow', m: [], sh: CIR(52, 142, 7) },
    { z: null, m: ['forearm'], sh: MIR('M44 150 L59 150 C59 170 57 188 54 205 L45 205 C42 188 42 168 44 150Z') },
    { z: 'wrist', m: [], sh: CIR(50, 211, 6) },
    { z: 'hip', m: ['glutes', 'adductors'], sh: MIR('M76 164 L99 162 L99 187 C88 193 78 187 74 177Z') },
    { z: 'quad', m: ['quads'], sh: MIR('M74 190 C67 216 69 252 77 281 L96 281 C102 252 102 216 98 190Z') },
    { z: 'knee', m: [], sh: CIR(86, 291, 8) },
    { z: 'calf', m: ['calves'], sh: MIR('M78 301 C73 322 76 350 83 376 L92 376 C98 350 98 322 94 301Z') },
    { z: 'ankle', m: [], sh: CIR(87, 384, 6) }
  ];
  const BACK = [
    { z: 'neck', m: [], sh: P('M91 46 L109 46 L112 62 L88 62Z') },
    { z: 'shoulder', m: ['delts'], sh: MIR('M70 62 C57 60 45 67 43 83 C42 92 46 98 53 99 L65 93 C69 83 73 72 70 62Z') },
    { z: 'upper_back', m: ['lats', 'upback'], sh: MIR('M72 62 L99 58 L99 114 C86 114 75 105 70 92 C67 80 69 69 72 62Z') },
    { z: 'lower_back', m: ['lowback'], sh: MIR('M80 116 L99 116 L99 157 C90 159 82 153 80 141Z') },
    { z: null, m: ['triceps'], sh: MIR('M46 100 C41 110 41 124 45 136 L58 136 C62 126 63 110 65 96Z') },
    { z: 'elbow', m: [], sh: CIR(52, 142, 7) },
    { z: null, m: ['forearm'], sh: MIR('M44 150 L59 150 C59 170 57 188 54 205 L45 205 C42 188 42 168 44 150Z') },
    { z: 'wrist', m: [], sh: CIR(50, 211, 6) },
    { z: 'hip', m: ['glutes'], sh: MIR('M76 160 L99 160 L99 192 C86 199 76 191 74 177Z') },
    { z: 'hamstring', m: ['hams'], sh: MIR('M74 193 C68 218 70 252 77 281 L96 281 C102 252 102 218 98 193Z') },
    { z: 'knee', m: [], sh: CIR(86, 291, 8) },
    { z: 'calf', m: ['calves'], sh: MIR('M78 301 C69 322 76 348 83 376 L91 376 C99 348 103 322 94 301Z') },
    { z: 'ankle', m: [], sh: CIR(87, 384, 6) }
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
    const regs = view === 'b' ? BACK : FRONT;
    // sagoma di base (pelle) sotto ai muscoli
    const base = `<ellipse cx="100" cy="26" rx="15" ry="19"/>` +
      P('M70 60 L130 60 L128 104 L124 164 L127 192 L73 192 L76 164 L72 104Z') +
      MIR('M42 84 L64 90 L62 140 L58 150 L56 206 L44 206 L43 150 L40 138Z') +
      MIR('M49 205 q-7 8 -3 20 q4 6 8 0 q3 -10 1 -20z') +
      MIR('M74 190 L99 190 L99 282 L77 282Z') + MIR('M77 300 L96 300 L92 378 L83 378Z') +
      MIR('M76 394 q-2 10 8 10 q10 0 8 -10z');
    let out = `<svg class="body" viewBox="0 0 200 414" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${view === 'b' ? 'Retro' : 'Fronte'} del corpo">`;
    out += `<g fill="var(--body-skin)" stroke="var(--body-line)" stroke-width="1">${base}</g>`;
    for (const r of regs) {
      let fill = 'var(--body-fill)', op = 1;
      if (opts.pain) {
        const col = r.z ? painColor(opts.pain[r.z] || 0) : null;
        if (col) { fill = col; op = 0.95; }
      }
      if (opts.prim || opts.sec) {
        if (r.m.some(m => (opts.prim || []).includes(m))) { fill = 'var(--accent)'; op = 1; }
        else if (r.m.some(m => (opts.sec || []).includes(m))) { fill = 'var(--accent)'; op = 0.4; }
      }
      const attr = r.z ? ` data-zone="${r.z}"` : '';
      const sel = r.z && opts.sel === r.z ? ' sel' : '';
      out += `<g class="reg${r.z && opts.pain ? ' hit' : ''}${sel}"${attr} fill="${fill}" fill-opacity="${op}" stroke="var(--body-line)" stroke-width="0.9" stroke-linejoin="round">${r.sh}</g>`;
    }
    return out + '</svg>';
  };
})(window.FORMA);
