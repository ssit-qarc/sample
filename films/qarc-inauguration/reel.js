'use strict';
// ============================================================
// QARC · YOU'RE INVITED, THE REEL. The 75-second invitation film re-staged for
// a 9:16 phone screen (Instagram Reels, YouTube Shorts), with more
// drawn motion in every action.
//
// BRIEF (what changes from the landscape film, qarc-invite.html)
// Duration / format: 75 s; 9:16; 1080x1920; 24 fps; stereo AAC. Same beats and
//   the same score, so both cuts can be shown together.
// Composition: one tall sketchbook page. The table sits in the lower half; the
//   box stands at the right, the cat in the middle, the coin, the yarn and the
//   pot on the left. The network grows upward from the yarn to the qubit and
//   gathers into the mark at the top of the page. Text stays inside the part of
//   a phone screen that Reels leaves clear: nothing important in the top 220 px,
//   the bottom 400 px or the right-hand buttons.
// Captions: written on the page at phone size (60-120 px high on screen), one
//   or two short lines at a time.
// Motion added: a pencil draws the box; the box breathes with its snores, gathers
//   itself before the pop and rings after it; an eye opens for "until you look";
//   speed lines, a glint and dust on the pop; motion lines on the coin, whirl arcs
//   on its spin, a burst and rings as it becomes both; kets and a turning state
//   arrow on the qubit; dizzy stars; the second yarn ball pops out of the box and
//   bounces; both balls ping at the same instant; the thread twangs; pulses carry
//   comet tails; the ink lands like a stamp; electrons fly in with trails and keep
//   circling; a shine crosses ARC; the pot drops and squashes; the seed tumbles;
//   the water splashes and drips; the sapling springs up and sways in a breeze.
// The cat: whole drawings as before, plus an overshoot drawing between seated
//   poses, softer blinks (half, shut, shut, half), ear flicks, breathing on holds
//   and a tail drawn as its own cel behind the body, swaying on twos.
// Finale: the page lies on a desk; the card slides up onto it and opens; the
//   camera goes close enough to read the date, time and venue on a phone; a
//   pencil circles the time; the camera returns to the cat; confetti falls.
// External sources: see SOURCES.md. No student names appear.
//
// BEAT SHEET (start s, what the viewer notices, sound)
//   0.0  a pencil draws a box; it snores and breathes          music box, pencil, snores
//   5.0  x-ray: asleep and awake, alternating faster           two alternating notes, bells
//  10.1  an eye opens: "until you look"; the box trembles       swell, rattle
//  12.5  POP: flaps burst, the cat shoots up, lands             pop, boing, ta-da, thump
//  16.3  a coin rolls in, is patted, spins 0/1/both             clink, a whirr, a chord
//  22.0  the qubit floats up; the cat is dizzy                  harp run, wobble
//  24.8  a yarn ball rolls in; its twin pops out of the box     rolls, a pop and bounces
//  26.2  pat one, both ping and spin at once                    the same pluck in both ears
//  32.5  the thread twangs, lifts, grows a network upward       twang, arpeggios, pulses
//  40.0  the network gathers into Q; the ink lands; ARC         swell, bells as electrons land
//  47.4  a pot drops in, a seed, the watering can, a sapling    thump, water plinks, chimes
//  55.0  the page lies on a desk; the card slides up            the room opens; the theme
//  57.6  the card opens; the sapling stands up                  paper, music box
//  60.0  close on the details; a pencil circles 11:00 AM        scribble
//  66.0  back to the cat: it waves and winks; "Be there!"       bell, confetti, cadence 72.5
// ============================================================
const TIMELINE = [
  { name: 'sketchbook', dur: 55, fn: sketchbookScene },
  ...(typeof invitationScene === 'function' ? [{ name: 'invitation', dur: 20, fn: (c, tau) => invitationScene(c, tau) }] : [])
];
defineFilm({ palette: { ...PALETTES.pencilMinimal, paper: COL.paper }, format: { ar: '9:16', width: 1080 }, fps: 24, timeline: TIMELINE,
  score: typeof score === 'function' ? (ac, t0, dest) => score(ac, t0, dest, typeof reelCues === 'function' ? reelCues : undefined) : undefined });
