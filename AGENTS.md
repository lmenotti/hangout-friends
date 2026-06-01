<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Performance (read before coding)

**Speed is a core product requirement**, not optional polish. Before changes to `/p/[slug]`, poll APIs, root layout, or the availability grid, read **`docs/PERFORMANCE.md`** — sacred-path checklist, anti-patterns, and optimization workflow. Do not introduce global scripts, client-side data waterfalls, or unindexed hot-path queries on the anonymous plan link flow.

See `CLAUDE.md` for the full doc read order.

## Cursor Cloud specific instructions

### Quick reference

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (http://localhost:3000) |
| Lint | `npx eslint .` |
| Build (includes migrations) | `npm run build` |
| Migrations only | `npm run migrate` |

See `CLAUDE.md` and `docs/README.md` for full docs, env var list, and architecture. Agent tasks and Wave 4 prompts: `docs/AGENT_WORK.md`. Historical docs: `docs/archive/` only.

### MCP integrations (Cursor + Zed)

Project-scoped MCP config lives in `.cursor/mcp.json` and `.zed/settings.json` (same servers, different schema). Use hosted OAuth URLs so both IDEs share one definition per service:

| Server | Type | Notes |
|--------|------|-------|
| `linear-hangout` | `https://mcp.linear.app/mcp` | Authorize the Hangout Linear workspace once per IDE |
| `vercel` | `https://mcp.vercel.com` | Account scope; repo is pinned via `.vercel/` (`hangout-friends` on `lmenottis-projects`) |
| `supabase-hangout` | stdio `@supabase/mcp-server-supabase` | `--read-only`, project `guzwglkxoyunnsraddhu`; needs `SUPABASE_PAT` |

**Do not** enable Cursor marketplace plugin integrations for Linear/Vercel/Supabase in this repo (`.cursor/settings.json` keeps them off) — they duplicate the entries above and are invisible to Zed.

#### One workspace path (avoid duplicate MCP projects in Cursor)

Always open this repo as **`C:\Users\lmm\projects\hangout-friends`** (lowercase `projects`). Do not use `Projects\` (capital P). Windows treats them as the same folder, but Cursor registers separate workspaces and duplicates MCP entries.

If duplicates remain: close all Cursor windows, clear **File → Open Recent** entries with the wrong path, reopen only via the lowercase path, then reload.

#### Vercel MCP in Zed (OAuth issuer mismatch)

Cursor OAuth works at `https://mcp.vercel.com`. Zed fails with “issuer mismatch” because Vercel’s OAuth metadata reports issuer `https://vercel.com` while discovery starts at `mcp.vercel.com` — a known strict-client vs Vercel-metadata mismatch, not a config typo.

**Zed workaround:** Bearer token (no OAuth). Set Windows User env **`VERCEL_MCP_TOKEN`** and add the same token under `context_servers.vercel` in **`%APPDATA%\Zed\settings.json`** (user settings only — not committed). Zed does not reliably expand `${VERCEL_MCP_TOKEN}` in project headers. **Cursor** keeps URL-only OAuth in `.cursor/mcp.json`.

#### Browser OAuth (Linear + Vercel)

OAuth is per IDE and per server name — do this after opening **this repo** as the workspace root.

**Cursor**

1. Reload the window (`Ctrl+Shift+P` → **Developer: Reload Window**) so `.cursor/mcp.json` is picked up.
2. Open **Cursor Settings** → **MCP** (or the **MCP** list in the Agent/chat tools panel).
3. For each server that shows **Needs login** / **Connect** / a warning icon:
   - `linear-hangout` → **Connect** → browser → sign in to Linear → choose the **Hangout** workspace.
   - `vercel` → **Connect** → browser → sign in to Vercel → allow access.
4. `supabase-hangout` does **not** use browser OAuth; it needs `SUPABASE_PAT` in the environment (below). Status should turn green once the PAT is set and the server restarts.
5. If old servers appear (`user-linear-hangout`, plugin Linear/Vercel/Supabase), **disable or remove** them in the same MCP list so they do not duplicate the project entries.

**Zed**

1. Open this folder in Zed; project `.zed/settings.json` merges with your user settings.
2. If Zed shows “settings out of date”, open the file manually: `Ctrl+Shift+P` → **zed: open project settings** (the in-app “Fix” link is flaky). Use the flat `context_servers` shape from [Zed MCP docs](https://zed.dev/docs/ai/mcp) — no `"source": "custom"` key.
3. Open the **Agent** panel → **Context servers** (or command palette → context server / MCP settings).
4. For `linear-hangout`, use **Connect** / **Authenticate** when prompted.
5. `vercel` is configured in **user** Zed settings (`%APPDATA%\Zed\settings.json`) with a Bearer token — not in project `.zed/settings.json`.
6. Ensure `SUPABASE_PAT` is in your **user** environment (Zed inherits OS env on restart).

#### Multi-device setup (desktop, laptop, Cursor Cloud)

Keep **app secrets** on Vercel and **agent tooling** aligned the same way on every machine:

| What | Where to store | On a new machine |
|------|----------------|------------------|
| App keys (`NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, etc.) | Vercel project env → **Development** | `npx vercel link` then `npx vercel env pull` → `.env.local` |
| Agent MCP (`SUPABASE_PAT`) | Vercel **Sensitive** env var `SUPABASE_PAT` (Development) on this project | After `vercel env pull`, copy value into **Windows User** env `SUPABASE_PAT` once, or re-use the same PAT from your password manager |
| Agent MCP (`VERCEL_MCP_TOKEN`) | [vercel.com/account/tokens](https://vercel.com/account/tokens) → Windows User env (Zed only; Cursor uses OAuth) | Set on each machine; optional copy in Vercel env for `vercel env pull` |
| Linear MCP | OAuth in each IDE | Repeat browser Connect in Cursor and Zed for this repo |
| Vercel MCP | OAuth in **Cursor**; Bearer `VERCEL_MCP_TOKEN` in **Zed** | See “Vercel MCP in Zed” above |
| Vercel project pin | Committed `.vercel/` after `vercel link` | `git pull` — link is in the repo |

**Cursor Cloud:** In the cloud agent / environment settings for this repo, add `SUPABASE_PAT` (and any vars not covered by `vercel env pull` in cloud). Cloud agents do not use your desktop OS env.

Never commit `.env.local`, database passwords, or PATs. MCP config in git only references `${SUPABASE_PAT}`.

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
