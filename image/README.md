# kobe.image

Preview an image without leaving the terminal — half-block truecolor
cells, animated GIFs included.

**The rendering isn't ours.** [`terminal-image`](https://www.npmjs.com/package/terminal-image)
does the work; this plugin only sizes the pane, keeps it open, and redraws
on resize. That library is pure JS (jimp — no native addons, nothing
installed globally), so the install self-provisions it into the plugin's
own directory the way the browser plugin provisions Chromium.

```bash
kobe plugin install Sma1lboy/kobe-plugins/image

kobe plugin action invoke kobe.image.open ~/shot.png   # or just press
                                                       # enter on an image
                                                       # in the Files pane
```

`[[file_handlers]]` claims `png / jpg / jpeg / gif / webp / bmp / tif`, so
Files-pane Enter opens the preview directly. SVG is deliberately absent —
jimp cannot rasterize it.

Opens as a split beside the engine (a preview is something you glance at
while working, unlike the video player which takes its own tab). `q` or
`esc` closes it.

Setting (Settings → Plugins → Image): **Fit** — `contain` caps the image to
the pane so it stays a preview, `width` fills the width and lets a tall
image scroll.

Why cells and not a real image: kobe's embedded terminal renders through
its own emulator, so the kitty/iTerm2 graphics protocols never reach the
outer terminal. Half-block cells are the encoding that survives — the same
reason the video plugin and the carbonyl browser look the way they do.
