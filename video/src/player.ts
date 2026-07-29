#!/usr/bin/env node
// examples.video — play any video as terminal characters, right in a kobe tab.
//
// ffmpeg decodes to a raw RGB pipe; this script folds every frame into ANSI
// truecolor cells. Two looks:
//   half  (default)  half-block ▀ cells — reads like actual (chunky) video
//   ascii            luminance-ramp ASCII chars with truecolor — the toy look
//
// Controls: space pause/resume (SIGSTOP/SIGCONT on ffmpeg) · ←/→ ±5s ·
// 0-9 jump to N×10% · click/drag the progress bar (SGR mouse) · q quit.
// Seeking restarts ffmpeg with -ss; position = seek base + consumed frames.
//
// Usage: node dist/player.js <file-or-url>
//        (no arg → the remembered `open` source, else the built-in demo)
// Settings (Settings → Plugins, stored in the config .env):
//   KOBE_VIDEO_MODE=ascii|half  KOBE_VIDEO_FPS  KOBE_VIDEO_LOOP=1

import { type ChildProcess, execFileSync, spawn } from "node:child_process"
import { readFileSync, readSync } from "node:fs"
import { join } from "node:path"
import { pluginContext, readSettings } from "@sma1lboy/kobe-plugin-sdk"

// Panes spawn under a login shell, but ffmpeg/ffprobe may still live in a
// Homebrew prefix the non-interactive PATH misses.
const ENV = { ...process.env, PATH: `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin` }

/** Print a failure, hold the pane open until enter (it self-closes otherwise). */
function failHolding(message: string): never {
  process.stdout.write(`\x1b[0m\x1b[?25h${message}\npress enter to close\n`)
  try {
    const buf = Buffer.alloc(1)
    // Blocking read on stdin keeps the tab visible until the user reacts.
    readSync(0, buf, 0, 1, null)
  } catch {
    /* non-tty */
  }
  process.exit(1)
}

const ctx = (() => {
  try {
    return pluginContext()
  } catch {
    return null // plain `node player.js x.mp4` outside kobe still works
  }
})()
const settings = ctx ? readSettings(ctx.configDir) : {}

const src =
  process.argv[2] ??
  (() => {
    if (!ctx) return undefined
    try {
      return readFileSync(join(ctx.stateDir, "source"), "utf8").trim() || undefined
    } catch {
      return undefined
    }
  })()

const mode = (settings.KOBE_VIDEO_MODE ?? process.env.KOBE_VIDEO_MODE) === "ascii" ? "ascii" : "half"
const fps = Math.max(1, Math.min(30, Number(settings.KOBE_VIDEO_FPS ?? process.env.KOBE_VIDEO_FPS) || 15))
const loop = (settings.KOBE_VIDEO_LOOP ?? process.env.KOBE_VIDEO_LOOP) === "1"

try {
  execFileSync("ffmpeg", ["-version"], { stdio: "ignore", env: ENV })
} catch {
  failHolding("examples.video needs ffmpeg on PATH (brew install ffmpeg)")
}

const cols = Math.max(20, process.stdout.columns || 80)
const rows = Math.max(10, (process.stdout.rows || 24) - 2) // -1 shell line, -1 HUD
const hudRow = rows + 1
const W = cols - 1
const H = mode === "half" ? rows * 2 : rows
// 70-level classic ramp — 7× the tonal resolution of a 10-char one.
const RAMP = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"

// Duration (seconds) for the progress bar + seek clamping; null = unseekable
// (demo source / live streams / ffprobe missing).
let duration: number | null = null
let srcAR = 16 / 9 // display aspect of the source; demo testsrc2 is 16:9
if (src) {
  try {
    const out = execFileSync(
      "ffprobe",
      ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "csv=p=0", src],
      { encoding: "utf8", env: ENV },
    ).trim()
    for (const line of out.split("\n")) {
      const parts = line.split(",").map(Number)
      if (parts.length >= 2 && (parts[0] as number) > 0 && (parts[1] as number) > 0)
        srcAR = (parts[0] as number) / (parts[1] as number)
      else if (parts.length === 1 && Number.isFinite(parts[0]) && (parts[0] as number) > 0)
        duration = parts[0] as number
    }
  } catch {
    /* no ffprobe → stretch-to-fit + pause-only controls */
  }
}

