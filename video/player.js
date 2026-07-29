#!/usr/bin/env node
// examples.video — play any video as terminal characters, right in a kobe tab.
//
// ffmpeg decodes to a raw RGB pipe; this script folds every frame into ANSI
// truecolor cells. Two looks:
//   half  (default)  half-block ▀ cells — reads like actual (chunky) video
//   ascii            luminance-ramp ASCII chars with truecolor — the toy look
//
// No video is ever "played": it's characters, repainted at ~15fps.
//
// Usage: node player.js <file-or-url>        (no arg → built-in demo source)
// Env:   KOBE_VIDEO_MODE=ascii|half  KOBE_VIDEO_FPS  KOBE_VIDEO_LOOP=1

const { spawn } = require("node:child_process")

const src = process.argv[2]
const mode = process.env.KOBE_VIDEO_MODE === "ascii" ? "ascii" : "half"
const fps = Math.max(1, Math.min(30, Number(process.env.KOBE_VIDEO_FPS) || 15))
const loop = process.env.KOBE_VIDEO_LOOP === "1"

const cols = Math.max(20, process.stdout.columns || 80)
const rows = Math.max(10, (process.stdout.rows || 24) - 1)
// half mode packs 2 pixels per cell vertically; ascii is 1 pixel per cell.
const W = cols - 1
const H = mode === "half" ? rows * 2 : rows
const RAMP = " .:-=+*#%@"

function ffmpegArgs() {
  const input = src
    ? ["-re", "-i", src, ...(loop ? ["-stream_loop", "-1"] : [])]
    : ["-re", "-f", "lavfi", "-i", `testsrc2=size=640x360:rate=${fps}`]
  return [
    ...input,
    "-f", "rawvideo",
    "-pix_fmt", "rgb24",
    "-vf", `fps=${fps},scale=${W}:${H}`,
    "-loglevel", "error",
    "pipe:1",
  ]
}

function renderHalf(frame) {
  const out = []
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

function renderAscii(frame) {
  const out = []
  for (let y = 0; y < H; y++) {
    out.push(`\x1b[${y + 1};1H`)
    let last = ""
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3
      const r = frame[i]
      const g = frame[i + 1]
      const b = frame[i + 2]
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
      const ch = RAMP[Math.min(RAMP.length - 1, Math.floor(lum * RAMP.length))]
      const key = `\x1b[38;2;${r};${g};${b}m`
      out.push(key === last ? ch : key + ch)
      last = key
    }
    out.push("\x1b[0m")
  }
  return out.join("")
}

function cleanup(code) {
  process.stdout.write("\x1b[0m\x1b[?25h\x1b[2J\x1b[H")
  process.exit(code)
}

const ff = spawn("ffmpeg", ffmpegArgs(), { stdio: ["ignore", "pipe", "inherit"] })
ff.on("error", () => {
  console.error("examples.video needs ffmpeg on PATH (brew install ffmpeg)")
  process.exit(1)
})

process.stdout.write("\x1b[?25l\x1b[2J")
process.on("SIGINT", () => cleanup(0))
process.on("SIGTERM", () => cleanup(0))

const frameSize = W * H * 3
let pending = []
let pendingBytes = 0
ff.stdout.on("data", (chunk) => {
  pending.push(chunk)
  pendingBytes += chunk.length
  if (pendingBytes < frameSize) return
  const all = Buffer.concat(pending)
  let off = 0
  // Render only the LAST complete frame in the buffer — if the terminal
  // can't keep up, we drop frames instead of drifting behind ffmpeg's -re.
  let frame = null
  while (all.length - off >= frameSize) {
    frame = all.subarray(off, off + frameSize)
    off += frameSize
  }
  pending = off < all.length ? [all.subarray(off)] : []
  pendingBytes = all.length - off
  if (frame) process.stdout.write(mode === "half" ? renderHalf(frame) : renderAscii(frame))
})
ff.on("close", (code) => {
  process.stdout.write("\x1b[0m\x1b[?25h\n")
  if (code !== 0 && code !== null) process.exit(code)
  console.log(src ? "playback finished — press enter to close" : "demo finished")
  process.stdin.resume()
  process.stdin.once("data", () => cleanup(0))
})
