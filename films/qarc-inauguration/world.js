'use strict';
// ============================================================
// THE SKETCHBOOK PAGE, 0-55 s. One continuous world drawn as a pure function
// of global time t, with a camera travelling over it. The box, the coin, the
// yarn, the network, the mark and the seed all stay on this page; at 55 s the
// camera pulls back and the page lies on a desk beside the invitation card.
// Captions are written under the table line, like the text of a picture book.
// ============================================================
const PAGE_W = 2400, PAGE_H = 1350, GROUND = 1000, HOME = [1000, GROUND];
const BOXG = boxGeom({ x: 1640, y: GROUND, w: 360, h: 290, d: 170 });
const F = n => n / 24;                                  // output frame -> seconds

// ---------------- camera: [t, x, y, zoom]; eased between keys, held on repeats ----------------
const CAM_KEYS = [
  [0, 1590, 800, 1.22], [5.0, 1610, 812, 1.27], [9.6, 1670, 862, 1.6], [12.05, 1670, 862, 1.6],
  [12.9, 1390, 745, 1.12], [13.6, 1380, 770, 1.18], [16.2, 1330, 785, 1.22], [17.4, 1010, 770, 1.3], [23.4, 990, 730, 1.25], [24.4, 960, 710, 1.22],
  [25.5, 1110, 740, 1.16], [32.3, 1110, 740, 1.16], [33.7, 1080, 625, 1.04], [39.7, 1080, 612, 1.06],
  [41.1, 1100, 560, 1.1], [47.0, 1100, 560, 1.1], [48.6, 1030, 585, .97], [55.0, 1036, 585, .97]
];
function camAt(t) {
  const K = CAM_KEYS; if (t <= K[0][0]) return K[0].slice(1); if (t >= K[K.length - 1][0]) return K[K.length - 1].slice(1);
  let k = 0; while (t > K[k + 1][0]) k++; const a = K[k], b = K[k + 1], u = easeInOutSine((t - a[0]) / (b[0] - a[0]));
  return [lerp(a[1], b[1], u), lerp(a[2], b[2], u), lerp(a[3], b[3], u)];
}

// ---------------- the page itself ----------------
function pageGrain(c) {
  const r = rng(77); c.save(); c.fillStyle = shade(COL.paper, .5); c.globalAlpha = .07;
  for (let i = 0; i < 4200; i++) c.fillRect(-200 + r() * (PAGE_W + 400), -150 + r() * (PAGE_H + 300), 1.6 * (.4 + r()), 1.6 * (.4 + r()));
  c.restore();
}
function tableLine(c) {
  pencil(c, 'table', [[-200, GROUND + 2], [500, GROUND - 1], [1100, GROUND + 3], [1700, GROUND], [2600, GROUND + 2]], { w: 2.2, al: .55 });
  pencil(c, 'table/2', [[-200, GROUND + 12], [800, GROUND + 10], [1500, GROUND + 13], [2600, GROUND + 11]], { w: 1.2, al: .22 });
}

