-- Migration : Index pour optimiser les requêtes Phase 2 et Phase 3
-- À exécuter dans l'éditeur SQL Supabase

-- Index pour presence : chaîne + jour (très utilisé dans les agrégats)
create index if not exists presence_c_d_idx on presence (c, d);

-- Index pour presence : chaîne + jour + jeu (pour les requêtes par chaîne et jeu)
create index if not exists presence_c_d_g_idx on presence (c, d, g);

-- Index pour snaps : chaîne + timestamp
create index if not exists snaps_c_t_idx on snaps (c, t);

-- Index pour events : timestamp + type (pour filtrer par type d'événement)
create index if not exists events_t_type_idx on events (t, type);

-- Index pour events : chaîne (pour les requêtes par chaîne)
create index if not exists events_c_idx on events (c);

-- Index pour minutes : chaîne + timestamp
create index if not exists minutes_c_t_idx on minutes (c, t);

-- Index pour words : jour
create index if not exists words_d_idx on words (d);

-- Index pour switches : jour
create index if not exists switches_d_idx on switches (d);

-- Index pour daily_rollup : chaîne + jour (pour Phase 3)
create index if not exists daily_streamer_rollup_c_d_idx on daily_streamer_rollup (c, d);

-- Index pour daily_overlap_matrix : jour
create index if not exists daily_overlap_matrix_d_idx on daily_overlap_matrix (d);