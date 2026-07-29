// examples.worktree-include — when kobe creates a task worktree, copy files
// from the repo root that match patterns in the repo's `.worktreeinclude`
// (one pattern per line, `#` comments). Typical use: `.env`, `.env.local`,
// untracked config a fresh worktree needs to build.
//
// ponytail: naive glob (`**` → any path, `*` → one segment), no dep;
// swap in a real glob library if patterns outgrow this.

import fs from "node:fs"
import path from "node:path"
import { pluginEvent } from "@sma1lboy/kobe-plugin-sdk"

const event = pluginEvent()
const repo = event?.task?.repo
const worktree = event?.task?.worktreePath
if (!repo || !worktree || repo === worktree) process.exit(0)
// narrowed copies — TS doesn't carry the guard's narrowing into walk()'s closure
const repoRoot: string = repo
const worktreeRoot: string = worktree

let patterns: string[]
try {
  patterns = fs
    .readFileSync(path.join(repo, ".worktreeinclude"), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
} catch {
  process.exit(0) // repo doesn't opt in
}

const regexes = patterns.map(
  (p) =>
    new RegExp(
      `^${p
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, " ")
        .replace(/\*/g, "[^/]*")
        .replace(/ /g, ".*")}$`,
    ),
)

function walk(dir: string, rel = ""): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue
    const relPath = rel ? `${rel}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      walk(path.join(dir, entry.name), relPath)
    } else if (regexes.some((re) => re.test(relPath))) {
      const dest = path.join(worktreeRoot, relPath)
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.copyFileSync(path.join(dir, entry.name), dest)
      console.log(`copied ${relPath}`)
    }
  }
}

walk(repoRoot)
