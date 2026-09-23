'use strict';
// ============================================================
// THE SKETCHBOOK PAGE, PORTRAIT CUT (0-55 s). The landscape film's page
// re-staged for a 9:16 phone screen. The table sits in the lower half; the
// box stands at the right, the cat in the middle, the coin, the yarn and the
// pot on the left. The thread lifts into a network that grows upward to the
// qubit and gathers into the mark at the top of the page. Captions are
// written where a phone's interface leaves them readable: under the table,
// or over the network when it fills the page.
// Everything on the page is a pure function of global time t; the cat's
// performance stays on its exposure sheet, the effects are on twos.
// ============================================================
const PAGE_W = 1350, PAGE_H = 2860, GROUND = 1500, HOME = [540, GROUND];   // the lower third stays empty: the card lands there
const BOXG = boxGeom({ x: 1010, y: GROUND, w: 280, h: 250, d: 130 });
const F = n => n / 24;                                  // output frame -> seconds

// ---------------- camera: [t, x, y, zoom]; eased between keys, held on repeats ----------------
const CAM_KEYS = [
  [0, 1040, 1330, 1.45], [5.0, 1040, 1345, 1.5], [9.6, 1045, 1380, 1.78], [12.05, 1045, 1380, 1.78],
  [12.85, 800, 1160, 1.1], [13.6, 790, 1245, 1.2], [16.2, 770, 1262, 1.22], [17.4, 560, 1282, 1.34],
  [21.8, 560, 1275, 1.34], [23.6, 600, 1150, 1.2], [24.6, 640, 1240, 1.16], [25.9, 590, 1290, 1.27],
  [32.3, 590, 1290, 1.27], [33.9, 580, 1040, .98], [39.7, 580, 1025, 1.0],
  [41.1, 505, 770, 1.28], [42.6, 505, 770, 1.28], [43.9, 675, 800, 1.1], [47.0, 675, 808, 1.1], [48.6, 685, 1168, 1.0], [55.0, 685, 1168, 1.0]
];
// small push-ins that land with an accent (a landing, a thought, the ink); the camera stays on ones
const CAM_KICKS = [[13.17, .03], [21.1, .02], [26.2, .012], [30.3, .012], [36.4, .025], [41.15, .035]];
function camBase(t) {
  const K = CAM_KEYS; if (t <= K[0][0]) return K[0].slice(1); if (t >= K[K.length - 1][0]) return K[K.length - 1].slice(1);
  let k = 0; while (t > K[k + 1][0]) k++; const a = K[k], b = K[k + 1], u = easeInOutSine((t - a[0]) / (b[0] - a[0]));
  return [lerp(a[1], b[1], u), lerp(a[2], b[2], u), lerp(a[3], b[3], u)];
}
function camAt(t) {
  const [x, y, z] = camBase(t); let k = 0;
  for (const [t0, amp] of CAM_KICKS) { const u = t - t0; if (u > 0 && u < 1.4) k += amp * Math.sin(Math.PI / 2 * Math.min(1, u / .09)) * Math.exp(-4.5 * u); }
  return [x, y, z * (1 + k)];
}
// where a point of the screen lies on the page at time t (captions are placed on the page this way)
function pageAtScreen(sx, sy, t) { const [x, y, z] = camAt(t); return [x + (sx - W / 2) / z, y + (sy - H / 2) / z, z]; }

// ---------------- the page itself ----------------
function pageGrain(c) {
  const r = rng(77); c.save(); c.fillStyle = shade(COL.paper, .5); c.globalAlpha = .07;
  for (let i = 0; i < 7600; i++) c.fillRect(-500 + r() * (PAGE_W + 1000), -400 + r() * (PAGE_H + 800), 1.6 * (.4 + r()), 1.6 * (.4 + r()));
  c.restore();
}
function tableLine(c) {
  pencil(c, 'table', [[-420, GROUND + 2], [150, GROUND - 1], [700, GROUND + 3], [1250, GROUND], [1780, GROUND + 2]], { w: 2.2, al: .55 });
  pencil(c, 'table/2', [[-420, GROUND + 12], [420, GROUND + 10], [1050, GROUND + 13], [1780, GROUND + 11]], { w: 1.2, al: .22 });
}

// ---------------- the box: drawn by a pencil, it snores, breathes, trembles and pops ----------------
const POP = 12.5;
// one pencil goes round the box: each line owns a window of the pencil's time
const BOX_LINES = { front: [0, .36], side: [.34, .53], top: [.51, .71], flapL: [.51, .71], flapR: [.51, .71], seam: [.69, .77] };
const boxPen = t => sm(.25, 1.75, t, u => u);
const boxSeq = u => id => { if (id.startsWith('flute/')) return clamp((u - .76 - +id.split('/')[1] * .022) / .05, 0, 1); const w = BOX_LINES[id]; return w ? clamp((u - w[0]) / (w[1] - w[0]), 0, 1) : 1; };
function boxLinePts(id) { const G = BOXG; return id === 'front' ? [G.FL, G.TL, G.TR, G.FR, G.FL] : id === 'side' ? [G.TR, G.BTR, G.BFR, G.FR] : id === 'top' ? [G.TL, G.BTL, G.BTR, G.TR] : [lerp2(G.TL, G.TR, .5), lerp2(G.BTL, G.BTR, .5)]; }
function alongPts(pts, u) { const L = pathLength(pts), d = clamp(u, 0, 1) * L; let acc = 0; for (let i = 1; i < pts.length; i++) { const s = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (acc + s >= d) return lerp2(pts[i - 1], pts[i], (d - acc) / (s || 1)); acc += s; } return pts[pts.length - 1].slice(); }
function penTip(t) {   // where the pencil is while it draws the box, and how far it has come in and out
  const u = boxPen(t); let tip = boxLinePts('front')[0];
  for (const id of ['front', 'side', 'top', 'seam']) { const w = BOX_LINES[id], k = (u - w[0]) / (w[1] - w[0]); if (k >= 0) tip = alongPts(boxLinePts(id), Math.min(1, k)); }
  const inn = sm(0, .3, t, easeOut), out = sm(1.75, 2.15, t, easeIn), wait = [BOXG.x + 250, GROUND - 560], away = [BOXG.x + 520, GROUND - 900];   // in shot from the first frame
  return { p: lerp2(lerp2(wait, tip, inn), away, out), al: t < 2.2 ? 1 : 0 };
}
function boxState(t) {
  const fill = t < 1.55 ? .5 : .55 + .45 * sm(1.55, 2.5, t), xray = sm(5.0, 6.2, t) * (1 - sm(10.9, 11.6, t));
  const open = t < POP ? 0 : Math.min(1.04, easeOutBack(clamp((t - POP) / .22, 0, 1)));
  const breath = .018 * breathe(t - 2.2, 1.8) * sm(2.2, 2.8, t) * (1 - sm(4.8, 5.4, t));   // the closed box breathes with the snores
  const shakeK = sm(11.5, 12.45, t, easeIn) * (t < POP ? 1 : 0), q = Math.floor(t * 24) / 24;   // the shake lands on output frames
  const gather = sm(12.16, 12.48, t, easeIn) * (t < POP ? 1 : 0);                                 // it gathers itself before the pop...
  const ring = t >= POP ? settle(t, POP, { amp: .085, freq: 2.7, decay: 6.5, phase: Math.PI / 2 }) : 0;   // ...and rings after it
  const jolt = t >= POP && t < POP + .25 ? Math.sin((t - POP) / .25 * Math.PI) * 14 : 0;
  return { fill, xray, open, rot: Math.sin(q * 57) * .02 * shakeK, hop: Math.abs(Math.sin(q * 31)) * 7 * shakeK + jolt,
    sx: 1 - breath * .5 + .06 * gather - ring * .6, sy: 1 + breath - .1 * gather + ring };
}
// asleep and awake, alternating faster and faster until someone looks
function ghostCats(g, t, xray) {
  if (xray <= 0) return; const u = Math.max(0, t - 6.2), w = .5 + .42 * Math.sin(TAU * (.62 * u + .11 * u * u));
  drawCat(g, 'asleep', POSE.asleep, { x: BOXG.x + 52, y: GROUND - 6, scale: .68, al: xray * (.18 + .7 * (1 - w)), ghost: COL.navy });
  drawCat(g, 'wide', POSE.wide, { x: BOXG.x - 56, y: GROUND - 8, scale: .64, al: xray * (.18 + .7 * w), ghost: COL.orange });
  const eyeOn = 1 - sm(9.95, 10.25, t), zk = xray * (1 - w) * eyeOn; for (let i = 0; i < 3; i++) caption(g, 'z', BOXG.x - 6 + i * 22, GROUND - 330 - i * 30 - Math.sin(t * 2 + i) * 6, { size: 28 + i * 7, color: COL.navy, fade: zk * .9, weight: 700 });
  caption(g, '?', BOXG.x - 8, GROUND - 420, { size: 60, color: COL.orange, fade: xray * w * eyeOn, weight: 700 });
}
function snoring(c, t) {   // before anyone looks: the closed box snores
  if (t < 2.2 || t > 5.4) return; for (let i = 0; i < 4; i++) { const life = ((t - 2.2) * .55 + i * .25) % 1, x = BOXG.x + 80 + life * 60 + Math.sin(life * 6 + i) * 12, y = GROUND - 300 - life * 170;
    caption(c, 'z', x, y, { size: 30 + life * 32, color: COL.graphite, fade: Math.sin(life * Math.PI) * (1 - sm(4.8, 5.4, t)), weight: 700 }); }
}

