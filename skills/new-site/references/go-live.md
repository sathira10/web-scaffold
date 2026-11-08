# Take a demo live

```sh
node "$SCAFFOLD/create.mjs" go-live --dir <project> \
  --url https://<real domain> --email <real address> \
  [--hosting cf-git] [--with analytics,check-site]
```

This removes the demo banner and its scripts, the noindex and robots.txt block and the
X-Robots-Tag header, and turns the sitemap back on. `--hosting cf-git` swaps manual Cloudflare
deploys for Workers Builds. Then:

1. Replace sample pictures and stand-in text. Every `Placeholder` and `sample: true` picture
   must go.
2. Add `check-site` if it isn't installed; it fails on starter text left in.
3. Run `pnpm check`, then follow `DEPLOYING.md`.
