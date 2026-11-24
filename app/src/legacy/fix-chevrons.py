#!/usr/bin/env python3
import re

with open('legacy.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to match the mar group with chevrons
old_line = '+\'<g class="mar" fill="none" stroke="\' + MAP_LINK + \'" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"\'+edges.map((e,i)=>EDIR[i]?\'<path d="M-4 -4.2L3.2 0L-4 4.2"/>\':\'<path/>\').join(\'\')+\'</g><g class="mel"></g><g class="mfx"></g><g class="mn"\'+twG'

# New line without chevrons
new_line = '+\'<g class="mar" fill="none" stroke="\' + MAP_LINK + \'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><!-- chevrons directionnels supprimés --></g><g class="mel"></g><g class="mfx"></g><g class="mn"\'+twG'

content = content.replace(old_line, new_line)

with open('legacy.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Modifications appliquées avec succès')