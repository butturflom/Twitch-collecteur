/* ---------- constantes ---------- */
const PAL=['#3987e5','#d95926','#199e70','#c98500','#d55181','#0ca30c','#9085e9','#e66767'];
const OTHER='#8a8a93';
const BOTS=new Set(['nightbot','streamelements','streamlabs','moobot','wizebot','fossabot','soundalerts','sery_bot','kofistreambot','commanderroot','botrixoficial','pokemoncommunitygame','own3d','blerp','streamstickers','tangiabot','lumiastream','creatisbot','frostytoolsdotcom','fourthwallhq','botisimo','coebot','deepbot','phantombot','stay_hydrated_bot','kikettebot','supibot','streamholicsbot']);
// Même règle que le collecteur : un pseudo en « …bot » n'est un bot que s'il est modérateur ou VIP de la chaîne.
const isBot=(u,tags={})=>BOTS.has(u)||(/bot$/.test(u)&&(tags.mod==='1'||/(^|,)(moderator|vip|broadcaster)\//.test(tags.badges||'')));
const MIN=60000,HOUR=3600000,DAY=86400000;
const UNKNOWN='?',OFFLINE='Hors ligne';
const $=id=>document.getElementById(id);
const fmt=n=>Math.round(n).toLocaleString('fr-FR');
const fmt1=n=>(Math.round(n*10)/10).toLocaleString('fr-FR');
const pct=x=>isFinite(x)?(x*100).toFixed(x<.1?1:0).replace('.',',')+' %':'—';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
// Dates et heures à l'heure de Paris, comme le collecteur : les jours et les périodes restent justes même si la page
// est ouverte sur un ordinateur réglé sur un autre fuseau horaire.
const TZ='Europe/Paris';
const tzFmt=new Intl.DateTimeFormat('en-GB',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
let tzMin=NaN,tzVal=null; // cache sur la minute en cours (dayKey est appelé pour chaque message)
function tzParts(t){t=+t;const m=Math.floor(t/MIN);
  const base=m===tzMin?tzVal:(()=>{const o={};for(const p of tzFmt.formatToParts(new Date(m*MIN)))o[p.type]=p.value;tzMin=m;return tzVal={y:+o.year,mo:+o.month,d:+o.day,h:+o.hour%24,mi:+o.minute}})();
  return {...base,s:Math.floor(t/1000)%60}}
const dayKey=t=>{const p=tzParts(t);return p.y+'-'+pad(p.mo)+'-'+pad(p.d)};
const hhmm=t=>{const p=tzParts(t);return pad(p.h)+'h'+pad(p.mi)};
const hourOf=t=>tzParts(t).h;
const dayLbl=t=>new Date(t).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short',timeZone:TZ});
function parisMidnight(t){const p=tzParts(t),u=Date.UTC(p.y,p.mo-1,p.d);let g=u;
  for(let i=0;i<2;i++){const q=tzParts(g);g=u-(Date.UTC(q.y,q.mo-1,q.d,q.h,q.mi)-Math.floor(g/MIN)*MIN)}return g}
const dur=ms=>{const m=Math.round(ms/MIN);return m<60?m+' min':Math.floor(m/60)+' h '+pad(m%60)};
const median=a=>{if(!a.length)return NaN;const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)]};
const maxOf=(a,f=x=>x)=>a.reduce((m,x)=>Math.max(m,f(x)),-Infinity);
const minOf=(a,f=x=>x)=>a.reduce((m,x)=>Math.min(m,f(x)),Infinity);

/* ---------- état ---------- */
let cfg={chans:['etoiles','xari','gotaga','kamet0'],clientId:'',token:'',mode:'local',sbUrl:'',sbKey:'',sbCode:'',localChans:null};
try{Object.assign(cfg,JSON.parse(localStorage.getItem('to2-cfg')||'{}'))}catch(e){}
const saveCfg=()=>{try{localStorage.setItem('to2-cfg',JSON.stringify(cfg))}catch(e){}};
// Compteur sûr : un mot du chat peut s'appeler « constructor » ou « toString », qui existent déjà sur tout objet JavaScript.
const cnt=(o,k)=>Object.hasOwn(o,k)&&typeof o[k]==='number'?o[k]:0;
const freshDB=()=>({presence:{},minutes:{},snaps:[],events:[],words:{},vods:{},meta:{},clips:{},ecoute:{},switches:{},trackedMs:0,revs:{},hashed:true});
let DB=freshDB();
let ws=null,running=false,sessionStart=0,timers=[],dirty=false;
const curMin={};      // canal -> {mt,m,set}
const curGame={};     // canal -> jeu actuel
const info={};        // canal -> {live,v,g,ti,since}
let apiState='';      // '', 'ok', message d'erreur
let tab='overview',period='all',selChan=null,selChat='*',discover=null,lastMap=0;

const colorOf=c=>{const i=shown().indexOf(c); // rang dans la liste affichée (filtre Langue compris)
  return i>=0&&i<8?PAL[i]:OTHER};
/* ---------- photos de profil des streamers ----------
   Envoyées par le collecteur (1.4.1+) dans son statut, ou demandées à l'API Twitch si elle est configurée ici.
   Gardées dans ce navigateur pour s'afficher tout de suite au prochain chargement. Sans photo : l'initiale sur la couleur de la chaîne. */
cfg.avatars=cfg.avatars||{};
const setAvatar=(c,u)=>{if(c&&u&&/^https:\/\//.test(u)&&cfg.avatars[c]!==u){cfg.avatars[c]=u;saveCfg();return true}return false};
const avUrl=c=>(info[c]&&info[c].img)||cfg.avatars[c]||'';
// Planète peinte de la chaîne (décision du 26/11 : elle remplace la photo de profil). « planet » : style global (index.css) ;
// « av » : taille et marges dans le contexte de l'ancien code (legacy.css). Le dessin vient de lib/planet.ts (window.planetInner),
// le même que ChannelAvatar en React. window.planetRing : les 3 chaînes les plus fortes de la vue, mis à jour par render().
const ringOf=c=>!!(window.planetRing&&window.planetRing.has(c));
function av(c,size=''){const cl='planet av'+(size?' '+size:'');
  return `<span class="${cl}" aria-hidden="true" style="--c:${colorOf(c)}">${window.planetInner?window.planetInner(c,ringOf(c)):esc((c||'?')[0].toUpperCase())}</span>`}
const avTried=new Set();
async function loadAvatars(extra=[]){
  if(!apiReady())return;const need=[...new Set(cfg.chans.concat(extra))].filter(c=>!cfg.avatars[c]&&!avTried.has(c));if(!need.length)return;need.forEach(c=>avTried.add(c));
  let got=false;
  for(let i=0;i<need.length;i+=100){try{const r=await helix('users?'+need.slice(i,i+100).map(c=>'login='+encodeURIComponent(c)).join('&'));
    for(const u of r.data)if(setAvatar(u.login.toLowerCase(),u.profile_image_url))got=true}catch(e){}}
  if(got)autoRender()}

/* ---------- stockage (IndexedDB) ---------- */
const idb={db:null,
  open(){return new Promise(res=>{if(!window.indexedDB)return res(null);const r=indexedDB.open('twitch-overlap-v2',1);
    r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>{this.db=r.result;res(this.db)};r.onerror=()=>res(null)})},
  get(k){return new Promise(res=>{if(!this.db)return res(null);const q=this.db.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>res(q.result||null);q.onerror=()=>res(null)})},
  put(k,v){return new Promise(res=>{if(!this.db)return res(false);const tx=this.db.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=()=>res(true);tx.onerror=()=>res(false)})},
};
const nJ=n=>n+(n>1?' jours':' jour');function prune(){ // en mode collecteur, mêmes durées que le ménage de la base (envoyées par le collecteur 1.3)
  const R=(cfg.mode==='cloud'&&cloud.status&&cloud.status.retention)||{},jM=+R.minutes||14,jP=+R.presence||60;
  const now=Date.now(),dMin=dayKey(now-jP*DAY);
  for(const k in DB.minutes)if(DB.minutes[k].t<now-jM*DAY)delete DB.minutes[k];
  for(const k in DB.presence)if(DB.presence[k].d<dMin)delete DB.presence[k];
  DB.snaps=DB.snaps.filter(s=>s.t>now-(+R.snaps||30)*DAY);
  DB.events=DB.events.filter(e=>e.t>now-(+R.events||60)*DAY);
  const dW=dayKey(now-30*DAY);
  for(const k in DB.words){const W=DB.words[k];if(W.d<dW){delete DB.words[k];continue}
    if(Object.keys(W.w).length>1500)W.w=Object.fromEntries(Object.entries(W.w).sort((a,b)=>b[1]-a[1]).slice(0,600));
    if(Object.keys(W.e).length>800)W.e=Object.fromEntries(Object.entries(W.e).sort((a,b)=>b[1]-a[1]).slice(0,300))}
  for(const c in DB.vods)DB.vods[c]=DB.vods[c].filter(v=>v.start>now-30*DAY);
  for(const c in DB.meta)DB.meta[c]=DB.meta[c].filter(x=>x.t>now-60*DAY);
  for(const k in DB.clips)if(DB.clips[k].ts<now-30*DAY)delete DB.clips[k];
  for(const k in DB.ecoute||{})if(DB.ecoute[k].e<now-60*DAY)delete DB.ecoute[k];
  for(const k in DB.switches||{})if(DB.switches[k].d<dMin)delete DB.switches[k]; // même durée que les présences
}
function track(){if(running){const now=Date.now();DB.trackedMs+=now-(persist.last||sessionStart);persist.last=now}}
/* ---------- périodes d'écoute (mode « Ce navigateur ») ----------
   Même principe que le collecteur 1.4 : une période par chaîne, prolongée toutes les 30 s tant que le chat est connecté.
   Plus de 4 min sans prolongation (onglet fermé, PC en veille) referme la période. Les graphiques grisent le reste. */
const pageEcoute={};
function noteListening(now=Date.now()){
  const ok=running&&!!ws&&ws.readyState===1;
  for(const c in pageEcoute)if(!ok||!cfg.chans.includes(c)||now-pageEcoute[c].e>4*MIN)delete pageEcoute[c];
  if(!ok)return;DB.ecoute=DB.ecoute||{};
  for(const c of cfg.chans){const p=pageEcoute[c]||(pageEcoute[c]={s:now,e:now});p.e=now;DB.ecoute[c+'|'+p.s]={c,s:p.s,e:now}}
  dirty=true}
async function persist(){
  noteListening();track();
  flushMinutes(false);
  if(dirty||!running){prune();await idb.put(dbKey(),DB);dirty=false}
}

/* ---------- ingestion du chat ---------- */
function parseIrc(line){
  let tags={},rest=line;
  if(rest[0]==='@'){const i=rest.indexOf(' ');for(const kv of rest.slice(1,i).split(';')){const j=kv.indexOf('=');tags[kv.slice(0,j)]=kv.slice(j+1)}rest=rest.slice(i+1)}
  let prefix='';if(rest[0]===':'){const i=rest.indexOf(' ');prefix=rest.slice(1,i);rest=rest.slice(i+1)}
  const sp=rest.indexOf(' '),cmd=sp<0?rest:rest.slice(0,sp),params=sp<0?'':rest.slice(sp+1);
  const m=params.match(/^#(\S+)/),ti=params.indexOf(' :');
  return {tags,nick:prefix.split('!')[0],cmd,chan:m?m[1]:'',text:ti>=0?params.slice(ti+2):''};
}
function addEvent(c,type,from,n,t){DB.events.push({t,c,type,from:from||null,n:n||1});dirty=true}
/* ---------- empreinte des pseudos (mode « Ce navigateur ») ----------
   Comme le collecteur, la page ne garde jamais un pseudo en clair : seulement une empreinte salée,
   qui suffit pour compter et croiser les audiences. Le sel est propre à ce navigateur. */
function cyrb53(str,seed=0){let h1=0xdeadbeef^seed,h2=0x41c6ce57^seed;
  for(let i=0,ch;i<str.length;i++){ch=str.charCodeAt(i);h1=Math.imul(h1^ch,2654435761);h2=Math.imul(h2^ch,1597334677)}
  h1=Math.imul(h1^(h1>>>16),2246822507);h1^=Math.imul(h2^(h2>>>13),3266489909);
  h2=Math.imul(h2^(h2>>>16),2246822507);h2^=Math.imul(h1^(h1>>>13),3266489909);
  return 4294967296*(2097151&h2)+(h1>>>0)}
if(!cfg.sel){try{cfg.sel=[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,'0')).join('')}catch(e){cfg.sel=String(Math.random()).slice(2)+Date.now()}saveCfg()}
const hashCache=new Map();
function hashUser(login){let h=hashCache.get(login);if(h)return h;if(hashCache.size>200000)hashCache.clear();
  h=cyrb53(cfg.sel+':'+login).toString(36)+cyrb53(login+':'+cfg.sel,7).toString(36).slice(0,3);hashCache.set(login,h);return h}
// Données enregistrées avant cette version (pseudos en clair) : on les convertit une fois.
function hashLegacy(db){
  if(!db||db.hashed)return db;
  const P={};for(const p of Object.values(db.presence||{})){const u=hashUser(p.u),k=u+'|'+p.c+'|'+p.d+'|'+p.g,o=P[k];
    if(!o)P[k]={...p,u};else{o.f=Math.min(o.f,p.f);o.l=Math.max(o.l,p.l);o.n+=p.n}}
  db.presence=P;for(const e of db.events||[])if(e.type==='bits')e.from=null;db.hashed=true;return db}
// Base relue depuis le navigateur : celle du collecteur est déjà en empreintes, celle du mode navigateur peut dater d'avant.
// On restaure aussi les revs pour ne pas tout re-télécharger depuis Supabase.
function restoreDB(saved){
  const db=Object.assign(freshDB(),saved,{hashed:cfg.mode==='cloud'||!!saved.hashed,revs:saved.revs||{}});
  if(!db.hashed){hashLegacy(db);dirty=true}return db
}
const lastChanPage=new Map(); // empreinte → chaîne et heure de son dernier message (mode « Ce navigateur »)
function onChat(c,login,tags,t,text){
  if(!login||isBot(login,tags))return;
  const u=hashUser(login),d=dayKey(t),g=curGame[c]||UNKNOWN,k=u+'|'+c+'|'+d+'|'+g;
  let p=DB.presence[k];if(!p)p=DB.presence[k]={u,c,d,g,f:t,l:t,n:0};
  // changement de stream, compté message par message comme le collecteur 1.5 : message suivant chez une autre chaîne, moins de 3 h après
  const prev=lastChanPage.get(u);
  if(prev&&prev.c!==c&&t-prev.t<=3*HOUR){DB.switches=DB.switches||{};const sk=u+'|'+d+'|'+prev.c+'|'+c;const s=DB.switches[sk]||(DB.switches[sk]={u,d,a:prev.c,b:c,n:0});s.n++}
  lastChanPage.set(u,{c,t});
  p.l=t;p.n++;
  const mt=Math.floor(t/MIN)*MIN;let cm=curMin[c];
  if(!cm||cm.mt!==mt){if(cm)flushOne(c,cm);cm=curMin[c]={mt,m:0,set:new Set(),r:0,h:0,n:0,q:0,e:{},k:{}}}
  cm.m++;cm.set.add(u);
  const A=analyseText(text||'',tags.emotes,c),kind=classify(c,login,tags,t,A.text,A.emotes);
  cm.k[kind]=cnt(cm.k,kind)+1;
  cm.r+=A.moods.rire;cm.h+=A.moods.hype;cm.n+=A.moods.negatif;cm.q+=A.moods.question;
  for(const e of A.emotes)cm.e[e]=cnt(cm.e,e)+1;
  const wk=c+'|'+d;let W=DB.words[wk];if(!W)W=DB.words[wk]={c,d,w:{},e:{},moods:{rire:0,hype:0,negatif:0,question:0},k:{},n:0};
  W.n++;W.k=W.k||{};W.k[kind]=cnt(W.k,kind)+1;for(const k in A.moods)if(A.moods[k])W.moods[k]++;
  for(const w of A.words)W.w[w]=cnt(W.w,w)+1;for(const e of A.emotes)W.e[e]=cnt(W.e,e)+1;
  if(tags.bits)addEvent(c,'bits',null,+tags.bits,t);
  if(tags['first-msg']==='1')addEvent(c,'first',null,1,t);
  dirty=true;
}
function onNotice(c,tags,t){
  const id=tags['msg-id'];
  if(id==='sub'||id==='resub')addEvent(c,'sub',null,1,t);
  else if(id==='submysterygift')addEvent(c,'gift',null,+tags['msg-param-mass-gift-count']||1,t);
  else if(id==='subgift'&&!tags['msg-param-community-gift-id'])addEvent(c,'gift',null,1,t);
  else if(id==='raid')addEvent(c,'raid',(tags['msg-param-login']||'').toLowerCase(),+tags['msg-param-viewerCount']||0,t);
}
// CLEARCHAT : timeout (pseudo + durée), ban (pseudo sans durée) ou chat vidé (sans pseudo). Le pseudo n'est pas gardé.
function onClearChat(c,tags,t,target){addEvent(c,!target?'clear':tags['ban-duration']?'timeout':'ban',null,1,t)}
function minuteRec(c,cm){return {c,t:cm.mt,m:cm.m,u:cm.set.size,g:curGame[c]||UNKNOWN,r:cm.r,h:cm.h,n:cm.n,q:cm.q,e:Object.entries(cm.e).sort((a,b)=>b[1]-a[1]).slice(0,3),k:{...cm.k}}}
// Une minute déjà enregistrée (Arrêter puis Démarrer dans la même minute) est complétée, pas écrasée.
function flushOne(c,cm){const key=c+'|'+cm.mt,r=minuteRec(c,cm),o=DB.minutes[key];
  if(o){for(const f of ['m','r','h','n','q'])r[f]+=o[f]||0;r.u=Math.max(r.u,o.u||0);if(o.g&&o.g!==UNKNOWN)r.g=o.g;
    for(const x in o.k||{})r.k[x]=cnt(r.k,x)+o.k[x];
    const E={};for(const [k,v] of [...(o.e||[]),...r.e])E[k]=cnt(E,k)+v;r.e=Object.entries(E).sort((a,b)=>b[1]-a[1]).slice(0,3)}
  DB.minutes[key]=r;dirty=true}
function flushMinutes(all){const now=Math.floor(Date.now()/MIN)*MIN;for(const c in curMin){const cm=curMin[c];if(cm&&(all||cm.mt<now)){flushOne(c,cm);delete curMin[c]}}}

function connect(){
  ws=new WebSocket('wss://irc-ws.chat.twitch.tv:443');
  ws.onopen=()=>{
    ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');ws.send('PASS SCHMOOPIIE');ws.send('NICK justinfan'+Math.floor(1000+Math.random()*80000));
    cfg.chans.forEach((c,i)=>setTimeout(()=>{if(ws&&ws.readyState===1)ws.send('JOIN #'+c)},i*600));
    $('dot').className='dot on';noteListening();
  };
  ws.onmessage=e=>{const t=Date.now();for(const line of e.data.split('\r\n')){if(!line)continue;
    if(line.startsWith('PING')){ws.send('PONG :tmi.twitch.tv');continue}
    const m=parseIrc(line);if(!m.chan||!cfg.chans.includes(m.chan))continue;
    if(m.cmd==='PRIVMSG')onChat(m.chan,m.tags.login||m.nick,m.tags,t,m.text);
    else if(m.cmd==='USERNOTICE')onNotice(m.chan,m.tags,t);
    else if(m.cmd==='CLEARCHAT')onClearChat(m.chan,m.tags,t,m.text.trim());
    else if(m.cmd==='CLEARMSG')addEvent(m.chan,'del',null,1,t);}};
  ws.onclose=()=>{noteListening();$('dot').className='dot';if(running)setTimeout(()=>{if(running)connect()},3000)};
}

/* ---------- API Twitch ---------- */
async function helix(path){
  const r=await fetch('https://api.twitch.tv/helix/'+path,{headers:{'Client-Id':cfg.clientId,'Authorization':'Bearer '+cfg.token}});
  if(r.status===401)throw new Error('jeton refusé (401), régénère-le dans Réglages');
  if(!r.ok)throw new Error('API Twitch : erreur '+r.status);
  return r.json();
}
const apiReady=()=>!!(cfg.clientId&&cfg.token);
async function pollStreams(){
  if(!apiReady()||!cfg.chans.length)return;
  try{
    const t=Date.now(),seen=new Set();
    for(let i=0;i<cfg.chans.length;i+=100){
      const r=await helix('streams?first=100&'+cfg.chans.slice(i,i+100).map(c=>'user_login='+encodeURIComponent(c)).join('&'));
      for(const s of r.data){const c=s.user_login.toLowerCase();seen.add(c);
        const g=s.game_name||UNKNOWN;curGame[c]=g;
        info[c]={live:true,v:s.viewer_count,g,ti:s.title,since:Date.parse(s.started_at),uid:s.user_id};
        DB.snaps.push({t,c,live:1,v:s.viewer_count,g})}
    }
    for(const c of cfg.chans)if(!seen.has(c)){
      const was=info[c]&&info[c].live;info[c]={live:false};curGame[c]=OFFLINE;
      if(was!==false)DB.snaps.push({t,c,live:0,v:0,g:OFFLINE});
    }
    apiState='ok';dirty=true;
    findVods();
  }catch(e){apiState=e.message}
}
const vodTried={};
async function findVods(){ // retrouve la VOD du live en cours pour faire des liens horodatés
  // réessayé à chaque relevé tant qu'elle n'est pas trouvée, 15 fois au plus par live (comme le collecteur)
  for(const c of cfg.chans){const I=info[c];if(!I||!I.live||!I.uid)continue;
    if((DB.vods[c]||[]).some(v=>Math.abs(v.start-I.since)<20*MIN))continue;
    const tr=vodTried[c]&&vodTried[c].since===I.since?vodTried[c]:(vodTried[c]={since:I.since,n:0});if(tr.n>=15)continue;tr.n++;
    try{const v=(await helix('videos?type=archive&first=1&user_id='+I.uid)).data[0];
      if(v&&Math.abs(Date.parse(v.created_at)-I.since)<20*MIN){(DB.vods[c]=DB.vods[c]||[]).push({id:v.id,start:Date.parse(v.created_at)});dirty=true}}catch(e){}}
}

/* ---------- mode collecteur (Supabase) ---------- */
const dbKey=()=>cfg.mode==='cloud'?'db-cloud':'db';
const isCloud=()=>cfg.mode==='cloud'&&!!cfg.sbUrl&&!!cfg.sbKey;
const cloud={status:null,syncing:false,last:0,err:'',progress:0,timer:null,gen:0};
const sbBase=()=>cfg.sbUrl.trim().replace(/\/+$/,'');
// x-board-code : le code du tableau de bord (« codeTableau » de config.json). La base ne rend ses lignes qu'avec ce code (fonction SQL board_ok) :
// la clé publique, visible dans le navigateur, ne lit plus rien toute seule.
function sbH(extra={}){const h={apikey:cfg.sbKey,...extra};if(!cfg.sbKey.startsWith('sb_'))h.Authorization='Bearer '+cfg.sbKey;if(cfg.sbCode)h['x-board-code']=cfg.sbCode;return h}
async function sbReq(path,opts={}){const r=await fetch(sbBase()+'/rest/v1/'+path,{...opts,headers:sbH(opts.headers)});
  if(!r.ok)throw new Error('Supabase '+r.status+' '+(await r.text()).slice(0,140));const t=await r.text();return t?JSON.parse(t):null}
const CLOUD_TABLES=['presence','minutes','snaps','events','words','vods','chan_meta','clips','ecoute','switches'];
const CLOUD_OPTIONAL=['chan_meta','clips','ecoute','switches']; // tables ajoutées par les collecteurs 1.2, 1.4 et 1.5 : une base plus ancienne peut ne pas les avoir
function mergeRow(t,r){
  if(t==='presence')DB.presence[r.u+'|'+r.c+'|'+r.d+'|'+r.g]={u:r.u,c:r.c,d:r.d,g:r.g,f:+r.f,l:+r.l,n:r.n};
  else if(t==='minutes')DB.minutes[r.c+'|'+r.t]={c:r.c,t:+r.t,m:r.m,u:r.u,g:r.g,r:r.r,h:r.h,n:r.n,q:r.q,e:r.e||[],k:r.k||{}};
  else if(t==='snaps')DB.snaps.push({c:r.c,t:+r.t,live:r.live,v:r.v,g:r.g});
  else if(t==='events')DB.events.push({t:+r.t,c:r.c,type:r.type,from:r.frm,n:r.n});
  else if(t==='words')DB.words[r.c+'|'+r.d]={c:r.c,d:r.d,w:r.w||{},e:r.e||{},moods:r.moods||{},k:r.k||{},n:r.n};
  else if(t==='vods'){const a=DB.vods[r.c]=DB.vods[r.c]||[];if(!a.some(v=>v.id===r.id))a.push({id:r.id,start:+r.start})}
  else if(t==='chan_meta'){DB.meta=DB.meta||{};const a=DB.meta[r.c]=DB.meta[r.c]||[];
    if(!a.some(x=>x.t===+r.t)){a.push({t:+r.t,fol:r.fol==null?null:+r.fol,br:r.br?1:0,lab:r.lab||[],tg:r.tg||[],lg:r.lg,cs:r.cs||{}});a.sort((x,y)=>x.t-y.t)}}
  else if(t==='clips'){DB.clips=DB.clips||{};DB.clips[r.c+'|'+r.id]={c:r.c,id:r.id,ts:+r.ts,d:+r.d,v:r.v,ti:r.ti||'',ex:r.ex}}
  else if(t==='ecoute'){DB.ecoute=DB.ecoute||{};DB.ecoute[r.c+'|'+r.s]={c:r.c,s:+r.s,e:+r.e}}
  else if(t==='switches'){DB.switches=DB.switches||{};DB.switches[r.u+'|'+r.d+'|'+r.a+'|'+r.b]={u:r.u,d:r.d,a:r.a,b:r.b,n:+r.n}}
}
// Une synchro en cours écrit dans DB au fil des réponses. Si DB est remplacée pendant ce temps (Connecter, Tout effacer,
// changement de mode), elle doit s'arrêter : sinon elle remplirait la nouvelle base à partir du milieu d'une table, et les
// lignes d'avant ne seraient plus jamais téléchargées. cloud.gen change à chaque remplacement.
function cloudReset(){cloud.gen++;cloud.syncing=false;cloud.progress=0}

// Les raids ne sont pas dans « events » : le collecteur les écrit dans raid_events (sans colonne rev, on suit donc l'id).
// Ils entrent dans DB.events au format des autres événements, que lisent tous les blocs « raids ». La chaîne de l'événement
// est celle qui reçoit. Une même paire à moins d'une minute compte pour un seul raid (doublons dans la table, 23 au 25/11).
async function syncRaids(stale,syncFromMs){
  const seen=new Map(),isNew=e=>{const k=e.from+'|'+e.c,ts=seen.get(k)||[];
    if(ts.some(t=>Math.abs(t-e.t)<60000))return false;
    ts.push(e.t);seen.set(k,ts);return true};
  for(const e of DB.events)if(e.type==='raid')isNew(e);
  let last=DB.revs.raid_events||0,added=0;
  for(;;){
    let rows;
    try{rows=await sbReq(`raid_events?select=id,ts,from_channel,to_channel,viewers&id=gt.${last}&ts=gte.${syncFromMs}&order=id.asc&limit=1000`)}
    catch(e){if(/PGRST205|42P01|Supabase 404/.test(e.message))return added;throw e} // base d'avant la table raid_events
    if(stale()||!rows||!rows.length)return added;
    for(const r of rows){const e={t:+r.ts,c:r.to_channel,type:'raid',from:r.from_channel,n:r.viewers||0};
      if(isNew(e)){DB.events.push(e);added++}}
    last=DB.revs.raid_events=+rows[rows.length-1].id;
    if(rows.length<1000)return added;
  }
}

async function cloudSync(){
  if(!isCloud()||cloud.syncing)return;
  const gen=cloud.gen,stale=()=>gen!==cloud.gen;cloud.syncing=true;
  const syncFromMs = Date.now() - 60*DAY; // recalculé à chaque sync
  try{
    DB.revs=DB.revs||{};
    // la base protège la lecture par le code du tableau : sans lui (ou avec un mauvais), elle rend zéro ligne sans erreur, et le tableau
    // paraîtrait vide. On le dit clairement. Une base pas encore à jour n'a pas cette fonction : on passe.
    try{if(await sbReq('rpc/board_ok',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})===false)
      throw new Error('Code du tableau manquant ou incorrect : colle le « codeTableau » de config.json dans Réglages → Source des données')}
    catch(e){if(/^Code du tableau/.test(e.message))throw e}
    let total=0;
    for(const t of CLOUD_TABLES)for(;;){
      let rows;
      const rev = DB.revs[t]||0;
      // Pour le premier sync (rev=0), utiliser un filtre temporel sur les tables volumineuses
      // pour éviter le timeout 57014
      if(rev===0){
        if(t==='presence'||t==='events'||t==='minutes'||t==='snaps'){
          const col = (t==='presence')?'f':'t';
          rows = await sbReq(`${t}?select=*&${col}=gte.${syncFromMs}&order=rev.asc&limit=1000`);
        }else{
          rows = await sbReq(`${t}?select=*&order=rev.asc&limit=1000`);
        }
      }else{
        rows = await sbReq(`${t}?select=*&rev=gt.${rev}&order=rev.asc&limit=1000`);
      }
      if(stale())return;
      for(const r of rows)mergeRow(t,r);total+=rows.length;if(rows.length)DB.revs[t]=+rows[rows.length-1].rev;
      if(rows.length<1000)break;cloud.progress=total;pushStatus();
    }
    total+=await syncRaids(stale,syncFromMs);if(stale())return;
    const st=(await sbReq('collector_status?select=*'))[0]||null;if(stale())return;cloud.status=st;
    // Le statut des chaînes (live, viewers, jeu) n'est valable que si le collecteur vient de l'envoyer : sinon c'est
    // celui du moment où il s'est arrêté, et une chaîne resterait « LIVE » des heures après la fin de son live.
    for(const k in info)delete info[k];
    if(st){DB.trackedMs=+st.tracked_ms||0;const fresh=!!st.last_seen&&Date.now()-st.last_seen<3*MIN;
      for(const c in st.info||{}){const I=st.info[c];if(I.img)setAvatar(c,I.img);info[c]=fresh?I:{img:I.img};curGame[c]=fresh&&I.live?I.g:OFFLINE}}
    const ch=await sbReq('channels?select=c&order=added.asc');if(stale())return;cfg.chans=ch.map(r=>r.c);saveCfg();buildChanSel();
    cloud.err='';cloud.last=Date.now();if(total)dirty=true;await persist();
  }catch(e){if(!stale())cloud.err=e.message}
  finally{if(!stale()){cloud.syncing=false;cloud.progress=0}}
}
const collectorOnline=()=>!!(cloud.status&&cloud.status.last_seen&&Date.now()-cloud.status.last_seen<3*MIN);

// Force un sync complet depuis le début (utile pour récupérer des données manquantes)
async function forceFullResync(){
  if(!isCloud())throw new Error('Mode local : impossible de faire un resync depuis le cloud');
  if(!cloud.status)throw new Error('Cloud non connecté');
  const savedRevs={...DB.revs};
  DB.revs={};
  cloudReset();
  try{
    await cloudSync();
    if(cloud.err) throw new Error(cloud.err);
    return true;
  }finally{
    DB.revs=savedRevs;
  }
}
const hasApi=()=>cfg.mode==='cloud'?!!((cloud.status&&cloud.status.api==='ok')||DB.snaps.length):apiReady();
const liveData=()=>running||(isCloud()&&collectorOnline());
// La liste des chaînes ne se modifie qu'avec le code du tableau de bord (collecteur 1.3) : la clé publique seule ne suffit plus.
async function cloudChansRpc(fn,list){
  if(!list.length)return 0;
  if(!cfg.sbCode)throw new Error('colle le code du tableau de bord (« codeTableau » dans config.json) dans Réglages → Source des données');
  try{return await sbReq('rpc/'+fn,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:cfg.sbCode,list})})}
  catch(e){if(/invalide|42501/.test(e.message))throw new Error('code du tableau de bord refusé : vérifie « codeTableau » dans config.json');
    if(/PGRST202|Could not find the function|404/.test(e.message))throw new Error('base pas à jour : exécute la dernière version de schema.sql dans Supabase');throw e}
}
const cloudAddChans=list=>cloudChansRpc('add_channels',list);
const cloudRemoveChans=list=>cloudChansRpc('remove_channels',list);
async function setMode(m){
  if(m===cfg.mode)return;
  if(running)await stop();await persist();cloudReset();
  if(m==='cloud')cfg.localChans=cfg.chans;else if(cfg.localChans){cfg.chans=cfg.localChans}
  cfg.mode=m;saveCfg();
  for(const k in info)delete info[k];for(const k in curGame)delete curGame[k];cloud.status=null;cloud.err='';
  DB=freshDB();const saved=await idb.get(dbKey());if(saved&&saved.presence)DB=restoreDB(saved);
  applyMode();
}
function applyMode(){
  clearInterval(cloud.timer);cloud.timer=null;
  const c=cfg.mode==='cloud';
  $('btnStart').classList.toggle('hide',c);$('btnStop').classList.toggle('hide',c);
  if(c&&isCloud()){cloud.timer=setInterval(()=>cloudSync().then(autoRender),60000);cloudSync().then(render)}
  buildChanSel();render();
}
const DB_LIMIT_MB=500; // offre gratuite de Supabase
function dbSizeLbl(){const s=cloud.status;if(!s||s.db_mb==null)return '';const mb=+s.db_mb;
  return ` · base ${fmt(mb)} Mo / ${DB_LIMIT_MB}`+(mb>=400?' ⚠ bientôt pleine : baisse « joursPresence » dans config.json ou suis moins de chaînes':'')}
