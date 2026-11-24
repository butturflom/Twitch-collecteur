// Applique les indexs SQL de Phase 2
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const cfg = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const supabase = createClient(cfg.supabaseUrl, cfg.supabaseSecretKey);

const sql = fs.readFileSync('./schema_phase2_indexes.sql', 'utf8');

async function applyIndexes() {
  console.log('Application des indexs Phase 2...');

  const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));

  for (const stmt of statements) {
    const cleanStmt = stmt.trim() + ';';
    console.log('Exécution:', cleanStmt.slice(0, 80) + '...');
    const { error } = await supabase.rpc('exec_sql', { sql: cleanStmt });
    if (error) {
      console.error('Erreur:', error.message);
    }
  }

  console.log('Indexs appliqués !');
}

applyIndexes().catch(console.error);