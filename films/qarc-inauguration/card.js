'use strict';
// ============================================================
// THE INVITATION, 55-75 s. The sketchbook page becomes a sheet lying on a desk;
// its drawings keep living on it (the page texture is redrawn from worldAt).
// The camera starts straight down, matching the last drawn frame exactly, then
// pulls back and tilts to find the printed invitation card lying on the page.
// The card is a one-spread paper book: a navy cover that opens to printed
// pages, with the sapling standing up as a cut-out across the gutter.
// ============================================================
const INVITE = {
  day: 'SATURDAY', date: '26 September 2026', time: '11:00 AM',
  host: 'Department of CSE · SSIT', address: 'Maraluru, Kunigal Road, Tumakuru',
  presided: 'Presided over by the Principal', welcome: 'All are cordially invited!',
  cover: 'SAT · 26 SEP 2026 · 11:00 AM'
};
const CARD_PW = 600, CARD_PD = 860;
const PAGE_X0 = -1890, PAGE_Z0 = -840, PAGE_Y = .6;   // where the sketchbook page lies on the desk once the card is on it
// The card slides onto the page: until 57.6 s the page, the desk and the camera sit further along x, so the card
// (fixed at the origin by book3) starts off the page to the right and travels 700 units onto it.
let PAGE_OFF = 0;
const slideOff = t => -700 * (1 - easeOutCubic(clamp((t - 55.5) / 2.1, 0, 1)));
const easeOutCubic = u => 1 - Math.pow(1 - u, 3);
const pageToDesk = (px, py) => [PAGE_X0 + PAGE_OFF + px, PAGE_Y, PAGE_Z0 + py];
let CARD = null;