// ---------------- the box and what happens inside it ----------------
const POP = 12.5;
function boxState(t) {
  const progress = sm(.25, 2.4, t, easeInOutSine), xray = sm(5.0, 6.2, t) * (1 - sm(10.9, 11.6, t));
  const open = t < POP ? 0 : Math.min(1.04, easeOutBack(clamp((t - POP) / .22, 0, 1)));
  const shakeK = sm(11.5, 12.45, t, easeIn) * (t < POP ? 1 : 0), jolt = t >= POP && t < POP + .25 ? Math.sin((t - POP) / .25 * Math.PI) * 14 : 0;
  const q = Math.floor(t * 24) / 24;                     // the shake lands on output frames, not sub-frame noise
  return { progress, xray, open, rot: Math.sin(q * 57) * .018 * shakeK, hop: Math.abs(Math.sin(q * 31)) * 6 * shakeK + jolt };
}
function ghostCats(g, t, xray) {
  if (xray <= 0) return; const w = .5 + .42 * Math.sin((t - 6.2) * TAU * .62);
  drawCat(g, 'asleep', POSE.asleep, { x: BOXG.x + 62, y: GROUND - 6, scale: .82, al: xray * (.18 + .7 * (1 - w)), ghost: COL.navy });
  drawCat(g, 'wide', POSE.wide, { x: BOXG.x - 70, y: GROUND - 8, scale: .76, al: xray * (.18 + .7 * w), ghost: COL.orange });
  const zk = xray * (1 - w); for (let i = 0; i < 3; i++) caption(g, 'z', BOXG.x - 10 + i * 26, 900 - i * 34 - Math.sin(t * 2 + i) * 6, { size: 30 + i * 8, color: COL.navy, fade: zk * .9, weight: 700 });
  caption(g, '?', BOXG.x - 10, 760, { size: 64, color: COL.orange, fade: xray * w, weight: 700 });
}
function snoring(c, t) {   // before anyone looks: the closed box snores
  if (t < 2.2 || t > 5.4) return; for (let i = 0; i < 4; i++) { const life = ((t - 2.2) * .55 + i * .25) % 1, x = BOXG.x + 90 + life * 70 + Math.sin(life * 6 + i) * 12, y = 690 - life * 170;
    caption(c, 'z', x, y, { size: 30 + life * 34, color: COL.graphite, fade: Math.sin(life * Math.PI) * (1 - sm(4.8, 5.4, t)), weight: 700 }); }
}

// ---------------- the cat's performance ----------------
// Keys are whole drawings (POSE). A move between two keys gets two assisted
// inbetweens on twos; the pop is exposed on ones. Root motion belongs to each
// exposed drawing, so nothing slides under a held pose.
const catPoseFn = id => { if (POSE[id]) return POSE[id]; const m = id.match(/^(\w+)>(\w+)@([\d.]+)$/); if (!m) throw new Error('unknown cat drawing ' + id); const [, a, b, u] = m; return () => catBlend(POSE[a](), POSE[b](), +u); };
// [time, key] holds after the landing; blinks are three-frame replacements inside holds.
const ACTING = [
  [F(322), 'sit'], [16.3, 'lookL'], [17.5, 'pat'], [17.95, 'lookL'], [20.5, 'wide'], [22.2, 'dizzy'], [23.6, 'lookUp'], [24.6, 'sit'],
  [25.85, 'pat'], [26.35, 'lookL'], [28.35, 'lookRwide'], [29.5, 'lookL'], [30.05, 'pat'], [30.55, 'lookR'], [31.5, 'sit'],
  [32.5, 'tug'], [33.2, 'lookUp'], [36.4, 'happy'], [38.3, 'lookUp'], [41.2, 'lookUp'], [44.1, 'proud'], [46.0, 'sit'],
  [48.3, 'lookL'], [49.5, 'lookUp'], [52.7, 'happy'], [54.0, 'sit'],
  [60.8, 'lookR'], [64.2, 'sit'], [67.6, 'wave'], [70.8, 'happy'], [73.2, 'sit']
];
const BLINKS = [14.7, 19.2, 27.6, 34.6, 46.8, 50.2, 58.0, 65.6, 74.0];
const BLINKABLE = new Set(['sit', 'lookL', 'lookR', 'lookUp', 'proud', 'wide', 'lookRwide']);
function actingAt(t) {
  let k = 0; while (k + 1 < ACTING.length && t >= ACTING[k + 1][0]) k++;
  const [t0, id] = ACTING[k], prev = k > 0 ? ACTING[k - 1][1] : 'sit', f = Math.floor((t - t0) * 24 + 1e-6);
  if (k > 0 && f < 4 && prev !== id) return prev + '>' + id + '@' + (f < 2 ? '0.35' : '0.7');
  for (const b of BLINKS) if (t >= b && t < b + F(3) && BLINKABLE.has(id) && POSE_P[id].eyes !== 'happy' && t - t0 > .3) return id + 'Blink';
  return id;
}
// The pop, frame by frame (output frames at 24 fps from 300 = 12.5 s).
const POP_SHEET = [[302, 'stretch'], [308, 'stretch>tuck@0.5'], [310, 'tuck'], [316, 'land'], [319, 'land>settle@0.5'], [320, 'settle'], [322, 'settle>sit@0.5']];
function catAt(t) {
  const f = Math.floor(t * 24 + 1e-6);
  if (f < 302) return null;
  if (f < 316) {   // ballistic flight out of the box, the root on ones
    // a little hang time at the top: fast out of the box, a held beat of hooray, fast down
    const u0 = clamp((t - F(302)) / (F(316) - F(302)), 0, 1), u = .5 + .5 * Math.sign(u0 - .5) * Math.pow(Math.abs(2 * u0 - 1), 1.35);
    const p = arc([BOXG.x, GROUND + 12], [HOME[0], GROUND], u, 300);
    let id = POP_SHEET[0][1]; for (const [ff, key] of POP_SHEET) if (f >= ff) id = key;
    return { id, x: p[0], y: p[1], s: lerp(.9, 1, u), rot: u < .5 ? -.08 * u * 2 : -.08 - .22 * (u - .5) * 2, inside: u < .3, mark: u > .26 && u < .6 };
  }
  if (f < 324) { let id = 'land'; for (const [ff, key] of POP_SHEET) if (f >= ff) id = key; return { id, x: HOME[0], y: HOME[1], s: 1, rot: 0 }; }
  return { id: actingAt(t), x: HOME[0], y: HOME[1], s: 1, rot: 0 };
}
function dust(c, t) {   // landing puffs, drawn on the contact frame and blown out over half a second
  const u = (t - F(316)) / .5; if (u < 0 || u > 1) return;
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const x = HOME[0] + s * (70 + u * 60 + i * 22), y = GROUND - 6 - i * 10 - u * 14, r = 8 + i * 3 + u * 10;
    pencil(c, 'dust/' + s + i + '/' + Math.round(u * 12), ellPts(x, y, r, r * .7, 0, 14).slice(0, 11), { w: 1.6, al: 1 - u }); }
}

