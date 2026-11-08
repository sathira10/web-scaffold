# Deploying

Hosting is Firebase Hosting ([quickstart](https://firebase.google.com/docs/hosting/quickstart)).
`pnpm build` writes `dist/` and `firebase.json` serves it with clean URLs and the security
headers ([firebase.json reference](https://firebase.google.com/docs/hosting/full-config)).

## First deploy

1. Install the CLI once: `npm install -g firebase-tools` (it is a global tool, so it stays out
   of this project's lockfile).
2. `firebase login`.
3. Create the project in the Firebase console, or with `firebase projects:create __SLUG__`, and
   check the id in `.firebaserc` matches.
4. `pnpm deploy`.

## Previews

`pnpm deploy:preview` deploys to a temporary preview channel and prints its URL
([preview channels](https://firebase.google.com/docs/hosting/test-preview-deploy)).

## Deploys from GitHub

`firebase init hosting:github` adds GitHub Actions that deploy `main` and preview each pull
request ([GitHub integration](https://firebase.google.com/docs/hosting/github-integration)).
Keep the build command as `pnpm install --frozen-lockfile && pnpm build`.

## Headers

Headers live in `firebase.json`. After a deploy, load the site with the browser console open
and check there are no CSP violations.

## Rollback

In the console, Hosting, release history, roll back to an earlier release.
