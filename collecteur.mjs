// Twitch Overlap — collecteur 24h/24
// Écoute les chats Twitch en lecture anonyme, relève viewers et jeux via l'API Twitch,
// et envoie des compteurs agrégés vers Supabase. Les pseudos sont hachés avant tout envoi,
// et le texte des messages n'est jamais conservé.
// Nécessite Node.js 22 ou plus récent. Aucune dépendance à installer.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const VERSION = '1.6.12';
const DIR = path.dirname(fileURLToPath(import.meta.url));
const CFG_PATH = path.join(DIR, 'config.json');
const PENDING_PATH = path.join(DIR, 'en-attente.json');
const PID_PATH = path.join(DIR, 'collecteur.pid');
const LOG_PATH = path.join(DIR, 'collecteur.log');
const CHAN_CACHE = path.join(DIR, 'chaines-cache.json');
const STOP_PATH = path.join(DIR, 'arreter.flag'); // créé par desinstaller-demarrage.bat pour demander un arrêt propre
const MIN = 60000, HOUR = 3600000, DAY = 86400000;
const UNKNOWN = '?', OFFLINE = 'Hors ligne';
const FLUSH_MS = 30000, POLL_MS = 120000, CHAN_SYNC_MS = 60000, MAX_CHANS = 100;

/* ---------- journal ---------- */
function log(...a) {
  const line = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }) + '  ' + a.join(' ');
  console.log(line);
  try {
    if (fs.existsSync(LOG_PATH) && fs.statSync(LOG_PATH).size > 5e6) fs.renameSync(LOG_PATH, LOG_PATH + '.old');
    fs.appendFileSync(LOG_PATH, line + '\n');
  } catch {}
}

/* ---------- configuration ---------- */
if (typeof WebSocket === 'undefined') { console.error('Node.js 22 ou plus récent est nécessaire (node -v pour vérifier). Télécharge la version LTS sur https://nodejs.org'); process.exit(1); }
if (!fs.existsSync(CFG_PATH)) { console.error('config.json introuvable : copie config.exemple.json en config.json et remplis-le.'); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(CFG_PATH, 'utf8'));
for (const k of ['supabaseUrl', 'supabaseSecretKey']) if (!cfg[k] || /x{4}|COLLE/i.test(cfg[k])) { console.error(`Remplis "${k}" dans config.json.`); process.exit(1); }
cfg.supabaseUrl = cfg.supabaseUrl.replace(/\/+$/, '');
{ // sel des empreintes et code du tableau de bord : créés une fois, gardés dans config.json
  let changed = false;
  if (!cfg.sel) { cfg.sel = crypto.randomBytes(16).toString('hex'); changed = true; }
  if (!cfg.codeTableau || String(cfg.codeTableau).length < 8) { cfg.codeTableau = crypto.randomBytes(12).toString('base64url'); changed = true; }
  if (changed) fs.writeFileSync(CFG_PATH, JSON.stringify(cfg, null, 2));
}
const apiOn = !!(cfg.twitchClientId && cfg.twitchClientSecret);
// Durées gardées dans la base, en jours (config.json). Événements et relevés de viewers sont réglables depuis la 1.6.11.
const RETENTION = { minutes: cfg.joursDetailMinute || 14, presence: cfg.joursPresence || 21, events: cfg.joursEvenements || 60, snaps: cfg.joursReleves || 30 };
const DB_WARN_MB = 400; // l'offre gratuite de Supabase s'arrête à 500 Mo

/* ---------- une seule instance (fichier pid créé de façon atomique + battement toutes les 30 s) ---------- */
// Le raccourci de démarrage et la tâche planifiée peuvent lancer le collecteur au même instant : la création
// exclusive du fichier (flag 'wx') garantit qu'un seul des deux gagne. Un fichier laissé par une instance
// morte (plus de battement depuis 2 min, ou processus disparu) est repris par un renommage, lui aussi atomique.
const readPid = p => { try { const [pid, beat] = fs.readFileSync(p, 'utf8').split(':').map(Number); return { pid, beat, raw: pid + ':' + beat }; } catch { return null; } };
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
const isLive = x => !!(x && x.pid && x.pid !== process.pid && Date.now() - x.beat < 2 * 60000 && alive(x.pid));
function acquireLock() {
  for (let i = 0; i < 3; i++) {
    try { fs.writeFileSync(PID_PATH, process.pid + ':' + Date.now(), { flag: 'wx' }); return true; }
    catch (e) { if (e.code !== 'EEXIST') return true; } // dossier en lecture seule, etc. : on tourne quand même
    const cur = readPid(PID_PATH);
    if (isLive(cur)) { console.error(`Le collecteur tourne déjà (processus ${cur.pid}).`); return false; }
    const tmp = PID_PATH + '.' + process.pid;
    try { fs.renameSync(PID_PATH, tmp); } catch { continue; } // une autre instance l'a repris avant nous
    const took = readPid(tmp);
    if (isLive(took) && (!cur || took.raw !== cur.raw)) { // on a pris le fichier tout neuf d'une instance concurrente : on le rend
      try { fs.renameSync(tmp, PID_PATH); } catch {}
      console.error(`Le collecteur tourne déjà (processus ${took.pid}).`); return false;
    }
    try { fs.unlinkSync(tmp); } catch {}
  }
  return false; // pas réussi à prendre la main : la tâche planifiée réessaiera dans 5 min
}
if (!acquireLock()) process.exit(0);
const beat = () => { try { fs.writeFileSync(PID_PATH, process.pid + ':' + Date.now()); } catch {} };
setInterval(beat, 30000);