// ---------------- the coin: rolls in, is patted, spins into both, floats as a qubit ----------------
const HOVER = [690, 560];
function coinAt(t) {
  if (t < 16.3) return null;
  if (t < 17.25) { const u = easeOut((t - 16.3) / .95), x = lerp(480, COIN_X, u); return { x, y: GROUND, angle: 0, roll: (x - COIN_X) / 50, spin: 0, lift: 0 }; }
  const wob = t < 17.8 ? settle(t, 17.25, { amp: .12, freq: 3.2, decay: 6 }) : 0;
  // angle is the integral of a spin rate that jumps at the pat and climbs to a blur
  const spinAngle = tt => { if (tt < 17.8) return 0; const a = Math.min(tt, 19.6) - 17.8; let ang = a * 4.2; if (tt > 19.6) { const b = Math.min(tt, 21.2) - 19.6; ang += 4.2 * b + 12 * b * b; } if (tt > 21.2) ang += (tt - 21.2) * 42.6; return ang; };
  const spin = sm(20.7, 21.5, t), up = sm(22.0, 24.0, t, easeInOutSine);
  const x = lerp(COIN_X, HOVER[0], up), liftTo = GROUND - 50 - HOVER[1];
  return { x, y: GROUND, angle: spinAngle(t), roll: 0, spin, lift: up * liftTo + Math.sin(t * 2.1) * 8 * up, tilt: wob };
}

