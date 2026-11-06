/* FORMA – corpo umano SVG stilizzato e muscoloso (fronte/retro), simmetrico. Zone cliccabili per il dolore e muscoli evidenziati per gli esercizi. */
(function (F) {
  /* Corpo anatomico (immagine illustrata) con zone muscolari sovrapposte. Coordinate 402 x 768; le zone sono disegnate per il lato sinistro e specchiate (asse x = 201). */
  const MIR = d => `<path d="${d}"/><path d="${d}" transform="translate(402 0) scale(-1 1)"/>`;
  const EL = (x, y, rx, ry) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/><ellipse cx="${402 - x}" cy="${y}" rx="${rx}" ry="${ry}"/>`;
  const FRONT = [
    { z: 'neck', m: [], sh: MIR('M200 110 L170 118 C172 135 178 150 190 168 L200 172Z') },
    { z: 'neck', m: ['upback'], sh: MIR('M178 138 C165 148 140 156 118 163 L125 170 C145 166 168 158 184 150Z') },
    { z: 'shoulder', m: ['delts'], sh: MIR('M132 157 C112 162 96 174 90 194 L92 208 C100 214 112 214 124 208 L128 190 C128 176 130 166 132 157Z') },
    { z: 'chest', m: ['chest'], sh: MIR('M199 170 L135 164 C124 176 123 194 126 206 L199 210Z') },
    { z: 'chest', m: ['chest'], sh: MIR('M199 210 L126 206 C130 220 150 236 166 242 C176 246 188 247 199 248Z') },
    { z: 'abdomen', m: ['abs'], sh: MIR('M148 244 L168 250 L170 308 C160 304 152 284 146 262Z') },
    { z: 'abdomen', m: ['abs'], sh: MIR('M168 242 L198 242 L198 264 L168 266Z M167 270 L198 268 L198 292 L167 294Z M168 298 L198 296 L198 318 L170 322Z M171 326 L198 322 L198 348 L174 350Z M174 354 L198 350 L198 382 C190 374 180 364 174 354Z') },
    { z: null, m: ['biceps'], sh: MIR('M128 214 C112 222 104 246 104 270 L106 296 L128 298 C134 280 140 250 140 226Z') },
    { z: 'elbow', m: [], sh: EL(112, 298, 14, 9) },
    { z: null, m: ['forearm'], sh: MIR('M126 306 L100 304 C88 322 74 346 62 372 L82 376 C100 352 116 330 126 306Z') },
    { z: 'wrist', m: [], sh: EL(70, 380, 18, 9) },
    { z: 'hip', m: [], sh: MIR('M199 384 L172 354 C160 358 150 368 144 382 L176 402 L199 410Z') },
    { z: 'hip', m: ['adductors'], sh: MIR('M198 410 L176 402 C170 440 176 490 184 530 L196 500Z') },
    { z: 'quad', m: ['quads'], sh: MIR('M148 392 C134 400 122 420 120 460 C120 495 128 520 140 540 L152 540 C150 490 152 440 156 394Z') },
    { z: 'quad', m: ['quads'], sh: MIR('M156 394 C152 440 150 490 152 540 L166 536 C170 490 168 440 170 400Z') },
    { z: 'quad', m: ['quads'], sh: MIR('M170 400 C168 440 170 490 168 536 C176 530 182 514 184 500 C180 470 176 430 176 404Z') },
    { z: 'knee', m: [], sh: EL(150, 554, 20, 18) },
    { z: 'calf', m: ['calves'], sh: MIR('M138 580 C130 600 130 640 140 690 L150 692 C152 640 150 600 152 580Z') },
    { z: 'calf', m: ['calves'], sh: MIR('M154 580 C165 590 172 614 172 640 L162 650 C158 625 154 600 154 580Z') },
    { z: 'ankle', m: [], sh: EL(150, 702, 18, 10) }
  ];
  const BACK = [
    { z: 'neck', m: [], sh: MIR('M200 70 L172 78 C170 96 176 112 198 118Z') },
    { z: 'upper_back', m: ['upback'], sh: MIR('M198 112 L168 134 L135 154 L158 172 C170 200 182 250 196 296 L198 296Z') },
    { z: 'shoulder', m: ['delts'], sh: MIR('M132 157 C112 162 96 174 90 194 L92 208 C102 212 118 210 126 200 C128 184 128 168 132 157Z') },
    { z: 'upper_back', m: ['upback'], sh: MIR('M135 172 C150 177 165 184 168 210 L160 232 L128 230 C124 210 126 186 135 172Z') },
    { z: 'upper_back', m: ['lats'], sh: MIR('M126 234 L162 236 L197 296 L197 322 C176 324 156 322 146 314 C136 296 128 262 126 234Z') },
    { z: 'lower_back', m: ['lowback'], sh: MIR('M198 290 C184 292 172 300 170 316 C174 330 186 342 198 350Z') },
    { z: null, m: ['triceps'], sh: MIR('M128 212 C112 222 108 248 108 280 L112 296 L128 298 C134 270 136 240 134 220Z') },
    { z: null, m: ['triceps'], sh: MIR('M104 214 C94 224 94 252 98 284 L108 296 C106 262 106 236 112 220Z') },
    { z: 'elbow', m: [], sh: EL(112, 300, 14, 9) },
    { z: null, m: ['forearm'], sh: MIR('M126 308 L100 306 C88 324 74 348 62 374 L82 378 C100 354 116 332 126 308Z') },
    { z: 'wrist', m: [], sh: EL(70, 382, 18, 9) },
    { z: 'hip', m: ['glutes'], sh: MIR('M199 352 C180 346 160 350 148 366 C140 384 150 424 170 434 C184 438 196 434 199 428Z') },
    { z: 'hamstring', m: ['hams'], sh: MIR('M128 440 C122 470 124 510 134 548 L150 550 C150 510 150 470 152 440Z') },
    { z: 'hamstring', m: ['hams'], sh: MIR('M152 440 C150 470 150 510 150 550 L172 548 C182 510 188 470 186 436Z') },
    { z: 'knee', m: [], sh: EL(152, 556, 16, 12) },
    { z: 'calf', m: ['calves'], sh: MIR('M128 574 C122 592 122 620 136 640 L150 640 C150 614 150 590 148 574Z') },
    { z: 'calf', m: ['calves'], sh: MIR('M150 574 C168 584 178 604 172 632 L160 642 L150 640Z') },
    { z: 'calf', m: ['calves'], sh: MIR('M136 640 C140 660 144 676 148 690 L158 690 C164 668 168 654 164 640Z') },
    { z: 'ankle', m: [], sh: EL(152, 716, 18, 10) }
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
    let out = `<svg class="body" viewBox="0 0 402 768" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${back ? 'Retro' : 'Fronte'} del corpo"><image href="img/body-${back ? 'back' : 'front'}.jpg" x="0" y="0" width="402" height="768"/>`;
    for (const r of regs) {
      let fill = null, op = 0;
      if (opts.pain) { const col = r.z ? painColor(opts.pain[r.z] || 0) : null; if (col) { fill = col; op = 0.92; } }
      if (opts.rec) { const ms = r.m.filter(m => opts.rec[m]); if (ms.length) { const pc = Math.min.apply(null, ms.map(m => opts.rec[m].pct)); fill = F.recColor(pc); op = 0.88; } }
      if (opts.prim || opts.sec) {
        if (r.m.some(m => (opts.prim || []).includes(m))) { fill = '#ff4234'; op = 0.95; }
        else if (r.m.some(m => (opts.sec || []).includes(m))) { fill = '#ff8a1f'; op = 0.7; }
      }
      const hit = r.z && opts.pain && !opts.rec;
      const attr = hit ? ` data-zone="${r.z}"` : '';
      const sel = r.z && opts.sel === r.z ? ' sel' : '';
      const sm = opts.sideMap && r.z && opts.sideMap[r.z], parts = sm && r.sh.match(/<(?:path|ellipse)[^>]*\/>/g);
      if (sm && parts && parts.length === 2) {   // dolore per lato: colora solo il lato interessato
        [sm.sl, sm.sr].forEach((lv, i) => {
          const c2 = painColor(lv);
          out += `<g class="reg hit${sel}" data-zone="${r.z}" fill="${c2 || '#000'}" fill-opacity="${c2 ? 0.92 : 0.01}" stroke="${sel ? '#fff' : 'none'}" stroke-width="2"${c2 ? ' style="mix-blend-mode:multiply"' : ''}>${parts[i]}</g>`;
        });
        continue;
      }
      out += `<g class="reg${hit ? ' hit' : ''}${sel}"${attr} fill="${fill || '#000'}" fill-opacity="${fill ? op : (hit ? 0.01 : 0)}" stroke="${hit && sel ? '#fff' : 'none'}" stroke-width="2"${fill ? ' style="mix-blend-mode:multiply"' : ''}>${r.sh}</g>`;
    }
    return out + (opts.extra || '') + '</svg>';
  };
})(window.FORMA);