/* ---------- outils ---------- */
const dayFmt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' });
const dayKey = t => dayFmt.format(t);
const hashUser = u => crypto.createHash('sha256').update(cfg.sel + ':' + u).digest('base64url').slice(0, 12);
const BOTS = new Set(['nightbot','streamelements','streamlabs','moobot','wizebot','fossabot','soundalerts','sery_bot','kofistreambot','commanderroot','botrixoficial','pokemoncommunitygame','own3d','blerp','streamstickers','tangiabot','lumiastream','creatisbot','frostytoolsdotcom','fourthwallhq','botisimo','coebot','deepbot','phantombot','stay_hydrated_bot','kikettebot','supibot','streamholicsbot']);
// Un pseudo en « …bot » n'est compté comme bot que s'il est aussi modérateur ou VIP de la chaîne (c'est le cas des bots
// maison) : un viewer qui s'appelle « abbot » ou « talbot » reste un viewer. (Même règle dans twitch-overlap.html.)
const isBot = (u, tags = {}) => BOTS.has(u) || (/bot$/.test(u) && (tags.mod === '1' || /(^|,)(moderator|vip|broadcaster)\//.test(tags.badges || '')));
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- analyse du texte (rien n'est stocké en clair) ---------- */
const STOP=new Set(('le la les un une des de du et ou au aux en dans sur pour par pas ne plus moins que qui quoi quand comment est suis sont sera été etre être avoir ai as avez ont avait fait faire ce cet cette ces ça ca cela il ils elle elles on nous vous je tu te me se lui leur leurs mon ma mes ton ta tes son sa ses notre nos votre vos tout tous toute toutes très tres trop bien mais donc car si oui non ah oh eh bon ben bah genre juste aussi encore deja déjà alors comme avec sans chez vers entre the and you for that this with are was have not but what all just can its i\'m dont don\'t your they them his her him she our out get got like yeah yes etait était peut faut veut mec mdr ptdr lol pourquoi quel quelle quels quelles moi toi vas vais va y\'a c\'est j\'ai t\'es t\'as qu\'il qu\'on n\'est d\'un d\'une l\'autre').split(' '));
const END='(?=\\s|$|[!?.,…])';
const RX={
  rire:new RegExp('(^|\\s)(md+r+|pt+d+r+|lo+l+|lmao+|x+d+|(a?h+a+){2,}h*|(h+i+){2,}|jpp|kekw|lul|lulw|omegalul|icant|😂|🤣)'+END,'iu'),
  hype:new RegExp('(^|\\s)(pog\\w*|g+g+|let\'?s\\s?go+|lets?go+|insane|clutch|ez+|sheesh|incroyable|[ée]norme|masterclass|ouf|dinguerie|🔥|w)'+END,'iu'),
  negatif:new RegExp('(^|\\s)(nul+|naze|sadge|pepehands|bouh+|rip|dommage|chiant|boring|relou|déçu|decu|f)'+END,'iu'),
};
const MOODS=[['rire','Rire'],['hype','Hype'],['negatif','Négatif'],['question','Questions']];
function analyseText(text,emoteTag,c){
  if(text.startsWith('\u0001ACTION '))text=text.slice(8).replace(/\u0001$/,'');
  const chars=Array.from(text),emotes=new Set();
  if(emoteTag)for(const part of emoteTag.split('/')){const pos=part.split(':')[1];if(!pos)continue;
    const [s,e]=pos.split(',')[0].split('-').map(Number);const name=chars.slice(s,e+1).join('');if(name)emotes.add(name)}
  for(const w of text.split(/\s+/))if(w&&isExt(c,w))emotes.add(w); // emotes 7TV / BTTV / FFZ, absentes des tags Twitch
  const moods={rire:RX.rire.test(text),hype:RX.hype.test(text),negatif:RX.negatif.test(text),
    question:/\?\s*$/.test(text)||/(^|\s)(pourquoi|comment|c'est quoi)(\s|$)/i.test(text)};
  const words=new Set();
  for(let w of text.split(/\s+/)){if(!w||emotes.has(w)||w[0]==='@'||/^https?:/i.test(w))continue;
    w=w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu,'');
    if(w.length<3||w.length>25||/^\d+$/.test(w)||STOP.has(w))continue;words.add(w)}
  return {emotes,moods,words,text};
}

/* ---------- type de message : réaction ou interaction ----------
   re  réaction (emote seule, « mdr », « GG », réaction courte)
   va  vague : le même message que 2 autres personnes ou plus dans les 15 dernières secondes
   ad  question ou message adressé au streamer (réponse, @, tutoiement)
   co  conversation entre viewers (réponse ou @ à un autre viewer)
   cm  commentaire (4 mots ou plus)
   ct  court, sans signal clair
   cmd commande (!xxx)                                                    */
const recentByChan = {}, chanRx = {};
const SECOND = /(^|\s)(tu|t'as|t'es|t'étais|t'avais|toi)(?=\s|$|[!?.,…])/i;
function classify(c, login, tags, t, text, emotes) {
  const parent = tags['reply-parent-user-login'];
  const body = (parent ? text.replace(/^@\S+\s*/, '') : text).trim();
  const toks = body.split(/\s+/).filter(Boolean), words = toks.filter(w => !emotes.has(w));
  const norm = body.toLowerCase().replace(/\s+/g, ' ');
  const R = recentByChan[c] ||= [];
  while (R.length && t - R[0].t > 15000) R.shift();
  const others = new Set(); for (const x of R) if (x.n === norm && x.u !== login) others.add(x.u);
  R.push({ t, n: norm, u: login }); if (R.length > 500) R.shift();
  if (body[0] === '!') return 'cmd';
  if (parent) return parent === c ? 'ad' : 'co';
  if ((chanRx[c] ||= new RegExp('(^|\\s)@?' + c + '(?=\\s|$|[,!?.:])', 'i')).test(body)) return 'ad';
  if (/(^|\s)@\w/.test(body)) return 'co';
  if (norm && others.size >= 2) return 'va';
  if (toks.length && !words.length) return 're';
  if (words.length <= 3 && (RX.rire.test(body) || RX.hype.test(body) || RX.negatif.test(body) || words.length < toks.length)) return 're';
  if (/\?\s*$/.test(body) || SECOND.test(body)) return 'ad';
  return words.length >= 4 ? 'cm' : 'ct';
}

/* ---------- emotes 7TV / BTTV / FFZ (rechargées toutes les heures) ---------- */
let extGlobal = new Set();
const ext = {}, uids = {}, avatars = {}; // avatars : pseudo → photo de profil Twitch (affichée par le tableau de bord)
const isExt = (c, w) => extGlobal.has(w) || !!(ext[c] && ext[c].has(w));
const getJson = async u => { try { const r = await fetch(u, { signal: AbortSignal.timeout(15000) }); return r.ok ? await r.json() : null; } catch { return null; } };
async function loadEmotes(list, refreshGlobal = false) {
  if (refreshGlobal || !extGlobal.size) {
    const g = new Set();
    (await getJson('https://7tv.io/v3/emote-sets/global'))?.emotes?.forEach(e => g.add(e.name));
    (await getJson('https://api.betterttv.net/3/cached/emotes/global'))?.forEach?.(e => g.add(e.code));
    (await getJson('https://api.betterttv.net/3/cached/frankerfacez/emotes/global'))?.forEach?.(e => g.add(e.code));
    if (g.size) extGlobal = g;
  }
  if (!apiOn || !list.length) return; // les emotes d'une chaîne se cherchent par son identifiant Twitch
  const need = list.filter(c => !uids[c]);
  for (let i = 0; i < need.length; i += 100) {
    try { const r = await helix('users?' + need.slice(i, i + 100).map(c => 'login=' + encodeURIComponent(c)).join('&')); for (const u of r.data) { uids[u.login.toLowerCase()] = u.id; if (u.profile_image_url) avatars[u.login.toLowerCase()] = u.profile_image_url; } } catch {}
  }
  let n = 0;
  for (const c of list) {
    const id = uids[c]; if (!id) continue; const s = new Set();
    (await getJson('https://7tv.io/v3/users/twitch/' + id))?.emote_set?.emotes?.forEach(e => s.add(e.name));
    const b = await getJson('https://api.betterttv.net/3/cached/users/twitch/' + id);
    [...(b?.channelEmotes || []), ...(b?.sharedEmotes || [])].forEach(e => s.add(e.code));
    (await getJson('https://api.betterttv.net/3/cached/frankerfacez/users/twitch/' + id))?.forEach?.(e => s.add(e.code));
    if (s.size) ext[c] = s; n += (ext[c] ? ext[c].size : 0);
  }
  log(`Emotes 7TV/BTTV/FFZ : ${extGlobal.size} globales, ${n} propres à ${list.length} chaîne(s).`);
}


/* ---------- Supabase ---------- */
function sbHeaders(extra = {}) {
  const h = { apikey: cfg.supabaseSecretKey, 'Content-Type': 'application/json', ...extra };
  if (!cfg.supabaseSecretKey.startsWith('sb_')) h.Authorization = 'Bearer ' + cfg.supabaseSecretKey; // ancienne clé service_role (JWT)
  return h;
}
async function sb(pathq, opts = {}, ms = 60000) { // Timeout augmenté à 60s
  const r = await fetch(cfg.supabaseUrl + '/rest/v1/' + pathq, { ...opts, headers: sbHeaders(opts.headers), signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(`Supabase ${r.status} ${(await r.text()).slice(0, 200)}`);
  const t = await r.text(); return t ? JSON.parse(t) : null;
}
// Texte coupé à n caractères sans casser un emoji en deux : une moitié d'emoji seule rend le JSON invalide pour Supabase
// (erreur PGRST102 « Empty or invalid json »), et le lot entier serait refusé à chaque nouvel essai.
const cut = (s, n) => { let r = String(s || '').slice(0, n); if (/[\uD800-\uDBFF]$/.test(r)) r = r.slice(0, -1); return r.toWellFormed(); };
// Par sécurité, tout texte envoyé est remis en forme (une moitié d'emoji isolée devient le caractère de remplacement).
const rpc = (fn, body, ms) => sb('rpc/' + fn, { method: 'POST', body: JSON.stringify(body, (k, v) => typeof v !== 'string' ? v : BROKEN_COUNT.test(v) ? BROKEN_COUNT.exec(v)[1].length : v.toWellFormed()) }, ms);

/* ---------- tampons (incréments depuis le dernier envoi) ---------- */
function emptyBuf() { return { presence: new Map(), minutes: [], snaps: [], events: [], mods: new Map(), words: new Map(), vods: [], meta: [], clips: new Map(), ecoute: new Map(), switches: new Map(), raids: [], trackedInc: 0 }; }
let buf = emptyBuf();
const curMin = {}, curGame = {}, info = {};
let chans = [], ws = null, connected = false, lastTrack = Date.now(), apiState = apiOn ? '' : 'non configurée';
const started = Date.now();

// Compteur sûr : un mot du chat peut s'appeler « constructor », « toString »… qui existent déjà sur tout objet JavaScript.
// Avant la 1.6.10, « constructor » + 1 donnait « function Object() { [native code] }1 » et la base refusait l'envoi.
const inc = (o, k, n = 1) => { o[k] = (Object.hasOwn(o, k) && typeof o[k] === 'number' ? o[k] : 0) + (+n || 0); };
// Compteur abîmé avant la 1.6.10 (« function Object() { [native code] }111 ») : on le remet à son vrai nombre (ici 3).
const BROKEN_COUNT = /^function \w*\(\) \{ \[native code\] \}(1+)$/;
function mergeBuf(into, b) {
  for (const [k, p] of b.presence) { const o = into.presence.get(k); if (!o) into.presence.set(k, p); else { o.f = Math.min(o.f, p.f); o.l = Math.max(o.l, p.l); o.n += p.n; } }
  for (const [k, w] of b.words) { const o = into.words.get(k); if (!o) { into.words.set(k, w); continue; }
    o.n += w.n; for (const x of ['w', 'e', 'moods', 'k']) { o[x] ||= {}; for (const kk in w[x]) inc(o[x], kk, w[x][kk]); } }
  into.minutes.push(...b.minutes); into.snaps.push(...b.snaps); into.events.push(...b.events); into.vods.push(...b.vods); into.meta.push(...b.meta); into.trackedInc += b.trackedInc;
  for (const [k, x] of b.clips) into.clips.set(k, x); // le relevé le plus récent d'un clip l'emporte
  for (const [k, x] of b.ecoute) { const o = into.ecoute.get(k); if (!o || x.e > o.e) into.ecoute.set(k, x); }
  for (const [k, x] of b.switches || []) { const o = into.switches.get(k); if (!o) into.switches.set(k, x); else o.n += x.n; }
  for (const [k, x] of b.mods || []) { const o = into.mods.get(k); if (!o) into.mods.set(k, x); else o.n += x.n; }
  if (b.raids) into.raids.push(...b.raids);
}
function bufToPayload(b) {
  return { presence: [...b.presence.values()], minutes: b.minutes, snaps: b.snaps, events: [...b.events, ...b.mods.values()], words: [...b.words.values()], vods: b.vods, meta: b.meta, clips: [...b.clips.values()], ecoute: [...b.ecoute.values()], switches: [...b.switches.values()] };
}
function bufToRaidPayload(b) {
  return { raids: b.raids.map(r => ({ ts: r.ts, from_channel: r.from_channel, to_channel: r.to_channel, viewers: r.viewers, unique_raiders: r.unique_raiders })) };
}
function payloadToBuf(p) {
  const b = emptyBuf();
  for (const x of p.presence || []) b.presence.set(x.u + '|' + x.c + '|' + x.d + '|' + x.g, x);
  for (const x of p.words || []) b.words.set(x.c + '|' + x.d, x);
  for (const x of p.clips || []) b.clips.set(x.c + '|' + x.id, x);
  for (const x of p.ecoute || []) b.ecoute.set(x.c + '|' + x.s, x);
  for (const x of p.switches || []) b.switches.set(x.u + '|' + x.d + '|' + x.a + '|' + x.b, x);
  b.minutes = p.minutes || []; b.snaps = p.snaps || []; b.events = p.events || []; b.vods = p.vods || []; b.meta = p.meta || []; b.raids = p.raids || []; b.trackedInc = p.trackedInc || 0;
  return b;
}
const bufEmpty = b => !(b.presence.size || b.minutes.length || b.snaps.length || b.events.length || b.mods.size || b.words.size || b.vods.length || b.meta.length || b.clips.size || b.ecoute.size || b.switches.size || b.raids.length || b.trackedInc);

/* ---------- ingestion du chat ---------- */
function parseIrc(line) {
  let tags = {}, rest = line;
  if (rest[0] === '@') { const i = rest.indexOf(' '); for (const kv of rest.slice(1, i).split(';')) { const j = kv.indexOf('='); tags[kv.slice(0, j)] = kv.slice(j + 1); } rest = rest.slice(i + 1); }
  let prefix = ''; if (rest[0] === ':') { const i = rest.indexOf(' '); prefix = rest.slice(1, i); rest = rest.slice(i + 1); }
  const sp = rest.indexOf(' '), cmd = sp < 0 ? rest : rest.slice(0, sp), params = sp < 0 ? '' : rest.slice(sp + 1);
  const m = params.match(/^#(\S+)/), ti = params.indexOf(' :');
  return { tags, nick: prefix.split('!')[0], cmd, chan: m ? m[1] : '', text: ti >= 0 ? params.slice(ti + 2) : '' };
}
const addEvent = (c, type, frm, n, t) => buf.events.push({ t, c, type, frm: frm || null, n: n || 1 });
function flushMinute(c, cm) {
  buf.minutes.push({ c, t: cm.mt, m: cm.m, u: cm.set.size, g: cm.g, r: cm.r, h: cm.h, n: cm.n, q: cm.q,
    e: Object.entries(cm.e).sort((a, b) => b[1] - a[1]).slice(0, 3), k: cm.k });
}
function flushMinutes(all) {
  const now = Math.floor(Date.now() / MIN) * MIN;
  for (const c in curMin) { const cm = curMin[c]; if (cm && (all || cm.mt < now)) { flushMinute(c, cm); delete curMin[c]; } }
}
/* ---------- changements de stream (1.5) ----------
   Pour chaque viewer (son empreinte), on retient la chaîne de son dernier message. Si son message suivant arrive dans une
   autre chaîne moins de 3 h après, c'est un changement de stream, compté par jour et par sens (de a vers b). Contrairement
   aux présences (premier et dernier message de la journée), ça voit chaque aller-retour, même entre deux lives en même temps.
   Seule l'empreinte est gardée en mémoire, et oubliée après 3 h sans message. */
const SWITCH_MS = 3 * HOUR, lastChan = new Map(); // empreinte → { c, t }
function noteSwitch(u, c, d, t) {
  const prev = lastChan.get(u);
  if (prev && prev.c !== c && t - prev.t <= SWITCH_MS) {
    const k = u + '|' + d + '|' + prev.c + '|' + c; let s = buf.switches.get(k);
    if (!s) buf.switches.set(k, s = { u, d, a: prev.c, b: c, n: 0 });
    s.n++;
  }
  lastChan.set(u, { c, t });
}
setInterval(() => { const lim = Date.now() - SWITCH_MS; for (const [u, x] of lastChan) if (x.t < lim) lastChan.delete(u); }, 10 * MIN);
function onChat(c, login, tags, t, text) {
  if (!login || isBot(login, tags)) return;
  const u = hashUser(login), d = dayKey(t), g = curGame[c] || UNKNOWN, k = u + '|' + c + '|' + d + '|' + g;
  let p = buf.presence.get(k); if (!p) buf.presence.set(k, p = { u, c, d, g, f: t, l: t, n: 0 });
  p.l = t; p.n++;
  noteSwitch(u, c, d, t);
  const mt = Math.floor(t / MIN) * MIN; let cm = curMin[c];
  if (!cm || cm.mt !== mt) { if (cm) flushMinute(c, cm); cm = curMin[c] = { mt, m: 0, set: new Set(), r: 0, h: 0, n: 0, q: 0, e: {}, k: {}, g }; }
  cm.m++; cm.set.add(u);
  const A = analyseText(text || '', tags.emotes, c);
  const kind = classify(c, login, tags, t, A.text, A.emotes);
  inc(cm.k, kind);
  cm.r += A.moods.rire; cm.h += A.moods.hype; cm.n += A.moods.negatif; cm.q += A.moods.question;
  for (const e of A.emotes) inc(cm.e, e);
  const wk = c + '|' + d; let W = buf.words.get(wk);
  if (!W) buf.words.set(wk, W = { c, d, w: {}, e: {}, moods: { rire: 0, hype: 0, negatif: 0, question: 0 }, k: {}, n: 0 });
  W.n++; inc(W.k, kind); for (const k2 in A.moods) if (A.moods[k2]) W.moods[k2]++;
  for (const w of A.words) inc(W.w, w); for (const e of A.emotes) inc(W.e, e);
  if (tags.bits) addEvent(c, 'bits', null, +tags.bits, t);
  if (tags['first-msg'] === '1') addEvent(c, 'first', null, 1, t);
}
function addRaid(c, raider, viewers, t) {
  buf.raids.push({ ts: t, from_channel: raider, to_channel: c, viewers: viewers, unique_raiders: 1 });
  if (inflight) {
    if (!inflight.raids) inflight.raids = [];
    inflight.raids.push({ ts: t, from_channel: raider, to_channel: c, viewers: viewers, unique_raiders: 1 });
  }
}
function onNotice(c, tags, t) {
  const id = tags['msg-id'];
  if (id === 'sub' || id === 'resub') addEvent(c, 'sub', null, 1, t);
  else if (id === 'submysterygift') addEvent(c, 'gift', null, +tags['msg-param-mass-gift-count'] || 1, t);
  else if (id === 'subgift' && !tags['msg-param-community-gift-id']) addEvent(c, 'gift', null, 1, t);
  else if (id === 'raid') {
    const raider = (tags['msg-param-login'] || '').toLowerCase();
    const viewers = +tags['msg-param-viewerCount'] || 0;
    addRaid(c, raider, viewers, t);
  }
}
/* ---------- modération (1.6) ----------
   Twitch envoie CLEARCHAT à tout le chat, connexions anonymes comprises : avec un pseudo et une durée, c'est un timeout ;
   avec un pseudo sans durée, un ban ; sans pseudo, le chat entier a été vidé (/clear). On ne garde ni le pseudo ni le
   modérateur (Twitch ne le donne pas) : seulement des compteurs, regroupés par chaîne et par minute (type ban, timeout
   ou clear, n = nombre), pour qu'un chat très modéré n'ajoute qu'une ligne par minute à la table events. */
// Depuis la 1.6.1, CLEARMSG (un message supprimé par un modérateur ou un bot) est compté de la même façon, type del.
// Le texte du message supprimé et son auteur, fournis par Twitch, sont ignorés.
function onClearChat(c, tags, t, target) { addMod(c, !target ? 'clear' : tags['ban-duration'] ? 'timeout' : 'ban', t); }
function addMod(c, type, t) {
  const mt = Math.floor(t / MIN) * MIN, k = c + '|' + mt + '|' + type;
  const o = buf.mods.get(k); if (o) o.n++; else buf.mods.set(k, { t: mt, c, type, frm: null, n: 1 });
}

/* ---------- connexion au chat ---------- */
let backoff = 3000, joined = new Set(), lastData = Date.now(), connStart = Date.now(), reconnTimer = null;
function joinAll() { let i = 0; for (const c of chans) if (!joined.has(c)) { joined.add(c); setTimeout(() => { if (ws && ws.readyState === 1) ws.send('JOIN #' + c); }, (i++) * 600); } }
function scheduleConnect(ms) { clearTimeout(reconnTimer); reconnTimer = setTimeout(connect, ms); }
function connect() {
  if (stopping) return;
  const s = ws = new WebSocket(cfg.ircUrl || 'wss://irc-ws.chat.twitch.tv:443');
  connStart = lastData = Date.now();
  s.onopen = () => {
    s.send('CAP REQ :twitch.tv/tags twitch.tv/commands'); s.send('PASS SCHMOOPIIE'); s.send('NICK justinfan' + Math.floor(1000 + Math.random() * 80000));
    joined = new Set(); joinAll(); connected = true; lastTrack = lastData = Date.now(); backoff = 3000; noteListening();
    log(`Connecté au chat Twitch, ${chans.length} chaînes.`);
  };
  s.onmessage = e => {
    const t = lastData = Date.now();
    for (const line of String(e.data).split('\r\n')) {
      if (!line) continue;
      if (line.startsWith('PING')) { s.send('PONG :tmi.twitch.tv'); continue; }
      const m = parseIrc(line);
      if (m.cmd === 'RECONNECT') { restartChat('Twitch demande une reconnexion'); return; } // la commande, pas un message qui contiendrait le mot
      if (!m.chan || !chans.includes(m.chan)) continue;
      if (m.cmd === 'PRIVMSG') onChat(m.chan, m.tags.login || m.nick, m.tags, t, m.text);
      else if (m.cmd === 'USERNOTICE') onNotice(m.chan, m.tags, t);
      else if (m.cmd === 'CLEARCHAT') onClearChat(m.chan, m.tags, t, m.text.trim());
      else if (m.cmd === 'CLEARMSG') addMod(m.chan, 'del', t);
    }
  };
  s.onclose = () => {
    if (ws !== s) return; // ancienne connexion déjà remplacée
    noteListening(); track(); connected = false;
    if (stopping) return;
    log(`Chat déconnecté, nouvelle tentative dans ${Math.round(backoff / 1000)} s.`);
    scheduleConnect(backoff); backoff = Math.min(backoff * 2, 60000);
  };
  s.onerror = () => {};
}
// Abandonne la connexion en cours sans attendre sa fermeture (qui peut ne jamais venir) et en ouvre une nouvelle.
function restartChat(why) {
  if (stopping) return;
  log(`Chat : ${why}, reconnexion.`);
  const old = ws; ws = null;
  if (old) { old.onopen = old.onmessage = old.onclose = old.onerror = null; try { old.close(); } catch {} }
  noteListening(); track(); connected = false;
  scheduleConnect(1000);
}
// Chien de garde : après une veille ou une coupure silencieuse, la connexion peut rester « ouverte » sans plus rien recevoir.
// Twitch envoie un PING toutes les 5 min environ ; on relance nous-mêmes un PING après 2 min de silence, et on reconnecte après 6 min.
function watchdog() {
  if (stopping || !ws) return;
  const idle = Date.now() - lastData;
  if (ws.readyState === 0 && Date.now() - connStart > MIN) return restartChat('connexion bloquée depuis 1 min');
  if (ws.readyState >= 2 && idle > 3 * MIN) return restartChat('connexion fermée sans reprise'); // la reconnexion prévue est toujours < 1 min
  if (ws.readyState !== 1) return;
  if (idle > 6 * MIN) return restartChat(`aucune donnée reçue depuis ${Math.round(idle / MIN)} min`);
  if (idle > 2 * MIN) { try { ws.send('PING :tmi.twitch.tv'); } catch {} }
}
function track() { const now = Date.now(); if (connected) buf.trackedInc += now - lastTrack; lastTrack = now; }

/* ---------- périodes d'écoute, chaîne par chaîne ----------
   Le tableau de bord grise les moments où le collecteur n'écoutait pas une chaîne (PC éteint ou en veille,
   chat coupé, chaîne pas encore ajoutée) : sans ça, « 0 message » et « pas d'écoute » se confondent.
   Une période s'allonge toutes les 30 s tant que le chat répond ; plus de 4 min sans nouvelles (veille,
   connexion muette) la referme, et la suivante repart de zéro. */
const GAP_MS = 4 * MIN, ecoute = {}; // chaîne -> { s, e } période en cours
function noteListening(now = Date.now()) {
  const ok = connected && !!ws && now - lastData < GAP_MS;
  for (const c in ecoute) if (!ok || !joined.has(c) || !chans.includes(c) || now - ecoute[c].e > GAP_MS) delete ecoute[c];
  if (!ok) return;
  for (const c of chans) {
    if (!joined.has(c)) continue;
    const p = ecoute[c] ||= { s: now, e: now }; p.e = now;
    buf.ecoute.set(c + '|' + p.s, { c, s: p.s, e: now });
  }
}

/* ---------- liste des chaînes (table channels) ---------- */
async function syncChannels() {
  try {
    let rows = await sb('channels?select=c&order=added.asc&limit=' + MAX_CHANS);
    if (!rows.length && Array.isArray(cfg.chainesParDefaut) && cfg.chainesParDefaut.length) {
      await sb('channels', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates' }, body: JSON.stringify(cfg.chainesParDefaut.map(c => ({ c: String(c).toLowerCase() }))) });
      rows = await sb('channels?select=c&order=added.asc&limit=' + MAX_CHANS);
    }
    try { fs.writeFileSync(CHAN_CACHE, JSON.stringify(rows.map(r => r.c))); } catch {}
    applyChannels(rows.map(r => r.c));
  } catch (e) {
    log('Impossible de lire la liste des chaînes :', e.message);
    if (!chans.length) { // pas de réseau au démarrage : on écoute quand même la dernière liste connue
      let cached = []; try { cached = JSON.parse(fs.readFileSync(CHAN_CACHE, 'utf8')); } catch {}
      const fallback = cached.length ? cached : (cfg.chainesParDefaut || []).map(c => String(c).toLowerCase());
      if (fallback.length) { log('Utilisation de la dernière liste connue en attendant.'); applyChannels(fallback); }
    }
  }
}
function applyChannels(next) {
  {
    const added = next.filter(c => !chans.includes(c)), removed = chans.filter(c => !next.includes(c));
    if (!added.length && !removed.length) return;
    noteListening(); // prolonge l'écoute jusqu'à maintenant, avant de quitter les chaînes retirées
    chans = next;
    if (ws && ws.readyState === 1) { for (const c of removed) { ws.send('PART #' + c); joined.delete(c); } joinAll(); }
    noteListening();
    if (added.length || removed.length) log(`Chaînes suivies : ${chans.join(', ')}`);
    if (added.length) { pollStreams(); loadEmotes(added); pollMeta(); pollClips(); }
  }
}

/* ---------- API Twitch ---------- */
let token = null, tokenExp = 0;
async function getToken() {
  if (token && Date.now() < tokenExp - HOUR) return token;
  const r = await fetch((cfg._idUrl || 'https://id.twitch.tv') + '/oauth2/token', { method: 'POST', body: new URLSearchParams({ client_id: cfg.twitchClientId, client_secret: cfg.twitchClientSecret, grant_type: 'client_credentials' }), signal: AbortSignal.timeout(20000) });
  const j = await r.json(); if (!j.access_token) throw new Error('jeton Twitch refusé : ' + (j.message || r.status));
  token = j.access_token; tokenExp = Date.now() + j.expires_in * 1000; return token;
}
async function helix(p) {
  const r = await fetch((cfg._helixUrl || 'https://api.twitch.tv/helix') + '/' + p, { headers: { 'Client-Id': cfg.twitchClientId, Authorization: 'Bearer ' + await getToken() }, signal: AbortSignal.timeout(20000) });
  if (r.status === 401) { token = null; throw new Error('jeton Twitch expiré, renouvellement au prochain essai'); }
  if (!r.ok) throw new Error('API Twitch : erreur ' + r.status);
  return r.json();
}
const vodTried = {}, vodFound = {}, knownVods = new Set();
async function pollStreams() {
  if (!apiOn || !chans.length) return;
  try {
    const t = Date.now(), seen = new Set();
    for (let i = 0; i < chans.length; i += 100) {
      const r = await helix('streams?first=100&' + chans.slice(i, i + 100).map(c => 'user_login=' + encodeURIComponent(c)).join('&'));
      for (const s of r.data) {
        const c = s.user_login.toLowerCase(), g = s.game_name || UNKNOWN; seen.add(c); curGame[c] = g;
        info[c] = { live: true, v: s.viewer_count, g, ti: s.title, since: Date.parse(s.started_at), uid: s.user_id };
        buf.snaps.push({ c, t, live: 1, v: s.viewer_count, g });
      }
    }
    for (const c of chans) if (!seen.has(c)) { const was = info[c] && info[c].live; info[c] = { live: false }; curGame[c] = OFFLINE; if (was !== false) buf.snaps.push({ c, t, live: 0, v: 0, g: OFFLINE }); }
    if (apiState !== 'ok') log('API Twitch OK.');
    apiState = 'ok';
    // Replay du live en cours : réessayé à chaque relevé (toutes les 2 min) tant qu'il n'est pas trouvé, 15 fois au plus
    // par live (30 min). Un seul essai ne suffisait pas : erreur réseau passagère, ou replay pas encore créé par Twitch.
    for (const c of chans) {
      const I = info[c]; if (!I || !I.live || vodFound[c] === I.since) continue;
      const tr = vodTried[c] && vodTried[c].since === I.since ? vodTried[c] : (vodTried[c] = { since: I.since, n: 0 });
      if (tr.n >= 15) continue; tr.n++;
      try { const v = (await helix('videos?type=archive&first=1&user_id=' + I.uid)).data[0];
        if (v && Math.abs(Date.parse(v.created_at) - I.since) < 20 * MIN) { vodFound[c] = I.since;
          if (!knownVods.has(v.id)) { knownVods.add(v.id); buf.vods.push({ c, id: v.id, start: Date.parse(v.created_at) }); } } } catch {}
    }
  } catch (e) { if (apiState !== e.message) log('API Twitch :', e.message); apiState = e.message; }
}

/* ---------- état des chaînes (followers, pub, chat) et meilleurs clips ---------- */
const lastMeta = {}, vodStart = {}, clipDone = {}; // uids (pseudo → identifiant Twitch) est déclaré plus haut
const hourOf = t => Math.floor(t / HOUR);
async function ensureIds(list) {
  const need = list.filter(c => !uids[c]);
  for (let i = 0; i < need.length; i += 100) {
    const r = await helix('users?' + need.slice(i, i + 100).map(c => 'login=' + encodeURIComponent(c)).join('&'));
    for (const u of r.data) { uids[u.login.toLowerCase()] = u.id; if (u.profile_image_url) avatars[u.login.toLowerCase()] = u.profile_image_url; }
  }
}
const sameMeta = (a, b) => a.br === b.br && a.lg === b.lg && JSON.stringify(a.lab) === JSON.stringify(b.lab) && JSON.stringify(a.tg) === JSON.stringify(b.tg) && JSON.stringify(a.cs) === JSON.stringify(b.cs);
let metaBusy = false;
async function pollMeta() {
  if (!apiOn || !chans.length || metaBusy) return; metaBusy = true;
  try {
    await ensureIds(chans);
    const t = Date.now(), list = chans.filter(c => uids[c]), byId = {};
    for (let i = 0; i < list.length; i += 100) {
      const r = await helix('channels?' + list.slice(i, i + 100).map(c => 'broadcaster_id=' + uids[c]).join('&'));
      for (const x of r.data) byId[x.broadcaster_id] = x;
    }
    for (const c of list) {
      const x = byId[uids[c]]; if (!x) continue;
      const last = lastMeta[c];
      const row = { c, t, br: x.is_branded_content ? 1 : 0, lab: x.content_classification_labels || [], tg: x.tags || [], lg: x.broadcaster_language || null, cs: last ? last.cs : {}, fol: last ? last.fol : null };
      try { const s = (await helix('chat/settings?broadcaster_id=' + uids[c])).data[0];
        if (s) row.cs = { sl: s.slow_mode ? (s.slow_mode_wait_time || 0) : 0, fo: s.follower_mode ? 1 : 0, su: s.subscriber_mode ? 1 : 0, em: s.emote_mode ? 1 : 0, un: s.unique_chat_mode ? 1 : 0 }; } catch {}
      const newHour = !last || hourOf(t) !== hourOf(last.t);
      if (newHour) { try { const f = await helix('channels/followers?first=1&broadcaster_id=' + uids[c]); if (typeof f.total === 'number') row.fol = f.total; } catch {} }
      if (newHour || !sameMeta(last, row)) { buf.meta.push(row); lastMeta[c] = row; }
    }
  } catch (e) { log('API Twitch (état des chaînes) :', e.message); }
  finally { metaBusy = false; }
}
let clipsBusy = false;
async function pollClips() {
  if (!apiOn || !chans.length || clipsBusy) return; clipsBusy = true;
  try {
    await ensureIds(chans);
    for (const c of [...chans]) {
      if (!uids[c]) continue;
      try {
        const r = await helix('clips?first=100&broadcaster_id=' + uids[c] + '&started_at=' + new Date(Date.now() - (clipDone[c] ? 3 : 7) * DAY).toISOString());
        const need = [...new Set(r.data.map(k => k.video_id).filter(v => v && !(v in vodStart)))];
        for (let i = 0; i < need.length; i += 100) { // heure de début des lives d'où viennent les clips
          const part = need.slice(i, i + 100), got = {};
          for (const v of (await helix('videos?' + part.map(v => 'id=' + v).join('&'))).data) got[v.id] = Date.parse(v.created_at);
          for (const v of part) vodStart[v] = got[v] || 0; // 0 = replay supprimé : moment approximatif
        }
        for (const k of r.data) {
          const vs = vodStart[k.video_id], ex = !!(vs && k.vod_offset != null), dur = k.duration || 0;
          buf.clips.set(c + '|' + k.id, { c, id: k.id, ts: ex ? vs + k.vod_offset * 1000 : Date.parse(k.created_at) - dur * 1000, d: dur, v: k.view_count || 0, ti: cut(k.title, 100), ex: ex ? 1 : 0 });
        }
        clipDone[c] = true;
      } catch (e) { log('API Twitch (clips de ' + c + ') :', e.message); }
    }
  } catch (e) { log('API Twitch (clips) :', e.message); }
  finally { clipsBusy = false; }
}

/* ---------- envoi vers Supabase ---------- */
// Chaque lot porte un identifiant. Si Supabase a enregistré un lot mais que la réponse s'est perdue (délai dépassé),
// le même lot est renvoyé avec le même identifiant et la base l'ignore : rien n'est compté deux fois.
// Il n'y a jamais qu'un lot « incertain » (inflight) à la fois ; tout ce qui arrive ensuite s'accumule dans buf,
// qui n'est jamais parti, et peut donc être fusionné sans risque.
let sending = false, lastOk = 0, failCount = 0, inflight = null, pendingErr = false;
function statusNow(trackedInc) {
  const pub = {}; for (const c of chans) { const I = info[c]; if (I) pub[c] = { live: I.live, v: I.v, g: I.g, ti: I.ti, since: I.since, img: avatars[c] }; }
  return { last_seen: Date.now(), started, tracked_inc: trackedInc, info: pub, api: apiState, version: VERSION, retention: RETENTION, ...(dbMb != null ? { db_mb: dbMb } : {}) };
}
// Les compteurs de mots et d'emotes (un gros bloc par chaîne et par jour) ne partent que toutes les 5 min : chaque envoi
// réécrit la ligne entière dans la base, ce qui l'encombrait et forçait le tableau de bord à la retélécharger chaque minute.
const WORDS_MS = 5 * MIN; let lastWords = Date.now();
function seal(force = false) {
  if (inflight) return;
  const t = buf; buf = emptyBuf();
  if (!force && Date.now() - lastWords < WORDS_MS) { buf.words = t.words; t.words = new Map(); } else lastWords = Date.now();
  // Les raids sont stockés séparément et seront envoyés via ingest_raid
  inflight = { id: crypto.randomUUID(), payload: { ...bufToPayload(t), trackedInc: t.trackedInc }, raids: t.raids };
}
// Un gros lot (rattrapage après une panne, premiers clips de nouvelles chaînes…) dépasse le temps maximal d'une requête
// Supabase (erreur 57014 « statement timeout ») et serait refusé à chaque essai : il part en morceaux d'au plus CHUNK_ROWS
// lignes. Le découpage d'un même lot est toujours le même et chaque morceau a son identifiant (lot#n) : la base ignore un
// morceau déjà enregistré si on le renvoie. Le temps d'écoute (tracked_inc) n'est compté qu'avec le premier morceau.
// Réduction de taille de batch pour éviter timeouts Supabase 57014
// Avant: CHUNK_ROWS = 2000, après: 500 pour être plus conservateur
const CHUNK_ROWS = 500, CHUNK_KEYS = ['presence', 'minutes', 'snaps', 'events', 'words', 'vods', 'meta', 'clips', 'ecoute', 'switches'];
const CHUNK_WEIGHT = { words: 25 }; // un bloc de mots d'une chaîne pour une journée pèse beaucoup plus lourd qu'une ligne
// Petit délai entre les chunks pour laisser respirer la base
const CHUNK_DELAY_MS = 500;
function chunks(payload) {
  const out = []; let cur = {}, n = 0;
  for (const k of CHUNK_KEYS) {
    let items = payload[k] || [];
    // Dédoubler les présences par (u, c, d, g) pour éviter les conflits ON CONFLICT
    if (k === 'presence') {
      const seen = new Set();
      items = items.filter(x => {
        const key = `${x.u}|${x.c}|${x.d}|${x.g}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    for (const x of items) {
      const w = CHUNK_WEIGHT[k] || 1;
      if (n && n + w > CHUNK_ROWS) { out.push(cur); cur = {}; n = 0; }
      (cur[k] ||= []).push(x); n += w;
    }
  }
  if (n || !out.length) out.push(cur);
  return out;
}
async function sendInflight(ms = 60000) { // Timeout augmenté à 60s
  const b = inflight, inc = b.payload.trackedInc || 0;
  // Extraire les raids du payload puisqu'ils vont dans une table séparée
  const raids = b.raids || b.payload.raids || [];
  const payloadWithoutRaids = { ...b.payload };
  delete payloadWithoutRaids.raids;
  const parts = chunks(payloadWithoutRaids);
  for (let i = 0; i < parts.length; i++) {
    const id = parts.length === 1 ? b.id : b.id + '#' + i; // un lot d'un seul morceau garde son identifiant d'avant
    // Attendre un peu entre les chunks pour laisser respirer la base
    if (i > 0) await sleep(CHUNK_DELAY_MS);
    await rpc('ingest', { p: { ...parts[i], batch: id, status: statusNow(i === 0 ? inc : 0) } }, ms);
  }
  // Envoyer les raids séparément (table raid_events dédiée)
  if (raids.length > 0) {
    await rpc('ingest_raid', { p: bufToRaidPayload({ raids }) }, ms);
  }
  if (inflight === b) inflight = null;
}
// Copie sur disque de ce qui n'est pas encore envoyé : survit à un arrêt brutal (Gestionnaire des tâches, coupure de courant).
function savePending() {
  try {
    if (!inflight && bufEmpty(buf)) { if (fs.existsSync(PENDING_PATH)) fs.unlinkSync(PENDING_PATH); return; }
    const tmp = PENDING_PATH + '.tmp';
    // Sauvegarder les raids de l'inflight et du buf séparément
    const inflightToSave = inflight ? { ...inflight, raids: inflight.raids || [] } : null;
    const bufToSave = { ...bufToPayload(buf), trackedInc: buf.trackedInc };
    fs.writeFileSync(tmp, JSON.stringify({ v: 2, inflight: inflightToSave, buf: bufToSave, raids: buf.raids }));
    fs.renameSync(tmp, PENDING_PATH); pendingErr = false;
  } catch (e) { if (!pendingErr) { pendingErr = true; log('Impossible d\'écrire en-attente.json :', e.message); } }
}
function loadPending() {
  try {
    if (!fs.existsSync(PENDING_PATH)) return;
    const j = JSON.parse(fs.readFileSync(PENDING_PATH, 'utf8'));
    if (j.v === 2) {
      // Restaurer inflight avec ses raids
      inflight = j.inflight || null;
      if (inflight) inflight.raids = inflight.raids || [];
      mergeBuf(buf, payloadToBuf(j.buf || {})); buf.raids = j.raids || [];
    }
    else mergeBuf(buf, payloadToBuf(j)); // ancien format (1.2 et avant)
    log('Données en attente rechargées.'); // le fichier reste en place jusqu'au prochain envoi réussi
  } catch (e) { log('Fichier en attente illisible, ignoré :', e.message); }
}
// Alerte Windows (notification en bas à droite) quand les envois échouent plusieurs fois de suite, rappel toutes les 30 min
// tant que ça dure, et une dernière notification quand ça repart. « alertes »: false dans config.json les coupe.
const ALERT_AFTER = 3, ALERT_REPEAT_MS = 30 * MIN; // 3 échecs = environ 1 min 30 (un envoi toutes les 30 s)
let failSince = 0, alertedAt = 0, notifyErr = false;
const since = t => { const m = Math.round((Date.now() - t) / MIN); return m < 1 ? 'depuis moins d\'une minute' : m < 60 ? `depuis ${m} min` : `depuis ${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`; };
const TOAST_PS = `$ErrorActionPreference='Stop'
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType=WindowsRuntime] | Out-Null
$t=[Security.SecurityElement]::Escape($env:TO_TITLE); $b=[Security.SecurityElement]::Escape($env:TO_BODY)
$x=New-Object Windows.Data.Xml.Dom.XmlDocument
$x.LoadXml("<toast><visual><binding template='ToastGeneric'><text>$t</text><text>$b</text></binding></visual></toast>")
$app='{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe'
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($app).Show([Windows.UI.Notifications.ToastNotification]::new($x))`;
function notify(title, body) {
  if (cfg.alertes === false || process.platform !== 'win32') return;
  // Le texte passe par des variables d'environnement : un message d'erreur avec des guillemets ne peut rien casser.
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', TOAST_PS],
    { env: { ...process.env, TO_TITLE: title, TO_BODY: body }, windowsHide: true, timeout: 20000 },
    err => { if (err && !notifyErr) { notifyErr = true; log('Notification Windows impossible :', String(err.message).split('\n')[0]); } });
}
async function flush(final = false) {
  if (sending || stopping) return; sending = true;
  flushMinutes(final); track();
  const retry = !!inflight;
  try {
    // Chaque lot est copié sur disque (avec son identifiant) avant de partir, comme à l'arrêt. Le fichier garde aussi les
    // mots et emotes retenus jusqu'à 5 min : un arrêt brutal (Gestionnaire des tâches, coupure de courant) ne les perd plus,
    // et un lot déjà enregistré par la base puis rechargé au démarrage n'est pas compté deux fois.
    seal(); savePending(); await sendInflight();
    if (retry && !bufEmpty(buf)) { seal(); savePending(); await sendInflight(); } // après un lot renvoyé, on envoie aussi ce qui s'est accumulé
    if (failCount) log(`Envoi rétabli après ${failCount} échec(s).`);
    if (alertedAt) notify('Twitch Overlap : envois rétablis', `Les envois vers Supabase refonctionnent après ${failCount} échec(s), ${since(failSince)}. Les données gardées sur le PC sont parties.`);
    failCount = 0; failSince = 0; alertedAt = 0; lastOk = Date.now();
    savePending(); // ne garde que ce qui n'est pas encore parti (mots retenus, messages arrivés pendant l'envoi) ; efface le fichier s'il n'y a rien
  } catch (e) {
    failCount++; if (failCount === 1) failSince = Date.now(); savePending();
    if (failCount === 1 || failCount % 20 === 0) log(`Envoi vers Supabase impossible (${failCount}) :`, e.message);
    if (!final && failCount >= ALERT_AFTER && Date.now() - alertedAt >= ALERT_REPEAT_MS) {
      alertedAt = Date.now();
      log(`Alerte : ${failCount} envois de suite ont échoué.`);
      notify('Twitch Overlap : envois bloqués', `${failCount} envois vers Supabase ont échoué de suite (${since(failSince)}). Les données sont gardées sur le PC en attendant. Cause : ${String(e.message).slice(0, 120)}`);
    }
  } finally { sending = false; }
}
// Ménage toutes les heures (1.6.11, avant : une fois par jour) : avec un historique court, la base ne gonfle plus d'une
// journée entière entre deux ménages. La date du dernier ménage est gardée sur disque ; il n'est noté au journal qu'une
// fois par jour.
const CLEAN_PATH = path.join(DIR, 'dernier-menage.txt'), CLEAN_EVERY = HOUR, CLEAN_BATCH = 100000, CLEAN_MAX_ROUNDS = 40;
let lastClean = (() => { try { return +fs.readFileSync(CLEAN_PATH, 'utf8') || 0; } catch { return 0; } })(), lastCleanLog = 0;
async function dailyCleanup() {
  if (Date.now() - lastClean < CLEAN_EVERY - MIN) return; lastClean = Date.now();
  try { fs.writeFileSync(CLEAN_PATH, String(lastClean)); } catch {}
  // 1.6.12 : par paquets. Un jour de présences (plusieurs centaines de milliers de lignes) supprimé d'un seul coup dépassait la limite
  // de temps de l'API (code 57014) : le ménage échouait et la base ne se vidait plus. cleanup() supprime au plus CLEAN_BATCH lignes par
  // table et renvoie combien elle en a supprimé ; on la rappelle tant qu'elle en supprime. Un ancien schema.sql (qui renvoie null)
  // fait une seule passe, comme avant.
  let total = 0, rounds = 0;
  try {
    for (;;) {
      const n = Number(await rpc('cleanup', { days_minutes: RETENTION.minutes, days_presence: RETENTION.presence, days_events: RETENTION.events, days_snaps: RETENTION.snaps, max_rows: CLEAN_BATCH }, 90000)) || 0;
      rounds++; total += n;
      if (n <= 0 || rounds >= CLEAN_MAX_ROUNDS) break;
      await new Promise((r) => setTimeout(r, 1500)); // laisse respirer la base entre deux paquets
    }
    if (rounds > 1) log(`Ménage par paquets : ${total} ligne(s) supprimée(s) en ${rounds} passes${rounds >= CLEAN_MAX_ROUNDS ? ' (arrêté à la limite, la suite à la prochaine heure)' : ''}.`);
    if (Date.now() - lastCleanLog >= DAY) { lastCleanLog = Date.now(); log(`Ménage effectué (gardés : détail minute ${RETENTION.minutes} j, viewers ${RETENTION.presence} j, événements ${RETENTION.events} j, relevés ${RETENTION.snaps} j).`); }
  }
  catch (e) { log(`Ménage impossible${total ? ` (après ${total} ligne(s) supprimée(s))` : ''} :`, e.message); }
}
let dbMb = null, dbWarned = 0, dbErrLogged = false;
async function checkDbSize() {
  try {
    const mb = await rpc('db_size_mb', {});
    if (typeof mb === 'number') dbMb = mb;
    if (dbMb >= DB_WARN_MB && Date.now() - dbWarned > DAY) {
      dbWarned = Date.now();
      log(`Attention : la base Supabase pèse ${dbMb} Mo (limite de l'offre gratuite : 500 Mo). Baisse "joursPresence" dans config.json ou suis moins de chaînes.`);
    }
  } catch (e) {
    if (!dbErrLogged) { dbErrLogged = true; log('Taille de la base inconnue' + schemaHint(e) + ' :', e.message); }
  }
}
// Conseille de mettre la base à jour seulement quand la fonction manque vraiment, pas lors d'une coupure réseau.
const schemaHint = e => /Supabase 404|PGRST202/.test(e.message) ? ' (exécute la dernière version de schema.sql dans Supabase)' : '';
let boardCodeOk = false;
async function registerBoardCode() {
  if (boardCodeOk) return;
  try { await rpc('set_board_code', { code: cfg.codeTableau }); boardCodeOk = true; }
  catch (e) { log('Code du tableau de bord pas encore enregistré' + schemaHint(e) + ' :', e.message); }
}

/* ---------- arrêt propre ---------- */
let stopping = false;
async function shutdown(sig) {
  if (stopping) return; stopping = true; log(`Arrêt (${sig})…`);
  try { ws && ws.close(); } catch {}
  for (let i = 0; i < 100 && sending; i++) await sleep(100); // laisse finir un envoi en cours (10 s au plus)
  noteListening(); flushMinutes(true); track();
  try { // chaque lot est copié sur disque avant d'être envoyé : un arrêt forcé pendant l'envoi ne perd rien et ne double rien
    for (let i = 0; i < 2 && (inflight || !bufEmpty(buf)); i++) { seal(true); savePending(); await sendInflight(8000); }
  } catch (e) { log('Envoi final impossible :', e.message); }
  savePending();
  if (fs.existsSync(PENDING_PATH)) log('Données non envoyées gardées pour le prochain démarrage.');
  try { if (+fs.readFileSync(PID_PATH, 'utf8').split(':')[0] === process.pid) fs.unlinkSync(PID_PATH); } catch {}
  log('Collecteur arrêté.');
  process.exit(0);
}
// Arrêt demandé par desinstaller-demarrage.bat : sous Windows, taskkill /F tue le processus sans le prévenir.
try { fs.unlinkSync(STOP_PATH); } catch {} // demande restée d'un arrêt précédent
setInterval(() => { if (fs.existsSync(STOP_PATH)) { try { fs.unlinkSync(STOP_PATH); } catch {} shutdown('demande d\'arrêt'); } }, 2000);
for (const s of ['SIGINT', 'SIGTERM', 'SIGBREAK', 'SIGHUP']) process.on(s, () => shutdown(s));
process.on('uncaughtException', e => log('Erreur inattendue :', e.stack || e.message));
process.on('unhandledRejection', e => log('Erreur inattendue :', (e && e.stack) || e));

/* ---------- démarrage ---------- */
(async () => {
  log(`Collecteur Twitch Overlap ${VERSION} — démarrage.` + (apiOn ? '' : ' API Twitch non configurée : pas de viewers ni de jeux.'));
  loadPending();
  for (;;) { await syncChannels(); if (chans.length) break; log('Aucune chaîne à suivre pour l\'instant (liste vide ou Supabase injoignable). Nouvel essai dans 1 min.'); await sleep(CHAN_SYNC_MS); }
  await registerBoardCode(); await checkDbSize();
  await pollStreams();
  connect();
  setInterval(watchdog, MIN);
  setInterval(noteListening, 30000);
  setInterval(checkDbSize, HOUR); setInterval(registerBoardCode, 15 * MIN); // réessaie si Supabase était injoignable au démarrage
  setInterval(() => flush(), FLUSH_MS);
  setInterval(pollStreams, POLL_MS);
  pollMeta(); setTimeout(pollClips, 20000);
  setInterval(pollMeta, 15 * MIN); setInterval(pollClips, 15 * MIN);
  setInterval(syncChannels, CHAN_SYNC_MS);
  setInterval(dailyCleanup, HOUR); dailyCleanup();
  setInterval(() => loadEmotes(chans, true), HOUR);
  setInterval(() => { if (connected) log(`En marche · ${chans.length} chaînes · dernier envoi ${lastOk ? Math.round((Date.now() - lastOk) / 1000) + ' s' : 'aucun'} · API ${apiState}`); }, HOUR);
})();
