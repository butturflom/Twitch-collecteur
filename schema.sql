-- Twitch Overlap : schéma de la base du collecteur
-- À exécuter une fois dans le SQL Editor d'un projet Supabase dédié.
-- Les pseudos des viewers ne sont jamais stockés en clair : le collecteur les remplace
-- par une empreinte (hachage salé), qui suffit pour compter et croiser les audiences.

create sequence if not exists rev_seq;

create table if not exists presence (      -- qui a écrit, où, quel jour, sur quel jeu
  u text not null,                          -- empreinte du pseudo
  c text not null,                          -- chaîne
  d text not null,                          -- jour (AAAA-MM-JJ, heure de Paris)
  g text not null,                          -- jeu en cours
  f bigint not null,                        -- 1er message (ms)
  l bigint not null,                        -- dernier message (ms)
  n int not null default 0,                 -- nombre de messages
  rev bigint not null default nextval('rev_seq'),
  primary key (u, c, d, g)
);
create index if not exists presence_rev on presence (rev);
create index if not exists presence_d on presence (d);
create index if not exists presence_c on presence (c);
create index if not exists presence_c_d on presence (c, d);
create index if not exists presence_c_g on presence (c, g);

create table if not exists minutes (       -- activité minute par minute
  c text not null, t bigint not null,
  m int not null, u int not null, g text not null,
  r int not null default 0, h int not null default 0, n int not null default 0, q int not null default 0,
  e jsonb not null default '[]',
  k jsonb not null default '{}',              -- types de messages (réaction, vague, question…)
  rev bigint not null default nextval('rev_seq'),
  primary key (c, t)
);
create index if not exists minutes_rev on minutes (rev);
create index if not exists minutes_g on minutes (g);

create table if not exists snaps (         -- relevés API : viewers et jeu
  c text not null, t bigint not null, live smallint not null, v int not null, g text not null,
  rev bigint not null default nextval('rev_seq'),
  primary key (c, t)
);
create index if not exists snaps_rev on snaps (rev);

create table if not exists events (        -- subs, subs offerts, bits, raids, 1ers messages
  id bigserial primary key,
  t bigint not null, c text not null, type text not null, frm text, n int not null default 1,
  rev bigint not null default nextval('rev_seq')
);
create index if not exists events_rev on events (rev);
create index if not exists events_t on events (t);
create index if not exists events_c on events (c);
create index if not exists events_c_t on events (c, t);

create table if not exists words (         -- compteurs d'emotes, de mots et d'ambiance par chaîne et par jour
  c text not null, d text not null,
  w jsonb not null default '{}', e jsonb not null default '{}',
  moods jsonb not null default '{"rire":0,"hype":0,"negatif":0,"question":0}',
  k jsonb not null default '{}',
  n int not null default 0,
  rev bigint not null default nextval('rev_seq'),
  primary key (c, d)
);
create index if not exists words_rev on words (rev);

create table if not exists vods (
  c text not null, id text not null, start bigint not null,
  rev bigint not null default nextval('rev_seq'),
  primary key (c, id)
);

create table if not exists chan_meta (     -- état d'une chaîne : followers, pub déclarée, réglages du chat (1 relevé par heure, ou à chaque changement)
  c text not null, t bigint not null,
  fol bigint,                               -- nombre de followers
  br smallint not null default 0,           -- pub déclarée (contenu de marque) : 1 = oui
  lab jsonb not null default '[]',          -- labels de contenu (jeu pour adultes, etc.)
  tg jsonb not null default '[]',           -- tags du stream
  lg text,                                  -- langue du stream
  cs jsonb not null default '{}',           -- chat : sl = mode lent (secondes), fo = followers seulement, su = abonnés seulement, em = emotes seulement, un = messages uniques
  rev bigint not null default nextval('rev_seq'),
  primary key (c, t)
);
create index if not exists chan_meta_rev on chan_meta (rev);

create table if not exists clips (         -- meilleurs clips d'une chaîne, calés sur le moment du live
  c text not null, id text not null,
  ts bigint not null,                       -- début du clip (ms)
  d real not null default 0,                -- durée (secondes)
  v int not null default 0,                 -- vues du clip
  ti text not null default '',              -- titre du clip
  ex smallint not null default 0,           -- 1 si le moment est exact (position dans le replay connue)
  rev bigint not null default nextval('rev_seq'),
  primary key (c, id)
);
create index if not exists clips_rev on clips (rev);
create index if not exists clips_ts on clips (c, ts);

