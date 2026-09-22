#!/bin/bash
# SessionStart hook for Claude Code on the web: prepares the container so the
# hand-drawn-canvas-animation skill can render films to MP4.
# Command output goes to stderr; stdout carries one status line into the session.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

scripts_dir="$CLAUDE_PROJECT_DIR/.claude/skills/hand-drawn-canvas-animation/scripts"
wrapper=/usr/local/bin/chrome-no-sandbox

# The container runs as root, and Chromium refuses to start as root without
# --no-sandbox. The skill's scripts launch whatever $CHROME names.
chrome=""
for candidate in /opt/pw-browsers/chromium /opt/pw-browsers/chromium-*/chrome-linux*/chrome; do
  if [ -x "$candidate" ]; then
    chrome="$candidate"
    break
  fi
done
if [ -n "$chrome" ]; then
  printf '#!/bin/sh\nexec "%s" --no-sandbox "$@"\n' "$chrome" > "$wrapper"
  chmod +x "$wrapper"
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    echo "export CHROME=$wrapper" >> "$CLAUDE_ENV_FILE"
  fi
else
  echo "session-start: no Chromium under /opt/pw-browsers; set CHROME before rendering" >&2
fi

# The renderer's npm dependency (puppeteer-core).
(cd "$scripts_dir" && npm install --no-audit --no-fund >&2)

# ffmpeg and ffprobe for MP4 export; skipped once the container has them.
if ! command -v ffmpeg >/dev/null 2>&1 || ! command -v ffprobe >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq >&2
  apt-get install -y -qq --no-install-recommends ffmpeg >&2
fi

if [ -n "$chrome" ]; then
  echo "hand-drawn-canvas-animation renderer ready: CHROME=$wrapper (Chromium with --no-sandbox), ffmpeg and puppeteer-core installed."
else
  echo "hand-drawn-canvas-animation renderer: ffmpeg and puppeteer-core installed, but no Chromium was found; set CHROME before rendering."
fi
