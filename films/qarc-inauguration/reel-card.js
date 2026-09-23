'use strict';
// ============================================================
// THE INVITATION, PORTRAIT CUT (55-75 s). The tall sketchbook page becomes a
// sheet lying on a desk; its drawings keep living on it (the page texture is
// redrawn from worldAt). The camera starts straight down, matching the last
// drawn frame exactly, then pulls back and tilts. The printed card slides up
// onto the empty lower half of the page and opens, the sapling standing up as
// a cut-out across the gutter. The camera goes close enough to read the date,
// time and venue on a phone while a pencil circles the time, then rises to
// hold the cat, the tagline and the card together while confetti falls.
// ============================================================
// The facts (date, time, venue, presiding line) live in invite.js, shared with the other cut.
const CARD_PW = 600, CARD_PD = 860, CARD_AT = 2400;   // the card's middle lies at this height of the page, low enough that the pop-up clears the tagline
const PAGE_Y = .6;
// The card slides up onto the page: until 57.6 s the page, the desk and the camera sit further along -z,
// so the card (fixed at the origin by book3) starts below the page, nearer the viewer, and travels 1500 units up onto it.
// It arrives a little turned, the way a card slid across a desk does, and straightens as it stops: the page, the desk and
// the camera turn together about the card, so the page holds still on screen and only the card moves.
let PAGE_OFF = 0, DESK_YAW = 0;
const easeOutCubic = u => 1 - Math.pow(1 - u, 3);
const slideOff = t => -1500 * (1 - easeOutCubic(clamp((t - 55.4) / 2.2, 0, 1)));
const slideYaw = t => .15 * (1 - easeOutCubic(clamp((t - 55.4) / 2.5, 0, 1)));
const deskVec = v => { const c = Math.cos(DESK_YAW), s = Math.sin(DESK_YAW); return [v[0] * c - v[2] * s, v[1], v[0] * s + v[2] * c]; };
const deskXf = p => deskVec([p[0], p[1], p[2] + PAGE_OFF]);   // page-relative -> world
const pageToDesk = (px, py) => deskXf([px - PAGE_W / 2, PAGE_Y, py - CARD_AT]);
let CARD = null;

