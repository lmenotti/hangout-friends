-- Run this in Supabase SQL Editor to allow admin deletes
-- (adds DELETE policies that were missing from the previous update)

create policy if not exists "Allow delete" on public.users for delete using (true);
create policy if not exists "Allow delete" on public.ideas for delete using (true);
create policy if not exists "Allow delete" on public.events for delete using (true);
create policy if not exists "Allow update" on public.users for update using (true) with check (true);
