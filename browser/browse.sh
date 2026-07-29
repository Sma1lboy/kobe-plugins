#!/bin/sh
# examples.browser — carbonyl (Chromium as terminal cells) in a kobe pane.
# Opens with an inline URL prompt (default = last URL / BROWSER_HOME); the
# `open` action pre-sets the URL and skips the prompt via a one-shot marker.

export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"

home_url="https://example.com"
if [ -n "$KOBE_PLUGIN_CONFIG_DIR" ] && [ -f "$KOBE_PLUGIN_CONFIG_DIR/.env" ]; then
  . "$KOBE_PLUGIN_CONFIG_DIR/.env"
  [ -n "$BROWSER_HOME" ] && home_url="$BROWSER_HOME"
fi

state_url="$KOBE_PLUGIN_STATE_DIR/url"
skip="$KOBE_PLUGIN_STATE_DIR/skip-prompt"
last=""
[ -f "$state_url" ] && last=$(cat "$state_url")
default="${last:-$home_url}"

if [ -f "$skip" ]; then
  rm -f "$skip"
  url="$default"
else
  printf 'url [%s]: ' "$default"
  read -r input
  url="${input:-$default}"
fi
case "$url" in
  http://*|https://*) ;;
  *) url="https://$url" ;;
esac
mkdir -p "$KOBE_PLUGIN_STATE_DIR"
printf %s "$url" > "$state_url"

local_bin="$KOBE_PLUGIN_ROOT/node_modules/.bin/carbonyl"
if [ -x "$local_bin" ]; then
  exec "$local_bin" "$url"
fi
if command -v carbonyl >/dev/null 2>&1; then
  exec carbonyl "$url"
fi
if command -v npm >/dev/null 2>&1; then
  echo "carbonyl not provisioned — installing into the plugin directory…"
  (cd "$KOBE_PLUGIN_ROOT" && npm install --no-audit --no-fund) && exec "$local_bin" "$url"
fi
echo "examples.browser needs carbonyl (https://github.com/fathyb/carbonyl) and npm to provision it"
echo "press enter to close"
read -r _
