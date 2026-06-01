"""
Builds items_data.js for the item drop browser (maple_items.html).
Inverts the FULL Cosmic drop tables (152-drop-data per-mob + 151 global) into
item -> [mobs that drop it, sorted by chance]. Names from String WZ XMLs.
Output: window.MAPLE_DATA = {meta, mobs:{id:name}, items:[{id,name,cat,d:[[mobid,chance,qty?]]}]}
chance is raw (per 1,000,000); the page formats it.
"""
import os, re, json, sys
from collections import defaultdict
import xml.etree.ElementTree as ET

sys.stdout.reconfigure(encoding='utf-8')

COSMIC = r'C:\Users\maico\dev\Maple\Cosmic'
STRING = os.path.join(COSMIC, r'wz\String.wz')
DATA   = os.path.join(COSMIC, r'src\main\resources\db\data')
OUT    = os.path.dirname(os.path.abspath(__file__))

def load_names(path):
    names = {}
    if not os.path.exists(path):
        return names
    for e in ET.parse(path).getroot().iter('imgdir'):
        n = e.get('name')
        if n and n.isdigit():
            for s in e.findall('string'):
                if s.get('name') == 'name':
                    names[int(n)] = s.get('value', '')
    return names

item_names = {}
for f in ['Eqp.img.xml', 'Consume.img.xml', 'Etc.img.xml', 'Ins.img.xml', 'Cash.img.xml']:
    item_names.update(load_names(os.path.join(STRING, f)))
mob_names = load_names(os.path.join(STRING, 'Mob.img.xml'))

CAT = {1: 'Equip', 2: 'Use', 3: 'Setup', 4: 'Etc', 5: 'Cash'}
cat_of = lambda i: CAT.get(i // 1000000, '?')

item_drops = defaultdict(dict)   # itemid -> {mobid: (chance, min, max)}
mobs_used = {}

tup6 = re.compile(r'\((\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)')
with open(os.path.join(DATA, '152-drop-data.sql'), encoding='utf-8') as fh:
    for mob, item, mn, mx, _q, ch in tup6.findall(fh.read()):
        item = int(item)
        if item == 0:            # mesos, skip
            continue
        mob, mn, mx, ch = int(mob), int(mn), int(mx), int(ch)
        prev = item_drops[item].get(mob)
        if prev is None or ch > prev[0]:
            item_drops[item][mob] = (ch, mn, mx)

# global drops -> synthetic negative mob ids
gpat = re.compile(r"\(\s*(-?\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*'([^']*)'\)")
glabel = {}
with open(os.path.join(DATA, '151-global-drop-data.sql'), encoding='utf-8') as fh:
    for cont, item, mn, mx, _q, ch, _cm in gpat.findall(fh.read()):
        item = int(item)
        if item == 0:
            continue
        cont, mn, mx, ch = int(cont), int(mn), int(mx), int(ch)
        key = -1 if cont == -1 else -(100 + abs(cont))
        glabel[key] = 'Global drop (all maps)' if cont == -1 else f'Global drop (continent {cont})'
        prev = item_drops[item].get(key)
        if prev is None or ch > prev[0]:
            item_drops[item][key] = (ch, mn, mx)

items = []
for item, drops in item_drops.items():
    d = []
    for mob, (ch, mn, mx) in sorted(drops.items(), key=lambda kv: -kv[1][0]):
        mobs_used[str(mob)] = glabel.get(mob) if mob < 0 else mob_names.get(mob, f'mob {mob}')
        qty = f'{mn}-{mx}' if mx > mn else (str(mn) if mn != 1 else None)
        d.append([mob, ch] + ([qty] if qty else []))
    items.append({'id': item, 'name': item_names.get(item, ''), 'cat': cat_of(item), 'd': d})

items.sort(key=lambda x: (x['name'] == '', x['name'].lower(), x['id']))

data = {
    'meta': {'items': len(items), 'pairs': sum(len(i['d']) for i in items),
             'iconBase': 'https://maplestory.io/api/GMS/83/item/'},
    'mobs': mobs_used,
    'items': items,
}
path = os.path.join(OUT, 'items_data.js')
with open(path, 'w', encoding='utf-8') as fh:
    fh.write('window.MAPLE_DATA=')
    json.dump(data, fh, ensure_ascii=False, separators=(',', ':'))
    fh.write(';')

print(f"items={len(items)}  mobs={len(mobs_used)}  drop-pairs={data['meta']['pairs']}")
print(f"items_data.js = {os.path.getsize(path)/1024:.0f} KB")