// ---------------- yarn, the entangled pair, and the network it becomes ----------------
const YARN_L = 815, YARN_R = 1400, YR = 58, COIN_X = 822;
const spinImpulse = (t, t0, A = 9, tauS = .6) => t > t0 ? A * (1 - Math.exp(-(t - t0) / tauS)) : 0;
function yarnAt(t) {
  if (t < 24.8) return null; const u = easeOut(clamp((t - 24.8) / .9, 0, 1));
  const xl = lerp(420, YARN_L, u), xr = lerp(1290, YARN_R, u), roll = (1 - u) * 6;
  const rot = spinImpulse(t, 26.2) + spinImpulse(t, 30.3);
  return { xl, xr, rotL: rot - roll, rotR: rot + roll, spinning: clamp((t > 26.2 ? Math.exp(-(t - 26.2) / .7) : 0) + (t > 30.3 ? Math.exp(-(t - 30.3) / .7) : 0), 0, 1) };
}
// network layout: inputs (the qubit, the left ball), three layers, output (the right ball)
const NET = {
  L1: [[880, 250], [880, 380], [880, 510]],
  L2: [[1110, 220], [1110, 340], [1110, 460], [1110, 580]],
  L3: [[1330, 320], [1330, 500]]
};
function netNodes(yarn) { return [[HOVER, [yarn.xl, GROUND - YR]], NET.L1, NET.L2, NET.L3, [[yarn.xr, GROUND - YR]]]; }
function netEdges(layers) { const E = []; for (let k = 0; k + 1 < layers.length; k++) layers[k].forEach((a, i) => layers[k + 1].forEach((b, j) => E.push({ k, i, j, a, b }))); return E; }
const bend = (a, b, amt = .08) => { const m = lerp2(a, b, .5), dx = b[0] - a[0], dy = b[1] - a[1]; return [a, [m[0] - dy * amt, m[1] + dx * amt], b]; };
// Q of the mark: centre, ring, and where every network node lands inside it
const QC = [880, 372], QR = 150, QRI = 108;
const Q_TRACES = [
  [[-80, -40], [-40, -40], [-40, -78]], [[-84, 16], [-24, 16], [-24, -20], [10, -20]], [[-60, 62], [-8, 62], [-8, 40]],
  [[82, -30], [40, -30], [40, -70]], [[78, 30], [30, 30], [30, 64]], [[4, -86], [4, -46], [-10, -46]]
];
function qTarget(k, i) { const T = Q_TRACES[(k * 3 + i) % Q_TRACES.length]; return [QC[0] + T[T.length - 1][0], QC[1] + T[T.length - 1][1]]; }

