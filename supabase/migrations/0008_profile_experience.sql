-- ponytail: shortcut: bounded 256px avatars in the profile; use object storage for larger images.
alter table public.profiles
  add column display_name text check (
    display_name is null or (display_name = btrim(display_name) and char_length(display_name) between 1 and 60)
  ),
  add column avatar_data_url text check (
    avatar_data_url is null or (
      char_length(avatar_data_url) between 31 and 90000
      and avatar_data_url ~ '^data:image/jpeg;base64,/9j/[A-Za-z0-9+/]*={0,2}$'
    )
  ),
  add column sound_enabled boolean not null default true,
  add column celebrations_enabled boolean not null default true;

grant update (display_name, avatar_data_url, sound_enabled, celebrations_enabled)
  on public.profiles to authenticated;

-- Keep the existing rating projection and privacy rules in one place.
alter function public.public_profile(text) rename to public_profile_ratings;
revoke all on function public.public_profile_ratings(text) from public, anon, authenticated;

create function public.public_profile(p_handle text)
returns jsonb language sql security definer set search_path = '' as $$
  select public.public_profile_ratings(p_handle) || jsonb_build_object(
    'display_name', p.display_name, 'avatar_data_url', p.avatar_data_url
  )
  from public.profiles p
  where p.handle = p_handle and p.leaderboard_visible and p.banned_at is null;
$$;

revoke all on function public.public_profile(text) from public;
grant execute on function public.public_profile(text) to anon, authenticated;
