// Rapport mensuel d'un client, livré en PDF (+ HTML et CSV). Lit la base du client avec sa clé secrète, sans passer par le navigateur.
//   node scripts/rapport-mensuel.mjs clients/<nom> [jours=30] [--sans-pdf]
// Lit <dossier>/config.json (base) et <dossier>/roster.json (nom, chaînes ; 30 au plus). Écrit <dossier>/rapports/<AAAA-MM-JJ>/ :
// rapport.html, rapport.csv et rapport.pdf (Chrome ou Edge en mode sans fenêtre, s'il est installé).
// Mêmes chiffres que le rapport de roster du tableau de bord : period_reach (viewers uniques, estimation HyperLogLog à ± 2,3 %), plus
// l'activité par chaîne (channel_history), la fidélité du chat (channel_stickiness), les alertes de rythme (channels_rhythm, mêmes
// seuils que app/src/lib/rhythm.ts) et les passages entre chaînes. Rien n'est inventé : pas de sponsors, de démographie ni de prédiction.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const sansPdf = args.includes('--sans-pdf');
const [dossierArg, joursArg] = args.filter(a => !a.startsWith('--'));
if (!dossierArg) { console.error('Usage : node scripts/rapport-mensuel.mjs clients/<nom> [jours=30] [--sans-pdf]'); process.exit(1); }
const dossier = path.resolve(dossierArg);
const JOURS = Math.min(Math.max(parseInt(joursArg || '30', 10) || 30, 7), 90);

const lire = f => { try { return JSON.parse(fs.readFileSync(path.join(dossier, f), 'utf8')); } catch (e) { console.error(`Lecture de ${f} impossible : ${e.message}`); process.exit(1); } };
const cfg = lire('config.json');
const roster = lire('roster.json');
if (!cfg.supabaseUrl || /COLLE/i.test(cfg.supabaseUrl) || !cfg.supabaseSecretKey || /COLLE/i.test(cfg.supabaseSecretKey)) { console.error('config.json : renseigner supabaseUrl et supabaseSecretKey.'); process.exit(1); }
const chaines = [...new Set((roster.chaines || []).map(c => String(c).toLowerCase()))].slice(0, 30);
if (!chaines.length) { console.error('roster.json : aucune chaîne.'); process.exit(1); }

