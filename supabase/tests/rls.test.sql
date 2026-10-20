begin;
create extension if not exists pgtap;

select plan(35);

-- ----------------------------------------------------------------------------
-- 1. Setup Test Fixtures
-- ----------------------------------------------------------------------------

-- Tracks
insert into public.tracks (id, name, sort) values
  ('judgment', 'Judgment', 1),
  ('logic', 'Logic', 2),
  ('math', 'Math', 3),
  ('code', 'Code', 4)
on conflict (id) do nothing;

-- Users A and B in auth.users
insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'user_a@example.com',
    'password_hash_a',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'user_b@example.com',
    'password_hash_b',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

-- Profiles for A (visible) and B (hidden)
insert into public.profiles (
  id, handle, age_confirmed_at, terms_accepted_at, pledge_accepted_at,
  leaderboard_visible, intensity, set_size, rating_reveal, reduced_motion,
  theme, weekly_goal, tracks
) values
  (
    '11111111-1111-1111-1111-111111111111',
    'user_a',
    now(), now(), now(),
    true,
    'balanced',
    5,
    'end_of_set',
    false,
    'system',
    3,
    '{judgment,logic,math,code}'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'user_b',
    now(), now(), now(),
    false,
    'balanced',
    5,
    'end_of_set',
    false,
    'system',
    3,
    '{judgment,logic,math,code}'
  );

-- Concept, Concept Card, Family, Items
insert into public.concepts (id, track_id, name, summary, prereqs, entry_rating, sort) values
  ('c_test', 'judgment', 'Concept Test', 'Summary test', '{}', 1200, 1);

insert into public.concept_cards (concept_id, version, body, reviewer, reviewed_at) values
  ('c_test', 1, '{"front": "Q", "back": "A"}'::jsonb, 'reviewer_1', '2026-01-01');

insert into public.families (id, concept_id) values
  ('f_test', 'c_test');

insert into public.items (
  id, kind, source_id, source_version, level,
  track_id, concept_id, family_id, rating, rd, n, anchor, status, daily_eligible
) values
  ('item_1', 'generated', 'src_1', 1, 1, 'judgment', 'c_test', 'f_test', 1200, 100, 0, false, 'published', true),
  ('item_2', 'code', 'src_2', 1, 2, 'judgment', 'c_test', 'f_test', 1300, 100, 0, false, 'published', false);

insert into public.code_tests (item_id, group_idx, label, fingerprint, input, expected) values
  ('item_2', 0, 'group 0', 'fp_0', '1 2', '3');

-- Instances and Secrets
insert into public.instances (id, item_id, seed, skin, prompt, answer_spec) values
  ('33333333-3333-3333-3333-333333333331', 'item_1', 101, null, '{"text": "p1"}'::jsonb, '{"kind": "numeric"}'::jsonb),
  ('33333333-3333-3333-3333-333333333332', 'item_1', 102, null, '{"text": "p2"}'::jsonb, '{"kind": "numeric"}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', 'item_1', 103, null, '{"text": "p3"}'::jsonb, '{"kind": "numeric"}'::jsonb);

insert into public.instance_secrets (instance_id, answer, misconceptions, steps, solution) values
  ('33333333-3333-3333-3333-333333333331', '{"value": 42}'::jsonb, '[]'::jsonb, '[]'::jsonb, '{"text": "42"}'::jsonb),
  ('33333333-3333-3333-3333-333333333332', '{"value": 42}'::jsonb, '[]'::jsonb, '[]'::jsonb, '{"text": "42"}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', '{"value": 42}'::jsonb, '[]'::jsonb, '[]'::jsonb, '{"text": "42"}'::jsonb);

-- Sets
insert into public.sets (id, user_id, track_id, mode, size, rng_seed) values
  ('44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', 'judgment', 'rated', 5, 1001),
  ('44444444-4444-4444-4444-444444444442', '22222222-2222-2222-2222-222222222222', 'judgment', 'rated', 5, 2002);