function strandsAct(c, t, yarn) {
  if (!yarn) return;
  const lift = sm(32.75, 33.55, t, easeOutBack), weave = sm(33.3, 35.6, t), collapse = sm(40.0, 41.3, t, easeInOutSine), gone = sm(40.9, 41.5, t);
  const ground = [[yarn.xl + YR * .7, GROUND - 16], [940, GROUND - 3], [1040, GROUND - 2], [1140, GROUND - 3], [1240, GROUND - 2], [yarn.xr - YR * .7, GROUND - 16]];
  const L = netNodes(yarn), spine = [L[0][1], L[1][2], L[2][2], L[3][1], L[3][1], L[4][0]].map((p, n) => n === 4 ? lerp2(L[3][1], L[4][0], .5) : p);
  if (lift < 1e-3 || t < 32.75) { strand(c, 'ground', ground, { w: 3 }); return; }
  if (gone >= 1) return;
  const at = (p, k, i) => collapse > 0 ? lerp2(p, qTarget(k, i), collapse) : p;
  const layers = L.map((layer, k) => layer.map((p, i) => at(p, k, i)));
  c.save(); c.globalAlpha *= 1 - gone;
  // the lifted thread: from the ground line to the spine of the network
  const sp = ground.map((g, n) => lerp2(g, spine[n], clamp(lift, 0, 1.15)));
  if (weave < 1) strand(c, 'spine/' + Math.round(lift * 24), sp, { w: 3, al: 1 - weave * .8 });
  const E = netEdges(layers), pulsesOn = t > 35.6 && collapse < .5;
  E.forEach((e, n) => { const start = 33.3 + e.k * .5 + (n % 5) * .07, p = clamp((t - start) / .55, 0, 1); if (p <= 0) return;
    strand(c, 'edge/' + n + '/' + Math.round(collapse * 30), bend(e.a, e.b, .06), { w: 2.8, progress: p, al: .92 });
    if (pulsesOn) { const period = 1.6, ph = ((t - 35.6 - e.k * .42) % period + period) % period / .42; if (ph >= 0 && ph <= 1) { const q = motionPath(bend(e.a, e.b, .06)).at(easeInOutSine(ph)).p; c.fillStyle = COL.orange; c.beginPath(); c.arc(q[0], q[1], 8, 0, TAU); c.fill(); } } });
  // knots at the hidden layers; the inputs and output are the qubit and the yarn balls themselves
  for (let k = 1; k <= 3; k++) layers[k].forEach((p, i) => { const born = clamp((t - (33.4 + k * .5 + i * .08)) / .25, 0, 1); if (born <= 0) return;
    const flash = pulsesOn ? Math.max(0, 1 - Math.abs(((t - 35.6 - (k - .5) * .42) % 1.6 + 1.6) % 1.6 - .42) / .2) : 0;
    if (flash > 0) { c.fillStyle = alpha(COL.orange, .35 * flash); c.beginPath(); c.arc(p[0], p[1], 32, 0, TAU); c.fill(); }
    c.fillStyle = mix('#3e6394', COL.orange, flash * .7); c.beginPath(); c.arc(p[0], p[1], 19 * easeOutBack(born), 0, TAU); c.fill();
    pencil(c, 'knot/' + k + i, ellPts(p[0], p[1], 19, 19, 0, 22), { w: 2, color: '#1b2d47', close: true, al: born }); });
  c.restore();
}
function yarnBalls(c, t, yarn) {
  if (!yarn) return; const fly = sm(41.8, 43.0, t, easeInOutSine); if (fly >= 1) return;
  const glowR = t > 35.6 && t < 40.4 ? Math.max(0, 1 - Math.abs(((t - 35.6 - 1.7) % 1.6 + 1.6) % 1.6 - .1) / .3) : 0;
  const spinLines = (x, k) => { if (yarn.spinning < .05) return; for (let i = 0; i < 3; i++) pencil(c, 'spinline/' + x + i + '/' + Math.round(t * 12), [[x - 70, GROUND - 40 - i * 26], [x - 84, GROUND - 58 - i * 26], [x - 80, GROUND - 80 - i * 26]].map(([px, py]) => [px + (x < 1400 ? 0 : 0), py]), { w: 1.4, al: yarn.spinning * .8 }); };
  if (fly <= 0) { drawYarn(c, yarn.xl, GROUND, { r: YR, rot: yarn.rotL, seed: 3 }); drawYarn(c, yarn.xr, GROUND, { r: YR, rot: yarn.rotR, seed: 5, glow: glowR }); spinLines(yarn.xl); spinLines(yarn.xr); }
}

