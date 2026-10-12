"""Build a single self-contained HTML file of the twilight explainer that works without internet.

three.js, OrbitControls and the fonts are embedded into the page, so it opens by double-click
in any modern browser (Edge, Chrome, Firefox) on Windows, macOS or Linux.

Usage (needs Node's npm only to download the packages):
    mkdir vendor && cd vendor
    for p in three@0.128.0 @fontsource/unbounded @fontsource/golos-text @fontsource/jetbrains-mono @fontsource/amiri; do
        f=$(npm pack "$p" --silent); mkdir "${f%.tgz}"; tar xzf "$f" -C "${f%.tgz}"; done
    cd .. && python3 twilight/build_offline.py vendor twilight/offline/twilight-offline.html
"""
import base64, glob, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
vendor, out = sys.argv[1], sys.argv[2]

def pkg(prefix):
    hits = glob.glob(os.path.join(vendor, prefix + '-*', 'package'))
    if not hits:
        sys.exit('package not found in ' + vendor + ': ' + prefix)
    return hits[0]

def inline_script(path):
    js = open(path, encoding='utf-8').read().replace('</script', '<\\/script')
    return '<script>\n' + js + '\n</script>'

# family, weights and character subsets the page uses
FONTS = [
    ('unbounded', (500, 600), ('cyrillic', 'latin')),
    ('golos-text', (400, 500, 600), ('cyrillic', 'latin')),
    ('jetbrains-mono', (400, 500), ('cyrillic', 'latin')),
    ('amiri', (400,), ('arabic',)),
]
faces = []
for fam, weights, subsets in FONTS:
    root = pkg('fontsource-' + fam)
    for w in weights:
        css = open(os.path.join(root, f'{w}.css'), encoding='utf-8').read()
        for block in re.findall(r'@font-face\s*{[^}]*}', css):
            name = re.search(r'files/([\w-]+)\.woff2', block).group(1)
            if name not in {f'{fam}-{sub}-{w}-normal' for sub in subsets}:
                continue
            data = base64.b64encode(open(os.path.join(root, 'files', name + '.woff2'), 'rb').read()).decode()
            faces.append(re.sub(r'src:[^;]*;', f"src: url(data:font/woff2;base64,{data}) format('woff2');", block))

three = pkg('three')
page = open(os.path.join(HERE, 'index.html'), encoding='utf-8').read()
page = re.sub(r'<link rel="preconnect"[^>]*>\n', '', page)
page = re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>\n', '', page)
page = page.replace('</title>\n', '</title>\n<style>\n/* embedded fonts, SIL Open Font License */\n' + '\n'.join(faces) + '\n</style>\n', 1)
page = page.replace('<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"></script>',
                    inline_script(os.path.join(three, 'build', 'three.min.js')))
page = page.replace('<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>',
                    inline_script(os.path.join(three, 'examples', 'js', 'controls', 'OrbitControls.js')))
if re.search(r'<(script|link)[^>]+(src|href)="https?://', page):
    sys.exit('external resources are still referenced')
os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
open(out, 'w', encoding='utf-8', newline='\r\n').write(page)
print(out, round(len(page.encode()) / 1024), 'KB,', len(faces), 'font faces')
