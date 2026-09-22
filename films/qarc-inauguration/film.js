'use strict';
// ============================================================
// QARC · YOU'RE INVITED. A 75-second hand-drawn invitation film for the
// inauguration of the Quantum & AI Research Cell, Department of CSE, SSIT.
//
// BRIEF
// Subject and beat: a curious pencil cat plays through quantum ideas (a cat in a
//   box that is asleep and awake, a 0/1 coin that spins into both, entangled yarn),
//   its yarn learns to be a network, the network becomes the QARC mark, a seed is
//   watered, and a printed card invites the whole university. Curiosity, delight,
//   pride, welcome.
// Duration / format: 75 s; 16:9; 1920x1080; 24 fps; stereo AAC.
// Drawing reference: sketchbook pencil cartoon, whole redrawn poses (the skill's
//   sketchbook-bird study); graphite contours, coloured-pencil fur and stripes.
// Material reference: cream sketchbook paper -> navy ink for the mark -> printed
//   card stock on a wooden desk.
// Looks: pencil (0-40 s, 47-55 s), ink (the mark, 40-47 s), print + paper in space
//   (55-75 s). Techniques used: whole cels with assisted inbetweens and replacement
//   drawings; a draw-on pencil brush; paper pop-up (book3) with a cut-out.
// Why the material changes: the idea becomes an identity, so pencil commits to ink;
//   the invitation is the official artefact, so it is printed paper. The thread,
//   the coin and both yarn balls carry into the mark as its circuit and electrons;
//   the sapling carries into the card as its pop-up; the cat stays on the page.
// Palette: paper #f4eee2, graphite #2e2823, navy #1f3a5c (thread, quantum, mark),
//   orange #e0702a (energy, time), green #4f8d58 (the seed); fur #f5cf9f.
// Cast: one ginger tabby, 3/4 front. Keys in cat.js POSE_P; blinks and winks are
//   replacement drawings; the pop is exposed on ones, acting on twos, holds held.
// Hardest action: the pop out of the box (world.js POP_SHEET): burst 300, rise on
//   ones 302-307 with arms up, a hang at the top, reach down 310-315, contact 316,
//   squash 316-318, settle 319-323, sit 324.
// Camera: one sketchbook page, one travelling camera (world.js CAM_KEYS); at 55 s a
//   top-down 3D camera reproduces the drawn frame exactly, then pulls back.
// External sources: see SOURCES.md. No student names appear.
//
// BEAT SHEET (start s, what the viewer notices, sound)
//   0.0  a box is drawn; it snores; DO NOT OBSERVE        music box, pencil, snores
//   5.0  x-ray: asleep and awake at once                 two alternating notes, bells
//  12.5  POP: the cat leaps out, lands, sits              pop, boing, ta-da, thump
//  16.3  a coin rolls in, is patted, spins 0/1/both       clink, a whirr, a chord
//  22.0  the qubit floats up; the cat is dizzy            harp run, wobble
//  25.0  entangled yarn: pat one, both spin               the same pluck in both ears
//  32.5  the thread lifts and weaves a network            twang, arpeggios, pulses
//  40.0  the network gathers into Q; orbits; ARC inks     swell, bells as electrons land
//  47.5  a seed, a watering can, a sapling                bloop, water plinks, chimes
//  55.0  the page lies on a desk; the card slides in      the room opens; the theme
//  57.6  the card opens; the sapling stands up            paper, music box
//  62.0  a pencil circles 11:00 AM                        scribble
//  67.6  the cat waves and winks; "Be there!"             bell, the final cadence 72.5
// ============================================================
// ============================================================
// TIMELINE. 0-55 s the camera travels over one sketchbook page; 55-75 s the
// page lies on a desk and the invitation card opens beside the cat.
// ============================================================
const TIMELINE = [
  { name: 'sketchbook', dur: 55, fn: sketchbookScene },
  ...(typeof invitationScene === 'function' ? [{ name: 'invitation', dur: 20, fn: (c, tau) => invitationScene(c, tau) }] : [])
];
defineFilm({ palette: { ...PALETTES.pencilMinimal, paper: COL.paper }, format: { ar: '16:9', width: 1920 }, fps: 24, timeline: TIMELINE, score: typeof score === 'function' ? score : undefined });
