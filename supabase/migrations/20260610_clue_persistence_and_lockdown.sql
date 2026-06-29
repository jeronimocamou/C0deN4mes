-- Run this in the Supabase SQL editor BEFORE deploying the matching app code.

-- 1. Persist the current clue on the game so refreshes and late joiners see it
--    (cleared automatically when the turn changes or the game ends).
alter table games
  add column if not exists clue_word text,
  add column if not exists clue_count int,
  add column if not exists clue_team text;

-- 2. Team/role changes now go through /api/rooms/update-player, which uses the
--    service role key (bypasses RLS) and validates everything server-side.
--    Block direct writes from browsers so players can't edit game_players rows
--    themselves (e.g. switching their role to spymaster mid-game to see the key).
revoke insert, update, delete on table game_players from anon, authenticated;