// ---------------- the mark: QARC, drawn then inked ----------------
const ORBITS = [{ rot: -.52, ph: .3 }, { rot: .52, ph: 2.4 }, { rot: Math.PI / 2, ph: 4.2 }];
const ORX = 262, ORY = 88;
function orbitPt(o, a) { const x = Math.cos(a) * ORX, y = Math.sin(a) * ORY, k = Math.cos(o.rot), s = Math.sin(o.rot); return [QC[0] + x * k - y * s, QC[1] + x * s + y * k]; }
function electronsAt(t, yarn, coin) {   // the qubit and both yarn balls become the three electrons
  const fly = sm(41.8, 43.0, t, easeInOutSine), spinA = (t - 43) * .9;
  const src = [coin ? [coin.x, GROUND - 50 - coin.lift] : HOVER, [yarn ? yarn.xl : YARN_L, GROUND - YR], [yarn ? yarn.xr : YARN_R, GROUND - YR]];
  return ORBITS.map((o, n) => { const dest = orbitPt(o, o.ph + Math.max(0, spinA)), p = lerp2(src[n], dest, fly); return { p, r: lerp(n ? YR : 50, 16, fly), fly, n }; });
}
function markAct(c, t, yarn, coin) {
  if (t < 40.4) return;
  const pencilQ = sm(40.5, 41.2, t), ink = sm(41.1, 41.9, t, easeInOutSine), traces = sm(41.0, 42.2, t), orb = sm(41.4, 42.7, t, easeInOutSine), arcK = sm(42.8, 44.0, t), sub = sm(44.2, 45.1, t), dept = sm(45.0, 45.8, t);
  // ring: a pencil circle first, then solid navy ink
  const ring = new Path2D(); ring.arc(QC[0], QC[1], QR, 0, TAU); ring.arc(QC[0], QC[1], QRI, 0, TAU, true);
  const tail = polyPath([[QC[0] + 62, QC[1] + 96], [QC[0] + 98, QC[1] + 74], [QC[0] + 178, QC[1] + 176], [QC[0] + 140, QC[1] + 196]]);
  if (ink > 0) { c.save(); c.beginPath(); c.rect(QC[0] - QR - 20, QC[1] + QR + 60 - (2 * QR + 120) * ink, 2 * QR + 240, (2 * QR + 120) * ink + 10); c.clip(); c.fillStyle = COL.navy; c.fill(ring, 'evenodd'); c.fill(tail); c.restore(); }
  pencil(c, 'Q/outer', ellPts(QC[0], QC[1], QR, QR, -1.2, 60), { w: 2.6, close: true, progress: pencilQ, al: 1 - ink * .6 });
  pencil(c, 'Q/inner', ellPts(QC[0], QC[1], QRI, QRI, -1.2, 50), { w: 2, close: true, progress: pencilQ, al: 1 - ink * .6 });
  Q_TRACES.forEach((T, n) => { const pts = T.map(([x, y]) => [QC[0] + x, QC[1] + y]); if (traces <= 0) return;
    c.save(); c.strokeStyle = COL.navy; c.lineWidth = 7; c.lineCap = 'round'; c.lineJoin = 'round'; c.setLineDash([pathLength(pts) * traces, 999]); c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.stroke(); c.restore();
    if (traces > .8) { c.fillStyle = COL.navy; c.beginPath(); c.arc(pts[pts.length - 1][0], pts[pts.length - 1][1], 10, 0, TAU); c.fill(); c.fillStyle = COL.paper; c.beginPath(); c.arc(pts[pts.length - 1][0], pts[pts.length - 1][1], 4.5, 0, TAU); c.fill(); } });
  ORBITS.forEach((o, n) => { const pts = []; for (let i = 0; i <= 64; i++) pts.push(orbitPt(o, i / 64 * TAU)); c.save(); c.strokeStyle = COL.navy; c.lineWidth = 4.2; c.setLineDash([pathLength(pts) * orb, 9999]); c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.stroke(); c.restore(); });
  // A R C: a pencil outline, then the ink fill wipes in
  if (arcK > 0) { c.save(); c.font = `600 250px ${PRINT}`; c.textBaseline = 'alphabetic'; c.textAlign = 'left'; const x0 = QC[0] + 218, y0 = QC[1] + 92, wAll = c.measureText('ARC').width;
    c.beginPath(); c.rect(x0 - 10, y0 - 300, (wAll + 20) * arcK, 360); c.clip(); c.strokeStyle = alpha(COL.graphite, .7); c.lineWidth = 2; c.strokeText('ARC', x0, y0);
    c.fillStyle = COL.navy; c.globalAlpha = sm(.35, 1, arcK); c.fillText('ARC', x0, y0); c.restore(); }
  if (sub > 0) { c.save(); c.globalAlpha = sub; c.fillStyle = COL.navy; c.font = `600 41px ${PRINT}`; c.textAlign = 'left'; c.letterSpacing = '3px'; c.fillText('QUANTUM & AI RESEARCH CELL', QC[0] + 224, QC[1] + 172); c.restore(); }
  if (dept > 0) { c.save(); c.globalAlpha = dept; c.fillStyle = COL.graphite; c.font = `500 27px ${PRINT}`; c.textAlign = 'left'; c.fillText('Department of Computer Science & Engineering · SSIT', QC[0] + 226, QC[1] + 228); c.restore(); }
}
function electronsDraw(c, t, yarn, coin) {
  if (t < 41.8) return; electronsAt(t, yarn, coin).forEach(e => { if (e.fly >= 1) { c.fillStyle = COL.navy; c.beginPath(); c.arc(e.p[0], e.p[1], 16, 0, TAU); c.fill(); c.fillStyle = alpha('#ffffff', .35); c.beginPath(); c.arc(e.p[0] - 5, e.p[1] - 5, 5, 0, TAU); c.fill(); }
    else if (e.n === 0) drawCoin(c, e.p[0], e.p[1] + e.r, { r: e.r, spin: 1, angle: t * 40 }); else drawYarn(c, e.p[0], e.p[1] + e.r, { r: e.r, rot: t * 3, seed: e.n === 1 ? 3 : 5 }); });
}

