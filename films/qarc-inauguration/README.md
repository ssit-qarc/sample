# QARC · You're invited

A 75-second hand-drawn invitation film for the inauguration of **QARC, the Quantum & AI Research Cell**
(Department of Computer Science & Engineering, SSIT): Saturday 26 September 2026, 11:00 AM.
Made with the `hand-drawn-canvas-animation` skill in `.claude/skills/`.

## Render

```bash
npm i --no-audit --no-fund                        # once: puppeteer-core for the renderer
CHROME=/path/to/chrome node render.mjs qarc-invite.html --width 1920
# out/qarc-invite-final.mp4 (with sound), out/qarc-invite.mp4 (silent), out/qarc-invite-contact.jpg
```

In Claude Code on the web the repo's session-start hook installs ffmpeg and sets `CHROME` to a Chromium wrapper.
Previews: `--grid 24`, `--strip 300,24` (consecutive frames), `--only 1799` (one full-size frame).
Open `qarc-invite.html` in a browser to scrub and play it (turn the sound on in the player bar).

## Changing the details

- Invitation text (date, time, venue, presiding line, cover line): the `INVITE` object at the top of `card.js`.
- Story captions: `CAPTIONS` in `world.js` (times are in seconds).
- Music cues: `score.js`, one section per beat, with the same times as the pictures.

## Files

| file | what it holds |
|---|---|
| `film.js` | the brief, the beat sheet and the timeline |
| `world.js` | the sketchbook page: camera path, box, pop, coin, yarn, network, mark, seed, captions |
| `cat.js` | the cat: landmark drawings, poses, sprites |
| `props.js` | the pencil brush, box, coin, yarn, pot, sapling, watering can, handwriting |
| `card.js` | the desk, the page in 3D and the pop-up invitation card |
| `score.js` | the original score and sound effects |
| `fonts.js`, `logos.js` | embedded fonts and the institution's marks (see `SOURCES.md`) |
| `lab-cat.html`, `lab-props.html` | model sheet and style board used while designing |
