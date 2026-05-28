<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

### Quick reference

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (http://localhost:3000) |
| Lint | `npx eslint .` |
| Build (includes migrations) | `npm run build` |
| Migrations only | `npm run migrate` |

See `CLAUDE.md` and `docs/README.md` for full docs, env var list, and architecture.

### Environment variables

The app requires Supabase credentials in `.env.local`. To populate them, authenticate the Vercel CLI and pull:

```bash
npx vercel link          # link to the hangout-friends project
npx vercel env pull      # writes .env.local
```

This requires a `VERCEL_TOKEN` secret (or interactive login). Without Supabase vars, the dev server starts and UI renders, but all database-backed features (plan creation, responses, pods) will throw runtime errors.

### Caveats

- **Pre-existing lint errors:** The repo has ~86 pre-existing `@typescript-eslint/no-explicit-any` lint errors. `npx eslint .` exits with code 1; this is expected and not caused by new changes.
- **Migrations skip gracefully:** `npm run build` runs migrations before building. Without `SUPABASE_ACCESS_TOKEN` or `SUPABASE_DB_URL`, the migration script prints a warning and exits 0 — the build itself still succeeds.
- **Supabase clients are lazily initialized:** `lib/supabase.ts` only throws when a DB call is actually made, not at import time. Pages that don't touch the DB will render fine without credentials.
- **No Docker or local DB:** All data lives in a remote Supabase-hosted Postgres instance. There is no local database option.