function stockGrain(g, w, h, seed, n = 900, col = 'rgba(90,70,40,.06)') { const r = rng(seed); g.fillStyle = col; for (let k = 0; k < n; k++) g.fillRect(r() * w, r() * h, 1 + r() * 1.4, 1 + r() * 1.4); }
function tracked(g, text, x, y, spacing) { g.save(); g.letterSpacing = spacing + 'px'; g.fillText(text, x + spacing / 2, y); g.restore(); }   // letter-spaced, still centred
// The navy logo recoloured for printing: alpha from darkness.
function logoIn(colour) {
  const im = PHOTOS.qarc.img, cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, cv.width, cv.height), [r, gg, b] = parseColor(colour);
  for (let i = 0; i < d.data.length; i += 4) { const L = (d.data[i] * .299 + d.data[i + 1] * .587 + d.data[i + 2] * .114) / 255, a = clamp((1 - L) / .78, 0, 1); d.data[i] = r; d.data[i + 1] = gg; d.data[i + 2] = b; d.data[i + 3] = a * 255; }
  g.putImageData(d, 0, 0); return cv;
}
// the ring the pencil draws round the time on the right page (page texture units)
const RING = { x: CARD_PW / 2, y: 282, rx: 262, ry: 80, rot: -.04 };
const ringPts = () => ellPts(RING.x, RING.y, RING.rx, RING.ry, RING.rot, 60).concat([[RING.x + 246, RING.y - 30]]);
function buildCard() {
  const cream = '#fbf7ee', navy = COL.navy, orange = COL.orange;
  const qCream = logoIn('#f7efdc'), qNavy = logoIn(navy);
  const cover = tex3(CARD_PW + 8, CARD_PD + 16, (g, w, h) => {
    g.fillStyle = navy; g.fillRect(0, 0, w, h); stockGrain(g, w, h, 3, 1600, 'rgba(255,255,255,.035)');
    g.strokeStyle = '#e9c77a'; g.lineWidth = 3; g.strokeRect(26, 26, w - 52, h - 52); g.lineWidth = 1.2; g.strokeRect(38, 38, w - 76, h - 76);
    const lw = 440, lh = lw * qCream.height / qCream.width; g.drawImage(qCream, (w - lw) / 2, 130, lw, lh);
    g.fillStyle = '#f7efdc'; g.textAlign = 'center'; g.font = `700 80px ${HAND}`; g.fillText('You’re invited', w / 2, 510);
    g.font = `400 44px ${HAND}`; g.fillText('to the inauguration', w / 2, 572);
    g.fillStyle = orange; g.font = `600 29px ${PRINT}`; tracked(g, INVITE.cover, w / 2, 690, 1.5);
    g.strokeStyle = orange; g.lineWidth = 3; g.lineCap = 'round'; for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * 12, 776 + Math.sin(a) * 12); g.lineTo(w / 2 + Math.cos(a) * 24, 776 + Math.sin(a) * 24); g.stroke(); }
  }, 2.2);
  const pageBase = (g, w, h, seed, side) => { g.fillStyle = cream; g.fillRect(0, 0, w, h); stockGrain(g, w, h, seed);
    const gr = g.createLinearGradient(side === 'L' ? w : 0, 0, side === 'L' ? w - 70 : 70, 0); gr.addColorStop(0, 'rgba(60,40,20,.20)'); gr.addColorStop(1, 'rgba(60,40,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = alpha(navy, .55); g.lineWidth = 1.4; g.strokeRect(22, 22, w - 44, h - 44); };
  const left = tex3(CARD_PW, CARD_PD, (g, w, h) => {
    pageBase(g, w, h, 4, 'L'); g.textAlign = 'center';
    g.save(); g.globalCompositeOperation = 'multiply'; g.drawImage(PHOTOS.ssit.img, w / 2 - 62, 40, 124, 124); g.restore();
    g.fillStyle = navy; g.font = `600 19px ${PRINT}`; tracked(g, 'SRI SIDDHARTHA INSTITUTE OF TECHNOLOGY', w / 2, 198, 1.5);
    g.fillStyle = COL.graphite; g.font = `500 19px ${PRINT}`; g.fillText('Department of Computer Science & Engineering', w / 2, 228);
    g.font = `400 36px ${HAND}`; g.fillText('cordially invites you to the', w / 2, 304);
    g.fillStyle = alpha('#f2a36b', .8); g.font = `700 58px ${PRINT}`; tracked(g, 'INAUGURATION', w / 2 + 2, 380, 3);   // riso: the orange plate lands a hair off
    g.fillStyle = orange; tracked(g, 'INAUGURATION', w / 2, 378, 3);
    g.fillStyle = COL.graphite; g.font = `400 32px ${HAND}`; g.fillText('of', w / 2, 428);
    const lw = 480, lh = lw * qNavy.height / qNavy.width; g.drawImage(qNavy, (w - lw) / 2, 446, lw, lh);
    g.fillStyle = COL.graphite; g.font = `400 32px ${HAND}`; g.fillText('a student-led research cell', w / 2, 750);
    g.strokeStyle = alpha(orange, .8); g.lineWidth = 2.4; g.beginPath(); g.moveTo(w / 2 - 96, 782); g.quadraticCurveTo(w / 2, 796, w / 2 + 96, 782); g.stroke();
  }, 2.5);
  // the right page carries the facts, set large enough to read on a phone; it is redrawn while the pencil circles the time
  const rightDraw = (ring, paws = 3) => (g, w, h) => {
    pageBase(g, w, h, 5, 'R'); g.textAlign = 'center';
    g.fillStyle = navy; g.font = `600 36px ${PRINT}`; tracked(g, INVITE.day, w / 2, 116, 8);
    g.font = `700 52px ${PRINT}`; g.fillText(INVITE.date, w / 2, 186);
    g.fillStyle = alpha('#f2a36b', .8); g.font = `700 112px ${PRINT}`; g.fillText(INVITE.time, w / 2 + 2, 322); g.fillStyle = orange; g.fillText(INVITE.time, w / 2, 320);
    if (ring > 0) pencil(g, 'card/ring', ringPts(), { w: 3.6, color: COL.orange, progress: ring });
    g.strokeStyle = alpha(navy, .45); g.lineWidth = 1.6; g.beginPath(); g.moveTo(80, 404); g.lineTo(w - 80, 404); g.stroke();
    g.fillStyle = navy; g.font = `600 35px ${PRINT}`; g.fillText(INVITE.host, w / 2, 466);
    g.fillStyle = COL.graphite; g.font = `400 27px ${PRINT}`; g.fillText(INVITE.address, w / 2, 508);
    g.font = `400 37px ${HAND}`; g.fillText(INVITE.presided, w / 2, 590);
    g.fillStyle = navy; g.font = `700 47px ${HAND}`; g.fillText(INVITE.welcome, w / 2, 676);
    for (let k = 0; k < 3; k++) { const s = easeOutBack(clamp(paws - k, 0, 1), 2.2); if (s <= 0) continue; const x = 380 + k * 58, y = 780 - k * 22;   // a cat walks off the corner, one print at a time
      g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = alpha(orange, .8); g.beginPath(); g.ellipse(0, 0, 11, 9, 0, 0, TAU); g.fill(); for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(-13 + j * 8.6, -14 - (j === 1 || j === 2 ? 4 : 0), 4, 0, TAU); g.fill(); } g.restore(); }
  };
  const right = tex3(CARD_PW, CARD_PD, rightDraw(0), 2.5);
  // the sapling, now a paper cut-out; the transparent sheet gives it a true silhouette and shadow
  const sapling = tex3(260, 360, (g, w, h) => { drawPot(g, w / 2, h - 6, .95); drawSapling(g, w / 2, h - 6 - 118, 1, 1.05); }, 2);
  const book = book3({ PW: CARD_PW, PD: CARD_PD, cover, board: navy, edge: '#efe7d6', spreads: [{ left, right, pieces: [
    { base: [[-100, -330], [100, -330]], h: 300, sheet: sapling, mesh: 10 }
  ] }] });
  const desk = tex3(3000, 4200, (g, w, h) => { g.fillStyle = '#7a553a'; g.fillRect(0, 0, w, h); const r = rng(9);
    for (let x = 0; x < w; x += 260) { g.fillStyle = `rgba(${40 + r() * 30 | 0},${22 + r() * 16 | 0},8,.${2 + (r() * 3 | 0)})`; g.fillRect(x, 0, 260, h); g.fillStyle = 'rgba(30,16,6,.5)'; g.fillRect(x - 2, 0, 4, h); }
    g.strokeStyle = 'rgba(40,22,8,.25)'; g.lineWidth = 2; for (let k = 0; k < 640; k++) { const x = r() * w, y = r() * h, l = 80 + r() * 320; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 8, y + l * .3, x - 8, y + l * .6, x + 4, y + l); g.stroke(); } }, .5);
  const pageSheet = tex3(PAGE_W, PAGE_H, null, 1);
  const pencilProp = tex3(520, 44, (g, w, h) => { g.fillStyle = '#f2c230'; g.fillRect(40, 6, 400, 32); g.fillStyle = '#d9a91f'; g.fillRect(40, 22, 400, 16); g.fillStyle = '#e7cfa8'; g.beginPath(); g.moveTo(440, 6); g.lineTo(505, 22); g.lineTo(440, 38); g.fill();
    g.fillStyle = '#3b342e'; g.beginPath(); g.moveTo(488, 18); g.lineTo(505, 22); g.lineTo(488, 26); g.fill(); g.fillStyle = '#c9ccd1'; g.fillRect(14, 6, 26, 32); g.fillStyle = '#e88f9a'; g.fillRect(0, 7, 16, 30); }, 2);
  const solid = tex3(16, 16, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); }, 1);
  const confetti = [COL.orange, COL.navy, COL.green, GOLD, '#fbf7ee', '#e88f9a'].map(col => tex3(8, 8, (g, w, h) => { g.fillStyle = col; g.fillRect(0, 0, w, h); }, 1));
  CARD = { book, desk, pageSheet, right, rightDraw, pencilProp, solid, confetti, state: '' };
}

