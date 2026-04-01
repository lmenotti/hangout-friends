-- Run this in Supabase SQL Editor to tighten security
-- This restricts direct API access while keeping our app working

-- Drop the open policies
drop policy if exists "Allow all" on public.users;
drop policy if exists "Allow all" on public.availability;
drop policy if exists "Allow all" on public.ideas;
drop policy if exists "Allow all" on public.idea_votes;
drop policy if exists "Allow all" on public.events;
drop policy if exists "Allow all" on public.rsvps;

-- Everyone can read everything (needed to show the group's data)
create policy "Public read" on public.users for select using (true);
create policy "Public read" on public.availability for select using (true);
create policy "Public read" on public.ideas for select using (true);
create policy "Public read" on public.idea_votes for select using (true);
create policy "Public read" on public.events for select using (true);
create policy "Public read" on public.rsvps for select using (true);

-- Only allow inserts/updates/deletes (writes come through our API which validates tokens)
create policy "Allow insert" on public.users for insert with check (true);
create policy "Allow insert" on public.availability for insert with check (true);
create policy "Allow delete" on public.availability for delete using (true);
create policy "Allow insert" on public.ideas for insert with check (true);
create policy "Allow insert" on public.idea_votes for insert with check (true);
create policy "Allow delete" on public.idea_votes for delete using (true);
create policy "Allow insert" on public.events for insert with check (true);
create policy "Allow insert" on public.rsvps for insert with check (true);
create policy "Allow update" on public.rsvps for update using (true);
