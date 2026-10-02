"""Build the single cached image used by every post icon; originals stay unchanged."""
from pathlib import Path
from PIL import Image, ImageOps
import hashlib,json,math
here=Path(__file__).parent;site=here.parent/'site'
data=json.loads((here/'data/source.json').read_text())
posts=[p for p in data['posts'] if p.get('image')]
cell=160;cols=16;rows=math.ceil(len(posts)/cols)
sheet=Image.new('RGB',(cols*cell,rows*cell),'white');positions={}
for i,post in enumerate(posts):
 with Image.open(site/post['thumbnail']) as im:
  thumb=ImageOps.exif_transpose(im).convert('RGB');thumb.thumbnail((cell-4,cell-4),Image.Resampling.LANCZOS)
  x,y=i%cols,i//cols;sheet.paste(thumb,(x*cell+(cell-thumb.width)//2,y*cell+(cell-thumb.height)//2))
  positions[post['id']]=[x,y]
public=here/'public/assets';public.mkdir(parents=True,exist_ok=True)
import io
buffer=io.BytesIO();sheet.save(buffer,'WEBP',quality=70,method=6);encoded=buffer.getvalue();digest=hashlib.sha256(encoded).hexdigest()[:12];name=f'post-atlas-{digest}.webp'
(public/name).write_bytes(encoded)
manifest={'src':'assets/'+name,'cols':cols,'rows':rows,'cell':cell,'bytes':len(encoded),'positions':positions}
(here/'data/sprite.json').write_text(json.dumps(manifest,separators=(',',':')))
print(f'{len(posts)} images → one {len(encoded):,}-byte WebP ({cols*cell} × {rows*cell})')
