'use strict';
/*
 * Reel-Kern: alles, was laut STYLE.md Teil A für jedes Reel gilt.
 * Look, Captions, Enthüllung, schwarze Karten, Bewegungsunschärfe, Vorschau.
 * Ein Werkzeug (formel/, treppe/ …) liefert nur sein Bild und seine Kamera:
 *
 *   createReel({
 *     build(spec, ctx, plan)   // plan.beats/duration stehen schon; Werkzeug ergänzt eigene Daten und Cues
 *     leadFor(beat)            // Sekunden bis zur ersten Caption eines Beats
 *     drawWorld(ctx, plan, t, grid)
 *     motionPx(plan, t, dt)    // geschätzte Pixelbewegung in dt (für Bewegungsunschärfe)
 *   })
 */
const W = 1080, H = 1920;
const FONT = "'ReelDisplay', 'Inter Display', 'Inter', system-ui, sans-serif";
const CAP = 0.727; // Versalhöhe von Inter in em

const COL = {
  bg: '#F7F5F6', ink: '#141213', hub: '#292725', hubLine: 'rgba(247,245,246,0.92)',
  card: '#0B090A', white: '#FFFFFF',
};

// Feste Bildschirm-Positionen und Größen (1080 × 1920).
const ST = {
  captionY: 520, captionSmall: 60, captionBig: 100, captionMaxW: 940,
  headerY: 452, headerSize: 66, outroCaptionY: 1580,
  cardY: 800, cardSmall: 60, cardBig: 104,
  footY: 514, footSize: 26, footLine: 37, // Hinweiszeilen direkt unter der Überschrift (unten verdeckt die Instagram-Leiste)
};

// Gemeinsames Timing in Sekunden.
const TC = {
  typeLead: 0.10, perChar: 0.065, minType: 0.30, maxType: 0.55, caret: 0.30,
  wordIn: 0.13, cardLead: 0.12, tail: 0.05,
};

// ---------- Helfer ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, p) => a + (b - a) * p;
const ease = {
  linear: p => p,
  outCubic: p => 1 - Math.pow(1 - p, 3),
  inOutQuad: p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
  inOutCubic: p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  inOutQuart: p => (p < 0.5 ? 8 * p * p * p * p : 1 - Math.pow(-2 * p + 2, 4) / 2),
};
const deg = d => (d * Math.PI) / 180;
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function setFont(ctx, size, weight) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.letterSpacing = `${(-0.035 * size).toFixed(2)}px`;
}
function textW(ctx, s, size, weight) { setFont(ctx, size, weight); return ctx.measureText(s).width; }

// ---------- Beats und Captions ----------
function parsePhrase(raw) {
  // "kleine Wörter | *große Wörter*" ; '|' = Zeilenumbruch, *…* = groß.
  // Getrennt wird nur an normalen Leerzeichen: ein geschütztes Leerzeichen ( ) hält z. B. "500 €" zusammen.
  const text = typeof raw === 'string' ? raw : raw.text;
  const lines = text.split('|').map(line => {
    const words = []; let big = false;
    for (const tok of line.trim().split(/[ \t\n]+/).filter(Boolean)) {
      let w = tok; const opens = w.startsWith('*'); if (opens) { big = true; w = w.slice(1); }
      const closes = w.endsWith('*'); if (closes) w = w.slice(0, -1);
      words.push({ text: w, big });
      if (closes) big = false;
    }
    return words;
  });
  return { lines, at: typeof raw === 'object' ? raw.at : undefined, x: typeof raw === 'object' ? raw.x : undefined };
}

function makePlan(spec) {
  const beats = []; let t = 0;
  for (const b of spec.timeline) { beats.push({ ...b, start: t, end: t + b.dur }); t += b.dur; }
  const plan = { spec, beats, duration: t, warnings: [], phrases: [], cues: [] };
  for (const b of beats) {
    if (b.type === 'card') plan.cues.push({ kind: 'cardIn', t: +b.start.toFixed(3) });
    if (b.type === 'outro') plan.cues.push({ kind: 'outro', t: +b.start.toFixed(3) });
  }
  return plan;
}

