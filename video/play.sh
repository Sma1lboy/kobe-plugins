#!/bin/sh
# examples.video pane — play the remembered source (or the built-in demo).
# Config in "$KOBE_PLUGIN_CONFIG_DIR/.env": KOBE_VIDEO_MODE=ascii|half,
# KOBE_VIDEO_FPS, KOBE_VIDEO_LOOP=1.

if [ -n "$KOBE_PLUGIN_CONFIG_DIR" ] && [ -f "$KOBE_PLUGIN_CONFIG_DIR/.env" ]; then
  . "$KOBE_PLUGIN_CONFIG_DIR/.env"
  export KOBE_VIDEO_MODE KOBE_VIDEO_FPS KOBE_VIDEO_LOOP
fi
state_src="$KOBE_PLUGIN_STATE_DIR/source"
src=""
[ -f "$state_src" ] && src=$(cat "$state_src")
if [ -n "$src" ]; then
  exec node "$KOBE_PLUGIN_ROOT/player.js" "$src"
fi
exec node "$KOBE_PLUGIN_ROOT/player.js"
