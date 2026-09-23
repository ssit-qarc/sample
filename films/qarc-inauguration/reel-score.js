'use strict';
// ============================================================
// EXTRA CUES FOR THE REEL. The landscape score (score.js) plays unchanged,
// because both cuts share their beats; these cues land on the motion the
// portrait cut adds: the eye, the leap's glint, the twin ball out of the box,
// the knots, the shine, the pot, the drips, the card sliding up, the camera
// leaning in to read, the pencil's touch, the paw prints and the confetti.
// They use the score's own instruments and go into the same mix and limiter.
// ============================================================
function reelCues({ noise, sweep, bell, plink, blip, thump, pizz }) {
  // an eye opens over the box, and blinks
  noise(10.5, .06, .05, { type: 'lowpass', f: 1400, seed: 201, pan: .25, send: .15 }); plink(10.56, 88, .028, .25);
  noise(11.36, .05, .1, { type: 'lowpass', f: 1600, seed: 202, pan: .25 }); noise(11.5, .05, .09, { type: 'lowpass', f: 1600, seed: 203, pan: .25 });
  sweep(12.18, .28, 240, 520, .035, { type: 'triangle', send: .2 });                                        // the box gathers itself
  [96, 100, 103].forEach((n, k) => bell(n, 12.78 + k * .05, .025, -.2 + k * .2, 1.6));                         // a glint at the top of the leap
  [98, 101, 105].forEach((n, k) => bell(n, 21.08 + k * .04, .02, .1 - k * .1, 1.4));                          // the coin bursts into both
  for (let k = 0; k < 6; k++) bell([91, 96, 93, 98, 95, 100][k], 22.3 + k * .21, .018, Math.sin(k * 1.9) * .5, 1.1);   // dizzy stars
  // the twin ball pops out of the box, lands, bounces once
  noise(24.8, .08, .12, { type: 'lowpass', f: 1800, seed: 204, pan: .45, send: .1 }); sweep(24.82, .3, 280, 720, .05, { vib: [14, 25], pan: .45, send: .25 });
  sweep(25.3, .2, 150, 70, .12, { pan: .4, send: .05 }); noise(25.3, .1, .05, { type: 'lowpass', f: 700, seed: 205, pan: .4 }); sweep(25.58, .15, 140, 80, .06, { pan: .4, send: .05 });
  for (const t0 of [26.2, 30.3]) for (const pan of [-.8, .8]) bell(100, t0 + .01, .018, pan, 1.2);            // both balls ping at the same instant
  const knots = []; [3, 4, 3].forEach((n, k) => { for (let i = 0; i < n; i++) knots.push(33.45 + (k + 1) * .5 + i * .08); });
  knots.forEach((t, j) => blip(t, 84 + (j % 5) * 2, .022, -.5 + (j % 4) * .33));                               // knots pop as the network grows
  noise(44.5, .8, .012, { f: 4000, f1: 9000, q: 1.2, seed: 206, send: .5, a: .3 });                           // a shine crosses ARC
  [43.9, 44.9, 46.1, 47.2].forEach((t, k) => bell(98 + (k % 2) * 3, t, .014, k % 2 ? .4 : -.4, 1.2));         // twinkles round the mark
  sweep(47.36, .28, 900, 380, .025, { send: .2 }); thump(47.65, .16);                                          // the pot drops and lands
  [51.82, 51.95, 52.08].forEach((t, k) => plink(t, 88 - k * 2, .025, -.35));                                  // the can drips as it lifts
  [91, 95, 98, 103].forEach((n, k) => bell(n, 53.58 + k * .05, .022, -.3 + k * .2, 1.6));                      // the sapling's sparkle
  // the card slides up onto the page and stops; the camera leans in to read, and back out to the cat
  noise(55.5, 1.3, .18, { f: 1600, f1: 700, q: .7, seed: 207, send: .3, a: .25 }); noise(57.45, .12, .12, { type: 'lowpass', f: 900, seed: 208 });
  noise(60.3, 1.2, .07, { f: 500, f1: 1800, q: .5, seed: 209, send: .6, a: .5 }); noise(66.0, 1.3, .07, { f: 1800, f1: 500, q: .5, seed: 210, send: .6, a: .5 });
  noise(61.98, .04, .15, { f: 3000, q: 1.2, seed: 211, pan: .2 });                                              // the pencil touches down
  [96, 100, 103, 108].forEach((n, k) => bell(n, 62.95 + k * .12, .02, -.3 + k * .2, 1.4));                     // glints round the ringed time
  [63.75, 64.15, 64.55].forEach((t, k) => { noise(t, .06, .035, { type: 'lowpass', f: 600, seed: 212 + k, pan: .25 + k * .1 }); pizz(76 + k * 3, t, .05, .3, .3); });   // three paw prints
  // confetti: a popper, then paper falling everywhere
  noise(69.1, .1, .14, { type: 'lowpass', f: 2500, seed: 220, send: .15 }); sweep(69.1, .08, 900, 200, .08, { send: .1 });
  for (let k = 0; k < 40; k++) { const t = 69.25 + k * .06 + hash(k, 5) * .05; noise(t, .06, .05 + hash(k, 6) * .04, { f: 2500 + hash(k, 7) * 4500, q: 1.2, seed: 230 + k, pan: hash(k, 8) * 1.6 - .8, send: .3 }); }
}