// ---------------- the camera ----------------
// Keys are page-relative (as if PAGE_OFF were 0); A is the top-down match of the last drawn frame.
const CAMS = {
  B: { eye: [150, 2067, 488], target: [150, 0, -520] },     // the card arriving, the page above it
  C: { eye: [0, 1872, 575], target: [0, 0, -420] },         // the spread open, the sapling standing
  D: { eye: [300, 1023, 536], target: [300, 0, 80] },       // close enough to read the right page
  D2: { eye: [296, 992, 526], target: [296, 0, 84] },       // ...breathing a little closer while we read
  E: { eye: [0, 2048, 549], target: [0, 0, -540] },         // the mark, the cat, the tagline and the card together
  E2: { eye: [0, 1990, 525], target: [0, 0, -530] }
};
function invitationCam(t) {
  const [x0, y0, z0] = camAt(55), d0 = 1500 / z0, top = [x0 - PAGE_W / 2, PAGE_Y, y0 - CARD_AT];
  const A = { eye: [top[0], PAGE_Y + d0, top[2]], target: top, up: [0, 0, -1] };
  const rel = K => ({ eye: K.eye, target: K.target, up: K.up || [0, 1, 0] });
  const keys = [[55.0, A], [57.5, rel(CAMS.B)], [59.8, rel(CAMS.C)], [60.3, rel(CAMS.C)], [61.7, rel(CAMS.D)], [66.0, rel(CAMS.D2)], [67.5, rel(CAMS.E)], [75.0, rel(CAMS.E2)]];
  let k = 0; while (k + 1 < keys.length - 1 && t >= keys[k + 1][0]) k++;
  const [ta, a] = keys[k], [tb, b] = keys[k + 1], u = k + 1 === keys.length - 1 && tb === 75 ? sm(ta, tb, t, t => t) : sm(ta, tb, t, easeInOutSine);
  return { eye: deskXf(V3.lerp(a.eye, b.eye, u)), target: deskXf(V3.lerp(a.target, b.target, u)), up: deskVec(V3.norm(V3.lerp(a.up, b.up, u))), f: 1500 };
}