// ---------------- the cat's performance ----------------
// Keys are whole drawings (POSE). A move gets two assisted inbetweens on twos and, between
// seated poses, one overshoot drawing before it settles; the pop is exposed on ones.
// Blinks are four-frame replacements (half, shut, shut, half); an ear flick is a three-frame one.
function reelPoseFn(id) {
  if (POSE[id]) return POSE[id];
  let m = id.match(/^(\w+)>(\w+)@([\d.]+)$/); if (m) { const fa = reelPoseFn(m[1]), fb = reelPoseFn(m[2]), u = +m[3]; return POSE[id] = () => catBlend(fa(), fb(), u); }
  m = id.match(/^(\w+?)(Half|FlickL|FlickR)$/); if (m && POSE_P[m[1]]) { const o = POSE_P[m[1]], [ea, eb] = o.ears || [0, 0];
    const v = m[2] === 'Half' ? { eyes: 'half' } : m[2] === 'FlickL' ? { ears: [ea - .42, eb] } : { ears: [ea, eb - .42] }; return POSE[id] = () => catPose({ ...o, ...v }); }
  throw new Error('unknown cat drawing ' + id);
}
const ACTING = [
  [F(322), 'sit'], [16.3, 'lookL'], [17.5, 'pat'], [17.95, 'lookL'], [20.5, 'wide'], [22.2, 'dizzy'], [23.6, 'lookUp'], [24.6, 'sit'],
  [24.95, 'lookR'], [25.4, 'lookL'], [25.85, 'pat'], [26.35, 'lookL'], [28.35, 'lookRwide'], [29.5, 'lookL'], [30.05, 'pat'], [30.55, 'lookR'], [31.5, 'sit'],
  [32.5, 'tug'], [33.2, 'lookUp'], [36.4, 'happy'], [38.3, 'lookUp'], [41.2, 'lookUp'], [44.1, 'proud'], [46.0, 'sit'],
  [47.55, 'lookL'], [49.5, 'lookUp'], [52.7, 'happy'], [54.0, 'sit'],
  [60.8, 'lookDown'], [64.2, 'sit'], [67.6, 'wave'], [70.8, 'happy'], [73.2, 'sit']
];
const BLINKS = [14.7, 19.2, 27.6, 34.6, 39.3, 46.8, 50.2, 54.5, 58.0, 62.7, 65.6, 74.0];
const FLICKS = [[15.5, 'L'], [19.9, 'R'], [24.2, 'L'], [31.1, 'R'], [38.7, 'L'], [45.5, 'R'], [53.2, 'L'], [59.3, 'R'], [66.2, 'L'], [72.2, 'R']];
const BLINKABLE = new Set(['sit', 'lookL', 'lookR', 'lookUp', 'lookDown', 'proud', 'wide', 'lookRwide']);
const SEATED = new Set(['sit', 'lookL', 'lookR', 'lookUp', 'lookDown', 'pat', 'tug', 'wide', 'lookRwide', 'happy', 'proud', 'wave', 'dizzy']);
function actingAt(t) {
  let k = 0; while (k + 1 < ACTING.length && t >= ACTING[k + 1][0]) k++;
  const [t0, id] = ACTING[k], prev = k > 0 ? ACTING[k - 1][1] : 'sit', f = Math.floor((t - t0) * 24 + 1e-6);
  if (k > 0 && prev !== id) { if (f < 4) return prev + '>' + id + '@' + (f < 2 ? '0.35' : '0.7'); if (f < 6 && SEATED.has(prev) && SEATED.has(id)) return prev + '>' + id + '@1.1'; }
  if (BLINKABLE.has(id) && t - t0 > .3) for (const b of BLINKS) { const bf = Math.floor((t - b) * 24 + 1e-6); if (bf >= 0 && bf < 4) return id + (bf === 0 || bf === 3 ? 'Half' : 'Blink'); }
  if (t - t0 > .4 && POSE_P[id] && id !== 'asleep') for (const [ft, side] of FLICKS) { const ff = Math.floor((t - ft) * 24 + 1e-6); if (ff >= 0 && ff < 3) return id + 'Flick' + side; }
  return id;
}
// the pop, frame by frame (output frames at 24 fps from 300 = 12.5 s)
const POP_SHEET = [[302, 'stretch'], [308, 'stretch>tuck@0.5'], [310, 'tuck'], [316, 'land'], [319, 'land>settle@0.5'], [320, 'settle'], [322, 'settle>sit@0.5']];
const popFlight = u0 => .5 + .5 * Math.sign(u0 - .5) * Math.pow(Math.abs(2 * u0 - 1), 1.35);   // fast out of the box, a held beat of hooray, fast down
const popAt = t => { const u = popFlight(clamp((t - F(302)) / (F(316) - F(302)), 0, 1)); return { u, p: arc([BOXG.x, GROUND + 12], [HOME[0], GROUND], u, 420) }; };
function catAt(t) {
  const f = Math.floor(t * 24 + 1e-6);
  if (f < 302) return null;
  if (f < 316) {   // ballistic flight out of the box, the root on ones
    const { u, p } = popAt(t); let id = POP_SHEET[0][1]; for (const [ff, key] of POP_SHEET) if (f >= ff) id = key;
    return { id, x: p[0], y: p[1], s: lerp(.9, 1, u), rot: u < .5 ? -.08 * u * 2 : -.08 - .22 * (u - .5) * 2, inside: u < .3, mark: u > .26 && u < .6, u, flying: true };
  }
  if (f < 324) { let id = 'land'; for (const [ff, key] of POP_SHEET) if (f >= ff) id = key; return { id, x: HOME[0], y: HOME[1], s: 1, rot: 0 }; }
  return { id: actingAt(t), x: HOME[0], y: HOME[1], s: 1, rot: 0, live: true };
}
// how much the tail sways and the body breathes: calm on holds, livelier when the cat is delighted
function tailSway(t) {
  const bump = (a, b, k) => k * sm(a, a + .5, t) * (1 - sm(b - .5, b, t));
  return .075 + bump(13.4, 16.2, .08) + bump(25.9, 31.6, .04) + bump(36.4, 38.2, .05) + bump(44.1, 46.2, .06) + bump(52.7, 54.2, .06) + bump(67.6, 70.6, .07) + bump(70.8, 73.2, .05);
}
function catDraw(c, cat, t) {
  if (!cat) return; const fn = reelPoseFn(cat.id);
  if (cat.live) drawCatLive(c, cat.id, fn, { x: cat.x, y: cat.y, scale: cat.s, rot: cat.rot, t, sway: tailSway(t), breath: sm(13.6, 14.4, t) });
  else drawCat(c, cat.id, fn, { x: cat.x, y: cat.y, scale: cat.s, rot: cat.rot });
  if (cat.mark) { const k = easeOutBack(clamp((cat.u - .26) / .08, 0, 1), 2); caption(c, '!', cat.x + 96, cat.y - 360, { size: 96 * k, color: COL.orange, weight: 700 }); }
}
function popFx(c, t) {   // speed lines on the way up and down, a glint at the top, dust and ticks at the landing
  const f = Math.floor(t * 24 + 1e-6);
  impact(c, 'burst', BOXG.x + 30, BOXG.TL[1] - 40, t, POP + .02, { n: 7, r0: 70, len: 60, dur: .25, from: -Math.PI + .35, to: -.35, w: 2.4 });   // the lid blows open
  if (f >= 302 && f < 316) { const { u, p } = popAt(t), q = arc([BOXG.x, GROUND + 12], [HOME[0], GROUND], clamp(u - .06, 0, 1), 420), dir = Math.atan2(p[1] - q[1], p[0] - q[0]), fast = Math.abs(u - .5) * 2;
    if (u > .12 && u < .4) for (const s of [-1, 1]) motionLines(c, 'pop/up/' + s, p[0] + s * 78, p[1] - 70, dir, { n: 2, len: 60 + 110 * fast, spread: 26, gap: 0, al: .7 * fast, seed: s > 0 ? 3 : 5 });
    if (u > .6) motionLines(c, 'pop/down', p[0] + 10, p[1] - 250, dir, { n: 5, len: 70 + 120 * fast, spread: 130, gap: 150, al: .75 * fast, seed: 4 }); }
  if (f >= 305 && f < 313) { const k = (f - 305) / 8, { p } = popAt(t);
    [[-130, -380, 22], [120, -420, 18], [150, -250, 14], [-160, -230, 12]].forEach(([dx, dy, s], i) => sparkle(c, p[0] + dx, p[1] + dy, s * popLife(clamp(k * 1.25 - i * .08, 0, 1), .3), { rot: i, color: i % 2 ? COL.orange : GOLD })); }
  puffs(c, 'land', HOME[0], GROUND, t, F(316), { n: 3, dur: .55, spread: 75, size: 10 });
  impact(c, 'land', HOME[0], GROUND - 4, t, F(316), { n: 4, r0: 150, len: 34, dur: .18, from: -Math.PI + .25, to: -.25 });
}

