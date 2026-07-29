# kobe.lazygit

The smallest possible pane plugin: no code at all, just a manifest that
opens [lazygit](https://github.com/jesseduffield/lazygit) on the task's
worktree inside the running TUI.

Two ways in, because a full-screen git TUI wants room but a quick stage
doesn't warrant losing sight of the chat:

```bash
kobe plugin install Sma1lboy/kobe-plugins/lazygit

kobe plugin pane open kobe.lazygit.git     # its own tab (default)
kobe plugin pane open kobe.lazygit.split   # split beside the engine
```

Both appear in the ctrl+e picker. Bind whichever you reach for in
`~/.kobe/settings/keybindings.yaml`:

```yaml
plugins:
  ctrl+g: pane:kobe.lazygit.git
```

The pane closes itself when lazygit exits. Requires `lazygit` on PATH.