/* ---------- accès à la base ---------- */
const headers = { apikey: cfg.supabaseSecretKey, 'Content-Type': 'application/json' };
if (!cfg.supabaseSecretKey.startsWith('sb_')) headers.Authorization = 'Bearer ' + cfg.supabaseSecretKey; // ancienne clé service_role (JWT)
async function rpc(fn, body) {
  const r = await fetch(cfg.supabaseUrl.replace(/\/+$/, '') + '/rest/v1/rpc/' + fn, { method: 'POST', headers, body: JSON.stringify(body) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${fn} : ${r.status} ${t.slice(0, 160)}${/PGRST202|404/.test(t) ? ' (relancer schema.sql dans Supabase)' : ''}`);
  return JSON.parse(t);
}
async function enLots(items, taille, f) { // peu d'appels en parallèle : on ne charge pas la base du client
  const out = [];
  for (let i = 0; i < items.length; i += taille) out.push(...(await Promise.all(items.slice(i, i + taille).map(f))));
  return out;
}

/* ---------- dates (jour de Paris) ---------- */
const jourParis = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
const moins = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
const aujourdhui = jourParis();
const d0 = moins(aujourdhui, JOURS), d00 = moins(aujourdhui, 2 * JOURS); // période : [d0, aujourd'hui) ; précédente : [d00, d0)
const fmtJour = iso => new Date(iso + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/* ---------- formats ---------- */
const num = n => Math.round(n).toLocaleString('fr-FR');
const pct = x => (x * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const evol = (cur, prev, ok) => (!ok || !(prev > 0)) ? '—' : (cur >= prev ? '+' : '−') + Math.abs(Math.round((cur - prev) / prev * 100)) + ' %';

/* ---------- collecte ---------- */
console.log(`Client « ${roster.nom || path.basename(dossier)} » : ${chaines.length} chaîne(s), ${JOURS} jours (du ${d0} au ${moins(aujourdhui, 1)}).`);
const reach = await rpc('period_reach', { chans: chaines, days: JOURS });
const rythme = await rpc('channels_rhythm', { days: 28 }).catch(() => []);
const det = await enLots(chaines, 5, async c => {
  const [h, s] = await Promise.all([rpc('channel_history', { ch: c, days: 2 * JOURS }), rpc('channel_stickiness', { ch: c, days: JOURS }).catch(() => null)]);
  return { c, h, s };
});

const nParChaine = new Map((reach.chans || []).map(x => [x.c, x.n]));
const net = reach.net || 0;
const brut = [...nParChaine.values()].reduce((a, b) => a + b, 0);
const cannibal = brut ? 1 - net / brut : 0;
const joursCouverts = reach.days || 0;

const lignes = det.map(({ c, h, s }) => {
  const jours = (h.days || []).filter(d => d.d < aujourdhui);
  const cur = jours.filter(d => d.d >= d0), prev = jours.filter(d => d.d >= d00 && d.d < d0);
  const enLive = a => a.filter(d => d.avg > 0);
  const moy = a => (a.length ? a.reduce((x, d) => x + d.avg, 0) / a.length : 0);
  const msgs = a => a.reduce((x, d) => x + d.msgs, 0);
  const actifs = s?.actives || 0;
  const score = actifs >= 200 ? 100 * (1 - (s.leavers || 0) / actifs) : null;
  const q = s?.net && s.net.n >= 4 ? s.net : null;
  const lecture = score == null ? '' : !q ? '' : score >= q.q3 ? 'quart haut' : score <= q.q1 ? 'quart bas' : 'milieu';
  return {
    c, uniques: nParChaine.get(c) ?? 0, pic: Math.max(0, ...cur.map(d => d.peak || 0)),
    avg: moy(enLive(cur)), avgPrev: moy(enLive(prev)), msgs: msgs(cur), msgsPrev: msgs(prev),
    heures: cur.reduce((x, d) => x + (d.mins || 0), 0) / 60, nCur: cur.length, nPrev: prev.length,
    score, lecture, out: h.out || [],
  };
}).sort((a, b) => b.uniques - a.uniques);

const dansRoster = new Set(chaines);
const rythmeRoster = (Array.isArray(rythme) ? rythme : []).filter(r => dansRoster.has(r.c)).map(r => {
  if (!(r.base >= 30) || r.nr < 2) return null; // mêmes règles que rhythmOf (app/src/lib/rhythm.ts)
  const rel = (r.recent - r.base) / r.base, se = r.sd / Math.sqrt(r.nr);
  const z = se > 0 ? (r.recent - r.base) / se : Math.sign(rel) * Infinity;
  return Math.abs(rel) < 0.15 || Math.abs(z) < 2 ? null : { c: r.c, up: rel > 0, rel, recent: r.recent, base: r.base };
}).filter(Boolean).sort((a, b) => Math.abs(b.rel) - Math.abs(a.rel));

const paires = new Map(); let versAilleurs = new Map();
for (const l of lignes) for (const o of l.out) {
  if (o.c === l.c) continue;
  if (dansRoster.has(o.c)) { const k = `${l.c} → ${o.c}`; paires.set(k, (paires.get(k) || 0) + o.n); }
  else versAilleurs.set(o.c, (versAilleurs.get(o.c) || 0) + o.n);
}
const topPaires = [...paires].sort((a, b) => b[1] - a[1]).slice(0, 10);
const topAilleurs = [...versAilleurs].sort((a, b) => b[1] - a[1]).slice(0, 8);

/* ---------- HTML ---------- */
const titre = roster.nom || path.basename(dossier);
const est = '≈ ';
const kpi = (l, v, h = '') => `<div class="kpi"><div class="l">${esc(l)}</div><div class="v">${esc(v)}</div>${h ? `<div class="h">${esc(h)}</div>` : ''}</div>`;
const maxU = Math.max(1, ...lignes.map(l => l.uniques));
const court = joursCouverts < 7;
const lectureScore = l => l.score == null ? '—' : `${Math.round(l.score)}${l.lecture ? ` · ${l.lecture}` : ''}`;

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Rapport ${esc(titre)}</title><style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; background: #09090b; color: #f4f4f5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font: 400 10pt/1.5 "Inter", ui-sans-serif, system-ui, "Segoe UI", sans-serif; padding: 16mm 15mm; }
h1 { font-size: 19pt; font-weight: 600; letter-spacing: -0.025em; margin: 0; }
.sub { color: #a1a1aa; margin: 2mm 0 0; }
.meta { color: #868693; font-size: 8.5pt; margin: 1mm 0 8mm; }
h2 { font-size: 11.5pt; font-weight: 600; letter-spacing: -0.015em; margin: 8mm 0 3mm; display: flex; align-items: center; gap: 2.5mm; break-after: avoid; }
h2::before { content: ""; width: 2.2mm; height: 2.2mm; border-radius: 0.5mm; background: #8b7cff; }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid rgba(255,255,255,.08); border-radius: 3mm; background: linear-gradient(#16161c, #121217); overflow: hidden; }
.kpi { padding: 4mm 4.5mm; border-left: 1px solid rgba(255,255,255,.08); }
.kpi:first-child { border-left: 0; }
.kpi .l { color: #868693; font-size: 8.5pt; font-weight: 500; }
.kpi .v { font-size: 17pt; font-weight: 600; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; margin-top: 1mm; }
.kpi .h { color: #868693; font-size: 8pt; margin-top: 0.5mm; }
table { width: 100%; border-collapse: collapse; border: 1px solid rgba(255,255,255,.08); background: #121217; }
th { color: #868693; font-size: 8pt; font-weight: 500; text-align: right; padding: 2.5mm 2.5mm; border-bottom: 1px solid rgba(255,255,255,.08); }
td { padding: 2mm 2.5mm; border-bottom: 1px solid rgba(255,255,255,.05); text-align: right; font: 8.5pt "JetBrains Mono", ui-monospace, Consolas, monospace; font-variant-numeric: tabular-nums; }
th:first-child, td:first-child { text-align: left; }
td.name { font-family: "Inter", ui-sans-serif, system-ui, sans-serif; font-size: 9.5pt; }
tr { break-inside: avoid; }
table { break-inside: avoid; }
tr:last-child td { border-bottom: 0; }
.bar { display: inline-block; vertical-align: middle; height: 1.4mm; border-radius: 1mm; background: #8b7cff; margin-right: 2mm; }
.note { color: #868693; font-size: 8.5pt; margin: 2mm 0 0; max-width: 175mm; }
.note b { color: #a1a1aa; font-weight: 500; }
.alerte { border: 1px solid rgba(240,170,60,.4); border-radius: 2mm; padding: 3mm 4mm; color: #f0aa3c; font-size: 9pt; margin: 0 0 6mm; }
.up { color: #3ccf86; } .down { color: #f0aa3c; }
footer { margin-top: 10mm; padding-top: 4mm; border-top: 1px solid rgba(255,255,255,.08); color: #868693; font-size: 8pt; }
footer b { color: #3ccf86; font-weight: 500; }
</style></head><body>
<h1>Rapport mensuel d'audience</h1>
<p class="sub">${esc(titre)}${roster.description ? ` · ${esc(roster.description)}` : ''}</p>
<p class="meta">Du ${esc(fmtJour(d0))} au ${esc(fmtJour(moins(aujourdhui, 1)))} · ${chaines.length} chaîne${chaines.length > 1 ? 's' : ''} · généré le ${esc(fmtJour(aujourdhui))}</p>
${court ? `<p class="alerte">Données encore courtes : ${joursCouverts} journée${joursCouverts > 1 ? 's' : ''} agrégée${joursCouverts > 1 ? 's' : ''} sur ${JOURS}. Les chiffres de viewers uniques ne couvrent que ce qui a été collecté ; ne pas les lire comme un mois complet.</p>` : ''}
<div class="kpis">
  ${kpi('Net Reach', est + num(net), 'viewers actifs uniques')}
  ${kpi('Audience brute', est + num(brut), 'somme des chaînes')}
  ${kpi('Cannibalisation', brut ? est + pct(cannibal) : '—', 'audience en doublon')}
  ${kpi('Jours couverts', num(joursCouverts), `sur ${JOURS} demandés`)}
</div>
<p class="note"><b>Net Reach</b> : chaque viewer actif est compté une seule fois, quel que soit le nombre de chaînes du roster où il a écrit. <b>Cannibalisation</b> : part de l'audience brute en doublon (1 − Net Reach ÷ audience brute) ; plus elle est basse, plus les chaînes se complètent. Ces chiffres sont des <b>estimations</b> (HyperLogLog, erreur type 2,3 %, la cannibalisation à ± 3 points environ), calculées sans conserver aucun pseudo.</p>

<h2>Détail par chaîne</h2>
<table><thead><tr><th>Chaîne</th><th>Viewers uniques (≈)</th><th>Viewers moy.</th><th>Évol.</th><th>Pic</th><th>Messages</th><th>Évol.</th><th>Heures live</th><th>Fidélité</th></tr></thead><tbody>
${lignes.map(l => {
  const okPrev = l.nPrev >= Math.max(3, Math.floor(JOURS / 2));
  return `<tr><td class="name">${esc(l.c)}</td><td><span class="bar" style="width:${Math.round(l.uniques / maxU * 14)}mm"></span>${est}${num(l.uniques)}</td><td>${num(l.avg)}</td><td>${evol(l.avg, l.avgPrev, okPrev)}</td><td>${num(l.pic)}</td><td>${num(l.msgs)}</td><td>${evol(l.msgs, l.msgsPrev, okPrev)}</td><td>${num(l.heures)}</td><td>${esc(lectureScore(l))}</td></tr>`;
}).join('')}
</tbody></table>
<p class="note"><b>Viewers moy.</b> : moyenne des viewers moyens des jours où la chaîne était en live. <b>Évol.</b> : comparaison avec les ${JOURS} jours d'avant, affichée seulement si cette période précédente est assez couverte. <b>Fidélité</b> : score sur 100 = part des viewers actifs qui ne partent pas écrire chez une autre chaîne suivie dans les 3 h ; « quart haut » ou « quart bas » la situe parmi les chaînes suivies (si elles sont au moins 4 avec 200 viewers actifs). « — » : moins de 200 viewers actifs.</p>

<h2>Rythme récent</h2>
${rythmeRoster.length ? `<table><thead><tr><th>Chaîne</th><th>7 derniers jours</th><th>Jours d'avant</th><th>Écart</th></tr></thead><tbody>${rythmeRoster.map(r => `<tr><td class="name">${esc(r.c)}</td><td>${num(r.recent)}</td><td>${num(r.base)}</td><td class="${r.up ? 'up' : 'down'}">${r.up ? '↑ décolle' : '↓ ralentit'} ${(r.rel > 0 ? '+' : '−') + Math.abs(Math.round(r.rel * 100))} %</td></tr>`).join('')}</tbody></table>
<p class="note">Viewers actifs par jour. Alerte seulement si l'écart dépasse 15 % et sort des variations habituelles de la chaîne (au moins 14 journées agrégées).</p>` : `<p class="note">Aucune chaîne du roster ne sort nettement de son rythme habituel (ou moins de 14 journées agrégées).</p>`}

<h2>Où vont les viewers</h2>
${topPaires.length ? `<table><thead><tr><th>Passage d'une chaîne à l'autre</th><th>Passages</th></tr></thead><tbody>${topPaires.map(([k, n]) => `<tr><td class="name">${esc(k)}</td><td>${num(n)}</td></tr>`).join('')}</tbody></table>` : `<p class="note">Aucun passage mesuré entre chaînes du roster sur la période.</p>`}
${topAilleurs.length ? `<p class="note"><b>Vers des chaînes hors du roster</b> (les mieux suivies) : ${topAilleurs.map(([c, n]) => `${esc(c)} (${num(n)})`).join(', ')}.</p>` : ''}
<p class="note"><b>Passage</b> : un viewer actif qui écrit chez une autre chaîne suivie moins de 3 h après avoir écrit sur la première. C'est un mouvement observé, pas une cause.</p>

<h2>Ce que ce rapport ne mesure pas</h2>
<p class="note">Les <b>viewers actifs</b> sont les personnes qui ont écrit au moins un message : les spectateurs silencieux ne sont pas visibles. Ce rapport ne contient ni revenus, ni sponsors, ni démographie, ni indicateur de brand safety, ni prédiction : ces données ne sont pas collectées.</p>
<footer><b>Données anonymisées.</b> Les pseudos sont remplacés par une empreinte (SHA-256 salée) avant d'être enregistrés ; le texte des messages n'est jamais conservé. Aucun pseudo n'apparaît dans ce rapport. Généré par Twitch Overlap le ${esc(fmtJour(aujourdhui))}.</footer>
</body></html>`;

/* ---------- CSV (Excel en français : « ; », virgule décimale, BOM) ---------- */
const cell = v => { const s = typeof v === 'number' ? String(Math.round(v * 10) / 10).replace('.', ',') : String(v); return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const lignesCsv = [
  ['Client', titre], ['Période', `${d0} au ${moins(aujourdhui, 1)}`], ['Jours agrégés', joursCouverts], ['Méthode', 'Viewers uniques : estimation HyperLogLog, erreur type 2,3 %'],
  ['Net Reach estimé', net], ['Audience brute estimée', brut], ['Cannibalisation (%)', brut ? Math.round(cannibal * 1000) / 10 : ''], [],
  ['Chaîne', 'Viewers uniques estimés', 'Viewers moyens', 'Évolution viewers (%)', 'Pic', 'Messages', 'Évolution messages (%)', 'Heures en live', 'Fidélité (/100)'],
  ...lignes.map(l => {
    const ok = l.nPrev >= Math.max(3, Math.floor(JOURS / 2));
    const e = (c, p) => (ok && p > 0 ? Math.round((c - p) / p * 100) : '');
    return [l.c, l.uniques, l.avg, e(l.avg, l.avgPrev), l.pic, l.msgs, e(l.msgs, l.msgsPrev), l.heures, l.score == null ? '' : l.score];
  }),
  [], ['Passage', 'Nombre'], ...topPaires.map(([k, n]) => [k, n]),
];
const csv = '\uFEFF' + lignesCsv.map(r => r.map(cell).join(';')).join('\r\n');

/* ---------- écriture ---------- */
const sortie = path.join(dossier, 'rapports', moins(aujourdhui, 0));
fs.mkdirSync(sortie, { recursive: true });
const fHtml = path.join(sortie, 'rapport.html');
fs.writeFileSync(fHtml, html);
fs.writeFileSync(path.join(sortie, 'rapport.csv'), csv);
console.log(`Écrit : ${fHtml} et rapport.csv`);

if (!sansPdf) {
  const candidats = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  const chrome = candidats.find(p => fs.existsSync(p));
  if (!chrome) console.log('Chrome ou Edge introuvable : ouvre rapport.html et imprime en PDF (ou définis CHROME_PATH).');
  else {
    const pdf = path.join(sortie, 'rapport.pdf');
    try {
      execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${pdf}`, 'file:///' + fHtml.replace(/\\/g, '/')], { stdio: 'ignore', timeout: 60000 });
      console.log(`Écrit : ${pdf}`);
    } catch (e) { console.log('PDF non produit (' + e.message.split('\n')[0] + ') : imprime rapport.html depuis le navigateur.'); }
  }
}
