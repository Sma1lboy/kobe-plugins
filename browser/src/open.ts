#!/usr/bin/env node
// examples.browser.open <url> — remember the URL and open the pane WITHOUT
// the URL prompt (one-shot skip marker).
//   kobe plugin action invoke examples.browser.open https://localhost:5173

import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { openPane, pluginContext } from "@sma1lboy/kobe-plugin-sdk"

const raw = process.argv[2]
if (!raw) {
  console.error("usage: kobe plugin action invoke examples.browser.open <url>")
  process.exit(2)
}
const url = /^https?:\/\//.test(raw) ? raw : `https://${raw}`

const ctx = pluginContext()
mkdirSync(ctx.stateDir, { recursive: true })
writeFileSync(join(ctx.stateDir, "url"), url)
writeFileSync(join(ctx.stateDir, "skip-prompt"), "")

const res = await openPane("examples.browser.browse")
if (res.stdout.trim()) console.log(res.stdout.trim())
if (res.code !== 0) console.error(res.stderr.trim())
process.exit(res.code)
