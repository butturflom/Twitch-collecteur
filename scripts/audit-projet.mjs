// Audit du dépôt : liens et chemins cités dans la documentation, réglages Claude,
// worktrees et branches. Lecture seule : il signale, il ne corrige ni ne supprime rien.
// Usage : node scripts/audit-projet.mjs            (rapport complet)
//         node scripts/audit-projet.mjs --court    (une ligne, pour le démarrage de session)
// Lancer depuis la racine du dépôt ou d'un worktree. Sortie toujours 0 : c'est un constat, pas un blocage.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const COURT = process.argv.includes('--court');
const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const root = git(['rev-parse', '--show-toplevel'], process.cwd());
const rel = (p) => path.relative(root, p).replaceAll('\\', '/');

// Fichiers qui n'existent que sur le PC de l'utilisateur (générés, secrets, données locales) : pas des liens cassés.
const LOCAUX = new Set([
  'config.json', 'en-attente.json', 'twitch-overlap.html', 'arreter.flag', 'collecteur.pid',
  'rapport.html', 'rapport.csv', 'rapport.pdf', 'INSTALLATION.md', 'Prompt.txt', '.hallmark/run.txt',
]);
// Documents non audités : archives (historique) et docs de skills tiers (fournisseur).
const DOCS_EXCLUS = /^(archives\/|\.claude\/skills\/(react-three-fiber|ui-ux-pro-max|three-js|vercel-|web-design|writing-|impeccable))/;
const INDEX_EXCLUS = /(^|\/)(node_modules|\.git|\.claude\/worktrees|\.impeccable|\.hallmark)(\/|$)/;
const EXT = 'md|mjs|js|ts|tsx|sql|json|bat|py|css|html|txt|csv|sh|yml|yaml|cmd';

// Index de tous les fichiers suivis ou présents (pour noms seuls et chemins abrégés)
const tout = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (INDEX_EXCLUS.test(rel(p))) continue;
    if (e.isDirectory()) walk(p);
    else tout.push(rel(p));
  }
})(root);
const existe = (t, dossier) =>
  fs.existsSync(path.resolve(root, t)) || fs.existsSync(path.resolve(dossier, t)) || tout.some((f) => f === t || f.endsWith('/' + t));

const rapport = { liens: [], reglages: new Set(), worktrees: [], branches: [], autres: [] };

