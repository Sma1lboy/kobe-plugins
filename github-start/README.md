# kobe.github-start

Turn a GitHub issue or PR into a running kobe task in one command: fetches the
title/body with `gh`, then `kobe api add` creates the task, worktree, and
engine session with the issue as the first prompt.

```bash
kobe plugin install Sma1lboy/kobe-plugins/github-start
cd ~/your/repo
kobe plugin action invoke kobe.github-start.start https://github.com/owner/repo/issues/123
```

Requires `node` and an authenticated `gh` CLI.

Written in TypeScript on [`@sma1lboy/kobe-plugin-sdk`](https://www.npmjs.com/package/@sma1lboy/kobe-plugin-sdk);
the install-time build steps compile `src/start.ts` to `dist/start.js`.