function stockGrain(g, w, h, seed, n = 900, col = 'rgba(90,70,40,.06)') { const r = rng(seed); g.fillStyle = col; for (let k = 0; k < n; k++) g.fillRect(r() * w, r() * h, 1 + r() * 1.4, 1 + r() * 1.4); }
function tracked(g, text, x, y, spacing) { g.save(); g.letterSpacing = spacing + 'px'; g.fillText(text, x + spacing / 2, y); g.restore(); }   // letter-spaced, still centred
// The navy logo recoloured for printing in cream on the navy cover: alpha from darkness.
function logoIn(colour) {
  const im = PHOTOS.qarc.img, cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, cv.width, cv.height), [r, gg, b] = parseColor(colour);
  for (let i = 0; i < d.data.length; i += 4) { const L = (d.data[i] * .299 + d.data[i + 1] * .587 + d.data[i + 2] * .114) / 255, a = clamp((1 - L) / .78, 0, 1); d.data[i] = r; d.data[i + 1] = gg; d.data[i + 2] = b; d.data[i + 3] = a * 255; }
  g.putImageData(d, 0, 0); return cv;
}
function buildCard() {
  const cream = '#fbf7ee', navy = COL.navy, orange = COL.orange;
  const qCream = logoIn('#f7efdc'), qNavy = logoIn(navy);
  const cover = tex3(CARD_PW + 8, CARD_PD + 16, (g, w, h) => {
    g.fillStyle = navy; g.fillRect(0, 0, w, h); stockGrain(g, w, h, 3, 1600, 'rgba(255,255,255,.035)');
    g.strokeStyle = '#e9c77a'; g.lineWidth = 3; g.strokeRect(26, 26, w - 52, h - 52); g.lineWidth = 1.2; g.strokeRect(38, 38, w - 76, h - 76);
    const lw = 430, lh = lw * qCream.height / qCream.width; g.drawImage(qCream, (w - lw) / 2, 150, lw, lh);
    g.fillStyle = '#f7efdc'; g.textAlign = 'center'; g.font = `700 76px ${HAND}`; g.fillText('You’re invited', w / 2, 520);
    g.font = `400 38px ${HAND}`; g.fillText('to the inauguration', w / 2, 574);
    g.fillStyle = orange; g.font = `600 25px ${PRINT}`; tracked(g, INVITE.cover, w / 2, 690, 2);
    g.strokeStyle = orange; g.lineWidth = 3; g.lineCap = 'round'; for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * 12, 770 + Math.sin(a) * 12); g.lineTo(w / 2 + Math.cos(a) * 24, 770 + Math.sin(a) * 24); g.stroke(); }
  }, 2.2);
  const pageBase = (g, w, h, seed, side) => { g.fillStyle = cream; g.fillRect(0, 0, w, h); stockGrain(g, w, h, seed);
    const gr = g.createLinearGradient(side === 'L' ? w : 0, 0, side === 'L' ? w - 70 : 70, 0); gr.addColorStop(0, 'rgba(60,40,20,.20)'); gr.addColorStop(1, 'rgba(60,40,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = alpha(navy, .55); g.lineWidth = 1.4; g.strokeRect(22, 22, w - 44, h - 44); };
  const left = tex3(CARD_PW, CARD_PD, (g, w, h) => {
    pageBase(g, w, h, 4, 'L'); g.textAlign = 'center';
    g.save(); g.globalCompositeOperation = 'multiply'; g.drawImage(PHOTOS.ssit.img, w / 2 - 58, 44, 116, 116); g.restore();
    g.fillStyle = navy; g.font = `600 19px ${PRINT}`; tracked(g, 'SRI SIDDHARTHA INSTITUTE OF TECHNOLOGY', w / 2, 196, 1.5);
    g.fillStyle = COL.graphite; g.font = `500 18px ${PRINT}`; g.fillText('Department of Computer Science & Engineering', w / 2, 224);
    g.font = `400 34px ${HAND}`; g.fillText('cordially invites you to the', w / 2, 300);
    g.fillStyle = alpha('#f2a36b', .8); g.font = `700 56px ${PRINT}`; tracked(g, 'INAUGURATION', w / 2 + 2, 374, 3);   // riso: the orange plate lands a hair off
    g.fillStyle = orange; tracked(g, 'INAUGURATION', w / 2, 372, 3);
    g.fillStyle = COL.graphite; g.font = `400 30px ${HAND}`; g.fillText('of', w / 2, 420);
    const lw = 470, lh = lw * qNavy.height / qNavy.width; g.drawImage(qNavy, (w - lw) / 2, 440, lw, lh);
    g.fillStyle = COL.graphite; g.font = `400 30px ${HAND}`; g.fillText('a student-led research cell', w / 2, 740);
    g.strokeStyle = alpha(orange, .8); g.lineWidth = 2.4; g.beginPath(); g.moveTo(w / 2 - 90, 772); g.quadraticCurveTo(w / 2, 786, w / 2 + 90, 772); g.stroke();
  }, 2.5);
  // the right page is redrawn while the pencil circles the time
  const rightDraw = ring => (g, w, h) => {
    pageBase(g, w, h, 5, 'R'); g.textAlign = 'center';
    g.fillStyle = navy; g.font = `600 32px ${PRINT}`; tracked(g, INVITE.day, w / 2, 128, 8);
    g.font = `700 46px ${PRINT}`; g.fillText(INVITE.date, w / 2, 190);
    g.fillStyle = alpha('#f2a36b', .8); g.font = `700 96px ${PRINT}`; g.fillText(INVITE.time, w / 2 + 2, 312); g.fillStyle = orange; g.fillText(INVITE.time, w / 2, 310);
    if (ring > 0) pencil(g, 'card/ring', ellPts(w / 2, 276, 250, 74, -.04, 60).concat([[w / 2 + 236, 250]]), { w: 3.4, color: COL.orange, progress: ring });
    g.strokeStyle = alpha(navy, .45); g.lineWidth = 1.6; g.beginPath(); g.moveTo(90, 392); g.lineTo(w - 90, 392); g.stroke();
    g.fillStyle = navy; g.font = `600 30px ${PRINT}`; g.fillText(INVITE.host, w / 2, 454);
    g.fillStyle = COL.graphite; g.font = `400 22px ${PRINT}`; g.fillText(INVITE.address, w / 2, 490);
    g.font = `400 32px ${HAND}`; g.fillText(INVITE.presided, w / 2, 566);
    g.fillStyle = navy; g.font = `700 40px ${HAND}`; g.fillText(INVITE.welcome, w / 2, 650);
    // three small paw prints walk off the corner
    for (let k = 0; k < 3; k++) { const x = 380 + k * 58, y = 770 - k * 22; g.fillStyle = alpha(orange, .8); g.beginPath(); g.ellipse(x, y, 11, 9, 0, 0, TAU); g.fill(); for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(x - 13 + j * 8.6, y - 14 - (j === 1 || j === 2 ? 4 : 0), 4, 0, TAU); g.fill(); } }
  };
  const right = tex3(CARD_PW, CARD_PD, rightDraw(0), 2.5);
  // the sapling, now a paper cut-out; the transparent sheet gives it a true silhouette and shadow
  const sapling = tex3(260, 360, (g, w, h) => { drawPot(g, w / 2, h - 6, .95); drawSapling(g, w / 2, h - 6 - 118, 1, 1.05); }, 2);
  const book = book3({ PW: CARD_PW, PD: CARD_PD, cover, board: navy, edge: '#efe7d6', spreads: [{ left, right, pieces: [
    { base: [[-120, -330], [120, -330]], h: 360, sheet: sapling, mesh: 10 }
  ] }] });
  const desk = tex3(3000, 2600, (g, w, h) => { g.fillStyle = '#7a553a'; g.fillRect(0, 0, w, h); const r = rng(9);
    for (let x = 0; x < w; x += 260) { g.fillStyle = `rgba(${40 + r() * 30 | 0},${22 + r() * 16 | 0},8,.${2 + (r() * 3 | 0)})`; g.fillRect(x, 0, 260, h); g.fillStyle = 'rgba(30,16,6,.5)'; g.fillRect(x - 2, 0, 4, h); }
    g.strokeStyle = 'rgba(40,22,8,.25)'; g.lineWidth = 2; for (let k = 0; k < 420; k++) { const x = r() * w, y = r() * h, l = 80 + r() * 320; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 8, y + l * .3, x - 8, y + l * .6, x + 4, y + l); g.stroke(); } }, .5);
  const pageSheet = tex3(PAGE_W, PAGE_H, null, 1);
  const pencilProp = tex3(520, 44, (g, w, h) => { g.fillStyle = '#f2c230'; g.fillRect(40, 6, 400, 32); g.fillStyle = '#d9a91f'; g.fillRect(40, 22, 400, 16); g.fillStyle = '#e7cfa8'; g.beginPath(); g.moveTo(440, 6); g.lineTo(505, 22); g.lineTo(440, 38); g.fill();
    g.fillStyle = '#3b342e'; g.beginPath(); g.moveTo(488, 18); g.lineTo(505, 22); g.lineTo(488, 26); g.fill(); g.fillStyle = '#c9ccd1'; g.fillRect(14, 6, 26, 32); g.fillStyle = '#e88f9a'; g.fillRect(0, 7, 16, 30); }, 2);
  const solid = tex3(16, 16, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); }, 1);
  CARD = { book, desk, pageSheet, right, rightDraw, pencilProp, solid, ring: -1 };
}