// ---------------- the pencil that circles the time ----------------
// The right page's texture (u, v) lies on the card at x = u, z = v - PD/2; the pencil's tip follows the ring as it is drawn.
const rpWorld = (u, v, y = 3) => [u, y, v - CARD_PD / 2];
function pencilState(t) {
  if (t < 61.3 || t > 63.8) return null; const P = ringPts(), ring = sm(62.0, 62.9, t, easeInOutSine);
  const along = u => { const L = pathLength(P), d = u * L; let acc = 0; for (let i = 1; i < P.length; i++) { const s = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (acc + s >= d) return lerp2(P[i - 1], P[i], (d - acc) / (s || 1)); acc += s; } return P[P.length - 1]; };
  const inn = sm(61.3, 62.0, t, easeOutCubic), out = sm(62.95, 63.8, t, easeIn), away = [CARD_PW + 380, CARD_PD + 120], end = along(1);
  const tip = out > 0 ? lerp2(end, [end[0] + 380, end[1] + 440], out) : t < 62.0 ? lerp2(away, along(0), inn) : along(ring);
  return { tip, lift: 60 * (1 - inn) + 90 * out };   // it comes down to the page, draws, and lifts off
}
function drawPencil3(c, st) {
  const T = rpWorld(st.tip[0], st.tip[1], 3.5 + st.lift), d = V3.norm([.62, 0, .78]), n = [d[2], 0, -d[0]], up = 150;   // lying back toward the lower right, the eraser end raised as if held
  const P = (u, v) => V3.add(V3.add(T, V3.mul(d, (505 - u) * .9)), V3.add(V3.mul(n, (v - 22) * .9), [0, (505 - u) / 505 * up, 0]));
  const Q = [P(0, 0), P(520, 0), P(520, 44), P(0, 44)];
  { const g = shadowsBegin(); g.setTransform(c.getTransform()); shadow3(g, CARD.pencilProp, Q, [0, 3, 0], [0, 1, 0], null, 1); shadowsEnd(c, .28); }
  quad3(c, CARD.pencilProp, Q, { n: 4, dark: .04 });
}