-- Attempts
-- A1: resolved
-- A2: revealed
-- B1: resolved
insert into public.attempts (
  id, user_id, set_id, slot, instance_id, item_id,
  track_id, concept_id, family_id, kind, state, outcome,
  rated, answer, confidence, presented_at, resolved_at, revealed_at
) values
  (
    '55555555-5555-5555-5555-555555555551',
    '11111111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444441',
    0,
    '33333333-3333-3333-3333-333333333331',
    'item_1',
    'judgment',
    'c_test',
    'f_test',
    'selected',
    'resolved',
    'correct',
    true,
    '{"value": 42}'::jsonb,
    0.8,
    now(),
    now(),
    null
  ),
  (
    '55555555-5555-5555-5555-555555555552',
    '11111111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444441',
    1,
    '33333333-3333-3333-3333-333333333332',
    'item_1',
    'judgment',
    'c_test',
    'f_test',
    'selected',
    'revealed',
    'correct',
    true,
    '{"value": 42}'::jsonb,
    0.9,
    now(),
    now(),
    now()
  ),
  (
    '55555555-5555-5555-5555-555555555553',
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444442',
    0,
    '33333333-3333-3333-3333-333333333333',
    'item_1',
    'judgment',
    'c_test',
    'f_test',
    'selected',
    'resolved',
    'correct',
    true,
    '{"value": 42}'::jsonb,
    0.7,
    now(),
    now(),
    null
  );

-- Track & Concept Ratings
insert into public.track_ratings (user_id, track_id, rating, rd, n, peak, last_at) values
  ('11111111-1111-1111-1111-111111111111', 'judgment', 1500, 100, 10, 1500, now()),
  ('22222222-2222-2222-2222-222222222222', 'judgment', 1400, 100, 5, 1400, now());

insert into public.concept_ratings (user_id, concept_id, rating, rd, n, state, last_at) values
  ('11111111-1111-1111-1111-111111111111', 'c_test', 1500, 100, 10, 'proven', now()),
  ('22222222-2222-2222-2222-222222222222', 'c_test', 1400, 100, 5, 'learning', now());

-- Echoes
insert into public.echoes (id, user_id, track_id, concept_id, family_id, source_attempt_id, interval_days, due_at, status) values
  ('66666666-6666-6666-6666-666666666661', '11111111-1111-1111-1111-111111111111', 'judgment', 'c_test', 'f_test', '55555555-5555-5555-5555-555555555551', 3, now() + interval '3 days', 'due'),
  ('66666666-6666-6666-6666-666666666662', '22222222-2222-2222-2222-222222222222', 'judgment', 'c_test', 'f_test', '55555555-5555-5555-5555-555555555553', 3, now() + interval '3 days', 'due');

-- Rating Events
insert into public.rating_events (
  attempt_id, user_id, subject_type, subject_id,
  r_before, rd_before, r_after, rd_after,
  expected, score, model_version
) values
  ('55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111', 'track', 'judgment', 1500, 100, 1510, 98, 0.6, 1, 'erm-1'),
  ('55555555-5555-5555-5555-555555555553', '22222222-2222-2222-2222-222222222222', 'track', 'judgment', 1400, 100, 1410, 98, 0.5, 1, 'erm-1');

-- Transitions, Misconceptions, Rate Events, Integrity Flags, Code Submissions
insert into public.transitions (id, user_id, kind, attempt_id, response) values
  ('77777777-7777-7777-7777-777777777771', '11111111-1111-1111-1111-111111111111', 'step', '55555555-5555-5555-5555-555555555551', '{"step": 1}'::jsonb);

insert into public.misconception_stats (user_id, misconception_id, concept_id, weight, last_at) values
  ('11111111-1111-1111-1111-111111111111', 'm_1', 'c_test', 1.0, now());