function isSecretKey(k){if(/^sb_secret_/.test(k))return true;try{const p=JSON.parse(atob(k.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return p.role==='service_role'}catch(e){return false}}
function ago(t){const s=Math.round((Date.now()-t)/1000);return s<60?s+' s':s<3600?Math.round(s/60)+' min':dur(Date.now()-t)}

/* ---------- démarrage / arrêt ---------- */
function start(){
  if(!cfg.chans.length){showTab('settings');return}
  running=true;sessionStart=Date.now();persist.last=sessionStart;
  connect();pollStreams();loadEmotes(cfg.chans,true);
  timers=[setInterval(autoRender,5000),setInterval(persist,30000),setInterval(pollStreams,120000),setInterval(()=>flushMinutes(false),10000)];
  $('btnStart').disabled=true;$('btnStop').disabled=false;render();
}
async function stop(){
  noteListening();track();running=false;timers.forEach(clearInterval);timers=[];
  if(ws){ws.onclose=null;ws.close();ws=null}
  flushMinutes(true);await persist();
  $('dot').className='dot';$('btnStart').disabled=false;$('btnStop').disabled=true;render();
}

/* ---------- requêtes sur les données ---------- */
function periodStart(){const d0=parisMidnight(Date.now()),back=n=>parisMidnight(d0-n*DAY+12*HOUR); // +12 h : juste même avec un changement d'heure
  return period==='today'?d0:period==='7d'?back(6):period==='30d'?back(29):0}
function Q(){ // instantané filtré de la période
  const t0=periodStart(),d0=t0?dayKey(t0):'';
  const pres=Object.values(DB.presence).filter(p=>p.d>=d0);
  const mins=Object.values(DB.minutes).filter(m=>m.t>=t0);
  for(const c in curMin){const cm=curMin[c];if(cm&&cm.mt>=t0)mins.push(minuteRec(c,cm))}
  const snaps=DB.snaps.filter(s=>s.t>=t0),events=DB.events.filter(e=>e.t>=t0);
  const clips=Object.values(DB.clips||{}).filter(k=>k.ts>=t0);
  const sw=Object.values(DB.switches||{}).filter(s=>s.d>=d0); // changements de stream comptés message par message (1.5)
  if((cfg.lang||'*')!=='*'){const S=new Set(shown()),k=x=>S.has(x.c); // filtre Langue
    return {t0,pres:pres.filter(k),mins:mins.filter(k),snaps:snaps.filter(k),events:events.filter(k),clips:clips.filter(k),sw:sw.filter(x=>S.has(x.a)&&S.has(x.b))}}
  return {t0,pres,mins,snaps,events,clips,sw};
}
function usersBy(pres,keyFn){const M=new Map();for(const p of pres){const k=keyFn(p);if(k==null)continue;let s=M.get(k);if(!s)M.set(k,s=new Set());s.add(p.u)}return M}
// paires de chaînes classées par indice de Jaccard (communs ÷ réunion) ; au-delà de max chaînes, on garde les plus actives
// (100 chaînes = 4 950 paires : borné pour la Vue d'ensemble, recalculée souvent)
function pairsOf(by,keys,max=Infinity){
  const ks=keys.length>max?[...keys].sort((a,b)=>by.get(b).size-by.get(a).size).slice(0,max):keys,out=[];
  for(let i=0;i<ks.length;i++)for(let j=i+1;j<ks.length;j++){const A=by.get(ks[i]),B=by.get(ks[j]),n=sharedCount(A,B),u=A.size+B.size-n;out.push({a:who(ks[i]),b:who(ks[j]),n,j:u?n/u:0})}
  return out.sort((x,y)=>y.j-x.j)}
function sharedCount(A,B){let n=0;const [s,l]=A.size<B.size?[A,B]:[B,A];for(const u of s)if(l.has(u))n++;return n}
function flowsOf(pres){
  const by=new Map();for(const p of pres){let a=by.get(p.u);if(!a)by.set(p.u,a=[]);a.push(p)}
  const F=new Map();let multi=0;
  for(const arr of by.values()){if(arr.length<2)continue;
    const chans=new Set(arr.map(p=>p.c));if(chans.size>1)multi++;
    arr.sort((a,b)=>a.f-b.f);
    for(let i=1;i<arr.length;i++){const a=arr[i-1],b=arr[i];if(a.c===b.c)continue;
      const gap=b.f-a.l;if(gap<-10*MIN||gap>3*HOUR)continue;
      const k=a.c+'>'+b.c;let o=F.get(k);if(!o)F.set(k,o={a:a.c,b:b.c,n:0,gaps:[]});o.n++;o.gaps.push(Math.max(gap,0))}}
  return {flows:[...F.values()].sort((x,y)=>y.n-x.n),multi};
}
function bucket(pts,maxN){ // moyenne par paquets, coupe les trous
  if(pts.length<=maxN)return pts;const x0=pts[0][0],x1=pts[pts.length-1][0],w=(x1-x0)/maxN||1;const out=[];let cur=null;
  for(const [t,v] of pts){const b=Math.floor((t-x0)/w);if(!cur||cur.b!==b){if(cur)out.push([cur.t,cur.s/cur.n]);cur={b,t,s:0,n:0}}if(v==null){out.push([t,null]);cur=null;continue}cur.s+=v;cur.n++}
  if(cur)out.push([cur.t,cur.s/cur.n]);return out;
}
function minuteSeries(mins,c,field){ // série par minute, avec null sur les trous > 5 min
  const a=mins.filter(m=>m.c===c).sort((x,y)=>x.t-y.t),out=[];let prev=null;
  for(const m of a){if(prev!=null&&m.t-prev>5*MIN)out.push([prev+MIN,null]);out.push([m.t,m[field]]);prev=m.t}
  return out;
}
function viewerSeries(snaps,c){const a=snaps.filter(s=>s.c===c).sort((x,y)=>x.t-y.t),out=[];let prev=null;
  for(const s of a){if(!s.live||(prev!=null&&s.t-prev>6*MIN))out.push([s.t,null]);if(s.live)out.push([s.t,s.v]);prev=s.t}return out}
// Périodes où aucune de ces chaînes n'était écoutée, entre t0 et maintenant. Rien n'est grisé avant le tout premier relevé
// d'écoute (collecteur 1.4) : on ne sait pas ce qui s'est passé avant. Les trous de moins de 3 min (simple reconnexion) sont ignorés.
function listenGaps(chans,t0){
  const E=Object.values(DB.ecoute||{});if(!E.length)return [];
  const now=Date.now(),a0=Math.max(t0,minOf(E,x=>x.s)),fresh=liveData(),G=3*MIN;if(now-a0<G)return [];
  const iv=E.filter(x=>chans.includes(x.c)).map(x=>[x.s,fresh&&now-x.e<3*MIN?now:x.e]).filter(([s,e])=>e>a0).sort((x,y)=>x[0]-y[0]);
  const gaps=[];let cur=a0;for(const [s,e] of iv){if(s-cur>G)gaps.push([cur,s]);cur=Math.max(cur,e)}
  if(now-cur>G)gaps.push([cur,now]);return gaps}

/* ---------- graphiques ---------- */
const tip=$('tip');
function showTip(e,html){tip.innerHTML=html;tip.style.display='block';const w=tip.offsetWidth,h=tip.offsetHeight;
  let x=e.clientX+14,y=e.clientY+14;if(x+w>innerWidth-8)x=e.clientX-w-14;if(y+h>innerHeight-8)y=e.clientY-h-14;
  // borné au cadre : sur téléphone, ni à droite ni à gauche du doigt il n'y a la place d'une bulle large, elle dépassait du cadre (critique du 25/11/2026)
  x=Math.max(8,Math.min(x,innerWidth-w-8));y=Math.max(8,Math.min(y,innerHeight-h-8));tip.style.left=x+'px';tip.style.top=y+'px'}
const hideTip=()=>tip.style.display='none';
function legendHtml(series){return series.length<2?'':'<div class="legend">'+series.map(s=>`<span>${s.c?av(s.c):`<i class="sw" style="background:${s.color}"></i>`}${esc(s.name)}</span>`).join('')+'</div>'}
// Graphique en courbes pour React (app/src/components/charts/line-chart.tsx) : séries réduites à 500 points au plus,
// périodes sans écoute (gaps), unité ; pct : valeurs en %.
const lineSpec=(series,o={})=>({series:series.map(s=>({name:s.name,c:s.c||'',color:s.color,pts:bucket(s.pts,500)})).filter(s=>s.pts.some(p=>p[1]!=null)),
  unit:o.unit||'',pct:!!o.pct,yFloor:o.yFloor||0,gaps:o.gaps||[],height:o.h||190});
function niceMax(v){if(!(v>0))return 1;const p=Math.pow(10,Math.floor(Math.log10(v))),r=v/p;return (r<=1?1:r<=2?2:r<=2.5?2.5:r<=5?5:10)*p}
function meterRows(rows,{fmtV=fmt,unit=''}={}){
  if(!rows.length)return '<p class="empty">Pas encore de données sur cette période.</p>';
  const mx=maxOf(rows,r=>r.v)||1;
  return rows.map(r=>`<div class="barrow"><div class="trunc">${r.label}</div><div class="meter"><i style="width:${Math.max(r.v/mx*100,1).toFixed(1)}%;${r.color?'background:'+r.color:''}"></i></div><div class="lbl" style="text-align:right">${fmtV(r.v)}${unit}${r.extra?' · '+r.extra:''}</div></div>`).join('');
}
function heat(r){if(!isFinite(r)||r<=0)return '';const a=Math.min(.07+r*1.1,.6);return `background:rgba(77,141,255,${a.toFixed(2)})${a>.38?';color:#fff':''}`}
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
  for(const w of text.split(/\s+/))if(w&&isExt(c,w))emotes.add(w);
  const moods={rire:RX.rire.test(text),hype:RX.hype.test(text),negatif:RX.negatif.test(text),
    question:/\?\s*$/.test(text)||/(^|\s)(pourquoi|comment|c'est quoi)(\s|$)/i.test(text)};
  const words=new Set();
  for(let w of text.split(/\s+/)){if(!w||emotes.has(w)||w[0]==='@'||/^https?:/i.test(w))continue;
    w=w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu,'');
    if(w.length<3||w.length>25||/^\d+$/.test(w)||STOP.has(w))continue;words.add(w)}
  return {emotes,moods,words,text};
}

/* ---------- type de message : réaction ou interaction (même règle que le collecteur) ---------- */
const KINDS=[['re','Réactions','emote seule, « mdr », « GG »…','#d95926'],['va','Vagues','même message repris par 3 personnes ou plus en 15 s','#e66767'],
  ['ad','Vers le streamer','questions, tutoiement, @ ou réponse au streamer','#3987e5'],['co','Entre viewers','réponses et @ entre viewers','#9085e9'],
  ['cm','Commentaires','4 mots ou plus','#199e70'],['ct','Courts','« oui », « jsp », sans signal clair','#6b6b75'],['cmd','Commandes','!xxx','#45454d']];
const REACT=['re','va'],INTER=['ad','co'];
const ksum=(k,keys)=>keys.reduce((s,x)=>s+((k&&k[x])||0),0);
const ktot=k=>Object.values(k||{}).reduce((s,x)=>s+x,0);
const recentByChan={},chanRx={};
const SECOND=/(^|\s)(tu|t'as|t'es|t'étais|t'avais|toi)(?=\s|$|[!?.,…])/i;
function classify(c,login,tags,t,text,emotes){
  const parent=tags['reply-parent-user-login'];
  const body=(parent?text.replace(/^@\S+\s*/,''):text).trim();
  const toks=body.split(/\s+/).filter(Boolean),words=toks.filter(w=>!emotes.has(w));
  const norm=body.toLowerCase().replace(/\s+/g,' ');
  const R=recentByChan[c]||(recentByChan[c]=[]);
  while(R.length&&t-R[0].t>15000)R.shift();
  const others=new Set();for(const x of R)if(x.n===norm&&x.u!==login)others.add(x.u);
  R.push({t,n:norm,u:login});if(R.length>500)R.shift();
  if(body[0]==='!')return 'cmd';
  if(parent)return parent===c?'ad':'co';
  if((chanRx[c]||(chanRx[c]=new RegExp('(^|\\s)@?'+c+'(?=\\s|$|[,!?.:])','i'))).test(body))return 'ad';
  if(/(^|\s)@\w/.test(body))return 'co';
  if(norm&&others.size>=2)return 'va';
  if(toks.length&&!words.length)return 're';
  if(words.length<=3&&(RX.rire.test(body)||RX.hype.test(body)||RX.negatif.test(body)||words.length<toks.length))return 're';
  if(/\?\s*$/.test(body)||SECOND.test(body))return 'ad';
  return words.length>=4?'cm':'ct';
}
function kindsOf(q,chans){const d0=q.t0?dayKey(q.t0):'',k={};
  for(const W of Object.values(DB.words))if(W.d>=d0&&chans.includes(W.c)&&W.k)for(const x in W.k)k[x]=cnt(k,x)+W.k[x];return k}
/* ---------- emotes 7TV / BTTV / FFZ (mode navigateur ; le collecteur a les siennes) ---------- */
let extGlobal=new Set();const ext={},uidOf={};
const isExt=(c,w)=>extGlobal.has(w)||!!(ext[c]&&ext[c].has(w));
const getJson=async u=>{try{const r=await fetch(u);return r.ok?await r.json():null}catch(e){return null}};
async function loadEmotes(list,refresh){
  if(refresh||!extGlobal.size){const g=new Set();
    const a=await getJson('https://7tv.io/v3/emote-sets/global');if(a&&a.emotes)a.emotes.forEach(e=>g.add(e.name));
    const b=await getJson('https://api.betterttv.net/3/cached/emotes/global');if(Array.isArray(b))b.forEach(e=>g.add(e.code));
    const f=await getJson('https://api.betterttv.net/3/cached/frankerfacez/emotes/global');if(Array.isArray(f))f.forEach(e=>g.add(e.code));
    if(g.size)extGlobal=g}
  if(!apiReady()||!list.length)return;
  const need=list.filter(c=>!uidOf[c]);
  for(let i=0;i<need.length;i+=100){try{const r=await helix('users?'+need.slice(i,i+100).map(c=>'login='+encodeURIComponent(c)).join('&'));for(const u of r.data)uidOf[u.login.toLowerCase()]=u.id}catch(e){}}
  for(const c of list){const id=uidOf[c];if(!id)continue;const s=new Set();
    const a=await getJson('https://7tv.io/v3/users/twitch/'+id);if(a&&a.emote_set&&a.emote_set.emotes)a.emote_set.emotes.forEach(e=>s.add(e.name));
    const b=await getJson('https://api.betterttv.net/3/cached/users/twitch/'+id);if(b)[...(b.channelEmotes||[]),...(b.sharedEmotes||[])].forEach(e=>s.add(e.code));
    const f=await getJson('https://api.betterttv.net/3/cached/frankerfacez/users/twitch/'+id);if(Array.isArray(f))f.forEach(e=>s.add(e.code));
    if(s.size)ext[c]=s}
}

/* ---------- participation : activité du chat rapportée à l'audience ---------- */
// Les viewers sont relevés toutes les 2 min. Des relevés en plus (ajout d'une chaîne, redémarrage du collecteur…)
// ne doivent pas allonger la durée de live : on compte les tranches de 2 min couvertes, pas les relevés.
const SLOT=2*MIN;
const liveSlots=(vs,key=s=>'')=>new Set(vs.map(s=>key(s)+Math.floor(s.t/SLOT)));
function participation(q,c){
  const vs=q.snaps.filter(s=>s.c===c&&s.live).sort((a,b)=>a.t-b.t);if(!vs.length)return null;
  const liveMin=liveSlots(vs).size*2,avgV=vs.reduce((s,x)=>s+x.v,0)/vs.length;if(!(avgV>0))return null;
  const ts=vs.map(s=>s.t);let su=0,sm=0;
  for(const m of q.mins){if(m.c!==c)continue;
    let lo=0,hi=ts.length-1,i=-1;while(lo<=hi){const mid=(lo+hi)>>1;if(ts[mid]<=m.t+30000){i=mid;lo=mid+1}else hi=mid-1}
    if(i<0||m.t-ts[i]>150000)continue;su+=m.u;sm+=m.m}
  const uniq=new Set(q.pres.filter(p=>p.c===c&&p.g!==OFFLINE).map(p=>p.u)).size;
  return {avgV,liveMin,perMin:su/liveMin/avgV,msgK:sm/liveMin/avgV*1000,uniq:uniq/avgV};
}

/* ---------- followers, pub, réglages du chat et clips (collecteur 1.2) ---------- */
const metaList=c=>(DB.meta&&DB.meta[c])||[];
const metaLast=c=>{const a=metaList(c);return a.length?a[a.length-1]:null};
/* ---------- langue des chaînes ----------
   Langue du stream déclarée sur Twitch (relevée par le collecteur 1.2+ ou l'API en mode « Ce navigateur »).
   Le filtre Langue s'applique à tous les onglets : shown() remplace la liste complète partout où l'on affiche. */
// Langues fixées à la main : Twitch ne donne qu'une langue par chaîne, ne distingue pas les Américains (« us »),
// et ne connaît pas encore la langue d'une chaîne ajoutée qui n'a pas streamé depuis. Plusieurs codes = la chaîne
// streame dans chacune de ces langues (la première est la principale). « us » compte comme anglophone.
const LANG_FIX={
  kaicenat:['us'],ishowspeed:['us'],loltyler1:['us'],
  ricadam_lol:['fr'],sardoche:['fr'],pauleta_twitch:['fr'],theburntpeanut:['us'],mawkzy_:['fr'],locklear:['fr'],
  doigby:['fr'],xo_trixy:['fr'],dfg:['fr'],caedrel:['en'],illojuan:['es'],rubius:['es'],alanzoka:['pt'],
  caseoh_:['us'],zackrawrr:['us'],trymacs:['de'],tumblurr:['it'],zarbex:['de'],hasanabi:['us'],
  shadowkekw:['ru','en'],leb1ga:['uk'],jynxzi:['us'],emiru:['us'],ludwig:['us'],
};
const metaLang=c=>{const L=metaLast(c);return L&&L.lg?String(L.lg).toLowerCase().slice(0,2):''};
/** Codes à afficher (fr, us, ru+en…). */
const langsOf=c=>LANG_FIX[c]||(metaLang(c)?[metaLang(c)]:[]);
/** Langues au sens du filtre (us → en). */
const spokeOf=c=>langsOf(c).map(l=>l==='us'?'en':l);
const langOf=c=>spokeOf(c)[0]||'';
const LANGS=[['*','Toutes'],['fr','Francophones'],['en','Anglophones'],['autre','Autres']];
const inLang=(c,l=cfg.lang||'*')=>{if(l==='*')return true;const L=spokeOf(c);return l==='autre'?L.some(x=>!['fr','en'].includes(x)):L.includes(l)};
const shown=()=>cfg.chans.filter(c=>inLang(c));
function buildLangSeg(){
  const known=cfg.chans.some(c=>langOf(c)),n=k=>cfg.chans.filter(c=>inLang(c,k)).length;
  $('langLbl').classList.toggle('hide',!known);$('langSeg').classList.toggle('hide',!known);
  if(!known){if(cfg.lang&&cfg.lang!=='*'){cfg.lang='*';buildChanSel()}return} // langues pas encore connues : pas de filtre
  const l=cfg.lang||'*',opts=LANGS.filter(([k])=>k==='*'||k===l||n(k));
  const h=opts.map(([k,lbl])=>`<button data-l="${k}" class="${k===l?'on':''}">${lbl} <span class="lbl">${n(k)}</span></button>`).join('');
  if($('langSeg').innerHTML!==h)$('langSeg').innerHTML=h;
  const sh=shown(); // chaîne choisie hors de la langue affichée (ou langues arrivées après l'ouverture) : on en reprend une de la liste
  if(tab==='channel'&&!sh.includes(selChan)||tab==='chat'&&selChat!=='*'&&!sh.includes(selChat))buildChanSel()}
function metaAt(c,t){const a=metaList(c);let r=null;for(const x of a){if(x.t<=t)r=x;else break}return r} // dernier relevé d'état avant l'instant t
const limited=cs=>!!(cs&&(cs.sl>0||cs.su||cs.em||cs.un));
function chatModeLbl(cs){if(!cs)return '';const p=[];if(cs.sl>0)p.push('mode lent '+cs.sl+' s');if(cs.su)p.push('abonnés seulement');if(cs.em)p.push('emotes seulement');if(cs.un)p.push('messages uniques');if(cs.fo)p.push('followers seulement');return p.join(', ')}
function partBy(q,c,pred){ // participation d'une chaîne sur les minutes de live qui satisfont pred(minute)
  const vs=q.snaps.filter(s=>s.c===c&&s.live).sort((a,b)=>a.t-b.t);if(!vs.length)return null;
  const ts=vs.map(s=>s.t);let sv=0,su=0,sm=0,n=0;
  for(const m of q.mins){if(m.c!==c||!pred(m))continue;
    let lo=0,hi=ts.length-1,i=-1;while(lo<=hi){const mid=(lo+hi)>>1;if(ts[mid]<=m.t+30000){i=mid;lo=mid+1}else hi=mid-1}
    if(i<0||m.t-ts[i]>150000)continue;sv+=vs[i].v;su+=m.u;sm+=m.m;n++}
  return n&&sv?{n,perMin:su/sv,msgK:sm/sv*1000}:null}
// Données des tableaux de la vue d'ensemble (affichés par React : app/src/components/overview/).
const who=c=>({c,color:colorOf(c),img:avUrl(c)});
// chat limité pendant la période : liste des modes actifs, ou '' si aucun
function chatLimitLbl(c,t0){const x=metaList(c).filter(x=>x.t>=t0&&limited(x.cs)).pop();return x?chatModeLbl(x.cs):''}
function followersData(q){
  return shown().map(c=>{const L=metaLast(c);if(!L||L.fol==null)return null;
    const a=metaList(c).filter(x=>x.fol!=null),f0=a[0],span=L.t-f0.t,p=participation(q,c);
    return {...who(c),fol:L.fol,avgV:p?p.avgV:null,grow:span>=20*HOUR?(L.fol-f0.fol)/span*DAY:null}}).filter(Boolean).sort((a,b)=>b.fol-a.fol);
}
// null : aucun relevé d'état de chaîne (pas de section) ; [] : relevés, mais pas encore de chaîne comparable
function brandData(q){
  if(!Object.keys(DB.meta||{}).length)return null;
  const rows=[];
  for(const c of shown()){if(!metaList(c).length)continue;
    const a=partBy(q,c,m=>{const x=metaAt(c,m.t);return !!x&&x.br===1}),b=partBy(q,c,m=>{const x=metaAt(c,m.t);return !!x&&x.br===0});
    if(a&&b&&a.n>=15&&b.n>=15)rows.push({...who(c),with:{msgK:a.msgK,perMin:a.perMin},without:{msgK:b.msgK,perMin:b.perMin}})}
  return rows;
}
const MOD_TYPES=['ban','timeout','clear','del'],isMod=e=>MOD_TYPES.includes(e.type);
// début du relevé : collecteur 1.6 pour les sanctions, 1.6.1 pour les messages supprimés (type del)
function modStart(types=MOD_TYPES){let t=Infinity;for(const e of DB.events)if(types.includes(e.type)&&e.t<t)t=e.t;return t}
// null : relevé pas encore commencé ; sinon lignes triées et noDel (messages supprimés pas encore relevés)
function modData(q){
  if(!isFinite(modStart()))return null;
  const tS=Math.max(q.t0,modStart(['ban','timeout','clear'])),tD=Math.max(q.t0,modStart(['del']));
  // nombre pour 1 000 messages, seulement depuis le début du relevé de ces types et à partir de 200 messages
  const rate=(c,ev,t1,types)=>{if(!isFinite(t1))return null;const msgs=q.mins.filter(m=>m.c===c&&m.t>=t1).reduce((s,m)=>s+m.m,0);
    return msgs>=200?ev.filter(e=>e.t>=t1&&types.includes(e.type)).reduce((s,e)=>s+e.n,0)/msgs*1000:null};
  const rows=shown().map(c=>{const ev=q.events.filter(e=>e.c===c&&isMod(e)),n=t=>ev.filter(e=>e.type===t).reduce((s,e)=>s+e.n,0);
    return {...who(c),limited:chatLimitLbl(c,q.t0),ban:n('ban'),to:n('timeout'),clr:n('clear'),del:n('del'),msgs:q.mins.some(m=>m.c===c),rate:rate(c,ev,tS,['ban','timeout']),drate:rate(c,ev,tD,['del'])}})
    .filter(r=>r.ban||r.to||r.clr||r.del||r.msgs);
  const v=x=>x==null?-1:x;
  rows.sort((a,b)=>v(b.rate)-v(a.rate)||(b.ban+b.to)-(a.ban+a.to)||v(b.drate)-v(a.drate));
  return {rows,noDel:!isFinite(tD)};
}
function clipStats(q,chans){
  const byC={};for(const m of q.mins)(byC[m.c]=byC[m.c]||[]).push(m);for(const c in byC)byC[c].sort((a,b)=>a.t-b.t);
  const out=[];
  for(const k of q.clips||[]){if(!chans.includes(k.c))continue;const a=byC[k.c];if(!a)continue;
    const t0=Math.floor(k.ts/MIN)*MIN,t1=Math.floor((k.ts+k.d*1000)/MIN)*MIN;
    const during=a.filter(m=>m.t>=t0&&m.t<=t1);if(!during.length)continue;
    const prev=a.filter(m=>m.t<t0&&t0-m.t<=20*MIN).map(m=>m.m),peak=during.reduce((x,m)=>m.m>x.m?m:x,during[0]);
    const base=prev.length>=5?median(prev):NaN,kn=ktot(peak.k||{});
    out.push({...k,m:peak.m,base,score:isFinite(base)?peak.m/Math.max(base,1):NaN,va:kn?(peak.k.va||0)/kn:NaN})}
  return out}
/* ---------- moments à clipper ---------- */
function moments(mins,chans,limit=8){
  const out=[];
  for(const c of chans){const a=mins.filter(m=>m.c===c).sort((x,y)=>x.t-y.t);
    for(let i=0;i<a.length;i++){const prev=[];for(let j=i-1;j>=0&&a[i].t-a[j].t<=20*MIN;j--)prev.push(a[j].m);
      if(prev.length<5)continue;const base=median(prev),m=a[i].m;
      if(m<Math.max(10,2.5*base))continue;out.push({...a[i],base,score:m/Math.max(base,1)})}}
  out.sort((x,y)=>y.score-x.score);const sel=[];
  for(const o of out){if(sel.every(s=>s.c!==o.c||Math.abs(s.t-o.t)>=10*MIN))sel.push(o);if(sel.length>=limit)break}
  return sel;
}
function moodOf(m){const arr=[['rire',m.r],['hype',m.h],['negatif',m.n],['question',m.q]].filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);
  return arr.length&&arr[0][1]/(m.m||1)>=.2?MOODS.find(x=>x[0]===arr[0][0])[1]:''}
function vodLink(c,t){const v=(DB.vods[c]||[]).filter(v=>v.start<=t&&t-v.start<48*HOUR).sort((a,b)=>b.start-a.start)[0];if(!v)return '';
  const s=Math.max(0,Math.floor((t-v.start)/1000)-30);return `https://www.twitch.tv/videos/${v.id}?t=${Math.floor(s/3600)}h${Math.floor(s%3600/60)}m${s%60}s`}
/* ---------- changements de jeu ---------- */
function switchesOf(snaps,mins,chans){
  const out=[],W=20*MIN,avg=(a,f)=>a.length?a.reduce((x,y)=>x+f(y),0)/a.length:NaN;
  for(const c of chans){const s=snaps.filter(x=>x.c===c).sort((a,b)=>a.t-b.t),mc=mins.filter(m=>m.c===c);
    for(let i=1;i<s.length;i++){const a=s[i-1],b=s[i];if(!a.live||!b.live||a.g===b.g||b.t-a.t>6*MIN)continue;const t=b.t;
      const vb=s.filter(x=>x.live&&x.t<t&&x.t>=t-W&&x.g===a.g),va=s.filter(x=>x.live&&x.t>=t&&x.t<=t+W&&x.g===b.g);
      const done=Date.now()-t>=W;
      out.push({c,t,from:a.g,to:b.g,vB:avg(vb,x=>x.v),vA:done&&va.length>=3?avg(va,x=>x.v):NaN,
        mB:vb.length>=3?mc.filter(m=>m.t<t&&m.t>=t-W).reduce((x,y)=>x+y.m,0)/20:NaN,
        mA:done?mc.filter(m=>m.t>=t&&m.t<t+W).reduce((x,y)=>x+y.m,0)/20:NaN})}}
  return out.sort((a,b)=>b.t-a.t);
}
const rel=(a,b)=>isFinite(a)&&isFinite(b)&&b>0?a/b-1:NaN;

/* ---------- onglet Chat ---------- */
// Onglet « Chat » : l'ancien code calcule, React affiche (événement « legacy:chat », voir app/src/legacy/bridge.ts).
function renderChat(q){
  const chans=selChat==='*'?shown():[selChat],all=selChat==='*';$('t-chat').innerHTML='';
  const d0=q.t0?dayKey(q.t0):'',agg={w:{},e:{},moods:{rire:0,hype:0,negatif:0,question:0},n:0},perC=new Map();
  for(const W of Object.values(DB.words)){if(W.d<d0||!chans.includes(W.c))continue;agg.n+=W.n;
    for(const k in W.moods)agg.moods[k]+=W.moods[k];for(const k in W.w)agg.w[k]=cnt(agg.w,k)+W.w[k];for(const k in W.e)agg.e[k]=cnt(agg.e,k)+W.e[k];
    let o=perC.get(W.c);if(!o)perC.set(W.c,o={n:0,moods:{rire:0,hype:0,negatif:0,question:0},e:{}});o.n+=W.n;for(const k in W.moods)o.moods[k]+=W.moods[k];for(const k in W.e)o.e[k]=cnt(o.e,k)+W.e[k]}
  const N=agg.n,KA=kindsOf(q,chans),KN=ktot(KA),share=(k,x)=>KN?(k[x]||0)/KN:0;
  // types de messages par chaîne (toutes les chaînes, au moins 2 avec 20 messages triés), de la plus « conversation » à la plus « réaction »
  let kindRows=null;
  if(all&&KN){const rows=shown().map(c=>({c,k:kindsOf(q,[c])})).map(r=>({...r,N:ktot(r.k)})).filter(r=>r.N>=20);
    if(rows.length>1)kindRows=rows.sort((a,b)=>ksum(b.k,INTER)/b.N-ksum(a.k,INTER)/a.N).map(r=>({...who(r.c),n:r.N,
      react:ksum(r.k,REACT)/r.N,wave:(r.k.va||0)/r.N,inter:ksum(r.k,INTER)/r.N,ad:(r.k.ad||0)/r.N,co:(r.k.co||0)/r.N,cm:(r.k.cm||0)/r.N,ct:(r.k.ct||0)/r.N}))}
  const moodRows=all&&perC.size?shown().filter(c=>perC.has(c)).map(c=>{const r=perC.get(c);
    return {...who(c),n:r.n,moods:MOODS.map(([k])=>r.n?r.moods[k]/r.n:0),emote:(Object.entries(r.e).sort((a,b)=>b[1]-a[1])[0]||[''])[0]}}):null;
  const B=10*MIN,gp=listenGaps(chans,q.t0);
  const moodChart=(()=>{const bk=new Map();for(const m of q.mins){if(!chans.includes(m.c))continue;const t=Math.floor(m.t/B)*B;let o=bk.get(t);if(!o)bk.set(t,o={m:0,r:0,h:0,n:0,q:0});o.m+=m.m;o.r+=m.r||0;o.h+=m.h||0;o.n+=m.n||0;o.q+=m.q||0}
    const ts=[...bk.keys()].sort((a,b)=>a-b),ser=[['r','Rire',PAL[0]],['h','Hype',PAL[1]],['n','Négatif',PAL[2]],['q','Questions',PAL[3]]].map(([k,name,color])=>{const pts=[];let prev=null;
      for(const t of ts){const o=bk.get(t);if(prev!=null&&t-prev>B)pts.push([prev+B,null]);pts.push([t,o.m>=5?o[k]/o.m*100:null]);prev=t}return {name,color,pts}});
    return lineSpec(ser,{pct:true,yFloor:10,gaps:gp})})();
  const kindChart=KN?(()=>{const kb=new Map();for(const m of q.mins){if(!chans.includes(m.c)||!m.k)continue;const t=Math.floor(m.t/B)*B;let o=kb.get(t);if(!o)kb.set(t,o={});for(const x in m.k)o[x]=cnt(o,x)+m.k[x]}
    const kt=[...kb.keys()].sort((a,b)=>a-b),kser=[[REACT,'Réactions','#d95926'],[INTER,'Interactions','#3987e5'],[['cm'],'Commentaires','#199e70']].map(([keys,name,color])=>{const pts=[];let prev=null;
      for(const t of kt){const o=kb.get(t),n=ktot(o);if(prev!=null&&t-prev>B)pts.push([prev+B,null]);pts.push([t,n>=5?ksum(o,keys)/n*100:null]);prev=t}return {name,color,pts}});
    return lineSpec(kser,{pct:true,yFloor:10,h:170,gaps:gp})})():null;
  window.dispatchEvent(new CustomEvent('legacy:chat',{detail:{
    all,ch:all?null:chHead(selChat),
    list:liveFirst(shown()).map(x=>({...who(x),live:!!(info[x]&&info[x].live)})),
    n:N,moods:MOODS.map(([k,l])=>({key:k,label:l,share:N?agg.moods[k]/N:null})),
    kinds:KN?{n:KN,react:ksum(KA,REACT)/KN,wave:share(KA,'va'),inter:ksum(KA,INTER)/KN,ad:share(KA,'ad'),co:share(KA,'co'),cm:share(KA,'cm'),
      parts:KINDS.map(([k,l,d,col])=>({key:k,label:l,desc:d,color:col,share:share(KA,k)}))}:null,
    kindRows,moodRows,
    emotes:Object.entries(agg.e).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([k,v])=>({k,v,share:N?v/N:null})),
    words:Object.entries(agg.w).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([k,v])=>({k,v})),
    moments:momentsData(moments(q.mins,chans,all?12:10)),clips:clipsData(q,chans),
    moodChart,kindChart}}));
}

