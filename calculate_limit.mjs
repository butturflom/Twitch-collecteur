// Calcul précis de la limite de streamers supportables

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const cfg = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const supabase = createClient(cfg.supabaseUrl, cfg.supabaseSecretKey);

async function calculateMaxStreamers() {
  console.log('=== CALCUL DE LA LIMITE DE STREAMERS ===\n');

  // 1. Baser les calculs
  const { count: presenceCount } = await supabase.from('presence').select('*', { count: 'exact' });
  const { count: minutesCount } = await supabase.from('minutes').select('*', { count: 'exact' });
  const { count: switchesCount } = await supabase.from('switches').select('*', { count: 'exact' });
  const { count: chanCount } = await supabase.from('channels').select('*', { count: 'exact' });
  const { data: dbMbData } = await supabase.rpc('db_size_mb');
  const dbMb = dbMbData;

  console.log('Données actuelles:');
  console.log(`  - Présences: ${presenceCount.toLocaleString()}`);
  console.log(`  - Minutes: ${minutesCount.toLocaleString()}`);
  console.log(`  - Switches: ${switchesCount.toLocaleString()}`);
  console.log(`  - Streamers: ${chanCount}`);
  console.log(`  - DB: ${dbMb} MB\n`);

  // 2. Calculer la taille par streamer
  // On utilise la relation presence/streamers comme proxy

  // Taille des tables fixées (approximatives)
  const overheadMb = 50; // Métadonnées, indexes, etc.
  const freeLimitMb = 500;

  // Calcul basé sur presence (donnée dynamique principale)
  // Chaque streamer génère environ ratio présences par jour
  const ratio = presenceCount / chanCount;
  console.log(`Ratio présence/streamers: ${ratio.toFixed(0)}\n`);

  // Estimation: chaque streamer représente ~5673 présences
  // Base = taille fixe + présences
  // présence_size = (dbMb - overhead) / presenceCount
  const presenceSizePerRow = (dbMb - overheadMb) / presenceCount;
  console.log(`Taille par présence: ${(presenceSizePerRow * 1000).toFixed(3)} KB`);

  // Chaque streamer a aussi d'autres tables
  // Estimation: ~500 switches, ~1440 minutes par jour (1440 min = 24h)
  const avgSwitchesPerChan = switchesCount / chanCount;
  const avgMinutesPerChan = minutesCount / chanCount;

  console.log(`Switches/streamers: ${avgSwitchesPerChan.toFixed(0)}`);
  console.log(`Minutes/streamers: ${avgMinutesPerChan.toFixed(0)}`);

  // Calculer la consommation par streamer
  // Présence: 24h = 24 * 60 = 1440 rows/thr ? Non, c'est 1440 minutes/jour
  // Mais les présences sont par personne qui écrit

  // Méthode plus directe: projection linéaire
  const usableMb = freeLimitMb - overheadMb;
  const usedMb = dbMb - overheadMb;
  const usageRatio = usedMb / usableMb;

  console.log(`\nUtilisation: ${usedMb} MB / ${usableMb} MB = ${(usageRatio * 100).toFixed(1)}%`);

  // Streamers max estimés
  const maxStreamers = Math.floor(chanCount / usageRatio);

  console.log(`\n🎯 Limite de streamers maximale (plan gratuit 500 MB):`);
  console.log(`   = ${maxStreamers} streamers (estimation conservatrice)`);
  console.log(`   = ${Math.floor(maxStreamers * 1.2)} streamers (avec optimisations possibles)`);

  // Vérifier avec un calcul plus précis
  console.log('\n=== Calcul par catégorie de données ===');

  // Pour N streamers, les données croissent approximativement comme:
  // - presence: N × ratio × 24h (si activité similaire)
  // - minutes: N × minutes/streamers × 1 jour
  // - switches: N × switches/streamers
  // - snaps: N × 1440 (24h × 60 min)
  // - events: N × quelques dizaines

  // Projection pour différentes valeurs
  const tests = [100, 150, 200, 250, 300];
  console.log('\nProjections:');
  for (const n of tests) {
    const factor = n / chanCount;
    const projectedMb = dbMb * factor;
    const status = projectedMb <= 500 ? '✅ OK' : '❌ DÉPASSE';
    console.log(`  ${n} streamers → ${projectedMb.toFixed(0)} MB ${status}`);
  }

  console.log('\n=== RECOMMANDATION FINALE ===');
  console.log(`Limite de streamers réalisable: ${maxStreamers}`);
  console.log('Pour passer outre: réduire joursEvenements/joursReleves à 7 jours');
  console.log('ou passer au plan Supabase Pro (8 GB)');
}

calculateMaxStreamers().catch(console.error);