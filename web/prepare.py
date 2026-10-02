from pathlib import Path
import json,re
import hashlib
here=Path(__file__).parent;root=here.parent;source=root/'source';out=root/'site'
raw=(here/'data/source.json').read_text();data=json.loads(raw);catalog=json.loads((here/'data/catalog.json').read_text())
(here/'src/revision.js').write_text('export const revision="'+hashlib.sha256((raw+(here/'data/sprite.json').read_text()+Path(__file__).read_text()).encode()).hexdigest()[:12]+'";')
for pattern in ['index-*.js','index-*.css','analysis-*.js','analysis-*.css','d3-*.js']:
 for stale in (out/'assets').glob(pattern):stale.unlink()
(out/'data/posts').mkdir(parents=True,exist_ok=True)
sprite=json.loads((here/'data/sprite.json').read_text())
compact=[]
for p in data['posts']:
 (out/f'data/posts/{p["index"]}.json').write_text(json.dumps({k:p.get(k) for k in ['caption','sharedText','source','dateBasis','imageBasis']},separators=(',',':')))
 compact.append({**{k:v for k,v in p.items() if k not in ['caption','sharedText','baseline','embedded','thumb','traits','thumbnails']},'sprite':sprite['positions'].get(p['id'])})
(out/'data/posts.json').write_text(json.dumps({'posts':compact,'colors':data['colors'],'sprite':{k:v for k,v in sprite.items() if k!='positions'}},separators=(',',':')))
(out/'data/search.json').write_text(json.dumps({p['id']:(p.get('caption','')+' '+p.get('sharedText','')) for p in data['posts']},separators=(',',':')))
analysis={**data,'posts':[],'originalRecords':[{k:r[k] for k in ['activity_id','caption_eligible','ranking_eligible']} for r in data['originalRecords']]}
for post in data['posts']:
 row={k:v for k,v in post.items() if k not in ['embedded','thumb','thumbnails','traits']}
 if row.get('baseline'):row['baseline']={k:row['baseline'].get(k) for k in ['topic_tags','ai_mention','question_any','question_opening','external_link','first_person']}
 analysis['posts'].append(row)
(out/'data/analysis.json').write_text(json.dumps(analysis,separators=(',',':')))
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
print('Prepared',len(compact),'posts and',len(catalog),'lazy analysis charts')

entry=here/'index.html'
html=entry.read_text();html=re.sub(r'<link[^>]+data-atlas-preload[^>]*>','',html)
html=html.replace('</head>',f'<link data-atlas-preload rel="preload" as="image" href="{sprite["src"]}" fetchpriority="high"></head>')
entry.write_text(html)
