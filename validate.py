from pathlib import Path
from html.parser import HTMLParser
import json,re,zipfile,xml.etree.ElementTree as ET
from PIL import Image
root=Path(__file__).parent/'site'
class Links(HTMLParser):
 def __init__(self): super().__init__();self.links=[]
 def handle_starttag(self,tag,attrs):
  for k,v in attrs:
   if k in ('src','href') and v and not v.startswith(('#','http:','https:','data:','mailto:')):self.links.append(v.split('#')[0].split('?')[0])
p=Links();p.feed((root/'index.html').read_text())
missing=[v for v in p.links if not (root/v.removeprefix('/energy-socials-analytics/')).is_file()]
data=json.loads((root.parent/'web/data/source.json').read_text())
for post in data['posts']:
 for key in ['embedded','image']:
  if post.get(key) and not (root/post[key]).is_file(): missing.append(post[key])
assert sum(bool(p.get('thumbnails')) for p in data['posts'])==276
for post in data['posts']:
 for thumbnail in post.get('thumbnails',[]):
  path=root/thumbnail['src']
  assert path.is_file(),path
  with Image.open(path) as image:
   assert image.format=='WEBP'
   assert image.size==(thumbnail['width'],thumbnail['height'])
   assert max(image.size)<=640
   assert abs(image.width/image.height-post['width']/post['height'])<.025
assert not missing,missing
assert len(data['posts'])==277
assert len(list((root/'d3_figures').glob('*.svg')))==30
assert len(list((root/'d3_figures').glob('*.png')))==30
assert max(p.stat().st_size for p in root.rglob('*') if p.is_file())<100*1024*1024
with zipfile.ZipFile(root/'Riad_Meddeb_Expanded_Dataset.xlsx') as z:
 targets=[el.get('Target') for n in z.namelist() if n.endswith('.rels') for el in ET.fromstring(z.read(n)) if el.get('TargetMode')=='External']
 assert all(t.startswith(('http:','https:')) or (root/t).is_file() for t in targets)
print('PASS: entry-point assets, 277 records, 276 visuals with verified responsive WebP thumbnails, original image paths, 30 SVG/PNG pairs, workbook links and GitHub file-size limits.')

compact=json.loads((root.parent/'web/src/site-data.json').read_text())
assert len(compact['posts'])==len({p['id'] for p in compact['posts']})==277
assert all('caption' in p for p in compact['posts'])
catalog=json.loads((root.parent/'web/src/catalog.json').read_text())
assert len(catalog)==16 and all(f['number']<24 for f in catalog)
html=(root/'index.html').read_text()
inline=re.search(r'<script id="atlas-data" type="application/json">(.*?)</script>',html,re.S)
expected={**compact,'sprite':{k:compact['sprite'][k] for k in ['cols','rows']}}
assert inline and json.loads(inline.group(1))==expected
assert html.count('class="post-icon"')==277
assert html.count('class="figure"')==16
assert 'post-atlas-' not in html
scripts=[v for v in p.links if v.endswith('.js')]
assert len(scripts)==1
assert (root/scripts[0].removeprefix('/energy-socials-analytics/')).stat().st_size<20000
packs=json.loads((root.parent/'web/data/image-packs.json').read_text())
assert len(packs['packs'])==9
assert packs['low']['bytes']<80000
assert all((root/p['src']).stat().st_size<60000 for p in packs['packs'])
coords=[tuple(p['sprite']) for p in compact['posts'] if p['image']]
assert len(coords)==len(set(coords))==276
previews=[p['preview'] for p in compact['posts'] if p['image']]
assert len(previews)==276 and all((root/p).is_file() for p in previews)
assert all(p.endswith('.webp') for p in previews)
print('PASS: static HTML contains 277 posts and 16 analyses; inline captions; entry JavaScript under 20KB; nine image packs under 60KB each; 276 unique embedded preview cells and optimized detail previews.')
