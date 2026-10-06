from pathlib import Path
import json,re,gzip
root=Path(__file__).parent;web=root/'web';site=root/'site';data=json.loads((web/'src/site-data.json').read_text());posts=data['posts'];packs=json.loads((web/'data/image-packs.json').read_text())
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
assert len(gzip.compress((site/'index.html').read_bytes()))<650000
assert len(json.loads((web/'src/catalog.json').read_text()))==16
for file in ['Shares.csv','Instant_Reposts.csv','Riad_Meddeb_Rebuilt_Dataset.xlsx','Image_Manifest.csv','Annual_Coverage.csv']:assert (site/file).is_file()
print('Verified all 5,413 records, text chunks, original/repost attribution, 2,206 image references, 41 deduplicated packs, 16 charts and downloads.')
