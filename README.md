# kobe-plugins

Official plugins for [kobe](https://github.com/Sma1lboy/kobe) — the
terminal-native multiplexer for AI coding agents. Each subdirectory is one
plugin (a `kobe-plugin.toml` manifest + the commands it runs); install any of
them straight from this repo:

```bash
kobe plugin install Sma1lboy/kobe-plugins/notify            # desktop/ntfy notifications on agent events
kobe plugin install Sma1lboy/kobe-plugins/github-start      # start a task from a GitHub issue/PR
kobe plugin install Sma1lboy/kobe-plugins/worktree-include  # copy .env-style files into new worktrees
kobe plugin install Sma1lboy/kobe-plugins/linear-start      # start a task from a Linear issue (fzf picker)
kobe plugin install Sma1lboy/kobe-plugins/lazygit           # lazygit split beside the engine
kobe plugin install Sma1lboy/kobe-plugins/browser           # Chromium in a split pane (carbonyl, self-provisioned)
kobe plugin install Sma1lboy/kobe-plugins/video             # play any video as ANSI/ASCII characters in a tab
```

Docs: [plugin authoring & manifest reference](https://github.com/Sma1lboy/kobe/blob/main/docs/design/plugins.md)
· [lifecycle events](https://github.com/Sma1lboy/kobe/blob/main/docs/design/plugin-events.md)
· browse the marketplace at [kobe.sma1lboy.me/plugins](https://kobe.sma1lboy.me/plugins) or `kobe plugin search`.

Fork one, change the `id`, publish your own public repo with the GitHub topic
`kobe-plugin`, and it appears in the marketplace automatically.

Authoring loop:

```bash
kobe plugin link ./my-plugin        # register your working directory
kobe plugin action list             # see what registered
kobe plugin log <id>                # inspect hook runs
```
