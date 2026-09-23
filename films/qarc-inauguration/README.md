# QARC · You're invited

A 75-second hand-drawn invitation film for the inauguration of **QARC, the Quantum & AI Research Cell**
(Department of Computer Science & Engineering, SSIT): Saturday 26 September 2026, 11:00 AM.
Made with the `hand-drawn-canvas-animation` skill in `.claude/skills/`.

It comes in two cuts with the same story, timing and music:

| cut | page | format | output |
|---|---|---|---|
| landscape: screens, projectors, YouTube | `qarc-invite.html` | 16:9, 1920×1080 | `out/qarc-invite-final.mp4` |
| portrait reel: Instagram Reels, YouTube Shorts | `qarc-reel.html` | 9:16, 1080×1920 | `out/qarc-reel-final.mp4` |

The reel is re-staged for a phone, not cropped. The page is tall, the network grows upward into the mark,
and captions sit where the Reels interface leaves them readable. It also has more drawn motion: a pencil
drawing the box, secondary motion on the cat (tail, breathing, softer blinks, ear flicks, overshoot on head
turns), speed lines, sparkles, pings and dust, a close-up on the card, and confetti. `reel.js` lists all of it.

## Render

```bash
npm i --no-audit --no-fund                        # once: puppeteer-core for the renderer
CHROME=/path/to/chrome node render.mjs qarc-invite.html --width 1920
CHROME=/path/to/chrome node render.mjs qarc-reel.html
# out/<name>-final.mp4 (with sound), out/<name>.mp4 (silent), out/<name>-contact.jpg
```

In Claude Code on the web, the repo's session-start hook installs ffmpeg and sets `CHROME` to a Chromium wrapper.
Previews: `--grid 24`, `--strip 300,24` (consecutive frames), `--only 1799` (one full-size frame).
Open either page in a browser to scrub and play it (turn the sound on in the player bar).

## Changing the details

- Invitation text (date, time, venue, presiding line, cover line): the `INVITE` object in `invite.js`, used by both cuts.
- Story captions: `CAPTIONS` in `world.js` (landscape) and `reel-world.js` (reel). Times are in seconds. The reel's
  captions are placed by where they sit on the phone screen when they are written (`sx`, `sy`, `px`).
- Music cues: `score.js`, one section per beat, at the same times as the pictures (both cuts);
  the reel's extra effects are in `reel-score.js`.

## Files

| file | what it holds |
|---|---|
| `film.js` | the landscape cut: brief, beat sheet and timeline |
| `world.js` | the landscape sketchbook page: camera path, box, pop, coin, yarn, network, mark, seed, captions |
| `card.js` | the landscape finale: the desk, the page in 3D and the pop-up invitation card |
| `reel.js` | the reel: brief, what changed, beat sheet and timeline |
| `reel-world.js` | the portrait page: layout, camera, all of 0-55 s with the added motion, captions for phones |
| `reel-fx.js` | the reel's motion detail: sparkles, pings, speed lines, dust, the drawn pencil, the eye, the swaying tail and breathing, the living sapling |
| `reel-card.js` | the reel's finale: the card sliding up onto the page, the reading close-up, the pencil, confetti |
| `reel-score.js` | extra sound cues for the reel's added motion |
| `invite.js` | the invitation's facts, shared by both cuts |
| `cat.js` | the cat: landmark drawings, poses, sprites (plus the half blink and the separate tail the reel uses) |
| `props.js` | the pencil brush, box, coin, yarn, pot, sapling, watering can, handwriting |
| `score.js` | the original score and sound effects |
| `fonts.js`, `logos.js` | embedded fonts and the institution's marks (see `SOURCES.md`) |
| `lab-cat.html`, `lab-props.html` | model sheet and style board used while designing |
