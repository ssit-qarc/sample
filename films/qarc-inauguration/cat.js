'use strict';
// ============================================================
// THE CAT. Whole drawings authored as semantic landmark polylines in local
// units: origin on the ground between the front paws, up is negative y.
// Every pose of the sitting family shares one topology (same part names and
// point counts), so assisted inbetweens can run between them; eyes that
// change state (open, closed, happy, dizzy) are replacement drawings.
// A pose is compiled once and cached as a sprite, so a held drawing holds
// its pencil marks too.
// ============================================================
const COL = {
  paper: '#f4eee2', graphite: '#2e2823', navy: '#1f3a5c', orange: '#e0702a', green: '#4f8d58',
  fur: '#f5cf9f', furShade: '#dda067', stripe: '#cf6f2c', cream: '#fcf6ea', iris: '#8fbf4a', pupil: '#1d2433', nose: '#e58a7c'
};
const PRESS = [[0, .12], [.14, .85], [.45, 1], [.78, .7], [1, .08]];
const CAT_FACE = { eyeL: [-27, -2], eyeR: [27, -2], nose: [0, 19] };
const CAT_LINE = 1.5, HEAD_SCALE = 1.08;   // contour weight for small screens; a slightly larger head for appeal

// Head outline relative to the head centre: flat crown, full cheeks, soft chin.
const HEAD_REL = [[0, -54], [26, -52], [50, -41], [64, -20], [73, 6], [62, 30], [35, 46], [0, 52], [-35, 46], [-62, 30], [-73, 6], [-64, -20], [-50, -41], [-26, -52]];
const EAR_L_REL = [[-60, -30], [-68, -70], [-62, -104], [-40, -74], [-19, -53]];
const EAR_R_REL = [[19, -53], [40, -74], [62, -104], [68, -70], [60, -30]];

// The sitting family (3/4 front, body behind to screen right, tail up like a question mark).
const SIT = {
  head: [-4, -214],
  torso: [[-40, -176], [-56, -150], [-64, -110], [-62, -62], [-56, -22], [-44, -2], [-4, 3], [40, 3], [80, 0], [102, -12], [110, -44], [102, -84], [84, -120], [62, -150], [40, -176]],
  legL: [[-40, -100], [-44, -54], [-44, -14], [-42, -1], [-31, 3], [-19, 2], [-16, -10], [-18, -52], [-20, -96]],
  legR: [[-6, -98], [-6, -52], [-4, -12], [-2, 0], [10, 3], [22, 1], [24, -10], [20, -52], [14, -94]],
  haunch: [[44, -72], [76, -78], [98, -54], [100, -20], [88, -2]],
  hindPaw: [[36, 1], [44, -9], [60, -9], [68, 1]],
  tail: [[98, -8], [140, -14], [164, -52], [160, -104], [140, -138], [114, -146], [100, -128], [108, -108]]
};
const TAILS = {
  question: SIT.tail,
  up: [[98, -8], [136, -18], [150, -60], [148, -110], [142, -156], [140, -196], [146, -226], [158, -240]],
  low: [[98, -8], [140, -6], [178, -10], [212, -18], [238, -30], [256, -46], [262, -64], [256, -80]],
  wrap: [[98, -8], [110, 4], [90, 12], [50, 14], [10, 14], [-30, 12], [-58, 8], [-70, 0]],
  swishA: [[98, -8], [140, -12], [170, -44], [178, -92], [168, -134], [146, -160], [124, -164], [114, -148]],
  swishB: [[98, -8], [138, -16], [158, -56], [150, -104], [126, -134], [98, -140], [84, -122], [92, -104]]
};
// Front legs that leave the ground: a raised paw keeps the same point order (shoulder, outside, paw, inside).
const LEGS = {
  batR: [[-6, -98], [8, -120], [30, -146], [50, -162], [66, -164], [74, -154], [64, -140], [36, -118], [14, -94]],
  reachR: [[-6, -98], [16, -104], [46, -108], [76, -110], [92, -104], [94, -92], [82, -86], [46, -86], [14, -88]],
  patL: [[-40, -100], [-62, -96], [-90, -88], [-116, -76], [-128, -64], [-124, -52], [-110, -54], [-78, -70], [-20, -96]],
  upL: [[-40, -100], [-72, -150], [-100, -214], [-118, -266], [-112, -284], [-96, -284], [-88, -262], [-66, -200], [-20, -96]],
  upR: [[-6, -98], [30, -150], [62, -214], [84, -264], [100, -278], [114, -270], [106, -250], [76, -196], [14, -94]],
  waveL: [[-40, -100], [-70, -128], [-100, -170], [-122, -214], [-124, -236], [-110, -242], [-100, -224], [-80, -180], [-20, -96]],
  tugR: [[-6, -98], [4, -80], [16, -58], [30, -44], [44, -44], [48, -54], [40, -64], [24, -78], [14, -94]],
  downL: [[-40, -100], [-58, -76], [-78, -46], [-96, -18], [-100, -4], [-88, 0], [-80, -12], [-60, -40], [-20, -96]],
  downR: [[-6, -98], [-20, -70], [-38, -40], [-54, -10], [-56, 4], [-44, 6], [-38, -6], [-20, -38], [14, -94]]
};