// Aspect-correct fit: a terminal cell is ~1:2 (w:h). In half mode a cell is
// two stacked pixels (≈square); in ascii one cell = one pixel (2× tall).
// Fit the source into the W×H grid, centered — never stretch.
const pixAR = mode === "half" ? 1 : 2 // how tall one grid pixel LOOKS vs wide
const fitW = Math.min(W, Math.round((H * srcAR) / pixAR / 2) * 2)
const fitH = Math.min(H, Math.round((W * pixAR) / srcAR / 2) * 2)
const drawW = Math.min(W, Math.max(2, fitW))
const drawH = Math.min(H, Math.max(2, fitH))

let ff: ChildProcess | null = null
let base = 0 // seek offset the current ffmpeg started at
let consumed = 0 // complete frames consumed since the current spawn
let paused = false
let quitting = false
let pending: Buffer[] = []
let pendingBytes = 0
const frameSize = W * H * 3

function position(): number {
  const raw = base + consumed / fps
  // -stream_loop keeps the frame counter climbing forever — wrap the
  // DISPLAYED position back to the start of each pass.
  return loop && duration ? raw % duration : raw
}

function ffmpegArgs(startAt: number): string[] {
  // -stream_loop and -ss are INPUT options — they must precede -i.
  const input = src
    ? [...(loop ? ["-stream_loop", "-1"] : []), ...(startAt > 0 ? ["-ss", String(startAt)] : []), "-re", "-i", src]
    : ["-re", "-f", "lavfi", "-i", `testsrc2=size=640x360:rate=${fps}`]
  const vf = `fps=${fps},scale=${drawW}:${drawH},pad=${W}:${H}:${Math.floor((W - drawW) / 2)}:${Math.floor((H - drawH) / 2)}:black`
  return [...input, "-f", "rawvideo", "-pix_fmt", "rgb24", "-vf", vf, "-loglevel", "error", "pipe:1"]
}

function renderHalf(frame: Buffer): string {
  const out: string[] = []
  for (let y = 0; y + 1 < H; y += 2) {
    // Absolute row addressing — newline-free, so a cols mismatch can never
    // wrap a line into a phantom blank row (the "zebra stripes" failure).
    out.push(`\x1b[${y / 2 + 1};1H`)
    let last = ""
    for (let x = 0; x < W; x++) {
      const t = (y * W + x) * 3
      const b = ((y + 1) * W + x) * 3
      const key = `\x1b[38;2;${frame[t]};${frame[t + 1]};${frame[t + 2]}m\x1b[48;2;${frame[b]};${frame[b + 1]};${frame[b + 2]}m`
      out.push(key === last ? "▀" : key + "▀")
      last = key
    }
    out.push("\x1b[0m")
  }
  return out.join("")
}

function renderAscii(frame: Buffer): string {
  const out: string[] = []
  for (let y = 0; y < H; y++) {
    out.push(`\x1b[${y + 1};1H`)
    let last = ""
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3
      const r = frame[i] as number
      const g = frame[i + 1] as number
      const b = frame[i + 2] as number
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
      const ch = RAMP[Math.min(RAMP.length - 1, Math.floor(lum * RAMP.length))]
      const key = `\x1b[38;2;${r};${g};${b}m`
      out.push(key === last ? (ch as string) : key + ch)
      last = key
    }
    out.push("\x1b[0m")
  }
  return out.join("")
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
}

function renderHud(): string {
  const icon = paused ? "⏸" : "▶"
  const time = duration ? `${fmtTime(position())}/${fmtTime(duration)}` : fmtTime(position())
  const hint = duration ? "space ←→ 0-9 q" : "space q"
  const fixed = ` ${icon} ${time}  `
  const barWidth = Math.max(4, W - fixed.length - hint.length - 3)
  let bar = ""
  if (duration) {
    const frac = Math.max(0, Math.min(1, position() / duration))
    const dot = Math.min(barWidth - 1, Math.round(frac * (barWidth - 1)))
    bar = `${"─".repeat(dot)}●${"─".repeat(barWidth - 1 - dot)}`
  } else {
    bar = "─".repeat(barWidth)
  }
  return `\x1b[${hudRow};1H\x1b[0m\x1b[2m${fixed}\x1b[0m${bar}\x1b[2m  ${hint}\x1b[0m\x1b[K`
}

