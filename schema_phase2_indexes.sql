-- Phase 2: Indexs pour montée en charge

-- Index pour les queries de présence par chaîne et jour
create index if not exists presence_c_d_idx on presence (c, d);

-- Index pour les snaps par chaîne et timestamp
create index if not exists snaps_c_t_idx on snaps (c, t);

-- Index pour les events par type et timestamp
create index if not exists events_t_type_idx on events (t, type);

-- Fonction pour ajouter des streamers avec validation
create or replace function add_streamers_batch(list text[])
returns table(supported int, rejected text[])
language plpgsql as $$
declare
  added int := 0;
  rejected text[] := '{}';
  pattern text := '^[a-z0-9_]{2,25}$';
  chan text;
begin
  foreach chan in array list loop
    if chan ~ pattern and not exists (select 1 from channels where c = chan) then
      insert into channels (c) values (chan);
      added := added + 1;
    else
      rejected := array_append(rejected, chan);
    end if;
  end loop;
  return query select added, rejected;
end $$;