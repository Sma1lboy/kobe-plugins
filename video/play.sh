#!/bin/sh
# examples.video pane — play the remembered source (or the built-in demo).
# Config in "$KOBE_PLUGIN_CONFIG_DIR/.env": KOBE_VIDEO_MODE=ascii|half,
# KOBE_VIDEO_FPS, KOBE_VIDEO_LOOP=1.

# The pane runs under plain `sh`, whose login PATH may miss Homebrew —
# node/ffmpeg live there on most macOS setups.
export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"

if [ -n "$KOBE_PLUGIN_CONFIG_DIR" ] && [ -f "$KOBE_PLUGIN_CONFIG_DIR/.env" ]; then
  . "$KOBE_PLUGIN_CONFIG_DIR/.env"
  export KOBE_VIDEO_MODE KOBE_VIDEO_FPS KOBE_VIDEO_LOOP
fi

fail() {
  echo "$1"
  echo "press enter to close"
  read -r _
  exit 1
}
command -v node >/dev/null 2>&1 || fail "examples.video needs node on PATH"
command -v ffmpeg >/dev/null 2>&1 || fail "examples.video needs ffmpeg on PATH (brew install ffmpeg)"

state_src="$KOBE_PLUGIN_STATE_DIR/source"
src=""
[ -f "$state_src" ] && src=$(cat "$state_src")
if [ -n "$src" ]; then
  node "$KOBE_PLUGIN_ROOT/player.js" "$src"
else
  node "$KOBE_PLUGIN_ROOT/player.js"
fi
code=$?
[ "$code" -ne 0 ] && fail "player exited with $code"
