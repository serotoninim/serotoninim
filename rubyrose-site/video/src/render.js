#!/usr/bin/env node
/* Ruby Rose France story — deterministic frame renderer.
   Serves rubyrose-site/ over a tiny local HTTP server, opens video/src/scene.html,
   and for each frame calls window.__seek(frame / fps), waits two animation frames, screenshots.
   usage: node render.js --lang fr --out /path/frames [--fps 30] [--scale 1] [--from 0] [--to 750] [--workers 3] [--check] */
const http = require('http'), fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i < 0 ? d : (A[i + 1] && !A[i + 1].startsWith('--') ? A[i + 1] : true); };
const LANG = arg('lang', 'fr'), FPS = +arg('fps', 30), SCALE = +arg('scale', 1), DUR = +arg('dur', 25);
const OUT = path.resolve(arg('out', '/tmp/rr-frames')), WORKERS = +arg('workers', 3), CHECK = !!arg('check', false);
const N = Math.round(DUR * FPS), FROM = +arg('from', 0), TO = Math.min(+arg('to', N), N);
const TIMES = arg('times', null);
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const p = path.normalize(decodeURIComponent(req.url.split('?')[0])); const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/video/src/scene.html?lang=${LANG}` + (arg('q', '') ? '&' + arg('q', '') : '');
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  let jobs = TIMES ? String(TIMES).split(',').map((s, i) => ({ i, t: +s })) : Array.from({ length: TO - FROM }, (_, k) => ({ i: FROM + k, t: (FROM + k) / FPS }));
  const total = jobs.length; let done = 0; const t0 = Date.now(); const issues = {};
  const chunks = Array.from({ length: WORKERS }, (_, w) => jobs.filter((_, k) => k % WORKERS === w));
  await Promise.all(chunks.map(async list => {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: SCALE });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.error('pageerror', e.message));
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(() => window.__ready);
    for (const j of list) {
      await page.evaluate(t => window.__seek(t), j.t);
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      if (CHECK) { const b = await page.evaluate(() => window.__check()); if (b.length) issues[j.t.toFixed(2)] = b; }
      await page.screenshot({ path: path.join(OUT, 'frame_' + String(j.i).padStart(4, '0') + '.png'), type: 'png' });
      if (++done % 50 === 0 || done === total) process.stdout.write(`  ${done}/${total} frames  ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
    }
    await ctx.close();
  }));
  await browser.close(); server.close();
  if (CHECK) { const k = Object.keys(issues); console.log(k.length ? 'SAFE-ZONE ISSUES:\n' + k.map(t => '  t=' + t + ' ' + issues[t].join(' | ')).join('\n') : 'safe-zone check: clean'); }
})().catch(e => { console.error(e); process.exit(1); });