// ---------------- confetti: paper bits that tumble down and settle ----------------
// Each piece falls against air (a terminal speed), drifts and flutters, and lies flat where it lands.
// Landing points are chosen off the card, so nothing covers the date or the time.
let CONFETTI = null;
function confettiInit() {
  const r = rng(71), out = []; let guard = 0;
  while (out.length < 78 && guard++ < 4000) {
    const x0 = -760 + r() * 1520, z0 = -1900 + r() * 2500, y0 = 520 + r() * 900, t0 = 69.1 + r() * 1.1, vt = 300 + r() * 160, drift = [(r() - .5) * 90, (r() - .5) * 70], sway = 25 + r() * 45, ph = r() * TAU, wsw = 2.2 + r() * 2.4;
    const fall = y0 / vt, land = [x0 + drift[0] * fall + Math.sin(ph + fall * wsw) * sway, z0 + drift[1] * fall];
    if (Math.abs(land[0]) < 640 && Math.abs(land[1]) < 470) continue;   // not on the card
    if (land[0] < -PAGE_W / 2 - 40 || land[0] > PAGE_W / 2 + 40 || land[1] < -CARD_AT + 60 || land[1] > 700) continue;   // on the page or just off it, inside the shot
    out.push({ x0, z0, y0, t0, vt, drift, sway, ph, wsw, fall, land, col: out.length % 6, spin: 5 + r() * 9, axis: V3.norm([r() - .5, r() - .5, r() - .5]), yaw: r() * TAU, w: 15 + r() * 8, h: 9 + r() * 5 });
  }
  return out;
}
function rotAxis(v, a, th) { const c = Math.cos(th), s = Math.sin(th), d = V3.dot(a, v); return V3.add(V3.add(V3.mul(v, c), V3.mul(V3.cross(a, v), s)), V3.mul(a, d * (1 - c))); }
function confettiDraw(c, t) {
  if (t < 69.1) return; if (!CONFETTI) CONFETTI = confettiInit();
  for (const p of CONFETTI) { const u = t - p.t0; if (u <= 0) continue; const landed = u >= p.fall, uu = Math.min(u, p.fall);
    const pos = [p.x0 + p.drift[0] * uu + Math.sin(p.ph + uu * p.wsw) * p.sway, landed ? PAGE_Y + .8 : p.y0 - p.vt * uu, p.z0 + p.drift[1] * uu + PAGE_OFF];
    const ex = [Math.cos(p.yaw) * p.w / 2, 0, Math.sin(p.yaw) * p.w / 2], ez = [-Math.sin(p.yaw) * p.h / 2, 0, Math.cos(p.yaw) * p.h / 2], th = landed ? 0 : u * p.spin;
    const a = landed ? ex : rotAxis(ex, p.axis, th), b = landed ? ez : rotAxis(ez, p.axis, th);
    const Q = [V3.sub(V3.sub(pos, a), b), V3.sub(V3.add(pos, a), b), V3.add(V3.add(pos, a), b), V3.add(V3.sub(pos, a), b)];
    quad3(c, CARD.confetti[p.col], Q, { n: 1, dark: shadeOf(Q) * .9 }); }
}

