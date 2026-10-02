from pathlib import Path
import json,re,shutil,hashlib
from PIL import Image,ImageOps
from concurrent.futures import ThreadPoolExecutor
O=Path('outputs/linkedin_audit_20261002'); root=Path('github-pages'); site=root/'site'; assets=site/'assets';assets.mkdir(parents=True,exist_ok=True)
s=(O/'Visual_Gallery.html').read_text();data=json.loads((O/'visual_assets/d3_report_data.json').read_text());count=0
thumbdir=O/'thumbnails';thumbdir.mkdir(exist_ok=True)
def make_thumbnails(post):
 if not post.get('image'): return 0
 source=O/post['image'];digest=hashlib.sha256(source.read_bytes()).hexdigest()[:10]
 variants=[]
 with Image.open(source) as image:
  original=ImageOps.exif_transpose(image).convert('RGB')
  seen=set()
  for edge,quality in [(160,72),(320,77),(640,82)]:
   preview=original.copy();preview.thumbnail((edge,edge),Image.Resampling.LANCZOS)
   if preview.width in seen: continue
   seen.add(preview.width)
   name=f'{post["id"]}-{digest}-{edge}.webp';target=thumbdir/name
   if not target.exists():preview.save(target,'WEBP',quality=quality,method=6)
   variants.append({'src':'thumbnails/'+name,'width':preview.width,'height':preview.height,'bytes':target.stat().st_size})
 post['thumbnails']=variants
 post['thumbnail']=variants[0]['src']
 post['embedded']=variants[min(1,len(variants)-1)]['src']
 return 1
with ThreadPoolExecutor(max_workers=4) as executor:count=sum(executor.map(make_thumbnails,data['posts']))
shutil.copytree(thumbdir,site/'thumbnails',dirs_exist_ok=True)
# These generated JPEG previews have been replaced by responsive WebP derivatives.
for old in assets.glob('preview-*'):old.unlink()
manifest=[{'id':p['id'],'original':p['image'],'variants':p['thumbnails']} for p in data['posts'] if p.get('thumbnails')]
(thumbdir/'manifest.json').write_text(json.dumps(manifest,indent=2))
(site/'thumbnails/manifest.json').write_text(json.dumps(manifest,indent=2))
# Keep data cacheable and load images independently of the HTML document.
scripts=re.findall(r'<script([^>]*)>(.*?)</script>',s,re.S)
app=scripts[-1][1];app=app.replace("JSON.parse(document.querySelector('#report-data').textContent)",'window.REPORT_DATA').replace("JSON.parse(document.querySelector('#figure-catalog').textContent)",'window.FIGURE_CATALOG')
(assets/'data.js').write_text('window.REPORT_DATA='+json.dumps(data,separators=(',',':'))+';\nwindow.FIGURE_CATALOG='+(O/'visual_assets/figure_catalog.json').read_text()+';')
app=app.replace(".attr('href',p.embedded)",".attr('data-src',p.thumbnail||p.embedded).attr('data-export-src',p.image||p.embedded)")
app+="\ndocument.querySelectorAll('.report-snapshot').forEach(details=>details.addEventListener('toggle',()=>{if(details.open)details.querySelectorAll('image[data-src]').forEach(img=>{if(!img.getAttribute('href'))img.setAttribute('href',img.dataset.src)})}));\n"
(assets/'app.js').write_text(app)
shutil.copy2(O/'visual_assets/vendor/d3.v7.9.0.min.js',assets/'d3.min.js')
for f in (O/'visual_assets/vendor').iterdir():
 if 'license' in f.name.lower():shutil.copy2(f,assets/f.name)
s=re.sub(r'<script[^>]*>.*?</script>','',s,flags=re.S)
css=re.search(r'<style>(.*?)</style>',s,re.S).group(1);(assets/'styles.css').write_text(css)
s=re.sub(r'<style>.*?</style>','<link rel="stylesheet" href="assets/styles.css">',s,flags=re.S)
s=s.replace('</head>','<script defer src="assets/d3.min.js"></script><script defer src="assets/data.js"></script><script defer src="assets/app.js"></script></head>')
s=s.replace('This page and the linked files work offline when kept together.','Downloadable files accompany this interactive gallery.')
s=s.replace('</body>','<noscript><p>This interactive gallery requires JavaScript. You can still download the Word report and spreadsheet using the links above.</p></noscript></body>')
for asset in ['app.js','styles.css','data.js']:
 s=s.replace('assets/'+asset,'assets/'+asset+'?v='+hashlib.sha256((assets/asset).read_bytes()).hexdigest()[:12])
(site/'index.html').write_text(s);(site/'Visual_Gallery.html').write_text('<!doctype html><meta charset="utf-8"><title>Visual gallery</title><script>location.replace("./index.html"+location.search+location.hash)</script><a href="./index.html">Open the gallery</a>');(site/'.nojekyll').touch()
for name in ['post_images','d3_figures']:
 shutil.copytree(O/name,site/name,dirs_exist_ok=True)
for name in ['Riad_Meddeb_LinkedIn_Visual_Analysis.docx','Riad_Meddeb_Expanded_Dataset.xlsx','Riad_Meddeb_Expanded_Dataset.csv','Figure_Source_Manifest.csv','Figure_Source_Manifest.json','Image_Manifest.csv','Engagement_Differences.csv']:
 shutil.copy2(O/name,site/name)
print('Pages build:',count,'previews;',len(s.encode()),'bytes HTML;', (assets/'data.js').stat().st_size,'bytes data')
