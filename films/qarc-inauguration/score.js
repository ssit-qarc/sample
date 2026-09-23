'use strict';
// ============================================================
// SCORE. An original 75-second piece at 96 bpm (one bar = 2.5 s), synthesized
// with Web Audio: felt piano, a music box, pizzicato, bowed strings and bells,
// plus sound effects that land on the same timeline as the drawings (the pop,
// the coin, the entangled plucks in both ears, the network pulses, the water).
// The theme is stated in fragments until the logo, then whole at the invitation.
// ============================================================
// more(kit): optional extra cues from another cut of the film, drawn with the same instruments into the same mix.
function score(ac, t0, dest, more) {
  const END = 75, LEVEL = 2.05, master = ac.createGain(); master.gain.setValueAtTime(LEVEL, t0); master.gain.setValueAtTime(LEVEL, t0 + END - 1.6); master.gain.linearRampToValueAtTime(0, t0 + END - .05);
  // gentle bus compression, then a fast limiter so the loudest hits stay under full scale on phones and laptops
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 2.4; comp.attack.value = .012; comp.release.value = .25;
  const limit = ac.createDynamicsCompressor(); limit.threshold.value = -3; limit.knee.value = 0; limit.ratio.value = 20; limit.attack.value = .002; limit.release.value = .08;
  master.connect(comp); comp.connect(limit); limit.connect(dest);
  const dry = ac.createGain(); dry.gain.value = .86; dry.connect(master);
  const verb = ac.createConvolver(), ir = ac.createBuffer(2, Math.floor(ac.sampleRate * 2.4), ac.sampleRate), rr = rng(97);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = (rr() * 2 - 1) * Math.exp(-i / ac.sampleRate * 3.1) * (i > ac.sampleRate * .012 ? 1 : 0); }
  verb.buffer = ir; const wet = ac.createGain(); wet.gain.value = .24; verb.connect(wet); wet.connect(master);
  const out = (node, send = .3, pan = 0) => { const p = ac.createStereoPanner(); p.pan.value = pan; node.connect(p); p.connect(dry); const s = ac.createGain(); s.gain.value = send; p.connect(s); s.connect(verb); };
  const hz = n => 440 * Math.pow(2, (n - 69) / 12), at = t => t0 + t;
  const BAR = 2.5, BEAT = .625, B = (bar, beat = 0) => (bar - 1) * BAR + beat * BEAT;
  const env = (g, t, a, v, d, rel = .0001) => { g.gain.setValueAtTime(0, at(t)); g.gain.linearRampToValueAtTime(v, at(t + a)); g.gain.exponentialRampToValueAtTime(Math.max(rel, 1e-4), at(t + d)); };
  const osc = (type, f, t, d, dest0) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; if (dest0) o.connect(dest0); o.start(at(t)); o.stop(at(t + d + .05)); return o; };
  const noiseBuf = (d, seed) => { const b = ac.createBuffer(1, Math.max(1, Math.ceil(ac.sampleRate * d)), ac.sampleRate), x = b.getChannelData(0), r = rng(seed); for (let i = 0; i < x.length; i++) x[i] = r() * 2 - 1; return b; };
  const noise = (t, d, v, { type = 'bandpass', f = 2000, f1 = null, q = .8, seed = 1, pan = 0, send = .2, a = .01 } = {}) => { if (t >= END) return; const s = ac.createBufferSource(); s.buffer = noiseBuf(d + .05, seed); const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, at(t)); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, at(t + d)); fl.Q.value = q;
    const g = ac.createGain(); g.gain.setValueAtTime(0, at(t)); g.gain.linearRampToValueAtTime(v, at(t + a)); g.gain.exponentialRampToValueAtTime(1e-4, at(t + d)); s.connect(fl); fl.connect(g); out(g, send, pan); s.start(at(t)); s.stop(at(t + d + .05)); };

  // ---------------- instruments ----------------
  function piano(n, t, d = 1.8, v = .18, pan = 0) { if (t >= END - .2) return; const g = ac.createGain(), f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3200; g.connect(f); out(f, .5, pan);
    g.gain.setValueAtTime(0, at(t)); g.gain.linearRampToValueAtTime(v, at(t + .006)); g.gain.exponentialRampToValueAtTime(v * .24, at(t + .28)); g.gain.exponentialRampToValueAtTime(1e-4, at(t + d));
    for (const [r, k] of [[1, 1], [2.003, .32], [3.01, .11], [4.02, .05]]) { const o = osc('sine', hz(n) * r, t, d, null), a = ac.createGain(); a.gain.value = k; o.connect(a); a.connect(g); } }
  function musicBox(n, t, v = .09, pan = .2) { if (t >= END - .2) return; const g = ac.createGain(); out(g, .55, pan); env(g, t, .003, v, 1.6);
    for (const [r, k] of [[1, 1], [4.2, .28], [9.1, .08]]) { const o = osc('sine', hz(n) * r, t, 1.6, null), a = ac.createGain(); a.gain.value = k; o.connect(a); a.connect(g); } }
  function pizz(n, t, v = .16, pan = -.15, d = .5) { if (t >= END - .1) return; const g = ac.createGain(), f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(2400, at(t)); f.frequency.exponentialRampToValueAtTime(500, at(t + d)); g.connect(f); out(f, .25, pan); env(g, t, .004, v, d);
    const o = osc('triangle', hz(n), t, d, g); const o2 = osc('sawtooth', hz(n) * 1.001, t, d * .6, null), a = ac.createGain(); a.gain.value = .25; o2.connect(a); a.connect(g); }
  function strings(notes, t, d, v = .03, send = .6) { if (t >= END) return; for (let j = 0; j < notes.length; j++) { const e = ac.createGain(), f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(700, at(t)); f.frequency.linearRampToValueAtTime(1500, at(t + d * .7)); e.connect(f); out(f, send, (j / Math.max(1, notes.length - 1) - .5) * .7);
    e.gain.setValueAtTime(0, at(t)); e.gain.linearRampToValueAtTime(v, at(t + Math.min(.7, d * .3))); e.gain.setValueAtTime(v * .9, at(t + d * .75)); e.gain.exponentialRampToValueAtTime(1e-4, at(t + d + 1));
    for (const det of [-6, 5]) { const o = osc('sawtooth', hz(notes[j]), t, d + 1, e); o.detune.value = det; } } }
  function bell(n, t, v = .09, pan = .3, d = 3.2) { if (t >= END - .1) return; const e = ac.createGain(); out(e, .8, pan); e.gain.setValueAtTime(v, at(t)); e.gain.exponentialRampToValueAtTime(1e-4, at(t + d));
    for (const [r, k] of [[1, .7], [2.01, .2], [3.98, .08], [5.4, .03]]) { const o = osc('sine', hz(n) * r, t, d, null), g = ac.createGain(); g.gain.value = k; o.connect(g); g.connect(e); } }
  function sweep(t, d, f0, f1, v, { type = 'sine', pan = 0, send = .2, vib = 0 } = {}) { if (t >= END) return; const g = ac.createGain(); out(g, send, pan); env(g, t, .01, v, d); const o = osc(type, f0, t, d, g); o.frequency.setValueAtTime(f0, at(t)); o.frequency.exponentialRampToValueAtTime(f1, at(t + d));
    if (vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = vib[0]; lg.gain.value = vib[1]; l.connect(lg); lg.connect(o.frequency); l.start(at(t)); l.stop(at(t + d + .05)); } }
  const thump = (t, v = .3) => { sweep(t, .35, 110, 42, v, { send: .05 }); noise(t, .12, v * .35, { type: 'lowpass', f: 600, seed: 5 }); };
  const clink = (t, v = .1, pan = -.3) => { for (const [f, k] of [[2093, 1], [3170, .6], [4840, .35], [6120, .2]]) { const g = ac.createGain(); out(g, .5, pan); env(g, t, .002, v * k, .9); osc('sine', f, t, .9, g); } noise(t, .03, v * .6, { f: 7000, q: 2, seed: 8, pan }); };
  const blip = (t, n, v = .07, pan = 0) => { const g = ac.createGain(); out(g, .5, pan); env(g, t, .004, v, .28); osc('sine', hz(n), t, .28, g); };
  const plink = (t, n, v = .06, pan = 0) => { const g = ac.createGain(); out(g, .45, pan); env(g, t, .002, v, .22); const o = osc('sine', hz(n), t, .22, g); o.frequency.setValueAtTime(hz(n) * 1.5, at(t)); o.frequency.exponentialRampToValueAtTime(hz(n), at(t + .05)); };

  // ---------------- harmony: one chord per half bar or bar ----------------
  const C = [48, 55, 60, 64], G = [43, 55, 59, 62], Am = [45, 52, 57, 60], F = [41, 53, 57, 60], Em = [40, 52, 55, 59], Dm = [38, 50, 57, 62], G7 = [43, 53, 59, 62], Cadd9 = [48, 55, 62, 64, 67], Fmaj7 = [41, 53, 57, 64];
  const bed = (bar, chord, beats = 4, v = .018) => strings(chord.slice(1), B(bar), beats * BEAT, v);
  const bass = (bar, chord, beats = [0, 2], v = .15) => beats.forEach(b => pizz(chord[0] + 12, B(bar, b), v, -.2, .55));

  // ---------------- A: the box (bars 1-2) ----------------
  [[.6, 72], [1.2, 76], [1.8, 79], [3.1, 83], [3.7, 79], [4.3, 84]].forEach(([t, n]) => musicBox(n, t, .075, .25));
  bed(1, Cadd9, 8, .012);
  [[.3, .35], [.75, .4], [1.2, .3], [1.55, .45], [2.05, .3]].forEach(([t, d], k) => noise(t, d, .05, { f: 4200, q: 1.2, seed: 20 + k, pan: .2, send: .05, a: .04 }));   // the pencil drawing the box
  [2.5, 3.75, 5.0].forEach((t, k) => { const g = ac.createGain(); out(g, .2, .3); g.gain.setValueAtTime(0, at(t)); g.gain.linearRampToValueAtTime(.05, at(t + .45)); g.gain.exponentialRampToValueAtTime(1e-4, at(t + .95)); const o = osc('triangle', 98, t, 1, g); o.frequency.linearRampToValueAtTime(92, at(t + .9)); noise(t + .1, .8, .012, { f: 700, q: .6, seed: 30 + k, pan: .3 }); });   // snores

  // ---------------- B: asleep or awake, both (bars 3-5) ----------------
  bed(3, Am, 4, .02); bed(4, C, 4, .02); strings([55, 60, 64, 67], B(5), 4 * BEAT, .02);
  for (let k = 0; k < 24; k++) { const t = 5.4 + k * .3125; if (t > 11.3) break; musicBox(k % 2 ? 79 : 76, t, .045 + .02 * Math.sin(k * .5) ** 2, k % 2 ? .35 : -.35); }   // two states, alternating in both ears
  [6.6, 8.21, 9.83].forEach(t => bell(88, t, .05, .4)); [7.41, 9.02, 10.64].forEach(t => bell(69, t, .06, -.4));
  pizz(57, 8.3, .12); pizz(64, 8.6, .1); pizz(69, 8.9, .1);
  noise(10.9, .8, .03, { f: 900, f1: 5000, q: .7, seed: 41, send: .5 });   // the viewer looks
  for (let i = 0; i < 22; i++) { const t = 11.5 + i / 24; noise(t, .035, .02 + i * .002, { f: 1800, q: 1.4, seed: 50 + i, pan: .15 }); }   // the box rattles
  sweep(11.6, .9, 180, 900, .05, { type: 'triangle', send: .3 }); noise(11.7, .8, .03, { f: 1200, f1: 6000, q: .6, seed: 44 });

  // ---------------- C: pop, and the theme wakes up (bars 6-7) ----------------
  noise(12.5, .09, .22, { type: 'lowpass', f: 2600, seed: 60, send: .1 }); sweep(12.5, .12, 700, 180, .2, { send: .05 });                 // pop
  noise(12.52, .25, .05, { f: 900, q: .5, seed: 61, pan: -.3 }); noise(12.54, .22, .05, { f: 1100, q: .5, seed: 62, pan: .3 });           // flaps
  sweep(12.58, .34, 260, 980, .07, { type: 'sine', vib: [18, 30], send: .3 });                                                                  // boing
  [72, 76, 79, 84].forEach((n, k) => piano(n, 12.92 + k * .025, 1.4, .1, .1));                                                                   // ta-da
  thump(13.17, .26); noise(13.17, .3, .04, { f: 500, q: .5, seed: 63 });
  const motif = (t, notes, v = .15, pan = .05, gap = BEAT / 2) => notes.forEach((n, k) => n && piano(n, t + k * gap, 1.3, v, pan));
  bass(6, C, [1, 2, 3], .12); bed(6, C, 4, .016); bass(7, Am, [0, 2], .12); bed(7, F, 4, .016);
  motif(B(6, 1), [76, 79, 76, 72, 74, 76], .13); motif(B(7, 0), [74, 71, 74, 79, 0, 0], .12);
  [[14.05, 88], [14.25, 91]].forEach(([t, n]) => musicBox(n, t, .06, .3));   // (definitely awake.)
  for (let i = 0; i < 14; i++) noise(16.3 + i * .065 * (1 + i * .04), .05, .02, { f: 6000, q: 3, seed: 70 + i, pan: -.35 });   // the coin rolls in
  clink(17.25, .05);

  // ---------------- D: the coin, 0 or 1, then both (bars 8-10) ----------------
  clink(17.8, .12); bed(8, F, 4, .018); bed(9, G, 4, .018); bed(10, Em, 2, .018); strings(Dm.slice(1), B(10, 2), 2 * BEAT, .02);
  // each time a face comes round during the slow spin: 0 is C, 1 is G
  for (let k = 0; k < 3; k++) { const t = 17.8 + (k + .5) * Math.PI / 4.2; pizz(k % 2 ? 67 : 72, t, .12, k % 2 ? .25 : -.25, .6); }
  { const g = ac.createGain(); out(g, .35, -.2); g.gain.setValueAtTime(0, at(17.85)); g.gain.linearRampToValueAtTime(.022, at(18.3)); g.gain.linearRampToValueAtTime(.05, at(21.3)); g.gain.linearRampToValueAtTime(0, at(22.4));
    const o = osc('triangle', 180, 17.85, 4.6, null), am = ac.createGain(); am.gain.value = .5; o.connect(am); am.connect(g); o.frequency.setValueAtTime(180, at(17.85)); o.frequency.linearRampToValueAtTime(260, at(19.6)); o.frequency.exponentialRampToValueAtTime(900, at(21.4));
    const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.setValueAtTime(1.3, at(17.85)); l.frequency.linearRampToValueAtTime(3, at(19.6)); l.frequency.exponentialRampToValueAtTime(28, at(21.4)); lg.gain.value = .5; l.connect(lg); lg.connect(am.gain); l.start(at(17.85)); l.stop(at(22.5)); }   // the spin, a wobble that becomes a whirr
  strings([60, 67, 72, 76], 20.8, 3.4, .026); [84, 88, 91, 96].forEach((n, k) => bell(n, 21.1 + k * .09, .045, .2 - k * .1));                  // both at once
  for (let k = 0; k < 10; k++) musicBox([72, 74, 76, 79, 81, 84, 86, 88, 91, 93][k], 22.05 + k * .16, .05, -.3 + k * .07);                     // the qubit floats up
  sweep(22.25, 1.3, 520, 300, .035, { vib: [6, 40], send: .4 });                                                                              // dizzy
  pizz(55, 22.6, .1); pizz(54, 23.0, .1); pizz(53, 23.4, .12);
  bass(8, F, [0, 2], .11); bass(9, G, [0, 2], .11); bass(10, Em, [0], .11); bass(10, Dm, [2], .11);

  // ---------------- E: entangled yarn (bars 11-13) ----------------
  noise(24.8, .9, .04, { type: 'lowpass', f: 300, seed: 80, pan: -.6 }); noise(24.8, .9, .04, { type: 'lowpass', f: 300, seed: 81, pan: .6 });
  bed(11, C, 4, .017); bed(12, Am, 4, .017); bed(13, F, 2, .017); strings(G.slice(1), B(13, 2), 2 * BEAT, .018);
  [[0, 60], [1, 64], [2, 67], [3, 69]].forEach(([b, n]) => pizz(n - 12, B(11, b), .12)); [[0, 57], [1, 60], [2, 64], [3, 65]].forEach(([b, n]) => pizz(n - 12, B(12, b), .12)); [[0, 53], [1, 57], [2, 55], [3, 59]].forEach(([b, n]) => pizz(n - 12, B(13, b), .12));
  // the same pluck in both ears at the same instant: that is the entanglement
  const twins = (t, notes) => notes.forEach((n, k) => { piano(n, t + k * .16, 1.1, .12, -.85); piano(n, t + k * .16, 1.1, .12, .85); });
  twins(26.2, [76, 79, 84]); twins(30.3, [79, 84, 88]);
  sweep(28.35, .25, 392, 740, .06, { type: 'triangle', send: .2 }); [28.62, 28.8].forEach((t, k) => noise(t, .05, .08, { f: 1600 + k * 400, q: 6, seed: 90 + k, pan: .4 }));   // a double take
  motif(B(12, 2), [72, 76, 79, 76], .1, -.1);

  // ---------------- F: the threads learn (bars 14-16) ----------------
  sweep(32.62, .5, 196, 392, .09, { type: 'triangle', send: .3 }); noise(32.62, .08, .06, { f: 3000, q: 2, seed: 100 });                      // twang
  noise(32.75, .8, .03, { f: 2000, f1: 7000, q: .8, seed: 101, send: .5 });
  bed(14, Am, 4, .02); bed(15, F, 4, .022); bed(16, C, 2, .024); strings(G.slice(1), B(16, 2), 2 * BEAT, .024);
  [[33.3, [57, 60, 64]], [33.8, [64, 69, 72]], [34.3, [69, 72, 76]], [34.8, [72, 76, 81]]].forEach(([t, ch]) => ch.forEach((n, k) => musicBox(n + 12, t + k * .07, .05, -.4 + k * .4)));
  for (let rep = 0; rep < 3; rep++) for (let k = 0; k < 5; k++) { const t = 35.6 + rep * 1.6 + k * .42 + .21; if (t < 39.7) blip(t, [69, 72, 76, 79, 84][k] + (rep === 2 ? 2 : 0), .05, -.6 + k * .3); }   // pulses, input to output
  [57, 64, 69, 72, 76].forEach((n, k) => piano(n, 36.4 + k * .02, 2.4, .1, -.2 + k * .1)); bell(84, 36.45, .07, 0);                           // Quantum + AI
  bass(14, Am, [0, 2], .12); bass(15, F, [0, 2], .12); bass(16, C, [0], .12); bass(16, G, [2], .12);
  motif(B(15, 0), [81, 79, 76, 72, 74, 76], .11, .1);

  // ---------------- G: the mark (bars 17-19) ----------------
  noise(40.0, 1.3, .035, { f: 6000, f1: 800, q: .7, seed: 110, send: .6 });                                                                   // everything gathers
  sweep(41.1, .6, 90, 45, .18, { send: .1 }); noise(41.1, .5, .06, { type: 'lowpass', f: 900, seed: 111 });                                    // the ink lands
  strings([53, 57, 60, 64, 69], B(17), 4 * BEAT, .03); strings([55, 59, 62, 67, 71], B(18), 4 * BEAT, .032); strings([48, 55, 64, 67, 72, 76], B(19), 4 * BEAT + .5, .034);
  for (let k = 0; k < 8; k++) musicBox([60, 64, 67, 72, 76, 79, 84, 88][k], 41.45 + k * .15, .045, -.5 + k * .14);                            // orbits drawn
  [[42.95, 84], [43.05, 88], [43.15, 91]].forEach(([t, n], k) => bell(n, t, .09, -.4 + k * .4));                                              // three electrons lock in
  noise(42.8, 1.1, .03, { f: 1200, f1: 3200, q: .5, seed: 112, send: .4 });
  motif(B(18, 0), [76, 79, 84, 83, 79, 81, 79, 0], .15, .05); motif(B(19, 0), [76, 74, 76, 72], .15, .05, BEAT); piano(48, B(19), 3, .12, -.2); piano(55, B(19), 3, .1, -.1);
  bass(17, F, [0, 2], .13); bass(18, G, [0, 2], .13); bell(96, 44.25, .03, .3);

  // ---------------- H: the seed (bars 20-22) ----------------
  sweep(47.5, .18, 300, 620, .06, { send: .2 });                                                                                                // the pot pops in
  sweep(48.0, .33, 1800, 700, .025, { send: .3 }); plink(48.35, 76, .05);                                                                       // the seed drops
  noise(48.9, .9, .03, { f: 1400, f1: 500, q: .6, seed: 120, send: .3, pan: -.4 });                                                           // the can swings in
  for (let i = 0; i < 26; i++) { const t = 50.1 + i * .05 + .42; if (t > 51.95) break; plink(t, [79, 84, 86, 88, 91][Math.floor(hash(i, 7) * 5)] + 12, .035 + hash(i, 8) * .02, -.4 + hash(i, 9) * .5); }   // water
  for (let k = 0; k < 9; k++) musicBox([67, 69, 72, 74, 76, 79, 81, 84, 88][k], 50.6 + k * .34, .05, -.2 + k * .06);                           // it grows
  bed(20, Fmaj7, 4, .02); strings([52, 55, 60, 64], B(21), 4 * BEAT, .02); bed(22, Dm, 2, .02); strings(G7.slice(1), B(22, 2), 2 * BEAT, .02);
  bass(20, F, [0, 2], .11); bass(21, [40], [0, 2], .11); bass(22, Dm, [0], .11); bass(22, G, [2], .11);
  motif(B(21, 2), [72, 76, 79, 81], .11, 0); motif(B(22, 0), [79, 77, 76, 74], .11, 0);

  // ---------------- I: the invitation (bars 23-30), the whole theme ----------------
  noise(55.0, 2.4, .035, { f: 500, f1: 2500, q: .5, seed: 130, send: .6 });                                                                   // the room opens
  noise(57.6, 1.9, .05, { f: 2400, f1: 1100, q: .6, seed: 131, pan: -.2, send: .3, a: .3 });                                                   // the card opens
  for (let k = 0; k < 7; k++) musicBox([72, 76, 79, 84, 88, 91, 96][k], 58.2 + k * .09, .045, -.3 + k * .1);
  sweep(58.8, .2, 400, 780, .04, { send: .2 });                                                                                                 // the sapling stands up
  const THEME = [ // [beat from 55 s (bar 23), midi, beats]; it starts as the room opens and cadences at 72.5 s
    [0, 76, 1], [1, 79, .5], [1.5, 76, .5], [2, 72, 1], [3, 74, .5], [3.5, 76, .5],
    [4, 74, 1], [5, 71, .5], [5.5, 74, .5], [6, 79, 2],
    [8, 72, 1], [9, 76, .5], [9.5, 81, .5], [10, 79, 1], [11, 76, 1],
    [12, 77, .5], [12.5, 76, .5], [13, 74, .5], [13.5, 72, .5], [14, 74, 2],
    [16, 76, 1], [17, 79, .5], [17.5, 76, .5], [18, 84, 1], [19, 83, .5], [19.5, 81, .5],
    [20, 79, 1], [21, 74, .5], [21.5, 76, .5], [22, 77, 1], [23, 74, 1],
    [24, 72, 1], [25, 77, .5], [25.5, 81, .5], [26, 79, 1], [27, 76, .5], [27.5, 74, .5],
    [28, 72, 4]
  ];
  THEME.forEach(([b, n, d]) => { const t = B(23) + b * BEAT; piano(n, t, Math.max(1.2, d * BEAT * 2.2), .15, .08); if (b >= 16) piano(n - 12, t, 1.2, .05, -.1); });
  const PROG = [C, G, Am, F, C, G, F, C];
  PROG.forEach((ch, k) => { const bar = 23 + k; strings(ch.slice(1).map(n => n + 12), B(bar), 4 * BEAT + (k === 7 ? 3 : 0), k < 4 ? .02 : .026); bass(bar, ch, k === 7 ? [0] : [0, 2], .13); });
  for (let k = 0; k < 8; k++) [0, 1, 2, 3].forEach(b => { if (k < 7) musicBox([ch => ch[2] + 24, ch => ch[3] + 24, ch => ch[1] + 24, ch => ch[3] + 24][b](PROG[k]), B(23 + k, b + .5), .025, .35); });
  for (let i = 0; i < 12; i++) noise(62.0 + i * .075, .07, .035, { f: 3800 + (i % 3) * 400, q: 1.4, seed: 140 + i, pan: .3, send: .1 });   // the pencil rings the time
  bell(88, 67.62, .08, -.3); pizz(79, 67.9, .1, -.3); pizz(84, 68.1, .1, -.3);                                                                 // a wave and a wink
  for (let i = 0; i < 10; i++) noise(67.6 + i * .13, .1, .02, { f: 4000, q: 1.2, seed: 150 + i, pan: -.3, send: .05 });                      // the tagline is written
  [72, 76, 79, 84].forEach((n, k) => piano(n, 69.1 + k * .05, 2, .11, -.1)); bell(91, 69.15, .06, 0);                                           // Be there!
  strings([48, 55, 60, 64, 67, 72], 72.5, 1.4, .03); [48, 55, 64, 67, 72, 76].forEach((n, k) => piano(n, 72.5 + k * .03, 2.4, .09, -.2 + k * .08)); bell(84, 72.55, .05, .2);
  if (typeof more === 'function') more({ ac, at, out, osc, env, noise, sweep, piano, musicBox, pizz, strings, bell, thump, clink, blip, plink, hz, B, BEAT, END });
}
