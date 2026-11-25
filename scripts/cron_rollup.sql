-- ============================================================
-- CRON JOB : Exécution quotidienne du rollup d'overlap
-- ============================================================
-- À planifier dans pg_cron (Supabase) ou via un worker externe
-- Exécution recommandée : tous les jours à 04:00 (heure de Paris)
-- pour que la journée précédente soit complète

-- 24/11/2026 : APPLIQUÉ en production (pg_cron 1.6, job n° 1). À rejouer tel quel si la base est recréée ;
-- cron.schedule avec le même nom remplace le job existant.
create extension if not exists pg_cron with schema pg_catalog;

-- Job quotidien : rollup de la veille (jour de Paris). 03:30 UTC = 04:30 Paris l'hiver, 05:30 l'été : la veille est terminée,
-- et ses présences sont encore en base (cleanup() garde d >= aujourd'hui - joursPresence, joursPresence >= 1).
select cron.schedule('daily-overlap-rollup', '30 3 * * *', $$ select run_daily_overlap_rollup(); $$);

-- 25/11/2026 : APPLIQUÉ en production (job n° 2). Esquisses HyperLogLog de la veille (voir schema.sql, build_daily_hll) : 10 minutes
-- après le rollup, pour compter des viewers uniques sur 7, 30 ou 90 jours (period_reach).
select cron.schedule('daily-hll', '40 3 * * *', $$ select build_daily_hll(to_char((now() at time zone 'Europe/Paris')::date - 1, 'YYYY-MM-DD')); $$);

-- Exécution manuelle pour une date précise (sans effet si les présences de ce jour ont déjà été purgées)
-- select run_daily_overlap_rollup('2026-11-23'::date);

-- Rattrapage : seuls les jours dont les présences sont encore en base sont recalculés, les autres rollups sont gardés.
-- select backfill_daily_rollup(7);

-- Historique des exécutions du job
-- select status, start_time, end_time, return_message from cron.job_run_details order by start_time desc limit 10;

-- Vérification : voir les derniers rollups exécutés
-- select d, count(*) as nb_paires from daily_switches_rollup group by d order by d desc limit 10;
-- select d, count(*) as nb_streamers from daily_streamer_rollup group by d order by d desc limit 10;
-- select d, count(*) as nb_paires from daily_overlap_matrix group by d order by d desc limit 10;

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