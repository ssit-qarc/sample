'use strict';
// ============================================================
// PROPS: the box, the coin, the yarn and its thread, the pot, the sapling,
// the watering can, and handwritten captions. Contours use the same graphite
// brush as the cat (narrow interrupted passes), with an optional draw-on
// progress. Every mark is seeded by its id, so a held prop holds its marks.
// ============================================================
const HAND = 'Kalam', PRINT = 'Poppins';
const pencilCache = new Map();
function pencilGeom(id, pts, width, close, corner = Math.PI, pressure = PRESS) {
  const key = id + '|' + width + '|' + close + '|' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(';');
  let g = pencilCache.get(key); if (g) return g;
  g = compileCel({ strokes: [{ id, points: pts, width, close, corner, pressure }] }, { id: 'prop' }).strokes[0];
  pencilCache.set(key, g); if (pencilCache.size > 900) pencilCache.delete(pencilCache.keys().next().value); return g;
}
// One pencil stroke. progress 0..1 draws it on along its length.
const PROP_LINE = 1.3;   // props sit beside the cat, so their contours carry similar weight
function pencil(c, id, pts, { w = 2.6, color = COL.graphite, al = 1, progress = 1, close = false, corner, pressure } = {}) {
  if (progress <= 0 || pts.length < 2) return; const s = pencilGeom(id, pts, w * PROP_LINE, close, corner, pressure);
  c.save(); c.lineCap = 'butt'; c.lineJoin = 'round'; c.strokeStyle = color; const base = c.globalAlpha * al;
  for (let pass = 0; pass < 3; pass++) { const spread = (pass - 1) * s.width * .30;
    const at = a => { const d = (noise1(a.u * 5 + pass * 11, s.seed) * .20 + spread) * Math.sin(Math.PI * a.u); return [a.p[0] - a.tangent[1] * d, a.p[1] + a.tangent[0] * d]; };
    for (let i = 1; i < s.samples.length; i++) { const a = s.samples[i - 1], b = s.samples[i]; if (a.u > progress) break; const tooth = hash(i * 3 + pass, s.seed);
      if (tooth < .08 + .10 * (1 - Math.min(1, b.w / s.width))) continue; const pr = Math.max(.04, (a.w + b.w) / 2);
      c.lineWidth = Math.max(.18, pr * .40); c.globalAlpha = base * (.34 + tooth * .30); c.beginPath(); c.moveTo(...at(a)); c.lineTo(...at(b)); c.stroke(); } }
  c.restore();
}
const quadPts = q => [q[0], q[1], q[2], q[3]];
const addV = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];

