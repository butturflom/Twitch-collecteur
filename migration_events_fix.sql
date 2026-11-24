-- Migration : Corriger les erreurs 21000 sur events
-- Problème : L'INSERT dans events n'utilisait pas ON CONFLICT,
-- donc les doubles envois (après timeout) causaient l'erreur 21000.
-- Solution : Ajouter une contrainte unique et mettre à jour l'insertion.

-- La table events utilise (t, c, type, frm) comme identifiant naturel
-- t = timestamp (ms), c = chaîne, type = type d'événement, frm = chaîne source (pour les raids/switches)

-- Créer une contrainte unique pour la déduplication
alter table events
  drop constraint if exists events_unique,
  add constraint events_unique unique (t, c, type, frm);

-- Mettre à jour la fonction ingest pour utiliser ON CONFLICT DO NOTHING sur events
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
    from jsonb_to_recordset(coalesce(p->'events', '[]')) as x(t bigint, c text, type text, frm text, n int)
  on conflict (t, c, type, frm) do nothing;

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

-- Index pour accélérer les vérifications de duplication
create index if not exists events_unique_idx on events (t, c, type, frm);