/* ---------- onglet Carte ---------- */
function communities(nodes,edges){
  const lab=new Map(nodes.map((n,i)=>[n.id,i])),adj=new Map(nodes.map(n=>[n.id,[]]));
  for(const e of edges){adj.get(e.a).push([e.b,e.j]);adj.get(e.b).push([e.a,e.j])}
  for(let it=0;it<20;it++){let ch=false;
    for(const n of nodes){const w=new Map();for(const [o,j] of adj.get(n.id))w.set(lab.get(o),(w.get(lab.get(o))||0)+j);
      if(!w.size)continue;let best=lab.get(n.id),bw=w.get(best)||0;for(const [l,v] of w)if(v>bw+1e-9||(Math.abs(v-bw)<1e-9&&l<best)){best=l;bw=v}
      if(best!==lab.get(n.id)){lab.set(n.id,best);ch=true}}
    if(!ch)break}
  return lab;
}
// Disposition pensée pour être la plus lisible possible :
// 1. chaque groupe reçoit un secteur autour du logo, à la mesure de sa taille, et les groupes qui partagent le plus de
//    viewers sont mis côte à côte (leurs liens restent courts) ;
// 2. les ronds se repoussent en comptant la place de leur nom ; les liens forts sont plus courts que les faibles ; chaque
//    groupe reste serré, avec de l'air entre les groupes ; toute la surface du cadre sert, en largeur comme en hauteur,
//    sans toucher le logo, le bandeau « RADAR » ni les boutons ;
// 3. on échange deux chaînes d'un même groupe tant que ça diminue le nombre de liens qui se croisent (puis leur longueur) ;
// 4. le tout est fait à partir de 4 départs différents, et on garde la disposition la mieux notée (croisements, groupes mélangés).
// Sur une vraie carte de 53 chaînes : 84 % des voisins proches d'une chaîne sont de son groupe (59 % avant ce réglage) et
// 171 croisements au lieu de 213, sans nom masqué ; environ 200 ms de calcul, faits une seule fois.
// Le calcul est entièrement déterminé par les données : mêmes chaînes et mêmes liens, même dessin. Liens changés : léger
// réajustement à partir des places précédentes. Calcul complet pour une chaîne nouvelle ou avec le bouton « Réorganiser ».
// Places gardées en fraction du cadre (mapPos), pour suivre un changement de largeur.
// Chaque vue de la carte (toutes les chaînes, groupes, sélection) garde sa propre disposition (mapLayouts[vue]).
let mapRelayout=false;const mapLayouts={};
// Rayon de la planète Twitch au centre de la carte (zoom 1, plus petite sur téléphone) ; mapLogo : place gardée libre
// autour d'elle (diamètre), pour la disposition comme pour le dessin.
const mapTwR=W=>W<600?28:38,mapLogo=W=>2*mapTwR(W)*1.75;
function layoutMap(nodes,edges,gl,R,LW,W,H,full,view){
  const st=mapLayouts[view]||(mapLayouts[view]={pos:new Map(),key:''}),mapPos=st.pos;
  const n=nodes.length,ids=nodes.map(nd=>nd.id),idx=new Map(ids.map((c,i)=>[c,i]));
  const key=ids.join(',')+'|'+edges.map(e=>e.a+'>'+e.b).sort().join(',')+'|'+(W/H).toFixed(1); // cadre de proportions différentes : réajusté
  const fresh=full||ids.some(c=>!mapPos.has(c));
  if(!fresh&&key===st.key)return ids.map(c=>({x:mapPos.get(c).x*W,y:mapPos.get(c).y*H}));
  st.key=key;
  const mj=maxOf(edges,e=>e.j)||1,E=edges.map(e=>({i:idx.get(e.a),j:idx.get(e.b),w:e.j/mj}));
  const grp=new Int32Array(n);gl.forEach((m,g)=>m.forEach(nd=>{grp[idx.get(nd.id)]=g}));
  const big=Uint8Array.from(ids,(c,i)=>gl[grp[i]].length>1?1:0); // chaîne d'un vrai groupe (pas isolée)
  const lw=LW.map(w=>Math.min(w,130)),rho=R.map((r,i)=>r+8+.42*lw[i]); // place d'un rond avec son nom
  const CX=W/2,CY=H/2,s=Math.sqrt(W*H*.45/n),LOGO=mapLogo(W),btnH=Object.keys(cfg.mapPins||{}).length?230:194;
  const K={rep:.3,cut:2.5,sep:2.8,sepK:1,coh:.5,grav:.03,spr:.4,sprW:1.2,l0:.5,l1:.9,starts:4}; // réglages choisis en comparant plusieurs variantes sur une vraie carte de 53 chaînes
  const ideal=E.map(e=>Math.max(rho[e.i]+rho[e.j]+6,s*(K.l0+K.l1*(1-e.w)))); // longueur visée d'un lien : plus court s'il est fort
  const lo=R.map((r,i)=>r+10+.35*lw[i]),top=R.map(r=>(W<600?60:36)+r),bot=R.map(r=>H-r-14); // en haut : sous le bandeau « CARTE » (sur deux lignes sur téléphone)
  const nbW=ids.map(()=>[]);E.forEach(e=>{nbW[e.i].push([e.j,e.w]);nbW[e.j].push([e.i,e.w])});
  // Places de départ : un secteur par groupe autour du logo, à la mesure de sa taille. L'ordre des groupes autour du
  // centre est celui qui rapproche le plus les groupes qui partagent des viewers (toutes les possibilités essayées
  // jusqu'à 8 groupes). Les chaînes isolées partent à côté de la chaîne avec qui elles partagent le plus.
  const bigG=gl.map((m,g)=>g).filter(g=>gl[g].length>1),area=gl.map(m=>m.reduce((t,nd)=>t+rho[idx.get(nd.id)]**2,0));
  const link=gl.map(()=>new Float64Array(gl.length));for(const e of E){const a=grp[e.i],b=grp[e.j];if(a!==b){link[a][b]+=e.w;link[b][a]+=e.w}}
  const angles=order=>{const tot=order.reduce((t,g)=>t+area[g],0)||1,A={};let a=0;for(const g of order){A[g]=a+Math.PI*area[g]/tot;a+=2*Math.PI*area[g]/tot}return A};
  const orderCost=order=>{const A=angles(order);let c=0;for(const g of order)for(const h of order)if(g<h&&link[g][h]){let d=Math.abs(A[g]-A[h]);d=Math.min(d,2*Math.PI-d);c+=link[g][h]*d}return c};
  let bestOrder=bigG.slice();
  if(bigG.length>2&&bigG.length<=8){let bc=Infinity;const rest=bigG.slice(1);
    const perm=(a,k)=>{if(k===a.length){const o=[bigG[0],...a],c=orderCost(o);if(c<bc-1e-9){bc=c;bestOrder=o}return}
      for(let i=k;i<a.length;i++){[a[k],a[i]]=[a[i],a[k]];perm(a,k+1);[a[k],a[i]]=[a[i],a[k]]}};perm(rest,0)}
  const initial=(a0,flip)=>{const order=flip?[bestOrder[0],...bestOrder.slice(1).reverse()]:bestOrder,A=angles(order),P=new Array(n);
    for(const g of order){const am=a0+A[g],ax=order.length>1?CX+Math.cos(am)*(W/2-40)*.55:CX,ay=order.length>1?CY+Math.sin(am)*(H/2-30)*.55:CY;
      gl[g].forEach((nd,k)=>{const r=Math.sqrt(k)*s*.55,t=k*2.39996+am;P[idx.get(nd.id)]={x:ax+Math.cos(t)*r,y:ay+Math.sin(t)*r}})}
    let ring=0;const solo=ids.map((c,i)=>i).filter(i=>!big[i]).sort((a,b)=>nbW[b].length-nbW[a].length);
    for(const i of solo){const near=nbW[i].filter(([j])=>P[j]).sort((a,b)=>b[1]-a[1])[0];
      if(near){const q=P[near[0]],dx=q.x-CX,dy=q.y-CY,d=Math.hypot(dx,dy)||1;P[i]={x:q.x+dx/d*s*.7+(ring%2?8:-8),y:q.y+dy/d*s*.7};ring++}
      else{const t=a0+(ring++)*2.39996;P[i]={x:CX+Math.cos(t)*(W/2-60),y:CY+Math.sin(t)*(H/2-40)}}}
    return P};
  let P=fresh?null:ids.map(c=>({x:mapPos.get(c).x*W,y:mapPos.get(c).y*H}));
  const relax=(iters,T0)=>{
    for(let it=0;it<iters;it++){const T=T0*(1-it/iters)+.3,Dx=new Float64Array(n),Dy=new Float64Array(n);
      for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){let dx=P[i].x-P[j].x,dy=P[i].y-P[j].y,d=Math.hypot(dx,dy);if(d<.01){dx=.01*(i-j);dy=.01;d=Math.hypot(dx,dy)}
        const m=rho[i]+rho[j]+6;let f=d<s*K.cut?s*s*K.rep/d:0; // répulsion entre voisins proches : les ronds se répartissent
        if(big[i]&&big[j]&&grp[i]!==grp[j]&&d<s*K.sep)f+=(s*K.sep-d)*K.sepK; // deux groupes différents : de l'air entre eux
        if(d<m)f+=(m-d)*2;                                 // ronds et noms qui se chevauchent : forte poussée
        Dx[i]+=dx/d*f;Dy[i]+=dy/d*f;Dx[j]-=dx/d*f;Dy[j]-=dy/d*f}
      for(let k=0;k<E.length;k++){const e=E[k],dx=P[e.j].x-P[e.i].x,dy=P[e.j].y-P[e.i].y,d=Math.hypot(dx,dy)||.01,f=(d-ideal[k])*(K.spr+K.sprW*e.w);
        Dx[e.i]+=dx/d*f;Dy[e.i]+=dy/d*f;Dx[e.j]-=dx/d*f;Dy[e.j]-=dy/d*f}
      const gx=new Float64Array(gl.length),gy=new Float64Array(gl.length);
      for(let i=0;i<n;i++){gx[grp[i]]+=P[i].x/gl[grp[i]].length;gy[grp[i]]+=P[i].y/gl[grp[i]].length}
      for(let i=0;i<n;i++){const p=P[i];
        if(big[i]){Dx[i]+=(gx[grp[i]]-p.x)*K.coh;Dy[i]+=(gy[grp[i]]-p.y)*K.coh} // le groupe reste groupé
        Dx[i]+=(CX-p.x)*K.grav;Dy[i]+=(CY-p.y)*K.grav; // rappel vers le centre : pas de chaînes collées aux bords
        if(p.x<lo[i])Dx[i]+=(lo[i]-p.x)*3;if(p.x>W-lo[i])Dx[i]-=(p.x-W+lo[i])*3; // bords du cadre
        if(p.y<top[i])Dy[i]+=(top[i]-p.y)*3;if(p.y>bot[i])Dy[i]-=(p.y-bot[i])*3;
        const lx=p.x-CX,ly=p.y-CY,ld=Math.hypot(lx,ly)||.01,lm=R[i]+LOGO/2+14;if(ld<lm){Dx[i]+=lx/ld*(lm-ld)*3;Dy[i]+=ly/ld*(lm-ld)*3} // logo
        if(p.x>W-56-R[i]&&p.y<btnH+R[i])Dy[i]+=(btnH+R[i]-p.y)*2} // boutons + − ⤢
      for(let i=0;i<n;i++){const d=Math.hypot(Dx[i],Dy[i]);if(d>0){const k=Math.min(d,T)/d;P[i].x+=Dx[i]*k;P[i].y+=Dy[i]*k}}}
    for(let i=0;i<n;i++){P[i].x=Math.max(R[i]+6,Math.min(W-R[i]-6,P[i].x));P[i].y=Math.max(top[i]-6,Math.min(bot[i],P[i].y))}};
  const ccw=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const crosses=(k,l)=>{const a=E[k],b=E[l];if(a.i===b.i||a.i===b.j||a.j===b.i||a.j===b.j)return false;
    const p=P[a.i],q=P[a.j],r=P[b.i],t=P[b.j];return ccw(p,q,r)*ccw(p,q,t)<0&&ccw(r,t,p)*ccw(r,t,q)<0};
  const inc=ids.map(()=>[]);E.forEach((e,k)=>{inc[e.i].push(k);inc[e.j].push(k)});
  // Note d'une disposition (plus bas = mieux) : liens qui se croisent, plus chaque chaîne d'un groupe dont un des 3 voisins
  // les plus proches est d'un autre groupe (c'est ce qui donne l'impression de groupes mélangés).
  const score=()=>{let c=0;for(let k=0;k<E.length;k++)for(let l=k+1;l<E.length;l++)if(crosses(k,l))c++;
    let mix=0;for(let i=0;i<n;i++){if(!big[i])continue;const d=[];for(let j=0;j<n;j++)if(j!==i)d.push([Math.hypot(P[i].x-P[j].x,P[i].y-P[j].y),j]);
      d.sort((a,b)=>a[0]-b[0]);for(let q=0;q<3&&q<d.length;q++)if(grp[d[q][1]]!==grp[i])mix++}
    return c+3*mix};
  // moins de croisements : échanger deux chaînes d'un même groupe si ça en enlève (ou, à égalité, raccourcit leurs liens)
  const swaps=()=>{const cost=(i,j)=>{let c=0,len=0;for(const k of new Set([...inc[i],...inc[j]])){for(let l=0;l<E.length;l++)if(l!==k&&crosses(k,l))c++;
      len+=Math.hypot(P[E[k].i].x-P[E[k].j].x,P[E[k].i].y-P[E[k].j].y)*(.5+E[k].w)}return c*1e4+len};
    for(let pass=0;pass<3;pass++){let better=false;
      for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){if(grp[i]!==grp[j]||!inc[i].length&&!inc[j].length)continue;
        const before=cost(i,j);[P[i],P[j]]=[P[j],P[i]];if(cost(i,j)<before-1)better=true;else [P[i],P[j]]=[P[j],P[i]]}
      if(!better)break}};
  if(fresh){ // plusieurs départs (groupes tournés d'un quart de tour, ordre inversé) : on garde la disposition la mieux notée
    let best=null,bs=Infinity;
    for(let v=0;v<K.starts;v++){P=initial(-Math.PI/2+(v>>1)*Math.PI/2,v%2===1);relax(500,s*.6);swaps();relax(150,s*.12);
      const sc=score();if(sc<bs){bs=sc;best=P}}
    P=best}
  else relax(60,s*.08);
  // Remplir le cadre : les forces donnent un nuage rond et serré au milieu ; on l'agrandit depuis le centre jusqu'aux bords
  // (ronds et noms compris), au plus 2 fois, et pas plus de 35 % de plus dans un sens que dans l'autre (la forme reste).
  let sx=2,sy=2;
  for(let i=0;i<n;i++){const dx=P[i].x-CX,dy=P[i].y-CY;
    if(Math.abs(dx)>1)sx=Math.min(sx,((dx>0?W-lo[i]-10:lo[i]+10)-CX)/dx);
    if(Math.abs(dy)>1)sy=Math.min(sy,((dy>0?bot[i]-4:top[i]+4)-CY)/dy)}
  sx=Math.max(sx,1);sy=Math.max(sy,1);const sm=Math.min(sx,sy)*1.35;sx=Math.min(sx,sm);sy=Math.min(sy,sm);
  if(sx>1.02||sy>1.02)for(let i=0;i<n;i++){const p=P[i];p.x=CX+(p.x-CX)*sx;p.y=CY+(p.y-CY)*sy;
    if(p.x>W-56-R[i]&&p.y<btnH+R[i])p.y=btnH+R[i]} // pas sous les boutons + − ⤢
  ids.forEach((c,i)=>mapPos.set(c,{x:P[i].x/W,y:P[i].y/H}));
  return P.map(p=>({x:p.x,y:p.y}));
}
// Vue de la carte (zoom, déplacement, chaîne ou groupe mis en avant). Gardée quand la page se redessine toute seule :
// le rafraîchissement automatique ne remet pas la carte à zéro sous les yeux de quelqu'un qui l'explore.
// rot : rotation autour du centre du radar (radians). grp : numéro du groupe mis en avant dans le dessin en cours ;
// grpId : une chaîne de ce groupe, qui sert à le retrouver après un rafraîchissement (les numéros peuvent changer d'ordre).
const mapView={k:1,tx:0,ty:0,rot:0,q:[1,0,0,0],w:0,sel:null,grp:null,grpId:null,touched:0};
// Mouvement des planètes, gardé quand la carte se redessine (rien ne saute à un rafraîchissement) :
// mapAng : angle parcouru par chaque système (ou chaîne seule) autour de la planète Twitch, chacun à sa vitesse ;
// mapKep : où en est chaque planète sur son ellipse (anomalie moyenne, en radians) ; mapRing : planètes de chaque anneau
// (si elles changent, elles sont de nouveau espacées régulièrement) ; mapOff : petit écart d'une chaîne à sa place quand
// deux se croisent ; mapSysOff : écart d'un système entier quand deux systèmes se croisent.
const mapAng=new Map(),mapKep=new Map(),mapRing=new Map(),mapOff=new Map(),mapSysOff=new Map();
let radarRaf=0; // animation du balayage radar (une seule à la fois, arrêtée hors de l'onglet Carte)
const mapSeenEv=new Set(); // abonnements, bits et raids déjà montrés sur la carte (chacun une seule fois)
const mapSeenPass=new Set(); // passages en direct d'un chat à l'autre déjà montrés (viewer|de|vers|jour)
let mapViewChecked=false; // la vue « Ma sélection » est vérifiée une fois à l'ouverture (voir renderMap)
let mapGlobeOn=false;delete cfg.mapGlobe;delete cfg.mapPause; // la pause non plus n'est pas gardée : une carte qui rouvre figée sans le dire paraît cassée (critique du 25/11/2026)
// mode Globe (glisser = tourner l'univers en 3D) : gardé tant que la page reste ouverte, jamais d'une visite à l'autre (l'ancien réglage enregistré est oublié)
const mapPassLog=[]; // les 5 derniers passages vus sur la carte (gardés quand la carte se redessine), affichés dans le menu
let mapIntroKey='',mapIntroAt=-1e9; // période et langue du dernier tracé des liens à l'apparition (vidé à l'ouverture de l'onglet Carte), et son heure
// Vues « Toutes les chaînes » et « Ma sélection » : une seule couleur pour les ronds (violet de l'application) et pour les liens
const MAP_COL='#8b7cff',MAP_LINK='#e6e1ff'; // liens : lavande presque blanche, pour ressortir sur le ciel violet
// Menu de la carte : ouvert d'office sur ordinateur, fermé sur téléphone (il passe alors par-dessus la carte) ; choix gardé
const mapSideOpen=()=>cfg.mapSide==null?(window.innerWidth||1200)>760:!!cfg.mapSide;
// Actions du menu de la carte (React, app/src/components/map/) : menu replié, période, langue, vue, chaînes cochées, disposition
function mapAction(a,v,on){
  if(a==='side'){cfg.mapSide=!mapSideOpen();saveCfg();render();return}
  if(a==='period'){const b=$('period').querySelector(`[data-p="${v}"]`);if(b)b.click();return} // mêmes filtres que les autres onglets
  if(a==='lang'){cfg.lang=v;saveCfg();buildChanSel();render();return}
  if(a==='game'){cfg.mapGame=v;saveCfg();mapView.sel=null;render();return} // jeu principal (« * » : tous)
  if(a==='view'){cfg.mapMode=v;saveCfg();mapView.sel=null;render();return}
  if(a==='live'){cfg.mapLive=v==='live';saveCfg();mapView.sel=null;render();return} // seulement les chaînes en live en ce moment
  if(a==='min'){cfg.mapMin=+v||0;saveCfg();mapView.sel=null;render();return} // audience minimale (viewers actifs sur la période ; 0 : aucune)
  if(a==='reset'){cfg.mapLive=false;cfg.mapGame='*';cfg.mapMin=0;cfg.lang='*';saveCfg();buildChanSel();mapView.sel=null;render();return} // tous les filtres d'un coup (la langue est commune à tous les onglets)
  if(a==='pick'){const S=new Set(cfg.mapSel||[]);for(const c of [].concat(v))on?S.add(c):S.delete(c);cfg.mapSel=[...S];saveCfg();mapIntroKey='';render();return}
  if(a==='pins'){delete cfg.mapPins;saveCfg();mapView.touched=Date.now();render();return} // chaînes déplacées remises à leur place calculée
  if(a==='relayout'){delete cfg.mapPins;saveCfg();mapRelayout=true;[mapAng,mapKep,mapRing,mapOff,mapSysOff].forEach(m=>m.clear());/* orbites reprises au début */Object.assign(mapView,{k:1,tx:0,ty:0,rot:0,q:[1,0,0,0]});mapIntroKey='';mapView.touched=Date.now();render();return} // tout recalculé, vue d'ensemble, liens retracés
}
let measureCtx=null;
// Arrêts d'un dégradé de lueur : de l'offset « from » jusqu'au bord, l'opacité décroît en cloche (gaussienne, raideur k)
// au lieu d'une ligne droite, comme une vraie lumière qui se diffuse : ni bord visible, ni paliers sur fond noir. La teinte
// glisse en même temps du cœur (cols[0], plus clair) vers le bord (dernière couleur, plus profonde).
function glowStops(from,peak,cols,k=5,n=10){
  const C=cols.map(c=>[1,3,5].map(j=>parseInt(c.slice(j,j+2),16)));
  const mix=u=>{const t=u*(C.length-1),a=Math.min(C.length-2,Math.floor(t)),f=t-a;return '#'+C[a].map((v,j)=>Math.round(v+(C[a+1][j]-v)*f).toString(16).padStart(2,'0')).join('')};
  let h='';for(let i=0;i<=n;i++){const u=i/n,o=i===n?0:peak*Math.exp(-k*u*u);
    h+=`<stop offset="${(from+(1-from)*u).toFixed(3)}" stop-color="${mix(u)}" stop-opacity="${o.toFixed(3)}"/>`}
  return h}
function textWidth(s,weight=500,family=getComputedStyle(document.body).fontFamily,size=12){const c=measureCtx||(measureCtx=document.createElement('canvas').getContext('2d'));
  c.font=`${weight} ${size}px ${family}`;return c.measureText(s).width}