const rotAbout = (p, c, a) => { const s = Math.sin(a), k = Math.cos(a), x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + x * k - y * s, c[1] + x * s + y * k]; };
const shiftPts = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
const scalePts = (pts, c, sx, sy) => pts.map(([x, y]) => [c[0] + (x - c[0]) * sx, c[1] + (y - c[1]) * sy]);
const mean = pts => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];

// A pose: which body landmarks, where the head sits, how it tilts and turns, what the face does.
// Everything returned is plain point data; catRaw turns it into cel strokes.
function catPose(o = {}) {
  const b = o.body || SIT, tilt = o.tilt || 0, turn = o.turn || 0, [hdx, hdy] = o.headOffset || [0, 0];
  const sq = o.squash || [1, 1], ground = [0, 0];
  const hc = [b.head[0] * sq[0] + hdx, b.head[1] * sq[1] + hdy], neck = [hc[0], hc[1] + 48];
  const bodyPt = pts => scalePts(pts, ground, sq[0], sq[1]);
  const headSq = o.headSquash || [1, 1];
  // Head group: squash about the chin, turn by leaning the face towards one side, tilt about the neck.
  const headPt = rel => { let [x, y] = [rel[0] * HEAD_SCALE, rel[1] * HEAD_SCALE]; const side = Math.sign(x) === Math.sign(turn) ? 1 - .10 * Math.abs(turn) : 1 + .05 * Math.abs(turn); x *= side; x *= headSq[0]; y = (y - 56) * headSq[1] + 56;
    return rotAbout([hc[0] + x, hc[1] + y], neck, tilt); };
  const facePt = rel => { const [x, y] = rel; const far = Math.sign(x) !== Math.sign(turn) && turn !== 0 ? .9 : 1; return headPt([x * (turn ? far : 1) + turn * 15, y + (o.faceDy || 0)]); };
  const earPt = (rel, a) => { const base = [(rel[0][0] + rel[4][0]) / 2, (rel[0][1] + rel[4][1]) / 2]; return rel.map(p => headPt(rotAbout(p, base, a))); };
  const [earA, earB] = o.ears || [0, 0];
  return {
    torso: bodyPt(b.torso), legL: bodyPt(LEGS[o.legL] || b.legL), legR: bodyPt(LEGS[o.legR] || b.legR), haunch: bodyPt(o.haunch || b.haunch), hindPaw: bodyPt(o.hindPaw || b.hindPaw),
    tail: bodyPt(o.tail ? (TAILS[o.tail] || o.tail) : b.tail),
    head: HEAD_REL.map(headPt), earL: earPt(EAR_L_REL, -earA), earR: earPt(EAR_R_REL, earB),
    eyeL: facePt(CAT_FACE.eyeL), eyeR: facePt(CAT_FACE.eyeR), nose: facePt(CAT_FACE.nose), facePt, headPt,
    look: o.look || [0, 0], eyes: o.eyes || 'open', eyeScale: o.eyeScale || 1, pupil: o.pupil || 1, mouth: o.mouth || 'smile', tilt, turn
  };
}

