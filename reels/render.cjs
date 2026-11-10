#!/usr/bin/env node
/*
 * Reel rendern: Spec (JSON) -> MP4 (1080x1920) + Cue-Liste für Sounds.
 * Das Werkzeug ergibt sich aus dem Ordner der Spec: reels/<werkzeug>/beispiele/<name>.json
 *
 *   node reels/render.cjs reels/formel/beispiele/bu-check-aerzte.json
 *   node reels/render.cjs <spec> --out reel.mp4 --fps 30
 *   node reels/render.cjs <spec> --stills 1.2,4.5,20     # nur Standbilder (QA)
 *   node reels/render.cjs <spec> --draft                 # 15 fps, schneller
 *   node reels/render.cjs <spec> --preview               # Vorschau im Browser
 *
 * Braucht: Node 18+, ffmpeg im PATH, Playwright mit Chromium (npm i -D playwright && npx playwright install chromium).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const ROOT = __dirname; // reels/
const MIME = { '.html': 'text/html', '.json': 'application/json', '.otf': 'font/otf', '.js': 'text/javascript' };

function parseArgs(argv) {
  const a = { spec: null, out: null, fps: null, stills: null, draft: false, preview: false };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === '--out') a.out = argv[++i];
    else if (v === '--fps') a.fps = Number(argv[++i]);
    else if (v === '--stills') a.stills = argv[++i].split(',').map(Number);
    else if (v === '--draft') a.draft = true;
    else if (v === '--preview') a.preview = true;
    else if (!a.spec) a.spec = v;
  }
  if (!a.spec) { console.error('Aufruf: node reels/render.cjs <spec.json> [--out x.mp4] [--fps 30] [--draft] [--stills t1,t2] [--preview]'); process.exit(1); }
  return a;
}

function serve() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
      const file = path.resolve(ROOT, rel);
      if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const specAbs = path.resolve(args.spec);
  if (!specAbs.startsWith(ROOT + path.sep)) { console.error('Die Spec muss unter reels/ liegen.'); process.exit(1); }
  const tool = path.relative(ROOT, specAbs).split(path.sep)[0];
  if (!fs.existsSync(path.join(ROOT, tool, 'engine.html'))) { console.error(`Kein Werkzeug "${tool}" (reels/${tool}/engine.html fehlt).`); process.exit(1); }
  const specRel = path.relative(path.join(ROOT, tool), specAbs).split(path.sep).join('/');
  const spec = JSON.parse(fs.readFileSync(specAbs, 'utf8'));
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/${tool}/engine.html`;

  if (args.preview) {
    console.log(`Vorschau: ${base}?spec=${encodeURIComponent(specRel)}  (Strg+C beendet)`);
    return;
  }

  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('Seitenfehler:', e.message));
  await page.goto(`${base}?render=1`);
  const fps = args.fps || (args.draft ? 15 : spec.meta?.fps || 30);
  const info = await page.evaluate(([s, f]) => window.REEL.load(s, { fps: f }), [spec, fps]);
  for (const w of info.warnings) console.warn('WARNUNG:', w);
  if (info.facts) console.log('Berechnete Werte:', JSON.stringify(info.facts));

  const stem = specAbs.replace(/\.json$/, '');
  if (args.stills) {
    for (const t of args.stills) {
      const url = await page.evaluate(tt => window.REEL.frame(tt), t);
      const file = `${stem}.still-${t.toFixed(2)}.png`;
      fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
      console.log('Standbild:', path.relative(process.cwd(), file));
    }
    await browser.close(); server.close(); return;
  }

  const out = path.resolve(args.out || `${stem}${args.draft ? '.draft' : ''}.mp4`);
  const frames = Math.round(info.duration * fps);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', args.draft ? 'veryfast' : 'slow', '-crf', args.draft ? '23' : '15', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error(`ffmpeg Exit ${c}`)))));
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    const url = await page.evaluate(tt => window.REEL.frame(tt), i / fps);
    const buf = Buffer.from(url.split(',')[1], 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % fps === 0) process.stdout.write(`\r${(i / fps).toFixed(0)} / ${info.duration.toFixed(1)} s`);
  }
  ff.stdin.end(); await done;
  process.stdout.write(`\rFertig in ${((Date.now() - t0) / 1000).toFixed(0)} s: ${path.relative(process.cwd(), out)}\n`);
  const cuesFile = out.replace(/\.mp4$/, '.cues.json');
  fs.writeFileSync(cuesFile, JSON.stringify({ duration: info.duration, fps, cues: info.cues, beats: info.beats }, null, 2));
  console.log('Sound-Cues:', path.relative(process.cwd(), cuesFile));
  await browser.close(); server.close();
}

main().catch(e => { console.error(e); process.exit(1); });
