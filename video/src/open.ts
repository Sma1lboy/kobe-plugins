#!/usr/bin/env node
// kobe.video.open <file-or-url> — remember the source, open the player tab.
//   kobe plugin action invoke kobe.video.open ~/Movies/clip.mp4
// Also the [[file_handlers]] target: Files-pane Enter on a video lands here
// with the absolute path.

import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { openPane, pluginContext } from "@sma1lboy/kobe-plugin-sdk"

const src = process.argv[2]
if (!src) {
  console.error("usage: kobe plugin action invoke kobe.video.open <file-or-url>")
  process.exit(2)
}

const ctx = pluginContext()
mkdirSync(ctx.stateDir, { recursive: true })
writeFileSync(join(ctx.stateDir, "source"), src)

const res = await openPane("kobe.video.play")
if (res.stdout.trim()) console.log(res.stdout.trim())
if (res.code !== 0) console.error(res.stderr.trim())
process.exit(res.code)
