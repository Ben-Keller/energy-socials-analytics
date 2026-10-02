from pathlib import Path
import json,re,base64,shutil
O=Path('outputs/linkedin_audit_20261002'); root=Path('github-pages'); site=root/'site'; assets=site/'assets';assets.mkdir(parents=True,exist_ok=True)
s=(O/'Visual_Gallery.html').read_text();data=json.loads((O/'visual_assets/d3_report_data.json').read_text());count=0
for p in data['posts']:
 if (p.get('embedded') or '').startswith('data:'):
  header,b64=p['embedded'].split(',',1);ext='jpg' if 'jpeg' in header else 'webp';name=f'preview-{p["id"]}.{ext}';(assets/name).write_bytes(base64.b64decode(b64));p['embedded']='assets/'+name;count+=1
# Keep data cacheable and load images independently of the HTML document.
scripts=re.findall(r'<script([^>]*)>(.*?)</script>',s,re.S)
app=scripts[-1][1];app=app.replace("JSON.parse(document.querySelector('#report-data').textContent)",'window.REPORT_DATA').replace("JSON.parse(document.querySelector('#figure-catalog').textContent)",'window.FIGURE_CATALOG')
(assets/'data.js').write_text('window.REPORT_DATA='+json.dumps(data,separators=(',',':'))+';\nwindow.FIGURE_CATALOG='+(O/'visual_assets/figure_catalog.json').read_text()+';')
app=app.replace(".attr('href',p.embedded)",".attr('data-src',p.embedded)")
app+="\nconst imageObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.querySelectorAll('image[data-src]').forEach(img=>img.setAttribute('href',img.dataset.src));imageObserver.unobserve(entry.target)}}),{rootMargin:'700px'});document.querySelectorAll('article.figure').forEach(article=>imageObserver.observe(article));\n"
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
(site/'index.html').write_text(s);(site/'Visual_Gallery.html').write_text('<!doctype html><meta charset="utf-8"><title>Visual gallery</title><script>location.replace("./index.html"+location.search+location.hash)</script><a href="./index.html">Open the gallery</a>');(site/'.nojekyll').touch()
for name in ['post_images','d3_figures']:
 shutil.copytree(O/name,site/name,dirs_exist_ok=True)
for name in ['Riad_Meddeb_LinkedIn_Visual_Analysis.docx','Riad_Meddeb_Expanded_Dataset.xlsx','Riad_Meddeb_Expanded_Dataset.csv','Figure_Source_Manifest.csv','Figure_Source_Manifest.json','Image_Manifest.csv','Engagement_Differences.csv']:
 shutil.copy2(O/name,site/name)
print('Pages build:',count,'previews;',len(s.encode()),'bytes HTML;', (assets/'data.js').stat().st_size,'bytes data')