// Camera: straight down over the drawn frame at 55 s, then back and up to find the card, then the reading view.
function invitationCam(t) {
  const [x0, y0, z0] = camAt(55), d0 = 1500 / z0, top = pageToDesk(x0, y0);
  const A = { eye: [top[0], d0, top[2]], target: [top[0], 0, top[2]], up: [0, 0, -1] };
  const B = { eye: [-600 + PAGE_OFF, 1760, 1180], target: [-600 + PAGE_OFF, 0, -120], up: [0, 1, 0] };
  const Cc = { eye: [-350 + PAGE_OFF, 1455, 840], target: [-350 + PAGE_OFF, 0, 0], up: [0, 1, 0] };   // reading view: the whole card and the cat on the page, nothing clipped
  const u1 = sm(55.0, 57.6, t, easeInOutSine), u2 = sm(57.4, 60.0, t, easeInOutSine), drift = sm(60, 75, t, t => t);
  const L = (p, q, u) => V3.lerp(p, q, u);
  let eye = L(A.eye, B.eye, u1), target = L(A.target, B.target, u1), up = V3.norm(L(A.up, B.up, u1));
  eye = L(eye, Cc.eye, u2); target = L(target, Cc.target, u2); up = V3.norm(L(up, Cc.up, u2));
  eye = V3.add(eye, [0, -10 * drift, -6 * drift]);   // a slow breath closer while we read
  return { eye, target, up, f: 1500 };
}
function invitationScene(c, tau) {
  if (!CARD) buildCard(); const t = 55 + tau; PAGE_OFF = slideOff(t);
  resetT(c); c.fillStyle = '#4a3222'; c.fillRect(0, 0, W, H);
  cam3(invitationCam(t));
  const o = PAGE_OFF; quad3(c, CARD.desk, [[-3600 + o, -1, -2200], [2800 + o, -1, -2200], [2800 + o, -1, 2400], [-3600 + o, -1, 2400]], { n: 8, dark: .05 });
  // the sketchbook page, still alive
  CARD.pageSheet.redraw(g => { g.fillStyle = COL.paper; g.fillRect(0, 0, PAGE_W, PAGE_H); worldAt(g, t); });
  { const g = shadowsBegin(); g.setTransform(c.getTransform()); shadow3(g, CARD.solid, [pageToDesk(0, 0), pageToDesk(PAGE_W, 0), pageToDesk(PAGE_W, PAGE_H), pageToDesk(0, PAGE_H)].map(p => [p[0], 6, p[2]]), [0, 0, 0], [0, 1, 0], null, 1); shadowsEnd(c, .35); }
  quad3(c, CARD.pageSheet, [pageToDesk(0, 0), pageToDesk(PAGE_W, 0), pageToDesk(PAGE_W, PAGE_H), pageToDesk(0, PAGE_H)], { n: 8, dark: 0 });
  quad3(c, CARD.pencilProp, [[-2300 + o, 2, 700], [-1780 + o, 2, 640], [-1776 + o, 2, 684], [-2296 + o, 2, 744]], { n: 3, dark: .06 });
  // the card: its shadow on the page, then the book itself
  const turn = sm(57.6, 59.6, t, t => t), ring = sm(62.0, 62.9, t, easeInOutSine);
  if (ring !== CARD.ring) { CARD.right.redraw(CARD.rightDraw(ring)); CARD.ring = ring; }
  { const x0 = turn > 0 ? -CARD_PW - 10 : -10, Q = [[x0, 16, -CARD_PD / 2 - 10], [CARD_PW + 10, 16, -CARD_PD / 2 - 10], [CARD_PW + 10, 16, CARD_PD / 2 + 10], [x0, 16, CARD_PD / 2 + 10]];
    const g = shadowsBegin(); g.setTransform(c.getTransform()); shadow3(g, CARD.solid, Q, [0, PAGE_Y, 0], [0, 1, 0], null, 1); shadowsEnd(c, .3); }
  CARD.book.draw(c, { turn });
  // lamplight
  resetT(c); const vg = c.createRadialGradient(CX - 120, CY - 80, 300, CX, CY, 1150); vg.addColorStop(0, 'rgba(10,5,0,0)'); vg.addColorStop(1, 'rgba(10,5,0,.42)');
  c.globalAlpha = sm(55, 57.6, t); c.fillStyle = vg; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
}
