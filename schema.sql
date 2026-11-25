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
-- 24/11/2026 : doublon exact (non unique) de la contrainte events_unique (t, c, type, frm), créé par migration_events_fix.sql. 9 Mo pour rien.
drop index if exists events_unique_idx;
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

-- Esquisses HyperLogLog des viewers par chaîne et par jour (25/11/2026) : permettent de compter des viewers UNIQUES sur 7, 30 ou
-- 90 jours (Net Reach d'un roster, viewers uniques d'une chaîne) alors que « presence » ne garde qu'un jour. Des viewers uniques ne
-- s'additionnent pas d'un jour à l'autre ; deux esquisses, elles, se fusionnent (maximum registre par registre) et donnent la
-- réunion. 2 048 registres d'un octet (≈ 2 Ko par chaîne et par jour, ≈ 15 Mo pour 90 jours de 85 chaînes) : erreur type de 2,3 %.
-- Une esquisse ne contient aucune empreinte de viewer et ne permet pas de retrouver qui a écrit.
create table if not exists daily_hll (
  d text not null,                          -- jour (AAAA-MM-JJ, heure de Paris)
  c text not null,                          -- chaîne
  regs bytea not null,                      -- 2 048 octets : pour chaque seau, le plus grand rang observé (0 = seau vide)
  primary key (d, c)
);

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
-- 24/11/2026 : les index *_rev gonflent tout seuls. Chaque mise à jour d'une ligne (présence : à chaque envoi) lui donne un nouveau
--   rev, toujours plus grand ; la place libérée dans les vieilles pages de l'index n'est jamais réutilisée. presence_rev atteignait
--   90 Mo pour 470 000 lignes (10 Mo une fois reconstruit). Cette fonction reconstruit un index *_rev quand il pèse plus de 16 Mo ET
--   plus de 3 fois sa taille normale (environ 22 octets par ligne). Appelée à la fin de cleanup(), donc au plus une fois par heure ;
--   juste après une reconstruction l'index est petit, les appels suivants ne font rien. REINDEX bloque les écritures de la table
--   1 à 2 s ; lock_timeout évite d'attendre derrière un envoi en cours (on réessaiera à l'heure suivante). security definer : seul
--   le propriétaire des tables peut les réindexer, et service_role ne l'est pas.
create or replace function rebuild_bloated_rev_indexes() returns int
language plpgsql security definer set search_path = public, pg_catalog set lock_timeout = '3s' as $$
declare r record; n int := 0;
begin
  for r in
    select i.relname as idx, pg_relation_size(i.oid) as sz, t.reltuples
    from pg_index x join pg_class i on i.oid = x.indexrelid join pg_class t on t.oid = x.indrelid
    where t.relnamespace = 'public'::regnamespace and i.relname like '%\_rev'
  loop
    if r.sz > 16 * 1024 * 1024 and r.sz > 3 * greatest(r.reltuples, 0) * 22 then
      begin
        execute format('reindex index %I', r.idx);
        n := n + 1;
      exception when others then
        raise notice 'reindex % impossible : %', r.idx, sqlerrm; -- verrou pris, on réessaiera
      end;
    end if;
  end loop;
  return n;
end $$;

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
  -- Index *_rev gonflés : voir rebuild_bloated_rev_indexes(). Pas de reconstruction si cette passe a supprimé des lignes : le
  -- collecteur va rappeler cleanup() et l'index serait reconstruit avant la fin du ménage.
  if total = 0 then perform rebuild_bloated_rev_indexes(); end if;
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

