from pathlib import Path
import json,shutil,hashlib,re,collections,colorsys
from PIL import Image
here=Path(__file__).parent;root=here.parent;src=root.parent/'outputs/linkedin_full_build_20261006';public=here/'public';old=json.loads((here/'data/source.json').read_text());legacy=json.loads((here/'data/legacy-labels.json').read_text());rows=json.loads((src/'Shares.json').read_text())+json.loads((src/'Instant_Reposts.json').read_text());rows.sort(key=lambda r:(r['export_timestamp'],r['record_id']))
posts=[];details={};colors=old['colors'];colors['Unclassified']='#84919a'
for i,r in enumerate(rows,1):
 prior=legacy.get(r.get('legacy_record_id'),{});original=r['record_kind']=='original authored post';caption=r.get('caption') or (r.get('public_card_text') if original else '') or '';shared=r.get('public_card_text') or r.get('browser_card_text') or '';image=r.get('image_path');thumbs=[];width=height=None;palette='No visual'
 if image:
  for rel in [image]+r.get('thumbnail_paths',[]):
   dest=public/rel;dest.parent.mkdir(parents=True,exist_ok=True)
   if not dest.exists():shutil.copy2(src/rel,dest)
  with Image.open(src/image) as im:
   width,height=im.size;sample=im.convert('RGB').resize((1,1)).getpixel((0,0));h,s,v=colorsys.rgb_to_hsv(*(c/255 for c in sample));palette='Neutral' if s<.16 else 'Warm accents' if h<.17 or h>.9 else 'Green accents' if h<.48 else 'Blue accents'
   for size in [160,320,640]:
    rel=f'thumbnails/{Path(image).stem}-{size}.webp';dest=public/rel;dest.parent.mkdir(exist_ok=True)
    if not dest.exists():
     small=im.convert('RGB');small.thumbnail((size,size));small.save(dest,'WEBP',quality=76)
    thumbs.append({'src':rel})
 text=caption or shared;title=' '.join(text.split())[:125] or ('Repost without recovered text' if 'repost' in r['record_kind'] else 'No caption recovered')
 p={'id':r['record_id'],'index':i,'date':r['export_timestamp'][:10],'year':str(r['year']),'month':r['month'],'title':title,'caption':'','sharedText':'','words':len(caption.split()) if caption else None,'topic':prior.get('topic','Unclassified'),'approach':prior.get('approach','Unclassified'),'type':r['record_kind'],'original':original,'reactions':r.get('reactions') if original else None,'comments':r.get('comments') if original else None,'source':r['post_url'],'image':image,'width':width,'height':height,'palette':palette,'thumbnails':thumbs,'thumbnail':thumbs[0]['src'] if thumbs else None,'detail':f'data/post-text-{(i-1)//128}.json','status':r['retrieval_status'] if r['year']>=2023 else 'Export history; not live-verified','checked':r.get('retrieved_at'),'classified':bool(prior),'baseline':{**(prior.get('baseline') or {}),'question_any':'?' in caption,'question_opening':'?' in caption.split('\n')[0],'ai_mention':bool(re.search(r'\b(ai|artificial intelligence)\b',caption,re.I)),'external_link':bool(re.search(r'https?://',caption)),'first_person':bool(re.search(r'\b(I|we|my|our)\b',caption))}}
 details.setdefault(p['detail'],{})[p['id']]={'caption':caption,'sharedText':shared,'captionSource':'export' if r.get('caption') else 'recovered public text' if caption else 'none'};posts.append(p)
for name,content in details.items():(public/name).parent.mkdir(exist_ok=True);(public/name).write_text(json.dumps(content,ensure_ascii=False,separators=(',',':')))
search={p['record_id']:' '.join([p.get('caption') or '',p.get('public_card_text') or '',p.get('browser_card_text') or '']) for p in rows};(public/'data/search-text.json').write_text(json.dumps(search,ensure_ascii=False,separators=(',',':')))
old={k:old[k] for k in ['originalAnalysis']};old['posts']=posts;old['colors']=colors;old['originalRecords']=[{'activity_id':p['id'],'caption_eligible':p['original'] and bool(p['words']),'ranking_eligible':p['original'] and p['reactions'] is not None and p['comments'] is not None} for p in posts];old['coverage']=json.loads((src/'Annual_Coverage.json').read_text());(here/'data/source.json').write_text(json.dumps(old,ensure_ascii=False,separators=(',',':')))
# The website downloads use the same verified files as the local build.
for name in ['Riad_Meddeb_Rebuilt_Dataset.xlsx','Shares.csv','Posts_2023_2026.csv','Instant_Reposts.csv','Image_Manifest.csv','Annual_Coverage.csv','Build_Status.json']:
 shutil.copy2(src/name,public/name)
print(len(posts),'archive records',sum(p['original'] for p in posts),'verified originals')