function planCaptions(plan, leadFor) {
  plan.beats.forEach((b, bi) => {
    const list = b.type === 'card' ? (b.text ? [b.text] : []) : (b.captions || []);
    if (!list.length) return;
    const phrases = list.map(parsePhrase);
    const lead = b.type === 'card' ? TC.cardLead : leadFor(b);
    const winStart = b.start + lead, winEnd = b.end - TC.tail - (b.type === 'card' ? 0.35 : 0);
    const total = phrases.reduce((s, p) => s + p.lines.flat().length, 0);
    const slot = (winEnd - winStart) / Math.max(1, total);
    let k = 0;
    phrases.forEach((p, pi) => {
      const words = p.lines.flat();
      const pStart = p.at !== undefined ? b.start + p.at : winStart + k * slot;
      const next = phrases[pi + 1];
      const pEnd = next ? (next.at !== undefined ? b.start + next.at : winStart + (k + words.length) * slot) : b.end;
      // Karten bauen schnell auf und halten die Pointe; sonst max. 0,32 s pro Wort.
      const wSlot = Math.min(b.type === 'card' ? 0.2 : 0.32, (pEnd - pStart) / (words.length + (next ? 0.6 : 0)));
      words.forEach((w, wi) => { w.t = pStart + wi * wSlot; });
      if (slot < 0.2 && p.at === undefined) plan.warnings.push(`Beat ${bi} (${b.type}): ${slot.toFixed(2)} s pro Wort – zu schnell zum Mitlesen. Beat verlängern oder Text kürzen.`);
      plan.phrases.push({ ...p, beat: bi, kind: b.type, start: pStart, end: pEnd, seed: bi * 17 + pi });
      k += words.length;
    });
  });
}

function beatAt(plan, t) {
  for (const b of plan.beats) if (t >= b.start && t < b.end) return b;
  return plan.beats[plan.beats.length - 1];
}

// ---------- Enthüllung: schwarzer Balken -> tippt sich frei -> Cursor ----------
function typeWindow(start, text, perChar = TC.perChar, maxType = TC.maxType) {
  return { typeStart: start, typeEnd: start + clamp(text.length * perChar, TC.minType, maxType) };
}
function addTypeCue(plan, win, text) {
  plan.cues.push({ kind: 'type', t: +win.typeStart.toFixed(3), dur: +(win.typeEnd - win.typeStart).toFixed(3), chars: text.length });
}

function drawTyped(ctx, text, win, t, x, cy, size, weight = 600, opts = {}) {
  const { align = 'center', alpha = 1, color = COL.ink } = opts;
  setFont(ctx, size, weight);
  const full = ctx.measureText(text).width;
  const x0 = align === 'center' ? x - full / 2 : align === 'right' ? x - full : x;
  const capH = size * CAP, base = cy + capH / 2;
  ctx.save();
  ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  if (t < win.typeStart) { ctx.fillRect(x0, cy - capH * 0.6, full, capH * 1.2); ctx.restore(); return; }
  const typing = t < win.typeEnd;
  const k = typing ? Math.floor(text.length * clamp((t - win.typeStart) / (win.typeEnd - win.typeStart))) : text.length;
  const typed = text.slice(0, k);
  ctx.fillText(typed, x0, base);
  const tw = k ? ctx.measureText(typed).width : 0;
  if (typing) ctx.fillRect(x0 + tw, cy - capH * 0.6, Math.max(full - tw, size * 0.5), capH * 1.2);
  else if (t < win.typeEnd + TC.caret) ctx.fillRect(x0 + full + size * 0.05, cy - capH * 0.75, Math.max(2, size * 0.045), capH * 1.5);
  ctx.restore();
}

// ---------- Punktraster ----------
function makeGrid(dark) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); const step = 18;
  for (let y = step / 2; y < H; y += step) for (let x = step / 2; x < W; x += step) {
    const dx = (x - W / 2) / (W / 2), dy = (y - H * 0.42) / (H * 0.6);
    const fall = clamp(1 - 0.55 * Math.sqrt(dx * dx + dy * dy));
    g.fillStyle = dark ? `rgba(255,255,255,${0.055 * fall})` : `rgba(20,18,19,${0.12 * fall})`;
    g.beginPath(); g.arc(x, y, 1.3, 0, Math.PI * 2); g.fill();
  }
  const v = g.createRadialGradient(W / 2, H * 0.45, H * 0.2, W / 2, H * 0.45, H * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, dark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.035)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  return c;
}