-- Agrège UNE journée (heure de Paris) dans daily_switches_rollup, daily_streamer_rollup et daily_overlap_matrix.
-- Rejouable : chaque table est vidée pour ce jour puis remplie (pas de reste si une paire disparaît).
-- Lancée chaque nuit par pg_cron (scripts/cron_rollup.sql) pour la veille, AVANT que cleanup() ne supprime les présences de ce
-- jour : avec joursPresence = 1, la veille reste en base jusqu'au lendemain soir (cleanup garde d >= aujourd'hui - 1, en UTC).
-- 24/11/2026 : réécrite. L'ancienne version ne pouvait pas tourner : variable « d » homonyme des colonnes (erreur « ambiguous »),
--   conversion bigint → timestamp invalide pour les raids, auto-jointure de presence sur le seul jour (≈ 10^10 lignes), jointures
--   presence × minutes × snaps qui multipliaient les messages, et suppression des présences > 48 h qui court-circuitait la rétention
--   réglée dans config.json (c'est le rôle de cleanup(), plus de suppression ici).
create or replace function run_daily_overlap_rollup(target_date date default ((now() at time zone 'Europe/Paris')::date - 1)) returns void
language plpgsql set search_path = public, pg_catalog as $$
declare
  jour text := to_char(target_date, 'YYYY-MM-DD');
  -- bornes du jour en heure de Paris, en millisecondes (minutes.t et snaps.t)
  t0 bigint := (extract(epoch from (target_date::timestamp at time zone 'Europe/Paris'))*1000)::bigint;
  t1 bigint := (extract(epoch from ((target_date + 1)::timestamp at time zone 'Europe/Paris'))*1000)::bigint;
begin
  -- une seule exécution à la fois pour un même jour ; verrou libéré à la fin de la transaction, même en cas d'erreur
  if not pg_try_advisory_xact_lock(hashtext('rollup:' || jour)) then return; end if;
  -- jour déjà purgé par cleanup() : on garde le rollup existant au lieu de l'écraser par du vide (backfill sur une longue période)
  if not exists (select 1 from presence where presence.d = jour) then return; end if;

  -- 1. Passages a → b. raid_switch_count : au plus les viewers envoyés par les raids a → b du jour (même chaîne, même jour :
  --    on ne sait pas dire quel passage vient du raid, c'est une borne haute).
  delete from daily_switches_rollup where daily_switches_rollup.d = jour;
  insert into daily_switches_rollup (d, a, b, viewers, switches, organic_switch_count, raid_switch_count)
  select jour, s.a, s.b, count(*), sum(s.n),
         sum(s.n) - least(sum(s.n), coalesce(max(r.v), 0)),
         least(sum(s.n), coalesce(max(r.v), 0))
  from switches s
  left join (select from_channel, to_channel, sum(viewers)::bigint as v from raid_events
             where ts >= t0 and ts < t1 group by 1, 2) r on r.from_channel = s.a and r.to_channel = s.b
  where s.d = jour
  group by s.a, s.b;

  -- 2. Par chaîne. Chaque source est agrégée à part puis jointe : pas de multiplication des lignes.
  --    minutes_live = minutes où le chat de la chaîne a été lu (une ligne par minute dans « minutes ») ;
  --    pic et moyenne de viewers sur les relevés « en live » seulement.
  delete from daily_streamer_rollup where daily_streamer_rollup.d = jour;
  insert into daily_streamer_rollup (d, c, unique_chatters, total_messages, minutes_live, peak_viewers, avg_viewers)
  select jour, p.c, p.chatters, p.msgs, coalesce(m.mins, 0), coalesce(s.peak, 0), coalesce(s.avg, 0)
  from (select c, count(distinct u) as chatters, sum(n) as msgs from presence where presence.d = jour group by c) p
  left join (select c, count(*) as mins from minutes where t >= t0 and t < t1 group by c) m on m.c = p.c
  left join (select c, max(v) as peak, round(avg(v))::int as avg from snaps where t >= t0 and t < t1 and live = 1 group by c) s on s.c = p.c;

  -- 3. Viewers communs par paire (a < b), uniquement les paires qui en ont au moins un.
  --    On part des couples (viewer, chaîne) du jour ; un viewer présent sur k chaînes donne k(k-1)/2 paires.
  delete from daily_overlap_matrix where daily_overlap_matrix.d = jour;
  with uc as (select distinct u, c from presence where presence.d = jour),
       tot as (select c, count(*) as n from uc group by c),
       pairs as (select x.c as a, y.c as b, count(*) as shared
                 from uc x join uc y on y.u = x.u and y.c > x.c
                 group by x.c, y.c)
  insert into daily_overlap_matrix (d, a, b, shared_viewers, a_only, b_only)
  select jour, pr.a, pr.b, pr.shared, ta.n - pr.shared, tb.n - pr.shared
  from pairs pr join tot ta on ta.c = pr.a join tot tb on tb.c = pr.b;
end $$;

-- Rattrapage : agrège les « days » derniers jours terminés (ceux dont il reste des présences en base).
create or replace function backfill_daily_rollup(days int default 30) returns void
language plpgsql set search_path = public, pg_catalog as $$
declare i int; today date := (now() at time zone 'Europe/Paris')::date;
begin
  for i in 1..days loop
    perform run_daily_overlap_rollup(today - i);
  end loop;
end $$;

-- Historique d'une chaîne pour le tableau de bord (« Par chaîne » → Historique), lu dans les rollups quotidiens.
-- 25/11/2026. Lecture seule, avec les droits de l'appelant : la clé publique lit déjà ces tables (politique read_all) ;
-- la fonction évite seulement au navigateur de télécharger des milliers de lignes page par page.
--   days   : un objet par jour agrégé (viewers actifs, messages, minutes lues, pic et moyenne de viewers, passages sortants et entrants)
--   out/in : les trajets les plus fréquents sur la période, vers et depuis les autres chaînes (somme des passages ;
--            un même viewer revenu plusieurs jours compte plusieurs fois, on ne sait pas dédoublonner d'un jour à l'autre)
create or replace function channel_history(ch text, days int default 30) returns jsonb
language sql stable set search_path = public, pg_catalog as $$
  with p as (select to_char((now() at time zone 'Europe/Paris')::date - least(greatest(days, 1), 366), 'YYYY-MM-DD') as d0),
  sw as (select * from daily_switches_rollup, p where daily_switches_rollup.d >= p.d0 and (a = ch or b = ch))
  select jsonb_build_object(
    'days', coalesce((
      select jsonb_agg(jsonb_build_object('d', s.d, 'chatters', s.unique_chatters, 'msgs', s.total_messages, 'mins', s.minutes_live,
                                          'peak', s.peak_viewers, 'avg', s.avg_viewers,
                                          'out', coalesce((select sum(switches) from sw where sw.d = s.d and sw.a = ch), 0),
                                          'in', coalesce((select sum(switches) from sw where sw.d = s.d and sw.b = ch), 0)) order by s.d)
      from daily_streamer_rollup s, p where s.c = ch and s.d >= p.d0), '[]'),
    'out', coalesce((select jsonb_agg(x order by x.n desc) from (
      select b as c, sum(switches)::int as n, sum(raid_switch_count)::int as raid from sw where a = ch group by b order by 2 desc limit 8) x), '[]'),
    'in', coalesce((select jsonb_agg(x order by x.n desc) from (
      select a as c, sum(switches)::int as n, sum(raid_switch_count)::int as raid from sw where b = ch group by a order by 2 desc limit 8) x), '[]'))
$$;

-- Fidélité du chat d'une chaîne (« Sticky-Factor » du plan V2) pour « Par chaîne » → Historique, lue dans les rollups quotidiens.
-- 25/11/2026. Lecture seule, avec les droits de l'appelant (comme channel_history).
--   Par jour agrégé : les viewers actifs (unique_chatters) et les viewers partis, c'est-à-dire qui ont écrit chez une autre chaîne
--   suivie moins de 3 h après. « Partis » = somme des viewers distincts par destination, plafonnée aux viewers actifs : un viewer parti
--   vers deux chaînes compte deux fois, donc le score est très légèrement sous-estimé (0,4 point au plus, mesuré le 24/11 sur 14 chaînes).
--   Le score sur 100 se calcule dans le tableau de bord : 100 × (1 − partis / actifs).
--   net : quartiles du score parmi les chaînes suivies qui ont au moins 200 viewers actifs sur la période (n = leur nombre). Le tableau
--   de bord compare la chaîne à ces quartiles : les seuils fixes du plan (vert au-dessus de 70, rouge sous 40) donneraient vert à
--   toutes les chaînes (minimum observé le 24/11 sur 60 chaînes : 72).
create or replace function channel_stickiness(ch text, days int default 30) returns jsonb
language sql stable set search_path = public, pg_catalog as $$
  with p as (select to_char((now() at time zone 'Europe/Paris')::date - least(greatest(days, 1), 366), 'YYYY-MM-DD') as d0),
  lv as (select s.d, s.a, sum(s.viewers)::int as v from daily_switches_rollup s, p where s.d >= p.d0 group by s.d, s.a),
  pd as (select r.d, r.c, r.unique_chatters as actives, least(coalesce(lv.v, 0), r.unique_chatters) as leavers
         from daily_streamer_rollup r join p on r.d >= p.d0 left join lv on lv.d = r.d and lv.a = r.c
         where r.unique_chatters > 0),
  pc as (select c, sum(actives)::int as actives, sum(leavers)::int as leavers from pd group by c),
  net as (select 100 * (1 - leavers::numeric / actives) as score from pc where actives >= 200)
  select jsonb_build_object(
    'days', coalesce((select jsonb_agg(jsonb_build_object('d', d, 'actives', actives, 'leavers', leavers) order by d) from pd where c = ch), '[]'),
    'actives', coalesce((select actives from pc where c = ch), 0),
    'leavers', coalesce((select leavers from pc where c = ch), 0),
    'net', jsonb_build_object(
      'n', (select count(*) from net),
      'q1', (select round(percentile_cont(0.25) within group (order by score)::numeric, 1) from net),
      'med', (select round(percentile_cont(0.5) within group (order by score)::numeric, 1) from net),
      'q3', (select round(percentile_cont(0.75) within group (order by score)::numeric, 1) from net)))
$$;

-- Rythme des chaînes (alertes « décolle » / « ralentit » de la Vue d'ensemble), lu dans les rollups quotidiens.
-- 25/11/2026. Lecture seule. Pour chaque chaîne qui a au moins 14 journées agrégées : la moyenne des viewers actifs (unique_chatters) des
-- 7 dernières journées (recent), celle des journées d'avant (base, jusqu'à 3 semaines) et son écart type (sd). Le tableau de bord
-- décide s'il y a une alerte : écart d'au moins 15 % ET hors des variations habituelles (écart de plus de 2 erreurs types), ce qui
-- demande un changement plus net aux petites chaînes, plus irrégulières.
create or replace function channels_rhythm(days int default 28) returns jsonb
language sql stable set search_path = public, pg_catalog as $$
  with p as (select to_char((now() at time zone 'Europe/Paris')::date - least(greatest(days, 14), 120), 'YYYY-MM-DD') as d0),
  x as (select s.c, s.unique_chatters as v, row_number() over (partition by s.c order by s.d desc) as k
        from daily_streamer_rollup s, p where s.d >= p.d0 and s.unique_chatters > 0),
  r as (select c,
          count(*) filter (where k <= 7) as nr, avg(v) filter (where k <= 7) as recent,
          count(*) filter (where k > 7) as nb, avg(v) filter (where k > 7) as base, stddev_samp(v) filter (where k > 7) as sd
        from x group by c)
  select coalesce(jsonb_agg(jsonb_build_object('c', c, 'nr', nr, 'nb', nb, 'recent', round(recent, 1), 'base', round(base, 1), 'sd', round(coalesce(sd, 0), 1))), '[]')
  from r where nr >= 7 and nb >= 7
$$;

-- Estimation d'un HyperLogLog à 2 048 registres : inv = somme des 2^-registre, zeros = registres vides.
-- Petits comptes (≤ 5 120) : comptage linéaire, plus exact.
create or replace function hll_card(inv float8, zeros int) returns bigint
language sql immutable as $$
  select round(case when e <= 5120 and zeros > 0 then 2048 * ln(2048.0 / zeros) else e end)::bigint
  from (select 0.72092 * 2048.0 * 2048.0 / inv as e) t
$$;

-- Construit les esquisses d'une journée (heure de Paris) depuis « presence ». Rejouable. Ne fait rien si les présences du jour
-- ont déjà été purgées (on garde l'esquisse existante). Chaque pseudo est haché (MD5 de son empreinte) : 11 bits choisissent le
-- registre, le rang du premier 1 dans les 53 bits suivants est gardé s'il est plus grand.
-- Lancée chaque nuit par pg_cron (scripts/cron_rollup.sql), après le rollup, pour la veille.
create or replace function build_daily_hll(jour text) returns void
language plpgsql set search_path = public, pg_catalog as $$
begin
  if not exists (select 1 from presence where presence.d = jour) then return; end if;
  delete from daily_hll where daily_hll.d = jour;
  insert into daily_hll (d, c, regs)
  with h as (
    select z.c, ('x' || substr(md5(z.u), 1, 16))::bit(64) as b
    from (select distinct u, c from presence where presence.d = jour) z
  ),
  r as (
    select q.c, q.j, max(case when q.pos = 0 then 54 else q.pos end) as m
    from (select h.c, substring(h.b from 1 for 11)::bit(11)::int as j,
                 position('1' in substring(h.b from 12 for 53)::text) as pos from h) q
    group by q.c, q.j
  )
  select jour, ch.c, decode(string_agg(lpad(to_hex(coalesce(r.m, 0)), 2, '0'), '' order by s.j), 'hex')
  from (select distinct h.c from h) ch
  cross join generate_series(0, 2047) as s(j)
  left join r on r.c = ch.c and r.j = s.j
  group by ch.c;
  -- Esquisse « réseau » : réunion de toutes les chaînes du jour (c = '*'), pour les viewers uniques du réseau entier sur 7, 30 ou 90
  -- jours sans lire 100 chaînes × 90 jours. Aucune chaîne ne s'appelle « * » ; period_reach(array['*'], 30) la lit.
  insert into daily_hll (d, c, regs)
  select jour, '*', decode(string_agg(lpad(to_hex(x.m), 2, '0'), '' order by x.j), 'hex')
  from (select s.j, max(get_byte(h.regs, s.j)) as m
        from daily_hll h cross join generate_series(0, 2047) as s(j)
        where h.d = jour and h.c <> '*' group by s.j) x;
end $$;

-- Viewers uniques sur les « days » derniers jours COMPLETS (aujourd'hui, pas encore agrégé, est exclu), pour une liste de chaînes
-- (30 au plus : chaque jour de chaque chaîne est lu registre par registre).
--   net   : viewers uniques de la réunion des chaînes (Net Reach)      chans : viewers uniques de chaque chaîne
--   days  : nombre de jours qui ont une esquisse dans la fenêtre (peut être plus petit que « days » au début de l'historique)
-- Estimations à ± 2,3 % (1 écart type). Pas d'exclusifs ni de paires : une différence de deux estimations serait trop bruitée.
create or replace function period_reach(chans text[], days int default 30) returns jsonb
language sql stable set search_path = public, pg_catalog as $$
  with p as (select (now() at time zone 'Europe/Paris')::date as today),
  w as (select to_char(p.today - least(greatest(days, 1), 366), 'YYYY-MM-DD') as d0, to_char(p.today, 'YYYY-MM-DD') as d1 from p),
  src as (select h.c, h.d, h.regs from daily_hll h, w where h.c = any(chans[1:30]) and h.d >= w.d0 and h.d < w.d1),
  cj as (select src.c, s.j, max(get_byte(src.regs, s.j)) as m from src cross join generate_series(0, 2047) as s(j) group by src.c, s.j),
  per as (select cj.c, hll_card(sum(power(2::float8, -cj.m)), (count(*) filter (where cj.m = 0))::int) as n from cj group by cj.c),
  un as (select hll_card(sum(power(2::float8, -x.m)), (count(*) filter (where x.m = 0))::int) as n
         from (select cj.j, max(cj.m) as m from cj group by cj.j) x)
  select jsonb_build_object(
    'from', (select min(d) from src), 'to', (select max(d) from src), 'days', (select count(distinct d) from src),
    'net', coalesce((select n from un), 0),
    'chans', coalesce((select jsonb_agg(jsonb_build_object('c', per.c, 'n', per.n) order by per.n desc) from per), '[]'))
$$;

-- Historique du réseau pour la Vue d'ensemble, lu dans daily_streamer_rollup (25/11/2026). Lecture seule.
--   days : par jour, messages (exact), audience moyenne cumulée (somme des viewers moyens des chaînes en live : une même personne
--          qui regarde deux lives compte deux fois), nombre de chaînes qui ont été écoutées
--   top  : les 8 chaînes qui ont le plus écrit sur la période, avec leurs viewers moyens (moyenne des jours en live)
-- Les viewers uniques du réseau se lisent à part : period_reach(array['*'], days).
create or replace function network_history(days int default 30) returns jsonb
language sql stable set search_path = public, pg_catalog as $$
  with p as (select to_char((now() at time zone 'Europe/Paris')::date - least(greatest(days, 1), 366), 'YYYY-MM-DD') as d0),
  s as (select r.* from daily_streamer_rollup r, p where r.d >= p.d0)
  select jsonb_build_object(
    'days', coalesce((select jsonb_agg(x order by x.d) from (
      select d, sum(total_messages)::bigint as msgs, sum(avg_viewers)::bigint as avg, (count(*) filter (where minutes_live > 0))::int as chans
      from s group by d) x), '[]'),
    'top', coalesce((select jsonb_agg(x order by x.msgs desc) from (
      select c, sum(total_messages)::bigint as msgs, coalesce(round(avg(avg_viewers) filter (where avg_viewers > 0)), 0)::int as avg
      from s group by c order by 2 desc limit 8) x), '[]'))
$$;

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
alter table daily_hll enable row level security;
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
drop policy if exists read_all on daily_hll; create policy read_all on daily_hll for select to anon, authenticated using (true);
drop policy if exists read_all on rosters; create policy read_all on rosters for select to anon, authenticated using (true);
drop policy if exists read_all on roster_streamers; create policy read_all on roster_streamers for select to anon, authenticated using (true);
drop policy if exists read_all on raid_events; create policy read_all on raid_events for select to anon, authenticated using (true);

revoke all on function ingest(jsonb) from public, anon, authenticated;
revoke all on function cleanup(int, int, int, int, int) from public, anon, authenticated;
revoke all on function db_size_mb() from public, anon, authenticated;
revoke all on function rebuild_bloated_rev_indexes() from public, anon, authenticated;
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
grant execute on function rebuild_bloated_rev_indexes() to service_role;
grant execute on function set_board_code(text) to service_role;
grant execute on function run_daily_overlap_rollup(date) to service_role;
grant execute on function backfill_daily_rollup(int) to service_role;
grant execute on function channel_history(text, int) to anon, authenticated, service_role;
grant execute on function period_reach(text[], int) to anon, authenticated, service_role;
grant execute on function network_history(int) to anon, authenticated, service_role;
revoke all on function build_daily_hll(text) from public, anon, authenticated;
grant execute on function build_daily_hll(text) to service_role;
grant select on daily_hll to anon, authenticated;
grant execute on function add_channels(text, text[]) to anon, authenticated, service_role;
grant execute on function remove_channels(text, text[]) to anon, authenticated, service_role;

-- Droits explicites (Supabase en donne déjà par défaut ; on les resserre)
revoke insert, update, delete on presence, minutes, snaps, events, words, vods, chan_meta, clips, ecoute, switches, collector_status, channels from anon, authenticated;
revoke all on private_settings, ingested_batches from anon, authenticated;
revoke insert, update, delete on daily_hll, daily_switches_rollup, daily_streamer_rollup, daily_overlap_matrix, rosters, roster_streamers, raid_events from anon, authenticated;
grant select on presence, minutes, snaps, events, words, vods, chan_meta, clips, ecoute, switches, collector_status, channels to anon, authenticated;
grant select on daily_switches_rollup, daily_streamer_rollup, daily_overlap_matrix, rosters, roster_streamers, raid_events to anon, authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;