// Test de montée en charge - Phase 1 Roadmap
// Simule l'impact de N streamers supplémentaires

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const cfg = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const supabase = createClient(cfg.supabaseUrl, cfg.supabaseSecretKey);

async function runLoadTest() {
  console.log('=== TEST DE MONTÉE EN CHARGE - Phase 1 ===\n');

  // 1. Baser les calculs sur les données existantes
  console.log('1. Analyse des données actuelles...');
  const { count: presenceCount } = await supabase.from('presence').select('*', { count: 'exact' });
  const { count: channelsCount } = await supabase.from('channels').select('*', { count: 'exact' });
  const { data: dbSizeData } = await supabase.rpc('db_size_mb');
  const dbSize = dbSizeData;

  console.log(`   Présences actuelles: ${presenceCount.toLocaleString()}`);
  console.log(`   Streamers actuels: ${channelsCount}`);
  console.log(`   DB actuelle: ${dbSize} MB`);

  // Calculer le ratio présence/streamers
  const ratio = presenceCount / channelsCount;
  console.log(`   Ratio présence/streamers: ${ratio.toFixed(0)}`);

  // 2. Projections pour différentes charges
  console.log('\n2. Projections pour différentes charges:');

  const projections = [100, 200, 300, 500];
  for (const n of projections) {
    const projectedPres = Math.round(ratio * n);
    const estimatedMb = Math.round((projectedPres / presenceCount) * dbSize);
    const remainingMb = 500 - estimatedMb;
    const status = remainingMb > 100 ? '✅ OK' : remainingMb > 0 ? '⚠️ SERRE' : '❌ DÉPASSE';

    console.log(`   ${n} streamers: ${projectedPres.toLocaleString()} présences → ${estimatedMb} MB (${status})`);
  }

  // 3. Analyse du temps de réponse
  console.log('\n3. Test de temps de réponse...');
  const start = Date.now();
  const { error } = await supabase.from('channels').select('c').limit(10);
  const duration = Date.now() - start;
  console.log(`   Requête 10 channels: ${duration}ms ${duration < 100 ? '✅' : '⚠️'}`);

  const start2 = Date.now();
  const { error: e2 } = await supabase.from('presence').select('c, d').limit(1000);
  const duration2 = Date.now() - start2;
  console.log(`   Requête 1000 présences: ${duration2}ms ${duration2 < 500 ? '✅' : '⚠️'}`);

  // 4. Recommandations
  console.log('\n4. Recommandations:');
  console.log('   - Retention actuelle: 48h presence, 30j minutes');
  console.log('   - Proposer réduction à 24h presence si besoin');
  console.log('   - Implémenter compression JSON pour minutes');
  console.log('   - Ajouter partitionnement par jour si > 2M lignes');

  console.log('\n=== FIN DU TEST ===');
}

runLoadTest().catch(console.error);