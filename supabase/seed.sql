-- Eleanor database seed
-- Tracks only (concepts come from content:sync)
insert into public.tracks (id, name, sort) values
  ('judgment', 'Judgment', 1),
  ('logic', 'Logic', 2),
  ('math', 'Math', 3),
  ('code', 'Code', 4)
on conflict (id) do update set
  name = excluded.name,
  sort = excluded.sort;
