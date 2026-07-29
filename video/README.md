# examples.video

Play any video as terminal characters, in a kobe tab. ffmpeg decodes to a
raw RGB pipe; a ~130-line zero-dependency script repaints every frame as
ANSI truecolor cells. **No video is ever actually played — it's characters.**

Two looks (`KOBE_VIDEO_MODE` in the plugin `.env`):
- `half` (default) — half-block `▀` cells, two pixels per cell: reads like
  chunky real video
- `ascii` — luminance-ramp ASCII (` .:-=+*#%@`) with truecolor: the toy look

```bash
kobe plugin install Sma1lboy/kobe-plugins/video

kobe plugin pane open examples.video.play                       # built-in demo source
kobe plugin action invoke examples.video.open ~/Movies/clip.mp4 # play a file
kobe plugin action invoke examples.video.open https://…/clip.mp4
```

Config (`$(kobe plugin config-dir examples.video)/.env`):
`KOBE_VIDEO_MODE=ascii` · `KOBE_VIDEO_FPS=24` · `KOBE_VIDEO_LOOP=1`.

Requires `ffmpeg` on PATH. Opens as its own tab (`placement = "tab"`) —
a movie deserves the whole screen; ctrl+w closes it.
