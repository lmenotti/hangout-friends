alter table public.events
  add column if not exists recurrence_rule text,
  add column if not exists recurrence_end date,
  add column if not exists parent_event_id uuid references public.events(id) on delete cascade;

do $$ begin
  create policy "Allow update" on public.events for update using (true) with check (true);
exception when duplicate_object then null; end $$;