// Progress-bar geometry for mouse hits — must match renderHud.
function barSpan(): { start: number; width: number } {
  const icon = paused ? "⏸" : "▶"
  const time = duration ? `${fmtTime(position())}/${fmtTime(duration)}` : fmtTime(position())
  const hint = duration ? "space ←→ 0-9 q" : "space q"
  const start = ` ${icon} ${time}  `.length + 1
  const width = Math.max(4, W - (start - 1) - hint.length - 3)
  return { start, width }
}

function startFF(startAt: number): void {
  base = startAt
  consumed = 0
  pending = []
  pendingBytes = 0
  ff = spawn("ffmpeg", ffmpegArgs(startAt), { stdio: ["ignore", "pipe", "inherit"], env: ENV })
  const proc = ff
  ff.on("error", () => {
    process.stdout.write("\x1b[?25h")
    console.error("examples.video needs ffmpeg on PATH (brew install ffmpeg)")
    process.exit(1)
  })
  ff.stdout?.on("data", (chunk: Buffer) => {
    pending.push(chunk)
    pendingBytes += chunk.length
    if (pendingBytes < frameSize) return
    const all = Buffer.concat(pending)
    let off = 0
    // Render only the LAST complete frame in the buffer — if the terminal
    // can't keep up, we drop frames instead of drifting behind ffmpeg's -re.
    let frame: Buffer | null = null
    while (all.length - off >= frameSize) {
      frame = all.subarray(off, off + frameSize)
      off += frameSize
      consumed++
    }
    pending = off < all.length ? [all.subarray(off)] : []
    pendingBytes = all.length - off
    if (frame && !paused) {
      process.stdout.write((mode === "half" ? renderHalf(frame) : renderAscii(frame)) + renderHud())
    }
  })
  ff.on("close", (code) => {
    // A seek supersedes this process with a fresh one — its exit is not "the end".
    if (quitting || proc !== ff) return
    process.stdout.write("\x1b[0m\x1b[?25h\n")
    if (code !== 0 && code !== null) process.exit(code)
    console.log(src ? "playback finished — press enter to close (←/0 to replay)" : "demo finished")
  })
}

function seekTo(pos: number): void {
  if (!duration) return
  const clamped = Math.max(0, Math.min(duration - 0.5, pos))
  try {
    ff?.kill("SIGKILL")
  } catch {}
  paused = false
  startFF(clamped)
  process.stdout.write(renderHud())
}

function togglePause(): void {
  if (!ff || ff.exitCode !== null) return
  paused = !paused
  try {
    ff.kill(paused ? "SIGSTOP" : "SIGCONT")
  } catch {
    /* process gone */
  }
  process.stdout.write(renderHud())
}

function cleanup(code: number): never {
  quitting = true
  try {
    ff?.kill("SIGKILL")
  } catch {}
  process.stdout.write("\x1b[0m\x1b[?25h\x1b[?1002l\x1b[?1006l\x1b[2J\x1b[H")
  process.exit(code)
}

// ---- input: keys + SGR mouse (click/drag the progress bar) ----
function handleMouse(seq: string): void {
  // \x1b[<b;x;yM (press/drag) — seek when it lands on the HUD's bar row.
  const m = seq.match(/^\x1b\[<(\d+);(\d+);(\d+)([Mm])$/)
  if (!m || !duration) return
  const [, btn, xs, ys, kind] = m
  const button = Number(btn)
  const x = Number(xs)
  const y = Number(ys)
  const isPressOrDrag = kind === "M" && (button === 0 || button === 32)
  if (!isPressOrDrag || y !== hudRow) return
  const { start, width } = barSpan()
  const frac = Math.max(0, Math.min(1, (x - start) / width))
  seekTo(frac * duration)
}

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.on("data", (data: Buffer) => {
    const s = data.toString()
    if (s.startsWith("\x1b[<")) return handleMouse(s)
    for (const ch of s) {
      if (ch === "q" || ch === "\x03") cleanup(0)
      else if (ch === " ") togglePause()
      else if (ch >= "0" && ch <= "9" && duration) seekTo((Number(ch) / 10) * duration)
    }
    if (s === "\x1b[C" && duration) seekTo(position() + 5) // →
    if (s === "\x1b[D" && duration) seekTo(position() - 5) // ←
  })
}

process.stdout.write("\x1b[?25l\x1b[2J\x1b[?1006h\x1b[?1002h")
process.on("SIGINT", () => cleanup(0))
process.on("SIGTERM", () => cleanup(0))
startFF(0)