insert into public.rate_events (user_id, kind) values
  ('11111111-1111-1111-1111-111111111111', 'attempt');

insert into public.integrity_flags (user_id, track_id, kind, detail) values
  ('11111111-1111-1111-1111-111111111111', 'judgment', 'rapid_gain', '{"note": "test"}'::jsonb);

insert into public.code_submissions (id, attempt_id, user_id, language, source, confidence, rated, status) values
  ('88888888-8888-8888-8888-888888888881', '55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111', 'python', 'print(1)', 0.9, true, 'done');


-- ----------------------------------------------------------------------------
-- 2. Test RLS Isolation: A cannot see B's rows
-- ----------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';
set local "request.jwt.claim.role" = 'authenticated';
set local "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  (select count(*)::int from public.attempts where user_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'A cannot see B attempts'
);

select is(
  (select count(*)::int from public.track_ratings where user_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'A cannot see B track_ratings'
);

select is(
  (select count(*)::int from public.concept_ratings where user_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'A cannot see B concept_ratings'
);

select is(
  (select count(*)::int from public.echoes where user_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'A cannot see B echoes'
);

select is(
  (select count(*)::int from public.rating_events where user_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'A cannot see B rating_events'
);


-- ----------------------------------------------------------------------------
-- 3. Test Denied Reads: authenticated cannot select internal/secret tables
-- ----------------------------------------------------------------------------
select throws_ok(
  'select * from public.instance_secrets',
  '42501',
  null,
  'authenticated cannot select instance_secrets'
);

select throws_ok(
  'select * from public.items',
  '42501',
  null,
  'authenticated cannot select items'
);

select throws_ok(
  'select * from public.code_tests',
  '42501',
  null,
  'authenticated cannot select code_tests'
);

select throws_ok(
  'select * from public.transitions',
  '42501',
  null,
  'authenticated cannot select transitions'
);


-- ----------------------------------------------------------------------------
-- 4. Test Denied Writes: authenticated cannot insert into attempts, track_ratings, rating_events
-- ----------------------------------------------------------------------------
select throws_ok(
  'insert into public.attempts (user_id, instance_id, item_id, track_id, concept_id, family_id, kind, rated) values (''11111111-1111-1111-1111-111111111111'', ''33333333-3333-3333-3333-333333333331'', ''item_1'', ''judgment'', ''c_test'', ''f_test'', ''selected'', true)',
  '42501',
  null,
  'authenticated cannot insert into attempts'
);

select throws_ok(
  'insert into public.track_ratings (user_id, track_id, rating, rd, peak) values (''11111111-1111-1111-1111-111111111111'', ''logic'', 1500, 100, 1500)',
  '42501',
  null,
  'authenticated cannot insert into track_ratings'
);

select throws_ok(
  'insert into public.rating_events (attempt_id, user_id, subject_type, subject_id, r_before, rd_before, r_after, rd_after, expected, score, model_version) values (''55555555-5555-5555-5555-555555555551'', ''11111111-1111-1111-1111-111111111111'', ''track'', ''judgment'', 1500, 100, 1510, 98, 0.6, 1, ''erm-1'')',
  '42501',
  null,
  'authenticated cannot insert into rating_events'
);


-- ----------------------------------------------------------------------------
-- 5. Test Column-level Privileges on profiles
-- ----------------------------------------------------------------------------
select lives_ok(
  'update public.profiles set intensity = ''stretch'' where id = ''11111111-1111-1111-1111-111111111111''',
  'A can update own intensity'
);

select is(
  (select intensity from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'stretch',
  'profile intensity successfully updated to stretch'
);

select throws_ok(
  'update public.profiles set handle = ''new_handle'' where id = ''11111111-1111-1111-1111-111111111111''',
  '42501',
  null,
  'A cannot update profiles.handle'
);

select throws_ok(
  'update public.profiles set banned_at = now() where id = ''11111111-1111-1111-1111-111111111111''',
  '42501',
  null,
  'A cannot update profiles.banned_at'
);


-- ----------------------------------------------------------------------------
-- 6. Test Playbook Insert Check (state = 'revealed' required)
-- ----------------------------------------------------------------------------
select throws_ok(
  'insert into public.playbook (user_id, attempt_id, concept_id, text) values (''11111111-1111-1111-1111-111111111111'', ''55555555-5555-5555-5555-555555555551'', ''c_test'', ''notes on resolved attempt'')',
  '42501',
  null,
  'playbook insert fails for attempt in state resolved'
);

select lives_ok(
  'insert into public.playbook (user_id, attempt_id, concept_id, text) values (''11111111-1111-1111-1111-111111111111'', ''55555555-5555-5555-5555-555555555552'', ''c_test'', ''notes on revealed attempt'')',
  'playbook insert succeeds for attempt in state revealed'
);


-- ----------------------------------------------------------------------------
-- 7. Test Anon Access to Leaderboard & public_profile
-- ----------------------------------------------------------------------------
set local role anon;
set local "request.jwt.claim.sub" = '';
set local "request.jwt.claim.role" = 'anon';
set local "request.jwt.claims" = '{"role": "anon"}';

select lives_ok(
  'select count(*) from public.leaderboard',
  'anon can select from leaderboard'
);

select lives_ok(
  'select public.public_profile(''user_a'')',
  'anon can execute public_profile'
);

select is(
  (public.public_profile('user_a') ->> 'handle'),
  'user_a',
  'public_profile returns handle for visible profile'
);

select is(
  public.public_profile('user_b'),
  null,
  'public_profile returns null for leaderboard_visible = false'
);


-- ----------------------------------------------------------------------------
-- 8. Test Cascade Deletion on auth.users Delete
-- ----------------------------------------------------------------------------
reset role;

delete from auth.users where id = '11111111-1111-1111-1111-111111111111';

select is((select count(*)::int from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 0, 'profiles cascaded on user delete');
select is((select count(*)::int from public.sets where user_id = '11111111-1111-1111-1111-111111111111'), 0, 'sets cascaded on user delete');
select is((select count(*)::int from public.attempts where user_id = '11111111-1111-1111-1111-111111111111'), 0, 'attempts cascaded on user delete');
select is((select count(*)::int from public.transitions where user_id = '11111111-1111-1111-1111-111111111111'), 0, 'transitions cascaded on user delete');
select is((select count(*)::int from public.track_ratings where user_id = '11111111-1111-1111-1111-111111111111'), 0, 'track_ratings cascaded on user delete');
select is((select count(*)::int from public.concept_ratings where user_id = '11111111-1111-1111-1111-111111111111'), 0, 'concept_ratings cascaded on user delete');
select is((select count(*)::int from public.misconception_stats where user_id = '11111111-1111-1111-1111-111111111111'), 0, 'misconception_stats cascaded on user delete');
select is((select count(*)::int from public.rating_events where user_id = '11111111-1111-1111-1111-111111111111'), 0, 'rating_events cascaded on user delete');
select is((select count(*)::int from public.echoes where user_id = '11111111-1111-1111-1111-111111111111'), 0, 'echoes cascaded on user delete');
select is((select count(*)::int from public.playbook where user_id = '11111111-1111-1111-1111-111111111111'), 0, 'playbook cascaded on user delete');
select is((select count(*)::int from public.code_submissions where user_id = '11111111-1111-1111-1111-111111111111'), 0, 'code_submissions cascaded on user delete');
select is((select count(*)::int from public.rate_events where user_id = '11111111-1111-1111-1111-111111111111'), 0, 'rate_events cascaded on user delete');
select is((select count(*)::int from public.integrity_flags where user_id = '11111111-1111-1111-1111-111111111111'), 0, 'integrity_flags cascaded on user delete');

select * from finish();
rollback;