create table if not exists ecoute (        -- périodes où le collecteur écoutait le chat de chaque chaîne (1.4)
  c text not null,
  s bigint not null,                        -- début (ms)
  e bigint not null,                        -- fin, prolongée toutes les 30 s tant que l'écoute continue (ms)
  rev bigint not null default nextval('rev_seq'),
  primary key (c, s)
);
create index if not exists ecoute_rev on ecoute (rev);

create table if not exists switches (      -- changements de stream (1.5) : la même personne écrit chez a, puis son message suivant chez b, moins de 3 h après
  u text not null,                          -- empreinte du pseudo
  d text not null,                          -- jour (heure de Paris)
  a text not null,                          -- chaîne quittée
  b text not null,                          -- chaîne rejointe
  n int not null default 0,                 -- nombre de passages de a vers b ce jour-là
  rev bigint not null default nextval('rev_seq'),
  primary key (u, d, a, b)
);
create index if not exists switches_rev on switches (rev);
create index if not exists switches_d on switches (d);

create table if not exists channels (      -- liste des chaînes suivies, modifiable depuis le tableau de bord
  c text primary key check (c ~ '^[a-z0-9_]{2,25}$'),
  added bigint not null default (extract(epoch from now())*1000)::bigint
);

create table if not exists collector_status (
  id int primary key default 1 check (id = 1),
  last_seen bigint, started bigint, tracked_ms bigint not null default 0,
  info jsonb not null default '{}', api text, version text
);
insert into collector_status (id) values (1) on conflict do nothing;

-- Mise à jour 1.1 (sans effet sur une base neuve)
alter table minutes add column if not exists k jsonb not null default '{}';
alter table words add column if not exists k jsonb not null default '{}';

-- Mise à jour 1.3 : taille de la base et durées de conservation, visibles dans le tableau de bord
alter table collector_status add column if not exists db_mb int;
alter table collector_status add column if not exists retention jsonb;

-- Réglages privés (jamais lisibles avec la clé publique) : empreinte du code du tableau de bord
create table if not exists private_settings (k text primary key, v text not null);

-- Mise à jour 1.3.1 : identifiants des lots déjà appliqués (un lot renvoyé après une réponse perdue n'est pas compté deux fois)
create table if not exists ingested_batches (id text primary key, at bigint not null);

-- ============================================================
-- NOUVEAUX TABLES DE ROLLUP (Étape 1)
-- ============================================================

-- Agrégats quotidiens de switches par paire de chaînes
-- Clé primaire composite (d, a, b) empêche la duplication lors de ré-exécutions
create table if not exists daily_switches_rollup (
  d text not null,                          -- jour (AAAA-MM-JJ, heure de Paris)
  a text not null,                          -- chaîne source
  b text not null,                          -- chaîne cible
  viewers int not null default 0,           -- viewers uniques ayant switché a→b
  switches int not null default 0,          -- nombre total de passages a→b
  organic_switch_count int not null default 0, -- switches naturels (non-raid)
  raid_switch_count int not null default 0,    -- switches liés à des raids
  primary key (d, a, b)
);
create index if not exists daily_switches_rollup_d on daily_switches_rollup (d);
create index if not exists daily_switches_rollup_a on daily_switches_rollup (a);
create index if not exists daily_switches_rollup_b on daily_switches_rollup (b);

-- Agrégats quotidiens par streamer
create table if not exists daily_streamer_rollup (
  d text not null,                          -- jour (AAAA-MM-JJ)
  c text not null,                          -- chaîne
  unique_chatters int not null default 0,   -- viewers uniques ce jour-là
  total_messages int not null default 0,    -- messages totaux
  minutes_live int not null default 0,      -- minutes en live
  peak_viewers int not null default 0,      -- pic de viewers
  avg_viewers int not null default 0,       -- viewers moyens
  primary key (d, c)
);
create index if not exists daily_streamer_rollup_d on daily_streamer_rollup (d);
create index if not exists daily_streamer_rollup_c on daily_streamer_rollup (c);

-- Matrice d'overlap quotidienne (paires de chaînes + viewers communs)
create table if not exists daily_overlap_matrix (
  d text not null,                          -- jour (AAAA-MM-JJ)
  a text not null,                          -- chaîne A
  b text not null,                          -- chaîne B (a < b pour éviter doublons)
  shared_viewers int not null default 0,    -- viewers ayant chaté sur les deux chaînes
  a_only int not null default 0,            -- viewers seulement sur A
  b_only int not null default 0,            -- viewers seulement sur B
  primary key (d, a, b)
);
create index if not exists daily_overlap_matrix_d on daily_overlap_matrix (d);
create index if not exists daily_overlap_matrix_a on daily_overlap_matrix (a);
create index if not exists daily_overlap_matrix_b on daily_overlap_matrix (b);

-- Rosters (listes de chaînes groupées)
create table if not exists rosters (
  id bigserial primary key,
  name text not null unique,
  description text,
  created_at bigint not null default (extract(epoch from now())*1000)::bigint,
  updated_at bigint not null default (extract(epoch from now())*1000)::bigint
);

-- Chaînes membres d'un roster
create table if not exists roster_streamers (
  roster_id bigint not null references rosters(id) on delete cascade,
  c text not null,
  added_at bigint not null default (extract(epoch from now())*1000)::bigint,
  primary key (roster_id, c)
);
create index if not exists roster_streamers_c on roster_streamers (c);

-- Événements de raid
create table if not exists raid_events (
  id bigserial primary key,
  ts bigint not null,                       -- timestamp (ms)
  from_channel text not null,               -- chaîne qui raid
  to_channel text not null,                 -- chaîne raidée
  viewers int not null default 0,           -- nombre de viewers envoyés
  unique_raiders int not null default 0     -- viewers uniques ayant participé au raid
);
-- Contrainte unique pour l'idempotence : un raid d'une chaîne vers une autre à un timestamp donné n'est compté qu'une fois
create unique index if not exists raid_events_unique on raid_events (ts, from_channel, to_channel);
create index if not exists raid_events_ts on raid_events (ts);
create index if not exists raid_events_from on raid_events (from_channel);
create index if not exists raid_events_to on raid_events (to_channel);

-- Additionne deux dictionnaires de compteurs {"clé": nombre}
create or replace function jsonb_add_counts(a jsonb, b jsonb) returns jsonb
language sql immutable set search_path = public, pg_catalog as $$
  select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from (
    select k, sum(v)::bigint as v from (
      select key as k, value::bigint as v from jsonb_each_text(coalesce(a, '{}'::jsonb))
      union all
      select key, value::bigint from jsonb_each_text(coalesce(b, '{}'::jsonb))
    ) s group by k
  ) t
$$;

-- Garde les N clés les plus fréquentes d'un dictionnaire de compteurs
create or replace function jsonb_top_counts(a jsonb, keep int) returns jsonb
language sql immutable set search_path = public, pg_catalog as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) from (
    select key, value from jsonb_each(a) order by value::bigint desc limit keep
  ) t
