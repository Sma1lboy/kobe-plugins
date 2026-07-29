#!/usr/bin/env node
// kobe.image — preview an image as terminal cells.
//
// The rendering is NOT ours: `terminal-image` (pure JS on jimp) turns the
// file into half-block truecolor cells, which is exactly the encoding a
// kobe pane renders best. This entrypoint only decides the size, keeps the
// pane open, and redraws on resize.
//
// Usage: node dist/view.js [file]   (no arg → the path `open` remembered)

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { pluginContext, setting } from "@sma1lboy/kobe-plugin-sdk"
import terminalImage from "terminal-image"

const ctx = (() => {
  try {
    return pluginContext()
  } catch {
    return null // plain `node dist/view.js pic.png` outside kobe still works
  }
})()

const file =
  process.argv[2] ??
  (() => {
    if (!ctx) return undefined
    try {
      return readFileSync(join(ctx.stateDir, "file"), "utf8").trim() || undefined
    } catch {
      return undefined
    }
  })()

/** Hold the pane open on failure — it self-closes the moment we exit. */
function fail(message: string): never {
  process.stdout.write(`\x1b[0m${message}\npress enter to close\n`)
  try {
    process.stdin.setRawMode?.(false)
    readFileSync("/dev/stdin", { encoding: "utf8", flag: "r" })
  } catch {
    /* non-tty */
  }
  process.exit(1)
}

if (!file) fail("kobe.image: no file — open one from the Files pane, or pass a path")

const fit = ctx ? setting(ctx.configDir, "KOBE_IMAGE_FIT", "contain") : "contain"

async function draw(): Promise<void> {
  const cols = Math.max(10, process.stdout.columns ?? 80)
  // One row of breathing space for the caption line below the image.
  const rows = Math.max(4, (process.stdout.rows ?? 24) - 2)
  const rendered = await terminalImage.file(file as string, {
    width: cols,
    // `width` alone lets a tall image run past the pane and scroll; the
    // height cap is what makes it a PREVIEW rather than a wall of pixels.
    ...(fit === "contain" ? { height: rows } : {}),
    preserveAspectRatio: true,
  })
  process.stdout.write(`\x1b[2J\x1b[H${rendered}`)
  process.stdout.write(`\x1b[0m\x1b[2m${file}  ·  q to close\x1b[0m\n`)
}

await draw().catch((err: unknown) => fail(`kobe.image: ${err instanceof Error ? err.message : String(err)}`))

// Redraw on pane resize (splitting the tab changes the cell budget).
let pending: ReturnType<typeof setTimeout> | null = null
process.stdout.on("resize", () => {
  if (pending) clearTimeout(pending)
  pending = setTimeout(() => void draw().catch(() => {}), 80)
})

// Keep the pane alive until the user closes it; q / ctrl+c exit.
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.on("data", (data: Buffer) => {
    const s = data.toString()
    if (s === "q" || s === "\x03" || s === "\x1b") {
      process.stdout.write("\x1b[0m\x1b[2J\x1b[H")
      process.exit(0)
    }
  })
}
