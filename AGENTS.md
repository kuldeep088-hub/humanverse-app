<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Directives & Automation Rules

## 1. Automatic Production Deployment
- The system has active Vercel CLI authentication and GitHub repository access.
- Whenever code changes, feature additions, or bug fixes are requested and implemented:
  1. Validate with `npm run build` and `npm run lint`.
  2. Commit and push changes to GitHub (`git push origin main`).
  3. Automatically deploy the updated production build to Vercel via `vercel --prod --yes`.
  4. Provide the live production deployment link in the response.
