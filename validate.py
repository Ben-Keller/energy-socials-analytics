from pathlib import Path
import json,re,gzip
root=Path(__file__).parent;web=root/'web';site=web/'dist';data=json.loads((web/'src/site-data.json').read_text());posts=data['posts'];packs=json.loads((web/'data/image-packs.json').read_text())
assert len(posts)==5413 and len({p['id'] for p in posts})==5413
assert sum(p['year']>='2023' for p in posts)==2342
assert sum(p['original'] for p in posts)==660
assert sum(bool(p.get('image')) for p in posts)==2206
assert all(p.get('reactions') is None and p.get('comments') is None for p in posts if not p['original'])
chunks={}
for p in posts:
 if p['detail'] not in chunks:chunks[p['detail']]=json.loads((site/p['detail']).read_text())
 assert p['id'] in chunks[p['detail']]
 if p.get('image'):
  assert (site/p['image']).is_file() and (site/p['preview']).is_file()
  x,y=p['sprite'];assert 0<=x<packs['low']['cols'] and 0<=y<packs['low']['rows']
  assert (site/p['tile']['src']).is_file()
assert len({p['image'] for p in posts if p.get('image')})==1298
assert len(packs['packs'])==41 and max(p['bytes'] for p in packs['packs'])<65000
assert (site/'atlas-overview.webp').is_file()
for src in {p['tile']['src'] for p in posts if p.get('tile')}:
 for size in [48,64]:assert (site/src.replace('.webp',f'-{size}.webp')).is_file()
image_meta=json.loads((web/'src/generated/image-meta.json').read_text())
assert len(image_meta)==1378
for post_id,preview in json.loads((web/'src/preview-overrides.json').read_text()).items():
 assert any(p['id']==post_id for p in posts)
 assert (site/preview['image']).is_file()
for stem,meta in image_meta.items():
 for size,width,height in meta['variants']:
  assert (site/f'thumbnails/{stem}-{size}.webp').is_file()
  assert max(width,height)<=size
  assert width<=meta['width'] and height<=meta['height']
assert len(gzip.compress((site/'index.html').read_bytes()))<650000
assert len(json.loads((web/'src/catalog.json').read_text()))==16
for file in ['Shares.csv','Instant_Reposts.csv','Riad_Meddeb_Rebuilt_Dataset.xlsx','Image_Manifest.csv','Annual_Coverage.csv']:assert (site/file).is_file()
print('Verified all 5,413 records, text chunks, original/repost attribution, 2,206 image references, 41 deduplicated packs, 16 charts and downloads.')

# The report and full explorer must both be present in the deployment artifact.
report=json.loads((web/'src/report-data.json').read_text())
assert len(report['posts'])==660 and len(report['recommendations'])==6
page=(site/'index.html').read_text()
for element in ['report-atlas','camera-chart','formats-chart','evidence-media-tab','conclusion-title']:
 assert f'id="{element}"' in page,element
assert (site/'explore/index.html').is_file()
for post in report['posts']:
 for field in ['image','thumbnail']:
  if post.get(field):assert (site/post[field]).is_file(),post[field]
for font in ['newsreader.woff2','newsreader-italic.woff2','instrument-sans.woff2']:
 assert (site/'fonts'/font).is_file(),font
standalone=(site/'Riad_Meddeb_Interactive_Report.html').read_text()
assert 'class="standalone"' in standalone
assert not re.search(r'<script[^>]+src=|<link rel="stylesheet"',standalone)
assert not re.search(r'<img[^>]+srcset=',standalone)
print('Verified the six-recommendation report, both new charts, full explorer, images, fonts and standalone download.')