// ---------------- the seed ----------------
const POT = [640, GROUND];
function canState(t) {
  if (t < 48.9 || t > 52.6) return null; const inn = sm(48.9, 49.8, t, easeOutQuint), out = sm(51.7, 52.6, t, easeIn);
  const x = lerp(120, 430, inn) - out * 380, y = lerp(300, 690, inn) - out * 420, tilt = sm(49.7, 50.3, t) * (1 - sm(51.4, 51.8, t)) * .62;
  return { x, y, tilt, pour: t > 50.1 && t < 51.5 };
}
function seedAct(c, t) {
  if (t < 47.5) return; const pop = easeOutBack(clamp((t - 47.5) / .45, 0, 1));
  c.save(); c.translate(POT[0], POT[1]); c.scale(pop, pop); c.translate(-POT[0], -POT[1]); drawPot(c, POT[0], POT[1]); c.restore();
  // a seed drops in
  const sd = clamp((t - 48.0) / .35, 0, 1); if (sd > 0 && sd < 1) { c.fillStyle = '#7a5231'; c.beginPath(); c.ellipse(POT[0] + 6, lerp(560, 866, easeIn(sd)), 9, 6, .4, 0, TAU); c.fill(); }
  drawSapling(c, POT[0], GROUND - 124, sm(50.5, 53.6, t, t => t));
}
function waterAct(c, t) {
  const s = canState(t); if (!s) return; const rose = canRose(s.x, s.y, s.tilt, -1);
  if (s.pour) for (let i = 0; i < 26; i++) { const born = 50.1 + i * .05, age = t - born; if (age < 0 || age > .42 || born > 51.5) continue;
    const u = age / .42, sx = rose[0] + (hash(i, 5) - .5) * 16, x = lerp(sx, POT[0] + (hash(i, 6) - .5) * 70, u), y = lerp(rose[1], GROUND - 132, u * u);
    c.strokeStyle = alpha('#4f86b8', .85); c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 2, y + 12); c.stroke(); }
  drawCan(c, s.x, s.y, s.tilt, -1);
}

