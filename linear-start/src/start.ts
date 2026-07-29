// kobe.linear-start — start a kobe task from a Linear issue.
//
//   kobe plugin action invoke kobe.linear-start.start [ISSUE-ID]
//
// With an id (e.g. KOB-12) it goes straight to `kobe api add`; without one it
// lists your open assigned issues and picks via fzf (numbered prompt when fzf
// is missing — action invokes inherit the terminal, so pickers just work).
// Config: LINEAR_API_KEY=lin_api_… in "$KOBE_PLUGIN_CONFIG_DIR/.env".

import { spawnSync } from "node:child_process"
import readline from "node:readline"
import { kobe, setting } from "@sma1lboy/kobe-plugin-sdk"

interface Issue {
  identifier: string
  title: string
  description?: string | null
  branchName: string
  url: string
}

function apiKey(): string {
  if (process.env.LINEAR_API_KEY) return process.env.LINEAR_API_KEY
  const fromConfig = setting(process.env.KOBE_PLUGIN_CONFIG_DIR ?? "", "LINEAR_API_KEY").trim()
  if (fromConfig) return fromConfig
  console.error('missing LINEAR_API_KEY — put it in "$(kobe plugin config-dir kobe.linear-start)/.env"')
  process.exit(1)
}

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: apiKey() },
    body: JSON.stringify({ query, variables }),
  })
  const body = (await res.json()) as { data: T; errors?: { message: string }[] }
  if (body.errors) {
    console.error("Linear API error:", body.errors[0]?.message)
    process.exit(1)
  }
  return body.data
}

const ISSUE_FIELDS = "identifier title description branchName url"

async function pickIssue(): Promise<Issue | undefined> {
  const data = await gql<{ viewer: { assignedIssues: { nodes: Issue[] } } }>(
    `query { viewer { assignedIssues(
        filter: { state: { type: { nin: ["completed", "canceled"] } } }
        first: 50, orderBy: updatedAt
      ) { nodes { ${ISSUE_FIELDS} } } } }`,
  )
  const issues = data.viewer.assignedIssues.nodes
  if (issues.length === 0) {
    console.error("no open issues assigned to you")
    process.exit(1)
  }
  const lines = issues.map((i) => `${i.identifier}\t${i.title}`)
  const fzf = spawnSync("fzf", ["--with-nth=1,2", "--delimiter=\t", "--height=40%", "--reverse"], {
    input: lines.join("\n"),
    stdio: ["pipe", "pipe", "inherit"],
    encoding: "utf8",
  })
  if (fzf.status === 0 && fzf.stdout) {
    const id = fzf.stdout.split("\t")[0]?.trim()
    return issues.find((i) => i.identifier === id)
  }
  if ((fzf.error as NodeJS.ErrnoException | undefined)?.code !== "ENOENT") process.exit(1) // fzf present but user cancelled
  lines.forEach((l, n) => console.log(`${n + 1}. ${l}`))
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise<string>((resolve) => rl.question("issue #: ", resolve))
  rl.close()
  const issue = issues[Number.parseInt(answer, 10) - 1]
  if (!issue) process.exit(1)
  return issue
}

async function main(): Promise<void> {
  const arg = process.argv[2]
  const issue = arg
    ? (await gql<{ issue: Issue | null }>(`query($id: String!) { issue(id: $id) { ${ISSUE_FIELDS} } }`, { id: arg }))
        .issue
    : await pickIssue()
  if (!issue) {
    console.error(`no such issue: ${arg}`)
    process.exit(1)
  }
  const repoDir = process.env.KOBE_PLUGIN_INVOKE_CWD || process.cwd()
  const prompt = `Work on ${issue.identifier}: ${issue.url}\n\n# ${issue.title}\n\n${issue.description || ""}`
  const res = await kobe(
    [
      "api", "add",
      "--repo", repoDir,
      "--title", `[${issue.identifier}] ${issue.title}`,
      "--branch", issue.branchName,
      "--prompt", prompt,
    ],
    { binPath: process.env.KOBE_BIN_PATH || "kobe", timeoutMs: 0 }, // no timeout — same as the spawnSync it replaces
  )
  if (res.stdout) process.stdout.write(res.stdout)
  if (res.stderr) process.stderr.write(res.stderr)
  process.exit(res.code)
}

main()