// ---------- Planètes : faites comme la planète Twitch ----------
// Chaque planète est faite comme la planète Twitch : une sphère en facettes (la même découpe pour toutes, PL_FACETS), en
// cinq tons de la couleur de la chaîne, plus claire du côté de la lumière ; et posée dessus, comme le logo sur la planète
// Twitch, la planète peinte de la chaîne (lib/planet.ts : motif propre à son nom, initiale, anneau des chaînes les plus
// fortes), la même que partout ailleurs. Le moteur tourne les facettes et le reflet vers la vraie source de lumière
// (son étoile, ou la planète Twitch) à chaque image ; la planète peinte reste droite.
const plRng=seed=>()=>{seed=(seed+0x6d2b79f5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296};
const plN=v=>+v.toFixed(3);
const plMix=(a,b,t)=>{const A=[1,3,5].map(i=>parseInt(a.slice(i,i+2),16)),B=[1,3,5].map(i=>parseInt(b.slice(i,i+2),16));return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('')};
// Triangles d'une sphère vue de face (rayon 1) : anneaux de points (NR anneaux régulièrement espacés sur la sphère, donc
// serrés vers le bord à l'écran ; step points de plus à chaque anneau, un peu décalés au hasard), reliés en triangles :
// environ step × NR² facettes. Graine fixe : toujours les mêmes facettes.
function sphereTris(seed,NR,step=6){
  const TAU=2*Math.PI,rs=plRng(seed),rings=[[{x:0,y:0}]],out=[];
  for(let i=1;i<=NR;i++){const a=i/NR*Math.PI/2,m=step*i,ring=[];
    for(let k=0;k<m;k++){const t=(k+.5*(i%2)+(rs()-.5)*.35)/m*TAU,aa=i===NR?a:a+(rs()-.5)*.12,rho=Math.sin(aa)*(i===NR?1.04:1);ring.push({x:Math.cos(t)*rho,y:Math.sin(t)*rho})}
    rings.push(ring)}
  for(let i=1;i<rings.length;i++){const P=rings[i-1],Q=rings[i],na=P.length,nb=Q.length;let a=0,b=0;
    while(a<na||b<nb){let tri;
      if(b<nb&&(a>=na||(b+1)/nb<=(a+1)/na)){tri=[P[a%na],Q[b%nb],Q[(b+1)%nb]];b++}else{tri=[P[a%na],Q[b%nb],P[(a+1)%na]];a++}
      if(tri[0]!==tri[2])out.push(tri)}}
  return out}
// Facettes regroupées par ton (de l'ombre à la lumière) pour une lumière venant de la droite, un peu devant : un chemin
// par ton, le même pour toutes les planètes (défini une fois dans PLANET_DEFS, repris par <use> avec les couleurs de la
// chaîne). Facettes de la découpe commune des planètes, ombrées selon cette lumière.
const PL_TONE_PATHS=(()=>{const L=[.62,0,.78],Ln=Math.hypot(...L),P=['','','','',''];
  for(const t of sphereTris(0xfa0e7,5,8)){const x=(t[0].x+t[1].x+t[2].x)/3,y=(t[0].y+t[1].y+t[2].y)/3,z=Math.sqrt(Math.max(0,1-x*x-y*y)),l=Math.max(0,(x*L[0]+y*L[1]+z*L[2])/Ln);
    P[Math.min(4,Math.floor(l*5.2))]+='M'+t.map(p=>plN(p.x)+' '+plN(p.y)).join('L')+'Z'}
  return P})();
// Cinq tons d'une couleur, comme les violets de la planète Twitch : trois plus sombres, la couleur, une plus claire
const planetTones=col=>[plMix(col,'#05030f',.68),plMix(col,'#05030f',.45),plMix(col,'#05030f',.22),col,plMix(col,'#ffffff',.35)];
const PLANET_DEFS=PL_TONE_PATHS.map((d,k)=>`<path id="plt${k}" d="${d}" stroke-width=".012" stroke-linejoin="round"/>`).join(''); // facettes communes, par ton
// La planète d'une chaîne, pour un rayon 1 (placée, mise à l'échelle et éclairée par le moteur à chaque image).
// col : sa couleur (colorOf, la même que pour les autres surfaces : planetColor(c, colorOf(c)) en donne la même valeur).
// La planète peinte est du HTML (window.planetInner) : un foreignObject de 100 × 100 réduit à .0132 pour couvrir un
// rayon de .66, comme l'ancien médaillon. Il ne reçoit aucun clic (le rond .h et les facettes les prennent).
function planetSvg(c,col){const T=planetTones(col);
  return `<g class="pl"><g class="fac">${T.map((t,k)=>`<use href="#plt${k}" fill="${t}" stroke="${t}"/>`).join('')}</g>` // facettes, tournées vers la lumière
    +`<g class="glo"><ellipse cx=".55" cy="0" rx=".1" ry=".2" fill="#fff" fill-opacity=".75"/></g>` // reflet, tourné vers la lumière
    +`<g transform="translate(-.66 -.66) scale(.0132)"><foreignObject class="pfo" width="100" height="100"><span class="planet" aria-hidden="true" style="--c:${col};--s:100px">${window.planetInner?window.planetInner(c,ringOf(c)):''}</span></foreignObject></g></g>`}
// Planète Twitch en globe low-poly : icosphère de 320 facettes en cinq violets (rayon 1), posée dans l'univers. Elle est
// éclairée d'en haut à gauche et de face (TW_L, vue de départ), avec une faible lumière d'appoint de l'autre côté (TW_FL)
// pour que sa face cachée garde ses facettes. L'éclairage est fixe dans l'univers : quand on fait tourner le globe, on la
// voit sous tous les angles, sa face éclairée puis sa face dans l'ombre (dessin : twDraw, dans renderMap).
const TW_L=(v=>{const l=Math.hypot(...v);return v.map(x=>x/l)})([-.5,-.62,.6]);
const TW_MESH=(()=>{const t=(1+Math.sqrt(5))/2,nz=v=>{const l=Math.hypot(...v);return v.map(x=>x/l)},dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const V=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(nz);
  const F0=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  const mid=(a,b)=>nz(a.map((x,i)=>x+b[i])),F=[],tones=['#2a0f66','#4c1d95','#6d28d9','#9146ff','#b794ff'],FL=nz([.5,.55,-.67]);
  let T=F0.map(f=>f.map(i=>V[i])); // deux découpes : 320 facettes, contour bien rond
  for(let k=0;k<2;k++)T=T.flatMap(([A,B,C])=>{const ab=mid(A,B),bc=mid(B,C),ca=mid(C,A);return [[A,ab,ca],[ab,B,bc],[ca,bc,C],[ab,bc,ca]]});F.push(...T);
  return F.map(v=>{const n=nz(v.reduce((s,p)=>s.map((x,i)=>x+p[i]),[0,0,0])),l=Math.min(1,.12+.88*Math.max(0,dot(n,TW_L))+.28*Math.max(0,dot(n,FL)));
    return {v,n,col:tones[Math.min(4,Math.floor(l*5))]}})})();
function renderMap(q){
  lastMap=Date.now();hideTip();cancelAnimationFrame(radarRaf);radarRaf=0;$('t-map').innerHTML='';
  // Vues : « Toutes les chaînes » (vue principale : toutes les chaînes suivies qui ont au moins un viewer actif sur la
  // période, sans groupes, liens d'une seule couleur) ; « Groupes » (chaînes d'au moins 5 viewers actifs, une couleur par
  // groupe détecté) ; « Ma sélection » (seulement les chaînes cochées, quelle que soit la langue choisie).
  // la vue choisie est gardée d'une visite à l'autre ; mais « Ma sélection » sans au moins 2 chaînes encore suivies ouvrait une carte
  // vide (critique du 25/11/2026) : à l'ouverture, on revient alors à « Toutes ». Un clic volontaire sur « Ma sélection » n'est pas touché.
  if(!mapViewChecked){mapViewChecked=true;if(cfg.mapMode==='sel'&&(cfg.mapSel||[]).filter(c=>cfg.chans.includes(c)).length<2){cfg.mapMode='all';saveCfg()}}
  const view=['all','groups','sel'].includes(cfg.mapMode)?cfg.mapMode:'all',grouped=view==='groups',picked=new Set(cfg.mapSel||[]);
  // Filtre « En live » : seulement les chaînes en live en ce moment (combinable avec chaque vue)
  const liveOnly=!!cfg.mapLive,isLive=c=>!!(info[c]&&info[c].live);
  const by=usersBy(q.pres,p=>p.c),pool=view==='sel'?cfg.chans.filter(c=>picked.has(c)):shown();
  const activeAll0=pool.filter(c=>by.get(c)&&by.get(c).size>=(grouped?5:1));
  // Filtre « Audience minimale » : seuil sur les viewers actifs de la période. On ne propose que les seuils qui laissent au moins 3 chaînes
  // (une carte en demande 3) et qui en écartent vraiment ; le seuil choisi reste affiché même s'il ne convient plus, pour pouvoir le quitter.
  const minSel=[10,50,200].includes(cfg.mapMin)?cfg.mapMin:0,minN=t=>activeAll0.filter(c=>by.get(c).size>=t).length;
  const minsPanel=[10,50,200].filter(t=>t===minSel||(minN(t)>=3&&minN(t)<activeAll0.length));
  const activeAll=activeAll0.filter(c=>by.get(c).size>=minSel);
  // Filtre « Jeu principal » : le jeu le plus relevé de chaque chaîne sur la période (relevés en live). On propose les 8 jeux les plus
  // présents parmi les chaînes affichées ; un jeu qui n'existe plus sur la période (période changée) revient à « Tous » sans effacer le choix.
  const gc=new Map();for(const s of q.snaps||[]){if(!s.live||!s.g)continue;const m=gc.get(s.c)||new Map();m.set(s.g,(m.get(s.g)||0)+1);gc.set(s.c,m)}
  const mainGame=new Map([...gc].map(([c,m])=>[c,[...m].sort((a,b)=>b[1]-a[1])[0][0]]));
  const gameN=new Map();for(const c of activeAll){const g=mainGame.get(c);if(g)gameN.set(g,(gameN.get(g)||0)+1)}
  const gamesTop=[...gameN].sort((a,b)=>b[1]-a[1]).slice(0,8),gameSel=gameN.has(cfg.mapGame)?cfg.mapGame:'*';
  const gamesPanel=gameN.size>1?[{key:'*',label:'Tous',count:activeAll.length,on:gameSel==='*'},...(gamesTop.some(([g])=>g===gameSel)||gameSel==='*'?gamesTop:[...gamesTop,[gameSel,gameN.get(gameSel)]]).map(([g,n])=>({key:g,label:g,count:n,on:g===gameSel}))]:null;
  const active=activeAll.filter(c=>gameSel==='*'||mainGame.get(c)===gameSel),liveN=active.filter(isLive).length;
  const nodes=active.filter(c=>!liveOnly||isLive(c)).map(c=>({id:c,size:by.get(c).size}));
  // ---------- menu de gauche (React) : période, langue, vue, chaînes cochées, recherche, groupes ----------
  // les effectifs par langue comptent les chaînes qui ont des viewers actifs sur la période (ce que la carte peut montrer), pas toutes les chaînes suivies
  const lg=cfg.lang||'*',nl=k=>cfg.chans.filter(c=>inLang(c,k)&&by.get(c)&&by.get(c).size>=(grouped?5:1)).length,known=cfg.chans.some(c=>langOf(c));
  const panel={open:mapSideOpen(),view,picked:picked.size,live:{on:liveOnly,count:liveN,total:active.length},
    mins:minsPanel.length?[{key:'0',label:'Toutes',count:activeAll0.length,on:minSel===0},...minsPanel.map(t=>({key:String(t),label:t+'+',count:minN(t),on:t===minSel}))]:null,
    periods:[...$('period').children].map(b=>({key:b.dataset.p,label:b.textContent,on:b.classList.contains('on')})),
    langs:known?LANGS.filter(([k])=>k==='*'||k===lg||nl(k)).map(([k,label])=>({key:k,label,count:nl(k),on:k===lg})):null,
    games:gamesPanel,
    pick:view==='sel'?[...cfg.chans].sort((a,b)=>a.localeCompare(b)).map(c=>({...who(c),langs:langsOf(c),n:by.get(c)?by.get(c).size:0,on:picked.has(c)})):null,
    pins:Object.keys(cfg.mapPins||{}).length,empty:'',find:[],groups:null,solo:[],mount:null};
  const send=()=>window.dispatchEvent(new CustomEvent('legacy:map',{detail:panel}));
  // pas assez de chaînes, même sans le filtre « En live » : ce message d'abord (ex. « Ma sélection » sans chaîne cochée),
  // sinon c'est le filtre « En live » qui en laisse trop peu
  const need=view==='sel'?2:3;
  if(active.length<need){panel.empty=(gameSel!=='*'||minSel>0)&&activeAll0.length>=need?`Les filtres Jeu principal et Audience minimale ne laissent que ${active.length} chaîne${active.length>1?'s':''} : il en faut au moins ${need} pour une carte. Élargis-les dans le Menu, ou réinitialise les filtres.`
      :view==='sel'?(picked.size?'Parmi les chaînes cochées, il en faut au moins 2 avec un viewer actif sur la période.':'Coche au moins 2 chaînes dans le Menu (rubrique « Vue », puis « Ma sélection ») pour les voir seules sur la carte.')
      :grouped?'Il faut au moins 3 chaînes avec 5 viewers actifs ou plus sur la période. Le plus parlant : suivre 20 à 50 chaînes (onglet Par jeu → « Suivre le top 20 ») et laisser tourner plusieurs soirées.'
      :'Il faut au moins 3 chaînes avec un viewer actif sur la période.';send();return}
  if(nodes.length<need){panel.empty=liveN?`Seulement ${liveN} chaîne${liveN>1?'s':''} en live avec un viewer actif sur la période : il en faut au moins ${need} pour une carte. Choisis « Toutes » dans Statut pour voir aussi les chaînes hors live.`
      :"Aucune chaîne de cette vue n'est en live en ce moment (avec un viewer actif sur la période). Choisis « Toutes » dans Statut pour voir aussi les chaînes hors live.";send();return}
  const all=[];for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const A=by.get(nodes[i].id),B=by.get(nodes[j].id),s=sharedCount(A,B);if(s>=2)all.push({a:nodes[i].id,b:nodes[j].id,n:s,j:s/(A.size+B.size-s)})}
  const perNode=view==='sel'?6:4; // liens gardés par chaîne : les plus forts (un peu plus quand on a choisi peu de chaînes)
  const keep=new Set();for(const nd of nodes)all.filter(e=>e.a===nd.id||e.b===nd.id).sort((x,y)=>y.j-x.j).slice(0,perNode).forEach(e=>keep.add(e));
  const edges=[...keep],lab=communities(nodes,edges);
  const groups=new Map();for(const nd of nodes){const l=lab.get(nd.id);if(!groups.has(l))groups.set(l,[]);groups.get(l).push(nd)}
  const gl=[...groups.values()].map(m=>m.sort((a,b)=>b.size-a.size)).sort((a,b)=>b.reduce((s,x)=>s+x.size,0)-a.reduce((s,x)=>s+x.size,0));
  // hors de la vue Groupes, les groupes servent seulement à ranger la carte : une seule couleur pour les ronds et pour les liens
  const gcol=new Map(),gnum=new Map();gl.forEach((m,i)=>m.forEach(nd=>{gcol.set(nd.id,!grouped?MAP_COL:m.length>1&&i<8?PAL[i]:OTHER);gnum.set(nd.id,m.length>1?i+1:0)}));
  const lcol=c=>grouped?gcol.get(c):MAP_LINK;
  const n=nodes.length,ids=nodes.map(nd=>nd.id),idx=new Map(ids.map((c,i)=>[c,i]));
  const nb=ids.map(()=>new Set());for(const e of edges){nb[idx.get(e.a)].add(e.b);nb[idx.get(e.b)].add(e.a)} // voisins = liens tracés
  // passages mesurés sur la période (même règle que l'onglet Flux : quelqu'un écrit chez A, puis chez B moins de 3 h après)
  const pass=new Map();for(const f of flowsOf(q.pres).flows)if(idx.has(f.a)&&idx.has(f.b))pass.set(f.a+'>'+f.b,f.n);
  const passN=(a,b)=>pass.get(a+'>'+b)||0;
  // sens dominant d'un trait (1 : de a vers b, −1 : de b vers a, 0 : aucun) : au moins 10 passages, dont 60 % dans un sens
  const EDIR=edges.map(e=>{const ab=passN(e.a,e.b),ba=passN(e.b,e.a),t=ab+ba;return t>=10&&Math.max(ab,ba)/t>=.6?(ab>ba?1:-1):0});
  if(!grouped){mapView.grp=null;mapView.grpId=null}
  else{ // le groupe mis en avant est celui qui contient toujours la même chaîne, quel que soit son nouveau numéro
    const g=mapView.grpId==null?-1:gl.findIndex(m=>m.length>1&&m.some(x=>x.id===mapView.grpId));
    mapView.grp=g<0?null:g;if(g<0)mapView.grpId=null}
  if(mapView.sel&&!idx.has(mapView.sel))mapView.sel=null;

  panel.find=[...ids].sort();
  if(grouped){panel.groups=gl.map((m,i)=>m.length<2?null:{i,color:i<8?PAL[i]:OTHER,members:m.map(nd=>who(nd.id)),viewers:new Set(m.flatMap(nd=>[...by.get(nd.id)])).size}).filter(Boolean);
    panel.solo=gl.filter(m=>m.length<2).flat().map(nd=>who(nd.id))}
  // ---------- la carte : dessinée par ce moteur dans les éléments fournis par React (els : stage, radar, box) ----------
  // React appelle mount(els) une fois la page en place ; le moteur lui renvoie ses commandes (api) et le prévient par
  // els.notify({info, pins, grp}) quand la chaîne choisie ou le groupe mis en avant changent.
  panel.mount=els=>{const notify=els.notify;let lastHidden=null;
  // ---------- positions de base (zoom 1), en pixels du cadre ----------
  // le cadre fait toute la place laissée par le menu, sur toute la hauteur de la fenêtre
  const {box,stage}=els,W=Math.max(box.clientWidth||900,300),H=Math.max(stage.clientHeight||600,360);
  // Taille d'une icône = viewers actifs sur la période (racine, par rapport à la chaîne qui en a le plus sur la carte : la même
  // mesure que l'étoile), dans un écart resserré pour que les planètes restent harmonieuses entre elles : de 15 à 24 px.
  // Le live ne change plus la taille : il reste dans la fiche.
  const rScale=Math.max(Math.min(1,W/900),.7),liveV=c=>{const I=info[c];return I&&I.live?Math.max(0,+I.v||0):0};
  const liveR=()=>{const actV=c=>{const S=by.get(c);return S?S.size:0},mv=Math.max(1,...ids.map(actV));return ids.map(c=>{const v=actV(c);return (v?15+9*Math.sqrt(v/mv):11)*rScale})};
  const R=liveR();
  const LW=ids.map(c=>textWidth(c)),LWb=ids.map(c=>textWidth(c,600)); // largeur des noms (normal, gras)
  const B=layoutMap(nodes,edges,gl,R,LW,W,H,mapRelayout,view);mapRelayout=false;
  const spread=(fixed=[])=>{for(let it=0;it<80;it++){let moved=false; // deux ronds ne se recouvrent jamais (fixed : ronds à ne pas bouger)
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){if(fixed[i]&&fixed[j])continue;const dx=B[j].x-B[i].x,dy=B[j].y-B[i].y,d=Math.hypot(dx,dy)||.01,m=R[i]+R[j]+16;
      if(d<m){const f=(m-d)/d,wi=fixed[i]?0:fixed[j]?1:.5,wj=1-wi;B[i].x-=dx*f*wi;B[i].y-=dy*f*wi;B[j].x+=dx*f*wj;B[j].y+=dy*f*wj;moved=true}}
    for(let i=0;i<n;i++){if(fixed[i])continue;const dx=B[i].x-W/2,dy=B[i].y-H/2,d=Math.hypot(dx,dy)||.01,m=R[i]+mapLogo(W)/2+10; // un rond ne touche pas la planète Twitch du centre
      if(d<m){B[i].x=W/2+dx/d*m;B[i].y=H/2+dy/d*m;moved=true}}
    if(!moved)break}};
  spread();
  // chaînes déplacées à la main (clic droit) : leur place est gardée dans ce navigateur, en fraction du cadre ;
  // les autres s'écartent si besoin, les chaînes déplacées ne bougent pas
  const pins=cfg.mapPins||{},fixed=ids.map(c=>!!pins[c]);
  if(fixed.some(Boolean)){ids.forEach((c,i)=>{if(pins[c])B[i]={x:pins[c].x*W,y:pins[c].y*H}});spread(fixed)}
  // ---------- systèmes planétaires ----------
  // Chaque groupe de chaînes qui partagent leurs viewers actifs devient un système solaire. Son étoile : la chaîne qui a le
  // plus de viewers actifs (l'origine de la communauté). Les autres sont ses planètes : elles tournent autour d'elle sur des
  // orbites, de la plus proche (la plus grande part de ses viewers actifs vue aussi chez l'étoile) à la plus lointaine.
  // Des anneaux (autant de planètes que la circonférence en laisse passer) donnent la place que prend le système.
  // Les planètes tournent sur des cercles (KE = 0) : la distance à l'étoile ne varie pas, c'est elle qui dit la part
  // partagée. Le tour dure d'autant moins que l'orbite est petite (durée ∝ rayon^1,5 : 2 min pour 60 px, loi de Képler)
  // et que l'étoile a de viewers actifs (sa masse, comparée aux autres étoiles de la carte), jamais moins de 45 s. La
  // régularité du partage d'un jour à l'autre (KI) n'allonge plus l'orbite : la fiche la dit en mots. Les chaînes sans
  // groupe restent seules. (KE, KW et kepE restent en place : une ellipse se remettrait en changeant KE.)
  // sysOf[i] : numéro du système de la chaîne i (−1 : seule) ; RR : demi-grand axe de son ellipse, TH : angle de
  // départ ; KE, KW, NM : allongement de l'ellipse, son orientation, vitesse angulaire moyenne (rad/s) ;
  // KI : irrégularité de la part partagée (0 stable, 1 très variable ; NaN : pas assez de jours pour la mesurer).
  const sysOf=new Int16Array(n).fill(-1),RR=new Float32Array(n),TH=new Float32Array(n),isStar=new Uint8Array(n),SYS=[];
  const KE=new Float32Array(n),KW=new Float32Array(n),NM=new Float32Array(n),KI=new Float32Array(n).fill(NaN);
  // empreinte d'un nom : sert à tirer l'orientation d'une ellipse, toujours la même pour une chaîne
  const hash=s=>{let h=2166136261;for(const ch of s)h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0};
  // viewers actifs de chaque chaîne, jour par jour (pour la régularité du partage)
  let dayU=null;const daily=()=>{if(dayU)return dayU;dayU=new Map();
    for(const p of q.pres){let m=dayU.get(p.c);if(!m)dayU.set(p.c,m=new Map());let s=m.get(p.d);if(!s)m.set(p.d,s=new Set());s.add(p.u)}return dayU};
  // irrégularité de la part des viewers actifs de la planète i qu'on voit aussi chez l'étoile s, d'un jour à l'autre :
  // écart type rapporté à la moyenne, sur les jours où la planète a au moins 5 viewers actifs (il en faut au moins 2)
  const irregular=(i,s)=>{const P=daily().get(ids[i]),S=daily().get(ids[s]),sh=[];if(!P)return NaN;
    for(const [d,u] of P){if(u.size<5)continue;const su=S&&S.get(d);sh.push(su?sharedCount(u,su)/u.size:0)}
    if(sh.length<2)return NaN;const mu=sh.reduce((a,b)=>a+b,0)/sh.length,sd=Math.sqrt(sh.reduce((a,b)=>a+(b-mu)**2,0)/sh.length);return mu>0?Math.min(1,sd/mu):1};
  const kepE=(M,e)=>{M=((M+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;let E=M+e*Math.sin(M);for(let k=0;k<5;k++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));return E}; // équation de Képler
  for(const m of gl){if(m.length<2)continue;
    const I=m.map(nd=>idx.get(nd.id)),s=I.reduce((a,b)=>by.get(ids[b]).size>by.get(ids[a]).size?b:a),A=by.get(ids[s]);
    const pl=I.filter(i=>i!==s).map(i=>({i,share:sharedCount(by.get(ids[i]),A)/by.get(ids[i]).size})).sort((a,b)=>b.share-a.share);
    const Rm=Math.max(...pl.map(p=>R[p.i]));let r=R[s]+14+Rm,k=0;const rings=[];
    while(k<pl.length){const cap=Math.max(1,Math.floor(2*Math.PI*r/(2*Rm+16)));rings.push({r,m:pl.slice(k,k+cap).map(p=>p.i)});k+=cap;r+=2*Rm+14}
    SYS.push({s,Rm,rings});isStar[s]=1}
  // Trop de place au total pour le cadre : les anneaux se resserrent (les icônes gardent leur taille)
  const sysR=S=>S.rings[S.rings.length-1].r+S.Rm+8;
  const inSys=new Set(SYS.flatMap(S=>[S.s,...S.rings.flatMap(g=>g.m)]));
  const area=SYS.reduce((a,S)=>a+Math.PI*sysR(S)**2,0)+ids.reduce((a,c,i)=>a+(inSys.has(i)?0:Math.PI*(R[i]+10)**2),0);
  const squeeze=Math.min(1,Math.sqrt(.42*W*H/(area||1)));
  // masse d'une étoile = ses viewers actifs, comparés à la moyenne (géométrique) des étoiles de la carte ; la vitesse suit
  // la racine de la masse (Képler), bornée pour que les systèmes restent lisibles
  const mRef=SYS.length?Math.exp(SYS.reduce((a,S)=>a+Math.log(by.get(ids[S.s]).size),0)/SYS.length):1;
  // Chaque planète a sa propre distance (demi-grand axe), de la plus liée à l'étoile (au plus près) à la moins liée,
  // réparties dans la place que prenaient les anneaux (un peu plus large pour un système d'un seul anneau) : la plus proche
  // tourne plus vite (Képler). Deux voisines finissent par se doubler : elles s'écartent un peu en se croisant.
  SYS.forEach((S,si)=>{const s=S.s;sysOf[s]=si;const mf=Math.min(1.4,Math.max(.7,Math.sqrt(by.get(ids[s]).size/mRef))),gap=(2*S.Rm+14)*squeeze;
    S.rings.forEach(g=>{g.r=R[s]+(g.r-R[s])*squeeze});
    const pl=S.rings.flatMap(g=>g.m),N=pl.length,r0=S.rings[0].r,rL=S.rings[S.rings.length-1].r,span=S.rings.length>1?rL-r0:N>1?S.Rm*1.2*squeeze:0;
    // départ : la plus liée là où la disposition l'avait mise, les suivantes décalées de l'angle d'or (137,5°), pour que
    // deux planètes de distances voisines partent loin l'une de l'autre
    const a0=Math.atan2(B[pl[0]].y-B[s].y,B[pl[0]].x-B[s].x);let ext=0;
    pl.forEach((i,k)=>{const a=r0+span*(N>1?k/(N-1):0);sysOf[i]=si;RR[i]=a;TH[i]=a0+k*2.39996;
      NM[i]=2*Math.PI/Math.max(45,120*Math.pow(a/60,1.5)/mf);
      KI[i]=irregular(i,s);KW[i]=hash(ids[i]+'~')/4294967296*2*Math.PI;
      // orbite circulaire : une ellipse faisait varier la distance à l'étoile d'un instant à l'autre, et c'est cette
      // distance qui dit la part partagée ; la régularité du partage (KI) est dite dans la fiche, plus dans la forme
      KE[i]=0;ext=Math.max(ext,a)});
    // planètes du système changées (ou nouvelles) : elles repartent de leurs places de départ (l'angle compte l'orientation
    // de l'ellipse, pour que ce soient leurs positions, et pas seulement leurs horloges, qui soient espacées) ; sinon elles
    // continuent là où elles en étaient
    const key=pl.map(i=>ids[i]).join(',');
    if(mapRing.get(ids[s])!==key||pl.some(i=>!mapKep.has(ids[i]))){mapRing.set(ids[s],key);pl.forEach(i=>mapKep.set(ids[i],TH[i]-KW[i]))}
    S.R=Math.max(sysR(S),ext+S.Rm+8)});
  // Les systèmes (et les chaînes seules) s'écartent les uns des autres, du logo et des bords ; ceux qu'on a placés à la
  // main (épinglés) ne bougent pas.
  {const bodies=[...SYS.map(S=>({i:S.s,R:S.R})),...ids.map((c,i)=>i).filter(i=>sysOf[i]<0).map(i=>({i,R:R[i]+10}))],LG=mapLogo(W)/2+10;
    for(let it=0;it<160;it++){let moved=false;
      for(let a=0;a<bodies.length;a++)for(let b=a+1;b<bodies.length;b++){const p=B[bodies[a].i],q=B[bodies[b].i],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy)||.01,m=bodies[a].R+bodies[b].R+8;
        if(d<m){const fa=fixed[bodies[a].i],fb=fixed[bodies[b].i];if(fa&&fb)continue;const f=(m-d)/d*.5,wa=fa?0:fb?2:1,wb=fb?0:fa?2:1;p.x-=dx*f*wa;p.y-=dy*f*wa;q.x+=dx*f*wb;q.y+=dy*f*wb;moved=true}}
      for(const o of bodies){if(fixed[o.i])continue;const p=B[o.i],dx=p.x-W/2,dy=p.y-H/2,d=Math.hypot(dx,dy)||.01,m=o.R+LG;
        if(d<m){p.x=W/2+dx/d*m;p.y=H/2+dy/d*m;moved=true}
        // dans l'ellipse du cadre où il tient en tournant autour du logo (la carte tourne d'un bloc, voir home)
        const u=(p.x-W/2)/(W/2),v=(p.y-H/2)/(H/2),r=Math.hypot(u,v),mx=Math.max(.15,1-(o.R+12)/(Math.min(W,H)/2));if(r>mx){p.x=W/2+u*mx/r*W/2;p.y=H/2+v*mx/r*H/2;moved=true}}
      if(!moved)break}}
  if(mapView.w!==W){mapView.k=1;mapView.tx=0;mapView.ty=0;mapView.rot=0;mapView.q=[1,0,0,0];mapView.w=W} // largeur changée : on repart de la vue d'ensemble
  // Le logo Twitch est le centre de la carte (CX,CY dans la carte de base) : il suit le zoom et le déplacement, et toute la
  // carte tourne autour de lui. Il est à l'écran en logoAt() = (tx + k·CX, ty + k·CY) ; un point b de la carte est à
  // logoAt() + rotation(k·(b − centre)).
  const CX=W/2,CY=H/2;
  const rotV=(x,y,a)=>{const c=Math.cos(a),s=Math.sin(a);return {x:x*c-y*s,y:x*s+y*c}}; // un vecteur (déplacement), sans pivot
  const logoAt=()=>({x:mapView.tx+mapView.k*CX,y:mapView.ty+mapView.k*CY});
  const toScreen=b=>{const L=logoAt(),v=rotV(mapView.k*(b.x-CX),mapView.k*(b.y-CY),mapView.rot);return {x:L.x+v.x,y:L.y+v.y}};
  const toBase=p=>{const L=logoAt(),v=rotV(p.x-L.x,p.y-L.y,-mapView.rot);return {x:CX+v.x/mapView.k,y:CY+v.y/mapView.k}};
  // déplacement (tx,ty) qui met le point b de la carte à l'écran en (sx,sy), avec le zoom k et la rotation rot
  const txFor=(b,sx,sy,k,rot=mapView.rot)=>{const v=rotV(k*(b.x-CX),k*(b.y-CY),rot);return {tx:sx-v.x-k*CX,ty:sy-v.y-k*CY}};
  // Univers en 3D, centré sur la planète Twitch. Repère « normalisé » : x et y de −1 à 1 d'un bord du cadre à l'autre,
  // z vers soi (devant). Pour que les mouvements se lisent d'un coup d'œil, tout tourne dans UN seul plan, celui de la
  // galaxie, et dans le même sens (inverse des aiguilles d'une montre) : les systèmes (et chaînes seules) autour de
  // Twitch, les planètes autour de leur étoile. Ce plan est un peu incliné vers soi (TILT) : le bas de la carte est un peu
  // plus près (icônes un peu plus grandes), le haut un peu plus loin ; rien ne passe devant ni derrière Twitch, aucun
  // chemin n'en coupe un autre. Les systèmes sont rangés en ceintures autour de Twitch (voir lanes) : chaque ceinture
  // tourne d'un bloc, celles du centre plus vite que celles du bord (comme les étoiles d'une galaxie, voir omegaOf).
  // L'univers entier tourne ensuite comme on l'a tourné à la main (mapView.q, quaternion), puis il est vu en perspective
  // (PERS) : ce qui est devant est un peu plus grand et plus écarté du centre, ce qui est derrière plus petit et plus pâle.
  // off[i] : petit écart quand deux icônes se croisent ; sof[i] : écart d'un système entier (ou d'une chaîne seule) quand
  // deux systèmes se croisent. Pos(i) = où elle est vue dans la carte de base ;
  // DZ[i] = sa profondeur (−1 au fond, 1 devant) ; DP[i] = son grossissement de perspective.
  const qMul=(a,b)=>[a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]];
  const qNorm=q=>{const l=Math.hypot(...q)||1;return q.map(x=>x/l)},qConj=q=>[q[0],-q[1],-q[2],-q[3]];
  const qRot=(q,v)=>{const [w,x,y,z]=q,tx=2*(y*v[2]-z*v[1]),ty=2*(z*v[0]-x*v[2]),tz=2*(x*v[1]-y*v[0]);
    return [v[0]+w*tx+y*tz-z*ty,v[1]+w*ty+z*tx-x*tz,v[2]+w*tz+x*ty-y*tx]};
  const qSlerp=(a,b,t)=>{let d=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];if(d<0){b=b.map(x=>-x);d=-d}
    if(d>.9995)return qNorm(a.map((x,i)=>x+(b[i]-x)*t));const th=Math.acos(d),s=Math.sin(th),wa=Math.sin((1-t)*th)/s,wb=Math.sin(t*th)/s;return a.map((x,i)=>x*wa+b[i]*wb)};
  if(!mapView.q)mapView.q=[1,0,0,0];
  const keep=(M,c)=>{let o=M.get(c);if(!o)M.set(c,o={x:0,y:0});return o};
  const off=ids.map(c=>keep(mapOff,c)),sof=ids.map(c=>keep(mapSysOff,c)); // modifiés sur place (Object.assign), jamais remplacés
  const DZ=new Float32Array(n),DP=new Float32Array(n).fill(1),PERS=.3;
  const planet=i=>sysOf[i]>=0&&!isStar[i],starOf=i=>SYS[sysOf[i]].s;
  // angle parcouru autour de Twitch par un système ou une chaîne seule (une nouvelle venue part de sa place)
  const angOf=i=>{const a=mapAng.get(ids[i]);return a==null?0:a};
  // Vitesse de rotation autour de Twitch, selon la distance r au centre (repère normalisé) : celle d'une galaxie dont la
  // vitesse en pixels par seconde monte vite au cœur puis reste presque la même jusqu'au bord ; un tour en 8 min à mi-chemin
  // du bord (r = 0,6), environ 4 min tout près du centre et 12 min au bord. Le cœur (RCORE) est large : les écarts de
  // vitesse restent doux, les systèmes se doublent lentement.
  const RCORE=.25,vfl=r=>r/Math.sqrt(r*r+RCORE*RCORE),omegaOf=r=>{r=Math.max(r,.05);return 2*Math.PI/480*(vfl(r)/r)/(vfl(.6)/.6)};
  // Plan de la galaxie : incliné de TILT autour de l'axe horizontal (le bas vient vers soi). Un point (u, v) du plan est en
  // (u, v·cos, v·sin) dans le repère normalisé.
  const TILT=16*Math.PI/180,cT=Math.cos(TILT),sT=Math.sin(TILT);
  // Place de départ, ramenée dans la plus grande ellipse du cadre où le système (ou la chaîne seule) tient en tournant
  // (un peu en retrait : vu de près, le bas du plan grossit un peu).
  const bodyR=i=>sysOf[i]>=0?SYS[sysOf[i]].R:R[i]+6;
  const home=i=>{const b=B[i];let u=(b.x-CX)/(W/2),v=(b.y-CY)/(H/2);const r=Math.hypot(u,v),m=Math.max(.15,(1-(bodyR(i)+6)/(Math.min(W,H)/2))*.93);
    if(r>m){u*=m/r;v*=m/r}return {u,v}};
  // point de son orbite en ce moment (repère normalisé, avant la rotation à la main) : sa place, tournée de son angle dans le plan
  const body3=i=>{const {u,v}=home(i),a=angOf(i),c=Math.cos(a),s=Math.sin(a),y=v*c+u*s;return [u*c-v*s,y*cT,y*sT]};
  // planète : sur son ellipse autour de son étoile (un foyer), dans le plan de la galaxie (en pixels, ramené au repère
  // normalisé). L'ellipse ne tourne pas avec le système autour de Twitch : comme dans le ciel, elle garde son orientation.
  const sat3=i=>{const s=starOf(i),P=pt3(s),e=KE[i],a=RR[i],E=kepE(mapKep.get(ids[i])||0,e);
    const x=a*(Math.cos(E)-e),y=a*Math.sqrt(1-e*e)*Math.sin(E),cw=Math.cos(KW[i]),sw=Math.sin(KW[i]),X=(x*cw-y*sw)/(W/2),Y=(x*sw+y*cw)/(H/2);
    return [P[0]+X,P[1]+Y*cT,P[2]+Y*sT]};
  // Ceintures : on range les systèmes (et chaînes seules) selon leur distance à Twitch ; ceux dont les chemins se
  // recouvriraient (bandes de distance qui se chevauchent, taille du système comprise) forment une même ceinture, qui
  // tourne d'un bloc à la vitesse de sa distance moyenne : ils gardent leurs écarts et ne se rattrapent jamais. Deux
  // ceintures séparées tournent chacune à sa vitesse, sans jamais se toucher. Sur une carte chargée, tout peut former une
  // seule ceinture (rotation d'un bloc). laneW[i] : vitesse de la ceinture de i (rad/s).
  const BODY=ids.map((c,i)=>i).filter(i=>!planet(i)),laneW=new Float32Array(n);
  const lanes=()=>{const m2=Math.min(W,H)/2,L=BODY.map(i=>{const {u,v}=home(i),r=Math.hypot(u,v),hw=(bodyR(i)+6)*1.12/m2;return {i,r,lo:r-hw,hi:r+hw}}).sort((a,b)=>a.lo-b.lo);
    let cur=[],hi=-Infinity;const flush=()=>{if(!cur.length)return;const w=omegaOf(cur.reduce((t,x)=>t+x.r,0)/cur.length);cur.forEach(x=>{laneW[x.i]=w});cur=[]};
    for(const x of L){if(x.lo>hi)flush();cur.push(x);hi=Math.max(hi,x.hi)}flush()};
  lanes();
  // points calculés une fois par image (Pos est appelé très souvent) : pv change dès que le temps avance ou qu'une place change
  let pv=0,P3v=-1,drawnSig='';const P3=new Array(n); // drawnSig : l'état de la dernière image dessinée (voir la boucle : en pause, rien n'est repeint tant qu'il ne change pas)
  const pt3=i=>{if(P3v!==pv){P3v=pv;P3.fill(null)}return P3[i]||(P3[i]=planet(i)?sat3(i):body3(i))};
  // repère normalisé -> vu à l'écran (carte de base) : rotation à la main (q), puis perspective
  const ID=[1,0,0,0];
  const view3=(p,q=mapView.q)=>{const r=qRot(q,p),f=1/(1-PERS*r[2]);return {x:CX+r[0]*W/2*f,y:CY+r[1]*H/2*f,z:r[2],f}};
  // Les écarts (off : deux icônes qui se croisent ; sof : deux systèmes qui se croisent) sont mesurés en pixels sur la vue
  // « de face » (globe non tourné), puis posés dans le plan de la galaxie : ils font partie de l'univers. Quand on fait
  // tourner le globe ou la carte, seul le point de vue change : aucune planète ne bouge, les orbites continuent sans être
  // dérangées (des icônes peuvent alors se recouvrir à l'écran ou sortir du cadre, comme des objets vus sous un autre angle).
  const at3=i=>{const p=pt3(i),o=off[i],s=sof[planet(i)?starOf(i):i],x=(o.x+s.x)/(W/2),y=(o.y+s.y)/(H/2);return [p[0]+x,p[1]+y,p[2]+y*sT/cT]};
  const Pos=i=>{const p=view3(at3(i));DZ[i]=p.z;DP[i]=p.f;return {x:p.x,y:p.y}};
  // position vue de face : c'est là que les chaînes s'écartent les unes des autres, de Twitch et des bords du cadre
  const Can=i=>view3(at3(i),ID);
  // Inverse, pour le clic droit : la chaîne i (étoile ou seule) est posée au point t de la carte vue. On cherche le point
  // du plan de la galaxie, tourné comme on l'a tourné à la main, qui se voit en t (perspective comprise), puis sa place
  // de départ en défaisant l'angle qu'elle a parcouru autour de Twitch. Sa ceinture est recalculée.
  const place=(i,t)=>{const U=(t.x-CX)/(W/2),V=(t.y-CY)/(H/2),N=qRot(mapView.q,[0,-sT,cT]),nz=Math.abs(N[2])<.15?(N[2]<0?-.15:.15):N[2];
    const D=U*N[0]+V*N[1],f=1-PERS*D/nz,qx=U/f,qy=V/f,qz=-(qx*N[0]+qy*N[1])/nz,p=qRot(qConj(mapView.q),[qx,qy,qz]),pu=p[0],pv2=p[1]*cT+p[2]*sT,a=angOf(i),c=Math.cos(a),s=Math.sin(a);
    B[i]={x:CX+(pu*c+pv2*s)*W/2,y:CY+(-pu*s+pv2*c)*H/2};pins[ids[i]]=Object.assign(pins[ids[i]]||{},{f:1});lanes();pv++};

  // Au centre de l'univers, pivot de la rotation : la planète Twitch, globe en facettes (TW_MESH), halo doux, petit reflet
  // et le logo Twitch posé sur sa surface. Dessinée pour un rayon 1 ; placée et mise à l'échelle à chaque dessin (draw) :
  // elle suit la carte quand on la déplace ou la zoome, et tourne avec l'univers (twDraw). Elle est rangée parmi les
  // planètes selon la profondeur (z = 0).
  const twDefs='<radialGradient id="twh">'+glowStops(.45,.17,['#d6c2ff','#9146ff','#4c1d95'],6)+'</radialGradient>'
    // bord du globe : assombri vers le contour (le logo y est pris aussi, il épouse la sphère), puis un fin liseré de lumière
    +'<radialGradient id="twlimb"><stop offset=".62" stop-color="#1a063c" stop-opacity="0"/><stop offset=".9" stop-color="#1a063c" stop-opacity=".32"/><stop offset="1" stop-color="#1a063c" stop-opacity=".6"/></radialGradient>'
    +'<clipPath id="twclip"><circle r=".985"/></clipPath>'; // le logo ne dépasse jamais du globe, même tout près du bord
  const twG=`<g class="tw"><circle r="2.1" fill="url(#twh)"/><circle r=".995" fill="#2a0f66"/><g class="twf">`
    +TW_MESH.map(f=>`<path fill="${f.col}" stroke="${f.col}" stroke-width=".012" stroke-linejoin="round"/>`).join('')+'</g>'
    +`<g clip-path="url(#twclip)"><g class="twl"><g transform="scale(.05) translate(-11.5,-12)"><path class="tw-in" d="M6.857 1.714h13.714v9.429l-3.428 3.428h-3.429l-3 3v-3H6.857z"/>`
    +`<path class="tw-out" d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></g></g></g>`
    +`<circle r="1" fill="url(#twlimb)"/><ellipse class="twg" rx=".2" ry=".1" fill="#fff" fill-opacity=".75"/>`
    +`<circle r="1" fill="none" stroke="#d6c2ff" stroke-opacity=".38" stroke-width=".022"/></g>`;
  // ---------- éléments SVG, créés une fois puis déplacés à chaque zoom ----------
  const shareOf=e=>e.n/Math.max(1,Math.min(by.get(e.a).size,by.get(e.b).size)),wAbs=sh=>Math.min(1,sh/.5);
  box.innerHTML=`<svg viewBox="0 0 ${W} ${H}" height="${H}" tabindex="0" class="mapsvg" role="img" aria-label="Carte des chaînes selon leurs viewers actifs communs"><defs>`
    +PLANET_DEFS // facettes des planètes (communes à toutes)
    // liens : dégradé de la couleur d'une chaîne à celle de l'autre, et halo flou (un seul flou pour tous les halos)
    +edges.map((e,i)=>`<linearGradient id="mapg${i}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${lcol(e.a)}"/><stop offset="1" stop-color="${lcol(e.b)}"/></linearGradient>`).join('')
    +`<filter id="mapblur" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="4"/></filter>`
    // couronne des étoiles : lumière chaude qui déborde autour de l'icône et s'éteint en douceur
    +'<radialGradient id="mapsun">'+glowStops(.38,.24,['#fff3d1','#ffc46b','#f97316'],7.5)+'</radialGradient>'
    +'<radialGradient id="mapglow">'+glowStops(.35,.16,['#d8b4fe','#a855f7','#5b21b6'],5)+'</radialGradient>'
    +'<radialGradient id="mapdot"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#e6e1ff" stop-opacity="0"/></radialGradient>'
    +twDefs+'</defs>'
    +'<g class="meg" filter="url(#mapblur)">'+edges.map((e,i)=>`<path stroke="url(#mapg${i})"/>`).join('')+'</g>'
    +'<g class="mec" fill="none" stroke="#020202" stroke-width="1.2">'+edges.map(()=>'<path/>').join('')+'</g>'
    +'<g class="me">'+edges.map((e,i)=>`<path stroke="url(#mapg${i})"/>`).join('')+'</g>'
    +'<g class="mar" fill="none" stroke="'+MAP_LINK+'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><!-- chevrons directionnels supprimés --></g><g class="mel"></g><g class="mfx"></g><g class="mn">'+twG
    +nodes.map((nd,i)=>{const col=gcol.get(nd.id);return `<g data-n="${esc(nd.id)}" class="mapn${isStar[i]?' star':''}">${isStar[i]?'<circle class="sun" fill="url(#mapsun)"/><circle class="crown" fill="none" stroke="#ffc46b" stroke-width="1.6" stroke-opacity=".9"/>':'<circle class="glow" fill="url(#mapglow)"/>'}<circle class="ping" stroke="${col}" style="color:${col}"/><circle class="h"/>`
      +planetSvg(nd.id,colorOf(nd.id))+'</g>'}).join('')
    +'</g><g class="ml">'+ids.map(c=>`<g class="mlg" visibility="hidden"><rect class="lp"/><text class="mapl" text-anchor="middle">${esc(c)}</text></g>`).join('')+'</g><g class="mtop"></g></svg>';
  const svg=box.querySelector('svg'),lines=[...svg.querySelectorAll('.me path')],cases=[...svg.querySelectorAll('.mec path')],halos=[...svg.querySelectorAll('.meg path')],grads=edges.map((e,i)=>svg.querySelector('#mapg'+i)),G=[...svg.querySelectorAll('g.mapn')],T=[...svg.querySelectorAll('.ml text')],LG=[...svg.querySelectorAll('.ml .mlg')],LR=[...svg.querySelectorAll('.ml rect')],elab=svg.querySelector('.mel'),twEl=svg.querySelector('.tw'),arrows=[...svg.querySelectorAll('.mar path')];
  // planète Twitch : elle tourne avec l'univers (globe et rotation à plat). Seules les facettes tournées vers soi sont
  // tracées ; le reflet se pose là où la lumière se renvoie vers soi ; le logo est posé sur la surface, raccourci vers le
  // bord et caché de dos. Recalculée seulement quand la vue tourne.
  const twF=[...svg.querySelectorAll('.twf path')],twGloss=svg.querySelector('.twg'),twLogo=svg.querySelector('.twl');let twKey='';
  const twDraw=()=>{const q=mapView.q,c=Math.cos(mapView.rot),s=Math.sin(mapView.rot),key=q.join(',')+'|'+mapView.rot;if(key===twKey)return;twKey=key;
    const P=v=>{const r=qRot(q,v);return [r[0]*c-r[1]*s,r[0]*s+r[1]*c,r[2]]},n3=x=>x.toFixed(3);
    TW_MESH.forEach((f,k)=>{const el=twF[k];if(qRot(q,f.n)[2]<=0){if(el.dataset.h!=='1'){el.setAttribute('d','');el.dataset.h='1'}return}
      el.dataset.h='';el.setAttribute('d','M'+f.v.map(v=>{const p=P(v);return n3(p[0])+' '+n3(p[1])}).join('L')+'Z')});
    const L=P(TW_L),hz=L[2]+1,hl=Math.hypot(L[0],L[1],hz)||1,hx=L[0]/hl,hy=L[1]/hl,hzn=hz/hl; // reflet : là où la normale est à mi-chemin entre la lumière et soi
    setA(twGloss,{cx:n3(hx),cy:n3(hy),transform:`rotate(${(Math.atan2(hy,hx)*180/Math.PI+90).toFixed(1)} ${n3(hx)} ${n3(hy)})`,'fill-opacity':(.75*Math.max(0,Math.min(1,(L[2]+.2)/.6))*Math.min(1,hzn*1.4)).toFixed(3)});
    const A=P([0,0,1]),U=P([1,0,0]),V=P([0,1,0]);
    setA(twLogo,{transform:`matrix(${n3(U[0])} ${n3(U[1])} ${n3(V[0])} ${n3(V[1])} ${n3(A[0]*.98)} ${n3(A[1]*.98)})`,opacity:Math.max(0,Math.min(1,(A[2]-.12)/.25)).toFixed(3)})};
  const parts=G.map(g=>({glow:g.querySelector('.glow'),sun:g.querySelector('.sun'),crown:g.querySelector('.crown'),ping:g.querySelector('.ping'),h:g.querySelector('.h'),pl:g.querySelector('.pl'),fac:g.querySelector('.fac'),glo:g.querySelector('.glo')}));
  const setA=(e,o)=>{if(e)for(const k in o)e.setAttribute(k,o[k])};
  // Liens courbes, bombés vers l'extérieur du radar (moins de croisements au centre). EC : extrémités et point de contrôle
  // à l'écran ; EB : opacités du trait et du halo selon la mise en avant (l'activité en direct ne les touche plus : les
  // comètes éclairent seulement le bout de lien qu'elles traversent).
  const eIdx=new Map();edges.forEach((e,i)=>{eIdx.set(e.a+'>'+e.b,i);eIdx.set(e.b+'>'+e.a,i)});
  const EC=new Array(edges.length),EB=edges.map(()=>({c:0,g:0,on:true})),SG=new Float32Array(edges.length).fill(NaN);
  const bz=(c,t)=>{const u=1-t;return {x:u*u*c.ax+2*u*t*c.cx+t*t*c.bx,y:u*u*c.ay+2*u*t*c.cy+t*t*c.by}}; // point de la courbe (t de 0 à 1)
  const along=(ei,from,t)=>bz(EC[ei],edges[ei].a===from?t:1-t); // même point, en partant de la chaîne « from »
  const edgeOp=i=>{const B=EB[i];lines[i].setAttribute('stroke-opacity',Math.min(1,B.c).toFixed(3));halos[i].setAttribute('stroke-opacity',Math.min(1,B.g).toFixed(3));
    cases[i].setAttribute('stroke-opacity',Math.min(.55,B.c*.85).toFixed(3))}; // le liseré (1,5 px de chaque côté) suit le trait : il s'efface avec lui
  // Au repos les liens se lisent sans rien survoler (opacité 0,3 à 0,65, 1 à 4,5 px en racine de la force du lien, sur un
  // liseré sombre qui les détache du ciel) ; ceux de la
  // chaîne survolée ou choisie s'allument d'un seul ton lavande clair (HL), plus épais (à la part de la chaîne choisie), avec leur halo.
  const HL=['#f1edff','#f1edff'],EW=edges.map(e=>wAbs(shareOf(e))),EK=new Array(edges.length).fill('');
  edges.forEach((e,i)=>{const w=EW[i],same=gnum.get(e.a)&&gnum.get(e.a)===gnum.get(e.b);
    const lw=1+3.5*w;setA(lines[i],{'stroke-width':lw.toFixed(2)});setA(cases[i],{'stroke-width':(lw+3).toFixed(2)});setA(halos[i],{'stroke-width':(3+5*w).toFixed(1)});lines[i].dataset.o=(!grouped?.45+.25*w:same?.45+.2*w:.22+.15*w).toFixed(3)}); // plancher à 0,45 : un trait fin reste lisible sur le cœur clair de la galaxie
  // couleur et épaisseur d'un lien selon son état (n : normal, a/b : allumé depuis la chaîne a ou b) ; changées seulement quand l'état change
  const edgeLook=(i,k)=>{if(EK[i]===k)return;EK[i]=k;const e=edges[i],st=grads[i].children,w=k==='n'?EW[i]:wAbs(e.n/Math.max(1,by.get(k==='a'?e.a:e.b).size));
    const c=k==='n'?[lcol(e.a),lcol(e.b)]:k==='a'?HL:[HL[1],HL[0]];st[0].setAttribute('stop-color',c[0]);st[1].setAttribute('stop-color',c[1]);
    const lw=1+3.5*w;lines[i].setAttribute('stroke-width',lw.toFixed(2));cases[i].setAttribute('stroke-width',(lw+3).toFixed(2))};
  const TWR=mapTwR(W),LOGO=mapLogo(W); // rayon de la planète Twitch au centre (zoom 1) ; LOGO : place gardée libre autour d'elle
  const HUD=`Carte · ${n} chaînes${view==='sel'?' · sélection':(({fr:' francophones',en:' anglophones',autre:' (autres langues)'})[cfg.lang]||'')+(grouped?' · groupes':'')}${gameSel!=='*'?' · '+gameSel:''}${liveOnly?' · en live':''} · ${({today:'aujourd’hui','7d':'7 jours','30d':'30 jours',all:'tout'})[period]||''}`,
    hudW=textWidth(HUD,500,getComputedStyle(document.body).getPropertyValue('--sans'),12)+34+110+100; // incrustation en haut à gauche (+ l'activité et la rotation), évitée par les noms
  let hover=null,zOrder='';const S=new Array(n),LP=new Array(n).fill(null); // LP : place du nom choisie au dessin précédent ; zOrder : icônes de la plus au fond à la plus devant

  // chaînes mises en avant : celle choisie (sinon celle survolée) et ses voisines, sinon le groupe choisi ; survoler une autre
  // chaîne quand une est choisie ne change ni ses traits ni ses noms (la bulle et le nom survolé suffisent)
  function focusSet(){const f=mapView.sel||hover;if(f)return {f,s:new Set([f,...nb[idx.get(f)]])};
    if(mapView.grp!=null)return {f:null,s:new Set(gl[mapView.grp].map(x=>x.id))};return null}
  function draw(){
    const k=mapView.k,rk=Math.min(Math.sqrt(k),2.2),F=focusSet();
    if(els.view)els.view({k,tx:mapView.tx,ty:mapView.ty,rot:mapView.rot,q:mapView.q}); // le fond en volume suit le globe, le zoom et le déplacement (galaxy.tsx)
    const cap=els.radar.querySelector('.cap');
    if(cap){const d=Math.round(((mapView.rot*180/Math.PI)%360+360)%360)%360,g=Math.round(2*Math.acos(Math.min(1,Math.abs(mapView.q[0])))*180/Math.PI);
      cap.textContent=(cfg.mapPause?' · en pause':'')+(mapGlobeOn?' · mode Globe':'')+(d?` · rotation ${String(d).padStart(3,'0')}°`:'')+(g?` · globe ${String(g).padStart(3,'0')}°`:'')}
    const tw=twEl,Lg=logoAt(); // la planète Twitch suit la carte, et tourne avec l'univers (twDraw)
    if(tw)tw.setAttribute('transform',`translate(${Lg.x.toFixed(1)},${Lg.y.toFixed(1)}) scale(${(TWR*rk).toFixed(3)})`);
    twDraw();
    // face arrière du globe : icône plus petite (80 % tout au fond, 130 % tout devant : effet de profondeur adouci) et plus pâle ; dessinée derrière celles de devant
    // de face, la taille ne dit que les viewers actifs ; l'effet de profondeur revient à mesure qu'on tourne le globe (20° pour tout)
    const turn=Math.min(1,2*Math.acos(Math.min(1,Math.abs(mapView.q[0])))/(20*Math.PI/180));
    for(let i=0;i<n;i++){const {x,y}=toScreen(Pos(i)),z=DZ[i];S[i]={x,y,z,r:R[i]*rk*Math.pow(DP[i],.8*turn),al:z>=-.3?1:Math.max(.28,1+1.2*(z+.3)), /* le haut du plan incliné reste net ; seul le dos du globe tourné à la main pâlit */a:(Math.atan2(x-W/2,H/2-y)*180/Math.PI+360)%360}} // a : cap vu du centre du radar
    // de la plus au fond à la plus devant ; la planète Twitch (profondeur 0) entre celles de derrière et celles de devant
    const depth=[...ids.keys()].sort((a,b)=>S[a].z-S[b].z),cut=depth.findIndex(i=>S[i].z>0),key=depth.join(',')+'|'+cut;
    if(key!==zOrder){zOrder=key;const mn=twEl.parentNode;depth.forEach((i,j)=>{if(j===cut)mn.appendChild(twEl);mn.appendChild(G[i])});if(cut<0)mn.appendChild(twEl)}
    edges.forEach((e,i)=>{const a=S[idx.get(e.a)],b=S[idx.get(e.b)],on=!F||(F.f?e.a===F.f||e.b===F.f:F.s.has(e.a)&&F.s.has(e.b));
      // sens de la courbe choisi sur la carte de base (il ne change pas en zoomant) : vers l'extérieur du radar, sauf si
      // elle sortait du cadre ; dans ce cas vers l'intérieur, ou à peine bombée si aucun des deux ne tient. Les icônes
      // tournent autour du logo : quand le sens change, la courbe passe en douceur de l'un à l'autre (SG), sans sauter.
      const p0=Pos(idx.get(e.a)),p1=Pos(idx.get(e.b)),bl=Math.hypot(p1.x-p0.x,p1.y-p0.y)||1,bnx=-(p1.y-p0.y)/bl,bny=(p1.x-p0.x)/bl,bmx=(p0.x+p1.x)/2,bmy=(p0.y+p1.y)/2,bb=Math.min(bl*.18,80);
      const inF=t=>{const x=bmx+bnx*bb*t,y=bmy+bny*bb*t;return x>4&&x<W-4&&y>4&&y<H-4};
      let sg=(bnx*(bmx-CX)+bny*(bmy-CY))<0?-1:1;if(!inF(sg))sg=inF(-sg)?-sg:sg*.3;
      sg=SG[i]=isNaN(SG[i])?sg:SG[i]+(sg-SG[i])*.06;
      const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,mx=(a.x+b.x)/2,my=(a.y+b.y)/2,
        bend=bb*sg*len/bl,c=EC[i]={ax:a.x,ay:a.y,bx:b.x,by:b.y,cx:mx+nx*bend,cy:my+ny*bend};
      const d=`M${c.ax.toFixed(1)} ${c.ay.toFixed(1)}Q${c.cx.toFixed(1)} ${c.cy.toFixed(1)} ${c.bx.toFixed(1)} ${c.by.toFixed(1)}`;
      lines[i].setAttribute('d',d);halos[i].setAttribute('d',d);cases[i].setAttribute('d',d);
      setA(grads[i],{x1:a.x.toFixed(1),y1:a.y.toFixed(1),x2:b.x.toFixed(1),y2:b.y.toFixed(1)});
      const o=+lines[i].dataset.o,lit=!!(F&&F.f&&on),co=(!on?.03:lit?.9:F?Math.min(o+.12,1):o)*Math.min(a.al,b.al);
      edgeLook(i,lit?(e.a===F.f?'a':'b'):'n');EB[i]={c:co,g:lit?co*.55:0,on};edgeOp(i);
      if(EDIR[i]){const m=bz(c,.5),an=Math.atan2(c.by-c.ay,c.bx-c.ax)*180/Math.PI+(EDIR[i]<0?180:0),room=len-a.r-b.r>40; // au milieu d'une courbe de Bézier, la tangente est parallèle à a→b
        setA(arrows[i],{transform:`translate(${m.x.toFixed(1)} ${m.y.toFixed(1)}) rotate(${an.toFixed(1)})`,'stroke-opacity':room?Math.min(.95,co*1.6+.05).toFixed(3):'0'})}});
    parts.forEach((p,i)=>{const {x,y,r}=S[i],X=x.toFixed(1),Y=y.toFixed(1);
      setA(p.sun,{cx:X,cy:Y,r:(r*2.4+6).toFixed(1)});setA(p.crown,{cx:X,cy:Y,r:(r+3.5).toFixed(1)});setA(p.glow,{cx:X,cy:Y,r:(r*1.55+10).toFixed(1)});
      setA(p.h,{cx:X,cy:Y,r:(r+4.5).toFixed(1)});
      // Planète (faite comme la planète Twitch) : placée et mise à l'échelle d'un coup. Sa lumière vient de son étoile (une
      // chaîne seule, ou une étoile : de la planète Twitch, au centre de l'univers) : les facettes et le reflet tournent vers
      // elle ; la planète peinte reste droite.
      const src=planet(i)?S[starOf(i)]:Lg,A=(Math.atan2(src.y-y,src.x-x)*180/Math.PI).toFixed(1);
      p.pl.setAttribute('transform',`translate(${X} ${Y}) scale(${r.toFixed(2)})`);
      p.fac.setAttribute('transform',`rotate(${A})`);p.glo.setAttribute('transform',`rotate(${A})`);
      G[i].style.opacity=((!F||F.s.has(ids[i])?1:.2)*S[i].al).toFixed(3);G[i].classList.toggle('sel',ids[i]===mapView.sel)});
    placeLabels(F);
  }
  // Noms : chacun à la première place libre autour de son rond (à droite, à gauche, dessous, dessus, en diagonale),
  // sans toucher un autre nom ni un autre rond. Sans place libre, le nom est masqué : il apparaît en zoomant ou au survol.
  const NAMES_ALL=50;
  function placeLabels(F){
    // la zone des boutons + − ⤢ compte comme occupée
    const Lg=logoAt(),lz=LOGO*Math.min(Math.sqrt(mapView.k),2.2); // la planète Twitch et son anneau, là où ils sont à l'écran
    const placed=[{x:W-50,y:0,w:50,h:Object.keys(cfg.mapPins||{}).length?324:286} /* colonne de boutons : pause, globe, +, −, tout afficher, recentrer, aide (et remettre en place) */,{x:0,y:0,w:hudW,h:els.radar.querySelector('.radar-log.on')?58:30},{x:Lg.x-lz/2,y:Lg.y-lz*.32,w:lz,h:lz*.64}],rank=i=>(ids[i]===mapView.sel||ids[i]===hover?2:F&&F.s.has(ids[i])?1:0);
    // la pile en bas à droite (légende et note « nom masqué », dessinées par React, repérées par data-maplegend) est évitée par les noms, comme le bandeau en haut à gauche
    {const sr=svg.getBoundingClientRect();if(sr.width&&sr.height)document.querySelectorAll('[data-maplegend]').forEach(lg=>{if(!lg.offsetParent)return;const r=lg.getBoundingClientRect();
      placed.push({x:(r.left-sr.left)*W/sr.width,y:(r.top-sr.top)*H/sr.height,w:r.width*W/sr.width,h:r.height*H/sr.height})})}
    const order=[...ids.keys()].sort((a,b)=>rank(b)-rank(a)||isStar[b]-isStar[a]||nodes[b].size-nodes[a].size);let hidden=0;
    const back=i=>S[i].z<-.45; // au fond de l'univers (globe tourné à la main) : pas de nom (sauf survolée ou choisie), et les noms de devant peuvent passer dessus
    const hitsNode=(x,y,w,h,self)=>S.some((s,j)=>{if(j===self||back(j))return false;const cx=Math.max(x,Math.min(s.x,x+w)),cy=Math.max(y,Math.min(s.y,y+h));return Math.hypot(s.x-cx,s.y-cy)<s.r+5});
    const hitsLab=(x,y,w,h)=>placed.some(p=>x<p.x+p.w+4&&x+w+4>p.x&&y<p.y+p.h&&y+h>p.y);
    // Sur les liens de la chaîne mise en avant : part de ses viewers actifs qu'on voit aussi chez l'autre. Placés juste après
    // le nom de cette chaîne, le long du trait (au milieu ou un peu à côté), et seulement s'il y a la place : sinon le
    // pourcentage reste lisible dans la fiche sous la carte.
    const edgeLabels=()=>{let eh='';if(!F||!F.f)return eh;const i=idx.get(F.f),A=by.get(F.f);
      for(const o of nb[i]){const ei=eIdx.get(F.f+'>'+o),txt=pct(sharedCount(A,by.get(o))/A.size),w=textWidth(txt,'600',getComputedStyle(document.body).getPropertyValue('--mono'),11)+14,h=18;
        const pos=[.5,.4,.6,.32,.68].map(t=>{const p=along(ei,F.f,t);return [p.x-w/2,p.y-h/2]}).find(([x,y])=>x>=2&&y>=2&&x+w<=W-2&&y+h<=H-2&&!hitsLab(x,y,w,h)&&!hitsNode(x,y,w,h,-1));
        if(!pos)continue;placed.push({x:pos[0],y:pos[1],w,h});eh+=`<rect class="lp" x="${pos[0].toFixed(1)}" y="${pos[1].toFixed(1)}" width="${w.toFixed(1)}" height="${h}" rx="${h/2}"/><text x="${(pos[0]+w/2).toFixed(1)}" y="${(pos[1]+12.8).toFixed(1)}" text-anchor="middle" class="mapel">${txt}</text>`}
      return eh};
    let edgesDone=false;
    for(const i of order){
      if(!edgesDone&&rank(i)<2){elab.innerHTML=edgeLabels();edgesDone=true}
      // noms affichés sans survol : jusqu'à NAMES_ALL chaînes, tous ceux qui trouvent une place libre (dans l'ordre : chaîne
      // survolée ou choisie, ses voisines, les étoiles, puis les plus grosses) ; au-delà, seulement les étoiles, la chaîne
      // survolée ou choisie et ses voisines, les autres gardant leur nom pour le survol (une carte de 100 noms ne se lit plus)
      if(!(rank(i)>0||isStar[i]||n<=NAMES_ALL)||(back(i)&&rank(i)<2)){LG[i].setAttribute('visibility','hidden');LP[i]=null;continue}
      const {x,y,r}=S[i],strong=rank(i)>0||!!isStar[i], /* étoiles en gras : elles restent repérables parmi tous les noms */ w=(strong?LWb[i]:LW[i])+16,h=20,d=r+6,dd=r*.72+5,t=T[i]; // w, h : la pilule (8 px de marge de chaque côté)
      const C=[[x+d,y-h/2],[x-d-w,y-h/2],[x-w/2,y+r+6],[x-w/2,y-r-6-h],[x+dd,y-dd-h+4],[x+dd,y+dd-4],[x-dd-w,y-dd-h+4],[x-dd-w,y+dd-4]];
      const inView=([cx,cy])=>cx>=4&&cy>=2&&cx+w<=W-4&&cy+h<=H-2;
      // la place prise au dessin précédent d'abord : les icônes bougent, le nom ne saute pas d'un côté à l'autre sans raison
      const free=c=>inView(c)&&!hitsLab(c[0],c[1],w,h)&&!hitsNode(c[0],c[1],w,h,i);
      let pos=LP[i]!=null&&free(C[LP[i]])?C[LP[i]]:C.find(free);LP[i]=pos?C.indexOf(pos):null;
      // la chaîne survolée ou choisie garde toujours son nom : sans place libre, il peut passer sur un rond, pas sur un autre nom
      if(!pos&&rank(i)===2)pos=C.find(c=>inView(c)&&!hitsLab(c[0],c[1],w,h))||C.find(inView)||C[0];
      if(!pos){LG[i].setAttribute('visibility','hidden');if(x+r>0&&x-r<W&&y+r>0&&y-r<H&&(!F||F.s.has(ids[i])))hidden++;continue}
      placed.push({x:pos[0],y:pos[1],w,h});
      setA(t,{x:(pos[0]+w/2).toFixed(1),y:(pos[1]+14.2).toFixed(1)});setA(LR[i],{x:pos[0].toFixed(1),y:pos[1].toFixed(1),width:w.toFixed(1),height:h,rx:h/2});
      LG[i].setAttribute('visibility','visible');t.classList.toggle('strong',strong);LR[i].classList.toggle('strong',strong);LG[i].style.opacity=!F||F.s.has(ids[i])?1:.2}
    if(!edgesDone)elab.innerHTML=edgeLabels();
    // noms masqués : dits dans le bandeau (« · 4 noms masqués »), l'explication en infobulle ; plus de pilule flottante (critique du 25/11/2026)
    if(hidden!==lastHidden){lastHidden=hidden;const hid=els.radar.querySelector('.hid'),hud=els.radar.querySelector('.radar-hud');
      if(hid)hid.textContent=hidden?` · ${hidden} nom${hidden>1?'s':''} masqué${hidden>1?'s':''}`:'';
      if(hud)hud.title=hidden?`Noms masqués pour ne pas se chevaucher : zoome ou survole pour ${hidden>1?'les':'le'} voir`:''}
  }

  // ---------- zoom et déplacements ----------
  let anim=0;
  // élan du globe : lâché en mouvement, il continue de tourner sur sa lancée et ralentit en deux secondes environ
  // (spin : vitesse de rotation autour des axes de l'écran, en radians par seconde ; arrêté par un clic ou une vue animée)
  let spin=null;
  const spinGlobe=(gx,gy)=>{const a=Math.hypot(gx,gy);if(a<1e-6)return;const s=Math.sin(a/2)/a;mapView.q=qNorm(qMul([Math.cos(a/2),-gy*s,gx*s,0],mapView.q))};
  const touch=()=>{mapView.touched=Date.now()};
  function zoomAt(px,py,f){cancelAnimationFrame(anim);const k=Math.min(Math.max(mapView.k*f,.5),8),q=toBase({x:px,y:py}); // le point sous la souris ne bouge pas
    Object.assign(mapView,txFor(q,px,py,k),{k});touch();draw()}
  // Déplacement vu à l'écran (le logo suit la souris), limité : quand toute la carte tient dans le cadre, elle ne peut pas
  // en sortir ; quand elle est plus grande (zoom), on ne peut pas la tirer au-delà de ses bords. Si elle déborde déjà (après
  // un zoom ou une rotation), on peut toujours la ramener, jamais l'éloigner davantage.
  function panBy(dx,dy){const rk=Math.min(Math.sqrt(mapView.k),2.2),L=logoAt();
    let x0=L.x-LOGO,x1=L.x+LOGO,y0=L.y-LOGO,y1=L.y+LOGO;
    for(let i=0;i<n;i++){const s=toScreen(Pos(i)),r=R[i]*rk+10;x0=Math.min(x0,s.x-r);x1=Math.max(x1,s.x+r);y0=Math.min(y0,s.y-r);y1=Math.max(y1,s.y+r)}
    const lim=(d,a0,a1,size)=>{const fits=a1-a0<=size,lo=fits?-a0:size-a1,hi=fits?size-a1:-a0;return Math.min(Math.max(d,Math.min(lo,0)),Math.max(hi,0))};
    mapView.tx+=lim(dx,x0,x1,W);mapView.ty+=lim(dy,y0,y1,H);touch();draw()}
  function animateTo(k,tx,ty,rot=mapView.rot,q=mapView.q){cancelAnimationFrame(anim);spin=null;touch();const a={k:mapView.k,tx:mapView.tx,ty:mapView.ty,rot:mapView.rot,q:mapView.q},t0=performance.now(),D=matchMedia('(prefers-reduced-motion: reduce)').matches?0:q===mapView.q?300:600;
    let dr=((rot-a.rot)%(2*Math.PI)+3*Math.PI)%(2*Math.PI)-Math.PI; // tourne par le plus court chemin (le globe aussi)
    const step=now=>{const u=D?Math.min((now-t0)/D,1):1,e=1-Math.pow(1-u,3);mapView.k=a.k+(k-a.k)*e;mapView.tx=a.tx+(tx-a.tx)*e;mapView.ty=a.ty+(ty-a.ty)*e;mapView.rot=a.rot+dr*e;mapView.q=qSlerp(a.q,q,e);draw();if(u<1)anim=requestAnimationFrame(step)};
    anim=requestAnimationFrame(step)}
  // Cadre un ensemble de chaînes en gardant la rotation : les dimensions sont mesurées telles qu'on les voit à l'écran
  // (après rotation), les ronds et les noms ajoutés en pixels fixes, et on peut dézoomer (jusqu'à 0,5) si le groupe est grand.
  function fitIds(list){if(!list)return animateTo(1,0,0,0,[1,0,0,0]); // vue d'ensemble : carte à plat, de face, sans rotation
    const I=list.map(c=>idx.get(c)).filter(i=>i!=null);if(!I.length)return;
    const P=[];for(const i of I)P[i]=Pos(i); // là où elles sont sur leur orbite en ce moment
    const c0={x:I.reduce((s,i)=>s+P[i].x,0)/I.length,y:I.reduce((s,i)=>s+P[i].y,0)/I.length};
    let bx0=Infinity,bx1=-Infinity,by0=Infinity,by1=-Infinity,mL=0,mR=0,mT=0;
    for(const i of I){const v=rotV(P[i].x-c0.x,P[i].y-c0.y,mapView.rot);bx0=Math.min(bx0,v.x);bx1=Math.max(bx1,v.x);by0=Math.min(by0,v.y);by1=Math.max(by1,v.y);
      mL=Math.max(mL,R[i]+12);mR=Math.max(mR,R[i]+LW[i]+18);mT=Math.max(mT,R[i]+14)}
    const k=Math.min(Math.max(Math.min((W-24-mL-mR)/((bx1-bx0)||1),(H-24-2*mT)/((by1-by0)||1)),.5),4);
    // milieu du contenu (ronds + noms) placé au centre de l'écran ; o = décalage vu à l'écran, ramené dans le repère non tourné
    const o={x:(k*bx0-mL+k*bx1+mR)/2,y:k*(by0+by1)/2},t=txFor(c0,W/2-o.x,H/2-o.y,k);
    animateTo(k,t.tx,t.ty)}
  // La fiche de la chaîne choisie (React, map.tsx) couvre le bas à gauche : 380 px de large et 46 % de la hauteur au plus. On garde
  // la chaîne choisie hors de cette zone (critique du 25/11/2026). Sur écran étroit (téléphone), la fiche est repliée : rien à éviter.
  const sheetBox=()=>innerWidth<640?null:{w:Math.min(380,W-24)+12,h:Math.min(.46*H,H-70)+12};
  function freeCenter(){const b=sheetBox();if(!b)return{x:W/2,y:H/2};
    return W-b.w>=260?{x:(b.w+W)/2,y:H/2}:{x:W/2,y:(H-b.h)/2}} // à droite de la fiche s'il y a la place, sinon au-dessus
  function centerOn(id){const i=idx.get(id),k=Math.max(mapView.k,1.6),fc=freeCenter(),t=txFor(Pos(i),fc.x,fc.y,k);animateTo(k,t.tx,t.ty)}
  // chaîne choisie d'un clic sur la carte (sans recentrage) : si la fiche va la couvrir, on décale la vue du minimum
  function reveal(id){const b=sheetBox(),i=idx.get(id);if(!b||i==null||!S[i])return;
    const s=S[i],r=s.r+14,hit=s.x-r<b.w&&s.y+r>H-b.h;if(!hit)return;
    const right=b.w+r-s.x,up=s.y+r-(H-b.h),nx=right<=up?s.x+right:s.x,ny=right<=up?s.y:s.y-up,t=txFor(Pos(i),nx,ny,mapView.k);animateTo(mapView.k,t.tx,t.ty)}
  function select(id,center){mapView.sel=id||null;touch();if(id&&center)centerOn(id);else{draw();if(id)reveal(id)}renderInfo()}
  const markGroups=()=>notify({grp:mapView.grp});
  function setGroup(g){mapView.grp=g;mapView.grpId=g==null?null:gl[g][0].id;mapView.sel=null;renderInfo();markGroups();fitIds(g==null?null:gl[g].map(x=>x.id))}
  // Recentrer (toujours possible) : la chaîne choisie revient au centre (zoom gardé, au moins 1,6) ; sinon le groupe mis en
  // avant est recadré ; sinon le centre de la carte (logo) revient au milieu de l'écran, zoom et rotation gardés
  function recenter(){if(mapView.sel&&idx.has(mapView.sel))centerOn(mapView.sel);else if(mapView.grp!=null)fitIds(gl[mapView.grp].map(x=>x.id));
    else{const k=mapView.k;animateTo(k,W/2-k*W/2,H/2-k*H/2)}}
  // fiche de la chaîne choisie (affichée par React) : ses voisines, avec la part de ses viewers actifs qu'on voit aussi chez elles
  // place dans les systèmes : étoile (et combien de planètes), planète (et de quelle étoile), ou seule
  const roleTxt=id=>{const i=idx.get(id);if(sysOf[i]<0)return 'seule';const Sy=SYS[sysOf[i]],np=Sy.rings.reduce((a,g)=>a+g.m.length,0);
    if(isStar[i])return `étoile · ${np} planète${np>1?'s':''}`;
    // planète : régularité, d'un jour à l'autre, de la part de ses viewers actifs qu'on voit aussi chez l'étoile
    const k=KI[i];
    return 'planète '+deC(ids[Sy.s])+(isNaN(k)?'':k<.25?' · partage régulier':k<.55?' · partage variable':' · partage irrégulier')};
  // voisines d'une chaîne : celles qui lui sont reliées par un trait, de la plus partagée à la moins partagée
  // (pour une chaîne donnée, la part partagée suit le nombre de viewers communs)
  const neighbours=id=>{const A=by.get(id);return [...nb[idx.get(id)]].map(o=>({o,n:sharedCount(A,by.get(o))})).sort((a,b)=>b.n-a.n)};
  function renderInfo(){const id=mapView.sel;if(!id){notify({info:null});return}
    const A=by.get(id),links=neighbours(id).slice(0,6);
    notify({info:{...who(id),sub:roleTxt(id)+' · '+(grouped?(gnum.get(id)?'groupe '+gnum.get(id):'isolée')+' · ':'')+(liveV(id)?fmt(liveV(id))+' en live · ':'hors live · ')+fmt(A.size)+' viewers actifs',
      links:links.map(l=>({...who(l.o),share:l.n/A.size,n:l.n,out:passN(id,l.o),inn:passN(l.o,id)}))}})}
  const tipHtml=id=>{const A=by.get(id),links=id===mapView.sel?[]:neighbours(id).slice(0,3); // chaîne déjà choisie : la fiche donne les voisines, la bulle ne les répète pas
    return `<div class="tiph">${av(id,'md')}<div><b>${esc(id)}</b><div class="lbl">${roleTxt(id)} · ${grouped?'groupe '+(gnum.get(id)||'—')+' · ':''}${liveV(id)?fmt(liveV(id))+' en live · ':'hors live · '}${fmt(by.get(id).size)} viewers actifs</div></div></div>`
      +(links.length?'<div class="lbl">Part de ses viewers actifs qu\'on voit aussi chez</div>':'')
      +links.map(({o,n})=>{const out=passN(id,o),inn=passN(o,id);
        return `<div class="row"><span>${av(o)}${esc(o)}</span><span>${pct(n/A.size)} · ${fmt(n)} pers.${out+inn?' · '+passWords(o,out,inn):''}</span></div>`}).join('')};
  // sens des passages entre la chaîne choisie et une voisine o, en mots (même règle que les pointes : 10 passages, 60 %)
  // sens des passages entre la chaîne choisie et une voisine o (même texte que la fiche, map.tsx) : sous 10 passages on ne dit pas de sens
  function passWords(o,out,inn){const t=out+inn,m=Math.max(out,inn),
      verdict=t<10?'trop peu de passages pour un sens':m/t>=.6?`surtout ${out>inn?'vers':'depuis'} ${o}`:'dans les deux sens';
    return `${fmt(out)} vers ${o} · ${fmt(inn)} depuis ${o} (${verdict})`}
  // « de » devant un nom de chaîne, élidé devant une voyelle (« d'etoiles »)
  function deC(c){return (/^[aeiouyhàâéèêëîïôöûü]/i.test(c)?"d'":'de ')+c}

  // Souris : clic gauche glissé = faire tourner le globe dans tous les sens, comme une boule qu'on fait rouler sous la main ;
  // Maj + clic gauche glissé = faire tourner la carte à plat autour du logo ; clic droit glissé sur une icône = déplacer
  // cette chaîne, sur un espace vide = déplacer la carte (bouton du milieu aussi) ; clic gauche sans bouger = choisir.
  // Doigt : un doigt fait tourner le globe, deux doigts zooment et déplacent.
  const toLocal=e=>{const r=svg.getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}};
  const nodeOf=e=>{const g=e.target.closest&&e.target.closest('g[data-n]');return g?g.dataset.n:null};
  // angle de la souris vu du logo : un tour de souris autour du logo = un tour complet (360°) de la carte
  const ang=p=>{const L=logoAt();return Math.atan2(p.y-L.y,p.x-L.x)},ROT_SPEED=1;
  const pts=new Map();let drag=null,pinch=null;
  svg.addEventListener('contextmenu',e=>e.preventDefault()); // le clic droit sert à déplacer, pas au menu du navigateur
  svg.addEventListener('mousedown',e=>{if(e.button===1)e.preventDefault()}); // pas de défilement automatique au bouton du milieu
  svg.addEventListener('pointerdown',e=>{if(e.button>2)return;try{svg.setPointerCapture(e.pointerId)}catch(_){}
    const p=toLocal(e),node=nodeOf(e);pts.set(e.pointerId,p);spin=null; // un clic arrête l'élan du globe
    if(pts.size===1){
      const mode=e.pointerType==='mouse'&&e.button===2?(node?'node':'pan'):e.button===1?'pan':e.shiftKey?'rot':(mapGlobeOn||e.altKey)?'globe':'pan';
      // clic droit sur une planète ou une étoile : c'est tout le système qu'on déplace (on tient son étoile) ; sur une chaîne
      // seule, elle seule. ti : la chaîne tenue ; b : où elle est vue, et sur quelle face, avant qu'on la prenne
      const ni=mode==='node'?idx.get(node):-1,ti=ni<0?-1:planet(ni)?starOf(ni):ni;
      if(ti>=0)Object.assign(off[ti],{x:0,y:0});
      const b=ti<0?null:Pos(ti);if(ti>=0)Object.assign(sof[ti],{x:0,y:0}); // l'écart du système entre dans sa nouvelle place (place(), plus bas)
      drag={p,last:p,mode,node,ti,btn:e.button,moved:false,aLast:ang(p)};
      // prise en main : sa place devient celle d'où elle est (sur la même face du globe), sans écart
      if(ti>=0){const q=toBase(p);place(ti,b);drag.off={x:b.x-q.x,y:b.y-q.y}}}
    else if(pts.size===2){const [a,b]=[...pts.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,k:mapView.k,mid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};drag=null}});
  svg.addEventListener('pointermove',e=>{const p=toLocal(e);
    if(pts.has(e.pointerId)){pts.set(e.pointerId,p);
      if(pinch&&pts.size===2){const [a,b]=[...pts.values()],mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
        zoomAt(mid.x,mid.y,pinch.k*Math.hypot(a.x-b.x,a.y-b.y)/pinch.d/mapView.k);panBy(mid.x-pinch.mid.x,mid.y-pinch.mid.y);pinch.mid=mid;return}
      if(drag){const dx=p.x-drag.p.x,dy=p.y-drag.p.y;
        if(!drag.moved&&Math.hypot(dx,dy)>4){drag.moved=true;hideTip();cancelAnimationFrame(anim);svg.classList.add(drag.mode==='node'?'moving':'grab');
          if(drag.mode!=='node')hover=null} // tourner ou déplacer la vue ne met pas les orbites en pause (même commencé sur une planète)
        if(drag.moved){
          // Rotation autour du logo, qui suit l'angle parcouru par la souris autour de lui. On cumule de petits pas,
          // ramenés entre −180° et 180°, pour ne pas sauter quand la souris passe à gauche du logo. Trop près du logo,
          // l'angle n'a pas de sens : on attend que la souris s'en éloigne.
          if(drag.mode==='rot'){const L=logoAt();if(Math.hypot(p.x-L.x,p.y-L.y)>12){const a=ang(p),d=((a-drag.aLast)%(2*Math.PI)+3*Math.PI)%(2*Math.PI)-Math.PI;
            drag.aLast=a;mapView.rot+=d*ROT_SPEED;touch();draw()}}
          // Globe : le point sous la souris suit la souris. Le geste vu à l'écran est ramené dans le repère de la carte (sans
          // la rotation à plat ni le zoom), puis en angle : traverser la moitié du cadre fait tourner le globe d'un radian.
          // Glisser à droite fait tourner autour de l'axe vertical, glisser vers le bas autour de l'axe horizontal.
          else if(drag.mode==='globe'){const v=rotV(p.x-drag.last.x,p.y-drag.last.y,-mapView.rot),gx=v.x/(mapView.k*W/2),gy=v.y/(mapView.k*H/2);
            // vitesse du geste (lissée), reprise au lâcher pour l'élan
            const now=performance.now(),dt=Math.max(.008,(now-(drag.lt||now-16))/1000);drag.lt=now;
            drag.vg={x:gx/dt*.6+(drag.vg?drag.vg.x*.4:0),y:gy/dt*.6+(drag.vg?drag.vg.y*.4:0)};
            if(Math.hypot(gx,gy)>1e-6){spinGlobe(gx,gy);touch();draw()}}
          else if(drag.mode==='pan')panBy(p.x-drag.last.x,p.y-drag.last.y);
          else{const i=drag.ti,q=toBase(p),s=toScreen({x:q.x+drag.off.x,y:q.y+drag.off.y}),m=R[i]*Math.min(Math.sqrt(mapView.k),2.2)+6,
              cl=(v,a,b)=>Math.min(Math.max(v,a),b); // une chaîne déplacée reste dans la partie visible de la carte
            place(i,toBase({x:cl(s.x,m,W-m),y:cl(s.y,m,H-m)}));touch();draw()}
          drag.last=p}
        return}}
    if(e.pointerType!=='mouse')return;
    const id=nodeOf(e);if(id!==hover){hover=id;draw()}
    if(id)showTip(e,tipHtml(id));else hideTip()});
  const end=e=>{if(!pts.has(e.pointerId))return;pts.delete(e.pointerId);if(pts.size<2)pinch=null;
    // globe lâché en mouvement (dernier déplacement il y a moins de 90 ms) : il garde son élan (pas si l'on a demandé moins d'animations)
    if(drag&&e.type==='pointerup'&&drag.mode==='globe'&&drag.moved&&drag.vg&&performance.now()-drag.lt<90&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      const v=Math.hypot(drag.vg.x,drag.vg.y),m=Math.min(1,6/(v||1));if(v>.15)spin={x:drag.vg.x*m,y:drag.vg.y*m}} // au plus 6 rad/s
    if(drag&&e.type==='pointerup'){
      if(!drag.moved&&drag.btn===0){const id=drag.node;select(id&&id!==mapView.sel?id:null,false)}
      else if(drag.moved&&drag.mode==='node'){const i=drag.ti; // place gardée pour les prochaines fois (celle de l'étoile pour un système)
        cfg.mapPins=cfg.mapPins||{};cfg.mapPins[ids[i]]={x:+(B[i].x/W).toFixed(4),y:+(B[i].y/H).toFixed(4),f:1};saveCfg(); // f : déplacé à la main (toutes les orbites sont désormais dans le plan de la galaxie ; gardé pour les anciennes places)
        notify({pins:Object.keys(cfg.mapPins).length});draw()}}
    if(!pts.size){drag=null;svg.classList.remove('grab','moving')}};
  svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);
  // geste interrompu (capture perdue, fenêtre quittée en plein glisser) : on relâche tout, le geste suivant repart propre
  svg.addEventListener('lostpointercapture',end);
  const onBlur=()=>{if(!svg.isConnected){removeEventListener('blur',onBlur);return}if(!pts.size&&!drag)return;pts.clear();pinch=null;drag=null;svg.classList.remove('grab','moving')};
  addEventListener('blur',onBlur);
  svg.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&hover&&!pts.size){hover=null;draw()}hideTip()});
  svg.addEventListener('dblclick',e=>{const id=nodeOf(e);if(id){hideTip();selChan=id;showTab('channel');return}const p=toLocal(e);zoomAt(p.x,p.y,1.8)});
  // la carte remplit la page, qui ne défile plus : la molette zoome directement (avec ou sans Ctrl, pincement du trackpad compris)
  svg.addEventListener('wheel',e=>{
    e.preventDefault();const p=toLocal(e);zoomAt(p.x,p.y,Math.exp(-e.deltaY*(e.deltaMode?.05:.0025)))},{passive:false});
  svg.addEventListener('keydown',e=>{const k=e.key;let done=true;
    if(k==='+'||k==='=')zoomAt(W/2,H/2,1.4);else if(k==='-'||k==='_')zoomAt(W/2,H/2,1/1.4);else if(k==='0')fitIds(null);else if(k==='c'||k==='C')recenter();
    else if(k.startsWith('Arrow'))panBy(k==='ArrowLeft'?60:k==='ArrowRight'?-60:0,k==='ArrowUp'?60:k==='ArrowDown'?-60:0);
    else if(k==='Escape'&&(mapView.sel||mapView.grp!=null)){if(mapView.sel)select(null);else setGroup(null)}
    else if(k==='p'||k==='P'||k===' ')togglePause();else if(k==='g'||k==='G')toggleGlobe();else done=false;
    if(done)e.preventDefault()});
  // commandes appelées par React : boutons + − ⤢ ◎, « Aller à une chaîne », groupes, fiche
  // Lecture / pause du mouvement des orbites (bouton ⏯ ou touche P / Espace) ; le choix est gardé d'une visite à l'autre
  const togglePause=()=>{cfg.mapPause=!cfg.mapPause;draw();notify({paused:!!cfg.mapPause})}; // draw : le bandeau dit « en pause »
  // mode Globe : glisser fait tourner l'univers en 3D au lieu de déplacer la vue (gardé d'une visite à l'autre)
  const toggleGlobe=()=>{mapGlobeOn=!mapGlobeOn;svg.classList.toggle('globe',mapGlobeOn);notify({globe:mapGlobeOn});draw()};
  const api={togglePause,toggleGlobe,zoomIn:()=>zoomAt(W/2,H/2,1.5),zoomOut:()=>zoomAt(W/2,H/2,1/1.5),fit:()=>fitIds(mapView.grp==null?null:gl[mapView.grp].map(x=>x.id)),recenter,
    select:id=>select(id||null,true),find:id=>{mapView.grp=null;mapView.grpId=null;markGroups();select(id,true)},group:g=>setGroup(g),
    stop:()=>{cancelAnimationFrame(radarRaf);radarRaf=0;cancelAnimationFrame(anim)}};
  svg.classList.toggle('globe',mapGlobeOn);markGroups();draw();renderInfo();notify({paused:!!cfg.mapPause,globe:mapGlobeOn,log:mapPassLog.map(x=>({...x}))});
  // Largeur des noms mesurée avec la police de la page : si Roboto n'est pas encore chargée, on redessine une fois qu'elle l'est,
  // sinon les noms seraient placés avec la largeur d'une autre police et pourraient se toucher.
  if(document.fonts&&document.fonts.status!=='loaded'&&!renderMap.fontWait){renderMap.fontWait=true;
    document.fonts.ready.then(()=>{renderMap.fontWait=false;if(tab==='map'&&svg.isConnected)render()})}

  // ---------- fond radar : écran fixe, la carte bouge par-dessus ----------
  const rad=els.radar,cx=W/2,cy=H/2;
  rad.style.height=H+'px';
  // bandeau « radar » en haut à gauche, et juste dessous le journal : le dernier abonnement, don de bits ou raid, quelques secondes
  rad.innerHTML=`<div class="radar-hud"><i></i>${esc(HUD)}<span class="act"></span><span class="hid"></span><span class="cap"></span></div><div class="radar-log" role="status"></div>`;
  {const hud=rad.querySelector('.radar-hud'),lg=rad.querySelector('.radar-log');if(hud&&lg)lg.style.top=(hud.offsetTop+hud.offsetHeight+6)+'px'}
  draw(); // affiche la rotation dans l'incrustation, maintenant qu'elle existe
  // ---------- activité en direct : la carte bat au rythme réel des chats ----------
  // Toutes les 10 s, l'animation relit la base, qui continue d'être mise à jour même quand la carte ne se redessine pas :
  // messages des 6 dernières minutes, viewers qui ont écrit, nouveaux venus, abonnements, bits et raids. Les signaux
  // restent discrets :
  // - un message dans le chat : le halo de la chaîne respire un peu et une onde fine s'étend à peine (pas de saut). Une
  //   grosse chaîne en reçoit des centaines par minute : le rythme suit la racine du débit, plafonné, pour que les petites
  //   restent visibles à côté des grosses. Tant que le chat est animé, le halo reste plus vif ;
  // - un vrai passage, à l'instant : quelqu'un qui écrivait chez A dans les 3 dernières heures écrit pour la première fois
  //   de la journée chez B ; une comète vive suit le trait de A vers B (un arc pâle et direct s'ils ne sont pas reliés), un
  //   reflet s'allume sur le bord de B, et le journal l'écrit (« PASSAGE · A → B », regroupé s'il en arrive plusieurs) ;
  // - le trafic de la période : de petites lueurs glissent le long des traits, dans chaque sens, d'autant plus souvent
  //   qu'il y a eu de passages mesurés dans ce sens (rejouées en continu, sans prétendre au moment ; arrêtées par la pause) ;
  // - quelqu'un qui écrit pour la première fois de la journée chez cette chaîne : un grain de lumière arrive en spirale
  //   et se fond dans la planète ;
  // - abonnement, subs offerts, bits, raid (chacun une seule fois, quand il arrive) : une pastille au-dessus de la chaîne,
  //   avec le nombre ou le montant (« ♥ 5 offerts », « ◆ 500 bits », « Raid · 1 200 · de x »), des étincelles roses ou
  //   des éclats de cristal ; un raid venu d'une chaîne de la carte arrive en comète dorée depuis elle, sinon en pluie
  //   d'étoiles filantes depuis le bord, et une onde douce s'étend à l'arrivée. Le journal sous le bandeau le reprend.
  const ACT_WIN=6*MIN,fxG=svg.querySelector('.mfx'),fxTop=svg.querySelector('.mtop'),actEl=rad.querySelector('.act');
  function readActivity(){
    const now=Date.now(),t0=now-ACT_WIN,msg=new Map(),rec=new Map(),fresh=new Map(),newU=new Map(); // newU : viewer -> présences toutes neuves (2 min)
    for(const m of Object.values(DB.minutes))if(m.t>=t0&&idx.has(m.c))msg.set(m.c,(msg.get(m.c)||0)+m.m);
    for(const c in curMin){const cm=curMin[c];if(cm&&cm.mt>=t0&&idx.has(c))msg.set(c,(msg.get(c)||0)+cm.m)} // minute en cours (mode « Ce navigateur »)
    for(const p of Object.values(DB.presence)){if(p.l<t0||!idx.has(p.c))continue;
      let s=rec.get(p.c);if(!s)rec.set(p.c,s=new Set());s.add(p.u);
      if(p.f>=t0){let f=fresh.get(p.c);if(!f)fresh.set(p.c,f=new Set());f.add(p.u)}
      if(p.f>=now-2*MIN){let a=newU.get(p.u);if(!a)newU.set(p.u,a=[]);a.push(p)}}
    // passages en direct : pour chaque première apparition récente chez B, la présence chez A qui la précède (même règle que flowsOf)
    const passes=[];if(newU.size){const prev=new Map();
      for(const p of Object.values(DB.presence))if(newU.has(p.u)&&idx.has(p.c)&&p.l>=now-3*HOUR-10*MIN){let a=prev.get(p.u);if(!a)prev.set(p.u,a=[]);a.push(p)}
      for(const [u,fresh2] of newU)for(const b of fresh2){if(!idx.has(b.c))continue;
        let best=null;for(const a of prev.get(u)||[]){if(a.c===b.c||a.f>=b.f)continue;const gap=b.f-a.l;if(gap<-10*MIN||gap>3*HOUR)continue;if(!best||a.l>best.l)best=a}
        if(!best)continue;const key=u+'|'+best.c+'|'+b.c+'|'+b.d;if(mapSeenPass.has(key))continue;passes.push({key,from:best.c,to:b.c})}}
    let total=0,sum=0;
    const ch=ids.map((c,i)=>{const perMin=(msg.get(c)||0)/(ACT_WIN/MIN),R=rec.get(c),nu=R?R.size:0;total+=perMin;
      const rate=perMin>0?Math.min(1.4,.12*Math.sqrt(perMin)):0;sum+=rate; // pulsations par seconde
      return {rate,pNew:nu?Math.min(.5,(fresh.has(c)?fresh.get(c).size:0)/nu):0}});
    if(sum>5)ch.forEach(x=>x.rate*=5/sum); // pas plus de 5 pulsations par seconde sur toute la carte
    const evs=(DB.events||[]).filter(e=>e.t>=now-2*MIN&&idx.has(e.c)&&/^(sub|gift|bits|raid)$/.test(e.type)&&!mapSeenEv.has(e.t+'|'+e.c+'|'+e.type));
    if(actEl)actEl.textContent=total>=.5?` · ${fmt(total)} msg/min`:' · calme';
    return {ch,evs,passes};
  }
  let act=readActivity(),actAt=performance.now(),Rt=liveR(),lastDraw=0; // Rt : taille visée de chaque icône (viewers actifs)
  // ---------- systèmes : les planètes tournent autour de leur étoile, les systèmes autour de Twitch ----------
  // Survoler une icône arrête toute la carte ; le système tenu à la main suit la souris. Les ceintures empêchent les
  // systèmes de se rattraper ; si deux se recouvrent quand même (déplacés à la main, cadre étroit), ils se contournent
  // d'un bloc, puis reviennent sur leur orbite ; deux icônes qui se croisent s'écartent un peu, puis reviennent sur leur
  // ellipse. Aucune ne passe sur le logo ni ne sort du cadre.
  function orbitStep(dt){
    // survolée, ou étoile (ou chaîne seule) tenue à la main : elle ne bouge pas, ce sont les autres qui la contournent
    const held=i=>ids[i]===hover||!!(drag&&drag.mode==='node'&&drag.ti===i),e=Math.min(1,dt*3),relax=Math.max(0,1-dt*.6);
    if(hover==null&&!mapView.sel&&!cfg.mapPause){ // sens inverse des aiguilles d'une montre, chaque ceinture à sa vitesse
      for(const i of BODY)mapAng.set(ids[i],angOf(i)-laneW[i]*dt);
      for(let i=0;i<n;i++)if(planet(i))mapKep.set(ids[i],(mapKep.get(ids[i])||0)-NM[i]*dt);
      pv++}
    // systèmes entiers : leur écart se résorbe lentement ; deux qui se recouvrent (à la même profondeur) s'écartent d'un bloc
    const relaxS=Math.max(0,1-dt*.35),eS=Math.min(1,dt*2);
    for(const i of BODY)if(!held(i)){sof[i].x*=relaxS;sof[i].y*=relaxS}
    const C=BODY.map(i=>{const p=view3(pt3(i),ID);return {i,x:p.x+sof[i].x,y:p.y+sof[i].y,z:p.z,r:bodyR(i)}}); // vue de face, quel que soit le globe
    // un système tenu à la main, puis un système placé à la main (épinglé), reste où il est : c'est l'autre qui s'écarte
    const fixd=i=>held(i)?2:pins[ids[i]]?1:0;
    for(let a=0;a<C.length;a++)for(let b=a+1;b<C.length;b++){const A=C[a],Bb=C[b],dx=Bb.x-A.x,dy=Bb.y-A.y,d=Math.hypot(dx,dy)||.01,m=A.r+Bb.r+8;
      if(d>=m||Math.abs(A.z-Bb.z)>.2)continue;
      const fa=fixd(A.i),fb=fixd(Bb.i),f=(m-d)*eS/d,wa=fa>fb?0:fb>fa?1:fa===2?0:.5,wb=fb>fa?0:fa>fb?1:fb===2?0:.5;
      sof[A.i].x-=dx*f*wa;sof[A.i].y-=dy*f*wa;sof[Bb.i].x+=dx*f*wb;sof[Bb.i].y+=dy*f*wb}
    for(let i=0;i<n;i++)if(!held(i)){off[i].x*=relax;off[i].y*=relax} // les écarts se résorbent : chacune revient sur son orbite
    // icônes : sur la vue de face (CP), jamais sur la vue tournée à la main
    const CP=ids.map((c,i)=>Can(i));
    for(let i=0;i<n;i++){const p=CP[i];
      for(let j=i+1;j<n;j++){const q=CP[j],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy)||.01,m=R[i]+R[j]+6;if(d>=m||Math.abs(p.z-q.z)>.2)continue; // l'une devant l'autre : elles se croisent sans se gêner
        const f=(m-d)*e/d,wi=held(i)?0:held(j)?1:.5,wj=1-wi;off[i].x-=dx*f*wi;off[i].y-=dy*f*wi;off[j].x+=dx*f*wj;off[j].y+=dy*f*wj}
      if(held(i))continue;
      const lx=p.x-CX,ly=p.y-CY,ld=Math.hypot(lx,ly)||.01,lm=R[i]+LOGO/2+12;if(ld<lm&&Math.abs(p.z)<.2){/* nettement devant ou derrière la planète Twitch, elle passe devant ou derrière elle */off[i].x+=lx/ld*(lm-ld)*e;off[i].y+=ly/ld*(lm-ld)*e}
      const m=R[i]+4;off[i].x+=(Math.min(Math.max(p.x,m),W-m)-p.x)*e;off[i].y+=(Math.min(Math.max(p.y,m),H-m)-p.y)*e}
  }

  // Balayage invisible (le faisceau n'est plus dessiné) : un tour toutes les 10 s. Quand il passe sur une chaîne,
  // un écho (anneau fin et pâle, à la couleur de son groupe) s'étend un peu et s'efface.
  const TURN=10000,ECHO=2200;
  // Tracé à l'apparition : quand on ouvre l'onglet ou qu'on change de période ou de langue (pas aux rafraîchissements
  // automatiques), les liens se dessinent du centre du radar vers l'extérieur, puis leur halo s'allume.
  // (un tracé en cours est repris si la carte se redessine pendant ce temps, par exemple une fois la police chargée)
  const introKey=period+'|'+(cfg.lang||'*')+'|'+view+(liveOnly?'|live':'')+'|'+gameSel+'|'+(view==='sel'?[...picked].sort().join(','):''),introOn=introKey!==mapIntroKey||performance.now()-mapIntroAt<2600;mapIntroKey=introKey;if(introOn)mapIntroAt=performance.now();
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return api;
  let intro=null;
  if(introOn){const far=Math.hypot(W,H)/2;intro={t0:null,delay:EC.map(c=>Math.min(1,Math.hypot((c.ax+c.bx)/2-CX,(c.ay+c.by)/2-CY)/far)*.9)};
    lines.forEach(l=>l.setAttribute('opacity',0));halos.forEach(l=>l.setAttribute('opacity',0))}
  const items=[],queue=[],vis=i=>+(G[i].style.opacity||1);
  const mkEl=(tag,attrs,parent)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);setA(e,attrs);parent.appendChild(e);return e};
  const ease=u=>u<.5?2*u*u:1-(-2*u+2)**2/2,f1=v=>v.toFixed(1),up=c=>c /* noms de chaîne tels quels : plus de capitales dans le journal */;
  const LIGHT='#c4b5fd',GOLD='#fcd28d',PINK='#f9a8d4',CRYSTAL='#c7d2fe',MONO=getComputedStyle(document.body).getPropertyValue('--mono');
  // halo de chaque chaîne : plus vif tant que son chat est animé, et un peu plus à chaque signal (hb, qui s'éteint en une seconde environ)
  const hb=new Float32Array(n),halo=parts.map(p=>p.glow||p.sun),haloV=new Float32Array(n).fill(-1);
  const slots=ids.map(()=>new Set()); // places des pastilles au-dessus de chaque chaîne (une nouvelle se pose au-dessus des autres)
  // onde fine autour d'une chaîne
  const wave=(i,now,col,R0,dur,al)=>{const c=mkEl('circle',{fill:'none',stroke:col,'stroke-width':1},fxG);
    items.push({el:c,t0:now,dur,upd:u=>{const s=S[i];setA(c,{cx:f1(s.x),cy:f1(s.y),r:f1(s.r+2+u*R0),'stroke-opacity':(al*(1-u)**2*vis(i)).toFixed(3)})}})};
  // reflet bref sur le bord de la chaîne j, du côté du point p d'où arrive une lumière
  const rimFlash=(j,now,p,col)=>{const a=mkEl('path',{fill:'none',stroke:col,'stroke-width':1.6,'stroke-linecap':'round'},fxG);hb[j]+=.2;
    items.push({el:a,t0:now,dur:550,upd:u=>{const s=S[j],an=Math.atan2(p.y-s.y,p.x-s.x),r=s.r+1.5;
      setA(a,{d:`M${f1(s.x+Math.cos(an-.55)*r)} ${f1(s.y+Math.sin(an-.55)*r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(s.x+Math.cos(an+.55)*r)} ${f1(s.y+Math.sin(an+.55)*r)}`,'stroke-opacity':(.75*(1-u)*vis(j)).toFixed(3)})}})};
  // comète : tête brillante et traîne qui suit un chemin (t de 0 à 1 -> point à l'écran) ; seul le bout traversé s'éclaire
  const comet=(now,dur,path,col,tail,head,op,end)=>{const g=mkEl('g',{},fxG),N=7,segs=[];
    for(let k=0;k<N;k++){const f=(k+1)/N;segs.push([mkEl('line',{stroke:col,'stroke-linecap':'round','stroke-width':f1(5+3*f)},g),mkEl('line',{stroke:col,'stroke-linecap':'round','stroke-width':(.4+f*head*.9).toFixed(2)},g),f])}
    const hd=mkEl('circle',{r:head,fill:'#fff',class:'mdot'},g);
    items.push({el:g,t0:now,dur,end,upd:u=>{const t=ease(u),o=op();let p0=path(Math.max(0,t-tail));
      for(const [gl,ln,f] of segs){const p1=path(Math.max(0,t-tail*(1-f))),xy={x1:f1(p0.x),y1:f1(p0.y),x2:f1(p1.x),y2:f1(p1.y)};
        setA(gl,{...xy,'stroke-opacity':(f*f*.08*o).toFixed(3)});setA(ln,{...xy,'stroke-opacity':(f*f*.55*o).toFixed(3)});p0=p1}
      setA(hd,{cx:f1(p0.x),cy:f1(p0.y),opacity:(.95*o).toFixed(2)})}})};
  // Lueur : petit point doux qui glisse le long d'un trait, dans le sens d'un passage (back : de b vers a). Elle suit le
  // trait qui tourne avec les orbites, et pâlit avec lui quand une autre chaîne est mise en avant.
  const glint=(ei,back)=>{const e=edges[ei],from=back?e.b:e.a,c=mkEl('circle',{r:3.2,fill:'url(#mapdot)'},fxG),ia=idx.get(e.a),ib=idx.get(e.b);
    items.push({el:c,t0:performance.now(),dur:2600,upd:u=>{const p=along(ei,from,u),f=u<.15?u/.15:u>.85?(1-u)/.15:1,B=EB[ei];
      setA(c,{cx:f1(p.x),cy:f1(p.y),opacity:(.8*f*(B&&!B.on?.12:1)*Math.min(vis(ia),vis(ib))).toFixed(3)})}})};
  // débit de chaque sens (lueurs par seconde) : 0,75 pour le sens le plus fréquenté de la carte, le reste au prorata ;
  // au plus 6 par seconde sur toute la carte. TA : compteurs (deux par trait : a→b, puis b→a).
  const TR=new Float32Array(edges.length*2),TA=new Float32Array(edges.length*2);
  {const mP=Math.max(1,...edges.flatMap(e=>[passN(e.a,e.b),passN(e.b,e.a)]));edges.forEach((e,i)=>{TR[2*i]=.75*passN(e.a,e.b)/mP;TR[2*i+1]=.75*passN(e.b,e.a)/mP});
    const tot=TR.reduce((s,x)=>s+x,0);if(tot>6)for(let k=0;k<TR.length;k++)TR[k]*=6/tot;
    for(let k=0;k<TA.length;k++)TA[k]=Math.random()} // départs décalés : les lueurs ne partent pas toutes ensemble
  // passages arrivés presque ensemble : une seule ligne de journal (« PASSAGES · 2 × A → B · C → D »)
  const pend=new Map();let pendT=0;
  const notePassage=(a,b)=>{const k=a+'>'+b;pend.set(k,(pend.get(k)||0)+1);clearTimeout(pendT);pendT=setTimeout(()=>{
    const all=[...pend],many=all.length>1||all[0][1]>1,parts=all.slice(0,2).map(([k,nn])=>{const [x,y]=k.split('>');return `${nn>1?nn+' × ':''}${up(x)} → ${up(y)}`});pend.clear();
    journal(`Passage${many?'s':''} · ${parts.join(' · ')}${all.length>2?' · …':''}`);
    const t=Date.now();for(const [k,nn] of all.reverse()){const [from,to]=k.split('>');mapPassLog.unshift({t,from,to,n:nn})}mapPassLog.length=Math.min(mapPassLog.length,5);
    notify({log:mapPassLog.map(x=>({...x}))})},400)};
  // pastille au-dessus d'une chaîne, dans le style des noms : icône colorée, puis le nombre ou le montant
  const pill=(i,now,icon,icol,text,dur=2800)=>{let slot=0;while(slots[i].has(slot))slot++;slots[i].add(slot);
    const str=(icon?icon+' ':'')+text,w=textWidth(str,500,MONO,10)+18,h=19,g=mkEl('g',{class:'mpill'},fxTop);
    mkEl('rect',{x:f1(-w/2),y:-h,width:f1(w),height:h,rx:h/2},g);const tx=mkEl('text',{x:f1(-w/2+9),y:-5.6},g);
    if(icon)mkEl('tspan',{fill:icol},tx).textContent=icon+' ';mkEl('tspan',{},tx).textContent=text;
    items.push({el:g,t0:now,dur,end:()=>slots[i].delete(slot),upd:u=>{const s=S[i],a=u<.08?u/.08:u>.78?(1-u)/.22:1,rise=(1-(1-Math.min(1,u/.12))**3)*6;
      setA(g,{transform:`translate(${f1(s.x)} ${f1(s.y-s.r-8-rise-slot*23)})`,opacity:(a*.96*Math.max(.35,vis(i))).toFixed(3)})}})};
  // étincelles (petites croix) : elles montent en s'écartant, ou font un tour de la planète (subs offerts)
  const sparks=(i,now,cnt,orbit,col,dur)=>{const g=mkEl('g',{},fxTop),P=[];
    for(let k=0;k<cnt;k++)P.push([mkEl('path',{d:'M-1.6 0H1.6M0 -1.6V1.6',stroke:col,'stroke-width':.9,'stroke-linecap':'round'},g),Math.random()*2*Math.PI,.6+Math.random()*.8,k]);
    items.push({el:g,t0:now,dur,upd:u=>{const s=S[i],o=((1-u)*.85*vis(i)).toFixed(3);
      for(const [e,a0,sp,k] of P){const a=orbit?a0+u*2*Math.PI*.9:a0,d=orbit?s.r+7+k%3*3:s.r+4+u*16*sp;setA(e,{transform:`translate(${f1(s.x+Math.cos(a)*d)} ${f1(s.y+Math.sin(a)*d-(orbit?0:u*10))})`,'stroke-opacity':o})}}})};
  // éclats de cristal (bits) : projetés autour de la planète, d'autant plus nombreux que le montant est gros
  const shards=(i,now,cnt)=>{const g=mkEl('g',{},fxTop),P=[];
    for(let k=0;k<cnt;k++)P.push([mkEl('path',{d:'M0 -2.6L1.6 0L0 2.6L-1.6 0Z',fill:CRYSTAL},g),Math.random()*2*Math.PI,16+Math.random()*16,Math.random()*360]);
    items.push({el:g,t0:now,dur:1300,upd:u=>{const s=S[i],e=1-(1-u)**3,o=((1-u)*.9*vis(i)).toFixed(3);
      for(const [el,a,d,rot] of P)setA(el,{transform:`translate(${f1(s.x+Math.cos(a)*(s.r+e*d))} ${f1(s.y+Math.sin(a)*(s.r+e*d)+u*u*6)}) rotate(${(rot+u*170).toFixed(0)})`,opacity:o})}})};
  // nouveau viewer du jour : un grain de lumière arrive en spirale et se fond dans la planète
  const arrive=(i,now)=>{const th=Math.random()*2*Math.PI,e=mkEl('path',{d:'M-1.6 0H1.6M0 -1.6V1.6',stroke:'#fff','stroke-width':1,'stroke-linecap':'round'},fxTop);
    items.push({el:e,t0:now,dur:1000,end:t=>wave(i,t,'#e9e4ff',5,500,.5),upd:u=>{const s=S[i],k=1-(1-u)**2,a=th+.9*k,d=s.r+26*(1-k);
      setA(e,{transform:`translate(${f1(s.x+Math.cos(a)*d)} ${f1(s.y+Math.sin(a)*d)})`,'stroke-opacity':((u<.2?u/.2:1)*.9*vis(i)).toFixed(3)})}})};
  // journal sous le bandeau : le dernier événement, quelques secondes
  let logT=0;const journal=txt=>{const el=rad.querySelector('.radar-log');if(!el)return;const hud=rad.querySelector('.radar-hud');if(hud)el.style.top=(hud.offsetTop+hud.offsetHeight+6)+'px'; /* le bandeau a pu passer sur 2 lignes depuis */el.textContent=txt;el.classList.add('on');clearTimeout(logT);logT=setTimeout(()=>el.classList.remove('on'),4500)};
  // raid : comète dorée depuis la chaîne qui raide si elle est sur la carte, sinon pluie d'étoiles filantes depuis le bord ;
  // à l'arrivée, une onde douce et la pastille
  const raid=(i,now,nV,from)=>{const fi=from&&idx.has(from)?idx.get(from):-1,label=`Raid${nV?' · '+fmt(nV):''}${from?' · de '+from:''}`;
    const land=t=>{wave(i,t,GOLD,48,1400,.55);hb[i]+=.5;pill(i,t,'','',label,3400)};
    if(fi>=0&&fi!==i)comet(now,1700,t=>{const A=S[fi],Bp=S[i],dx=Bp.x-A.x,dy=Bp.y-A.y;return bz({ax:A.x,ay:A.y,bx:Bp.x,by:Bp.y,cx:(A.x+Bp.x)/2-dy*.25,cy:(A.y+Bp.y)/2+dx*.25},t)},GOLD,.35,2.4,()=>Math.min(vis(fi),vis(i)),land);
    else{const th=Math.random()*2*Math.PI,g=mkEl('g',{},fxG),st=[];
      for(let k=0;k<6;k++)st.push([[0,1,2].map(m=>mkEl('line',{stroke:GOLD,'stroke-width':1.4-m*.3,'stroke-linecap':'round'},g)),th+(Math.random()-.5)*.5,170+Math.random()*60,Math.random()*.25]);
      items.push({el:g,t0:now,dur:1600,end:land,upd:u=>{const s=S[i];
        for(const [L,a,d,dl] of st){const v=Math.max(0,Math.min(1,(u-dl)/(1-dl))),D=s.r+d*(1-v*v),x=s.x+Math.cos(a)*D,y=s.y+Math.sin(a)*D,tx=Math.cos(a)*22,ty=Math.sin(a)*22,o=v>0?(1-v*.3)*vis(i):0;
          L.forEach((l,m)=>setA(l,{x1:f1(x+tx*m/3),y1:f1(y+ty*m/3),x2:f1(x+tx*(m+1)/3),y2:f1(y+ty*(m+1)/3),'stroke-opacity':(o*(.9-m*.3)).toFixed(3)}))}}})}
    journal(`Raid${from?' de '+up(from):''} → ${up(ids[i])}${nV?' · '+fmt(nV):''}`)};
  function fire(i,now,kind,o={}){
    if(kind==='msg'||kind==='new'){
      if(kind==='msg'){hb[i]+=.32;wave(i,now,LIGHT,9,700,.4)}else arrive(i,now);
      return}
    if(kind==='pass'){const j=o.from;if(j==null||j===i)return;const ei=eIdx.get(ids[j]+'>'+ids[i]);notePassage(ids[j],ids[i]);
      if(ei!=null)comet(now,1150,t=>along(ei,ids[j],t),'#ffffff',.24,2.1,()=>Math.min(vis(i),vis(j)),t=>{rimFlash(i,t,along(ei,ids[j],.9),'#ffffff');wave(i,t,'#ffffff',12,800,.45)});
      else comet(now,1500,t=>{const A=S[j],Bp=S[i],dx=Bp.x-A.x,dy=Bp.y-A.y;return bz({ax:A.x,ay:A.y,bx:Bp.x,by:Bp.y,cx:(A.x+Bp.x)/2-dy*.3,cy:(A.y+Bp.y)/2+dx*.3},t)},LIGHT,.2,1.5,()=>.5*Math.min(vis(i),vis(j)),t=>wave(i,t,LIGHT,10,700,.35));
      return}
    if(kind==='sub'||kind==='gift'){const nn=kind==='gift'?Math.max(1,o.n||1):1;hb[i]+=.25;
      pill(i,now,'♥',PINK,kind==='gift'?`${fmt(nn)} offert${nn>1?'s':''}`:'Abonné');sparks(i,now,kind==='gift'?Math.min(14,nn):6,kind==='gift',PINK,2200);
      journal(kind==='gift'?`♥ ${fmt(nn)} sub${nn>1?'s':''} offert${nn>1?'s':''} · ${up(ids[i])}`:`♥ Abonnement · ${up(ids[i])}`);return}
    if(kind==='bits'){const nn=Math.max(1,o.n||1);hb[i]+=.2;pill(i,now,'◆',CRYSTAL,`${fmt(nn)} bits`);shards(i,now,Math.max(3,Math.min(12,Math.round(Math.log10(nn)*3))));
      journal(`◆ ${fmt(nn)} bits · ${up(ids[i])}`);return}
    if(kind==='raid')raid(i,now,o.n||0,o.from||'')
  }
  // un événement compte comme « montré » quand il s'affiche (fire), pas quand il est programmé : si la carte se redessine
  // entre-temps (rafraîchissement, fenêtre agrandie), il est reprogrammé au lieu d'être perdu
  const schedule=now=>{for(const e of act.evs){const key=e.t+'|'+e.c+'|'+e.type;if(queue.some(q=>q.key===key))continue;
    queue.push({at:now+Math.random()*4000,i:idx.get(e.c),kind:e.type,n:e.n,from:e.from,key})}
    for(const p of act.passes||[]){if(queue.some(q=>q.key===p.key))continue;queue.push({at:now+Math.random()*4000,i:idx.get(p.to),kind:'pass',from:idx.get(p.from),key:p.key,pass:1})}};
  let last=performance.now();schedule(last);
  const loop=now=>{
    if(!svg.isConnected||tab!=='map'){radarRaf=0;return}
    const dt=Math.min((now-last)/1000,.1);last=now;
    if(now-actAt>10000){act=readActivity();actAt=now;schedule(now);Rt=liveR()}
    for(let i=0;i<n;i++)R[i]+=(Rt[i]-R[i])*Math.min(1,dt*1.5); // la taille suit en douceur un changement de période ou de filtre
    if(spin){spinGlobe(spin.x*dt,spin.y*dt);const k=Math.exp(-dt*2.6);spin.x*=k;spin.y*=k;if(Math.hypot(spin.x,spin.y)<.03)spin=null;touch()} // élan du globe
    // environ 30 images par seconde suffisent à une dérive lente. En pause, si rien ne bouge (ni survol, ni geste, ni élan, ni
    // intro, ni animation, ni taille qui se règle) et que l'état est celui de la dernière image, on ne repeint pas : mesuré avant
    // ce changement, la carte réécrivait environ 7 000 attributs par seconde même arrêtée.
    orbitStep(dt);
    const sig=hover+'|'+mapView.sel+'|'+mapView.k+'|'+mapView.tx+'|'+mapView.ty+'|'+mapView.rot+'|'+mapView.q.join(',')+'|'+pv+'|'+mapGlobeOn;
    const idle=cfg.mapPause&&!drag&&!spin&&!intro&&!items.length&&sig===drawnSig&&!R.some((r,i)=>Math.abs(Rt[i]-r)>.01);
    if(now-lastDraw>33&&!idle){lastDraw=now;drawnSig=sig;draw()}
    const A=(now%TURN)/TURN*360;
    for(let i=0;i<n;i++){const s=S[i],p=parts[i].ping,age=((A-s.a+360)%360)/360*TURN;
      if(age<ECHO){const u=age/ECHO;setA(p,{cx:s.x.toFixed(1),cy:s.y.toFixed(1),r:(s.r+3+u*9).toFixed(1),'stroke-opacity':(.22*(1-u)*(1-u)).toFixed(3)});p.dataset.on='1'}
      else if(p.dataset.on){p.setAttribute('stroke-opacity','0');p.dataset.on=''}}
    act.ch.forEach((c,i)=>{if(c.rate&&Math.random()<c.rate*dt)fire(i,now,Math.random()<c.pNew?'new':'msg')});
    for(let q=queue.length-1;q>=0;q--)if(queue[q].at<=now){const e=queue.splice(q,1)[0];(e.pass?mapSeenPass:mapSeenEv).add(e.key);fire(e.i,now,e.kind,e)}
    // trafic de la période : lueurs le long des traits, dans chaque sens, au rythme des passages mesurés (arrêtées par la pause)
    if(!cfg.mapPause)for(let k=0;k<TA.length;k++){if(!TR[k])continue;TA[k]+=TR[k]*dt;if(TA[k]>=1){TA[k]-=1;glint(k>>1,k&1)}}
    // halos : plus vifs tant que le chat est animé (jusqu'à 0,7 pulsation par seconde) et un instant à chaque signal ;
    // la chaîne survolée ou choisie garde le halo plein du style
    const hk=Math.exp(-dt*2.5);
    for(let i=0;i<n;i++){hb[i]*=hk;const el=halo[i];if(!el)continue;
      const lvl=Math.min(1,act.ch[i].rate/.7),focus=ids[i]===hover||ids[i]===mapView.sel,v=focus?1:Math.min(1,(parts[i].sun?.8+.2*lvl:.85*(.78+.3*lvl))+hb[i]*(parts[i].sun?.6:1));
      if(Math.abs(v-haloV[i])>.01){haloV[i]=v;el.style.opacity=v.toFixed(2)}}
    for(let q=items.length-1;q>=0;q--){const it=items[q],u=(now-it.t0)/it.dur;if(u>=1){it.el.remove();items.splice(q,1);if(it.end)it.end(now)}else it.upd(u)}
    if(intro){if(intro.t0==null)intro.t0=now;const t=(now-intro.t0)/1000;
      if(t>2.6){[...lines,...cases].forEach(l=>{l.removeAttribute('opacity');l.removeAttribute('stroke-dasharray');l.removeAttribute('stroke-dashoffset')});halos.forEach(l=>l.removeAttribute('opacity'));intro=null}
      else lines.forEach((l,i)=>{const d=intro.delay[i],u=Math.max(0,Math.min(1,(t-d)/.9)),L=l.getTotalLength();
        const da={opacity:u>0?1:0,'stroke-dasharray':L.toFixed(1),'stroke-dashoffset':(L*(1-u)**3).toFixed(1)};setA(l,da);setA(cases[i],da); /* le liseré se trace avec son trait */halos[i].setAttribute('opacity',Math.max(0,Math.min(1,(t-d-.6)/.6)).toFixed(2))})}
    radarRaf=requestAnimationFrame(loop)};
  radarRaf=requestAnimationFrame(loop);
  return api};
  send();
}

