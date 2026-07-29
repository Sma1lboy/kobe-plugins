#!/bin/sh
# examples.video.open <file-or-url> — remember the source, open the player tab.
#   kobe plugin action invoke examples.video.open ~/Movies/clip.mp4

src="$1"
if [ -z "$src" ]; then
  echo "usage: kobe plugin action invoke examples.video.open <file-or-url>"
  exit 2
fi
case "$src" in
  http://*|https://*) ;;
  *) src=$(cd "$(dirname "$src")" 2>/dev/null && pwd)/$(basename "$src") ;;
esac
mkdir -p "$KOBE_PLUGIN_STATE_DIR"
printf %s "$src" > "$KOBE_PLUGIN_STATE_DIR/source"
exec "${KOBE_BIN_PATH:-kobe}" plugin pane open examples.video.play
