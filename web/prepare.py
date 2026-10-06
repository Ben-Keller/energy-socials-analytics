from pathlib import Path
import json
here=Path(__file__).parent;root=here.parent;source=root/'source';out=root/'site'
data=json.loads((here/'data/source.json').read_text());catalog=json.loads((here/'data/catalog.json').read_text());images=json.loads((here/'data/image-packs.json').read_text())
keys=['id','index','date','year','month','title','caption','sharedText','words','topic','approach','type','reactions','comments','liveReactions','liveComments','rank','original','source','image','width','height','palette','detail','status','checked','classified']
posts=[]
for p in data['posts']:
 row={k:p.get(k) for k in keys};row.update(images['posts'].get(p['id'],{}));row['preview']=p.get('thumbnails',[{}])[-1].get('src') if p.get('thumbnails') else None
 if p.get('baseline') and p['original']:row['baseline']={k:p['baseline'].get(k) for k in ['topic_tags','ai_mention','question_any','question_opening','external_link','first_person']}
 posts.append({k:v for k,v in row.items() if v is not None and v!=''})
siteData={'posts':posts,'colors':data['colors'],'sprite':images['low'],'originalAnalysis':{k:data['originalAnalysis'][k] for k in ['topic_names','approach_names','tag_counts']},'coverage':data['coverage'],'originalRecords':[{k:r[k] for k in ['activity_id','caption_eligible','ranking_eligible']} for r in data['originalRecords'] if r['caption_eligible'] or r['ranking_eligible']]}
(here/'src/site-data.json').write_text(json.dumps(siteData,separators=(',',':')))
omit=['f06','f17','f18','f19','f20','f21','f22','f30'];catalog=[f for f in catalog if f['id'] not in omit and f['number']<24]
(here/'src/catalog.json').write_text(json.dumps(catalog,separators=(',',':')))
charts=(source/'charts.js').read_text();charts=charts.replace("JSON.parse(document.querySelector('#report-data').textContent)",'data').replace("JSON.parse(document.querySelector('#figure-catalog').textContent)",'catalog')
# Original report renderer functions are available for math/helpers, never rendered on page.
inter=(source/'interactivity.js').read_text();start=inter.index('function setupExplorer(article)');end=inter.index(' const id=spec.id',start)
inter=inter[:start]+'''function setupExplorer(article){const spec=F.find(f=>f.id===article.id),a=d3.select(article),v={spec};const explanation=article.querySelector('.figuretext');const host=a.append('section').attr('class','data-explorer');v.controls=host.append('div');v.scope=host.append('p').attr('class','data-scope');v.chart=host.append('div').attr('class','live-chart');v.key=host.append('div').attr('class','data-key');v.insight=host.append('p').attr('class','data-insight');v.selection=host.append('div').attr('class','data-selection');\n'''+inter[end:]
inter=inter.replace("document.querySelectorAll('article.figure').forEach(setupExplorer);",'')
inter=inter.replace("if(p.embedded)appendThumbnail(b,p,'70px').attr('alt','');",'')
inter=inter.replace('v.draw();explorers.push(v);','lastWidth=Math.round(host.node().clientWidth);v.draw();explorers.push(v);')
inter=inter.replace('new ResizeObserver(entries=>','const observer=new ResizeObserver(entries=>').replace('}).observe(host.node());','});observer.observe(host.node());')
(here/'src/analysis.js').write_text("import * as d3 from 'd3';\nimport catalog from './catalog.json';\nexport function createAnalysis(data,showPost){\n"+charts+'\nfunction saveBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}\n'+inter+'\nreturn setupExplorer;\n}')
(here/'src/analysis.css').write_text((source/'interactive.css').read_text())

print('Prepared static page:',len(posts),'posts;',len(catalog),'analyses')