/* ---------- rendus des onglets ---------- */

// Chaînes en live d'abord, de la plus regardée à la moins regardée, puis les autres dans l'ordre de la liste
function liveFirst(list){const L=c=>!!(info[c]&&info[c].live);
  return [...list.filter(L).sort((a,b)=>(info[b].v||0)-(info[a].v||0)),...list.filter(c=>!L(c))]}
// Bloc « Recoupements » de la Vue d'ensemble : paires les plus proches, trajets les plus fréquents, dernier raid.
// Même période que le reste de la page ; les paires sont limitées aux 25 chaînes les plus actives (300 paires, ~35 ms au pire mesuré ; toutes les 100 = 360 ms, trop pour un rendu toutes les 5 s).
// Une paire n'est retenue qu'à partir de PAIR_MIN viewers actifs en commun : classées par part commune, deux petites chaînes
// avec 1 viewer commun sur 3 passaient devant tout le monde (et la phrase d'accroche annonçait « 1 viewers actifs »).
const PAIR_MAX=25,PAIR_MIN=10;
function recoupData(q,users,flows){
  const keys=shown().filter(c=>users.get(c)&&users.get(c).size);
  const pairs=keys.length>1?pairsOf(users,keys,PAIR_MAX).filter(p=>p.n>=PAIR_MIN).slice(0,3):[];
  const top=flows.slice(0,3).map(f=>({from:who(f.a),to:who(f.b),n:f.n,gap:f.gaps.length?dur(median(f.gaps)):''}));
  const r=q.events.filter(e=>e.type==='raid').sort((a,b)=>b.t-a.t)[0];
  if(r&&r.from)loadAvatars([String(r.from).toLowerCase()]);
  return {channels:keys.length,period,pairMax:PAIR_MAX,pairMin:PAIR_MIN,pairs:pairs.map(p=>({a:p.a,b:p.b,n:p.n,j:p.j})),flows:top,
    raid:r?{from:r.from?{...who(String(r.from).toLowerCase()),name:String(r.from)}:null,to:who(r.c),n:r.n||0,ago:ago(r.t),when:when(r.t)}:null}}

