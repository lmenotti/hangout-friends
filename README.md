# Hangout

A group scheduling app for coordinating hangouts with friends. One shared space to find overlapping availability, vote on activity ideas, RSVP to events, and report issues.

Live at [hangout-friends.vercel.app](https://hangout-friends.vercel.app)

## Features

- **Availability** — Weekly grid to mark free hours. Heatmap shows when the most people overlap.
- **Ideas** — Suggest activities, upvote favorites, set duration/location/indoor-outdoor. Travel time from Berkeley estimated automatically via Google Maps.
- **Events** — Create events with start/end time and location. RSVP yes/maybe/no. See who's coming.
- **Auto-schedule** — One click picks the best time based on voter availability (requires 2+ upvotes and overlapping free time among voters).
- **Accounts** — Admin-controlled approved names list. First sign-in creates the account; optional password protection.
- **Bug reports** — In-app reporting form. Admin panel shows open/resolved reports with a Claude AI fix suggestion button.
- **Admin panel** — Manage approved names, moderate content, review bug reports. PIN-protected at `/admin`.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4**
- **Supabase** (Postgres + RLS, no Supabase auth — custom token system)
- **Vercel** (hosting, automatic deploys from GitHub)

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
ADMIN_PIN=your_admin_pin
SUPABASE_ACCESS_TOKEN=your_supabase_personal_access_token
GOOGLE_MAPS_API_KEY=your_google_maps_key        # optional — enables travel time estimates
ANTHROPIC_API_KEY=your_anthropic_key            # optional — enables Claude fix suggestions in admin
```

`SUPABASE_ACCESS_TOKEN` is a personal access token from [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens). It's used by the migration runner.

### Database migrations

Migrations live in `migrations/` as numbered SQL files. They run automatically before every build:

```bash
node scripts/migrate.mjs   # run manually
npm run build              # runs migrations then builds
```

Applied migrations are tracked in a `_migrations` table in Supabase. New files are picked up automatically on the next deploy.

## Deployment

Connected to Vercel via GitHub — every push to `main` triggers a production deploy. Migrations run automatically as part of the build step.

To deploy manually:

```bash
npx vercel --prod
```

## Project Structure

```
app/
  admin/          # Admin panel (PIN-protected)
  api/            # Route handlers
    admin/        # Admin data + approved names
    auto-schedule/
    availability/
    bug-reports/
    claude-fix/   # Claude AI fix suggestion endpoint
    events/
    ideas/
    users/
  availability/   # Availability grid page
  bugs/           # Bug report form
  events/         # Events + RSVP page
  ideas/          # Ideas + voting page
components/
  AvailabilityGrid.tsx
  CreateEventForm.tsx
  EventsList.tsx
  IdeasBoard.tsx
  NameModal.tsx
  Nav.tsx
context/
  UserContext.tsx   # Token-based identity stored in localStorage
lib/
  password.ts       # scrypt hashing for optional account passwords
  supabase.ts       # Lazy-initialized Supabase client
migrations/         # Numbered SQL migration files
scripts/
  migrate.mjs       # Migration runner (Supabase Management API or direct Postgres)
types/
  database.ts       # Supabase table types + extended query types
```
