# examples.browser

A real Chromium browser inside a kobe pane tab, via
[carbonyl](https://github.com/fathyb/carbonyl) — Chromium rendered as plain
terminal cells (half-block unicode + truecolor), so it works in kobe's
embedded terminal with no graphics-protocol support. Mouse, keyboard,
scrolling, even video.

```bash
kobe plugin install Sma1lboy/kobe-plugins/browser    # self-provisions carbonyl into the plugin dir

kobe plugin pane open examples.browser.browse    # URL via the host's input dialog (enter = last URL / home)
kobe plugin action invoke examples.browser.open localhost:5173         # open a URL
```

The install's `[[build]]` step runs `npm install` inside the plugin's own
checkout, so Chromium lives under `~/.kobe/plugins/examples.browser/` —
nothing global. (A `kobe plugin link` skips build; the pane self-provisions
on first open instead.)

Built on [`@sma1lboy/kobe-plugin-sdk`](https://github.com/Sma1lboy/kobe/tree/main/packages/kobe-plugin-sdk)
(TypeScript, compiled at install). The URL prompt uses the host's input
dialog (`promptUser()` → `kobe api prompt`); on kobe versions without it
the pane falls back to an inline readline prompt.

Set a home page: `echo 'BROWSER_HOME=https://news.ycombinator.com' >
"$(kobe plugin config-dir examples.browser)/.env"`. Bind a chord yourself in
`~/.kobe/settings/keybindings.yaml`:

```yaml
plugins:
  ctrl+b: pane:examples.browser.browse
```

Scope note: carbonyl is for previewing dev servers and watching pages without
leaving the terminal — a desktop browser still wins on devtools/extensions.
(herdr's browser plugin instead streams CDP frames over the kitty graphics
protocol; kobe's embedded terminal has no graphics passthrough yet, so the
cell-rendering approach is the one that works everywhere today.)
