-- ============================================================
-- CRON JOB : Exécution quotidienne du rollup d'overlap
-- ============================================================
-- À planifier dans pg_cron (Supabase) ou via un worker externe
-- Exécution recommandée : tous les jours à 04:00 (heure de Paris)
-- pour que la journée précédente soit complète

-- Extension pg_cron (si pas déjà activée dans Supabase)
-- create extension if not exists pg_cron;

-- Job quotidien : rollup de la veille (J-1)
-- select cron.schedule(
--   'daily-overlap-rollup',
--   '0 4 * * *',  -- 04:00 UTC = 05:00/06:00 Paris selon DST
--   $$ select run_daily_overlap_rollup((now() - interval '1 day')::date); $$
-- );

-- Alternative : exécution manuelle pour une date spécifique
-- select run_daily_overlap_rollup('2026-11-20'::date);

-- Backfill initial (30 derniers jours) - à lancer une seule fois
-- select backfill_daily_rollup(30);

-- Backfill 90 jours (pour période 90j)
-- select backfill_daily_rollup(90);

-- Vérification : voir les derniers rollups exécutés
-- select d, count(*) as nb_paires from daily_switches_rollup group by d order by d desc limit 10;
-- select d, count(*) as nb_streamers from daily_streamer_rollup group by d order by d desc limit 10;
-- select d, count(*) as nb_paires from daily_overlap_matrix group by d order by d desc limit 10;

-- Nettoyage manuel des données brutes > 48h (si besoin hors cron horaire)
-- delete from presence where f < (extract(epoch from (now() - interval '48 hours'))*1000)::bigint;
-- delete from switches where d < to_char(now() - interval '2 days', 'YYYY-MM-DD');

-- ============================================================
-- REQUÊTES POUR LES PÉRIODES 30j / 90j (agrégats à la volée)
-- ============================================================

-- Switches agrégés sur 30 jours
-- select a, b, sum(viewers) as viewers_30j, sum(switches) as switches_30j
-- from daily_switches_rollup
-- where d >= to_char(now() - interval '30 days', 'YYYY-MM-DD')
-- group by a, b
-- order by switches_30j desc;

-- Switches agrégés sur 90 jours
-- select a, b, sum(viewers) as viewers_90j, sum(switches) as switches_90j
-- from daily_switches_rollup
-- where d >= to_char(now() - interval '90 days', 'YYYY-MM-DD')
-- group by a, b
-- order by switches_90j desc;

-- Streamers agrégés sur 30 jours
-- select c, sum(unique_chatters) as chatters_30j, sum(total_messages) as msgs_30j,
--        sum(minutes_live) as min_live_30j, max(peak_viewers) as peak_30j,
--        avg(avg_viewers)::int as avg_viewers_30j
-- from daily_streamer_rollup
-- where d >= to_char(now() - interval '30 days', 'YYYY-MM-DD')
-- group by c
-- order by chatters_30j desc;

-- Overlap matrix agrégée sur 30 jours
-- select a, b, sum(shared_viewers) as shared_30j, sum(a_only) as a_only_30j, sum(b_only) as b_only_30j
-- from daily_overlap_matrix
-- where d >= to_char(now() - interval '30 days', 'YYYY-MM-DD')
-- group by a, b
-- having sum(shared_viewers) > 0
-- order by shared_30j desc;

-- Overlap matrix agrégée sur 90 jours
-- select a, b, sum(shared_viewers) as shared_90j, sum(a_only) as a_only_90j, sum(b_only) as b_only_90j
-- from daily_overlap_matrix
-- where d >= to_char(now() - interval '90 days', 'YYYY-MM-DD')
-- group by a, b
-- having sum(shared_viewers) > 0
-- order by shared_90j desc;