// ---------------- the coin: rolls in, is patted, spins into both, floats as a qubit ----------------
const COIN_X = HOME[0] - 178, HOVER_A = [600, 1010], HOVER_B = [560, 560], QUBIT_R = 50;
function coinAt(t) {
  if (t < 16.3) return null;
  if (t < 17.25) { const u = easeOut((t - 16.3) / .95), x = lerp(-140, COIN_X, u); return { x, y: GROUND, angle: 0, roll: (x - COIN_X) / 50, spin: 0, lift: 0, speed: 3 * (1 - (t - 16.3) / .95) ** 2 }; }
  const wob = t < 17.8 ? settle(t, 17.25, { amp: .12, freq: 3.2, decay: 6 }) : 0;
  // angle is the integral of a spin rate that jumps at the pat and climbs to a blur
  const spinAngle = tt => { if (tt < 17.8) return 0; const a = Math.min(tt, 19.6) - 17.8; let ang = a * 4.2; if (tt > 19.6) { const b = Math.min(tt, 21.2) - 19.6; ang += 4.2 * b + 12 * b * b; } if (tt > 21.2) ang += (tt - 21.2) * 42.6; return ang; };
  const spin = sm(20.7, 21.5, t), up = sm(22.0, 24.0, t, easeInOutSine), rise = sm(33.0, 35.2, t, easeInOutSine);
  const p = lerp2(bez2([COIN_X, GROUND - QUBIT_R], [COIN_X - 60, HOVER_A[1] + 60], HOVER_A, up), HOVER_B, rise), bob = Math.sin(t * 2.1) * 8 * up;
  return { x: p[0], y: GROUND, angle: spinAngle(t), roll: 0, spin, lift: GROUND - QUBIT_R - p[1] - bob, tilt: wob, speed: 0, up };
}
const qubitPos = coin => coin ? [coin.x, GROUND - QUBIT_R - coin.lift] : HOVER_B;
// the qubit's state arrow, turning inside the sphere, and its two kets beside it
function qubitDetail(c, t, coin) {
  if (!coin || coin.spin < .6 || t > 41.9) return; const [x, y] = qubitPos(coin), k = sm(21.3, 21.8, t) * (1 - sm(41.6, 41.9, t)), a = t * 1.9, th = .62, r = QUBIT_R * .72;
  const tip = [x + r * Math.sin(th) * Math.cos(a), y - r * Math.cos(th) + r * Math.sin(th) * Math.sin(a) * .28];
  c.save(); c.globalAlpha *= k; c.strokeStyle = COL.navy; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(...tip); c.stroke();
  c.fillStyle = COL.navy; c.beginPath(); c.arc(tip[0], tip[1], 5, 0, TAU); c.fill(); c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill(); c.restore();
  const kets = sm(22.4, 22.9, t) * (1 - sm(26.6, 27.2, t)); if (kets <= 0) return;
  const ket = (s, kx, ky) => { c.save(); c.globalAlpha *= kets; c.fillStyle = COL.navy; c.font = `700 30px ${HAND}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('|' + s, kx, ky); const w0 = c.measureText('|' + s).width;
    c.strokeStyle = COL.navy; c.lineWidth = 2.6; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(kx + w0 + 2, ky - 15); c.lineTo(kx + w0 + 11, ky); c.lineTo(kx + w0 + 2, ky + 15); c.stroke(); c.restore(); };
  ket('0', x + QUBIT_R + 16, y - QUBIT_R * .7); ket('1', x + QUBIT_R + 16, y + QUBIT_R * .7);
}
function coinFx(c, t, coin) {
  if (!coin) return;
  if (coin.speed > .25) motionLines(c, 'coin', coin.x - 40, GROUND - QUBIT_R, 0, { n: 3, len: 60 * coin.speed, spread: 56, gap: 20, al: Math.min(.8, coin.speed * .4), seed: 7 });
  impact(c, 'pat1', COIN_X + 46, GROUND - 60, t, 17.8, { n: 3, r0: 22, len: 20, from: -1.9, to: -.6 });
  if (t > 18.6 && t < 21.3 && coin.spin < .9) { const sp = clamp((t - 18.6) / 2.4, 0, 1), cx = coin.x, cy = GROUND - QUBIT_R;   // whirl arcs that quicken with the spin
    for (let i = 0; i < 2; i++) { const a0 = twos(t) * (3 + sp * 9) + i * Math.PI, R = QUBIT_R + 18; pencil(c, 'whirl/' + i, [...Array(9)].map((_, j) => [cx + Math.cos(a0 + j * .16) * R, cy + Math.sin(a0 + j * .16) * R * .34]), { w: 1.8, al: .35 + .45 * sp }); } }
  burst(c, COIN_X, GROUND - QUBIT_R, t, 21.05, { n: 8, R: 120, dur: .75, size: 17, seed: 11 });
  ping(c, 'both', COIN_X, GROUND - QUBIT_R, t, 21.05, { R: 95, r0: QUBIT_R, dur: .55, color: COL.navy });
  if (coin.up > 0 && coin.up < 1) for (let k = 0; k < 12; k++) { const born = 22.0 + k * .16, u = (twos(t) - born) / .6; if (u <= 0 || u >= 1) continue;   // a sparkle trail while it floats
    const s = sm(22.0, 24.0, born, easeInOutSine), p = bez2([COIN_X, GROUND - QUBIT_R], [COIN_X - 60, HOVER_A[1] + 60], HOVER_A, s); sparkle(c, p[0] + (hash(k, 4) - .5) * 40, p[1] + 30 + (hash(k, 5) - .5) * 30, 11 * popLife(u), { rot: k, color: k % 2 ? GOLD : '#ffe6a3' }); }
}

// ---------------- yarn: one rolls in from the left, its twin pops out of the box ----------------
const YARN_L = 355, YARN_R = 800, YR = 58;
const spinImpulse = (t, t0, A = 9, tauS = .6) => t > t0 ? A * (1 - Math.exp(-(t - t0) / tauS)) : 0;
const hopAt = (t, t0, h = 22, d = .3) => { const u = (t - t0) / d; return u > 0 && u < 1 ? h * 4 * u * (1 - u) : 0; };
// squash on a contact: [sx, sy] about the ball's foot, rung down over a few frames
const contactSq = (t, t0, amp = .2) => { const u = t - t0; if (u < 0 || u > .45) return [1, 1]; const k = amp * Math.exp(-9 * u) * Math.cos(TAU * 2.4 * u); return [1 + k, 1 - k]; };
function rightYarn(t) {   // out of the open box in one arc, a squash on the table, one small bounce in place
  const S0 = [BOXG.x + 24, GROUND - 120], L1 = [YARN_R, GROUND - YR];
  if (t < 24.8) return null;
  if (t < 25.3) { const u = (t - 24.8) / .5, p = arc(S0, L1, u, 360); return { x: p[0], cy: p[1], roll: -u * 5, sq: [1 - .12 * Math.sin(Math.PI * u), 1 + .12 * Math.sin(Math.PI * u)], inBox: p[1] + YR > BOXG.TL[1] + 8 && p[0] > BOXG.FL[0] }; }
  if (t < 25.58) { const u = (t - 25.3) / .28; return { x: YARN_R, cy: GROUND - YR - 56 * 4 * u * (1 - u), roll: -5 - u * .6, sq: u < .2 ? contactSq(t, 25.3) : [1 - .06 * Math.sin(Math.PI * u), 1 + .06 * Math.sin(Math.PI * u)] }; }
  return { x: YARN_R, cy: GROUND - YR, roll: -5.6, sq: contactSq(t, 25.58, .1) };
}
function yarnAt(t) {
  if (t < 24.8) return null; const u = easeOut(clamp((t - 24.8) / .9, 0, 1)), xl = lerp(-110, YARN_L, u), R = rightYarn(t);
  const rot = spinImpulse(t, 26.2) + spinImpulse(t, 30.3), hop = hopAt(t, 26.2) + hopAt(t, 30.3), hsq = contactSq(t, 26.5, .12)[1] !== 1 ? contactSq(t, 26.5, .12) : contactSq(t, 30.6, .12);
  return { xl, yl: GROUND - hop, xr: R.x, yr: R.cy + YR - hop, rotL: rot + (xl - YARN_L) / YR, rotR: rot + R.roll, sqL: hsq, sqR: t < 26 ? R.sq : hsq, inBox: !!R.inBox,
    spinning: clamp((t > 26.2 ? Math.exp(-(t - 26.2) / .7) : 0) + (t > 30.3 ? Math.exp(-(t - 30.3) / .7) : 0), 0, 1) };
}
function yarnBall(c, x, footY, r, rot, seed, sq, glow = 0) {   // the shadow stays on the table and shrinks as the ball leaves it
  const h = GROUND - footY, k = clamp(1 - h / 260, .25, 1); c.save(); c.globalAlpha *= .2 * k; c.fillStyle = COL.graphite; c.beginPath(); c.ellipse(x, GROUND + 2, r * .95 * k, 8 * k, 0, 0, TAU); c.fill(); c.restore();
  c.save(); c.translate(x, footY); c.scale(sq[0], sq[1]); c.translate(-x, -footY); drawYarn(c, x, footY, { r, rot, seed, glow, shadow: 0 }); c.restore(); }
function yarnBalls(c, t, yarn, which = 'both') {
  if (!yarn) return; const fly = sm(41.8, 43.0, t, easeInOutSine); if (fly > 0) return;
  const glowR = t > 35.6 && t < 40.4 ? Math.max(0, 1 - Math.abs(((t - 35.6) % 1.6 + 1.6) % 1.6 - .1) / .3) : 0;
  if (which === 'left' || which === 'both') yarnBall(c, yarn.xl, yarn.yl, YR, yarn.rotL, 3, yarn.sqL, glowR);
  if (which !== 'left' && (which === 'inbox') === yarn.inBox) yarnBall(c, yarn.xr, yarn.yr, YR, yarn.rotR, 5, yarn.sqR, glowR);
}
function yarnFx(c, t, yarn) {
  if (!yarn) return;
  for (const t0 of [26.2, 30.3]) for (const [x, y] of [[yarn.xl, GROUND - YR], [yarn.xr, GROUND - YR]]) {   // both at the same instant
    ping(c, 'ent/' + t0 + '/' + Math.round(x), x, y, t, t0, { R: 70, r0: YR + 8, dur: .5, n: 2, gap: .09, color: COL.orange, w: 3.4 }); burst(c, x, y - YR - 10, t, t0, { n: 5, R: 70, dur: .5, size: 13, seed: Math.round(x) + t0 * 10, dots: false }); }
  const spinLines = (x, y, id) => { if (yarn.spinning < .08) return; for (let i = 0; i < 3; i++) { const a0 = -2.4 + i * .5; pencil(c, 'spin/' + id + i + '/' + Math.round(twos(t) * 12) % 4, [0, 1, 2].map(j => [x + Math.cos(a0 + j * .28 + twos(t) * 3) * (YR + 16 + i * 8), y + Math.sin(a0 + j * .28 + twos(t) * 3) * (YR + 16 + i * 8)]), { w: 1.6, al: yarn.spinning * .8 }); } };
  spinLines(yarn.xl, yarn.yl - YR, 'L'); spinLines(yarn.xr, yarn.yr - YR, 'R');
  puffs(c, 'yarnR1', YARN_R, GROUND, t, 25.3, { n: 2, dur: .45, spread: 44, size: 8 }); puffs(c, 'yarnR2', YARN_R, GROUND, t, 25.58, { n: 1, dur: .35, spread: 40, size: 6 }); puffs(c, 'yarnL', YARN_L + 20, GROUND, t, 25.55, { n: 2, dur: .4, spread: 36, size: 6, dirs: [1] });
  if (t > 28.35 && t < 29.4) { const k = easeOutBack(clamp((t - 28.35) / .12, 0, 1), 2) * (1 - sm(29.1, 29.4, t)); caption(c, '!?', HOME[0] + 150, GROUND - 360, { size: 84 * k, color: COL.orange, weight: 700, rot: .08 }); }
}

// ---------------- the network: the thread lifts and grows up to the qubit ----------------
const NET = {
  L1: [[330, 1090], [560, 1090], [790, 1090]],
  L2: [[300, 905], [460, 905], [625, 905], [790, 905]],
  L3: [[380, 735], [560, 735], [740, 735]]
};
function netNodes(yarn, coin) { return [[[yarn.xl, yarn.yl - YR], [yarn.xr, yarn.yr - YR]], NET.L1, NET.L2, NET.L3, [qubitPos(coin)]]; }
function netEdges(layers) { const E = []; for (let k = 0; k + 1 < layers.length; k++) layers[k].forEach((a, i) => layers[k + 1].forEach((b, j) => E.push({ k, i, j, a, b }))); return E; }
const bend = (a, b, amt = .08) => { const m = lerp2(a, b, .5), dx = b[0] - a[0], dy = b[1] - a[1]; return [a, [m[0] - dy * amt, m[1] + dx * amt], b]; };
// the mark, scaled for the portrait page; network nodes land on the ends of its circuit traces
const MK = .9, QC = [461, 680], QR = 150 * MK, QRI = 108 * MK;
const Q_TRACES = [
  [[-80, -40], [-40, -40], [-40, -78]], [[-84, 16], [-24, 16], [-24, -20], [10, -20]], [[-60, 62], [-8, 62], [-8, 40]],
  [[82, -30], [40, -30], [40, -70]], [[78, 30], [30, 30], [30, 64]], [[4, -86], [4, -46], [-10, -46]]
].map(T => T.map(([x, y]) => [x * MK, y * MK]));
function qTarget(k, i) { const T = Q_TRACES[(k * 3 + i) % Q_TRACES.length]; return [QC[0] + T[T.length - 1][0], QC[1] + T[T.length - 1][1]]; }
function strandsAct(c, t, yarn, coin) {
  if (!yarn || t < 25.6) return;
  const lift = sm(32.75, 33.55, t, easeOutBack), weave = sm(33.3, 35.8, t), collapse = sm(40.0, 41.3, t, easeInOutSine), gone = sm(40.9, 41.5, t);
  const L = netNodes(yarn, coin), ground = [0, 1, 2, 3, 4, 5, 6].map(n => { const u = n / 6; return [lerp(yarn.xl + YR * .7, yarn.xr - YR * .7, u), GROUND - 16 + 13 * Math.sin(Math.PI * u) + (n === 0 || n === 6 ? 0 : 0)]; });
  // the ground thread wiggles when the balls spin (a standing wave that dies away)
  const wv = (t > 26.2 ? Math.exp(-(t - 26.2) * 3) : 0) + (t > 30.3 ? Math.exp(-(t - 30.3) * 3) : 0);
  const g2 = ground.map(([x, y], n) => [x, y - 9 * wv * Math.sin(Math.PI * n / 6) * Math.sin(twos(t) * 26 + n)]);
  if (t < 32.75) { strand(c, 'ground/' + Math.round(wv * 10) + '/' + Math.round(twos(t) * 12) % 6, g2, { w: 3, progress: sm(25.62, 26.15, t, t => t) }); return; }
  if (gone >= 1) return;
  const spine = [L[0][0], L[1][0], L[2][1], L[3][1], L[2][2], L[1][2], L[0][1]];
  const at = (p, k, i) => collapse > 0 ? lerp2(p, qTarget(k, i), collapse) : p;
  const layers = L.map((layer, k) => layer.map((p, i) => at(p, k, i)));
  c.save(); c.globalAlpha *= 1 - gone;
  // the lifted thread: from the table to the spine of the network, twanging after the tug
  const tw = t - 32.75, twang = 16 * Math.exp(-3.6 * tw) * Math.sin(TAU * 7 * twos(t));
  const sp = ground.map((g, n) => { const p = lerp2(g, spine[n], clamp(lift, 0, 1.15)), s = Math.sin(Math.PI * n / 6); return [p[0] + twang * s * .6, p[1] + twang * s]; });
  if (weave < 1) strand(c, 'spine/' + Math.round(lift * 24) + '/' + Math.round(twang), sp, { w: 3, al: 1 - weave * .8 });
  const E = netEdges(layers), pulsesOn = t > 35.6 && collapse < .5, period = 1.6, hopT = .42;
  E.forEach((e, n) => { const start = 33.3 + e.k * .5 + (n % 5) * .07, p = clamp((t - start) / .55, 0, 1); if (p <= 0) return;
    const path = bend(e.a, e.b, .06); strand(c, 'edge/' + n + '/' + Math.round(collapse * 30), path, { w: 2.8, progress: p, al: .92 });
    if (pulsesOn) { const ph = ((t - 35.6 - e.k * hopT) % period + period) % period / hopT; if (ph >= 0 && ph <= 1) { const mp = motionPath(path);   // a pulse with a short comet tail
      for (let j = 3; j >= 0; j--) { const uu = easeInOutSine(ph) - j * .07; if (uu < 0) continue; const q = mp.at(uu).p; c.fillStyle = alpha(COL.orange, j ? .5 - j * .12 : 1); c.beginPath(); c.arc(q[0], q[1], j ? 7 - j * 1.2 : 8.5, 0, TAU); c.fill(); } } } });
  // knots at the hidden layers pop in with a flash; the input and output are the yarn and the qubit themselves
  for (let k = 1; k <= 3; k++) layers[k].forEach((p, i) => { const bornT = 33.4 + k * .5 + i * .08, born = clamp((t - bornT) / .25, 0, 1); if (born <= 0) return;
    const flash = pulsesOn ? Math.max(0, 1 - Math.abs(((t - 35.6 - (k - .5) * hopT) % period + period) % period - hopT) / .2) : 0;
    if (flash > 0) { c.fillStyle = alpha(COL.orange, .35 * flash); c.beginPath(); c.arc(p[0], p[1], 32, 0, TAU); c.fill(); }
    c.fillStyle = mix('#3e6394', COL.orange, flash * .7); c.beginPath(); c.arc(p[0], p[1], 19 * easeOutBack(born, 2.4), 0, TAU); c.fill();
    pencil(c, 'knot/' + k + i, ellPts(p[0], p[1], 19, 19, 0, 22), { w: 2, color: '#1b2d47', close: true, al: born });
    if (collapse <= 0) ping(c, 'knot/' + k + i, p[0], p[1], t, bornT + .05, { R: 26, r0: 20, dur: .3, n: 1, color: COL.navy, w: 1.6 }); });
  if (collapse > .02 && collapse < .95) layers.slice(1, 4).forEach((layer, k) => layer.forEach((p, i) => { const q0 = L[k + 1][i], dir = Math.atan2(qTarget(k + 1, i)[1] - q0[1], qTarget(k + 1, i)[0] - q0[0]);   // gathering streaks
    motionLines(c, 'gather/' + k + i, p[0], p[1], dir, { n: 2, len: 50 * Math.sin(Math.PI * collapse), spread: 14, gap: 16, al: .55, w: 1.4, color: COL.navy, seed: k * 5 + i }); }));
  c.restore();
}

// ---------------- the mark: QARC, drawn then inked like a stamp ----------------
const ORBITS = [{ rot: -.52, ph: .3 }, { rot: .52, ph: 2.4 }, { rot: Math.PI / 2, ph: 4.2 }];
const ORX = 262 * MK, ORY = 88 * MK;
function orbitPt(o, a) { const x = Math.cos(a) * ORX, y = Math.sin(a) * ORY, k = Math.cos(o.rot), s = Math.sin(o.rot); return [QC[0] + x * k - y * s, QC[1] + x * s + y * k]; }
function electronsAt(t, yarn, coin) {   // the qubit and both yarn balls become the three electrons
  const fly = sm(41.8, 43.0, t, easeInOutSine), spinA = (t - 43) * .9;
  const src = [qubitPos(coin), yarn ? [yarn.xl, yarn.yl - YR] : [YARN_L, GROUND - YR], yarn ? [yarn.xr, yarn.yr - YR] : [YARN_R, GROUND - YR]];
  return ORBITS.map((o, n) => { const a = o.ph + Math.max(0, spinA), dest = orbitPt(o, a), p = lerp2(src[n], dest, fly); return { p, r: lerp(n ? YR : QUBIT_R, 15, fly), fly, n, o, a }; });
}
const ARC_X = QC[0] + 196, ARC_Y = QC[1] + 83, SUB_Y = QC[1] + ORX + 56, DEPT_Y = SUB_Y + 52;
function markAct(c, t, yarn, coin) {
  if (t < 40.4) return;
  const pencilQ = sm(40.5, 41.2, t), ink = sm(41.1, 41.9, t, easeInOutSine), traces = sm(41.0, 42.2, t), orb = sm(41.4, 42.7, t, easeInOutSine), arcK = sm(42.8, 44.0, t), sub = sm(44.2, 45.1, t), dept = sm(45.0, 45.8, t);
  const stamp = t > 41.1 ? 1 + .06 * Math.exp(-7 * (t - 41.1)) * Math.cos(TAU * 2.2 * (t - 41.1)) * sm(41.1, 41.2, t) : 1;   // the ink lands with a press
  c.save(); c.translate(QC[0], QC[1]); c.scale(stamp, stamp); c.translate(-QC[0], -QC[1]);
  const ring = new Path2D(); ring.arc(QC[0], QC[1], QR, 0, TAU); ring.arc(QC[0], QC[1], QRI, 0, TAU, true);
  const tail = polyPath([[62, 96], [98, 74], [178, 176], [140, 196]].map(([x, y]) => [QC[0] + x * MK, QC[1] + y * MK]));
  if (ink > 0) { c.save(); c.beginPath(); c.rect(QC[0] - QR - 20, QC[1] + QR + 60 - (2 * QR + 120) * ink, 2 * QR + 240, (2 * QR + 120) * ink + 10); c.clip(); c.fillStyle = COL.navy; c.fill(ring, 'evenodd'); c.fill(tail); c.restore(); }
  pencil(c, 'Q/outer', ellPts(QC[0], QC[1], QR, QR, -1.2, 60), { w: 2.6, close: true, progress: pencilQ, al: 1 - ink * .6 });
  pencil(c, 'Q/inner', ellPts(QC[0], QC[1], QRI, QRI, -1.2, 50), { w: 2, close: true, progress: pencilQ, al: 1 - ink * .6 });
  Q_TRACES.forEach(T => { const pts = T.map(([x, y]) => [QC[0] + x, QC[1] + y]); if (traces <= 0) return;
    c.save(); c.strokeStyle = COL.navy; c.lineWidth = 7 * MK; c.lineCap = 'round'; c.lineJoin = 'round'; c.setLineDash([pathLength(pts) * traces, 999]); c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.stroke(); c.restore();
    if (traces > .8) { const e = pts[pts.length - 1]; c.fillStyle = COL.navy; c.beginPath(); c.arc(e[0], e[1], 10 * MK, 0, TAU); c.fill(); c.fillStyle = COL.paper; c.beginPath(); c.arc(e[0], e[1], 4.5 * MK, 0, TAU); c.fill(); } });
  c.restore();
  ORBITS.forEach(o => { const pts = []; for (let i = 0; i <= 64; i++) pts.push(orbitPt(o, i / 64 * TAU)); c.save(); c.strokeStyle = COL.navy; c.lineWidth = 4.2 * MK; c.setLineDash([pathLength(pts) * orb, 9999]); c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p)); c.stroke(); c.restore(); });
  ping(c, 'stamp', QC[0], QC[1], t, 41.15, { R: 120, r0: QR + 8, dur: .45, n: 2, gap: .08, color: COL.navy, w: 2.4 });
  // A R C: a pencil outline, then the ink wipes in; a shine crosses it once it is dry
  if (arcK > 0) { c.save(); c.font = `600 ${250 * MK}px ${PRINT}`; c.textBaseline = 'alphabetic'; c.textAlign = 'left'; const wAll = c.measureText('ARC').width;
    c.beginPath(); c.rect(ARC_X - 10, ARC_Y - 300 * MK, (wAll + 20) * arcK, 360 * MK); c.clip(); c.strokeStyle = alpha(COL.graphite, .7); c.lineWidth = 2; c.strokeText('ARC', ARC_X, ARC_Y);
    c.fillStyle = COL.navy; c.globalAlpha = sm(.35, 1, arcK); c.fillText('ARC', ARC_X, ARC_Y); c.restore();
    const sh = sm(44.5, 45.3, t, t => t); if (sh > 0 && sh < 1) { c.save(); c.font = `600 ${250 * MK}px ${PRINT}`; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; const gx = ARC_X - 120 + (wAll + 240) * sh;
      const gr = c.createLinearGradient(gx - 60, 0, gx + 60, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillText('ARC', ARC_X, ARC_Y); c.restore(); } }
  if (sub > 0) { c.save(); c.globalAlpha = sub; c.fillStyle = COL.navy; c.font = `600 ${41 * MK}px ${PRINT}`; c.textAlign = 'center'; c.letterSpacing = '3px'; c.fillText('QUANTUM & AI RESEARCH CELL', PAGE_W / 2 + 1.5, SUB_Y); c.restore(); }
  if (dept > 0) { c.save(); c.globalAlpha = dept; c.fillStyle = COL.graphite; c.font = `500 ${27 * MK}px ${PRINT}`; c.textAlign = 'center'; c.fillText('Department of Computer Science & Engineering · SSIT', PAGE_W / 2, DEPT_Y); c.restore(); }
  twinkles(c, [[QC[0] - 250, QC[1] - 190], [QC[0] + 30, QC[1] - 280], [ARC_X + 470, ARC_Y - 210], [ARC_X + 520, ARC_Y + 20], [QC[0] - 290, QC[1] + 120]], t, 43.2, 48.4, { period: 1.7, size: 16 });
}
function electronsDraw(c, t, yarn, coin) {
  if (t < 41.8) return; electronsAt(t, yarn, coin).forEach(e => {
    if (e.fly >= 1) { for (let j = 3; j >= 1; j--) { const q = orbitPt(e.o, e.a - j * .09); c.fillStyle = alpha(COL.navy, .22 - j * .05); c.beginPath(); c.arc(q[0], q[1], 13 - j * 2, 0, TAU); c.fill(); }   // a short trail round the orbit
      c.fillStyle = COL.navy; c.beginPath(); c.arc(e.p[0], e.p[1], 15, 0, TAU); c.fill(); c.fillStyle = alpha('#ffffff', .35); c.beginPath(); c.arc(e.p[0] - 5, e.p[1] - 5, 5, 0, TAU); c.fill(); }
    else { if (e.fly > .05) { const back = electronsAt(t - .08, yarn, coin)[e.n].p, dir = Math.atan2(e.p[1] - back[1], e.p[0] - back[0]); motionLines(c, 'elec/' + e.n, e.p[0], e.p[1], dir, { n: 3, len: 70 * Math.sin(Math.PI * e.fly), spread: e.r * 1.2, gap: e.r * .9, al: .6, w: 1.6, color: COL.navy, seed: 20 + e.n }); }
      if (e.n === 0) drawCoin(c, e.p[0], e.p[1] + e.r, { r: e.r, spin: 1, angle: t * 40, shadow: 0 }); else drawYarn(c, e.p[0], e.p[1] + e.r, { r: e.r, rot: t * 3, seed: e.n === 1 ? 3 : 5 }); } });
  [[42.95, 0], [43.05, 1], [43.15, 2]].forEach(([t0, n]) => { const o = ORBITS[n], p = orbitPt(o, o.ph + Math.max(0, (t0 - 43) * .9)); burst(c, p[0], p[1], t, t0, { n: 5, R: 50, dur: .45, size: 10, seed: 30 + n, dots: false }); });
}

// ---------------- the seed ----------------
const POT = [330, GROUND];
function potAt(t) {   // the pot drops onto the table, squashes, springs back
  if (t < 47.35) return null; const fall = clamp((t - 47.35) / .3, 0, 1), dy = -420 * (1 - fall * fall), sq = t > 47.65 ? settle(t, 47.65, { amp: .16, freq: 3, decay: 7, phase: Math.PI / 2 }) : 0;
  return { dy, sx: 1 + sq * .8, sy: 1 - sq };
}
function canState(t) {
  if (t < 48.9 || t > 52.6) return null; const inn = sm(48.9, 49.8, t, easeOutQuint), out = sm(51.7, 52.6, t, easeIn);
  const x = lerp(-260, 262, inn) - out * 420, y = lerp(GROUND - 1000, GROUND - 268, inn) - out * 520, tilt = sm(49.7, 50.3, t) * (1 - sm(51.4, 51.8, t)) * .62;
  return { x, y, tilt, pour: t > 50.1 && t < 51.5 };
}
function seedAct(c, t) {
  const pot = potAt(t); if (!pot) return;
  c.save(); c.translate(POT[0], POT[1] + pot.dy); c.scale(pot.sx, pot.sy); c.translate(-POT[0], -POT[1]); drawPot(c, POT[0], POT[1]); c.restore();
  // a seed tumbles in, bounces once on the soil
  const soil = GROUND - 128; if (t > 48.0 && t < 48.62) { const u = clamp((t - 48.0) / .35, 0, 1), b = clamp((t - 48.35) / .27, 0, 1), y = t < 48.35 ? lerp(GROUND - 470, soil - 4, easeIn(u)) : soil - 4 - 26 * 4 * b * (1 - b);
    c.save(); c.translate(POT[0] + 6 + (t > 48.35 ? b * 10 : 0), y); c.rotate(twos(t) * 9); c.fillStyle = '#7a5231'; c.beginPath(); c.ellipse(0, 0, 10, 6.5, 0, 0, TAU); c.fill(); c.strokeStyle = alpha(COL.graphite, .8); c.lineWidth = 1.3; c.stroke(); c.restore(); }
  ping(c, 'seed', POT[0] + 12, soil - 2, t, 48.6, { R: 34, r0: 8, dur: .35, n: 1, color: '#5a3f2c', w: 1.6, squash: .3 });
  drawSaplingLive(c, POT[0], soil + 4, sm(50.5, 53.6, t, t => t), t);
}
function seedFx(c, t) {
  puffs(c, 'pot', POT[0], GROUND, t, 47.65, { n: 2, dur: .45, spread: 70, size: 9 });
  burst(c, POT[0], GROUND - 128 - 200, t, 53.55, { n: 7, R: 120, dur: .8, size: 16, seed: 17, colors: [GOLD, COL.green, '#ffe6a3'] });
}
function waterAct(c, t) {
  const s = canState(t), soil = GROUND - 132; if (!s) return; const rose = canRose(s.x, s.y, s.tilt, -1);
  for (let i = 0; i < 30; i++) { const born = 50.1 + i * .05, age = t - born; if (age < 0 || born > 51.5) continue; const u = age / .42, sx = rose[0] + (hash(i, 5) - .5) * 16, ex = POT[0] + (hash(i, 6) - .5) * 70;
    if (u < 1) { const x = lerp(sx, ex, u), y = lerp(rose[1], soil, u * u); c.strokeStyle = alpha('#4f86b8', .85); c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 2, y + 12); c.stroke(); }
    else if (u < 1.55 && i % 2 === 0) { const v = (u - 1) / .55; for (const s2 of [-1, 1]) { const x = ex + s2 * (6 + 22 * v), y = soil - 26 * 4 * v * (1 - v); c.fillStyle = alpha('#4f86b8', .8 * (1 - v)); c.beginPath(); c.arc(x, y, 3.2 * (1 - v * .5), 0, TAU); c.fill(); } } }   // splashes off the soil
  for (let k = 0; k < 3; k++) { const born = 51.5 + k * .13, u = (t - born) / .35; if (u < 0 || u > 1) continue; c.fillStyle = alpha('#4f86b8', .85); c.beginPath(); c.ellipse(rose[0] + 4, rose[1] + 10 + 90 * u * u, 3.2, 4.4, 0, 0, TAU); c.fill(); }   // it drips as it lifts
  drawCan(c, s.x, s.y, s.tilt, -1);
}

// ---------------- captions ----------------
// Placed by where they sit on a phone screen at the moment they are written (sx, sy in frame pixels,
// px their height there), then they belong to the page like everything else. Late ones are page units.
const CAPTIONS = [
  { t0: .2, t1: 4.8, text: 'Department of CSE · SSIT presents', sx: 540, sy: 330, px: 40, font: PRINT, weight: 600, write: .6 },
  { t0: 2.8, t1: 5.2, text: 'There’s a cat in this box.', sx: 540, sy: 1392, px: 66 },
  { t0: 5.5, t1: 8.1, text: 'Asleep… or awake?', sx: 540, sy: 1392, px: 72 },
  { t0: 8.3, t1: 11.9, text: 'Quantum says: both.', sx: 540, sy: 1330, px: 68, weight: 700, color: COL.navy, write: .9 },
  { t0: 9.3, t1: 11.9, text: 'Until you look.', sx: 540, sy: 1425, px: 68, weight: 700, color: COL.navy, write: .7 },
  { t0: 14.0, t1: 16.4, text: '(definitely awake.)', sx: 540, sy: 1392, px: 66, color: COL.orange, write: .8 },
  { t0: 18.3, t1: 21.3, text: 'A bit is either 0 or 1.', sx: 540, sy: 1392, px: 70 },
  { t0: 21.5, t1: 24.9, text: 'A qubit can be both at once.', sx: 540, sy: 1392, px: 64, weight: 700, color: COL.navy },
  { t0: 27.0, t1: 32.3, text: 'Entangled: touch one…', sx: 540, sy: 1340, px: 70 },
  { t0: 28.4, t1: 32.3, text: '…and the other one knows.', sx: 540, sy: 1432, px: 64, weight: 700, color: COL.navy },
  { t0: 33.4, t1: 36.2, text: 'Now teach the threads to learn.', sx: 540, sy: 300, px: 60, anchor: 33.9 },
  { t0: 36.4, t1: 39.8, text: 'Quantum + AI', sx: 540, sy: 330, px: 118, weight: 700, color: COL.navy, write: .7 },
  { t0: 48.4, t1: 51.8, text: 'Every big idea starts as a seed.', sx: 540, sy: 1392, px: 60 },
  { t0: 52.0, t1: 57.9, text: 'This Saturday, we plant ours.', sx: 540, sy: 1392, px: 66, weight: 700, color: COL.navy },
  { t0: 67.6, t1: 999, text: 'Don’t stay in superposition.', x: 675, y: 1612, size: 56, write: 1.3 },
  { t0: 69.1, t1: 999, text: 'Be there!', x: 675, y: 1748, size: 116, weight: 700, color: COL.orange, write: .6 }
];
let _capKey = '';
function placeCaptions() { const key = W + 'x' + H; if (_capKey === key) return; _capKey = key;
  for (const k of CAPTIONS) if (k.sx !== undefined) { const [x, y, z] = pageAtScreen(k.sx, k.sy, k.anchor ?? k.t0); k.x = x; k.y = y; k.size = k.px / z; } }
function captionsAct(c, t) {
  placeCaptions();
  for (const k of CAPTIONS) { if (t < k.t0 || t > k.t1 + .4) continue; const write = clamp((t - k.t0) / (k.write ?? 1.1), 0, 1), fade = 1 - sm(k.t1, k.t1 + .4, t);
    caption(c, k.text, k.x, k.y, { size: k.size, color: k.color || COL.graphite, weight: k.weight || 400, font: k.font || HAND, write, fade }); }
}

// ---------------- everything on the page at time t ----------------
function worldAt(c, t) {
  pageGrain(c); tableLine(c);
  const yarn = yarnAt(t), coin = coinAt(t), cat = catAt(t), box = boxState(t);
  markAct(c, t, yarn, coin);
  if (t < 41.5) strandsAct(c, t, yarn, coin);
  yarnBalls(c, t, yarn, 'left'); yarnBalls(c, t, yarn, 'right');
  c.save(); c.translate(BOXG.x, BOXG.y); c.rotate(box.rot); c.scale(box.sx, box.sy); c.translate(-BOXG.x, -BOXG.y - box.hop);
  drawBox(c, BOXG, { open: box.open, progress: box.fill, xray: box.xray, seq: boxSeq(boxPen(t)), inside: g => { ghostCats(g, t, box.xray); if (cat && cat.inside) catDraw(g, cat, t); yarnBalls(g, t, yarn, 'inbox'); } });
  if (t < 2.2) { const pt = penTip(t), wob = Math.sin(twos(t) * 17) * .03; drawnPencil(c, pt.p[0], pt.p[1], -1.05 + wob, { al: pt.al }); }
  c.restore();
  lookEye(c, BOXG.x + 30, GROUND - 460, t); snoring(c, t);
  if (coin && coin.lift < 1 && t < 22.2) drawCoin(c, coin.x, coin.y, coin);
  seedAct(c, t);
  if (cat && !cat.inside) catDraw(c, cat, t);
  if (coin && (coin.lift >= 1 || t >= 22.2) && t < 41.8) drawCoin(c, coin.x, coin.y, { ...coin, shadow: clamp(1 - coin.lift / 160, 0, 1) });
  qubitDetail(c, t, coin); coinFx(c, t, coin); yarnFx(c, t, yarn); popFx(c, t); seedFx(c, t);
  dizzyStars(c, HOME[0] - 8, GROUND - 350, t, 22.25, 23.55);
  electronsDraw(c, t, yarn, coin);
  waterAct(c, t); captionsAct(c, t);
  twinkles(c, [[395, 1690], [965, 1668], [1000, 1765], [352, 1770], [690, 1636]], t, 69.4, 75.5, { period: 1.6, size: 18 });   // "Be there!" glints
}
function sketchbookScene(c, tau) {
  resetT(c); c.fillStyle = COL.paper; c.fillRect(0, 0, W, H);
  const [x, y, z] = camAt(tau); cam(c, x, y, z); worldAt(c, tau);
}