// 1. Liens et chemins cités dans les documents
const docs = tout.filter((f) => f.endsWith('.md') && !DOCS_EXCLUS.test(f));
for (const rf of docs) {
  const dossier = path.dirname(path.join(root, rf));
  fs.readFileSync(path.join(root, rf), 'utf8').split('\n').forEach((ligne, i) => {
    const ou = `${rf}:${i + 1}`;
    for (const m of ligne.matchAll(/\]\(([^)\s]+)\)/g)) {
      let t = m[1];
      if (/^(https?:|mailto:|#)/.test(t)) continue;
      t = t.split('#')[0].replace(/^\/+/, '');
      if (t && !existe(t, dossier) && !LOCAUX.has(t)) rapport.liens.push(`${ou} : lien vers « ${t} » introuvable`);
    }
    for (const m of ligne.matchAll(new RegExp('`([^`\\s]+\\.(?:' + EXT + '))`', 'g'))) {
      const t = m[1];
      if (/[*<>{}$@]|^https?:|\.\.\.|^\/app\/|^\.\//.test(t) || LOCAUX.has(t) || LOCAUX.has(path.basename(t))) continue;
      if (!existe(t, dossier)) rapport.liens.push(`${ou} : chemin « ${t} » introuvable`);
    }
  });
}

// 2. Réglages Claude : JSON valide, scripts des hooks présents, serveurs MCP définis, en-têtes des agents et skills
const lire = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
for (const f of ['.claude/settings.json', '.claude/settings.local.json']) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) continue;
  let r;
  try { r = lire(p); } catch (e) { rapport.reglages.push(`${f} : JSON invalide (${e.message})`); continue; }
  const cmds = [];
  for (const evt of Object.values(r.hooks || {})) for (const g of evt) for (const h of g.hooks || []) cmds.push(h.command || '');
  for (const c of cmds) {
    for (const m of c.matchAll(/\$\{CLAUDE_PROJECT_DIR\}\/([^"\s]+)/g)) {
      if (!fs.existsSync(path.join(root, m[1]))) rapport.reglages.add(`${f} : hook qui appelle « ${m[1]} », fichier absent`);
    }
    if (/impeccable/i.test(c)) rapport.reglages.add(`${f} : hook Impeccable encore présent (à retirer)`);
  }
  if (r.enabledMcpjsonServers) {
    const mcp = fs.existsSync(path.join(root, '.mcp.json')) ? lire(path.join(root, '.mcp.json')).mcpServers || {} : {};
    for (const s of r.enabledMcpjsonServers) if (!mcp[s]) rapport.reglages.add(`${f} : serveur MCP « ${s} » activé mais absent de .mcp.json`);
  }
}
const enTete = (p) => {
  const txt = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n'); // fins de ligne CRLF sous Windows
  const m = txt.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return `${rel(p)} : pas d'en-tête (--- ... ---)`;
  for (const c of ['name', 'description']) if (!new RegExp('^' + c + ':', 'm').test(m[1])) return `${rel(p)} : en-tête sans « ${c} »`;
  return null;
};
for (const f of tout.filter((f) => /^\.claude\/agents\/[^/]+\.md$/.test(f) || /^\.claude\/skills\/[^/]+\/SKILL\.md$/.test(f))) {
  const e = enTete(path.join(root, f));
  if (e) rapport.reglages.add(e);
}

// 3. Worktrees : modifications non commitées et branche
const blocs = git(['worktree', 'list', '--porcelain'], root).split('\n\n');
for (const b of blocs) {
  const chemin = (b.match(/^worktree (.+)$/m) || [])[1];
  const branche = ((b.match(/^branch refs\/heads\/(.+)$/m) || [])[1]) || '(détachée)';
  if (!chemin) continue;
  const modif = git(['status', '--porcelain'], chemin).split('\n').filter(Boolean).length;
  if (modif) rapport.worktrees.push(`${chemin} [${branche}] : ${modif} fichier(s) non commité(s)`);
}

// 4. Branches : fusionnées (à supprimer sans risque) et main par rapport à origin
try {
  const fusionnees = git(['branch', '--merged', 'origin/main', '--format=%(refname:short)'], root).split('\n').filter((b) => b && b !== 'main');
  if (fusionnees.length) rapport.branches.push(`branches locales déjà fusionnées dans origin/main (supprimables avec git branch -d) : ${fusionnees.join(', ')}`);
  const retard = git(['rev-list', '--count', 'main..origin/main'], root);
  if (retard !== '0') rapport.branches.push(`main local en retard de ${retard} commit(s) sur origin/main (git pull)`);
} catch { rapport.branches.push('origin/main introuvable (git fetch origin)'); }

// 5. Crochet post-fusion (rebuild automatique du tableau de bord)
const crochet = path.resolve(root, git(['rev-parse', '--git-path', 'hooks/post-merge'], root)); // chemin absolu dans un worktree
if (!fs.existsSync(crochet)) rapport.autres.push('crochet .git/hooks/post-merge absent : copier scripts/hooks/post-merge');

// Restitution
rapport.reglages = [...rapport.reglages];
const total = Object.values(rapport).reduce((n, l) => n + l.length, 0);
const liensN = rapport.liens.length, reglN = rapport.reglages.length;
const modifN = rapport.worktrees.filter((l) => l.includes('non commité')).length;
if (COURT) {
  console.log(`Audit : ${liensN} lien(s) ou chemin(s) cassé(s), ${reglN} réglage(s) à revoir, ${modifN} worktree(s) avec modifications non commitées${total ? '' : ' (tout est en ordre)'}. Détail : node scripts/audit-projet.mjs`);
} else {
  const section = (titre, lignes, vide) => {
    console.log(`\n## ${titre}`);
    if (!lignes.length) console.log(`  OK${vide ? ' : ' + vide : ''}`);
    for (const l of lignes) console.log('  - ' + l);
  };
  console.log(`Audit du dépôt : ${docs.length} documents, ${tout.length} fichiers indexés.`);
  section('Liens et chemins cités dans la documentation', rapport.liens, 'aucun lien cassé');
  section('Réglages Claude (hooks, MCP, en-têtes)', rapport.reglages, 'réglages cohérents');
  section('Worktrees', rapport.worktrees, '');
  section('Branches et main', rapport.branches, '');
  section('Autres', rapport.autres, '');
  console.log(`\n${total} point(s) à regarder.`);
}
