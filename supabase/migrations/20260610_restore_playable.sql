-- Restore a known-good, playable database state after the game_players write
-- lockdown caused "permission denied" errors on the deployed app.
--
-- This intentionally rolls back the browser write-lockdown (the mid-game
-- spymaster cheat fix), trading that hardening for reliability. Run in the
-- Supabase SQL editor; takes effect immediately, no redeploy needed.

-- 1. Let the browser-facing roles write game_players again (undoes the revoke)
grant insert, update, delete on table game_players to anon, authenticated;

-- 2. Ensure the backend service_role has full access to the public schema,
--    in case its default grants were stripped.
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