// ---------------- captions (world units, under the table line) ----------------
const CAPTIONS = [
  { t0: .5, t1: 4.8, text: 'Department of CSE · SSIT presents', x: 1590, y: 450, size: 32, font: PRINT, weight: 600, write: .6 },
  { t0: 2.8, t1: 5.2, text: 'There’s a cat in this box.', x: 1610, y: 1108, size: 54 },
  { t0: 5.5, t1: 11.9, text: 'Asleep… or awake?', x: 1670, y: 1070, size: 42 },
  { t0: 8.3, t1: 11.9, text: 'Quantum says: both. Until you look.', x: 1670, y: 1128, size: 37, weight: 700, color: COL.navy, write: 1.6 },
  { t0: 14.0, t1: 16.4, text: '(definitely awake.)', x: 1000, y: 1090, size: 44, color: COL.orange, write: .8 },
  { t0: 18.3, t1: 21.3, text: 'A bit is either 0 or 1.', x: 1000, y: 1092, size: 50 },
  { t0: 21.5, t1: 24.9, text: 'A qubit can be both at once.', x: 1000, y: 1092, size: 50, weight: 700, color: COL.navy },
  { t0: 27.0, t1: 32.3, text: 'Entangled: touch one…', x: 1110, y: 1095, size: 56 },
  { t0: 28.4, t1: 32.3, text: '…and the other one knows.', x: 1110, y: 1160, size: 56, weight: 700, color: COL.navy },
  { t0: 33.4, t1: 36.2, text: 'Now teach the threads to learn.', x: 1080, y: 1098, size: 62 },
  { t0: 36.4, t1: 39.8, text: 'Quantum + AI', x: 1080, y: 1110, size: 86, weight: 700, color: COL.navy, write: .7 },
  { t0: 48.4, t1: 51.8, text: 'Every big idea starts as a seed.', x: 1030, y: 1082, size: 58 },
  { t0: 52.0, t1: 57.9, text: 'This Saturday, we plant ours.', x: 1030, y: 1082, size: 60, weight: 700, color: COL.navy },
  { t0: 67.6, t1: 999, text: 'Don’t stay in superposition.', x: 925, y: 1092, size: 50, write: 1.3 },
  { t0: 69.1, t1: 999, text: 'Be there!', x: 925, y: 1190, size: 96, weight: 700, color: COL.orange, write: .6 }
];
function captionsAct(c, t) {
  for (const k of CAPTIONS) { if (t < k.t0 || t > k.t1 + .4) continue; const write = clamp((t - k.t0) / (k.write ?? 1.1), 0, 1), fade = 1 - sm(k.t1, k.t1 + .4, t);
    caption(c, k.text, k.x, k.y, { size: k.size, color: k.color || COL.graphite, weight: k.weight || 400, font: k.font || HAND, write, fade }); }
}

// ---------------- everything on the page at time t ----------------
function worldAt(c, t) {
  pageGrain(c); tableLine(c);
  const yarn = yarnAt(t), coin = coinAt(t), cat = catAt(t), box = boxState(t);
  markAct(c, t, yarn, coin);
  if (t < 41.5) strandsAct(c, t, yarn);
  yarnBalls(c, t, yarn);
  const catDraw = g => { if (!cat) return; drawCat(g, cat.id, catPoseFn(cat.id), { x: cat.x, y: cat.y, scale: cat.s, rot: cat.rot });
    if (cat.mark) caption(g, '!', cat.x + 96, cat.y - 360, { size: 90, color: COL.orange, weight: 700 }); };
  c.save(); c.translate(BOXG.x, BOXG.y); c.rotate(box.rot); c.translate(-BOXG.x, -BOXG.y - box.hop);
  drawBox(c, BOXG, { open: box.open, progress: box.progress, xray: box.xray, inside: g => { ghostCats(g, t, box.xray); if (cat && cat.inside) catDraw(g); } });
  c.restore();
  snoring(c, t);
  if (coin && coin.lift < 1 && t < 22.2) drawCoin(c, coin.x, coin.y, coin);
  seedAct(c, t);
  if (cat && !cat.inside) catDraw(c);
  if (coin && (coin.lift >= 1 || t >= 22.2) && t < 41.8) drawCoin(c, coin.x, coin.y, coin);
  electronsDraw(c, t, yarn, coin);
  dust(c, t); waterAct(c, t); captionsAct(c, t);
}
function sketchbookScene(c, tau) {
  resetT(c); c.fillStyle = COL.paper; c.fillRect(0, 0, W, H);
  const [x, y, z] = camAt(tau); cam(c, x, y, z); worldAt(c, tau);
}
