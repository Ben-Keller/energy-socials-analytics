from pathlib import Path
from PIL import Image,ImageOps
import json,io,hashlib,base64,collections,math
here=Path(__file__).parent;site=here/'public';data=json.loads((here/'data/source.json').read_text());posts=[p for p in data['posts'] if p.get('image')]
allposts=posts;unique={}
for p in posts:unique.setdefault(p['image'],p)
posts=list(unique.values())
counts=collections.Counter(p['topic'] for p in posts);posts.sort(key=lambda p:(p['date'],p['index']))
assets=here/'public/assets';assets.mkdir(exist_ok=True,parents=True)
def make(batch,cell,cols,rows,quality):
 sheet=Image.new('RGB',(cols*cell,rows*cell),'white')
 for i,p in enumerate(batch):
  with Image.open(site/p['thumbnail']) as im:
   im=ImageOps.exif_transpose(im).convert('RGB');im.thumbnail((cell-2,cell-2),Image.Resampling.LANCZOS);sheet.paste(im,((i%cols)*cell+(cell-im.width)//2,(i//cols)*cell+(cell-im.height)//2))
 b=io.BytesIO();sheet.save(b,'WEBP',quality=quality,method=6);return b.getvalue()
cols=32;rows=math.ceil(len(posts)/cols);low=make(posts,24,cols,rows,25)
manifest={'low':{'src':'data:image/webp;base64,'+base64.b64encode(low).decode(),'cols':cols,'rows':rows,'cell':24,'bytes':len(low)},'posts':{},'packs':[]}
for i,p in enumerate(posts):manifest['posts'][p['id']]={'sprite':[i%cols,i//cols]}
for offset in range(0,len(posts),32):
 group=posts[offset:offset+32];blob=make(group,96,8,4,55);filename='post-pack-'+hashlib.sha256(blob).hexdigest()[:12]+'.webp';(assets/filename).write_bytes(blob);url='assets/'+filename
 manifest['packs'].append({'src':url,'bytes':len(blob)})
 for i,p in enumerate(group):manifest['posts'][p['id']]['tile']={'src':url,'x':i%8,'y':i//8,'cols':8,'rows':4}
byimage={p['image']:manifest['posts'][p['id']] for p in posts}
for p in allposts:manifest['posts'][p['id']]=byimage[p['image']]
(here/'data/image-packs.json').write_text(json.dumps(manifest,separators=(',',':')))
print({'embedded_preview_bytes':len(low),'packs':len(manifest['packs']),'pack_sizes':[x['bytes'] for x in manifest['packs']]})
