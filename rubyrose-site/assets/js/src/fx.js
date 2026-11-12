/* Ruby Rose France — fx layer: pigment shader, cursor trail, palette morph, lens, liquid drop, pipette, map, kinetic type */
(() => {
  'use strict';
  const d = document, root = d.documentElement, W = window;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => Array.from(c.querySelectorAll(s));
  const RR = W.RR || { t: k => k, RM: false, FINE: false };
  const RM = W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = W.matchMedia('(pointer: fine)').matches;
  const DPR = Math.min(W.devicePixelRatio || 1, 1.5);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const MAPB64 = 'AAAADujH//8DAAAAgADgAAAAAAAAYAAAAP7/AQAAAAHgfwAAAAAAAPhn/AD/HwAAADAQ//8fHgAA/of0c+ZA/wcAwAPA9v////96/P///////////wFQAAIAAAAAAPH///9/P/iAB8D7/f///////wv8////EAQcAAA8//////////eD3vz/P+AABACAH/z//////x8BAArw/w/4AQAAAuP//////x9wACAA/v8//gAAgCD8//////8DDAAAAPz/3/8AAOj+////////BwEAAAD///8PAADI/////////wEAAACA//9/HAAA/v///////x8AAAAA4P///wAAAL6fnv////8DAAAAAPj//wMAAPjaB/f///9/DgAAAAD+/38AAAAeaf7z//9/hwAAAAAA//8PAACAB9B//v//jyEAAAAAwP//AQAAAB4A/////0cMAAAAAMD/PwAAAPAHwP/////hAAAAAADA/wcAAAD+7/r/////CAAAAAAA+AcAAADA//99////PwAAAAAAAPyAAAAA+P9/P/7//wcAAAAAAAA8AAAAAP//v3/4//8CAAAAAAAADhQAAMD//+8//PkPAAAAAAAAgGcgAADw///3Bz58AQAAAAAAAIAPAAAA/P//eQAHPQgAAAAAAAAADgAAAP///wbAAA8CAAAAAAAAAAIAAMD//38AMEADAAAAAAAAAAD5AQDg////ABgAAAAAAAAAAAAA/gEA8P//PwAEBCAAAAAAAAAAgP8BAAj6/wcAgIIAAAAAAAAAAPD/AAAA/v8AAMA4BAAAAAAAAAD8PwAAgP8fAAAgDgAAAAAAAACA/z8AAOD/AwAAmCsEAAAAAAAA4P9/AADwfwAAAAQADwAAAAAAAPD/PwAA/B8AAAAOgEMAAAAAAAD8/w8AAP4PAAAAAAABAAAAAAAA/v8BAID/AwAAAAARAAAAAAAAgP9/AADw/wgAAADgBAAAAAAAAID/HwAA/J8DAAAAfgOAAAAAAADA/wMAAP9jAAAAwP8AAAAAAAAA8P8AAID/GAAAAP5/AAAAAAAAAPwPAADgPwYAAMD/PwAAAAAAAAD/AQAA+AcAAADw/x8AAAAAAADgfwAAAPwAAAAA+P8HAAAAAAAA+AcAAAA/AAAAAP7/AQAAAAAAAP4BAACAAwAAAICHPwAAAAAAAIAfAAAAAAAAAAAAgA8gAAAAAADwBwAAAAAAAAAAAEAAEAAAAAAAfAAAAAAAAAAAAAAgAAAAAAAAAA4AAAAAAAAAAAAAAEAAAAAAAMABAAAAAAAAAAAAAAAIAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAA';

  /* ---------- one rAF scheduler, paused when the tab is hidden ---------- */
  const loops = new Set(); let raf = 0;
  const frame = now => { raf = 0; loops.forEach(f => f(now)); if (loops.size && !d.hidden) raf = requestAnimationFrame(frame); };
  const on = f => { loops.add(f); if (!raf && !d.hidden) raf = requestAnimationFrame(frame); };
  const off = f => loops.delete(f);
  d.addEventListener('visibilitychange', () => { if (!d.hidden && loops.size && !raf) raf = requestAnimationFrame(frame); });
  const seen = (el, cb, margin) => {
    if (!('IntersectionObserver' in W)) { cb(true); return; }
    new IntersectionObserver(es => es.forEach(e => cb(e.isIntersecting)), { rootMargin: margin || '100px 0px' }).observe(el);
  };

  /* ---------- colour maths ---------- */
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const L = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const CR = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const hx = c => '#' + c.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  const ensure = (c, bg, fg, min) => { let k = 0, o = c; while (CR(o, bg) < min && k < 1) { k += 0.1; o = mix(c, fg, k); } return o; };

  /* ---------- 3 · scroll-morphing page colour ---------- */
  const PAL = { night: ['#140A0F', '#EA5174', '#F17C98'], rose: ['#EA5174', '#140A0F', '#4A1631'], ivory: ['#FBF6F2', '#B8123F', '#B8123F'],
    blush: ['#F7D9DF', '#9E0F36', '#B8123F'], plum: ['#4A1631', '#F7D9DF', '#F17C98'], ruby: ['#B8123F', '#F7D9DF', '#F7D9DF'], shade: ['#EFDCCD', '#9E0F36', '#9E0F36'] };
  const P = {}; Object.keys(PAL).forEach(k => { P[k] = [].concat(...PAL[k].map(rgb)); });
  const secs = $$('[data-pal]');
  const DARK = rgb('#140A0F'), LIGHT = rgb('#FBF6F2');
  let cur = null, last = '';
  /* colour flows through pigment: transitions bend through rose instead of greying out */
  const VIA = P.rose;
  const bez = (a, b, k) => { k = k * k * (3 - 2 * k); const u = 1 - k, w = 2 * u * k * 0.7; return a.map((v, i) => (u * u + u * k * 0.3) * v + w * VIA[i] + (k * k + u * k * 0.3) * b[i]); };
  function palTarget() {
    const vh = W.innerHeight, probe = vh * 0.5, band = vh * 0.24;
    for (let i = 0; i < secs.length; i++) {
      const r = secs[i].getBoundingClientRect();
      if (probe < r.top || probe >= r.bottom) continue;
      const me = P[secs[i].dataset.pal] || P.night;
      const nx = secs[i + 1] && P[secs[i + 1].dataset.pal], pv = secs[i - 1] && P[secs[i - 1].dataset.pal];
      if (nx && probe > r.bottom - band) return bez(me, nx, (probe - (r.bottom - band)) / (2 * band));
      if (pv && probe < r.top + band) return bez(pv, me, 0.5 + (probe - r.top) / (2 * band));
      return me;
    }
    return W.scrollY < 50 ? P.night : (cur || P.night);
  }
  function palApply() {
    const bg = cur.slice(0, 3);
    const cd = CR(bg, DARK), cl = CR(bg, LIGHT);
    let fg = cd >= cl ? DARK : LIGHT;
    if (Math.max(cd, cl) < 4.6) fg = cd >= cl ? [0, 0, 0] : [255, 255, 255];
    const fg2 = ensure(mix(fg, bg, 0.3), bg, fg, 4.7), acc = ensure(cur.slice(3, 6), bg, fg, 4.7), hl = ensure(cur.slice(6, 9), bg, fg, 3.2);
    const key = hx(bg) + hx(fg) + hx(fg2) + hx(acc) + hx(hl);
    if (key === last) return;
    last = key;
    const s = root.style;
    s.setProperty('--bg', hx(bg)); s.setProperty('--fg', hx(fg)); s.setProperty('--fg2', hx(fg2));
    s.setProperty('--acc', hx(acc)); s.setProperty('--hl', hx(hl));
    s.setProperty('--line', 'rgba(' + fg.map(Math.round).join(',') + ',.16)');
    root.classList.toggle('is-dark', L(bg) < 0.2);
  }
  let palRun = false;
  const palLoop = () => {
    const tg = palTarget();
    if (!cur) cur = tg.slice();
    let moving = false;
    for (let i = 0; i < 9; i++) { const n = RM ? tg[i] : lerp(cur[i], tg[i], 0.14); if (Math.abs(n - tg[i]) > 0.4) moving = true; cur[i] = n; }
    palApply();
    if (!moving && !palRun) off(palLoop);
    palRun = false;
  };
  if (secs.length) {
    const kick = () => { palRun = true; on(palLoop); };
    W.addEventListener('scroll', kick, { passive: true });
    W.addEventListener('resize', kick);
    const setShade = c => { P.shade = [].concat(mix(LIGHT, rgb(c), 0.42), rgb('#9E0F36'), rgb('#9E0F36')); };
    const cl = $('#classic'), s0 = cl && cl.style.getPropertyValue('--shade');
    if (s0) setShade(s0.trim());
    d.addEventListener('rr:shade', e => { setShade(e.detail.color); kick(); });
    kick();
  }

  /* ---------- 1 · hero: liquid pigment shader ---------- */
  const cv = $('.hero__gl'), hero = $('.hero');
  if (cv && hero) (() => {
    if (RM) { root.classList.add('no-gl'); return; }
    let gl = null;
    try { gl = cv.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' }) || cv.getContext('experimental-webgl'); } catch (e) { gl = null; }
    if (!gl) { root.classList.add('no-gl'); return; }
    const der = !!gl.getExtension('OES_standard_derivatives');
    const FS = (der ? '#extension GL_OES_standard_derivatives : enable\n#define DER\n' : '') +
`#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uR,uM,uS;uniform float uT,uV,uB,uHI,uPt;uniform vec4 uRect;uniform sampler2D uI;
vec2 hh(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return fract(sin(p)*43758.5453)*2.-1.;}
float gn(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(dot(hh(i),f),dot(hh(i+vec2(1.,0.)),f-vec2(1.,0.)),u.x),mix(dot(hh(i+vec2(0.,1.)),f-vec2(0.,1.)),dot(hh(i+1.),f-1.),u.x),u.y);}
float fbm(vec2 p){float s=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){s+=a*gn(p);p=m*p;a*=.5;}return s;}
void main(){
vec2 uv=gl_FragCoord.xy/uR;float as=uR.x/uR.y;
vec2 p=vec2(uv.x*as,uv.y),m=vec2(uM.x*as,uM.y),d=p-m;
float k=exp(-dot(d,d)*7.);float an=k*(1.4+uV*16.);float c=cos(an),s=sin(an);
p=m+mat2(c,s,-s,c)*d*(1.-k*.22);
vec2 dc=vec2((uv.x-.5)*as,uv.y-.48);float bd=length(dc);
p+=dc*uB*1.1;
float t=uT*.045;vec2 P=p*1.6;
vec2 q=vec2(fbm(P+vec2(0.,t)),fbm(P+vec2(5.2,1.3)-t*.8));
vec2 r=vec2(fbm(P+3.2*q+vec2(1.7,9.2)+t*1.3),fbm(P+3.2*q+vec2(8.3,2.8)-t));
float v=clamp(fbm(P+3.4*r)*1.3+.5,0.,1.);
vec3 nt=vec3(.078,.039,.059),pl=vec3(.29,.086,.192),rb=vec3(.722,.071,.247),ro=vec3(.918,.318,.455),bl=vec3(.969,.851,.875),go=vec3(.851,.69,.447);
vec3 col=mix(nt,pl,smoothstep(.05,.38,v));col=mix(col,rb,smoothstep(.36,.62,v));col=mix(col,ro,smoothstep(.62,.86,v));col=mix(col,bl,smoothstep(.87,1.,v)*.65);
float ln=length(r);col=mix(col,nt,smoothstep(.5,.95,ln)*.4);
float vein=abs(fract(v*5.+ln*1.6)-.5);col+=go*smoothstep(.03,0.,vein)*.22*smoothstep(.3,.8,v);
#ifdef DER
vec3 n=normalize(vec3(-vec2(dFdx(v),dFdy(v))*uR.y*.2,1.));
col+=pow(max(dot(n,normalize(vec3(-.5,.6,.62))),0.),26.)*.42*vec3(1.,.93,.95)*smoothstep(.15,.6,v);
#endif
vec2 lp=(uv-uRect.xy)/uRect.zw;
vec2 tv=clamp((lp-.5)*uS+.5+(r+q*.5)*.03*(1.+k*4.),0.,1.);
vec3 ph=texture2D(uI,tv).rgb;float L=dot(ph,vec3(.299,.587,.114));
vec3 gr=mix(nt,rb,smoothstep(.03,.5,L));gr=mix(gr,bl,smoothstep(.6,.98,L));ph=mix(ph,gr,.38);
float e=uPt>.5?lp.y:lp.x;
float mk=smoothstep(0.,.45,e+(v-.5)*.85)*(1.-smoothstep(.8,1.,v)*.45)*uHI;
col=mix(col,ph,mk*.94);
col*=1.-.32*smoothstep(.55,1.25,length((uv-.5)*vec2(as,1.)));
float R=(1.-uB)*1.35*max(as,1.);
col+=mix(ro,bl,.4)*exp(-abs(bd-R)*12.)*uB*1.6;
col=mix(col,bl,uB*uB*.45*smoothstep(R+.2,0.,bd));
gl_FragColor=vec4(col,1.);}`;
    const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    const pr = gl.createProgram();
    if (!vs || !fs) { root.classList.add('no-gl'); return; }
    gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { root.classList.add('no-gl'); return; }
    gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {}; ['uR', 'uM', 'uS', 'uT', 'uV', 'uB', 'uHI', 'uPt', 'uRect', 'uI'].forEach(n => { U[n] = gl.getUniformLocation(pr, n); });
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([60, 10, 25]));
    [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]].forEach(([a, b]) => gl.texParameteri(gl.TEXTURE_2D, a, b));
    gl.uniform1i(U.uI, 0);
    let hasImg = 0, ia = 1800 / 2248;
    const img = new Image();
    img.onload = () => { gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img); ia = img.naturalWidth / img.naturalHeight; hasImg = 1; size(); };
    img.src = ($('.hero__photo img') || {}).currentSrc || 'assets/img/product-gloss-red.webp';
    let w = 0, h = 0, portrait = false;
    function size() {
      const r = hero.getBoundingClientRect(), sc = (W.innerWidth < 760 ? 0.55 : 0.5) * DPR;
      w = Math.max(2, Math.round(r.width * sc)); h = Math.max(2, Math.round(r.height * sc));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      gl.viewport(0, 0, w, h);
      portrait = r.width / r.height < 0.9;
      const rect = portrait ? [0, 0.36, 1, 0.64] : [0.34, 0, 0.66, 1];
      const ra = (rect[2] * r.width) / (rect[3] * r.height);
      gl.uniform4f(U.uRect, rect[0], rect[1], rect[2], rect[3]);
      gl.uniform2f(U.uS, ra > ia ? 1 : ra / ia, ra > ia ? ia / ra : 1);
      gl.uniform2f(U.uR, w, h); gl.uniform1f(U.uPt, portrait ? 1 : 0);
    }
    size(); W.addEventListener('resize', size);
    const m = { x: 0.62, y: 0.55, tx: 0.62, ty: 0.55, v: 0, act: 0 };
    hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); m.tx = (e.clientX - r.left) / r.width; m.ty = 1 - (e.clientY - r.top) / r.height; m.act = performance.now(); });
    let B = 1, b0 = 0, first = true, vis = true;
    const start = () => { if (!b0) b0 = performance.now(); };
    if (root.classList.contains('is-loaded')) start(); else d.addEventListener('rr:loaded', start);
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); off(draw); root.classList.remove('has-gl'); root.classList.add('no-gl'); });
    const T0 = performance.now();
    function draw(now) {
      if (!vis) return;
      if (now - m.act > 2500) { const t = now * 0.00025; m.tx = 0.6 + 0.22 * Math.sin(t * 1.3); m.ty = 0.5 + 0.22 * Math.cos(t); }
      const px = m.x, py = m.y;
      m.x = lerp(m.x, m.tx, 0.045); m.y = lerp(m.y, m.ty, 0.045);
      m.v = lerp(m.v, Math.hypot(m.x - px, m.y - py), 0.2);
      if (b0) { const p = clamp((now - b0) / 1900, 0, 1); B = Math.pow(1 - p, 2.2); }
      gl.uniform1f(U.uT, (now - T0) / 1000 + 12); gl.uniform2f(U.uM, m.x, m.y); gl.uniform1f(U.uV, m.v);
      gl.uniform1f(U.uB, B); gl.uniform1f(U.uHI, hasImg);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (first) { first = false; root.classList.add('has-gl'); }
    }
    seen(hero, v => { vis = v; if (v) on(draw); else off(draw); }, '0px');
    on(draw);
  })();

  /* ---------- 2 · cursor + pigment trail (pointer:fine, desktop) ---------- */
  if (FINE && !RM && W.innerWidth >= 900) (() => {
    const cur = d.createElement('div'); cur.className = 'cursor'; cur.setAttribute('aria-hidden', 'true');
    cur.innerHTML = '<span class="cursor__ring"></span><span class="cursor__dot"></span><span class="cursor__label"></span>';
    const tc = d.createElement('canvas'); tc.className = 'trail'; tc.setAttribute('aria-hidden', 'true');
    d.body.append(tc, cur);
    root.classList.add('has-cursor');
    const lab = $('.cursor__label', cur), ring = $('.cursor__ring', cur), dot = $('.cursor__dot', cur);
    const ctx = tc.getContext('2d'); const TS = 0.5 * DPR;
    const sz = () => { tc.width = Math.round(W.innerWidth * TS); tc.height = Math.round(W.innerHeight * TS); };
    sz(); W.addEventListener('resize', sz);
    const p = { x: -100, y: -100, rx: -100, ry: -100, lx: null, ly: null, t: 0 };
    let idle = 0;
    d.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; p.x = e.clientX; p.y = e.clientY; p.t = performance.now(); on(tick); }, { passive: true });
    d.addEventListener('pointerleave', () => cur.classList.add('is-hidden'));
    d.addEventListener('pointerenter', () => cur.classList.remove('is-hidden'));
    function stamp(x, y, r, a) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(234,81,116,' + a + ')'); g.addColorStop(0.5, 'rgba(184,18,63,' + a * 0.45 + ')'); g.addColorStop(1, 'rgba(184,18,63,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
    }
    function tick(now) {
      p.rx = lerp(p.rx, p.x, 0.22); p.ry = lerp(p.ry, p.y, 0.22);
      cur.style.transform = 'translate3d(' + p.rx.toFixed(1) + 'px,' + p.ry.toFixed(1) + 'px,0)';
      dot.style.transform = 'translate3d(' + (p.x - p.rx).toFixed(1) + 'px,' + (p.y - p.ry).toFixed(1) + 'px,0)';
      ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,.055)'; ctx.fillRect(0, 0, tc.width, tc.height);
      ctx.globalCompositeOperation = 'source-over';
      if (p.lx !== null) {
        const dx = p.x - p.lx, dy = p.y - p.ly, dist = Math.hypot(dx, dy), n = Math.min(24, Math.ceil(dist / 7));
        for (let i = 1; i <= n; i++) { const k = i / n; stamp((p.lx + dx * k) * TS, (p.ly + dy * k) * TS, (22 + Math.min(dist, 80) * 0.35) * TS, 0.13); }
      }
      p.lx = p.x; p.ly = p.y;
      if (now - p.t > 2600) { if (++idle > 30) { ctx.clearRect(0, 0, tc.width, tc.height); off(tick); idle = 0; } } else idle = 0;
    }
    d.addEventListener('pointerover', e => {
      const el = e.target.closest('[data-cursor],a,button,summary,label,input,textarea');
      cur.classList.remove('is-hover', 'is-label', 'is-lens');
      if (!el) { cur.classList.remove('is-hidden'); return; }
      const k = el.dataset.cursor;
      if (/INPUT|TEXTAREA/.test(el.tagName)) cur.classList.add('is-hidden');
      else { cur.classList.remove('is-hidden'); if (k === 'lens') cur.classList.add('is-lens'); else if (k === 'view' || k === 'drag') { lab.textContent = RR.t('cur.' + k); cur.classList.add('is-label'); } else cur.classList.add('is-hover'); }
    });
  })();

  /* ---------- 4 · kinetic type rows ---------- */
  const kin = $('.kin');
  if (kin && !RM) (() => {
    const rows = $$('[data-kin]', kin).map(r => ({ dir: +r.dataset.kin, tr: $('.kin__track', r), half: 0 }));
    const meas = () => rows.forEach(r => { r.half = r.tr.scrollWidth / 2; });
    meas(); W.addEventListener('resize', meas); d.addEventListener('rr:lang', meas);
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(meas);
    let ly = W.scrollY, vel = 0;
    const T0 = performance.now();
    function run(now) {
      const y = W.scrollY; vel = lerp(vel, y - ly, 0.12); ly = y;
      const base = (now - T0) * 0.045 + y * 0.6, sk = clamp(vel * 0.12, -9, 9);
      rows.forEach(r => {
        if (!r.half) return;
        const o = base % r.half, x = r.dir > 0 ? -o : -(r.half - o);
        r.tr.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0) skewX(' + (-sk * r.dir).toFixed(2) + 'deg)';
      });
    }
    seen(kin, v => v ? on(run) : off(run));
  })();

  /* ---------- 5 · lens / microscope ---------- */
  const lens = $('.lens');
  if (lens) (() => {
    const tk = $('.lens__reticle .tk', lens);
    if (tk) { let s = ''; for (let i = 0; i < 72; i++) { const a = i * Math.PI / 36, r2 = i % 6 ? 94 : 88; s += 'M' + (99 * Math.cos(a)).toFixed(1) + ' ' + (99 * Math.sin(a)).toFixed(1) + 'L' + (r2 * Math.cos(a)).toFixed(1) + ' ' + (r2 * Math.sin(a)).toFixed(1); } tk.setAttribute('d', s); }
    const ret = $('.lens__reticle', lens), hudV = $$('[data-hud]', lens), bars = $$('[data-bar]', lens);
    const s = { x: 0, y: 0, tx: 0, ty: 0, w: 1, h: 1, r: 120, act: 0, n: 0 };
    const meas = () => { s.w = lens.clientWidth; s.h = lens.clientHeight; s.r = ret.offsetWidth / 2; if (!s.x) { s.x = s.tx = s.w * 0.5; s.y = s.ty = s.h * 0.5; } };
    meas(); W.addEventListener('resize', meas);
    function put(now) {
      const st = lens.style, x = s.x, y = s.y, fx = x / s.w, fy = y / s.h;
      st.setProperty('--x', x.toFixed(1) + 'px'); st.setProperty('--y', y.toFixed(1) + 'px');
      st.setProperty('--alt', clamp((fx - 0.42) * 6, 0, 1).toFixed(2));
      const right = x + s.r + 230 < s.w;
      st.setProperty('--hx', (right ? x + s.r + 28 : x - s.r - 228).toFixed(0) + 'px');
      st.setProperty('--hy', clamp(y - 70, 20, s.h - 190).toFixed(0) + 'px');
      if (s.n++ % 5) return;
      const v = [0.38 + 0.5 * fy, 5.2 + 1.8 * fx, 0.94 + 0.05 * Math.sin((now || 0) * 0.002)];
      hudV[0].textContent = v[0].toFixed(2); hudV[1].textContent = v[1].toFixed(1); hudV[2].textContent = v[2].toFixed(2);
      hudV[3].textContent = fx.toFixed(3); hudV[4].textContent = fy.toFixed(3);
      bars[0].style.setProperty('--v', fy.toFixed(2)); bars[1].style.setProperty('--v', fx.toFixed(2)); bars[2].style.setProperty('--v', (v[2] - 0.85) * 6);
    }
    lens.addEventListener('pointermove', e => { const r = lens.getBoundingClientRect(); s.tx = e.clientX - r.left; s.ty = e.clientY - r.top; s.act = performance.now(); if (RM) { s.x = s.tx; s.y = s.ty; put(0); } });
    put(0);
    if (RM) return;
    function run(now) {
      if (now - s.act > 1800) { const t = now * 0.001; s.tx = s.w * (0.5 + 0.3 * Math.sin(t * 0.37)); s.ty = s.h * (0.5 + 0.26 * Math.sin(t * 0.53 + 1.2)); }
      s.x = lerp(s.x, s.tx, 0.09); s.y = lerp(s.y, s.ty, 0.09); put(now);
    }
    seen(lens, v => v ? on(run) : off(run));
  })();

  /* ---------- 6 · shade explorer liquid drop ---------- */
  const stage = $('.stage');
  if (stage) (() => {
    const paths = $$('.blob', stage), base = $('.blob--base', stage), rip = $('.stage__ripples', stage);
    const N = 9, ph = Array.from({ length: N }, (_, i) => [Math.random() * 6.28, 0.6 + Math.random() * 0.7, Math.random() * 6.28]);
    let col = null, from = null, to = null, c0 = 0, pop = 0;
    function shape(t) {
      const pts = [];
      for (let i = 0; i < N; i++) {
        const a = i / N * 6.2832, q = ph[i];
        const r = 196 * (1 + 0.06 * Math.sin(t * q[1] + q[0]) + 0.035 * Math.sin(t * 1.7 * q[1] + q[2]) + pop * 0.09 * Math.sin(t * 9 + i * 2.1));
        pts.push([r * Math.cos(a), r * Math.sin(a)]);
      }
      let dd = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
      for (let i = 0; i < N; i++) {
        const p0 = pts[(i - 1 + N) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
        dd += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
      }
      paths.forEach(p => p.setAttribute('d', dd + 'Z'));
    }
    const setCol = c => { col = c; base.setAttribute('fill', hx(c)); };
    d.addEventListener('rr:shade', e => {
      const c = rgb(e.detail.color);
      if (!col || RM || e.detail.silent) { setCol(c); if (RM) shape(0); return; }
      from = col.slice(); to = c; c0 = performance.now(); pop = 1;
      const ci = d.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ci.setAttribute('r', '200'); ci.setAttribute('stroke', e.detail.color); rip.appendChild(ci);
      setTimeout(() => ci.remove(), 1400);
    });
    const s0 = (stage.closest('.classic') || stage).style.getPropertyValue('--shade');
    if (s0) setCol(rgb(s0.trim()));
    shape(0);
    if (RM) return;
    function run(now) {
      if (to) { const k = clamp((now - c0) / 650, 0, 1); setCol(mix(from, to, 1 - Math.pow(1 - k, 3))); if (k === 1) to = null; }
      pop = Math.max(0, pop - 0.018);
      shape(now / 1000);
    }
    seen(stage, v => v ? on(run) : off(run));
  })();

  /* ---------- 8 · process pipette flow ---------- */
  const flow = $('.flow');
  if (flow) (() => {
    const svg = $('.flow__svg', flow), trk = $('.flow__track', flow), liq = $('.flow__liquid', flow), drop = $('.flow__drop', flow);
    const steps = $$('.step', flow);
    let len = 0, nodes = [];
    function build() {
      const fr = flow.getBoundingClientRect();
      nodes = steps.map(s => { const n = $('.step__n', s).getBoundingClientRect(); return [n.left + n.width / 2 - fr.left, n.top + n.height / 2 - fr.top]; });
      if (!nodes.length) return;
      svg.setAttribute('viewBox', '0 0 ' + fr.width.toFixed(0) + ' ' + fr.height.toFixed(0));
      let dd = 'M' + nodes[0][0].toFixed(1) + ' 0L' + nodes[0][0].toFixed(1) + ' ' + nodes[0][1].toFixed(1);
      for (let i = 1; i < nodes.length; i++) {
        const a = nodes[i - 1], b = nodes[i], dy = b[1] - a[1], wob = Math.abs(b[0] - a[0]) < 40 ? 34 * (i % 2 ? 1 : -1) : 0;
        dd += 'C' + (a[0] + wob).toFixed(1) + ' ' + (a[1] + dy * 0.55).toFixed(1) + ' ' + (b[0] + wob).toFixed(1) + ' ' + (b[1] - dy * 0.55).toFixed(1) + ' ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1);
      }
      const last = nodes[nodes.length - 1];
      dd += 'L' + last[0].toFixed(1) + ' ' + fr.height.toFixed(1);
      trk.setAttribute('d', dd); liq.setAttribute('d', dd);
      len = liq.getTotalLength();
      liq.style.strokeDasharray = len + ' ' + len;
      upd();
    }
    function upd() {
      if (!len) return;
      if (RM) { liq.style.strokeDashoffset = 0; drop.style.display = 'none'; steps.forEach(s => s.classList.add('is-active')); return; }
      const fr = flow.getBoundingClientRect(), ty = W.innerHeight * 0.6 - fr.top;
      let lo = 0, hi = len;
      for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (liq.getPointAtLength(mid).y < ty) lo = mid; else hi = mid; }
      const L0 = lo, pt = liq.getPointAtLength(L0), pt2 = liq.getPointAtLength(Math.min(len, L0 + 2));
      liq.style.strokeDashoffset = (len - L0).toFixed(1);
      const ang = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 57.3 - 90;
      drop.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ') rotate(' + ang.toFixed(1) + ')');
      drop.style.opacity = L0 > 4 && L0 < len - 4 ? 1 : 0;
      steps.forEach((s, i) => s.classList.toggle('is-active', nodes[i] && nodes[i][1] <= pt.y + 2));
    }
    let tk = false;
    W.addEventListener('scroll', () => { if (!tk) { tk = true; requestAnimationFrame(() => { tk = false; upd(); }); } }, { passive: true });
    W.addEventListener('resize', build); W.addEventListener('load', build); d.addEventListener('rr:lang', () => setTimeout(build, 50)); d.addEventListener('rr:layout', build);
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(build);
    build();
  })();

  /* ---------- 10 · vision dot-matrix map ---------- */
  const map = $('.map__cv');
  if (map) (() => {
    const bits = atob(MAPB64), C = 150, R = 56, LON0 = -120, LON1 = 90, LAT0 = 78, SPAN = 134.4;
    const land = (c, r) => (bits.charCodeAt((r * C + c) >> 3) >> ((r * C + c) & 7)) & 1;
    const NODES = [[-46.63, -23.55], [2.21, 48.82], [28.98, 41.01]];
    const ctx = map.getContext('2d'), layer = d.createElement('canvas'), lc = layer.getContext('2d');
    let w = 0, h = 0, pts = [], prog = RM ? 1 : 0, vis = false;
    const xy = (lon, lat) => [(lon - LON0) / (LON1 - LON0) * w, (LAT0 - lat) / SPAN * h];
    function build() {
      const r = map.getBoundingClientRect(); if (!r.width) return;
      w = Math.round(r.width * DPR); h = Math.round(r.height * DPR);
      map.width = layer.width = w; map.height = layer.height = h;
      pts = NODES.map(n => xy(n[0], n[1]));
      const sp = w / ((LON1 - LON0) / 2.4), dr = Math.max(0.9 * DPR, sp * 0.2), skip = sp < 7 * DPR ? 2 : 1;
      lc.clearRect(0, 0, w, h);
      for (let rr = 0; rr < R; rr += skip) for (let c = 0; c < C; c += skip) {
        const lon = -180 + (c + 0.5) * 2.4; if (lon < LON0 || lon > LON1 || !land(c, rr)) continue;
        const [x, y] = xy(lon, LAT0 - (rr + 0.5) * 2.4);
        let g = 0; pts.forEach(p => { g = Math.max(g, Math.exp(-Math.hypot(x - p[0], y - p[1]) / (w * 0.07))); });
        lc.fillStyle = g > 0.25 ? 'rgba(244,139,165,' + (0.3 + g * 0.6).toFixed(2) + ')' : 'rgba(251,246,242,' + (0.16 + g * 0.5).toFixed(2) + ')';
        lc.beginPath(); lc.arc(x, y, dr * (1 + g * 0.5), 0, 6.2832); lc.fill();
      }
      paint(performance.now());
    }
    const qp = (a, b, lift, t) => { const cx = (a[0] + b[0]) / 2, cy = Math.min(a[1], b[1]) - lift; const u = 1 - t; return [u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cy + t * t * b[1]]; };
    function arc(a, b, lift, t0, t1, style, lw) {
      ctx.beginPath(); for (let i = 0; i <= 40; i++) { const p = qp(a, b, lift, t0 + (t1 - t0) * i / 40); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
      ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.stroke();
    }
    function paint(now) {
      if (!w) return;
      ctx.clearRect(0, 0, w, h); ctx.drawImage(layer, 0, 0);
      const A = [[pts[0], pts[1], h * 0.42], [pts[1], pts[2], h * 0.12]];
      ctx.lineCap = 'round';
      A.forEach((a, i) => {
        const p = clamp(prog * 2 - i * 0.6, 0, 1);
        if (p <= 0) return;
        arc(a[0], a[1], a[2], 0, p, 'rgba(234,81,116,.55)', 1.6 * DPR);
        ctx.shadowColor = 'rgba(247,217,223,.9)'; ctx.shadowBlur = 14 * DPR;
        const hd = RM ? 1 : ((now / 2600 + i * 0.4) % 1) * p;
        arc(a[0], a[1], a[2], Math.max(0, hd - 0.16), hd, 'rgba(251,246,242,.95)', 2.6 * DPR);
        ctx.shadowBlur = 0;
      });
      pts.forEach((p, i) => {
        const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], w * 0.05);
        g.addColorStop(0, i === 1 ? 'rgba(217,176,114,.55)' : 'rgba(234,81,116,.5)'); g.addColorStop(1, 'rgba(234,81,116,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], w * 0.05, 0, 6.2832); ctx.fill();
        if (!RM) { const k = ((now / 1800) + i * 0.33) % 1; ctx.strokeStyle = 'rgba(247,217,223,' + (1 - k).toFixed(2) + ')'; ctx.lineWidth = DPR; ctx.beginPath(); ctx.arc(p[0], p[1], (6 + k * 34) * DPR, 0, 6.2832); ctx.stroke(); }
      });
    }
    let t0 = 0;
    function run(now) { if (!t0) t0 = now; prog = Math.min(1, (now - t0) / 2400); paint(now); }
    W.addEventListener('resize', build); build();
    seen(map, v => { vis = v; if (RM) { if (v) paint(0); return; } v ? on(run) : off(run); });
  })();
})();
