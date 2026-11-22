/* Lingue: riconosce la lingua del dispositivo, la fa confermare o cambiare, e traduce l'interfaccia.
   L'app resta scritta in italiano: i dizionari (i18n-xx.js) associano ogni frase italiana alla sua traduzione.
   Frasi non presenti nel dizionario restano in italiano. Lingua scelta in localStorage «forgia.lang». */
(function () {
  const SUP = { it: ['Italiano', 'it-IT'], en: ['English', 'en-GB'], fr: ['Français', 'fr-FR'], de: ['Deutsch', 'de-DE'], es: ['Español', 'es-ES'] };
  const KL = 'forgia.lang', KC = 'forgia.lang.ok';
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } };
  const detect = () => { const l = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || 'it']; for (const x of l) { const c = String(x).slice(0, 2).toLowerCase(); if (SUP[c]) return c; } return 'en'; };
  let lang = get(KL), fresh = false;
  if (!lang || !SUP[lang]) {
    let used = false; try { used = Object.keys(localStorage).some(k => /^(forma|tlz|forgia)\./.test(k) && k !== KL && k !== KC); } catch (e) { }
    lang = used ? 'it' : detect();   // chi usa già l'app resta in italiano finché non sceglie lui
    fresh = !used && lang !== 'it';
    put(KL, lang);
  }
  const I = window.I18N = { lang, sup: SUP, locale: SUP[lang][1] };
  window.LOC = I.locale;
  try { document.documentElement.lang = lang; } catch (e) { }

  /* dizionario della lingua scelta (caricato prima dell'app) */
  if (lang !== 'it') { try { const cs = document.currentScript, q = cs && cs.src.indexOf('?') > -1 ? cs.src.slice(cs.src.indexOf('?')) : ''; document.write('<script src="i18n-' + lang + '.js' + q + '"><\/script>'); } catch (e) { } }

  let D = null, RE = null, tried = false;
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function prep() {
    D = window.I18N_DICT || null; if (!D) return; tried = true;
    const ks = Object.keys(D).filter(k => k.length > 1).sort((a, b) => b.length - a.length);
    const L = /[\p{L}\p{N}]/u;
    const parts = ks.map(k => (L.test(k[0]) ? '(?<![\\p{L}\\p{N}])' : '') + esc(k) + (L.test(k[k.length - 1]) ? '(?![\\p{L}\\p{N}])' : ''));
    try { RE = new RegExp(parts.join('|'), 'gu'); } catch (e) { RE = null; }
  }
  function tr(s) {
    if (lang === 'it' || typeof s !== 'string') return s;
    if (!tried) prep(); if (!D) return s;
    const t = s.trim(); if (!t) return s;
    let o = D[t];
    if (o === undefined) {
      const nums = [], k = t.replace(/\d+(?:[.,]\d+)?/g, m => { nums.push(m); return '#'; });
      if (nums.length && D[k] !== undefined) { let i = 0; o = D[k].replace(/#/g, () => nums[i++] !== undefined ? nums[i - 1] : '#'); }
    }
    if (o === undefined && RE) { const r = t.replace(RE, m => D[m] !== undefined ? D[m] : m); if (r !== t) o = r; }
    if (o === undefined) return s;
    const a = s.indexOf(t); return s.slice(0, a) + o + s.slice(a + t.length);
  }
  I.t = tr;

  const SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, CODE: 1, NOSCRIPT: 1 }, ATTR = ['placeholder', 'title', 'aria-label', 'alt'];
  const done = new WeakMap();
  function node(n) {
    if (n.nodeType === 3) {
      const p = n.parentNode; if (!p || SKIP[p.nodeName] || (p.closest && p.closest('[data-notr]'))) return;
      if (done.get(n) === n.data) return;
      const v = tr(n.data); if (v !== n.data) n.data = v; done.set(n, n.data);
    } else if (n.nodeType === 1) {
      if (SKIP[n.nodeName] || n.hasAttribute('data-notr')) return;
      for (const a of ATTR) { const x = n.getAttribute(a); if (x) { const v = tr(x); if (v !== x) n.setAttribute(a, v); } }
      for (let c = n.firstChild; c; c = c.nextSibling) node(c);
    }
  }
  let q = false;
  function run() { q = false; if (document.body) { node(document.body); if (lang !== 'it') { const t = tr(document.title); if (t !== document.title) document.title = t; } } }
  if (lang !== 'it') {
    for (const f of ['confirm', 'alert']) { const o = window[f]; if (o) window[f] = function (m) { return o.call(window, tr(String(m))); }; }
    const start = () => { run(); new MutationObserver(ms => {
      for (const m of ms) {
        if (m.type === 'characterData') node(m.target);
        else if (m.type === 'attributes') { const v = tr(m.target.getAttribute(m.attributeName) || ''); if (v && v !== m.target.getAttribute(m.attributeName)) m.target.setAttribute(m.attributeName, v); }
        else m.addedNodes.forEach(node);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR }); };
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  }

  /* scelta della lingua: riquadro in Profilo + conferma al primo avvio */
  const TXT = {
    it: ['Lingua rilevata', 'Conferma', 'Cambia'], en: ['Language detected', 'Confirm', 'Change'], fr: ['Langue détectée', 'Confirmer', 'Changer'],
    de: ['Sprache erkannt', 'Bestätigen', 'Ändern'], es: ['Idioma detectado', 'Confirmar', 'Cambiar']
  };
  const opts = () => Object.keys(SUP).map(c => '<option value="' + c + '"' + (c === lang ? ' selected' : '') + '>' + SUP[c][0] + '</option>').join('');
  I.card = () => '<div class="card" data-notr><h2>🌐 Lingua · Language</h2><select id="langSel" aria-label="Language">' + opts() + '</select><p class="mute small">Italiano · English · Français · Deutsch · Español</p></div>';
  const setLang = c => { if (!SUP[c]) return; put(KL, c); put(KC, '1'); location.reload(); };
  document.addEventListener('change', e => { if (e.target && e.target.id === 'langSel') setLang(e.target.value); });
  if (fresh && get(KC) !== '1') {
    const bar = () => {
      const t = TXT[lang], d = document.createElement('div'); d.id = 'langBar'; d.setAttribute('data-notr', '');
      d.style.cssText = 'position:fixed;left:10px;right:10px;bottom:calc(env(safe-area-inset-bottom) + 76px);z-index:60;background:#10151d;border:1px solid #ff4234;border-radius:14px;padding:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;color:#eef2f7;font:600 .9rem Inter,system-ui,sans-serif;box-shadow:0 8px 30px #000a';
      d.innerHTML = '<span style="flex:1 1 100%">🌐 ' + t[0] + ': <b>' + SUP[lang][0] + '</b></span><select id="langSel2" aria-label="Language" style="flex:1 1 120px">' + opts() + '</select><button class="sm primary" id="langOk">' + t[1] + '</button>';
      document.body.appendChild(d);
      d.querySelector('#langOk').onclick = () => { put(KC, '1'); d.remove(); };
      d.querySelector('#langSel2').onchange = e => setLang(e.target.value);
    };
    if (document.body) bar(); else document.addEventListener('DOMContentLoaded', bar);
  }
})();
