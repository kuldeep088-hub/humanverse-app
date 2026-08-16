# Humanverse

A professional network for the parts of working life that don't fit on a professional profile — posts, replies, reactions, circles, pseudonymous posting, and threads like #LaidOff and #RejectedAgain.

Built with Next.js (App Router), Supabase (auth + Postgres + storage), Tailwind CSS v4, and shadcn-style UI components.

## Local development

The app runs fully in mock mode (in-memory DB + localStorage) when no Supabase session exists — no backend needed to explore the UI:

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Connecting a real Supabase backend

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Apply the schema. Either:
   - Paste the contents of `supabase-schema.sql` into the Supabase dashboard → SQL Editor, or
   - `supabase db push` if you use the CLI with migrations.
4. Apply the RLS fix (`supabase/migrations/0001_rls_fix.sql`) and notification triggers (`supabase/migrations/0002_notification_triggers.sql`) in the SQL Editor — both are idempotent.
5. Create the `avatars` storage bucket (included at the bottom of `supabase-schema.sql`).
6. Configure auth redirect URLs in Supabase → Authentication → URL Configuration: add `http://localhost:3000/auth/callback` and your production URL.
7. Restart `npm run dev` and sign up at `/signup`.

### Seed demo data (optional)

Set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`, then:

```bash
npm run db:seed
```

This creates 4 demo users (password: `humanverse-demo`) plus threads, posts, replies, and reactions.

## Scripts

| Command          | Description                          |
| ---------------- | ------------------------------------ |
| `npm run dev`    | Start the dev server                 |
| `npm run build`  | Production build                     |
| `npm run lint`   | Run ESLint                           |
| `npm run db:seed`| Seed a real Supabase project         |

## How the mock mode works

`src/lib/mock-data.ts` is a dependency-free in-memory implementation of the Supabase query API (select/insert/upsert/update/delete with filters, relations, and aggregates). `src/lib/supabase/client.ts` picks it automatically when Supabase env vars are missing or no session cookie exists, so the whole app works without a backend. The seed in mock mode mirrors `supabase/seed.mjs`.

## Project structure

- `src/app/app/*` — authenticated pages (feed, threads, circles, search, profile, settings, notifications, onboarding)
- `src/app/login`, `src/app/signup` — auth pages
- `src/components/app/*` — feed post, composer, nav
- `src/lib/supabase/*` — browser/server client wrappers
- `supabase/` — schema, migrations, seed script