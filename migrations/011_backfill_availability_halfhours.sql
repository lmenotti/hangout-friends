-- One-time backfill: insert :30 slots between consecutive :00 slots for each user.
-- If a user has (day, hour=H, minute=0) AND (day, hour=H+1, minute=0),
-- insert (day, hour=H, minute=30) so there's no gap.

insert into public.availability (user_id, day_of_week, hour, minute)
select a1.user_id, a1.day_of_week, a1.hour, 30
from public.availability a1
join public.availability a2
  on  a1.user_id      = a2.user_id
  and a1.day_of_week  = a2.day_of_week
  and a2.hour         = a1.hour + 1
  and a2.minute       = 0
where a1.minute = 0
  and not exists (
    select 1 from public.availability a3
    where a3.user_id     = a1.user_id
      and a3.day_of_week = a1.day_of_week
      and a3.hour        = a1.hour
      and a3.minute      = 30
  );
