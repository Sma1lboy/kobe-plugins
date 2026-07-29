# kobe.linear-start

Pick one of your open Linear issues (fzf if available, numbered prompt
otherwise) — or name one directly — and kobe starts a task on the issue's
Linear branch with the issue body as the first prompt.

```bash
kobe plugin install Sma1lboy/kobe-plugins/linear-start
echo 'LINEAR_API_KEY=lin_api_…' > "$(kobe plugin config-dir kobe.linear-start)/.env"

cd ~/your/repo
kobe plugin action invoke kobe.linear-start.start           # fzf picker
kobe plugin action invoke kobe.linear-start.start KOB-12    # direct
```

Requires `node`; `fzf` is optional. The API key comes from Linear →
Settings → Security & access → API.

Written in TypeScript on [`@sma1lboy/kobe-plugin-sdk`](https://www.npmjs.com/package/@sma1lboy/kobe-plugin-sdk);
the install-time build steps compile `src/start.ts` to `dist/start.js`.
