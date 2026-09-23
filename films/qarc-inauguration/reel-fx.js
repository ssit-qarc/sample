'use strict';
// ============================================================
// MOTION DETAIL FOR THE REEL. The small drawn effects that make each action
// read on a phone: sparkles, pings, speed lines, dust, impact ticks, dizzy
// stars, a drawn pencil, an eye that looks, and the cat's own secondary
// motion (a swaying tail drawn as its own cel, breathing on holds).
// Everything is a pure function of time and a seed. Effects are exposed on
// twos, like the drawings, so a pair of frames shares its marks.
// ============================================================
const GOLD = '#f2b53c';
const bez2 = (a, b, c, u) => [(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * b[0] + u * u * c[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * b[1] + u * u * c[1]];
// life of a small effect: pops in with an overshoot, then shrinks away
const popLife = (u, inn = .25) => u <= 0 || u >= 1 ? 0 : u < inn ? easeOutBack(u / inn, 2.2) : 1 - easeIn((u - inn) / (1 - inn));

// ---------------- sparkles ----------------
// A four-pointed sparkle with concave sides and a pale core.
function sparkle(c, x, y, r, { rot = 0, color = GOLD, al = 1, core = '#fffaf0' } = {}) {
  if (r <= .4 || al <= 0) return; c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha *= al; c.fillStyle = color; c.beginPath();
  const tip = k => [Math.cos(k * Math.PI / 2 - Math.PI / 2) * r, Math.sin(k * Math.PI / 2 - Math.PI / 2) * r];
  c.moveTo(...tip(0)); for (let k = 1; k <= 4; k++) { const a = tip(k - 1), b = tip(k % 4); c.quadraticCurveTo((a[0] + b[0]) * .1, (a[1] + b[1]) * .1, b[0], b[1]); }
  c.closePath(); c.fill(); c.fillStyle = core; c.beginPath(); c.arc(0, 0, r * .17, 0, TAU); c.fill(); c.restore();
}
// n sparkles thrown outward from a point at t0; each one pops and shrinks.
function burst(c, x, y, t, t0, { n = 7, R = 110, dur = .7, size = 16, seed = 1, colors = [GOLD, COL.orange, '#ffe6a3'], dots = true } = {}) {
  const tq = twos(t), u0 = (tq - t0) / dur; if (u0 <= 0 || u0 >= 1.3) return;
  for (let i = 0; i < n; i++) { const a = i / n * TAU + (hash(i, seed) - .5) * .7, d = R * (.65 + .5 * hash(i, seed + 1)), del = hash(i, seed + 2) * .18, u = clamp((u0 - del) / (1 - del * .5), 0, 1.2);
    if (u <= 0 || u >= 1) continue; const k = easeOut(u), px = x + Math.cos(a) * d * k, py = y + Math.sin(a) * d * k - 14 * Math.sin(Math.PI * u);
    sparkle(c, px, py, size * (.6 + .6 * hash(i, seed + 3)) * popLife(u, .2), { rot: a * .5, color: colors[i % colors.length] });
    if (dots) { c.save(); c.globalAlpha *= (1 - u) * .8; c.fillStyle = colors[(i + 1) % colors.length]; c.beginPath(); c.arc(x + Math.cos(a + .35) * d * k * .62, y + Math.sin(a + .35) * d * k * .62, 3.2 * (1 - u) + 1, 0, TAU); c.fill(); c.restore(); } }
}
// sparkles that pop in and out at fixed places, on staggered times (a glint around something finished)
function twinkles(c, pts, t, t0, t1, { period = 1.5, size = 15, seed = 3, color = GOLD } = {}) {
  if (t < t0 || t > t1 + period) return; const tq = twos(t);
  pts.forEach((p, i) => { const ph = hash(i, seed) * period, u = ((tq - t0 - ph) % period + period) % period / (period * .55);
    if (tq - t0 - ph < 0 || tq > t1 + ph) return; sparkle(c, p[0], p[1], size * (.7 + .5 * hash(i, seed + 1)) * popLife(u, .3), { rot: hash(i, seed + 2), color }); });
}

// ---------------- pencil effects ----------------
function pencilRing(c, id, x, y, r, o = {}) { if (r <= 1) return; pencil(c, 'ring/' + id + '/' + Math.round(r), ellPts(x, y, r, r * (o.squash ?? 1), 0, Math.max(24, Math.round(r / 5))), { w: 2, close: true, ...o }); }
// rings that spread from a point: the instant something is touched
function ping(c, id, x, y, t, t0, { R = 90, r0 = 20, dur = .5, n = 2, gap = .1, color = COL.navy, w = 2.2, squash = 1 } = {}) {
  const tq = twos(t); for (let k = 0; k < n; k++) { const u = (tq - t0 - k * gap) / dur; if (u <= 0 || u >= 1) continue;
    pencilRing(c, id + '/' + k, x, y, r0 + R * easeOut(u), { color, w, al: (1 - u) * .9, squash }); }
}
// speed lines: pencil streaks trailing behind something that moves along dir (radians)
function motionLines(c, id, x, y, dir, { n = 4, len = 90, spread = 70, gap = 30, al = .7, w = 1.8, color = COL.graphite, seed = 1 } = {}) {
  if (al <= .02 || len < 4) return; const dx = Math.cos(dir), dy = Math.sin(dir), px = -dy, py = dx;
  for (let i = 0; i < n; i++) { const off = (i - (n - 1) / 2) * spread / Math.max(1, n - 1) + (hash(i, seed) - .5) * 10, L = len * (.55 + .6 * hash(i, seed + 1)), g = gap + hash(i, seed + 2) * 24;
    const x0 = x - dx * g + px * off, y0 = y - dy * g + py * off; pencil(c, 'speed/' + id + '/' + i + '/' + Math.round(L / 6), [[x0, y0], [x0 - dx * L * .5 + px * 1.5, y0 - dy * L * .5 + py * 1.5], [x0 - dx * L, y0 - dy * L]], { w, color, al: al * (.6 + .4 * hash(i, seed + 3)), pressure: [[0, .9], [.4, 1], [1, .15]] }); }
}
// dust puffs rolling out along the table from a contact
function puffs(c, id, x, y, t, t0, { n = 3, dur = .5, spread = 60, size = 9, dirs = [-1, 1] } = {}) {
  const u = (twos(t) - t0) / dur; if (u < 0 || u > 1) return;
  for (const s of dirs) for (let i = 0; i < n; i++) { const px = x + s * (spread + u * spread * .9 + i * 22), py = y - 6 - i * 10 - u * 16, r = size + i * 3 + u * 11;
    pencil(c, 'puff/' + id + '/' + s + i + '/' + Math.round(u * 12), ellPts(px, py, r, r * .7, 0, 14).slice(0, 11), { w: 1.6, al: (1 - u) * .9 }); }
}
// impact ticks: short strokes radiating from a contact for a few frames
function impact(c, id, x, y, t, t0, { n = 5, r0 = 30, len = 26, dur = .2, from = -Math.PI, to = 0, w = 2, color = COL.graphite } = {}) {
  const u = (twos(t) - t0) / dur; if (u < 0 || u > 1) return;
  for (let i = 0; i < n; i++) { const a = lerp(from, to, n === 1 ? .5 : i / (n - 1)), r1 = r0 + u * 16, r2 = r1 + len * (1 - u * .5);
    pencil(c, 'hit/' + id + '/' + i + '/' + Math.round(u * 6), [[x + Math.cos(a) * r1, y + Math.sin(a) * r1], [x + Math.cos(a) * r2, y + Math.sin(a) * r2]], { w, color, al: 1 - u * .6 }); }
}
// a five-pointed star, filled, with a pencil edge (dizzy stars, the tagline's confetti in 2D)
function star5(c, x, y, r, { rot = 0, color = GOLD, al = 1, edge = true } = {}) {
  if (r <= .5) return; const P = []; for (let k = 0; k < 10; k++) { const a = rot - Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .45 : r; P.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  c.save(); c.globalAlpha *= al; c.fillStyle = color; c.fill(curvePath(P, true, .3)); if (edge) { c.strokeStyle = alpha(COL.graphite, .8); c.lineWidth = 1.4; c.lineJoin = 'round'; c.stroke(polyPath(P)); } c.restore();
}
// three stars circling a dizzy head, the near ones bigger
function dizzyStars(c, x, y, t, t0, t1, { rx = 78, ry = 18 } = {}) {
  if (t < t0 || t > t1) return; const tq = twos(t), k = sm(t0, t0 + .25, tq) * (1 - sm(t1 - .3, t1, tq));
  const items = [0, 1, 2].map(i => { const a = (tq - t0) * 5.2 + i * TAU / 3; return { a, x: x + Math.cos(a) * rx, y: y + Math.sin(a) * ry, s: 1 + .28 * Math.sin(a) }; }).sort((p, q) => p.s - q.s);
  for (const it of items) star5(c, it.x, it.y, 13 * it.s * k, { rot: it.a * .6, color: it.s > 1 ? GOLD : '#e9cf86' });
}

// ---------------- a pencil, drawn: it draws the box on the first page ----------------
// Tip at (x, y); the body leans back along ang (radians, pointing from tip to eraser).
function drawnPencil(c, x, y, ang, { al = 1, len = 300 } = {}) {
  if (al <= 0) return; c.save(); c.translate(x, y); c.rotate(ang); c.globalAlpha *= al;
  const w = 13, cone = 44, body = [[cone, -w], [len - 34, -w], [len - 34, w], [cone, w]], ferrule = [[len - 34, -w - 1], [len - 12, -w - 1], [len - 12, w + 1], [len - 34, w + 1]], eraser = [[len - 12, -w], [len + 4, -w + 2], [len + 6, 0], [len + 4, w - 2], [len - 12, w]];
  c.fillStyle = '#f2c230'; c.fill(polyPath(body)); c.fillStyle = '#d9a91f'; c.fill(polyPath([[cone, 2], [len - 34, 2], [len - 34, w], [cone, w]]));
  c.fillStyle = '#e7cfa8'; c.fill(polyPath([[0, 0], [cone, -w], [cone, w]])); c.fillStyle = '#3b342e'; c.fill(polyPath([[0, 0], [14, -4.2], [14, 4.2]]));
  c.fillStyle = '#c9ccd1'; c.fill(polyPath(ferrule)); c.fillStyle = '#e88f9a'; c.fill(curvePath(eraser, true, .6));
  pencil(c, 'pen/body', [...body, body[0]], { w: 1.8, corner: .5 }); pencil(c, 'pen/cone', [[cone, -w], [0, 0], [cone, w]], { w: 1.8, corner: .5 });
  pencil(c, 'pen/ferrule', [...ferrule, ferrule[0]], { w: 1.5, corner: .5, al: .8 }); pencil(c, 'pen/rib', [[cone + 6, 1], [len - 40, 1]], { w: 1.1, al: .5 });
  c.restore();
}

// ---------------- "until you look": an eye is drawn above the box, opens and looks down ----------------
function lookEye(c, x, y, t, { t0 = 10.1, t1 = 12.4, blink = 11.35 } = {}) {
  if (t < t0 || t > t1) return; const tq = twos(t), draw = sm(t0, t0 + .45, tq, t => t), fade = 1 - sm(t1 - .35, t1, tq);
  let open = sm(t0 + .4, t0 + .7, tq, easeOutBack); const b = (tq - blink) / .2; if (b > 0 && b < 1) open *= Math.abs(Math.cos(b * Math.PI));
  const w = 92, h = 50 * open; c.save(); c.globalAlpha *= fade;
  if (open > .05) { c.save(); c.beginPath(); c.moveTo(-w + x, y); c.quadraticCurveTo(x, y - h * 2, x + w, y); c.quadraticCurveTo(x, y + h * 1.6, x - w, y); c.clip();
    c.fillStyle = '#fffdf6'; c.fillRect(x - w, y - h * 2, w * 2, h * 4); const look = sm(t0 + .7, t0 + 1.1, tq), px = x + 4 * look, py = y + 16 * look;
    c.fillStyle = COL.iris; c.beginPath(); c.arc(px, py, 28, 0, TAU); c.fill(); c.fillStyle = COL.pupil; c.beginPath(); c.arc(px, py + 2, 13, 0, TAU); c.fill();
    c.fillStyle = '#fffdf6'; c.beginPath(); c.arc(px - 8, py - 8, 5, 0, TAU); c.fill(); c.restore(); }
  const upper = [[x - w, y], [x - w * .5, y - h * .95], [x, y - h * 1.1], [x + w * .5, y - h * .95], [x + w, y]], lower = [[x - w, y], [x - w * .5, y + h * .72], [x, y + h * .82], [x + w * .5, y + h * .72], [x + w, y]];
  pencil(c, 'eye/up/' + Math.round(h), upper, { w: 3, progress: draw }); pencil(c, 'eye/low/' + Math.round(h), lower, { w: 2.4, progress: clamp(draw * 1.3 - .3, 0, 1) });
  if (open > .5) for (let i = 0; i < 5; i++) { const u = .18 + i * .16, p = [lerp(x - w, x + w, u), y - h * 1.1 * Math.sin(Math.PI * u) * .98], a = -Math.PI / 2 + (u - .5) * 1.5;
    pencil(c, 'eye/lash/' + i + '/' + Math.round(h), [p, [p[0] + Math.cos(a) * 20, p[1] + Math.sin(a) * 20]], { w: 2 }); }
  c.restore();
}

// ---------------- the cat, alive between the drawings ----------------
// The body is the whole drawing without its tail (q.noTail); the tail is its own cel behind it,
// bent by a slow travelling wave, so a held pose still breathes and the tail keeps thinking.
function swayTail(tail, t, amp, period = 2.7) {
  const out = tail.map(p => p.slice()), n = out.length; if (!amp) return out;
  for (let i = 1; i < n - 1; i++) { const w = .5 + .5 * i / (n - 1), d = amp * w * Math.sin(TAU * t / period - i * .7) * .55;
    for (let j = i + 1; j < n; j++) out[j] = rotAbout(out[j], out[i], d); }
  return out;
}
const _catQ = new Map(), _tailCels = new Map();
function catData(id, fn) { let q = _catQ.get(id); if (!q) { q = fn(); _catQ.set(id, q); if (_catQ.size > 80) _catQ.delete(_catQ.keys().next().value); } return q; }
function tailCel(key, tail) {
  const hit = _tailCels.get(key); if (hit) return hit;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of tail) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  x0 -= 34; y0 -= 34; x1 += 34; y1 += 34; const dpi = Math.max(.6, 2.2 * S), cv = document.createElement('canvas'); cv.width = Math.ceil((x1 - x0) * dpi); cv.height = Math.ceil((y1 - y0) * dpi);
  const g = cv.getContext('2d'); g.scale(dpi, dpi); g.translate(-x0, -y0); catTailCel(g, tail);
  const cel = { cv, box: [x0, y0, x1 - x0, y1 - y0] }; _tailCels.set(key, cel); if (_tailCels.size > 6) _tailCels.delete(_tailCels.keys().next().value); return cel;
}
// sway: tail wave amplitude (radians), breath: 0..1 weight of the breathing on a hold
function drawCatLive(c, id, fn, { x = 0, y = 0, scale = 1, rot = 0, al = 1, t = 0, sway = 0, breath = 0 } = {}) {
  const q = catData(id, fn), tq = twos(t), b = breath ? breath * breathe(tq, 3.1) : 0, sx = 1 - .005 * b, sy = 1 + .012 * b, swq = Math.round(sway * 200) / 200;
  const tail = swayTail(q.tail, tq, swq), cel = tailCel(id + '|' + swq + '|' + (swq ? Math.round(tq * 12) : 0), tail), body = catSprite('nt:' + id, { ...q, noTail: true });
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(scale * sx, scale * sy); c.globalAlpha *= al;
  c.drawImage(cel.cv, cel.box[0], cel.box[1], cel.box[2], cel.box[3]); c.drawImage(body.canvas, CAT_BOX[0], CAT_BOX[1], CAT_BOX[2], CAT_BOX[3]); c.restore();
}

// ---------------- the sapling, alive ----------------
// grow 0..1 as before, plus a spring in the rise and a breeze in the leaves once it stands.
function drawSaplingLive(c, x, y, grow, t, s = 1) {
  if (grow <= 0) return; const tq = twos(t); c.save(); c.translate(x, y); c.scale(s, s);
  const hk = clamp(grow / .55, 0, 1), h = 170 * (hk < 1 ? easeOutBack(hk, 1.3) : 1), done = clamp((grow - .6) / .4, 0, 1);
  const sway = .05 * Math.sin(tq * 2.3) * done + .03 * Math.sin(tq * 3.7 + 1) * (1 - done) * hk, bendAt = f => sway * h * f * f;
  const stem = [[0, 0], [-6 + bendAt(.35), -h * .35], [4 + bendAt(.7), -h * .7], [bendAt(1), -h]];
  pencil(c, 'sap/stem/' + Math.round(h) + '/' + Math.round(sway * 400), stem, { w: 3.4, color: '#3c6e3f' });
  const leaf = (id, f, dx, ang, len, k, ph) => { if (k <= 0) return; const L = len * easeOutBack(clamp(k, 0, 1), 1.9), fl = (.07 * Math.sin(tq * 3.1 + ph) + sway * 1.2) * done, pts = [[0, 0], [L * .35, -L * .22], [L * .8, -L * .16], [L, 0], [L * .8, L * .16], [L * .35, L * .2]];
    c.save(); c.translate(dx + bendAt(f), -h * f); c.rotate(ang + fl); c.fillStyle = COL.green; c.fill(curvePath(pts, true, .7)); c.fillStyle = alpha('#9fd08a', .5); c.fill(curvePath([[L * .1, -2], [L * .5, -L * .15], [L * .9, -2]], true, 1));
    pencil(c, 'leaf/' + id + '/' + Math.round(L), [...pts, pts[0]], { w: 2, color: '#2f5a33', corner: .6 }); pencil(c, 'leaf/' + id + '/vein' + Math.round(L), [[4, 0], [L * .85, -1]], { w: 1.2, color: '#2f5a33', al: .7 }); c.restore(); };
  const k1 = (grow - .35) / .35, k2 = (grow - .6) / .35;
  leaf('a', .98, 0, -2.4, 74, k1, 0); leaf('b', .98, 0, -.7, 74, k1, 1.7);
  leaf('c', .55, -3, -2.9, 58, k2, 2.9); leaf('d', .6, 2, -.25, 58, k2, 4.1);
  c.restore();
}