// Tail: a tapered tube around its centre line, built once per drawing.
function tubeOutline(center, w0, w1) {
  const path = motionPath(center, { smooth: true }), n = 22, left = [], right = [];
  for (let i = 0; i <= n; i++) { const u = i / n, { p, tangent } = path.at(u), w = lerp(w0, w1, Math.pow(u, .8)) * (i === n ? .55 : 1); left.push([p[0] - tangent[1] * w, p[1] + tangent[0] * w]); right.push([p[0] + tangent[1] * w, p[1] - tangent[0] * w]); }
  const tip = path.at(1), cap = [tip.p[0] + tip.tangent[0] * w1 * .9, tip.p[1] + tip.tangent[1] * w1 * .9];
  return { left, right, cap, closed: [...left, cap, ...right.reverse()], path };
}

// The cel: contours, fur marks and face as pencil strokes with semantic ids.
const catStrokeAdder = strokes => (id, points, width = 2.2, opacity = 1, extra = {}) => strokes.push({ id, points, width: width * CAT_LINE, opacity: Math.min(1, opacity * 1.08), pressure: PRESS, ...extra });
function catTailStrokes(q, add) {
  const tube = tubeOutline(q.tail, 14, 7);
  add('tail/l', tube.left, 2, .95); add('tail/r', tube.right.slice().reverse(), 2, .95);
  for (let i = 0; i < 4; i++) { const u = .25 + i * .17, a = tube.path.at(u), w = 12 - i * 1.4; add('tail/ring/' + i, [[a.p[0] - a.tangent[1] * w, a.p[1] + a.tangent[0] * w], [a.p[0] + a.tangent[0] * 3, a.p[1] + a.tangent[1] * 3], [a.p[0] + a.tangent[1] * w, a.p[1] - a.tangent[0] * w]], 2.2, .8, { color: COL.stripe }); }
}
// q.noTail leaves the tail out of the body drawing, for a film that draws the tail as its own cel behind it (catTailCel).
function catRaw(q) {
  const strokes = [], add = catStrokeAdder(strokes);
  if (!q.noTail) catTailStrokes(q, add);
  add('torso', q.torso.slice(0, 8), 2.5, 1); add('torso/back', q.torso.slice(7).concat([q.torso[0]]).slice(0, 8), 2.5, 1);
  add('haunch', q.haunch, 2.1, .9); add('hindPaw', q.hindPaw, 1.9, .85);
  add('legL', q.legL, 2.2, 1, { corner: 1.2 }); add('legR', q.legR, 2.2, 1, { corner: 1.2 });
  for (const leg of ['legL', 'legR']) { const L = q[leg], toe = L[4]; add(leg + '/toe1', [[toe[0] - 3, toe[1] - 6], [toe[0] - 2, toe[1] - 1]], 1.2, .7); add(leg + '/toe2', [[toe[0] + 5, toe[1] - 6], [toe[0] + 5, toe[1] - 1]], 1.2, .7); }
  // chest fur: short downward ticks along the chest axis, quiet on the lit side
  const [chestTop, chestLow] = chestAxis(q);
  for (let i = 0; i < 7; i++) { const u = .12 + i * .1, side = (hash(i, 3) - .5) * 30, p0 = [lerp(chestTop[0], chestLow[0], u) + side, lerp(chestTop[1], chestLow[1], u)]; add('chest/' + i, [p0, [p0[0] + 2, p0[1] + 8], [p0[0] + 1, p0[1] + 13]], 1, .45); }
  // back stripes in orange pencil
  for (let i = 0; i < 4; i++) { const a = q.torso[10 + (i > 1 ? 1 : 0)], b = q.torso[12 - (i > 1 ? 1 : 0)], u = (i + .5) / 4, x = lerp(q.torso[9][0], q.torso[13][0], u), y = lerp(q.torso[9][1], q.torso[13][1], u); add('stripe/back/' + i, [[x, y], [x - 16, y + 8], [x - 26, y + 22]], 2.6, .75, { color: COL.stripe }); }
  add('earL', q.earL, 2.2, 1, { corner: .9 }); add('earR', q.earR, 2.2, 1, { corner: .9 });
  const inner = (e, id) => add(id, [lerp2(e[0], e[1], .55), lerp2(e[1], e[2], .65), lerp2(e[3], e[4], .45)], 1.2, .6, { corner: .9 });
  inner(q.earL, 'earL/in'); inner(q.earR, 'earR/in');
  add('head', q.head.slice(3, 11), 2.4, 1); add('head/crown', [...q.head.slice(10), ...q.head.slice(0, 4)], 2.3, 1);
  // cheek tufts and the tabby M on the forehead
  add('tuft/l', [q.facePt([-70, 4]), q.facePt([-80, 10]), q.facePt([-70, 16])], 1.6, .8, { corner: .6 }); add('tuft/r', [q.facePt([70, 4]), q.facePt([80, 10]), q.facePt([70, 16])], 1.6, .8, { corner: .6 });
  for (let i = 0; i < 3; i++) { const x = -12 + i * 12; add('stripe/brow/' + i, [q.facePt([x, -48]), q.facePt([x * .9, -38]), q.facePt([x * .8, -30])], 2.4, .75, { color: COL.stripe }); }
  add('stripe/cheekL', [q.facePt([-66, -6]), q.facePt([-50, -4])], 2.2, .65, { color: COL.stripe }); add('stripe/cheekR', [q.facePt([66, -6]), q.facePt([50, -4])], 2.2, .65, { color: COL.stripe });
  // mouth and whiskers
  const m = q.mouth;
  add('philtrum', [q.facePt([0, 23]), q.facePt([0, 28])], 1.5, .9);
  if (m === 'open' || m === 'o') { const r = m === 'o' ? 7 : 10; add('mouth', [q.facePt([-r, 30]), q.facePt([-r * .7, 30 + r * 1.2]), q.facePt([0, 30 + r * 1.5]), q.facePt([r * .7, 30 + r * 1.2]), q.facePt([r, 30]), q.facePt([0, 28])], 1.8, .95, { close: true }); }
  else if (m === 'flat') add('mouth', [q.facePt([-10, 32]), q.facePt([0, 30]), q.facePt([10, 32])], 1.6, .9);
  else { add('mouth/l', [q.facePt([0, 28]), q.facePt([-6, 34]), q.facePt([-13, 31])], 1.6, .9); add('mouth/r', [q.facePt([0, 28]), q.facePt([6, 34]), q.facePt([13, 31])], 1.6, .9); }
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) add('whisker/' + s + '/' + i, [q.facePt([s * 34, 18 + i * 6]), q.facePt([s * 62, 12 + i * 10 - (i === 0 ? 4 : 0)]), q.facePt([s * 92, 6 + i * 16])], .9, .55);
  // eyes as strokes when closed or happy; open eyes are painted in catFace
  const e = q.eyes;
  const shut = (id, c, happy) => add(id, happy ? [q.facePt([c[0] - 13, c[1] + 4]), q.facePt([c[0], c[1] - 8]), q.facePt([c[0] + 13, c[1] + 4])] : [q.facePt([c[0] - 14, c[1] + 1]), q.facePt([c[0], c[1] + 7]), q.facePt([c[0] + 14, c[1] + 1])], 2.4, 1);
  if (e === 'closed') { shut('eyeL/shut', CAT_FACE.eyeL, false); shut('eyeR/shut', CAT_FACE.eyeR, false); }
  if (e === 'happy') { shut('eyeL/shut', CAT_FACE.eyeL, true); shut('eyeR/shut', CAT_FACE.eyeR, true); }
  if (e === 'wink') shut('eyeR/shut', CAT_FACE.eyeR, true);
  return { strokes };
}
const lerp2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
// The pale chest runs from under the chin to between the shoulders of the front legs.
const chestAxis = q => [lerp2(q.torso[0], q.torso[14], .45), lerp2(q.legL[0], q.legR[8], .5)];
function chestPatch(q) { const [a, b] = chestAxis(q), dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, pts = [];
  for (let i = 0; i < 12; i++) { const t = i / 12 * TAU, u = .5 - Math.cos(t) * .62, w = Math.sin(t) * (18 + 10 * Math.sin(Math.PI * clamp(u, 0, 1))); pts.push([a[0] + dx * u + nx * w, a[1] + dy * u + ny * w]); } return pts; }

