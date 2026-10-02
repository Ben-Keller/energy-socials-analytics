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
missing=[v for v in p.links if not (root/v).is_file()]
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

compact=json.loads((root/'data/posts.json').read_text())
assert len(compact['posts'])==277
assert len({p['id'] for p in compact['posts']})==277
assert all('caption' not in p and 'baseline' not in p for p in compact['posts'])
assert (root/'data/posts.json').stat().st_size<250000
assert len(list((root/'data/posts').glob('*.json')))==277
assert len(json.loads((root.parent/'web/src/catalog.json').read_text()))==22
assert 'd3-' not in (root/'index.html').read_text()
print('PASS: unique atlas records, separate captions, initial metadata budget, 22 deferred analyses and no eager D3 bundle.')
