-- Run this in the Supabase SQL editor. Safe to run even if the function
-- already exists (create or replace).
--
-- Called by /api/rooms/reveal when a game ends: records one game played
-- (and a win when p_won) for every signed-in player, on whichever team
-- they were. Anonymous players have no account row, so only signed-in
-- players accumulate stats.

create or replace function increment_user_stats(p_user_id uuid, p_won boolean)
returns void
language plpgsql
security definer
as $$
begin
  update user_stats
     set games_played = coalesce(games_played, 0) + 1,
         games_won    = coalesce(games_won, 0) + (case when p_won then 1 else 0 end)
   where user_id = p_user_id;

  if not found then
    insert into user_stats (user_id, display_name, games_played, games_won)
    values (p_user_id, '', 1, case when p_won then 1 else 0 end);
  end if;
end;
$$;