// Fills, shading and painted eyes around the pencil cel.
const catTailPath = q => curvePath(tubeOutline(q.tail, 14, 7).closed, true, 1.1);
const catTailShade = (g, tailP, box = [80, -260, 200, 280]) => { g.save(); g.clip(tailP); graphite(g, tailP, box, { seed: 12, color: COL.furShade, tone: () => .35, direction: () => .4, softness: .6 }); g.restore(); };
function catFills(g, q) {
  const tailP = q.noTail ? null : catTailPath(q);
  const torsoP = curvePath(q.torso, true, 1.3), haunchP = curvePath([...q.haunch, q.haunch[0]], true, 1.3), headP = curvePath(q.head, true, 1.3);
  const earLP = curvePath(q.earL, true, .9), earRP = curvePath(q.earR, true, .9);
  const legP = L => curvePath(L, true, 1.2);
  g.fillStyle = COL.fur;
  for (const p of [tailP, torsoP, haunchP]) if (p) g.fill(p);
  // colour-pencil shade on the side away from the light (top left), fixed to the drawing
  g.save(); g.clip(torsoP); graphite(g, torsoP, [-80, -190, 200, 200], { seed: 11, color: COL.furShade, tone: (x, y) => clamp(.1 + (x + 40) / 260 + (y + 100) / 420, 0, .75), direction: () => 1.05, softness: .6 }); g.restore();
  if (tailP) catTailShade(g, tailP);
  g.fillStyle = COL.cream; g.fill(curvePath(chestPatch(q), true, 1.5));
  for (const L of [q.legL, q.legR]) { g.fillStyle = COL.fur; g.fill(legP(L)); g.fillStyle = alpha(COL.cream, .9); g.fill(curvePath([L[3], L[4], L[5], L[6], lerp2(L[6], L[7], .14), lerp2(L[3], L[2], .55)], true, 1)); }   // white socks stay on the paw
  g.fillStyle = COL.fur; g.fill(earLP); g.fill(earRP);
  g.fillStyle = alpha(COL.nose, .45); g.fill(curvePath([lerp2(q.earL[0], q.earL[1], .55), lerp2(q.earL[1], q.earL[2], .65), lerp2(q.earL[3], q.earL[4], .45)], true, .9)); g.fill(curvePath([lerp2(q.earR[0], q.earR[1], .55), lerp2(q.earR[1], q.earR[2], .65), lerp2(q.earR[3], q.earR[4], .45)], true, .9));
  g.fillStyle = COL.fur; g.fill(headP);
  g.save(); g.clip(headP); graphite(g, headP, [-100, -290, 200, 150], { seed: 13, color: COL.furShade, tone: (x, y) => clamp(.05 + (x + 20) / 300 + (y + 214) / 260, 0, .6), direction: () => 1.1, softness: .6 }); g.restore();
  // muzzle
  g.fillStyle = COL.cream; g.fill(curvePath([q.facePt([-30, 10]), q.facePt([-18, 34]), q.facePt([0, 42]), q.facePt([18, 34]), q.facePt([30, 10]), q.facePt([0, 12])], true, 1.4));
}
function catFace(g, q) {
  const e = q.eyes, open = e === 'open' || e === 'wide' || e === 'wink' || e === 'dizzy' || e === 'half';
  const eye = (c, id, which) => {
    if (e === 'wink' && which === 'R') return; const [x, y] = q.facePt(c), rx = 15 * q.eyeScale * (e === 'wide' ? 1.15 : 1), ry = 17 * q.eyeScale * (e === 'wide' ? 1.18 : 1);
    g.save(); g.translate(x, y); g.rotate(q.tilt); g.fillStyle = COL.iris; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
    g.fillStyle = alpha('#ffffff', .35); g.beginPath(); g.ellipse(-rx * .15, ry * .35, rx * .7, ry * .45, 0, 0, TAU); g.fill();
    if (e === 'dizzy') { g.strokeStyle = COL.pupil; g.lineWidth = 2.2; g.beginPath(); for (let a = 0; a < 5.2 * Math.PI; a += .2) { const r = 1 + a * 1.35; g.lineTo(Math.cos(a + (which === 'L' ? 0 : 2)) * r * .95, Math.sin(a + (which === 'L' ? 0 : 2)) * r); } g.stroke(); }
    else { const [lx, ly] = q.look, pw = 5.5 * q.pupil, ph = 12.5 * Math.min(1.1, q.pupil); g.fillStyle = COL.pupil; g.beginPath(); g.ellipse(lx * 5, ly * 5, pw, ph, 0, 0, TAU); g.fill(); g.fillStyle = '#fffdf6'; g.beginPath(); g.arc(lx * 5 - 4, ly * 5 - 6, 3.6, 0, TAU); g.fill(); g.beginPath(); g.arc(lx * 5 + 3, ly * 5 + 5, 1.5, 0, TAU); g.fill(); }
    if (e === 'half') {   // the in-between drawing of a blink: the upper lid has come halfway down over the eye
      const lid = ry * .12; g.save(); g.beginPath(); g.ellipse(0, 0, rx + 1.6, ry + 1.6, 0, 0, TAU); g.clip(); g.fillStyle = COL.fur; g.beginPath(); g.moveTo(-rx - 3, -ry - 3); g.lineTo(rx + 3, -ry - 3); g.lineTo(rx + 3, lid); g.quadraticCurveTo(0, lid + ry * .34, -rx - 3, lid); g.fill(); g.restore();
      g.strokeStyle = COL.graphite; g.globalAlpha = .9; g.lineWidth = 2.4; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, .08 * Math.PI, .92 * Math.PI); g.stroke(); g.globalAlpha = 1;
      g.lineWidth = 2.8; g.beginPath(); g.moveTo(-rx - .5, lid - 1); g.quadraticCurveTo(0, lid + ry * .34, rx + .5, lid - 1); g.stroke(); g.restore(); return; }
    g.strokeStyle = COL.graphite; g.lineWidth = 2.4; g.globalAlpha = .9; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.stroke(); g.globalAlpha = 1;
    g.lineWidth = 2.6; g.beginPath(); g.ellipse(0, 0, rx + .5, ry + .5, 0, Math.PI * 1.12, Math.PI * 1.88); g.stroke(); g.restore(); };
  if (open) { eye(CAT_FACE.eyeL, 'eyeL', 'L'); eye(CAT_FACE.eyeR, 'eyeR', 'R'); }
  const n = [q.facePt([-8, 14]), q.facePt([8, 14]), q.facePt([0, 23])]; g.fillStyle = COL.nose; g.fill(curvePath(n, true, .5));
  g.strokeStyle = COL.graphite; g.lineWidth = 1.5; g.stroke(curvePath(n, true, .5));
  if (q.mouth === 'open' || q.mouth === 'o') { const r = q.mouth === 'o' ? 7 : 10; g.fillStyle = '#b8574d'; g.fill(curvePath([q.facePt([-r, 30]), q.facePt([-r * .7, 30 + r * 1.2]), q.facePt([0, 30 + r * 1.5]), q.facePt([r * .7, 30 + r * 1.2]), q.facePt([r, 30]), q.facePt([0, 28])], true, 1)); }
}

