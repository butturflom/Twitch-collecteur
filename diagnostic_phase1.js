// Phase 1 - Diagnostic des limites système
// Script d'évaluation des performances

import fs from 'node:fs';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const supabase = createClient(cfg.supabaseUrl, cfg.supabaseSecretKey);

async function runDiagnostics() {
  console.log('=== DIAGNOSTIC PHASE 1 - Évaluation des limites systèmes ===\n');

  // 1. Taille de la base
  console.log('1. Taille de la base de données...');
  const { data: dbSize, error: dbError } = await supabase.rpc('db_size_mb');
  if (dbError) console.log('   Erreur db_size_mb:', dbError.message);
  else console.log(`   Taille DB: ${dbSize} MB (limite gratuite: 500 MB)`);

  // 2. Nombre de streamers suivis
  console.log('\n2. Nombre de streamers suivis...');
  const { data: channels, error: chanError } = await supabase.from('channels').select('c');
  if (chanError) console.log('   Erreur:', chanError.message);
  else console.log(`   Streamers suivis: ${channels?.length || 0}`);

  // 3. Taille des différentes tables
  console.log('\n3. Taille des tables principales...');
  const tables = ['presence', 'minutes', 'snaps', 'events', 'switches', 'raid_events'];
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact' });
    if (error) console.log(`   ${t}: erreur`);
    else console.log(`   ${t}: ${count?.toLocaleString() || 0} lignes`);
  }

  // 4. Dernières données de statut
  console.log('\n4. Statut du collecteur...');
  const { data: status, error: statusError } = await supabase.from('collector_status').select('*').single();
  if (statusError) console.log('   Erreur:', statusError.message);
  else {
    console.log(`   Dernière activité: ${status.last_seen ? new Date(status.last_seen).toLocaleString('fr-FR') : 'Jamais'}`);
    console.log(`   Temps tracké: ${(status.tracked_ms / 3600000).toFixed(2)}h`);
    console.log(`   Version: ${status.version || 'inconnue'}`);
  }

  // 5. Échantillon de données (pour estimation mémoire)
  console.log('\n5. Échantillon de données (estimation)...');
  const { data: samplePresence } = await supabase.from('presence').select('*').limit(1000);
  const presenceSize = JSON.stringify(samplePresence || []).length;
  console.log(`   Taille 1000 présences: ${(presenceSize / 1024).toFixed(2)} KB`);
  console.log(`   Estimation 1M présences: ~${(presenceSize * 1000 / 1024 / 1024).toFixed(2)} MB`);

  console.log('\n=== FIN DU DIAGNOSTIC ===');
}

runDiagnostics().catch(console.error);