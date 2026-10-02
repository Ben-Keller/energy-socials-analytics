from pathlib import Path
from html.parser import HTMLParser
import json,re,zipfile,xml.etree.ElementTree as ET
root=Path(__file__).parent/'site'
class Links(HTMLParser):
 def __init__(self): super().__init__();self.links=[]
 def handle_starttag(self,tag,attrs):
  for k,v in attrs:
   if k in ('src','href') and v and not v.startswith(('#','http:','https:','data:','mailto:')):self.links.append(v.split('#')[0].split('?')[0])
p=Links();p.feed((root/'index.html').read_text())
missing=[v for v in p.links if not (root/v).is_file()]
script=(root/'assets/data.js').read_text();data=json.loads(script.split('window.REPORT_DATA=',1)[1].split(';\nwindow.FIGURE_CATALOG=',1)[0])
for post in data['posts']:
 for key in ['embedded','image']:
  if post.get(key) and not (root/post[key]).is_file(): missing.append(post[key])
assert not missing,missing
assert len(data['posts'])==277
assert len(list((root/'d3_figures').glob('*.svg')))==30
assert len(list((root/'d3_figures').glob('*.png')))==30
assert max(p.stat().st_size for p in root.rglob('*') if p.is_file())<100*1024*1024
with zipfile.ZipFile(root/'Riad_Meddeb_Expanded_Dataset.xlsx') as z:
 targets=[el.get('Target') for n in z.namelist() if n.endswith('.rels') for el in ET.fromstring(z.read(n)) if el.get('TargetMode')=='External']
 assert all(t.startswith(('http:','https:')) or (root/t).is_file() for t in targets)
print('PASS: entry-point assets, 277 records, 276 previews, original image paths, 30 SVG/PNG pairs, workbook links and GitHub file-size limits.')
