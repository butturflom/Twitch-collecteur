// Droit à l'effacement : retire de la base un viewer à partir de son pseudo Twitch.
//   node oublier.mjs pseudo [autre_pseudo …]
// Le pseudo n'est jamais stocké : la base ne contient que son empreinte (SHA-256 de « sel:pseudo », tronquée). Ce script recalcule l'empreinte
// avec le sel de config.json, puis appelle la fonction SQL forget_user (clé secrète) qui supprime ses lignes de presence et de switches.
// Les agrégats (esquisses HyperLogLog, matrice de chevauchement) ne contiennent aucune empreinte : rien à y retirer.
// Même calcul que hashUser() dans collecteur.mjs : à garder identique.
import crypto from 'node:crypto';
import fs from 'node:fs';

const cfg = JSON.parse(fs.readFileSync(new URL('./config.json', import.meta.url), 'utf8'));
const pseudos = process.argv.slice(2).map(p => p.trim().replace(/^@/, '').toLowerCase()).filter(Boolean);
if (!pseudos.length) { console.error('Usage : node oublier.mjs pseudo [autre_pseudo …]'); process.exit(1); }
if (!cfg.sel || !cfg.supabaseUrl || !cfg.supabaseSecretKey) { console.error('config.json doit contenir sel, supabaseUrl et supabaseSecretKey.'); process.exit(1); }

const hashUser = u => crypto.createHash('sha256').update(cfg.sel + ':' + u).digest('base64url').slice(0, 12);
const headers = { apikey: cfg.supabaseSecretKey, 'Content-Type': 'application/json' };
if (!cfg.supabaseSecretKey.startsWith('sb_')) headers.Authorization = 'Bearer ' + cfg.supabaseSecretKey; // ancienne clé service_role (JWT)

let failed = false;
for (const p of pseudos) {
  const r = await fetch(cfg.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/rpc/forget_user', { method: 'POST', headers, body: JSON.stringify({ h: hashUser(p) }) });
  const t = await r.text();
  if (!r.ok) { failed = true; console.error(`${p} : échec (${r.status}) ${t.slice(0, 160)}${/PGRST202|404/.test(t) ? ' — relance schema.sql dans Supabase' : ''}`); continue; }
  const n = JSON.parse(t);
  console.log(`${p} : ${n.presence} ligne(s) de présence et ${n.switches} de passages supprimées.`);
}
process.exit(failed ? 1 : 0);