// ---------------- the scene ----------------
function invitationScene(c, tau) {
  if (!CARD) buildCard(); const t = 55 + tau; PAGE_OFF = slideOff(t); DESK_YAW = slideYaw(t);
  resetT(c); c.fillStyle = '#4a3222'; c.fillRect(0, 0, W, H);
  cam3(invitationCam(t));
  quad3(c, CARD.desk, [[-2600, -1, -4000], [2600, -1, -4000], [2600, -1, 2600], [-2600, -1, 2600]].map(deskXf), { n: 8, dark: .05 });
  // the sketchbook page, still alive
  CARD.pageSheet.redraw(g => { g.fillStyle = COL.paper; g.fillRect(0, 0, PAGE_W, PAGE_H); worldAt(g, t); });
  const pageQ = [pageToDesk(0, 0), pageToDesk(PAGE_W, 0), pageToDesk(PAGE_W, PAGE_H), pageToDesk(0, PAGE_H)];
  { const g = shadowsBegin(); g.setTransform(c.getTransform()); shadow3(g, CARD.solid, pageQ.map(p => [p[0], 6, p[2]]), [0, 0, 0], [0, 1, 0], null, 1); shadowsEnd(c, .35); }
  quad3(c, CARD.pageSheet, pageQ, { n: 8, dark: 0 });
  // the card: its shadow on the page, then the book itself
  const turn = sm(57.6, 59.6, t, t => t), ring = sm(62.0, 62.9, t, easeInOutSine), paws = 3 * sm(63.7, 64.9, t, u => u), state = ring.toFixed(4) + '|' + paws.toFixed(3);
  if (state !== CARD.state) { CARD.right.redraw(CARD.rightDraw(ring, paws)); CARD.state = state; }
  { const x0 = turn > 0 ? -CARD_PW - 10 : -10, Q = [[x0, 16, -CARD_PD / 2 - 10], [CARD_PW + 10, 16, -CARD_PD / 2 - 10], [CARD_PW + 10, 16, CARD_PD / 2 + 10], [x0, 16, CARD_PD / 2 + 10]];
    const g = shadowsBegin(); g.setTransform(c.getTransform()); shadow3(g, CARD.solid, Q, [0, PAGE_Y, 0], [0, 1, 0], null, 1); shadowsEnd(c, .3); }
  CARD.book.draw(c, { turn });
  const ps = pencilState(t); if (ps) drawPencil3(c, ps);
  confettiDraw(c, t);
  // 2D light on top: glints round the ringed time once it is drawn
  if (t > 62.8 && t < 64.6) { resetT(c); [[.08, -.9], [.93, -.55], [.97, .5], [.05, .7], [.5, -1.25]].forEach(([uu, vv], i) => { const pt = proj3(rpWorld(RING.x + (uu - .5) * 2 * RING.rx * 1.05, RING.y + vv * RING.ry * 1.1, 6)), life = (t - 62.85 - i * .12) / .8;
    if (life > 0 && life < 1) sparkle(c, pt[0], pt[1], 22 * popLife(life, .3), { rot: i * .7, color: i % 2 ? COL.orange : GOLD }); }); }
  // lamplight
  resetT(c); const vg = c.createRadialGradient(CX - 60, CY - 240, 380, CX, CY, 1350); vg.addColorStop(0, 'rgba(10,5,0,0)'); vg.addColorStop(1, 'rgba(10,5,0,.42)');
  c.globalAlpha = sm(55, 57.6, t); c.fillStyle = vg; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
}