$$;

-- Point d'entrée unique du collecteur : un lot d'incréments, appliqué en une transaction
create or replace function ingest(p jsonb) returns void
language plpgsql set search_path = public, pg_catalog as $$
begin
  if p ? 'batch' then -- lot déjà appliqué (réponse perdue, puis renvoi) : on l'ignore
    insert into ingested_batches (id, at) values (p->>'batch', (extract(epoch from now())*1000)::bigint) on conflict (id) do nothing;
    if not found then return; end if;
  end if;

  insert into presence (u, c, d, g, f, l, n)
    select x.u, x.c, x.d, x.g, x.f, x.l, x.n
    from jsonb_to_recordset(coalesce(p->'presence', '[]')) as x(u text, c text, d text, g text, f bigint, l bigint, n int)
  on conflict (u, c, d, g) do update set
    f = least(presence.f, excluded.f), l = greatest(presence.l, excluded.l),
    n = presence.n + excluded.n, rev = nextval('rev_seq');

  insert into minutes (c, t, m, u, g, r, h, n, q, e, k)
    select x.c, x.t, x.m, x.u, x.g, coalesce(x.r,0), coalesce(x.h,0), coalesce(x.n,0), coalesce(x.q,0), coalesce(x.e,'[]'), coalesce(x.k,'{}')
    from jsonb_to_recordset(coalesce(p->'minutes', '[]')) as x(c text, t bigint, m int, u int, g text, r int, h int, n int, q int, e jsonb, k jsonb)
  -- Une même minute arrive en deux morceaux quand le collecteur redémarre pendant cette minute : on additionne les
  -- compteurs, on recalcule les 3 emotes les plus utilisées sur les deux morceaux, et on garde le jeu s'il était connu.
  -- u (auteurs différents) ne peut pas s'additionner sans compter deux fois quelqu'un qui a écrit avant et après :
  -- on garde le plus grand des deux, une valeur un peu basse sur cette seule minute.
  on conflict (c, t) do update set
    m = minutes.m + excluded.m, u = greatest(minutes.u, excluded.u),
    r = minutes.r + excluded.r, h = minutes.h + excluded.h, n = minutes.n + excluded.n, q = minutes.q + excluded.q,
    e = (select coalesce(jsonb_agg(jsonb_build_array(top.k, top.v) order by top.v desc, top.k), '[]'::jsonb) from (
           select el.k, sum(el.v)::int as v from (
             select a->>0 as k, (a->>1)::int as v from jsonb_array_elements(minutes.e) a
             union all
             select b->>0, (b->>1)::int from jsonb_array_elements(excluded.e) b
           ) el group by el.k order by sum(el.v) desc, el.k limit 3
         ) top),
    g = case when minutes.g = '?' then excluded.g else minutes.g end,
    k = jsonb_add_counts(minutes.k, excluded.k),
    rev = nextval('rev_seq');

  insert into snaps (c, t, live, v, g)
    select x.c, x.t, x.live, x.v, x.g
    from jsonb_to_recordset(coalesce(p->'snaps', '[]')) as x(c text, t bigint, live smallint, v int, g text)
  on conflict (c, t) do nothing;

  insert into events (t, c, type, frm, n)
    select x.t, x.c, x.type, x.frm, x.n
    from jsonb_to_recordset(coalesce(p->'events', '[]')) as x(t bigint, c text, type text, frm text, n int);

  insert into words (c, d, w, e, moods, k, n)
    select x.c, x.d, coalesce(x.w,'{}'), coalesce(x.e,'{}'), coalesce(x.moods,'{}'), coalesce(x.k,'{}'), x.n
    from jsonb_to_recordset(coalesce(p->'words', '[]')) as x(c text, d text, w jsonb, e jsonb, moods jsonb, k jsonb, n int)
  on conflict (c, d) do update set
    w = case when (select count(*) from jsonb_object_keys(jsonb_add_counts(words.w, excluded.w))) > 1500
             then jsonb_top_counts(jsonb_add_counts(words.w, excluded.w), 600)
             else jsonb_add_counts(words.w, excluded.w) end,
    e = case when (select count(*) from jsonb_object_keys(jsonb_add_counts(words.e, excluded.e))) > 800
             then jsonb_top_counts(jsonb_add_counts(words.e, excluded.e), 300)
             else jsonb_add_counts(words.e, excluded.e) end,
    moods = jsonb_add_counts(words.moods, excluded.moods),
    k = jsonb_add_counts(words.k, excluded.k),
    n = words.n + excluded.n, rev = nextval('rev_seq');

  insert into vods (c, id, start)
    select x.c, x.id, x.start from jsonb_to_recordset(coalesce(p->'vods', '[]')) as x(c text, id text, start bigint)
  on conflict do nothing;

  insert into chan_meta (c, t, fol, br, lab, tg, lg, cs)
    select x.c, x.t, x.fol, coalesce(x.br, 0), coalesce(x.lab, '[]'), coalesce(x.tg, '[]'), x.lg, coalesce(x.cs, '{}')
    from jsonb_to_recordset(coalesce(p->'meta', '[]')) as x(c text, t bigint, fol bigint, br smallint, lab jsonb, tg jsonb, lg text, cs jsonb)
  on conflict (c, t) do nothing;

  insert into clips (c, id, ts, d, v, ti, ex)
    select x.c, x.id, x.ts, coalesce(x.d, 0), coalesce(x.v, 0), left(coalesce(x.ti, ''), 100), coalesce(x.ex, 0)
    from jsonb_to_recordset(coalesce(p->'clips', '[]')) as x(c text, id text, ts bigint, d real, v int, ti text, ex smallint)
  on conflict (c, id) do update set v = excluded.v, ts = excluded.ts, ex = excluded.ex, rev = nextval('rev_seq')
    where excluded.v > clips.v or excluded.ex > clips.ex;

  insert into ecoute (c, s, e)
    select x.c, x.s, x.e from jsonb_to_recordset(coalesce(p->'ecoute', '[]')) as x(c text, s bigint, e bigint)
  on conflict (c, s) do update set e = excluded.e, rev = nextval('rev_seq')
    where excluded.e > ecoute.e;

  insert into switches (u, d, a, b, n)
    select x.u, x.d, x.a, x.b, x.n from jsonb_to_recordset(coalesce(p->'switches', '[]')) as x(u text, d text, a text, b text, n int)
  on conflict (u, d, a, b) do update set n = switches.n + excluded.n, rev = nextval('rev_seq');

  if p ? 'status' then
    update collector_status set
      last_seen = (p->'status'->>'last_seen')::bigint,
      started = coalesce((p->'status'->>'started')::bigint, started),
      tracked_ms = tracked_ms + coalesce((p->'status'->>'tracked_inc')::bigint, 0),
      info = coalesce(p->'status'->'info', info),
      api = p->'status'->>'api',
      version = p->'status'->>'version',
      db_mb = coalesce((p->'status'->>'db_mb')::int, db_mb),
      retention = coalesce(p->'status'->'retention', retention)
    where id = 1;
  end if;
