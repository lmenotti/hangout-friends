-- Hot-path lookups for plan pages and filtered idea vote queries

create index if not exists poll_responses_poll_id_idx on public.poll_responses(poll_id);
create index if not exists idea_votes_idea_id_idx on public.idea_votes(idea_id);