// ---------- Captions ----------
function layoutPhrase(ctx, p, small, big, maxW) {
  let scale = 1, lines;
  for (let pass = 0; pass < 6; pass++) {
    lines = p.lines.map(words => {
      const items = words.map(w => {
        const size = (w.big ? big : small) * scale, weight = w.big ? 700 : 600;
        return { w, size, weight, width: textW(ctx, w.text, size, weight) };
      });
      const gap = small * scale * 0.26;
      const width = items.reduce((s, it) => s + it.width, 0) + gap * Math.max(0, items.length - 1);
      const lineSize = Math.max(...items.map(it => it.size));
      return { items, gap, width, lineSize };
    });
    const widest = Math.max(...lines.map(l => l.width));
    if (widest <= maxW) break;
    scale *= maxW / widest;
  }
  return lines;
}

function drawPhrase(ctx, p, t, y0, color, small, big, center) {
  const lines = p._layout || (p._layout = layoutPhrase(ctx, p, small, big, ST.captionMaxW));
  const widest = Math.max(...lines.map(l => l.width));
  let cx = center ? W / 2 : (p.x !== undefined ? p.x : W / 2 + (hash(p.seed) - 0.5) * 180);
  cx = clamp(cx, (W - ST.captionMaxW) / 2 + widest / 2, W - (W - ST.captionMaxW) / 2 - widest / 2);
  let base = y0;
  lines.forEach((line, li) => {
    if (li) base += line.lineSize * 1.0; // eng gestapelt, aber mit Luft für Umlaute (Ä, Ö, Ü)
    let x = cx - line.width / 2;
    for (const it of line.items) {
      const pr = clamp((t - it.w.t) / TC.wordIn);
      if (pr > 0) {
        const e = ease.outCubic(pr);
        ctx.save();
        ctx.globalAlpha = e; ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        if (pr < 1) ctx.filter = `blur(${((1 - e) * 12).toFixed(1)}px)`;
        const s = 1 + 0.12 * (1 - e), mx = x + it.width / 2, my = base - it.size * CAP / 2;
        ctx.translate(mx, my); ctx.scale(s, s); ctx.translate(-mx, -my);
        setFont(ctx, it.size, it.weight); ctx.fillText(it.w.text, x, base + (1 - e) * 8);
        ctx.restore();
      }
      x += it.width + line.gap;
    }
  });
}