// Phase 3 : Top Streamers - analyse des viewers, heures de stream, croissance
function topStreamersData(q){
  // Indexer les viewers snapshot par chaîne
  const viewersByChan={};
  for(const s of q.snaps){
    if(!s.live) continue;
    if(!viewersByChan[s.c]) viewersByChan[s.c]=[];
    viewersByChan[s.c].push(s.v);
  }

  // Calculer les heures de stream par chaîne
  const hoursByChan={},snapTimesByChan={};
  for(const s of q.snaps){
    if(!s.live) continue;
    if(!snapTimesByChan[s.c]) snapTimesByChan[s.c]=[];
    snapTimesByChan[s.c].push(s.t);
  }

  for(const c in snapTimesByChan){
    const times=snapTimesByChan[c].sort((a,b)=>a-b);
    if(times.length<2){
      hoursByChan[c]=0.5;
    } else {
      const durationMin=(times[times.length-1]-times[0])/60000;
      hoursByChan[c]=durationMin/60;
    }
  }

  // Calculer les messages par chaîne
  const msgByChan={};
  for(const m of q.mins){
    msgByChan[m.c]=(msgByChan[m.c]||0)+m.m;
  }

  // Calculer les jours actifs par chaîne
  const daysByChan={};
  for(const p of q.pres){
    if(!daysByChan[p.c]) daysByChan[p.c]=new Set();
    daysByChan[p.c].add(p.d); // une présence porte déjà son jour (p.d), pas d'horodatage

  }

  const shownList=shown();

  const rows=[];
  for(const c of shownList){
    const views=viewersByChan[c]||[];
    const avgV=views.length>0?views.reduce((a,b)=>a+b,0)/views.length:info[c]?.v||0;
    const peakV=views.length>0?Math.max(...views):info[c]?.v||0;
    const hours=hoursByChan[c]||0;
    const totalMsgs=msgByChan[c]||0;
    const activeDays=daysByChan[c]?.size||0;

    // Croissance des followers entre le premier et le dernier relevé d'état de la chaîne (au moins 20 h d'écart, comme followersData).
    // Avant le 26/11 elle comparait les subs du premier et du dernier jour (une chaîne passant de 1 à 1790 subs affichait 179000 %).
    // growthBase : followers au premier relevé, la base du pourcentage (le tableau de bord n'affiche rien sous 100).
    let growth=null,growthBase=null;
    const fa=metaList(c).filter(x=>x.fol!=null);
    if(fa.length>=2&&fa[fa.length-1].t-fa[0].t>=20*HOUR){
      growthBase=fa[0].fol;
      if(growthBase>0)growth=(fa[fa.length-1].fol-growthBase)/growthBase*100;
    }

    rows.push({
      ...who(c),
      viewers: Math.round(avgV),
      peakViewers: Math.round(peakV),
      hours: Math.round(hours*10)/10,
      growth: growth,
      growthBase: growthBase,
      avgMsgPerMin: activeDays>0?Math.round(totalMsgs/(activeDays*60*2)):0,
      activeDays: activeDays
    });
  }

  return rows.filter(r=>r.viewers>0).sort((a,b)=>b.viewers-a.viewers);
}

