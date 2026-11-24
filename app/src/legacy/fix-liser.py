#!/usr/bin/env python3
import re

with open('legacy.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Modification 1: Affiner le liseré (mec) - enlever stroke-linecap, réduire stroke-width
old_mec = '+(\'<g class="mec" fill="none" stroke="#020202" stroke-width="2" stroke-linecap="round">\'+edges.map(()=>\'<path/>\').join(\'\')+\'</g>\')'
new_mec = '+(\'<g class="mec" fill="none" stroke="#020202" stroke-width="1.2">\'+edges.map(()=>\'<path/>\').join(\'\')+\'</g>\')'

# Modification 2: Enlever les chevrons du groupe mar
old_mar = '+(\'<g class="mar" fill="none" stroke="\'+MAP_LINK+\'" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">\'+edges.map((e,i)=>EDIR[i]?\'<path d="M-4 -4.2L3.2 0L-4 4.2"/>\':\'<path/>\').join(\'\')+\'</g><g class="mel"></g><g class="mfx"></g><g class="mn">\'+twG\')'
new_mar = '+(\'<g class="mar" fill="none" stroke="\'+MAP_LINK+\'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round\"><!-- chevrons directionnels supprimés --></g><g class="mel"></g><g class="mfx"></g><g class="mn">\'+twG\')'

content = content.replace(old_mec, new_mec)
content = content.replace(old_mar, new_mar)

with open('legacy.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Modifications appliquées avec succès')