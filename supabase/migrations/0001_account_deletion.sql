-- Account self-deletion. Run this in the Supabase SQL editor (one time).
-- Lets a signed-in user delete ONLY their own account. Deleting the auth user
-- cascades to profiles/workouts/workout_sets/chat_messages/etc. via the existing
-- `on delete cascade` foreign keys, so all their data goes with it.

create or replace function public.delete_current_user()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_current_user() from public;
grant execute on function public.delete_current_user() to authenticated;