// ---------------- the box ----------------
const BOX_D = [.52, -.40];
function boxGeom({ x, y, w = 310, h = 220, d = 160 }) {
  const dv = [BOX_D[0] * d, BOX_D[1] * d], FL = [x - w / 2, y], FR = [x + w / 2, y], TL = [x - w / 2, y - h], TR = [x + w / 2, y - h];
  return { x, y, w, h, d, dv, FL, FR, TL, TR, BTL: addV(TL, dv), BTR: addV(TR, dv), BFR: addV(FR, dv) };
}
function flapQuad(G, side, theta) {
  const half = G.w / 2, v = side < 0 ? [Math.cos(theta) * half, -Math.sin(theta) * half] : [-Math.cos(theta) * half, -Math.sin(theta) * half];
  const A = side < 0 ? G.TL : G.TR, B = side < 0 ? G.BTL : G.BTR; return [A, B, addV(B, v), addV(A, v)];
}
const KRAFT = { front: '#dcb47c', side: '#c49a62', top: '#e6c38f', inside: '#7d5a36', flapIn: '#b98e58', tape: 'rgba(250,244,226,.72)' };
// progress: draw-on 0..1 (outline first, then the kraft colour). xray: 0..1 turns it into a see-through diagram.
// seq(id) -> 0..1, optional: each line draws on in its own window (one pencil going round the box) instead of all together.
function drawBox(c, G, { open = 0, progress = 1, xray = 0, inside = null, label = 1, seq = null } = {}) {
  const fill = clamp((progress - .55) / .45, 0, 1) * (1 - xray * .82), line = (id, pts, o = {}) => pencil(c, 'box/' + id, pts, { w: 2.8, progress: seq ? seq(id) : clamp(progress / .6, 0, 1), ...o });
  const thL = open * Math.PI * .95, thR = open * Math.PI * .6;   // left flap falls open flat; the right flap stops short of lining up with the depth edge
  const top = [G.TL, G.TR, G.BTR, G.BTL], side = [G.TR, G.BTR, G.BFR, G.FR], front = [G.TL, G.TR, G.FR, G.FL];
  const flap = (sideK, th, id) => { const Q = flapQuad(G, sideK, th); const inner = th > Math.PI / 2;
    if (fill > 0) { c.save(); c.globalAlpha *= fill; c.fillStyle = inner ? KRAFT.flapIn : KRAFT.top; c.fill(polyPath(Q)); if (!inner && open < .02) { c.fillStyle = KRAFT.tape; } c.restore(); }
    line(id, [...Q, Q[0]], { w: 2.5, corner: .5 }); };
  // contact shadow on the table
  if (fill > 0) { c.save(); c.globalAlpha *= fill * .5; hatch(c, polyPath([addV(G.FL, [-10, 2]), addV(G.BFR, [40, 2]), addV(G.BFR, [70, 14]), addV(G.FL, [30, 16])]), [G.FL[0] - 20, G.FL[1] - 10, G.w + 200, 40], { angle: .15, gap: 5, len: 22, jitter: 4, color: COL.graphite, alpha: .5, width: 1, seed: 7 }); c.restore(); }
  if (open > 0) { if (fill > 0) { c.save(); c.globalAlpha *= fill; c.fillStyle = KRAFT.inside; c.fill(polyPath(top)); c.restore(); } line('rim/back', [G.TL, G.BTL, G.BTR, G.TR], { w: 2.4, corner: .5 }); }
  const behind = [];
  if (thL > Math.PI / 2) behind.push(() => flap(-1, thL, 'flapL')); if (thR > Math.PI / 2) behind.push(() => flap(1, thR, 'flapR'));
  behind.forEach(f => f());
  if (inside) inside(c);
  if (fill > 0) { c.save(); c.globalAlpha *= fill; c.fillStyle = KRAFT.side; c.fill(polyPath(side)); c.fillStyle = KRAFT.front; c.fill(polyPath(front)); c.restore();
    c.save(); c.globalAlpha *= fill; graphite(c, polyPath(side), [G.TR[0], G.BTR[1], G.d, G.h + G.d], { seed: 21, color: '#8a6a45', tone: () => .5, direction: () => 1.3 }); c.restore(); }
  if (xray > 0) { c.save(); c.setLineDash([9, 7]); c.strokeStyle = alpha(COL.navy, .8 * xray); c.lineWidth = 2; c.stroke(polyPath(front)); c.stroke(polyPath(side)); c.stroke(polyPath(top)); c.restore(); }
  const solid = 1 - xray;
  c.save(); c.globalAlpha *= Math.max(.12, solid);
  line('front', [G.FL, G.TL, G.TR, G.FR, G.FL], { corner: .5 }); line('side', [G.TR, G.BTR, G.BFR, G.FR], { corner: .5 });
  if (open === 0) { line('top', [G.TL, G.BTL, G.BTR, G.TR], { corner: .5 }); line('seam', [lerp2(G.TL, G.TR, .5), lerp2(G.BTL, G.BTR, .5)], { w: 1.8 });
    if (fill > 0) { c.save(); c.globalAlpha *= fill; const m0 = lerp2(G.TL, G.TR, .5), m1 = lerp2(G.BTL, G.BTR, .5); c.fillStyle = KRAFT.tape; c.fill(polyPath([addV(m0, [-18, 0]), addV(m0, [18, 0]), addV(m1, [18, 0]), addV(m1, [-18, 0])])); c.fillRect(m0[0] - 18, m0[1], 36, 54); c.restore(); } }
  // corrugated edge ticks and the label
  for (let i = 0; i < 9; i++) { const u = (i + .5) / 9, p = lerp2(G.TL, G.TR, u); line('flute/' + i, [addV(p, [0, 6]), addV(p, [1, 16])], { w: 1.2, al: .6 }); }
  if (label > 0 && fill > 0) { c.save(); c.globalAlpha *= fill * label; c.translate(G.x - 6, G.y - G.h * .46); c.rotate(-.035); c.fillStyle = '#fbf6ea'; c.fillRect(-122, -40, 244, 80); c.strokeStyle = alpha(COL.graphite, .5); c.lineWidth = 1.2; c.strokeRect(-122, -40, 244, 80);
    c.fillStyle = COL.navy; c.font = `700 34px ${HAND}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('DO NOT OBSERVE', 0, -4); c.font = `400 19px ${HAND}`; c.fillStyle = COL.graphite; c.fillText('contents: one cat (probably)', 0, 26); c.restore(); }
  c.restore();
  if (thL <= Math.PI / 2) flap(-1, thL, 'flapL'); if (thR <= Math.PI / 2) flap(1, thR, 'flapR');
}

// ---------------- the coin ----------------
// angle: rotation about its vertical axis (0 shows the 0 face). spin: 0..1 turns a fast spin into a sphere of both faces.
function drawCoin(c, x, y, { r = 50, angle = 0, spin = 0, lift = 0, tilt = 0, roll = 0, shadow = 1 } = {}) {
  c.save(); c.translate(x, y - r - lift); c.rotate(tilt);
  const k = Math.cos(angle), wv = Math.abs(k), face = k >= 0 ? '0' : '1', edge = 9;
  if (spin < 1) { c.save(); c.globalAlpha *= 1 - spin;
    const rx = Math.max(edge * .5, r * wv); c.fillStyle = '#b8862c'; c.beginPath(); c.ellipse(k >= 0 ? -edge * .4 * (1 - wv) : edge * .4 * (1 - wv), 0, Math.max(3, rx), r, 0, 0, TAU); c.fill();
    c.fillStyle = '#e9bd4c'; c.beginPath(); c.ellipse(0, 0, Math.max(1.5, rx - edge * (1 - wv) * .6), r - 1, 0, 0, TAU); c.fill();
    if (wv > .08) { c.save(); c.scale(wv, 1); c.rotate(roll); c.strokeStyle = '#c4912f'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, r * .8, 0, TAU); c.stroke(); c.fillStyle = '#8a6420'; c.font = `700 ${r * 1.1}px ${PRINT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(face, 0, r * .06); c.restore();
      c.fillStyle = alpha('#fff7d8', .55); c.beginPath(); c.ellipse(-rx * .35, -r * .45, rx * .22, r * .18, -.5, 0, TAU); c.fill(); }
    pencil(c, 'coin/rim/' + Math.round(wv * 12), ellPts(0, 0, Math.max(3, rx), r, 0, 40), { w: 2.2, close: true }); c.restore(); }
  if (spin > 0) { c.save(); c.globalAlpha *= spin;
    const g = c.createRadialGradient(-r * .3, -r * .35, r * .1, 0, 0, r * 1.05); g.addColorStop(0, 'rgba(255,240,190,.95)'); g.addColorStop(.7, 'rgba(233,189,76,.55)'); g.addColorStop(1, 'rgba(196,145,47,.25)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.fillStyle = alpha('#8a6420', .55); c.font = `700 ${r * .9}px ${PRINT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('0', -r * .02, r * .05); c.fillText('1', r * .02, r * .05);
    c.strokeStyle = alpha(COL.navy, .7); c.lineWidth = 1.6; c.setLineDash([6, 6]); c.beginPath(); c.ellipse(0, 0, r, r * .28, 0, 0, TAU); c.stroke(); c.setLineDash([]);
    for (let i = 0; i < 5; i++) { const a0 = angle * .9 + i * 1.25; c.strokeStyle = alpha('#b8862c', .45); c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, r * (.3 + i * .15), r, 0, a0, a0 + .9); c.stroke(); }
    pencil(c, 'coin/sphere', ellPts(0, 0, r, r, 0, 40), { w: 2.2, close: true }); c.restore(); }
  c.restore();
  // shadow on the table
  if (shadow <= 0) return; c.save(); c.globalAlpha *= .22 * shadow; c.fillStyle = COL.graphite; c.beginPath(); c.ellipse(x, y + 3, r * (spin > .5 ? 1 : Math.max(.25, Math.abs(Math.cos(angle)))) * 1.05, 7, 0, 0, TAU); c.fill(); c.restore();
}

