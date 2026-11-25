// Prépare le dossier d'un client (une agence) : une base Supabase dédiée, son roster, son collecteur.
//   node scripts/nouveau-client.mjs "Nom de l'agence" chaine1 chaine2 …
// Crée clients/<nom>/ avec : config.json (sel et code du tableau tirés au hasard, clés à remplir), roster.json,
// une copie du collecteur, de oublier.mjs, du schéma SQL, et INSTALLATION.md (la liste des étapes à la main).
// Ne crée AUCUNE base et n'appelle aucun service : créer le projet Supabase (gratuit ou payant) reste une décision à prendre.
// Le dossier clients/ est ignoré par git : il contient des secrets.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [nom, ...chainesBrutes] = process.argv.slice(2);
if (!nom) { console.error('Usage : node scripts/nouveau-client.mjs "Nom de l\'agence" chaine1 chaine2 …'); process.exit(1); }

const slug = nom.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
if (!slug) { console.error('Le nom doit contenir au moins une lettre ou un chiffre.'); process.exit(1); }
const chaines = [...new Set(chainesBrutes.map(c => c.trim().replace(/^@/, '').toLowerCase()).filter(Boolean))];
const mauvaises = chaines.filter(c => !/^[a-z0-9_]{3,25}$/.test(c));
if (mauvaises.length) { console.error('Pseudos Twitch invalides : ' + mauvaises.join(', ')); process.exit(1); }
if (chaines.length > 30) console.warn('Attention : le rapport ne lit que 30 chaînes (limite de period_reach). Les suivantes seront ignorées.');

const dossier = path.join(RACINE, 'clients', slug);
if (fs.existsSync(dossier)) { console.error(`Le dossier existe déjà : ${dossier}. Rien n'est écrasé.`); process.exit(1); }
fs.mkdirSync(dossier, { recursive: true });

const config = {
  supabaseUrl: 'https://COLLE-ICI-LE-PROJET-DU-CLIENT.supabase.co',
  supabaseSecretKey: 'COLLE-ICI-LA-CLE-SECRETE-sb_secret_...',
  twitchClientId: '',
  twitchClientSecret: '',
  chainesParDefaut: chaines,
  // Un sel propre au client : les empreintes de viewers ne sont pas comparables d'une base à l'autre.
  sel: crypto.randomBytes(16).toString('hex'),
  codeTableau: crypto.randomBytes(12).toString('base64url'),
  joursDetailMinute: 7,
  joursPresence: 1,
  joursEvenements: 3,
  joursReleves: 3,
};
fs.writeFileSync(path.join(dossier, 'config.json'), JSON.stringify(config, null, 2));
fs.writeFileSync(path.join(dossier, 'roster.json'), JSON.stringify({ nom, description: '', chaines }, null, 2));

// Copies figées : le collecteur lit config.json à côté de lui. Les recopier quand la version de la racine change.
for (const f of ['collecteur.mjs', 'oublier.mjs', 'schema.sql']) fs.copyFileSync(path.join(RACINE, f), path.join(dossier, f));
fs.copyFileSync(path.join(RACINE, 'scripts', 'cron_rollup.sql'), path.join(dossier, 'cron_rollup.sql'));
fs.writeFileSync(path.join(dossier, 'lancer.bat'), '@echo off\r\ncd /d "%~dp0"\r\nnode collecteur.mjs\r\npause\r\n');

fs.writeFileSync(path.join(dossier, 'INSTALLATION.md'), `# Installation du client « ${nom} »

Dossier généré le ${new Date().toLocaleDateString('fr-FR')}. Les secrets de ce dossier (config.json) ne vont pas dans git.

Chaînes du roster (${chaines.length}) : ${chaines.join(', ') || '(aucune pour le moment : à ajouter dans roster.json et chainesParDefaut)'}

## À faire à la main, dans l'ordre

1. **Cadre légal** (avant de collecter pour un client) : relire \`CONFORMITE.md\` et les conditions du programme développeur Twitch ; décider qui est responsable du traitement.
2. **Créer un projet Supabase** dédié à ce client (un projet par client). Le palier gratuit (500 Mo) suffit pour une trentaine de chaînes : à surveiller.
3. Dans Supabase → SQL Editor : coller et lancer **schema.sql** en entier (rejouable), puis **cron_rollup.sql** (active pg_cron et planifie les rollups et les esquisses de viewers uniques).
4. Dans \`config.json\` : renseigner \`supabaseUrl\` et \`supabaseSecretKey\` (clé secrète du projet, jamais la clé publique). Les clés Twitch (\`twitchClientId\`, \`twitchClientSecret\`) peuvent être celles du projet principal ou une application propre au client.
5. Lancer \`lancer.bat\` (Node 22 ou plus). Au premier lancement, le collecteur enregistre le code du tableau et la liste des chaînes dans la base. Vérifier le journal : « API ok », pas d'erreur 57014.
6. Laisser tourner **au moins 7 jours** avant de produire un rapport (le rapport indique le nombre de jours couverts).
7. Chaque mois : \`node scripts/rapport-mensuel.mjs clients/${slug}\` depuis la racine du dépôt (voir l'en-tête du script).

## Entretien

- Ajouter ou retirer des chaînes : depuis le tableau de bord de ce client (avec son code), ou dans \`roster.json\` pour le rapport.
- Effacer un viewer : \`node oublier.mjs pseudo\` dans ce dossier.
- Mettre à jour le collecteur : recopier \`collecteur.mjs\` de la racine, puis relancer \`schema.sql\` si le schéma a changé.
`);

console.log(`Dossier créé : ${dossier}`);
console.log('Étapes suivantes : ouvrir INSTALLATION.md. Rien n\'a été créé chez Supabase ni chez Twitch.');
