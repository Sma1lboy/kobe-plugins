#!/usr/bin/env node
// kobe.image.open <file> — remember the path, open the preview pane.
//   kobe plugin action invoke kobe.image.open ~/shot.png
// Also the [[file_handlers]] target: Files-pane Enter on an image lands
// here with the absolute path.

import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { openPane, pluginContext } from "@sma1lboy/kobe-plugin-sdk"

const file = process.argv[2]
if (!file) {
  console.error("usage: kobe plugin action invoke kobe.image.open <file>")
  process.exit(2)
}

const ctx = pluginContext()
mkdirSync(ctx.stateDir, { recursive: true })
writeFileSync(join(ctx.stateDir, "file"), file)

const res = await openPane("kobe.image.view")
if (res.stdout.trim()) console.log(res.stdout.trim())
if (res.code !== 0) console.error(res.stderr.trim())
process.exit(res.code)