// ---------------- yarn ----------------
function drawYarn(c, x, y, { r = 58, rot = 0, seed = 1, glow = 0, shadow = 1 } = {}) {
  c.save(); c.translate(x, y - r);
  if (glow > 0) { const g = c.createRadialGradient(0, 0, r * .5, 0, 0, r * 2.2); g.addColorStop(0, alpha(COL.orange, .35 * glow)); g.addColorStop(1, alpha(COL.orange, 0)); c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * 2.2, 0, TAU); c.fill(); }
  c.fillStyle = '#3e6394'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
  c.save(); c.beginPath(); c.arc(0, 0, r - 1, 0, TAU); c.clip();
  const rr = rng(seed); c.strokeStyle = '#1f3a5c'; c.lineCap = 'round';
  for (let i = 0; i < 9; i++) { const a = rr() * Math.PI + rot, e = .25 + rr() * .5, off = (rr() - .5) * r * .5; c.lineWidth = 2.2 + rr() * 1.2; c.globalAlpha = .75;
    c.beginPath(); c.ellipse(Math.cos(a + 1.57) * off, Math.sin(a + 1.57) * off, r * 1.02, r * e, a, 0, TAU); c.stroke(); }
  c.globalAlpha = .3; c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(-r * .35, -r * .4, r * .32, r * .2, -.6, 0, TAU); c.fill(); c.restore();
  pencil(c, 'yarn/' + seed, ellPts(0, 0, r, r, 0, 44), { w: 2.4, color: '#1b2d47', close: true }); c.restore();
  if (shadow > 0) { c.save(); c.globalAlpha *= .2 * shadow; c.fillStyle = COL.graphite; c.beginPath(); c.ellipse(x, y + 2, r * .95, 8, 0, 0, TAU); c.fill(); c.restore(); }
}
// The navy thread: a clean continuous coloured-pencil line.
function strand(c, id, pts, { w = 3.2, color = COL.navy, progress = 1, al = 1 } = {}) { pencil(c, 'strand/' + id, pts, { w, color, progress, al, pressure: [[0, .7], [.5, 1], [1, .7]] }); }

