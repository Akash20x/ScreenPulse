<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project layout

- The root is the Next.js web application deployed to Vercel. Keep `.env.local` local; only update `.env.example` with placeholder values and never commit secrets.
- `extension/` is the runnable WXT Chrome extension workspace. Run its package scripts from that directory.
- Top-level `entrypoints/`, `wxt.config.ts`, and the extension-oriented files directly under `src/` currently mirror their counterparts under `extension/`. When an extension change is unavoidable, keep both copies byte-for-byte synchronized, or remove the legacy mirrors in a dedicated, reviewed change.
- Do not edit `.next/`, `.output/`, `.vercel/`, `.wxt/`, `node_modules/`, or `*.tsbuildinfo`; they are generated or machine-local files.