end $$;

-- Ménage : appelé toutes les heures par le collecteur.
-- 1.6.11 : durées réglables aussi pour les événements et les relevés de viewers (joursEvenements, joursReleves).
-- 1.6.12 : ménage PAR PAQUETS. Une seule instruction qui supprimait un jour entier de présences (plusieurs centaines de milliers de
--   lignes, trois index à mettre à jour) dépassait la limite de temps de l'API (« statement timeout », code 57014) : le ménage
--   échouait, la base ne se vidait plus et grossissait jusqu'aux 500 Mo de l'offre gratuite. Chaque appel supprime maintenant au plus
--   max_rows lignes par table et renvoie le nombre de lignes supprimées ; le collecteur le rappelle tant qu'il renvoie plus de 0.
--   (Un ancien collecteur qui l'appelle sans boucler garde un ménage correct, mais plus lent : max_rows lignes par table et par heure.)
drop function if exists cleanup(int, int);
drop function if exists cleanup(int, int, int, int);
create or replace function cleanup(days_minutes int default 14, days_presence int default 21,
                                   days_events int default 60, days_snaps int default 30,
                                   max_rows int default 100000) returns bigint
language plpgsql set search_path = public, pg_catalog as $$
declare
  now_ms bigint := (extract(epoch from now())*1000)::bigint;
  day_pres text := to_char(now() - make_interval(days => days_presence), 'YYYY-MM-DD');
  day_words text := to_char(now() - interval '30 days', 'YYYY-MM-DD');
  k bigint; total bigint := 0;
begin
  with x as (delete from minutes where ctid in (select ctid from minutes where t < now_ms - days_minutes::bigint*86400000 limit max_rows) returning 1) select count(*) into k from x; total := total + k;
  with x as (delete from presence where ctid in (select ctid from presence where d < day_pres limit max_rows) returning 1) select count(*) into k from x; total := total + k;
  with x as (delete from switches where ctid in (select ctid from switches where d < day_pres limit max_rows) returning 1) select count(*) into k from x; total := total + k; -- même durée que les présences
  with x as (delete from snaps where ctid in (select ctid from snaps where t < now_ms - days_snaps::bigint*86400000 limit max_rows) returning 1) select count(*) into k from x; total := total + k;
  with x as (delete from events where ctid in (select ctid from events where t < now_ms - days_events::bigint*86400000 limit max_rows) returning 1) select count(*) into k from x; total := total + k;
  with x as (delete from words where ctid in (select ctid from words where d < day_words limit max_rows) returning 1) select count(*) into k from x; total := total + k;
  with x as (delete from vods where ctid in (select ctid from vods where start < now_ms - 30::bigint*86400000 limit max_rows) returning 1) select count(*) into k from x; total := total + k;
  with x as (delete from chan_meta where ctid in (select ctid from chan_meta where t < now_ms - 60::bigint*86400000 limit max_rows) returning 1) select count(*) into k from x; total := total + k;
  with x as (delete from clips where ctid in (select ctid from clips where ts < now_ms - 30::bigint*86400000 limit max_rows) returning 1) select count(*) into k from x; total := total + k;
  with x as (delete from ecoute where ctid in (select ctid from ecoute where e < now_ms - 60::bigint*86400000 limit max_rows) returning 1) select count(*) into k from x; total := total + k;
  with x as (delete from ingested_batches where ctid in (select ctid from ingested_batches where at < now_ms - 3::bigint*86400000 limit max_rows) returning 1) select count(*) into k from x; total := total + k;
  return total;
end $$;

-- Taille de la base en Mo (l'offre gratuite de Supabase s'arrête à 500 Mo)
create or replace function db_size_mb() returns int
language sql stable set search_path = public, pg_catalog as $$
  select (pg_database_size(current_database()) / 1048576)::int
$$;

-- Code du tableau de bord : le collecteur l'enregistre (empreinte seulement) au démarrage
create or replace function set_board_code(code text) returns void
language sql set search_path = public, pg_catalog as $$
  insert into private_settings (k, v) values ('board_code', encode(sha256(convert_to(code, 'UTF8')), 'hex'))
  on conflict (k) do update set v = excluded.v
$$;

create or replace function check_board_code(code text) returns void
language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if code is null or length(code) < 8 or not exists (
    select 1 from private_settings where k = 'board_code' and v = encode(sha256(convert_to(code, 'UTF8')), 'hex')
  ) then
    raise exception 'code du tableau de bord invalide' using errcode = '42501';
  end if;
end $$;

-- Ajout / retrait de chaînes depuis le tableau de bord : seulement avec le code (100 chaînes au maximum)
create or replace function add_channels(code text, list text[]) returns int
language plpgsql security definer set search_path = public, pg_catalog as $$
declare n int;
begin
  perform check_board_code(code);
  insert into channels (c)
    select s.x from (select distinct lower(trim(x)) as x from unnest(list) as x) s
    where s.x ~ '^[a-z0-9_]{2,25}$' and not exists (select 1 from channels where channels.c = s.x)
    limit greatest(0, 100 - (select count(*) from channels))
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function remove_channels(code text, list text[]) returns int
language plpgsql security definer set search_path = public, pg_catalog as $$
declare n int;
begin
  perform check_board_code(code);
  delete from channels where c = any (select lower(trim(x)) from unnest(list) as x);
  get diagnostics n = row_count;
  return n;
end $$;

-- ============================================================
-- PROCÉDURE DE ROLLUP QUOTIDIENNE
-- ============================================================

-- Exécute l'agrégation quotidienne pour une date cible (format AAAA-MM-JJ)
-- Inclut le nettoyage des données brutes > 48h (switches_raw = presence + switches)
-- Clés primaires composites empêchent la duplication lors de ré-exécutions
create or replace function run_daily_overlap_rollup(target_date date default now()::date) returns void
language plpgsql set search_path = public, pg_catalog as $$
declare
  d text := to_char(target_date, 'YYYY-MM-DD');
  d_prev text := to_char(target_date - interval '1 day', 'YYYY-MM-DD');
  cutoff_48h bigint := (extract(epoch from (now() - interval '48 hours'))*1000)::bigint;
  start_ms bigint := (extract(epoch from target_date)*1000)::bigint;
  end_ms bigint := (extract(epoch from (target_date + interval '1 day'))*1000)::bigint;
  lock_key bigint := hashtext(target_date::text); -- empêche les exécutions concurrentes
  acquired boolean;
begin
  -- Vérifier si un rollup est déjà en cours pour cette date
  acquired := pg_try_advisory_lock(lock_key);
  if not acquired then
    return; -- Un rollup est déjà en cours, on s'abandonne
  end if;

  -- 1. daily_switches_rollup : agrégation des switches a→b par jour
  -- Utilise ON CONFLICT pour être idempotent (ré-exécution sans duplication)
  -- Les switches raid sont identifiés par la présence d'un événement raid entre a et b
  insert into daily_switches_rollup (d, a, b, viewers, switches, organic_switch_count, raid_switch_count)
  select
    s.d, s.a, s.b,
    count(distinct s.u) as viewers,
    sum(s.n) as switches,
    sum(s.n) as organic_switch_count,  -- sera ajusté si un raid est détecté
    0 as raid_switch_count
  from switches s
  where s.d = d
  group by s.d, s.a, s.b
  on conflict (d, a, b) do update set
    viewers = excluded.viewers,
    switches = excluded.switches,
    organic_switch_count = excluded.organic_switch_count,
    raid_switch_count = excluded.raid_switch_count;

  -- Ajuster les counts raid pour les paires ayant eu un événement raid ce jour-là
  -- Un événement raid de a vers b (from_channel=a, to_channel=b dans raid_events) marque les switches a→b comme raid
  -- Sans timestamps précis sur les switches, on suppose que tous les switches sont raid
  with raid_events_today as (
    select re.from_channel as raider, re.to_channel as target, re.viewers as viewers
    from raid_events re
    where to_char((re.ts/1000)::timestamp at time zone 'Europe/Paris', 'YYYY-MM-DD') = d
  )
  update daily_switches_rollup r
  set organic_switch_count = greatest(0, r.switches - re.viewers),
      raid_switch_count = re.viewers
  from raid_events_today re
  where r.a = re.raider and r.b = re.target and r.d = d;

  -- 2. daily_streamer_rollup : agrégation par streamer et par jour
  insert into daily_streamer_rollup (d, c, unique_chatters, total_messages, minutes_live, peak_viewers, avg_viewers)
  select
    p.d as d,
    p.c as c,
    count(distinct p.u) as unique_chatters,
    sum(p.n) as total_messages,
    count(distinct m.t / 60000) as minutes_live,
    max(s.v) as peak_viewers,
    case when count(s.v) > 0 then sum(s.v)::int / count(s.v) else 0 end as avg_viewers
  from presence p
  left join minutes m on m.c = p.c and m.t >= (extract(epoch from p.d::timestamp)*1000)::bigint
                      and m.t < (extract(epoch from (p.d::timestamp + interval '1 day'))*1000)::bigint
  left join snaps s on s.c = p.c and s.t >= (extract(epoch from p.d::timestamp)*1000)::bigint
                      and s.t < (extract(epoch from (p.d::timestamp + interval '1 day'))*1000)::bigint
  where p.d = d
  group by p.d, p.c
  on conflict (d, c) do update set
    unique_chatters = excluded.unique_chatters,
    total_messages = excluded.total_messages,
    minutes_live = excluded.minutes_live,
    peak_viewers = excluded.peak_viewers,
    avg_viewers = excluded.avg_viewers;

  -- 3. daily_overlap_matrix : viewers communs entre paires de chaînes (a < b)
  -- Pour chaque paire de chaînes (a,b) avec a < b, on compte :
  -- - shared_viewers : viewers ayant chaté sur LES DEUX chaînes ce jour-là
  -- - a_only : viewers seulement sur a (pas sur b)
  -- - b_only : viewers seulement sur b (pas sur a)
  with channel_pairs as (
    select distinct p1.d, p1.c as a, p2.c as b
    from presence p1
    join presence p2 on p2.d = p1.d and p2.c > p1.c
    where p1.d = d
  ),
  all_viewers as (
    select u, d, c from presence where d = d
  ),
  paired_viewers as (
    select
      cp.d,
      cp.a,
      cp.b,
      av.u,
      max(case when av.c = cp.a then 1 else 0 end) as on_a,
      max(case when av.c = cp.b then 1 else 0 end) as on_b
    from channel_pairs cp
    join all_viewers av on av.d = cp.d and av.c in (cp.a, cp.b)
    group by cp.d, cp.a, cp.b, av.u
  )
  insert into daily_overlap_matrix (d, a, b, shared_viewers, a_only, b_only)
  select
    d, a, b,
    count(*) filter (where on_a = 1 and on_b = 1) as shared_viewers,
    count(*) filter (where on_a = 1 and on_b = 0) as a_only,
    count(*) filter (where on_a = 0 and on_b = 1) as b_only
  from paired_viewers
  group by d, a, b
  on conflict (d, a, b) do update set
    shared_viewers = excluded.shared_viewers,
    a_only = excluded.a_only,
    b_only = excluded.b_only;

  -- 4. NETTOYAGE : suppression des données brutes > 48h (presence + switches)
  -- Présence : où f (premier message) < cutoff_48h
  delete from presence
  where f < cutoff_48h;

  -- Switches : où le switch est ancien (basé sur date d)
  -- On garde les switches des 2 derniers jours complets + jour en cours
  delete from switches
  where d < to_char(now() - interval '2 days', 'YYYY-MM-DD');

  -- Note : minutes, snaps, events, words sont nettoyés par la fonction cleanup() horaire
  -- qui a des durées de rétention plus longues (14j, 30j, 60j, 30j respectivement)
  perform pg_advisory_unlock(lock_key);
end $$;

-- Fonction helper pour lancer le rollup sur les 30 derniers jours (backfill)
create or replace function backfill_daily_rollup(days int default 30) returns void
language plpgsql set search_path = public, pg_catalog as $$
declare
  i int;
  d date;
begin
  for i in 1..days loop
    d := (now()::date - i);
    perform run_daily_overlap_rollup(d);
  end loop;
end $$;

-- Insertion d'événements de raid (Étape 2 : table raid_events séparée)
create or replace function ingest_raid(p jsonb) returns void
language plpgsql set search_path = public, pg_catalog as $$
begin
  insert into raid_events (ts, from_channel, to_channel, viewers, unique_raiders)
    select x.ts, x.from_channel, x.to_channel, x.viewers, x.unique_raiders
    from jsonb_to_recordset(coalesce(p->'raids', '[]')) as x(
      ts bigint, from_channel text, to_channel text, viewers int, unique_raiders int
    )
    on conflict (ts, from_channel, to_channel) do nothing;
end $$;

-- Sécurité : lecture seule pour la clé publique, écriture réservée à la clé secrète du collecteur
alter table presence enable row level security;
alter table minutes enable row level security;
alter table snaps enable row level security;
alter table events enable row level security;
alter table words enable row level security;
alter table vods enable row level security;
alter table chan_meta enable row level security;
alter table clips enable row level security;
alter table ecoute enable row level security;
alter table switches enable row level security;
alter table channels enable row level security;
alter table collector_status enable row level security;
alter table private_settings enable row level security; -- aucune règle : invisible pour la clé publique
alter table ingested_batches enable row level security; -- idem

-- Nouvelles tables de rollup : lecture publique, écriture service_role uniquement
alter table daily_switches_rollup enable row level security;
alter table daily_streamer_rollup enable row level security;
alter table daily_overlap_matrix enable row level security;
alter table rosters enable row level security;
alter table roster_streamers enable row level security;
alter table raid_events enable row level security;

drop policy if exists read_all on presence;         create policy read_all on presence for select to anon, authenticated using (true);
drop policy if exists read_all on minutes;          create policy read_all on minutes for select to anon, authenticated using (true);
drop policy if exists read_all on snaps;            create policy read_all on snaps for select to anon, authenticated using (true);
drop policy if exists read_all on events;           create policy read_all on events for select to anon, authenticated using (true);
drop policy if exists read_all on words;            create policy read_all on words for select to anon, authenticated using (true);
drop policy if exists read_all on vods;             create policy read_all on vods for select to anon, authenticated using (true);
drop policy if exists read_all on chan_meta;        create policy read_all on chan_meta for select to anon, authenticated using (true);
drop policy if exists read_all on clips;            create policy read_all on clips for select to anon, authenticated using (true);
drop policy if exists read_all on ecoute;           create policy read_all on ecoute for select to anon, authenticated using (true);
drop policy if exists read_all on switches;         create policy read_all on switches for select to anon, authenticated using (true);
drop policy if exists read_all on collector_status; create policy read_all on collector_status for select to anon, authenticated using (true);
drop policy if exists read_all on channels;         create policy read_all on channels for select to anon, authenticated using (true);
-- Depuis la 1.3, la clé publique ne peut plus modifier la liste directement : il faut le code (add_channels / remove_channels)
drop policy if exists add_chan on channels;
drop policy if exists del_chan on channels;

-- Politiques pour les nouvelles tables
drop policy if exists read_all on daily_switches_rollup; create policy read_all on daily_switches_rollup for select to anon, authenticated using (true);
drop policy if exists read_all on daily_streamer_rollup; create policy read_all on daily_streamer_rollup for select to anon, authenticated using (true);
drop policy if exists read_all on daily_overlap_matrix; create policy read_all on daily_overlap_matrix for select to anon, authenticated using (true);
drop policy if exists read_all on rosters; create policy read_all on rosters for select to anon, authenticated using (true);
drop policy if exists read_all on roster_streamers; create policy read_all on roster_streamers for select to anon, authenticated using (true);
drop policy if exists read_all on raid_events; create policy read_all on raid_events for select to anon, authenticated using (true);

revoke all on function ingest(jsonb) from public, anon, authenticated;
revoke all on function cleanup(int, int, int, int, int) from public, anon, authenticated;
revoke all on function db_size_mb() from public, anon, authenticated;
revoke all on function set_board_code(text) from public, anon, authenticated;
revoke all on function check_board_code(text) from public, anon, authenticated;
revoke all on function add_channels(text, text[]) from public;
revoke all on function remove_channels(text, text[]) from public;
revoke all on function run_daily_overlap_rollup(date) from public, anon, authenticated;
revoke all on function backfill_daily_rollup(int) from public, anon, authenticated;
grant execute on function ingest(jsonb) to service_role;
grant execute on function ingest_raid(jsonb) to service_role;
grant execute on function cleanup(int, int, int, int, int) to service_role;
grant execute on function db_size_mb() to service_role;
grant execute on function set_board_code(text) to service_role;
grant execute on function run_daily_overlap_rollup(date) to service_role;
grant execute on function backfill_daily_rollup(int) to service_role;
grant execute on function add_channels(text, text[]) to anon, authenticated, service_role;
grant execute on function remove_channels(text, text[]) to anon, authenticated, service_role;

-- Droits explicites (Supabase en donne déjà par défaut ; on les resserre)
revoke insert, update, delete on presence, minutes, snaps, events, words, vods, chan_meta, clips, ecoute, switches, collector_status, channels from anon, authenticated;
revoke all on private_settings, ingested_batches from anon, authenticated;
revoke insert, update, delete on daily_switches_rollup, daily_streamer_rollup, daily_overlap_matrix, rosters, roster_streamers, raid_events from anon, authenticated;
grant select on presence, minutes, snaps, events, words, vods, chan_meta, clips, ecoute, switches, collector_status, channels to anon, authenticated;
grant select on daily_switches_rollup, daily_streamer_rollup, daily_overlap_matrix, rosters, roster_streamers, raid_events to anon, authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;