// Phase 3 : Communautés Investies - taux d'interaction, subs, bits, raids
function investedCommunitiesData(q){
  const viewersByChan={},interactionsByChan={},minutesByChan={};

  // Indexer les viewers snapshot (max par chaîne)
  for(const s of q.snaps){
    if(!s.live) continue;
    if(!viewersByChan[s.c] || s.v>viewersByChan[s.c]){
      viewersByChan[s.c]=s.v;
    }
  }

  // Compter les minutes avec interactions
  for(const m of q.mins){
    if(!minutesByChan[m.c]) minutesByChan[m.c]={total:0,withInteractions:0};
    minutesByChan[m.c].total+=1;
    if(m.r>0 || m.h>0 || m.n>0 || m.q>0){
      minutesByChan[m.c].withInteractions+=1;
    }
  }

  // Indexer les interactions par chaîne
  for(const e of q.events){
    if(!interactionsByChan[e.c]){
      interactionsByChan[e.c]={react:0,inter:0,total:0};
    }

    if(e.type==='sub' || e.type==='gift'){
      interactionsByChan[e.c].inter+=e.n;
    } else if(e.type==='bits'){
      interactionsByChan[e.c].react+=e.n;
    } else if(e.type==='raid'){
      interactionsByChan[e.c].inter+=e.n||0;
    }
  }

  const shownList=shown();
  const rows=[];

  for(const c of shownList){
    const v=viewersByChan[c]||0;
    const intData=interactionsByChan[c]||{react:0,inter:0,total:0};

    const subs=q.events.filter(e=>e.c===c&&(e.type==='sub'||e.type==='gift')).reduce((s,e)=>s+e.n,0);
    const bits=q.events.filter(e=>e.c===c&&e.type==='bits').reduce((s,e)=>s+e.n,0);
    const raidsRecv=q.events.filter(e=>e.c===c&&e.type==='raid').length;
    const raidsViewers=q.events.filter(e=>e.c===c&&e.type==='raid').reduce((s,e)=>s+(e.n||0),0);

    const interactions=intData.inter;
    const interactionRate=v>0?(interactions/v)*100:null;
    const subsRate=v>0?(subs/v)*100:null;
    const bitsRate=v>0?(bits/v)*100:null;

    rows.push({
      ...who(c),
      viewers: v,
      interactions: interactions,
      interactionRate: interactionRate,
      subs: subs,
      subsRate: subsRate,
      bits: bits,
      bitsRate: bitsRate,
      raidsReceived: raidsRecv,
      raidsViewers: raidsViewers
    });
  }

  return rows.filter(r=>r.viewers>0 || r.interactions>0).sort((a,b)=>(b.interactions||0)-(a.interactions||0));
}

// Vue d'ensemble : l'ancien code calcule, React affiche (événement « legacy:overview », voir app/src/legacy/bridge.ts).
function renderOverview(q){
  const users=usersBy(q.pres,p=>p.c),allU=new Set(q.pres.map(p=>p.u)),now=Date.now();
  const msgs=q.mins.reduce((s,m)=>s+m.m,0);const {multi,flows}=flowsOf(q.pres);
  const subs=q.events.filter(e=>e.type==='sub'||e.type==='gift').reduce((s,e)=>s+e.n,0);
  const tr=msgTrend(q.mins);
  const kpis=[{label:'Viewers actifs uniques',value:fmt(allU.size),hint:'toutes chaînes, ont écrit au moins un message'},
    {label:'Messages',value:fmt(msgs),trend:tr.trend,trendLabel:tr.label,hint:'au total'},
    {label:'Actifs dans 2 chats ou plus',value:fmt(multi),hint:allU.size?pct(multi/allU.size)+' du total':''},
    {label:'Abonnements et subs offerts',value:fmt(subs)}]; // le temps d'écoute ignore la période : il est dans le détail de la pilule d'état (statusOf)
  // viewers qui ont écrit depuis le début du live en cours (et pas sur toute la période choisie, qui peut faire 30 jours) :
  // on les compare à la moyenne des viewers depuis le début du live, et pas aux viewers du moment : sur un long live
  // (marathon de 24 h), l'audience tourne et chute en fin de live, et le rapport dépassait 100 %.
  const liveU=new Map();for(const p of Object.values(DB.presence)){const I=info[p.c];if(I&&I.live&&I.since&&p.l>=I.since){let s=liveU.get(p.c);if(!s)liveU.set(p.c,s=new Set());s.add(p.u)}}
  const liveAvgV=c=>{const I=info[c],vs=DB.snaps.filter(s=>s.c===c&&s.live&&s.t>=I.since);return vs.length?vs.reduce((s,x)=>s+x.v,0)/vs.length:I.v};
  const channels=liveFirst(shown()).map(c=>{const I=info[c]||{},U=users.get(c);
    return {...who(c),langs:langsOf(c),live:I.live===true?true:I.live===false?false:null,game:I.live?I.g||'':'',title:I.live?I.ti||'':'',
      viewers:I.live?I.v:null,uniq:U?U.size:0,msgs:q.mins.filter(m=>m.c===c).reduce((s,m)=>s+m.m,0),
      recent:liveData()?q.mins.filter(m=>m.c===c&&m.t>=now-5*MIN).reduce((s,m)=>s+m.m,0)/5:null,
      wrote:I.live&&I.v&&liveU.has(c)?liveU.get(c).size/liveAvgV(c):null}});
  const part=!hasApi()?null:shown().map(c=>({c,p:participation(q,c),k:kindsOf(q,[c])})).filter(x=>x.p&&x.p.liveMin>=10).sort((a,b)=>b.p.perMin-a.p.perMin)
    .map(({c,p,k})=>{const n=ktot(k);return {...who(c),limited:chatLimitLbl(c,q.t0),avgV:p.avgV,perMin:p.perMin,msgK:p.msgK,uniq:p.uniq,react:n?ksum(k,REACT)/n:null,inter:n?ksum(k,INTER)/n:null}});
  const msgBy=new Map();for(const m of q.mins)msgBy.set(m.c,(msgBy.get(m.c)||0)+m.m);
  const withMsg=shown().filter(c=>msgBy.get(c)>0);
  const top=(withMsg.length?withMsg:liveFirst(shown())).sort((a,b)=>(msgBy.get(b)||0)-(msgBy.get(a)||0)).slice(0,8);
  const chartOf={shown:top.length,total:shown().length};
  const msgChart=lineSpec(top.map(c=>({name:c,c,color:colorOf(c),pts:minuteSeries(q.mins,c,'m')})),{unit:' msg/min',gaps:listenGaps(top,q.t0)});
  const viewerChart=hasApi()?lineSpec(top.map(c=>({name:c,c,color:colorOf(c),pts:viewerSeries(q.snaps,c)})),{unit:' viewers'}):null;
  $('t-overview').innerHTML='';
  const topStreamers=topStreamersData(q);
  const investedCommunities=investedCommunitiesData(q);
  window.dispatchEvent(new CustomEvent('legacy:overview',{detail:{kpis,channels,recoup:recoupData(q,users,flows),hasApi:hasApi(),chartOf,part,followers:followersData(q),brand:brandData(q),mod:modData(q),msgChart,viewerChart,topStreamers,investedCommunities}}));
}

// Onglet « Par chaîne » : l'ancien code calcule, React affiche (événement « legacy:channel », voir app/src/legacy/bridge.ts).
const nn=x=>typeof x==='number'&&isFinite(x)?x:null; // NaN et Infinity deviennent null pour React
const when=t=>dayLbl(t)+' '+hhmm(t);
// tendance des messages pour une mini-courbe : par heure sur 2 jours ou moins, sinon par jour (60 points au plus)
function msgTrend(mins){
  const now=Date.now(),tMin=mins.length?minOf(mins,m=>m.t):now,step=now-tMin<=2*DAY?HOUR:DAY,nB=Math.min(60,Math.floor((now-tMin)/step)+1),b0=now-nB*step,trend=Array(nB).fill(0);
  let tot=0;for(const m of mins){const i=Math.floor((m.t-b0)/step);if(i>=0&&i<nB){trend[i]+=m.m;tot+=m.m}}
  return nB>=3&&tot?{trend,label:step===HOUR?'courbe par heure':'courbe par jour'}:{trend:null,label:''}}
function momentsData(list){return list.map(p=>{const kn=ktot(p.k);return {...who(p.c),t:p.t,when:when(p.t),game:p.g||'',m:p.m,score:p.score,
  wave:kn?(p.k.va||0)/kn:null,mood:moodOf(p)||'',emote:p.e&&p.e[0]?p.e[0][0]:'',vod:vodLink(p.c,p.t)}})}
// null : aucun clip relevé ; sinon chiffres et les 12 clips les plus vus que le chat couvre
function clipsData(q,chans){
  const all=(q.clips||[]).filter(k=>chans.includes(k.c));if(!all.length)return null;
  const st=clipStats(q,chans),sc=st.filter(x=>isFinite(x.score)),hit=sc.filter(x=>x.score>=2.5).length;
  return {total:all.length,exact:all.filter(k=>k.ex).length,comparable:sc.length,hitRate:sc.length?hit/sc.length:null,medianScore:sc.length?median(sc.map(x=>x.score)):null,
    rows:[...st].sort((a,b)=>b.v-a.v).slice(0,12).map(x=>({...who(x.c),id:x.id,when:when(x.ts),exact:!!x.ex,title:x.ti||'',views:x.v,m:x.m,score:nn(x.score),wave:nn(x.va)}))}}
// bandeau d'une chaîne (onglets Par chaîne et Chat)
function chHead(c){const I=info[c]||{};
  return {...who(c),langs:langsOf(c),live:I.live===true?true:I.live===false?false:null,game:I.live?I.g||'':'',title:I.live?I.ti||'':'',viewers:I.live?nn(I.v):null,since:I.live&&I.since?hhmm(I.since):''}}
function renderChannel(q){
  const el=$('t-channel'),sh=shown(),allChans=cfg.chans;let c=selChan;
  // Fix: initialiser selChan si pas de chaîne sélectionnée
  // Priorité : shown() (filtre langue), sinon cfg.chans directement si le filtre n'est pas encore applicable
  if(!c&&sh.length){c=liveFirst(sh)[0];selChan=c}
  else if(!c&&allChans.length){c=allChans[0];selChan=c}
  el.innerHTML='';
  if(!c){window.dispatchEvent(new CustomEvent('legacy:channel',{detail:null}));return}
  const pres=q.pres.filter(p=>p.c===c),U=new Set(pres.map(p=>p.u)),mins=q.mins.filter(m=>m.c===c),ev=q.events.filter(e=>e.c===c);
  const msgs=mins.reduce((s,m)=>s+m.m,0),activeMin=mins.length;
  const days=new Map();for(const p of pres){let s=days.get(p.u);if(!s)days.set(p.u,s=new Set());s.add(p.d)}
  const loyal=[...days.values()].filter(s=>s.size>=2).length,nDays=new Set(pres.map(p=>p.d)).size;
  const sum=t=>ev.filter(e=>e.type===t).reduce((s,e)=>s+e.n,0),cnt=t=>ev.filter(e=>e.type===t).length;
  const vs=q.snaps.filter(s=>s.c===c&&s.live),avgV=vs.length?vs.reduce((s,x)=>s+x.v,0)/vs.length:NaN,peakV=vs.length?maxOf(vs,s=>s.v):NaN;
  const perUser=new Map();for(const p of pres)perUser.set(p.u,(perUser.get(p.u)||0)+p.n);
  // numérateur et dénominateur pris dans les présences : le détail par minute est gardé moins longtemps (14 j contre 21 ou 60),
  // et sur « 30 jours » ou « Tout » le rapport pouvait dépasser 100 %
  const counts=[...perUser.values()].sort((a,b)=>b-a),presMsgs=counts.reduce((s,x)=>s+x,0),top10=presMsgs?counts.slice(0,Math.ceil(counts.length*.1)).reduce((s,x)=>s+x,0)/presMsgs:NaN;
  const I=info[c]||{},p=participation(q,c),k=kindsOf(q,[c]),kn=ktot(k),L=metaLast(c),fol=L&&L.fol!=null?L.fol:null,tr=msgTrend(mins);
  const K=(label,value,hint='',extra={})=>({label,value,hint,...extra});
  const main=[
    K('Viewers actifs uniques',fmt(U.size)),
    K('Messages',fmt(msgs),activeMin?fmt1(msgs/activeMin)+' msg/min en moyenne':'',{trend:tr.trend,trendLabel:tr.label}),
    K('Viewers en moyenne',isFinite(avgV)?fmt(avgV):'—',isFinite(peakV)?'pic : '+fmt(peakV):''),
    K('Écrivent chaque minute',p?pct(p.perMin):'—',p?fmt1(p.msgK)+' msg/min pour 1\u00a0000 viewers':'pendant les lives, API Twitch requise'),
    K('Followers',fol!=null?fmt(fol):'—',fol!=null?(isFinite(avgV)?pct(avgV/fol)+' en moyenne devant le live':''):'relevé par le collecteur 1.2')];
  const modOk=isFinite(modStart(['ban','timeout','clear'])),delOk=isFinite(modStart(['del'])),nb=sum('ban'),nt=sum('timeout');
  const more=[
    K('Interactions',kn?pct(ksum(k,INTER)/kn):'—',kn?`${pct(ksum(k,REACT)/kn)} de réactions · détail dans l'onglet Chat`:'tri des messages : collecteur 1.1'),
    K('Viewers actifs fidèles',nDays>=2?pct(loyal/U.size):'—',nDays>=2?'revenus sur 2 jours ou plus':'il faut au moins 2 jours de données'),
    K('Messages du top 10 %',isFinite(top10)?pct(top10):'—','concentration du chat'),
    K('Premiers messages',fmt(sum('first')),'nouveaux venus dans le chat'),
    K('Abonnements',fmt(sum('sub')+sum('gift')),`dont ${fmt(sum('gift'))} offerts`),
    K('Bits',fmt(sum('bits'))),
    K('Raids reçus',fmt(cnt('raid')),cnt('raid')?fmt(sum('raid'))+' viewers apportés':''),
    modOk?K('Bans et timeouts',fmt(nb+nt),`${fmt(nb)} ban${nb>1?'s':''} · ${fmt(nt)} timeout${nt>1?'s':''}${sum('clear')?' · chat vidé '+fmt(sum('clear'))+' fois':''}`):K('Bans et timeouts','—','relevés par le collecteur 1.6'),
    delOk?K('Messages supprimés',fmt(sum('del')),'par un modérateur ou un bot'):K('Messages supprimés','—','relevés par le collecteur 1.6.1')];
  if(L)more.push(K('Pub déclarée',L.br?'Oui':'Non',chatModeLbl(L.cs)||'chat sans restriction'));
  const by=usersBy(q.pres,p=>p.c),also=[];for(const [x,S] of by){if(x===c)continue;const n=sharedCount(U,S);if(n)also.push({...who(x),share:U.size?n/U.size:0,n})}
  also.sort((a,b)=>b.share-a.share);
  const gt=new Map();for(const s of vs){let o=gt.get(s.g);if(!o)gt.set(s.g,o=new Set());o.add(Math.floor(s.t/SLOT))}
  const games=hasApi()?[...gt].map(([g,sl])=>({g,hours:sl.size*2/60})).sort((a,b)=>b.hours-a.hours).slice(0,8):null;
  const switches=hasApi()?switchesOf(q.snaps,q.mins,[c]).slice(0,20).map(x=>({when:when(x.t),from:x.from,to:x.to,vB:nn(x.vB),vA:nn(x.vA),mB:nn(x.mB),mA:nn(x.mA)})):null;
  const hours=Array.from({length:24},(_,i)=>({k:i+'h',lbl:i+'h – '+(i+1)+'h',v:0}));for(const m of mins)hours[hourOf(m.t)].v+=m.m;
  const color=colorOf(c);
  // Raid recommandations : score = organic A→B × (1 + reciprocal B→A / total)
  const raids=hasApi()?raidRecommendations(q,pres,shown(),c,info):null;
  // Fallback: utiliser cfg.chans si shown() est vide (langues pas encore connues)
  const listFallback=liveFirst(shown().length?shown():cfg.chans);
  window.dispatchEvent(new CustomEvent('legacy:channel',{detail:{
    ch:chHead(c),
    list:listFallback.map(x=>({...who(x),live:!!(info[x]&&info[x].live)})),
    main,more,hasApi:hasApi(),
    moments:momentsData(moments(q.mins,[c],6)),clips:clipsData(q,[c]),switches,also:also.slice(0,10),alsoBase:U.size,games,raids,
    msgChart:lineSpec([{name:c,c,color,pts:minuteSeries(q.mins,c,'m')}],{unit:' msg/min',gaps:listenGaps([c],q.t0)}),
    viewerChart:hasApi()?lineSpec([{name:c,c,color,pts:viewerSeries(q.snaps,c)}],{unit:' viewers'}):null,
    hourChart:{items:hours,color:color===OTHER?'#5b93ff':color,unit:' messages'}}}));
}

// Calcul des recommandations de raid pour une chaîne
// Score = organic A→B switches × (1 + reciprocal B→A switches / total A viewers)
function raidRecommendations(q,pres,shown,c,info){
  if(!info[c]||!info[c].live)return null;

  // Obtenir les flux organiques (switches A→B) pour la période
  const {flows} = flowsOf(q.pres);

  // Construire un index des flux organiques : "A>B" -> {n, gaps}
  const flowIndex = new Map();
  for (const f of flows) {
    flowIndex.set(`${f.a}>${f.b}`, { n: f.n, gaps: f.gaps });
  }

  // Viewers actifs de la chaîne courante
  const activeUsers = new Map();
  for (const p of pres) {
    if (!shown().includes(p.c)) continue;
    let s = activeUsers.get(p.c);
    if (!s) activeUsers.set(p.c, s = new Set());
    s.add(p.u);
  }
  const usersA = activeUsers.get(c);
  if (!usersA || !usersA.size) return null;
  const totalA = usersA.size;

  const out = [];
  for (const target of shown()) {
    if (target === c) continue;
    const usersB = activeUsers.get(target);
    if (!usersB || !usersB.size) continue;

    // Organic switches A→B : viewers qui ont écrit chez A puis chez B (gap < 3h)
    const flowAB = flowIndex.get(`${c}>${target}`);
    const organicAB = flowAB ? flowAB.n : 0;
    if (!organicAB) continue;

    // Reciprocal switches B→A
    const flowBA = flowIndex.get(`${target}>${c}`);
    const organicBA = flowBA ? flowBA.n : 0;

    // Score = organic A→B × (1 + reciprocal B→A / total viewers A)
    const score = organicAB * (1 + (organicBA / totalA));

    // Vérifier si la cible est en live via info
    const live = !!(info[target] && info[target].live);

    try { loadAvatars([target]) } catch (e) {}

    // Viewers actifs communs (pour affichage, part)
    const sharedAB = sharedCount(usersA, usersB);

    out.push({
      to: who(target),
      name: target,
      live,
      score,
      viewers: sharedAB,           // viewers actifs communs
      share: totalA ? sharedAB / totalA : 0,
      organicAB,                   // switches organiques A→B
      organicBA                    // switches organiques B→A
    });
  }

  // Trier par score décroissant et prendre les 3 meilleures
  out.sort((a, b) => b.score - a.score);
  const top3 = out.slice(0, 3);

  // Normaliser les scores sur 100
  const maxScore = top3.length ? top3[0].score : 1;
  return top3.map(r => ({
    ...r,
    score: Math.round(r.score / maxScore * 100),
    viewers: r.viewers,
    share: r.share * 100
  }));
}

// Matrice de chevauchement (onglets Par jeu et Chevauchement) : pour chaque ligne a et colonne b,
// part des viewers actifs de a qu'on a aussi vus chez b. photos : les clés sont des chaînes.
function matrixData(keys,sets,photos=false){
  return {rows:keys.map(a=>{const A=sets.get(a);return {k:a,size:A.size,who:photos?who(a):null,
    cells:keys.map(b=>{if(a===b)return null;const n=sharedCount(A,sets.get(b));return {r:A.size?n/A.size:null,n}})}})}}
// Onglet « Par jeu » : l'ancien code calcule, React affiche (événement « legacy:game », voir app/src/legacy/bridge.ts).
function renderGame(q){
  $('t-game').innerHTML='';
  const D=discover||{};
  const disc={q:D.q||'',lang:D.lang!=null?D.lang:'fr',status:D.status||'idle',error:D.error||'',game:D.game||'',
    streams:(D.streams||[]).map(s=>({...who(s.c),name:s.name,title:s.title,viewers:s.viewers,followed:cfg.chans.includes(s.c)}))};
  if(!hasApi()){window.dispatchEvent(new CustomEvent('legacy:game',{detail:{hasApi:false,canSearch:apiReady(),discover:disc,games:[],switchGames:[],matrix:null}}));return}
  const known=q.pres.filter(p=>p.g!==UNKNOWN&&p.g!==OFFLINE),G=new Map();
  for(const p of known){let o=G.get(p.g);if(!o)G.set(p.g,o={g:p.g,users:new Set(),msgs:0,chans:new Set(),air:0,vs:0,vn:0});o.users.add(p.u);o.msgs+=p.n;o.chans.add(p.c)}
  for(const s of q.snaps){if(!s.live)continue;let o=G.get(s.g);if(!o)G.set(s.g,o={g:s.g,users:new Set(),msgs:0,chans:new Set(),air:0,vs:0,vn:0});o.chans.add(s.c);(o.slots||(o.slots=new Set())).add(s.c+'|'+Math.floor(s.t/SLOT));o.air=o.slots.size*2;o.vs+=s.v;o.vn++}
  const games=[...G.values()].sort((a,b)=>b.users.size-a.users.size||b.air-a.air);
  const top=games.filter(o=>o.users.size).slice(0,8),sets=new Map(top.map(o=>[o.g,o.users]));
  const sw=switchesOf(q.snaps,q.mins,shown()),SG=new Map();
  for(const x of sw){let o=SG.get(x.to);if(!o)SG.set(x.to,o={g:x.to,n:0,dv:[],dm:[]});o.n++;const a=rel(x.vA,x.vB),b=rel(x.mA,x.mB);if(isFinite(a))o.dv.push(a);if(isFinite(b))o.dm.push(b)}
  window.dispatchEvent(new CustomEvent('legacy:game',{detail:{hasApi:true,canSearch:apiReady(),discover:disc,
    games:games.map(o=>({g:o.g,chans:liveFirst([...o.chans]).map(who),air:dur(o.air*MIN),avgV:o.vn?o.vs/o.vn:null,users:o.users.size,msgs:o.msgs,perUser:o.users.size?o.msgs/o.users.size:null})),
    switchGames:[...SG.values()].sort((a,b)=>b.n-a.n).map(o=>({g:o.g,n:o.n,dv:o.dv.length?median(o.dv):null,dm:o.dm.length?median(o.dm):null})),
    matrix:top.length>=2?matrixData(top.map(o=>o.g),sets):null}}));
}
// Recherche des plus gros lives d'une catégorie (API Twitch), lancée depuis React.
async function runDiscover(qn,lang){
  qn=String(qn||'').trim();if(!qn)return;
  discover={q:qn,lang,status:'loading'};if(tab==='game')render();
  try{
    let g=(await helix('games?name='+encodeURIComponent(qn))).data[0];
    if(!g){const s=(await helix('search/categories?first=5&query='+encodeURIComponent(qn))).data;g=s[0]&&{id:s[0].id,name:s[0].name}}
    if(!g)throw new Error('catégorie introuvable');
    const r=await helix('streams?first=30&game_id='+g.id+(lang?'&language='+lang:''));
    discover.list=r.data.map(s=>s.user_login.toLowerCase());
    if(r.data.length)try{const u=await helix('users?'+discover.list.map(c=>'login='+encodeURIComponent(c)).join('&'));for(const x of u.data)setAvatar(x.login.toLowerCase(),x.profile_image_url)}catch(e){}
    Object.assign(discover,{status:'done',game:g.name,streams:r.data.map(s=>({c:s.user_login.toLowerCase(),name:s.user_name,title:s.title,viewers:s.viewer_count}))});
  }catch(e){Object.assign(discover,{status:'error',error:e.message})}
  if(tab==='game')render();
}
const MAX_CLOUD_CHANS=100; // limite du collecteur
function addChans(list){
  if(isCloud()){let nw=[...new Set(list)].filter(c=>!cfg.chans.includes(c));const room=MAX_CLOUD_CHANS-cfg.chans.length;
    if(nw.length>room){nw=nw.slice(0,Math.max(0,room));smsg.chans=`Le collecteur suit ${MAX_CLOUD_CHANS} chaînes au maximum : retire-en avant d'en ajouter d'autres.`}
    if(!nw.length){if(tab==='settings')renderSettings();return 0}
    cfg.chans.push(...nw);buildChanSel();
    smsg.chans=`Ajout de ${nw.join(', ')}…`;
    cloudAddChans(nw).then(()=>cloudSync()).then(()=>{smsg.chans=`${nw.join(', ')} ajouté${nw.length>1?'s':''}. Le collecteur commence à écouter dans la minute.`;render()})
      .catch(e=>{cloud.err=e.message;smsg.chans='Échec de l\'ajout : '+e.message;cloudSync().then(render)});
    if(tab==='settings')renderSettings();return nw.length}
  let added=0;for(const c of list)if(!cfg.chans.includes(c)){cfg.chans.push(c);added++;if(running&&ws&&ws.readyState===1)setTimeout(()=>{if(running&&ws&&ws.readyState===1&&cfg.chans.includes(c))ws.send('JOIN #'+c)},added*600)}
  saveCfg();buildChanSel();if(running){pollStreams();loadEmotes(list)}if(discover&&tab==='game')render(); /* « suivie » se met à jour dans la recherche */
  if(added)smsg.chans=`${added} chaîne${added>1?'s':''} ajoutée${added>1?'s':''}.`+(running?'':(added>1?' Elles seront écoutées':' Elle sera écoutée')+' au prochain « Démarrer l\'écoute ».');
  if(tab==='settings')renderSettings();return added}
function removeChan(c){
  cfg.chans=cfg.chans.filter(x=>x!==c);buildChanSel();
  if(isCloud()){smsg.chans=`Retrait de ${c}…`;
    cloudRemoveChans([c]).then(()=>cloudSync()).then(()=>{smsg.chans=`${c} retirée. Le collecteur arrête de l'écouter dans la minute ; ses données déjà collectées restent.`;renderSettings()})
      .catch(e=>{smsg.chans='Échec du retrait : '+e.message;cloudSync().then(renderSettings)});
    renderSettings();return}
  saveCfg();if(running&&ws&&ws.readyState===1)ws.send('PART #'+c);smsg.chans=`${c} retirée.`;renderSettings()}

// Ajout en bloc depuis React : n'ajoute que, ne retire jamais (contrairement à saveChanList, qui remplace la liste).
function addChanList(text){
  const tokens=String(text||'').split(/[\s,;]+/).filter(Boolean),invalid=[],ok=[];
  for(const t of tokens){const l=loginOf(t);if(/^[a-z0-9_]{2,25}$/.test(l))ok.push(l);else invalid.push(t)}
  const uniq=[...new Set(ok)],list=uniq.filter(c=>!cfg.chans.includes(c)),added=list.length?addChans(list):0;
  return {added,already:uniq.length-list.length,invalid,over:list.slice(added)};
}

