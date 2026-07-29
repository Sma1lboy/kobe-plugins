// examples.notify — desktop + optional ntfy notification for kobe agent events.
// The `test` action invokes this with argv "test"; events set KOBE_PLUGIN_EVENT.

import { execFileSync } from "node:child_process"
import { pluginContext, pluginEvent, setting } from "@sma1lboy/kobe-plugin-sdk"

const ctx = pluginContext()
const event = process.argv[2] || pluginEvent()?.event || ctx.event || ""
const task = ctx.taskTitle || "a task"

const bodies: Record<string, string> = {
  "agent.turn-complete": `${task}: agent finished its turn`,
  "agent.permission-needed": `${task}: agent is waiting on a permission prompt`,
  "agent.rate-limited": `${task}: agent hit a rate limit`,
  "agent.error": `${task}: agent errored`,
}
const body = bodies[event] ?? "Test notification from examples.notify"

if (process.platform === "darwin") {
  // ponytail: naive quote-stripping instead of full AppleScript escaping
  const safe = body.replace(/["\\]/g, "")
  try {
    execFileSync("osascript", ["-e", `display notification "${safe}" with title "kobe"`], { stdio: "ignore" })
  } catch {}
} else {
  try {
    execFileSync("notify-send", ["kobe", body], { stdio: "ignore" })
  } catch {} // notify-send missing or failed — best-effort
}

// Optional push: NTFY_URL=https://ntfy.sh/<your-topic> in "$KOBE_PLUGIN_CONFIG_DIR/.env"
const ntfyUrl = setting(ctx.configDir, "NTFY_URL")
if (ntfyUrl) {
  try {
    await fetch(ntfyUrl, { method: "POST", body, signal: AbortSignal.timeout(5000) })
  } catch {} // push is best-effort, like the curl it replaces
}