// Sprites: one canvas per drawing and output scale, bounded cache.
const CAT_BOX = [-240, -380, 580, 440];      // local bounds of every pose
const catSprites = new Map();
function catSprite(id, pose, look = 'pencil', ghost = null) {
  const key = id + '/' + look + '/' + (ghost || '') + '/' + S; if (catSprites.has(key)) return catSprites.get(key);
  const q = typeof pose === 'function' ? pose() : pose, dpi = Math.max(.6, 2.2 * S), cvs = document.createElement('canvas');
  cvs.width = Math.ceil(CAT_BOX[2] * dpi); cvs.height = Math.ceil(CAT_BOX[3] * dpi); const g = cvs.getContext('2d'); g.scale(dpi, dpi); g.translate(-CAT_BOX[0], -CAT_BOX[1]);
  if (ghost) {   // a see-through diagram of the drawing: one coloured pencil, no fills
    const cel = compileCel(catRaw(q), { id: 'cat/' + id }); for (const st of cel.strokes) st.color = ghost; drawCel(g, cel, { material: 'pencil', color: ghost });
    if (q.eyes !== 'closed' && q.eyes !== 'happy') for (const c0 of [CAT_FACE.eyeL, CAT_FACE.eyeR]) { const [x, y] = q.facePt(c0); g.strokeStyle = ghost; g.lineWidth = 2.6; g.beginPath(); g.ellipse(x, y, 15, 17, 0, 0, TAU); g.stroke(); g.fillStyle = ghost; g.beginPath(); g.ellipse(x, y, 5, 11, 0, 0, TAU); g.fill(); }
    const s0 = { canvas: cvs, dpi }; catSprites.set(key, s0); if (catSprites.size > 48) catSprites.delete(catSprites.keys().next().value); return s0; }
  catFills(g, q); drawCel(g, compileCel(catRaw(q), { id: 'cat/' + id }), { material: look, color: COL.graphite }); catFace(g, q);
  const s = { canvas: cvs, dpi }; catSprites.set(key, s); if (catSprites.size > 48) catSprites.delete(catSprites.keys().next().value); return s;   // each sprite is a few MB: keep the cache bounded
}
// Morph two landmark sets of one family. Pupils and eyes come from the nearer pose.
function catBlend(a, b, u) {
  const o = {}; for (const k of ['torso', 'legL', 'legR', 'haunch', 'hindPaw', 'tail', 'head', 'earL', 'earR']) o[k] = morphPoints(a[k], b[k], u);
  const near = u < .5 ? a : b; const faceA = a.facePt, faceB = b.facePt;
  return { ...near, ...o, look: [lerp(a.look[0], b.look[0], u), lerp(a.look[1], b.look[1], u)], tilt: lerp(a.tilt, b.tilt, u), facePt: r => lerp2(faceA(r), faceB(r), u) };
}
// The tail alone, fill and pencil, in the cat's local units: a film that sways the tail draws it behind a q.noTail body drawing.
// One cel id for every tail drawing keeps the grain of the marks with the tail as it bends.
function catTailCel(g, tail, box = [20, -330, 330, 370]) {
  const q = { tail }, tailP = catTailPath(q); g.fillStyle = COL.fur; g.fill(tailP); catTailShade(g, tailP, box);
  const strokes = []; catTailStrokes(q, catStrokeAdder(strokes)); drawCel(g, compileCel({ strokes }, { id: 'cat/tail' }), { material: 'pencil', color: COL.graphite });
}
function drawCat(c, id, pose, { x = 0, y = 0, scale = 1, flip = 1, rot = 0, al = 1, ghost = null } = {}) {
  const s = catSprite(id, pose, 'pencil', ghost); c.save(); c.translate(x, y); c.rotate(rot); c.scale(scale * flip, scale); c.globalAlpha *= al;
  c.drawImage(s.canvas, CAT_BOX[0], CAT_BOX[1], CAT_BOX[2], CAT_BOX[3]); c.restore();
}