/* ---------- recherche de streamers à ajouter ---------- */
let addSearch=null,addSeq=0;
// Messages d'état des Réglages (affichés par React). chans reste affiché ; sb, api et db ne valent
// que jusqu'au prochain affichage des Réglages, comme quand ils étaient écrits directement dans la page.
const smsg={chans:'',sb:'',api:'',db:''};
function setSmsg(k,v){smsg[k]=v;if(tab==='settings')renderSettings()}
const stripTw=s=>s.trim().replace(/^(https?:\/\/)?(www\.|m\.)?twitch\.tv\//i,'').replace(/^[@#]/,'');
const loginOf=s=>stripTw(s).toLowerCase().split(/[/?#\s]/)[0];
async function runAddSearch(text){
  const seq=++addSeq,raw=String(text||'').trim();if(!raw){addSearch=null;renderSettings();return}
  const q=stripTw(raw).split(/[/?#]/)[0],login=loginOf(raw),valid=/^[a-z0-9_]{2,25}$/.test(login);
  if(!apiReady()){addSearch={items:valid?[{login,name:login,unchecked:true}]:[],msg:valid?'':'Pseudo invalide : seulement des lettres, des chiffres et _. Configure l\'API Twitch plus bas pour chercher par nom.'};renderSettings();return}
  addSearch={items:[],msg:'Recherche…'};renderSettings();
  try{
    const [ex,se]=await Promise.all([
      valid?helix('users?login='+encodeURIComponent(login)).catch(()=>({data:[]})):Promise.resolve({data:[]}),
      helix('search/channels?first=12&query='+encodeURIComponent(q))]);
    if(seq!==addSeq)return;
    const items=se.data.map(s=>({login:s.broadcaster_login.toLowerCase(),name:s.display_name,img:s.thumbnail_url,live:s.is_live,g:s.game_name,lang:s.broadcaster_language}));
    const u=ex.data[0];
    if(u){const i=items.findIndex(x=>x.login===u.login);const it=i>=0?items.splice(i,1)[0]:{login:u.login,name:u.display_name,img:u.profile_image_url,g:''};items.unshift(it)}
    // viewers des chaînes en direct (un seul appel pour toute la liste) ; sans réponse, la liste s'affiche sans ce chiffre
    const on=items.filter(x=>x.live||(u&&x.login===u.login));
    if(on.length)try{const st=await helix('streams?first=100&'+on.map(x=>'user_login='+encodeURIComponent(x.login)).join('&'));
      for(const v of st.data){const x=on.find(y=>y.login===v.user_login.toLowerCase());if(x){x.live=true;x.viewers=v.viewer_count;x.g=v.game_name;x.lang=v.language}}}catch(e){}
    if(seq!==addSeq)return;
    // le pseudo exact reste en tête, puis les chaînes en direct par audience, puis les autres dans l'ordre de Twitch
    const rank=x=>u&&x.login===u.login?Infinity:x.live?(x.viewers||0)+1:0;
    items.sort((a,b)=>rank(b)-rank(a));
    addSearch={items,msg:items.length?'':'Aucun streamer trouvé pour « '+q+' ».'};
  }catch(e){if(seq!==addSeq)return;addSearch={items:valid?[{login,name:login,unchecked:true}]:[],msg:'Recherche impossible ('+e.message+').'+(valid?' Tu peux quand même ajouter le pseudo tel quel :':'')}}
  renderSettings();
}
// chaînes ajoutées en mode « Ce navigateur » mais pas encore suivies par le collecteur
// « Ignorer » range ces chaînes dans localIgnored : la liste du mode « Ce navigateur » reste intacte.
const pendingLocal=()=>isCloud()&&cloud.last?[...new Set(cfg.localChans||[])].filter(c=>/^[a-z0-9_]{2,25}$/.test(c)&&!cfg.chans.includes(c)&&!(cfg.localIgnored||[]).includes(c)):[];
/* ---------- onglet Chevauchement : filtre des viewers qui bougent ----------
   Un « changement de stream » = le message suivant d'une même personne (empreinte) arrive chez une autre chaîne, moins de
   3 h après. Depuis le collecteur 1.5, chaque passage est compté message par message (table switches), allers-retours
   compris. Avant, il n'y a que l'estimation tirée des présences (premier et dernier message de la journée sur chaque
   chaîne), qui ne voit pas les va-et-vient d'une même soirée. Pour chaque viewer, jour et sens, on garde le plus grand
   des deux : les jours d'avant la mise à jour gardent leur estimation, les suivants ont le compte exact. */
const OV_OFTEN=3; // « changent souvent » : au moins 3 changements sur la période
const OV_FILTERS=[['all','Tous'],['multi','Sur 2 chaînes ou plus'],['move','Changent de stream'],['often','Changent souvent']];
function moversOf(pres,sw=[]){
  const by=new Map();for(const p of pres){let a=by.get(p.u);if(!a)by.set(p.u,a=[]);a.push(p)}
  const T=new Map(),slot=(u,d,a,b)=>{const k=u+'|'+d+'|'+a+'|'+b;let o=T.get(k);if(!o)T.set(k,o={u,a,b,est:0,ex:0});return o};
  for(const [u,arr] of by){arr.sort((a,b)=>a.f-b.f); // estimation (règle de l'onglet Flux)
    for(let i=1;i<arr.length;i++){const a=arr[i-1],b=arr[i];if(a.c===b.c)continue;const gap=b.f-a.l;if(gap<-10*MIN||gap>3*HOUR)continue;slot(u,dayKey(b.f),a.c,b.c).est++}}
  for(const s of sw)slot(s.u,s.d,s.a,s.b).ex+=s.n; // compte exact du collecteur
  const V=new Map();for(const [u,arr] of by)V.set(u,{u,chans:new Set(arr.map(p=>p.c)),moves:0,rows:arr});
  const F=new Map();
  for(const o of T.values()){const n=Math.max(o.est,o.ex),v=V.get(o.u);if(!n)continue;if(v)v.moves+=n;
    const fk=o.a+'>'+o.b;let x=F.get(fk);if(!x)F.set(fk,x={a:o.a,b:o.b,n:0});x.n+=n}
  return {V,flows:[...F.values()].sort((x,y)=>y.n-x.n)}}
const ovKeep=(v,f)=>f==='multi'?v.chans.size>=2:f==='move'?v.moves>=1:f==='often'?v.moves>=OV_OFTEN:true;
// Onglet « Chevauchement » : l'ancien code calcule, React affiche (événement « legacy:overlap », voir app/src/legacy/bridge.ts).
// Le filtre de viewers est choisi dans React et passe par setOverlapFilter() (gardé dans ce navigateur).
function setOverlapFilter(f){cfg.ovFilter=f;saveCfg();render()}
function renderOverlap(q){
  $('t-overlap').innerHTML='';
  const f=cfg.ovFilter||'all',{V,flows}=moversOf(q.pres,q.sw),vs=[...V.values()],N=vs.length;
  const cnt={all:N,multi:0,move:0,often:0};for(const v of vs)for(const k of ['multi','move','often'])if(ovKeep(v,k))cnt[k]++;
  const pres=f==='all'?q.pres:q.pres.filter(p=>ovKeep(V.get(p.u),f));
  const by=usersBy(pres,p=>p.c),keys=shown().filter(c=>by.get(c)&&by.get(c).size);
  const OV_NOTE={multi:'écrivent sur au moins 2 chaînes suivies',move:'ont changé de stream au moins une fois',often:`ont changé de stream ${OV_OFTEN} fois ou plus`};
  // ---------- viewers qui bougent ----------
  const mv=vs.filter(v=>v.moves>=1);let movers=null;
  if(mv.length){
    // depuis quand les changements sont comptés exactement (premier jour présent dans la table switches)
    const swDays=Object.values(DB.switches||{}).map(s=>s.d),swStart=swDays.length?swDays.reduce((a,b)=>a<b?a:b):'';
    // chaîne par chaîne : part de ses viewers actifs qui bougent, et où ils vont / d'où ils viennent
    const out=new Map(),inn=new Map();
    for(const x of flows){if(!out.has(x.a)||out.get(x.a).n<x.n)out.set(x.a,x);if(!inn.has(x.b)||inn.get(x.b).n<x.n)inn.set(x.b,x)}
    const allBy=usersBy(q.pres,p=>p.c),side=(x,k)=>x?{...who(x[k]),n:x.n}:null;
    const rows=shown().filter(c=>allBy.get(c)&&allBy.get(c).size>=20).map(c=>{const S=allBy.get(c);let m=0,o=0;for(const u of S){const v=V.get(u);if(v.moves>=1)m++;if(v.moves>=OV_OFTEN)o++}
      return {...who(c),n:S.size,m:m/S.size,o:o/S.size,to:side(out.get(c),'b'),from:side(inn.get(c),'a')}}).sort((a,b)=>b.m-a.m);
    // les parcours les plus nomades (anonymes : seulement le début de l'empreinte)
    const top=[...mv].sort((a,b)=>b.moves-a.moves||b.chans.size-a.chans.size).slice(0,10).map(v=>{
      const st=[];for(const p of v.rows)if(!st.length||st[st.length-1].c!==p.c)st.push(p);
      const f0=v.rows[0].f,l0=maxOf(v.rows,p=>p.l);
      return {id:v.u.slice(0,6),moves:v.moves,chans:v.chans.size,path:st.slice(0,14).map(p=>({...who(p.c),when:dayLbl(p.f)+' '+hhmm(p.f)})),more:Math.max(0,st.length-14),
        span:`${dayLbl(f0)} ${hhmm(f0)} → ${dayKey(f0)===dayKey(l0)?'':dayLbl(l0)+' '}${hhmm(l0)}`}});
    movers={move:cnt.move,often:cnt.often,multi:cnt.multi,total:N,oftenAt:OV_OFTEN,medianMoves:median(mv.map(v=>v.moves)),maxMoves:maxOf(mv,v=>v.moves),
      swStart:swStart?swStart.split('-').reverse().join('/'):'',rows,top}}
  const pairs=pairsOf(by,keys);
  const U=new Map();for(const p of pres){let s=U.get(p.u);if(!s)U.set(p.u,s=new Set());s.add(p.c)}
  const dist=new Map();for(const s of U.values())dist.set(s.size,(dist.get(s.size)||0)+1);
  window.dispatchEvent(new CustomEvent('legacy:overlap',{detail:{
    filter:f,filters:OV_FILTERS.map(([k,l])=>({key:k,label:l,tip:OV_TIPS[k],count:cnt[k]})),
    filterNote:f!=='all'?{count:cnt[f],desc:OV_NOTE[f],share:cnt[f]/(N||1),total:N}:null,
    movers,matrix:matrixData(keys,by,true),pairs:pairs.slice(0,15),
    dist:[...dist].sort((a,b)=>a[0]-b[0]).map(([k,v])=>({k,v,share:v/U.size}))}}));
}
const OV_TIPS={all:'Ont écrit au moins un message sur la période',multi:'Ont écrit sur au moins 2 chaînes suivies',
  move:'Ont changé de stream au moins une fois (message suivant chez une autre chaîne, moins de 3 h après)',often:`Ont changé de stream ${OV_OFTEN} fois ou plus`};

// Onglet « Flux » : l'ancien code calcule, React affiche (événement « legacy:flows », voir app/src/legacy/bridge.ts).
// Support du switch type flux : "all", "organic", "raid".
function renderFlows(q, flowType = "all"){
  $('t-flows').innerHTML='';
  const {flows}=flowsOf(q.pres);
  const bal=new Map();for(const f of flows){bal.set(f.a,(bal.get(f.a)||{in:0,out:0}));bal.set(f.b,(bal.get(f.b)||{in:0,out:0}));bal.get(f.a).out+=f.n;bal.get(f.b).in+=f.n}
  const raids=q.events.filter(e=>e.type==='raid').sort((a,b)=>b.t-a.t);
  loadAvatars(raids.slice(0,50).map(r=>String(r.from||'').toLowerCase()).filter(Boolean));
  const gaps=flows.flatMap(f=>f.gaps);

  // Identifier les flux de raid : ceux entre des chaînes ayant eu un raid
  const raidPairs = new Set(raids.map(r => `${String(r.from||'').toLowerCase()}|${r.c}`));

  // Séparer les flux en organiques et raid (les deux listes sont toujours calculées)
  const flowsOrganic = flows.filter(f => !raidPairs.has(`${f.a}|${f.b}`));
  const flowsRaid = flows.filter(f => raidPairs.has(`${f.a}|${f.b}`));

  // Calculer les totaux par type
  const totalOrganic = flowsOrganic.reduce((s,f)=>s+f.n,0);
  const totalRaid = flowsRaid.reduce((s,f)=>s+f.n,0);
  const totalAll = totalOrganic + totalRaid;

  // Métrics séparés
  const organicGaps = flowsOrganic.flatMap(f=>f.gaps);
  const raidGaps = flowsRaid.flatMap(f=>f.gaps);

  // Flux à afficher selon le type sélectionné
  const displayFlows = flowType === "organic" ? flowsOrganic : flowType === "raid" ? flowsRaid : flows;

  const detail={
    total:totalAll, routes:flows.length, medianGap:gaps.length?dur(median(gaps)):'',
    raidCount:raids.length,raidViewers:raids.reduce((s,r)=>s+(r.n||0),0),
    totalOrganic, totalRaid,
    gapOrganic: organicGaps.length?dur(median(organicGaps)):'',
    gapRaid: raidGaps.length?dur(median(raidGaps)):'',
    flows:displayFlows.slice(0,20).map(f=>({a:who(f.a),b:who(f.b),n:f.n,gap:dur(median(f.gaps)), type: raidPairs.has(`${f.a}|${f.b}`) ? 'raid' : 'organic'})),
    flowsOrganic:flowsOrganic.slice(0,20).map(f=>({a:who(f.a),b:who(f.b),n:f.n,gap:dur(median(f.gaps))})),
    flowsRaid:flowsRaid.slice(0,20).map(f=>({a:who(f.a),b:who(f.b),n:f.n,gap:dur(median(f.gaps))})),
    balance:[...bal].map(([c,o])=>({...who(c),in:o.in,out:o.out,net:o.in-o.out})).sort((a,b)=>b.net-a.net),
    raids:raids.slice(0,50).map(r=>({when:when(r.t),from:r.from?{...who(String(r.from).toLowerCase()),name:String(r.from)}:null,to:who(r.c),n:r.n||0})),
    flowType};
  // Passages par jour (chantier C1) : champ « byDay » ajouté à l'événement. Le Sankey reçoit d'abord, tout de suite et sans attendre, les
  // mêmes données qu'avant ; la base est interrogée à part (résultat gardé 10 min : le rollup ne change que la nuit) et l'événement est
  // réémis avec byDay à l'arrivée. Échec ou base pas à jour : pas de byDay, aucune erreur visible.
  const fd0=dayKey(q.t0||Date.now()-89*DAY),fd1=dayKey(Date.now()),fk=fd0+'|'+fd1,fc=flowsDayCache;
  const fresh=fc.key===fk&&Date.now()-fc.at<(fc.data?600000:120000);
  if(fresh&&fc.data)detail.byDay=flowsDayRows(fc.data);
  fc.last={fk,detail};
  window.dispatchEvent(new CustomEvent('legacy:flows',{detail}));
  if(!fresh&&isCloud()&&fc.pending!==fk){fc.pending=fk;
    flowsByDay(fd0,fd1).then(rows=>{fc.pending=null;fc.key=fk;fc.at=Date.now();fc.data=rows;
      const L=fc.last;if(rows&&tab==='flows'&&L&&L.fk===fk)window.dispatchEvent(new CustomEvent('legacy:flows',{detail:{...L.detail,byDay:flowsDayRows(rows)}}))
    }).catch(()=>{fc.pending=null})}
}
// Passages par jour et par paire de chaînes (fonction SQL flows_by_day, voir schema.sql) : viewers distincts du jour, passages, part
// organique et part raid (borne haute). null si pas de base Supabase, base pas à jour ou erreur : l'onglet garde son comportement actuel.
const flowsDayCache={key:'',at:0,data:null,pending:'',last:null};
async function flowsByDay(d0,d1){
  if(!isCloud())return null;
  try{const rows=await sbReq('rpc/flows_by_day',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:cfg.sbCode||'',d0,d1})});
    return (rows||[]).map(r=>({d:r.jour,a:who(r.source),b:who(r.cible),viewers:r.viewers,passages:r.passages,organic:r.organique,raid:r.raid}))}
  catch(e){return null}}
// même filtre Langue que les autres données de l'onglet
function flowsDayRows(rows){if((cfg.lang||'*')==='*')return rows;const S=new Set(shown());return rows.filter(r=>S.has(r.a.c)&&S.has(r.b.c))}
// état de la connexion à l'API Twitch (aussi repris après « Générer le jeton »)
const apiStatusLbl=()=>!apiReady()?'API non configurée.':apiState==='ok'?'API connectée.':apiState?'Erreur : '+apiState:'API configurée, test au prochain démarrage.';
// Réglages : l'ancien code rassemble l'état, React affiche (événement « legacy:settings », voir app/src/legacy/bridge.ts)
function renderSettings(){
  const c=cfg.mode==='cloud';
  const priv='Le texte des messages n\'est jamais stocké, et les pseudos sont remplacés par une empreinte : seulement qui a écrit (sous forme d\'empreinte), où, quand et combien, plus des compteurs anonymes (emotes, mots, ambiance). Les dates suivent l\'heure de Paris.';
  const RT=(cloud.status&&cloud.status.retention)||{};
  const np=Object.keys(DB.presence).length,nm=Object.keys(DB.minutes).length;
  const d={mode:cfg.mode,modeNote:c?'Les données viennent du collecteur qui tourne sur ton PC et les envoie dans Supabase. La page se met à jour toute seule chaque minute, même ouverte sur un autre appareil.':'La page écoute elle-même les chats tant qu\'elle reste ouverte. Les données restent dans ce navigateur.',
    sbUrl:cfg.sbUrl||'',sbKey:cfg.sbKey||'',sbCode:cfg.sbCode||'',sbMsg:smsg.sb||(!c?'':!isCloud()?'Colle l\'URL et la clé publique du projet Supabase du collecteur.':cloud.err?'Erreur : '+cloud.err:cloud.last?`Connecté · dernière synchro il y a ${ago(cloud.last)}`+(cloud.status&&cloud.status.last_seen?` · collecteur vu il y a ${ago(cloud.status.last_seen)}`+(cloud.status.version?` (v${cloud.status.version})`:''):' · le collecteur n\'a encore rien envoyé')+dbSizeLbl()+(cfg.sbCode?'':' · sans le code, la liste des chaînes est en lecture seule'):'Connexion…'),
    chans:cfg.chans.map(who),chanLimit:isCloud()?MAX_CLOUD_CHANS:null,chansMsg:smsg.chans,
    addSearch:addSearch?{msg:addSearch.msg||'',items:addSearch.items.map(x=>({login:x.login,name:x.name,img:x.img||'',live:!!x.live,viewers:x.viewers??null,lang:x.lang||'',game:x.g||'',unchecked:!!x.unchecked,followed:cfg.chans.includes(x.login)}))}:null,
    apiReady:apiReady(),pendingLocal:pendingLocal(),clientId:cfg.clientId||'',token:cfg.token||'',apiMsg:smsg.api||apiStatusLbl(),
    dbNote:c
    ?`Les données sont dans la base Supabase du collecteur ; ce navigateur en garde une copie pour s'afficher vite. ${priv} Dans la base, le détail par minute est gardé ${nJ(+RT.minutes||14)}, les présences ${nJ(+RT.presence||21)} en plus du jour en cours, les relevés de viewers ${nJ(+RT.snaps||30)} et les événements ${nJ(+RT.events||60)} (réglables dans config.json) ; mots et emotes, VOD et clips 30 jours ; réglages des chaînes et périodes d'écoute 60 jours. « Sauvegarde complète » enregistre cette copie ; « Tout effacer » la vide puis la retélécharge depuis la base.`
    :`Tout reste dans ce navigateur. ${priv} Le détail par minute est gardé 14 jours ; mots et emotes, relevés de viewers, VOD et clips 30 jours ; le reste 60 jours.`,
    dbMsg:smsg.db||`${fmt(np)} lignes de présence · ${fmt(nm)} minutes · ${fmt(DB.snaps.length)} relevés de viewers · ${fmt(DB.events.length)} événements`};
  smsg.sb=smsg.api=smsg.db=''; // messages ponctuels : affichés une fois
  window.dispatchEvent(new CustomEvent('legacy:settings',{detail:d}));
}

// Durée longue en jours au-delà de 24 h (« 3 j 4 h ») ; dur() reste en heures (« 76 h 04 »).
const durJ=ms=>{const h=Math.floor(ms/HOUR);return h<24?dur(ms):Math.floor(h/24)+' j '+(h%24)+' h'};
// État du relevé pour la pilule de l'en-tête (React, événement « legacy:status », voir app-header.tsx).
// La pilule est tronquée : elle ne montre que l'état court (head), précédé du problème s'il y en a un (alerts) ;
// les chiffres (facts), le détail des problèmes et la marche à suivre (note, action) s'ouvrent au clic.
const pushStatus=()=>{const o=statusOf(),d=$('dot');if(d){if(o.alerts.length)d.dataset.alert='1';else delete d.dataset.alert} // data-alert : le point passe à l'ambre dès qu'il y a un problème, même si l'écoute tourne (point vert)
  window.dispatchEvent(new CustomEvent('legacy:status',{detail:o}))};
// Une erreur technique (message brut de Twitch, de Supabase ou du navigateur) devient un problème lisible : un titre court,
// ce qui se passe et quoi faire, puis le message brut en petit pour qui veut chercher plus loin (alerts : [titre, explication,
// message brut, onglet où régler le problème]).
function explainErr(src,raw,fallbackTitle){const m=String(raw==null?'':raw);let t,x,g='';
  const net=/failed to fetch|networkerror|load failed|network request/i.test(m);
  if(src==='api'){
    if(/401|jeton refusé/i.test(m)){t='Jeton Twitch refusé';x='Twitch n\'accepte plus le jeton : les viewers et les lives ne sont plus relevés. Génère-en un nouveau dans Réglages, section API Twitch.';g='settings'}
    else if(/erreur 429/.test(m)){t='Twitch limite les requêtes';x='Trop de demandes ont été envoyées à Twitch. Le relevé reprend tout seul dans quelques minutes.'}
    else if(/erreur 5\d\d/.test(m)){t='Twitch ne répond pas';x='Le service Twitch est en panne ou surchargé. Le relevé reprend tout seul dès qu\'il revient.'}
    else if(net){t='Twitch injoignable';x='Ce navigateur n\'arrive pas à joindre Twitch. Vérifie ta connexion : le relevé reprend tout seul.'}
    else{t='API Twitch en erreur';x='Le relevé des viewers et des lives est interrompu. Vérifie la clé et le jeton dans Réglages, section API Twitch.';g='settings'}
  }else{
    if(/code du tableau de bord/i.test(m)){t='Code du tableau refusé';x='Le code ne correspond pas à celui de la base. Copie « codeTableau » depuis config.json et colle-le dans Réglages, section Source des données.';g='settings'}
    else if(/base pas à jour/i.test(m)){t='Base à mettre à jour';x='La base n\'a pas la dernière version du schéma. Exécute schema.sql dans Supabase (éditeur SQL), puis recharge.'}
    else if(/supabase (401|403)/i.test(m)){t='Accès à la base refusé';x='Supabase refuse la clé. Vérifie l\'URL et la clé dans Réglages, section Source des données.';g='settings'}
    else if(/supabase 5\d\d/i.test(m)){t='Base indisponible';x='Supabase ne répond pas pour le moment. Réessaie dans quelques minutes, les données déjà reçues restent affichées.'}
    else if(net){t='Base injoignable';x='Ce navigateur n\'arrive pas à joindre Supabase. Vérifie ta connexion et l\'URL dans Réglages, section Source des données.';g='settings'}
    else{t=fallbackTitle;x='La base n\'a pas pu être lue. Réessaie dans quelques minutes ; si cela dure, vérifie l\'URL et la clé dans Réglages.';g='settings'}
  }
  return [t,x,m,g]}
function statusOf(){
  const today=dayKey(Date.now()),users=new Set();for(const p of Object.values(DB.presence))if(p.d===today)users.add(p.u);
  const facts=[['Chaînes suivies',fmt(cfg.chans.length)],['Viewers actifs aujourd\'hui',fmt(users.size)]];
  // temps d'écoute cumulé depuis le premier lancement : un état du relevé, pas un chiffre de la période
  if(DB.trackedMs)facts.push(['Temps d\'écoute au total',durJ(DB.trackedMs)]);
  const alerts=[],o={head:'',short:'',alerts,facts,note:'',action:null}; // short : la même chose en un ou deux mots, pour la pilule sur téléphone
  if(cfg.mode==='cloud'){
    const s=cloud.status;
    if(!isCloud()){o.head='Collecteur à configurer';o.short='À configurer';o.note='Le collecteur 24h/24 n\'est pas encore relié : colle l\'URL et la clé Supabase dans Réglages.';o.action={label:'Ouvrir les Réglages',goto:'settings'}}
    else if(cloud.syncing&&cloud.progress){o.head=`Synchronisation… ${fmt(cloud.progress)} lignes`;o.short='Synchro…'}
    else if(!s||!s.last_seen){o.head='Collecteur jamais vu';o.short='Jamais vu';o.note='Lance le collecteur sur ton PC : il apparaîtra ici dès son premier envoi.'}
    else{
      o.head=collectorOnline()?'Collecteur en ligne':'Collecteur hors ligne depuis '+ago(s.last_seen);o.short=collectorOnline()?'En ligne':'Hors ligne';
      facts.push(['Dernier signal du collecteur','il y a '+ago(s.last_seen)]);
      if(s.api&&s.api!=='ok')alerts.push(explainErr('api',s.api));
      if(s.db_mb!=null){const mb=+s.db_mb;facts.push(['Base de données',`${fmt(mb)} Mo sur ${DB_LIMIT_MB}`]);
        if(mb>=400)alerts.push(['Base presque pleine',`${fmt(mb)} Mo sur ${DB_LIMIT_MB} : baisse « joursPresence » dans config.json ou suis moins de chaînes.`])}
    }
    if(cloud.err)alerts.push(explainErr('db',cloud.err,s&&s.last_seen?'Synchronisation en échec':'Connexion à la base impossible'));
  }else if(running){
    o.head=o.short='En écoute';
    if(apiReady()){if(apiState&&apiState!=='ok')alerts.push(explainErr('api',apiState));else if(apiState==='ok')facts.push(['API Twitch','connectée'])}
  }else o.head=o.short='À l\'arrêt';
  return o;
}
// Période affichée : son nom et la plage réelle couverte par les relevés (« Tout » commence au premier jour relevé, pas à une
// date inventée ; 7 ou 30 jours commencent plus tard si les relevés sont plus récents). Envoyée à React à chaque rendu.
const PERIOD_LBL={all:'Tout',today:'Aujourd\'hui','7d':'7 jours','30d':'30 jours'};
// Cache simple pour les heures : recalculer seulement si la période change
let lastHoursCalc={periodId:'',hours:0};

/**
 * Calcule les heures d'écoute pour la période donnée.
 * Optimisé : utilise cache si la période n'a pas changé.
 */
function getPeriodHours(t0){
  const periodId=period+(t0?'':'_')+String(t0);
  if(lastHoursCalc.periodId===periodId){
    return lastHoursCalc.hours;
  }
  let totalMs=0;
  if(t0){
    for(const p of Object.values(DB.presence)){
      if(p.l>t0){
        const start=Math.max(p.f,t0);
        if(p.l>start)totalMs+=p.l-start;
      }
    }
  }
  const hours=Math.floor(totalMs/HOUR);
  lastHoursCalc={periodId,hours};
  return hours;
}

function periodInfo(){
  const today=dayKey(Date.now()),t0=periodStart();let first='';
  for(const k in DB.presence){const d=DB.presence[k].d;if(d&&(!first||d<first))first=d}
  const dm=d=>new Date(d+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'}),from0=t0?dayKey(t0):'';
  let range;
  if(!first)range='Pas encore de relevé';
  else{const from=from0&&from0>first?from0:first,days=Math.round((Date.parse(today)-Date.parse(from))/DAY)+1;
    range=period==='today'||days<=1?`Aujourd\'hui, ${dm(today)}`:`Du ${dm(from)} au ${dm(today)} (${days} jours)`}
  // Calculer les heures d'écoute pour la période actuelle (avec cache)
  const periodHours=getPeriodHours(t0);
  return {key:period,label:PERIOD_LBL[period]||'',range,show:tab!=='settings'&&tab!=='map',hours:periodHours>0?periodHours:undefined}}
function render(){
  loadAvatars();buildLangSeg();
  pushStatus();
  // Émettre l'onglet actuel au premier rendu pour que React puisse l'obtenir
  if(!window.__tabBroadcasted){window.dispatchEvent(new CustomEvent('legacy:tab',{detail:tab}));window.__tabBroadcasted=true}
  document.querySelectorAll('#period button').forEach(b=>b.setAttribute('aria-pressed',String(b.classList.contains('on')))); // le bouton de la période choisie est annoncé comme enfoncé
  window.dispatchEvent(new CustomEvent('legacy:period',{detail:periodInfo()}));
  if(cfg.mode==='cloud'){const s=cloud.status;$('dot').className='dot'+(isCloud()&&collectorOnline()&&!cloud.err?' on':isCloud()&&(cloud.err||(s&&s.last_seen))?' err':'')}
  else $('dot').className='dot'+(running&&ws&&ws.readyState===1?' on':apiState&&apiState!=='ok'&&running?' err':'');
  if(tab==='settings'){renderSettings();return}
  const q=Q();
  // Anneau des planètes (lib/planet.ts) : les 3 chaînes qui ont le plus de viewers actifs dans la vue en cours ; sans anneau
  // quand il y a 3 chaînes ou moins (toutes en auraient un, il ne distinguerait plus rien). Calculé avant l'événement de l'onglet.
  {const by=usersBy(q.pres,p=>p.c);window.planetRing=new Set(by.size>3?[...by].sort((a,b)=>b[1].size-a[1].size).slice(0,3).map(x=>x[0]):[])}
  // 24/11/2026 : « rosters » manquait dans cette table : sur cet onglet, chaque rafraîchissement levait « is not a function ».
  ({overview:renderOverview,channel:renderChannel,game:renderGame,chat:renderChat,overlap:renderOverlap,map:renderMap,flows:renderFlows,rosters:window.renderRosters})[tab](q);
}

// Onglet « Rosters » : pour chaque chaîne suivie, l'ensemble des viewers actifs (empreintes) de la période et ses messages.
// React fait les réunions roster par roster (Net Reach). Événement « legacy:rosters », voir app/src/legacy/bridge.ts.
// Même périmètre que les Recoupements : toute personne qui a écrit au moins un message sur la période (filtre Langue compris).
function renderRosters(q){
  const by=usersBy(q.pres,p=>p.c),msgs=new Map();for(const p of q.pres)msgs.set(p.c,(msgs.get(p.c)||0)+p.n);
  window.dispatchEvent(new CustomEvent('legacy:rosters',{detail:{
    chans:cfg.chans.map(c=>({...who(c),users:by.get(c)||new Set(),msgs:msgs.get(c)||0})),
  }}))}
window.renderRosters = renderRosters

function autoRender(){ // ne redessine pas sous les doigts de quelqu'un qui tape
  const a=document.activeElement;if(a&&a.closest&&a.closest('section')&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))return;
  if(tab==='settings'){renderSettings();return}
  // la carte ne se redessine pas pendant qu'on l'explore (2 min après le dernier geste) ; sa vue est de toute façon gardée
  if(tab==='map'&&(Date.now()-lastMap<30000||Date.now()-mapView.touched<120000))return;
  render()}

/* ---------- interface ---------- */
function buildChanSel(){const s=$('chanSel'),chat=tab==='chat',sh=shown(),allChans=cfg.chans,opts=(chat?['*']:[]).concat(liveFirst(sh).length?liveFirst(sh):allChans);
  let cur=chat?selChat:selChan;if(!opts.includes(cur)){cur=opts[0]||null}if(chat)selChat=cur;else selChan=cur;
  s.innerHTML=opts.map(c=>`<option value="${esc(c)}" ${c===cur?'selected':''}>${c==='*'?'Toutes les chaînes':esc(c)}</option>`).join('')}
function showTab(t){if(t==='map')mapIntroKey='';tab=t;window.dispatchEvent(new CustomEvent('legacy:tab',{detail:t})); // la coque React suit l'onglet
  document.querySelectorAll('section').forEach(s=>s.classList.toggle('hide',s.id!=='t-'+t));
  document.body.classList.toggle('mapmode',t==='map');if(t==='map')window.scrollTo(0,0); // carte : pleine page, filtres dans son menu
  $('filters').classList.toggle('hide',t==='settings'||t==='map');$('t-map').style.height='';$('chanSel').classList.add('hide') /* Par chaîne et Chat ont leur barre de choix avec les photos (React) */;buildChanSel();hideTip();lastMap=0;render()}
$('langSeg').onclick=e=>{const b=e.target.closest('button');if(!b)return;cfg.lang=b.dataset.l;saveCfg();buildChanSel();render()};
$('period').onclick=e=>{const b=e.target.closest('button');if(!b)return;period=b.dataset.p;document.querySelectorAll('#period button').forEach(x=>x.classList.toggle('on',x===b));render()};
$('chanSel').onchange=e=>{if(tab==='chat')selChat=e.target.value;else selChan=e.target.value;render()};
$('btnStart').onclick=start;$('btnStop').onclick=stop;
document.body.addEventListener('click',e=>{
  const o=e.target.closest('[data-open]');if(o){selChan=o.dataset.open;buildChanSel();showTab('channel');return}
  const g=e.target.closest('[data-goto]');if(g){e.preventDefault();showTab(g.dataset.goto);return}
  const ch=e.target.closest('[data-chat]');if(ch){selChat=ch.dataset.chat;buildChanSel();render();return}
  const a=e.target.closest('[data-add]');if(a){const im=a.closest('.res')&&a.closest('.res').querySelector('img');if(im)setAvatar(a.dataset.add,im.src);addChans([a.dataset.add]);return}
  const at=e.target.closest('[data-addtop]');if(at&&discover&&discover.list){addChans(discover.list.slice(0,+at.dataset.addtop));return}
});
/* ---------- Réglages : actions appelées par React (app/src/components/settings/) ---------- */
function settingsMode(m){return setMode(m).then(renderSettings)}
async function saveSupabase(url,key,code){cfg.sbUrl=String(url||'').trim();cfg.sbKey=String(key||'').trim();cfg.sbCode=String(code||'').trim();saveCfg();
  if(isSecretKey(cfg.sbKey)){cfg.sbKey='';saveCfg();setSmsg('sb','C\'est la clé secrète : elle doit rester dans config.json sur ton PC. Colle ici la clé publique.');return}
  cloudReset();DB=freshDB();await idb.put(dbKey(),DB);cloud.err='';cloud.last=0;setSmsg('sb','Connexion…');applyMode();await cloudSync();renderSettings();render()}
async function saveBoardCode(code){cfg.sbCode=String(code||'').trim();saveCfg();cloud.err='';cloud.last=0;setSmsg('sb','Connexion…');await cloudSync();renderSettings();render()}
window.saveSupabase=saveSupabase;window.saveBoardCode=saveBoardCode;
function addFromSearch(login,img){if(img)setAvatar(login,img);addChans([login])}
function importLocal(){addChans(pendingLocal())}
function dropLocal(){cfg.localIgnored=[...new Set([...(cfg.localIgnored||[]),...pendingLocal()])];saveCfg();renderSettings()}
function openAddStreamer(){showTab('settings');window.dispatchEvent(new Event('legacy:focus-add'))} // bouton de la barre latérale (React)

// Expose functions needed by React for tab switching
// Historique d'une chaîne lu dans les rollups quotidiens (fonction SQL channel_history, voir schema.sql). null : pas de base Supabase
// (mode local) ou fonction absente d'une base pas à jour ; React affiche alors une explication.
async function channelHistory(c,days){
  if(!isCloud())return null;
  try{const h=await sbReq('rpc/channel_history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ch:c,days})});
    return {days:h.days||[],out:(h.out||[]).map(x=>({...who(x.c),n:x.n,raid:x.raid})),in:(h.in||[]).map(x=>({...who(x.c),n:x.n,raid:x.raid}))}}
  catch(e){if(/PGRST202|Could not find the function|404/.test(e.message))return null;throw e}}
window.channelHistory = channelHistory
// Fidélité du chat d'une chaîne (« Sticky-Factor ») : viewers actifs et viewers partis chez une autre chaîne suivie, par jour, et quartiles
// des chaînes suivies (fonction SQL channel_stickiness, voir schema.sql). null : pas de base Supabase (mode local) ou fonction absente
// d'une base pas à jour. Le score sur 100 se calcule dans React (components/channel/sticky.tsx).
async function channelSticky(c,days){
  if(!isCloud())return null;
  try{return await sbReq('rpc/channel_stickiness',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ch:c,days})})}
  catch(e){if(/PGRST202|Could not find the function|404/.test(e.message))return null;throw e}}
window.channelSticky = channelSticky
// Rythme des chaînes (alertes « décolle » / « ralentit ») : moyenne des viewers actifs des 7 derniers jours agrégés et des jours d'avant,
// par chaîne ayant au moins 14 journées (fonction SQL channels_rhythm, voir schema.sql). null : pas de base Supabase ou base pas à jour.
async function channelsRhythm(days){
  if(!isCloud())return null;
  try{const rows=await sbReq('rpc/channels_rhythm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({days})});
    return (rows||[]).map(r=>({...who(r.c),nr:r.nr,nb:r.nb,recent:r.recent,base:r.base,sd:r.sd}))}
  catch(e){if(/PGRST202|Could not find the function|404/.test(e.message))return null;throw e}}
window.channelsRhythm = channelsRhythm
// Viewers uniques sur 7, 30 ou 90 jours (fonction SQL period_reach, esquisses HyperLogLog, voir schema.sql). null : pas de base Supabase
// ou base pas à jour. Les jours incomplets ne comptent pas : aujourd'hui n'est agrégé que cette nuit.
async function periodReach(chans,days){
  if(!isCloud())return null;
  try{return await sbReq('rpc/period_reach',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chans,days})})}
  catch(e){if(/PGRST202|Could not find the function|404/.test(e.message))return null;throw e}}
window.periodReach = periodReach
// Historique du réseau entier (fonction SQL network_history, voir schema.sql) ; les viewers uniques du réseau passent par periodReach(['*'], jours).
async function networkHistory(days){
  if(!isCloud())return null;
  try{const h=await sbReq('rpc/network_history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({days})});
    return {days:h.days||[],top:(h.top||[]).map(x=>({...who(x.c),msgs:x.msgs,avg:x.avg}))}}
  catch(e){if(/PGRST202|Could not find the function|404/.test(e.message))return null;throw e}}
window.networkHistory = networkHistory
// Chaînes non suivies qui ont raidé des chaînes suivies, sur 30 jours (table raid_events). Une même paire à moins d'une minute
// d'écart compte pour un seul raid : la table contient des doublons (23 au 25/11). Retenues : au moins 2 raids ou 20 viewers envoyés.
// null : pas de base Supabase ou base sans la table. La réponse de la base est gardée 10 minutes.
let raidCache={key:'',at:0,rows:null};
async function raidRows(){
  const key=sbBase()+'|'+(cfg.sbCode||'');
  if(raidCache.key===key&&Date.now()-raidCache.at<600000)return raidCache.rows;
  const since=Date.now()-30*86400000,rows=[];
  for(let page=0;page<20;page++){
    const r=await sbReq('raid_events?select=ts,from_channel,to_channel,viewers&ts=gte.'+since+'&order=ts.asc,id.asc&limit=1000&offset='+rows.length);
    if(!r||!r.length)break;rows.push(...r)}
  raidCache={key,at:Date.now(),rows};return rows}
async function raidSuggestions(){
  if(!isCloud())return null;
  let rows;try{rows=await raidRows()}catch(e){if(/PGRST205|PGRST202|42P01|404/.test(e.message))return null;throw e}
  const followed=new Set(cfg.chans),lastPair=new Map(),by=new Map();
  for(const r of rows){
    const c=String(r.from_channel||'').toLowerCase(),to=String(r.to_channel||'').toLowerCase(),pair=c+'|'+to,prev=lastPair.get(pair);
    lastPair.set(pair,r.ts);
    if(prev!=null&&r.ts-prev<60000)continue;
    if(!/^[a-z0-9_]{2,25}$/.test(c)||followed.has(c)||!followed.has(to))continue;
    const x=by.get(c)||{c,raids:0,viewers:0,to:new Set(),last:0};
    x.raids++;x.viewers+=r.viewers||0;x.to.add(to);x.last=Math.max(x.last,r.ts);by.set(c,x)}
  const items=[...by.values()].filter(x=>x.raids>=2||x.viewers>=20).sort((a,b)=>b.viewers-a.viewers||b.raids-a.raids||a.c.localeCompare(b.c))
    .slice(0,100).map(x=>({...x,to:[...x.to]}));
  return {since:rows.length?rows[0].ts:0,items};
}
window.raidSuggestions = raidSuggestions
window.showTab = showTab
window.openAddStreamer = openAddStreamer
window.renderFlows = renderFlows
window.getCurrentQuery = Q
function saveChanList(text){const list=[...new Set(String(text||'').toLowerCase().split(/[\s,;]+/).map(s=>s.replace(/^#|^https?:\/\/(www\.)?twitch\.tv\//,'')).filter(s=>/^[a-z0-9_]{2,25}$/.test(s)))];
  const removed=cfg.chans.filter(c=>!list.includes(c));
  if(isCloud()){const added=list.filter(c=>!cfg.chans.includes(c));smsg.chans='Enregistrement…';
    cloudRemoveChans(removed).then(()=>cloudAddChans(added)).then(()=>cloudSync()).then(()=>{smsg.chans=`${list.length} chaînes enregistrées. Le collecteur s'adapte dans la minute.`;renderSettings()}).catch(e=>setSmsg('chans','Échec : '+e.message));return}
  cfg.chans=[];addChans(list);
  if(running&&ws&&ws.readyState===1)removed.forEach(c=>ws.send('PART #'+c));
  smsg.chans=`${list.length} chaînes enregistrées.`;renderSettings()}
function saveApi(clientId,token){cfg.clientId=String(clientId||'').trim();cfg.token=String(token||'').trim().replace(/^Bearer\s+/i,'');saveCfg();apiState='';
  if(apiReady())pollStreams().then(renderSettings);renderSettings()}
// renvoie true si le jeton a été généré (React vide alors le champ du secret, qui n'est jamais gardé)
async function genToken(clientId,secret){const id=String(clientId||'').trim(),sec=String(secret||'').trim();if(!id||!sec){setSmsg('api','Mets le Client ID et le secret.');return false}
  setSmsg('api','Génération…');
  try{const r=await fetch('https://id.twitch.tv/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:id,client_secret:sec,grant_type:'client_credentials'})});
    const j=await r.json();if(!j.access_token)throw new Error(j.message||'réponse inattendue');
    cfg.clientId=id;cfg.token=j.access_token;saveCfg();apiState='';await pollStreams();
    smsg.api=apiStatusLbl()+` Jeton valable ${Math.round(j.expires_in/86400)} jours.`;renderSettings();return true}
  catch(e){setSmsg('api','Échec : '+e.message+'. Tu peux aussi générer le jeton avec la Twitch CLI et le coller.');return false}}
function exportDb(){flushMinutes(false);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({v:2,cfg:{chans:cfg.chans},DB})],{type:'application/json'}));
  a.download='twitch-overlap-sauvegarde-'+dayKey(Date.now())+'.json';document.body.appendChild(a);a.click();a.remove()}
async function importDbFile(f){if(!f)return;try{const j=JSON.parse(await f.text());if(!j.DB||!j.DB.presence)throw new Error('fichier non reconnu');hashLegacy(j.DB);
  for(const k in j.DB.presence){const p=j.DB.presence[k],o=DB.presence[k];if(!o)DB.presence[k]=p;else{o.f=Math.min(o.f,p.f);o.l=Math.max(o.l,p.l);o.n=Math.max(o.n,p.n)}}
  Object.assign(DB.minutes,j.DB.minutes);const sk=new Set(DB.snaps.map(s=>s.t+s.c));DB.snaps.push(...j.DB.snaps.filter(s=>!sk.has(s.t+s.c)));
  const ek=new Set(DB.events.map(x=>x.t+x.c+x.type));DB.events.push(...j.DB.events.filter(x=>!ek.has(x.t+x.c+x.type)));
  // le reste de la sauvegarde : mots et emotes, VOD, followers et état du chat, clips, périodes d'écoute.
  // Restaurer deux fois le même fichier ne double rien : on garde la version la plus complète de chaque ligne.
  for(const k in j.DB.words||{}){const w=j.DB.words[k],o=DB.words[k];if(!o||(w.n||0)>(o.n||0))DB.words[k]=w}
  for(const c in j.DB.vods||{}){const a=DB.vods[c]=DB.vods[c]||[];for(const v of j.DB.vods[c]||[])if(!a.some(x=>x.id===v.id))a.push(v)}
  DB.meta=DB.meta||{};for(const c in j.DB.meta||{}){const a=DB.meta[c]=DB.meta[c]||[];for(const x of j.DB.meta[c]||[])if(!a.some(y=>y.t===x.t))a.push(x);a.sort((x,y)=>x.t-y.t)}
  DB.clips=DB.clips||{};for(const k in j.DB.clips||{}){const x=j.DB.clips[k],o=DB.clips[k];if(!o||(x.v||0)>(o.v||0))DB.clips[k]=x}
  DB.ecoute=DB.ecoute||{};for(const k in j.DB.ecoute||{}){const x=j.DB.ecoute[k],o=DB.ecoute[k];if(!o||x.e>o.e)DB.ecoute[k]=x}
  DB.switches=DB.switches||{};for(const k in j.DB.switches||{}){const x=j.DB.switches[k],o=DB.switches[k];if(!o||(x.n||0)>(o.n||0))DB.switches[k]=x}
  // En mode collecteur, la liste des chaînes est celle du collecteur : une sauvegarde ne doit pas la modifier en douce.
  DB.trackedMs=Math.max(DB.trackedMs,j.DB.trackedMs||0);if(j.cfg&&j.cfg.chans&&!isCloud())addChans(j.cfg.chans);dirty=true;await persist();setSmsg('db','Sauvegarde restaurée.')}
  catch(err){setSmsg('db','Échec : '+err.message)}}
// la confirmation (« Confirmer l'effacement ») est demandée par React avant d'appeler resetDb()
async function resetDb(){cloudReset();DB=freshDB();for(const c in curMin)delete curMin[c];dirty=true;await idb.put(dbKey(),DB);if(isCloud())cloudSync().then(render);renderSettings()}
window.forceFullResync = forceFullResync
window.addEventListener('beforeunload',()=>{if(running){flushMinutes(true);persist()}});
let rz;window.addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(render,200)});

(async()=>{await idb.open();const saved=await idb.get(dbKey());if(saved&&saved.presence)DB=restoreDB(saved);applyMode()})();
