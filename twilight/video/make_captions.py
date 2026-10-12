"""Turn a filled avar-perevod.txt into captions-av.json (untranslated lines keep the Russian text).
Usage: python3 twilight/video/make_captions.py twilight/video/avar-perevod.txt twilight/video/captions-av.json"""
import copy, json, os, re, sys
src, out = sys.argv[1], sys.argv[2]
ru = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'captions-ru.json'), encoding='utf-8'))
av = copy.deepcopy(ru)
key = None
for line in open(src, encoding='utf-8-sig'):
    m = re.match(r'\s*\d+\.\s*\[([^\]]+)\]', line)
    if m: key = m.group(1); continue
    m = re.match(r'\s*=\s?(.*)$', line.rstrip('\r\n'))
    if not (m and key and m.group(1).strip()): continue
    path, val = key.split('.'), m.group(1).strip()
    node = av
    for p in path[:-1]: node = node[int(p)] if isinstance(node, list) else node[p]
    last = path[-1] if not path[:-1] or path[0] != 'labels' else '.'.join(path[1:])
    if path[0] == 'labels': av['labels'][last] = val
    elif isinstance(node, list): node[int(path[-1])] = val
    else: node[path[-1]] = val
    key = None
av['hudDate'] = False   # the on-screen date and twilight names are Russian, hide them
json.dump(av, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('written', out)