// ---------------- the pose library ----------------
// Keys are whole drawings. Airborne and crouched keys replace the seated haunch
// so the lower body reads as legs in the air, not a sitting cat lifted up.
const CURL = {
  head: [-66, -118],
  torso: [[-40, -96], [-78, -80], [-100, -50], [-98, -18], [-78, 2], [-40, 4], [0, 4], [40, 4], [80, 2], [112, -12], [124, -42], [112, -76], [80, -100], [30, -112], [-12, -108]],
  legL: [[-96, -30], [-104, -22], [-112, -12], [-116, -2], [-106, 3], [-92, 3], [-86, -4], [-86, -14], [-90, -26]],
  legR: [[-74, -28], [-80, -20], [-86, -10], [-88, -1], [-78, 3], [-64, 3], [-60, -4], [-62, -14], [-66, -24]],
  haunch: [[36, -64], [70, -74], [100, -54], [106, -26], [94, -6]], hindPaw: [[64, 3], [74, -5], [88, -5], [96, 3]],
  tail: [[112, -14], [110, 4], [80, 12], [40, 14], [0, 14], [-40, 13], [-80, 10], [-104, 2]]
};
const DANGLE = { haunch: [[44, -72], [66, -52], [74, -22], [74, 8], [66, 24]], hindPaw: [[56, 22], [66, 16], [80, 18], [86, 28]] };
// Pose parameters; POSE[id]() builds the drawing, POSE[id + 'Blink']() the same drawing with closed eyes.
const POSE_P = {
  sit: {},
  lookR: { turn: .55, tilt: .07, look: [1, .25], tail: 'swishA' },
  lookL: { turn: -.55, tilt: -.07, look: [-1, .25], tail: 'swishB' },
  lookUp: { tilt: -.06, look: [.2, -1], headOffset: [0, -4], ears: [.12, .12], mouth: 'o' },
  lookDown: { tilt: .08, look: [.6, 1], headOffset: [4, 8], ears: [-.05, -.05] },
  wave: { legL: 'waveL', eyes: 'wink', tilt: -.08, turn: -.1, tail: 'up', mouth: 'open' },
  pat: { legL: 'patL', turn: -.5, tilt: -.12, look: [-1, .6], mouth: 'open' },
  tug: { legR: 'tugR', turn: .2, tilt: .12, look: [.5, .9], ears: [-.12, -.12], mouth: 'flat' },
  happy: { eyes: 'happy', mouth: 'open', tail: 'up', ears: [.1, .1] },
  proud: { eyes: 'happy', mouth: 'smile', tail: 'question', headOffset: [0, -6], tilt: -.04, ears: [.12, .12] },
  wink: { eyes: 'wink', tilt: -.09, turn: -.12, tail: 'up', mouth: 'smile', look: [-.2, 0] },
  dizzy: { eyes: 'dizzy', tilt: .16, mouth: 'flat', ears: [-.28, .22] },
  wide: { eyes: 'wide', pupil: 1.45, ears: [.22, .22], mouth: 'o', look: [0, 0] },
  lookRwide: { turn: .6, tilt: .1, look: [1, .1], eyes: 'wide', pupil: 1.35, ears: [.25, .25], mouth: 'o', tail: 'up' },
  crouch: { squash: [1.12, .78], eyes: 'wide', pupil: 1.5, ears: [-.38, -.38], tail: 'low', headOffset: [0, 10] },
  stretch: { squash: [.9, 1.2], legL: 'upL', legR: 'upR', ...DANGLE, eyes: 'wide', pupil: 1.2, mouth: 'open', tail: 'up', ears: [.24, .24] },
  tuck: { squash: [1, 1.04], legL: 'downL', legR: 'downR', ...DANGLE, eyes: 'wide', pupil: 1.2, look: [-.6, 1], mouth: 'o', tail: 'up', ears: [.28, .28], tilt: -.1 },
  land: { squash: [1.2, .72], eyes: 'closed', ears: [-.32, -.32], mouth: 'flat', tail: 'low', headOffset: [0, 12] },
  settle: { squash: [.95, 1.06], tail: 'swishA', ears: [.08, .08] },
  asleep: { body: CURL, eyes: 'closed', tilt: -.32, ears: [-.2, -.1], mouth: 'flat' }
};
const POSE = {};
for (const [k, o] of Object.entries(POSE_P)) { POSE[k] = () => catPose(o); POSE[k + 'Blink'] = () => catPose({ ...o, eyes: 'closed' }); }

