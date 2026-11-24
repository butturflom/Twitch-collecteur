const fs = require('fs');
const content = fs.readFileSync('legacy.js', 'utf8');

// Ligne 1177: Affiner le liseré (mec) - enlever stroke-linecap, réduire stroke-width
const old1 = '+(\'<g class="mec" fill="none" stroke="#020202" stroke-width="2" stroke-linecap="round">\'+edges.map(()=>\'<path/>\').join(\'\')+\'</g>\')';
const new1 = '+(\'<g class="mec" fill="none" stroke="#020202" stroke-width="1.2">\'+edges.map(()=>\'<path/>\').join(\'\')+\'</g>\')';

// Ligne 1179: Enlever les chevrons du groupe mar
const old2 = '+(\'<g class="mar" fill="none" stroke="\'+MAP_LINK+\'" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">\'+edges.map((e,i)=>EDIR[i]?\'<path d="M-4 -4.2L3.2 0L-4 4.2"/>\':\'<path/>\').join(\'\')+\'</g><g class="mel"></g><g class="mfx"></g><g class="mn">\'+twG\')';
const new2 = '+(\'<g class="mar" fill="none" stroke="\'+MAP_LINK+\'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round\"><!-- chevrons directionnels supprimés --></g><g class="mel"></g><g class="mfx"></g><g class="mn">\'+twG\')';

let newContent = content;
let count = 0;

// Utiliser les expressions régulières pour les remplacements
newContent = newContent.replace(
  /\+'(\<g class="mec" fill="none" stroke="#020202" stroke-width="2" stroke-linecap="round">)' \+ edges\.map\(\(\)=>'<path\/>'\)\.join\(''\)\+ '<\/g>'/,
  '+(\'<g class="mec" fill="none" stroke="#020202" stroke-width="1.2">\'+edges.map(()=>\'<path/>\').join(\'\')+\'</g>\')'
);

newContent = newContent.replace(
  /(\<g class="mar" fill="none" stroke="\+MAP_LINK\+" stroke-width="1\.7" stroke-linecap="round" stroke-linejoin="round">)\+edges\.map\(\(e,i\)=&gt;EDIR\[i\]\?'&lt;path d="M-4 -4\.2L3\.2 0L-4 4\.2"\/>':'&lt;path\/&gt;' \)\.join\(''\)\+ '&lt;\/*\/g&gt;&lt;g class="mel"&gt;&lt;\/g&gt;&lt;g class="mfx"&gt;&lt;\/g&gt;&lt;g class="mn"&gt;\\'+twG/,
  '$1<!-- chevrons directionnels supprimés --></g><g class="mel"></g><g class="mfx"></g><g class="mn">\'+twG'
);

fs.writeFileSync('legacy.js', newContent);
console.log('Modifications appliquées avec succès');