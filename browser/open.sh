#!/bin/sh
# examples.browser.open <url> — remember the URL and open the pane WITHOUT
# the URL prompt (one-shot skip marker).
#   kobe plugin action invoke examples.browser.open https://localhost:5173

url="$1"
if [ -z "$url" ]; then
  echo "usage: kobe plugin action invoke examples.browser.open <url>"
  exit 2
fi
case "$url" in
  http://*|https://*) ;;
  *) url="https://$url" ;;
esac
mkdir -p "$KOBE_PLUGIN_STATE_DIR"
printf %s "$url" > "$KOBE_PLUGIN_STATE_DIR/url"
: > "$KOBE_PLUGIN_STATE_DIR/skip-prompt"
exec "${KOBE_BIN_PATH:-kobe}" plugin pane open examples.browser.browse
