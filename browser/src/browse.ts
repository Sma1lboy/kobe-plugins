#!/usr/bin/env node
// kobe.browser — carbonyl (Chromium as terminal cells) in a kobe pane.
//
// URL choice goes through the HOST'S input dialog (`kobe api prompt` via the
// SDK's promptUser) so every plugin gets the same input UX; when no TUI can
// answer (cancelled, timeout, kobe too old) it falls back to an in-pane
// readline prompt. The `open` action pre-sets the URL and skips the prompt
// via a one-shot marker.

import { spawn } from "node:child_process"
import { accessSync, constants, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { createInterface } from "node:readline/promises"
import { join } from "node:path"
import { pluginContext, promptUser, setting } from "@sma1lboy/kobe-plugin-sdk"

const ENV = { ...process.env, PATH: `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin` }

const ctx = pluginContext()
const homeUrl = setting(ctx.configDir, "BROWSER_HOME", "https://example.com")

const stateUrl = join(ctx.stateDir, "url")
const skipMarker = join(ctx.stateDir, "skip-prompt")

function readOr(path: string, fallback: string): string {
  try {
    return readFileSync(path, "utf8").trim() || fallback
  } catch {
    return fallback
  }
}

function normalize(url: string): string {
  return /^https?:\/\//.test(url) ? url : `https://${url}`
}

/** In-pane fallback when the host dialog can't answer. */
async function paneQuestion(fallback: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const input = (await rl.question(`url [${fallback}]: `)).trim()
  rl.close()
  return input || fallback
}

const fallback = readOr(stateUrl, homeUrl)
let url: string
if (
  (() => {
    try {
      accessSync(skipMarker, constants.F_OK)
      rmSync(skipMarker, { force: true })
      return true
    } catch {
      return false
    }
  })()
) {
  url = fallback
} else {
  url = (await promptUser("Browser — open URL", { initial: fallback })) ?? (await paneQuestion(fallback))
}
url = normalize(url)
mkdirSync(ctx.stateDir, { recursive: true })
writeFileSync(stateUrl, url)

// carbonyl lives inside the plugin's own directory ([[build]] npm install);
// PATH and a late self-provision are fallbacks.
const localBin = join(ctx.pluginRoot, "node_modules", ".bin", "carbonyl")
function runCarbonyl(bin: string): void {
  const child = spawn(bin, [url], { stdio: "inherit", env: ENV })
  child.on("error", () => {
    console.error("failed to launch carbonyl")
    process.exit(1)
  })
  child.on("close", (code) => process.exit(code ?? 0))
}

try {
  accessSync(localBin, constants.X_OK)
  runCarbonyl(localBin)
} catch {
  console.log("carbonyl not provisioned — installing into the plugin directory…")
  const npm = spawn("npm", ["install", "--no-audit", "--no-fund"], { cwd: ctx.pluginRoot, stdio: "inherit", env: ENV })
  npm.on("close", (code) => {
    if (code === 0) runCarbonyl(localBin)
    else {
      console.error("kobe.browser needs carbonyl (https://github.com/fathyb/carbonyl) and npm to provision it")
      process.exit(1)
    }
  })
}