// ---------- Engine ----------
function createReel(tool) {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const acc = document.createElement('canvas'); acc.width = W; acc.height = H;
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
  let plan = null, gridLight = null, gridDark = null, fps = 30;

  function renderWorldBlurred(t) {
    // Geschätzte Pixelbewegung pro Frame -> Anzahl Unterbilder (180°-Verschluss), damit Unschärfe glatt statt gestuft wirkt.
    const px = tool.motionPx(plan, t, 1 / fps);
    if (px < 4) { tool.drawWorld(ctx, plan, t, gridLight); return; }
    const K = Math.min(32, Math.max(4, Math.ceil(px / 2 / 3))), a = acc.getContext('2d'), b = tmp.getContext('2d');
    for (let k = 0; k < K; k++) {
      const tk = t + ((k / (K - 1)) - 0.5) * (0.5 / fps);
      tool.drawWorld(b, plan, tk, gridLight);
      a.globalAlpha = 1 / (k + 1); a.drawImage(tmp, 0, 0);
    }
    a.globalAlpha = 1; ctx.drawImage(acc, 0, 0);
  }

  function draw(t) {
    const beat = beatAt(plan, t);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'none'; ctx.globalAlpha = 1;
    if (beat.type === 'card') {
      ctx.fillStyle = COL.card; ctx.fillRect(0, 0, W, H); ctx.drawImage(gridDark, 0, 0);
      for (const p of plan.phrases) if (p.beat === plan.beats.indexOf(beat)) drawPhrase(ctx, p, t, ST.cardY, COL.white, ST.cardSmall, ST.cardBig, true);
      ctx.restore(); return;
    }
    renderWorldBlurred(t);
    for (const p of plan.phrases) {
      if (p.kind === 'card' || t < p.start || t >= p.end) continue;
      const y = p.kind === 'outro' ? ST.outroCaptionY : ST.captionY;
      drawPhrase(ctx, p, t, y, COL.ink, ST.captionSmall, ST.captionBig, p.kind === 'outro');
    }
    const outro = plan.beats.find(b => b.type === 'outro');
    if (outro && t >= outro.start) {
      if (outro.header) {
        const hp = plan._header || (plan._header = { lines: parsePhrase(`*${outro.header}*`).lines, seed: 0 });
        hp.lines.flat().forEach(w => { w.t = outro.start + 0.12; });
        drawPhrase(ctx, hp, t, ST.headerY, COL.ink, ST.headerSize, ST.headerSize, true);
      }
      if (outro.footnote) {
        // Pflicht-Hinweise (z. B. "keine Garantie"): klein, ruhig, erst wenn das Gesamtbild steht.
        const a = ease.outCubic(clamp((t - outro.start - leadForOutro) / 0.4));
        ctx.globalAlpha = 0.62 * a; ctx.fillStyle = COL.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.font = `600 ${ST.footSize}px ${FONT}`; ctx.letterSpacing = '0px';
        outro.footnote.split('|').forEach((line, i) => ctx.fillText(line.trim(), W / 2, ST.footY + i * ST.footLine));
      }
    }
    ctx.restore();
  }
  let leadForOutro = 1;

  async function load(spec, opts = {}) {
    fps = opts.fps || spec.meta?.fps || 30;
    await Promise.all([document.fonts.load(`600 40px ReelDisplay`), document.fonts.load(`700 40px ReelDisplay`)]);
    plan = makePlan(spec);
    tool.build(spec, ctx, plan);
    planCaptions(plan, tool.leadFor);
    const outro = plan.beats.find(b => b.type === 'outro');
    if (outro) leadForOutro = tool.leadFor(outro);
    plan.cues.sort((a, b) => a.t - b.t);
    gridLight = makeGrid(false); gridDark = makeGrid(true);
    return info();
  }

  function info() {
    return { duration: plan.duration, fps, cues: plan.cues, warnings: plan.warnings, facts: plan.facts || null,
      beats: plan.beats.map(b => ({ type: b.type, start: +b.start.toFixed(3), end: +b.end.toFixed(3) })) };
  }

  function frame(t, type = 'image/png', quality) { draw(t); return canvas.toDataURL(type, quality); }
  const REEL = { load, draw, frame, info };
  window.REEL = REEL;
  bootPreview(REEL);
  return REEL;
}

// ---------- Vorschau-Modus (Browser) ----------
async function bootPreview(REEL) {
  const q = new URLSearchParams(location.search);
  if (q.get('render') === '1') { document.body.className = 'render'; return; }
  document.body.className = 'preview';
  const warn = document.getElementById('warn');
  const specPath = q.get('spec');
  if (!specPath) { warn.textContent = 'URL-Parameter ?spec=beispiele/<datei>.json fehlt.'; return; }
  const spec = await (await fetch(specPath)).json();
  const inf = await REEL.load(spec);
  warn.textContent = inf.warnings.join('\n');
  const ui = document.getElementById('ui'); ui.hidden = false;
  const scrub = document.getElementById('scrub'), time = document.getElementById('time'), btn = document.getElementById('play');
  let t = 0, playing = false, last = 0;
  const show = () => { REEL.draw(t); scrub.value = String(Math.round((t / inf.duration) * 1000)); time.textContent = `${t.toFixed(2)} s`; };
  const loop = now => { if (!playing) return; t += (now - last) / 1000; last = now; if (t >= inf.duration) t = 0; show(); requestAnimationFrame(loop); };
  const toggle = () => { playing = !playing; btn.textContent = playing ? '❚❚' : '▶︎'; if (playing) { last = performance.now(); requestAnimationFrame(loop); } };
  btn.onclick = toggle;
  scrub.oninput = () => { t = (scrub.value / 1000) * inf.duration; show(); };
  addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); toggle(); } });
  show();
}
