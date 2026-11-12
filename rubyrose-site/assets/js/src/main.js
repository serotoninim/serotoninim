/* Ruby Rose France — behaviour layer (vanilla). Visual effects live in fx.js */
(() => {
  'use strict';
  const d = document, root = d.documentElement, W = window;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => Array.from(c.querySelectorAll(s));
  const RM = W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = W.matchMedia('(pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const emit = (n, detail) => d.dispatchEvent(new CustomEvent(n, { detail }));
  root.classList.add('js');

  /* ---------- i18n ---------- */
  let DICT = {};
  try { DICT = JSON.parse(($('#i18n') || {}).textContent || '{}'); } catch (e) { DICT = {}; }
  const FR = {};
  $$('[data-i18n]').forEach(el => { FR[el.dataset.i18n] = el.tagName === 'TITLE' ? el.textContent : el.innerHTML.trim(); });
  const attrPairs = el => el.dataset.i18nAttr.split(';').map(p => p.split(':'));
  $$('[data-i18n-attr]').forEach(el => attrPairs(el).forEach(([a, k]) => { FR[k] = el.getAttribute(a); }));
  DICT.fr = Object.assign({}, DICT.fr || {}, FR);
  const LANGS = ['fr', 'en', 'pt'];
  let lang = 'fr';
  const t = k => (DICT[lang] && DICT[lang][k] != null ? DICT[lang][k] : (DICT.fr[k] != null ? DICT.fr[k] : k));
  const store = { get() { try { return localStorage.getItem('rr-lang'); } catch (e) { return null; } },
                  set(v) { try { localStorage.setItem('rr-lang', v); } catch (e) { /* storage unavailable */ } } };
  W.RR = { t, RM, FINE, lang: () => lang };

  function applyLang(l, persist) {
    lang = LANGS.includes(l) ? l : 'fr';
    root.lang = lang;
    $$('[data-i18n]').forEach(el => {
      const v = t(el.dataset.i18n);
      if (el.tagName === 'TITLE') el.textContent = v; else el.innerHTML = v;
    });
    $$('[data-i18n-attr]').forEach(el => attrPairs(el).forEach(([a, k]) => el.setAttribute(a, t(k))));
    $$('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    if (persist) store.set(lang);
    splitAll(true);
    formatCounters();
    if (shade) shade.relabel();
    syncBurger();
    emit('rr:lang', lang);
  }
  d.addEventListener('click', e => {
    const b = e.target.closest('[data-lang]');
    if (b) applyLang(b.dataset.lang, true);
  });

  /* ---------- split text: chars (hero) / lines (section titles) ---------- */
  function split(el) {
    const chars = el.dataset.split === 'chars';
    let i = 0;
    const walk = node => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = d.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(d.createTextNode(' ')); return; }
            const w = d.createElement('span'); w.className = 'w';
            const wi = d.createElement('span'); wi.className = 'wi';
            if (chars) {
              const cs = Array.from(part), mid = (cs.length - 1) / 2;
              cs.forEach((c, k) => {
                const s = d.createElement('span'); s.className = 'ch'; s.textContent = c;
                s.style.setProperty('--i', i++); s.style.setProperty('--sx', ((mid - k) * 0.05).toFixed(2) + 'em'); /* letters start gathered inward and spread to rest: word gaps only grow, line breaks never change */
                wi.appendChild(s);
              });
            } else { wi.textContent = part; i++; }
            w.appendChild(wi); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('w')) walk(n);
      });
    };
    walk(el);
    if (!chars) lineIndex(el);
  }
  function lineIndex(el) {
    let top = null, l = -1;
    $$('.w', el).forEach(w => {
      const y = w.offsetTop;
      if (top === null || Math.abs(y - top) > 4) { top = y; l++; }
      w.firstChild.style.setProperty('--l', l);
    });
  }
  function splitAll(again) {
    $$('[data-split]').forEach(el => {
      const wasIn = el.classList.contains('is-in');
      split(el);
      if (again && wasIn) { el.classList.remove('is-in'); void el.offsetWidth; requestAnimationFrame(() => el.classList.add('is-in')); }
    });
  }
  let rT;
  W.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => $$('[data-split="lines"]').forEach(lineIndex), 200); });
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(() => $$('[data-split="lines"]').forEach(lineIndex));

  /* ---------- preloader: counter 0 → 100, then bloom ---------- */
  const plN = $('#pl-n'), pre = $('.preloader');
  let counted = false;
  const loaded = () => {
    if (root.classList.contains('is-loaded')) return;
    root.classList.add('is-loaded');
    emit('rr:loaded');
    setTimeout(() => $$('[data-split="chars"]').forEach(el => el.classList.add('is-in')), RM ? 0 : 220);
  };
  if (RM || !pre) loaded();
  else {
    const t0 = performance.now(), DUR = 650;
    const tickPl = now => {
      const p = clamp((now - t0) / DUR, 0, 1), e = p < 1 ? 1 - Math.pow(1 - p, 2.4) : 1;
      const v = Math.round(e * 100);
      if (plN) plN.textContent = String(v).padStart(3, '0');
      pre.style.setProperty('--pl', (v / 100).toFixed(3));
      if (p < 1) requestAnimationFrame(tickPl);
      else { counted = true; setTimeout(loaded, 120); }
    };
    requestAnimationFrame(tickPl);
    setTimeout(() => { if (!counted) loaded(); }, 2600);
  }

  /* ---------- nav, menu ---------- */
  const nav = $('#nav'), burger = $('.burger'), menu = $('#menu');
  function syncBurger() { if (burger && menu) burger.setAttribute('aria-label', t(menu.classList.contains('is-open') ? 'ui.close' : 'ui.open')); }
  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    root.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    syncBurger();
    if (open) setTimeout(() => { const a = $('a', menu); if (a) a.focus(); }, 120);
    else burger.focus({ preventScroll: true });
  }
  if (burger && menu) {
    burger.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
    menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    d.addEventListener('keydown', e => {
      if (!menu.classList.contains('is-open')) return;
      if (e.key === 'Escape') setMenu(false);
      if (e.key === 'Tab') {
        const f = [burger, ...$$('a,button', menu)];
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }
  const navLinks = $$('.nav__links a');
  if ('IntersectionObserver' in W && navLinks.length) {
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      navLinks.forEach(a => a.getAttribute('href') === '#' + en.target.id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
    }), { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(a => { const s = $(a.getAttribute('href')); if (s) io.observe(s); });
    const top = $('#top'); if (top) io.observe(top);
  }

  /* ---------- reveals (clip-path wipes, line masks, colour swipes, odometers) ---------- */
  $$('[data-stagger]').forEach(g => Array.from(g.children).forEach((c, i) => c.style.setProperty('--d', (i % 6) * 0.04 + 's')));
  /* rect-based: a target hidden by clip-path has no visible area, so IntersectionObserver would never fire */
  let pending = $$('[data-reveal],[data-split="lines"],[data-swipe],.fig');
  function reveal() {
    if (!pending.length) return;
    const vh = W.innerHeight;
    pending = pending.filter(el => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * 1.1 && r.bottom > 0 && (r.width || r.height)) {
        el.classList.add('is-in');
        if (el.hasAttribute('data-swipe')) $$('[data-swipe]', el.parentNode).forEach(s => s.classList.add('is-in')); /* team: all three together, CSS stagger 0/100/200ms */
        const o = $('.odo', el); if (o) roll(o);
        return false;
      }
      return true;
    });
  }
  if (RM) { pending.forEach(el => el.classList.add('is-in')); pending = []; }
  /* safety: anything on or above the screen 2.5s after load / after scrolling stops ends revealed */
  const sweep = () => { pending = pending.filter(el => { if (el.classList.contains('is-in')) return false; if (el.getBoundingClientRect().top < W.innerHeight) { el.classList.add('is-in'); const o = $('.odo', el); if (o) roll(o); return false; } return true; }); };
  W.addEventListener('load', () => setTimeout(sweep, 2500));
  let sweepT; W.addEventListener('scroll', () => { clearTimeout(sweepT); sweepT = setTimeout(sweep, 2500); }, { passive: true });

  /* ---------- odometer counters ---------- */
  const counters = $$('.odo');
  const fmt = n => new Intl.NumberFormat(lang === 'en' ? 'en-US' : lang === 'pt' ? 'pt-BR' : 'fr-FR').format(n);
  function buildOdo(el, start) {
    const str = fmt(+el.dataset.count);
    el.textContent = '';
    let k = 0;
    Array.from(str).forEach(ch => {
      if (!/\d/.test(ch)) { const s = d.createElement('span'); s.className = 'odo__sep'; el.appendChild(s); return; }
      const dg = d.createElement('span'); dg.className = 'odo__d';
      const s = d.createElement('span'); s.className = 'odo__s';
      for (let r = 0; r < 30; r++) { const n = d.createElement('span'); n.textContent = r % 10; s.appendChild(n); }
      const target = +ch + 10 * (k === 0 ? 1 : 2);
      s.dataset.n = target;
      s.style.setProperty('--n', start ? 0 : target);
      s.style.setProperty('--dur', Math.min(0.7, 0.45 + k * 0.07) + 's');
      s.style.setProperty('--del', (k * 0.02) + 's');
      dg.appendChild(s); el.appendChild(dg); k++;
    });
  }
  function roll(el) {
    if (RM || el._done) return;
    el._done = true;
    requestAnimationFrame(() => $$('.odo__s', el).forEach(s => s.style.setProperty('--n', s.dataset.n)));
    setTimeout(() => el.classList.add('is-done'), 900);
  }
  function formatCounters() {
    counters.forEach(c => {
      buildOdo(c, !RM && !c._done);
      const p = c.closest('.fig__num'), sr = p && $('[data-sr]', p), u = c.dataset.u || '';
      if (sr) sr.textContent = '+' + fmt(+c.dataset.count) + u;
    });
  }

  /* ---------- magnetic & tilt ---------- */
  if (FINE && !RM) {
    $$('[data-magnetic]').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * 0.24).toFixed(1) + 'px');
        b.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * 0.32).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
    });
    $$('[data-tilt]').forEach(c => {
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = `perspective(900px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) translateZ(0)`;
      });
      c.addEventListener('pointerleave', () => { c.style.transform = ''; });
    });
  }

  /* ---------- scroll engine: progress, nav, parallax, ranges ---------- */
  const bar = $('.progress span');
  const para = RM ? [] : $$('[data-parallax]');
  const ranges = $('.ranges'), vp = $('.ranges__viewport'), track = $('.ranges__track');
  const slides = $$('.rslide'), idxEl = $('#rg-idx'), hud = $('.ranges__hud');
  const wide = W.matchMedia('(min-width: 901px)');
  let pinned = false, maxX = 0, curX = 0;
  function layoutRanges() {
    if (!ranges || !track) return;
    pinned = wide.matches && !RM;
    ranges.classList.toggle('is-pinned', pinned);
    if (pinned) {
      maxX = Math.max(0, track.scrollWidth - W.innerWidth);
      ranges.style.height = (maxX + W.innerHeight) + 'px';
    } else { ranges.style.height = ''; track.style.transform = ''; }
    d.dispatchEvent(new Event('rr:layout'));
  }
  function slideVars(p) {
    const n = slides.length;
    if (hud) hud.style.setProperty('--rp', p.toFixed(4));
    if (idxEl) idxEl.textContent = String(clamp(Math.round(p * (n - 1)), 0, n - 2)).padStart(2, '0');
    if (RM) return;
    slides.forEach((s, i) => {
      let q;
      if (pinned) q = (i * W.innerWidth - curX) / W.innerWidth;
      else q = (s.offsetLeft + s.offsetWidth / 2 - vp.scrollLeft - vp.clientWidth / 2) / (s.offsetWidth || 1);
      q = clamp(q, -1.5, 1.5);
      s.style.setProperty('--p', q.toFixed(3)); s.style.setProperty('--ap', Math.abs(q).toFixed(3));
    });
  }
  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = W.scrollY, vh = W.innerHeight, docH = root.scrollHeight - vh;
    if (bar) bar.style.setProperty('--p', docH > 0 ? (y / docH).toFixed(4) : 0);
    reveal();
    if (nav) nav.classList.toggle('is-solid', y > 40 || d.body.classList.contains('page-legal'));
    para.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const off = (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.parallax);
      el.style.transform = `translate3d(0,${off.toFixed(1)}px,0)`;
    });
    if (pinned) {
      const r = ranges.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) {
        const p = clamp(-r.top / (r.height - vh), 0, 1);
        curX = p * maxX;
        track.style.transform = `translate3d(${(-curX).toFixed(1)}px,0,0)`;
        slideVars(p);
      }
    }
  }
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } };
  W.addEventListener('scroll', req, { passive: true });
  W.addEventListener('resize', () => { layoutRanges(); req(); });
  W.addEventListener('load', () => { layoutRanges(); req(); });
  if (ranges && vp) {
    const rangeTop = () => ranges.getBoundingClientRect().top + W.scrollY;
    const goSlide = i => {
      const x = clamp(i * W.innerWidth, 0, maxX);
      W.scrollTo({ top: rangeTop() + (maxX ? x / maxX : 0) * (ranges.offsetHeight - W.innerHeight), behavior: RM ? 'auto' : 'smooth' });
    };
    ranges.addEventListener('focusin', e => {
      if (!pinned) return;
      const s = e.target.closest('.rslide'); if (s) goSlide(slides.indexOf(s));
    });
    vp.addEventListener('keydown', e => {
      if (!pinned || !/Arrow(Left|Right)/.test(e.key)) return;
      e.preventDefault();
      goSlide(clamp(Math.round(curX / W.innerWidth) + (e.key === 'ArrowRight' ? 1 : -1), 0, slides.length - 1));
    });
    vp.addEventListener('scroll', () => { if (!pinned) requestAnimationFrame(() => slideVars(vp.scrollWidth > vp.clientWidth ? vp.scrollLeft / (vp.scrollWidth - vp.clientWidth) : 0)); }, { passive: true });
    let drag = null;
    vp.addEventListener('dragstart', e => e.preventDefault());
    vp.addEventListener('pointerdown', e => {
      if (!pinned || e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, y: W.scrollY, k: (ranges.offsetHeight - W.innerHeight) / (maxX || 1) };
      vp.classList.add('is-drag');
    });
    W.addEventListener('pointermove', e => { if (drag) W.scrollTo({ top: drag.y - (e.clientX - drag.x) * drag.k * 1.4, behavior: 'instant' }); });
    W.addEventListener('pointerup', () => { if (drag) { drag = null; vp.classList.remove('is-drag'); } });
  }

  /* ---------- shade explorer (liquid drop) ---------- */
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const toHex = a => '#' + a.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  function ramp(stops, n, tone) {
    const out = [], s = stops.map(hex);
    for (let i = 0; i < n; i++) {
      const p = n === 1 ? 0 : i / (n - 1) * (s.length - 1), k = Math.min(Math.floor(p), s.length - 2), f = p - k;
      let c = s[k].map((v, j) => v + (s[k + 1][j] - v) * f);
      if (tone) { const u = i % 3; c = u === 0 ? [c[0] + 3, c[1] - 3, c[2] + 5] : u === 2 ? [c[0] + 4, c[1] + 2, c[2] - 7] : c; }
      out.push(toHex(c));
    }
    return out;
  }
  const lum = h => { const c = hex(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const SKIN = ['#F7E2D0', '#F1D1B8', '#EAC2A2', '#E0B08C', '#D49E78', '#C68C66', '#B67A55', '#A26846', '#8C573A', '#764830', '#603A27', '#4B2D1F', '#382219'];
  const PRODUCTS = {
    daily: { n: 33, code: i => 'L' + (i + 1), form: 'liquid', colors: ramp(SKIN, 33, true), def: 4 },
    blur: { n: 25, code: i => 'L' + (i + 1), form: 'liquid', colors: ramp(['#F8E6D6', '#F0D2B9', '#E6BE9C', '#D8A982', '#C8936B', '#B37C56', '#9A6544', '#7E5035', '#603C28', '#462C1E'], 25, true), def: 4 },
    light: { n: 5, code: i => 'P' + (i + 1), form: 'compact', colors: ramp(['#F2DDCB', '#E2C1A2', '#CDA27F', '#B08060', '#875C42'], 5), def: 4 },
    blush: { n: 18, code: i => 'N°' + String(i + 1).padStart(2, '0'), form: 'compact', colors: ramp(['#E8B9A9', '#EFA48E', '#F28E76', '#EF7A6E', '#E7687C', '#D8577E', '#BF436C', '#A8304F', '#8E1E33'], 18), def: 3 }
  };
  const section = $('#classic');
  let shade = null;
  if (section) {
    const codeEl = $('#stage-code'), posEl = $('#stage-pos');
    const tabs = $$('.tab', section), panel = $('#cl-panel'), current = {};
    let active = 'daily';
    const pad = n => String(n).padStart(2, '0');
    function pick(pid, idx, focus, silent) {
      const P = PRODUCTS[pid], group = $(`[data-shades="${pid}"]`, section);
      current[pid] = idx;
      $$('.chip', group).forEach((c, i) => {
        const on = i === idx;
        c.setAttribute('aria-checked', String(on));
        c.tabIndex = on ? 0 : -1;
        if (on && focus) c.focus();
      });
      if (pid !== active) return;
      const col = P.colors[idx];
      section.style.setProperty('--shade', col);
      section.style.setProperty('--on-shade', lum(col) > 0.3 ? '#140A0F' : '#FBF6F2');
      codeEl.textContent = P.code(idx);
      posEl.textContent = pad(idx + 1) + ' / ' + pad(P.n);
      const nm = $(`.prod[data-p="${pid}"] .prod__name`, section);
      if (nm && !RM && !silent) { nm.classList.remove('is-smearing'); void nm.offsetWidth; nm.classList.add('is-smearing'); }
      emit('rr:shade', { color: col, silent: !!silent });
    }
    Object.keys(PRODUCTS).forEach(pid => {
      const P = PRODUCTS[pid], group = $(`[data-shades="${pid}"]`, section);
      if (!group) return;
      const total = Math.min(300, (P.n - 1) * 24);
      P.colors.forEach((c, i) => {
        const b = d.createElement('button');
        b.type = 'button'; b.className = 'chip'; b.setAttribute('role', 'radio');
        b.style.setProperty('--c', c); b.dataset.code = P.code(i); b.dataset.cursor = 'pick';
        b.style.setProperty('--a', (P.n === 1 ? 0 : -total / 2 + i * total / (P.n - 1)).toFixed(2) + 'deg');
        b.addEventListener('click', () => pick(pid, i));
        group.appendChild(b);
      });
      group.addEventListener('keydown', e => {
        const k = e.key, n = P.n, cur = current[pid];
        const map = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
        let nx = null;
        if (k in map) nx = (cur + map[k] + n) % n; else if (k === 'Home') nx = 0; else if (k === 'End') nx = n - 1;
        if (nx !== null) { e.preventDefault(); pick(pid, nx, true); }
      });
      current[pid] = P.def;
    });
    function selectProduct(pid, focus, silent) {
      active = pid;
      tabs.forEach(tb => {
        const on = tb.dataset.p === pid;
        tb.setAttribute('aria-selected', String(on)); tb.tabIndex = on ? 0 : -1;
        if (on) { panel.setAttribute('aria-labelledby', tb.id); if (focus) tb.focus(); }
      });
      $$('.prod', section).forEach(p => { p.hidden = p.dataset.p !== pid; });
      $$('.shades', section).forEach(g => { g.hidden = g.dataset.shades !== pid; });
      section.dataset.product = pid;
      section.dataset.form = PRODUCTS[pid].form;
      pick(pid, current[pid], false, silent);
    }
    tabs.forEach((tb, i) => {
      tb.addEventListener('click', () => selectProduct(tb.dataset.p));
      tb.addEventListener('keydown', e => {
        let j = null;
        if (e.key === 'ArrowRight') j = (i + 1) % tabs.length; else if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = tabs.length - 1;
        if (j !== null) { e.preventDefault(); selectProduct(tabs[j].dataset.p, true); }
      });
    });
    shade = {
      relabel() {
        Object.keys(PRODUCTS).forEach(pid => {
          const P = PRODUCTS[pid], group = $(`[data-shades="${pid}"]`, section);
          group.setAttribute('aria-label', t('cl.shadesOf') + ' ' + $(`.prod[data-p="${pid}"] .prod__name`, section).textContent);
          $$('.chip', group).forEach((c, i) => c.setAttribute('aria-label', t('cl.shade') + ' ' + P.code(i) + ' — ' + (i + 1) + '/' + P.n));
        });
      }
    };
    Object.keys(PRODUCTS).forEach(pid => { current[pid] = PRODUCTS[pid].def; });
    selectProduct('daily', false, true);
    Object.keys(PRODUCTS).forEach(pid => pick(pid, current[pid], false, true));
    shade.relabel();
  }

  /* ---------- contact form (no backend yet: validates, then prepares a mailto) ---------- */
  const form = $('#form');
  if (form) {
    const err = (el, key) => {
      const out = $('#' + el.getAttribute('aria-describedby'));
      el.setAttribute('aria-invalid', key ? 'true' : 'false');
      if (out) out.textContent = key ? t(key) : '';
      return !key;
    };
    form.addEventListener('submit', e => {
      e.preventDefault();
      let first = null;
      $$('[required]', form).forEach(el => {
        let k = null;
        if (el.type === 'checkbox') k = el.checked ? null : 'err.rgpd';
        else if (!el.value.trim()) k = 'err.req';
        else if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim())) k = 'err.email';
        if (!err(el, k) && !first) first = el;
      });
      if (first) { first.focus(); return; }
      const v = n => (form.elements[n].value || '').trim();
      const body = [`${t('ct.f.last').replace(/<[^>]+>/g, '')}: ${v('nom')}`, `${t('ct.f.first')}: ${v('prenom')}`, `${t('ct.f.company')}: ${v('societe')}`,
        `${t('ct.f.email')}: ${v('email')}`, `${t('ct.f.phone')}: ${v('tel')}`, '', v('message')].join('\n');
      $('#mailto').href = 'mailto:business@rubyrosefrance.com?subject=' + encodeURIComponent('Ruby Rose France — ' + v('prenom') + ' ' + v('nom') + (v('societe') ? ' (' + v('societe') + ')' : '')) + '&body=' + encodeURIComponent(body);
      form.hidden = true;
      $('#success').hidden = false;
      $('#success-title').focus();
    });
    $$('[required]', form).forEach(el => el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
      if (el.getAttribute('aria-invalid') === 'true') {
        const ok = el.type === 'checkbox' ? el.checked : !!el.value.trim();
        if (ok) err(el, null);
      }
    }));
  }

  /* ---------- init ---------- */
  let initial = null;
  try { initial = new URLSearchParams(location.search).get('lang'); } catch (e) { initial = null; }
  initial = initial || store.get();
  if (initial && initial !== 'fr' && LANGS.includes(initial)) applyLang(initial, false);
  else { splitAll(false); formatCounters(); }
  layoutRanges();
  onScroll();
  if (!pinned && vp) slideVars(0);
})();
