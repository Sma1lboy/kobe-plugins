// kobe.github-start — create a kobe task from a GitHub issue or PR.
//
//   kobe plugin action invoke kobe.github-start.start <issue-or-pr-url>
//
// Fetches title/body via the `gh` CLI, then calls back into kobe
// (`kobe api add --prompt …`) which creates the task, materializes the
// worktree, starts the engine, and delivers the prompt. The repo is the one
// you invoked the action from (KOBE_PLUGIN_INVOKE_CWD).

import { execFileSync } from "node:child_process"
import { kobe } from "@sma1lboy/kobe-plugin-sdk"

const url = process.argv[2]
const match = url?.match(/github\.com\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d+)/)
if (!match) {
  console.error("usage: kobe plugin action invoke kobe.github-start.start <github issue/pr url>")
  process.exit(2)
}
const [, owner, repo, kind, number] = match
const ghKind = kind === "pull" ? "pr" : "issue"

let item: { title: string; body?: string; url: string }
try {
  item = JSON.parse(
    execFileSync("gh", [ghKind, "view", number!, "--repo", `${owner}/${repo}`, "--json", "title,body,url"], {
      encoding: "utf8",
    }),
  )
} catch {
  console.error("`gh` failed — is the GitHub CLI installed and authenticated?")
  process.exit(1)
}

const repoDir = process.env.KOBE_PLUGIN_INVOKE_CWD || process.cwd()
const prompt = `Work on ${item.url}\n\n# ${item.title}\n\n${item.body || ""}`
const res = await kobe(["api", "add", "--repo", repoDir, "--title", item.title, "--prompt", prompt], {
  binPath: process.env.KOBE_BIN_PATH || "kobe",
  timeoutMs: 0, // no timeout — same as the spawnSync it replaces
})
if (res.stdout) process.stdout.write(res.stdout)
if (res.stderr) process.stderr.write(res.stderr)
process.exit(res.code)
