## What
Fix `finn web` so it resolves the Next.js app directory correctly when `finnisher` is installed globally via `npm install -g`, not just in a dev checkout.

## Why
Currently `src/cli/commands/web.ts` computes the web directory as `path.resolve(__dirname, '../../src/web')`. After `npm run build`, `__dirname` is `dist/cli/commands/` — making the resolved path `<project-root>/src/web`, which works in a dev checkout. After a global install the `src/` directory is not present alongside `dist/`, so `finn web` silently fails to find the Next.js app.

## How
Add `"src/web"` to `package.json#files` so it ships inside the npm package, then resolve the web dir as `path.resolve(__dirname, '../../../src/web')` from the installed package root. Alternatively, pre-build the Next.js app and ship only `src/web/.next` + a production Next.js start command.
