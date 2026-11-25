-- Migration du 25/11/2026 : lecture protégée par le code du tableau de bord (idempotente, à lancer dans le SQL Editor).
-- AVANT de la lancer : ouvrir le nouveau twitch-overlap.html et saisir le code du tableau (config.json, « codeTableau ») dans Réglages.
-- Retour en arrière : migration_lecture_protegee_retour.sql.

-- ---------- Lecture protégée par le code du tableau de bord (25/11/2026) ----------
-- Avant : la clé publique (qui se trouve dans le navigateur) lisait toutes les tables. Maintenant : une ligne n'est lisible que si la
-- requête porte l'en-tête « x-board-code » avec le code du tableau (celui de config.json, « codeTableau », déjà posé en base par le
-- collecteur sous forme d'empreinte). Le navigateur envoie l'en-tête tout seul quand le code est saisi dans Réglages.
-- Sans code ou avec un mauvais code : zéro ligne, sans erreur. Le collecteur (clé secrète) et les tâches cron ne passent pas par ces règles.
create or replace function board_ok() returns boolean
language sql stable security definer set search_path = public, pg_catalog as $$
  select coalesce((
    select exists (select 1 from private_settings s where s.k = 'board_code' and s.v = encode(sha256(convert_to(h.code, 'UTF8')), 'hex'))
    from (select nullif(current_setting('request.headers', true), '')::json ->> 'x-board-code' as code) h
    where length(h.code) >= 8
  ), false)
$$;
revoke all on function board_ok() from public;
grant execute on function board_ok() to anon, authenticated, service_role;

-- Droit à l'effacement : supprime les lignes d'un viewer à partir de son empreinte (voir oublier.mjs, qui la calcule avec le sel de config.json).
-- Réservé à la clé secrète. Les agrégats (esquisses HyperLogLog, matrice de chevauchement) ne contiennent aucune empreinte : rien à y retirer.
create or replace function forget_user(h text) returns jsonb
language plpgsql security definer set search_path = public, pg_catalog as $$
declare a int; b int;
begin
  if h is null or length(h) < 8 then raise exception 'empreinte invalide'; end if;
  delete from presence where u = h; get diagnostics a = row_count;
  delete from switches where u = h; get diagnostics b = row_count;
  return jsonb_build_object('presence', a, 'switches', b);
end $$;
revoke all on function forget_user(text) from public, anon, authenticated;
grant execute on function forget_user(text) to service_role;

-- Deux fonctions sans chemin de recherche fixé (alerte de sécurité Supabase)
alter function add_streamers_batch(text[]) set search_path = public, pg_catalog;
alter function hll_card(float8, int) set search_path = public, pg_catalog;

drop policy if exists read_all on presence;         create policy read_all on presence for select to anon, authenticated using ((select public.board_ok()));
drop policy if exists read_all on minutes;          create policy read_all on minutes for select to anon, authenticated using ((select public.board_ok()));
drop policy if exists read_all on snaps;            create policy read_all on snaps for select to anon, authenticated using ((select public.board_ok()));
drop policy if exists read_all on events;           create policy read_all on events for select to anon, authenticated using ((select public.board_ok()));
drop policy if exists read_all on words;            create policy read_all on words for select to anon, authenticated using ((select public.board_ok()));
drop policy if exists read_all on vods;             create policy read_all on vods for select to anon, authenticated using ((select public.board_ok()));
drop policy if exists read_all on chan_meta;        create policy read_all on chan_meta for select to anon, authenticated using ((select public.board_ok()));
drop policy if exists read_all on clips;            create policy read_all on clips for select to anon, authenticated using ((select public.board_ok()));
drop policy if exists read_all on ecoute;           create policy read_all on ecoute for select to anon, authenticated using ((select public.board_ok()));
drop policy if exists read_all on switches;         create policy read_all on switches for select to anon, authenticated using ((select public.board_ok()));
drop policy if exists read_all on collector_status; create policy read_all on collector_status for select to anon, authenticated using ((select public.board_ok()));
drop policy if exists read_all on channels;         create policy read_all on channels for select to anon, authenticated using ((select public.board_ok()));
drop policy if exists read_all on daily_switches_rollup; create policy read_all on daily_switches_rollup for select to anon, authenticated using ((select public.board_ok()));
drop policy if exists read_all on daily_streamer_rollup; create policy read_all on daily_streamer_rollup for select to anon, authenticated using ((select public.board_ok()));
drop policy if exists read_all on daily_overlap_matrix; create policy read_all on daily_overlap_matrix for select to anon, authenticated using ((select public.board_ok()));
drop policy if exists read_all on daily_hll; create policy read_all on daily_hll for select to anon, authenticated using ((select public.board_ok()));
drop policy if exists read_all on rosters; create policy read_all on rosters for select to anon, authenticated using ((select public.board_ok()));
drop policy if exists read_all on roster_streamers; create policy read_all on roster_streamers for select to anon, authenticated using ((select public.board_ok()));
drop policy if exists read_all on raid_events; create policy read_all on raid_events for select to anon, authenticated using ((select public.board_ok()));
