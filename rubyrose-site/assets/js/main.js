/* Ruby Rose France — interactions (vanilla) */
(() => {
  'use strict';
  const d = document, root = d.documentElement, W = window;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => Array.from(c.querySelectorAll(s));
  const RM = W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = W.matchMedia('(pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
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
    splitAll(root.classList.contains('is-loaded'));
    formatCounters();
    if (shade) shade.relabel();
    syncBurger();
  }
  d.addEventListener('click', e => {
    const b = e.target.closest('[data-lang]');
    if (b) applyLang(b.dataset.lang, true);
  });

  /* ---------- split text ---------- */
  function split(el) {
    let i = 0;
    const walk = node => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = d.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(d.createTextNode(' ')); return; }
            const w = d.createElement('span'); w.className = 'w';
            const wi = d.createElement('span'); wi.className = 'wi'; wi.style.setProperty('--i', i++);
            wi.textContent = part; w.appendChild(wi); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('w')) walk(n);
      });
    };
    walk(el);
  }
  function splitAll(again) {
    $$('[data-split]').forEach(el => {
      split(el);
      if (again) { el.classList.remove('is-in'); void el.offsetWidth; requestAnimationFrame(() => el.classList.add('is-in')); }
    });
  }

  /* ---------- preloader ---------- */
  const loaded = () => {
    if (root.classList.contains('is-loaded')) return;
    root.classList.add('is-loaded');
    setTimeout(() => $$('[data-split]').forEach(el => el.classList.add('is-in')), RM ? 0 : 380);
  };
  if (RM) loaded();
  else {
    const t0 = performance.now();
    const go = () => setTimeout(loaded, Math.max(0, 950 - (performance.now() - t0)));
    if (d.readyState === 'complete') go(); else W.addEventListener('load', go);
    setTimeout(loaded, 2200);
  }

  /* ---------- nav, menu ---------- */
  const nav = $('#nav'), burger = $('.burger'), menu = $('#menu');
  function syncBurger() { if (burger) burger.setAttribute('aria-label', t(menu.classList.contains('is-open') ? 'ui.close' : 'ui.open')); }
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

  /* ---------- reveal ---------- */
  $$('[data-stagger]').forEach(g => Array.from(g.children).forEach((c, i) => c.style.setProperty('--d', (i % 6) * 0.08 + 's')));
  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in W && !RM) {
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(el => io.observe(el));
  } else revealEls.forEach(el => el.classList.add('is-in'));

  /* ---------- counters ---------- */
  const counters = $$('[data-count]');
  const fmt = n => new Intl.NumberFormat(lang === 'en' ? 'en-US' : lang === 'pt' ? 'pt-BR' : 'fr-FR').format(n);
  function formatCounters() { counters.forEach(c => { if (!c._run) c.textContent = fmt(+c.dataset.count); }); }
  if ('IntersectionObserver' in W && !RM) {
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target, end = +el.dataset.count, t0 = performance.now(), dur = 1800;
      el._run = true; io.unobserve(el);
      const step = now => {
        const p = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(2, -10 * p);
        el.textContent = fmt(Math.round(end * (p === 1 ? 1 : e)));
        if (p < 1) requestAnimationFrame(step); else el._run = false;
      };
      el.textContent = fmt(0);
      requestAnimationFrame(step);
    }), { threshold: 0.6 });
    counters.forEach(c => io.observe(c));
  }

  /* ---------- magnetic & tilt ---------- */
  if (FINE && !RM) {
    $$('[data-magnetic]').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px');
        b.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
    });
    $$('[data-tilt]').forEach(c => {
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = `rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg) translateZ(0)`;
      });
      c.addEventListener('pointerleave', () => { c.style.transform = ''; });
    });
  }

  /* ---------- scroll engine: progress, nav, parallax, process, ranges ---------- */
  const bar = $('.progress span');
  const para = RM ? [] : $$('[data-parallax]');
  const steps = $('.steps'), stepItems = $$('.step');
  const ranges = $('.ranges'), track = $('.ranges__track');
  const wide = W.matchMedia('(min-width: 900px)');
  let pinned = false, maxX = 0;
  function layoutRanges() {
    if (!ranges || !track) return;
    pinned = wide.matches && !RM;
    ranges.classList.toggle('is-pinned', pinned);
    if (pinned) {
      maxX = Math.max(0, track.scrollWidth - W.innerWidth);
      ranges.style.height = (maxX + W.innerHeight) + 'px';
    } else { ranges.style.height = ''; track.style.transform = ''; }
  }
  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = W.scrollY, vh = W.innerHeight, docH = root.scrollHeight - vh;
    if (bar) bar.style.setProperty('--p', docH > 0 ? (y / docH).toFixed(4) : 0);
    if (nav) nav.classList.toggle('is-solid', y > 40 || d.body.classList.contains('page-legal'));
    para.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const off = (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.parallax);
      el.style.transform = el.closest('.pframe') ? `translate3d(0,${off.toFixed(1)}px,0) scale(1.14)` : `translate3d(0,${off.toFixed(1)}px,0)`;
    });
    if (steps) {
      const r = steps.getBoundingClientRect();
      const p = clamp((vh * 0.6 - r.top) / r.height, 0, 1);
      steps.style.setProperty('--prog', p.toFixed(3));
      stepItems.forEach(s => { const sr = s.getBoundingClientRect(); s.classList.toggle('is-active', sr.top < vh * 0.62); });
    }
    if (pinned) {
      const r = ranges.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - vh), 0, 1);
      track.style.transform = `translate3d(${(-p * maxX).toFixed(1)}px,0,0)`;
    }
  }
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } };
  W.addEventListener('scroll', req, { passive: true });
  W.addEventListener('resize', () => { layoutRanges(); req(); });
  W.addEventListener('load', () => { layoutRanges(); req(); });
  if (ranges) ranges.addEventListener('focusin', e => {
    if (!pinned) return;
    const card = e.target.closest('.rcard'); if (!card) return;
    const top = ranges.getBoundingClientRect().top + W.scrollY;
    const x = clamp(card.offsetLeft - W.innerWidth * 0.2, 0, maxX);
    W.scrollTo({ top: top + (maxX ? x / maxX : 0) * (ranges.offsetHeight - W.innerHeight), behavior: 'auto' });
  });

  /* ---------- shade explorer ---------- */
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
    const stage = $('.stage', section), codeEl = $('#stage-code'), posEl = $('#stage-pos');
    const tabs = $$('.tab', section), panel = $('#cl-panel'), current = {};
    let active = 'daily';
    const pad = n => String(n).padStart(2, '0');
    function pick(pid, idx, focus) {
      const P = PRODUCTS[pid], group = $(`[data-shades="${pid}"]`, section);
      current[pid] = idx;
      $$('.chip', group).forEach((c, i) => {
        const on = i === idx;
        c.setAttribute('aria-checked', String(on));
        c.tabIndex = on ? 0 : -1;
        if (on && focus) c.focus();
      });
      if (pid !== active) return;
      section.style.setProperty('--shade', P.colors[idx]);
      codeEl.textContent = P.code(idx);
      posEl.textContent = pad(idx + 1) + ' / ' + pad(P.n);
      if (!RM) { stage.classList.remove('pop'); void stage.offsetWidth; stage.classList.add('pop'); }
    }
    Object.keys(PRODUCTS).forEach(pid => {
      const P = PRODUCTS[pid], group = $(`[data-shades="${pid}"]`, section);
      if (!group) return;
      P.colors.forEach((c, i) => {
        const b = d.createElement('button');
        b.type = 'button'; b.className = 'chip'; b.setAttribute('role', 'radio');
        b.style.setProperty('--c', c); b.dataset.code = P.code(i);
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
    function selectProduct(pid, focus) {
      active = pid;
      tabs.forEach(tb => {
        const on = tb.dataset.p === pid;
        tb.setAttribute('aria-selected', String(on)); tb.tabIndex = on ? 0 : -1;
        if (on) { panel.setAttribute('aria-labelledby', tb.id); if (focus) tb.focus(); }
      });
      $$('.prod', section).forEach(p => { p.hidden = p.dataset.p !== pid; });
      section.dataset.product = pid;
      section.dataset.form = PRODUCTS[pid].form;
      pick(pid, current[pid]);
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
    Object.keys(PRODUCTS).forEach(pid => pick(pid, PRODUCTS[pid].def));
    selectProduct('daily');
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
})();