// ---------------- pot, sapling, watering can, hand ----------------
function drawPot(c, x, y, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const body = [[-62, -104], [62, -104], [48, 0], [-48, 0]], rim = [[-72, -128], [72, -128], [72, -100], [-72, -100]];
  c.fillStyle = '#c8693a'; c.fill(polyPath(body)); c.fillStyle = '#d97c49'; c.fill(polyPath(rim)); c.fillStyle = '#5a3f2c'; c.beginPath(); c.ellipse(0, -128, 68, 11, 0, 0, TAU); c.fill();
  graphite(c, polyPath(body), [-64, -106, 128, 108], { seed: 31, color: '#8e4424', tone: (px) => clamp(.15 + px / 120, 0, .6), direction: () => 1.4 });
  pencil(c, 'pot/body', [body[0], body[3], body[2], body[1]], { w: 2.6, corner: .5 }); pencil(c, 'pot/rim', [...rim, rim[0]], { w: 2.6, corner: .5 }); pencil(c, 'pot/soil', ellPts(0, -128, 68, 11, 0, 30), { w: 1.6, close: true, al: .7 });
  c.restore();
  c.save(); c.globalAlpha *= .2; c.fillStyle = COL.graphite; c.beginPath(); c.ellipse(x, y + 3, 60 * s, 8 * s, 0, 0, TAU); c.fill(); c.restore();
}
// grow 0..1: the stem rises, then two, then four leaves unfurl.
function drawSapling(c, x, y, grow, s = 1) {
  if (grow <= 0) return; c.save(); c.translate(x, y); c.scale(s, s);
  const h = 170 * easeOut(clamp(grow / .55, 0, 1)), stem = [[0, 0], [-6, -h * .35], [4, -h * .7], [0, -h]];
  pencil(c, 'sap/stem/' + Math.round(h), stem, { w: 3.4, color: '#3c6e3f' });
  const leaf = (id, base, ang, len, k) => { if (k <= 0) return; const L = len * easeOutBack(clamp(k, 0, 1)), pts = [[0, 0], [L * .35, -L * .22], [L * .8, -L * .16], [L, 0], [L * .8, L * .16], [L * .35, L * .2]];
    c.save(); c.translate(...base); c.rotate(ang); c.fillStyle = COL.green; c.fill(curvePath(pts, true, .7)); c.fillStyle = alpha('#9fd08a', .5); c.fill(curvePath([[L * .1, -2], [L * .5, -L * .15], [L * .9, -2]], true, 1));
    pencil(c, 'leaf/' + id + '/' + Math.round(L), [...pts, pts[0]], { w: 2, color: '#2f5a33', corner: .6 }); pencil(c, 'leaf/' + id + '/vein' + Math.round(L), [[4, 0], [L * .85, -1]], { w: 1.2, color: '#2f5a33', al: .7 }); c.restore(); };
  const k1 = (grow - .35) / .35, k2 = (grow - .6) / .35;
  leaf('a', [0, -h * .98], -2.4, 74, k1); leaf('b', [0, -h * .98], -.7, 74, k1);
  leaf('c', [-3, -h * .55], -2.9, 58, k2); leaf('d', [2, -h * .6], -.25, 58, k2);
  c.restore();
}
// A hand holding a small watering can by its top handle. tilt: pouring angle. flip -1 points the spout right.
// canRose gives the sprinkler head in frame units for the same placement, so the water leaves the can.
function canRose(x, y, tilt = 0, flip = 1) { const p = rotAbout([-163, -26], [0, 0], tilt); return [x + p[0] * flip, y + p[1]]; }
function drawCan(c, x, y, tilt = 0, flip = 1) {
  c.save(); c.translate(x, y); c.scale(flip, 1); c.rotate(tilt);
  const body = [[-70, -40], [60, -40], [66, 60], [-76, 60]], spout = [[-66, 20], [-150, -30], [-158, -22], [-70, 44]], rose = [[-150, -42], [-176, -40], [-168, -10], [-146, -22]];
  c.fillStyle = '#8fb0c4'; c.fill(polyPath(body)); c.fill(polyPath(spout)); c.fillStyle = '#7897ab'; c.fill(polyPath(rose));
  graphite(c, polyPath(body), [-80, -45, 150, 110], { seed: 41, color: '#4d6778', tone: (px) => clamp(.1 + (px + 70) / 200, 0, .55), direction: () => 1.2 });
  pencil(c, 'can/body', [...body, body[0]], { w: 2.6, corner: .5 }); pencil(c, 'can/spout', [spout[0], spout[1], spout[2], spout[3]], { w: 2.4, corner: .5 }); pencil(c, 'can/rose', [...rose, rose[0]], { w: 2.2, corner: .5 });
  pencil(c, 'can/handle', [[-40, -40], [-30, -92], [30, -92], [40, -40]], { w: 3, corner: .7 });
  // an arm reaches in from outside the frame: shirt sleeve, forearm, then a fist round the top handle
  const sleeve = [[168, -330], [206, -300], [470, -640], [424, -676]], forearm = [[30, -122], [58, -102], [206, -300], [168, -330]];
  c.fillStyle = '#cfdcea'; c.fill(polyPath(sleeve)); graphite(c, polyPath(sleeve), [160, -680, 320, 390], { seed: 45, color: '#7d93ab', tone: () => .3, direction: () => .9 });
  pencil(c, 'arm/sleeve/a', [sleeve[0], sleeve[3]], { w: 2.4 }); pencil(c, 'arm/sleeve/b', [sleeve[1], sleeve[2]], { w: 2.4 }); pencil(c, 'arm/cuff', [sleeve[0], sleeve[1]], { w: 2.2 });
  for (let i = 0; i < 3; i++) pencil(c, 'arm/fold/' + i, [[236 + i * 52, -372 - i * 66], [252 + i * 52, -390 - i * 66], [262 + i * 52, -386 - i * 66]], { w: 1.3, al: .6 });
  c.fillStyle = '#c58c5c'; c.fill(polyPath(forearm)); pencil(c, 'arm/fore/a', [forearm[0], forearm[3]], { w: 2.3 }); pencil(c, 'arm/fore/b', [forearm[1], forearm[2]], { w: 2.3 });
  const fist = [[-34, -100], [-26, -120], [-6, -128], [20, -127], [42, -118], [52, -100], [46, -80], [24, -74], [-2, -74], [-24, -80]];
  c.fillStyle = '#c98f5f'; c.fill(curvePath(fist, true, 1.1)); graphite(c, curvePath(fist, true, 1.1), [-40, -132, 96, 62], { seed: 46, color: '#8d5a33', tone: (px, py) => clamp((py + 110) / 60, 0, .5), direction: () => 1.3 });
  pencil(c, 'can/fist', [...fist, fist[0]], { w: 2.4 });
  for (let i = 0; i < 3; i++) pencil(c, 'can/finger/' + i, [[-12 + i * 17, -75], [-11 + i * 17, -90]], { w: 1.4, al: .75 });
  pencil(c, 'can/thumb', [[-26, -112], [-2, -104], [22, -106]], { w: 1.7, al: .85 });
  c.restore();
}

// ---------------- handwriting ----------------
// A caption written on in handwriting. write: 0..1 letters appear in order; fade: 0..1 overall opacity.
function caption(c, text, x, y, { size = 66, color = COL.graphite, write = 1, fade = 1, align = 'center', weight = 400, font = HAND, rot = 0 } = {}) {
  if (fade <= 0 || write <= 0) return; c.save(); c.translate(x, y); c.rotate(rot); c.font = `${weight} ${size}px ${font}`; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  const full = c.measureText(text).width, x0 = align === 'center' ? -full / 2 : align === 'right' ? -full : 0, n = text.length, shown = write * n;
  for (let i = 0; i < n; i++) { const k = clamp(shown - i, 0, 1); if (k <= 0) break; const px = x0 + c.measureText(text.slice(0, i)).width;   // prefix width keeps the font's kerning
    c.globalAlpha = fade * (k < 1 ? k * .8 : 1); c.fillStyle = color; c.fillText(text[i], px, (1 - k) * 4); }
  c.restore();
}
